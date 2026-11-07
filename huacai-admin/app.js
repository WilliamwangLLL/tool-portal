// 运营后台 - 单页应用（Vanilla JS，无框架依赖）
// 本地联调使用 http://127.0.0.1:3000/api；生产使用同域 /huacai-api 反向代理。

const API_BASE = (location.hostname === '127.0.0.1' || location.hostname === 'localhost' || location.protocol === 'file:')
  ? 'http://127.0.0.1:3000/api'
  : '/huacai-api'; // 生产：与后端同域，用 /huacai-api 前缀走 nginx 反代

const state = {
  token: localStorage.getItem('admin_token') || '',
  admin: JSON.parse(localStorage.getItem('admin_user') || 'null'),
  view: 'overview',
};

// ========== 工具 ==========
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}
async function api(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: 'Bearer ' + state.token } : {}),
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({ code: -1, message: 'bad json' }));
  if (data.code === 0) return data.data;
  if (data.code === 2) { logout(); throw new Error(data.message); }
  toast(data.message || '请求失败', 'error');
  throw new Error(data.message || 'api error');
}
function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') el.className = attrs[k];
    else if (k === 'html') el.innerHTML = attrs[k];
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
    else el.setAttribute(k, attrs[k]);
  }
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null) return;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return el;
}
function fmtTime(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function fmtMoney(n) { return '¥' + Number(n || 0).toFixed(2); }

// ========== 登录 ==========
async function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  if (!username || !password) return toast('请填写账号密码', 'error');
  try {
    const r = await fetch(API_BASE + '/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const d = await r.json();
    if (d.code !== 0) return toast(d.message || '登录失败', 'error');
    state.token = d.data.token; state.admin = d.data.admin;
    localStorage.setItem('admin_token', state.token);
    localStorage.setItem('admin_user', JSON.stringify(state.admin));
    toast('登录成功');
    showApp();
  } catch (e) { toast('网络异常', 'error'); }
}
function logout() {
  state.token = ''; state.admin = null;
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-page').style.display = 'flex';
}
async function showApp() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('admin-username').textContent = state.admin && state.admin.username || '-';
  applyRoleVisibility();
  initNav();
  await loadOverview();
}

function applyRoleVisibility() {
  const role = state.admin && state.admin.role;
  const can = {
    super: { clubs: 1, activities: 1, users: 1, withdrawals: 1, ads: 1, report: 1 },
    reviewer: { clubs: 1, activities: 1, users: 1, report: 1 },
    finance: { withdrawals: 1, report: 1 },
  }[role] || { report: 1 };
  document.querySelectorAll('.sidebar nav a').forEach((a) => {
    const v = a.dataset.view;
    if (v === 'overview' || v === 'report' || can[v]) a.style.display = 'flex';
    else a.style.display = 'none';
  });
  // 角色 tag 展示
  const u = document.getElementById('admin-username');
  if (role) u.textContent = `${state.admin.username} [${role}]`;
}

// ========== 导航 ==========
function initNav() {
  document.querySelectorAll('.sidebar nav a').forEach((a) => {
    a.onclick = (e) => {
      e.preventDefault();
      document.querySelectorAll('.sidebar nav a').forEach(x => x.classList.remove('active'));
      a.classList.add('active');
      state.view = a.dataset.view;
      renderView();
    };
  });
}
async function renderView() {
  const titleMap = { overview: '数据概览', clubs: '俱乐部审核', activities: '活动审核', withdrawals: '提现审批', users: '用户管理', report: '数据分析' };
  document.getElementById('view-title').textContent = titleMap[state.view];
  const el = document.getElementById('content');
  el.innerHTML = '<div class="empty">加载中...</div>';
  if (state.view === 'overview') await loadOverview();
  else if (state.view === 'clubs') await loadClubs();
  else if (state.view === 'activities') await loadActivities();
  else if (state.view === 'withdrawals') await loadWithdrawals();
  else if (state.view === 'users') await loadUsers();
  else if (state.view === 'ads') await loadAds();
  else if (state.view === 'report') await loadReport();
}

