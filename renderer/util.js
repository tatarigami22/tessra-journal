/* Tessra: shared helpers, icons, modal + drawer + lightbox + image intake */
const S = Store;
const ui = {
  page: 'dashboard', account: 'all', dashRange: 'month',
  tf: { q: '', symbol: '', side: '', setup: '', result: '', tag: '', mistake: '', session: '', grade: '', from: '', to: '', sort: 'date', dir: -1 },
  calMonth: null, calView: 'month', journalDay: null, anTab: 'overview', anRange: 'all', galleryFilter: 'all', accTab: 'accounts'
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const keyOf = d => S.localKey(d);
const todayKey = () => S.todayKey();
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const money = (n, sign = true) => {
  n = Number(n) || 0;
  const s = n < 0 ? '-' : (n > 0 && sign ? '+' : '');
  return s + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const money0 = (n, sign = false) => {
  n = Number(n) || 0;
  const s = n < 0 ? '-' : (n > 0 && sign ? '+' : '');
  return s + '$' + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
};
const cls = n => n > 0.004 ? 'pos' : n < -0.004 ? 'neg' : '';
const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
const num = (x, d = 2) => x === null || x === undefined || !isFinite(x) ? (x === Infinity ? '∞' : '-') : Number(x).toFixed(d);
const rFmt = r => r === null || r === undefined ? '-' : (r > 0 ? '+' : '') + r.toFixed(2) + 'R';
const pf = x => x === Infinity ? '∞' : (x || 0).toFixed(2);
const fmtPrice = v => S.hasNum(v) ? Number(v).toLocaleString('en-US', { maximumFractionDigits: 4 }) : '-';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmtDay = (k, o = {}) => k ? parseKey(k).toLocaleDateString('en-US', Object.assign({ weekday: 'short', month: 'short', day: 'numeric' }, o)) : '';
const fmtLongDay = k => parseKey(k).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const fmtTime = dt => dt && dt.length > 10 ? dt.slice(11, 16) : '';
const fmtHold = m => {
  if (m === null || m === undefined) return '-';
  if (m < 1) return Math.round(m * 60) + 's';
  if (m < 60) return Math.round(m) + 'm';
  const h = Math.floor(m / 60), mm = Math.round(m % 60);
  return h + 'h' + (mm ? ' ' + mm + 'm' : '');
};
const nowLocal = () => { const d = new Date(); d.setSeconds(0, 0); return keyOf(d) + 'T' + d.toTimeString().slice(0, 5); };
const stars = n => { n = Number(n) || 0; let s = ''; for (let i = 1; i <= 5; i++) s += i <= n ? '★' : '<span class="off">★</span>'; return `<span class="stars">${s}</span>`; };
const sideTag = s => `<span class="side ${s === 'short' ? 'short' : 'long'}">${s === 'short' ? 'SHORT' : 'LONG'}</span>`;
const setupById = id => S.state.setups.find(s => s.id === id);
const accountById = id => S.state.accounts.find(a => a.id === id);
const setupName = id => (setupById(id) || {}).name || '';

function trades() {
  const all = S.state.trades;
  if (ui.account !== 'all') return all.filter(t => t.accountId === ui.account);
  return S.state.settings.countCopiesOnce === false ? all : all.filter(t => !t.copyOf);
}
function rangeFrom(range) {
  const now = new Date();
  if (range === 'today') return todayKey();
  if (range === 'week') { const d = new Date(now); d.setDate(d.getDate() - ((d.getDay() - (S.state.settings.weekStart || 0) + 7) % 7)); return keyOf(d); }
  if (range === 'month') return keyOf(new Date(now.getFullYear(), now.getMonth(), 1));
  if (range === '30d') { const d = new Date(now); d.setDate(d.getDate() - 29); return keyOf(d); }
  if (range === '90d') { const d = new Date(now); d.setDate(d.getDate() - 89); return keyOf(d); }
  if (range === 'year') return now.getFullYear() + '-01-01';
  return null;
}
const inRange = (list, range) => { const f = rangeFrom(range); return f ? list.filter(t => S.dayOf(t) >= f) : list; };
const RANGE_LABEL = { today: 'Today', week: 'This week', month: 'This month', '30d': 'Last 30 days', '90d': 'Last 90 days', year: 'This year', all: 'All time' };

function seg(action, options, value) {
  return `<div class="seg">${options.map(([v, l]) => `<button data-action="${action}" data-v="${v}" class="${v === value ? 'on' : ''}">${l}</button>`).join('')}</div>`;
}
function ring(p, color) {
  const deg = Math.max(0, Math.min(1, p)) * 360;
  return `<div class="ring" style="background:conic-gradient(${color || 'var(--pos)'} ${deg}deg, var(--neg-bg) 0)"></div>`;
}
const IS_MAC = !window.edge || !window.edge.platform || window.edge.platform === 'darwin';
const MOD = IS_MAC ? '⌘' : 'Ctrl+';

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2000);
}

