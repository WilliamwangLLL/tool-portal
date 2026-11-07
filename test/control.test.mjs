import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildCardLibrary,
  buildNginxMap,
  buildProjectHtpasswd,
  createBoard,
  defaultState,
  moveBoardMember,
  normalizeState,
  renderPortal,
  updateBoard,
  updatePolicy,
  validateCredentialInput,
  validateCatalog
} from '../lib/control.mjs';
import {
  patchKkhcNginx,
  patchMainNginx,
  patchStageNginx
} from '../scripts/patch-nginx.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const catalog = validateCatalog(JSON.parse(fs.readFileSync(path.join(root, 'config', 'catalog.json'), 'utf8')));
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const business = fs.readFileSync(path.join(root, 'business', 'index.html'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'admin', 'index.html'), 'utf8');
const workspace = fs.readFileSync(path.join(root, 'workspace', 'index.html'), 'utf8');

test('catalog classifies every current section and content entry exactly once', () => {
  assert.equal(catalog.sections.length, 2);
  assert.equal(catalog.boards.length, 7);
  assert.equal(catalog.items.length, 43);
  const classified = Object.values(catalog.audienceDefaults).flat();
  assert.equal(classified.length, 45);
  assert.equal(new Set(classified).size, 45);
  assert.equal(catalog.audienceDefaults.public.length, 32);
  assert.equal(catalog.audienceDefaults.owner.length, 9);
  assert.equal(catalog.audienceDefaults.shared.length, 4);
  assert.equal(catalog.boards.flatMap((board) => board.members).length, 44);
});

test('V1 state migrates to V3 approved defaults instead of preserving mixed modes', () => {
  const legacy = {
    version: 1,
    updatedAt: '2026-07-19T00:00:00Z',
    sections: { 'business-page': 'password' },
    items: { 'huacai-dashboard': 'hidden', 'openclaw-manual': 'online' }
  };
  const migrated = normalizeState(catalog, legacy, new Date('2026-07-20T00:00:00Z'));
  assert.equal(migrated.version, 3);
  assert.equal(migrated.boards.length, 7);
  assert.deepEqual(migrated.sections['business-page'], { audience: 'public', listed: true, status: 'online' });
  assert.deepEqual(migrated.items['huacai-dashboard'], { audience: 'owner', listed: false, status: 'online' });
  assert.deepEqual(migrated.items['openclaw-manual'], { audience: 'public', listed: true, status: 'online' });
});

test('V2 production policies migrate to V3 without losing access decisions', () => {
  const legacy = {
    version: 2,
    updatedAt: '2026-07-19T00:00:00Z',
    sections: { 'business-page': { audience: 'owner', listed: false, status: 'online' } },
    items: { 'huacai-dashboard': { audience: 'shared', listed: false, status: 'maintenance' } }
  };
  const migrated = normalizeState(catalog, legacy, new Date('2026-07-20T00:00:00Z'));
  assert.equal(migrated.version, 3);
  assert.deepEqual(migrated.sections['business-page'], { audience: 'owner', listed: false, status: 'online' });
  assert.deepEqual(migrated.items['huacai-dashboard'], { audience: 'shared', listed: false, status: 'maintenance' });
  assert.equal(migrated.boards.flatMap((board) => board.members).length, 44);
});

test('public portal renders only listed, online, public entries', () => {
  const state = defaultState(catalog, new Date('2026-07-20T00:00:00Z'));
  const renderedHome = renderPortal(home, 'home', catalog, state);
  const renderedBusiness = renderPortal(business, 'business', catalog, state);
  assert.deepEqual(renderedHome.unmatched, []);
  assert.deepEqual(renderedBusiness.unmatched, []);
  assert.match(renderedHome.html, /toolbox-control\/go\/report-world-classics-100/);
  assert.match(renderedHome.html, /toolbox-control\/go\/report-online-education-2026-07/);
  assert.match(renderedHome.html, /toolbox-control\/go\/grok-bot-guide/);
  assert.match(renderedHome.html, /toolbox-control\/go\/manhattan-atlas/);
  assert.match(renderedHome.html, /toolbox-control\/go\/pi-digit-explorer/);
  assert.match(renderedHome.html, /toolbox-control\/go\/silver-observer/);
  assert.match(renderedHome.html, /toolbox-control\/go\/youshanhe/);
  assert.match(renderedHome.html, /toolbox-control\/go\/songjian-home/);
  assert.match(renderedHome.html, /toolbox-control\/go\/lunar-rover/);
  assert.match(renderedBusiness.html, /OpenClaw 实战手册/);
  assert.doesNotMatch(renderedBusiness.html, /同城活动作战包生成器/);
  assert.doesNotMatch(renderedBusiness.html, /华彩作战指挥仪表盘/);
  assert.doesNotMatch(renderedBusiness.html, /toolbox-managed-lock/);
  assert.match(renderedBusiness.html, /href="\/toolbox-control\/workspace\/"/);
  assert.match(renderedBusiness.html, /磊哥入口/);
});

