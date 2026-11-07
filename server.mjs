import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  MASTER_AUTH_FILE,
  atomicWriteJson,
  buildProjectHtpasswd,
  createBoard,
  credentialFilePath,
  loadCredentials,
  loadState,
  moveBoardMember,
  publicState,
  updateBoard,
  updatePolicy,
  validateCredentialInput,
  validateCatalog,
  writeRenderedPages
} from './lib/control.mjs';

const appRoot = path.resolve(process.env.TOOLBOX_CONTROL_APP_ROOT || path.dirname(fileURLToPath(import.meta.url)));
const dataRoot = path.resolve(process.env.TOOLBOX_CONTROL_DATA_ROOT || path.join(appRoot, '.toolbox-control-state'));
const host = process.env.TOOLBOX_CONTROL_HOST || '127.0.0.1';
const port = Number(process.env.TOOLBOX_CONTROL_PORT || 3520);
const masterAuthFile = process.env.TOOLBOX_CONTROL_MASTER_AUTH_FILE || MASTER_AUTH_FILE;
const catalogPath = path.join(appRoot, 'config', 'catalog.json');
const statePath = path.join(dataRoot, 'state.json');
const credentialsPath = path.join(dataRoot, 'credentials.json');
const credentialsRoot = path.join(dataRoot, 'credentials');
const applyStatusPath = path.join(dataRoot, 'apply-status.json');
const auditPath = path.join(dataRoot, 'audit.jsonl');
const backupRoot = path.join(dataRoot, 'backups');

for (const directory of [dataRoot, backupRoot, credentialsRoot]) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o750 });
}
const catalog = validateCatalog(JSON.parse(fs.readFileSync(catalogPath, 'utf8')));
let state = loadState(catalog, statePath);
let credentials = loadCredentials(catalog, credentialsPath);
let unmatched = writeRenderedPages({ appRoot, dataRoot, catalog, state });

function json(res, status, value) {
  const body = `${JSON.stringify(value)}\n`;
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function text(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers
  });
  res.end(body);
}

function htmlFile(res, filePath) {
  const body = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function readApplyStatus() {
  try {
    return JSON.parse(fs.readFileSync(applyStatusPath, 'utf8'));
  } catch {
    return null;
  }
}

function readJsonBody(req, limit = 8192) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('request body too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(Object.assign(new Error('invalid JSON'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function assertAdminMutation(req) {
  if (req.headers['x-toolbox-admin'] !== '1') {
    throw Object.assign(new Error('missing admin mutation header'), { statusCode: 403 });
  }
  const origin = req.headers.origin;
  const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin && forwardedHost && new URL(origin).host !== forwardedHost) {
    throw Object.assign(new Error('cross-origin mutation rejected'), { statusCode: 403 });
  }
}

function backupState() {
  if (!fs.existsSync(statePath)) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(statePath, path.join(backupRoot, `state-${stamp}.json`));
  const backups = fs.readdirSync(backupRoot)
    .filter((name) => name.startsWith('state-') && name.endsWith('.json'))
    .sort()
    .reverse();
  for (const stale of backups.slice(50)) fs.unlinkSync(path.join(backupRoot, stale));
}

function appendAudit(req, details) {
  const record = {
    at: new Date().toISOString(),
    user: String(req.headers['x-remote-user'] || 'unknown').slice(0, 120),
    ip: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(),
    ...details
  };
  fs.appendFileSync(auditPath, `${JSON.stringify(record)}\n`, { mode: 0o640 });
}

function currentPayload() {
  return publicState(catalog, state, readApplyStatus(), credentials);
}

function persistState(req, next, audit) {
  const nextUnmatched = writeRenderedPages({ appRoot, dataRoot, catalog, state: next });
  if (nextUnmatched.length) throw new Error(`portal template has ${nextUnmatched.length} unmanaged cards or sections`);
  backupState();
  atomicWriteJson(statePath, next);
  appendAudit(req, audit);
  state = next;
  unmatched = nextUnmatched;
}

function persistPolicy(req, kind, id, changes) {
  const previous = kind === 'boards'
    ? state.boards.find((board) => board.id === id)?.policy
    : state[kind]?.[id];
  const next = updatePolicy(catalog, state, kind, id, changes);
  const policy = kind === 'boards'
    ? next.boards.find((board) => board.id === id)?.policy
    : next[kind][id];
  persistState(req, next, { action: 'policy-change', kind, id, previous, policy });
}