// ========== 数据概览 ==========
async function loadOverview() {
  const el = document.getElementById('content');
  try {
    const s = await api('/admin/overview');

    // 侧栏角标
    ['clubs_pending','activities_pending','withdraw_pending'].forEach((k, i) => {
      const ids = ['badge-clubs','badge-activities','badge-withdrawals'];
      const badge = document.getElementById(ids[i]);
      const v = Number(s[k] || 0);
      badge.textContent = v;
      badge.style.display = v > 0 ? 'inline-block' : 'none';
    });

    el.innerHTML = '';
    const grid = h('div', { class: 'stat-grid' }, [
      statCard(s.users, '注册用户'),
      statCard(s.clubs, '俱乐部总数'),
      statCard(s.clubs_pending, '待审核俱乐部', 'warn'),
      statCard(s.activities, '活动总数'),
      statCard(s.activities_pending, '待审核活动', 'warn'),
      statCard(s.paid_orders, '已支付订单'),
      statCard(fmtMoney(s.total_pay).replace('¥', ''), '总交易额'),
      statCard(s.withdraw_pending, '待审批提现', 'danger'),
    ]);
    el.appendChild(grid);
    el.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'card-title' }, '数据导出'),
      h('div', { style: 'display:flex; gap: 12px;' }, [
        h('a', { class: 'btn', href: exportUrl('/admin/export/orders.csv'), target: '_blank' }, '📥 订单明细 CSV'),
        h('a', { class: 'btn', href: exportUrl('/admin/export/users.csv'), target: '_blank' }, '📥 用户列表 CSV'),
        h('a', { class: 'btn', href: exportUrl('/admin/export/withdrawals.csv'), target: '_blank' }, '📥 提现记录 CSV'),
      ]),
    ]));
  } catch (e) { el.innerHTML = '<div class="empty">加载失败</div>'; }
}
function statCard(num, lbl, cls) {
  return h('div', { class: 'stat ' + (cls || '') }, [
    h('div', { class: 'num' }, String(num)),
    h('div', { class: 'lbl' }, lbl),
  ]);
}

// ========== 俱乐部审核 ==========
async function loadClubs(page = 1, filter = {}) {
  const el = document.getElementById('content');
  el.innerHTML = '';
  const search = h('div', { class: 'search-row' }, [
    selectStatus(filter.status, ['全部', '待审核', '已通过', '已拒绝'], (v) => loadClubs(1, { ...filter, status: v })),
    inputSearch(filter.keyword || '', (kw) => loadClubs(1, { ...filter, keyword: kw })),
    h('div', { class: 'spacer', style: 'flex:1;' }),
    h('button', { class: 'btn primary', onclick: () => batchReview('clubs', true) }, '批量通过'),
    h('button', { class: 'btn danger', onclick: () => batchReview('clubs', false) }, '批量驳回'),
  ]);
  const card = h('div', { class: 'card' });
  el.appendChild(search); el.appendChild(card);

  try {
    const d = await api(`/admin/clubs?page=${page}&size=20&status=${filter.status ?? ''}&keyword=${encodeURIComponent(filter.keyword || '')}`);
    const rows = d.list.map((c) => {
      const chk = h('input', { type: 'checkbox', 'data-id': String(c.id), 'data-type': 'club' });
      if (c.status !== 0) chk.setAttribute('disabled', 'disabled');
      return h('tr', {}, [
        h('td', {}, [chk]),
        h('td', {}, String(c.id)),
        h('td', {}, [
          c.logo ? h('img', { class: 'logo-sm', src: c.logo }) : h('span'),
          h('span', { style: 'margin-left:8px;' }, c.name),
        ]),
        h('td', {}, c.owner_nickname || '-'),
        h('td', {}, c.contact_phone || '-'),
        h('td', {}, c.city || '-'),
        h('td', {}, statusTag(c.status, ['待审核', '已通过', '已拒绝'])),
        h('td', {}, fmtTime(c.created_at)),
        h('td', {}, c.status === 0
          ? [
              h('button', { class: 'btn primary', onclick: () => reviewClub(c, true) }, '通过'),
              h('button', { class: 'btn danger', onclick: () => reviewClub(c, false) }, '驳回'),
            ]
          : [h('span', { style: 'color:#999' }, '-')]),
      ]);
    });
    card.appendChild(table(['☐', 'ID', '俱乐部', '主理人', '电话', '城市', '状态', '申请时间', '操作'], rows));
    card.appendChild(pagination(d, page, (p) => loadClubs(p, filter)));
  } catch (e) { card.innerHTML = '<div class="empty">加载失败</div>'; }
}
async function reviewClub(c, approved) {
  if (!approved) {
    const reason = prompt('请填写驳回原因：', '不符合入驻要求');
    if (reason === null) return;
    await api(`/admin/clubs/${c.id}/review`, { method: 'POST', body: { approved: false, rejectReason: reason } });
  } else {
    if (!confirm(`确认通过「${c.name}」的入驻申请？`)) return;
    await api(`/admin/clubs/${c.id}/review`, { method: 'POST', body: { approved: true } });
  }
  toast('已处理'); loadClubs();
}

