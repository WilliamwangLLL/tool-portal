import fs from 'node:fs';
import path from 'node:path';

export const AUDIENCES = new Set(['public', 'owner', 'shared']);
export const STATUSES = new Set(['online', 'maintenance', 'offline']);
export const MASTER_AUTH_FILE = '/www/server/nginx/conf/my_htpasswd';
const PORTAL_ORIGIN = 'https://www.haoyunlai.fun';
const CONTROL_HOSTS = ['haoyunlai.fun', 'www.haoyunlai.fun'];
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{1,32}$/;
const BOARD_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const BOARD_PAGES = new Set(['home', 'business']);
const BOARD_TITLE_MAX = 48;

export function validateCatalog(catalog) {
  if (!catalog || catalog.version !== 3) throw new Error('catalog.version must be 3');
  if (!Array.isArray(catalog.sections) || !Array.isArray(catalog.items) || !Array.isArray(catalog.boards)) {
    throw new Error('catalog sections/items/boards must be arrays');
  }
  const ids = new Set();
  for (const entry of [...catalog.sections, ...catalog.items]) {
    if (!entry.id || !/^[a-z0-9][a-z0-9-]*$/.test(entry.id)) {
      throw new Error(`invalid catalog id: ${entry.id}`);
    }
    if (ids.has(entry.id)) throw new Error(`duplicate catalog id: ${entry.id}`);
    ids.add(entry.id);
    for (const route of entry.routes || []) validateRoute(route, entry.id);
  }
  const classified = new Set();
  for (const audience of AUDIENCES) {
    const entries = catalog.audienceDefaults?.[audience];
    if (!Array.isArray(entries)) throw new Error(`audienceDefaults.${audience} must be an array`);
    for (const id of entries) {
      if (!ids.has(id)) throw new Error(`unknown classified id: ${id}`);
      if (classified.has(id)) throw new Error(`catalog id classified more than once: ${id}`);
      classified.add(id);
    }
  }
  const missing = [...ids].filter((id) => !classified.has(id));
  if (missing.length) throw new Error(`catalog ids missing audience classification: ${missing.join(', ')}`);

  const boardIds = new Set();
  const memberKeys = new Set();
  const boardable = new Set([
    ...catalog.items.map((entry) => `items:${entry.id}`),
    ...catalog.sections.filter((entry) => entry.boardable).map((entry) => `sections:${entry.id}`)
  ]);
  for (const board of catalog.boards) {
    if (!BOARD_ID_PATTERN.test(board.id || '')) throw new Error(`invalid board id: ${board.id}`);
    if (boardIds.has(board.id)) throw new Error(`duplicate board id: ${board.id}`);
    boardIds.add(board.id);
    validateBoardFields(board.title, board.page);
    if (!Array.isArray(board.members) || board.members.length === 0) throw new Error(`board ${board.id} must have members`);
    for (const member of board.members) {
      const key = memberKey(member.kind, member.id);
      if (!boardable.has(key)) throw new Error(`unknown board member: ${key}`);
      if (memberKeys.has(key)) throw new Error(`board member assigned more than once: ${key}`);
      if (!boardAllowsMember(catalog, board.page, member.kind, member.id)) {
        throw new Error(`board ${board.id} cannot contain ${key}`);
      }
      memberKeys.add(key);
    }
  }
  const unassigned = [...boardable].filter((key) => !memberKeys.has(key));
  if (unassigned.length) throw new Error(`boardable entries missing board: ${unassigned.join(', ')}`);
  return catalog;
}

function memberKey(kind, id) {
  if (!['sections', 'items'].includes(kind) || !BOARD_ID_PATTERN.test(id || '')) {
    throw new Error(`invalid board member: ${kind}:${id}`);
  }
  return `${kind}:${id}`;
}

