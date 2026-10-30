/* Tessra: Dashboard, Trades, Calendar, Journal */
const after = [];
const later = fn => after.push(fn);

/* ===================== DASHBOARD ===================== */
function emptyState() {
  return `<div class="card"><div class="empty">
    <div class="ico">${I('<path d="M3 17l5-6 4 3 6-8 3 3"/>', 26)}</div>
    <h3>Your journal is empty</h3>
    <div>Log a trade, import a CSV from Tradovate, or load demo data to explore the app.</div>
    <div class="row" style="justify-content:center;margin-top:18px">
      <button class="btn primary" data-action="new-trade">${ICON.plus}Add first trade</button>
      <button class="btn" data-action="new-account">${ICON.accounts.replace(/17/g, 15)}Add account</button>
      <button class="btn" data-action="import-csv">${ICON.upload}Import CSV</button>
      <button class="btn ghost" data-action="load-demo">${ICON.spark}Load demo data</button>
    </div></div></div>`;
}

function rulesAlerts(todayTrades) {
  const g = S.state.goals, out = [];
  const p = todayTrades.reduce((a, t) => a + S.pnl(t), 0);
  if (g.dailyMaxLoss && p <= -g.dailyMaxLoss) out.push(['neg', `Daily max loss hit (${money(p)}). Rule says you are done for the day.`]);
  else if (g.dailyMaxLoss && p <= -g.dailyMaxLoss * 0.7) out.push(['warn', `You are at ${pct(Math.abs(p) / g.dailyMaxLoss, 0)} of your daily max loss. Size down or stop.`]);
  if (g.maxTradesPerDay && todayTrades.length >= g.maxTradesPerDay) out.push(['warn', `Max trades for the day reached (${todayTrades.length}/${g.maxTradesPerDay}).`]);
  if (g.dailyTarget && p >= g.dailyTarget) out.push(['pos', `Daily target reached (${money(p)}). Protect the green day.`]);
  for (const a of S.state.accounts.filter(a => a.status === 'active')) {
    const st = S.accountStatus(a);
    if (a.maxDrawdown && st.room < a.maxDrawdown * 0.3) out.push(['neg', `${esc(a.name)} is ${money0(st.room)} from its drawdown limit.`]);
    if (a.dailyLossLimit && st.todayPnl <= -a.dailyLossLimit * 0.8) out.push(['warn', `${esc(a.name)} is near its daily loss limit (${money(st.todayPnl)}).`]);
  }
  return out.map(([k, m]) => `<div class="alert ${k}">${k === 'pos' ? ICON.check : ICON.warn}<div>${m}</div></div>`).join('');
}

function miniCalendar(dayMap, ym) {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1), ws = S.state.settings.weekStart || 0;
  const lead = (first.getDay() - ws + 7) % 7, days = new Date(y, m, 0).getDate();
  const maxAbs = Math.max(1, ...Object.values(dayMap).filter(d => d.date.startsWith(ym)).map(d => Math.abs(d.pnl)));
  let h = '';
  for (let i = 0; i < 7; i++) h += `<div class="h">${DOW[(i + ws) % 7][0]}</div>`;
  for (let i = 0; i < lead; i++) h += `<div class="d blank"></div>`;
  for (let d = 1; d <= days; d++) {
    const k = `${ym}-${String(d).padStart(2, '0')}`, dm = dayMap[k];
    const c = dm ? (dm.pnl >= 0 ? 'win' : 'loss') : '';
    const tip = dm ? `${fmtDay(k)}: ${money(dm.pnl)} (${dm.trades.length} trades)` : fmtDay(k);
    h += `<div class="d ${c} ${k === todayKey() ? 'today' : ''}" style="--a:${dm ? Math.abs(dm.pnl) / maxAbs : 0}" title="${tip}" data-action="open-day" data-date="${k}">${d}</div>`;
  }
  return `<div class="mini-cal">${h}</div>`;
}

