/* Tessra: sessions and killzones, A+/B/C trade grades, Trader DNA, payout celebration, Tessra Wrapped */

/* ===================== TRADE_SESSIONS AND KILLZONES ===================== */
// All windows are New York time (minutes after midnight), like futures traders and prop firms use.
const TRADE_SESSIONS = [
  { id: 'asia', name: 'Asia', from: 18 * 60, to: 2 * 60, color: '#8b7bff', word: 'Night Owl' },
  { id: 'london', name: 'London', from: 2 * 60, to: 7 * 60, color: '#3fb6ff', word: 'London' },
  { id: 'pre', name: 'NY pre-market', from: 7 * 60, to: 9 * 60 + 30, color: '#5ce1e6', word: 'Pre-Market' },
  { id: 'nyam', name: 'NY AM', from: 9 * 60 + 30, to: 11 * 60 + 30, color: '#22c98a', word: 'Morning' },
  { id: 'lunch', name: 'NY lunch', from: 11 * 60 + 30, to: 13 * 60 + 30, color: '#f5b84a', word: 'Lunch Hour' },
  { id: 'nypm', name: 'NY PM', from: 13 * 60 + 30, to: 16 * 60, color: '#ff8bd1', word: 'Power Hour' },
  { id: 'after', name: 'After hours', from: 16 * 60, to: 18 * 60, color: '#8d96a3', word: 'After Hours' }
];
const KILLZONES = [
  { id: 'kz-london', name: 'London killzone', from: 2 * 60, to: 5 * 60 },
  { id: 'kz-nyam', name: 'NY AM killzone', from: 7 * 60, to: 10 * 60 },
  { id: 'kz-nypm', name: 'NY PM killzone', from: 13 * 60 + 30, to: 16 * 60 }
];
const inWindow = (m, w) => w.from < w.to ? m >= w.from && m < w.to : m >= w.from || m < w.to;
const nyFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const nyCache = new Map();
// Entry time in New York minutes. Stored times are this computer's local time.
function nyMinutes(t) {
  const s = String((t && t.entryTime) || '');
  if (s.length < 16) return null;
  let v = nyCache.get(s);
  if (v === undefined) {
    const d = new Date(s);
    if (isNaN(d)) v = null;
    else { const p = {}; for (const x of nyFmt.formatToParts(d)) p[x.type] = x.value; v = (+p.hour % 24) * 60 + +p.minute; }
    if (nyCache.size > 50000) nyCache.clear();
    nyCache.set(s, v);
  }
  return v;
}
function sessionOf(t) { const m = nyMinutes(t); return m === null ? null : TRADE_SESSIONS.find(s => inWindow(m, s)) || null; }
function killzoneOf(t) { const m = nyMinutes(t); return m === null ? null : KILLZONES.find(k => inWindow(m, k)) || null; }
const sessionById = id => TRADE_SESSIONS.find(s => s.id === id);
const hm = m => { m = ((m % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60, ap = h < 12 ? 'AM' : 'PM'; return `${h % 12 || 12}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${ap}`; };
const windowLabel = w => `${hm(w.from)} to ${hm(w.to)}`;
// The same window in this computer's time, for people outside New York
function localWindowLabel(w) {
  const off = nyOffsetMinutes();
  if (off === 0) return '';
  return `${fmtClock(w.from + off)} to ${fmtClock(w.to + off)} your time`;
}
function nyOffsetMinutes() {
  const now = new Date(); now.setSeconds(0, 0);
  const p = {}; for (const x of nyFmt.formatToParts(now)) p[x.type] = x.value;
  let d = now.getHours() * 60 + now.getMinutes() - ((+p.hour % 24) * 60 + +p.minute);
  if (d > 720) d -= 1440; if (d < -720) d += 1440;
  return Math.round(d / 15) * 15;
}
const fmtClock = m => { m = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
function sessionChip(t, mini) {
  const s = sessionOf(t); if (!s) return mini ? '' : '<span class="faint">-</span>';
  const kz = killzoneOf(t);
  return `<span class="sess-chip${mini ? ' mini' : ''}" style="--c:${s.color}" title="${esc(s.name)} · ${esc(windowLabel(s))} New York${kz ? ' · ' + esc(kz.name) : ''}">${esc(s.name)}${kz ? '<i>KZ</i>' : ''}</span>`;
}
function sessionGroups(list) {
  return TRADE_SESSIONS.map(s => ({ name: s.name, color: s.color, trades: list.filter(t => sessionOf(t) === s) }));
}
function killzoneGroups(list) {
  return KILLZONES.map(k => ({ name: k.name.replace(' killzone', ''), trades: list.filter(t => killzoneOf(t) === k) }))
    .concat([{ name: 'Outside killzones', color: 'var(--faint)', trades: list.filter(t => nyMinutes(t) !== null && !killzoneOf(t)) }]);
}
function sessionsTimeHtml(list) {
  const off = nyOffsetMinutes();
  const legend = `<div class="hint" style="margin-top:10px">New York time: ${TRADE_SESSIONS.map(s => `${esc(s.name)} ${esc(windowLabel(s))}`).join(', ')}.${off ? ` NY AM is ${esc(localWindowLabel(sessionById('nyam')))}.` : ''}</div>`;
  const kzLegend = `<div class="hint" style="margin-top:10px">${KILLZONES.map(k => `${esc(k.name)} ${esc(windowLabel(k))}`).join(', ')}, New York time.</div>`;
  return `<div class="grid g-2 mt">
    <div class="card"><div class="card-h"><div class="card-t">By session</div><span class="sub faint" style="font-size:12px">entry time, New York</span></div>${bkTable(sessionGroups(list), { label: 'Session', sort: false })}${legend}</div>
    <div class="card"><div class="card-h"><div class="card-t">Killzones</div><span class="sub faint" style="font-size:12px">ICT windows</span></div>${bkTable(killzoneGroups(list), { label: 'Window', sort: false })}${kzLegend}</div>
  </div>`;
}

/* ===================== TRADE GRADES ===================== */
const GRADES = [
  { id: 'A+', color: '#b48cff', desc: 'Perfect setup, perfect execution' },
  { id: 'A', color: '#22c98a', desc: 'Good setup, small flaws' },
  { id: 'B', color: '#f5b84a', desc: 'Marginal, took it anyway' },
  { id: 'C', color: '#ff5d6c', desc: 'Should not have taken it' }
];
const gradeOf = id => GRADES.find(g => g.id === id);
const gradeChip = g => { const x = gradeOf(g); return x ? `<span class="grade-chip" style="--c:${x.color}">${esc(x.id)}</span>` : '<span class="faint">-</span>'; };
function gradeFieldHtml(d) {
  return `<div class="field s2"><label>Grade <span class="faint" style="font-weight:500">how good was this trade, win or lose?</span></label><div class="seg grade-seg" style="width:100%">${GRADES.map(g => `<button style="flex:1;--c:${g.color}" data-grade="${g.id}" title="${esc(g.desc)}" class="${d.grade === g.id ? 'on' : ''}">${g.id}</button>`).join('')}</div></div>`;
}
function wireGradeField(m, d) {
  m.querySelectorAll('[data-grade]').forEach(b => b.addEventListener('click', () => {
    d.grade = d.grade === b.dataset.grade ? '' : b.dataset.grade;
    m.querySelectorAll('[data-grade]').forEach(x => x.classList.toggle('on', x.dataset.grade === d.grade));
  }));
}
function sessionFieldHtml() {
  return `<div class="field s2"><label>Session <span class="faint" style="font-weight:500">from the entry time</span></label><div class="sess-auto" id="sessAuto"></div></div>`;
}
function updateSessionField(m, d) {
  const el = m.querySelector('#sessAuto'); if (!el) return;
  const s = sessionOf(d), kz = killzoneOf(d);
  el.innerHTML = s ? `${sessionChip(d)}<span class="faint">${esc(windowLabel(s))} New York${kz ? ' · ' + esc(kz.name) : ''}</span>` : '<span class="faint">Add an entry time</span>';
}
function gradeGroups(list) {
  return GRADES.map(g => ({ name: `${g.id}  ·  ${g.desc}`, color: g.color, trades: list.filter(t => t.grade === g.id) }))
    .concat([{ name: 'Not graded', color: 'var(--faint)', trades: list.filter(t => !gradeOf(t.grade)) }]);
}
function gradeBreakdownHtml(list) {
  const graded = list.filter(t => gradeOf(t.grade));
  const a = S.summary(list.filter(t => t.grade === 'A+' || t.grade === 'A')), bc = S.summary(list.filter(t => t.grade === 'B' || t.grade === 'C'));
  const note = graded.length < 5
    ? '<div class="hint" style="margin-top:10px">Grade your trades A+ to C in the trade form. After a few weeks this shows whether your B and C trades are the leak.</div>'
    : `<div class="hint" style="margin-top:10px">A and A+ trades average <b class="${cls(a.expectancy)}">${money(a.expectancy)}</b>, B and C trades average <b class="${cls(bc.expectancy)}">${money(bc.expectancy)}</b>.${bc.count && bc.net < 0 ? ` Skipping B and C trades would have saved ${money0(-bc.net)}.` : ''}</div>`;
  return `<div class="card"><div class="card-h"><div class="card-t">By grade</div></div>${bkTable(gradeGroups(list), { label: 'Grade', sort: false })}${note}</div>`;
}

/* ===================== TRADER DNA ===================== */
const DNA_STYLES = {
  'Machine Gunner': 'Always in the market. Volume is your edge, or your problem.',
  Scalper: 'In and out before most people finish reading the tape.',
  Sniper: 'Few shots, most of them land.',
  'Home Run Hitter': 'You lose small and often, then one runner pays for the week.',
  'Patient Hunter': 'You sit through the noise and let trades breathe.',
  Grinder: 'Small edge, lots of reps. It adds up.',
  Strategist: 'Balanced and steady. No single habit runs the show.'
};
function traderDNA(list) {
  const ts = S.sortTrades(list), s = S.summary(ts);
  const days = Object.values(S.byDay(ts));
  const out = { enough: ts.length >= 20, count: ts.length, s, insights: [] };
  if (!ts.length) return out;
  const tpd = ts.length / Math.max(1, days.length);
  const wr = s.winRate, pay = s.payoff, hold = s.avgHold;
  let style = 'Strategist';
  if (tpd >= 6) style = 'Machine Gunner';
  else if (hold !== null && hold < 4) style = 'Scalper';
  else if (wr >= 0.6) style = 'Sniper';
  else if (wr < 0.45 && pay >= 1.8) style = 'Home Run Hitter';
  else if (hold !== null && hold >= 60) style = 'Patient Hunter';
  else if (s.profitFactor >= 1 && s.profitFactor < 1.4 && ts.length >= 60) style = 'Grinder';
  const sess = TRADE_SESSIONS.map(x => ({ x, ts: ts.filter(t => sessionOf(t) === x) })).map(g => ({ ...g, net: g.ts.reduce((a, t) => a + S.pnl(t), 0) })).filter(g => g.ts.length);
  const byTrades = sess.slice().sort((a, b) => b.ts.length - a.ts.length)[0];
  const byNet = sess.slice().sort((a, b) => b.net - a.net)[0];
  const home = byNet && byNet.net > 0 ? byNet : byTrades;
  out.style = style; out.tagline = DNA_STYLES[style];
  out.session = home ? home.x : null;
  out.name = (home ? home.x.word + ' ' : '') + style;
  out.tradesPerDay = tpd;
  const sp = S.state.setups.map(x => ({ x, s: S.summary(ts.filter(t => t.setup === x.id)) })).filter(z => z.s.count >= 3).sort((a, b) => b.s.net - a.s.net)[0];
  out.topSetup = sp ? sp.x : null;
  const ins = [];
  const add = (score, text, tone = 'info') => ins.push({ score, text, tone, money: /\$/.test(text) });
  const totalPos = sess.filter(g => g.net > 0).reduce((a, g) => a + g.net, 0);
  if (byNet && byNet.net > 0 && totalPos > 0 && sess.length > 1) {
    const share = byNet.net / totalPos;
    add(share, `${Math.round(share * 100)}% of your profit comes from ${byNet.x.name} (${windowLabel(byNet.x)} New York).`, 'pos');
  }
  const leak = sess.slice().sort((a, b) => a.net - b.net)[0];
  if (leak && leak.net < 0 && leak.ts.length >= 3) add(0.6 + Math.min(0.4, Math.abs(leak.net) / Math.max(1, Math.abs(s.net) + Math.abs(leak.net))), `${leak.x.name} is your leak: ${money(leak.net)} over ${leak.ts.length} trades.`, 'neg');
  const nth = { first: [], later: [] };
  days.forEach(d => S.sortTrades(d.trades).forEach((t, i) => (i === 0 ? nth.first : i >= 2 ? nth.later : []).push(t)));
  if (nth.first.length >= 8 && nth.later.length >= 8) {
    const a = S.summary(nth.first).winRate, b = S.summary(nth.later).winRate;
    if (a - b >= 0.12) add(0.5 + (a - b), `Your first trade of the day wins ${pct(a, 0)}. From trade 3 on it drops to ${pct(b, 0)}.`, 'neg');
  }
  const afterLoss = [];
  days.forEach(d => { const arr = S.sortTrades(d.trades); for (let i = 1; i < arr.length; i++) if (S.result(arr[i - 1]) === 'loss') afterLoss.push(arr[i]); });
  if (afterLoss.length >= 8) {
    const a = S.summary(afterLoss);
    if (wr - a.winRate >= 0.1) add(0.55 + (wr - a.winRate), `Right after a loss your next trade wins only ${pct(a.winRate, 0)}${a.net < 0 ? `, and those trades lose ${money0(-a.net)}` : ''}. Walk away more.`, 'neg');
  }
  const gA = S.summary(ts.filter(t => t.grade === 'A+')), gC = S.summary(ts.filter(t => t.grade === 'C'));
  if (gA.count >= 4 && gC.count >= 4) add(0.7, `Your A+ trades average ${money(gA.expectancy)}. Your C trades average ${money(gC.expectancy)}.`, gA.expectancy > gC.expectancy ? 'pos' : 'neg');
  const win = ts.filter(t => S.result(t) === 'win'), loss = ts.filter(t => S.result(t) === 'loss');
  const hW = S.summary(win).avgHold, hL = S.summary(loss).avgHold;
  if (hW && hL && win.length >= 5 && loss.length >= 5 && hL > hW * 1.3) add(0.45 + Math.min(0.4, hL / hW / 10), `You hold losers ${num(hL / hW, 1)}x longer than winners (${fmtHold(hL)} vs ${fmtHold(hW)}).`, 'neg');
  const wd = [1, 2, 3, 4, 5].map(i => ({ i, s: S.summary(ts.filter(t => parseKey(S.dayOf(t)).getDay() === i)) })).filter(x => x.s.count >= 4);
  if (wd.length >= 3) {
    const best = wd.slice().sort((a, b) => b.s.net - a.s.net)[0], worst = wd.slice().sort((a, b) => a.s.net - b.s.net)[0];
    if (worst.s.net < 0) add(0.35, `${DOW[worst.i]}s are your worst day (${money(worst.s.net)}). ${DOW[best.i]}s are your best (${money(best.s.net)}).`, 'neg');
  }
  if (s.longs >= 8 && s.shorts >= 8 && Math.abs(s.longWinRate - s.shortWinRate) >= 0.12) {
    const longer = s.longWinRate > s.shortWinRate;
    add(0.3 + Math.abs(s.longWinRate - s.shortWinRate), `You're a better ${longer ? 'buyer' : 'seller'}: ${pct(longer ? s.longWinRate : s.shortWinRate, 0)} win rate ${longer ? 'long' : 'short'} vs ${pct(longer ? s.shortWinRate : s.longWinRate, 0)} ${longer ? 'short' : 'long'}.`);
  }
  const mis = ts.filter(t => (t.mistakes || []).length), misNet = mis.reduce((a, t) => a + S.pnl(t), 0);
  if (mis.length >= 3 && misNet < 0) add(0.4 + Math.min(0.3, Math.abs(misNet) / Math.max(1, Math.abs(s.net) + Math.abs(misNet))), `Trades with a mistake tagged cost you ${money(-misNet, false)}.`, 'neg');
  out.insights = ins.sort((a, b) => b.score - a.score).slice(0, 4);
  return out;
}

function dnaTab(list) {
  const d = traderDNA(list);
  if (!d.count) return `<div class="card"><div class="empty"><h3>No trades in this range</h3></div></div>`;
  const s = d.s;
  const cell = (k, v, c = '') => `<div class="stat-cell"><div class="k">${k}</div><div class="v ${c}">${v}</div></div>`;
  return `<div class="dna-hero card">
      <div class="dna-kicker">YOUR TRADER DNA${d.enough ? '' : ' · EARLY READ'}</div>
      <div class="dna-name">${esc(d.name)}</div>
      <div class="dna-tag">${esc(d.tagline)}</div>
      ${d.enough ? '' : `<div class="hint" style="margin-top:8px">Based on ${d.count} trades. It gets sharper after 20 or more.</div>`}
      <div class="row mt"><button class="btn primary" data-action="share-dna">${ICON.share}Share my DNA card</button></div>
    </div>
    <div class="grid g-main mt">
      <div class="card"><div class="card-h"><div class="card-t">What your trades say</div></div>
        ${d.insights.length ? `<div class="dna-list">${d.insights.map(x => `<div class="dna-ins ${x.tone}"><span class="dot"></span><div>${esc(x.text)}</div></div>`).join('')}</div>` : '<div class="faint">Not enough patterns yet. Keep logging.</div>'}</div>
      <div class="card"><div class="card-h"><div class="card-t">Your numbers</div></div>
        <div class="stat-grid" style="grid-template-columns:repeat(2,1fr)">
          ${cell('Home session', d.session ? esc(d.session.name) : '-')}${cell('Win rate', pct(s.winRate, 0))}
          ${cell('Payoff ratio', num(s.payoff) + 'x')}${cell('Avg hold', fmtHold(s.avgHold))}
          ${cell('Trades per day', num(d.tradesPerDay, 1))}${cell('Top setup', d.topSetup ? esc(d.topSetup.name) : '-')}
        </div></div>
    </div>`;
}

/* ===================== SHARE CARDS: PAYOUT + DNA ===================== */
const sgnUsd = n => (n > 0 ? '+' : n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const plainUsd = n => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const payoutReceived = p => Number(S.hasNum(p.received) ? p.received : p.amount || 0);
function payoutNumber(p) {
  const all = S.state.payouts.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)));
  return all.findIndex(x => x.id === p.id) + 1;
}
function payoutCardData(id, o) {
  const p = S.state.payouts.find(x => x.id === id);
  if (!p) throw new Error('That payout was deleted');
  const acc = accountById(p.accountId), n = payoutNumber(p), got = payoutReceived(p);
  const total = S.state.payouts.reduce((a, x) => a + payoutReceived(x), 0);
  const accPays = acc ? S.state.payouts.filter(x => x.accountId === acc.id).length : 0;
  const date = p.date ? parseKey(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : '';
  const stats = o.hideDollars
    ? [{ k: 'PAYOUT', v: '#' + n }, { k: 'ACCOUNT', v: acc ? acc.name : '-' }, { k: 'FIRM', v: (acc && acc.firm) || '-' }, { k: 'FROM THIS ACCOUNT', v: String(accPays || 1) }]
    : [{ k: 'PAYOUT', v: '#' + n }, { k: 'ACCOUNT', v: acc ? acc.name : '-' }, { k: 'LIFETIME PAYOUTS', v: plainUsd(total) }, { k: 'SPLIT', v: (S.hasNum(p.split) ? p.split : 100) + '%' }];
  return {
    kind: 'payout', seed: 'payout' + p.id, result: 'win', title: 'PAYOUT',
    subtitle: [acc && acc.firm ? acc.firm.toUpperCase() : '', date].filter(Boolean).join(' · '),
    chips: [{ t: 'PAYOUT #' + n, c: '#f5c542' }],
    headline: o.hideDollars ? 'PAID' : sgnUsd(got), headNum: o.hideDollars ? null : got, headFmt: sgnUsd,
    sub: o.hideDollars ? `Payout #${n}` : [`${S.state.payouts.length} payout${S.state.payouts.length === 1 ? '' : 's'} so far`, `${plainUsd(total)} lifetime`].join('   ·   '),
    stats, meta: [p.desc, acc ? acc.name : ''].filter(Boolean).join('  ·  ')
  };
}
function dnaCardData(range, o) {
  const d = traderDNA(inRange(trades(), range || 'all'));
  if (!d.count) throw new Error('No trades to read your DNA from yet');
  const line = d.insights.find(x => !o.hideDollars || !x.money);
  return {
    kind: 'dna', seed: 'dna' + d.name, result: d.s.net >= 0 ? 'win' : 'loss', title: 'TRADER DNA',
    subtitle: `${d.count} TRADES`, chips: [{ t: 'TRADER DNA', c: '#a597ff' }],
    headline: d.name, headNum: null, sub: d.tagline,
    stats: [{ k: 'HOME SESSION', v: d.session ? d.session.name : '-' }, { k: 'WIN RATE', v: pct(d.s.winRate, 0) }, { k: 'AVG HOLD', v: fmtHold(d.s.avgHold) }, { k: 'TOP SETUP', v: d.topSetup ? d.topSetup.name : '-' }],
    meta: line ? line.text : ''
  };
}
if (typeof Share !== 'undefined' && Share.register) {
  Share.register('payout', { title: 'payout', data: payoutCardData, fname: id => 'payout-' + payoutNumber(S.state.payouts.find(x => x.id === id) || {}) });
  Share.register('dna', { title: 'Trader DNA', data: dnaCardData, fname: () => 'trader-dna' });
}

/* ===================== CONFETTI + PAYOUT CELEBRATION ===================== */
function confetti(ms = 2600) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.className = 'confetti';
  const W = c.width = innerWidth, H = c.height = innerHeight; document.body.appendChild(c);
  const g = c.getContext('2d'), cols = ['#2ef0a4', '#f5c542', '#8b7bff', '#ff8bd1', '#3fb6ff', '#ffffff'];
  const ps = Array.from({ length: 170 }, (_, i) => ({ x: W / 2 + (Math.random() - .5) * 120, y: H * 0.42, vx: (Math.random() - .5) * 17, vy: -Math.random() * 15 - 5, r: 4 + Math.random() * 6, a: Math.random() * 6, va: (Math.random() - .5) * .35, c: cols[i % cols.length] }));
  const t0 = performance.now();
  const step = now => {
    const t = now - t0; g.clearRect(0, 0, W, H);
    for (const p of ps) { p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; g.save(); g.globalAlpha = Math.max(0, 1 - t / ms); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore(); }
    if (t < ms) requestAnimationFrame(step); else c.remove();
  };
  requestAnimationFrame(step);
}
function celebratePayout(p) {
  const n = payoutNumber(p), got = payoutReceived(p), acc = accountById(p.accountId);
  const total = S.state.payouts.reduce((a, x) => a + payoutReceived(x), 0);
  const ord = n === 1 ? 'first' : n === 2 ? 'second' : n === 3 ? 'third' : n + 'th';
  confetti();
  const m = openModal(`<div class="payday">
      <div class="payday-kicker">PAYOUT #${n}</div>
      <div class="payday-amt">${money(got)}</div>
      <div class="payday-sub">${n === 1 ? 'Your first payout. This is the one people remember.' : `Your ${ord} payout${acc ? ' from ' + esc(acc.name) : ''}.`}</div>
      <div class="payday-total">${money0(total)} paid out in total</div>
      <div class="row" style="justify-content:center;gap:10px;margin-top:22px"><button class="btn" data-x>Done</button><button class="btn primary" data-share>${ICON.share}Share payout card</button></div>
    </div>`, { size: 'sm' });
  m.querySelector('[data-x]').onclick = () => closeModal(m);
  m.querySelector('[data-share]').onclick = () => { closeModal(m); Share.open('payout', p.id); };
}

/* ===================== TESSRA WRAPPED ===================== */
function longestGreenStreak(dayList) {
  let best = { n: 0 }, cur = { n: 0 };
  for (const d of dayList) {
    if (d.pnl > 0) { cur = cur.n ? { n: cur.n + 1, from: cur.from, to: d.date } : { n: 1, from: d.date, to: d.date }; if (cur.n > best.n) best = { ...cur }; }
    else cur = { n: 0 };
  }
  return best;
}
function wrappedYears() { return [...new Set(trades().map(t => S.dayOf(t).slice(0, 4)).filter(Boolean))].sort().reverse(); }
function wrappedSlides(year, hide) {
  const ts = S.sortTrades(trades().filter(t => S.dayOf(t).startsWith(year)));
  const s = S.summary(ts);
  const days = Object.values(S.byDay(ts)).sort((a, b) => a.date.localeCompare(b.date));
  const M = n => hide ? null : n;
  const R = n => n === null || n === undefined ? '' : (n > 0 ? '+' : '') + n.toFixed(1) + 'R';
  const who = (S.state.share.handle || S.state.settings.name || '').trim();
  const out = [];
  const md = k => parseKey(k).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  out.push({ kind: 'intro', kick: 'TESSRA WRAPPED', big: year, sub: `Your ${year} in trading`, foot: who ? `for ${who}` : '', pal: 0 });
  out.push({ kind: 'total', kick: 'THE BOTTOM LINE', num: M(s.net), big: hide ? (s.rCount ? R(s.rSum) : `${s.count} trades`) : null, sub: `${s.count.toLocaleString()} trades · ${days.length} trading days · ${s.contracts.toLocaleString()} contracts`, tone: s.net >= 0 ? 'pos' : 'neg', pal: 1 });
  out.push({ kind: 'rate', kick: 'HIT RATE', big: pct(s.winRate, 0), sub: `${s.wins} winners, ${s.losses} losers · profit factor ${pf(s.profitFactor)}`, pal: 2 });
  const best = days.slice().sort((a, b) => b.pnl - a.pnl)[0];
  if (best && best.pnl > 0) {
    const br = best.trades.reduce((a, t) => a + (S.rMultiple(t) || 0), 0);
    out.push({ kind: 'best', kick: 'YOUR BEST DAY', num: M(best.pnl), big: hide ? (br ? R(br) : md(best.date)) : null, sub: `${fmtLongDay(best.date)} · ${best.trades.length} trade${best.trades.length === 1 ? '' : 's'}`, tone: 'pos', pal: 3 });
  }
  const st = longestGreenStreak(days);
  if (st.n >= 2) out.push({ kind: 'streak', kick: 'LONGEST GREEN STREAK', big: `${st.n} days`, sub: `${md(st.from)} to ${md(st.to)}, green every trading day`, pal: 4 });
  const sp = S.state.setups.map(x => ({ x, s: S.summary(ts.filter(t => t.setup === x.id)) })).filter(z => z.s.count >= 3).sort((a, b) => b.s.net - a.s.net)[0];
  if (sp && sp.s.net > 0) out.push({ kind: 'setup', kick: 'YOUR MONEY SETUP', big: sp.x.name, sub: `${hide ? (sp.s.rCount ? R(sp.s.rSum) : '') : money(sp.s.net)}${hide && !sp.s.rCount ? '' : ' · '}${pct(sp.s.winRate, 0)} win rate · ${sp.s.count} trades`, pal: 5 });
  const sess = TRADE_SESSIONS.map(x => ({ x, net: ts.filter(t => sessionOf(t) === x).reduce((a, t) => a + S.pnl(t), 0), n: ts.filter(t => sessionOf(t) === x).length })).filter(g => g.n);
  const posTot = sess.filter(g => g.net > 0).reduce((a, g) => a + g.net, 0), top = sess.slice().sort((a, b) => b.net - a.net)[0];
  if (top && top.net > 0 && sess.length) out.push({ kind: 'session', kick: 'YOU PRINT IN', big: top.x.name, sub: `${Math.round(top.net / posTot * 100)}% of your profit · ${windowLabel(top.x)} New York`, pal: 6 });
  const gA = S.summary(ts.filter(t => t.grade === 'A+')), gC = S.summary(ts.filter(t => t.grade === 'C'));
  if (gA.count >= 3 && gC.count >= 3) out.push({ kind: 'grade', kick: 'A+ VS C TRADES', big: hide ? `${pct(gA.winRate, 0)} vs ${pct(gC.winRate, 0)}` : `${money0(gA.expectancy, true)} vs ${money0(gC.expectancy, true)}`, sub: hide ? 'Win rate on your A+ trades vs your C trades' : 'Average per trade. Your A+ trades vs your C trades.', pal: 7 });
  const mis = {}; ts.forEach(t => (t.mistakes || []).forEach(x => { mis[x] = (mis[x] || 0) + S.pnl(t); }));
  const worstMis = Object.entries(mis).sort((a, b) => a[1] - b[1])[0];
  const misTotal = ts.filter(t => (t.mistakes || []).length).reduce((a, t) => a + S.pnl(t), 0);
  if (worstMis && worstMis[1] < 0) out.push({ kind: 'leak', kick: 'THE LEAK', num: M(misTotal), big: hide ? worstMis[0] : null, sub: hide ? 'Your most expensive mistake this year' : `Trades with a mistake tagged. The worst: ${worstMis[0]} (${money0(worstMis[1])})`, tone: 'neg', pal: 8 });
  const pays = S.state.payouts.filter(p => String(p.date).startsWith(year) && (ui.account === 'all' || p.accountId === ui.account));
  if (pays.length) { const got = pays.reduce((a, p) => a + payoutReceived(p), 0); out.push({ kind: 'payouts', kick: 'PAID OUT', num: M(got), big: hide ? `${pays.length} payout${pays.length === 1 ? '' : 's'}` : null, sub: `${pays.length} payout${pays.length === 1 ? '' : 's'} hit your bank this year`, tone: 'gold', pal: 9 }); }
  const dna = traderDNA(ts);
  if (dna.count) out.push({ kind: 'dna', kick: 'YOUR TRADER DNA', big: dna.name, sub: dna.tagline, pal: 10 });
  out.push({ kind: 'outro', kick: `${year} WRAPPED`, grid: [
    ['Net P&L', hide ? (s.rCount ? R(s.rSum) : '-') : money0(s.net, true)], ['Trades', s.count.toLocaleString()], ['Win rate', pct(s.winRate, 0)],
    ['Best day', best && best.pnl > 0 ? (hide ? md(best.date) : money0(best.pnl, true)) : '-'], ['Top setup', sp ? sp.x.name : '-'], ['Trader type', dna.name || '-']
  ], foot: who, pal: 11 });
  return { slides: out, count: ts.length };
}

const WRAP_PALS = [
  ['#2b1d6b', '#0b0a1f', '#8b7bff'], ['#05372b', '#03100c', '#2ef0a4'], ['#3a1450', '#0e0614', '#ff8bd1'], ['#4a2a00', '#140b00', '#f5c542'],
  ['#073344', '#020e14', '#3fb6ff'], ['#1c3b0b', '#071003', '#b4f05c'], ['#3c1020', '#100408', '#ff7a8a'], ['#24145a', '#090516', '#b48cff'],
  ['#4b0c16', '#120306', '#ff4d63'], ['#3b2d00', '#100c00', '#ffd76a'], ['#122a52', '#040a16', '#5ce1e6'], ['#18181f', '#060608', '#ffffff']
];
function drawWrappedSlide(ctx, W, H, sl, t, o) {
  const u = W / 1080, [c1, c2, acc] = WRAP_PALS[sl.pal % WRAP_PALS.length];
  const ease = x => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px'; ctx.textAlign = 'left'; ctx.shadowColor = 'transparent';
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // drifting light blobs and rings
  const rnd = mulberry('wr' + sl.kind + sl.pal);
  for (let i = 0; i < 3; i++) {
    const bx = W * (0.15 + rnd() * 0.8) + Math.sin(t * 2 + i) * 30 * u, by = H * (0.1 + rnd() * 0.8), br = (380 + rnd() * 420) * u;
    const rg = ctx.createRadialGradient(bx, by, 0, bx, by, br); rg.addColorStop(0, hexAlpha(acc, 0.28 - i * 0.06)); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }
  ctx.strokeStyle = hexAlpha(acc, 0.16); ctx.lineWidth = 2 * u;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(W * 0.92, H * 0.12, (120 + i * 70) * u * (0.9 + 0.1 * ease(t)), 0, Math.PI * 2); ctx.stroke(); }
  const M = 88 * u;
  // header
  ctx.font = `700 ${30 * u}px "EJ Inter"`; ctx.fillStyle = 'rgba(255,255,255,.92)';
  Share.drawMark(ctx, M, 74 * u, 46 * u); ctx.fillText('Tessra', M + 62 * u, 108 * u);
  ctx.font = `500 ${22 * u}px "EJ Mono"`; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.textAlign = 'right';
  ctx.fillText(`${o.index + 1} / ${o.total}`, W - M, 106 * u); ctx.textAlign = 'left';
  // kicker
  const k = ease(t * 2.2);
  ctx.globalAlpha = k; ctx.font = `500 ${30 * u}px "EJ Mono"`; ctx.letterSpacing = `${6 * u}px`; ctx.fillStyle = acc;
  const midY = H * 0.45;
  ctx.fillText(sl.kick, M, midY - 150 * u); ctx.letterSpacing = '0px'; ctx.globalAlpha = 1;
  if (sl.kind === 'outro') {
    const cols = 2, cw = (W - 2 * M - 30 * u) / cols, ch = 190 * u, y0 = midY - 90 * u;
    sl.grid.forEach(([lab, val], i) => {
      const a = ease(t * 2.2 - i * 0.12); ctx.globalAlpha = a;
      const x = M + (i % cols) * (cw + 30 * u), y = y0 + Math.floor(i / cols) * (ch + 24 * u) + (1 - a) * 30 * u;
      ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 26 * u); ctx.fill();
      ctx.font = `500 ${24 * u}px "EJ Inter"`; ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillText(lab, x + 32 * u, y + 58 * u);
      const fs = fitSize(ctx, val, '700', '"EJ Grotesk"', 64 * u, cw - 64 * u, 28 * u);
      ctx.font = `700 ${fs}px "EJ Grotesk"`; ctx.fillStyle = '#fff'; ctx.fillText(val, x + 32 * u, y + 140 * u);
    });
    ctx.globalAlpha = 1;
  } else {
    // big line: count-up for money slides
    const a = ease(t * 1.6 - 0.15);
    let big = sl.big;
    if (sl.num !== null && sl.num !== undefined) big = money0(t >= 0.8 ? sl.num : sl.num * ease(t * 1.25), true);
    const col = sl.tone === 'pos' ? '#2ef0a4' : sl.tone === 'neg' ? '#ff6b7d' : sl.tone === 'gold' ? '#ffd76a' : '#ffffff';
    const fs = fitSize(ctx, String(big), '700', '"EJ Grotesk"', (sl.kind === 'intro' ? 300 : 190) * u, W - 2 * M, 70 * u);
    ctx.globalAlpha = a; ctx.font = `700 ${fs}px "EJ Grotesk"`; ctx.fillStyle = col;
    ctx.shadowColor = hexAlpha(col === '#ffffff' ? acc : col, 0.55); ctx.shadowBlur = 50 * u;
    ctx.fillText(String(big), M - 4 * u, midY + fs * 0.32 + (1 - a) * 50 * u); ctx.shadowColor = 'transparent';
    // sub text, wrapped
    const sa = ease(t * 1.6 - 0.45); ctx.globalAlpha = sa;
    ctx.font = `500 ${38 * u}px "EJ Inter"`; ctx.fillStyle = 'rgba(255,255,255,.82)';
    wrapText(ctx, sl.sub || '', M, midY + fs * 0.32 + 110 * u, W - 2 * M, 54 * u);
    ctx.globalAlpha = 1;
  }
  // footer
  ctx.font = `500 ${24 * u}px "EJ Inter"`; ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.fillText(sl.foot || (o.handle ? o.handle : ''), M, H - 84 * u);
  ctx.textAlign = 'right'; ctx.font = `500 ${22 * u}px "EJ Mono"`; ctx.letterSpacing = `${3 * u}px`; ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.fillText('TESSRA WRAPPED', W - M, H - 84 * u);
  ctx.restore();
}
function fitSize(ctx, text, w, fam, size, maxW, min) { let s = size; do { ctx.font = `${w} ${s}px ${fam}`; if (ctx.measureText(text).width <= maxW) break; s -= 4; } while (s > min); return s; }
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = String(text).split(' '); let line = '';
  for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh; } else line = test; }
  if (line) ctx.fillText(line, x, y);
}
function hexAlpha(hex, a) { const h = hex.replace('#', ''); const n = parseInt(h, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${Math.max(0, a)})`; }
function mulberry(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

async function openWrapped(year) {
  await Share.fontsReady;
  const years = wrappedYears();
  if (!years.length) return toast('Log some trades first, then come back for your Wrapped');
  year = years.includes(String(year)) ? String(year) : years[0];
  const st = { year, hide: !!S.state.share.hideDollars, size: 'portrait', i: 0, t0: performance.now(), paused: false, busy: false };
  let data = wrappedSlides(st.year, st.hide), raf = 0;
  const SZ = { portrait: [1080, 1350], story: [1080, 1920] };
  const m = openModal(`<div class="wrap-shell">
      <div class="wrap-stage"><div class="wrap-bars" id="wrBars"></div><canvas id="wrCv"></canvas><button class="wrap-nav l" data-w="prev" aria-label="Previous">${ICON.left}</button><button class="wrap-nav r" data-w="next" aria-label="Next">${ICON.right}</button></div>
      <div class="wrap-side">
        <div class="between"><h3 style="margin:0">Tessra Wrapped</h3><button class="btn icon ghost" data-close>${ICON.close}</button></div>
        <div class="field"><label>Year</label><select class="select" id="wrYear">${years.map(y => `<option ${y === st.year ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
        <div class="field"><label>Size</label><div class="seg"><button data-sz="portrait" class="on">Post</button><button data-sz="story">Story</button></div></div>
        <label class="row" style="gap:8px;cursor:pointer;font-size:13px"><input type="checkbox" id="wrHide" ${st.hide ? 'checked' : ''} style="accent-color:var(--accent)">Hide dollar amounts</label>
        <div class="wrap-acts">
          <button class="btn primary" data-w="gif">${ICON.download}Save all as GIF</button>
          <button class="btn" data-w="airdrop">${ICON.airdrop}${IS_MAC ? 'AirDrop this slide' : 'Show this slide'}</button>
          <button class="btn" data-w="copy">${ICON.copy}Copy this slide</button>
          <button class="btn" data-w="png">${ICON.download}Save this slide</button>
        </div>
        <div class="hint" id="wrHint">Click the right side or press → for the next slide. Space pauses.</div>
      </div></div>`, { size: 'wrapped', onClose: () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey, true); } });
  const cv = m.querySelector('#wrCv'), bars = m.querySelector('#wrBars');
  const DUR = 5200;
  const drawBars = p => { bars.innerHTML = data.slides.map((_, i) => `<div><i style="width:${i < st.i ? 100 : i === st.i ? Math.round(p * 100) : 0}%"></i></div>`).join(''); };
  const sizeCanvas = () => {
    const [W, H] = SZ[st.size], sc = 0.5;
    if (cv.width !== W * sc || cv.height !== H * sc) { cv.width = W * sc; cv.height = H * sc; }
    const maxH = Math.min(innerHeight - 70, 900), k = maxH / H;
    cv.style.width = Math.round(W * k) + 'px'; cv.style.height = Math.round(H * k) + 'px';
    bars.style.width = cv.style.width;
  };
  const opts = () => ({ index: st.i, total: data.slides.length, handle: (S.state.share.handle || '').trim() });
  const frame = now => {
    if (!document.body.contains(cv)) return;
    const el = st.paused ? st.pauseAt : now - st.t0;
    const [W, H] = SZ[st.size], ctx = cv.getContext('2d');
    ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    drawWrappedSlide(ctx, W, H, data.slides[st.i], Math.min(1, el / 1400), opts());
    drawBars(Math.min(1, el / DUR));
    if (!st.paused && el >= DUR) { if (st.i < data.slides.length - 1) go(st.i + 1); else { st.paused = true; st.pauseAt = DUR; } }
    raf = requestAnimationFrame(frame);
  };
  const go = i => { st.i = Math.max(0, Math.min(data.slides.length - 1, i)); st.t0 = performance.now(); if (st.paused) st.pauseAt = 0; };
  const reload = () => { data = wrappedSlides(st.year, st.hide); go(Math.min(st.i, data.slides.length - 1)); };
  const onKey = e => {
    if (!document.body.contains(cv)) return;
    if (e.key === 'ArrowRight') { go(st.i + 1); e.preventDefault(); e.stopPropagation(); }
    else if (e.key === 'ArrowLeft') { go(st.i - 1); e.preventDefault(); e.stopPropagation(); }
    else if (e.key === ' ' && !/INPUT|SELECT|TEXTAREA|BUTTON/.test((e.target || {}).tagName || '')) { togglePause(); e.preventDefault(); }
  };
  const togglePause = () => { if (st.paused) { st.paused = false; st.t0 = performance.now() - (st.pauseAt || 0); } else { st.paused = true; st.pauseAt = performance.now() - st.t0; } };
  document.addEventListener('keydown', onKey, true);
  const stillUrl = () => { const [W, H] = SZ[st.size], c = document.createElement('canvas'); c.width = W; c.height = H; drawWrappedSlide(c.getContext('2d'), W, H, data.slides[st.i], 1, opts()); return c.toDataURL('image/png'); };
  const fname = () => `tessra-wrapped-${st.year}`;
  m.addEventListener('click', async e => {
    if (e.target.closest('[data-close]')) return closeModal(m);
    const sz = e.target.closest('[data-sz]');
    if (sz) { st.size = sz.dataset.sz; m.querySelectorAll('[data-sz]').forEach(b => b.classList.toggle('on', b === sz)); sizeCanvas(); return; }
    const b = e.target.closest('[data-w]'); if (!b) { if (e.target === cv) togglePause(); return; }
    const w = b.dataset.w;
    if (w === 'next') return go(st.i + 1);
    if (w === 'prev') return go(st.i - 1);
    if (st.busy) return;
    if (w === 'gif') {
      st.busy = true; const lbl = b.innerHTML;
      try { const bytes = await wrappedGif(data.slides, SZ[st.size], opts(), p => { b.innerHTML = `Encoding ${Math.round(p * 100)}%`; }); await Share.saveBytes(fname() + '.gif', Share.bytesToB64(bytes), 'image/gif'); }
      catch (err) { console.error(err); toast('GIF failed: ' + String(err && err.message || err).slice(0, 80)); }
      b.innerHTML = lbl; st.busy = false; return;
    }
    let url; try { url = stillUrl(); } catch (err) { return toast('Making the image failed'); }
    const name = `${fname()}-${st.i + 1}.png`;
    if (w === 'copy') Share.copyPng(url);
    else if (w === 'airdrop') Share.airdrop(name, url.split(',')[1], 'image/png');
    else Share.saveBytes(name, url.split(',')[1], 'image/png');
  });
  m.querySelector('#wrYear').addEventListener('change', e => { st.year = e.target.value; st.i = 0; reload(); });
  m.querySelector('#wrHide').addEventListener('change', e => { st.hide = e.target.checked; reload(); });
  sizeCanvas(); addEventListener('resize', sizeCanvas);
  raf = requestAnimationFrame(frame);
  return m;
}
async function wrappedGif(slides, [W, H], o, onProgress) {
  const scale = 640 / Math.max(W, H), w = Math.round(W * scale), h = Math.round(H * scale);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const enc = GifLib.GIFEncoder();
  const steps = [0.15, 0.3, 0.45, 0.6, 0.75, 1];
  const total = slides.length * steps.length; let k = 0;
  for (let i = 0; i < slides.length; i++) {
    for (let j = 0; j < steps.length; j++) {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      drawWrappedSlide(ctx, W, H, slides[i], steps[j], Object.assign({}, o, { index: i, total: slides.length }));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const { data } = ctx.getImageData(0, 0, w, h);
      const palette = GifLib.quantize(data, 256);
      enc.writeFrame(GifLib.applyPalette(data, palette), w, h, { palette, delay: j === steps.length - 1 ? 2600 : 70 });
      onProgress(++k / total);
      await new Promise(r => setTimeout(r, 0));
    }
  }
  enc.finish();
  return enc.bytes();
}
// Dashboard banner from December to the end of January
function wrappedBannerHtml() {
  const now = new Date(), mo = now.getMonth();
  if (mo !== 11 && mo !== 0) return '';
  const y = String(mo === 0 ? now.getFullYear() - 1 : now.getFullYear());
  if (trades().filter(t => S.dayOf(t).startsWith(y)).length < 10) return '';
  if ((S.state.settings.wrappedSeen || '') === y + ':dismissed') return '';
  return `<div class="wrap-banner card"><div><div class="wrap-banner-k">TESSRA WRAPPED</div><div class="wrap-banner-t">Your ${y} in trading is ready</div><div class="lr-sub">Best day, longest streak, your money setup and your Trader DNA, made to share.</div></div>
    <div class="row"><button class="btn ghost sm" data-action="wrapped-dismiss" data-y="${y}">Hide</button><button class="btn primary" data-action="open-wrapped" data-y="${y}">${ICON.spark}Open Wrapped</button></div></div>`;
}

// Local "YYYY-MM-DDTHH:MM" for a New York date and time (used by the demo data so sessions look real anywhere)
function nyLocalStr(dateKey, nyMin) {
  const [y, mo, d] = dateKey.split('-').map(Number);
  let ts = Date.UTC(y, mo - 1, d, 0, nyMin) + 5 * 3600e3;
  for (let i = 0; i < 3; i++) {
    const p = {}; for (const x of new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ts))) p[x.type] = x.value;
    const got = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute), want = Date.UTC(y, mo - 1, d, 0, nyMin);
    if (got === want) break; ts += want - got;
  }
  const L = new Date(ts);
  return `${keyOf(L)}T${String(L.getHours()).padStart(2, '0')}:${String(L.getMinutes()).padStart(2, '0')}`;
}
function demoGrade(win, mistakes, sp, st) {
  if (mistakes.length) return Math.random() < 0.7 ? 'C' : 'B';
  if (sp === st.setups[0]) return win ? (Math.random() < 0.6 ? 'A+' : 'A') : (Math.random() < 0.5 ? 'A' : 'B');
  return win ? (Math.random() < 0.5 ? 'A' : 'B') : (Math.random() < 0.5 ? 'B' : 'C');
}