function validateBoardFields(title, page) {
  if (typeof title !== 'string' || !title.trim() || title.trim().length > BOARD_TITLE_MAX || /\p{Cc}/u.test(title)) {
    throw Object.assign(new Error(`板块名称须为 1–${BOARD_TITLE_MAX} 个字符`), { statusCode: 400 });
  }
  if (!BOARD_PAGES.has(page)) throw Object.assign(new Error('板块页面必须是工具箱首页或商业工具页'), { statusCode: 400 });
  return { title: title.trim(), page };
}

function boardAllowsMember(catalog, page, kind, id) {
  if (kind !== 'sections') return true;
  const entry = catalog.sections.find((candidate) => candidate.id === id);
  return Boolean(entry?.boardable) && entry.page !== page;
}

function validateRoute(route, owner) {
  if (!Array.isArray(route.hosts) || route.hosts.length === 0) {
    throw new Error(`route hosts missing for ${owner}`);
  }
  if (Boolean(route.exact) === Boolean(route.prefix)) {
    throw new Error(`route for ${owner} needs exactly one of exact/prefix`);
  }
  const value = route.exact || route.prefix;
  if (!value.startsWith('/')) throw new Error(`route path must be absolute for ${owner}`);
}

function defaultAudience(catalog, id) {
  for (const audience of AUDIENCES) {
    if (catalog.audienceDefaults[audience].includes(id)) return audience;
  }
  throw new Error(`missing audience for ${id}`);
}

function defaultPolicy(catalog, id) {
  const audience = defaultAudience(catalog, id);
  return { audience, listed: audience === 'public', status: 'online' };
}

function defaultBoardPolicy() {
  return { audience: 'public', listed: true, status: 'online' };
}

function defaultBoards(catalog) {
  return catalog.boards.map((board, order) => ({
    id: board.id,
    title: board.title,
    page: board.page,
    order,
    policy: defaultBoardPolicy(),
    members: board.members.map((member) => ({ ...member }))
  }));
}

export function defaultState(catalog, now = new Date()) {
  return {
    version: 3,
    updatedAt: now.toISOString(),
    sections: Object.fromEntries(catalog.sections.map((entry) => [entry.id, defaultPolicy(catalog, entry.id)])),
    items: Object.fromEntries(catalog.items.map((entry) => [entry.id, defaultPolicy(catalog, entry.id)])),
    boards: defaultBoards(catalog)
  };
}

function normalizePolicy(fallback, candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return { ...fallback };
  return {
    audience: AUDIENCES.has(candidate.audience) ? candidate.audience : fallback.audience,
    listed: typeof candidate.listed === 'boolean' ? candidate.listed : fallback.listed,
    status: STATUSES.has(candidate.status) ? candidate.status : fallback.status
  };
}

function normalizeBoards(catalog, candidateBoards) {
  const boardable = new Set([
    ...catalog.items.map((entry) => `items:${entry.id}`),
    ...catalog.sections.filter((entry) => entry.boardable).map((entry) => `sections:${entry.id}`)
  ]);
  const seenBoards = new Set();
  const seenMembers = new Set();
  const boards = [];
  for (const candidate of Array.isArray(candidateBoards) ? candidateBoards : []) {
    if (!candidate || !BOARD_ID_PATTERN.test(candidate.id || '') || seenBoards.has(candidate.id)) continue;
    let fields;
    try {
      fields = validateBoardFields(candidate.title, candidate.page);
    } catch {
      continue;
    }
    const members = [];
    for (const member of Array.isArray(candidate.members) ? candidate.members : []) {
      let key;
      try {
        key = memberKey(member.kind, member.id);
      } catch {
        continue;
      }
      if (!boardable.has(key) || seenMembers.has(key) || !boardAllowsMember(catalog, fields.page, member.kind, member.id)) continue;
      seenMembers.add(key);
      members.push({ kind: member.kind, id: member.id });
    }
    if (!members.length) continue;
    seenBoards.add(candidate.id);
    boards.push({
      id: candidate.id,
      ...fields,
      order: Number.isInteger(candidate.order) ? candidate.order : boards.length,
      policy: normalizePolicy(defaultBoardPolicy(), candidate.policy),
      members
    });
  }

  for (const fallback of defaultBoards(catalog)) {
    const missing = fallback.members.filter((member) => !seenMembers.has(memberKey(member.kind, member.id)));
    if (!missing.length) continue;
    let board = boards.find((candidate) => candidate.id === fallback.id);
    if (!board) {
      board = { ...fallback, members: [] };
      boards.push(board);
      seenBoards.add(board.id);
    }
    for (const member of missing) {
      if (!boardAllowsMember(catalog, board.page, member.kind, member.id)) continue;
      board.members.push({ ...member });
      seenMembers.add(memberKey(member.kind, member.id));
    }
  }
  return boards
    .filter((board) => board.members.length)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((board, order) => ({ ...board, order }));
}