// ========== 活动审核 ==========
async function loadActivities(page = 1, filter = {}) {
  const el = document.getElementById('content');
  el.innerHTML = '';
  const search = h('div', { class: 'search-row' }, [
    selectStatus(filter.status ?? '1', ['全部','草稿','待审核','已发布','已结束','已取消'], (v) => loadActivities(1, { ...filter, status: v })),
    inputSearch(filter.keyword || '', (kw) => loadActivities(1, { ...filter, keyword: kw })),
    h('div', { class: 'spacer', style: 'flex:1;' }),
    h('button', { class: 'btn primary', onclick: () => batchReview('activities', true) }, '批量通过'),
    h('button', { class: 'btn danger', onclick: () => batchReview('activities', false) }, '批量驳回'),
  ]);
  const card = h('div', { class: 'card' });
  el.appendChild(search); el.appendChild(card);
  try {
    const d = await api(`/admin/activities?page=${page}&size=20&status=${filter.status ?? '1'}&keyword=${encodeURIComponent(filter.keyword || '')}`);
    const rows = d.list.map((a) => {
      const chk = h('input', { type: 'checkbox', 'data-id': String(a.id), 'data-type': 'activity' });
      if (a.status !== 1) chk.setAttribute('disabled', 'disabled');
      return h('tr', {}, [
        h('td', {}, [chk]),
        h('td', {}, String(a.id)),
        h('td', {}, [
          a.cover ? h('img', { class: 'logo-sm', src: a.cover }) : h('span'),
          h('span', { style: 'margin-left:8px;' }, a.title),
        ]),
        h('td', {}, a.club_name || '-'),
        h('td', {}, a.category),
        h('td', {}, `${a.current_people}/${a.max_people}`),
        h('td', {}, fmtMoney(a.fee_amount)),
        h('td', {}, statusTag(a.status, ['草稿','待审核','已发布','已结束','已取消'])),
        h('td', {}, fmtTime(a.start_time)),
        h('td', {}, a.status === 1
          ? [
              h('button', { class: 'btn primary', onclick: () => reviewActivity(a, true) }, '通过'),
              h('button', { class: 'btn danger', onclick: () => reviewActivity(a, false) }, '驳回'),
            ]
          : [h('span', { style: 'color:#999' }, '-')]),
      ]);
    });
    card.appendChild(table(['☐','ID','活动','俱乐部','分类','报名','费用','状态','开始时间','操作'], rows));
    card.appendChild(pagination(d, page, (p) => loadActivities(p, filter)));
  } catch (e) { card.innerHTML = '<div class="empty">加载失败</div>'; }
}
async function batchReview(type, approved) {
  const boxes = document.querySelectorAll(`input[type=checkbox][data-type="${type === 'clubs' ? 'club' : 'activity'}"]:checked`);
  const ids = [...boxes].map((b) => Number(b.dataset.id));
  if (!ids.length) return toast('请先勾选', 'error');
  let rejectReason = '';
  if (!approved) {
    rejectReason = prompt('请填写驳回原因：', type === 'clubs' ? '不符合入驻要求' : '审核未通过');
    if (rejectReason === null) return;
  }
  if (!confirm(`确认对 ${ids.length} 项执行「${approved ? '批量通过' : '批量驳回'}」？`)) return;
  const r = await api(`/admin/${type}/batch-review`, { method: 'POST', body: { ids, approved, rejectReason } });
  toast(`成功 ${r.success} / 失败 ${r.failed}`);
  if (type === 'clubs') loadClubs(); else loadActivities();
}

