/* Tessra: Payout Planner, Weekly Review, What-if Lab */

/* ===================== PAYOUT PLANNER ===================== */
// LucidFlex funded rules (checked Oct 2026): 5 profit days at a size based minimum, request capped at 50% of profit
// and a per size max, $500 minimum, 90/10 split, up to 5 payouts, EOD trailing MLL locks at start + $100.
const PAYOUT_PRESETS = {
  flex25: { label: 'LucidFlex 25K', minProfitDays: 5, minDayProfit: 100, maxPayout: 1000, payoutPct: 50, minPayout: 500, split: 90, maxPayouts: 5, consistencyPct: 0, start: 25000, dd: 1000, lockOffset: 100, base: 'cycle' },
  flex50: { label: 'LucidFlex 50K', minProfitDays: 5, minDayProfit: 150, maxPayout: 2000, payoutPct: 50, minPayout: 500, split: 90, maxPayouts: 5, consistencyPct: 0, start: 50000, dd: 2000, lockOffset: 100, base: 'cycle' },
  flex100: { label: 'LucidFlex 100K', minProfitDays: 5, minDayProfit: 200, maxPayout: 2500, payoutPct: 50, minPayout: 500, split: 90, maxPayouts: 5, consistencyPct: 0, start: 100000, dd: 3000, lockOffset: 100, base: 'cycle' },
  flex150: { label: 'LucidFlex 150K', minProfitDays: 5, minDayProfit: 250, maxPayout: 3000, payoutPct: 50, minPayout: 500, split: 90, maxPayouts: 5, consistencyPct: 0, start: 150000, dd: 4500, lockOffset: 100, base: 'cycle' },
  custom: { label: 'Custom rules', minProfitDays: 5, minDayProfit: 100, maxPayout: 1000, payoutPct: 50, minPayout: 500, split: 90, maxPayouts: 0, consistencyPct: 0, base: 'cycle' }
};
const PAYOUT_FIELDS = [['minProfitDays', 'Profit days needed'], ['minDayProfit', 'Min profit per day ($)'], ['maxPayout', 'Max payout per request ($)'], ['payoutPct', 'Max % of profit per request'], ['minPayout', 'Min payout ($)'], ['split', 'Your split (%)'], ['maxPayouts', 'Max payouts (0 = no limit)'], ['consistencyPct', 'Consistency rule % (0 = none)']];

function addWeekdays(from, n) {
  const d = new Date(from); let left = n;
  while (left > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) left--; }
  return d;
}
function nextDay(k) { const d = parseKey(k); d.setDate(d.getDate() + 1); return keyOf(d); }

function payoutStatus(acc) {
  const r = acc.payout;
  if (!r || !r.enabled) return null;
  const st = S.accountStatus(acc);
  const start = Number(acc.startBalance || 0);
  const pays = S.state.payouts.filter(p => p.accountId === acc.id).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const last = pays.length ? pays[pays.length - 1].date : null;
  const allDays = Object.values(S.byDay(st.trades)).sort((a, b) => a.date.localeCompare(b.date));
  const cycle = allDays.filter(d => !last || d.date > last);
  const minDay = Number(r.minDayProfit || 0), need = Number(r.minProfitDays || 0);
  const qual = cycle.filter(d => d.pnl >= minDay);
  const cycleNet = cycle.reduce((a, d) => a + d.pnl, 0);
  const profit = st.balance - start;
  const base = r.base === 'total' ? profit : Math.min(cycleNet, profit);
  const pctCap = Math.max(0, base) * Number(r.payoutPct || 100) / 100;
  const cap = Math.max(0, Math.floor(Math.min(Number(r.maxPayout) || Infinity, pctCap)));
  const maxP = Number(r.maxPayouts || 0);
  const largest = cycle.reduce((a, d) => Math.max(a, d.pnl), 0);
  const consPct = Number(r.consistencyPct || 0);
  const consOk = !consPct || cycleNet <= 0 || largest / cycleNet * 100 <= consPct;
  const checks = [
    { ok: qual.length >= need, label: `${Math.min(qual.length, need)} of ${need} profit days ($${minDay}+)`, key: 'days' },
    { ok: cycleNet > 0, label: `Cycle net profit positive (${money(cycleNet)})`, key: 'net' },
    { ok: cap >= Number(r.minPayout || 0), label: `Withdrawable at least $${Number(r.minPayout || 0)} (now ${money0(cap)})`, key: 'min' }
  ];
  if (maxP) checks.push({ ok: pays.length < maxP, label: `Payouts used ${pays.length} of ${maxP}`, key: 'count' });
  if (consPct) checks.push({ ok: consOk, label: `Best day under ${consPct}% of cycle profit (${cycleNet > 0 ? Math.round(largest / cycleNet * 100) : 0}%)`, key: 'cons' });
  const eligible = checks.every(c => c.ok);
  const remaining = Math.max(0, need - qual.length);
  const rate = allDays.length ? Math.max(0.15, allDays.filter(d => d.pnl >= minDay).length / allDays.length) : 0.5;
  const etaDays = remaining ? Math.ceil(remaining / rate) : 0;
  const eta = remaining ? addWeekdays(new Date(), etaDays) : null;
  const fullNeed = Number(r.maxPayout) && Number(r.payoutPct) ? Number(r.maxPayout) * 100 / Number(r.payoutPct) : null;
  return {
    rules: r, st, pays, last, cycle, qual, cycleNet, profit, cap, eligible, checks, remaining, eta, etaDays, rate,
    amount: eligible ? cap : 0, receive: (eligible ? cap : 0) * Number(r.split || 100) / 100,
    capReceive: cap * Number(r.split || 100) / 100,
    toFullPayout: fullNeed ? Math.max(0, fullNeed - (r.base === 'total' ? profit : cycleNet)) : null, fullNeed, baseLabel: r.base === 'total' ? 'account' : 'cycle',
    payoutNo: pays.length + 1, maxP
  };
}

