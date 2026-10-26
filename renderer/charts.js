/* Tessra: lightweight SVG charts (no dependencies, works offline) */
const Charts = (() => {
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  let tip;
  function tooltip() {
    if (!tip) { tip = document.createElement('div'); tip.className = 'chart-tip'; document.body.appendChild(tip); }
    return tip;
  }
  function showTip(html, x, y) {
    const t = tooltip(); t.innerHTML = html; t.style.display = 'block';
    const w = t.offsetWidth, h = t.offsetHeight;
    let left = x + 14, top = y - h - 10;
    if (left + w > window.innerWidth - 8) left = x - w - 14;
    if (top < 8) top = y + 16;
    t.style.left = left + 'px'; t.style.top = top + 'px';
  }
  function hideTip() { if (tip) tip.style.display = 'none'; }

  function niceTicks(min, max, count = 4) {
    if (min === max) { min -= 1; max += 1; }
    const span = max - min;
    const step0 = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
    return ticks;
  }
  const short$ = v => {
    const a = Math.abs(v), s = v < 0 ? '-' : '';
    if (a >= 1000) return s + '$' + (a / 1000).toFixed(a >= 10000 ? 0 : 1) + 'k';
    return s + '$' + Math.round(a);
  };

  /* Line / area chart. pts: [{label, value, tip}] */
  function line(el, pts, opt = {}) {
    if (!el) return;
    const W = el.clientWidth || 600, H = opt.height || 240;
    let padL = 54, padR = 12, padT = 12, padB = 26;
    if (opt.mini) { padL = 2; padR = 2; padT = 4; padB = 4; }
    if (!pts.length) { el.innerHTML = `<div class="chart-empty" style="height:${H}px">No data yet</div>`; return; }
    const vals = pts.map(p => p.value);
    const all = opt.zero === false ? vals : vals.concat([0]);
    const ticks = niceTicks(Math.min(...all), Math.max(...all));
    const lo = ticks[0], hi = ticks[ticks.length - 1];
    const n = pts.length;
    const x = i => padL + (n === 1 ? (W - padL - padR) / 2 : i * (W - padL - padR) / (n - 1));
    const y = v => padT + (hi - v) * (H - padT - padB) / (hi - lo || 1);
    const last = vals[vals.length - 1];
    const color = opt.color || (last >= 0 ? css('--pos') : css('--neg'));
    const gid = 'g' + Math.random().toString(36).slice(2, 7);
    let d = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.value).toFixed(1)).join(' ');
    if (n === 1) d = `M${padL} ${y(pts[0].value)} L${W - padR} ${y(pts[0].value)}`;
    const base = opt.fillTo === 'bottom' ? H - padB : y(Math.max(lo, Math.min(hi, 0)));
    const area = n > 1 ? `${d} L${x(n - 1)} ${base} L${x(0)} ${base} Z` : '';
    const grid = opt.mini ? '' : ticks.map(t => `<line x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}" class="grid${t === 0 ? ' zero' : ''}"/>
      <text x="${padL - 8}" y="${y(t) + 4}" class="axis" text-anchor="end">${(opt.yfmt || short$)(t)}</text>`).join('');
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - padL) / 90))));
    const xl = opt.mini ? '' : pts.map((p, i) => (i % every === 0 || i === n - 1) && p.label ? `<text x="${x(i)}" y="${H - 8}" class="axis" text-anchor="middle">${p.label}</text>` : '').join('');
    el.innerHTML = `<svg width="${W}" height="${H}" class="chart">
      <defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="${color}" stop-opacity="${opt.fillTo === 'bottom' ? .28 : .22}"/>
        <stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      ${grid}${xl}
      ${area ? `<path d="${area}" fill="url(#${gid})"/>` : ''}
      <path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <line class="hover-line" y1="${padT}" y2="${H - padB}" x1="-10" x2="-10"/>
      <circle class="hover-dot" r="4" cx="-10" cy="-10" fill="${color}"/>
      <rect x="${padL}" y="0" width="${W - padL - padR}" height="${H}" fill="transparent" class="hit"/>
    </svg>`;
    const svg = el.querySelector('svg'), hl = svg.querySelector('.hover-line'), dot = svg.querySelector('.hover-dot');
    svg.querySelector('.hit').addEventListener('mousemove', e => {
      const r = svg.getBoundingClientRect();
      const i = Math.max(0, Math.min(n - 1, Math.round((e.clientX - r.left - padL) / ((W - padL - padR) / Math.max(1, n - 1)))));
      const p = pts[i];
      hl.setAttribute('x1', x(i)); hl.setAttribute('x2', x(i));
      dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(p.value));
      showTip(p.tip || `${p.label}<br><b>${(opt.yfmt || short$)(p.value)}</b>`, e.clientX, e.clientY);
    });
    svg.querySelector('.hit').addEventListener('mouseleave', () => { hideTip(); hl.setAttribute('x1', -10); hl.setAttribute('x2', -10); dot.setAttribute('cx', -10); });
    if (opt.onClick) svg.querySelector('.hit').addEventListener('click', e => {
      const r = svg.getBoundingClientRect();
      const i = Math.max(0, Math.min(n - 1, Math.round((e.clientX - r.left - padL) / ((W - padL - padR) / Math.max(1, n - 1)))));
      opt.onClick(pts[i], i);
    });
  }

  /* Vertical bar chart. items: [{label, value, tip, color}] */
  function bars(el, items, opt = {}) {
    if (!el) return;
    const W = el.clientWidth || 600, H = opt.height || 220;
    const padL = 54, padR = 10, padT = 12, padB = 26;
    if (!items.length) { el.innerHTML = `<div class="chart-empty" style="height:${H}px">No data yet</div>`; return; }
    const vals = items.map(i => i.value);
    const ticks = niceTicks(Math.min(0, ...vals), Math.max(0, ...vals));
    const lo = ticks[0], hi = ticks[ticks.length - 1];
    const y = v => padT + (hi - v) * (H - padT - padB) / (hi - lo || 1);
    const n = items.length, slot = (W - padL - padR) / n, bw = Math.max(2, Math.min(42, slot * 0.68));
    const pos = css('--pos'), neg = css('--neg');
    const fmt = opt.yfmt || short$;
    const grid = ticks.map(t => `<line x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}" class="grid${t === 0 ? ' zero' : ''}"/>
      <text x="${padL - 8}" y="${y(t) + 4}" class="axis" text-anchor="end">${fmt(t)}</text>`).join('');
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - padL) / (opt.labelWidth || 54)))));
    const bs = items.map((it, i) => {
      const cx = padL + slot * i + slot / 2;
      const y0 = y(0), y1 = y(it.value);
      const top = Math.min(y0, y1), h = Math.max(1, Math.abs(y1 - y0));
      const c = it.color || (it.value >= 0 ? pos : neg);
      return `<rect x="${cx - bw / 2}" y="${top}" width="${bw}" height="${h}" rx="${Math.min(4, bw / 3)}" fill="${c}" class="bar" data-i="${i}"/>
        <rect x="${padL + slot * i}" y="0" width="${slot}" height="${H}" fill="transparent" class="hit" data-i="${i}"/>
        ${(i % every === 0) ? `<text x="${cx}" y="${H - 8}" class="axis" text-anchor="middle">${it.label}</text>` : ''}`;
    }).join('');
    el.innerHTML = `<svg width="${W}" height="${H}" class="chart">${grid}${bs}</svg>`;
    el.querySelectorAll('.hit').forEach(r => {
      const it = items[+r.dataset.i];
      r.addEventListener('mousemove', e => showTip(it.tip || `${it.label}<br><b>${fmt(it.value)}</b>`, e.clientX, e.clientY));
      r.addEventListener('mouseleave', hideTip);
      if (opt.onClick) { r.style.cursor = 'pointer'; r.addEventListener('click', () => opt.onClick(it)); }
    });
  }

  /* Multi-series line. series: [{name, color, pts:[{label, value}]}], same length */
  function multi(el, series, opt = {}) {
    if (!el) return;
    const W = el.clientWidth || 600, H = opt.height || 240, padL = 54, padR = 12, padT = 12, padB = 26;
    const n = Math.max(0, ...series.map(s => s.pts.length));
    if (!n) { el.innerHTML = `<div class="chart-empty" style="height:${H}px">No data yet</div>`; return; }
    const all = series.flatMap(s => s.pts.map(p => p.value)).concat([0]);
    const ticks = niceTicks(Math.min(...all), Math.max(...all)), lo = ticks[0], hi = ticks[ticks.length - 1];
    const x = i => padL + (n === 1 ? (W - padL - padR) / 2 : i * (W - padL - padR) / (n - 1));
    const y = v => padT + (hi - v) * (H - padT - padB) / (hi - lo || 1);
    const grid = ticks.map(t => `<line x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}" class="grid${t === 0 ? ' zero' : ''}"/><text x="${padL - 8}" y="${y(t) + 4}" class="axis" text-anchor="end">${short$(t)}</text>`).join('');
    const lbl = series[0].pts, every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - padL) / 90))));
    const xl = lbl.map((p, i) => (i % every === 0 || i === n - 1) && p.label ? `<text x="${x(i)}" y="${H - 8}" class="axis" text-anchor="middle">${p.label}</text>` : '').join('');
    const paths = series.map((s, si) => `<path d="${s.pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.value).toFixed(1)).join(' ')}" fill="none" stroke="${s.color}" stroke-width="${si === series.length - 1 ? 2.4 : 1.8}" ${si < series.length - 1 ? 'stroke-dasharray="5 4"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`).join('');
    el.innerHTML = `<svg width="${W}" height="${H}" class="chart">${grid}${xl}${paths}<line class="hover-line" y1="${padT}" y2="${H - padB}" x1="-10" x2="-10"/><rect x="${padL}" y="0" width="${W - padL - padR}" height="${H}" fill="transparent" class="hit"/></svg>`;
    const svg = el.querySelector('svg'), hl = svg.querySelector('.hover-line');
    svg.querySelector('.hit').addEventListener('mousemove', e => {
      const r = svg.getBoundingClientRect();
      const i = Math.max(0, Math.min(n - 1, Math.round((e.clientX - r.left - padL) / ((W - padL - padR) / Math.max(1, n - 1)))));
      hl.setAttribute('x1', x(i)); hl.setAttribute('x2', x(i));
      showTip(`${lbl[i] ? lbl[i].label : ''}<br>` + series.map(s => `<span style="color:${s.color}">●</span> ${s.name} <b>${short$(s.pts[i] ? s.pts[i].value : 0)}</b>`).join('<br>'), e.clientX, e.clientY);
    });
    svg.querySelector('.hit').addEventListener('mouseleave', () => { hideTip(); hl.setAttribute('x1', -10); hl.setAttribute('x2', -10); });
  }

  return { line, bars, multi, hideTip, short$ };
})();
