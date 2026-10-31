/* Tessra: router, navigation, events, startup */
const PAGES = {
  dashboard: { title: 'Dashboard', sub: 'Overview of your trading', render: pageDashboard, section: 'Overview' },
  trades: { title: 'Trades', sub: 'Every trade, filterable and sortable', render: pageTrades, section: 'Trading' },
  calendar: { title: 'P&L Calendar', sub: 'Daily and weekly results at a glance', render: pageCalendar, section: 'Trading' },
  journal: { title: 'Journal', sub: 'Pre-market plan and post-session review', render: pageJournal, section: 'Trading' },
  badges: { title: 'Badges', sub: 'Weekly challenges, streaks and achievements', render: pageBadges, section: 'Review' },
  weekly: { title: 'Weekly Review', sub: 'Your week at a glance, what stood out, and your notes', render: pageWeekly, section: 'Review' },
  analytics: { title: 'Analytics', sub: 'Find your edge and your leaks', render: pageAnalytics, section: 'Review' },
  playbook: { title: 'Playbook', sub: 'Your setups, their rules and their results', render: pagePlaybook, section: 'Review' },
  gallery: { title: 'Screenshots', sub: 'Every chart you have saved', render: pageGallery, section: 'Review' },
  accounts: { title: 'Accounts', sub: 'Prop evals, funded accounts, payouts and costs', render: pageAccounts, section: 'Business' },
  settings: { title: 'Settings', sub: 'Rules, contracts, imports and backups', render: pageSettings, section: 'App' }
};
const ORDER = Object.keys(PAGES);

function applyTheme() { applyAppearance(); }

function renderNav() {
  let last = '', h = '';
  ORDER.forEach((k, i) => {
    const p = PAGES[k];
    if (p.section !== last) { last = p.section; h += `<div class="nav-section">${p.section}</div>`; }
    h += `<button class="nav-item ${ui.page === k ? 'active' : ''}" data-action="nav" data-page="${k}">${ICON[k]}<span>${p.title === 'P&L Calendar' ? 'Calendar' : p.title}</span><span class="kbd">${i < 9 ? MOD + (i + 1) : k === 'settings' ? MOD + ',' : ''}</span></button>`;
  });
  document.getElementById('nav').innerHTML = h;
  const td = S.summary(trades().filter(t => S.dayOf(t) === todayKey()));
  const wk = S.summary(inRange(trades(), 'week'));
  document.getElementById('sidebarFoot').innerHTML = `<div class="foot-today" data-action="open-day" data-date="${todayKey()}" style="cursor:pointer">
    <div class="lbl">Today</div><div class="val ${cls(td.net)}">${money(td.net)}</div>
    <div class="meta">${td.count} trades · Week <span class="${cls(wk.net)}">${money(wk.net)}</span></div></div>`;
  const sel = document.getElementById('accountFilter');
  sel.innerHTML = `<option value="all">All accounts</option>` + S.state.accounts.map(a => `<option value="${a.id}" ${ui.account === a.id ? 'selected' : ''}>${esc(a.name)}${a.status !== 'active' ? ' (' + a.status + ')' : ''}</option>`).join('');
  sel.value = ui.account;
  sel.style.display = S.state.accounts.length ? '' : 'none';
}

function render(keepScroll) {
  const view = document.getElementById('view');
  const scroll = view.scrollTop;
  Charts.hideTip();
  const p = PAGES[ui.page];
  document.getElementById('pageTitle').textContent = p.title;
  document.getElementById('pageSub').textContent = p.sub + (ui.account !== 'all' && accountById(ui.account) ? ' · ' + accountById(ui.account).name : '');
  after.length = 0;
  view.innerHTML = p.render();
  renderNav();
  after.splice(0).forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  if (keepScroll) view.scrollTop = scroll;
}
function go(page) {
  if (!PAGES[page]) return;
  const changed = ui.page !== page;
  ui.page = page;
  render();
  if (changed) document.getElementById('view').scrollTop = 0;
}