export function normalizeState(catalog, candidate, now = new Date()) {
  const base = defaultState(catalog, now);
  // V1 mixed visibility and authentication into one value. Its migration is the
  // approved catalog classification, not a lossy translation of hidden/password.
  if (!candidate || typeof candidate !== 'object' || ![2, 3].includes(candidate.version)) return base;
  for (const kind of ['sections', 'items']) {
    const incoming = candidate[kind] || {};
    for (const id of Object.keys(base[kind])) {
      base[kind][id] = normalizePolicy(base[kind][id], incoming[id]);
    }
  }
  if (candidate.version === 3) base.boards = normalizeBoards(catalog, candidate.boards);
  if (typeof candidate.updatedAt === 'string') base.updatedAt = candidate.updatedAt;
  return base;
}

export function updatePolicy(catalog, state, kind, id, changes, now = new Date()) {
  if (!['sections', 'items', 'boards'].includes(kind)) throw new Error('kind must be sections, items, or boards');
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw new Error('policy changes must be an object');
  const allowed = new Set(['audience', 'listed', 'status']);
  const keys = Object.keys(changes);
  if (keys.length === 0 || keys.some((key) => !allowed.has(key))) throw new Error('policy fields must be audience, listed, or status');
  if ('audience' in changes && !AUDIENCES.has(changes.audience)) throw new Error('invalid audience');
  if ('listed' in changes && typeof changes.listed !== 'boolean') throw new Error('listed must be boolean');
  if ('status' in changes && !STATUSES.has(changes.status)) throw new Error('invalid status');

  const next = normalizeState(catalog, state, now);
  const target = kind === 'boards'
    ? next.boards.find((board) => board.id === id)
    : catalog[kind].find((entry) => entry.id === id);
  if (!target) throw new Error(`unknown ${kind} id: ${id}`);
  const current = kind === 'boards' ? target.policy : next[kind][id];
  const policy = { ...current, ...changes };
  if ('audience' in changes && !('listed' in changes)) {
    policy.listed = changes.audience === 'public';
  }
  if (policy.audience !== 'public') policy.listed = false;
  if (kind === 'boards') target.policy = policy;
  else next[kind][id] = policy;
  next.updatedAt = now.toISOString();
  return next;
}

function assertBoardMember(catalog, kind, id) {
  const collection = kind === 'sections' ? catalog.sections : kind === 'items' ? catalog.items : [];
  const entry = collection.find((candidate) => candidate.id === id);
  if (!entry || (kind === 'sections' && !entry.boardable)) {
    throw Object.assign(new Error('未知或不可分组的项目/页面'), { statusCode: 404 });
  }
  return entry;
}

function makeBoardId(title, state, now) {
  const ascii = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
  const seed = ascii || 'board';
  const suffix = now.getTime().toString(36);
  let id = `${seed}-${suffix}`;
  let attempt = 2;
  const existing = new Set(state.boards.map((board) => board.id));
  while (existing.has(id)) id = `${seed}-${suffix}-${attempt++}`;
  return id;
}

