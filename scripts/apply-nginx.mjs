import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  atomicWriteJson,
  buildNginxMap,
  credentialFilePath,
  loadCredentials,
  loadState,
  validateCatalog
} from '../lib/control.mjs';

const appRoot = path.resolve(process.env.TOOLBOX_CONTROL_APP_ROOT || path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const dataRoot = path.resolve(process.env.TOOLBOX_CONTROL_DATA_ROOT || '/var/lib/toolbox-control');
const mapPath = path.resolve(process.env.TOOLBOX_CONTROL_NGINX_MAP || '/www/server/nginx/conf/toolbox-control-map.conf');
const nginxBin = path.resolve(process.env.TOOLBOX_CONTROL_NGINX_BIN || '/www/server/nginx/sbin/nginx');
const statusPath = path.join(dataRoot, 'apply-status.json');
const credentialsPath = path.join(dataRoot, 'credentials.json');
const credentialsRoot = path.join(dataRoot, 'credentials');

function runNginx(args) {
  const result = spawnSync(nginxBin, args, { encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0) {
    const details = `${result.stdout || ''}${result.stderr || ''}`.trim();
    throw new Error(`nginx ${args.join(' ')} failed: ${details}`);
  }
}

function atomicWriteText(target, content) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temporary, content, { mode: 0o644 });
  fs.renameSync(temporary, target);
}

const catalog = validateCatalog(JSON.parse(fs.readFileSync(path.join(appRoot, 'config', 'catalog.json'), 'utf8')));
const state = loadState(catalog, path.join(dataRoot, 'state.json'));
const credentials = loadCredentials(catalog, credentialsPath);
const previous = fs.existsSync(mapPath) ? fs.readFileSync(mapPath, 'utf8') : null;

try {
  for (const id of Object.keys(credentials.items)) {
    const credentialPath = credentialFilePath(credentialsRoot, id);
    if (!fs.existsSync(credentialPath)) throw new Error(`credential file missing for ${id}`);
  }
  const generated = buildNginxMap(catalog, state, credentials, { credentialsRoot });
  atomicWriteText(mapPath, generated);
  try {
    runNginx(['-t']);
  } catch (error) {
    if (previous === null) fs.unlinkSync(mapPath);
    else atomicWriteText(mapPath, previous);
    runNginx(['-t']);
    throw error;
  }
  runNginx(['-s', 'reload']);
  const status = {
    ok: true,
    at: new Date().toISOString(),
    stateUpdatedAt: state.updatedAt,
    message: 'Nginx access policy applied'
  };
  atomicWriteJson(statusPath, status);
  fs.chmodSync(statusPath, 0o644);
  console.log(JSON.stringify(status));
} catch (error) {
  const status = {
    ok: false,
    at: new Date().toISOString(),
    stateUpdatedAt: state.updatedAt,
    message: error.message
  };
  atomicWriteJson(statusPath, status);
  fs.chmodSync(statusPath, 0o644);
  console.error(JSON.stringify(status));
  process.exitCode = 1;
}
