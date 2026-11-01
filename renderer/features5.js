/* Tessra 1.3.0: customizable trade form, results typed by hand, inline lists, custom fields, Firm Matchmaker, Edge Alerts */

/* ===================== TRADE FORM LAYOUT ===================== */
const FORM_FIELDS = [
  ['account', 'Account'], ['exitTime', 'Exit time'], ['entryPrice', 'Entry price'], ['exitPrice', 'Exit price'], ['stopPrice', 'Stop loss'], ['targetPrice', 'Target'],
  ['mfePrice', 'Best price reached'], ['fees', 'Fees'], ['result', 'Result by hand'], ['calc', 'Calculations strip'], ['setup', 'Setup'], ['grade', 'Grade'], ['session', 'Session'],
  ['rules', 'Setup checklist'], ['tags', 'Tags'], ['mistakes', 'Mistakes'], ['copy', 'Copy to accounts'], ['notes', 'Notes'], ['screenshots', 'Screenshots']
];
const FORM_PRESETS = {
  full: { label: 'Full', hidden: [], unit: 'usd' },
  quick: { label: 'Quick', hidden: ['exitTime', 'entryPrice', 'exitPrice', 'stopPrice', 'targetPrice', 'mfePrice', 'fees', 'calc', 'session', 'rules', 'tags', 'mistakes', 'copy', 'screenshots'], unit: 'usd' },
  backtest: { label: 'Backtesting', hidden: ['account', 'exitTime', 'entryPrice', 'exitPrice', 'stopPrice', 'targetPrice', 'mfePrice', 'fees', 'copy', 'mistakes'], unit: 'r' }
};
function tradeFormCfg() {
  const s = S.state.settings;
  s.tradeForm = Object.assign({ hidden: [], preset: 'full', unit: 'usd' }, s.tradeForm || {});
  return s.tradeForm;
}
function applyFormLayout(m) {
  const tf = tradeFormCfg(), edit = m.classList.contains('fe-edit');
  m.querySelectorAll('[data-fk]').forEach(el => {
    const hidden = tf.hidden.includes(el.dataset.fk);
    el.classList.toggle('fe-off', hidden);
    if (el.id === 'rulesBox' && !el.innerHTML) { el.style.display = 'none'; return; }
    el.style.display = hidden && !edit ? 'none' : '';
  });
}
function feBarHtml() {
  const tf = tradeFormCfg();
  return `<div class="fe-inner"><div><b>Customize this form.</b> <span class="muted">Click any field to hide or show it. Symbol, side, contracts and entry time always stay.</span></div>
    <div class="row wrap" style="gap:8px;margin-top:10px"><span class="faint" style="font-size:12px">Start from</span><div class="seg">${Object.entries(FORM_PRESETS).map(([k, p]) => `<button data-fe-preset="${k}" class="${tf.preset === k ? 'on' : ''}">${p.label}</button>`).join('')}</div>
    <div class="spacer"></div><button class="btn sm" data-fe-cf>${ICON.plus}Custom field</button><button class="btn sm primary" data-fe-done>Done</button></div></div>`;
}
function wireFormLayout(m, d, calc) {
  const bar = m.querySelector('#feBar');
  // a hidden Fees field means no fees on new trades, instead of silently charging the default
  const feesWasBlank = !S.hasNum(d.fees) && !d.createdAt; // new trades only
  const syncFees = () => {
    if (!feesWasBlank) return;
    const hid = tradeFormCfg().hidden.includes('fees');
    d.fees = hid ? 0 : ''; const fi = m.querySelector('[data-f=fees]'); if (fi) fi.value = hid ? '' : fi.value;
    if (calc) calc();
  };
  const relayout = () => { applyFormLayout(m); syncFees(); };
  const setEdit = on => { m.classList.toggle('fe-edit', on); bar.innerHTML = on ? feBarHtml() : ''; relayout(); };
  m.querySelector('[data-fe-toggle]').addEventListener('click', () => setEdit(!m.classList.contains('fe-edit')));
  bar.addEventListener('click', e => {
    const p = e.target.closest('[data-fe-preset]');
    if (p) {
      const tf = tradeFormCfg(), pr = FORM_PRESETS[p.dataset.fePreset]; tf.preset = p.dataset.fePreset; tf.hidden = pr.hidden.slice(); tf.unit = pr.unit; S.save(); bar.innerHTML = feBarHtml(); relayout();
      const sel = m.querySelector('[data-res-unit]'); if (sel && sel.value !== pr.unit) { sel.value = pr.unit; sel.dispatchEvent(new Event('change')); }
      return;
    }
    if (e.target.closest('[data-fe-done]')) return setEdit(false);
    if (e.target.closest('[data-fe-cf]')) openCustomFieldModal(null, () => { refreshCustomFields(m, d); applyFormLayout(m); });
  });
  // in edit mode a click on a field toggles it instead of using it
  m.addEventListener('click', e => {
    if (!m.classList.contains('fe-edit')) return;
    const el = e.target.closest('.modal-b [data-fk]'); if (!el) return;
    e.preventDefault(); e.stopPropagation();
    const tf = tradeFormCfg(), k = el.dataset.fk;
    tf.hidden = tf.hidden.includes(k) ? tf.hidden.filter(x => x !== k) : [...tf.hidden, k];
    tf.preset = 'custom'; S.save();
    bar.querySelectorAll('[data-fe-preset]').forEach(b => b.classList.remove('on'));
    relayout();
  }, true);
  relayout();
}