async function reviewActivity(a, approved) {
  if (!approved) {
    const reason = prompt('请填写驳回原因：', '审核未通过');
    if (reason === null) return;
    await api(`/admin/activities/${a.id}/review`, { method: 'POST', body: { approved: false, rejectReason: reason } });
  } else {
    if (!confirm(`确认通过「${a.title}」的活动审核？`)) return;
    await api(`/admin/activities/${a.id}/review`, { method: 'POST', body: { approved: true } });
  }
  toast('已处理'); loadActivities();
}

// ========== 提现审批 ==========
async function loadWithdrawals(page = 1, filter = {}) {
  const el = document.getElementById('content');
  el.innerHTML = '';
  const search = h('div', { class: 'search-row' }, [
    selectStatus(filter.status ?? '0', ['全部','待处理','已处理','已拒绝'], (v) => loadWithdrawals(1, { ...filter, status: v })),
    h('div', { class: 'spacer', style: 'flex:1;' }),
    h('a', { class: 'btn', href: exportUrl('/admin/export/withdrawals.csv'), target: '_blank' }, '📥 导出 CSV'),
  ]);
  const card = h('div', { class: 'card' });
  el.appendChild(search); el.appendChild(card);
  try {
    const d = await api(`/admin/withdrawals?page=${page}&size=20&status=${filter.status ?? '0'}`);
    const rows = d.list.map((w) => h('tr', {}, [
      h('td', {}, String(w.id)),
      h('td', {}, w.club_name || '-'),
      h('td', {}, fmtMoney(w.amount)),
      h('td', {}, fmtMoney(w.fee)),
      h('td', {}, fmtMoney(w.actual_amount)),
      h('td', {}, statusTag(w.status, ['待处理','已处理','已拒绝'])),
      h('td', {}, fmtTime(w.created_at)),
      h('td', {}, w.status === 0
        ? [
            h('button', { class: 'btn primary', onclick: () => reviewWithdraw(w, true) }, '打款确认'),
            h('button', { class: 'btn danger', onclick: () => reviewWithdraw(w, false) }, '拒绝'),
          ]
        : [h('span', { style: 'color:#999' }, w.reject_reason || '-')]),
    ]));
    card.appendChild(table(['ID','俱乐部','申请金额','手续费','实际到账','状态','申请时间','操作'], rows));
    card.appendChild(pagination(d, page, (p) => loadWithdrawals(p, filter)));
  } catch (e) { card.innerHTML = '<div class="empty">加载失败</div>'; }
}
async function reviewWithdraw(w, approved) {
  if (!approved) {
    const reason = prompt('请填写拒绝原因：', '信息核验失败');
    if (reason === null) return;
    await api(`/admin/withdrawals/${w.id}/review`, { method: 'POST', body: { approved: false, rejectReason: reason } });
  } else {
    const txId = prompt('请填写微信支付转账单号（或手动打款后的流水号）：', `MANUAL_${Date.now()}`);
    if (txId === null) return;
    if (!confirm(`确认已向「${w.club_name}」打款 ${fmtMoney(w.actual_amount)}？`)) return;
    await api(`/admin/withdrawals/${w.id}/review`, { method: 'POST', body: { approved: true, transactionId: txId } });
  }
  toast('已处理'); loadWithdrawals();
}

