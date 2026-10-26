/* Tessra: copy-trade groups, badges and streaks, expectancy simulator, daily lock, tax records */

/* ===================== COPY-TRADE GROUPS ===================== */
const COPY_SKIP = ['id', 'accountId', 'copyOf', 'copyGroup', 'qty', 'fees', 'pnlOverride', 'createdAt', 'importKey', 'demo'];
function groupOf(t) { return t && t.copyGroup ? S.state.trades.filter(x => x.copyGroup === t.copyGroup) : (t ? [t] : []); }
function leaderOf(t) { return t && t.copyOf ? S.state.trades.find(x => x.id === t.copyOf) || t : t; }
function imageInUse(name, exceptIds = []) { return S.state.trades.some(t => !exceptIds.includes(t.id) && (t.screenshots || []).includes(name)) || Object.values(S.state.journal).some(j => (j.screenshots || []).includes(name)); }
function copyAccountsHtml(d) {
  const accs = S.state.accounts.filter(a => a.status !== 'archived');
  if (accs.length < 2) return '';
  const lead = d.copyOf ? S.state.trades.find(x => x.id === d.copyOf) : null;
  if (lead) return `<div class="field s4"><label>Copy trade</label><div class="lr-sub">This is a copy of the trade on <b>${esc((accountById(lead.accountId) || {}).name || 'another account')}</b>. Edits to notes, setup, tags and prices update every copy. Size stays per account.</div></div>`;
  const current = groupOf(d.id ? S.state.trades.find(x => x.id === d.id) : null).filter(x => x.id !== d.id).map(x => x.accountId);
  return `<div class="field s4"><label>Copied to other accounts <span class="faint" style="font-weight:500">one trade per account, stats count it once</span></label>
    <div class="row wrap" style="gap:6px" id="copyChips">${accs.map(a => `<span class="chip toggle ${current.includes(a.id) ? 'on' : ''}" data-copyacc="${a.id}">${esc(a.name)}</span>`).join('')}</div></div>`;
}
function wireCopyChips(m, d) {
  d._copyTo = groupOf(d.id ? S.state.trades.find(x => x.id === d.id) : null).filter(x => x.id !== d.id).map(x => x.accountId);
  const sync = () => m.querySelectorAll('[data-copyacc]').forEach(c => { const self = c.dataset.copyacc === d.accountId; c.style.display = self ? 'none' : ''; });
  m.querySelectorAll('[data-copyacc]').forEach(c => c.addEventListener('click', () => {
    const id = c.dataset.copyacc; d._copyTo = d._copyTo.includes(id) ? d._copyTo.filter(x => x !== id) : d._copyTo.concat([id]); c.classList.toggle('on');
  }));
  const accSel = m.querySelector('[data-f=accountId]'); if (accSel) accSel.addEventListener('change', sync);
  sync();
}
// called after the leader trade is saved
function applyCopies(lead, copyTo) {
  const st = S.state;
  if (lead.copyOf) { // editing a follower: push shared fields to the whole group
    groupOf(lead).forEach(x => { if (x.id !== lead.id) for (const k of Object.keys(lead)) if (!COPY_SKIP.includes(k) && !k.startsWith('_')) x[k] = JSON.parse(JSON.stringify(lead[k])); });
    return;
  }
  copyTo = (copyTo || []).filter(a => a && a !== lead.accountId);
  const existing = st.trades.filter(x => x.copyOf === lead.id);
  if (!copyTo.length && !existing.length) { delete lead.copyGroup; return; }
  lead.copyGroup = lead.copyGroup || lead.id;
  for (const x of existing) if (!copyTo.includes(x.accountId)) st.trades = st.trades.filter(y => y.id !== x.id);
  for (const a of copyTo) {
    let x = st.trades.find(y => y.copyOf === lead.id && y.accountId === a);
    if (!x) { x = { id: S.uid(), accountId: a, copyOf: lead.id, copyGroup: lead.copyGroup, qty: lead.qty, fees: lead.fees, pnlOverride: lead.pnlOverride, createdAt: new Date().toISOString() }; st.trades.push(x); }
    for (const k of Object.keys(lead)) if (!COPY_SKIP.includes(k) && !k.startsWith('_')) x[k] = JSON.parse(JSON.stringify(lead[k]));
  }
  if (!st.trades.some(x => x.copyOf === lead.id)) delete lead.copyGroup;
}
function copyChip(t) {
  const g = groupOf(t); if (g.length < 2) return '';
  return `<span class="chip acc" title="${esc(g.map(x => (accountById(x.accountId) || {}).name || '?').join(', '))}" style="padding:1px 7px">×${g.length} accts</span>`;
}

