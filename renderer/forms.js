/* Tessra: trade form, trade drawer, other forms, import/export, demo data */

/* ===================== TRADE FORM ===================== */
function openTradeModal(existing, preset = {}) {
  const st = S.state;
  const lastAcc = S.sortTrades(st.trades).slice(-1)[0];
  const defAcc = ui.account !== 'all' ? ui.account : (lastAcc ? lastAcc.accountId : (st.accounts[0] || {}).id) || '';
  const baseTime = preset.date ? preset.date + 'T' + (nowLocal().slice(11)) : nowLocal();
  const d = existing ? JSON.parse(JSON.stringify(existing)) : preset.template ? Object.assign(JSON.parse(JSON.stringify(preset.template)), { id: S.uid(), entryTime: nowLocal(), exitTime: nowLocal(), screenshots: [], importKey: undefined, demo: undefined, createdAt: undefined }) : {
    id: S.uid(), accountId: defAcc, symbol: lastAcc ? lastAcc.symbol : 'MNQ', side: 'long', qty: 1,
    entryTime: baseTime, exitTime: baseTime, entryPrice: '', exitPrice: '', stopPrice: '', targetPrice: '', fees: '', pnlOverride: '',
    setup: '', tags: [], mistakes: [], rating: 0, notes: '', screenshots: [], rulesFollowed: []
  };
  d.tags = d.tags || []; d.mistakes = d.mistakes || []; d.screenshots = d.screenshots || []; d.rulesFollowed = d.rulesFollowed || [];
  const added = [];
  const syms = [...new Set([...Object.keys(st.contracts), ...st.trades.map(t => t.symbol)])];
  const f = (k, l, type = 'number', extra = '') => `<div class="field ${extra}"><label>${l}</label><input class="input" type="${type}" ${type === 'number' ? 'step="any"' : ''} data-f="${k}" value="${esc(d[k] ?? '')}"></div>`;
  const m = openModal(`<div class="modal-h"><h3>${existing ? 'Edit trade' : 'New trade'}</h3><button class="btn icon ghost" data-close>${ICON.close}</button></div>
    <div class="modal-b">
      <div class="form-grid">
        <div class="field s2"><label>Account</label><select class="select" data-f="accountId"><option value="">No account</option>${st.accounts.map(a => `<option value="${a.id}" ${a.id === d.accountId ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Symbol</label><input class="input" list="symList" data-f="symbol" value="${esc(d.symbol)}" autofocus style="text-transform:uppercase"><datalist id="symList">${syms.map(s => `<option value="${esc(s)}">`).join('')}</datalist></div>
        <div class="field"><label>Side</label><div class="seg" style="width:100%">${['long', 'short'].map(s => `<button style="flex:1" data-side="${s}" class="${d.side === s ? 'on' : ''}">${s === 'long' ? 'Long' : 'Short'}</button>`).join('')}</div></div>
        ${f('entryTime', 'Entry time', 'datetime-local', 's2')}${f('exitTime', 'Exit time', 'datetime-local', 's2')}
        ${f('qty', 'Contracts')}${f('entryPrice', 'Entry price')}${f('exitPrice', 'Exit price')}${f('stopPrice', 'Stop loss')}
        ${f('targetPrice', 'Target')}<div class="field"><label title="Furthest price in your favor before you exited. Powers fixed-target tests in the What-if Lab.">Best price reached</label><input class="input" type="number" step="any" data-f="mfePrice" value="${esc(d.mfePrice ?? '')}" placeholder="optional"></div><div class="field"><label>Fees</label><input class="input" type="number" step="any" data-f="fees" value="${esc(d.fees ?? '')}" placeholder="auto"></div>
        <div class="field"><label>Net P&L override</label><input class="input" type="number" step="any" data-f="pnlOverride" value="${esc(d.pnlOverride ?? '')}" placeholder="from prices"></div>
      </div>
      <div class="calc-strip" id="calcStrip"></div>
      <div class="form-grid">
        <div class="field s2"><label>Setup</label><select class="select" data-f="setup"><option value="">No setup</option>${st.setups.map(s => `<option value="${s.id}" ${s.id === d.setup ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field s2"><label>Trade rating</label><div class="scale" id="ratingScale">${[1, 2, 3, 4, 5].map(n => `<button data-rate="${n}" class="${+d.rating === n ? 'on' : ''}">${n}</button>`).join('')}</div></div>
        <div class="field s4" id="rulesBox"></div>
        <div class="field s4"><label>Tags</label><div class="row wrap" style="gap:6px">${st.tags.map(t => `<span class="chip toggle ${d.tags.includes(t) ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)}</span>`).join('')}</div></div>
        <div class="field s4"><label>Mistakes</label><div class="row wrap" style="gap:6px">${st.mistakes.map(t => `<span class="chip toggle mistake ${d.mistakes.includes(t) ? 'on' : ''}" data-mistake="${esc(t)}">${esc(t)}</span>`).join('')}</div></div>
        ${copyAccountsHtml(d)}
        <div class="field s4"><label>Notes</label><textarea class="input" data-f="notes" rows="4" placeholder="Why did you take it? How did you manage it? What would you do differently?">${esc(d.notes || '')}</textarea></div>
        <div class="field s4"><label>Screenshots</label>${dropZone()}<div id="tShots"></div></div>
      </div>
    </div>
    <div class="modal-f"><span class="kbd-hint">${MOD}↵ to save</span><div class="row">${existing ? `<button class="btn danger" data-del>${ICON.trash}Delete</button>` : ''}<button class="btn" data-close>Cancel</button><button class="btn primary" data-save>${existing ? 'Save changes' : 'Add trade'}</button></div></div>`,
    { onClose: () => { added.forEach(n => S.deleteImage(n)); } });

  const calc = () => {
    const p = S.pnl(d), r = S.rMultiple(d), pts = S.points(d), rk = S.risk(d), pr = S.plannedR(d);
    m.querySelector('#calcStrip').innerHTML = `
      <div><div class="k">Net P&L</div><div class="v ${cls(p)}">${money(p)}</div></div>
      <div><div class="k">Points</div><div class="v ${cls(pts || 0)}">${pts === null ? '-' : (pts > 0 ? '+' : '') + num(pts)}</div></div>
      <div><div class="k">R multiple</div><div class="v ${cls(r || 0)}">${rFmt(r)}</div></div>
      <div><div class="k">Risk</div><div class="v">${rk ? money(rk, false) : '-'}${pr ? ` <span class="faint" style="font-size:12px">${num(pr, 1)}R plan</span>` : ''}</div></div>
      <div><div class="k">Fees</div><div class="v">${money(-S.fees(d), false)}</div></div>`;
    const fe = m.querySelector('[data-f=fees]'); if (fe) fe.placeholder = 'auto ' + S.fees({ ...d, fees: '' }).toFixed(2);
  };
  const rules = () => {
    const sp = setupById(d.setup), box = m.querySelector('#rulesBox');
    if (!sp || !sp.rules.length) { box.innerHTML = ''; box.style.display = 'none'; return; }
    box.style.display = '';
    box.innerHTML = `<label>${esc(sp.name)} checklist <span class="faint" style="font-weight:500">tick the rules you followed</span></label><div class="check-list">${sp.rules.map((r, i) => `<label><input type="checkbox" data-rule="${i}" ${d.rulesFollowed.includes(i) ? 'checked' : ''}>${esc(r)}</label>`).join('')}</div>`;
    box.querySelectorAll('[data-rule]').forEach(cb => cb.addEventListener('change', () => { const i = +cb.dataset.rule; d.rulesFollowed = cb.checked ? [...new Set([...d.rulesFollowed, i])] : d.rulesFollowed.filter(x => x !== i); }));
  };
  const shots = () => {
    const el = m.querySelector('#tShots');
    el.innerHTML = d.screenshots.length ? shotsHtml(d.screenshots, true) : '';
    el.querySelectorAll('[data-shot]').forEach(s => s.addEventListener('click', e => { if (!e.target.closest('[data-delshot]')) lightbox(d.screenshots.map(n => ({ src: n })), +s.dataset.shot); }));
    el.querySelectorAll('[data-delshot]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); d.screenshots.splice(+b.dataset.delshot, 1); shots(); }));
  };
  m.querySelectorAll('[data-f]').forEach(inp => inp.addEventListener('input', () => {
    let v = inp.value; if (inp.dataset.f === 'symbol') v = v.toUpperCase();
    d[inp.dataset.f] = v;
    if (inp.dataset.f === 'setup') { d.rulesFollowed = []; rules(); }
    if (inp.dataset.f === 'entryTime' && (!d.exitTime || d.exitTime < v)) { d.exitTime = v; m.querySelector('[data-f=exitTime]').value = v; }
    calc();
  }));
  m.querySelectorAll('[data-side]').forEach(b => b.addEventListener('click', () => { d.side = b.dataset.side; m.querySelectorAll('[data-side]').forEach(x => x.classList.toggle('on', x === b)); calc(); }));
  m.querySelectorAll('[data-rate]').forEach(b => b.addEventListener('click', () => { d.rating = +d.rating === +b.dataset.rate ? 0 : +b.dataset.rate; m.querySelectorAll('[data-rate]').forEach(x => x.classList.toggle('on', +x.dataset.rate === d.rating)); }));
  m.querySelectorAll('[data-tag]').forEach(c => c.addEventListener('click', () => { const t = c.dataset.tag; d.tags = d.tags.includes(t) ? d.tags.filter(x => x !== t) : [...d.tags, t]; c.classList.toggle('on'); }));
  m.querySelectorAll('[data-mistake]').forEach(c => c.addEventListener('click', () => { const t = c.dataset.mistake; d.mistakes = d.mistakes.includes(t) ? d.mistakes.filter(x => x !== t) : [...d.mistakes, t]; c.classList.toggle('on'); }));
  m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(m)));
  wireCopyChips(m, d);
  wireDrop(m.querySelector('.drop'), names => { d.screenshots.push(...names); added.push(...names); shots(); });
  const save = () => {
    if (!d.symbol) return toast('Add a symbol');
    if (!S.hasNum(d.qty) || +d.qty <= 0) return toast('Contracts must be above 0');
    if (!S.hasNum(d.pnlOverride) && (!S.hasNum(d.entryPrice) || !S.hasNum(d.exitPrice))) return toast('Add entry and exit prices, or a P&L override');
    if (!d.entryTime) return toast('Add an entry time');
    for (const k of ['qty', 'entryPrice', 'exitPrice', 'stopPrice', 'targetPrice', 'mfePrice', 'fees', 'pnlOverride']) d[k] = S.hasNum(d[k]) ? Number(d[k]) : '';
    d.symbol = d.symbol.toUpperCase().trim();
    const copyTo = d._copyTo || []; delete d._copyTo;
    let target;
    const removed = existing ? (existing.screenshots || []).filter(n => !d.screenshots.includes(n)) : [];
    if (existing) { target = st.trades.find(t => t.id === d.id); Object.assign(target, d); }
    else { d.createdAt = new Date().toISOString(); tagIfAfterLock(d); st.trades.push(d); target = d; }
    applyCopies(target, copyTo);
    removed.forEach(n => { if (!imageInUse(n)) S.deleteImage(n); });
    added.length = 0;
    const nCopies = groupOf(target).length;
    S.save(); closeModal(m); closeDrawers(); render(); toast((existing ? 'Trade updated' : 'Trade added') + (nCopies > 1 ? ` on ${nCopies} accounts` : ''));
    badgeNotify(); showLockScreen();
  };
  m.querySelector('[data-save]').addEventListener('click', save);
  m.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save(); });
  const del = m.querySelector('[data-del]');
  if (del) del.addEventListener('click', async () => { if (await deleteTrade(d.id)) closeModal(m); });
  calc(); rules(); shots();
}

async function deleteTrade(id) {
  const t = S.state.trades.find(x => x.id === id); if (!t) return false;
  const grp = groupOf(t);
  let ids = [id];
  if (grp.length > 1) {
    const choice = await new Promise(res => {
      const m = openModal(`<div class="modal-h"><h3>Delete copied trade?</h3></div><div class="modal-b"><div class="muted">This trade was copied to ${grp.length} accounts.</div></div>
        <div class="modal-f"><button class="btn" data-x="no">Cancel</button><div class="row"><button class="btn" data-x="one">This account only</button><button class="btn danger" data-x="all">All ${grp.length} accounts</button></div></div>`, { size: 'sm', onClose: () => res(null) });
      m.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { const ov = m.closest('.overlay'); ov._onClose = null; ov.remove(); res(b.dataset.x === 'no' ? null : b.dataset.x); });
    });
    if (!choice) return false;
    if (choice === 'all') ids = grp.map(x => x.id);
    else if (!t.copyOf) { const next = grp.find(x => x.id !== id); if (next) { delete next.copyOf; grp.forEach(x => { if (x.id !== id && x !== next) x.copyOf = next.id; }); if (grp.length === 2) delete next.copyGroup; } }
    else if (grp.length === 2) grp.forEach(x => { delete x.copyGroup; delete x.copyOf; });
  } else if (!await confirmBox('Delete trade?', `${esc(t.symbol)} ${t.side} on ${fmtDay(S.dayOf(t))} (${money(S.pnl(t))}) will be removed with its screenshots.`)) return false;
  const imgs = [...new Set(S.state.trades.filter(x => ids.includes(x.id)).flatMap(x => x.screenshots || []))];
  S.state.trades = S.state.trades.filter(x => !ids.includes(x.id));
  imgs.forEach(n => { if (!imageInUse(n)) S.deleteImage(n); });
  S.save(); closeDrawers(); render(); toast('Trade deleted');
  return true;
}

function openTradeDrawer(id) {
  const t = S.state.trades.find(x => x.id === id); if (!t) return;
  const p = S.pnl(t), r = S.rMultiple(t), sp = setupById(t.setup), acc = accountById(t.accountId);
  const kv = (k, v, c = '') => `<div><div class="k">${k}</div><div class="v ${c}">${v}</div></div>`;
  const dr = openDrawer(`<div class="drawer-h"><div class="between"><div class="row">${sideTag(t.side)}<b style="font-size:17px">${esc(t.symbol)}</b><span class="muted">× ${t.qty}</span></div><button class="btn icon ghost" data-action="close-drawer">${ICON.close}</button></div>
      <div class="muted mt" style="font-size:12.5px">${fmtLongDay(S.dayOf(t))} · ${fmtTime(t.entryTime)} to ${fmtTime(t.exitTime) || '?'}${acc ? ' · ' + esc(acc.name) : ''}</div>
      ${groupOf(t).length > 1 ? `<div class="row wrap mt" style="gap:6px"><span class="lr-sub">Copied to</span>${groupOf(t).map(x => `<span class="chip ${x.id === t.id ? 'acc' : ''}">${esc((accountById(x.accountId) || {}).name || '?')} ${money(S.pnl(x))}</span>`).join('')}</div>` : ''}
      <div class="row" style="align-items:flex-end;gap:14px;margin-top:8px"><div class="big-pnl ${cls(p)}">${money(p)}</div><div class="${cls(r || 0)}" style="font-weight:700;font-size:16px;margin-bottom:6px">${rFmt(r)}</div></div>
      <div class="row mt"><button class="btn sm primary" data-action="share-trade" data-id="${t.id}">${ICON.share}Share</button><button class="btn sm" data-action="edit-trade" data-id="${t.id}">${ICON.edit}Edit</button><button class="btn sm" data-action="dup-trade" data-id="${t.id}">${ICON.copy}Duplicate</button><button class="btn sm" data-action="open-day" data-date="${S.dayOf(t)}">Open day</button><div class="spacer"></div><button class="btn sm danger" data-action="delete-trade" data-id="${t.id}">${ICON.trash}</button></div></div>
    <div class="drawer-b">
      <div class="card" style="padding:16px"><div class="kv" style="grid-template-columns:repeat(3,1fr)">
        ${kv('Entry', fmtPrice(t.entryPrice))}${kv('Exit', fmtPrice(t.exitPrice))}${kv('Points', S.points(t) === null ? '-' : num(S.points(t)), cls(S.points(t) || 0))}
        ${kv('Stop', fmtPrice(t.stopPrice))}${kv('Target', fmtPrice(t.targetPrice))}${kv('Planned R', S.plannedR(t) ? num(S.plannedR(t), 1) + 'R' : '-')}
        ${kv('Gross', money(S.gross(t)), cls(S.gross(t)))}${kv('Fees', money(-S.fees(t), false))}${kv('Risk', S.risk(t) ? money(S.risk(t), false) : '-')}
        ${kv('Hold time', fmtHold(S.holdMinutes(t)))}${kv('Rating', t.rating ? stars(t.rating) : '-')}${kv('$ / point', '$' + S.spec(t.symbol).mult)}
      </div></div>
      ${sp ? `<div><div class="seg-label">Setup</div><div class="row"><span class="dot" style="background:${sp.color}"></span><b>${esc(sp.name)}</b>${sp.rules.length ? `<span class="chip ${(t.rulesFollowed || []).length === sp.rules.length ? 'pos' : 'warn'}">${(t.rulesFollowed || []).length}/${sp.rules.length} rules followed</span>` : ''}</div>
        ${sp.rules.length ? `<div class="check-list mt">${sp.rules.map((rl, i) => `<label style="cursor:default"><span class="${(t.rulesFollowed || []).includes(i) ? 'pos' : 'neg'}">${(t.rulesFollowed || []).includes(i) ? ICON.check : ICON.close}</span>${esc(rl)}</label>`).join('')}</div>` : ''}</div>` : ''}
      ${(t.tags || []).length || (t.mistakes || []).length ? `<div><div class="seg-label">Tags and mistakes</div><div class="row wrap" style="gap:6px">${(t.tags || []).map(x => `<span class="chip acc">${esc(x)}</span>`).join('')}${(t.mistakes || []).map(x => `<span class="chip neg">${esc(x)}</span>`).join('')}</div></div>` : ''}
      <div><div class="seg-label">Notes</div>${t.notes ? `<div class="note-box">${esc(t.notes)}</div>` : '<div class="faint">No notes. Edit the trade to add some.</div>'}</div>
      <div><div class="seg-label">Screenshots</div><div class="drop" id="drDrop">${ICON.camera} &nbsp;Drop, click or ${MOD}V to attach a screenshot</div><div id="drShots"></div></div>
    </div>`);
  const drawShots = () => {
    const el = dr.querySelector('#drShots'), list = t.screenshots || [];
    el.innerHTML = list.length ? shotsHtml(list, true) : '';
    el.querySelectorAll('[data-shot]').forEach(s => s.addEventListener('click', e => { if (!e.target.closest('[data-delshot]')) lightbox(list.map(n => ({ src: n, caption: `${t.symbol} ${money(p)}` })), +s.dataset.shot); }));
    el.querySelectorAll('[data-delshot]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const n = list.splice(+b.dataset.delshot, 1)[0]; S.deleteImage(n); S.save(); drawShots(); }));
  };
  wireDrop(dr.querySelector('#drDrop'), names => { t.screenshots = (t.screenshots || []).concat(names); S.save(); drawShots(); if (ui.page === 'gallery' || ui.page === 'trades') render(true); });
  drawShots();
}

/* ===================== SETUP / ACCOUNT / PAYOUT / EXPENSE FORMS ===================== */
const COLORS = ['#8b7bff', '#3fb6ff', '#22c98a', '#f5b84a', '#ff5d6c', '#ff8bd1', '#5ce1e6', '#c4d36a'];
function openSetupModal(existing) {
  const d = existing ? JSON.parse(JSON.stringify(existing)) : { id: S.uid(), name: '', color: COLORS[S.state.setups.length % COLORS.length], description: '', rules: [] };
  const m = openModal(`<div class="modal-h"><h3>${existing ? 'Edit setup' : 'New setup'}</h3><button class="btn icon ghost" data-close>${ICON.close}</button></div>
    <div class="modal-b">
      <div class="field"><label>Name</label><input class="input" data-k="name" value="${esc(d.name)}" autofocus placeholder="e.g. OTE Pullback"></div>
      <div class="field"><label>Color</label><div class="row">${COLORS.map(c => `<button class="btn icon" data-color="${c}" style="width:30px;height:30px;padding:0;background:${c};border:2px solid ${c === d.color ? 'var(--text)' : 'transparent'}"></button>`).join('')}</div></div>
      <div class="field"><label>Description</label><textarea class="input" data-k="description" rows="3" placeholder="What is the idea behind this setup?">${esc(d.description)}</textarea></div>
      <div class="field"><label>Entry rules <span class="faint" style="font-weight:500">one per line, these become a checklist on every trade</span></label><textarea class="input" data-k="rules" rows="5">${esc(d.rules.join('\n'))}</textarea></div>
    </div>
    <div class="modal-f">${existing ? `<button class="btn danger" data-del>${ICON.trash}Delete</button>` : '<span></span>'}<div class="row"><button class="btn" data-close>Cancel</button><button class="btn primary" data-save>Save setup</button></div></div>`, { size: 'sm' });
  m.querySelectorAll('[data-color]').forEach(b => b.addEventListener('click', () => { d.color = b.dataset.color; m.querySelectorAll('[data-color]').forEach(x => x.style.borderColor = x === b ? 'var(--text)' : 'transparent'); }));
  m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(m)));
  m.querySelector('[data-save]').addEventListener('click', () => {
    d.name = m.querySelector('[data-k=name]').value.trim(); if (!d.name) return toast('Give the setup a name');
    d.description = m.querySelector('[data-k=description]').value.trim();
    d.rules = m.querySelector('[data-k=rules]').value.split('\n').map(x => x.trim()).filter(Boolean);
    if (existing) Object.assign(S.state.setups.find(s => s.id === d.id), d); else S.state.setups.push(d);
    S.save(); closeModal(m); render(); toast('Setup saved');
  });
  const del = m.querySelector('[data-del]');
  if (del) del.addEventListener('click', async () => {
    const n = S.state.trades.filter(t => t.setup === d.id).length;
    if (!await confirmBox('Delete setup?', `${esc(d.name)} will be removed.${n ? ` ${n} trades will be set to no setup.` : ''}`)) return;
    S.state.setups = S.state.setups.filter(s => s.id !== d.id);
    S.state.trades.forEach(t => { if (t.setup === d.id) { t.setup = ''; t.rulesFollowed = []; } });
    S.save(); closeModal(m); render();
  });
}

function openAccountModal(existing) {
  const d = existing ? { ...existing } : { id: S.uid(), name: '', firm: '', type: 'eval', status: 'active', startBalance: 25000, profitTarget: 1250, maxDrawdown: 1000, drawdownType: 'eod', lockAtStart: true, dailyLossLimit: '', minDays: '', cost: '', createdAt: todayKey() };
  const fi = (k, l, t = 'number', hint = '') => `<div class="field"><label>${l}</label><input class="input" type="${t}" step="any" data-k="${k}" value="${esc(d[k] ?? '')}">${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
  const sel = (k, l, opts) => `<div class="field"><label>${l}</label><select class="select" data-k="${k}">${opts.map(([v, t]) => `<option value="${v}" ${String(d[k]) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`;
  const m = openModal(`<div class="modal-h"><h3>${existing ? 'Edit account' : 'New account'}</h3><button class="btn icon ghost" data-close>${ICON.close}</button></div>
    <div class="modal-b"><div class="grid g-2">
      <div class="field"><label>Account name</label><input class="input" data-k="name" value="${esc(d.name)}" placeholder="LucidFlex 25K #1" autofocus></div>
      <div class="field"><label>Firm or broker</label><input class="input" data-k="firm" value="${esc(d.firm)}" placeholder="Lucid Trading"></div>
      ${sel('type', 'Type', [['eval', 'Evaluation'], ['funded', 'Funded'], ['live', 'Live (own money)'], ['sim', 'Sim / practice']])}
      ${sel('status', 'Status', [['active', 'Active'], ['passed', 'Passed'], ['failed', 'Failed'], ['archived', 'Archived']])}
      ${fi('startBalance', 'Starting balance ($)')}${fi('profitTarget', 'Profit target ($)', 'number', 'Leave blank for funded or live')}
      ${fi('maxDrawdown', 'Max drawdown ($)')}${sel('drawdownType', 'Drawdown type', [['eod', 'End of day trailing'], ['intraday', 'Intraday trailing'], ['static', 'Static']])}
      ${fi('dailyLossLimit', 'Daily loss limit ($)', 'number', 'Optional')}${fi('minDays', 'Min trading days', 'number', 'Optional')}
      ${fi('cost', 'Cost of account ($)', 'number', 'Eval or activation fee, counts as an expense')}${fi('createdAt', 'Start date', 'date')}
      <div class="field" style="grid-column:span 2"><label class="row" style="gap:8px;cursor:pointer"><input type="checkbox" data-k="lockAtStart" ${d.lockAtStart !== false ? 'checked' : ''} style="accent-color:var(--accent)"> Trailing drawdown stops trailing once it reaches the lock level</label></div>
      ${payoutRulesFormHtml(d)}
    </div></div>
    <div class="modal-f">${existing ? `<button class="btn danger" data-del>${ICON.trash}Delete</button>` : '<span></span>'}<div class="row"><button class="btn" data-close>Cancel</button><button class="btn primary" data-save>Save account</button></div></div>`, { size: 'sm' });
  m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(m)));
  wirePayoutForm(m);
  m.querySelector('[data-save]').addEventListener('click', () => {
    m.querySelectorAll('[data-k]').forEach(i => { d[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value; });
    d.payout = readPayoutForm(m);
    d.name = d.name.trim(); if (!d.name) return toast('Name the account');
    for (const k of ['startBalance', 'profitTarget', 'maxDrawdown', 'dailyLossLimit', 'minDays', 'cost', 'lockOffset']) d[k] = S.hasNum(d[k]) ? Number(d[k]) : '';
    if (existing) Object.assign(S.state.accounts.find(a => a.id === d.id), d); else S.state.accounts.push(d);
    S.save(); closeModal(m); render(); toast('Account saved');
  });
  const del = m.querySelector('[data-del]');
  if (del) del.addEventListener('click', async () => {
    const n = S.state.trades.filter(t => t.accountId === d.id).length;
    if (!await confirmBox('Delete account?', `${esc(d.name)} will be removed.${n ? ` Its ${n} trades stay in your journal with no account.` : ''}`)) return;
    S.state.accounts = S.state.accounts.filter(a => a.id !== d.id);
    S.state.trades.forEach(t => { if (t.accountId === d.id) t.accountId = ''; });
    if (ui.account === d.id) ui.account = 'all';
    S.save(); closeModal(m); render();
  });
}

function openMoneyModal(kind, accountId, pre = {}) {
  const acc = accountById(accountId), split = pre.split ?? (acc && acc.payout && acc.payout.enabled ? acc.payout.split : 100);
  const m = openModal(`<div class="modal-h"><h3>${kind === 'payout' ? 'Log payout' : 'Log expense'}</h3><button class="btn icon ghost" data-close>${ICON.close}</button></div>
    <div class="modal-b"><div class="grid g-2">
      <div class="field"><label>Date</label><input class="input" type="date" data-k="date" value="${todayKey()}"></div>
      <div class="field"><label>${kind === 'payout' ? 'Amount requested ($)' : 'Amount ($)'}</label><input class="input" type="number" step="any" data-k="amount" value="${pre.amount ?? ''}" autofocus></div>
      <div class="field"><label>Account</label><select class="select" data-k="accountId"><option value="">None</option>${S.state.accounts.map(a => `<option value="${a.id}" ${a.id === accountId ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Description</label><input class="input" data-k="desc" value="${esc(pre.desc || '')}" placeholder="${kind === 'payout' ? 'First payout' : 'Reset fee, data feed, platform...'}"></div>
      ${kind === 'payout' ? `<div class="field"><label>Your split (%)</label><input class="input" type="number" step="any" data-k="split" value="${split}"><span class="hint">What you actually receive is tracked as income</span></div>` : ''}
    </div></div>
    <div class="modal-f"><span></span><div class="row"><button class="btn" data-close>Cancel</button><button class="btn primary" data-save>Save</button></div></div>`, { size: 'sm' });
  m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(m)));
  m.querySelector('[data-save]').addEventListener('click', () => {
    const d = { id: S.uid() }; m.querySelectorAll('[data-k]').forEach(i => d[i.dataset.k] = i.value);
    if (!S.hasNum(d.amount) || +d.amount <= 0) return toast('Enter an amount');
    d.amount = Number(d.amount);
    if (kind === 'payout') { d.split = S.hasNum(d.split) ? Number(d.split) : 100; d.received = Math.round(d.amount * d.split) / 100; }
    (kind === 'payout' ? S.state.payouts : S.state.expenses).push(d);
    S.save(); closeModal(m); render(); toast(kind === 'payout' ? 'Payout logged' : 'Expense logged');
  });
}

/* ===================== CSV IMPORT / EXPORT ===================== */
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}
function toLocalDT(s) {
  if (!s) return '';
  s = String(s).trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})[ T]?(\d{1,2})?:?(\d{2})?:?(\d{2})?\s*(AM|PM)?/i.exec(s);
  if (m) {
    let [, mo, d, y, h = '0', mi = '0', , ap] = m; y = y.length === 2 ? '20' + y : y; h = +h;
    if (ap) { if (/pm/i.test(ap) && h < 12) h += 12; if (/am/i.test(ap) && h === 12) h = 0; }
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
  }
  m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4] || '09'}:${m[5] || '30'}`;
  const dt = new Date(s); if (!isNaN(dt)) return keyOf(dt) + 'T' + dt.toTimeString().slice(0, 5);
  return '';
}
const moneyNum = s => { s = String(s ?? '').trim(); if (!s) return NaN; const neg = /^\(.*\)$/.test(s.replace(/\$/g, '')) || /^-/.test(s) || /\(\$/.test(s); const v = parseFloat(s.replace(/[^0-9.]/g, '')); return neg ? -v : v; };

function parseTradesCSV(text) {
  const rows = parseCSV(text); if (rows.length < 2) return { trades: [], format: 'empty' };
  const h = rows[0].map(x => x.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
  const idx = (...names) => { for (const n of names) { const i = h.indexOf(n); if (i >= 0) return i; } for (const n of names) { const i = h.findIndex(x => x.includes(n)); if (i >= 0) return i; } return -1; };
  const out = [];
  if (h.includes('buyprice') && h.includes('sellprice') && (h.includes('boughttimestamp') || h.includes('soldtimestamp'))) {
    const iS = idx('symbol'), iQ = idx('qty'), iB = idx('buyprice'), iSe = idx('sellprice'), iBT = idx('boughttimestamp'), iST = idx('soldtimestamp'), iP = idx('pnl'), iBF = idx('buyfillid'), iSF = idx('sellfillid');
    for (const r of rows.slice(1)) {
      const bt = toLocalDT(r[iBT]), stt = toLocalDT(r[iST]); if (!r[iS]) continue;
      const long = bt <= stt;
      out.push({ symbol: r[iS].trim().toUpperCase(), side: long ? 'long' : 'short', qty: Math.abs(+r[iQ]) || 1, entryPrice: +r[long ? iB : iSe], exitPrice: +r[long ? iSe : iB], entryTime: long ? bt : stt, exitTime: long ? stt : bt, importKey: `tv-${r[iBF] || ''}-${r[iSF] || ''}-${r[iBT]}-${r[iST]}`, srcPnl: moneyNum(r[iP]) });
    }
    return { trades: out, format: 'Tradovate performance report' };
  }
  const iD = idx('date', 'entrytime', 'opentime', 'entrydate', 'time'), iX = idx('exittime', 'closetime', 'exitdate'), iS = idx('symbol', 'instrument', 'contract', 'ticker'),
    iSide = idx('side', 'direction', 'action', 'marketpos', 'type'), iQ = idx('qty', 'quantity', 'contracts', 'size'), iE = idx('entryprice', 'entry', 'openprice', 'avgentry'),
    iEx = idx('exitprice', 'exit', 'closeprice', 'avgexit'), iP = idx('netpnl', 'pnl', 'profit', 'netprofit', 'realized'), iF = idx('fees', 'commission', 'commissions'), iSt = idx('stop', 'stoploss'), iN = idx('notes', 'note', 'comment');
  if (iS < 0) return { trades: [], format: 'unknown' };
  for (const r of rows.slice(1)) {
    if (!r[iS]) continue;
    const side = /short|sell|^s$/i.test(r[iSide] || '') ? 'short' : 'long';
    const t = { symbol: r[iS].trim().toUpperCase(), side, qty: Math.abs(+r[iQ]) || 1, entryPrice: iE >= 0 ? +r[iE] : '', exitPrice: iEx >= 0 ? +r[iEx] : '', entryTime: toLocalDT(r[iD]), exitTime: toLocalDT(iX >= 0 ? r[iX] : r[iD]), notes: iN >= 0 ? r[iN] : '' };
    if (iF >= 0 && r[iF] !== '') t.fees = Math.abs(moneyNum(r[iF]));
    if (iSt >= 0 && r[iSt] !== '') t.stopPrice = +r[iSt];
    if ((!S.hasNum(t.entryPrice) || !S.hasNum(t.exitPrice)) && iP >= 0) t.pnlOverride = moneyNum(r[iP]);
    t.importKey = 'csv-' + r.join('|');
    out.push(t);
  }
  return { trades: out, format: 'Generic CSV' };
}

function pickFile(accept) {
  return new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
    i.onchange = () => { const f = i.files[0]; if (!f) return res(null); const r = new FileReader(); r.onload = () => res({ name: f.name, text: r.result }); r.readAsText(f); };
    i.click();
  });
}

async function importCSVFlow() {
  const file = await pickFile('.csv,text/csv'); if (!file) return;
  const { trades: parsed, format } = parseTradesCSV(file.text);
  if (!parsed.length) return toast('No trades found in that file');
  const existing = new Set(S.state.trades.map(t => t.importKey).filter(Boolean));
  const fresh = parsed.filter(t => !existing.has(t.importKey));
  const sum = parsed.reduce((a, t) => a + S.pnl({ ...t, fees: t.fees ?? '' }), 0);
  const m = openModal(`<div class="modal-h"><h3>Import trades</h3><button class="btn icon ghost" data-close>${ICON.close}</button></div>
    <div class="modal-b">
      <div class="alert info">${ICON.check}<div>Detected <b>${esc(format)}</b> in ${esc(file.name)}: ${parsed.length} trades, ${fresh.length} new${parsed.length - fresh.length ? `, ${parsed.length - fresh.length} already imported (skipped)` : ''}. Estimated net ${money(sum)}.</div></div>
      <div class="field"><label>Assign to account</label><select class="select" id="impAcc"><option value="">No account</option>${S.state.accounts.map(a => `<option value="${a.id}" ${ui.account === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>
      <div class="table-wrap" style="max-height:260px"><table class="tbl"><thead><tr><th>Entry</th><th>Symbol</th><th>Side</th><th class="n">Qty</th><th class="n">Entry</th><th class="n">Exit</th><th class="n">Net</th></tr></thead><tbody>
        ${fresh.slice(0, 50).map(t => `<tr style="cursor:default"><td>${esc(t.entryTime.replace('T', ' '))}</td><td class="sym">${esc(t.symbol)}</td><td>${sideTag(t.side)}</td><td class="n">${t.qty}</td><td class="n">${fmtPrice(t.entryPrice)}</td><td class="n">${fmtPrice(t.exitPrice)}</td><td class="n ${cls(S.pnl(t))}">${money(S.pnl(t))}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="faint" style="font-size:12px">Fees use your contract specs from Settings. You can edit any trade after importing to add setup, notes and screenshots.</div>
    </div>
    <div class="modal-f"><span></span><div class="row"><button class="btn" data-close>Cancel</button><button class="btn primary" data-go ${fresh.length ? '' : 'disabled'}>Import ${fresh.length} trades</button></div></div>`, { size: 'sm' });
  m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(m)));
  m.querySelector('[data-go]').addEventListener('click', () => {
    const acc = m.querySelector('#impAcc').value;
    for (const t of fresh) { delete t.srcPnl; S.state.trades.push(Object.assign({ id: S.uid(), accountId: acc, stopPrice: '', targetPrice: '', fees: '', pnlOverride: '', setup: '', tags: [], mistakes: [], rating: 0, notes: '', screenshots: [], rulesFollowed: [], createdAt: new Date().toISOString() }, t)); }
    S.save(); closeModal(m); render(); toast(`Imported ${fresh.length} trades`);
  });
}

function download(name, content, type = 'text/plain') {
  if (window.edge) return window.edge.saveAs(name, content).then(p => p && toast('Saved'));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function exportCSV() {
  const cols = ['date', 'entryTime', 'exitTime', 'account', 'symbol', 'side', 'qty', 'entryPrice', 'exitPrice', 'stopPrice', 'targetPrice', 'points', 'fees', 'netPnl', 'rMultiple', 'setup', 'tags', 'mistakes', 'rating', 'notes'];
  const q = v => { v = String(v ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const rows = S.sortTrades(trades()).map(t => [S.dayOf(t), t.entryTime, t.exitTime, (accountById(t.accountId) || {}).name || '', t.symbol, t.side, t.qty, t.entryPrice, t.exitPrice, t.stopPrice, t.targetPrice, S.points(t) ?? '', S.fees(t).toFixed(2), S.pnl(t).toFixed(2), S.rMultiple(t) === null ? '' : S.rMultiple(t).toFixed(2), setupName(t.setup), (t.tags || []).join('; '), (t.mistakes || []).join('; '), t.rating || '', t.notes || ''].map(q).join(','));
  download(`tessra-trades-${todayKey()}.csv`, [cols.join(',')].concat(rows).join('\n'), 'text/csv');
}
async function exportBackup() {
  const st = S.state, images = {};
  const names = [...st.trades.flatMap(t => t.screenshots || []), ...Object.values(st.journal).flatMap(j => j.screenshots || [])];
  for (const n of names) { try { const d = await S.readImage(n); if (d) images[n] = d; } catch (e) {} }
  download(`tessra-backup-${todayKey()}.json`, JSON.stringify({ app: 'tessra', exportedAt: new Date().toISOString(), state: st, images }), 'application/json');
}
async function importBackup() {
  const file = await pickFile('.json,application/json'); if (!file) return;
  let data; try { data = JSON.parse(file.text); } catch (e) { return toast('That file is not a valid backup'); }
  if (!data || !['tessra', 'edge-journal'].includes(data.app) || !data.state) return toast('That file is not a Tessra backup');
  if (!await confirmBox('Restore backup?', `This replaces everything currently in the app with the backup from ${esc(String(data.exportedAt || '').slice(0, 10))}.`, 'Restore', false)) return;
  const map = {};
  for (const [n, d] of Object.entries(data.images || {})) map[n] = await S.saveImage(d);
  const fix = list => (list || []).map(n => map[n] || n);
  data.state.trades.forEach(t => t.screenshots = fix(t.screenshots));
  Object.values(data.state.journal || {}).forEach(j => j.screenshots = fix(j.screenshots));
  S.replaceState(data.state); applyTheme(); render(); toast('Backup restored');
}

/* ===================== DEMO DATA ===================== */
function fakeChart(win, side) {
  const c = document.createElement('canvas'); c.width = 960; c.height = 560;
  const g = c.getContext('2d');
  g.fillStyle = '#0e1116'; g.fillRect(0, 0, 960, 560);
  g.strokeStyle = '#1b2028'; g.lineWidth = 1;
  for (let x = 0; x < 960; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 560); g.stroke(); }
  for (let y = 0; y < 560; y += 70) { g.beginPath(); g.moveTo(0, y); g.lineTo(960, y); g.stroke(); }
  let p = 300, pts = [];
  const dir = (side === 'long') === win ? -1 : 1;
  for (let i = 0; i < 64; i++) {
    const drift = i > 34 ? dir * 4.5 : (i > 22 ? -dir * 3 : (Math.random() - .5) * 3);
    const o = p, cl = p + drift + (Math.random() - .5) * 16;
    const hi = Math.min(o, cl) - Math.random() * 12, lo = Math.max(o, cl) + Math.random() * 12;
    pts.push({ o, cl, hi, lo }); p = cl;
  }
  pts.forEach((k, i) => {
    const x = 30 + i * 14, up = k.cl < k.o;
    g.strokeStyle = g.fillStyle = up ? '#22c98a' : '#ff5d6c';
    g.beginPath(); g.moveTo(x + 4, k.hi); g.lineTo(x + 4, k.lo); g.stroke();
    g.fillRect(x, Math.min(k.o, k.cl), 9, Math.max(2, Math.abs(k.cl - k.o)));
  });
  const ey = pts[34].cl;
  g.fillStyle = 'rgba(139,123,255,.16)'; g.fillRect(30 + 22 * 14, ey - 26, 13 * 14, 52);
  g.setLineDash([6, 5]); g.strokeStyle = '#8b7bff'; g.beginPath(); g.moveTo(0, ey); g.lineTo(960, ey); g.stroke();
  g.strokeStyle = '#ff5d6c'; const sy = ey + (side === 'long' ? 40 : -40); g.beginPath(); g.moveTo(0, sy); g.lineTo(960, sy); g.stroke();
  g.setLineDash([]); g.fillStyle = '#8d96a3'; g.font = '600 18px -apple-system, sans-serif';
  g.fillText(`MNQ 1m  ·  ${side.toUpperCase()}  ·  ${win ? 'TARGET HIT' : 'STOPPED'}`, 24, 34);
  return c.toDataURL('image/jpeg', 0.82);
}

async function loadDemo() {
  const st = S.state;
  const acc1 = { id: S.uid(), demo: true, name: 'LucidFlex 25K Eval', firm: 'Lucid Trading', type: 'eval', status: 'active', startBalance: 25000, profitTarget: 1250, maxDrawdown: 1000, drawdownType: 'eod', lockAtStart: true, dailyLossLimit: '', minDays: '', cost: 85, createdAt: '' };
  const acc2 = { id: S.uid(), demo: true, name: 'Demo 50K Funded', firm: 'Demo Firm', type: 'funded', status: 'active', startBalance: 50000, profitTarget: '', maxDrawdown: 2000, drawdownType: 'eod', lockAtStart: true, lockOffset: 100, dailyLossLimit: 1000, minDays: '', cost: 140, createdAt: '', payout: Object.assign({ enabled: true, preset: 'flex50' }, PAYOUT_PRESETS.flex50) };
  st.accounts.push(acc1, acc2);
  const today = new Date(); let price = 24800;
  const days = []; for (let i = 75; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); if (d.getDay() > 0 && d.getDay() < 6) days.push(d); }
  acc1.createdAt = keyOf(days[Math.floor(days.length * 0.55)]); acc2.createdAt = keyOf(days[0]);
  const notes = ['Waited for displacement then limit filled in the OTE zone. Managed well.', 'Entered a bit early, price wicked through the zone first.', 'Clean sweep of the Asia low, MSS on the 1m, textbook.', 'Chased after missing the first entry. Should have let it go.', 'Moved stop to breakeven too fast and got wicked out before the move.', 'Partial at 1R, runner hit 3R.', ''];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  let shotsLeft = 10;
  for (const d of days) {
    if (Math.random() < 0.15) continue;
    const k = keyOf(d), acc = k >= acc1.createdAt && Math.random() < 0.5 ? acc1 : acc2;
    const n = 1 + Math.floor(Math.random() * 3.4);
    let mins = 9 * 60 + 32 + Math.floor(rnd(0, 20));
    let dayP = 0;
    for (let i = 0; i < n; i++) {
      const sp = pick(st.setups), side = Math.random() < 0.55 ? 'long' : 'short';
      const qty = pick([1, 2, 2, 3, 4]); const stopPts = Math.round(rnd(10, 24) * 4) / 4;
      const edge = sp === st.setups[0] ? 0.6 : sp === st.setups[1] ? 0.52 : 0.44;
      const win = Math.random() < edge - (i >= 2 ? 0.12 : 0);
      const movePts = win ? Math.round(stopPts * rnd(1, 3.2) * 4) / 4 : -Math.round(stopPts * rnd(0.5, 1) * 4) / 4;
      price += rnd(-60, 60);
      const entry = Math.round(price * 4) / 4, dir = side === 'long' ? 1 : -1;
      const exit = entry + movePts * dir;
      const hold = Math.round(rnd(2, win ? 55 : 25));
      const t0 = `${k}T${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
      mins += hold; const t1 = `${k}T${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`; mins += Math.floor(rnd(8, 40));
      const mistakes = !win && Math.random() < 0.55 ? [pick(st.mistakes)] : (win && Math.random() < 0.08 ? [pick(st.mistakes)] : []);
      const t = { id: S.uid(), demo: true, accountId: acc.id, symbol: Math.random() < 0.88 ? 'MNQ' : 'MES', side, qty, entryTime: t0, exitTime: t1, entryPrice: entry, exitPrice: exit,
        stopPrice: entry - stopPts * dir, targetPrice: entry + stopPts * 2.5 * dir, mfePrice: entry + dir * Math.max(win ? movePts : 0, Math.round(stopPts * (win ? rnd(1, 3.6) : rnd(0, 2.4)) * 4) / 4), fees: '', pnlOverride: '', setup: Math.random() < 0.9 ? sp.id : '',
        tags: Math.random() < 0.6 ? [pick(st.tags)] : [], mistakes, rating: win ? pick([3, 4, 4, 5]) : pick([1, 2, 3]), notes: pick(notes), screenshots: [],
        rulesFollowed: sp.rules.map((_, j) => j).filter(() => !mistakes.length || Math.random() < 0.6), createdAt: new Date().toISOString() };
      if (t.symbol === 'MES') { t.entryPrice = Math.round(t.entryPrice / 3.9 * 4) / 4; t.exitPrice = t.entryPrice + movePts / 3.5 * dir; t.exitPrice = Math.round(t.exitPrice * 4) / 4; t.stopPrice = t.entryPrice - Math.round(stopPts / 3.5 * 4) / 4 * dir; t.targetPrice = ''; t.mfePrice = ''; }
      if (shotsLeft > 0 && Math.random() < 0.18) { t.screenshots.push(await S.saveImage(fakeChart(win, side))); shotsLeft--; }
      dayP += S.pnl(t);
      st.trades.push(t);
    }
    if (Math.random() < 0.75) {
      st.journal[k] = Object.assign(st.journal[k] || {}, { demo: true, bias: pick(['Bullish', 'Bearish', 'Neutral']), mood: pick([2, 3, 4, 4, 5]), sleep: pick([5, 6, 6.5, 7, 7.5, 8]),
        premarket: 'Looking for NY open displacement then an OTE retrace. Bias from 1h structure. No trades in the first 2 minutes. Max 3 trades.',
        levels: 'PDH / PDL, Asia high and low, London high. CPI at 8:30.',
        review: dayP >= 0 ? 'Patient day, waited for the zones and let the runners work.' : 'Forced a trade after the first loss. Need to walk away after two losers.',
        wentWell: dayP >= 0 ? 'Waited for confirmation.' : 'Respected the daily stop.', improve: dayP >= 0 ? 'Size up on A+ setups.' : 'No trades outside the plan.',
        discipline: dayP >= 0 ? pick([4, 5]) : pick([2, 3]), followedPlan: dayP >= 0 ? pick(['Yes', 'Yes', 'Partly']) : pick(['Partly', 'No']) });
    }
  }
  const acc3 = { id: S.uid(), demo: true, name: 'LucidFlex 25K #2', firm: 'Lucid Trading', type: 'eval', status: 'active', startBalance: 25000, profitTarget: 1250, maxDrawdown: 1000, drawdownType: 'eod', lockAtStart: true, lockOffset: 0, dailyLossLimit: '', minDays: '', cost: 85, createdAt: acc1.createdAt };
  st.accounts.push(acc3);
  for (const t of st.trades.filter(x => x.demo && x.accountId === acc1.id)) { const c = JSON.parse(JSON.stringify(t)); c.id = S.uid(); c.accountId = acc3.id; c.copyOf = t.id; t.copyGroup = c.copyGroup = t.id; st.trades.push(c); }
  st.payouts.push({ id: S.uid(), demo: true, date: keyOf(days[Math.floor(days.length * 0.45)]), amount: 1200, accountId: acc2.id, desc: 'First payout' });
  st.expenses.push({ id: S.uid(), demo: true, date: keyOf(days[5]), amount: 39, accountId: '', desc: 'Data feed' });
  S.save(); render(); toast('Demo data loaded');
}
async function clearDemo() {
  const st = S.state;
  st.trades.filter(t => t.demo).forEach(t => (t.screenshots || []).forEach(n => S.deleteImage(n)));
  st.trades = st.trades.filter(t => !t.demo);
  st.accounts = st.accounts.filter(a => !a.demo);
  st.payouts = st.payouts.filter(p => !p.demo); st.expenses = st.expenses.filter(p => !p.demo);
  for (const [k, j] of Object.entries(st.journal)) if (j.demo) delete st.journal[k];
  if (ui.account !== 'all' && !accountById(ui.account)) ui.account = 'all';
  S.save(); render(); toast('Demo data removed');
}