test('empty public child pages disappear from every visible navigation entry', () => {
  const library = buildCardLibrary(catalog, [{ page: 'home', template: home }, { page: 'business', template: business }]);
  let state = defaultState(catalog);
  for (const id of ['openclaw-manual', 'vocal-quiz', 'organizer-quiz']) {
    state = moveBoardMember(catalog, state, 'business-gateway', { kind: 'items', id });
  }
  const renderedHome = renderPortal(home, 'home', catalog, state, library.cards).html;
  const renderedBusiness = renderPortal(business, 'business', catalog, state, library.cards).html;
  assert.doesNotMatch(renderedHome, /toolbox-control\/section\/business-page/);
  assert.match(renderedHome, /公众号排版器/);
  assert.match(renderedHome, /黄金歌曲匹配测评/);
  assert.match(renderedHome, /主理人测评/);
  assert.doesNotMatch(renderedBusiness, /class="card"/);
});

test('public listing and runtime status are independent controls', () => {
  let state = defaultState(catalog);
  state = updatePolicy(catalog, state, 'items', 'report-starlink', { listed: false });
  assert.doesNotMatch(renderPortal(home, 'home', catalog, state).html, /星链 Starlink 全景调研/);
  assert.equal(state.items['report-starlink'].audience, 'public');
  assert.equal(state.items['report-starlink'].status, 'online');
  state = updatePolicy(catalog, state, 'items', 'report-starlink', { audience: 'owner' });
  assert.equal(state.items['report-starlink'].listed, false);
  state = updatePolicy(catalog, state, 'items', 'report-starlink', { audience: 'public' });
  assert.equal(state.items['report-starlink'].listed, true);
});

test('boards can be removed from the public catalog without disabling member targets', () => {
  let state = defaultState(catalog);
  state = updatePolicy(catalog, state, 'boards', 'personal-growth', { listed: false });
  const rendered = renderPortal(home, 'home', catalog, state);
  assert.doesNotMatch(rendered.html, /🌱 个人成长/);
  assert.doesNotMatch(rendered.html, /Dan Koe/);
  assert.match(rendered.html, /🏢 公司调研/);
  assert.equal(state.items['report-dan-koe'].status, 'online');
});

test('creating and moving boards keeps one membership and auto-deletes empty boards', () => {
  const at = new Date('2026-07-20T01:02:03Z');
  let state = defaultState(catalog, at);
  state = createBoard(catalog, state, {
    title: 'AI 实用工具', page: 'home', member: { kind: 'items', id: 'report-dan-koe' }
  }, at);
  const created = state.boards.find((board) => board.title === 'AI 实用工具');
  assert.ok(created);
  assert.equal(state.boards.some((board) => board.id === 'personal-growth'), false);
  assert.deepEqual(created.members, [{ kind: 'items', id: 'report-dan-koe' }]);
  state = moveBoardMember(catalog, state, 'company-research', { kind: 'items', id: 'report-dan-koe' }, at);
  assert.equal(state.boards.some((board) => board.id === created.id), false);
  assert.equal(state.boards.flatMap((board) => board.members).filter((member) => member.id === 'report-dan-koe').length, 1);
});

test('board rename, page move, and order changes affect dynamic public rendering', () => {
  const library = buildCardLibrary(catalog, [{ page: 'home', template: home }, { page: 'business', template: business }]);
  let state = defaultState(catalog);
  state = updateBoard(catalog, state, 'creative-tools', { title: '内容生产', page: 'business', position: 0 });
  const businessPage = renderPortal(business, 'business', catalog, state, library.cards).html;
  const homePage = renderPortal(home, 'home', catalog, state, library.cards).html;
  assert.match(businessPage, /内容生产/);
  assert.match(businessPage, /公众号排版器/);
  assert.doesNotMatch(homePage, /✍️ 创作工具/);
  assert.equal(state.boards[0].id, 'creative-tools');
  assert.throws(
    () => updateBoard(catalog, state, 'business-gateway', { page: 'business' }),
    /不能放进商业工具页面自身/
  );
});

test('owner surfaces expose the total console and complete board-management controls', () => {
  assert.match(workspace, /磊哥总控台/);
  assert.match(workspace, /公开商业工具/);
  assert.match(workspace, /我的私人工具/);
  assert.match(workspace, /全部板块/);
  assert.match(admin, /创建新板块/);
  assert.match(admin, /所属板块/);
  assert.match(admin, /空板块/);
  assert.match(admin, /api\/boards/);
});