/* ===================== BADGES AND STREAKS ===================== */
function allDaysSorted(list) { return Object.values(S.byDay(list)).sort((a, b) => a.date.localeCompare(b.date)); }
function longestRun(arr, pred) { let best = 0, cur = 0, bestEnd = -1; arr.forEach((x, i) => { if (pred(x, i)) { cur++; if (cur > best) { best = cur; bestEnd = i; } } else cur = 0; }); return { best, cur, bestEnd }; }
function rulesKept(t) { const sp = setupById(t.setup); return !!sp && sp.rules.length > 0 && (t.rulesFollowed || []).length >= sp.rules.length && !(t.mistakes || []).length; }
function weeksOf(days) {
  const m = {}; days.forEach(d => { const k = weekStartKey(d.date); (m[k] = m[k] || { key: k, days: [], pnl: 0 }).days.push(d); m[k].pnl += d.pnl; });
  return Object.values(m).sort((a, b) => a.key.localeCompare(b.key));
}
function computeBadges() {
  const st = S.state, g = st.goals;
  const ts = S.sortTrades(st.trades.filter(t => !t.copyOf));
  const days = allDaysSorted(ts), weeks = weeksOf(days);
  const sum = S.summary(ts);
  const dateAt = (arr, i) => i >= 0 && arr[i] ? (arr[i].date || S.dayOf(arr[i]) || arr[i].key) : null;
  const green = longestRun(days, d => d.pnl > 0);
  const winRun = longestRun(ts, t => S.result(t) === 'win');
  const planRun = longestRun(ts, rulesKept);
  const stopRun = longestRun(ts, t => { const r = S.rMultiple(t); return r === null || r >= -1.05; });
  const limitRun = longestRun(days, d => !(g.maxTradesPerDay && d.trades.length > g.maxTradesPerDay) && !(g.dailyMaxLoss && d.pnl <= -g.dailyMaxLoss));
  const jDays = days.map(d => ({ ...d, j: st.journal[d.date] || {} }));
  const journalRun = longestRun(jDays, d => d.j.premarket && d.j.review);
  const greenWeeks = longestRun(weeks, w => w.pnl > 0);
  const cleanWeek = weeks.findIndex(w => { const wt = w.days.flatMap(d => d.trades); return wt.length >= 5 && !wt.some(t => (t.mistakes || []).length); });
  const bigDay = (x) => days.findIndex(d => d.pnl >= x);
  const comeback = days.findIndex((d, i) => i >= 2 && d.pnl > 0 && days[i - 1].pnl < 0 && days[i - 2].pnl < 0);
  const rCum = (() => { let c = 0; return ts.map(t => (c += (S.rMultiple(t) || 0))); })();
  const rAt = x => rCum.findIndex(v => v >= x);
  const passed = st.accounts.filter(a => a.status === 'passed' || (a.type === 'eval' && a.profitTarget && S.accountStatus(a).net >= a.profitTarget));
  const pays = st.payouts.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const lockBreaks = ts.filter(t => (t.mistakes || []).includes('Traded after lock')).length;
  const B = [
    { id: 'first-green', cat: 'Milestones', icon: '🌱', name: 'First Green', desc: 'Finish a day in profit', prog: Math.min(1, days.filter(d => d.pnl > 0).length), goal: 1, date: dateAt(days, days.findIndex(d => d.pnl > 0)) },
    { id: 'trades-100', cat: 'Milestones', icon: '💯', name: '100 Club', desc: 'Log 100 trades', prog: ts.length, goal: 100, date: dateAt(ts, 99) },
    { id: 'trades-500', cat: 'Milestones', icon: '🏛️', name: 'Veteran', desc: 'Log 500 trades', prog: ts.length, goal: 500, date: dateAt(ts, 499) },
    { id: 'r-25', cat: 'Milestones', icon: '📈', name: 'R Collector', desc: 'Bank +25R total', prog: Math.max(0, sum.rSum), goal: 25, date: dateAt(ts, rAt(25)) },
    { id: 'r-100', cat: 'Milestones', icon: '🚀', name: 'R Machine', desc: 'Bank +100R total', prog: Math.max(0, sum.rSum), goal: 100, date: dateAt(ts, rAt(100)) },
    { id: 'big-500', cat: 'Milestones', icon: '💵', name: 'Big Day', desc: 'A +$500 day', prog: Math.max(0, ...days.map(d => d.pnl), 0), goal: 500, date: dateAt(days, bigDay(500)), money: true },
    { id: 'big-1000', cat: 'Milestones', icon: '💰', name: 'Four Figures', desc: 'A +$1,000 day', prog: Math.max(0, ...days.map(d => d.pnl), 0), goal: 1000, date: dateAt(days, bigDay(1000)), money: true },
    { id: 'green-3', cat: 'Streaks', icon: '🔥', name: 'Hot Streak', desc: '3 green days in a row', prog: green.best, goal: 3, date: green.best >= 3 ? dateAt(days, green.bestEnd) : null },
    { id: 'green-7', cat: 'Streaks', icon: '☄️', name: 'On Fire', desc: '7 green days in a row', prog: green.best, goal: 7, date: green.best >= 7 ? dateAt(days, green.bestEnd) : null },
    { id: 'wins-5', cat: 'Streaks', icon: '🎯', name: 'Sniper', desc: '5 winning trades in a row', prog: winRun.best, goal: 5, date: winRun.best >= 5 ? dateAt(ts, winRun.bestEnd) : null },
    { id: 'weeks-4', cat: 'Streaks', icon: '📅', name: 'Green Month', desc: '4 green weeks in a row', prog: greenWeeks.best, goal: 4, date: greenWeeks.best >= 4 ? dateAt(weeks, greenWeeks.bestEnd) : null },
    { id: 'comeback', cat: 'Streaks', icon: '🦾', name: 'Comeback', desc: 'Green day after 2 red days', prog: comeback >= 0 ? 1 : 0, goal: 1, date: dateAt(days, comeback) },
    { id: 'plan-10', cat: 'Discipline', icon: '✅', name: 'By the Book', desc: '10 trades in a row with every setup rule ticked and no mistakes', prog: planRun.best, goal: 10, date: planRun.best >= 10 ? dateAt(ts, planRun.bestEnd) : null },
    { id: 'plan-25', cat: 'Discipline', icon: '🧠', name: 'Machine Mode', desc: '25 rule-perfect trades in a row', prog: planRun.best, goal: 25, date: planRun.best >= 25 ? dateAt(ts, planRun.bestEnd) : null },
    { id: 'stop-20', cat: 'Discipline', icon: '🛑', name: 'Respect the Stop', desc: '20 trades in a row with no loss worse than -1R', prog: stopRun.best, goal: 20, date: stopRun.best >= 20 ? dateAt(ts, stopRun.bestEnd) : null },
    { id: 'limits-10', cat: 'Discipline', icon: '🧘', name: 'Within Limits', desc: '10 trading days in a row inside max trades and daily loss', prog: limitRun.best, goal: 10, date: limitRun.best >= 10 ? dateAt(days, limitRun.bestEnd) : null },
    { id: 'clean-week', cat: 'Discipline', icon: '🧼', name: 'Clean Week', desc: 'A week of 5+ trades with zero mistakes', prog: cleanWeek >= 0 ? 1 : 0, goal: 1, date: cleanWeek >= 0 ? dateAt(weeks, cleanWeek) : null },
    { id: 'journal-5', cat: 'Discipline', icon: '📓', name: 'Journaler', desc: '5 trading days in a row with plan and review written', prog: journalRun.best, goal: 5, date: journalRun.best >= 5 ? dateAt(days, journalRun.bestEnd) : null },
    { id: 'eval-pass', cat: 'Prop', icon: '🏆', name: 'Eval Passed', desc: 'Pass an evaluation', prog: passed.length ? 1 : 0, goal: 1, date: passed.length ? (passed[0].createdAt || 'yes') : null },
    { id: 'payout-1', cat: 'Prop', icon: '💸', name: 'Payday', desc: 'Take your first payout', prog: pays.length, goal: 1, date: pays[0] ? pays[0].date : null },
    { id: 'payout-5', cat: 'Prop', icon: '🏦', name: 'Paid Five Times', desc: 'Take 5 payouts', prog: pays.length, goal: 5, date: pays[4] ? pays[4].date : null },
    { id: 'payout-10k', cat: 'Prop', icon: '👑', name: 'Five Figures Out', desc: 'Withdraw $10,000 total', prog: pays.reduce((a, p) => a + Number(S.hasNum(p.received) ? p.received : p.amount || 0), 0), goal: 10000, date: null, money: true }
  ];
  B.forEach(b => { b.done = b.prog >= b.goal; if (b.done && !b.date && b.id === 'payout-10k') { let c = 0; const p = pays.find(x => (c += Number(S.hasNum(x.received) ? x.received : x.amount || 0)) >= 10000); b.date = p ? p.date : 'yes'; } });
  const streaks = [
    { name: 'Green days', cur: green.cur, best: green.best, unit: 'days' },
    { name: 'Rule-perfect trades', cur: planRun.cur, best: planRun.best, unit: 'trades' },
    { name: 'Days within limits', cur: limitRun.cur, best: limitRun.best, unit: 'days' },
    { name: 'Journal streak', cur: journalRun.cur, best: journalRun.best, unit: 'days' },
    { name: 'Green weeks', cur: greenWeeks.cur, best: greenWeeks.best, unit: 'weeks' }
  ];
  // weekly challenges for the current week
  const wk = weekStartKey(todayKey()), wDays = days.filter(d => d.date >= wk), wTrades = wDays.flatMap(d => d.trades);
  const tradingDaysSoFar = Math.max(1, wDays.length);
  const challenges = [
    { name: `Max ${g.maxTradesPerDay || 3} trades every day`, prog: wDays.filter(d => d.trades.length <= (g.maxTradesPerDay || 3)).length, goal: 5, fail: wDays.some(d => d.trades.length > (g.maxTradesPerDay || 3)), unit: 'days' },
    { name: 'Zero mistake tags this week', prog: wTrades.length ? wTrades.filter(t => !(t.mistakes || []).length).length : 0, goal: Math.max(5, wTrades.length), fail: wTrades.some(t => (t.mistakes || []).length), unit: 'trades' },
    { name: 'Journal plan and review every trading day', prog: wDays.filter(d => { const j = st.journal[d.date] || {}; return j.premarket && j.review; }).length, goal: Math.max(tradingDaysSoFar, 5), fail: false, unit: 'days' },
    { name: 'Never hit the daily lock', prog: wDays.filter(d => !(g.dailyMaxLoss && d.pnl <= -g.dailyMaxLoss)).length, goal: 5, fail: lockBreaks > 0 && wTrades.some(t => (t.mistakes || []).includes('Traded after lock')) || wDays.some(d => g.dailyMaxLoss && d.pnl <= -g.dailyMaxLoss), unit: 'days' }
  ];
  return { badges: B, streaks, challenges };
}
function badgeNotify() {
  try {
    const { badges } = computeBadges(), seen = new Set(S.state.badgesSeen || []);
    const fresh = badges.filter(b => b.done && !seen.has(b.id));
    if (!S.state.badgesSeen) { S.state.badgesSeen = badges.filter(b => b.done).map(b => b.id); S.save(); return; }
    if (fresh.length) { S.state.badgesSeen = [...seen, ...fresh.map(b => b.id)]; S.save(); toast(`${fresh[0].icon} Badge unlocked: ${fresh[0].name}${fresh.length > 1 ? ` (+${fresh.length - 1} more)` : ''}`); }
  } catch (e) { console.error(e); }
}
function pageBadges() {
  const { badges, streaks, challenges } = computeBadges();
  const done = badges.filter(b => b.done).length;
  const fmtProg = b => b.money ? `${money0(Math.min(b.prog, b.goal))} / ${money0(b.goal)}` : `${Math.floor(Math.min(b.prog, b.goal) * 10) / 10} / ${b.goal}`;
  const cats = [...new Set(badges.map(b => b.cat))];
  return `<div class="grid g-4">
      <div class="card kpi"><div class="kpi-label">Badges unlocked</div><div class="kpi-value">${done}<span class="faint" style="font-size:16px"> / ${badges.length}</span></div><div class="progress pos" style="margin-top:12px"><div style="width:${done / badges.length * 100}%"></div></div></div>
      ${streaks.slice(0, 3).map(s => `<div class="card kpi"><div class="kpi-label">${s.name}</div><div class="kpi-value">${s.cur} <span class="faint" style="font-size:14px">${s.unit}</span></div><div class="kpi-meta">Best ever ${s.best}</div></div>`).join('')}
    </div>
    <div class="grid g-main mt">
      <div class="card"><div class="card-h"><div class="card-t">This week's challenges</div><span class="faint" style="font-size:12px">Reset every week</span></div>
        <div class="grid" style="gap:12px">${challenges.map(c => { const p = Math.min(1, c.prog / c.goal); return `<div class="chal ${c.fail ? 'fail' : p >= 1 ? 'won' : ''}"><div class="between"><b>${esc(c.name)}</b><span class="chip ${c.fail ? 'neg' : p >= 1 ? 'pos' : ''}">${c.fail ? 'Broken' : p >= 1 ? 'Complete' : `${c.prog}/${c.goal} ${c.unit}`}</span></div><div class="progress ${c.fail ? 'neg' : 'pos'}" style="margin-top:8px"><div style="width:${(c.fail ? 1 : p) * 100}%"></div></div></div>`; }).join('')}</div></div>
      <div class="card"><div class="card-h"><div class="card-t">Streaks</div></div><div class="stat-list">${streaks.map(s => `<div class="stat-row"><span class="k">${s.name}</span><span class="v">${s.cur} <span class="faint" style="font-weight:500">now · best ${s.best}</span></span></div>`).join('')}</div></div>
    </div>
    ${cats.map(c => `<div class="seg-label mt-l" style="font-size:12px">${c}</div><div class="badge-grid">${badges.filter(b => b.cat === c).map(b => `<div class="badge ${b.done ? 'done' : ''}">
        <div class="badge-ico">${b.icon}</div><div class="badge-name">${esc(b.name)}</div><div class="badge-desc">${esc(b.desc)}</div>
        ${b.done ? `<div class="chip pos" style="margin-top:10px">${b.date && b.date !== 'yes' ? 'Unlocked ' + fmtDay(String(b.date).slice(0, 10), { weekday: undefined, year: 'numeric' }) : 'Unlocked'}</div>` : `<div class="progress" style="margin-top:12px;height:6px"><div style="width:${Math.min(1, b.prog / b.goal) * 100}%"></div></div><div class="lr-sub" style="margin-top:6px">${fmtProg(b)}</div>`}
      </div>`).join('')}</div>`).join('')}`;
}

