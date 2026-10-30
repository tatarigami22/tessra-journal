/* Tessra: appearance, prop firm presets, consistency tracker, broker imports, first-run setup,
   pre-trade checklist, menu bar sync, community (Discord) prompt */

/* ===================== COMMUNITY ===================== */
// Set to the Discord invite link to turn on the "join the Discord" pop-up.
const DISCORD_URL = 'https://discord.gg/EwphEWdTMT';

/* ===================== APPEARANCE ===================== */
const SKINS = [
  ['classic', 'Classic', 'The original look'], ['ledger', 'Ledger', 'Paper, ink, serif numbers'], ['terminal', 'Terminal', 'Amber on black, all mono'],
  ['backdrop', 'Backdrop', 'Wallpaper behind panels'], ['field', 'Field', 'Olive, bone, safety orange'], ['midnight', 'Midnight', 'Navy and electric blue'],
  ['chrome', 'Chrome', 'Silver, matches the logo']
];
const SKIN_DEFAULT_BG = { classic: 'none', ledger: 'paper', terminal: 'dots', backdrop: 'ridge', field: 'topo', midnight: 'beam', chrome: 'beam' };
const BACKGROUNDS = [
  ['none', 'None'], ['paper', 'Paper'], ['grid', 'Graph paper'], ['dots', 'Dot grid'], ['topo', 'Topo map'],
  ['ridge', 'Ridge'], ['desert', 'Desert'], ['fog', 'Fog'], ['beam', 'Beam'], ['silk', 'Silk'], ['aurora', 'Aurora'], ['horizon', 'Horizon'],
  ['gridfloor', 'Grid floor'], ['lines', 'Lines'], ['drip', 'Purple drip'], ['drip-chrome', 'Chrome drip'], ['chrome-liquid', 'Liquid chrome'],
  ['marble', 'Marble'], ['lava', 'Lava'], ['stripes', 'Stripes'], ['holo', 'Holo'], ['ripple', 'Ripple'], ['smoke', 'Smoke']
];
const PATTERN_BGS = ['none', 'paper', 'grid', 'dots'];
const BUSY_BGS = { 'chrome-liquid': 45, marble: 50, holo: 40, ripple: 40, lava: 35, smoke: 30, custom: 40 };