function boardSnapshot(source, id) {
  const board = source.boards.find((candidate) => candidate.id === id);
  return board ? JSON.parse(JSON.stringify(board)) : null;
}

function persistBoardCreate(req, body) {
  const previousBoards = state.boards.map((board) => board.id);
  const next = createBoard(catalog, state, body);
  const created = next.boards.find((board) => !previousBoards.includes(board.id));
  persistState(req, next, { action: 'board-create', kind: 'boards', id: created.id, board: created });
}

function persistBoardUpdate(req, id, body) {
  const previous = boardSnapshot(state, id);
  const next = updateBoard(catalog, state, id, body);
  persistState(req, next, { action: 'board-update', kind: 'boards', id, previous, board: boardSnapshot(next, id) });
}

function persistBoardMove(req, id, body) {
  const member = { kind: body?.kind, id: body?.id };
  const source = state.boards.find((board) => board.members.some((candidate) => candidate.kind === member.kind && candidate.id === member.id));
  const next = moveBoardMember(catalog, state, id, member);
  const removedBoard = source && !next.boards.some((board) => board.id === source.id) ? source.id : null;
  persistState(req, next, {
    action: 'board-member-move', kind: member.kind, id: member.id,
    fromBoard: source?.id || null, toBoard: id, autoDeletedBoard: removedBoard
  });
}

function atomicWriteText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o750 });
  const temporary = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temporary, value, { mode: 0o640 });
  fs.renameSync(temporary, filePath);
}

function passwordHash(password) {
  const openssl = process.env.TOOLBOX_CONTROL_OPENSSL || 'openssl';
  const result = spawnSync(openssl, ['passwd', '-6', '-stdin'], {
    input: `${password}\n`,
    encoding: 'utf8',
    timeout: 15000
  });
  const hash = String(result.stdout || '').trim();
  if (result.status !== 0 || !/^\$6\$[A-Za-z0-9./]+\$[A-Za-z0-9./]+$/.test(hash)) {
    throw new Error('密码哈希生成失败');
  }
  return hash;
}

function saveCredential(req, id, body) {
  const item = catalog.items.find((entry) => entry.id === id);
  if (!item) throw Object.assign(new Error('未知项目'), { statusCode: 404 });
  const { username, password } = validateCredentialInput(body.username, body.password);
  const hash = passwordHash(password);
  const masterText = fs.readFileSync(masterAuthFile, 'utf8');
  const projectAuth = buildProjectHtpasswd(masterText, username, hash);
  const now = new Date().toISOString();
  const nextCredentials = {
    version: 1,
    updatedAt: now,
    items: { ...credentials.items, [id]: { username, updatedAt: now } }
  };
  const nextState = updatePolicy(catalog, state, 'items', id, {
    audience: 'shared',
    listed: false,
    status: 'online'
  });
  const nextUnmatched = writeRenderedPages({ appRoot, dataRoot, catalog, state: nextState });
  if (nextUnmatched.length) throw new Error(`portal template has ${nextUnmatched.length} unmanaged cards or sections`);

  atomicWriteText(credentialFilePath(credentialsRoot, id), projectAuth);
  backupState();
  atomicWriteJson(statePath, nextState);
  // Protect with the owner password before publishing the new partner file to
  // Nginx. This avoids a brief public window when converting a public item.
  atomicWriteJson(credentialsPath, nextCredentials);
  appendAudit(req, {
    action: credentials.items[id] ? 'credential-rotate' : 'credential-create',
    kind: 'items',
    id,
    username,
    audience: 'shared'
  });
  credentials = nextCredentials;
  state = nextState;
  unmatched = nextUnmatched;
}

function authRequired(res) {
  return text(res, 401, 'Authentication required\n', {
    'WWW-Authenticate': 'Basic realm="Toolbox Admin"'
  });
}

function redirectTarget(req, res, kind, id, nestedItemId = null) {
  if (kind === 'sections' && nestedItemId) {
    res.writeHead(302, {
      Location: `/toolbox-control/go/${encodeURIComponent(nestedItemId)}`,
      'Cache-Control': 'no-store'
    });
    return res.end();
  }
  const collection = kind === 'items' ? catalog.items : catalog.sections;
  const entry = collection.find((candidate) => candidate.id === id);
  if (!entry) return text(res, 404, 'Unknown toolbox entry\n');
  const policy = state[kind][id];
  if (!entry.target || policy.status === 'offline') return text(res, 404, 'Toolbox entry unavailable\n');
  if (policy.status === 'maintenance') return text(res, 503, 'Toolbox entry under maintenance\n');
  if (policy.audience !== 'public' && !req.headers['x-remote-user']) return authRequired(res);
  res.writeHead(302, { Location: entry.target, 'Cache-Control': 'no-store' });
  res.end();
}