export function createBoard(catalog, state, input, now = new Date()) {
  const next = normalizeState(catalog, state, now);
  const fields = validateBoardFields(input?.title, input?.page);
  const kind = input?.member?.kind;
  const id = input?.member?.id;
  assertBoardMember(catalog, kind, id);
  if (!boardAllowsMember(catalog, fields.page, kind, id)) {
    throw Object.assign(new Error('这个页面不能放进它自己所属的页面'), { statusCode: 400 });
  }
  for (const board of next.boards) board.members = board.members.filter((member) => memberKey(member.kind, member.id) !== memberKey(kind, id));
  next.boards = next.boards.filter((board) => board.members.length);
  next.boards.push({
    id: makeBoardId(fields.title, next, now),
    ...fields,
    order: next.boards.length,
    policy: defaultBoardPolicy(),
    members: [{ kind, id }]
  });
  next.boards = next.boards.map((board, order) => ({ ...board, order }));
  next.updatedAt = now.toISOString();
  return next;
}

export function updateBoard(catalog, state, id, changes, now = new Date()) {
  const next = normalizeState(catalog, state, now);
  const index = next.boards.findIndex((board) => board.id === id);
  if (index < 0) throw Object.assign(new Error('未知板块'), { statusCode: 404 });
  const board = next.boards[index];
  const fields = validateBoardFields(changes?.title ?? board.title, changes?.page ?? board.page);
  for (const member of board.members) {
    if (!boardAllowsMember(catalog, fields.page, member.kind, member.id)) {
      throw Object.assign(new Error('商业工具页面不能放进商业工具页面自身'), { statusCode: 400 });
    }
  }
  board.title = fields.title;
  board.page = fields.page;
  if (Number.isInteger(changes?.position)) {
    const [moved] = next.boards.splice(index, 1);
    const position = Math.max(0, Math.min(changes.position, next.boards.length));
    next.boards.splice(position, 0, moved);
  }
  next.boards = next.boards.map((candidate, order) => ({ ...candidate, order }));
  next.updatedAt = now.toISOString();
  return next;
}

export function moveBoardMember(catalog, state, boardId, member, now = new Date()) {
  const next = normalizeState(catalog, state, now);
  const target = next.boards.find((board) => board.id === boardId);
  if (!target) throw Object.assign(new Error('未知目标板块'), { statusCode: 404 });
  const kind = member?.kind;
  const id = member?.id;
  assertBoardMember(catalog, kind, id);
  if (!boardAllowsMember(catalog, target.page, kind, id)) {
    throw Object.assign(new Error('商业工具页面不能放进商业工具页面自身'), { statusCode: 400 });
  }
  const key = memberKey(kind, id);
  for (const board of next.boards) board.members = board.members.filter((candidate) => memberKey(candidate.kind, candidate.id) !== key);
  target.members.push({ kind, id });
  next.boards = next.boards.filter((board) => board.members.length).map((board, order) => ({ ...board, order }));
  next.updatedAt = now.toISOString();
  return next;
}

export function atomicWriteJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o750 });
  const temporary = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o640 });
  fs.renameSync(temporary, filePath);
}

export function defaultCredentials(now = new Date()) {
  return { version: 1, updatedAt: now.toISOString(), items: {} };
}

export function normalizeCredentials(catalog, candidate, now = new Date()) {
  const normalized = defaultCredentials(now);
  if (!candidate || typeof candidate !== 'object') return normalized;
  const itemIds = new Set(catalog.items.map((entry) => entry.id));
  for (const [id, metadata] of Object.entries(candidate.items || {})) {
    if (!itemIds.has(id) || !metadata || !USERNAME_PATTERN.test(metadata.username || '')) continue;
    normalized.items[id] = {
      username: metadata.username,
      updatedAt: typeof metadata.updatedAt === 'string' ? metadata.updatedAt : normalized.updatedAt
    };
  }
  if (typeof candidate.updatedAt === 'string') normalized.updatedAt = candidate.updatedAt;
  return normalized;
}

export function loadCredentials(catalog, credentialsPath) {
  if (!fs.existsSync(credentialsPath)) {
    const initial = defaultCredentials();
    atomicWriteJson(credentialsPath, initial);
    return initial;
  }
  const parsed = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const normalized = normalizeCredentials(catalog, parsed);
  if (JSON.stringify(parsed) !== JSON.stringify(normalized)) atomicWriteJson(credentialsPath, normalized);
  return normalized;
}