function look() {
  const s = S.state.settings;
  s.look = Object.assign({ skin: 'classic', bg: '', dim: null, blur: 8, custom: '' }, s.look || {});
  return s.look;
}
function effectiveBg(l = look()) {
  const bg = l.bg || SKIN_DEFAULT_BG[l.skin] || 'none';
  return bg === 'custom' && !l.custom ? 'none' : bg;
}
function lookDim(l = look()) { const bg = effectiveBg(l); return l.dim === null || l.dim === undefined ? (BUSY_BGS[bg] ?? 15) : Number(l.dim); }
function applyAppearance() {
  const l = look(), root = document.documentElement;
  if (l.skin === 'classic') delete root.dataset.skin; else root.dataset.skin = l.skin;
  root.dataset.theme = l.skin === 'ledger' ? 'light' : l.skin === 'classic' ? (S.state.settings.theme || 'dark') : 'dark';
  const bg = effectiveBg(l), isImg = !PATTERN_BGS.includes(bg);
  delete root.dataset.bg; // older builds used this name, it clashed with the share window
  if (bg === 'none') delete root.dataset.wallpaper; else root.dataset.wallpaper = bg;
  if (isImg) root.dataset.bgimg = '1'; else delete root.dataset.bgimg;
  if (bg === 'custom') root.style.setProperty('--custom-bg', `url("${S.imageSrc(l.custom)}")`);
  root.style.setProperty('--bg-dim', isImg ? lookDim(l) / 100 : 0);
  root.style.setProperty('--panel-blur', (isImg ? Number(l.blur || 0) : 0) + 'px');
}
function appearanceSettingsHtml() {
  const l = look(), bg = effectiveBg(l), isImg = !PATTERN_BGS.includes(bg);
  const sw = ([k, label]) => {
    const pat = PATTERN_BGS.includes(k);
    const style = pat ? '' : `style="background-image:url(skins/thumbs/bg-${k}.jpg)"`;
    return `<button class="bg-sw ${pat ? 'pat-' + k : ''} ${bg === k ? 'on' : ''}" data-look-bg="${k}" ${style} title="${label}"><b>${label}</b></button>`;
  };
  const custom = l.custom ? `<button class="bg-sw ${bg === 'custom' ? 'on' : ''}" data-look-bg="custom" style="background-image:url('${S.imageSrc(l.custom)}')"><b>Your image</b></button>` : '';
  return `<div class="settings-sec"><div><h3>Appearance</h3><p>Pick a style, then any background. Your trades and settings stay the same. Busy backgrounds are darkened a little so numbers stay readable.</p></div>
    <div>
      <div class="seg-label">Style</div>
      <div class="skin-grid">${SKINS.map(([k, n, d]) => `<button class="skin-card ${l.skin === k ? 'on' : ''}" data-look-skin="${k}"><img src="skins/thumbs/skin-${k}.jpg" alt=""><div>${n}<span>${d}</span></div></button>`).join('')}</div>
      ${l.skin === 'classic' ? `<div class="field mt"><label>Classic theme</label>${seg('theme', [['dark', 'Dark'], ['light', 'Light']], S.state.settings.theme || 'dark')}</div>` : ''}
      <div class="seg-label mt-l">Background <span class="faint" style="text-transform:none;letter-spacing:0;font-weight:500">${l.bg ? '' : '(style default)'}</span></div>
      <div class="bgsw-grid">${BACKGROUNDS.map(sw).join('')}${custom}<button class="bg-sw add" data-look-add="1" title="Use your own image or GIF">${ICON.plus}<span style="position:absolute;bottom:6px;left:0;right:0;text-align:center;font-weight:600">Your photo or GIF</span></button></div>
      ${l.bg ? `<button class="btn ghost sm mt" data-look-bg="">Use the style's default background</button>` : ''}
      ${isImg ? `<div class="range-row mt"><span style="width:120px">Darken background</span><input type="range" class="range" min="0" max="85" value="${lookDim(l)}" data-look-range="dim"><span data-look-val="dim">${lookDim(l)}%</span></div>
      <div class="range-row" style="margin-top:8px"><span style="width:120px">Panel blur</span><input type="range" class="range" min="0" max="24" value="${Number(l.blur || 0)}" data-look-range="blur"><span data-look-val="blur">${Number(l.blur || 0)}px</span></div>` : ''}
    </div></div>`;
}
document.addEventListener('click', async e => {
  const sk = e.target.closest('[data-look-skin]');
  if (sk) { const l = look(); l.skin = sk.dataset.lookSkin; l.bg = ''; l.dim = null; S.save(); applyAppearance(); render(true); return; }
  const b = e.target.closest('[data-look-bg]');
  if (b) { const l = look(); l.bg = b.dataset.lookBg; l.dim = null; S.save(); applyAppearance(); render(true); return; }
  if (e.target.closest('[data-look-add]')) {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
    i.onchange = async () => {
      const f = i.files[0]; if (!f) return;
      const url = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
      const l = look(); const old = l.custom;
      l.custom = await S.saveImage(url); l.bg = 'custom'; l.dim = null;
      if (old && !imageInUse(old)) S.deleteImage(old);
      S.save(); applyAppearance(); render(true); toast('Background set');
    };
    i.click();
  }
});
document.addEventListener('input', e => {
  const r = e.target.dataset && e.target.dataset.lookRange; if (!r) return;
  const l = look(); l[r] = Number(e.target.value);
  const v = document.querySelector(`[data-look-val="${r}"]`); if (v) v.textContent = e.target.value + (r === 'dim' ? '%' : 'px');
  applyAppearance(); S.save();
});

/* ===================== PROP FIRM PRESETS ===================== */
// From public rule summaries, October 2026. Firms change rules often, so every field stays editable.
// sizes: { size: [profit target, max drawdown, daily loss limit] }
const FIRM_PRESETS = [
  { firm: 'Topstep', plan: 'Trading Combine', type: 'eval', dd: 'eod', cons: 50, sizes: { 50: [3000, 2000], 100: [6000, 3000], 150: [9000, 4500] }, note: 'Daily loss limit is optional. If your best day goes over 50%, Topstep raises the target instead of failing you.' },
  { firm: 'Topstep', plan: 'Express Funded (Standard payouts)', type: 'funded', dd: 'eod', cons: 0, sizes: { 50: [0, 2000], 100: [0, 3000], 150: [0, 4500] }, payout: { minProfitDays: 5, minDayProfit: 150, maxPayout: { 50: 2000, 100: 3000, 150: 5000 }, payoutPct: 50, split: 90 }, note: 'Max loss locks at the starting balance after the first payout.' },
  { firm: 'Topstep', plan: 'Express Funded (Consistency payouts)', type: 'funded', dd: 'eod', cons: 40, sizes: { 50: [0, 2000], 100: [0, 3000], 150: [0, 4500] }, payout: { minProfitDays: 3, minDayProfit: 0, maxPayout: { 50: 3000, 100: 4000, 150: 6000 }, payoutPct: 50, split: 90 } },
  { firm: 'Apex Trader Funding', plan: 'Evaluation', type: 'eval', dd: 'eod', cons: 0, sizes: { 25: [1500, 1000], 50: [3000, 2000], 100: [6000, 3000], 150: [9000, 4000] }, note: 'Apex lets you choose end of day or intraday trailing at checkout. Switch the drawdown type if you picked intraday.' },
  { firm: 'Apex Trader Funding', plan: 'Performance Account (PA)', type: 'funded', dd: 'eod', cons: 50, sizes: { 25: [0, 1000], 50: [0, 2000], 100: [0, 3000], 150: [0, 4000] }, payout: { minProfitDays: 5, minDayProfit: { 25: 100, 50: 250, 100: 300, 150: 350 }, maxPayout: { 50: 1500 }, minPayout: 500, maxPayouts: 6, split: 100 }, note: 'Payout caps rise with each payout. Check your size on the Apex site.' },
  { firm: 'Lucid Trading', plan: 'LucidFlex Evaluation', type: 'eval', dd: 'eod', cons: 50, sizes: { 25: [1250, 1000], 50: [3000, 2000], 100: [6000, 3000], 150: [9000, 4500] } },
  { firm: 'Lucid Trading', plan: 'LucidFlex Funded', type: 'funded', dd: 'eod', cons: 0, lock: 100, sizes: { 25: [0, 1000], 50: [0, 2000], 100: [0, 3000], 150: [0, 4500] }, payout: { minProfitDays: 5, minDayProfit: { 25: 100, 50: 150, 100: 200, 150: 250 }, maxPayout: { 25: 1000, 50: 2000, 100: 2500, 150: 3000 }, payoutPct: 50, minPayout: 500, maxPayouts: 5, split: 90, base: 'cycle' } },
  { firm: 'Lucid Trading', plan: 'LucidPro Evaluation', type: 'eval', dd: 'eod', cons: 0, sizes: { 25: [1250, 1000], 50: [3000, 2000, 1200], 100: [6000, 3000, 1800], 150: [9000, 4500, 2700] } },
  { firm: 'Lucid Trading', plan: 'LucidPro Funded', type: 'funded', dd: 'eod', cons: 40, lock: 100, sizes: { 25: [0, 1000], 50: [0, 2000, 1200], 100: [0, 3000, 1800], 150: [0, 4500, 2700] }, payout: { minProfitDays: 3, minDayProfit: 0, maxPayout: { 25: 1000, 50: 2000, 100: 2500, 150: 3000 }, minPayout: 500, split: 90 } },
  { firm: 'Lucid Trading', plan: 'LucidDirect', type: 'funded', dd: 'eod', cons: 20, lock: 100, minDays: 5, sizes: { 25: [1500, 1000], 50: [3000, 2000, 1200], 100: [6000, 3500, 2100], 150: [9000, 5000, 3000] }, payout: { minProfitDays: 5, minDayProfit: 0, maxPayout: { 25: 1000, 50: 2000, 100: 2500, 150: 3000 }, minPayout: 500, split: 90 }, note: 'The target here is the first payout cycle profit goal.' },
  { firm: 'Lucid Trading', plan: 'LucidDaily Evaluation', type: 'eval', dd: 'eod', cons: 50, sizes: { 25: [1250, 1000, 600], 50: [3000, 2000, 1200], 100: [6000, 3000, 1800], 150: [9000, 4500, 2700] }, note: 'Daily loss limit only applies if you added it at checkout.' },
  { firm: 'Tradeify', plan: 'Growth Evaluation', type: 'eval', dd: 'eod', cons: 0, lock: 100, sizes: { 25: [1500, 1000, 600], 50: [3000, 2000, 1250], 100: [6000, 3500, 2500], 150: [9000, 5000, 3750] } },
  { firm: 'Tradeify', plan: 'Select Evaluation', type: 'eval', dd: 'eod', cons: 40, lock: 100, minDays: 3, sizes: { 25: [1500, 1000], 50: [3000, 2000], 100: [6000, 3000], 150: [9000, 4500] } },
  { firm: 'Tradeify', plan: 'Growth Funded', type: 'funded', dd: 'eod', cons: 35, lock: 100, sizes: { 25: [0, 1000, 600], 50: [0, 2000, 1250], 100: [0, 3500, 2500], 150: [0, 5000, 3750] }, payout: { minProfitDays: 5, minDayProfit: { 25: 100, 50: 150, 100: 200, 150: 250 }, maxPayout: { 25: 1000, 50: 1500, 100: 2000, 150: 2500 }, minPayout: { 25: 250, 50: 500, 100: 1000, 150: 1500 }, split: 90 } },
  { firm: 'Tradeify', plan: 'Select Flex Funded', type: 'funded', dd: 'eod', cons: 0, lock: 100, sizes: { 25: [0, 1000], 50: [0, 2000], 100: [0, 3000], 150: [0, 4500] }, payout: { minProfitDays: 5, minDayProfit: 0, maxPayout: { 25: 1250, 50: 2500, 100: 3500, 150: 4500 }, minPayout: 250, split: 90 } },
  { firm: 'Tradeify', plan: 'Lightning (instant funded)', type: 'funded', dd: 'eod', cons: 20, lock: 100, sizes: { 25: [1500, 1000], 50: [3000, 2000, 1250], 100: [6000, 4000, 2500], 150: [9000, 5250, 3000] }, payout: { minProfitDays: 0, minDayProfit: 0, maxPayout: { 25: 1000, 50: 2000, 100: 2500, 150: 3000 }, minPayout: 1000, split: 90 }, note: 'Consistency is 20% for the first payout, 25% for the second and 30% after that.' },
  { firm: 'Take Profit Trader', plan: 'Test', type: 'eval', dd: 'eod', cons: 50, minDays: 5, sizes: { 25: [1500, 1500], 50: [3000, 2000], 75: [4500, 2500], 100: [6000, 3000], 150: [9000, 4500] } },
  { firm: 'Take Profit Trader', plan: 'PRO', type: 'funded', dd: 'intraday', cons: 0, sizes: { 25: [0, 1500], 50: [0, 2000], 75: [0, 2500], 100: [0, 3000], 150: [0, 4500] }, payout: { minProfitDays: 0, minDayProfit: 0, maxPayout: 0, minPayout: 0, split: 80 }, note: 'Withdrawals need a buffer of start balance plus max drawdown first.' },
  { firm: 'MyFundedFutures', plan: 'Rapid Evaluation', type: 'eval', dd: 'eod', cons: 50, sizes: { 25: [1500, 1000], 50: [3000, 2000], 100: [6000, 3000], 150: [9000, 4500] } },
  { firm: 'MyFundedFutures', plan: 'Rapid Funded', type: 'funded', dd: 'intraday', cons: 0, lock: 100, sizes: { 25: [0, 1000], 50: [0, 2000], 100: [0, 3000], 150: [0, 4500] }, payout: { minProfitDays: 0, minDayProfit: 0, maxPayout: 0, minPayout: 500, split: 90 } },
  { firm: 'MyFundedFutures', plan: 'Builder Evaluation', type: 'eval', dd: 'eod', cons: 0, sizes: { 25: [1500, 1000, 600], 50: [3000, 2000, 1000] } }
];
const PRESET_NOTE = 'Rules come from public summaries as of October 2026. Firms change them often, so check your firm\'s site.';
const presetId = (p, size) => `${FIRM_PRESETS.indexOf(p)}:${size}`;
function presetById(id) { const [i, size] = String(id).split(':'); const p = FIRM_PRESETS[+i]; return p && p.sizes[size] ? { p, size: +size } : null; }
const pick = (v, size) => v && typeof v === 'object' ? (v[size] ?? 0) : (v ?? 0);
function presetToAccount(p, size) {
  const [target, dd, dll] = p.sizes[size];
  const start = size * 1000;
  const acc = {
    name: `${p.firm.split(' ')[0]} ${size}K ${p.type === 'eval' ? 'Eval' : 'Funded'}`, firm: p.firm, type: p.type, status: 'active', startBalance: start, profitTarget: target || '',
    maxDrawdown: dd, drawdownType: p.dd, lockAtStart: true, lockOffset: p.lock || 0, dailyLossLimit: dll || '', minDays: p.minDays || '', consistencyPct: p.cons || '', preset: presetId(p, size)
  };
  if (p.payout) {
    acc.payout = { enabled: true, preset: 'custom', base: p.payout.base || 'cycle', consistencyPct: p.cons || 0 };
    for (const k of ['minProfitDays', 'minDayProfit', 'maxPayout', 'payoutPct', 'minPayout', 'split', 'maxPayouts']) acc.payout[k] = pick(p.payout[k], size) || (k === 'payoutPct' ? 100 : k === 'split' ? 90 : 0);
  }
  return acc;
}
function presetOptionsHtml(sel = '') {
  const firms = [...new Set(FIRM_PRESETS.map(p => p.firm))];
  return `<option value="">Choose a firm and plan...</option>` + firms.map(f => `<optgroup label="${esc(f)}">${FIRM_PRESETS.filter(p => p.firm === f).flatMap(p => Object.keys(p.sizes).map(s => `<option value="${presetId(p, s)}" ${sel === presetId(p, s) ? 'selected' : ''}>${esc(p.plan)} ${s}K</option>`)).join('')}</optgroup>`).join('');
}
function presetSummary(p, size) {
  const [t, dd, dll] = p.sizes[size];
  const bits = [t ? `${money0(t)} target` : '', `${money0(dd)} ${p.dd === 'eod' ? 'EOD' : p.dd} drawdown`, dll ? `${money0(dll)} daily loss limit` : 'no daily loss limit', p.cons ? `${p.cons}% consistency` : 'no consistency rule', p.minDays ? `${p.minDays} min days` : ''].filter(Boolean);
  return bits.join(' · ') + (p.note ? `<br>${esc(p.note)}` : '');
}
function firmPresetFieldHtml(d) {
  return `<div class="field" style="grid-column:span 2"><label>Start from a prop firm preset</label><select class="select" data-firm-preset>${presetOptionsHtml(d.preset || '')}</select>
    <span class="hint" data-preset-sum>${d.preset && presetById(d.preset) ? presetSummary(presetById(d.preset).p, presetById(d.preset).size) + '<br>' : ''}${PRESET_NOTE}</span></div>`;
}
function wireFirmPreset(m, isNew) {
  const sel = m.querySelector('[data-firm-preset]'); if (!sel) return;
  sel.addEventListener('change', () => {
    const r = presetById(sel.value); if (!r) return;
    const acc = presetToAccount(r.p, r.size);
    const setK = (k, v) => { const i = m.querySelector(`[data-k="${k}"]`); if (!i) return; if (i.type === 'checkbox') i.checked = !!v; else i.value = v ?? ''; };
    const nameI = m.querySelector('[data-k=name]'); if (nameI && (!nameI.value || isNew)) nameI.value = acc.name;
    for (const k of ['firm', 'type', 'startBalance', 'profitTarget', 'maxDrawdown', 'drawdownType', 'dailyLossLimit', 'minDays', 'lockOffset', 'consistencyPct']) setK(k, acc[k]);
    setK('lockAtStart', true);
    const en = m.querySelector('[data-p=enabled]');
    if (acc.payout) {
      if (en) en.checked = true;
      const ps = m.querySelector('[data-p=preset]'); if (ps) ps.value = 'custom';
      for (const [k, v] of Object.entries(acc.payout)) { const i = m.querySelector(`[data-p="${k}"]`); if (i && i.type !== 'checkbox' && k !== 'preset') i.value = v; }
    } else if (en) en.checked = false;
    m.querySelector('[data-preset-sum]').innerHTML = presetSummary(r.p, r.size) + '<br>' + PRESET_NOTE;
  });
}

/* ===================== CONSISTENCY TRACKER ===================== */
function consistencyStatus(acc) {
  const pctRule = Number(acc.consistencyPct || (acc.payout && acc.payout.enabled && acc.payout.consistencyPct) || 0);
  if (!pctRule || acc.status !== 'active') return null;
  const pays = S.state.payouts.filter(p => p.accountId === acc.id).map(p => p.date).sort();
  const since = acc.type === 'eval' ? null : pays[pays.length - 1] || null;
  const ts = S.state.trades.filter(t => t.accountId === acc.id && (!since || S.dayOf(t) > since));
  const days = Object.values(S.byDay(ts)), today = todayKey(), f = pctRule / 100;
  const total = days.reduce((a, d) => a + d.pnl, 0);
  const tDay = days.find(d => d.date === today), todayPnl = tDay ? tDay.pnl : 0;
  const others = total - todayPnl;
  const bestOther = Math.max(0, ...days.filter(d => d.date !== today).map(d => d.pnl));
  const best = Math.max(bestOther, todayPnl, 0);
  const ratio = total > 0 ? best / total : null;
  const ok = total <= 0 || best <= f * total + 0.005;
  const needMore = !ok ? best / f - total : 0;
  const cap = others > 0 ? f * others / (1 - f) : 0;
  return { pct: pctRule, total, best, ratio, ok, needMore, todayPnl, cap, room: cap - todayPnl, since, bestOther, scope: acc.type === 'eval' ? 'this evaluation' : since ? 'since your last payout' : 'this payout cycle' };
}
function consistencyText(c) {
  if (c.total <= 0) return { cls: '', text: `No profit yet ${c.scope}. Rule: no day over ${c.pct}% of profit.` };
  if (!c.ok) return { cls: 'warn', text: `Best day ${money0(c.best)} is ${pct(c.ratio, 0)} of ${money0(c.total)} profit (limit ${c.pct}%). Make ${money0(c.needMore)} more, with no day bigger than ${money0(c.best)}, to get back under.` };
  return { cls: 'pos', text: `Best day is ${pct(c.ratio, 0)} of profit (limit ${c.pct}%). Keep today under ${money0(c.cap)}${c.todayPnl > 0 ? `, ${money0(Math.max(0, c.room))} left` : ''}.` };
}
function consistencyCardHtml(acc) {
  const c = consistencyStatus(acc); if (!c) return '';
  const t = consistencyText(c);
  const w = c.ratio === null ? 0 : Math.min(100, c.ratio / (c.pct / 100) * 100);
  return `<div class="between lr-sub" style="margin:12px 0 5px"><span>Consistency rule ${c.pct}%</span><span class="${t.cls}">${c.ratio === null ? '-' : pct(c.ratio, 0) + ' best day'}</span></div>
    <div class="progress ${!c.ok ? 'neg' : w > 80 ? 'warn' : ''}"><div style="width:${w}%"></div></div><div class="lr-sub" style="margin-top:6px">${t.text}</div>`;
}
function consistencyDashHtml() {
  const accs = S.state.accounts.filter(a => (ui.account === 'all' || ui.account === a.id) && consistencyStatus(a)).slice(0, 3);
  if (!accs.length) return '';
  return `<div class="seg-label" style="margin-top:20px">Consistency</div><div class="stat-list">${accs.map(a => {
    const c = consistencyStatus(a);
    const v = c.total <= 0 ? '<span class="faint">no profit yet</span>' : !c.ok ? `<span class="warn">over ${c.pct}%</span>` : `<span>keep today under <b>${money0(c.cap)}</b></span>`;
    return `<div class="stat-row"><span class="k">${esc(a.name)}</span>${v}</div>`;
  }).join('')}</div>`;
}

/* ===================== BROKER IMPORTS ===================== */
const IMPORT_FIELDS = [
  ['symbol', 'Symbol', true], ['side', 'Side (long/short or buy/sell)'], ['qty', 'Quantity'], ['entryPrice', 'Entry price'], ['exitPrice', 'Exit price'],
  ['entryTime', 'Entry time', true], ['exitTime', 'Exit time'], ['pnl', 'P&L (used if prices are missing)'], ['fees', 'Fees / commission'], ['id', 'Trade or fill ID'],
  ['price', 'Fill price (fills only)'], ['time', 'Fill time (fills only)']
];
const CANDIDATES = {
  symbol: ['symbol', 'instrument', 'contractname', 'contract', 'ticker', 'underlying', 'product', 'market'],
  side: ['marketpos', 'side', 'tradetype', 'direction', 'buysell', 'action', 'positionside', 'type', 'dir', 'longshort', 'bs'],
  qty: ['qty', 'quantity', 'tradequantity', 'size', 'contracts', 'filledqty', 'qtyfilled', 'filled', 'volume'],
  entryPrice: ['entryprice', 'openprice', 'avgentry', 'avgentryprice', 'entry', 'in', 'buyprice'],
  exitPrice: ['exitprice', 'closeprice', 'avgexit', 'avgexitprice', 'exit', 'out', 'sellprice'],
  entryTime: ['entrytime', 'entrydatetime', 'enteredat', 'opentime', 'opendate', 'entrydate', 'datetime', 'timestamp', 'date', 'time', 'when', 'opened'],
  exitTime: ['exittime', 'exitdatetime', 'exitedat', 'closetime', 'closedate', 'exitdate'],
  pnl: ['netpl', 'netpnl', 'profit', 'profitlossc', 'profitloss', 'pnl', 'realizedpnl', 'netprofit', 'grosspl', 'realized', 'result', 'pl'],
  fees: ['fees', 'fee', 'commission', 'commissionc', 'commissions'],
  id: ['tradenumber', 'tradeid', 'id', 'fillid', 'orderid', 'ordernumber'],
  price: ['avgfillprice', 'fillprice', 'avgprice', 'execprice', 'price'],
  time: ['filltime', 'updatetime', 'exectime', 'time', 'datetime', 'date']
};
const IMPORT_FORMATS = [
  { name: 'NinjaTrader trades', test: h => h.includes('marketpos') && h.includes('entryprice') },
  { name: 'ProjectX / TopstepX trades', test: h => h.includes('contractname') && (h.includes('enteredat') || h.includes('entryprice')) },
  { name: 'Sierra Chart trades list', test: h => h.includes('tradetype') && (h.includes('entrydatetime') || h.includes('entryprice')) },
  { name: 'Quantower positions history', test: h => h.includes('openprice') && h.includes('closeprice') },
  { name: 'MotiveWave executions', fills: true, test: h => h.includes('action') && h.includes('price') && h.includes('time') && (h.includes('fillid') || h.includes('orderid') || h.includes('underlying')) && !h.includes('exitprice') },
  { name: 'Rithmic R|Trader fills', fills: true, test: h => (h.includes('buysell') || h.includes('side')) && (h.includes('avgfillprice') || h.includes('fillprice')) && !h.includes('exitprice') && !h.includes('closeprice') },
  { name: 'Fills / executions', fills: true, test: h => h.some(x => /fillprice|execprice/.test(x)) && !h.includes('exitprice') }
];
const normH = x => String(x || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
function sniffDelimiter(text) {
  const line = text.split(/\r?\n/).find(l => l.trim()) || '';
  const c = { ',': line.split(',').length, '\t': line.split('\t').length, ';': line.split(';').length };
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
}
function parseDelimited(text, delim) {
  if (delim === ',') return parseCSV(text);
  return text.split(/\r?\n/).filter(l => l.trim()).map(l => l.split(delim).map(x => x.replace(/^"|"$/g, '')));
}
function cleanSymbol(s) {
  s = String(s || '').trim().toUpperCase().replace(/^\//, '').replace(/^F\.US\./, '').replace(/^CON\.F\.US\./, '');
  s = s.split(':')[0].split('.')[0].split(' ')[0].split('-')[0];
  return s;
}
// Parse an export timestamp to epoch ms. Understands ISO and M/D/Y layouts, seconds, milliseconds,
// AM/PM and a trailing offset (Z, +0530, -05:00). Without an offset the time is this computer's local time.
function parseStamp(s) {
  s = String(s ?? '').trim(); if (!s) return NaN;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d+))?)?\s*(AM|PM)?\s*(Z|[+-]\d{2}:?\d{2})?$/i.exec(s);
  let y, mo, d, h, mi, sec, ms, ap, off;
  if (m) [, y, mo, d, h, mi, sec, ms, ap, off] = m;
  else {
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})[ T]+(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d+))?)?\s*(AM|PM)?\s*(Z|[+-]\d{2}:?\d{2})?$/i.exec(s);
    if (!m) { const t = Date.parse(s); return isNaN(t) ? NaN : t; }
    [, mo, d, y, h, mi, sec, ms, ap, off] = m; if (y.length === 2) y = '20' + y;
  }
  h = +h; if (ap) { if (/pm/i.test(ap) && h < 12) h += 12; if (/am/i.test(ap) && h === 12) h = 0; }
  const msv = ms ? Math.round(+('0.' + ms) * 1000) : 0;
  if (off) {
    let mins = 0; if (!/z/i.test(off)) { const o = off.replace(':', ''); mins = (o[0] === '-' ? -1 : 1) * (+o.slice(1, 3) * 60 + +o.slice(3, 5)); }
    return Date.UTC(+y, +mo - 1, +d, h, +mi, +(sec || 0), msv) - mins * 60000;
  }
  return new Date(+y, +mo - 1, +d, h, +mi, +(sec || 0), msv).getTime();
}
function toLocalDT2(s) {
  const t = parseStamp(s);
  if (isNaN(t)) return toLocalDT(s);
  const d = new Date(t); return keyOf(d) + 'T' + d.toTimeString().slice(0, 5);
}
function guessMapping(h, fmt) {
  const map = {};
  for (const [k] of IMPORT_FIELDS) {
    if (fmt && fmt.fills && (k === 'entryPrice' || k === 'exitPrice' || k === 'exitTime' || k === 'entryTime')) continue;
    if ((!fmt || !fmt.fills) && (k === 'price' || k === 'time')) continue;
    let i = -1;
    for (const c of CANDIDATES[k]) { i = h.indexOf(c); if (i >= 0) break; }
    if (i < 0) for (const c of CANDIDATES[k]) { if (c.length < 4) continue; i = h.findIndex(x => x.includes(c)); if (i >= 0) break; }
    if (i >= 0 && !Object.values(map).includes(i)) map[k] = i;
  }
  if (map.exitTime === map.entryTime) delete map.exitTime;
  return map;
}
const isShort = v => /short|sell|^s$|^sld$|^-1$/i.test(String(v || '').trim());
function rowsToTrades(rows, map, fills, fmtName) {
  const out = [], get = (r, k) => map[k] === undefined || map[k] < 0 ? '' : r[map[k]];
  if (!fills) {
    for (const r of rows) {
      const sym = cleanSymbol(get(r, 'symbol')); if (!sym) continue;
      const t = { symbol: sym, side: isShort(get(r, 'side')) ? 'short' : 'long', qty: Math.abs(parseFloat(String(get(r, 'qty')).replace(/[^0-9.\-]/g, ''))) || 1,
        entryPrice: parseFloat(String(get(r, 'entryPrice')).replace(/[^0-9.\-]/g, '')), exitPrice: parseFloat(String(get(r, 'exitPrice')).replace(/[^0-9.\-]/g, '')),
        entryTime: toLocalDT2(get(r, 'entryTime')), exitTime: toLocalDT2(get(r, 'exitTime')) };
      if (!t.entryTime) continue;
      if (!t.exitTime) t.exitTime = t.entryTime;
      if (isNaN(t.entryPrice)) t.entryPrice = ''; if (isNaN(t.exitPrice)) t.exitPrice = '';
      const fee = get(r, 'fees'); if (fee !== '' && !isNaN(moneyNum(fee))) t.fees = Math.abs(moneyNum(fee));
      if ((t.entryPrice === '' || t.exitPrice === '') && get(r, 'pnl') !== '') t.pnlOverride = moneyNum(get(r, 'pnl'));
      if (t.entryPrice === '' && t.exitPrice === '' && !S.hasNum(t.pnlOverride)) continue;
      t.importKey = `${fmtName}|${get(r, 'id') || r.join('|')}`;
      out.push(t);
    }
    return out;
  }
  // fills: pair round trips flat to flat, per symbol, oldest first
  const fl = rows.map(r => ({ sym: cleanSymbol(get(r, 'symbol')), short: isShort(get(r, 'side')), qty: Math.abs(parseFloat(String(get(r, 'qty')).replace(/[^0-9.\-]/g, ''))) || 0, price: parseFloat(String(get(r, 'price')).replace(/[^0-9.\-]/g, '')), time: toLocalDT2(get(r, 'time')), ts: parseStamp(get(r, 'time')), fee: Math.abs(moneyNum(get(r, 'fees'))) || 0, id: get(r, 'id') }))
    .map((f, i) => Object.assign(f, { i })).filter(f => f.sym && f.qty && !isNaN(f.price) && f.time).sort((a, b) => ((a.ts || 0) - (b.ts || 0)) || a.i - b.i);
  const pos = {};
  for (const f of fl) {
    let p = pos[f.sym] || (pos[f.sym] = { q: 0, entQ: 0, entV: 0, exQ: 0, exV: 0, t0: '', fee: 0, ids: [] });
    let left = f.qty; const dir = f.short ? -1 : 1;
    while (left > 0) {
      if (p.q === 0 || Math.sign(p.q) === dir) { p.q += dir * left; p.entQ += left; p.entV += left * f.price; if (!p.t0) p.t0 = f.time; p.fee += f.fee * (left / f.qty); p.ids.push(f.id || f.ts); left = 0; }
      else {
        const m = Math.min(left, Math.abs(p.q)); p.q += dir * m; p.exQ += m; p.exV += m * f.price; p.fee += f.fee * (m / f.qty); p.ids.push(f.id || f.ts); left -= m;
        if (p.q === 0) {
          const t = { symbol: f.sym, side: dir === -1 ? 'long' : 'short', qty: p.entQ, entryPrice: +(p.entV / p.entQ).toFixed(6), exitPrice: +(p.exV / p.exQ).toFixed(6), entryTime: p.t0, exitTime: f.time, importKey: `${fmtName}|${f.sym}|${p.t0}|${p.ids.join(',')}` };
          if (p.fee) t.fees = +p.fee.toFixed(2);
          out.push(t);
          p = pos[f.sym] = { q: 0, entQ: 0, entV: 0, exQ: 0, exV: 0, t0: '', fee: 0, ids: [] };
        }
      }
    }
  }
  return out;
}
function analyzeImport(text) {
  const legacy = parseTradesCSV(text);
  if (legacy.format === 'Tradovate performance report') return { legacy: true, format: legacy.format, trades: legacy.trades };
  const delim = sniffDelimiter(text);
  const rows = parseDelimited(text, delim);
  if (rows.length < 2) return { format: 'empty', trades: [], headers: [], rows: [] };
  let hi = rows.findIndex(r => r.filter(x => x.trim()).length >= 3); if (hi < 0) hi = 0;
  const headers = rows[hi], h = headers.map(normH), body = rows.slice(hi + 1);
  const fmt = IMPORT_FORMATS.find(f => f.test(h)) || null;
  const map = guessMapping(h, fmt);
  const fills = !!(fmt && fmt.fills);
  const name = fmt ? fmt.name : 'CSV';
  return { format: fmt ? fmt.name : 'Unrecognized file, check the column matching', known: !!fmt, fills, headers, rows: body, map, trades: rowsToTrades(body, map, fills, name), name };
}
async function importCSVFlow() {
  const file = await pickFile('.csv,.txt,.tsv,text/csv'); if (!file) return;
  const a = analyzeImport(file.text);
  if (a.format === 'empty') return toast('That file looks empty');
  const existing = new Set(S.state.trades.map(t => t.importKey).filter(Boolean));
  const m = openModal(`<div class="modal-h"><h3>Import trades</h3><button class="btn icon ghost" data-close>${ICON.close}</button></div>
    <div class="modal-b">
      <div id="impSum"></div>
      ${a.legacy ? '' : `<details ${a.known ? '' : 'open'} style="margin:4px 0 12px"><summary style="cursor:pointer;font-weight:600;font-size:13px">Column matching ${a.known ? '<span class="faint" style="font-weight:500">(auto detected, change if something looks off)</span>' : ''}</summary>
        <div class="grid g-2" style="margin-top:10px">
          <div class="field"><label>File type</label><select class="select" id="impMode"><option value="trades" ${a.fills ? '' : 'selected'}>One row per trade</option><option value="fills" ${a.fills ? 'selected' : ''}>One row per fill (pair buys and sells)</option></select></div><div></div>
          ${IMPORT_FIELDS.map(([k, l]) => `<div class="field imp-f" data-for="${['price', 'time'].includes(k) ? 'fills' : ['entryPrice', 'exitPrice', 'entryTime', 'exitTime'].includes(k) ? 'trades' : 'both'}"><label>${l}</label><select class="select" data-imap="${k}"><option value="-1">Not in file</option>${a.headers.map((hd, i) => `<option value="${i}" ${a.map[k] === i ? 'selected' : ''}>${esc(hd || 'Column ' + (i + 1))}</option>`).join('')}</select></div>`).join('')}
        </div></details>`}
      <div class="field"><label>Assign to account</label><select class="select" id="impAcc"><option value="">No account</option>${S.state.accounts.map(x => `<option value="${x.id}" ${ui.account === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <div class="table-wrap" style="max-height:260px" id="impPrev"></div>
      <div class="faint" style="font-size:12px;margin-top:8px">Fees use your contract specs unless the file has them. Re-importing the same file skips trades you already have. Opened the file in Numbers or Excel? Export it back to CSV first. Format not working? Use the Report a problem link in Settings and attach a sample.</div>
    </div>
    <div class="modal-f"><span></span><div class="row"><button class="btn" data-close>Cancel</button><button class="btn primary" data-go>Import</button></div></div>`);
  m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(m)));
  let parsed = a.trades, fresh = [];
  const refresh = () => {
    if (!a.legacy) {
      const map = {}; m.querySelectorAll('[data-imap]').forEach(s => { if (+s.value >= 0) map[s.dataset.imap] = +s.value; });
      const fills = m.querySelector('#impMode').value === 'fills';
      m.querySelectorAll('.imp-f').forEach(f => { f.style.display = f.dataset.for === 'both' || (f.dataset.for === 'fills') === fills ? '' : 'none'; });
      parsed = rowsToTrades(a.rows, map, fills, a.name);
    }
    fresh = parsed.filter(t => !existing.has(t.importKey));
    const sum = fresh.reduce((x, t) => x + S.pnl({ ...t, fees: t.fees ?? '' }), 0);
    m.querySelector('#impSum').innerHTML = parsed.length
      ? `<div class="alert info">${ICON.check}<div>Detected <b>${esc(a.format)}</b> in ${esc(file.name)}: ${parsed.length} trades, ${fresh.length} new${parsed.length - fresh.length ? `, ${parsed.length - fresh.length} already imported (skipped)` : ''}. Estimated net ${money(sum)}.</div></div>`
      : `<div class="alert warn">${ICON.warn}<div>No trades found with these columns. Match at least Symbol, Entry time and prices (or P&L).</div></div>`;
    m.querySelector('#impPrev').innerHTML = `<table class="tbl"><thead><tr><th>Entry</th><th>Symbol</th><th>Side</th><th class="n">Qty</th><th class="n">Entry</th><th class="n">Exit</th><th class="n">Net</th></tr></thead><tbody>
      ${fresh.slice(0, 40).map(t => `<tr style="cursor:default"><td>${esc(String(t.entryTime).replace('T', ' '))}</td><td class="sym">${esc(t.symbol)}</td><td>${sideTag(t.side)}</td><td class="n">${t.qty}</td><td class="n">${fmtPrice(t.entryPrice)}</td><td class="n">${fmtPrice(t.exitPrice)}</td><td class="n ${cls(S.pnl(t))}">${money(S.pnl(t))}</td></tr>`).join('')}</tbody></table>`;
    const go = m.querySelector('[data-go]'); go.disabled = !fresh.length; go.textContent = `Import ${fresh.length} trades`;
  };
  m.addEventListener('change', e => { if (e.target.matches('[data-imap],#impMode')) refresh(); });
  refresh();
  m.querySelector('[data-go]').addEventListener('click', () => {
    const acc = m.querySelector('#impAcc').value;
    for (const t of fresh) { delete t.srcPnl; S.state.trades.push(Object.assign({ id: S.uid(), accountId: acc, stopPrice: '', targetPrice: '', fees: '', pnlOverride: '', setup: '', tags: [], mistakes: [], rating: 0, notes: '', screenshots: [], rulesFollowed: [], createdAt: new Date().toISOString() }, t)); }
    S.save(); closeModal(m); render(); toast(`Imported ${fresh.length} trades`);
  });
}