/* ===================== RESULT TYPED BY HAND ===================== */
function wireResultField(m, d, calc) {
  const inp = m.querySelector('[data-res]'), sel = m.querySelector('[data-res-unit]'), risk = m.querySelector('.res-risk');
  if (!inp) return;
  const sync = () => {
    const u = sel.value, v = inp.value;
    d.pnlOverride = u === 'usd' ? v : ''; d.pointsOverride = u === 'pts' ? v : ''; d.rOverride = u === 'r' ? v : '';
    risk.style.display = u === 'r' ? '' : 'none';
    calc();
  };
  inp.addEventListener('input', sync); sel.addEventListener('change', () => { tradeFormCfg().unit = sel.value; S.save(); sync(); });
}

/* ===================== INLINE TAGS / MISTAKES / SETUPS ===================== */
function chipsHtml(kind, list, on) {
  return list.map(t => `<span class="chip toggle ${kind === 'mistake' ? 'mistake' : ''} ${on.includes(t) ? 'on' : ''}" data-${kind}="${esc(t)}">${esc(t)}</span>`).join('') +
    `<span class="chip add-chip" data-add="${kind}">${ICON.plus}Add</span>`;
}
function wireChipList(m, d, kind, listKey, rowSel) {
  const row = m.querySelector(rowSel); if (!row) return;
  const st = S.state, field = kind === 'tag' ? 'tags' : 'mistakes';
  const redraw = () => { row.innerHTML = chipsHtml(kind, st[listKey], d[field]); };
  row.addEventListener('click', e => {
    if (m.classList.contains('fe-edit')) return;
    const c = e.target.closest(`[data-${kind}]`);
    if (c) { const t = c.dataset[kind]; d[field] = d[field].includes(t) ? d[field].filter(x => x !== t) : [...d[field], t]; c.classList.toggle('on'); return; }
    const a = e.target.closest('[data-add]');
    if (a) {
      a.outerHTML = `<input class="input chip-input" data-new="${kind}" placeholder="New ${kind}, press Enter" maxlength="40">`;
      const i = row.querySelector('[data-new]'); i.focus();
      const commit = () => {
        const v = i.value.trim();
        if (v && !st[listKey].some(x => x.toLowerCase() === v.toLowerCase())) { st[listKey].push(v); S.save(); }
        const name = st[listKey].find(x => x.toLowerCase() === v.toLowerCase());
        if (name && !d[field].includes(name)) d[field].push(name);
        redraw();
      };
      i.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); commit(); } else if (ev.key === 'Escape') { ev.stopPropagation(); redraw(); } });
      i.addEventListener('blur', commit);
    }
  });
  row.addEventListener('contextmenu', async e => {
    const c = e.target.closest(`[data-${kind}]`); if (!c) return;
    e.preventDefault();
    const t = c.dataset[kind];
    if (!await confirmBox(`Remove "${esc(t)}"?`, `It disappears from your ${kind} list. Trades that already have it keep it.`)) return;
    st[listKey] = st[listKey].filter(x => x !== t); d[field] = d[field].filter(x => x !== t); S.save(); redraw();
  });
}
function inlineNewSetup(m, d, done) {
  const box = openModal(`<div class="modal-h"><h3>New setup</h3></div><div class="modal-b">
      <div class="field"><label>Name</label><input class="input" data-ns autofocus placeholder="e.g. Silver Bullet"></div>
      <div class="hint">You can add rules and a description later on the Playbook page.</div></div>
    <div class="modal-f"><span></span><div class="row"><button class="btn" data-x>Cancel</button><button class="btn primary" data-ok>Add setup</button></div></div>`, { size: 'sm' });
  const ok = () => {
    const name = box.querySelector('[data-ns]').value.trim(); if (!name) return toast('Give it a name');
    const sp = { id: S.uid(), name, color: COLORS[S.state.setups.length % COLORS.length], description: '', rules: [] };
    S.state.setups.push(sp); S.save(); closeModal(box);
    const sel = m.querySelector('[data-f=setup]');
    sel.insertAdjacentHTML('beforeend', ''); const opt = document.createElement('option'); opt.value = sp.id; opt.textContent = name;
    sel.insertBefore(opt, sel.querySelector('option[value="__new"]')); sel.value = sp.id; d.setup = sp.id; d.rulesFollowed = []; done();
  };
  box.querySelector('[data-ok]').onclick = ok; box.querySelector('[data-x]').onclick = () => closeModal(box);
  box.querySelector('[data-ns]').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ok(); } });
}