export function validateCredentialInput(username, password) {
  if (!USERNAME_PATTERN.test(username || '')) {
    throw Object.assign(new Error('用户名须为 1–32 位字母、数字、点、下划线或短横线'), { statusCode: 400 });
  }
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    throw Object.assign(new Error('密码长度须为 10–128 位'), { statusCode: 400 });
  }
  if (/\p{Cc}/u.test(password)) {
    throw Object.assign(new Error('密码不能包含控制字符'), { statusCode: 400 });
  }
  return { username, password };
}

export function credentialFilePath(credentialsRoot, itemId) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(itemId)) throw new Error('invalid credential item id');
  return path.join(credentialsRoot, `${itemId}.htpasswd`);
}

export function buildProjectHtpasswd(masterText, username, hash) {
  const lines = String(masterText || '').split(/\r?\n/).filter(Boolean);
  if (!lines.length || lines.some((line) => !line.includes(':'))) throw new Error('管理员密码文件格式无效');
  const masterUsers = new Set(lines.map((line) => line.slice(0, line.indexOf(':'))));
  if (masterUsers.has(username)) {
    throw Object.assign(new Error('分享用户名不能与管理员用户名相同'), { statusCode: 400 });
  }
  return `${lines.join('\n')}\n${username}:${hash}\n`;
}

export function loadState(catalog, statePath) {
  if (!fs.existsSync(statePath)) {
    const initial = defaultState(catalog);
    atomicWriteJson(statePath, initial);
    return initial;
  }
  const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const normalized = normalizeState(catalog, parsed);
  if (JSON.stringify(parsed) !== JSON.stringify(normalized)) atomicWriteJson(statePath, normalized);
  return normalized;
}