/* ---------- click actions ---------- */
const ACTIONS = {
  'nav': el => { closeDrawers(); go(el.dataset.page); },
  'nav-an': el => { ui.anTab = el.dataset.v; go('analytics'); },
  'run-setup': () => openSetupWizard(),
  'new-trade': el => newTradeGate(x => openTradeModal(null, Object.assign({ date: el.dataset.date }, x || {}))),
  'tax-records': () => openTaxModal(),
  'sim-source': el => { simCfg().source = el.dataset.v; S.save(); render(true); },
  'sim-reset': () => { S.state.sim = null; S.save(); render(true); },
  'sim-rerun': () => { simCfg().seed = (simCfg().seed || 1) + 1; S.save(); render(true); },
  'open-trade': el => openTradeDrawer(el.dataset.id),
  'edit-trade': el => openTradeModal(S.state.trades.find(t => t.id === el.dataset.id)),
  'dup-trade': el => { const t = S.state.trades.find(x => x.id === el.dataset.id); closeDrawers(); const tpl = Object.assign({}, t); delete tpl.copyOf; delete tpl.copyGroup; openTradeModal(null, { template: tpl }); },
  'delete-trade': el => deleteTrade(el.dataset.id),
  'share-trade': el => Share.open('trade', el.dataset.id),
  'share-day': el => Share.open('day', el.dataset.date),
  'share-week': el => Share.open('week', el.dataset.ws || weekStartKey(todayKey())),
  'share-month': el => Share.open('month', el.dataset.ym || ui.calMonth || todayKey().slice(0, 7)),
  'wk-prev': () => { ui.week = shiftWeek(ui.week, -1); render(); },
  'wk-next': () => { ui.week = shiftWeek(ui.week, 1); render(); },
  'wk-this': () => { ui.week = weekStartKey(todayKey()); render(); },
  'request-payout': el => { const a = accountById(el.dataset.id); const p = a && payoutStatus(a); if (p) openMoneyModal('payout', a.id, { amount: p.cap, split: p.rules.split, desc: `Payout ${p.payoutNo}${p.maxP ? ' of ' + p.maxP : ''}` }); },
  'wi-toggle': el => { const r = wiRules(), k = el.dataset.k, v = k === 'skipDays' ? +el.dataset.v : el.dataset.v; r[k] = r[k].includes(v) ? r[k].filter(x => x !== v) : r[k].concat([v]); S.save(); render(true); },
  'wi-side': el => { wiRules().side = el.dataset.v; S.save(); render(true); },
  'wi-reset': () => { S.state.whatif = null; S.save(); render(true); },
  'add-share-bg': () => Share.pickBackgrounds().then(a => a.length && render(true)),
  'del-share-bg': async el => { if (await confirmBox('Remove background?', 'This image will be removed from your share card library.', 'Remove')) { Share.removeBackground(el.dataset.id); render(true); } },
  'set-avatar': () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = async () => { const [u] = await filesToDataUrls(i.files); if (!u) return; const old = S.state.share.avatar; S.state.share.avatar = await S.saveImage(u); if (old) S.deleteImage(old); S.save(); render(true); toast('Profile picture saved'); }; i.click(); },
  'clear-avatar': () => { if (S.state.share.avatar) S.deleteImage(S.state.share.avatar); S.state.share.avatar = ''; S.save(); render(true); },
  'preview-share': () => { const t = S.sortTrades(trades()).slice(-1)[0]; if (t) Share.open('trade', t.id); else toast('Log a trade first to preview a card'); },
  'open-day': el => openDay(el.dataset.date),
  'close-drawer': () => closeDrawers(),
  'goto-journal': el => { closeDrawers(); ui.journalDay = el.dataset.date; go('journal'); },
  'journal-day': el => { ui.journalDay = el.dataset.date; render(true); },
  'dash-range': el => { ui.dashRange = el.dataset.v; render(true); },
  'cal-prev': () => shiftCal(-1), 'cal-next': () => shiftCal(1),
  'cal-today': () => { ui.calMonth = todayKey().slice(0, 7); render(); },
  'cal-view': el => { ui.calView = el.dataset.v; render(); },
  'cal-month': el => { ui.calMonth = el.dataset.ym; ui.calView = 'month'; render(); },
  'an-tab': el => { ui.anTab = el.dataset.v; render(); },
  'an-range': el => { ui.anRange = el.dataset.v; render(true); },
  'sort': el => { const k = el.dataset.key; if (ui.tf.sort === k) ui.tf.dir *= -1; else { ui.tf.sort = k; ui.tf.dir = -1; } refreshTradesTable(); },
  'clear-filters': () => { Object.assign(ui.tf, { q: '', symbol: '', side: '', setup: '', result: '', tag: '', mistake: '', session: '', grade: '', from: '', to: '' }); render(); },
  'setup-trades': el => { if (window.event && window.event.target.closest('[data-action=edit-setup]')) return; closeDrawers(); Object.assign(ui.tf, { q: '', symbol: '', side: '', result: '', tag: '', mistake: '', session: '', grade: '', from: '', to: '', setup: el.dataset.id }); go('trades'); },
  'mistake-trades': el => { Object.assign(ui.tf, { q: '', symbol: '', side: '', result: '', tag: '', setup: '', session: '', grade: '', from: '', to: '', mistake: el.dataset.v }); go('trades'); },
  'share-dna': () => Share.open('dna', ui.anRange || 'all'),
  'share-payout': el => Share.open('payout', el.dataset.id),
  'open-wrapped': el => openWrapped(el.dataset.y),
  'wrapped-dismiss': el => { S.state.settings.wrappedSeen = el.dataset.y + ':dismissed'; S.save(); render(); },
  'account-trades': el => { ui.account = el.dataset.id; go('trades'); },
  'new-setup': () => openSetupModal(), 'edit-setup': el => openSetupModal(setupById(el.dataset.id)),
  'new-account': () => openAccountModal(), 'edit-account': el => openAccountModal(accountById(el.dataset.id)),
  'new-payout': el => openMoneyModal('payout', el.dataset.id), 'new-expense': () => openMoneyModal('expense'),
  'delete-payout': async el => { if (await confirmBox('Delete payout?', 'This payout entry will be removed.')) { S.state.payouts = S.state.payouts.filter(p => p.id !== el.dataset.id); S.save(); render(true); } },
  'delete-expense': async el => { if (await confirmBox('Delete expense?', 'This expense entry will be removed.')) { S.state.expenses = S.state.expenses.filter(p => p.id !== el.dataset.id); S.save(); render(true); } },
  'gallery-filter': el => { ui.galleryFilter = el.dataset.v; render(); },
  'theme': el => { S.state.settings.theme = el.dataset.v; applyTheme(); S.save(); render(true); },
  'week-start': el => { S.state.settings.weekStart = +el.dataset.v; S.save(); render(true); },
  'import-csv': () => importCSVFlow(), 'export-csv': () => exportCSV(),
  'export-backup': () => exportBackup(), 'import-backup': () => importBackup(),
  'open-data': () => window.edge && window.edge.openDataFolder(),
  'load-demo': () => loadDemo(),
  'clear-demo': async () => { if (await confirmBox('Remove demo data?', 'Only demo trades, accounts and journal days are removed. Your own data stays.', 'Remove')) clearDemo(); },
  'wipe': async () => {
    if (!await confirmBox('Delete everything?', 'All trades, journal entries, accounts and screenshots will be permanently deleted. Export a backup first if you might want them.', 'Delete everything')) return;
    const st = S.state;
    st.trades.forEach(t => (t.screenshots || []).forEach(n => S.deleteImage(n)));
    Object.values(st.journal).forEach(j => (j.screenshots || []).forEach(n => S.deleteImage(n)));
    const keep = { settings: st.settings, contracts: st.contracts, goals: st.goals };
    S.replaceState(Object.assign(S.defaults(), keep)); ui.account = 'all'; render(); toast('All data deleted');
  },
  'add-contract': () => { const i = document.getElementById('newContract'); const k = i.value.trim().toUpperCase(); if (!k) return; if (!S.state.contracts[k]) S.state.contracts[k] = { name: k, mult: 1, tick: 0.25, fee: 0 }; S.save(); render(true); },
  'del-contract': el => { delete S.state.contracts[el.dataset.k]; S.save(); render(true); },
  'add-list': el => { const l = el.dataset.list, i = document.querySelector(`[data-newlist=${l}]`); const v = i.value.trim(); if (v && !S.state[l].includes(v)) S.state[l].push(v); S.save(); render(true); },
  'del-list': el => { S.state[el.dataset.list].splice(+el.dataset.i, 1); S.save(); render(true); }
};
function shiftCal(n) {
  let [y, m] = (ui.calMonth || todayKey().slice(0, 7)).split('-').map(Number);
  if (ui.calView === 'year') y += n; else { m += n; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } }
  ui.calMonth = `${y}-${String(m).padStart(2, '0')}`; render();
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = ACTIONS[el.dataset.action];
  if (!a) return;
  // nested action elements: the innermost wins
  e.stopPropagation();
  a(el, e);
});

