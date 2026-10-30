/* Tessra: Analytics, Playbook, Accounts, Gallery, Settings */

/* ===================== ANALYTICS ===================== */
function bkTable(groups, opt = {}) {
  const rows = groups.map(g => ({ ...g, s: S.summary(g.trades) })).filter(r => r.s.count || opt.keepEmpty);
  if (opt.sort !== false) rows.sort((a, b) => b.s.net - a.s.net);
  const max = Math.max(1, ...rows.map(r => Math.abs(r.s.net)));
  if (!rows.length) return '<div class="faint">Not enough data yet.</div>';
  return `<div class="bk"><div class="bk-row head"><div>${opt.label || 'Group'}</div><div>Net P&L</div><div class="r">Trades</div><div class="r">Win</div><div class="r">Net</div></div>
    ${rows.map(r => { const w = Math.abs(r.s.net) / max * 50; return `<div class="bk-row" ${r.action || ''}>
      <div class="bk-name">${r.color ? `<span class="dot" style="background:${r.color}"></span>` : ''}${esc(r.name)}</div>
      <div class="bk-bar"><div class="mid"></div><div class="fill" style="background:${r.s.net >= 0 ? 'var(--pos)' : 'var(--neg)'};${r.s.net >= 0 ? `left:50%;width:${w}%` : `left:${50 - w}%;width:${w}%`}"></div></div>
      <div class="r muted">${r.s.count}</div><div class="r">${r.s.count ? pct(r.s.winRate, 0) : '-'}</div><div class="r ${cls(r.s.net)}" style="font-weight:700">${money(r.s.net)}</div></div>`; }).join('')}</div>`;
}