/* ===================== FIRST-RUN SETUP ===================== */
const INSTRUMENTS = [['MNQ', 'Micro Nasdaq'], ['NQ', 'E-mini Nasdaq'], ['MES', 'Micro S&P'], ['ES', 'E-mini S&P'], ['M2K', 'Micro Russell'], ['RTY', 'E-mini Russell'], ['MYM', 'Micro Dow'], ['YM', 'E-mini Dow'], ['MGC', 'Micro Gold'], ['GC', 'Gold'], ['MCL', 'Micro Crude'], ['CL', 'Crude Oil']];
function needsSetup() { return !S.state.trades.length && !S.state.accounts.length && !S.state.settings.onboarded; }
function openSetupWizard() {
  const w = { step: 1, name: S.state.settings.name || '', firm: '', plan: '', size: '', own: false, inst: new Set(S.state.settings.instruments || ['MNQ']) };
  const firms = [...new Set(FIRM_PRESETS.map(p => p.firm))];
  const m = openModal('<div id="wiz"></div>', { size: 'sm', sticky: true });
  const finish = () => { if (!S.state.settings.dayTz) S.state.settings.dayTz = 'cme'; S.state.settings.onboarded = true; S.save(); closeModal(m); render(); setTimeout(maybeCommunityPrompt, 1500); };
  const draw = () => {
    const dots = [1, 2, 3, 4].map(i => `<span style="width:${i === w.step ? 18 : 6}px;height:6px;border-radius:3px;background:${i <= w.step ? 'var(--accent)' : 'var(--line-2)'};display:inline-block;transition:width .2s"></span>`).join(' ');
    let body = '', next = 'Next';
    if (w.step === 1) body = `<div style="text-align:center;padding:6px 0 4px"><img src="brand/mark.png" width="64" height="64" style="border-radius:16px"><h2 style="margin:14px 0 4px;font-size:22px">Welcome to Tessra</h2><div class="muted">Takes about a minute. Everything stays on your computer.</div></div>
      <div class="field mt-l"><label>What should we call you?</label><input class="input" id="wName" value="${esc(w.name)}" placeholder="Your name or handle" autofocus></div>`;
    if (w.step === 2) {
      const plans = FIRM_PRESETS.filter(p => p.firm === w.firm);
      const p = plans.find(x => x.plan === w.plan);
      body = `<h3 style="margin:0 0 4px">Your first account</h3><div class="muted" style="margin-bottom:14px">Pick your prop firm and Tessra fills in the drawdown, target and consistency rules. You can add more accounts later.</div>
        <div class="field"><label>Firm</label><select class="select" id="wFirm"><option value="">Choose...</option>${firms.map(f => `<option ${w.firm === f ? 'selected' : ''}>${esc(f)}</option>`).join('')}<option value="__own" ${w.own ? 'selected' : ''}>My own account (no prop firm)</option></select></div>
        ${w.firm && !w.own ? `<div class="field"><label>Plan</label><select class="select" id="wPlan"><option value="">Choose...</option>${plans.map(x => `<option ${w.plan === x.plan ? 'selected' : ''}>${esc(x.plan)}</option>`).join('')}</select></div>` : ''}
        ${p ? `<div class="field"><label>Account size</label><div class="seg" id="wSize">${Object.keys(p.sizes).map(s => `<button data-size="${s}" class="${String(w.size) === s ? 'on' : ''}">${s}K</button>`).join('')}</div></div>` : ''}
        ${w.own ? `<div class="field"><label>Starting balance ($)</label><input class="input" type="number" id="wBal" value="${esc(w.bal || '')}" placeholder="10000"></div>` : ''}
        ${p && w.size ? `<div class="alert info">${ICON.check}<div>${presetSummary(p, w.size)}</div></div><div class="faint" style="font-size:11.5px;margin-top:6px">${PRESET_NOTE}</div>` : ''}`;
      next = (w.firm && w.plan && w.size) || (w.own) ? 'Next' : 'Skip for now';
    }
    if (w.step === 3) body = `<h3 style="margin:0 0 4px">What do you trade?</h3><div class="muted" style="margin-bottom:14px">The first one you pick becomes the default on new trades. Point values and fees are already set.</div>
      <div class="chip-pick">${INSTRUMENTS.map(([k, n]) => `<button class="chip ${w.inst.has(k) ? 'acc' : ''}" data-inst="${k}" style="cursor:pointer;padding:6px 11px">${k} <span class="faint" style="font-weight:500">${n}</span></button>`).join(' ')}</div>`;
    if (w.step === 4) { body = `<h3 style="margin:0 0 4px">Get your trades in</h3><div class="muted" style="margin-bottom:14px">Import a file from your platform, or start fresh.</div>
      <div class="stat-list" style="gap:8px;display:grid">
        <button class="btn" data-w="import" style="justify-content:flex-start">${ICON.download}Import a file <span class="faint" style="font-weight:500">Tradovate, NinjaTrader, Rithmic, MotiveWave, ProjectX, Quantower, Sierra Chart, any CSV</span></button>
        <button class="btn" data-w="trade" style="justify-content:flex-start">${ICON.plus}Log my first trade</button>
        <button class="btn" data-w="demo" style="justify-content:flex-start">${ICON.analytics || ICON.plus}Explore with demo data <span class="faint" style="font-weight:500">remove it any time in Settings</span></button>
      </div>`; next = 'Finish'; }
    m.querySelector('#wiz').innerHTML = `<div class="modal-h"><div>${dots}</div>${w.step > 1 ? '' : '<button class="btn ghost sm" data-w="skipall">Skip setup</button>'}</div>
      <div class="modal-b">${body}</div>
      <div class="modal-f">${w.step > 1 ? '<button class="btn" data-w="back">Back</button>' : '<span></span>'}<button class="btn primary" data-w="next">${next}</button></div>`;
    const f = m.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 30);
  };
  const saveStep = () => {
    if (w.step === 1) { w.name = (m.querySelector('#wName').value || '').trim(); S.state.settings.name = w.name; }
    if (w.step === 2) {
      const p = FIRM_PRESETS.find(x => x.firm === w.firm && x.plan === w.plan);
      if (p && w.size) { const acc = Object.assign({ id: S.uid(), cost: '', createdAt: todayKey() }, presetToAccount(p, +w.size)); S.state.accounts.push(acc); ui.account = 'all'; }
      else if (w.own) { const b = Number((m.querySelector('#wBal') || {}).value) || 0; S.state.accounts.push({ id: S.uid(), name: 'My account', firm: '', type: 'live', status: 'active', startBalance: b, profitTarget: '', maxDrawdown: '', drawdownType: 'static', lockAtStart: false, dailyLossLimit: '', minDays: '', cost: '', createdAt: todayKey() }); }
    }
    if (w.step === 3) { S.state.settings.instruments = [...w.inst]; S.state.settings.defaultSymbol = [...w.inst][0] || 'MNQ'; }
    S.save();
  };
  m.addEventListener('change', e => {
    if (e.target.id === 'wFirm') { w.own = e.target.value === '__own'; w.firm = w.own ? '' : e.target.value; w.plan = ''; w.size = ''; draw(); }
    if (e.target.id === 'wPlan') { w.plan = e.target.value; const p = FIRM_PRESETS.find(x => x.firm === w.firm && x.plan === w.plan); w.size = p && p.sizes[50] ? 50 : p ? +Object.keys(p.sizes)[0] : ''; draw(); }
    if (e.target.id === 'wBal') w.bal = e.target.value;
  });
  m.addEventListener('click', e => {
    const sz = e.target.closest('[data-size]'); if (sz) { w.size = +sz.dataset.size; draw(); return; }
    const ins = e.target.closest('[data-inst]'); if (ins) { const k = ins.dataset.inst; if (w.inst.has(k)) w.inst.delete(k); else w.inst.add(k); draw(); return; }
    const b = e.target.closest('[data-w]'); if (!b) return;
    const a = b.dataset.w;
    if (a === 'skipall') return finish();
    if (a === 'back') { w.step--; draw(); return; }
    if (a === 'next') { saveStep(); if (w.step === 4) return finish(); w.step++; draw(); return; }
    if (a === 'import') { finish(); importCSVFlow(); }
    if (a === 'trade') { finish(); newTradeGate(x => openTradeModal(null, x || {})); }
    if (a === 'demo') { finish(); loadDemo(); }
  });
  draw();
}