/* ===================== CUSTOM FIELDS ===================== */
const CF_TYPES = [['select', 'Dropdown'], ['check', 'Yes / no'], ['number', 'Number'], ['text', 'Text']];
const customFields = () => (S.state.customFields = S.state.customFields || []);
function customFieldsHtml(d) {
  const c = d.custom || {};
  return `<div class="cf-wrap s4" id="cfWrap" style="display:contents">${customFields().map(f => {
    const v = c[f.id];
    let input = '';
    if (f.type === 'select') input = `<select class="select" data-cf="${f.id}"><option value="">-</option>${(f.options || []).map(o => `<option ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    else if (f.type === 'check') input = `<label class="row cf-check" style="gap:8px;cursor:pointer;min-height:38px"><input type="checkbox" data-cf="${f.id}" ${v ? 'checked' : ''} style="accent-color:var(--accent)">${esc(f.name)}</label>`;
    else input = `<input class="input" type="${f.type === 'number' ? 'number' : 'text'}" step="any" data-cf="${f.id}" value="${esc(v ?? '')}">`;
    return `<div class="field s2" data-fk="cf:${f.id}"><label>${esc(f.name)} <span class="faint" style="font-weight:500">custom</span></label>${input}</div>`;
  }).join('')}</div>`;
}
function wireCustomFields(m, d) {
  const wrap = m.querySelector('#cfWrap'); if (!wrap) return;
  const set = el => { d.custom = d.custom || {}; const id = el.dataset.cf, f = customFields().find(x => x.id === id); if (!f) return; d.custom[id] = f.type === 'check' ? el.checked : f.type === 'number' ? (S.hasNum(el.value) ? Number(el.value) : '') : el.value; };
  wrap.addEventListener('input', e => { if (e.target.dataset.cf) set(e.target); });
  wrap.addEventListener('change', e => { if (e.target.dataset.cf) set(e.target); });
}
function refreshCustomFields(m, d) {
  const wrap = m.querySelector('#cfWrap'); if (!wrap) return;
  const tmp = document.createElement('div'); tmp.innerHTML = customFieldsHtml(d);
  wrap.replaceWith(tmp.firstElementChild); wireCustomFields(m, d);
}
function openCustomFieldModal(existing, done) {
  const f = existing ? JSON.parse(JSON.stringify(existing)) : { id: S.uid(), name: '', type: 'select', options: [] };
  const box = openModal(`<div class="modal-h"><h3>${existing ? 'Edit custom field' : 'New custom field'}</h3><button class="btn icon ghost" data-x>${ICON.close}</button></div>
    <div class="modal-b">
      <div class="field"><label>Name</label><input class="input" data-cfk="name" value="${esc(f.name)}" autofocus placeholder="e.g. HTF bias, Waited for confirmation, Confluences"></div>
      <div class="field"><label>Type</label><div class="seg">${CF_TYPES.map(([v, l]) => `<button data-cft="${v}" class="${f.type === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="field" id="cfOpts" style="${f.type === 'select' ? '' : 'display:none'}"><label>Choices <span class="faint" style="font-weight:500">one per line</span></label><textarea class="input" rows="4" data-cfk="options" placeholder="Bullish\nBearish\nNeutral">${esc((f.options || []).join('\n'))}</textarea></div>
      <div class="hint">Shows on every trade form, and Analytics > Breakdown gets a card for it so you can see if it actually matters.</div>
    </div>
    <div class="modal-f">${existing ? `<button class="btn danger" data-del>${ICON.trash}Delete</button>` : '<span></span>'}<div class="row"><button class="btn" data-x>Cancel</button><button class="btn primary" data-ok>Save field</button></div></div>`, { size: 'sm' });
  box.querySelectorAll('[data-cft]').forEach(b => b.onclick = () => { f.type = b.dataset.cft; box.querySelectorAll('[data-cft]').forEach(x => x.classList.toggle('on', x === b)); box.querySelector('#cfOpts').style.display = f.type === 'select' ? '' : 'none'; });
  box.querySelectorAll('[data-x]').forEach(b => b.onclick = () => closeModal(box));
  box.querySelector('[data-ok]').onclick = () => {
    f.name = box.querySelector('[data-cfk=name]').value.trim(); if (!f.name) return toast('Give the field a name');
    f.options = f.type === 'select' ? box.querySelector('[data-cfk=options]').value.split('\n').map(x => x.trim()).filter(Boolean) : [];
    if (f.type === 'select' && !f.options.length) return toast('Add at least one choice');
    const list = customFields(), i = list.findIndex(x => x.id === f.id);
    if (i >= 0) list[i] = f; else list.push(f);
    S.save(); closeModal(box); toast('Custom field saved'); if (done) done(f);
  };
  const del = box.querySelector('[data-del]');
  if (del) del.onclick = async () => {
    if (!await confirmBox(`Delete "${esc(f.name)}"?`, 'The field is removed from the form and Analytics. Values already saved on trades are kept in your data.')) return;
    S.state.customFields = customFields().filter(x => x.id !== f.id); S.save(); closeModal(box); if (done) done(null);
  };
}
function customFieldsSettingsHtml() {
  const list = customFields();
  return `<div class="settings-sec"><div><h3>Custom fields</h3><p>Your own inputs on the trade form, like HTF bias, a confirmation checkbox or a confluence count. Each one gets its own breakdown in Analytics.</p></div>
    <div><div class="row wrap" style="gap:8px">${list.map(f => `<button class="chip" data-action="cf-edit" data-id="${f.id}">${esc(f.name)} <span class="faint">${(CF_TYPES.find(t => t[0] === f.type) || [])[1] || ''}</span></button>`).join('')}<button class="btn sm" data-action="cf-new">${ICON.plus}New custom field</button></div>
    <div class="hint" style="margin-top:10px">Tip: the Customize button on the trade form hides fields you never use, with Quick and Backtesting presets.</div></div></div>`;
}
function customFieldBreakdownHtml(list) {
  const cards = customFields().map(f => {
    const val = t => (t.custom || {})[f.id];
    let groups;
    if (f.type === 'select') groups = f.options.map(o => ({ name: o, trades: list.filter(t => val(t) === o) })).concat([{ name: 'Not set', color: 'var(--faint)', trades: list.filter(t => !val(t)) }]);
    else if (f.type === 'check') groups = [{ name: 'Yes', color: 'var(--pos)', trades: list.filter(t => val(t) === true) }, { name: 'No', color: 'var(--neg)', trades: list.filter(t => val(t) !== true) }];
    else if (f.type === 'number') {
      const nums = list.map(val).filter(v => S.hasNum(v)).map(Number).sort((a, b) => a - b);
      if (nums.length < 4) return '';
      const med = nums[Math.floor(nums.length / 2)];
      groups = [{ name: `Below ${num(med, med % 1 ? 1 : 0)}`, trades: list.filter(t => S.hasNum(val(t)) && +val(t) < med) }, { name: `${num(med, med % 1 ? 1 : 0)} or more`, trades: list.filter(t => S.hasNum(val(t)) && +val(t) >= med) }];
    } else return '';
    return `<div class="card"><div class="card-h"><div class="card-t">${esc(f.name)}</div><span class="sub faint" style="font-size:12px">custom field</span></div>${bkTable(groups, { label: esc(f.name), sort: false })}</div>`;
  }).join('');
  return cards;
}

/* ===================== FIRM MATCHMAKER ===================== */
// Pairs each evaluation with the funded account it leads to. Instant funded plans have no evaluation.
const FIRM_PATHS = [
  ['Topstep|Trading Combine', 'Topstep|Express Funded (Standard payouts)'],
  ['Apex Trader Funding|Evaluation', 'Apex Trader Funding|Performance Account (PA)'],
  ['Lucid Trading|LucidFlex Evaluation', 'Lucid Trading|LucidFlex Funded'],
  ['Lucid Trading|LucidPro Evaluation', 'Lucid Trading|LucidPro Funded'],
  [null, 'Lucid Trading|LucidDirect'],
  ['Tradeify|Growth Evaluation', 'Tradeify|Growth Funded'],
  ['Tradeify|Select Evaluation', 'Tradeify|Select Flex Funded'],
  [null, 'Tradeify|Lightning (instant funded)'],
  ['Take Profit Trader|Test', 'Take Profit Trader|PRO'],
  ['MyFundedFutures|Rapid Evaluation', 'MyFundedFutures|Rapid Funded']
];
const presetByName = k => k ? FIRM_PRESETS.find(p => `${p.firm}|${p.plan}` === k) : null;
function mmCfg() { S.state.matchmaker = Object.assign({ size: '50', base: 50, scale: true, source: 'all', lastN: 150, prices: {} }, S.state.matchmaker || {}); return S.state.matchmaker; }
function mmRng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// One run through an account: returns { result: 1 pass / -1 blown / 0 time out, days, payout }
function mmRunOne(rnd, sample, rules, mode, maxDays) {
  const { target, dd, ddType, lock, dll, cons, minDays, payout } = rules;
  let eq = 0, hwm = 0, floor = -dd, best = 0, profitDays = 0;
  for (let d = 1; d <= maxDays; d++) {
    const n = sample.days[Math.floor(rnd() * sample.days.length)] || 1;
    let dayP = 0;
    for (let k = 0; k < n; k++) {
      if (dll && dayP <= -dll) break;
      const p = sample.pnls[Math.floor(rnd() * sample.pnls.length)];
      eq += p; dayP += p;
      if (ddType === 'intraday') { hwm = Math.max(hwm, eq); floor = Math.min(hwm - dd, lock); }
      if (eq <= floor) return { result: -1, days: d };
    }
    if (ddType === 'eod') { hwm = Math.max(hwm, eq); floor = Math.min(hwm - dd, lock); }
    if (ddType === 'static') floor = -dd;
    best = Math.max(best, dayP);
    if (mode === 'eval') {
      const consOk = !cons || eq <= 0 || best / eq <= cons / 100;
      if (target && eq >= target && consOk && d >= (minDays || 0)) return { result: 1, days: d };
    } else {
      if (dayP > 0 && dayP >= (payout.minDayProfit || 0.01)) profitDays++;
      const consOk = !cons || eq <= 0 || best / eq <= cons / 100;
      const amt = Math.min(payout.maxPayout || Infinity, eq * (payout.payoutPct || 100) / 100);
      if (profitDays >= (payout.minProfitDays || 0) && d >= Math.max(1, minDays || 0) && consOk && amt > 0 && amt >= (payout.minPayout || 0) && eq > lock) return { result: 1, days: d, payout: amt * (payout.split || 90) / 100 };
    }
  }
  return { result: 0, days: maxDays };
}
function mmRules(p, size) {
  const [target, dd, dll] = p.sizes[size];
  const pick2 = v => v && typeof v === 'object' ? (v[size] ?? 0) : (v ?? 0);
  // a cap listed only for some sizes: scale it from the nearest listed size instead of treating it as unlimited
  const cap = v => { if (!v || typeof v !== 'object') return v || 0; if (v[size]) return v[size]; const ks = Object.keys(v).map(Number); if (!ks.length) return 0; const k = ks.sort((a, b) => Math.abs(a - size) - Math.abs(b - size))[0]; return Math.round(v[k] * size / k); };
  return { target, dd, ddType: p.dd, lock: p.lock || 0, dll: dll || 0, cons: p.cons || 0, minDays: p.minDays || 0,
    payout: p.payout ? { minProfitDays: pick2(p.payout.minProfitDays), minDayProfit: pick2(p.payout.minDayProfit), maxPayout: cap(p.payout.maxPayout), payoutPct: pick2(p.payout.payoutPct) || 100, minPayout: pick2(p.payout.minPayout), split: pick2(p.payout.split) || 90 } : null };
}
function mmSample(c) {
  let ts = S.sortTrades(trades());
  if (c.source === 'last') ts = ts.slice(-Math.max(10, +c.lastN || 150));
  const days = Object.values(S.byDay(ts)).map(d => d.trades.length);
  return { ts, pnls: ts.map(S.pnl), days: days.length ? days : [2] };
}
let mmCache = { key: '', val: null };
function runMatchmaker(c) {
  const base = mmSample(c);
  const ck = JSON.stringify([c.size, c.base, c.scale, c.source, c.lastN, c.prices, base.pnls.length, base.pnls.reduce((a, b) => a + b, 0).toFixed(2)]);
  if (mmCache.key === ck) return mmCache.val;
  const val = runMatchmaker0(c, base); mmCache = { key: ck, val }; return val;
}
function runMatchmaker0(c, base) {
  if (base.pnls.length < 15) return { enough: false, n: base.pnls.length };
  const N = 1500, out = [];
  FIRM_PATHS.forEach(([ev, fu], pi) => {
    const pe = presetByName(ev), pf = presetByName(fu); if (!pf) return;
    const sizes = Object.keys((pe || pf).sizes).map(Number).filter(s => c.size === 'all' || s === +c.size);
    for (const size of sizes) {
      if (!pf.sizes[size]) continue;
      const k = c.scale ? size / (+c.base || 50) : 1;
      const sample = { pnls: base.pnls.map(x => x * k), days: base.days };
      const rnd = mmRng(1000 + pi * 97 + size);
      let pass = 0, blow = 0, passDays = [], paid = 0, payDays = [], payAmt = 0;
      const er = pe ? mmRules(pe, size) : null, fr = mmRules(pf, size);
      for (let i = 0; i < N; i++) {
        let daysUsed = 0;
        if (er) {
          const r = mmRunOne(rnd, sample, er, 'eval', 60);
          if (r.result !== 1) { if (r.result === -1) blow++; continue; }
          pass++; passDays.push(r.days); daysUsed = r.days;
        } else pass++;
        if (!fr.payout) continue;
        const f = mmRunOne(rnd, sample, fr, 'funded', 60);
        if (f.result === 1) { paid++; payDays.push(daysUsed + f.days); payAmt += f.payout; }
      }
      const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
      const price = Number((c.prices || {})[`${fu}|${size}`] || 0);
      const expPerAttempt = payAmt / N; // average first payout per account bought
      out.push({ key: `${fu}|${size}`, firm: pf.firm, plan: pe ? pe.plan.replace(' Evaluation', '').replace('Evaluation', 'Eval') : pf.plan, instant: !pe, size, pass: pass / N, blow: blow / N,
        passDays: med(passDays), paid: paid / N, payDays: med(payDays), avgPayout: paid ? payAmt / paid : 0, exp: expPerAttempt, price, net: price ? expPerAttempt - price : null });
    }
  });
  out.sort((a, b) => (b.net ?? b.exp) - (a.net ?? a.exp) || b.paid - a.paid);
  return { enough: true, n: base.pnls.length, rows: out };
}
function matchmakerTab() {
  const c = mmCfg(), r = runMatchmaker(c);
  const head = `<div class="card mm-hero"><div class="dna-kicker">FIRM MATCHMAKER</div><div class="mm-title">Which prop firm fits the way you trade?</div>
    <div class="muted" style="margin-top:6px">Tessra replays your real trades through every firm's rules thousands of times: the evaluation first, then the funded account until your first payout.</div>
    <div class="row wrap mt" style="gap:14px;align-items:flex-end">
      <div class="field"><label>Account size</label>${seg('mm-size', [['all', 'All'], ['25', '25K'], ['50', '50K'], ['100', '100K'], ['150', '150K']], String(c.size))}</div>
      <div class="field"><label>Your trades</label>${seg('mm-source', [['all', 'All'], ['last', 'Last 150']], c.source)}</div>
      <label class="row" style="gap:8px;cursor:pointer;font-size:13px;margin-bottom:9px"><input type="checkbox" data-mm="scale" ${c.scale ? 'checked' : ''} style="accent-color:var(--accent)">Scale my size with the account (my trades are on a <select class="select sm" data-mm="base" style="width:auto;display:inline-block;padding:2px 6px;margin:0 4px">${[25, 50, 100, 150].map(s => `<option value="${s}" ${+c.base === s ? 'selected' : ''}>${s}K</option>`).join('')}</select>)</label>
    </div></div>`;
  if (!r.enough) return head + `<div class="card mt"><div class="empty"><h3>Need at least 15 trades</h3><div>You have ${r.n}. Log a few more and come back.</div></div></div>`;
  const best = r.rows[0];
  const row = (x, i) => `<tr class="${i === 0 ? 'mm-best' : ''}"><td><b>${esc(x.firm)}</b><div class="lr-sub">${esc(x.plan)}${x.instant ? ' · instant funded' : ''}</div></td><td>${x.size}K</td>
    <td class="n">${x.instant ? '<span class="faint">no eval</span>' : `<b class="${x.pass >= 0.5 ? 'pos' : x.pass < 0.25 ? 'neg' : ''}">${pct(x.pass, 0)}</b>`}</td><td class="n muted">${x.instant ? '-' : x.passDays ? x.passDays + 'd' : '-'}</td>
    <td class="n"><b>${pct(x.paid, 0)}</b></td><td class="n muted">${x.payDays ? x.payDays + 'd' : '-'}</td><td class="n">${x.avgPayout ? money0(x.avgPayout) : '-'}</td>
    <td class="n"><b class="${cls(x.exp)}">${money0(x.exp)}</b></td>
    <td class="n"><input class="input mm-price" type="number" step="any" data-mm-price="${esc(x.key)}" value="${x.price || ''}" placeholder="$"></td><td class="n">${x.net === null ? '<span class="faint">add price</span>' : `<b class="${cls(x.net)}">${money0(x.net, true)}</b>`}</td></tr>`;
  return head + `<div class="grid g-4 mt">
      <div class="card kpi" style="grid-column:span 2"><div class="kpi-label">Your best match</div><div class="kpi-value" style="font-size:26px">${esc(best.firm)} ${esc(best.plan)} ${best.size}K</div><div class="kpi-meta">${best.instant ? 'Instant funded' : `Passes ${pct(best.pass, 0)} of the time${best.passDays ? `, in about ${best.passDays} trading days` : ''}`}. Reaches a first payout ${pct(best.paid, 0)} of the time${best.payDays ? `, about ${best.payDays} days in` : ''}.</div><div class="row mt"><button class="btn sm primary" data-action="share-firms">${ICON.share}Share my match</button></div></div>
      <div class="card kpi"><div class="kpi-label">First payout per account</div><div class="kpi-value pos">${money0(best.exp)}</div><div class="kpi-meta">average across every attempt, after split</div></div>
      <div class="card kpi"><div class="kpi-label">Based on</div><div class="kpi-value">${r.n}</div><div class="kpi-meta">of your trades, ${(1500).toLocaleString()} runs per plan</div></div>
    </div>
    <div class="card flush mt"><div class="table-wrap"><table class="tbl mm-tbl"><thead><tr><th>Firm and plan</th><th>Size</th><th class="n">Pass eval</th><th class="n">Days</th><th class="n">Reach 1st payout</th><th class="n">Days</th><th class="n">Avg payout</th><th class="n" title="Average first payout per account you buy, counting the ones that fail">Per account</th><th class="n">Price you pay</th><th class="n">After price</th></tr></thead>
    <tbody>${r.rows.map(row).join('')}</tbody></table></div></div>
    <div class="hint mt">How to read it: <b>Per account</b> is what an average attempt pays you, counting the ones that fail. Type what you'd pay for each account (prices change with sales) to rank by profit after cost. Rules come from public summaries as of October 2026 and these are simulations of your past trades, not a promise.</div>`;
}
const FIRM_SHORT = f => ({ 'Take Profit Trader': 'TPT', 'Apex Trader Funding': 'Apex', 'Lucid Trading': 'Lucid', MyFundedFutures: 'MFFU' }[f] || f);
function firmsCardData(_ref, o) {
  const r = runMatchmaker(mmCfg());
  if (!r.enough) throw new Error('Log at least 15 trades first');
  const b = r.rows[0], second = r.rows[1];
  return {
    kind: 'firms', seed: 'firms' + b.key, result: 'win', title: 'FIRM MATCH', subtitle: `${r.n} TRADES TESTED`, chips: [{ t: 'FIRM MATCH', c: '#f5c542' }],
    rarity: Object.assign({}, Share.RARITY[0], { label: 'BEST MATCH' }), flavor: 'Tested against every firm\'s rules.',
    headline: `${FIRM_SHORT(b.firm)} ${b.size}K`, headNum: null, sub: `${b.plan} · ${b.instant ? 'instant funded' : 'passes ' + pct(b.pass, 0)}`,
    badges: [{ t: b.instant ? 'INSTANT' : `PASS ${pct(b.pass, 0)}`, c: '#2ef0a4' }, { t: `PAYOUT ${pct(b.paid, 0)}`, c: '#f5c542' }],
    stats: [{ k: 'PASS RATE', v: b.instant ? '-' : pct(b.pass, 0) }, { k: 'DAYS TO PASS', v: b.passDays ? String(b.passDays) : '-' }, { k: 'REACH PAYOUT', v: pct(b.paid, 0) }, o.hideDollars ? { k: 'RUNNER UP', v: second ? FIRM_SHORT(second.firm) + ' ' + second.size + 'K' : '-' } : { k: 'AVG PAYOUT', v: b.avgPayout ? money0(b.avgPayout) : '-' }],
    receipt: r.rows.slice(0, 6).map(x => [`${FIRM_SHORT(x.firm).toUpperCase()} ${x.size}K`, x.instant ? `PAY ${pct(x.paid, 0)}` : `PASS ${pct(x.pass, 0)}`]), receiptHead: 'PROP FIRM MATCH',
    meta: second ? `Runner up: ${second.firm} ${second.size}K` : ''
  };
}
if (typeof Share !== 'undefined' && Share.register) Share.register('firms', { title: 'firm match', data: firmsCardData, fname: () => 'tessra-firm-match' });

/* ===================== EDGE ALERTS ===================== */
function edgeAlerts(list) {
  const ts = S.sortTrades(list || trades());
  if (ts.length < 25) return [];
  const days = [...new Set(ts.map(S.dayOf))].sort();
  const cut = days[Math.max(0, days.length - 15)]; // the last 15 trading days vs everything before
  const recent = ts.filter(t => S.dayOf(t) >= cut), older = ts.filter(t => S.dayOf(t) < cut);
  const out = [];
  const add = (id, tone, title, text, action) => out.push({ id, tone, title, text, action });
  const wr = arr => S.summary(arr).winRate;
  if (older.length >= 15 && recent.length >= 8) {
    for (const s of TRADE_SESSIONS) {
      const o = older.filter(t => sessionOf(t) === s), r = recent.filter(t => sessionOf(t) === s);
      if (o.length < 8 || r.length < 5) continue;
      const a = wr(o), b = wr(r);
      if (a - b >= 0.2) add('sess-down-' + s.id, 'neg', `${s.name} has stopped working`, `Win rate in ${s.name} dropped from ${pct(a, 0)} to ${pct(b, 0)} over your last 15 trading days (${r.length} trades, ${money(S.summary(r).net)}).`, `data-action="alert-trades" data-k="session" data-v="${s.id}"`);
      else if (b - a >= 0.2) add('sess-up-' + s.id, 'pos', `${s.name} is heating up`, `Win rate in ${s.name} rose from ${pct(a, 0)} to ${pct(b, 0)} over your last 15 trading days.`, `data-action="alert-trades" data-k="session" data-v="${s.id}"`);
    }
  }
  for (const sp of S.state.setups) {
    const all = ts.filter(t => t.setup === sp.id), last = all.slice(-6);
    if (all.length < 12 || last.length < 6) continue;
    const lost = last.filter(t => S.result(t) === 'loss').length;
    if (lost >= 5 && wr(all.slice(0, -6)) >= 0.45) add('setup-cold-' + sp.id, 'neg', `${sp.name} is cold`, `It lost ${lost} of its last 6 trades, but it normally wins ${pct(wr(all.slice(0, -6)), 0)}. Check whether the market or your execution changed.`, `data-action="setup-trades" data-id="${sp.id}"`);
  }
  // sizing up after losses
  const after = { loss: [], win: [] };
  const byDay = S.byDay(recent.length >= 15 ? recent : ts);
  Object.values(byDay).forEach(d => { const a = S.sortTrades(d.trades); for (let i = 1; i < a.length; i++) { const r = S.result(a[i - 1]); if (r !== 'be') after[r].push(+a[i].qty || 0); } });
  if (after.loss.length >= 5 && after.win.length >= 5) {
    const avg = x => x.reduce((a, b) => a + b, 0) / x.length, L = avg(after.loss), W = avg(after.win);
    if (W > 0 && L / W >= 1.25) add('size-after-loss', 'neg', 'You size up after losses', `Right after a loss you trade ${num(L, 1)} contracts on average, vs ${num(W, 1)} after a win. That's ${Math.round((L / W - 1) * 100)}% bigger, a classic revenge pattern.`, '');
  }
  // trading more, earning less
  if (older.length >= 20 && recent.length >= 10) {
    const od = new Set(older.map(S.dayOf)).size, rd = new Set(recent.map(S.dayOf)).size;
    const otpd = older.length / od, rtpd = recent.length / rd, oe = S.summary(older).expectancy, re = S.summary(recent).expectancy;
    if (rtpd >= otpd * 1.4 && re < oe) add('overtrading', 'neg', 'More trades, less edge', `You're taking ${num(rtpd, 1)} trades a day lately vs ${num(otpd, 1)} before, and each trade earns ${money(re)} vs ${money(oe)}.`, '');
  }
  // grade drift
  const graded = ts.filter(t => gradeOf(t.grade));
  if (graded.length >= 30) {
    const lastG = graded.slice(-15), prevG = graded.slice(0, -15);
    const bc = a => a.filter(t => t.grade === 'B' || t.grade === 'C').length / a.length;
    if (bc(lastG) - bc(prevG) >= 0.2) add('grade-drift', 'neg', 'More B and C trades lately', `${pct(bc(lastG), 0)} of your last 15 graded trades were B or C, up from ${pct(bc(prevG), 0)}. B and C trades are where most accounts leak.`, `data-action="alert-trades" data-k="grade" data-v="C"`);
  }
  // trading after the daily lock
  const locked = recent.filter(t => (t.mistakes || []).includes('Traded after lock'));
  if (locked.length >= 2) add('after-lock', 'neg', 'Trading after your daily lock', `${locked.length} trades in the last 15 days came after you hit your daily limit, netting ${money(S.summary(locked).net)}.`, `data-action="mistake-trades" data-v="Traded after lock"`);
  const dis = S.state.settings.dismissedAlerts || {}, today = todayKey();
  return out.filter(a => !dis[a.id] || dis[a.id] < today);
}
function edgeAlertsHtml() {
  if (S.state.settings.edgeAlerts === false) return '';
  const al = edgeAlerts();
  if (!al.length) return '';
  return `<div class="card edge-card"><div class="card-h"><div class="card-t">${ICON.spark} Edge alerts <span class="sub">Tessra noticed ${al.length === 1 ? 'something' : al.length + ' things'} in your recent trades</span></div></div>
    <div class="edge-list">${al.slice(0, 4).map(a => `<div class="edge-al ${a.tone}"><span class="dot"></span><div style="flex:1"><b>${esc(a.title)}</b><div class="lr-sub">${esc(a.text)}</div></div>
      <div class="row" style="gap:6px">${a.action ? `<button class="btn sm ghost" ${a.action}>See trades</button>` : ''}<button class="btn sm ghost" data-action="alert-dismiss" data-id="${esc(a.id)}" title="Hide for 2 weeks">${ICON.close}</button></div></div>`).join('')}</div></div>`;
}
function dismissAlert(id) {
  const d = new Date(); d.setDate(d.getDate() + 14);
  S.state.settings.dismissedAlerts = Object.assign({}, S.state.settings.dismissedAlerts, { [id]: keyOf(d) }); S.save(); render(true);
}
function alertTrades(k, v) {
  Object.assign(ui.tf, { q: '', symbol: '', side: '', setup: '', result: '', tag: '', mistake: '', session: '', grade: '', from: '', to: '' });
  if (k === 'session') ui.tf.session = v; else if (k === 'grade') ui.tf.grade = v;
  go('trades');
}

// settings inputs on the Matchmaker tab
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset && t.dataset.mm) { const c = mmCfg(); c[t.dataset.mm] = t.type === 'checkbox' ? t.checked : t.value; S.save(); render(true); }
  if (t.dataset && t.dataset.mmPrice) { const c = mmCfg(); c.prices = Object.assign({}, c.prices, { [t.dataset.mmPrice]: S.hasNum(t.value) ? Number(t.value) : '' }); S.save(); render(true); }
});