function pageAnalytics() {
  const list = inRange(trades(), ui.anRange);
  const s = S.summary(list);
  const tabs = [['overview', 'Overview'], ['breakdown', 'Breakdown'], ['distribution', 'Distribution'], ['time', 'Time'], ['psychology', 'Psychology'], ['whatif', 'What-if Lab'], ['sim', 'Simulator']];
  const head = `<div class="between"><div class="tabs" style="flex:1">${tabs.map(([k, l]) => `<button data-action="an-tab" data-v="${k}" class="${ui.anTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div style="margin-bottom:18px;margin-left:16px">${seg('an-range', [['30d', '30D'], ['90d', '90D'], ['year', 'YTD'], ['all', 'All']], ui.anRange)}</div></div>`;
  if (ui.anTab === 'sim') return head + simulatorTab();
  if (!list.length) return head + `<div class="card"><div class="empty"><h3>No trades in this range</h3><div>Log some trades and come back to see your edge.</div></div></div>`;
  const dayMap = S.byDay(list), days = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  if (ui.anTab === 'whatif') return head + whatIfTab(list);

  if (ui.anTab === 'overview') {
    const cell = (k, v, c = '') => `<div class="stat-cell"><div class="k">${k}</div><div class="v ${c}">${v}</div></div>`;
    const green = days.filter(d => d.pnl > 0);
    later(() => {
      const eq = S.equity(list);
      Charts.line(document.getElementById('anEq'), [{ label: '', value: 0 }].concat(eq.map((e, i) => ({ label: fmtDay(S.dayOf(e.t), { weekday: undefined }), value: e.eq, tip: `Trade ${i + 1} · ${fmtDay(S.dayOf(e.t))}<br>${esc(e.t.symbol)} ${money(S.pnl(e.t))}<br><b>${money(e.eq)}</b>` }))), { height: 260 });
      Charts.line(document.getElementById('anDD'), [{ label: '', value: 0 }].concat(eq.map(e => ({ label: fmtDay(S.dayOf(e.t), { weekday: undefined }), value: e.dd }))), { height: 140, color: getComputedStyle(document.documentElement).getPropertyValue('--neg').trim(), fillTo: 'top' });
      Charts.bars(document.getElementById('anDaily'), days.map(d => ({ label: fmtDay(d.date, { weekday: undefined }), value: d.pnl, date: d.date, tip: `${fmtDay(d.date)}<br><b>${money(d.pnl)}</b> · ${d.trades.length} trades` })), { height: 200, onClick: it => openDay(it.date) });
      const months = {};
      list.forEach(t => { const m = S.dayOf(t).slice(0, 7); months[m] = (months[m] || 0) + S.pnl(t); });
      Charts.bars(document.getElementById('anMonthly'), Object.keys(months).sort().map(m => ({ label: MONTHS[+m.slice(5) - 1].slice(0, 3) + ' ' + m.slice(2, 4), value: months[m] })), { height: 200, labelWidth: 60 });
    });
    return head + `<div class="stat-grid">
        ${cell('Net P&L', money(s.net), cls(s.net))}${cell('Gross P&L', money(s.gross), cls(s.gross))}${cell('Total fees', money(-s.fees, false))}${cell('Trades', s.count)}
        ${cell('Win rate', pct(s.winRate))}${cell('Profit factor', pf(s.profitFactor), s.profitFactor >= 1 ? 'pos' : 'neg')}${cell('Expectancy', money(s.expectancy), cls(s.expectancy))}${cell('Avg R', rFmt(s.avgR), cls(s.avgR || 0))}
        ${cell('Avg win', money(s.avgWin), 'pos')}${cell('Avg loss', money(s.avgLoss), 'neg')}${cell('Payoff ratio', num(s.payoff) + 'x')}${cell('Max drawdown', money(s.maxDD), 'neg')}
        ${cell('Largest win', money(s.largestWin), 'pos')}${cell('Largest loss', money(s.largestLoss), 'neg')}${cell('Max win streak', s.maxWinStreak)}${cell('Max loss streak', s.maxLossStreak)}
        ${cell('Trading days', days.length)}${cell('Green days', days.length ? pct(green.length / days.length, 0) : '-')}${cell('Avg trades / day', num(s.count / Math.max(1, days.length), 1))}${cell('Avg day', money(s.net / Math.max(1, days.length)), cls(s.net))}
        ${cell('Long win rate', pct(s.longWinRate) + ` <span class="faint" style="font-size:12px">(${s.longs})</span>`)}${cell('Short win rate', pct(s.shortWinRate) + ` <span class="faint" style="font-size:12px">(${s.shorts})</span>`)}${cell('Avg hold time', fmtHold(s.avgHold))}${cell('Contracts traded', s.contracts)}
      </div>
      <div class="grid g-main mt">
        <div class="card"><div class="card-h"><div class="card-t">Equity curve <span class="sub">by trade</span></div></div><div id="anEq"></div>
          <div class="card-h mt" style="margin-bottom:6px"><div class="card-t">Drawdown</div></div><div id="anDD"></div></div>
        <div class="card"><div class="card-h"><div class="card-t">Monthly P&L</div></div><div id="anMonthly"></div>
          <div class="card-h mt"><div class="card-t">Win / loss split</div></div>
          <div class="ratio-bar" style="height:12px"><div style="width:${s.grossProfit / Math.max(1, s.grossProfit + Math.abs(s.grossLoss)) * 100}%"></div><div style="flex:1"></div></div>
          <div class="between kpi-meta"><span class="pos">${money(s.grossProfit)} won</span><span class="neg">${money(s.grossLoss)} lost</span></div></div>
      </div>
      <div class="card mt"><div class="card-h"><div class="card-t">Daily P&L <span class="sub">click a bar to open the day</span></div></div><div id="anDaily"></div></div>`;
  }

  if (ui.anTab === 'breakdown') {
    const st = S.state;
    const bySetup = st.setups.map(x => ({ name: x.name, color: x.color, trades: list.filter(t => t.setup === x.id), action: `data-action="setup-trades" data-id="${x.id}" style="cursor:pointer"` })).concat([{ name: 'No setup', color: 'var(--faint)', trades: list.filter(t => !t.setup) }]);
    const syms = [...new Set(list.map(t => S.rootOf(t.symbol)))].map(r => ({ name: r, trades: list.filter(t => S.rootOf(t.symbol) === r) }));
    const side = [{ name: 'Long', color: 'var(--pos)', trades: list.filter(t => t.side !== 'short') }, { name: 'Short', color: 'var(--neg)', trades: list.filter(t => t.side === 'short') }];
    const tags = st.tags.map(x => ({ name: x, trades: list.filter(t => (t.tags || []).includes(x)) }));
    const accs = st.accounts.map(a => ({ name: a.name, trades: inRange(S.state.trades.filter(t => t.accountId === a.id), ui.anRange) }));
    const qty = [...new Set(list.map(t => +t.qty))].sort((a, b) => a - b).map(q => ({ name: q + ' contract' + (q === 1 ? '' : 's'), trades: list.filter(t => +t.qty === q) }));
    return head + `<div class="grid g-2">
      <div class="card"><div class="card-h"><div class="card-t">By setup</div></div>${bkTable(bySetup, { label: 'Setup' })}</div>
      <div class="card"><div class="card-h"><div class="card-t">By symbol</div></div>${bkTable(syms, { label: 'Symbol' })}</div>
      <div class="card"><div class="card-h"><div class="card-t">Long vs short</div></div>${bkTable(side, { label: 'Side', sort: false })}</div>
      <div class="card"><div class="card-h"><div class="card-t">By position size</div></div>${bkTable(qty, { label: 'Size', sort: false })}</div>
      <div class="card"><div class="card-h"><div class="card-t">By tag</div></div>${bkTable(tags, { label: 'Tag' })}</div>
      <div class="card"><div class="card-h"><div class="card-t">By account</div></div>${bkTable(accs, { label: 'Account' })}</div>
    </div>`;
  }

  if (ui.anTab === 'time') {
    const ws = S.state.settings.weekStart || 0;
    const wd = [0, 1, 2, 3, 4, 5, 6].map(i => (i + ws) % 7).map(d => ({ name: DOW[d], trades: list.filter(t => parseKey(S.dayOf(t)).getDay() === d) }));
    const hours = {};
    list.forEach(t => { if (t.entryTime && t.entryTime.length > 12) { const h = +t.entryTime.slice(11, 13); (hours[h] = hours[h] || []).push(t); } });
    const hr = Object.keys(hours).map(Number).sort((a, b) => a - b).map(h => ({ name: `${String(h).padStart(2, '0')}:00`, trades: hours[h] }));
    const buckets = [[0, 5, 'Under 5m'], [5, 15, '5 to 15m'], [15, 30, '15 to 30m'], [30, 60, '30 to 60m'], [60, 120, '1 to 2h'], [120, 1e9, 'Over 2h']];
    const hold = buckets.map(([a, b, l]) => ({ name: l, trades: list.filter(t => { const m = S.holdMinutes(t); return m !== null && m >= a && m < b; }) }));
    const nth = {}; days.forEach(d => S.sortTrades(d.trades).forEach((t, i) => { const k = i >= 4 ? '5th+' : ['1st', '2nd', '3rd', '4th'][i]; (nth[k] = nth[k] || []).push(t); }));
    const nthG = ['1st', '2nd', '3rd', '4th', '5th+'].filter(k => nth[k]).map(k => ({ name: k + ' trade of day', trades: nth[k] }));
    later(() => {
      Charts.bars(document.getElementById('anHour'), hr.map(h => ({ label: h.name.slice(0, 2), value: h.trades.reduce((a, t) => a + S.pnl(t), 0), tip: `${h.name}<br><b>${money(h.trades.reduce((a, t) => a + S.pnl(t), 0))}</b> · ${h.trades.length} trades` })), { height: 200 });
    });
    return head + `<div class="card"><div class="card-h"><div class="card-t">P&L by entry hour <span class="sub">your local time</span></div></div><div id="anHour"></div></div>
      <div class="grid g-2 mt">
        <div class="card"><div class="card-h"><div class="card-t">By weekday</div></div>${bkTable(wd, { label: 'Day', sort: false })}</div>
        <div class="card"><div class="card-h"><div class="card-t">By hold time</div></div>${bkTable(hold, { label: 'Hold', sort: false })}</div>
        <div class="card"><div class="card-h"><div class="card-t">By hour</div></div>${bkTable(hr, { label: 'Hour', sort: false })}</div>
        <div class="card"><div class="card-h"><div class="card-t">Trade number in the day</div><span class="sub faint" style="font-size:12px">Does your edge fade?</span></div>${bkTable(nthG, { label: 'Trade', sort: false })}</div>
      </div>`;
  }

  if (ui.anTab === 'distribution') {
    const rs = list.map(S.rMultiple).filter(r => r !== null);
    const bins = []; for (let b = -3; b < 6; b += 0.5) bins.push(b);
    const rHist = bins.map(b => ({ b, n: rs.filter(r => (b === -3 ? r < -2.5 : r >= b && r < b + 0.5) || (b === 5.5 && r >= 6)).length }));
    const pnls = list.map(S.pnl);
    const step = Math.max(25, Math.ceil((Math.max(...pnls.map(Math.abs)) || 100) / 10 / 25) * 25);
    const lo = Math.floor(Math.min(0, ...pnls) / step) * step, hi = Math.ceil(Math.max(0, ...pnls) / step) * step;
    const pHist = []; for (let b = lo; b < hi; b += step) pHist.push({ b, n: pnls.filter(p => p >= b && p < b + step).length });
    const seq = S.sortTrades(list).slice(-120);
    const winners = list.filter(t => S.result(t) === 'win'), losers = list.filter(t => S.result(t) === 'loss');
    const avgPts = arr => { const p = arr.map(S.points).filter(x => x !== null); return p.length ? p.reduce((a, b) => a + b, 0) / p.length : null; };
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    later(() => {
      Charts.bars(document.getElementById('anR'), rHist.map(h => ({ label: (h.b === -3 ? '<' : '') + h.b.toFixed(1), value: h.n, color: h.b < 0 ? undefined : undefined, tip: `${h.b.toFixed(1)}R to ${(h.b + .5).toFixed(1)}R<br><b>${h.n} trades</b>` })).map((x, i) => ({ ...x, color: rHist[i].b < 0 ? getComputedStyle(document.documentElement).getPropertyValue('--neg').trim() : getComputedStyle(document.documentElement).getPropertyValue('--pos').trim() })), { height: 220, yfmt: v => Math.round(v) });
      Charts.bars(document.getElementById('anP'), pHist.map(h => ({ label: Charts.short$(h.b), value: h.n, color: h.b < 0 ? getComputedStyle(document.documentElement).getPropertyValue('--neg').trim() : getComputedStyle(document.documentElement).getPropertyValue('--pos').trim(), tip: `${money(h.b)} to ${money(h.b + step)}<br><b>${h.n} trades</b>` })), { height: 220, yfmt: v => Math.round(v), labelWidth: 50 });
      Charts.bars(document.getElementById('anSeq'), seq.map((t, i) => ({ label: String(i + 1), value: S.pnl(t), id: t.id, tip: `${fmtDay(S.dayOf(t))} · ${esc(t.symbol)}<br><b>${money(S.pnl(t))}</b> ${rFmt(S.rMultiple(t))}` })), { height: 200, onClick: it => openTradeDrawer(it.id), labelWidth: 40 });
    });
    return head + `<div class="grid g-2">
        <div class="card"><div class="card-h"><div class="card-t">R-multiple distribution <span class="sub">${rs.length} trades with a stop</span></div></div>${rs.length ? '<div id="anR"></div>' : '<div class="faint">Add stop prices to your trades to see R-multiples.</div>'}</div>
        <div class="card"><div class="card-h"><div class="card-t">P&L distribution</div></div><div id="anP"></div></div>
      </div>
      <div class="card mt"><div class="card-h"><div class="card-t">Trade by trade <span class="sub">last ${seq.length}, click to open</span></div></div><div id="anSeq"></div></div>
      <div class="grid g-2 mt">
        <div class="card"><div class="card-h"><div class="card-t">Winners</div><span class="chip pos">${winners.length}</span></div>
          <div class="stat-list"><div class="stat-row"><span class="k">Average</span><span class="v pos">${money(s.avgWin)}</span></div><div class="stat-row"><span class="k">Avg points captured</span><span class="v">${num(avgPts(winners))}</span></div><div class="stat-row"><span class="k">Avg hold</span><span class="v">${fmtHold(S.summary(winners).avgHold)}</span></div><div class="stat-row"><span class="k">Avg R</span><span class="v">${rFmt(S.summary(winners).avgR)}</span></div></div></div>
        <div class="card"><div class="card-h"><div class="card-t">Losers</div><span class="chip neg">${losers.length}</span></div>
          <div class="stat-list"><div class="stat-row"><span class="k">Average</span><span class="v neg">${money(s.avgLoss)}</span></div><div class="stat-row"><span class="k">Avg points given up</span><span class="v">${num(avgPts(losers))}</span></div><div class="stat-row"><span class="k">Avg hold</span><span class="v">${fmtHold(S.summary(losers).avgHold)}</span></div><div class="stat-row"><span class="k">Avg R</span><span class="v">${rFmt(S.summary(losers).avgR)}</span></div></div></div>
      </div>`;
  }

  // psychology
  const st = S.state;
  const mk = st.mistakes.map(m => ({ name: m, trades: list.filter(t => (t.mistakes || []).includes(m)), action: `data-action="mistake-trades" data-v="${esc(m)}" style="cursor:pointer"` }));
  const clean = list.filter(t => !(t.mistakes || []).length), dirty = list.filter(t => (t.mistakes || []).length);
  const cs = S.summary(clean), dsum = S.summary(dirty);
  const jd = k => st.journal[k] || {};
  const dayGroup = (field, vals, label) => vals.map(v => ({ name: label(v), trades: days.filter(d => String(jd(d.date)[field]) === String(v)).flatMap(d => d.trades) }));
  const rating = [5, 4, 3, 2, 1].map(r => ({ name: '★'.repeat(r), trades: list.filter(t => +t.rating === r) }));
  const rulesOk = list.filter(t => { const sp = setupById(t.setup); return sp && sp.rules.length && (t.rulesFollowed || []).length === sp.rules.length; });
  const rulesBroken = list.filter(t => { const sp = setupById(t.setup); return sp && sp.rules.length && (t.rulesFollowed || []).length < sp.rules.length; });
  return head + `<div class="grid g-3">
      <div class="card kpi"><div class="kpi-label">Cost of mistakes</div><div class="kpi-value ${cls(dsum.net)}">${money(dsum.net)}</div><div class="kpi-meta">${dirty.length} trades with at least one mistake</div></div>
      <div class="card kpi"><div class="kpi-label">Clean trades</div><div class="kpi-value ${cls(cs.net)}">${money(cs.net)}</div><div class="kpi-meta">${clean.length} trades · ${pct(cs.winRate, 0)} win · PF ${pf(cs.profitFactor)}</div></div>
      <div class="card kpi"><div class="kpi-label">Your P&L without mistakes</div><div class="kpi-value ${cls(cs.net)}">${money(cs.net)}</div><div class="kpi-meta">vs ${money(s.net)} actual, a ${money(cs.net - s.net)} difference</div></div>
    </div>
    <div class="grid g-2 mt">
      <div class="card"><div class="card-h"><div class="card-t">By mistake</div></div>${bkTable(mk, { label: 'Mistake' })}</div>
      <div class="card"><div class="card-h"><div class="card-t">Followed setup rules</div><span class="faint" style="font-size:12px">From the rule checklist on each trade</span></div>${bkTable([{ name: 'All rules checked', color: 'var(--pos)', trades: rulesOk }, { name: 'Broke a rule', color: 'var(--neg)', trades: rulesBroken }], { label: 'Rules', sort: false })}</div>
      <div class="card"><div class="card-h"><div class="card-t">By trade rating</div></div>${bkTable(rating, { label: 'Rating', sort: false })}</div>
      <div class="card"><div class="card-h"><div class="card-t">Followed the daily plan</div><span class="faint" style="font-size:12px">From the journal</span></div>${bkTable(dayGroup('followedPlan', ['Yes', 'Partly', 'No'], v => v), { label: 'Plan', sort: false })}</div>
      <div class="card"><div class="card-h"><div class="card-t">By mood going in</div></div>${bkTable(dayGroup('mood', [5, 4, 3, 2, 1], v => 'Mood ' + v), { label: 'Mood', sort: false })}</div>
      <div class="card"><div class="card-h"><div class="card-t">By discipline score</div></div>${bkTable(dayGroup('discipline', [5, 4, 3, 2, 1], v => 'Discipline ' + v), { label: 'Score', sort: false })}</div>
    </div>`;
}