function canonicalTarget(value, page) {
  const base = page === 'business' ? `${PORTAL_ORIGIN}/my/business/` : `${PORTAL_ORIGIN}/my/`;
  const url = new URL(value, base);
  const pathname = url.pathname.replace(/\/+/g, '/');
  if (/^https?:\/\//i.test(value)) return `${url.protocol}//${url.host}${pathname}`;
  return pathname;
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function findBalancedDivEnd(html, start) {
  const token = /<div\b[^>]*>|<\/div>/gi;
  token.lastIndex = start;
  let depth = 0;
  for (let match = token.exec(html); match; match = token.exec(html)) {
    if (/^<div\b/i.test(match[0])) depth += 1;
    else depth -= 1;
    if (depth === 0) return match.index + match[0].length;
  }
  throw new Error(`unbalanced div at byte ${start}`);
}

function decorateCard(card, route) {
  let output = card.replace(
    /onclick="window\.open\(\s*'[^']+'\s*,\s*'_blank'\s*\)"/,
    `onclick="window.open('${route}', '_blank')"`
  );
  output = output.replace(
    /(<a\b[^>]*\bhref=")[^"]+("[^>]*\bclass="card-link")/,
    `$1${route}$2`
  );
  return output;
}

function isPubliclyListed(policy) {
  return policy.audience === 'public' && policy.listed && policy.status === 'online';
}

function htmlEscape(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function entryForTarget(catalog, value, page) {
  const key = canonicalTarget(value, page);
  const item = catalog.items.find((entry) => canonicalTarget(entry.target, page) === key);
  if (item) return { kind: 'items', entry: item };
  const section = catalog.sections.find((entry) => entry.boardable && entry.target && canonicalTarget(entry.target, page) === key);
  return section ? { kind: 'sections', entry: section } : null;
}

function extractTemplateCards(template, page, catalog) {
  const cards = new Map();
  const unmatched = [];
  const pattern = /<div class="card"\s+onclick="window\.open\(\s*'([^']+)'/g;
  for (let match = pattern.exec(template); match; match = pattern.exec(template)) {
    const start = match.index;
    const end = findBalancedDivEnd(template, start);
    const resolved = entryForTarget(catalog, match[1], page);
    if (resolved) {
      const key = memberKey(resolved.kind, resolved.entry.id);
      if (!cards.has(key)) cards.set(key, template.slice(start, end));
    } else {
      unmatched.push({ page, href: match[1] });
    }
    pattern.lastIndex = end;
  }
  return { cards, unmatched };
}

export function buildCardLibrary(catalog, pages) {
  const cards = new Map();
  const unmatched = [];
  for (const { page, template } of pages) {
    const extracted = extractTemplateCards(template, page, catalog);
    for (const [key, card] of extracted.cards) if (!cards.has(key)) cards.set(key, card);
    unmatched.push(...extracted.unmatched);
  }
  return { cards, unmatched };
}

function genericCard(entry) {
  return `<div class="card" onclick="window.open('${htmlEscape(entry.target)}', '_blank')">
                    <div class="card-icon">🧰</div>
                    <h3 class="card-title">${htmlEscape(entry.title)}</h3>
                    <p class="card-desc">${htmlEscape(entry.note || '从磊哥工具箱打开这个项目。')}</p>
                    <div class="card-meta"><span class="tag tag-tool">工具箱项目</span></div>
                    <a href="${htmlEscape(entry.target)}" target="_blank" class="card-link">打开项目 →</a>
                </div>`;
}

function pageHasPublicItems(page, catalog, state) {
  return state.boards.some((board) =>
    board.page === page &&
    isPubliclyListed(board.policy) &&
    board.members.some((member) =>
      member.kind === 'items' &&
      catalog.items.some((entry) => entry.id === member.id) &&
      isPubliclyListed(state.items[member.id])
    )
  );
}

function sectionSpans(template) {
  const spans = [];
  const pattern = /<div class="section">/g;
  for (let match = pattern.exec(template); match; match = pattern.exec(template)) {
    const end = findBalancedDivEnd(template, match.index);
    spans.push({ start: match.index, end });
    pattern.lastIndex = end;
  }
  return spans;
}

function renderedBoard(board, catalog, state, cardLibrary) {
  if (!isPubliclyListed(board.policy)) return '';
  const cards = [];
  for (const member of board.members) {
    const entry = catalog[member.kind].find((candidate) => candidate.id === member.id);
    const policy = state[member.kind][member.id];
    if (!entry || !isPubliclyListed(policy)) continue;
    if (member.kind === 'sections' && entry.page && !pageHasPublicItems(entry.page, catalog, state)) continue;
    const route = member.kind === 'items'
      ? `/toolbox-control/go/${encodeURIComponent(member.id)}`
      : `/toolbox-control/section/${encodeURIComponent(member.id)}`;
    cards.push(decorateCard(cardLibrary.get(memberKey(member.kind, member.id)) || genericCard(entry), route));
  }
  if (!cards.length) return '';
  return `<div class="section" data-toolbox-board="${htmlEscape(board.id)}">
            <h2 class="section-title">${htmlEscape(board.title)}</h2>
            <div class="grid">
                ${cards.join('\n                ')}
            </div>
        </div>`;
}

export function renderPortal(template, page, catalog, state, sharedCardLibrary = null) {
  const normalized = normalizeState(catalog, state);
  const extracted = extractTemplateCards(template, page, catalog);
  const cardLibrary = new Map(sharedCardLibrary || []);
  for (const [key, card] of extracted.cards) if (!cardLibrary.has(key)) cardLibrary.set(key, card);
  const spans = sectionSpans(template);
  if (!spans.length) throw new Error(`portal template has no sections for ${page}`);
  const boardsHtml = normalized.boards
    .filter((board) => board.page === page)
    .map((board) => renderedBoard(board, catalog, normalized, cardLibrary))
    .filter(Boolean)
    .join('\n        ');
  let html = `${template.slice(0, spans[0].start)}${boardsHtml}${template.slice(spans.at(-1).end)}`;
  const managedStyle = `
        .toolbox-owner-link { color: var(--gold); text-decoration: none; font-weight: 700; }
        .toolbox-owner-entry { position:fixed;z-index:20;top:14px;right:14px;color:#ffe09a;text-decoration:none;font-weight:750;font-size:13px;background:rgba(7,16,24,.9);border:1px solid rgba(243,201,105,.55);border-radius:999px;padding:8px 12px;backdrop-filter:blur(12px);box-shadow:0 7px 24px #0005; }
        @media(max-width:620px){.toolbox-owner-entry{top:9px;right:9px;padding:7px 10px;font-size:12px}}
  `;
  html = html.replace('</style>', `${managedStyle}</style>`);
  if (!html.includes('class="toolbox-owner-entry"')) {
    html = html.replace('<body>', '<body>\n    <a class="toolbox-owner-entry" href="/toolbox-control/workspace/">磊哥入口</a>');
  }
  if (!html.includes('class="toolbox-owner-link"')) {
    html = html.replace(
      '<a href="https://github.com/WilliamwangLLL" target="_blank">GitHub</a>',
      '<a class="toolbox-owner-link" href="/toolbox-control/workspace/">磊哥入口</a>\n                <a href="https://github.com/WilliamwangLLL" target="_blank">GitHub</a>'
    );
  }
  return { html, unmatched: extracted.unmatched };
}

export function writeRenderedPages({ appRoot, dataRoot, catalog, state }) {
  const renderedRoot = path.join(dataRoot, 'rendered');
  fs.mkdirSync(renderedRoot, { recursive: true, mode: 0o750 });
  const pages = [
    { page: 'home', source: path.join(appRoot, 'index.html'), target: path.join(renderedRoot, 'home.html') },
    { page: 'business', source: path.join(appRoot, 'business', 'index.html'), target: path.join(renderedRoot, 'business.html') }
  ].map((entry) => ({ ...entry, template: fs.readFileSync(entry.source, 'utf8') }));
  const library = buildCardLibrary(catalog, pages);
  const unmatched = [...library.unmatched];
  for (const page of pages) {
    const rendered = renderPortal(page.template, page.page, catalog, state, library.cards);
    const temporary = `${page.target}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(temporary, rendered.html, { mode: 0o640 });
    fs.renameSync(temporary, page.target);
  }
  return unmatched;
}

function regexEscape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function routeRegex(route) {
  const hosts = route.hosts.map(regexEscape).join('|');
  if (route.exact) return `^(?:${hosts})${regexEscape(route.exact)}$`;
  const prefix = route.prefix.endsWith('/') ? route.prefix.slice(0, -1) : route.prefix;
  return `^(?:${hosts})${regexEscape(prefix)}(?:/|$)`;
}

function rulesForEntry(entry, policy, authFile, realm) {
  return (entry.routes || []).map((route) => ({ regex: routeRegex(route), policy, authFile, realm }));
}

export function buildNginxMap(catalog, state, credentials = defaultCredentials(), options = {}) {
  const normalized = normalizeState(catalog, state);
  const normalizedCredentials = normalizeCredentials(catalog, credentials);
  const masterAuthFile = options.masterAuthFile || MASTER_AUTH_FILE;
  const credentialsRoot = options.credentialsRoot || '/var/lib/toolbox-control/credentials';
  const rules = [];
  for (const section of catalog.sections) {
    const policy = normalized.sections[section.id];
    rules.push(...rulesForEntry(section, policy, masterAuthFile, 'Toolbox Admin'));
    rules.push({
      regex: routeRegex({ hosts: CONTROL_HOSTS, prefix: `/toolbox-control/section/${section.id}` }),
      policy,
      authFile: masterAuthFile,
      realm: 'Toolbox Admin'
    });
  }
  for (const item of catalog.items) {
    const policy = normalized.items[item.id];
    const independent = policy.audience === 'shared' && Boolean(normalizedCredentials.items[item.id]);
    const authFile = independent ? credentialFilePath(credentialsRoot, item.id) : masterAuthFile;
    const realm = independent ? `Toolbox Project - ${item.id}` : 'Toolbox Admin';
    rules.push(...rulesForEntry(item, policy, authFile, realm));
    rules.push({
      regex: routeRegex({ hosts: CONTROL_HOSTS, prefix: `/toolbox-control/go/${item.id}` }),
      policy,
      authFile,
      realm
    });
  }
  rules.sort((a, b) => b.regex.length - a.regex.length || a.regex.localeCompare(b.regex));
  const unique = [];
  const seen = new Set();
  for (const rule of rules) {
    if (seen.has(rule.regex)) continue;
    seen.add(rule.regex);
    unique.push(rule);
  }
  const realmLines = unique.map(({ regex, policy, realm }) =>
    `    ~${regex} ${policy.audience === 'public' ? 'off' : `"${realm}"`};`
  );
  const hiddenLines = unique.map(({ regex, policy }) => `    ~${regex} ${policy.status === 'offline' ? '1' : '0'};`);
  const maintenanceLines = unique.map(({ regex, policy }) => `    ~${regex} ${policy.status === 'maintenance' ? '1' : '0'};`);
  const authFileLines = unique.map(({ regex, authFile }) => `    ~${regex} ${authFile};`);
  // $uri can be rewritten inside a location before the access phase. Preserve
  // the original path so authentication cannot be bypassed by proxy rewrites.
  return `# Generated by toolbox-control. Do not edit manually.\n` +
    `map $request_uri $toolbox_original_uri {\n    ~^([^?]*) $1;\n}\n\n` +
    `map "$host$toolbox_original_uri" $toolbox_access_realm {\n    default off;\n${realmLines.join('\n')}\n}\n\n` +
    `map "$host$toolbox_original_uri" $toolbox_hidden {\n    default 0;\n${hiddenLines.join('\n')}\n}\n\n` +
    `map "$host$toolbox_original_uri" $toolbox_maintenance {\n    default 0;\n${maintenanceLines.join('\n')}\n}\n\n` +
    `map "$host$toolbox_original_uri" $toolbox_auth_file {\n    default ${masterAuthFile};\n${authFileLines.join('\n')}\n}\n`;
}

export function publicState(catalog, state, applyStatus = null, credentials = defaultCredentials()) {
  const normalized = normalizeState(catalog, state);
  const normalizedCredentials = normalizeCredentials(catalog, credentials);
  const placement = new Map();
  for (const board of normalized.boards) {
    for (const member of board.members) placement.set(memberKey(member.kind, member.id), board);
  }
  return {
    version: normalized.version,
    updatedAt: normalized.updatedAt,
    applyStatus,
    audiences: [...AUDIENCES],
    statuses: [...STATUSES],
    sections: catalog.sections.map((entry) => ({
      ...entry,
      policy: normalized.sections[entry.id],
      enforcement: entry.kind === 'page' ? 'full' : 'portal',
      board: placement.has(memberKey('sections', entry.id)) ? {
        id: placement.get(memberKey('sections', entry.id)).id,
        title: placement.get(memberKey('sections', entry.id)).title,
        page: placement.get(memberKey('sections', entry.id)).page
      } : null
    })),
    boards: normalized.boards.map((board) => ({
      id: board.id,
      title: board.title,
      page: board.page,
      order: board.order,
      policy: board.policy,
      members: board.members.map((member) => ({ ...member }))
    })),
    items: catalog.items.map((entry) => {
      const credential = normalizedCredentials.items[entry.id];
      const board = placement.get(memberKey('items', entry.id));
      return {
        ...entry,
        policy: normalized.items[entry.id],
        board: board ? { id: board.id, title: board.title, page: board.page } : null,
        enforcement: entry.external ? 'gateway-only' : 'full',
        credential: credential ? {
          scope: 'independent',
          username: credential.username,
          updatedAt: credential.updatedAt
        } : { scope: 'pending' },
        shareUrl: `/toolbox-control/go/${entry.id}`
      };
    })
  };
}