test('nginx policy separates audience, maintenance, and offline status', () => {
  let state = defaultState(catalog);
  state = updatePolicy(catalog, state, 'items', 'organizer-quiz', { audience: 'shared' });
  state = updatePolicy(catalog, state, 'items', 'organizer-admin', { status: 'maintenance' });
  state = updatePolicy(catalog, state, 'items', 'sales-dashboard', { status: 'offline' });
  const map = buildNginxMap(catalog, state);
  const admin = map.indexOf('/kkhc/admin');
  const quiz = map.indexOf('/kkhc(?:/|$)');
  assert.ok(admin >= 0 && quiz >= 0 && admin < quiz);
  assert.match(map, /toolbox_access_realm/);
  assert.match(map, /map \$request_uri \$toolbox_original_uri/);
  assert.doesNotMatch(map, /map "\$host\$uri"/);
  assert.match(map, /toolbox_maintenance/);
  assert.match(map, /toolbox_hidden/);
  assert.match(map, /Toolbox Admin/);
  const hiddenMap = map.split('map "$host$toolbox_original_uri" $toolbox_hidden {')[1].split('map "$host$toolbox_original_uri" $toolbox_maintenance {')[0];
  const maintenanceMap = map.split('map "$host$toolbox_original_uri" $toolbox_maintenance {')[1].split('map "$host$toolbox_original_uri" $toolbox_auth_file {')[0];
  assert.match(hiddenMap, /\/sales\(\?:\/\|\$\) 1;/);
  assert.match(maintenanceMap, /\/kkhc\/admin\(\?:\/\|\$\) 1;/);
});

test('configured shared projects use an isolated password file and realm', () => {
  const state = defaultState(catalog);
  const credentials = {
    version: 1,
    updatedAt: '2026-07-20T00:00:00Z',
    items: { chuanmenba: { username: 'partner', updatedAt: '2026-07-20T00:00:00Z' } }
  };
  const map = buildNginxMap(catalog, state, credentials, { credentialsRoot: '/secure/projects' });
  assert.match(map, /Toolbox Project - chuanmenba/);
  assert.match(map, /\/secure\/projects\/chuanmenba\.htpasswd/);
  assert.match(map, /default \/www\/server\/nginx\/conf\/my_htpasswd/);
});

test('project password file accepts the owner credential while keeping partner credentials per project', () => {
  const master = 'wang:$6$salt$masterhash\n';
  const result = buildProjectHtpasswd(master, 'partner', '$6$other$partnerhash');
  assert.equal(result, 'wang:$6$salt$masterhash\npartner:$6$other$partnerhash\n');
  assert.throws(() => buildProjectHtpasswd(master, 'wang', '$6$other$hash'), /管理员用户名/);
});

test('project credential input rejects unsafe usernames and weak passwords', () => {
  assert.deepEqual(validateCredentialInput('partner_1', 'StrongPass-2026'), {
    username: 'partner_1',
    password: 'StrongPass-2026'
  });
  assert.throws(() => validateCredentialInput('bad:name', 'StrongPass-2026'), /用户名/);
  assert.throws(() => validateCredentialInput('partner', 'short'), /密码长度/);
  assert.throws(() => validateCredentialInput('partner', 'valid-pass\nline'), /控制字符/);
});

test('nginx patching is idempotent and installs public pages plus protected owner surfaces', () => {
  const main = 'http\n    {\n\t\tinclude proxy.conf;\n}\n';
  const patchedMain = patchMainNginx(main);
  assert.equal(patchMainNginx(patchedMain), patchedMain);

  const stage = `server {\n    root /www/wwwroot/default;\n    # tool-portal /my/ basic auth\n    location ^~ /my/ {\n        auth_basic "Tool Portal";\n        auth_basic_user_file /www/server/nginx/conf/my_htpasswd;\n    }\n    location ^~ /chuanmenba/ {\n        auth_basic "Tool Portal";\n        auth_basic_user_file /www/server/nginx/conf/my_htpasswd;\n        proxy_pass http://127.0.0.1:3510/;\n    }\n}`;
  const patchedStage = patchStageNginx(stage);
  assert.equal(patchStageNginx(patchedStage), patchedStage);
  assert.match(patchedStage, /BEGIN toolbox-control/);
  assert.match(patchedStage, /proxy_pass http:\/\/127\.0\.0\.1:3520\/page\/home/);
  assert.match(patchedStage, /proxy_pass http:\/\/127\.0\.0\.1:3520\/page\/business/);
  assert.match(patchedStage, /location \^~ \/toolbox-control\/workspace\//);
  assert.doesNotMatch(patchedStage, /location \^~ \/my\/ \{\n\s*auth_basic/);
  assert.doesNotMatch(patchedStage, /location \^~ \/chuanmenba\/ \{\n\s*auth_basic/);

  const kkhc = 'server {\n    listen 80;\n    location /x {\n        root /www/wwwroot/kkhc;\n    }\n}\nserver {\n    listen 443 ssl;\n    root /www/wwwroot/kkhc;\n}\n';
  const patchedKkhc = patchKkhcNginx(kkhc);
  assert.equal(patchKkhcNginx(patchedKkhc), patchedKkhc);
  assert.doesNotMatch(patchedKkhc.split('server {\n    listen 443 ssl;')[0], /toolbox-control-server/);
});

test('server include enforces maintenance before authentication', () => {
  const include = fs.readFileSync(path.join(root, 'deploy', 'toolbox-control-server.conf'), 'utf8');
  assert.match(include, /\$toolbox_hidden = 1/);
  assert.match(include, /\$toolbox_maintenance = 1/);
  assert.ok(include.indexOf('$toolbox_maintenance') < include.indexOf('auth_basic $toolbox_access_realm'));
});