/* ===================== PLAYBOOK ===================== */
function pagePlaybook() {
  const list = trades();
  const cards = S.state.setups.map(sp => {
    const ts = list.filter(t => t.setup === sp.id), s = S.summary(ts);
    later(() => { const el = document.getElementById('sp-' + sp.id); if (el && ts.length > 1) Charts.line(el, [{ value: 0 }].concat(S.equity(ts).map(e => ({ label: fmtDay(S.dayOf(e.t)), value: e.eq }))), { height: 54, mini: true }); });
    return `<div class="card setup-card" data-action="setup-trades" data-id="${sp.id}"><div class="bar-top" style="background:${sp.color}"></div>
      <div class="between"><div class="card-t" style="font-size:15px">${esc(sp.name)}</div><div class="row" style="gap:4px"><button class="btn icon ghost sm" data-action="edit-setup" data-id="${sp.id}" title="Edit">${ICON.edit}</button></div></div>
      <div class="muted" style="margin-top:6px;font-size:12.8px;min-height:36px">${esc(sp.description || '')}</div>
      <div class="kv mt"><div><div class="k">Net P&L</div><div class="v ${cls(s.net)}">${money(s.net)}</div></div><div><div class="k">Trades</div><div class="v">${s.count}</div></div>
        <div><div class="k">Win rate</div><div class="v">${s.count ? pct(s.winRate, 0) : '-'}</div></div><div><div class="k">Profit factor</div><div class="v">${s.count ? pf(s.profitFactor) : '-'}</div></div>
        <div><div class="k">Expectancy</div><div class="v ${cls(s.expectancy)}">${s.count ? money(s.expectancy) : '-'}</div></div><div><div class="k">Avg R</div><div class="v">${rFmt(s.avgR)}</div></div></div>
      <div id="sp-${sp.id}" style="margin-top:14px;height:54px">${ts.length > 1 ? '' : '<div class="faint" style="font-size:12px;padding-top:18px">Log trades with this setup to build its curve.</div>'}</div>
      ${sp.rules.length ? `<div class="seg-label mt">Entry rules</div><ul class="rules">${sp.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
    </div>`;
  }).join('');
  return `<div class="between" style="margin-bottom:16px"><div class="muted">Define your setups and their rules. Every trade can be tagged with a setup and checked against its rules.</div><button class="btn primary" data-action="new-setup">${ICON.plus}New setup</button></div>
    <div class="grid g-3">${cards || ''}</div>${!S.state.setups.length ? `<div class="card"><div class="empty"><h3>No setups yet</h3><div>Create your first setup to start tracking which strategies actually pay.</div></div></div>` : ''}`;
}

/* ===================== ACCOUNTS ===================== */
function pageAccounts() {
  const st = S.state;
  const spent = st.accounts.reduce((a, x) => a + Number(x.cost || 0), 0) + st.expenses.reduce((a, x) => a + Number(x.amount || 0), 0);
  const paid = st.payouts.reduce((a, x) => a + Number(S.hasNum(x.received) ? x.received : x.amount || 0), 0);
  const active = st.accounts.filter(a => a.status === 'active').length;
  const typeLbl = { eval: 'Evaluation', funded: 'Funded', live: 'Live', sim: 'Sim' };
  const statusChip = s => ({ active: '<span class="chip acc">Active</span>', passed: '<span class="chip pos">Passed</span>', failed: '<span class="chip neg">Failed</span>', archived: '<span class="chip">Archived</span>' }[s] || '');
  const cards = st.accounts.map(a => {
    const s = S.accountStatus(a), sum = S.summary(s.trades);
    const roomPct = a.maxDrawdown ? Math.max(0, Math.min(1, s.room / a.maxDrawdown)) : null;
    later(() => { const el = document.getElementById('ac-' + a.id); let b = Number(a.startBalance || 0); if (el && s.trades.length > 1) Charts.line(el, [{ value: b }].concat(s.trades.map(t => { b += S.pnl(t); return { label: fmtDay(S.dayOf(t)), value: b, tip: `${fmtDay(S.dayOf(t))}<br><b>${money(b, false)}</b>` }; })), { height: 60, mini: true, zero: false, fillTo: 'bottom', color: s.net >= 0 ? undefined : undefined }); });
    return `<div class="card acct-card">
      <div class="between"><div><div class="card-t" style="font-size:15px">${esc(a.name)}</div><div class="lr-sub">${esc(a.firm || '')}${a.firm ? ' · ' : ''}${typeLbl[a.type] || ''}</div></div><div class="row">${statusChip(a.status)}<button class="btn icon ghost sm" data-action="edit-account" data-id="${a.id}">${ICON.edit}</button></div></div>
      <div class="row mt" style="align-items:flex-end;gap:14px"><div class="big">${money(s.balance, false)}</div><div class="${cls(s.net)}" style="font-weight:700;margin-bottom:4px">${money(s.net)}</div></div>
      <div id="ac-${a.id}" style="height:60px;margin:10px 0 6px"></div>
      ${s.targetProgress !== null ? `<div class="between lr-sub" style="margin:10px 0 5px"><span>Profit target ${money0(a.profitTarget)}</span><span>${pct(s.targetProgress, 0)} · ${money0(s.toTarget)} to go</span></div><div class="progress pos"><div style="width:${s.targetProgress * 100}%"></div></div>` : ''}
      ${roomPct !== null ? `<div class="between lr-sub" style="margin:12px 0 5px"><span>Drawdown floor ${money0(s.threshold)} (${a.drawdownType === 'static' ? 'static' : a.drawdownType === 'eod' ? 'EOD trailing' : 'intraday trailing'})</span><span>${money0(s.room)} room</span></div><div class="progress ${roomPct < .35 ? 'neg' : roomPct < .6 ? 'warn' : ''}"><div style="width:${roomPct * 100}%"></div></div>` : ''}
      ${consistencyCardHtml(a)}
      ${payoutMiniHtml(a)}
      ${a.dailyLossLimit ? `<div class="between lr-sub" style="margin:12px 0 5px"><span>Today vs daily loss limit</span><span class="${cls(s.todayPnl)}">${money(s.todayPnl)} / -${money0(a.dailyLossLimit)}</span></div><div class="progress neg"><div style="width:${Math.min(100, Math.max(0, -s.todayPnl) / a.dailyLossLimit * 100)}%"></div></div>` : ''}
      <div class="kv mt"><div><div class="k">Trades</div><div class="v">${sum.count}</div></div><div><div class="k">Trading days</div><div class="v">${s.tradingDays}${a.minDays ? ' / ' + a.minDays : ''}</div></div>
        <div><div class="k">Win rate</div><div class="v">${sum.count ? pct(sum.winRate, 0) : '-'}</div></div><div><div class="k">Payouts</div><div class="v pos">${money0(s.paid)}</div></div></div>
      <div class="row mt"><button class="btn sm" data-action="account-trades" data-id="${a.id}">View trades</button><button class="btn sm" data-action="new-payout" data-id="${a.id}">${ICON.plus}Payout</button></div>
    </div>`;
  }).join('');
  const rows = [...st.payouts.map(p => ({ ...p, kind: 'payout' })), ...st.expenses.map(e => ({ ...e, kind: 'expense' })), ...st.accounts.filter(a => Number(a.cost)).map(a => ({ id: a.id, kind: 'account', date: a.createdAt || '', desc: a.name + ' purchase', amount: a.cost, accountId: a.id }))].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return `<div class="grid g-4">
      <div class="card kpi"><div class="kpi-label">Active accounts</div><div class="kpi-value">${active}</div><div class="kpi-meta">${st.accounts.length} total · ${st.accounts.filter(a => a.status === 'passed').length} passed · ${st.accounts.filter(a => a.status === 'failed').length} failed</div></div>
      <div class="card kpi"><div class="kpi-label">Total spent</div><div class="kpi-value neg">${money0(spent)}</div><div class="kpi-meta">Evals, resets, data, platforms</div></div>
      <div class="card kpi"><div class="kpi-label">Total payouts</div><div class="kpi-value pos">${money0(paid)}</div><div class="kpi-meta">${st.payouts.length} payout${st.payouts.length === 1 ? '' : 's'}</div></div>
      <div class="card kpi"><div class="kpi-label">Trading business net</div><div class="kpi-value ${cls(paid - spent)}">${money(paid - spent)}</div><div class="kpi-meta">${spent ? 'ROI ' + pct((paid - spent) / spent, 0) : 'Payouts minus costs'}</div></div>
    </div>
    <div class="between mt-l" style="margin-bottom:14px"><div class="card-t" style="font-size:15px">Accounts</div><button class="btn primary" data-action="new-account">${ICON.plus}New account</button></div>
    ${st.accounts.length ? `<div class="grid g-3">${cards}</div>${payoutPlannerHtml()}` : `<div class="card"><div class="empty"><h3>No accounts yet</h3><div>Add your Lucid eval, funded accounts or a personal account to track drawdown, targets and payouts.</div></div></div>`}
    <div class="card flush mt-l"><div class="card-flush-h between"><div class="card-t">Payouts and expenses</div><div class="row"><button class="btn sm" data-action="tax-records">${ICON.download}Tax records</button><button class="btn sm" data-action="new-expense">${ICON.plus}Expense</button><button class="btn sm" data-action="new-payout">${ICON.plus}Payout</button></div></div>
      ${rows.length ? `<table class="tbl"><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Account</th><th class="n">Amount</th><th></th></tr></thead><tbody>
      ${rows.map(r => `<tr style="cursor:default"><td>${r.date ? fmtDay(r.date) : '-'}</td><td>${r.kind === 'payout' ? '<span class="chip pos">Payout</span>' : '<span class="chip neg">Expense</span>'}</td><td>${esc(r.desc || (r.kind === 'payout' ? 'Payout' : ''))}</td><td class="muted">${esc((accountById(r.accountId) || {}).name || '-')}</td>
        <td class="n ${r.kind === 'payout' ? 'pos' : 'neg'}" style="font-weight:700">${r.kind === 'payout' ? '+' : '-'}${money0(r.kind === 'payout' && S.hasNum(r.received) ? r.received : r.amount)}${r.kind === 'payout' && S.hasNum(r.received) && +r.received !== +r.amount ? `<div class="lr-sub" style="font-weight:500">of ${money0(r.amount)} requested</div>` : ''}</td><td class="n">${r.kind !== 'account' ? `<button class="btn icon ghost sm" data-action="delete-${r.kind}" data-id="${r.id}">${ICON.trash}</button>` : '<span class="faint" style="font-size:11px">from account</span>'}</td></tr>`).join('')}
      </tbody></table>` : '<div class="faint" style="padding:0 18px 18px">Log eval fees, resets and payouts to see if your trading business is profitable.</div>'}
    </div>`;
}

/* ===================== GALLERY ===================== */
function galleryItems() {
  const out = [];
  for (const t of trades()) for (const n of (t.screenshots || [])) out.push({ src: n, date: S.dayOf(t), caption: `${fmtDay(S.dayOf(t))} · ${t.symbol} ${sideTagText(t.side)} ${money(S.pnl(t))}`, tradeId: t.id, pnl: S.pnl(t), kind: 'trade', symbol: t.symbol, setup: t.setup });
  for (const [k, j] of Object.entries(S.state.journal)) for (const n of (j.screenshots || [])) out.push({ src: n, date: k, caption: `${fmtDay(k)} · Journal`, day: k, kind: 'journal' });
  return out.sort((a, b) => b.date.localeCompare(a.date));
}
const sideTagText = s => s === 'short' ? 'short' : 'long';
function pageGallery() {
  let items = galleryItems();
  const f = ui.galleryFilter;
  if (f === 'trade') items = items.filter(i => i.kind === 'trade');
  if (f === 'journal') items = items.filter(i => i.kind === 'journal');
  if (f === 'win') items = items.filter(i => i.kind === 'trade' && i.pnl > 0);
  if (f === 'loss') items = items.filter(i => i.kind === 'trade' && i.pnl < 0);
  window._gallery = items;
  return `<div class="between" style="margin-bottom:16px"><div class="muted">${items.length} screenshot${items.length === 1 ? '' : 's'}. Add them from a trade or a journal day (drag, drop or paste).</div>
    ${seg('gallery-filter', [['all', 'All'], ['trade', 'Trades'], ['win', 'Winners'], ['loss', 'Losers'], ['journal', 'Journal']], f)}</div>
    ${items.length ? `<div class="gallery">${items.map((it, i) => `<div class="g-item" data-gal="${i}"><div class="img"><img src="${S.imageSrc(it.src)}" alt="" loading="lazy"></div>
      <div class="cap"><span>${esc(fmtDay(it.date))}${it.symbol ? ' · <b>' + esc(it.symbol) + '</b>' : ''}${it.setup ? ' <span class="faint">' + esc(setupName(it.setup)) + '</span>' : ''}</span>${it.kind === 'trade' ? `<b class="${cls(it.pnl)}">${money(it.pnl)}</b>` : '<span class="chip acc">Journal</span>'}</div></div>`).join('')}</div>`
      : `<div class="card"><div class="empty"><div class="ico">${ICON.gallery}</div><h3>No screenshots yet</h3><div>Open a trade or journal day and paste a chart screenshot with ${MOD}V.</div></div></div>`}`;
}

/* ===================== SETTINGS ===================== */
function pageSettings() {
  const st = S.state, g = st.goals;
  const gi = (k, l, hint) => `<div class="field"><label>${l}</label><input class="input" type="number" data-goal="${k}" value="${esc(g[k] ?? '')}"><span class="hint">${hint}</span></div>`;
  const chipEd = (listKey, cls2) => `<div class="row wrap" style="gap:6px">${st[listKey].map((t, i) => `<span class="chip ${cls2}">${esc(t)}<span class="x" data-action="del-list" data-list="${listKey}" data-i="${i}">✕</span></span>`).join('')}</div>
    <div class="row mt"><input class="input" placeholder="Add new..." data-newlist="${listKey}" style="width:220px"><button class="btn sm" data-action="add-list" data-list="${listKey}">${ICON.plus}Add</button></div>`;
  const info = S.info();
  later(() => {
    const z = document.getElementById('shareDrop'); if (!z) return;
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.style.display = 'none'; z.appendChild(inp);
    const add = async files => { const a = await Share.addBackgroundFiles(files); if (a.length) render(true); };
    z.addEventListener('click', e => { if (e.target !== inp) inp.click(); });
    inp.addEventListener('change', () => add(inp.files));
    z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('over'); });
    z.addEventListener('dragleave', () => z.classList.remove('over'));
    z.addEventListener('drop', e => { e.preventDefault(); z.classList.remove('over'); add(e.dataTransfer.files); });
  });
  return `<div class="card" style="padding:4px 24px">
    <div class="settings-sec"><div><h3>Profile</h3><p>How the app greets you.</p></div>
      <div class="grid g-3"><div class="field"><label>Your name</label><input class="input" data-setting="name" value="${esc(st.settings.name || '')}"></div>
        <div class="field"><label>Week starts on</label>${seg('week-start', [['0', 'Sunday'], ['1', 'Monday']], String(st.settings.weekStart || 0))}</div>
        <div class="field"><label>First-run setup</label><button class="btn" data-action="run-setup">${ICON.spark}Run setup again</button></div></div></div>
    ${appearanceSettingsHtml()}
    <div class="settings-sec"><div><h3>Risk rules</h3><p>Shown on the dashboard. You get warned as you approach them.</p></div>
      <div class="grid g-3">${gi('dailyMaxLoss', 'Daily max loss ($)', 'Stop trading for the day')}${gi('dailyTarget', 'Daily profit target ($)', 'Consider stopping when hit')}${gi('weeklyTarget', 'Weekly target ($)', 'Used for weekly progress')}
        ${gi('maxTradesPerDay', 'Max trades per day', 'Overtrading guard')}${gi('riskPerTrade', 'Planned risk per trade ($)', 'Reference for sizing')}</div></div>
    <div class="settings-sec"><div><h3>Daily lock</h3><p>When you hit a limit, the app tells you you're done for the day and tags any later trade "Traded after lock". Uses your risk rules above. Resets at midnight.</p></div>
      <div class="check-list">${(() => { const L = lockSettings(); return [['enabled', 'Turn on daily lock'], ['onLoss', `Lock at daily max loss (${g.dailyMaxLoss ? '-$' + g.dailyMaxLoss : 'not set'})`], ['onTarget', `Lock at daily profit target (${g.dailyTarget ? '+$' + g.dailyTarget : 'not set'})`], ['onMaxTrades', `Lock after max trades (${g.maxTradesPerDay || 'not set'})`]].map(([k, l]) => `<label><input type="checkbox" data-lock="${k}" ${L[k] ? 'checked' : ''}>${l}</label>`).join(''); })()}</div></div>
    ${checklistSettingsHtml()}
    ${menuBarSettingsHtml()}
    <div class="settings-sec"><div><h3>Copy trading</h3><p>Trades copied to several accounts are linked. Each account keeps its own balance, drawdown and payouts.</p></div>
      <div class="check-list"><label><input type="checkbox" data-setting-ck="countCopiesOnce" ${st.settings.countCopiesOnce !== false ? 'checked' : ''}>In "All accounts" view, count a copied trade once in stats (pick one account in the top filter to see that account's own numbers)</label></div></div>
    <div class="settings-sec"><div><h3>Tax records</h3><p>Yearly summary of payouts, your split, eval and data costs, and live account P&L. Export as PDF or CSV for your accountant.</p></div>
      <div><button class="btn" data-action="tax-records">${ICON.download}Open tax records</button></div></div>
    <div class="settings-sec"><div><h3>Contract specs</h3><p>Point value turns price moves into dollars. Fees are per contract, round trip (entry plus exit). Symbols like MNQZ6 match MNQ automatically.</p></div>
      <div><table class="tbl"><thead><tr><th>Root</th><th>Name</th><th class="n">$ per point</th><th class="n">Tick size</th><th class="n">Fees per contract RT</th><th></th></tr></thead><tbody>
        ${Object.entries(st.contracts).map(([k, c]) => `<tr style="cursor:default"><td class="sym">${esc(k)}</td><td><input class="input" data-contract="${esc(k)}" data-cf="name" value="${esc(c.name || '')}"></td>
          <td><input class="input" type="number" step="any" data-contract="${esc(k)}" data-cf="mult" value="${c.mult}" style="text-align:right"></td>
          <td><input class="input" type="number" step="any" data-contract="${esc(k)}" data-cf="tick" value="${c.tick}" style="text-align:right"></td>
          <td><input class="input" type="number" step="any" data-contract="${esc(k)}" data-cf="fee" value="${c.fee}" style="text-align:right"></td>
          <td class="n"><button class="btn icon ghost sm" data-action="del-contract" data-k="${esc(k)}">${ICON.trash}</button></td></tr>`).join('')}
      </tbody></table><div class="row mt"><input class="input" placeholder="Root e.g. MBT" id="newContract" style="width:160px"><button class="btn sm" data-action="add-contract">${ICON.plus}Add contract</button></div></div></div>
    <div class="settings-sec"><div><h3>Share cards</h3><p>Backgrounds for the Share button on trades and days. Upload images or GIFs (GIFs export as animated cards). Tag each as Wins, Losses or Any, and Auto will pick a matching one.</p></div>
      <div class="grid" style="gap:14px">
        <div class="share-lib" id="shareLib">
          ${st.share.backgrounds.map(b => `<div class="share-lib-item"><div class="img"><img src="${S.imageSrc(b.file)}" alt="">${b.kind === 'gif' ? '<i>GIF</i>' : ''}</div>
            <div class="row" style="gap:6px;padding:8px"><select class="select" data-share-use="${b.id}" style="flex:1;padding:5px 26px 5px 8px;font-size:12px">${[['any', 'Any trade'], ['win', 'Wins'], ['loss', 'Losses']].map(([v, l]) => `<option value="${v}" ${b.use === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
            <button class="btn icon ghost sm" data-action="del-share-bg" data-id="${b.id}" title="Remove">${ICON.trash}</button></div></div>`).join('')}
          <div class="drop share-drop" id="shareDrop">${ICON.plus}<div>Add images or GIFs</div><div class="faint" style="font-size:11px">click, drop, or paste</div></div>
        </div>
        <div class="row" style="gap:16px;align-items:center">
          <div class="avatar-prev">${st.share.avatar ? `<img src="${S.imageSrc(st.share.avatar)}" alt="">` : ICON.camera}</div>
          <div class="grid" style="gap:6px"><div class="lbl">Profile picture on cards</div><div class="row"><button class="btn sm" data-action="set-avatar">${ICON.upload}${st.share.avatar ? 'Change' : 'Upload'}</button>${st.share.avatar ? '<button class="btn sm ghost" data-action="clear-avatar">Remove</button>' : ''}</div></div>
          <div class="spacer"></div>
          <label class="row" style="gap:8px;cursor:pointer;font-size:13px"><input type="checkbox" data-share="verified" ${st.share.verified ? 'checked' : ''} style="accent-color:var(--accent)"> Show verified badge next to handle</label>
        </div>
        <div class="grid g-2"><div class="field"><label>Username on card</label><input class="input" data-share="handle" value="${esc(st.share.handle || '')}" placeholder="@yourhandle"></div>
          <div class="field"><label>Tagline on card</label><input class="input" data-share="tagline" value="${esc(st.share.tagline || '')}" placeholder="Patience pays"></div></div>
        <div class="hint faint" style="font-size:11.5px;margin-top:-6px">On Spotlight cards the handle sits next to your picture in the footer and the tagline shows bottom right (a website or catchphrase works well).</div>
        <div class="row wrap"><label class="row" style="gap:8px;cursor:pointer;font-size:13px"><input type="checkbox" data-share="hideDollars" ${st.share.hideDollars ? 'checked' : ''} style="accent-color:var(--accent)"> Always hide dollar amounts on cards</label><div class="spacer"></div><button class="btn sm" data-action="preview-share">${ICON.share}Preview with latest trade</button></div>
      </div></div>
    <div class="settings-sec"><div><h3>Tags</h3><p>Context labels you can put on any trade.</p></div><div>${chipEd('tags', 'acc')}</div></div>
    <div class="settings-sec"><div><h3>Mistakes</h3><p>Tag the errors so the app can show what they cost you.</p></div><div>${chipEd('mistakes', 'neg')}</div></div>
    <div class="settings-sec"><div><h3>Import trades</h3><p>Tradovate, NinjaTrader, Rithmic R|Trader, ProjectX / TopstepX, Quantower and Sierra Chart exports are recognized automatically. Any other CSV works too: match the columns once in the import window.</p></div>
      <div class="row"><button class="btn primary" data-action="import-csv">${ICON.upload}Import CSV</button><button class="btn" data-action="export-csv">${ICON.download}Export trades CSV</button></div></div>
    <div class="settings-sec"><div><h3>Data and backups</h3><p>Everything is stored locally on this computer. A daily backup is kept automatically (last 30 days).</p></div>
      <div class="grid" style="gap:12px"><div class="muted" style="font-size:12px">Data folder: <code>${esc(info.dataDir)}</code></div>
        <div class="row wrap"><button class="btn" data-action="export-backup">${ICON.download}Export full backup</button><button class="btn" data-action="import-backup">${ICON.upload}Restore backup</button>${window.edge ? `<button class="btn" data-action="open-data">${ICON.folder}Open data folder</button>` : ''}</div>
        <div class="row wrap"><button class="btn ghost" data-action="load-demo">${ICON.spark}Load demo data</button><button class="btn ghost" data-action="clear-demo">Remove demo data</button><button class="btn danger" data-action="wipe">${ICON.trash}Delete everything</button></div></div></div>
    <div class="settings-sec"><div><h3>Community and feedback</h3><p>Found a bug, or an import that doesn't work with your platform? Want a feature? Let me know.</p></div>
      <div class="row wrap">${DISCORD_URL ? `<a class="btn primary" href="${esc(DISCORD_URL)}" target="_blank" rel="noopener">Join the Discord</a>` : ''}<a class="btn" href="https://github.com/tatarigami22/tessra-journal/issues/new?labels=bug&title=Bug:%20" target="_blank" rel="noopener">${ICON.warn}Report a problem</a><a class="btn" href="https://github.com/tatarigami22/tessra-journal/issues/new?labels=enhancement&title=Feature%20request:%20" target="_blank" rel="noopener">${ICON.spark}Request a feature</a></div></div>
    <div class="settings-sec" style="border:0"><div><h3>Shortcuts</h3></div><div class="muted" style="font-size:12.8px;line-height:1.9"><code>${MOD}N</code> new trade &nbsp; <code>${MOD}1</code> to <code>${MOD}9</code> switch pages &nbsp; <code>${MOD}V</code> paste screenshot into an open trade or journal &nbsp; <code>Esc</code> close panel</div></div>
  </div>`;
}
