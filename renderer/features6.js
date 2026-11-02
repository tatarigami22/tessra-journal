/* Tessra 1.4.0: Session Copilot (today's game plan) and Payout Path (route to a payout date) */

/* ===================== PAYOUT PATH ===================== */
function tradingDaysBetween(fromKey, toKey) {
  // weekdays from fromKey to toKey, both included
  if (!toKey || toKey < fromKey) return 0;
  const d = parseKey(fromKey), end = parseKey(toKey); let n = 0;
  while (d <= end) { if (d.getDay() !== 0 && d.getDay() !== 6) n++; d.setDate(d.getDate() + 1); }
  return n;
}
function defaultPayoutGoal(p) {
  const d = new Date(); let left = Math.max(5, (p && p.remaining) || 0) + 2;
  while (left > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) left--; }
  return keyOf(d);
}
function payoutPath(acc) {
  const p = payoutStatus(acc); if (!p) return null;
  const r = p.rules, today = todayKey();
  const goal = acc.payoutGoal || defaultPayoutGoal(p);
  const tradedToday = S.state.trades.some(t => t.accountId === acc.id && S.dayOf(t) === today);
  const daysLeft = tradingDaysBetween(tradedToday ? keyOf(new Date(Date.now() + 864e5)) : today, goal);
  const needDays = p.remaining;
  const minDay = Number(r.minDayProfit || 0);
  // profit still needed: the full request if there is a cap, otherwise the minimum payout; plus anything the buffer needs
  const maxP = Number(r.maxPayout || 0), pctP = Number(r.payoutPct || 100) / 100, minP = Number(r.minPayout || 0);
  const base = r.base === 'total' ? p.profit : p.cycleNet;
  const wantPayout = maxP || minP;
  let needProfit = wantPayout ? Math.max(0, wantPayout / pctP - Math.max(0, base)) : 0;
  if (p.buffer) needProfit = Math.max(needProfit, (wantPayout || minP) - Math.max(0, p.aboveBuffer));
  needProfit = Math.max(0, Math.ceil(needProfit));
  const daysForMoney = Math.max(1, Math.min(daysLeft, Math.max(needDays, 1)));
  const aim = Math.max(minDay, needProfit && daysLeft ? needProfit / Math.max(1, daysLeft) : minDay);
  // consistency: biggest day that keeps the best day under the rule
  const cs = typeof consistencyStatus === 'function' ? consistencyStatus(acc) : null;
  const consPct = Number(r.consistencyPct || acc.consistencyPct || 0);
  let maxDay = null;
  if (consPct) { const total = Math.max(0, p.cycleNet) + needProfit; maxDay = Math.floor(Math.max(minDay, consPct / 100 * total)); if (cs && cs.ok && cs.cap > 0) maxDay = Math.max(minDay, Math.min(maxDay, Math.floor(cs.cap))); if (cs && !cs.ok) maxDay = Math.floor(cs.best); }
  const consFix = cs && !cs.ok && cs.total > 0 ? cs : null;
  const status = p.eligible ? 'ready' : daysLeft <= 0 ? 'late' : needDays > daysLeft ? 'behind' : 'on';
  const steps = [];
  if (p.eligible) steps.push(`You can request ${money0(p.cap)} now (you receive ${money0(p.capReceive)}).`);
  else {
    if (needDays > 0) steps.push(`${needDays} more profit day${needDays === 1 ? '' : 's'}${minDay ? ` of ${money0(minDay)} or more` : ''}`);
    if (needProfit > 0) steps.push(`about ${money0(needProfit)} more profit${maxP ? ` for the full ${money0(maxP)} request` : ''}, so aim for ~${money0(aim)} a day`);
    else if (minDay) steps.push(`aim for at least ${money0(minDay)} on each green day`);
    if (consFix) steps.push(`get back under the ${consFix.pct}% consistency rule: your best day (${money0(consFix.best)}) is too big a share, so make ${money0(consFix.needMore)} more with no day over ${money0(consFix.best)}`);
    else if (maxDay) steps.push(`keep any single day under ${money0(maxDay)} (${consPct}% consistency rule)`);
    if (p.buffer && p.aboveBuffer <= 0) steps.push(`clear the ${money0(p.bufferLine)} buffer first (${money0(-p.aboveBuffer)} to go)`);
  }
  return { acc, p, goal, daysLeft, needDays, needProfit, aim, maxDay, status, steps };
}
function payoutPathHtml(acc) {
  const pp = payoutPath(acc); if (!pp) return '';
  const chip = { ready: '<span class="chip pos">Ready</span>', on: '<span class="chip pos">On track</span>', behind: '<span class="chip warn">Behind</span>', late: '<span class="chip neg">Date passed</span>' }[pp.status];
  const note = pp.status === 'behind' ? `You need ${pp.needDays} profit days but only ${pp.daysLeft} trading day${pp.daysLeft === 1 ? '' : 's'} remain. Earliest realistic date: ${pp.p.eta ? fmtDay(keyOf(pp.p.eta)) : 'after more profit days'}.`
    : pp.status === 'late' ? 'Pick a new date.' : pp.status === 'ready' ? '' : `${pp.daysLeft} trading day${pp.daysLeft === 1 ? '' : 's'} left.`;
  return `<div class="ppath"><div class="between"><div class="lr-main" style="font-size:13px">${ICON.target} Payout Path</div>${chip}</div>
    <div class="row" style="gap:8px;margin-top:8px;align-items:center"><span class="lr-sub">Get paid by</span><input class="input sm" type="date" data-pp-date="${acc.id}" value="${pp.goal}" style="width:150px;height:30px;padding:3px 8px"></div>
    ${pp.steps.length ? `<ul class="ppath-steps">${pp.steps.map(s => `<li>${esc(s.charAt(0).toUpperCase() + s.slice(1))}</li>`).join('')}</ul>` : ''}
    ${note ? `<div class="lr-sub">${esc(note)}</div>` : ''}</div>`;
}
document.addEventListener('change', e => {
  const t = e.target; if (!t.dataset || !t.dataset.ppDate) return;
  const a = accountById(t.dataset.ppDate); if (!a) return;
  a.payoutGoal = t.value || ''; S.save(); render(true);
});