// ========== 通用 UI 辅助 ==========
function statusTag(s, labels) {
  const cls = [s === 0 ? 'pending' : 'ok', s === 2 ? 'rej' : '', s === 4 ? 'off' : '', s === 3 ? 'off' : ''].filter(Boolean).join(' ');
  return h('span', { class: 'tag ' + cls }, labels[s] || String(s));
}
function selectStatus(current, labels, onChange) {
  const sel = h('select');
  labels.forEach((lbl, i) => {
    const opt = h('option', { value: i === 0 ? '' : String(i - 1) }, lbl);
    if (String(current) === String(i === 0 ? '' : i - 1)) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = () => onChange(sel.value);
  return sel;
}
function inputSearch(v, onEnter) {
  const inp = h('input', { type: 'text', placeholder: '搜索关键词', value: v });
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') onEnter(inp.value.trim()); });
  return inp;
}
function table(headers, rows) {
  return h('table', {}, [
    h('thead', {}, [h('tr', {}, headers.map(t => h('th', {}, t)))]),
    h('tbody', {}, rows.length ? rows : [h('tr', {}, [h('td', { colspan: String(headers.length), style: 'text-align:center; padding:40px; color:#999;' }, '无数据')])]),
  ]);
}
function pagination(d, cur, onJump) {
  if (!d || d.totalPages <= 1) return h('div');
  const pag = h('div', { class: 'pagination' });
  for (let i = 1; i <= d.totalPages; i++) {
    const btn = h('button', { class: i === cur ? 'active' : '' }, String(i));
    btn.onclick = () => onJump(i);
    pag.appendChild(btn);
  }
  return pag;
}

// ========== 用户管理 ==========
function exportUrl(path) {
  return API_BASE + path + '?token=' + encodeURIComponent(state.token);
}
async function loadUsers(page = 1, filter = {}) {
  const el = document.getElementById('content');
  el.innerHTML = '';
  const search = h('div', { class: 'search-row' }, [
    selectStatus(filter.status ?? '', ['全部', '禁用', '正常'], (v) => loadUsers(1, { ...filter, status: v })),
    inputSearch(filter.keyword || '', (kw) => loadUsers(1, { ...filter, keyword: kw })),
    h('div', { class: 'spacer', style: 'flex:1;' }),
    h('a', { class: 'btn', href: exportUrl('/admin/export/users.csv'), target: '_blank' }, '📥 导出 CSV'),
  ]);
  const card = h('div', { class: 'card' });
  el.appendChild(search); el.appendChild(card);
  try {
    const d = await api(`/admin/users?page=${page}&size=30&status=${filter.status ?? ''}&keyword=${encodeURIComponent(filter.keyword || '')}`);
    const rows = d.list.map((u) => h('tr', {}, [
      h('td', {}, String(u.id)),
      h('td', {}, [
        u.avatar ? h('img', { class: 'avatar-xs', src: u.avatar }) : h('span'),
        h('span', { style: 'margin-left:8px;' }, u.nickname || '-'),
      ]),
      h('td', {}, u.gender === 1 ? '男' : (u.gender === 0 ? '女' : '-')),
      h('td', {}, u.city || '-'),
      h('td', {}, u.is_authenticated ? '✓ 已实名' : '未实名'),
      h('td', {}, String(u.activity_count)),
      h('td', {}, fmtTime(u.last_login_at) || '-'),
      h('td', {}, statusTag(u.status === 1 ? 1 : 0, ['禁用', '正常'])),
      h('td', {}, [
        u.status === 1
          ? h('button', { class: 'btn danger', onclick: () => toggleUser(u, 0) }, '禁用')
          : h('button', { class: 'btn primary', onclick: () => toggleUser(u, 1) }, '启用'),
      ]),
    ]));
    card.appendChild(table(['ID','用户','性别','城市','实名','参与次数','最后登录','状态','操作'], rows));
    card.appendChild(pagination(d, page, (p) => loadUsers(p, filter)));
  } catch (e) { card.innerHTML = '<div class="empty">加载失败</div>'; }
}
async function toggleUser(u, targetStatus) {
  if (!confirm(`${targetStatus === 1 ? '启用' : '禁用'} 用户「${u.nickname}」？`)) return;
  await api(`/admin/users/${u.id}/status`, { method: 'POST', body: { status: targetStatus } });
  toast('已更新'); loadUsers();
}

// ========== 广告位 ==========
async function loadAds(page = 1, filter = {}) {
  const el = document.getElementById('content');
  el.innerHTML = '';
  const search = h('div', { class: 'search-row' }, [
    selectStatus(filter.status ?? '', ['全部', '下线', '上线'], (v) => loadAds(1, { ...filter, status: v })),
    h('div', { class: 'spacer', style: 'flex:1;' }),
    h('button', { class: 'btn primary', onclick: () => showAdForm() }, '+ 新增广告'),
  ]);
  const card = h('div', { class: 'card' });
  el.appendChild(search); el.appendChild(card);
  try {
    const d = await api(`/admin/ads?page=${page}&size=30&status=${filter.status ?? ''}`);
    const rows = d.list.map((a) => h('tr', {}, [
      h('td', {}, String(a.id)),
      h('td', {}, [a.image ? h('img', { src: a.image, style: 'width:120px; height:50px; object-fit:cover; border-radius:4px;' }) : h('span')]),
      h('td', {}, a.title),
      h('td', {}, a.position),
      h('td', {}, linkDesc(a)),
      h('td', {}, String(a.sort)),
      h('td', {}, statusTag(a.status === 1 ? 1 : 0, ['下线', '上线'])),
      h('td', {}, [
        h('button', { class: 'btn', onclick: () => showAdForm(a) }, '编辑'),
        h('button', { class: 'btn', onclick: () => toggleAd(a) }, a.status === 1 ? '下线' : '上线'),
        h('button', { class: 'btn danger', onclick: () => deleteAd(a) }, '删除'),
      ]),
    ]));
    card.appendChild(table(['ID','图片','标题','位置','跳转','排序','状态','操作'], rows));
    card.appendChild(pagination(d, page, (p) => loadAds(p, filter)));
  } catch (e) { card.innerHTML = '<div class="empty">加载失败</div>'; }
}
function linkDesc(a) {
  if (a.link_type === 0) return '活动 #' + (a.link_value || '');
  if (a.link_type === 1) return '外链';
  return '无';
}
async function toggleAd(a) {
  await api(`/admin/ads/${a.id}`, { method: 'PUT', body: { status: a.status === 1 ? 0 : 1 } });
  toast('已更新'); loadAds();
}
async function deleteAd(a) {
  if (!confirm(`删除广告「${a.title}」？`)) return;
  await api(`/admin/ads/${a.id}`, { method: 'DELETE' });
  toast('已删除'); loadAds();
}
function showAdForm(existing) {
  const form = {
    id: existing ? existing.id : null,
    title: existing ? existing.title : '',
    image: existing ? existing.image : '',
    position: existing ? existing.position : 'home_banner',
    link_type: existing ? existing.link_type : 0,
    link_value: existing ? (existing.link_value || '') : '',
    sort: existing ? existing.sort : 10,
    status: existing ? existing.status : 1,
  };
  const mask = h('div', { class: 'modal-mask' });
  const modal = h('div', { class: 'modal' });
  modal.innerHTML = `
    <div class="modal-head">${existing ? '编辑' : '新增'}广告</div>
    <div class="modal-body">
      <div class="field"><label>标题</label><input id="ad-title" value="${form.title}" /></div>
      <div class="field"><label>图片 URL</label><input id="ad-image" value="${form.image}" placeholder="小程序上传 URL 或外链" /></div>
      <div class="field"><label>位置</label><select id="ad-position"><option value="home_banner" ${form.position==='home_banner'?'selected':''}>首页 Banner</option><option value="home_middle" ${form.position==='home_middle'?'selected':''}>首页中部</option></select></div>
      <div class="field"><label>跳转类型</label><select id="ad-link-type"><option value="0" ${form.link_type===0?'selected':''}>活动</option><option value="1" ${form.link_type===1?'selected':''}>外链</option><option value="2" ${form.link_type===2?'selected':''}>无</option></select></div>
      <div class="field"><label>跳转值（活动 ID 或 URL）</label><input id="ad-link-value" value="${form.link_value}" /></div>
      <div class="field"><label>排序（越大越靠前）</label><input type="number" id="ad-sort" value="${form.sort}" /></div>
      <div class="field"><label>状态</label><select id="ad-status"><option value="1" ${form.status===1?'selected':''}>上线</option><option value="0" ${form.status===0?'selected':''}>下线</option></select></div>
    </div>
    <div class="modal-foot">
      <button class="btn ghost" id="ad-cancel">取消</button>
      <button class="btn primary" id="ad-save">保存</button>
    </div>
  `;
  mask.appendChild(modal);
  document.body.appendChild(mask);
  modal.querySelector('#ad-cancel').onclick = () => mask.remove();
  modal.querySelector('#ad-save').onclick = async () => {
    const body = {
      title: modal.querySelector('#ad-title').value.trim(),
      image: modal.querySelector('#ad-image').value.trim(),
      position: modal.querySelector('#ad-position').value,
      link_type: Number(modal.querySelector('#ad-link-type').value),
      link_value: modal.querySelector('#ad-link-value').value.trim(),
      sort: Number(modal.querySelector('#ad-sort').value),
      status: Number(modal.querySelector('#ad-status').value),
    };
    if (!body.title || !body.image) return toast('标题和图片必填', 'error');
    try {
      if (form.id) await api(`/admin/ads/${form.id}`, { method: 'PUT', body });
      else await api('/admin/ads', { method: 'POST', body });
      toast('已保存'); mask.remove(); loadAds();
    } catch (e) {}
  };
}

// ========== 数据分析 ==========
async function loadReport() {
  const el = document.getElementById('content');
  el.innerHTML = '<div class="empty">加载中...</div>';
  try {
    const d = await api('/admin/report/daily?days=14');
    el.innerHTML = '';

    // 每日用户 & 订单柱状图（用 SVG 手绘）
    el.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'card-title' }, '近 14 天 · 新增用户 vs 支付订单'),
      buildBarChart(d.users, d.orders),
    ]));

    // 每日收入折线
    el.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'card-title' }, '近 14 天 · 每日交易额（元）'),
      buildLineChart(d.orders),
    ]));

    // Top 城市 / 分类
    const row = h('div', { style: 'display:grid; grid-template-columns: 1fr 1fr; gap: 20px;' });
    row.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'card-title' }, 'Top 10 城市（活动数）'),
      buildBarList(d.cities.map(x => ({ label: x.city, value: Number(x.cnt) }))),
    ]));
    row.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'card-title' }, 'Top 10 运动分类'),
      buildBarList(d.cats.map(x => ({ label: x.category, value: Number(x.cnt) }))),
    ]));
    el.appendChild(row);
  } catch (e) { el.innerHTML = '<div class="empty">加载失败</div>'; }
}

