/* ============================================================
   LIVE MODULE — OVERVIEW MARKET: NASDAQ COMPOSITE • S&P 500 • DOW JONES
   Tiga desain berbeda: Area + SMA (NASDAQ), Candlestick (S&P 500), Channel ±2σ (Dow Jones).
   Bergerak otomatis tiap 1 detik. Data = simulasi ilustratif sampai feed pasar nyata tersambung.
   ============================================================ */
(function () {
  'use strict';
  if (window.__liveIndexCards) return;
  window.__liveIndexCards = true;
  var PAGE = 'page-stock-exchange', H = 80, SHOW = 60, CN = 30, PER = 8;
  var UP = '#10B981', DN = '#EF4444';
  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var fmt = function (n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var hms = function (d) { return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2); };
  var visible = function () { var p = $(PAGE); return !!p && p.classList.contains('active') && !document.hidden; };
  var safe = function (f) { return function () { try { f(); } catch (e) { console.warn('[index-cards]', e); } }; };
  var tip = { backgroundColor: '#09090b', borderColor: '#27272a', borderWidth: 1, titleColor: '#fff', bodyColor: '#d1d5db', padding: 6, displayColors: false };
  var IX = [
    { key: 'nasdaq', id: 'ov-nasdaq', cv: 'overview-nasdaq', start: 138.20, prev: 138.20 / 1.0082, vol: .0016, kind: 'area' },
    { key: 'sp',     id: 'ov-sp',     cv: 'overview-sp',     start: 228.50, prev: 228.50 / 1.0035, vol: .0012, kind: 'candle' },
    { key: 'dow',    id: 'ov-dow',    cv: 'overview-dow',    start: 245.60, prev: 245.60 / .9982,  vol: .0018, kind: 'band' },
    { key: 'msft',   id: 'ov-msft',   cv: 'overview-msft',   start: 428.30, prev: 428.30 / 1.0046, vol: .0012, kind: 'band' }
  ];
  function step(x, p) { if (x.live) return x.px; return clamp(p * (1 + rnd(-1, 1) * x.vol + (x.start - p) / x.start * .015), x.start * .985, x.start * 1.015); }
  function seed(x) {
    var n = x.kind === 'candle' ? CN * PER : H, a = [], p = x.start, i, t = Date.now();
    for (i = 0; i < n; i++) { a.unshift(p); p = clamp(p * (1 + rnd(-1, 1) * x.vol * 1.3), x.start * .988, x.start * 1.012); }
    x.px = x.start; x.hi = Math.max.apply(null, a); x.lo = Math.min.apply(null, a); x.cn = 0; x.chart = null;
    if (x.kind === 'candle') {
      x.cd = [];
      for (i = 0; i < CN; i++) { var s = a.slice(i * PER, i * PER + PER); x.cd.push({ o: s[0], h: Math.max.apply(null, s), l: Math.min.apply(null, s), c: s[PER - 1], t: hms(new Date(t - (CN - i) * PER * 1000)) }); }
    } else {
      x.h = a; x.t = a.map(function (_, i) { return hms(new Date(t - (n - 1 - i) * 1000)); });
    }
  }
  IX.forEach(seed); window.__IX = IX; window.__IXseed = seed;
  function tick(x) {
    var p = x.px = step(x, x.px), now = hms(new Date());
    x.hi = Math.max(x.hi, p); x.lo = Math.min(x.lo, p);
    if (x.kind === 'candle') {
      var c = x.cd[x.cd.length - 1]; c.c = p; c.h = Math.max(c.h, p); c.l = Math.min(c.l, p);
      if (++x.cn >= PER) { x.cn = 0; x.cd.push({ o: p, h: p, l: p, c: p, t: now }); x.cd.shift(); }
    } else { x.h.push(p); x.h.shift(); x.t.push(now); x.t.shift(); }
  }
  /* garis penutupan sebelumnya (prev close) */
  function prevPlugin(x) { return { id: 'prev_' + x.key, afterDatasetsDraw: function (ch) {
    var a = ch.chartArea, y = ch.scales.y.getPixelForValue(x.prev); if (!(y > a.top && y < a.bottom)) return;
    var c = ch.ctx; c.save(); c.setLineDash([3, 3]); c.strokeStyle = 'rgba(156,163,175,.55)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(a.left, y); c.lineTo(a.right, y); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#9ca3af'; c.font = '9px Inter, sans-serif'; c.fillText('PC', a.left + 2, y - 3); c.restore();
  } }; }
  function grad(ch, rgb) { var a = ch.chartArea; if (!a) return 'rgba(' + rgb + ',.15)'; var g = ch.ctx.createLinearGradient(0, a.top, 0, a.bottom); g.addColorStop(0, 'rgba(' + rgb + ',.38)'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); return g; }
  function axes() {
    return { x: { grid: { display: false }, border: { display: false }, ticks: { color: '#6b7280', font: { size: 9 }, maxTicksLimit: 4, maxRotation: 0 } },
             y: { position: 'right', grid: { color: 'rgba(255,255,255,.05)' }, border: { display: false }, ticks: { color: '#6b7280', font: { size: 9 }, maxTicksLimit: 4, callback: function (v) { return v.toLocaleString('en-US', { maximumFractionDigits: 0 }); } } } };
  }
  function base(x, plugins, extra) {
    var o = { responsive: true, maintainAspectRatio: false, animation: false, layout: { padding: { top: 4 } }, interaction: { mode: 'index', intersect: false },
              plugins: { legend: { display: false }, tooltip: tip }, scales: axes() };
    for (var k in extra) o.plugins.tooltip = Object.assign({}, tip, extra[k]);
    return { options: o, plugins: plugins };
  }
  function build(x) {
    var cv = $(x.cv); if (!cv || !window.Chart) return;
    var old = Chart.getChart(cv); if (old) old.destroy();
    var cfg, lbl = function (c) { return c.dataset.label + ': ' + fmt(c.parsed.y); };
    var dot = function (c) { return c.dataIndex === SHOW - 1 ? 3.5 : 0; };
    if (x.kind === 'area') {
      var b = base(x, [prevPlugin(x)], { t: { callbacks: { label: lbl } } });
      cfg = { type: 'line', plugins: b.plugins, options: b.options, data: { labels: [], datasets: [
        { label: 'NASDAQ', data: [], borderColor: UP, borderWidth: 2, tension: .35, fill: true, pointRadius: dot, pointBackgroundColor: '#fff', backgroundColor: function (c) { return grad(c.chart, x.up === false ? '239,68,68' : '16,185,129'); } },
        { label: 'SMA 5', data: [], borderColor: '#FBBF24', borderWidth: 1.2, borderDash: [4, 3], tension: .35, pointRadius: 0, fill: false } ] } };
    } else if (x.kind === 'candle') {
      var b2 = base(x, [prevPlugin(x)], { t: { filter: function (i) { return i.datasetIndex === 1; }, displayColors: false, callbacks: { title: function (a) { return x.cd[a[0].dataIndex].t; },
        label: function (c) { var k = x.cd[c.dataIndex]; return ['O ' + fmt(k.o), 'H ' + fmt(k.h), 'L ' + fmt(k.l), 'C ' + fmt(k.c)]; } } } });
      var col = function (c) { var k = x.cd[c.dataIndex]; return k && k.c >= k.o ? UP : DN; };
      cfg = { type: 'bar', plugins: b2.plugins, options: b2.options, data: { labels: [], datasets: [
        { label: 'Wick', data: [], grouped: false, barThickness: 1.5, backgroundColor: col, borderSkipped: false, order: 2 },
        { label: 'Body', data: [], grouped: false, barPercentage: .75, categoryPercentage: .9, backgroundColor: col, borderSkipped: false, order: 1 } ] } };
    } else {
      var b3 = base(x, [prevPlugin(x)], { t: { callbacks: { label: lbl } } });
      cfg = { type: 'line', plugins: b3.plugins, options: b3.options, data: { labels: [], datasets: [
        { label: 'Upper', data: [], borderColor: 'rgba(129,140,248,.65)', borderWidth: 1, pointRadius: 0, tension: .3, fill: '+1', backgroundColor: 'rgba(129,140,248,.12)' },
        { label: 'Lower', data: [], borderColor: 'rgba(129,140,248,.65)', borderWidth: 1, pointRadius: 0, tension: .3, fill: false },
        { label: 'SMA 20', data: [], borderColor: '#94A3B8', borderWidth: 1, borderDash: [4, 3], pointRadius: 0, tension: .3, fill: false },
        { label: 'Dow Jones', data: [], borderColor: DN, borderWidth: 2, tension: .3, pointRadius: dot, pointBackgroundColor: '#fff', fill: false } ] } };
    }
    x.chart = new Chart(cv.getContext('2d'), cfg);
  }
  function avg(a, i, w) { var s = 0, n = 0; for (var k = Math.max(0, i - w + 1); k <= i; k++) { s += a[k]; n++; } return s / n; }
  function paint(x) {
    var ch = x.chart, ds = ch.data.datasets, y = ch.options.scales.y, lo, hi, pad;
    if (x.kind === 'area') {
      var d = x.h.slice(-SHOW); ch.data.labels = x.t.slice(-SHOW); ds[0].data = d; ds[1].data = d.map(function (_, i) { return avg(d, i, 5); });
      ds[0].borderColor = x.up ? UP : DN; lo = Math.min.apply(null, d); hi = Math.max.apply(null, d);
    } else if (x.kind === 'candle') {
      lo = Math.min.apply(null, x.cd.map(function (k) { return k.l; })); hi = Math.max.apply(null, x.cd.map(function (k) { return k.h; }));
      var eps = (hi - lo) * .01 + 1e-6;
      ch.data.labels = x.cd.map(function (k) { return k.t; });
      ds[0].data = x.cd.map(function (k) { return [k.l, k.h]; });
      ds[1].data = x.cd.map(function (k) { var a = Math.min(k.o, k.c), b = Math.max(k.o, k.c); return b - a < eps ? [a, a + eps] : [a, b]; });
    } else {
      var up = [], lw = [], mid = [];
      for (var i = H - SHOW; i < H; i++) { var w = x.h.slice(i - 19, i + 1), m = w.reduce(function (s, v) { return s + v; }, 0) / w.length,
        sd = Math.sqrt(w.reduce(function (s, v) { return s + (v - m) * (v - m); }, 0) / w.length); up.push(m + 2 * sd); lw.push(m - 2 * sd); mid.push(m); }
      ch.data.labels = x.t.slice(-SHOW); ds[0].data = up; ds[1].data = lw; ds[2].data = mid; ds[3].data = x.h.slice(-SHOW);
      ds[3].borderColor = x.up ? UP : DN; lo = Math.min.apply(null, lw); hi = Math.max.apply(null, up);
    }
    pad = (hi - lo) * .12 + x.start * .0001; y.min = lo - pad; y.max = hi + pad;
    ch.update('none');
  }
  function text(x) {
    var chg = (x.px / x.prev - 1) * 100; x.up = chg >= 0;
    var v = $(x.id), c = $(x.id + '-chg'), r = $(x.id + '-rng');
    if (v) v.textContent = '$' + fmt(x.px);
    if (c) { c.textContent = (chg >= 0 ? '+' : '−') + Math.abs(chg).toFixed(2) + '%'; c.className = 'text-xs ' + (chg >= 0 ? 'text-emerald-400' : 'text-rose-400'); }
    if (r) r.textContent = 'H $' + fmt(x.hi) + ' • L $' + fmt(x.lo);
  }
  function run() {
    var vis = visible();
    IX.forEach(function (x) {
      tick(x); text(x); if (window.__ixPro) window.__ixPro.push(x.key, x.px, x.prev);
      if (!x.chart || Chart.getChart($(x.cv)) !== x.chart) build(x);
      if (x.chart && vis) paint(x);
    });
  }
  function start() {
    safe(run)(); setInterval(safe(run), 1000);
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.nav-link')) setTimeout(safe(function () { if (!visible()) return; IX.forEach(function (x) { if (x.chart) { x.chart.resize(); paint(x); } }); }), 120);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
  else setTimeout(start, 0);
})();