/* ===================== SESSION COPILOT ===================== */
function copilotPlan() {
  const st = S.state, g = st.goals, today = todayKey(), all = S.sortTrades(trades());
  const past = all.filter(t => S.dayOf(t) < today), todays = all.filter(t => S.dayOf(t) === today);
  const lines = []; const add = (tone, title, text) => lines.push({ tone, title, text });
  const enough = past.length >= 20;
  // 1. when your edge is
  if (enough) {
    const ss = TRADE_SESSIONS.map(s => ({ s, sum: S.summary(past.filter(t => sessionOf(t) === s)) })).filter(x => x.sum.count >= 8);
    const best = ss.slice().sort((a, b) => b.sum.expectancy - a.sum.expectancy)[0], worst = ss.slice().sort((a, b) => a.sum.expectancy - b.sum.expectancy)[0];
    if (best && best.sum.expectancy > 0) {
      const loc = localWindowLabel(best.s);
      add('pos', `Trade ${best.s.name}`, `${windowLabel(best.s)} New York${loc ? ` (${loc})` : ''}. It averages ${money(best.sum.expectancy)} a trade over ${best.sum.count} trades.`);
    }
    if (worst && worst !== best && worst.sum.expectancy < 0) add('neg', `Skip ${worst.s.name}`, `It averages ${money(worst.sum.expectancy)} a trade (${worst.sum.count} trades, ${money(worst.sum.net)} total).`);
  }
  // 2. how many trades
  let cap = Number(g.maxTradesPerDay) || null, capWhy = 'your rule';
  if (enough) {
    const days = Object.values(S.byDay(past)), nth = [[], [], [], []];
    days.forEach(d => S.sortTrades(d.trades).forEach((t, i) => nth[Math.min(3, i)].push(t)));
    for (let k = 1; k < 4; k++) {
      if (nth[k].length >= 6 && S.summary(nth[k]).expectancy < 0) { const c = k; if (!cap || c < cap) { cap = c; capWhy = `trade ${k + 1}${k === 3 ? ' and later' : ''} averages ${money(S.summary(nth[k]).expectancy)}`; } break; }
    }
  }
  if (cap) add(todays.length >= cap ? 'neg' : 'info', `Max ${cap} trade${cap === 1 ? '' : 's'} today`, todays.length ? `${todays.length} taken, ${Math.max(0, cap - todays.length)} left. ${capWhy.charAt(0).toUpperCase() + capWhy.slice(1)}.` : `${capWhy.charAt(0).toUpperCase() + capWhy.slice(1)}.`);
  // 3. yesterday and streaks
  const pdays = Object.values(S.byDay(past)).sort((a, b) => a.date.localeCompare(b.date));
  const last = pdays[pdays.length - 1];
  if (last) {
    let streak = 0; for (let i = pdays.length - 1; i >= 0 && pdays[i].pnl > 0; i--) streak++;
    if (last.pnl < 0) {
      const after = []; for (let i = 1; i < pdays.length; i++) if (pdays[i - 1].pnl < 0) after.push(pdays[i].pnl);
      const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length), all2 = avg(pdays.map(d => d.pnl));
      if (after.length >= 4 && avg(after) < all2 - 10) add('neg', 'Last session was red: size down', `Days after a red day average ${money(avg(after))}, vs ${money(all2)} normally. Smaller size, A+ setups only.`);
      else add('info', 'Last session was red', `${money(last.pnl)} on ${fmtDay(last.date)}. Fresh day, same plan. No revenge trades.`);
    } else if (streak >= 3) add('pos', `${streak}-day green streak`, 'Protect it: same size, same rules. Don\'t give it back trying to make it bigger.');
  }
  // 4. today's weekday
  if (enough) {
    const dow = parseKey(today).getDay();
    const wd = pdays.filter(d => parseKey(d.date).getDay() === dow);
    if (wd.length >= 4) { const avg = wd.reduce((a, d) => a + d.pnl, 0) / wd.length; if (avg < 0) add('neg', `${DOW[dow]}s are a weak day for you`, `They average ${money(avg)}. Be extra picky today.`); }
  }
  // 5. daily limits
  if (g.dailyMaxLoss || g.dailyTarget) {
    const net = todays.reduce((a, t) => a + S.pnl(t), 0);
    add(net <= -Number(g.dailyMaxLoss || Infinity) ? 'neg' : 'info', 'Daily limits', `${g.dailyMaxLoss ? `Stop at ${money0(-g.dailyMaxLoss, true)}` : ''}${g.dailyMaxLoss && g.dailyTarget ? '. ' : ''}${g.dailyTarget ? `Target ${money0(g.dailyTarget, true)}, then protect it` : ''}.${todays.length ? ` Today so far: ${money(net)}.` : ''}`);
  }
  // 6. accounts: consistency, drawdown room, payout path
  for (const a of st.accounts.filter(x => x.status === 'active')) {
    const bits = [];
    const c = typeof consistencyStatus === 'function' ? consistencyStatus(a) : null;
    if (c && c.total > 0) bits.push(c.ok ? `keep today under ${money0(c.cap)} for consistency` : `over the ${c.pct}% consistency rule, make ${money0(c.needMore)} more with no big day`);
    const s2 = S.accountStatus(a);
    if (Number(a.maxDrawdown)) bits.push(`${money0(s2.room)} of drawdown room`);
    const pp = a.payout && a.payout.enabled ? payoutPath(a) : null;
    if (pp) bits.push(pp.status === 'ready' ? `payout of ${money0(pp.p.cap)} ready` : pp.needDays ? `${pp.needDays} profit day${pp.needDays === 1 ? '' : 's'} to payout${pp.status === 'behind' ? ' (behind your date)' : ''}` : 'payout path on track');
    if (bits.length) add(c && !c.ok ? 'neg' : 'info', a.name, bits.join(' · ').replace(/^./, x => x.toUpperCase()) + '.');
    if (lines.length > 9) break;
  }
  // 7. the loudest edge alert
  try { const al = edgeAlerts().find(x => x.tone === 'neg'); if (al) add('neg', al.title, al.text); } catch (e) {}
  if (!enough) add('info', 'Copilot is learning', `It gets specific after 20 trades (you have ${past.length}). Until then it uses your Settings rules.`);
  const headline = lines.find(l => l.title.startsWith('Trade ')) ? lines.find(l => l.title.startsWith('Trade ')).title.replace('Trade ', '') + ' only' : null;
  return { lines, cap, headline, today };
}
function copilotHtml(compact) {
  if (S.state.settings.copilot === false) return '';
  const pl = copilotPlan(); if (!pl.lines.length) return '';
  const show = compact ? pl.lines.slice(0, 6) : pl.lines;
  return `<div class="card copilot ${compact ? '' : 'big'}"><div class="card-h"><div class="card-t">${ICON.spark} Today's game plan <span class="sub">${fmtDay(pl.today)} · from your own trades</span></div>${compact ? `<button class="btn sm ghost" data-action="copilot-open">Full plan</button>` : ''}</div>
    <div class="cp-list">${show.map(l => `<div class="cp-row ${l.tone}"><span class="dot"></span><div><b>${esc(l.title)}</b><div class="lr-sub">${esc(l.text)}</div></div></div>`).join('')}</div></div>`;
}
function openCopilot(auto) {
  const m = openModal(`<div class="modal-h"><h3>${auto ? 'Good ' + (new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening') + '. Here\'s your plan' : 'Today\'s game plan'}</h3><button class="btn icon ghost" data-close>${ICON.close}</button></div>
    <div class="modal-b">${copilotHtml(false)}</div>
    <div class="modal-f"><label class="row" style="gap:8px;font-size:12.5px;cursor:pointer"><input type="checkbox" data-cp-auto ${S.state.settings.copilotPopup !== false ? 'checked' : ''} style="accent-color:var(--accent)">Show this when I open Tessra each day</label><button class="btn primary" data-close>Let's trade</button></div>`, { size: 'sm' });
  m.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeModal(m));
  m.querySelector('[data-cp-auto]').onchange = e => { S.state.settings.copilotPopup = e.target.checked; S.save(); };
}
function maybeCopilotPopup() {
  const s = S.state.settings, today = todayKey();
  if (s.copilot === false || s.copilotPopup === false || s.copilotShown === today) return;
  if (!trades().length || document.querySelector('#modalRoot .overlay')) return;
  if (trades().some(t => S.dayOf(t) === today)) return; // already trading today
  s.copilotShown = today; S.save(); openCopilot(true);
}
function copilotMenuLine() {
  if (S.state.settings.copilot === false) return null;
  try { const pl = copilotPlan(); const bits = [pl.headline, pl.cap ? `max ${pl.cap} trades` : null].filter(Boolean); return bits.length ? 'Plan: ' + bits.join(', ') : null; } catch (e) { return null; }
}
function copilotSettingsHtml() {
  const s = S.state.settings;
  return `<div class="settings-sec"><div><h3>Session Copilot</h3><p>A daily game plan built from your own trades: your best session, how many trades to take, account limits and payout progress.</p></div>
    <div class="check-list"><label><input type="checkbox" data-cp-set="copilot" ${s.copilot !== false ? 'checked' : ''}>Show today's game plan on the dashboard</label><label><input type="checkbox" data-cp-set="copilotPopup" ${s.copilotPopup !== false ? 'checked' : ''}>Pop it up the first time I open Tessra each day</label></div></div>`;
}
document.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.cpSet) { S.state.settings[t.dataset.cpSet] = t.checked; S.save(); render(true); } });
