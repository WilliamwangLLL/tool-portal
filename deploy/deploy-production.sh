#!/bin/sh
set -eu
umask 077

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
deploy_host=root@www.haoyunlai.fun
deploy_dir=/opt/toolbox-control
backup_root=/var/backups/toolbox-control
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_dir=$backup_root/$stamp
stage_dir=$(mktemp -d "${TMPDIR:-/tmp}/toolbox-control-deploy.XXXXXX")

cleanup() {
  rm -rf -- "$stage_dir"
}
trap cleanup EXIT HUP INT TERM

cd "$project_dir"
npm run check
npm test

mkdir -p "$stage_dir/lib" "$stage_dir/config" "$stage_dir/scripts" "$stage_dir/business" "$stage_dir/admin" "$stage_dir/workspace"
cp server.mjs package.json index.html "$stage_dir/"
cp lib/control.mjs "$stage_dir/lib/"
cp config/catalog.json "$stage_dir/config/"
cp scripts/apply-nginx.mjs scripts/patch-nginx.mjs "$stage_dir/scripts/"
cp business/index.html "$stage_dir/business/"
cp admin/index.html "$stage_dir/admin/"
cp workspace/index.html "$stage_dir/workspace/"

ssh -o ProxyCommand=none -o BatchMode=yes "$deploy_host" sh -s -- "$backup_dir" <<'REMOTE_BACKUP'
set -eu
backup_dir=$1
install -d -m 0700 "$backup_dir"
for source in \
  /www/server/nginx/conf/nginx.conf \
  /www/server/panel/vhost/nginx/stage.conf \
  /www/server/panel/vhost/nginx/kkhc.conf \
  /www/server/nginx/conf/toolbox-control-map.conf \
  /www/server/nginx/conf/toolbox-control-server.conf; do
  if [ -f "$source" ]; then
    cp -p "$source" "$backup_dir/$(basename "$source")"
  fi
done
if [ -d /opt/toolbox-control ]; then
  tar -C /opt -czf "$backup_dir/toolbox-control.tar.gz" toolbox-control
fi
if [ -d /var/lib/toolbox-control ]; then
  tar -C /var/lib -czf "$backup_dir/toolbox-control-data.tar.gz" toolbox-control
fi
for unit in toolbox-control.service toolbox-control-apply.service toolbox-control-apply.path; do
  if [ -f "/etc/systemd/system/$unit" ]; then
    cp -p "/etc/systemd/system/$unit" "$backup_dir/$unit"
  fi
done
REMOTE_BACKUP

ssh -o ProxyCommand=none -o BatchMode=yes "$deploy_host" \
  "install -d -m 0755 '$deploy_dir'"
rsync -az --delete -e 'ssh -o ProxyCommand=none -o BatchMode=yes' "$stage_dir/" "$deploy_host:$deploy_dir/"
scp -q -o ProxyCommand=none -o BatchMode=yes \
  deploy/toolbox-control.service \
  deploy/toolbox-control-apply.service \
  deploy/toolbox-control-apply.path \
  deploy/toolbox-control-server.conf \
  "$deploy_host:/tmp/"

ssh -o ProxyCommand=none -o BatchMode=yes "$deploy_host" sh -s -- "$backup_dir" <<'REMOTE_INSTALL'
set -eu
backup_dir=$1
rollback_armed=1
rollback() {
  if [ "$rollback_armed" -ne 1 ]; then
    return
  fi
  systemctl stop toolbox-control-apply.path toolbox-control.service >/dev/null 2>&1 || true
  if [ -f "$backup_dir/toolbox-control.tar.gz" ]; then
    rm -rf -- /opt/toolbox-control
    tar -C /opt -xzf "$backup_dir/toolbox-control.tar.gz"
  fi
  if [ -f "$backup_dir/toolbox-control-data.tar.gz" ]; then
    rm -rf -- /var/lib/toolbox-control
    tar -C /var/lib -xzf "$backup_dir/toolbox-control-data.tar.gz"
  fi
  for unit in toolbox-control.service toolbox-control-apply.service toolbox-control-apply.path; do
    if [ -f "$backup_dir/$unit" ]; then
      cp -p "$backup_dir/$unit" "/etc/systemd/system/$unit"
    fi
  done
  systemctl daemon-reload
  cp -p "$backup_dir/nginx.conf" /www/server/nginx/conf/nginx.conf
  cp -p "$backup_dir/stage.conf" /www/server/panel/vhost/nginx/stage.conf
  cp -p "$backup_dir/kkhc.conf" /www/server/panel/vhost/nginx/kkhc.conf
  if [ -f "$backup_dir/toolbox-control-map.conf" ]; then
    cp -p "$backup_dir/toolbox-control-map.conf" /www/server/nginx/conf/toolbox-control-map.conf
  fi
  if [ -f "$backup_dir/toolbox-control-server.conf" ]; then
    cp -p "$backup_dir/toolbox-control-server.conf" /www/server/nginx/conf/toolbox-control-server.conf
  fi
  /www/server/nginx/sbin/nginx -t
  /www/server/nginx/sbin/nginx -s reload
  systemctl restart toolbox-control.service >/dev/null 2>&1 || true
  systemctl start toolbox-control-apply.path >/dev/null 2>&1 || true
}
trap rollback EXIT HUP INT TERM

if ! id toolbox-control >/dev/null 2>&1; then
  useradd --system --home-dir /var/lib/toolbox-control --shell /usr/sbin/nologin --gid www toolbox-control
fi
install -d -o toolbox-control -g www -m 0750 /var/lib/toolbox-control
install -d -o toolbox-control -g www -m 0750 /var/lib/toolbox-control/rendered /var/lib/toolbox-control/backups /var/lib/toolbox-control/credentials
chown -R root:root /opt/toolbox-control
chmod -R u=rwX,go=rX /opt/toolbox-control

install -o root -g root -m 0644 /tmp/toolbox-control.service /etc/systemd/system/toolbox-control.service
install -o root -g root -m 0644 /tmp/toolbox-control-apply.service /etc/systemd/system/toolbox-control-apply.service
install -o root -g root -m 0644 /tmp/toolbox-control-apply.path /etc/systemd/system/toolbox-control-apply.path
install -o root -g root -m 0644 /tmp/toolbox-control-server.conf /www/server/nginx/conf/toolbox-control-server.conf
rm -f /tmp/toolbox-control.service /tmp/toolbox-control-apply.service /tmp/toolbox-control-apply.path /tmp/toolbox-control-server.conf

systemctl daemon-reload
systemctl enable toolbox-control.service
systemctl restart toolbox-control.service
for attempt in 1 2 3 4 5; do
  if curl -fsS http://127.0.0.1:3520/healthz >/dev/null; then break; fi
  sleep 1
done
curl -fsS http://127.0.0.1:3520/healthz >/dev/null

/usr/bin/node /opt/toolbox-control/scripts/apply-nginx.mjs
/usr/bin/node /opt/toolbox-control/scripts/patch-nginx.mjs
/www/server/nginx/sbin/nginx -t
/www/server/nginx/sbin/nginx -s reload
systemctl enable --now toolbox-control-apply.path
systemctl start toolbox-control-apply.service

rollback_armed=0
trap - EXIT HUP INT TERM
systemctl is-active --quiet toolbox-control.service
systemctl is-active --quiet toolbox-control-apply.path
curl -fsS http://127.0.0.1:3520/healthz
REMOTE_INSTALL

echo "Deployed toolbox-control; backup: $backup_dir"