function counts() {
  const policies = [...Object.values(state.sections), ...Object.values(state.items)];
  return {
    audience: Object.fromEntries(['public', 'owner', 'shared'].map((value) => [value, policies.filter((p) => p.audience === value).length])),
    status: Object.fromEntries(['online', 'maintenance', 'offline'].map((value) => [value, policies.filter((p) => p.status === value).length])),
    configuredSharedCredentials: Object.keys(credentials.items).length,
    pendingSharedCredentials: catalog.items.filter((item) => state.items[item.id].audience === 'shared' && !credentials.items[item.id]).length,
    boards: state.boards.length
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
    if (req.method === 'GET' && (url.pathname === '/admin' || url.pathname === '/admin/')) {
      return htmlFile(res, path.join(appRoot, 'admin', 'index.html'));
    }
    if (req.method === 'GET' && (url.pathname === '/workspace' || url.pathname === '/workspace/')) {
      return htmlFile(res, path.join(appRoot, 'workspace', 'index.html'));
    }
    if (req.method === 'GET' && url.pathname === '/page/home') {
      return htmlFile(res, path.join(dataRoot, 'rendered', 'home.html'));
    }
    if (req.method === 'GET' && url.pathname === '/page/business') {
      return htmlFile(res, path.join(dataRoot, 'rendered', 'business.html'));
    }
    if (req.method === 'GET' && url.pathname === '/healthz') {
      return json(res, 200, {
        ok: true,
        schemaVersion: state.version,
        stateUpdatedAt: state.updatedAt,
        unmatched,
        ...counts()
      });
    }
    if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, currentPayload());

    const policyMatch = url.pathname.match(/^\/api\/policy\/(sections|items|boards)\/([a-z0-9-]+)$/);
    if (req.method === 'PATCH' && policyMatch) {
      assertAdminMutation(req);
      persistPolicy(req, policyMatch[1], policyMatch[2], await readJsonBody(req));
      return json(res, 200, currentPayload());
    }

    if (req.method === 'POST' && url.pathname === '/api/boards') {
      assertAdminMutation(req);
      persistBoardCreate(req, await readJsonBody(req));
      return json(res, 201, currentPayload());
    }
    const boardMatch = url.pathname.match(/^\/api\/boards\/([a-z0-9-]+)$/);
    if (req.method === 'PATCH' && boardMatch) {
      assertAdminMutation(req);
      persistBoardUpdate(req, boardMatch[1], await readJsonBody(req));
      return json(res, 200, currentPayload());
    }
    const boardMemberMatch = url.pathname.match(/^\/api\/boards\/([a-z0-9-]+)\/members$/);
    if (req.method === 'POST' && boardMemberMatch) {
      assertAdminMutation(req);
      persistBoardMove(req, boardMemberMatch[1], await readJsonBody(req));
      return json(res, 200, currentPayload());
    }

    const credentialMatch = url.pathname.match(/^\/api\/credentials\/items\/([a-z0-9-]+)$/);
    if (req.method === 'PUT' && credentialMatch) {
      assertAdminMutation(req);
      saveCredential(req, credentialMatch[1], await readJsonBody(req));
      return json(res, 200, currentPayload());
    }

    const itemMatch = url.pathname.match(/^\/go\/([a-z0-9-]+)\/?$/);
    if (req.method === 'GET' && itemMatch) return redirectTarget(req, res, 'items', itemMatch[1]);
    const sectionMatch = url.pathname.match(/^\/section\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?\/?$/);
    if (req.method === 'GET' && sectionMatch) {
      return redirectTarget(req, res, 'sections', sectionMatch[1], sectionMatch[2] || null);
    }
    return text(res, 404, 'Not found\n');
  } catch (error) {
    console.error(error);
    return json(res, error.statusCode || 500, { error: error.message || 'internal error' });
  }
});

server.listen(port, host, () => {
  console.log(`toolbox-control listening on http://${host}:${port}`);
});
