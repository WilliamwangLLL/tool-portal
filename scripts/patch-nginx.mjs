import fs from 'node:fs';
import path from 'node:path';

const MAP_INCLUDE = '        include /www/server/nginx/conf/toolbox-control-map.conf;';
const SERVER_INCLUDE = '    include /www/server/nginx/conf/toolbox-control-server.conf;';

const STAGE_BLOCK = `    # BEGIN toolbox-control
${SERVER_INCLUDE}

    location = /my { return 301 /my/; }
    location = /my/ {
        proxy_pass http://127.0.0.1:3520/page/home;
        proxy_set_header Host $host;
        add_header Cache-Control "no-store" always;
        include /www/server/nginx/conf/kkhc-sec-headers.conf;
    }
    location = /my/index.html {
        proxy_pass http://127.0.0.1:3520/page/home;
        proxy_set_header Host $host;
        add_header Cache-Control "no-store" always;
        include /www/server/nginx/conf/kkhc-sec-headers.conf;
    }
    location = /my/business { return 301 /my/business/; }
    location = /my/business/ {
        proxy_pass http://127.0.0.1:3520/page/business;
        proxy_set_header Host $host;
        add_header Cache-Control "no-store" always;
        include /www/server/nginx/conf/kkhc-sec-headers.conf;
    }
    location = /my/business/index.html {
        proxy_pass http://127.0.0.1:3520/page/business;
        proxy_set_header Host $host;
        add_header Cache-Control "no-store" always;
        include /www/server/nginx/conf/kkhc-sec-headers.conf;
    }

    location = /toolbox-control/admin { return 301 /toolbox-control/admin/; }
    location ^~ /toolbox-control/admin/ {
        auth_basic "Toolbox Admin";
        auth_basic_user_file /www/server/nginx/conf/my_htpasswd;
        proxy_pass http://127.0.0.1:3520/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Remote-User $remote_user;
        add_header Cache-Control "no-store" always;
        include /www/server/nginx/conf/kkhc-sec-headers.conf;
    }
    location = /toolbox-control/workspace { return 301 /toolbox-control/workspace/; }
    location ^~ /toolbox-control/workspace/ {
        auth_basic "Toolbox Admin";
        auth_basic_user_file /www/server/nginx/conf/my_htpasswd;
        proxy_pass http://127.0.0.1:3520/workspace/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Remote-User $remote_user;
        add_header Cache-Control "no-store" always;
        include /www/server/nginx/conf/kkhc-sec-headers.conf;
    }
    location ^~ /toolbox-control/api/ {
        auth_basic "Toolbox Admin";
        auth_basic_user_file /www/server/nginx/conf/my_htpasswd;
        proxy_pass http://127.0.0.1:3520/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Remote-User $remote_user;
        add_header Cache-Control "no-store" always;
        include /www/server/nginx/conf/kkhc-sec-headers.conf;
    }
    location ^~ /toolbox-control/go/ {
        proxy_pass http://127.0.0.1:3520/go/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Remote-User $remote_user;
    }
    location ^~ /toolbox-control/section/ {
        proxy_pass http://127.0.0.1:3520/section/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Remote-User $remote_user;
    }
    location = /toolbox-control/healthz {
        proxy_pass http://127.0.0.1:3520/healthz;
        proxy_set_header Host $host;
        add_header Cache-Control "no-store" always;
    }
    # END toolbox-control`;

export function patchMainNginx(source) {
  if (source.includes('toolbox-control-map.conf')) return source;
  const needle = '\t\tinclude proxy.conf;';
  if (!source.includes(needle)) throw new Error('main nginx proxy include anchor not found');
  return source.replace(needle, `${needle}\n${MAP_INCLUDE}`);
}

export function patchStageNginx(source) {
  let output = source;
  if (output.includes('# BEGIN toolbox-control')) {
    output = output.replace(/    # BEGIN toolbox-control[\s\S]*?    # END toolbox-control/, STAGE_BLOCK);
  } else {
    const oldBlock = `    # tool-portal /my/ basic auth
    location ^~ /my/ {
        auth_basic "Tool Portal";
        auth_basic_user_file /www/server/nginx/conf/my_htpasswd;
    }`;
    if (!output.includes(oldBlock)) throw new Error('stage /my auth block anchor not found');
    output = output.replace(oldBlock, STAGE_BLOCK);
  }
  output = output.replace(
    /\n\s*auth_basic "Tool Portal";\n\s*auth_basic_user_file \/www\/server\/nginx\/conf\/my_htpasswd;(?=\n\s*proxy_pass http:\/\/127\.0\.0\.1:3510\/;)/,
    ''
  );
  return output;
}

export function patchKkhcNginx(source) {
  if (source.includes('toolbox-control-server.conf')) return source;
  const httpsAnchor = 'server {\n    listen 443 ssl;';
  const needle = '    root /www/wwwroot/kkhc;';
  const httpsStart = source.indexOf(httpsAnchor);
  if (httpsStart < 0) throw new Error('kkhc HTTPS server anchor not found');
  const rootIndex = source.indexOf(needle, httpsStart);
  if (rootIndex < 0) throw new Error('kkhc HTTPS root anchor not found');
  return `${source.slice(0, rootIndex)}${needle}\n\n${SERVER_INCLUDE}${source.slice(rootIndex + needle.length)}`;
}

function atomicWrite(filePath, content) {
  const temporary = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, content, { mode: 0o644 });
  fs.renameSync(temporary, filePath);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const mainPath = process.env.TOOLBOX_NGINX_MAIN || '/www/server/nginx/conf/nginx.conf';
  const stagePath = process.env.TOOLBOX_NGINX_STAGE || '/www/server/panel/vhost/nginx/stage.conf';
  const kkhcPath = process.env.TOOLBOX_NGINX_KKHC || '/www/server/panel/vhost/nginx/kkhc.conf';
  atomicWrite(mainPath, patchMainNginx(fs.readFileSync(mainPath, 'utf8')));
  atomicWrite(stagePath, patchStageNginx(fs.readFileSync(stagePath, 'utf8')));
  atomicWrite(kkhcPath, patchKkhcNginx(fs.readFileSync(kkhcPath, 'utf8')));
  console.log(JSON.stringify({ mainPath, stagePath, kkhcPath, patched: true }));
}