// 双系列柱状图：用户 vs 订单
function buildBarChart(users, orders) {
  // 把两个数组按日期合并
  const map = new Map();
  users.forEach(x => { const k = String(x.d).slice(0,10); map.set(k, { d: k, users: Number(x.cnt), orders: 0 }) });
  orders.forEach(x => { const k = String(x.d).slice(0,10); const r = map.get(k) || { d: k, users: 0, orders: 0 }; r.orders = Number(x.cnt); map.set(k, r); });
  const list = [...map.values()].sort((a,b) => a.d.localeCompare(b.d));
  if (!list.length) return h('div', { class: 'empty' }, '无数据');
  const maxV = Math.max(...list.map(x => Math.max(x.users, x.orders)), 1);
  const W = 800, H = 200, pad = 30;
  const bw = (W - pad * 2) / list.length / 3;
  const svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; height:220px;">
    ${list.map((x, i) => {
      const cx = pad + (i + 0.5) * ((W - pad * 2) / list.length);
      const uH = (x.users / maxV) * (H - pad * 2);
      const oH = (x.orders / maxV) * (H - pad * 2);
      return `
        <rect x="${cx - bw}" y="${H - pad - uH}" width="${bw * 0.9}" height="${uH}" fill="#1677FF" rx="2" />
        <rect x="${cx + bw * 0.1}" y="${H - pad - oH}" width="${bw * 0.9}" height="${oH}" fill="#52C41A" rx="2" />
        <text x="${cx}" y="${H - 10}" text-anchor="middle" font-size="10" fill="#999">${x.d.slice(5)}</text>
      `;
    }).join('')}
    <g transform="translate(${W-120},${pad})">
      <rect width="10" height="10" fill="#1677FF" /><text x="15" y="10" font-size="11" fill="#333">用户</text>
      <rect y="16" width="10" height="10" fill="#52C41A" /><text x="15" y="26" font-size="11" fill="#333">订单</text>
    </g>
  </svg>`;
  return h('div', { html: svg });
}

function buildLineChart(orders) {
  if (!orders.length) return h('div', { class: 'empty' }, '无数据');
  const list = orders.map(x => ({ d: String(x.d).slice(0,10), v: Number(x.amt) }));
  const maxV = Math.max(...list.map(x => x.v), 1);
  const W = 800, H = 200, pad = 40;
  const points = list.map((x, i) => {
    const cx = pad + i * ((W - pad * 2) / Math.max(1, list.length - 1));
    const cy = H - pad - (x.v / maxV) * (H - pad * 2);
    return { cx, cy, d: x.d, v: x.v };
  });
  const path = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.cx + ',' + p.cy).join(' ');
  const svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; height:220px;">
    <path d="${path}" fill="none" stroke="#1677FF" stroke-width="2" />
    ${points.map(p => `<circle cx="${p.cx}" cy="${p.cy}" r="3" fill="#1677FF" /><text x="${p.cx}" y="${p.cy - 8}" text-anchor="middle" font-size="10" fill="#666">¥${p.v.toFixed(0)}</text><text x="${p.cx}" y="${H - 15}" text-anchor="middle" font-size="10" fill="#999">${p.d.slice(5)}</text>`).join('')}
  </svg>`;
  return h('div', { html: svg });
}

function buildBarList(items) {
  const max = Math.max(...items.map(x => x.value), 1);
  const wrap = h('div');
  items.forEach(x => {
    const pct = (x.value / max) * 100;
    const row = h('div', { style: 'display:flex; align-items:center; margin-bottom: 8px;' }, [
      h('span', { style: 'width: 80px; font-size: 12px; color: #666;' }, x.label),
      h('div', { style: 'flex:1; background:#F3F5F8; height: 18px; border-radius: 9px; overflow: hidden;' }, [
        h('div', { style: `width: ${pct}%; height:100%; background: linear-gradient(90deg, #1677FF, #4A9EFF);` }),
      ]),
      h('span', { style: 'width: 40px; text-align: right; font-size: 12px; color: #333; font-weight: 600;' }, String(x.value)),
    ]);
    wrap.appendChild(row);
  });
  return wrap;
}

// ========== 启动 ==========
(function bootstrap() {
  if (state.token && state.admin) showApp();
  else document.getElementById('login-page').style.display = 'flex';
  // 允许回车登录
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.getElementById('login-page').style.display !== 'none') doLogin();
  });
})();