/* ---------- icons ---------- */
const I = (p, w = 17) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICON = {
  dashboard: I('<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>'),
  trades: I('<path d="M4 6h16M4 12h16M4 18h10"/>'),
  calendar: I('<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>'),
  badges: I('<circle cx="12" cy="9" r="6"/><path d="m8.5 13.8-1.5 7.2 5-2.6 5 2.6-1.5-7.2"/>'),
  weekly: I('<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7 14h10M7 17.5h6"/>'),
  journal: I('<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19M9 7.5h6M9 11h4"/>'),
  analytics: I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  playbook: I('<path d="M12 3 4 7l8 4 8-4-8-4Z"/><path d="m4 12 8 4 8-4M4 17l8 4 8-4"/>'),
  accounts: I('<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>'),
  gallery: I('<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="9" cy="9" r="1.8"/><path d="m21 15-4.5-4.5L6 21"/>'),
  settings: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'),
  camera: I('<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.5-2h6.4l1.5 2h1.8A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9Z"/><circle cx="12" cy="13" r="3.5"/>', 14),
  note: I('<path d="M14 3H6.5A2.5 2.5 0 0 0 4 5.5v13A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V9l-6-6Z"/><path d="M14 3v6h6"/>', 14),
  close: I('<path d="M6 6l12 12M18 6 6 18"/>', 16),
  edit: I('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>', 15),
  trash: I('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>', 15),
  copy: I('<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>', 15),
  warn: I('<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>', 16),
  check: I('<path d="M20 6 9 17l-5-5"/>', 15),
  plus: I('<path d="M12 5v14M5 12h14"/>', 15),
  upload: I('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>', 15),
  download: I('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>', 15),
  left: I('<path d="m15 18-6-6 6-6"/>', 16),
  right: I('<path d="m9 18 6-6-6-6"/>', 16),
  folder: I('<path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H9l2 2.5h7.5A2.5 2.5 0 0 1 21 9v8.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11Z"/>', 15),
  spark: I('<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>', 15),
  airdrop: I('<path d="M5.6 15.5a8 8 0 1 1 12.8 0"/><path d="M8.6 13.4a4.5 4.5 0 1 1 6.8 0"/><path d="M12 13v8M9 21h6"/>', 15),
  share: I('<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/>', 15),
  target: I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', 15)
};

/* ---------- modal / drawer ---------- */
function openModal(html, opt = {}) {
  const root = document.getElementById('modalRoot');
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal ${opt.size || ''}">${html}</div>`;
  ov.addEventListener('mousedown', e => { if (e.target === ov) ov._down = true; });
  ov.addEventListener('mouseup', e => { if (e.target === ov && ov._down && !opt.sticky) closeTop(); ov._down = false; });
  root.appendChild(ov);
  ov._onClose = opt.onClose;
  const first = ov.querySelector('[autofocus]'); if (first) setTimeout(() => first.focus(), 30);
  return ov.querySelector('.modal');
}
function openDrawer(html) {
  closeDrawers();
  const root = document.getElementById('modalRoot');
  const ov = document.createElement('div'); ov.className = 'drawer-ov';
  const dr = document.createElement('div'); dr.className = 'drawer'; dr.innerHTML = html;
  ov.addEventListener('click', () => closeDrawers());
  ov._pair = dr;
  root.appendChild(ov); root.appendChild(dr);
  return dr;
}
function closeDrawers() {
  document.querySelectorAll('#modalRoot .drawer, #modalRoot .drawer-ov').forEach(n => n.remove());
}
function closeTop() {
  const root = document.getElementById('modalRoot');
  const last = root.lastElementChild;
  if (!last) return false;
  if (last.classList.contains('drawer')) { closeDrawers(); return true; }
  if (last._onClose) last._onClose();
  last.remove();
  return true;
}
function closeModal(el) {
  const ov = el.closest('.overlay');
  if (ov) { if (ov._onClose) ov._onClose(); ov.remove(); }
}
function confirmBox(title, msg, okLabel = 'Delete', danger = true) {
  return new Promise(res => {
    const m = openModal(`<div class="modal-h"><h3>${esc(title)}</h3></div>
      <div class="modal-b"><div class="muted">${msg}</div></div>
      <div class="modal-f"><span></span><div class="row"><button class="btn" data-x="no">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-x="yes">${esc(okLabel)}</button></div></div>`, { size: 'sm', onClose: () => res(false) });
    m.querySelector('[data-x=no]').onclick = () => { closeModal(m); };
    m.querySelector('[data-x=yes]').onclick = () => { const ov = m.closest('.overlay'); ov._onClose = null; ov.remove(); res(true); };
  });
}