/* ===================== PRE-TRADE CHECKLIST ===================== */
const DEFAULT_CHECKLIST = ['Checked the news and economic calendar', 'This setup is in my playbook', 'Stop and target are set before entry', 'Risk fits my per-trade limit', 'Not trying to win back a loss'];
function checklistCfg() {
  const s = S.state.settings;
  s.checklist = Object.assign({ enabled: false, items: DEFAULT_CHECKLIST.slice() }, s.checklist || {});
  return s.checklist;
}
function checklistSettingsHtml() {
  const c = checklistCfg();
  return `<div class="settings-sec"><div><h3>Pre-trade checklist</h3><p>When on, New Trade first asks you to tick these, plus the rules of the setup you pick. Skipping is allowed but the trade gets tagged "Skipped checklist" so you can see what skipping costs.</p></div>
    <div><div class="check-list"><label><input type="checkbox" data-ck-enable ${c.enabled ? 'checked' : ''}>Ask me before every new trade</label></div>
      <div class="chip-editor mt">${c.items.map((it, i) => `<span class="chip">${esc(it)}<button class="x" data-ck-del="${i}" title="Remove">×</button></span>`).join(' ')}</div>
      <div class="row mt"><input class="input" data-ck-new placeholder="Add a checklist item, press Enter" style="max-width:360px"><button class="btn ghost sm" data-ck-reset>Reset to defaults</button></div></div></div>`;
}
document.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-ck-enable]')) { checklistCfg().enabled = e.target.checked; S.save(); } });
document.addEventListener('click', e => {
  const d = e.target.closest('[data-ck-del]'); if (d) { checklistCfg().items.splice(+d.dataset.ckDel, 1); S.save(); render(true); return; }
  if (e.target.closest('[data-ck-reset]')) { checklistCfg().items = DEFAULT_CHECKLIST.slice(); S.save(); render(true); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-ck-new]')) { const v = e.target.value.trim(); if (v) { checklistCfg().items.push(v); S.save(); render(true); } }
});
function checklistGate(proceed) {
  const c = checklistCfg(); if (!c.enabled) return proceed();
  let setup = '';
  const m = openModal(`<div class="modal-h"><h3>Before this trade</h3><button class="btn icon ghost" data-close>${ICON.close}</button></div><div class="modal-b" id="ckBody"></div>
    <div class="modal-f"><button class="btn ghost" data-ck="skip">Skip checklist</button><button class="btn primary" data-ck="go" disabled>Log trade</button></div>`, { size: 'sm' });
  const draw = () => {
    const sp = S.state.setups.find(s => s.id === setup);
    const items = c.items.map(t => ['g', t]).concat(sp ? sp.rules.map(t => ['s', t]) : []);
    m.querySelector('#ckBody').innerHTML = `<div class="field"><label>Setup</label><select class="select" id="ckSetup"><option value="">No setup / not sure</option>${S.state.setups.map(s => `<option value="${s.id}" ${s.id === setup ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="check-list">${items.map(([k, t], i) => `<label><input type="checkbox" data-ci="${i}">${k === 's' ? '<span class="faint">Setup rule: </span>' : ''}${esc(t)}</label>`).join('')}</div>`;
    upd();
  };
  const upd = () => { const all = [...m.querySelectorAll('[data-ci]')]; m.querySelector('[data-ck=go]').disabled = !all.every(x => x.checked); };
  m.addEventListener('change', e => { if (e.target.id === 'ckSetup') { setup = e.target.value; draw(); } else upd(); });
  m.querySelector('[data-close]').onclick = () => closeModal(m);
  m.querySelector('[data-ck=skip]').onclick = () => { closeModal(m); proceed({ skippedChecklist: true, setup }); };
  m.querySelector('[data-ck=go]').onclick = () => { closeModal(m); proceed({ checklistPassed: true, setup }); };
  draw();
}
function newTradeGate(open) { lockGuardNewTrade(x => checklistGate(y => open(Object.assign({}, x || {}, y || {})))); }
function applyChecklistTag(d, preset) {
  if (!preset) return;
  if (preset.skippedChecklist) { if (!S.state.mistakes.includes('Skipped checklist')) S.state.mistakes.push('Skipped checklist'); d.mistakes = [...new Set([...(d.mistakes || []), 'Skipped checklist'])]; }
  if (preset.checklistPassed) d.checklist = true;
}

/* ===================== MENU BAR ===================== */
function menuBarPayload() {
  const enabled = S.state.settings.menuBar !== false;
  if (!enabled) return { enabled: false };
  const today = todayKey(), g = S.state.goals;
  const all = S.state.settings.countCopiesOnce === false ? S.state.trades : S.state.trades.filter(t => !t.copyOf);
  const td = all.filter(t => S.dayOf(t) === today);
  const net = td.reduce((a, t) => a + S.pnl(t), 0);
  const lines = [`Today ${money(net)} · ${td.length} trade${td.length === 1 ? '' : 's'}`];
  if (g.dailyMaxLoss) lines.push(`Loss room ${money0(Math.max(0, g.dailyMaxLoss + Math.min(0, net)))} of ${money0(g.dailyMaxLoss)}`);
  if (g.maxTradesPerDay) lines.push(`Trades ${td.length} of ${g.maxTradesPerDay}`);
  for (const a of S.state.accounts) {
    const c = consistencyStatus(a); if (!c || c.total <= 0) continue;
    lines.push(`${a.name}: ${c.ok ? 'keep today under ' + money0(c.cap) : 'over ' + c.pct + '% consistency'}`);
    if (lines.length > 7) break;
  }
  const l = typeof lockStatus === 'function' ? lockStatus() : null;
  if (l) lines.push('Locked for today');
  const title = td.length ? (net >= 0 ? '+' : '-') + '$' + Math.abs(Math.round(net)).toLocaleString() : '';
  return { enabled: true, title, tooltip: 'Tessra · ' + lines[0], lines };
}
let mbTimer;
function syncMenuBar() {
  if (!window.edge || !window.edge.trayUpdate) return;
  clearTimeout(mbTimer);
  mbTimer = setTimeout(() => { try { window.edge.trayUpdate(menuBarPayload()); } catch (e) {} }, 300);
}
function menuBarSettingsHtml() {
  if (!window.edge || !window.edge.trayUpdate) return '';
  return `<div class="settings-sec"><div><h3>${IS_MAC ? 'Menu bar' : 'System tray'}</h3><p>${IS_MAC ? "Today's P&L sits in the menu bar at the top of your screen. Click it for loss room, trades left and consistency headroom, or to log a trade." : 'Shows today\'s P&L in the system tray. Click it for loss room, trades left and consistency headroom.'}</p></div>
    <div class="check-list"><label><input type="checkbox" data-setting-ck="menuBar" ${S.state.settings.menuBar !== false ? 'checked' : ''}>Show Tessra in the ${IS_MAC ? 'menu bar' : 'system tray'}</label></div></div>`;
}

/* ===================== COMMUNITY POP-UP ===================== */
function maybeCommunityPrompt() {
  if (!DISCORD_URL) return;
  const ver = (S.info() && S.info().version) || 'web';
  const s = S.state.settings;
  if (s.communitySeen === ver) return;
  if (document.querySelector('.overlay')) { clearTimeout(maybeCommunityPrompt._t); maybeCommunityPrompt._t = setTimeout(maybeCommunityPrompt, 4000); return; }
  s.communitySeen = ver; S.save();
  const m = openModal(`<div class="modal-b" style="text-align:center;padding:28px 26px 8px">
      <img src="brand/mark.png" width="56" height="56" style="border-radius:14px">
      <h3 style="margin:14px 0 6px;font-size:18px">Join the Discord</h3>
      <div class="muted" style="font-size:13.5px">Join the Discord to get notified of updates and to request features.</div>
      <div style="margin-top:14px;font-size:12.5px;word-break:break-all"><a href="${esc(DISCORD_URL)}" target="_blank" rel="noopener" style="color:var(--accent-2)">${esc(DISCORD_URL)}</a></div></div>
    <div class="modal-f"><button class="btn ghost" data-x>Maybe later</button><a class="btn primary" href="${esc(DISCORD_URL)}" target="_blank" rel="noopener" data-join>Join the Discord</a></div>`, { size: 'sm' });
  m.querySelector('[data-x]').onclick = () => closeModal(m);
  m.querySelector('[data-join]').addEventListener('click', () => setTimeout(() => closeModal(m), 100));
}

// Loading demo data from anywhere also finishes first-run setup
const __loadDemo = loadDemo;
loadDemo = async function (...args) {
  const w = document.getElementById('wiz');
  if (w) { S.state.settings.onboarded = true; closeModal(w.closest('.modal')); }
  return __loadDemo.apply(this, args);
};

/* ===================== TRADING DAY TIME ZONE ===================== */
document.addEventListener('change', e => {
  if (!(e.target.matches && e.target.matches('[data-daytz]'))) return;
  S.state.settings.dayTz = e.target.value; S.save();
  ui.calMonth = todayKey().slice(0, 7); ui.journalDay = todayKey(); if (typeof weekStartKey === 'function') ui.week = weekStartKey(todayKey());
  render(true); toast(e.target.value === 'local' ? 'Days follow your computer\'s time zone' : e.target.value === 'cme' ? 'Days now follow the futures session (6 PM New York rollover)' : 'Days now follow ' + e.target.selectedOptions[0].textContent.split(' (')[0]);
});

/* ===================== UPDATES ===================== */
let pendingUpdate = null;
async function checkForUpdates() {
  if (!window.edge || !window.edge.checkUpdate) return;
  let u = null; try { u = await window.edge.checkUpdate(); } catch (e) {}
  if (!u) return;
  pendingUpdate = u;
  const bar = document.getElementById('updateBar');
  bar.innerHTML = `<button class="update-bar"><b>Update available</b><span>Tessra ${esc(u.version)} is out. ${u.canAuto ? 'Click to update.' : 'Click to download.'}</span></button>`;
  bar.firstChild.onclick = () => openUpdatePrompt(u);
  const tryShow = () => { if (document.querySelector('.overlay')) return setTimeout(tryShow, 3000); openUpdatePrompt(u); };
  tryShow();
}
function openUpdatePrompt(u) {
  if (document.getElementById('updModal')) return;
  const m = openModal(`<div id="updModal"><div class="modal-b" style="text-align:center;padding:28px 26px 10px">
      <img src="brand/mark.png" width="56" height="56" style="border-radius:14px">
      <h3 style="margin:14px 0 6px;font-size:18px">A new update is available</h3>
      <div class="muted" style="font-size:13.5px">Tessra ${esc(u.version)} is out. Would you like to update now?</div>
      <div id="updStatus" style="margin-top:14px;font-size:12.5px" class="faint">${u.canAuto ? 'Tessra will download the update, install it and restart. Your trades and settings are kept.' : `Automatic updating isn't available here (${esc(u.why || 'unknown reason')}), so this opens the download page.`}</div>
      <div class="progress" id="updProg" style="margin-top:12px;display:none"><div style="width:0%"></div></div>
      <div style="margin-top:10px;font-size:12px"><a href="${esc(u.url)}" target="_blank" rel="noopener" style="color:var(--accent-2)">See what's new</a></div></div>
    <div class="modal-f"><button class="btn ghost" data-u="later">Maybe later</button><button class="btn primary" data-u="yes">${u.canAuto ? 'Yes, update now' : 'Open download page'}</button></div></div>`, { size: 'sm' });
  const status = m.querySelector('#updStatus'), prog = m.querySelector('#updProg'), yes = m.querySelector('[data-u=yes]'), later = m.querySelector('[data-u=later]');
  later.onclick = () => closeModal(m);
  yes.onclick = async () => {
    if (!u.canAuto) { window.edge.openUrl(u.url); return closeModal(m); }
    yes.disabled = true; later.disabled = true; prog.style.display = ''; status.className = ''; status.textContent = 'Downloading...';
    window.edge.onUpdateProgress(({ stage, p }) => {
      if (stage === 'download') { prog.firstElementChild.style.width = Math.round(p * 100) + '%'; status.textContent = `Downloading ${Math.round(p * 100)}%`; }
      if (stage === 'install') { prog.firstElementChild.style.width = '100%'; status.textContent = 'Installing. Tessra will close and reopen in a few seconds.'; }
    });
    try { await S.flush(); } catch (e) {}
    const r = await window.edge.installUpdate();
    if (!r || !r.ok) {
      status.className = 'neg'; status.textContent = `Update failed: ${(r && r.error) || 'unknown error'}. You can download it manually instead.`;
      prog.style.display = 'none'; later.disabled = false; yes.disabled = false; yes.textContent = 'Open download page';
      yes.onclick = () => { window.edge.openUrl((r && r.url) || u.url); closeModal(m); };
    }
  };
}