function pageDashboard() {
  const all = trades();
  if (!S.state.trades.length) return emptyState();
  const list = inRange(all, ui.dashRange);
  const s = S.summary(list);
  const dayMap = S.byDay(list);
  const dayVals = Object.values(dayMap);
  const green = dayVals.filter(d => d.pnl > 0).length;
  const today = todayKey();
  const tdTrades = all.filter(t => S.dayOf(t) === today);
  const td = S.summary(tdTrades);
  const j = S.state.journal[today] || {};
  const g = S.state.goals;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const recent = S.sortTrades(all).slice(-6).reverse();
  const accs = S.state.accounts.filter(a => a.status !== 'archived' && (ui.account === 'all' || a.id === ui.account));
  const ym = todayKey().slice(0, 7);
  const allDays = S.byDay(all);

  const setupRows = S.state.setups.map(st => ({ st, s: S.summary(list.filter(t => t.setup === st.id)) })).filter(x => x.s.count).sort((a, b) => b.s.net - a.s.net).slice(0, 4);
  const mistakes = S.state.mistakes.map(mk => { const ts = list.filter(t => (t.mistakes || []).includes(mk)); return { mk, n: ts.length, cost: ts.reduce((a, t) => a + S.pnl(t), 0) }; }).filter(x => x.n).sort((a, b) => a.cost - b.cost).slice(0, 4);
  const bestDay = dayVals.reduce((a, d) => !a || d.pnl > a.pnl ? d : a, null);
  const worstDay = dayVals.reduce((a, d) => !a || d.pnl < a.pnl ? d : a, null);
  const lossUsed = Math.max(0, -td.net);

  later(() => {
    const eq = S.equity(list);
    Charts.line(document.getElementById('dashEquity'), [{ label: '', value: 0 }].concat(eq.map(e => ({ label: fmtDay(S.dayOf(e.t), { weekday: undefined }), value: e.eq, tip: `${fmtDay(S.dayOf(e.t))} · ${esc(e.t.symbol)} ${money(S.pnl(e.t))}<br><b>Equity ${money(e.eq)}</b>` }))), { height: 250 });
    const dv = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
    Charts.bars(document.getElementById('dashDaily'), dv.map(d => ({ label: fmtDay(d.date, { weekday: undefined }), value: d.pnl, date: d.date, tip: `${fmtDay(d.date)}<br><b>${money(d.pnl)}</b> · ${d.trades.length} trades` })), { height: 150, onClick: it => openDay(it.date) });
  });

  return `
  <div class="between" style="margin-bottom:16px">
    <div class="muted">${greet}, ${esc(S.state.settings.name || 'trader')}. Here is your ${RANGE_LABEL[ui.dashRange].toLowerCase()} at a glance.</div>
    ${seg('dash-range', [['today', 'Today'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year'], ['all', 'All']], ui.dashRange)}
  </div>
  ${lockBannerHtml()}
  ${(() => { const a = rulesAlerts(tdTrades); return a ? `<div class="grid" style="gap:8px;margin-bottom:16px">${a}</div>` : ''; })()}
  <div class="grid g-6">
    <div class="card kpi"><div class="kpi-label">Net P&L</div><div class="kpi-value ${cls(s.net)}">${money(s.net)}</div><div class="kpi-meta">${s.count} trades · ${money(-s.fees, false)} fees</div></div>
    <div class="card kpi"><div class="kpi-flex"><div><div class="kpi-label">Win rate</div><div class="kpi-value">${pct(s.winRate)}</div></div>${ring(s.winRate)}</div><div class="kpi-meta">${s.wins}W · ${s.losses}L · ${s.be}BE</div></div>
    <div class="card kpi"><div class="kpi-label">Profit factor</div><div class="kpi-value ${s.profitFactor >= 1 ? 'pos' : 'neg'}">${pf(s.profitFactor)}</div><div class="kpi-meta">${money0(s.grossProfit)} won / ${money0(Math.abs(s.grossLoss))} lost</div></div>
    <div class="card kpi"><div class="kpi-label">Avg win / loss</div><div class="kpi-value">${num(s.payoff)}<span class="faint" style="font-size:14px">x</span></div>
      <div class="ratio-bar"><div style="width:${s.avgWin + Math.abs(s.avgLoss) ? s.avgWin / (s.avgWin + Math.abs(s.avgLoss)) * 100 : 50}%"></div><div style="flex:1"></div></div>
      <div class="kpi-meta"><span class="pos">${money0(s.avgWin)}</span> · <span class="neg">${money0(s.avgLoss)}</span></div></div>
    <div class="card kpi"><div class="kpi-label">Expectancy</div><div class="kpi-value ${cls(s.expectancy)}">${money(s.expectancy)}</div><div class="kpi-meta">per trade · avg ${rFmt(s.avgR)}</div></div>
    <div class="card kpi"><div class="kpi-flex"><div><div class="kpi-label">Green days</div><div class="kpi-value">${dayVals.length ? pct(green / dayVals.length, 0) : '-'}</div></div>${ring(dayVals.length ? green / dayVals.length : 0)}</div><div class="kpi-meta">${green} green · ${dayVals.length - green} red of ${dayVals.length}</div></div>
  </div>

  <div class="grid g-main mt">
    <div class="card">
      <div class="card-h"><div class="card-t">Equity curve <span class="sub">${RANGE_LABEL[ui.dashRange]}</span></div><div class="kpi-meta" style="margin:0">Max drawdown <b class="neg">${money(s.maxDD)}</b></div></div>
      <div id="dashEquity"></div>
      <div class="card-h mt" style="margin-bottom:6px"><div class="card-t">Daily P&L <span class="sub">last 30 trading days in range, click a bar</span></div></div>
      <div id="dashDaily"></div>
    </div>
    <div class="card">
      <div class="card-h"><div class="card-t">Today <span class="sub">${fmtDay(today)}</span></div><button class="btn sm" data-action="open-day" data-date="${today}">Details</button></div>
      <div class="big-pnl ${cls(td.net)}">${money(td.net)}</div>
      <div class="muted" style="margin:2px 0 16px">${td.count} trade${td.count === 1 ? '' : 's'}${g.maxTradesPerDay ? ' of ' + g.maxTradesPerDay + ' max' : ''} · ${td.count ? pct(td.winRate, 0) + ' win rate' : 'no trades yet'}</div>
      ${g.dailyMaxLoss ? `<div class="between" style="font-size:12px;margin-bottom:6px"><span class="muted">Daily loss limit</span><span><b>${money0(lossUsed)}</b> <span class="faint">/ ${money0(g.dailyMaxLoss)}</span></span></div>
        <div class="progress ${lossUsed / g.dailyMaxLoss > .7 ? 'neg' : 'warn'}"><div style="width:${Math.min(100, lossUsed / g.dailyMaxLoss * 100)}%"></div></div>` : ''}
      ${g.dailyTarget ? `<div class="between" style="font-size:12px;margin:14px 0 6px"><span class="muted">Daily target</span><span><b>${money0(Math.max(0, td.net))}</b> <span class="faint">/ ${money0(g.dailyTarget)}</span></span></div>
        <div class="progress pos"><div style="width:${Math.min(100, Math.max(0, td.net) / g.dailyTarget * 100)}%"></div></div>` : ''}
      ${consistencyDashHtml()}
      <div class="seg-label" style="margin-top:20px">Routine</div>
      <div class="stat-list">
        <div class="stat-row"><span class="k">Pre-market plan</span>${j.premarket ? `<span class="chip pos">${ICON.check} Done</span>` : `<button class="btn sm" data-action="goto-journal" data-date="${today}">Write plan</button>`}</div>
        <div class="stat-row"><span class="k">Post-session review</span>${j.review ? `<span class="chip pos">${ICON.check} Done</span>` : `<button class="btn sm" data-action="goto-journal" data-date="${today}">Write review</button>`}</div>
        <div class="stat-row"><span class="k">Current streak</span><span class="v ${s.curStreakType === 'win' ? 'pos' : s.curStreakType === 'loss' ? 'neg' : ''}">${s.curStreak ? s.curStreak + ' ' + (s.curStreakType === 'win' ? 'wins' : 'losses') : '-'}</span></div>
      </div>
    </div>
  </div>

  <div class="grid g-3 mt">
    <div class="card">
      <div class="card-h"><div class="card-t">${MONTHS[new Date().getMonth()]} <span class="sub">${money(Object.values(allDays).filter(d => d.date.startsWith(ym)).reduce((a, d) => a + d.pnl, 0))}</span></div><div class="row" style="gap:2px"><button class="btn sm ghost" data-action="share-month" data-ym="${ym}" title="Share monthly recap">${ICON.share}</button><button class="btn sm ghost" data-action="nav" data-page="calendar">Calendar ${ICON.right}</button></div></div>
      ${miniCalendar(allDays, ym)}
    </div>
    <div class="card">
      <div class="card-h"><div class="card-t">Recent trades</div><button class="btn sm ghost" data-action="nav" data-page="trades">All ${ICON.right}</button></div>
      ${recent.length ? recent.map(t => `<div class="list-row" data-action="open-trade" data-id="${t.id}">
        ${sideTag(t.side)}<div style="flex:1;min-width:0"><div class="lr-main">${esc(t.symbol)} <span class="faint" style="font-weight:500">× ${t.qty}</span></div><div class="lr-sub">${fmtDay(S.dayOf(t))} ${fmtTime(t.entryTime)} · ${esc(setupName(t.setup) || 'No setup')}</div></div>
        <div style="text-align:right"><div class="${cls(S.pnl(t))}" style="font-weight:700">${money(S.pnl(t))}</div><div class="lr-sub">${rFmt(S.rMultiple(t))}</div></div></div>`).join('') : '<div class="faint">No trades yet</div>'}
    </div>
    <div class="card">
      <div class="card-h"><div class="card-t">Accounts</div><button class="btn sm ghost" data-action="nav" data-page="accounts">Manage ${ICON.right}</button></div>
      ${accs.length ? accs.slice(0, 4).map(a => {
        const st = S.accountStatus(a);
        const roomPct = a.maxDrawdown ? Math.max(0, Math.min(1, st.room / a.maxDrawdown)) : null;
        return `<div style="padding:8px 0 12px;border-bottom:1px solid var(--line)" class="acc-mini">
          <div class="between"><div class="lr-main">${esc(a.name)}</div><div class="${cls(st.net)}" style="font-weight:700">${money(st.net)}</div></div>
          ${st.targetProgress !== null ? `<div class="between lr-sub" style="margin:6px 0 4px"><span>Profit target</span><span>${pct(st.targetProgress, 0)} · ${money0(st.toTarget)} to go</span></div><div class="progress pos"><div style="width:${st.targetProgress * 100}%"></div></div>` : ''}
          ${roomPct !== null ? `<div class="between lr-sub" style="margin:8px 0 4px"><span>Drawdown room</span><span>${money0(st.room)}</span></div><div class="progress ${roomPct < .35 ? 'neg' : roomPct < .6 ? 'warn' : ''}"><div style="width:${roomPct * 100}%"></div></div>` : ''}
        </div>`; }).join('') : `<div class="faint" style="margin-bottom:10px">Track your prop evals and funded accounts here.</div><button class="btn sm" data-action="new-account">${ICON.plus}Add account</button>`}
    </div>
  </div>

  <div class="grid g-3 mt">
    <div class="card">
      <div class="card-h"><div class="card-t">Top setups</div><button class="btn sm ghost" data-action="nav" data-page="playbook">Playbook ${ICON.right}</button></div>
      ${setupRows.length ? setupRows.map(x => `<div class="list-row" data-action="setup-trades" data-id="${x.st.id}"><span class="dot" style="background:${x.st.color}"></span><div style="flex:1"><div class="lr-main">${esc(x.st.name)}</div><div class="lr-sub">${x.s.count} trades · ${pct(x.s.winRate, 0)} win · PF ${pf(x.s.profitFactor)}</div></div><b class="${cls(x.s.net)}">${money(x.s.net)}</b></div>`).join('') : '<div class="faint">Tag trades with a setup to see which ones pay.</div>'}
    </div>
    <div class="card">
      <div class="card-h"><div class="card-t">Costliest mistakes</div><button class="btn sm ghost" data-action="nav-an" data-v="psychology">Psychology ${ICON.right}</button></div>
      ${mistakes.length ? mistakes.map(x => `<div class="list-row" data-action="mistake-trades" data-v="${esc(x.mk)}"><span class="chip neg">${esc(x.mk)}</span><div class="spacer"></div><span class="faint">${x.n}×</span><b class="${cls(x.cost)}" style="min-width:90px;text-align:right">${money(x.cost)}</b></div>`).join('') : '<div class="faint">No mistakes tagged in this range. Nice.</div>'}
    </div>
    <div class="card">
      <div class="card-h"><div class="card-t">Records <span class="sub">${RANGE_LABEL[ui.dashRange]}</span></div></div>
      <div class="stat-list">
        <div class="stat-row"><span class="k">Best day</span><span class="v pos" ${bestDay ? `data-action="open-day" data-date="${bestDay.date}" style="cursor:pointer"` : ''}>${bestDay ? money(bestDay.pnl) + ' <span class="faint">' + fmtDay(bestDay.date, { weekday: undefined }) + '</span>' : '-'}</span></div>
        <div class="stat-row"><span class="k">Worst day</span><span class="v neg" ${worstDay ? `data-action="open-day" data-date="${worstDay.date}" style="cursor:pointer"` : ''}>${worstDay ? money(worstDay.pnl) + ' <span class="faint">' + fmtDay(worstDay.date, { weekday: undefined }) + '</span>' : '-'}</span></div>
        <div class="stat-row"><span class="k">Largest win</span><span class="v pos">${money(s.largestWin)}</span></div>
        <div class="stat-row"><span class="k">Largest loss</span><span class="v neg">${money(s.largestLoss)}</span></div>
        <div class="stat-row"><span class="k">Win streak / loss streak</span><span class="v">${s.maxWinStreak} / ${s.maxLossStreak}</span></div>
        <div class="stat-row"><span class="k">Avg hold time</span><span class="v">${fmtHold(s.avgHold)}</span></div>
      </div>
    </div>
  </div>`;
}