/* ===================== EXPECTANCY SIMULATOR ===================== */
function simDefaults() {
  const acc = S.state.accounts.find(a => a.type === 'eval' && a.status === 'active') || S.state.accounts[0];
  return { source: 'all', lastN: 100, setup: '', accountId: acc ? acc.id : '', target: acc && acc.profitTarget ? acc.profitTarget : 1250, dd: acc && acc.maxDrawdown ? acc.maxDrawdown : 1000, ddType: acc && acc.drawdownType ? acc.drawdownType : 'eod', lockOffset: acc ? Number(acc.lockOffset || 0) : 0, maxDays: 30, tradesPerDay: '', dailyLoss: '', fixedQty: '', cost: acc && acc.cost ? acc.cost : 85, sims: 3000, seed: 1 };
}
function simCfg() { S.state.sim = Object.assign(simDefaults(), S.state.sim || {}); return S.state.sim; }
function runSimulation(c, sample) {
  let seed = (c.seed || 1) * 2654435761 >>> 0;
  const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const tpd = S.hasNum(c.tradesPerDay) && +c.tradesPerDay > 0 ? +c.tradesPerDay : null;
  const dayCounts = sample.days;
  const N = Math.min(20000, Math.max(200, +c.sims || 3000)), maxDays = Math.max(1, +c.maxDays || 30);
  const target = +c.target || 0, dd = +c.dd || 0, lock = +c.lockOffset || 0, dl = S.hasNum(c.dailyLoss) ? Math.abs(+c.dailyLoss) : null;
  let pass = 0, fail = 0, timeout = 0; const passDays = [], paths = [];
  const keep = 400;
  for (let s = 0; s < N; s++) {
    let eq = 0, hwm = 0, floor = -dd, result = 0, d = 0; const path = [0];
    for (d = 1; d <= maxDays && !result; d++) {
      const n = tpd || dayCounts[Math.floor(rnd() * dayCounts.length)] || 1;
      let dayP = 0;
      for (let k = 0; k < n; k++) {
        if (dl !== null && dayP <= -dl) break;
        const p = sample.pnls[Math.floor(rnd() * sample.pnls.length)];
        eq += p; dayP += p;
        if (c.ddType === 'intraday') { hwm = Math.max(hwm, eq); floor = c.ddType === 'static' ? -dd : Math.min(hwm - dd, lock); }
        if (eq <= floor) { result = -1; break; }
        if (target && eq >= target) { result = 1; break; }
      }
      if (!result && c.ddType === 'eod') { hwm = Math.max(hwm, eq); floor = Math.min(hwm - dd, lock); }
      if (c.ddType === 'static') floor = -dd;
      path.push(eq);
      if (result === 1) passDays.push(d);
    }
    if (result === 1) pass++; else if (result === -1) fail++; else timeout++;
    if (s < keep) paths.push(path);
  }
  const pct = (arr, q) => { if (!arr.length) return null; const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(q * a.length))]; };
  const band = [];
  for (let d = 0; d <= maxDays; d++) { const v = paths.map(p => p[Math.min(d, p.length - 1)]); band.push({ d, p10: pct(v, .1), p50: pct(v, .5), p90: pct(v, .9) }); }
  return { N, pass: pass / N, fail: fail / N, timeout: timeout / N, medianDays: pct(passDays, .5), p25Days: pct(passDays, .25), p75Days: pct(passDays, .75), passDays, band };
}
function simSample(c) {
  let ts = S.sortTrades(trades());
  if (c.setup) ts = ts.filter(t => (c.setup === '_none' ? !t.setup : t.setup === c.setup));
  if (c.source === 'last') ts = ts.slice(-Math.max(5, +c.lastN || 100));
  const f = S.hasNum(c.fixedQty) && +c.fixedQty > 0 ? +c.fixedQty : null;
  const pnls = ts.map(t => f ? S.pnl(t) * f / (Number(t.qty) || 1) : S.pnl(t));
  const days = Object.values(S.byDay(ts)).map(d => d.trades.length);
  return { ts, pnls, days: days.length ? days : [2] };
}
function simulatorTab() {
  const c = simCfg(), sample = simSample(c), s = S.summary(sample.ts);
  if (sample.pnls.length < 10) return `<div class="card"><div class="empty"><h3>Need at least 10 trades</h3><div>The simulator reshuffles your real trades thousands of times, so it needs some history. Log more trades or widen the filter.</div></div></div>`;
  const t0 = performance.now(); const r = runSimulation(c, sample); const ms = Math.round(performance.now() - t0);
  const attempts = r.pass > 0 ? 1 / r.pass : Infinity;
  const fld = (k, l, t = 'number', ph = '') => `<div class="field"><label>${l}</label><input class="input" type="${t}" step="any" data-sim="${k}" value="${esc(c[k] ?? '')}" placeholder="${ph}"></div>`;
  later(() => {
    const fc = getComputedStyle(document.documentElement);
    const mk = (k, name, color) => ({ name, color, pts: r.band.map(b => ({ label: 'Day ' + b.d, value: b[k] })) });
    const lines = [mk('p10', 'Worst 10%', fc.getPropertyValue('--neg').trim()), mk('p90', 'Best 10%', fc.getPropertyValue('--pos').trim()), mk('p50', 'Typical', fc.getPropertyValue('--accent').trim())];
    if (+c.target) lines.unshift({ name: 'Target', color: fc.getPropertyValue('--faint').trim(), pts: r.band.map(b => ({ label: 'Day ' + b.d, value: +c.target })) });
    Charts.multi(document.getElementById('simFan'), lines, { height: 260 });
    const hist = []; const maxD = Math.max(1, ...r.passDays, 1);
    for (let d = 1; d <= Math.min(maxD, +c.maxDays); d++) hist.push({ label: String(d), value: r.passDays.filter(x => x === d).length / r.N * 100, tip: `Pass on day ${d}<br><b>${(r.passDays.filter(x => x === d).length / r.N * 100).toFixed(1)}%</b> of runs` });
    Charts.bars(document.getElementById('simHist'), hist, { height: 180, yfmt: v => v.toFixed(0) + '%', labelWidth: 26 });
  });
  return `<div class="grid g-main-r">
    <div class="card wi-ctrl">
      <div class="card-h"><div class="card-t">${ICON.spark} Simulation setup</div><button class="btn sm ghost" data-action="sim-reset">Reset</button></div>
      <div class="seg-label">Your trades</div>
      <div class="field"><label>Use</label>${seg('sim-source', [['all', 'All trades'], ['last', 'Last N trades']], c.source)}</div>
      <div class="grid g-2 mt" style="gap:12px">${c.source === 'last' ? fld('lastN', 'Last N trades') : ''}<div class="field"><label>Setup</label><select class="select" data-sim="setup"><option value="">All setups</option>${S.state.setups.map(x => `<option value="${x.id}" ${c.setup === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>${fld('fixedQty', 'Size (contracts)', 'number', 'as traded')}</div>
      <div class="seg-label mt">Account rules</div>
      <div class="field"><label>Load from account</label><select class="select" data-sim="accountId"><option value="">Custom</option>${S.state.accounts.map(a => `<option value="${a.id}" ${c.accountId === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>
      <div class="grid g-2 mt" style="gap:12px">${fld('target', 'Profit target ($)', 'number', 'none')}${fld('dd', 'Max drawdown ($)')}
        <div class="field"><label>Drawdown type</label><select class="select" data-sim="ddType">${[['eod', 'EOD trailing'], ['intraday', 'Intraday trailing'], ['static', 'Static']].map(([v, l]) => `<option value="${v}" ${c.ddType === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>${fld('lockOffset', 'Trail locks at start + ($)')}
        ${fld('maxDays', 'Trading days allowed')}${fld('tradesPerDay', 'Trades per day', 'number', 'your usual')}${fld('dailyLoss', 'Personal daily stop ($)', 'number', 'off')}${fld('cost', 'Eval cost ($)')}</div>
      <div class="hint faint" style="font-size:11.5px;margin-top:10px">Runs ${r.N.toLocaleString()} random sequences of your real trade results (${sample.pnls.length} trades, avg ${num(sample.days.reduce((a, b) => a + b, 0) / sample.days.length, 1)} per day). Past results do not guarantee future ones.</div>
      <div class="row mt"><button class="btn sm" data-action="sim-rerun">${ICON.spark}Re-run</button><span class="faint" style="font-size:11.5px">${ms} ms</span></div>
    </div>
    <div class="grid" style="gap:16px;align-content:start">
      <div class="grid g-4">
        <div class="card kpi"><div class="kpi-label">Pass</div><div class="kpi-value pos">${pct(r.pass, 0)}</div><div class="kpi-meta">hit the target first</div></div>
        <div class="card kpi"><div class="kpi-label">Blow up</div><div class="kpi-value neg">${pct(r.fail, 0)}</div><div class="kpi-meta">hit the drawdown first</div></div>
        <div class="card kpi"><div class="kpi-label">Out of time</div><div class="kpi-value">${pct(r.timeout, 0)}</div><div class="kpi-meta">neither in ${c.maxDays} days</div></div>
        <div class="card kpi"><div class="kpi-label">Typical days to pass</div><div class="kpi-value">${r.medianDays ?? '-'}</div><div class="kpi-meta">${r.p25Days ? `most pass in ${r.p25Days} to ${r.p75Days} days` : 'no passes'}</div></div>
      </div>
      <div class="card"><div class="card-h"><div class="card-t">Account balance paths</div><span class="faint" style="font-size:12px">P&L from start, typical vs best and worst 10%</span></div><div id="simFan"></div></div>
      <div class="grid g-2">
        <div class="card"><div class="card-h"><div class="card-t">When the passes happen</div></div><div id="simHist"></div></div>
        <div class="card"><div class="card-h"><div class="card-t">What it means</div></div>
          <div class="stat-list">
            <div class="stat-row"><span class="k">Your edge per trade</span><span class="v ${cls(s.expectancy)}">${money(s.expectancy)}</span></div>
            <div class="stat-row"><span class="k">Win rate / payoff</span><span class="v">${pct(s.winRate, 0)} / ${num(s.payoff)}x</span></div>
            <div class="stat-row"><span class="k">Expected attempts to pass</span><span class="v">${isFinite(attempts) ? num(attempts, 1) : 'never'}</span></div>
            <div class="stat-row"><span class="k">Expected eval spend to get funded</span><span class="v">${isFinite(attempts) && +c.cost ? money0(attempts * +c.cost) : '-'}</span></div>
          </div>
          <div class="alert ${r.pass >= .5 ? 'pos' : r.pass >= .3 ? 'warn' : 'neg'} mt">${r.pass >= .5 ? ICON.check : ICON.warn}<div>${r.pass >= .5 ? 'Your current stats pass more often than they fail. Keep size and rules the same.' : r.pass > r.fail ? 'Slight edge. Smaller size or a tighter daily stop usually raises the pass rate; try it on the left.' : 'With these stats the drawdown usually wins. Try smaller size, a daily stop, or only your best setup.'}</div></div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ===================== DAILY LOCK ===================== */
function lockSettings() { S.state.lock = Object.assign({ enabled: true, onLoss: true, onTarget: false, onMaxTrades: false }, S.state.lock || {}); return S.state.lock; }
function lockStatus() {
  const L = lockSettings(), g = S.state.goals;
  if (!L.enabled) return null;
  const today = todayKey();
  const ts = S.sortTrades(S.state.trades.filter(t => !t.copyOf && S.dayOf(t) === today));
  let run = 0, n = 0;
  for (const t of ts) {
    run += S.pnl(t); n++;
    let why = null;
    if (L.onLoss && g.dailyMaxLoss && run <= -g.dailyMaxLoss) why = { kind: 'loss', text: `You hit your daily max loss (${money(run)} of -${money0(g.dailyMaxLoss)}).` };
    else if (L.onTarget && g.dailyTarget && run >= g.dailyTarget) why = { kind: 'target', text: `You hit your daily target (${money(run)}). Protect the green day.` };
    else if (L.onMaxTrades && g.maxTradesPerDay && n >= g.maxTradesPerDay) why = { kind: 'trades', text: `You took your max ${g.maxTradesPerDay} trades for the day.` };
    if (why) return Object.assign(why, { at: t.exitTime || t.entryTime, pnl: ts.reduce((a, x) => a + S.pnl(x), 0), count: ts.length });
  }
  return null;
}
function lockBannerHtml() {
  const l = lockStatus(); if (!l) return '';
  return `<div class="lock-banner">${I('<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', 18)}<div><b>Locked for today.</b> ${esc(l.text)} Unlocks at midnight.</div><div class="spacer"></div><button class="btn sm" data-action="goto-journal" data-date="${todayKey()}">Journal the session</button></div>`;
}
function showLockScreen(force) {
  const l = lockStatus(); if (!l) return false;
  const key = todayKey() + ':' + l.kind;
  if (!force && S.state.lockShown === key) return false;
  S.state.lockShown = key; S.save();
  const m = openModal(`<div class="lock-screen">
      <div class="lock-ico">${I('<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', 40)}</div>
      <h2>Done for today</h2>
      <p>${esc(l.text)}</p>
      <div class="lock-stats"><div><div class="k">Today</div><div class="v ${cls(l.pnl)}">${money(l.pnl)}</div></div><div><div class="k">Trades</div><div class="v">${l.count}</div></div></div>
      <p class="faint" style="font-size:12.5px">Close your platform. The lock resets at midnight. Any trade logged after this point gets tagged "Traded after lock".</p>
      <div class="row" style="justify-content:center;margin-top:8px"><button class="btn primary" data-lk="journal">Write my review</button><button class="btn ghost" data-lk="close">Close</button></div>
    </div>`, { size: 'sm' });
  m.querySelector('[data-lk=journal]').onclick = () => { closeModal(m); ui.journalDay = todayKey(); go('journal'); };
  m.querySelector('[data-lk=close]').onclick = () => closeModal(m);
  return true;
}
function lockGuardNewTrade(proceed) {
  const l = lockStatus(); if (!l) return proceed();
  const m = openModal(`<div class="modal-h"><h3>You're locked for today</h3></div><div class="modal-b"><div class="alert neg">${ICON.warn}<div>${esc(l.text)}</div></div><div class="muted" style="font-size:13px">Logging a trade you already took is fine, it gets tagged <b>Traded after lock</b> so the cost shows up in your stats.</div></div>
    <div class="modal-f"><span></span><div class="row"><button class="btn" data-x="no">Cancel</button><button class="btn danger" data-x="yes">Log it anyway</button></div></div>`, { size: 'sm' });
  m.querySelector('[data-x=no]').onclick = () => closeModal(m);
  m.querySelector('[data-x=yes]').onclick = () => { closeModal(m); proceed({ afterLock: true }); };
}
function tagIfAfterLock(t) {
  const l = lockStatus(); if (!l || S.dayOf(t) !== todayKey()) return;
  if ((t.entryTime || '') > (l.at || '') ) {
    if (!S.state.mistakes.includes('Traded after lock')) S.state.mistakes.push('Traded after lock');
    t.mistakes = [...new Set([...(t.mistakes || []), 'Traded after lock'])];
  }
}

/* ===================== TAX RECORDS ===================== */
function taxYears() {
  const ys = new Set([String(new Date().getFullYear())]);
  S.state.payouts.forEach(p => p.date && ys.add(p.date.slice(0, 4)));
  S.state.expenses.forEach(p => p.date && ys.add(p.date.slice(0, 4)));
  S.state.accounts.forEach(a => a.createdAt && ys.add(a.createdAt.slice(0, 4)));
  S.state.trades.forEach(t => S.dayOf(t) && ys.add(S.dayOf(t).slice(0, 4)));
  return [...ys].sort().reverse();
}
function taxData(y) {
  const st = S.state, inY = d => String(d || '').startsWith(y);
  const pays = st.payouts.filter(p => inY(p.date)).map(p => ({ date: p.date, account: (accountById(p.accountId) || {}).name || '', desc: p.desc || 'Payout', gross: Number(p.amount || 0), split: S.hasNum(p.split) ? Number(p.split) : 100, received: Number(S.hasNum(p.received) ? p.received : p.amount || 0) })).sort((a, b) => a.date.localeCompare(b.date));
  const exp = [...st.accounts.filter(a => Number(a.cost) && inY(a.createdAt)).map(a => ({ date: a.createdAt, account: a.name, desc: `${a.name} purchase / activation`, cat: 'Evaluation and account fees', amount: Number(a.cost) })),
    ...st.expenses.filter(e => inY(e.date)).map(e => ({ date: e.date, account: (accountById(e.accountId) || {}).name || '', desc: e.desc || 'Expense', cat: /reset|eval|activation/i.test(e.desc || '') ? 'Evaluation and account fees' : /data|feed|platform|software|tradingview|ninja|tradovate|vps/i.test(e.desc || '') ? 'Data, platforms and software' : 'Other trading expenses', amount: Number(e.amount || 0) }))].sort((a, b) => a.date.localeCompare(b.date));
  const live = st.accounts.filter(a => a.type === 'live').map(a => { const ts = st.trades.filter(t => t.accountId === a.id && S.dayOf(t).startsWith(y)); const s = S.summary(ts); return { name: a.name, firm: a.firm || '', trades: s.count, gross: s.gross, fees: s.fees, net: s.net }; }).filter(x => x.trades);
  const received = pays.reduce((a, p) => a + p.received, 0), gross = pays.reduce((a, p) => a + p.gross, 0), expTotal = exp.reduce((a, e) => a + e.amount, 0);
  const byCat = {}; exp.forEach(e => byCat[e.cat] = (byCat[e.cat] || 0) + e.amount);
  const liveNet = live.reduce((a, x) => a + x.net, 0);
  const perAcct = st.accounts.map(a => ({ name: a.name, type: a.type, paid: pays.filter(p => p.account === a.name).reduce((s, p) => s + p.received, 0), cost: exp.filter(e => e.account === a.name).reduce((s, e) => s + e.amount, 0) })).filter(x => x.paid || x.cost);
  return { y, pays, exp, live, received, gross, firmShare: gross - received, expTotal, byCat, liveNet, net: received - expTotal, perAcct };
}
function taxReportHtml(t, forPdf) {
  const m = v => money(v, false);
  const row = cells => `<tr>${cells.map((c, i) => `<td${i >= cells.length - 1 || /^[-+]?\$/.test(String(c)) ? ' class="n"' : ''}>${c}</td>`).join('')}</tr>`;
  return `<div class="tax">
    <div class="tax-h"><div><div class="tax-title">Trading records ${t.y}</div><div class="tax-sub">${esc(S.state.settings.name || '')} · generated ${fmtLongDay(todayKey())} · Tessra</div></div></div>
    <div class="tax-kpis">
      <div><div class="k">Payouts received</div><div class="v pos">${m(t.received)}</div></div>
      <div><div class="k">Trading expenses</div><div class="v neg">${m(t.expTotal)}</div></div>
      <div><div class="k">Prop business net</div><div class="v ${t.net >= 0 ? 'pos' : 'neg'}">${money(t.net)}</div></div>
      ${t.live.length ? `<div><div class="k">Live account P&L</div><div class="v ${t.liveNet >= 0 ? 'pos' : 'neg'}">${money(t.liveNet)}</div></div>` : ''}
    </div>
    <h3>Summary</h3>
    <table class="tax-t"><tbody>
      ${row(['Payouts requested (gross)', m(t.gross)])}${row(['Firm profit share', t.firmShare > 0.004 ? '-' + m(t.firmShare) : m(0)])}${row(['<b>Payouts received</b>', `<b>${m(t.received)}</b>`])}
      ${Object.entries(t.byCat).map(([k, v]) => row([k, '-' + m(v)])).join('')}
      ${row(['<b>Net from prop trading</b>', `<b>${money(t.net)}</b>`])}
      ${t.live.length ? row(['Live account realized P&L (after commissions)', money(t.liveNet)]) : ''}
    </tbody></table>
    <h3>Payouts</h3>
    ${t.pays.length ? `<table class="tax-t"><thead><tr><th>Date</th><th>Account</th><th>Description</th><th class="n">Requested</th><th class="n">Split</th><th class="n">Received</th></tr></thead><tbody>${t.pays.map(p => row([p.date, esc(p.account), esc(p.desc), m(p.gross), p.split + '%', m(p.received)])).join('')}</tbody></table>` : '<p class="tax-none">No payouts recorded this year.</p>'}
    <h3>Expenses</h3>
    ${t.exp.length ? `<table class="tax-t"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Account</th><th class="n">Amount</th></tr></thead><tbody>${t.exp.map(e => row([e.date, e.cat, esc(e.desc), esc(e.account), m(e.amount)])).join('')}</tbody></table>` : '<p class="tax-none">No expenses recorded this year.</p>'}
    ${t.live.length ? `<h3>Live accounts</h3><table class="tax-t"><thead><tr><th>Account</th><th>Broker</th><th class="n">Trades</th><th class="n">Gross P&L</th><th class="n">Commissions</th><th class="n">Net P&L</th></tr></thead><tbody>${t.live.map(x => row([esc(x.name), esc(x.firm), x.trades, money(x.gross), m(x.fees), money(x.net)])).join('')}</tbody></table>` : ''}
    ${t.perAcct.length ? `<h3>By account</h3><table class="tax-t"><thead><tr><th>Account</th><th>Type</th><th class="n">Received</th><th class="n">Costs</th></tr></thead><tbody>${t.perAcct.map(x => row([esc(x.name), x.type, m(x.paid), m(x.cost)])).join('')}</tbody></table>` : ''}
    <p class="tax-note">These are records from your journal to hand to whoever prepares your taxes, not tax advice. How prop firm payouts and futures gains are taxed depends on your situation, so check with a tax professional.</p>
  </div>`;
}
const TAX_CSS = `body{font:12px/1.45 -apple-system,"Inter",system-ui,sans-serif;color:#14171c;margin:0;padding:36px}.tax-title{font-size:22px;font-weight:800}.tax-sub{color:#5f6875;margin-top:2px}.tax-kpis{display:flex;gap:28px;margin:20px 0 6px;flex-wrap:wrap}.tax-kpis .k{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#5f6875;font-weight:700}.tax-kpis .v{font-size:20px;font-weight:800}.pos{color:#0f9d6b}.neg{color:#e23b4e}h3{font-size:13px;margin:22px 0 8px;text-transform:uppercase;letter-spacing:.05em;color:#3a414c}table{width:100%;border-collapse:collapse}th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#5f6875;border-bottom:1.5px solid #d4d8e0;padding:6px 8px}td{border-bottom:1px solid #e3e6ec;padding:6px 8px}.n{text-align:right;font-variant-numeric:tabular-nums}td:first-child{white-space:nowrap}.tax-note{margin-top:24px;color:#5f6875;font-size:11px}.tax-none{color:#98a0ab}`;
function taxCsv(t) {
  const q = v => { v = String(v ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const rows = [['type', 'date', 'account', 'category', 'description', 'gross', 'split_pct', 'amount']];
  t.pays.forEach(p => rows.push(['payout', p.date, p.account, 'Payout received', p.desc, p.gross.toFixed(2), p.split, p.received.toFixed(2)]));
  t.exp.forEach(e => rows.push(['expense', e.date, e.account, e.cat, e.desc, '', '', (-e.amount).toFixed(2)]));
  t.live.forEach(x => rows.push(['live_trading', t.y, x.name, 'Live account net P&L', `${x.trades} trades, commissions ${x.fees.toFixed(2)}`, x.gross.toFixed(2), '', x.net.toFixed(2)]));
  return rows.map(r => r.map(q).join(',')).join('\n');
}
function openTaxModal() {
  const years = taxYears(); let y = years[0];
  const m = openModal(`<div class="modal-h"><h3>Tax records</h3><button class="btn icon ghost" data-close>${ICON.close}</button></div>
    <div class="modal-b"><div class="between"><div class="field" style="width:160px"><label>Year</label><select class="select" id="taxY">${years.map(v => `<option>${v}</option>`).join('')}</select></div>
      <div class="row"><button class="btn" data-tx="csv">${ICON.download}Export CSV</button><button class="btn primary" data-tx="pdf">${ICON.download}Save PDF</button></div></div>
      <div id="taxBody" class="tax-preview"></div></div>`);
  const draw = () => { m.querySelector('#taxBody').innerHTML = taxReportHtml(taxData(y)); };
  m.querySelector('#taxY').onchange = e => { y = e.target.value; draw(); };
  m.querySelector('[data-close]').onclick = () => closeModal(m);
  m.querySelector('[data-tx=csv]').onclick = () => download(`trading-records-${y}.csv`, taxCsv(taxData(y)), 'text/csv');
  m.querySelector('[data-tx=pdf]').onclick = async () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>${TAX_CSS}</style></head><body>${taxReportHtml(taxData(y), true)}</body></html>`;
    if (window.edge && window.edge.savePdf) { const p = await window.edge.savePdf(`trading-records-${y}.pdf`, html); if (p) toast('PDF saved'); }
    else { const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); w.print(); } }
  };
  draw();
}
