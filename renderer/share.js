/* Tessra: shareable P&L cards (trade + day), custom image/GIF backgrounds, PNG/GIF export */
const Share = (() => {
  const POS = '#2ef0a4', NEG = '#ff4d63', NEU = '#e8ebef';
  const FONTS = {
    clean: { num: '"EJ Inter"', numW: 800, txt: '"EJ Inter"', txtW: 700, lbl: '"EJ Mono"', lblW: 500, label: 'Clean' },
    grotesk: { num: '"EJ Grotesk"', numW: 700, txt: '"EJ Grotesk"', txtW: 700, lbl: '"EJ Mono"', lblW: 500, label: 'Grotesk' },
    terminal: { num: '"EJ Mono"', numW: 700, txt: '"EJ Mono"', txtW: 700, lbl: '"EJ Mono"', lblW: 500, label: 'Terminal' }
  };
  const SIZES = { banner: [1600, 800, 'Banner'], square: [1080, 1080, 'Square'], portrait: [1080, 1350, 'Portrait'], story: [1080, 1920, 'Story'], wide: [1600, 900, 'Wide'] };
  const BUILTINS = [['chart', 'Candles'], ['aurora', 'Aurora'], ['pixels', 'Pixels'], ['mono', 'Plain']];

  const cfg = () => S.state.share;
  const fontsReady = (async () => {
    await brandReady;
    try { await Promise.all(['800 40px "EJ Inter"', '700 40px "EJ Inter"', '500 40px "EJ Inter"', '500 40px "EJ Grotesk"', '700 40px "EJ Grotesk"', '700 40px "EJ Mono"', '500 40px "EJ Mono"'].map(f => document.fonts.load(f))); } catch (e) {}
  })();

  /* ---------- seeded random ---------- */
  function seedRng(str) {
    let h = 2166136261;
    for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  /* ---------- backgrounds ---------- */
  function drawCover(ctx, src, W, H) {
    const sw = src.width, sh = src.height, s = Math.max(W / sw, H / sh);
    ctx.drawImage(src, (W - sw * s) / 2, (H - sh * s) / 2, sw * s, sh * s);
  }
  function drawBuiltin(ctx, W, H, kind, d) {
    const win = d.result !== 'loss', rnd = seedRng(d.seed + kind);
    const acc = win ? POS : NEG;
    if (kind === 'mono') {
      const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#15191f'); g.addColorStop(1, '#07090c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); return;
    }
    if (kind === 'aurora') {
      ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, W, H);
      const blob = (x, y, r, c) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
      const m = Math.max(W, H);
      blob(W * 0.15, H * 0.1, m * 0.65, win ? 'rgba(46,240,164,.55)' : 'rgba(255,77,99,.55)');
      blob(W * 0.95, H * 0.95, m * 0.7, win ? 'rgba(63,120,255,.5)' : 'rgba(170,40,160,.45)');
      blob(W * 0.9, H * 0.05, m * 0.4, 'rgba(139,123,255,.35)');
      return;
    }
    if (kind === 'pixels') {
      ctx.fillStyle = win ? '#0a22e8' : '#c8102e'; ctx.fillRect(0, 0, W, H);
      const cell = Math.round(Math.min(W, H) / 18);
      ctx.fillStyle = '#05060a';
      for (let y = 0; y < H; y += cell) for (let x = 0; x < W; x += cell) {
        const cx = (x + cell / 2) / W - 0.5, cy = (y + cell / 2) / H - 0.5;
        const edge = Math.max(Math.abs(cx), Math.abs(cy));
        if (rnd() < 0.25 + (0.45 - edge) * 1.6) ctx.fillRect(x, y, cell + 1, cell + 1);
      }
      return;
    }
    // chart: dark grid + seeded candles trending with the result
    ctx.fillStyle = '#06080b'; ctx.fillRect(0, 0, W, H);
    const u = Math.min(W, H) / 1080;
    ctx.strokeStyle = 'rgba(255,255,255,.045)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 90 * u) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 90 * u) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    const n = Math.round(W / (26 * u)), bw = 14 * u;
    let p = H * (win ? 0.8 : 0.2);
    const drift = (win ? -1 : 1) * H * 0.6 / n;
    for (let i = 0; i < n; i++) {
      const o = p, c = p + drift + (rnd() - .5) * 60 * u;
      const hi = Math.min(o, c) - rnd() * 30 * u, lo = Math.max(o, c) + rnd() * 30 * u;
      const up = c < o, x = i * 26 * u + 6 * u;
      ctx.fillStyle = ctx.strokeStyle = up ? 'rgba(46,240,164,.42)' : 'rgba(255,77,99,.42)';
      ctx.beginPath(); ctx.moveTo(x + bw / 2, hi); ctx.lineTo(x + bw / 2, lo); ctx.stroke();
      ctx.fillRect(x, Math.min(o, c), bw, Math.max(2 * u, Math.abs(c - o)));
      p = c;
    }
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, win ? 'rgba(46,240,164,.12)' : 'rgba(255,77,99,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  /* ---------- decode user backgrounds (static or animated GIF) ---------- */
  const cache = {};
  function b64ToBytes(dataUrl) {
    const b = atob(dataUrl.split(',')[1]); const out = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
    return out;
  }
  function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
  async function loadBackground(bg) {
    if (cache[bg.id]) return cache[bg.id];
    const dataUrl = await S.readImage(bg.file);
    if (!dataUrl) throw new Error('missing background');
    let out;
    if (/^data:image\/gif/.test(dataUrl) && window.GifLib) {
      try { out = decodeGif(b64ToBytes(dataUrl)); } catch (e) { console.error('gif decode failed', e); }
    }
    if (!out) { const img = await loadImg(dataUrl); out = { frames: [{ canvas: img, delay: 0 }], animated: false }; }
    cache[bg.id] = out;
    return out;
  }
  function decodeGif(bytes) {
    const gif = GifLib.parseGIF(bytes);
    let frames = GifLib.decompressFrames(gif, true);
    const gw = gif.lsd.width, gh = gif.lsd.height;
    if (frames.length > 180) { const step = Math.ceil(frames.length / 180); frames = frames.filter((_, i) => i % step === 0).map(f => ({ ...f, delay: f.delay * step })); }
    const full = document.createElement('canvas'); full.width = gw; full.height = gh;
    const fctx = full.getContext('2d', { willReadFrequently: true });
    const tmp = document.createElement('canvas'), tctx = tmp.getContext('2d');
    const scale = Math.min(1, 900 / Math.max(gw, gh));
    const out = [];
    let prev = null, restore = null;
    for (const f of frames) {
      if (prev && prev.disposalType === 2) fctx.clearRect(prev.dims.left, prev.dims.top, prev.dims.width, prev.dims.height);
      if (prev && prev.disposalType === 3 && restore) fctx.putImageData(restore, 0, 0);
      restore = f.disposalType === 3 ? fctx.getImageData(0, 0, gw, gh) : null;
      tmp.width = f.dims.width; tmp.height = f.dims.height;
      tctx.putImageData(new ImageData(f.patch, f.dims.width, f.dims.height), 0, 0);
      fctx.drawImage(tmp, f.dims.left, f.dims.top);
      const snap = document.createElement('canvas'); snap.width = Math.round(gw * scale); snap.height = Math.round(gh * scale);
      snap.getContext('2d').drawImage(full, 0, 0, snap.width, snap.height);
      out.push({ canvas: snap, delay: f.delay && f.delay >= 20 ? f.delay : 100 });
      prev = f;
    }
    return { frames: out, animated: out.length > 1 };
  }

  /* ---------- card data ---------- */
  const sgn = n => n > 0 ? '+' : n < 0 ? '-' : '';
  const usd = n => sgn(n) + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rr = r => r === null || r === undefined ? null : sgn(r) + Math.abs(r).toFixed(2) + 'R';
  const pts = p => p === null ? null : sgn(p) + Math.abs(p).toFixed(2) + ' pts';
  const pctS = p => sgn(p) + Math.abs(p).toFixed(2) + '%';

  function tradeData(t, o) {
    const p = S.pnl(t), r = S.rMultiple(t), pt = S.points(t), acc = accountById(t.accountId);
    const pctV = acc && Number(acc.startBalance) ? p / Number(acc.startBalance) * 100 : null;
    let metric = o.metric;
    if (o.hideDollars && metric === 'usd') metric = r !== null ? 'r' : 'pts';
    if (metric === 'r' && r === null) metric = o.hideDollars ? 'pts' : 'usd';
    if (metric === 'pct' && pctV === null) metric = o.hideDollars ? 'pts' : 'usd';
    if (metric === 'pts' && pt === null) metric = r !== null ? 'r' : 'usd';
    const head = { usd: usd(p), r: rr(r), pts: pts(pt), pct: pctV !== null ? pctS(pctV) : null }[metric];
    const headNum = { usd: p, r, pts: pt, pct: pctV }[metric], headFmt = { usd, r: rr, pts, pct: pctS }[metric];
    const subParts = ['usd', 'pts', 'r'].filter(m => m !== metric && !(o.hideDollars && m === 'usd')).map(m => ({ usd: usd(p), pts: pts(pt), r: rr(r) }[m])).filter(Boolean);
    const sp = setupById(t.setup);
    return {
      kind: 'trade', seed: t.id, result: S.result(t), title: t.symbol,
      subtitle: `${t.side === 'short' ? 'SHORT' : 'LONG'} · ${parseKey(S.dayOf(t)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`,
      tiles: [{ k: 'Entry', v: fmtPrice(t.entryPrice) }, { k: 'Exit', v: fmtPrice(t.exitPrice) }, { k: 'Size', v: t.qty + (t.qty == 1 ? ' contract' : ' contracts') }, metric === 'r' ? (o.hideDollars ? { k: 'Points', v: pts(pt) || '-' } : { k: 'Net P&L', v: usd(p) }) : { k: 'Return', v: rr(r) || pts(pt) || '-' }],
      chips: [{ t: t.side === 'short' ? 'SHORT' : 'LONG', c: t.side === 'short' ? NEG : POS }, { t: '×' + t.qty }],
      headline: head, headNum, headFmt, sub: subParts.join('   ·   '),
      stats: [
        { k: 'ENTRY', v: fmtPrice(t.entryPrice) }, { k: 'EXIT', v: fmtPrice(t.exitPrice) },
        { k: 'SIZE', v: t.qty + (t.qty == 1 ? ' contract' : ' contracts') }, { k: 'HOLD', v: fmtHold(S.holdMinutes(t)) }
      ],
      meta: [fmtLongDay(S.dayOf(t)), fmtTime(t.entryTime), sp ? sp.name : ''].filter(Boolean).join('  ·  ')
    };
  }
  function dayData(date, o) {
    const ts = trades().filter(t => S.dayOf(t) === date), s = S.summary(ts);
    let metric = o.metric === 'pts' || o.metric === 'pct' ? 'usd' : o.metric;
    if (o.hideDollars && metric === 'usd') metric = 'r';
    if (metric === 'r' && s.rCount === 0) metric = o.hideDollars ? 'r' : 'usd';
    const head = metric === 'r' ? (rr(s.rSum) || '0.00R') : usd(s.net);
    const headNum = metric === 'r' ? s.rSum : s.net, headFmt = metric === 'r' ? rr : usd;
    const sub = [metric !== 'usd' && !o.hideDollars ? usd(s.net) : null, metric !== 'r' && s.rCount ? rr(s.rSum) : null, `${s.wins}W  ${s.losses}L`].filter(Boolean).join('   ·   ');
    const stats = o.hideDollars
      ? [{ k: 'TRADES', v: String(s.count) }, { k: 'WIN RATE', v: pct(s.winRate, 0) }, { k: 'AVG R', v: rr(s.avgR) || '-' }, { k: 'PF', v: pf(s.profitFactor) }]
      : [{ k: 'TRADES', v: String(s.count) }, { k: 'WIN RATE', v: pct(s.winRate, 0) }, { k: 'BEST', v: usd(s.largestWin) }, { k: 'WORST', v: usd(s.largestLoss) }];
    const syms = [...new Set(ts.map(t => S.rootOf(t.symbol)))].join(' / ') || 'DAY';
    return {
      subtitle: `DAY RECAP · ${parseKey(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`,
      kind: 'day', seed: date, result: s.net > 0.004 ? 'win' : s.net < -0.004 ? 'loss' : 'be', title: syms,
      chips: [{ t: 'DAY RECAP', c: '#a597ff' }], headline: head, headNum, headFmt, sub, stats, meta: fmtLongDay(date)
    };
  }

  function monthData(ym, o) {
    const ts = S.sortTrades(trades().filter(t => S.dayOf(t).startsWith(ym))), s = S.summary(ts);
    const days = Object.values(S.byDay(ts)).sort((a, b) => a.date.localeCompare(b.date));
    let metric = o.metric === 'r' || (o.hideDollars && s.rCount) ? 'r' : 'usd';
    if (metric === 'r' && !s.rCount) metric = 'usd';
    const head = metric === 'r' ? (rr(s.rSum) || '0.00R') : usd(s.net);
    const green = days.filter(d => d.pnl > 0).length;
    const best = days.reduce((a, d) => !a || d.pnl > a.pnl ? d : a, null);
    const bySetup = S.state.setups.map(x => ({ x, s: S.summary(ts.filter(t => t.setup === x.id)) })).filter(z => z.s.count).sort((a, b) => b.s.net - a.s.net)[0];
    const [y, m] = ym.split('-').map(Number);
    let eq = 0; const curve = [0].concat(days.map(d => (eq += metric === 'r' ? d.trades.reduce((a, t) => a + (S.rMultiple(t) || 0), 0) : d.pnl)));
    return {
      subtitle: `MONTHLY RECAP · ${ym.slice(0, 4)}`,
      kind: 'month', seed: ym, result: s.net > 0.004 ? 'win' : s.net < -0.004 ? 'loss' : 'be',
      title: MONTHS[m - 1], chips: [{ t: y + ' RECAP', c: '#a597ff' }],
      headline: head, headNum: metric === 'r' ? s.rSum : s.net, headFmt: metric === 'r' ? rr : usd,
      sub: [metric !== 'r' && s.rCount ? rr(s.rSum) : null, metric === 'r' && !o.hideDollars ? usd(s.net) : null, `${s.count} trades`, `${pct(s.winRate, 0)} win`].filter(Boolean).join('   ·   '),
      curve, dots: days.map(d => d.pnl > 0 ? 'win' : d.pnl < 0 ? 'loss' : 'be'),
      stats: [
        { k: 'GREEN DAYS', v: `${green}/${days.length}` },
        { k: 'PROFIT FACTOR', v: s.count ? pf(s.profitFactor) : '-' },
        o.hideDollars ? { k: 'AVG R', v: rr(s.avgR) || '-' } : { k: 'BEST DAY', v: best ? usd(best.pnl) : '-' },
        { k: 'TOP SETUP', v: bySetup ? bySetup.x.name : '-' }
      ],
      meta: best ? `Best day ${fmtDay(best.date)}  ·  ${days.length} trading days` : ''
    };
  }

  /* ---------- Spotlight layout: left-aligned stats over your background ---------- */
  const titleCase = k => k.charAt(0) + k.slice(1).toLowerCase();
  function renderSpotlight(ctx, W, H, bgFrame, d, o) {
    const u = Math.min(W / 1000, H / 640), F = FONTS[o.font] || FONTS.clean;
    const col = d.result === 'loss' ? NEG : d.result === 'win' ? POS : NEU;
    const numCol = o.numColor === 'result' ? col : '#ffffff';
    const M = 72 * u;
    ctx.save();
    ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px'; ctx.shadowColor = 'transparent'; ctx.textAlign = 'left';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (bgFrame) drawCover(ctx, bgFrame, W, H); else drawBuiltin(ctx, W, H, o.builtin || 'chart', d);
    ctx.fillStyle = `rgba(0,0,0,${o.dim * 0.6})`; ctx.fillRect(0, 0, W, H);
    // readability: dark from the left, plus soft top and bottom bands
    const lg = ctx.createLinearGradient(0, 0, Math.max(W * 0.62, 700 * u), 0);
    lg.addColorStop(0, 'rgba(0,0,0,.88)'); lg.addColorStop(.55, 'rgba(0,0,0,.55)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    const tb = ctx.createLinearGradient(0, 0, 0, H);
    tb.addColorStop(0, 'rgba(0,0,0,.45)'); tb.addColorStop(.18, 'rgba(0,0,0,0)'); tb.addColorStop(.8, 'rgba(0,0,0,0)'); tb.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = tb; ctx.fillRect(0, 0, W, H);

    // header: badge + title + subtitle
    const hy = 44 * u + Math.max(0, (H / u - 640) * 0.04) * u;
    const br = 24 * u, bcx = M + br, bcy = hy;
    const bg = ctx.createLinearGradient(bcx - br, bcy - br, bcx + br, bcy + br); bg.addColorStop(0, '#5dfcc0'); bg.addColorStop(1, '#14a678');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bcx, bcy, br, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4.5 * u; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(bcx - 12 * u, bcy + 8 * u); ctx.lineTo(bcx - 3 * u, bcy - 3 * u); ctx.lineTo(bcx + 3 * u, bcy + 3 * u); ctx.lineTo(bcx + 12 * u, bcy - 9 * u); ctx.stroke();
    ctx.font = `${F.txtW} ${32 * u}px ${F.txt}`; ctx.fillStyle = '#fff';
    const tx = bcx + br + 20 * u; ctx.fillText(d.title, tx, hy + 11 * u);
    const tw = ctx.measureText(d.title).width;
    ctx.font = `500 ${19 * u}px "EJ Inter"`; ctx.letterSpacing = `${1.2 * u}px`; ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillText(d.subtitle || '', tx + tw + 22 * u, hy + 8 * u); ctx.letterSpacing = '0px';

    // headline number (count-up aware)
    const prog = o.progress == null ? 1 : o.progress, pop = o.pop || 0;
    const headText = prog < 1 && d.headFmt && d.headNum != null && isFinite(d.headNum) ? d.headFmt(d.headNum * (1 - Math.pow(1 - prog, 3))) : d.headline;
    const maxW = Math.min(W - 2 * M, 760 * u);
    const hs = fitFont(ctx, d.headline, F.numW, F.num, 104 * u, maxW, 50 * u);
    const hyB = hy + 166 * u;
    ctx.save(); ctx.font = `${F.numW} ${hs}px ${F.num}`; ctx.fillStyle = numCol;
    ctx.shadowColor = numCol === '#ffffff' ? 'rgba(255,255,255,.55)' : hexA(col, .6); ctx.shadowBlur = (28 + 22 * pop) * u;
    if (pop) { const cy = hyB - hs * 0.35; ctx.translate(M, cy); ctx.scale(1 + .05 * pop, 1 + .05 * pop); ctx.translate(-M, -cy); }
    ctx.fillText(headText, M - 4 * u, hyB); ctx.restore();

    // 2x2 tiles
    const tiles = (d.tiles || d.stats.map(s => ({ k: titleCase(s.k), v: s.v }))).slice(0, 4);
    const tW = 187 * u, tH = 90 * u, gap = 16 * u, ty0 = hyB + 38 * u;
    tiles.forEach((t, i) => {
      const x = M + (i % 2) * (tW + gap), y = ty0 + Math.floor(i / 2) * (tH + gap);
      ctx.fillStyle = 'rgba(28,30,36,.72)'; ctx.beginPath(); ctx.roundRect(x, y, tW, tH, 14 * u); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1.5 * u; ctx.stroke();
      ctx.font = `500 ${17 * u}px "EJ Inter"`; ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.fillText(t.k, x + 21 * u, y + 33 * u);
      const vs = fitFont(ctx, t.v, F.txtW, F.num, 24 * u, tW - 36 * u, 13 * u);
      ctx.font = `${F.txtW} ${vs}px ${F.num}`; ctx.fillStyle = '#fff'; ctx.fillText(t.v, x + 21 * u, y + 70 * u);
    });

    // footer: logo + wordmark  x  avatar + handle + badge   |   tagline on the right
    const fy = H - 70 * u;
    let fx = M;
    drawMark(ctx, fx - 2 * u, fy - 16 * u, 34 * u); fx += 40 * u;
    ctx.font = `800 ${22 * u}px "EJ Inter"`; ctx.fillStyle = '#fff'; ctx.fillText('Tessra', fx, fy + 8 * u); fx += ctx.measureText('Tessra').width;
    if (o.handle || o.avatarImg) {
      ctx.font = `500 ${18 * u}px "EJ Inter"`; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillText('×', fx + 12 * u, fy + 6 * u); fx += 34 * u;
      if (o.avatarImg) {
        const ar = 18 * u, acx = fx + ar, acy = fy;
        ctx.save(); ctx.beginPath(); ctx.arc(acx, acy, ar, 0, Math.PI * 2); ctx.clip();
        const im = o.avatarImg, s = Math.max(2 * ar / im.width, 2 * ar / im.height);
        ctx.drawImage(im, acx - im.width * s / 2, acy - im.height * s / 2, im.width * s, im.height * s); ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5 * u; ctx.beginPath(); ctx.arc(acx, acy, ar, 0, Math.PI * 2); ctx.stroke();
        fx += 2 * ar + 12 * u;
      }
      if (o.handle) { ctx.font = `700 ${20 * u}px "EJ Inter"`; ctx.fillStyle = '#fff'; ctx.fillText(o.handle, fx, fy + 7 * u); fx += ctx.measureText(o.handle).width + 10 * u; }
      if (o.verified) {
        const vr = 11 * u, vcx = fx + vr, vcy = fy;
        ctx.fillStyle = '#3d8bff'; ctx.beginPath();
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr2 = i % 2 ? vr * 0.86 : vr * 1.08; ctx.lineTo(vcx + Math.cos(a) * rr2, vcy + Math.sin(a) * rr2); }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6 * u; ctx.beginPath(); ctx.moveTo(vcx - 5 * u, vcy); ctx.lineTo(vcx - 1.5 * u, vcy + 4 * u); ctx.lineTo(vcx + 5.5 * u, vcy - 4 * u); ctx.stroke();
      }
    }
    if (o.tagline) { ctx.textAlign = 'right'; ctx.font = `500 ${17 * u}px "EJ Inter"`; ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.fillText(o.tagline, W - M, fy + 6 * u); }
    ctx.restore();
  }

  /* ---------- the card renderer ---------- */
  function fitFont(ctx, text, weight, fam, size, maxW, min) {
    let s = size;
    do { ctx.font = `${weight} ${s}px ${fam}`; if (ctx.measureText(text).width <= maxW) break; s -= 4; } while (s > min);
    return s;
  }
  function renderCard(ctx, W, H, bgFrame, d, o) {
    if (o.layout === 'spotlight') return renderSpotlight(ctx, W, H, bgFrame, d, o);
    const u = Math.min(W, H) / 1080, F = FONTS[o.font] || FONTS.clean;
    const col = d.result === 'loss' ? NEG : d.result === 'win' ? POS : NEU;
    ctx.save();
    ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px'; ctx.shadowColor = 'transparent';
    if (bgFrame) drawCover(ctx, bgFrame, W, H); else drawBuiltin(ctx, W, H, o.builtin || 'chart', d);
    ctx.fillStyle = `rgba(3,5,8,${o.dim})`; ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    const pw = Math.min(W - 110 * u, 940 * u), pad = 58 * u;
    const inner = pw - pad * 2;
    // measure
    const headSize = fitFont(ctx, d.headline, F.numW, F.num, (d.curve ? 150 : 172) * u, inner, 60 * u);
    const L = { chips: 56 * u, g1: (d.curve ? 30 : 46) * u, head: headSize * 0.8, g2: 34 * u, sub: 34 * u, g3: d.curve ? 34 * u : 50 * u, curve: d.curve ? 120 * u : 0, gd: d.dots ? 22 * u : 0, dots: d.dots ? 22 * u : 0, gc: d.curve ? 26 * u : 0, line: 1, g4: (d.curve ? 34 : 44) * u, stats: 92 * u, g5: d.meta ? (d.curve ? 36 : 46) * u : 0, meta: d.meta ? 26 * u : 0 };
    const ph = pad * 2 + Object.values(L).reduce((a, b) => a + b, 0);
    const px = (W - pw) / 2;
    const py = Math.max(150 * u, (H - ph) / 2);

    // brand header
    ctx.textAlign = 'center';
    ctx.font = `${F.lblW} ${24 * u}px ${F.lbl}`; ctx.letterSpacing = `${6 * u}px`;
    ctx.fillStyle = 'rgba(255,255,255,.82)';
    const brand = 'TESSRA';
    const bwid = ctx.measureText(brand).width, mark = 36 * u, by = Math.max(70 * u, py / 2 + 10 * u);
    const bx = W / 2 - (bwid + mark + 16 * u) / 2;
    drawMark(ctx, bx, by - mark + 4 * u, mark);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.textAlign = 'left';
    ctx.fillText(brand, bx + mark + 16 * u, by); ctx.textAlign = 'center'; ctx.letterSpacing = '0px';

    // glass panel
    if (o.panel) {
      ctx.fillStyle = 'rgba(8,10,14,.62)'; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 34 * u); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.lineWidth = 2 * u; ctx.stroke();
      const sheen = ctx.createLinearGradient(0, py, 0, py + ph * 0.5); sheen.addColorStop(0, 'rgba(255,255,255,.05)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sheen; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 34 * u); ctx.fill();
      ctx.fillStyle = col; ctx.globalAlpha = .9; ctx.beginPath(); ctx.roundRect(W / 2 - 60 * u, py - 3 * u, 120 * u, 6 * u, 3 * u); ctx.fill(); ctx.globalAlpha = 1;
    } else { ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 18 * u; }

    let y = py + pad;
    // title + chips row, centered as a group
    ctx.font = `${F.txtW} ${48 * u}px ${F.txt}`;
    const tw = ctx.measureText(d.title).width;
    ctx.font = `${F.lblW} ${22 * u}px ${F.lbl}`; ctx.letterSpacing = `${3 * u}px`;
    const chipW = d.chips.map(c => ctx.measureText(c.t).width + 30 * u);
    const rowW = tw + chipW.reduce((a, b) => a + b + 14 * u, 0) + 6 * u;
    let x = W / 2 - rowW / 2;
    ctx.letterSpacing = '0px'; ctx.font = `${F.txtW} ${48 * u}px ${F.txt}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.fillText(d.title, x, y + 44 * u); x += tw + 20 * u;
    ctx.font = `${F.lblW} ${22 * u}px ${F.lbl}`; ctx.letterSpacing = `${3 * u}px`;
    d.chips.forEach((c, i) => {
      const w = chipW[i], cy = y + 8 * u, ch = 42 * u;
      ctx.fillStyle = c.c ? hexA(c.c, .16) : 'rgba(255,255,255,.09)';
      ctx.beginPath(); ctx.roundRect(x, cy, w, ch, 10 * u); ctx.fill();
      ctx.fillStyle = c.c || 'rgba(255,255,255,.85)'; ctx.fillText(c.t, x + 15 * u, cy + 29 * u);
      x += w + 14 * u;
    });
    ctx.letterSpacing = '0px'; ctx.textAlign = 'center';
    y += L.chips + L.g1;

    // headline
    const prog = o.progress == null ? 1 : o.progress, pop = o.pop || 0;
    const headText = prog < 1 && d.headFmt && d.headNum != null && isFinite(d.headNum) ? d.headFmt(d.headNum * (1 - Math.pow(1 - prog, 3))) : d.headline;
    ctx.save(); ctx.font = `${F.numW} ${headSize}px ${F.num}`;
    ctx.shadowColor = hexA(col, Math.min(.9, .55 + .35 * pop)); ctx.shadowBlur = (46 + 26 * pop) * u; ctx.fillStyle = col;
    if (pop) { const cy = y + L.head * 0.55; ctx.translate(W / 2, cy); ctx.scale(1 + .07 * pop, 1 + .07 * pop); ctx.translate(-W / 2, -cy); }
    ctx.fillText(headText, W / 2, y + L.head); ctx.restore();
    if (!o.panel) { ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 18 * u; }
    y += L.head + L.g2;

    // sub line
    ctx.font = `${F.lblW} ${30 * u}px ${F.lbl}`; ctx.fillStyle = 'rgba(255,255,255,.72)';
    if (d.sub) ctx.fillText(d.sub, W / 2, y + 28 * u);
    y += L.sub + L.g3;

    // monthly recap: equity curve + one dot per trading day
    if (d.curve && d.curve.length > 1) {
      const cx0 = px + pad, cw0 = inner, ch = L.curve, prog = o.progress == null ? 1 : o.progress;
      const lo = Math.min(0, ...d.curve), hi = Math.max(0, ...d.curve), span = hi - lo || 1;
      const pt = i => [cx0 + i * cw0 / (d.curve.length - 1), y + ch - (d.curve[i] - lo) / span * ch];
      const upto = Math.max(1, Math.round((d.curve.length - 1) * (1 - Math.pow(1 - prog, 3))));
      const zy = y + ch - (0 - lo) / span * ch;
      ctx.save(); ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.setLineDash([6 * u, 6 * u]); ctx.lineWidth = 1.5 * u;
      ctx.beginPath(); ctx.moveTo(cx0, zy); ctx.lineTo(cx0 + cw0, zy); ctx.stroke(); ctx.setLineDash([]);
      const ag = ctx.createLinearGradient(0, y, 0, y + ch); ag.addColorStop(0, hexA(col, .35)); ag.addColorStop(1, hexA(col, 0));
      ctx.beginPath(); ctx.moveTo(...pt(0)); for (let i = 1; i <= upto; i++) ctx.lineTo(...pt(i));
      ctx.lineTo(pt(upto)[0], zy); ctx.lineTo(cx0, zy); ctx.closePath(); ctx.fillStyle = ag; ctx.fill();
      ctx.beginPath(); ctx.moveTo(...pt(0)); for (let i = 1; i <= upto; i++) ctx.lineTo(...pt(i));
      ctx.strokeStyle = col; ctx.lineWidth = 5 * u; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.shadowColor = hexA(col, .6); ctx.shadowBlur = 18 * u; ctx.stroke();
      const [ex, ey] = pt(upto); ctx.beginPath(); ctx.arc(ex, ey, 9 * u, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.restore();
      y += L.curve + L.gd;
      if (d.dots && d.dots.length) {
        const n = d.dots.length, gap = 6 * u, sz = Math.min(22 * u, (inner - gap * (n - 1)) / n);
        let dx = W / 2 - (n * sz + (n - 1) * gap) / 2;
        const shown = Math.round(n * (1 - Math.pow(1 - prog, 3)));
        d.dots.forEach((r, i) => { ctx.fillStyle = i >= shown ? 'rgba(255,255,255,.08)' : r === 'win' ? POS : r === 'loss' ? NEG : 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.roundRect(dx, y, sz, sz, 5 * u); ctx.fill(); dx += sz + gap; });
      }
      y += L.dots + L.gc;
    }

    // divider
    const dg = ctx.createLinearGradient(px + pad, 0, px + pw - pad, 0);
    dg.addColorStop(0, 'rgba(255,255,255,0)'); dg.addColorStop(.5, 'rgba(255,255,255,.22)'); dg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = dg; ctx.fillRect(px + pad, y, inner, Math.max(1, 1.5 * u));
    y += L.line + L.g4;

    // stats columns
    const n = d.stats.length, cw = inner / n;
    d.stats.forEach((s, i) => {
      const cx = px + pad + cw * i + cw / 2;
      let ls = 4, lf = 20;
      for (;;) { ctx.font = `${F.lblW} ${lf * u}px ${F.lbl}`; ctx.letterSpacing = `${ls * u}px`; if (ctx.measureText(s.k).width <= cw - 14 * u || lf <= 13) break; if (ls > 1.5) ls -= 1; else lf -= 1; }
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.fillText(s.k, cx + ls / 2 * u, y + 20 * u);
      ctx.letterSpacing = '0px';
      const vs = fitFont(ctx, s.v, F.txtW, F.num, 40 * u, cw - 18 * u, 18 * u);
      ctx.font = `${F.txtW} ${vs}px ${F.num}`; ctx.fillStyle = '#fff';
      ctx.fillText(s.v, cx, y + 78 * u);
      if (i) { ctx.fillStyle = 'rgba(255,255,255,.09)'; ctx.fillRect(px + pad + cw * i, y + 4 * u, Math.max(1, 1.5 * u), 80 * u); }
    });
    y += L.stats + L.g5;

    if (d.meta) { ctx.font = `${F.lblW} ${22 * u}px ${F.lbl}`; ctx.letterSpacing = `${1 * u}px`; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillText(d.meta, W / 2, y + 20 * u); ctx.letterSpacing = '0px'; }

    // footer
    const foot = [o.handle, o.tagline].filter(Boolean).join('   ·   ');
    if (foot) {
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 12 * u;
      ctx.font = `${F.lblW} ${24 * u}px ${F.lbl}`; ctx.letterSpacing = `${2 * u}px`; ctx.fillStyle = 'rgba(255,255,255,.8)';
      const fy = Math.min(H - 56 * u, py + ph + (H - py - ph) / 2 + 8 * u);
      ctx.fillText(foot, W / 2, fy);
    }
    ctx.restore();
  }
  // Tessra logo tile (embedded image), drawn at any size
  function drawMark(ctx, x, y, size) {
    ctx.save(); ctx.shadowColor = 'transparent';
    ctx.beginPath(); ctx.roundRect(x, y, size, size, size * 0.24); ctx.clip();
    if (BRAND_IMG.complete && BRAND_IMG.naturalWidth) ctx.drawImage(BRAND_IMG, x, y, size, size); else { ctx.fillStyle = '#16181c'; ctx.fillRect(x, y, size, size); }
    ctx.restore();
  }
  function hexA(hex, a) {
    const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  }

  /* ---------- background choice ---------- */
  function autoPick(result, seed) {
    const lib = cfg().backgrounds.filter(b => b.use === 'any' || b.use === result || (result === 'be' && b.use === 'win'));
    if (!lib.length) return { builtin: 'chart' };
    return { user: lib[Math.floor(seedRng(seed)() * lib.length)] };
  }
  function resolveChoice(choice, d) {
    if (!choice || choice === 'auto') return autoPick(d.result, d.seed);
    if (choice.startsWith('b:')) return { builtin: choice.slice(2) };
    const bg = cfg().backgrounds.find(b => b.id === choice.slice(2));
    return bg ? { user: bg } : { builtin: 'chart' };
  }

  /* ---------- export helpers ---------- */
  function bytesToB64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
  async function saveBytes(name, b64, mime) {
    if (window.edge && window.edge.saveBinary) { const p = await window.edge.saveBinary(name, b64); if (p) toast('Saved'); return; }
    const a = document.createElement('a'); a.href = `data:${mime};base64,${b64}`; a.download = name; a.click();
  }
  async function copyPng(dataUrl) {
    try {
      if (window.edge && window.edge.copyImage) await window.edge.copyImage(dataUrl);
      else { const blob = await (await fetch(dataUrl)).blob(); await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); }
      toast(`Card copied. Paste it anywhere with ${MOD}V`);
    } catch (e) { console.error(e); toast('Copy failed, use Save PNG instead'); }
  }
  async function airdrop(name, b64, mime) {
    if (!(window.edge && window.edge.shareFile)) { toast('AirDrop works in the Mac app. Saving instead.'); return saveBytes(name, b64, mime); }
    try {
      const r = await window.edge.shareFile(name, b64);
      if (r === 'menu') toast('Pick AirDrop, then your iPhone');
    } catch (e) { console.error(e); toast('Could not open the share menu'); }
  }
  /* ---------- animation timeline: count-up, pop, hold, background frames ---------- */
  function buildTimeline(bg, countUp) {
    const anim = !!(bg && bg.animated), out = [];
    if (!countUp) {
      if (!anim) return [{ fi: 0, progress: 1, pop: 0, delay: 0 }];
      return bg.frames.map((f, i) => ({ fi: i, progress: 1, pop: 0, delay: f.delay }));
    }
    const TICK = 40, COUNT = 42, POP = 7, HOLD = 2600;
    const D = anim ? bg.frames.reduce((a, f) => a + f.delay, 0) : 0;
    const locate = t => { let m = t % D, acc = 0; for (let i = 0; i < bg.frames.length; i++) { if (m < acc + bg.frames[i].delay) return [i, acc + bg.frames[i].delay - m]; acc += bg.frames[i].delay; } return [0, bg.frames[0].delay]; };
    const fiAt = t => anim ? locate(t)[0] : 0;
    let t = 0;
    for (let i = 0; i < COUNT; i++, t += TICK) out.push({ fi: fiAt(t), progress: i / (COUNT - 1), pop: 0, delay: TICK });
    for (let i = 1; i <= POP; i++, t += TICK) out.push({ fi: fiAt(t), progress: 1, pop: Math.sin(i / POP * Math.PI), delay: TICK });
    if (!anim) { out.push({ fi: 0, progress: 1, pop: 0, delay: HOLD }); return out; }
    const end = t + Math.max(HOLD, D);
    while (t < end - 1) {
      const [fi, left] = locate(t);
      const step = Math.max(20, Math.round(Math.min(left, end - t)));
      out.push({ fi, progress: 1, pop: 0, delay: step });
      t += step;
    }
    return out;
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  async function buildGif(bg, W, H, d, o, timeline, onProgress) {
    const scale = 720 / Math.max(W, H), w = Math.round(W * scale), h = Math.round(H * scale);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const enc = GifLib.GIFEncoder();
    for (let i = 0; i < timeline.length; i++) {
      const it = timeline[i];
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      renderCard(ctx, W, H, bg ? bg.frames[it.fi].canvas : null, d, Object.assign({}, o, { progress: it.progress, pop: it.pop }));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const { data } = ctx.getImageData(0, 0, w, h);
      const palette = GifLib.quantize(data, 256);
      // ordered (Bayer) dithering so glows and gradients don't band in the 256 color GIF palette
      for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
        const off = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * 14;
        data[i] += off; data[i + 1] += off; data[i + 2] += off;
      }
      enc.writeFrame(GifLib.applyPalette(data, palette), w, h, { palette, delay: it.delay || 100 });
      onProgress((i + 1) / timeline.length);
      if (i % 2) await new Promise(r => setTimeout(r, 0));
    }
    enc.finish();
    return enc.bytes();
  }

  /* ---------- the share modal ---------- */
  async function open(kind, ref) {
    await fontsReady;
    const c0 = cfg();
    const o = Object.assign({ size: 'banner', layout: 'spotlight', numColor: 'white', metric: 'usd', font: 'clean', dim: 0.35, panel: true, hideDollars: false, countUp: true }, c0.last && c0.last.v2 ? c0.last : Object.assign({}, c0.last || {}, { size: 'banner', layout: 'spotlight', dim: 0.35 }), { username: c0.handle || '', showHandle: c0.showHandle !== false, tagline: c0.tagline, verified: !!c0.verified });
    const syncHandle = () => { o.handle = o.showHandle ? o.username.trim() : ''; };
    syncHandle();
    if (c0.avatar) { try { o.avatarImg = await loadImg(await S.readImage(c0.avatar)); } catch (e) {} }
    if (c0.hideDollars) o.hideDollars = true;
    let choice = 'auto', bgData = null, timer = null, tl = [{ fi: 0, progress: 1, pop: 0, delay: 0 }], ti = 0, cur = tl[0], busy = false;
    const getData = () => kind === 'trade' ? tradeData(S.state.trades.find(t => t.id === ref), o) : kind === 'month' ? monthData(ref, o) : dayData(ref, o);
    const t = kind === 'trade' ? S.state.trades.find(x => x.id === ref) : null;
    const hasAcc = t && accountById(t.accountId) && Number(accountById(t.accountId).startBalance);
    const metricOpts = kind === 'trade' ? [['usd', '$ P&L'], ['r', 'R'], ['pts', 'Points']].concat(hasAcc ? [['pct', '% acct']] : []) : [['usd', '$ P&L'], ['r', 'R']];
    const thumbs = () => [`<button class="bg-thumb ${choice === 'auto' ? 'on' : ''}" data-bg="auto" title="Auto: picks from your library by win or loss"><span>Auto</span></button>`]
      .concat(BUILTINS.map(([k, l]) => `<button class="bg-thumb builtin bt-${k} ${choice === 'b:' + k ? 'on' : ''}" data-bg="b:${k}"><span>${l}</span></button>`))
      .concat(cfg().backgrounds.map(b => `<button class="bg-thumb ${choice === 'u:' + b.id ? 'on' : ''}" data-bg="u:${b.id}" title="${esc(b.use === 'any' ? 'Any trade' : b.use === 'win' ? 'Wins' : 'Losses')}"><img src="${S.imageSrc(b.file)}" alt="">${b.kind === 'gif' ? '<i>GIF</i>' : ''}</button>`))
      .concat([`<button class="bg-thumb add" data-bg="add" title="Upload image or GIF">${ICON.plus}</button>`]).join('');
    const segH = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-o="${key}" data-v="${v}" class="${String(o[key]) === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const m = openModal(`<div class="modal-h"><h3>Share ${kind === 'trade' ? 'trade' : kind === 'month' ? 'monthly recap' : 'day'}</h3><button class="btn icon ghost" data-close>${ICON.close}</button></div>
      <div class="share-wrap">
        <div class="share-left"><div class="share-stage"><canvas id="shareCv"></canvas></div>
          <div class="share-actions">
            <button class="btn primary" data-act="airdrop">${ICON.airdrop}${IS_MAC ? 'AirDrop' : 'Show file'}</button>
            <button class="btn" data-act="copy">${ICON.copy}Copy image</button>
            <button class="btn" data-act="png">${ICON.download}Save PNG</button>
            <button class="btn" data-act="gif" id="gifBtn" style="display:none">${ICON.download}Save GIF</button>
          </div>
          <div class="hint share-hint" id="gifHint"></div></div>
        <div class="share-ctrl">
          <div class="field"><label>Layout</label>${segH('layout', [['spotlight', 'Spotlight'], ['classic', 'Centered']])}</div>
          <div class="field" id="numColF"><label>Number color</label>${segH('numColor', [['white', 'White'], ['result', 'Green / red']])}</div>
          <div class="field"><label>Size</label>${segH('size', Object.entries(SIZES).map(([k, v]) => [k, v[2]]))}</div>
          <div class="field"><label>Headline</label><div id="metricSeg">${segH('metric', metricOpts)}</div></div>
          <div class="field"><label>Font</label>${segH('font', Object.entries(FONTS).map(([k, v]) => [k, v.label]))}</div>
          <div class="field"><label>Username</label><div class="row" style="gap:10px;align-items:center"><input class="input" id="shareUser" value="${esc(o.username)}" placeholder="@yourname" maxlength="32" style="flex:1"><label class="row" style="gap:6px;cursor:pointer;font-size:13px;white-space:nowrap"><input type="checkbox" id="shareUserOn" ${o.showHandle ? 'checked' : ''} style="accent-color:var(--accent)">Show on card</label></div></div>
          <div class="field"><label>Background</label><div class="bg-grid" id="bgGrid">${thumbs()}</div><span class="hint">Auto uses your Settings library: win backgrounds on green trades, loss backgrounds on red.</span></div>
          <div class="field"><label>Darken background <span class="faint" id="dimV">${Math.round(o.dim * 100)}%</span></label><input type="range" min="0" max="85" value="${Math.round(o.dim * 100)}" id="dimR" class="range"></div>
          <div class="check-list"><label><input type="checkbox" data-ck="countUp" ${o.countUp ? 'checked' : ''}>Count-up animation (P&L tallies up from 0 in the GIF)</label><label><input type="checkbox" data-ck="panel" ${o.panel ? 'checked' : ''}>Glass panel behind stats</label><label><input type="checkbox" data-ck="hideDollars" ${o.hideDollars ? 'checked' : ''}>Hide dollar amounts (show R and points)</label></div>

        </div>
      </div>`, { size: 'xl', onClose: () => clearTimeout(timer) });
    const cv = m.querySelector('#shareCv'), stage = m.querySelector('.share-stage');
    const isAnimated = () => !!(bgData && bgData.animated) || !!o.countUp;

    const draw = it => {
      const [W, H] = SIZES[o.size];
      const sc = 0.5;
      if (cv.width !== W * sc || cv.height !== H * sc) { cv.width = W * sc; cv.height = H * sc; }
      const maxH = Math.min(window.innerHeight - 260, 600), maxW = Math.max(200, (stage.clientWidth || 560) - 36);
      const k = Math.min(maxH / H, maxW / W);
      cv.style.width = Math.round(W * k) + 'px'; cv.style.height = Math.round(H * k) + 'px';
      const ctx = cv.getContext('2d');
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      const frame = bgData && bgData.frames[it.fi % bgData.frames.length];
      renderCard(ctx, W, H, frame ? frame.canvas : null, getData(), Object.assign({}, o, { progress: it.progress, pop: it.pop }));
    };
    const loop = () => {
      clearTimeout(timer);
      if (!document.body.contains(cv)) return;
      cur = tl[ti % tl.length];
      draw(cur);
      if (tl.length > 1) { ti++; timer = setTimeout(loop, cur.delay); }
    };
    const restart = () => { tl = buildTimeline(bgData, o.countUp); ti = 0; updateHint(); loop(); };
    const redraw = () => { if (tl.length <= 1) draw(cur); };
    const updateHint = () => {
      const anim = isAnimated();
      m.querySelector('#gifBtn').style.display = anim ? '' : 'none';
      m.querySelector('#gifHint').textContent = anim
        ? `AirDrop and Save GIF send the animated card${o.countUp ? ' with the count-up' : ''}. Copy and PNG send a still of the final numbers.`
        : 'AirDrop opens the Mac share menu. Pick AirDrop, then your phone.';
    };
    const applyChoice = async () => {
      const r = resolveChoice(choice, getData());
      o.builtin = r.builtin || null; bgData = null;
      if (r.user) { try { bgData = await loadBackground(r.user); } catch (e) { toast('Could not load that background'); } }
      restart();
    };
    const rememberOpts = () => { const { size, metric, font, dim, panel, countUp, layout, numColor } = o; cfg().last = { size, metric, font, dim, panel, countUp, layout, numColor, v2: true }; S.save(); };

    m.addEventListener('click', async e => {
      const ob = e.target.closest('[data-o]');
      if (ob) { o[ob.dataset.o] = ob.dataset.v; ob.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === ob)); rememberOpts(); restart(); return; }
      const bb = e.target.closest('[data-bg]');
      if (bb) {
        if (bb.dataset.bg === 'add') {
          const added = await pickBackgrounds();
          if (added.length) { choice = 'u:' + added[0].id; m.querySelector('#bgGrid').innerHTML = thumbs(); applyChoice(); }
          return;
        }
        choice = bb.dataset.bg; m.querySelectorAll('[data-bg]').forEach(b => b.classList.toggle('on', b === bb)); applyChoice(); return;
      }
      if (e.target.closest('[data-close]')) return closeModal(m);
      const a = e.target.closest('[data-act]');
      if (!a || busy) return;
      const [W, H] = SIZES[o.size];
      const d = getData();
      const fname = (kind === 'trade' ? `${d.title}-${S.dayOf(t)}` : kind === 'month' ? `recap-${ref}` : `day-${ref}`).replace(/[^\w-]+/g, '_');
      if (a.dataset.act === 'gif' || (a.dataset.act === 'airdrop' && isAnimated())) {
        busy = true; const lbl = a.innerHTML;
        try {
          const bytes = await buildGif(bgData, W, H, d, o, buildTimeline(bgData, o.countUp), p => { a.innerHTML = `Encoding ${Math.round(p * 100)}%`; });
          if (a.dataset.act === 'airdrop') await airdrop(`${fname}.gif`, bytesToB64(bytes), 'image/gif');
          else await saveBytes(`${fname}.gif`, bytesToB64(bytes), 'image/gif');
        } catch (err) { console.error(err); toast('GIF export failed'); }
        a.innerHTML = lbl; busy = false; return;
      }
      const full = document.createElement('canvas'); full.width = W; full.height = H;
      const frame = bgData && bgData.frames[cur.fi % bgData.frames.length];
      renderCard(full.getContext('2d'), W, H, frame ? frame.canvas : null, d, Object.assign({}, o, { progress: 1, pop: 0 }));
      const url = full.toDataURL('image/png');
      if (a.dataset.act === 'copy') copyPng(url);
      else if (a.dataset.act === 'airdrop') airdrop(`${fname}.png`, url.split(',')[1], 'image/png');
      else saveBytes(`${fname}.png`, url.split(',')[1], 'image/png');
    });
    m.querySelector('#dimR').addEventListener('input', e => { o.dim = e.target.value / 100; m.querySelector('#dimV').textContent = e.target.value + '%'; rememberOpts(); redraw(); });
    m.querySelector('#shareUser').addEventListener('input', e => { o.username = e.target.value; cfg().handle = o.username.trim(); if (o.username.trim() && !o.showHandle) { o.showHandle = true; cfg().showHandle = true; m.querySelector('#shareUserOn').checked = true; } syncHandle(); S.save(); redraw(); });
    m.querySelector('#shareUserOn').addEventListener('change', e => { o.showHandle = e.target.checked; cfg().showHandle = o.showHandle; syncHandle(); S.save(); redraw(); });
    m.querySelectorAll('[data-ck]').forEach(cb => cb.addEventListener('change', () => { o[cb.dataset.ck] = cb.checked; rememberOpts(); if (cb.dataset.ck === 'countUp' || cb.dataset.ck === 'hideDollars') restart(); else redraw(); }));
    requestAnimationFrame(applyChoice);
  }

  /* ---------- background library (used by Settings and the modal) ---------- */
  function pickBackgrounds(use = 'any') {
    return new Promise(res => {
      const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = true;
      i.onchange = async () => res(await addBackgroundFiles(i.files, use));
      i.click();
    });
  }
  async function addBackgroundFiles(files, use = 'any') {
    const urls = await filesToDataUrls(files);
    const added = [];
    for (const u of urls) {
      const file = await S.saveImage(u);
      const b = { id: S.uid(), file, kind: /^data:image\/gif/.test(u) ? 'gif' : 'image', use };
      cfg().backgrounds.push(b); added.push(b);
    }
    if (added.length) { S.save(); toast(`Added ${added.length} background${added.length === 1 ? '' : 's'}`); }
    return added;
  }
  function removeBackground(id) {
    const b = cfg().backgrounds.find(x => x.id === id); if (!b) return;
    S.deleteImage(b.file); delete cache[id];
    cfg().backgrounds = cfg().backgrounds.filter(x => x.id !== id); S.save();
  }

  return { open, monthData, buildTimeline, buildGif, renderCard, tradeData, dayData, addBackgroundFiles, pickBackgrounds, removeBackground, loadBackground, SIZES, FONTS, fontsReady };
})();