/* ===================== TRADES ===================== */
function filteredTrades() {
  const f = ui.tf, q = f.q.trim().toLowerCase();
  let ts = trades().filter(t => {
    if (f.symbol && S.rootOf(t.symbol) !== f.symbol) return false;
    if (f.side && t.side !== f.side) return false;
    if (f.setup && (f.setup === '_none' ? t.setup : t.setup !== f.setup)) return false;
    if (f.result && S.result(t) !== f.result) return false;
    if (f.tag && !(t.tags || []).includes(f.tag)) return false;
    if (f.mistake && !(t.mistakes || []).includes(f.mistake)) return false;
    const d = S.dayOf(t);
    if (f.from && d < f.from) return false;
    if (f.to && d > f.to) return false;
    if (q && !`${t.symbol} ${t.notes || ''} ${setupName(t.setup)} ${(t.tags || []).join(' ')} ${(t.mistakes || []).join(' ')}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const key = {
    date: t => t.exitTime || t.entryTime, symbol: t => t.symbol, side: t => t.side, qty: t => +t.qty, entry: t => +t.entryPrice, exit: t => +t.exitPrice,
    points: t => S.points(t) ?? -1e9, pnl: t => S.pnl(t), r: t => S.rMultiple(t) ?? -1e9, setup: t => setupName(t.setup), rating: t => +t.rating || 0, hold: t => S.holdMinutes(t) ?? -1
  }[f.sort] || (t => t.exitTime);
  ts.sort((a, b) => { const x = key(a), y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * f.dir; });
  return ts;
}

function tradesTableHtml() {
  const ts = filteredTrades(), s = S.summary(ts);
  const th = (k, l, n) => `<th class="sortable ${n ? 'n' : ''}" data-action="sort" data-key="${k}">${l}${ui.tf.sort === k ? `<span class="arrow">${ui.tf.dir > 0 ? '↑' : '↓'}</span>` : ''}</th>`;
  return `<div class="summary-strip">
      <div><div class="k">Trades</div><div class="v">${s.count}</div></div>
      <div><div class="k">Net P&L</div><div class="v ${cls(s.net)}">${money(s.net)}</div></div>
      <div><div class="k">Win rate</div><div class="v">${pct(s.winRate)}</div></div>
      <div><div class="k">Profit factor</div><div class="v">${pf(s.profitFactor)}</div></div>
      <div><div class="k">Avg R</div><div class="v">${rFmt(s.avgR)}</div></div>
      <div><div class="k">Expectancy</div><div class="v ${cls(s.expectancy)}">${money(s.expectancy)}</div></div>
      <div><div class="k">Fees</div><div class="v">${money(-s.fees, false)}</div></div>
    </div>
    ${ts.length ? `<div class="table-wrap" style="max-height:calc(100vh - 290px)"><table class="tbl"><thead><tr>
      ${th('date', 'Date')}<th>Time</th>${th('symbol', 'Symbol')}${th('side', 'Side')}${th('qty', 'Qty', 1)}${th('entry', 'Entry', 1)}${th('exit', 'Exit', 1)}${th('points', 'Points', 1)}${th('pnl', 'Net P&L', 1)}${th('r', 'R', 1)}${th('hold', 'Hold', 1)}${th('setup', 'Setup')}${th('rating', 'Rating')}<th></th>
    </tr></thead><tbody>
    ${ts.map(t => { const p = S.pnl(t), pts = S.points(t), st = setupById(t.setup); return `<tr data-action="open-trade" data-id="${t.id}">
      <td>${fmtDay(S.dayOf(t))}</td><td class="muted">${fmtTime(t.entryTime)}</td><td class="sym">${esc(t.symbol)} ${copyChip(t)}</td><td>${sideTag(t.side)}</td>
      <td class="n">${t.qty}</td><td class="n">${fmtPrice(t.entryPrice)}</td><td class="n">${fmtPrice(t.exitPrice)}</td>
      <td class="n ${cls(pts)}">${pts === null ? '-' : (pts > 0 ? '+' : '') + num(pts, 2)}</td>
      <td class="n ${cls(p)}" style="font-weight:700">${money(p)}</td><td class="n ${cls(S.rMultiple(t) || 0)}">${rFmt(S.rMultiple(t))}</td>
      <td class="n muted">${fmtHold(S.holdMinutes(t))}</td>
      <td>${st ? `<span class="row" style="gap:6px"><span class="dot" style="background:${st.color}"></span>${esc(st.name)}</span>` : '<span class="faint">-</span>'}</td>
      <td>${t.rating ? stars(t.rating) : '<span class="faint">-</span>'}</td>
      <td class="faint">${(t.screenshots || []).length ? `<span class="cam">${ICON.camera}</span>` : ''} ${t.notes ? `<span class="cam">${ICON.note}</span>` : ''} ${(t.mistakes || []).length ? `<span class="chip neg" style="padding:1px 7px">${t.mistakes.length}</span>` : ''}</td>
    </tr>`; }).join('')}
    </tbody></table></div>` : `<div class="empty"><h3>No trades match</h3><div>Try clearing the filters or add a trade.</div></div>`}`;
}

function pageTrades() {
  const f = ui.tf, st = S.state;
  const roots = [...new Set(trades().map(t => S.rootOf(t.symbol)))].sort();
  const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
  return `<div class="filters">
      <input class="input" placeholder="Search notes, symbol, tags" data-filter="q" value="${esc(f.q)}">
      <select class="select" data-filter="symbol">${opt('', 'All symbols', f.symbol)}${roots.map(r => opt(r, r, f.symbol)).join('')}</select>
      <select class="select" data-filter="side">${opt('', 'Long and short', f.side)}${opt('long', 'Long', f.side)}${opt('short', 'Short', f.side)}</select>
      <select class="select" data-filter="result">${opt('', 'Any result', f.result)}${opt('win', 'Winners', f.result)}${opt('loss', 'Losers', f.result)}${opt('be', 'Breakeven', f.result)}</select>
      <select class="select" data-filter="setup">${opt('', 'All setups', f.setup)}${st.setups.map(s => opt(s.id, s.name, f.setup)).join('')}${opt('_none', 'No setup', f.setup)}</select>
      <select class="select" data-filter="tag">${opt('', 'Any tag', f.tag)}${st.tags.map(t => opt(t, t, f.tag)).join('')}</select>
      <select class="select" data-filter="mistake">${opt('', 'Any mistake', f.mistake)}${st.mistakes.map(t => opt(t, t, f.mistake)).join('')}</select>
      <input class="input date" type="date" data-filter="from" value="${f.from}" title="From">
      <input class="input date" type="date" data-filter="to" value="${f.to}" title="To">
      <button class="btn ghost" data-action="clear-filters">Clear</button>
      <div class="spacer"></div>
      <button class="btn" data-action="export-csv">${ICON.download}Export</button>
      <button class="btn" data-action="import-csv">${ICON.upload}Import</button>
    </div>
    <div class="card flush" id="tradesTable">${tradesTableHtml()}</div>`;
}
function refreshTradesTable() { const el = document.getElementById('tradesTable'); if (el) el.innerHTML = tradesTableHtml(); }

/* ===================== CALENDAR ===================== */
function pageCalendar() {
  if (!ui.calMonth) ui.calMonth = todayKey().slice(0, 7);
  const dayMap = S.byDay(trades());
  const head = `<div class="cal-head">
    <button class="btn icon" data-action="cal-prev">${ICON.left}</button>
    <h2>${ui.calView === 'year' ? ui.calMonth.slice(0, 4) : MONTHS[+ui.calMonth.slice(5) - 1] + ' ' + ui.calMonth.slice(0, 4)}</h2>
    <button class="btn icon" data-action="cal-next">${ICON.right}</button>
    <button class="btn sm" data-action="cal-today">Today</button>
    <div class="spacer"></div>
    ${ui.calView === 'month' ? `<button class="btn sm" data-action="share-month" data-ym="${ui.calMonth}">${ICON.share}Share month recap</button>` : ''}
    ${seg('cal-view', [['month', 'Month'], ['year', 'Year']], ui.calView)}
  </div>`;
  if (ui.calView === 'year') {
    const y = ui.calMonth.slice(0, 4);
    const yDays = Object.values(dayMap).filter(d => d.date.startsWith(y));
    const tot = yDays.reduce((a, d) => a + d.pnl, 0);
    return head + `<div class="summary-strip card" style="margin-bottom:16px;border-radius:14px">
        <div><div class="k">Year P&L</div><div class="v ${cls(tot)}">${money(tot)}</div></div>
        <div><div class="k">Trading days</div><div class="v">${yDays.length}</div></div>
        <div><div class="k">Green days</div><div class="v pos">${yDays.filter(d => d.pnl > 0).length}</div></div>
        <div><div class="k">Red days</div><div class="v neg">${yDays.filter(d => d.pnl < 0).length}</div></div>
      </div><div class="year-grid">${MONTHS.map((mn, i) => {
        const ym = `${y}-${String(i + 1).padStart(2, '0')}`;
        const mt = Object.values(dayMap).filter(d => d.date.startsWith(ym)).reduce((a, d) => a + d.pnl, 0);
        return `<div class="card"><div class="card-h" style="margin-bottom:10px"><div class="card-t" style="cursor:pointer" data-action="cal-month" data-ym="${ym}">${mn}</div><b class="${cls(mt)}" style="font-size:12.5px">${mt ? money(mt) : ''}</b></div>${miniCalendar(dayMap, ym)}</div>`;
      }).join('')}</div>`;
  }
  const ym = ui.calMonth, [y, m] = ym.split('-').map(Number);
  const ws = S.state.settings.weekStart || 0;
  const first = new Date(y, m - 1, 1);
  const start = new Date(first); start.setDate(1 - ((first.getDay() - ws + 7) % 7));
  const mDays = Object.values(dayMap).filter(d => d.date.startsWith(ym));
  const maxAbs = Math.max(1, ...mDays.map(d => Math.abs(d.pnl)));
  const mTot = mDays.reduce((a, d) => a + d.pnl, 0);
  const mS = S.summary(mDays.flatMap(d => d.trades));
  const best = mDays.reduce((a, d) => !a || d.pnl > a.pnl ? d : a, null), worst = mDays.reduce((a, d) => !a || d.pnl < a.pnl ? d : a, null);
  let cells = DOW.map((_, i) => `<div class="cal-dow">${DOW[(i + ws) % 7]}</div>`).join('') + `<div class="cal-dow">Week</div>`;
  const cur = new Date(start);
  let weekNo = 0;
  do {
    weekNo++;
    let wP = 0, wT = 0, wD = 0;
    for (let i = 0; i < 7; i++) {
      const k = keyOf(cur), dm = dayMap[k], inM = cur.getMonth() === m - 1;
      const j = S.state.journal[k];
      if (dm && inM) { wP += dm.pnl; wT += dm.trades.length; wD++; }
      const ds = dm ? S.summary(dm.trades) : null;
      cells += `<div class="cal-day ${inM ? '' : 'out'} ${k === todayKey() ? 'today' : ''} ${dm ? (dm.pnl >= 0 ? 'win' : 'loss') : ''}" style="--a:${dm ? (0.25 + 0.75 * Math.abs(dm.pnl) / maxAbs).toFixed(2) : 0}" data-action="open-day" data-date="${k}">
        <div class="cal-num"><span>${cur.getDate()}</span><span class="cal-icons">${j && (j.premarket || j.review) ? ICON.note : ''}${(j && (j.screenshots || []).length) || (dm && dm.trades.some(t => (t.screenshots || []).length)) ? ICON.camera : ''}</span></div>
        ${dm ? `<div class="cal-pnl ${cls(dm.pnl)}">${money(dm.pnl)}</div><div class="cal-meta">${dm.trades.length} trade${dm.trades.length === 1 ? '' : 's'} · ${pct(ds.winRate, 0)}</div>` : ''}
      </div>`;
      cur.setDate(cur.getDate() + 1);
    }
    cells += `<div class="cal-week"><div class="wl">Week ${weekNo}</div><div class="wv ${cls(wP)}">${wD ? money(wP) : '-'}</div><div class="wm">${wD ? `${wD} day${wD === 1 ? '' : 's'} · ${wT} trades` : 'No trades'}</div></div>`;
  } while (cur.getMonth() === m - 1 && cur.getFullYear() === y);
  return head + `<div class="card flush" style="margin-bottom:16px"><div class="summary-strip" style="border:0">
      <div><div class="k">Month P&L</div><div class="v ${cls(mTot)}">${money(mTot)}</div></div>
      <div><div class="k">Trading days</div><div class="v">${mDays.length}</div></div>
      <div><div class="k">Green / red</div><div class="v"><span class="pos">${mDays.filter(d => d.pnl > 0).length}</span> / <span class="neg">${mDays.filter(d => d.pnl < 0).length}</span></div></div>
      <div><div class="k">Trades</div><div class="v">${mS.count}</div></div>
      <div><div class="k">Win rate</div><div class="v">${pct(mS.winRate)}</div></div>
      <div><div class="k">Best day</div><div class="v pos">${best ? money(best.pnl) : '-'}</div></div>
      <div><div class="k">Worst day</div><div class="v neg">${worst ? money(worst.pnl) : '-'}</div></div>
      <div><div class="k">Avg day</div><div class="v ${cls(mDays.length ? mTot / mDays.length : 0)}">${mDays.length ? money(mTot / mDays.length) : '-'}</div></div>
    </div></div>
    <div class="cal">${cells}</div>`;
}

function openDay(date) {
  const ts = S.sortTrades(trades().filter(t => S.dayOf(t) === date));
  const s = S.summary(ts), j = S.state.journal[date] || {};
  const shots = ts.flatMap(t => (t.screenshots || []).map(n => ({ src: n, caption: `${t.symbol} ${money(S.pnl(t))}`, tradeId: t.id }))).concat((j.screenshots || []).map(n => ({ src: n, caption: 'Journal ' + fmtDay(date), day: date })));
  const dr = openDrawer(`<div class="drawer-h"><div class="between"><div><div class="seg-label" style="margin:0">${fmtLongDay(date)}</div><div class="big-pnl ${cls(s.net)}">${money(s.net)}</div></div><button class="btn icon ghost" data-action="close-drawer">${ICON.close}</button></div>
    <div class="row mt"><button class="btn primary sm" data-action="goto-journal" data-date="${date}">${ICON.journal.replace(/17/g, 14)}Open journal</button><button class="btn sm" data-action="new-trade" data-date="${date}">${ICON.plus}Add trade</button>${ts.length ? `<button class="btn sm" data-action="share-day" data-date="${date}">${ICON.share}Share day</button>` : ''}</div></div>
    <div class="drawer-b">
      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat-cell"><div class="k">Trades</div><div class="v">${s.count}</div></div>
        <div class="stat-cell"><div class="k">Win rate</div><div class="v">${s.count ? pct(s.winRate, 0) : '-'}</div></div>
        <div class="stat-cell"><div class="k">Profit factor</div><div class="v">${s.count ? pf(s.profitFactor) : '-'}</div></div>
        <div class="stat-cell"><div class="k">Best trade</div><div class="v pos">${money(s.largestWin)}</div></div>
        <div class="stat-cell"><div class="k">Worst trade</div><div class="v neg">${money(s.largestLoss)}</div></div>
        <div class="stat-cell"><div class="k">Fees</div><div class="v">${money(-s.fees, false)}</div></div>
      </div>
      ${ts.length > 1 ? `<div><div class="seg-label">Intraday equity</div><div id="dayEq"></div></div>` : ''}
      <div><div class="seg-label">Trades</div>${ts.length ? ts.map(t => `<div class="list-row" data-action="open-trade" data-id="${t.id}">${sideTag(t.side)}<div style="flex:1"><div class="lr-main">${esc(t.symbol)} × ${t.qty}</div><div class="lr-sub">${fmtTime(t.entryTime)} to ${fmtTime(t.exitTime) || '?'} · ${esc(setupName(t.setup) || 'No setup')}</div></div><div style="text-align:right"><b class="${cls(S.pnl(t))}">${money(S.pnl(t))}</b><div class="lr-sub">${rFmt(S.rMultiple(t))}</div></div></div>`).join('') : '<div class="faint">No trades on this day.</div>'}</div>
      ${j.premarket ? `<div><div class="seg-label">Pre-market plan</div><div class="note-box">${esc(j.premarket)}</div></div>` : ''}
      ${j.review ? `<div><div class="seg-label">Review</div><div class="note-box">${esc(j.review)}</div></div>` : ''}
      ${shots.length ? `<div><div class="seg-label">Screenshots</div>${shotsHtml(shots.map(x => x.src), false)}</div>` : ''}
    </div>`);
  dr.querySelectorAll('[data-shot]').forEach(el => el.addEventListener('click', () => lightbox(shots, +el.dataset.shot)));
  if (ts.length > 1) {
    let eq = 0;
    Charts.line(dr.querySelector('#dayEq'), [{ label: 'Open', value: 0 }].concat(ts.map(t => { eq += S.pnl(t); return { label: fmtTime(t.exitTime || t.entryTime), value: eq, tip: `${fmtTime(t.exitTime)} ${esc(t.symbol)} ${money(S.pnl(t))}<br><b>${money(eq)}</b>` }; })), { height: 150 });
  }
}

/* ===================== JOURNAL ===================== */
function pageJournal() {
  if (!ui.journalDay) ui.journalDay = todayKey();
  const dayMap = S.byDay(trades());
  const keys = new Set([todayKey(), ui.journalDay, ...Object.keys(dayMap), ...Object.keys(S.state.journal).filter(k => { const j = S.state.journal[k]; return j && Object.values(j).some(v => Array.isArray(v) ? v.length : v); })]);
  const sorted = [...keys].sort().reverse();
  let lastM = '';
  const listHtml = sorted.map(k => {
    const dm = dayMap[k], j = S.state.journal[k] || {};
    const m = k.slice(0, 7); let hdr = '';
    if (m !== lastM) { lastM = m; hdr = `<div class="nav-section" style="padding-left:12px">${MONTHS[+m.slice(5) - 1]} ${m.slice(0, 4)}</div>`; }
    const done = j.premarket || j.review;
    return hdr + `<div class="day-item ${k === ui.journalDay ? 'on' : ''}" data-action="journal-day" data-date="${k}">
      <div><div class="dd">${fmtDay(k)}${k === todayKey() ? ' <span class="chip acc" style="padding:1px 7px;font-size:10px">Today</span>' : ''}</div>
      <div class="dm">${dm ? dm.trades.length + ' trades' : 'No trades'} ${done ? `<span class="pos">${ICON.note}</span>` : ''}</div></div>
      <div class="dp ${dm ? cls(dm.pnl) : 'faint'}">${dm ? money(dm.pnl) : '-'}</div></div>`;
  }).join('');
  const k = ui.journalDay, j = S.state.journal[k] || {}, dm = dayMap[k];
  const ds = S.summary(dm ? dm.trades : []);
  const scale = (f, v) => `<div class="scale">${[1, 2, 3, 4, 5].map(n => `<button data-jscale="${f}" data-v="${n}" class="${+v === n ? 'on' : ''}">${n}</button>`).join('')}</div>`;
  const ta = (f, ph, rows = 4) => `<textarea class="input" data-j="${f}" rows="${rows}" placeholder="${ph}">${esc(j[f] || '')}</textarea>`;
  later(() => {
    const zone = document.getElementById('jDrop');
    if (zone) wireDrop(zone, names => { const e = jEntry(k); e.screenshots = (e.screenshots || []).concat(names); S.save(); renderJournalShots(); });
    renderJournalShots();
  });
  return `<div class="journal-wrap">
    <div class="card flush"><div class="card-flush-h between"><div class="card-t">Days</div><input type="date" class="input" style="width:150px;padding:5px 8px" data-action-change="journal-pick" value="${k}"></div><div class="day-list">${listHtml}</div></div>
    <div class="grid" style="gap:16px">
      <div class="card">
        <div class="between">
          <div><div class="seg-label" style="margin:0">${fmtLongDay(k)}</div>
            <div class="row" style="gap:18px;margin-top:4px"><span class="big-pnl ${cls(ds.net)}" style="font-size:26px">${money(ds.net)}</span>
            <span class="muted">${ds.count} trades · ${ds.count ? pct(ds.winRate, 0) + ' win' : 'no trades'} · ${money(-ds.fees, false)} fees</span></div></div>
          <div class="row"><span class="saved-ind" id="savedInd">Autosaves as you type</span><button class="btn sm" data-action="open-day" data-date="${k}">Day summary</button></div>
        </div>
      </div>
      <div class="grid g-2">
        <div class="card">
          <div class="card-h"><div class="card-t">Pre-market</div></div>
          <div class="grid" style="gap:14px">
            <div class="field"><label>Market bias</label><div class="seg">${['Bullish', 'Bearish', 'Neutral', 'No bias'].map(b => `<button data-jset="bias" data-v="${b}" class="${j.bias === b ? 'on' : ''}">${b}</button>`).join('')}</div></div>
            <div class="row wrap" style="gap:24px"><div class="field"><label>Mood going in</label>${scale('mood', j.mood)}</div>
              <div class="field"><label>Sleep (hours)</label><input class="input" type="number" step="0.5" style="width:90px" data-j="sleep" value="${esc(j.sleep || '')}"></div></div>
            <div class="field"><label>Game plan</label>${ta('premarket', 'What are you looking for today? Which setups, which sessions, what invalidates the idea?', 5)}</div>
            <div class="field"><label>Key levels and news</label>${ta('levels', 'Prior day high and low, overnight range, news times...', 3)}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-h"><div class="card-t">Post-session review</div></div>
          <div class="grid" style="gap:14px">
            <div class="row wrap" style="gap:24px"><div class="field"><label>Discipline score</label>${scale('discipline', j.discipline)}</div>
              <div class="field"><label>Followed my plan?</label><div class="seg">${['Yes', 'Partly', 'No'].map(b => `<button data-jset="followedPlan" data-v="${b}" class="${j.followedPlan === b ? 'on' : ''}">${b}</button>`).join('')}</div></div></div>
            <div class="field"><label>How did it go?</label>${ta('review', 'Walk through the session. What did price do versus your plan?', 5)}</div>
            <div class="field"><label>What went well</label>${ta('wentWell', 'Keep doing this...', 2)}</div>
            <div class="field"><label>Lessons and what to improve</label>${ta('improve', 'One thing to do better tomorrow...', 2)}</div>
          </div>
        </div>
      </div>
      <div class="card"><div class="card-h"><div class="card-t">Screenshots <span class="sub">charts, markups, P&L</span></div></div><div id="jDrop" class="drop">${ICON.camera} &nbsp;Drop screenshots here, click to browse, or paste with ${MOD}V</div><div id="jShots"></div></div>
      <div class="card flush"><div class="card-flush-h between"><div class="card-t">Trades this day</div><button class="btn sm" data-action="new-trade" data-date="${k}">${ICON.plus}Add trade</button></div>
        ${dm ? `<table class="tbl"><tbody>${S.sortTrades(dm.trades).map(t => `<tr data-action="open-trade" data-id="${t.id}"><td class="muted">${fmtTime(t.entryTime)}</td><td class="sym">${esc(t.symbol)}</td><td>${sideTag(t.side)}</td><td class="n">${t.qty}</td><td>${esc(setupName(t.setup) || '')}</td><td class="n ${cls(S.pnl(t))}" style="font-weight:700">${money(S.pnl(t))}</td><td class="n">${rFmt(S.rMultiple(t))}</td></tr>`).join('')}</tbody></table>` : '<div class="faint" style="padding:0 18px 18px">No trades logged on this day.</div>'}
      </div>
    </div>
  </div>`;
}
function jEntry(k) { return S.state.journal[k] = S.state.journal[k] || {}; }
function renderJournalShots() {
  const el = document.getElementById('jShots'); if (!el) return;
  const k = ui.journalDay, list = (S.state.journal[k] || {}).screenshots || [];
  el.innerHTML = list.length ? shotsHtml(list, true) : '';
  el.querySelectorAll('[data-shot]').forEach(s => s.addEventListener('click', e => {
    if (e.target.closest('[data-delshot]')) return;
    lightbox(list.map(n => ({ src: n, caption: 'Journal ' + fmtDay(k), day: k })), +s.dataset.shot);
  }));
  el.querySelectorAll('[data-delshot]').forEach(b => b.addEventListener('click', async e => {
    e.stopPropagation();
    const i = +b.dataset.delshot, name = list[i];
    list.splice(i, 1); S.save(); S.deleteImage(name); renderJournalShots();
  }));
}
function flashSaved() {
  const el = document.getElementById('savedInd'); if (!el) return;
  el.innerHTML = `${ICON.check} Saved`; el.classList.add('on');
  clearTimeout(flashSaved._t); flashSaved._t = setTimeout(() => { el.textContent = 'Autosaves as you type'; el.classList.remove('on'); }, 1400);
}