/* ---------- lightbox ---------- */
function lightbox(items, index = 0) {
  if (!items.length) return;
  const root = document.getElementById('modalRoot');
  const lb = document.createElement('div'); lb.className = 'lightbox overlay'; lb.style.display = 'grid';
  let i = index;
  const draw = () => {
    const it = items[i];
    lb.innerHTML = `<button class="btn icon close" data-lb="close">${ICON.close}</button>
      ${items.length > 1 ? `<button class="nav-btn prev" data-lb="prev">‹</button><button class="nav-btn next" data-lb="next">›</button>` : ''}
      <img src="${S.imageSrc(it.src)}" alt="">
      <div class="lb-cap"><span>${esc(it.caption || '')}</span><span class="faint">${i + 1} / ${items.length}</span>
      ${it.tradeId ? `<button class="btn sm" data-lb="trade">Open trade</button>` : ''}
      ${it.day ? `<button class="btn sm" data-lb="day">Open journal</button>` : ''}</div>`;
  };
  lb.addEventListener('click', e => {
    const b = e.target.closest('[data-lb]');
    if (!b) { if (e.target === lb) lb.remove(); return; }
    const a = b.dataset.lb;
    if (a === 'close') lb.remove();
    if (a === 'prev') { i = (i - 1 + items.length) % items.length; draw(); }
    if (a === 'next') { i = (i + 1) % items.length; draw(); }
    if (a === 'trade') { lb.remove(); openTradeDrawer(items[i].tradeId); }
    if (a === 'day') { lb.remove(); closeDrawers(); ui.journalDay = items[i].day; go('journal'); }
  });
  lb._key = e => {
    if (!document.body.contains(lb)) return document.removeEventListener('keydown', lb._key);
    if (e.key === 'ArrowLeft') { i = (i - 1 + items.length) % items.length; draw(); }
    if (e.key === 'ArrowRight') { i = (i + 1) % items.length; draw(); }
  };
  document.addEventListener('keydown', lb._key);
  draw(); root.appendChild(lb);
}

/* ---------- image intake: click, drag/drop, paste ---------- */
function filesToDataUrls(files) {
  return Promise.all([...files].filter(f => f.type.startsWith('image/')).map(f => new Promise(res => {
    const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f);
  })));
}
function wireDrop(zone, onAdd) {
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.style.display = 'none';
  zone.appendChild(input);
  zone.addEventListener('click', e => { if (e.target === input) return; input.click(); });
  input.addEventListener('change', async () => { await handle(input.files); input.value = ''; });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', async e => { e.preventDefault(); zone.classList.remove('over'); await handle(e.dataTransfer.files); });
  async function handle(files) {
    const urls = await filesToDataUrls(files);
    const names = [];
    for (const u of urls) names.push(await S.saveImage(u));
    if (names.length) onAdd(names);
  }
  const paste = async e => {
    if (!document.body.contains(zone)) { document.removeEventListener('paste', paste); return; }
    const root = document.getElementById('modalRoot'), top = root.lastElementChild;
    const layer = zone.closest('.overlay, .drawer');
    if (top ? layer !== top : !!layer) return;
    const imgs = [...(e.clipboardData?.items || [])].filter(it => it.type.startsWith('image/')).map(it => it.getAsFile());
    if (imgs.length) { e.preventDefault(); await handle(imgs); }
  };
  document.addEventListener('paste', paste);
}
function shotsHtml(list, removable) {
  return `<div class="shots">${list.map((n, i) => `<div class="shot" data-shot="${i}"><img src="${S.imageSrc(n)}" alt="">${removable ? `<button class="del" data-delshot="${i}" title="Remove">${ICON.close}</button>` : ''}</div>`).join('')}</div>`;
}
const dropZone = () => `<div class="drop">${ICON.camera} &nbsp;Drop screenshots here, click to browse, or paste with ${MOD}V</div>`;