/* ---------- inputs ---------- */
let filterTimer;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.filter) {
    ui.tf[t.dataset.filter] = t.value;
    clearTimeout(filterTimer); filterTimer = setTimeout(refreshTradesTable, t.dataset.filter === 'q' ? 120 : 0);
  }
  if (t.dataset.wk) { wkEntry()[t.dataset.wk] = t.value; S.save(); flashSaved(); }
  if (t.dataset.j) { jEntry(ui.journalDay)[t.dataset.j] = t.value; S.save(); flashSaved(); }
  if (t.dataset.goal) { S.state.goals[t.dataset.goal] = S.hasNum(t.value) ? Number(t.value) : ''; S.save(); }
  if (t.dataset.setting) { S.state.settings[t.dataset.setting] = t.value; S.save(); }
  if (t.dataset.share) { S.state.share[t.dataset.share] = t.type === 'checkbox' ? t.checked : t.value; S.save(); }
  if (t.dataset.contract) { const c = S.state.contracts[t.dataset.contract]; c[t.dataset.cf] = t.dataset.cf === 'name' ? t.value : Number(t.value) || 0; S.save(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'accountFilter') { ui.account = t.value; render(); }
  if (t.dataset.actionChange === 'journal-pick' && t.value) { ui.journalDay = t.value; render(true); }
  if (t.dataset.setting) renderNav();
  if (t.dataset.lock) { lockSettings()[t.dataset.lock] = t.checked; S.save(); }
  if (t.dataset.settingCk) { S.state.settings[t.dataset.settingCk] = t.checked; S.save(); }
  if (t.dataset.sim) {
    const c = simCfg(); c[t.dataset.sim] = t.value;
    if (t.dataset.sim === 'accountId') { const a = accountById(t.value); if (a) Object.assign(c, { target: a.profitTarget || '', dd: a.maxDrawdown || c.dd, ddType: a.drawdownType || 'eod', lockOffset: Number(a.lockOffset || 0), cost: a.cost || c.cost }); }
    S.save(); render(true);
  }
  if (t.dataset.wi) { const r = wiRules(); r[t.dataset.wi] = t.type === 'checkbox' ? t.checked : t.value; S.save(); render(true); }
  if (t.dataset.shareUse) { const b = S.state.share.backgrounds.find(x => x.id === t.dataset.shareUse); if (b) { b.use = t.value; S.save(); } }
  if (t.dataset.share && t.type === 'checkbox') { S.state.share[t.dataset.share] = t.checked; S.save(); }
});
document.addEventListener('keydown', e => {
  if (e.target.dataset && e.target.dataset.newlist && e.key === 'Enter') { ACTIONS['add-list']({ dataset: { list: e.target.dataset.newlist } }); return; }
  if (e.key === 'Escape') { if (closeTop()) e.preventDefault(); return; }
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'n') { e.preventDefault(); newTradeGate(x => openTradeModal(null, x || {})); }
  if (mod && /^[1-9]$/.test(e.key)) { e.preventDefault(); closeDrawers(); go(ORDER[+e.key - 1]); }
  if (mod && e.key === ',') { e.preventDefault(); closeDrawers(); go('settings'); }
});
/* journal segmented buttons and scales */
document.addEventListener('click', e => {
  const g = e.target.closest('[data-wkgrade],[data-wkset]');
  if (g) {
    const w = wkEntry();
    if (g.dataset.wkgrade) { w.grade = +w.grade === +g.dataset.wkgrade ? '' : +g.dataset.wkgrade; g.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', +x.dataset.wkgrade === +w.grade)); }
    else { w.stuck = w.stuck === g.dataset.v ? '' : g.dataset.v; g.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.v === w.stuck)); }
    S.save(); flashSaved(); return;
  }
  const b = e.target.closest('[data-jset],[data-jscale]');
  if (!b) return;
  const field = b.dataset.jset || b.dataset.jscale;
  const v = b.dataset.jscale ? +b.dataset.v : b.dataset.v;
  const j = jEntry(ui.journalDay);
  j[field] = j[field] === v ? '' : v;
  S.save();
  b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b && j[field] === v));
  flashSaved();
});

let resizeT;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => render(true), 150); });

(async () => {
  await S.load();
  migrateRatings();
  applyTheme();
  ui.calMonth = todayKey().slice(0, 7);
  ui.journalDay = todayKey();
  render();
  setTimeout(() => { if (needsSetup()) openSetupWizard(); else { badgeNotify(); showLockScreen(); setTimeout(maybeCommunityPrompt, 600); } }, 400);
  S.onChange(syncMenuBar); syncMenuBar(); setInterval(syncMenuBar, 60000);
  if (window.edge && window.edge.onTrayNewTrade) window.edge.onTrayNewTrade(() => newTradeGate(x => openTradeModal(null, x || {})));
  setTimeout(checkForUpdates, 3000);
})();