function payoutPlannerHtml() {
  const accs = S.state.accounts.filter(a => a.payout && a.payout.enabled && a.status !== 'archived' && a.status !== 'failed');
  if (!accs.length) return `<div class="card mt-l payout-empty"><div class="between"><div><div class="card-t">${ICON.target} Payout planner</div><div class="muted" style="margin-top:4px;font-size:12.8px">Turn on payout rules for a funded account (Edit account, then Payout rules) to see how close each one is to its next payout.</div></div></div></div>`;
  return `<div class="card mt-l"><div class="card-h"><div class="card-t">${ICON.target} Payout planner <span class="sub">next payout for each funded account</span></div></div>
    <div class="payout-grid">${accs.map(a => {
      const p = payoutStatus(a), r = p.rules;
      const dayPct = Math.min(1, p.qual.length / Math.max(1, Number(r.minProfitDays)));
      const dots = Array.from({ length: Number(r.minProfitDays) || 0 }, (_, i) => `<span class="pday ${i < p.qual.length ? 'on' : ''}"></span>`).join('');
      return `<div class="payout-item ${p.eligible ? 'ready' : ''}">
        <div class="between"><div><div class="lr-main">${esc(a.name)}</div><div class="lr-sub">Payout ${p.maxP ? `${Math.min(p.payoutNo, p.maxP)} of ${p.maxP}` : '#' + p.payoutNo}${p.last ? ' · last paid ' + fmtDay(p.last, { weekday: undefined }) : ''}</div></div>
          ${p.eligible ? '<span class="chip pos">Eligible now</span>' : `<span class="chip warn">${p.remaining ? p.remaining + ' day' + (p.remaining === 1 ? '' : 's') + ' to go' : 'Not yet'}</span>`}</div>
        <div class="pdays">${dots}</div>
        <div class="progress pos" style="margin-top:8px"><div style="width:${dayPct * 100}%"></div></div>
        <div class="kv mt">
          <div><div class="k">${p.eligible ? 'Request now' : 'Withdrawable now'}</div><div class="v pos">${money0(p.cap)}</div></div>
          <div><div class="k">You receive (${r.split}%)</div><div class="v">${money0(p.capReceive)}</div></div>
          <div><div class="k">Cycle profit</div><div class="v ${cls(p.cycleNet)}">${money(p.cycleNet)}</div></div>
          <div><div class="k">${p.eligible ? 'Status' : 'Estimated'}</div><div class="v">${p.eligible ? 'Ready' : p.eta ? fmtDay(keyOf(p.eta)) : 'Fix checks'}</div></div>
        </div>
        ${p.toFullPayout ? `<div class="lr-sub" style="margin-top:10px">${money0(p.toFullPayout)} more ${p.baseLabel} profit unlocks the full ${money0(r.maxPayout)} request.</div>` : `<div class="lr-sub" style="margin-top:10px">${p.baseLabel === 'cycle' ? 'Cycle' : 'Account'} profit covers the full ${money0(r.maxPayout)} request.</div>`}
        <div class="check-list mt">${p.checks.map(c => `<label style="cursor:default;font-size:12.5px"><span class="${c.ok ? 'pos' : 'faint'}" style="display:grid">${c.ok ? ICON.check : I('<circle cx="12" cy="12" r="8"/>', 15)}</span>${esc(c.label)}</label>`).join('')}</div>
        <div class="row mt"><button class="btn sm ${p.eligible ? 'primary' : ''}" data-action="request-payout" data-id="${a.id}" ${p.eligible ? '' : 'disabled title="Not eligible yet"'}>${ICON.plus}Log payout of ${money0(p.cap)}</button></div>
      </div>`;
    }).join('')}</div></div>`;
}
function payoutMiniHtml(a) {
  const p = payoutStatus(a); if (!p) return '';
  return `<div class="between lr-sub" style="margin:12px 0 5px"><span>Next payout: ${Math.min(p.qual.length, p.rules.minProfitDays)}/${p.rules.minProfitDays} profit days</span><span class="${p.eligible ? 'pos' : ''}">${p.eligible ? 'Eligible ' + money0(p.cap) : p.eta ? '≈ ' + fmtDay(keyOf(p.eta), { weekday: undefined }) : ''}</span></div>
    <div class="progress ${p.eligible ? 'pos' : ''}"><div style="width:${Math.min(1, p.qual.length / Math.max(1, p.rules.minProfitDays)) * 100}%"></div></div>`;
}
function payoutRulesFormHtml(d) {
  const r = Object.assign({ enabled: false, preset: 'flex25' }, PAYOUT_PRESETS.flex25, d.payout || {});
  return `<div class="field" style="grid-column:span 2;border-top:1px solid var(--line);padding-top:14px;margin-top:4px">
      <label class="row" style="gap:8px;cursor:pointer;font-size:13px;color:var(--text)"><input type="checkbox" data-p="enabled" ${r.enabled ? 'checked' : ''} style="accent-color:var(--accent)"> Track payouts for this account (Payout planner)</label></div>
    <div class="field"><label>Payout rule preset</label><select class="select" data-p="preset">${Object.entries(PAYOUT_PRESETS).map(([k, v]) => `<option value="${k}" ${r.preset === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select><span class="hint">Picking a Lucid preset also fills size, drawdown and the +$100 lock.</span></div>
    <div class="field"><label>Drawdown locks at start + ($)</label><input class="input" type="number" step="any" data-k="lockOffset" value="${esc(d.lockOffset ?? 0)}"><span class="hint">Lucid locks the trailing floor at start + $100</span></div>
    <div class="field"><label>Payout is a % of</label><select class="select" data-p="base"><option value="cycle" ${r.base !== 'total' ? 'selected' : ''}>Profit this cycle (since last payout)</option><option value="total" ${r.base === 'total' ? 'selected' : ''}>Total account profit</option></select><span class="hint">Lucid uses this cycle's profit</span></div>
    ${PAYOUT_FIELDS.map(([k, l]) => `<div class="field"><label>${l}</label><input class="input" type="number" step="any" data-p="${k}" value="${esc(r[k] ?? '')}"></div>`).join('')}`;
}
function wirePayoutForm(m) {
  const presetSel = m.querySelector('[data-p=preset]');
  if (!presetSel) return;
  presetSel.addEventListener('change', () => {
    const p = PAYOUT_PRESETS[presetSel.value]; if (!p) return;
    PAYOUT_FIELDS.concat([['base']]).forEach(([k]) => { const i = m.querySelector(`[data-p=${k}]`); if (i && p[k] !== undefined) i.value = p[k]; });
    const set = (k, v) => { const i = m.querySelector(`[data-k=${k}]`); if (i && v !== undefined) i.value = v; };
    if (p.start) { set('startBalance', p.start); set('maxDrawdown', p.dd); set('lockOffset', p.lockOffset); set('drawdownType', 'eod'); }
    const en = m.querySelector('[data-p=enabled]'); if (en) en.checked = true;
  });
}
function readPayoutForm(m) {
  const out = {};
  m.querySelectorAll('[data-p]').forEach(i => { out[i.dataset.p] = i.type === 'checkbox' ? i.checked : i.value; });
  PAYOUT_FIELDS.forEach(([k]) => out[k] = S.hasNum(out[k]) ? Number(out[k]) : 0);
  return out;
}

/* ===================== WEEKLY REVIEW ===================== */
function weekStartKey(k) {
  const d = parseKey(k), ws = S.state.settings.weekStart || 0;
  d.setDate(d.getDate() - ((d.getDay() - ws + 7) % 7));
  return keyOf(d);
}
function shiftWeek(k, n) { const d = parseKey(k); d.setDate(d.getDate() + 7 * n); return keyOf(d); }
const SESSIONS = [['Before 9:30', 0, 570], ['9:30 to 10:00', 570, 600], ['10:00 to 11:00', 600, 660], ['11:00 to 2:00', 660, 840], ['After 2:00', 840, 1440]];
const minsOf = t => t.entryTime && t.entryTime.length > 12 ? +t.entryTime.slice(11, 13) * 60 + +t.entryTime.slice(14, 16) : null;

function weekInsights(ts, days, prevS) {
  const out = [], s = S.summary(ts), st = S.state, g = st.goals;
  const bySetup = st.setups.map(x => ({ name: x.name, s: S.summary(ts.filter(t => t.setup === x.id)) })).filter(x => x.s.count);
  if (bySetup.length) {
    const best = bySetup.reduce((a, b) => b.s.net > a.s.net ? b : a), worst = bySetup.reduce((a, b) => b.s.net < a.s.net ? b : a);
    out.push(['pos', `Best setup: <b>${esc(best.name)}</b> ${money(best.s.net)} over ${best.s.count} trade${best.s.count === 1 ? '' : 's'} (${pct(best.s.winRate, 0)} win).`]);
    if (worst !== best && worst.s.net < 0) out.push(['neg', `Weakest setup: <b>${esc(worst.name)}</b> ${money(worst.s.net)} over ${worst.s.count} trade${worst.s.count === 1 ? '' : 's'}.`]);
  }
  const noSetup = ts.filter(t => !t.setup);
  if (noSetup.length) out.push(['warn', `${noSetup.length} trade${noSetup.length === 1 ? '' : 's'} had no setup tagged (${money(noSetup.reduce((a, t) => a + S.pnl(t), 0))}).`]);
  const mk = st.mistakes.map(m => { const x = ts.filter(t => (t.mistakes || []).includes(m)); return { m, n: x.length, cost: x.reduce((a, t) => a + S.pnl(t), 0) }; }).filter(x => x.n).sort((a, b) => a.cost - b.cost);
  if (mk.length && mk[0].cost < 0) out.push(['neg', `Biggest leak: <b>${esc(mk[0].m)}</b> ${mk[0].n}× costing ${money(mk[0].cost)}.`]);
  const broke = ts.filter(t => { const sp = setupById(t.setup); return sp && sp.rules.length && (t.rulesFollowed || []).length < sp.rules.length; });
  if (broke.length) out.push(['warn', `Setup rules broken on ${broke.length} trade${broke.length === 1 ? '' : 's'} (${money(broke.reduce((a, t) => a + S.pnl(t), 0))}).`]);
  else if (ts.some(t => setupById(t.setup))) out.push(['pos', 'Every tagged trade followed its setup checklist.']);
  const sess = SESSIONS.map(([n, a, b]) => ({ n, s: S.summary(ts.filter(t => { const m = minsOf(t); return m !== null && m >= a && m < b; })) })).filter(x => x.s.count);
  if (sess.length > 1) {
    const b = sess.reduce((x, y) => y.s.net > x.s.net ? y : x), w = sess.reduce((x, y) => y.s.net < x.s.net ? y : x);
    out.push(['info', `Best time window: <b>${b.n}</b> ${money(b.s.net)}.${w !== b && w.s.net < 0 ? ` Worst: <b>${w.n}</b> ${money(w.s.net)}.` : ''}`]);
  }
  if (g.maxTradesPerDay) { const over = days.filter(d => d.trades.length > g.maxTradesPerDay); if (over.length) out.push(['warn', `Overtraded on ${over.length} day${over.length === 1 ? '' : 's'} (more than ${g.maxTradesPerDay} trades).`]); }
  if (g.dailyMaxLoss) { const hit = days.filter(d => d.pnl <= -g.dailyMaxLoss); if (hit.length) out.push(['neg', `Hit the daily max loss on ${hit.length} day${hit.length === 1 ? '' : 's'}.`]); }
  const after = ts.filter((t, i, arr) => { const prev = arr.filter(x => S.dayOf(x) === S.dayOf(t) && (x.exitTime || '') <= (t.entryTime || '') && x !== t).pop(); return prev && S.pnl(prev) < 0 && minsOf(t) !== null && minsOf(prev) !== null && (new Date(t.entryTime) - new Date(prev.exitTime)) / 60000 <= 5; });
  if (after.length) out.push(['warn', `${after.length} trade${after.length === 1 ? ' was' : 's were'} taken within 5 minutes of a loss (${money(after.reduce((a, t) => a + S.pnl(t), 0))}). Watch for revenge trading.`]);
  const noJ = days.filter(d => { const j = st.journal[d.date] || {}; return !j.premarket && !j.review; });
  if (noJ.length) out.push(['info', `${noJ.length} trading day${noJ.length === 1 ? '' : 's'} with no journal entry.`]);
  if (prevS && prevS.count) out.push([s.net >= prevS.net ? 'pos' : 'neg', `Versus last week: ${money(s.net - prevS.net)} P&L, win rate ${pct(s.winRate, 0)} vs ${pct(prevS.winRate, 0)}.`]);
  return out;
}

function pageWeekly() {
  if (!ui.week) ui.week = weekStartKey(todayKey());
  const ws = ui.week, we = shiftWeek(ws, 1);
  const endShow = (() => { const d = parseKey(we); d.setDate(d.getDate() - 1); return keyOf(d); })();
  const all = trades();
  const ts = S.sortTrades(all.filter(t => { const d = S.dayOf(t); return d >= ws && d < we; }));
  const prev = all.filter(t => { const d = S.dayOf(t); return d >= shiftWeek(ws, -1) && d < ws; });
  const s = S.summary(ts), ps = S.summary(prev);
  const dayMap = S.byDay(ts), days = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  const green = days.filter(d => d.pnl > 0).length;
  const w = (S.state.weekly = S.state.weekly || {})[ws] || {};
  const lastW = S.state.weekly[shiftWeek(ws, -1)] || {};
  const delta = (a, b, f = money) => b === undefined || b === null ? '' : `<span class="${cls(a - b)}" style="font-size:12px;font-weight:600;margin-left:6px">${a - b >= 0 ? '▲' : '▼'} ${f(Math.abs(a - b), false)}</span>`;
  const insights = ts.length ? weekInsights(ts, days, ps) : [];
  const ta = (f, ph, rows = 3) => `<textarea class="input" data-wk="${f}" rows="${rows}" placeholder="${ph}">${esc(w[f] || '')}</textarea>`;
  later(() => {
    const dd = []; for (let i = 0; i < 7; i++) { const d = parseKey(ws); d.setDate(d.getDate() + i); const k = keyOf(d); if (d.getDay() === 0 || d.getDay() === 6) { if (!dayMap[k]) continue; } dd.push({ label: DOW[d.getDay()], value: dayMap[k] ? dayMap[k].pnl : 0, date: k, tip: `${fmtDay(k)}<br><b>${money(dayMap[k] ? dayMap[k].pnl : 0)}</b>${dayMap[k] ? ' · ' + dayMap[k].trades.length + ' trades' : ''}` }); }
    Charts.bars(document.getElementById('wkBars'), dd, { height: 190, onClick: it => openDay(it.date) });
    let eq = 0; Charts.line(document.getElementById('wkEq'), [{ label: '', value: 0 }].concat(ts.map(t => { eq += S.pnl(t); return { label: fmtDay(S.dayOf(t), { weekday: 'short', month: undefined, day: undefined }), value: eq }; })), { height: 190 });
  });
  const sessRows = SESSIONS.map(([n, a, b]) => ({ name: n, trades: ts.filter(t => { const m = minsOf(t); return m !== null && m >= a && m < b; }) }));
  const setupRows = S.state.setups.map(x => ({ name: x.name, color: x.color, trades: ts.filter(t => t.setup === x.id) })).concat([{ name: 'No setup', color: 'var(--faint)', trades: ts.filter(t => !t.setup) }]);
  return `<div class="cal-head">
      <button class="btn icon" data-action="wk-prev">${ICON.left}</button>
      <h2 style="min-width:300px">${fmtDay(ws, { weekday: undefined })} to ${fmtDay(endShow, { weekday: undefined, year: 'numeric' })}</h2>
      <button class="btn icon" data-action="wk-next">${ICON.right}</button>
      <button class="btn sm" data-action="wk-this">This week</button>
      <div class="spacer"></div><span class="saved-ind" id="savedInd">Notes autosave</span>
    </div>
    <div class="grid g-6">
      <div class="card kpi"><div class="kpi-label">Net P&L</div><div class="kpi-value ${cls(s.net)}">${money(s.net)}</div><div class="kpi-meta">last week ${money(ps.net)}</div></div>
      <div class="card kpi"><div class="kpi-label">Trades</div><div class="kpi-value">${s.count}</div><div class="kpi-meta">${days.length} trading day${days.length === 1 ? '' : 's'}</div></div>
      <div class="card kpi"><div class="kpi-label">Win rate</div><div class="kpi-value">${s.count ? pct(s.winRate, 0) : '-'}</div><div class="kpi-meta">${s.wins}W · ${s.losses}L</div></div>
      <div class="card kpi"><div class="kpi-label">Total R</div><div class="kpi-value ${cls(s.rSum)}">${s.rCount ? rFmt(s.rSum) : '-'}</div><div class="kpi-meta">avg ${rFmt(s.avgR)}</div></div>
      <div class="card kpi"><div class="kpi-label">Profit factor</div><div class="kpi-value">${s.count ? pf(s.profitFactor) : '-'}</div><div class="kpi-meta">fees ${money(-s.fees, false)}</div></div>
      <div class="card kpi"><div class="kpi-label">Green days</div><div class="kpi-value">${days.length ? green + '/' + days.length : '-'}</div><div class="kpi-meta">best ${days.length ? money(Math.max(...days.map(d => d.pnl))) : '-'}</div></div>
    </div>
    ${ts.length ? `<div class="grid g-2 mt">
      <div class="card"><div class="card-h"><div class="card-t">Day by day <span class="sub">click a bar to open the day</span></div></div><div id="wkBars"></div></div>
      <div class="card"><div class="card-h"><div class="card-t">Equity this week</div></div><div id="wkEq"></div></div>
    </div>
    <div class="card mt"><div class="card-h"><div class="card-t">${ICON.spark} What stood out</div><span class="faint" style="font-size:12px">Generated from your trades and journal</span></div>
      <div class="grid" style="gap:8px">${insights.map(([k, m]) => `<div class="alert ${k}">${k === 'pos' ? ICON.check : k === 'info' ? ICON.spark : ICON.warn}<div>${m}</div></div>`).join('')}</div></div>
    <div class="grid g-2 mt">
      <div class="card"><div class="card-h"><div class="card-t">By time of day <span class="sub">times as logged</span></div></div>${bkTable(sessRows, { label: 'Window', sort: false })}</div>
      <div class="card"><div class="card-h"><div class="card-t">By setup</div></div>${bkTable(setupRows, { label: 'Setup' })}</div>
    </div>` : `<div class="card mt"><div class="empty"><h3>No trades this week</h3><div>Use the arrows to look at another week, or write your plan for the week below.</div></div></div>`}
    <div class="grid g-2 mt">
      <div class="card">
        <div class="card-h"><div class="card-t">Your review</div></div>
        <div class="grid" style="gap:14px">
          <div class="field"><label>Week grade</label><div class="scale">${['F', 'D', 'C', 'B', 'A'].map((g, i) => `<button data-wkgrade="${i + 1}" class="${+w.grade === i + 1 ? 'on' : ''}">${g}</button>`).join('')}</div></div>
          <div class="field"><label>What went well</label>${ta('wins', 'Patience, good entries, followed the plan...')}</div>
          <div class="field"><label>Leaks and lessons</label>${ta('lessons', 'What cost you money this week and why?')}</div>
          <div class="field"><label>Focus for next week</label>${ta('focus', 'One or two concrete things to do differently', 2)}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-h"><div class="card-t">Last week's focus</div></div>
        ${lastW.focus ? `<div class="note-box">${esc(lastW.focus)}</div>
          <div class="field mt"><label>Did you stick to it?</label><div class="seg">${['Yes', 'Partly', 'No'].map(b => `<button data-wkset="stuck" data-v="${b}" class="${w.stuck === b ? 'on' : ''}">${b}</button>`).join('')}</div></div>`
        : '<div class="faint">No focus was set last week. Set one on the left and it will show up here next week.</div>'}
        <div class="seg-label mt-l">Trades this week</div>
        ${ts.length ? `<div style="max-height:300px;overflow:auto">${ts.slice().reverse().map(t => `<div class="list-row" data-action="open-trade" data-id="${t.id}">${sideTag(t.side)}<div style="flex:1"><div class="lr-main">${esc(t.symbol)} × ${t.qty}</div><div class="lr-sub">${fmtDay(S.dayOf(t))} ${fmtTime(t.entryTime)} · ${esc(setupName(t.setup) || 'No setup')}</div></div><b class="${cls(S.pnl(t))}">${money(S.pnl(t))}</b></div>`).join('')}</div>` : '<div class="faint">None yet.</div>'}
      </div>
    </div>`;
}
function wkEntry() { S.state.weekly = S.state.weekly || {}; return S.state.weekly[ui.week] = S.state.weekly[ui.week] || {}; }

/* ===================== WHAT-IF LAB ===================== */
const WI_DEFAULT = { maxTrades: '', maxLosses: '', lossStop: '', profitStop: '', noAfter: '', noBefore: '', skipMistakes: false, setups: [], side: 'both', skipDays: [], fixedQty: '', capLoss: false, targetR: '' };
function wiRules() { S.state.whatif = Object.assign({}, WI_DEFAULT, S.state.whatif || {}); return S.state.whatif; }
function wiActive(r) {
  const a = [];
  if (S.hasNum(r.maxTrades)) a.push(['maxTrades', `Max ${r.maxTrades} trade${+r.maxTrades === 1 ? '' : 's'} per day`]);
  if (S.hasNum(r.maxLosses)) a.push(['maxLosses', `Stop after ${r.maxLosses} loss${+r.maxLosses === 1 ? '' : 'es'} in a day`]);
  if (S.hasNum(r.lossStop)) a.push(['lossStop', `Stop for the day at -$${r.lossStop}`]);
  if (S.hasNum(r.profitStop)) a.push(['profitStop', `Stop for the day at +$${r.profitStop}`]);
  if (r.noBefore) a.push(['noBefore', `No trades before ${r.noBefore}`]);
  if (r.noAfter) a.push(['noAfter', `No trades after ${r.noAfter}`]);
  if (r.skipMistakes) a.push(['skipMistakes', 'Skip trades tagged with a mistake']);
  if (r.setups.length) a.push(['setups', 'Only: ' + r.setups.map(id => setupName(id) || 'No setup').join(', ')]);
  if (r.side !== 'both') a.push(['side', r.side === 'long' ? 'Longs only' : 'Shorts only']);
  if (r.skipDays.length) a.push(['skipDays', 'Skip ' + r.skipDays.map(d => DOW[d]).join(', ')]);
  if (S.hasNum(r.fixedQty)) a.push(['fixedQty', `Always ${r.fixedQty} contract${+r.fixedQty === 1 ? '' : 's'}`]);
  if (r.capLoss) a.push(['capLoss', 'Losses capped at -1R']);
  if (S.hasNum(r.targetR)) a.push(['targetR', `Fixed ${r.targetR}R target`]);
  return a;
}
function simulate(list, r) {
  const toMin = s => s ? +s.slice(0, 2) * 60 + +s.slice(3, 5) : null;
  const before = toMin(r.noBefore), after = toMin(r.noAfter);
  const pre = S.sortTrades(list).filter(t => {
    const m = minsOf(t);
    if (before !== null && m !== null && m < before) return false;
    if (after !== null && m !== null && m > after) return false;
    if (r.skipMistakes && (t.mistakes || []).length) return false;
    if (r.setups.length && !r.setups.includes(t.setup || '_none')) return false;
    if (r.side !== 'both' && (t.side === 'short' ? 'short' : 'long') !== r.side) return false;
    if (r.skipDays.length && r.skipDays.includes(parseKey(S.dayOf(t)).getDay())) return false;
    return true;
  });
  const adj = t => {
    let qty = Number(t.qty) || 1, p = S.pnl(t);
    const f = S.hasNum(r.fixedQty) && +r.fixedQty > 0 ? +r.fixedQty / qty : 1;
    if (f !== 1) { p *= f; qty = +r.fixedQty; }
    const c = Object.assign({}, t, { qty });
    const risk = S.risk(c), fees = S.fees(Object.assign({}, c, { fees: S.hasNum(t.fees) ? t.fees * f : '' }));
    if (S.hasNum(r.targetR) && risk && S.hasNum(t.mfePrice) && S.hasNum(t.stopPrice)) {
      const dir = t.side === 'short' ? -1 : 1, unit = Math.abs(t.entryPrice - t.stopPrice);
      const tgt = Number(t.entryPrice) + dir * unit * Number(r.targetR);
      if (dir * (Number(t.mfePrice) - tgt) >= 0) p = risk * Number(r.targetR) - fees;
    }
    if (r.capLoss && risk && p < -risk) p = -risk;
    c.pnlOverride = p;
    return c;
  };
  const out = []; const day = {};
  for (const t of pre) {
    const k = S.dayOf(t), d = day[k] = day[k] || { n: 0, losses: 0, pnl: 0 };
    if (S.hasNum(r.maxTrades) && d.n >= +r.maxTrades) continue;
    if (S.hasNum(r.maxLosses) && d.losses >= +r.maxLosses) continue;
    if (S.hasNum(r.lossStop) && d.pnl <= -Math.abs(+r.lossStop)) continue;
    if (S.hasNum(r.profitStop) && d.pnl >= +r.profitStop) continue;
    const c = adj(t), p = S.pnl(c);
    d.n++; d.pnl += p; if (p < 0) d.losses++;
    out.push(c);
  }
  return out;
}
function whatIfTab(list) {
  const r = wiRules(), active = wiActive(r);
  const sim = simulate(list, r);
  const b = S.summary(list), s = S.summary(sim);
  const bd = Object.values(S.byDay(list)), sd = Object.values(S.byDay(sim));
  const mfeCount = list.filter(t => S.hasNum(t.mfePrice) && S.hasNum(t.stopPrice)).length;
  const row = (k, bv, sv, f, better = 1) => { const dlt = sv - bv; const good = dlt * better > 0.0001, bad = dlt * better < -0.0001; return `<tr style="cursor:default"><td class="muted">${k}</td><td class="n">${f(bv)}</td><td class="n" style="font-weight:700">${f(sv)}</td><td class="n ${good ? 'pos' : bad ? 'neg' : 'faint'}">${Math.abs(dlt) < 0.0001 ? '-' : (dlt > 0 ? '+' : '-') + f(Math.abs(dlt)).replace(/^[+-]/, '')}</td></tr>`; };
  const impacts = active.map(([key, label]) => { const one = Object.assign({}, WI_DEFAULT, { [key]: r[key] }); const x = S.summary(simulate(list, one)); return { label, d: x.net - b.net, n: list.length - x.count }; }).sort((a, b2) => b2.d - a.d);
  const num = (k, l, ph, extra = '') => `<div class="field"><label>${l}</label><input class="input" type="number" step="any" min="0" data-wi="${k}" value="${esc(r[k])}" placeholder="${ph}" ${extra}></div>`;
  later(() => {
    const keys = [...new Set(bd.map(d => d.date))].sort();
    const sMap = Object.fromEntries(sd.map(d => [d.date, d.pnl]));
    let a = 0, c = 0;
    const base = keys.map(k => { a += (bd.find(d => d.date === k) || {}).pnl || 0; return { label: fmtDay(k, { weekday: undefined }), value: a }; });
    const scen = keys.map(k => { c += sMap[k] || 0; return { label: fmtDay(k, { weekday: undefined }), value: c }; });
    Charts.multi(document.getElementById('wiEq'), [{ name: 'Actual', color: getComputedStyle(document.documentElement).getPropertyValue('--faint').trim(), pts: base }, { name: 'What-if', color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(), pts: scen }], { height: 280 });
  });
  return `<div class="grid g-main-r">
    <div class="card wi-ctrl">
      <div class="card-h"><div class="card-t">${ICON.spark} Rules to test</div><button class="btn sm ghost" data-action="wi-reset">Reset</button></div>
      <div class="seg-label">Daily limits</div>
      <div class="grid g-2" style="gap:12px">${num('maxTrades', 'Max trades per day', 'off')}${num('maxLosses', 'Stop after N losses', 'off')}${num('lossStop', 'Stop at daily loss ($)', 'off')}${num('profitStop', 'Stop at daily profit ($)', 'off')}</div>
      <div class="seg-label mt">Time window</div>
      <div class="grid g-2" style="gap:12px"><div class="field"><label>No trades before</label><input class="input" type="time" data-wi="noBefore" value="${esc(r.noBefore)}"></div><div class="field"><label>No trades after</label><input class="input" type="time" data-wi="noAfter" value="${esc(r.noAfter)}"></div></div>
      <div class="field mt"><label>Skip weekdays</label><div class="row wrap" style="gap:6px">${[1, 2, 3, 4, 5].map(d => `<span class="chip toggle ${r.skipDays.includes(d) ? 'on' : ''}" data-action="wi-toggle" data-k="skipDays" data-v="${d}">${DOW[d]}</span>`).join('')}</div></div>
      <div class="seg-label mt">Which trades</div>
      <div class="field"><label>Only these setups</label><div class="row wrap" style="gap:6px">${S.state.setups.map(x => `<span class="chip toggle ${r.setups.includes(x.id) ? 'on' : ''}" data-action="wi-toggle" data-k="setups" data-v="${x.id}">${esc(x.name)}</span>`).join('')}<span class="chip toggle ${r.setups.includes('_none') ? 'on' : ''}" data-action="wi-toggle" data-k="setups" data-v="_none">No setup</span></div></div>
      <div class="field mt"><label>Direction</label>${seg('wi-side', [['both', 'Both'], ['long', 'Longs only'], ['short', 'Shorts only']], r.side)}</div>
      <div class="check-list mt"><label><input type="checkbox" data-wi="skipMistakes" ${r.skipMistakes ? 'checked' : ''}>Skip trades tagged with a mistake</label><label><input type="checkbox" data-wi="capLoss" ${r.capLoss ? 'checked' : ''}>Cap every loss at -1R (never move the stop)</label></div>
      <div class="seg-label mt">Size and targets</div>
      <div class="grid g-2" style="gap:12px">${num('fixedQty', 'Always trade N contracts', 'actual')}${num('targetR', 'Fixed target (R)', 'off')}</div>
      <div class="hint faint" style="font-size:11.5px;margin-top:8px">Fixed targets use the "Best price reached" field on each trade (${mfeCount} of ${list.length} trades have it). If price reached the target, the trade is counted as a win at that R.</div>
    </div>
    <div class="grid" style="gap:16px;align-content:start">
      <div class="card">
        <div class="card-h"><div class="card-t">Actual vs what-if</div><div class="row" style="gap:14px;font-size:12px"><span class="row" style="gap:6px"><span class="dot" style="background:var(--faint)"></span>Actual</span><span class="row" style="gap:6px"><span class="dot" style="background:var(--accent)"></span>What-if</span></div></div>
        ${active.length ? `<div class="row wrap" style="gap:6px;margin-bottom:12px">${active.map(([, l]) => `<span class="chip acc">${esc(l)}</span>`).join('')}</div>` : '<div class="faint" style="margin-bottom:12px;font-size:12.5px">Turn on a rule on the left to see how your results would change.</div>'}
        <div id="wiEq"></div>
      </div>
      <div class="grid g-wi">
        <div class="card flush"><table class="tbl"><thead><tr><th>Metric</th><th class="n">Actual</th><th class="n">What-if</th><th class="n">Change</th></tr></thead><tbody>
          ${row('Net P&L', b.net, s.net, v => money(v))}
          ${row('Trades', b.count, s.count, v => String(Math.round(v)), 0)}
          ${row('Win rate', b.winRate, s.winRate, v => pct(v))}
          ${row('Profit factor', b.profitFactor === Infinity ? 99 : b.profitFactor, s.profitFactor === Infinity ? 99 : s.profitFactor, v => v.toFixed(2))}
          ${row('Expectancy', b.expectancy, s.expectancy, v => money(v))}
          ${row('Total R', b.rSum, s.rSum, v => v.toFixed(2) + 'R')}
          ${row('Max drawdown', b.maxDD, s.maxDD, v => money(v))}
          ${row('Green days', bd.filter(d => d.pnl > 0).length, sd.filter(d => d.pnl > 0).length, v => String(Math.round(v)))}
          ${row('Worst day', Math.min(0, ...bd.map(d => d.pnl)), Math.min(0, ...sd.map(d => d.pnl)), v => money(v))}
        </tbody></table></div>
        <div class="card"><div class="card-h"><div class="card-t">Impact of each rule on its own</div></div>
          ${impacts.length ? impacts.map(x => `<div class="stat-row"><span class="k">${esc(x.label)}<div class="lr-sub">${x.n} trade${x.n === 1 ? '' : 's'} removed</div></span><span class="v ${cls(x.d)}">${money(x.d)}</span></div>`).join('') : '<div class="faint">Each active rule will be scored here so you can see which one matters most.</div>'}
          ${active.length ? `<div class="alert ${s.net >= b.net ? 'pos' : 'neg'} mt">${s.net >= b.net ? ICON.check : ICON.warn}<div>With these rules you would have made <b>${money(s.net - b.net)}</b> ${s.net >= b.net ? 'more' : 'less'}${s.maxDD > b.maxDD ? ` with a ${money(s.maxDD - b.maxDD, false)} smaller drawdown` : ''}.</div></div>` : ''}
        </div>
      </div>
    </div>
  </div>`;
}
