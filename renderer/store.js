/* Tessra: data store + calculations */
const Store = (() => {
  const KEY = 'edge-journal-v1';
  const api = window.edge || null;
  let state = null;
  let info = { imgDir: '', dataDir: '(browser storage)' };
  let saveTimer = null;
  const listeners = [];

  const localKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const DEFAULT_CONTRACTS = {
    MNQ: { name: 'Micro E-mini Nasdaq', mult: 2, tick: 0.25, fee: 1.48 },
    NQ: { name: 'E-mini Nasdaq', mult: 20, tick: 0.25, fee: 4.5 },
    MES: { name: 'Micro E-mini S&P', mult: 5, tick: 0.25, fee: 1.48 },
    ES: { name: 'E-mini S&P', mult: 50, tick: 0.25, fee: 4.5 },
    MYM: { name: 'Micro E-mini Dow', mult: 0.5, tick: 1, fee: 1.48 },
    YM: { name: 'E-mini Dow', mult: 5, tick: 1, fee: 4.5 },
    M2K: { name: 'Micro Russell', mult: 5, tick: 0.1, fee: 1.48 },
    RTY: { name: 'E-mini Russell', mult: 50, tick: 0.1, fee: 4.5 },
    MGC: { name: 'Micro Gold', mult: 10, tick: 0.1, fee: 1.88 },
    GC: { name: 'Gold', mult: 100, tick: 0.1, fee: 4.5 },
    MCL: { name: 'Micro Crude', mult: 100, tick: 0.01, fee: 1.88 },
    CL: { name: 'Crude Oil', mult: 1000, tick: 0.01, fee: 4.5 }
  };

  const defaults = () => ({
    version: 1,
    settings: { theme: 'dark', currency: '$', weekStart: 0, name: '' },
    goals: { dailyMaxLoss: 500, dailyTarget: 400, weeklyTarget: 1500, maxTradesPerDay: 4, riskPerTrade: 200 },
    contracts: JSON.parse(JSON.stringify(DEFAULT_CONTRACTS)),
    accounts: [],
    trades: [],
    journal: {},
    setups: [
      { id: uid(), name: 'OTE Pullback', color: '#8b7bff', description: 'Retrace into the 62 to 79 percent optimal trade entry zone after a displacement leg.', rules: ['Clear displacement leg with FVG', 'Limit order in OTE zone', 'Stop beyond swing', 'Minimum 2R target'] },
      { id: uid(), name: 'Liquidity Sweep', color: '#3fb6ff', description: 'Fade a sweep of an obvious high or low back into the range.', rules: ['Sweep of session high or low', 'Market structure shift', 'Entry on retest'] },
      { id: uid(), name: 'Breakout Retest', color: '#f5b84a', description: 'Break of a key level then retest holding as support or resistance.', rules: ['Clean break on volume', 'Retest holds', 'Stop below retest'] }
    ],
    tags: ['A+ setup', 'NY open', 'London', 'News day', 'Trend day', 'Range day', 'Scaled out'],
    mistakes: ['FOMO entry', 'Moved stop', 'Oversized', 'Revenge trade', 'Early exit', 'No setup', 'Ignored plan', 'Chased'],
    payouts: [],
    expenses: [],
    share: { backgrounds: [], handle: '', tagline: '', hideDollars: false, last: null, avatar: '', verified: false },
    weekly: {},
    whatif: null
  });

  function merge(base, saved) {
    const out = Object.assign(base, saved);
    out.settings = Object.assign(defaults().settings, saved.settings || {});
    out.goals = Object.assign(defaults().goals, saved.goals || {});
    out.share = Object.assign(defaults().share, saved.share || {});
    return out;
  }

  async function load() {
    if (api) { try { info = await api.info(); } catch (e) {} }
    let raw = null;
    try { raw = api ? await api.load() : localStorage.getItem(KEY); } catch (e) { console.error(e); }
    state = raw ? merge(defaults(), JSON.parse(raw)) : defaults();
    return state;
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 200);
    listeners.forEach(fn => fn());
  }
  async function flush() {
    clearTimeout(saveTimer);
    const json = JSON.stringify(state);
    try { api ? await api.save(json) : localStorage.setItem(KEY, json); } catch (e) { console.error('save failed', e); }
  }
  window.addEventListener('beforeunload', () => { if (!api) flush(); });

  /* ---------- images ---------- */
  const memImg = {};
  async function saveImage(dataUrl) {
    const id = uid();
    if (api) return await api.saveImage(id, dataUrl);
    const name = id + '.img';
    memImg[name] = dataUrl;
    try { localStorage.setItem('edge-img-' + name, dataUrl); } catch (e) { /* quota: keep in memory */ }
    return name;
  }
  function imageSrc(name) {
    if (!name) return '';
    if (name.startsWith('data:')) return name;
    if (api) return encodeURI('file://' + info.imgDir + '/' + name);
    return memImg[name] || localStorage.getItem('edge-img-' + name) || '';
  }
  async function readImage(name) {
    if (api) return await api.readImage(name);
    return imageSrc(name);
  }
  async function deleteImage(name) {
    if (api) return api.deleteImage(name);
    delete memImg[name];
    localStorage.removeItem('edge-img-' + name);
  }

  /* ---------- contract helpers ---------- */
  function rootOf(symbol) {
    const s = String(symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const keys = Object.keys(state.contracts).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      if (s === k) return k;
      if (s.startsWith(k) && /^[FGHJKMNQUVXZ]\d{1,2}$/.test(s.slice(k.length))) return k;
    }
    for (const k of keys) if (s.startsWith(k)) return k;
    return s;
  }
  function spec(symbol) {
    return state.contracts[rootOf(symbol)] || { mult: 1, tick: 0.01, fee: 0 };
  }

  /* ---------- trade math ---------- */
  function hasNum(v) { return v !== null && v !== undefined && v !== '' && !isNaN(Number(v)); }
  function fees(t) {
    if (hasNum(t.fees)) return Number(t.fees);
    return Number(t.qty || 0) * spec(t.symbol).fee;
  }
  function gross(t) {
    if (hasNum(t.pnlOverride)) return Number(t.pnlOverride) + fees(t);
    if (!hasNum(t.entryPrice) || !hasNum(t.exitPrice)) return 0;
    const dir = t.side === 'short' ? -1 : 1;
    return (Number(t.exitPrice) - Number(t.entryPrice)) * dir * Number(t.qty || 0) * spec(t.symbol).mult;
  }
  function pnl(t) {
    if (hasNum(t.pnlOverride)) return Number(t.pnlOverride);
    return gross(t) - fees(t);
  }
  function points(t) {
    if (!hasNum(t.entryPrice) || !hasNum(t.exitPrice)) return null;
    return (Number(t.exitPrice) - Number(t.entryPrice)) * (t.side === 'short' ? -1 : 1);
  }
  function risk(t) {
    if (!hasNum(t.stopPrice) || !hasNum(t.entryPrice)) return null;
    const r = Math.abs(Number(t.entryPrice) - Number(t.stopPrice)) * Number(t.qty || 0) * spec(t.symbol).mult;
    return r > 0 ? r : null;
  }
  function rMultiple(t) {
    const r = risk(t);
    return r ? pnl(t) / r : null;
  }
  function plannedR(t) {
    if (!hasNum(t.stopPrice) || !hasNum(t.targetPrice) || !hasNum(t.entryPrice)) return null;
    const rk = Math.abs(t.entryPrice - t.stopPrice);
    return rk ? Math.abs(t.targetPrice - t.entryPrice) / rk : null;
  }
  // Which calendar day a trade counts for. Times are stored in this computer's local time;
  // with settings.dayTz set (for example America/New_York), days follow that timezone instead.
  // 'cme' = futures session day: New York time, and anything from 6 PM on counts toward the next day
  // (CME closes 5 PM to 6 PM New York; Sunday 6 PM opens Monday's session).
  const tzFmt = {}, tzCache = new Map();
  function tzKey(date, tz) {
    if (tz === 'cme') {
      const f = tzFmt.cme || (tzFmt.cme = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }));
      const p = {}; for (const x of f.formatToParts(date)) p[x.type] = x.value;
      const d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
      if (+p.hour >= 18) d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().slice(0, 10);
    }
    const f = tzFmt[tz] || (tzFmt[tz] = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }));
    return f.format(date);
  }
  function dayTz() { const z = state && state.settings && state.settings.dayTz; return z && z !== 'local' ? z : null; }
  function dayOf(t) {
    const s = String(t.exitTime || t.entryTime || '');
    const tz = dayTz();
    if (!tz || s.length < 16) return s.slice(0, 10);
    const ck = tz + '|' + s;
    let v = tzCache.get(ck);
    if (v === undefined) { const d = new Date(s); v = isNaN(d) ? s.slice(0, 10) : tzKey(d, tz); if (tzCache.size > 50000) tzCache.clear(); tzCache.set(ck, v); }
    return v;
  }
  function todayKey() { const tz = dayTz(); return tz ? tzKey(new Date(), tz) : localKey(new Date()); }
  function holdMinutes(t) {
    if (!t.entryTime || !t.exitTime) return null;
    const m = (new Date(t.exitTime) - new Date(t.entryTime)) / 60000;
    return isFinite(m) && m >= 0 ? m : null;
  }
  function result(t) {
    const p = pnl(t);
    if (Math.abs(p) < 0.005) return 'be';
    return p > 0 ? 'win' : 'loss';
  }

  function sortTrades(list) {
    return list.slice().sort((a, b) => String(a.exitTime || a.entryTime).localeCompare(String(b.exitTime || b.entryTime)));
  }

  function summary(list) {
    const ts = sortTrades(list);
    const s = { count: ts.length, wins: 0, losses: 0, be: 0, grossProfit: 0, grossLoss: 0, net: 0, fees: 0, gross: 0,
      largestWin: 0, largestLoss: 0, maxWinStreak: 0, maxLossStreak: 0, curStreak: 0, curStreakType: null,
      rSum: 0, rCount: 0, holdSum: 0, holdCount: 0, maxDD: 0, longs: 0, longWins: 0, shorts: 0, shortWins: 0, contracts: 0 };
    let eq = 0, peak = 0, ws = 0, ls = 0;
    for (const t of ts) {
      const p = pnl(t), res = result(t);
      s.net += p; s.fees += fees(t); s.gross += gross(t); s.contracts += Number(t.qty || 0);
      if (res === 'win') { s.wins++; s.grossProfit += p; ws++; ls = 0; s.largestWin = Math.max(s.largestWin, p); }
      else if (res === 'loss') { s.losses++; s.grossLoss += p; ls++; ws = 0; s.largestLoss = Math.min(s.largestLoss, p); }
      else { s.be++; }
      s.maxWinStreak = Math.max(s.maxWinStreak, ws); s.maxLossStreak = Math.max(s.maxLossStreak, ls);
      if (t.side === 'short') { s.shorts++; if (res === 'win') s.shortWins++; } else { s.longs++; if (res === 'win') s.longWins++; }
      const r = rMultiple(t); if (r !== null) { s.rSum += r; s.rCount++; }
      const h = holdMinutes(t); if (h !== null) { s.holdSum += h; s.holdCount++; }
      eq += p; peak = Math.max(peak, eq); s.maxDD = Math.min(s.maxDD, eq - peak);
    }
    s.curStreak = ws || ls; s.curStreakType = ws ? 'win' : ls ? 'loss' : null;
    const decided = s.wins + s.losses;
    s.winRate = decided ? s.wins / decided : 0;
    s.avgWin = s.wins ? s.grossProfit / s.wins : 0;
    s.avgLoss = s.losses ? s.grossLoss / s.losses : 0;
    s.profitFactor = s.grossLoss ? s.grossProfit / Math.abs(s.grossLoss) : (s.grossProfit ? Infinity : 0);
    s.expectancy = s.count ? s.net / s.count : 0;
    s.payoff = s.avgLoss ? s.avgWin / Math.abs(s.avgLoss) : 0;
    s.avgR = s.rCount ? s.rSum / s.rCount : null;
    s.avgHold = s.holdCount ? s.holdSum / s.holdCount : null;
    s.longWinRate = s.longs ? s.longWins / s.longs : 0;
    s.shortWinRate = s.shorts ? s.shortWins / s.shorts : 0;
    return s;
  }

  function byDay(list) {
    const map = {};
    for (const t of list) {
      const d = dayOf(t); if (!d) continue;
      (map[d] = map[d] || { date: d, trades: [], pnl: 0 }).trades.push(t);
      map[d].pnl += pnl(t);
    }
    return map;
  }

  function equity(list) {
    let eq = 0, peak = 0;
    return sortTrades(list).map(t => { eq += pnl(t); peak = Math.max(peak, eq); return { t, eq, dd: eq - peak }; });
  }

  /* ---------- accounts ---------- */
  function accountStatus(acc) {
    const ts = sortTrades(state.trades.filter(t => t.accountId === acc.id));
    const pays = state.payouts.filter(p => p.accountId === acc.id);
    const start = Number(acc.startBalance || 0);
    const dd = Number(acc.maxDrawdown || 0);
    let bal = start, hwm = start;
    const days = byDay(ts);
    const dayKeys = Object.keys(days).sort();
    if (acc.drawdownType === 'eod') {
      for (const d of dayKeys) { bal += days[d].pnl; hwm = Math.max(hwm, bal); }
    } else {
      for (const t of ts) { bal += pnl(t); hwm = Math.max(hwm, bal); }
    }
    const paid = pays.reduce((a, p) => a + Number(p.amount || 0), 0);
    const net = bal - start;
    let threshold;
    if (acc.drawdownType === 'static') threshold = start - dd;
    else {
      threshold = hwm - dd;
      if (acc.lockAtStart !== false) threshold = Math.min(threshold, start + Number(acc.lockOffset || 0));
    }
    const balance = bal - paid;
    const today = todayKey();
    const todayPnl = days[today] ? days[today].pnl : 0;
    const target = Number(acc.profitTarget || 0);
    return {
      trades: ts, net, balance, hwm, threshold, room: balance - threshold, paid, todayPnl,
      targetProgress: target ? Math.max(0, Math.min(1, net / target)) : null,
      toTarget: target ? Math.max(0, target - net) : null,
      tradingDays: dayKeys.length
    };
  }

  return {
    get state() { return state; }, info: () => info, uid, load, save, flush,
    saveImage, imageSrc, readImage, deleteImage,
    rootOf, spec, fees, gross, pnl, points, risk, rMultiple, plannedR, dayOf, holdMinutes, result,
    localKey, todayKey, sortTrades, summary, byDay, equity, accountStatus, hasNum, defaults,
    onChange: fn => listeners.push(fn),
    replaceState(s) { state = merge(defaults(), s); save(); }
  };
})();
