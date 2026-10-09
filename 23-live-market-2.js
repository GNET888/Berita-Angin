/* ============================================================
   LIVE MODULE — STATUS PASAR & DOMINASI • ALTCOIN SEASON INDEX •
   KAPITALISASI PASAR GLOBAL • DERIVATIVES (OPEN INT.)
   Empat desain berbeda: cincin dominasi, gauge jarum, area+volume, kolom arah OI.
   Otomatis tiap 2 detik. Data = simulasi ilustratif sampai feed nyata tersambung.
   ============================================================ */
(function () {
  'use strict';
  if (window.__liveCryptoCards) return;
  window.__liveCryptoCards = true;
  var N = 30, PAGE = 'page-crypto-market';
  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var walk = function (v, base, step, pull, lo, hi) { return clamp(v + rnd(-step, step) + (base - v) * pull, lo, hi); };
  var visible = function () { var p = $(PAGE); return !!p && p.classList.contains('active'); };
  var safe = function (f) { return function () { try { f(); } catch (e) { console.warn('[crypto-cards]', e); } }; };
  var S = { btc: 59.3, eth: 11.4, stb: 10.4, alt: 68, mcap: 2.92, vol: 85.4, oi: 34.2, fund: 0.012, ls: 1.24 };
  var mcapH = [], volH = [], oiH = [], m = S.mcap, o = S.oi;
  var altH = [], altCapH = [], altBtcH = [], altVolH = [], aI = S.alt, aB = 68, aV = 85.4;
  S.altBtc = 68; S.altVol = 85.4;
  for (var j = 0; j < N * 2; j++) {
    altH.unshift(aI); altBtcH.unshift(aB); altVolH.unshift(aV);
    altCapH.unshift(+(0.55 + aI / 100 * 0.9 + rnd(-.03, .03)).toFixed(3));
    aI = walk(aI, 50, 5, .04, 8, 96); aB = walk(aB, 66, 1.6, .05, 52, 82); aV = walk(aV, 80, 4, .08, 40, 130);
  }
  for (var i = 0; i < N; i++) { mcapH.unshift(m); volH.unshift(S.vol * rnd(.75, 1.25)); oiH.unshift(o); m = walk(m, 2.45, .02, .05, 2.3, 2.6); o = walk(o, 34.2, .25, .05, 32, 36.5); }
  var tip = { backgroundColor: '#09090b', borderColor: '#27272a', borderWidth: 1, titleColor: '#fff', bodyColor: '#d1d5db', padding: 6, displayColors: false };
  function base(extra) {
    var c = { responsive: true, maintainAspectRatio: false, animation: { duration: 800, easing: 'easeOutQuart' }, plugins: { legend: { display: false }, tooltip: tip } };
    for (var k in extra) c[k] = extra[k];
    return c;
  }
  function mk(id, cfg) {
    var cv = $(id); if (!cv || !window.Chart) return null;
    var old = Chart.getChart(cv); if (old) old.destroy();
    return new Chart(cv.getContext('2d'), cfg);
  }
  function others() { return Math.max(0, 100 - S.btc - S.eth - S.stb); }
  /* Gauge: plugin jarum */
  var needle = { id: 'needle', afterDatasetsDraw: function (chart) {
    var a = chart.getDatasetMeta(0).data[0]; if (!a) return;
    var ctx = chart.ctx, ang = Math.PI + (clamp(chart.$v || 0, 0, 100) / 100) * Math.PI, r = a.outerRadius * .9;
    ctx.save(); ctx.strokeStyle = '#F9FAFB'; ctx.fillStyle = '#F9FAFB'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + Math.cos(ang) * r, a.y + Math.sin(ang) * r); ctx.stroke();
    ctx.beginPath(); ctx.arc(a.x, a.y, 4, 0, 6.2832); ctx.fill(); ctx.restore();
  } };
  var cRing, cGauge, cMcap, cOI;
  function build() {
    if (!cRing) cRing = mk('mini-btc-chart', { type: 'doughnut',
      data: { labels: ['BTC', 'ETH', 'Stablecoin', 'Lainnya'], datasets: [{ data: [S.btc, S.eth, S.stb, others()], backgroundColor: ['#F7931A', '#627EEA', '#26A17B', '#64748B'], borderWidth: 0, spacing: 2, borderRadius: 3 }] },
      options: base({ cutout: '72%', plugins: { legend: { display: false }, tooltip: Object.assign({}, tip, { callbacks: { label: function (c) { return c.label + ': ' + c.parsed.toFixed(1) + '%'; } } }) } }) });
    if (!cGauge) { cGauge = mk('mini-alt-chart', { type: 'line',
      data: { labels: altH.map(function (_, i) { return i; }), datasets: [
        { label: 'Indeks', data: altH, yAxisID: 'yi', borderColor: 'rgba(139,124,246,.9)', borderWidth: 1, tension: .15, fill: true, order: 3, pointRadius: 0,
          backgroundColor: function (c) { var a = c.chart.chartArea; if (!a) return 'rgba(139,124,246,.45)'; var g = c.chart.ctx.createLinearGradient(0, a.top, 0, a.bottom); g.addColorStop(0, 'rgba(129,108,250,.75)'); g.addColorStop(1, 'rgba(129,108,250,.12)'); return g; } },
        { label: 'Volume', data: altVolH, yAxisID: 'yv', borderColor: '#D98A1B', borderWidth: 1, tension: .2, fill: true, order: 4, pointRadius: 0, backgroundColor: 'rgba(245,158,11,.75)' },
        { label: 'Alt Cap', data: altCapH, yAxisID: 'yc', borderColor: '#4F46E5', borderWidth: 1.5, tension: .25, fill: false, order: 2, pointRadius: 0 },
        { label: 'BTC', data: altBtcH, yAxisID: 'yb', borderColor: '#F59E0B', borderWidth: 1.5, tension: .25, fill: false, order: 1, pointRadius: function (c) { return c.dataIndex === altBtcH.length - 1 ? 3 : 0; }, pointBackgroundColor: '#FBBF24' }
      ] },
      options: base({ interaction: { mode: 'index', intersect: false }, layout: { padding: { right: 2 } },
        scales: { x: { display: false },
          yb: { position: 'left', min: 40, max: 90, ticks: { color: '#9CA3AF', font: { size: 8 }, maxTicksLimit: 5, callback: function (v) { return v + 'K'; } }, grid: { color: 'rgba(255,255,255,.05)' }, border: { display: false } },
          yi: { position: 'right', min: 0, max: 100, ticks: { color: '#9CA3AF', font: { size: 8 }, maxTicksLimit: 5 }, grid: { display: false }, border: { display: false } },
          yc: { display: false, min: 0.4, max: 2 }, yv: { display: false, min: 0, max: 600 } },
        plugins: { legend: { display: false }, tooltip: Object.assign({}, tip, { displayColors: true, callbacks: { label: function (c) {
          var l = c.dataset.label, v = c.parsed.y;
          return l + ': ' + (l === 'Indeks' ? Math.round(v) : l === 'Alt Cap' ? '$' + v.toFixed(2) + ' T' : l === 'BTC' ? '$' + v.toFixed(1) + 'K' : '$' + v.toFixed(0) + ' B'); } } }) } }) });
      if (cGauge) cGauge.$v = S.alt; }
    if (!cMcap) cMcap = mk('mini-mcap-chart', { type: 'line',
      data: { labels: mcapH.map(function (_, i) { return i; }), datasets: [
        { type: 'bar', label: 'Volume', data: volH, yAxisID: 'v', backgroundColor: 'rgba(148,163,184,.25)', borderRadius: 1, barPercentage: .9, categoryPercentage: 1, order: 2 },
        { label: 'Mcap', data: mcapH, yAxisID: 'y', borderColor: '#10B981', borderWidth: 2, tension: .4, fill: true, order: 1,
          pointRadius: function (c) { return c.dataIndex === N - 1 ? 3.5 : 0; }, pointBackgroundColor: '#34D399',
          backgroundColor: function (c) { var a = c.chart.chartArea; if (!a) return 'rgba(16,185,129,.15)'; var g = c.chart.ctx.createLinearGradient(0, a.top, 0, a.bottom); g.addColorStop(0, 'rgba(16,185,129,.35)'); g.addColorStop(1, 'rgba(16,185,129,0)'); return g; } }
      ] },
      options: base({ interaction: { mode: 'index', intersect: false }, scales: { x: { display: false }, v: { display: false, min: 0, max: 400 }, y: { display: false, beginAtZero: false } },
        plugins: { legend: { display: false }, tooltip: Object.assign({}, tip, { callbacks: { label: function (c) { return c.dataset.label + ': ' + (c.dataset.label === 'Mcap' ? '$' + c.parsed.y.toFixed(2) + ' T' : '$' + c.parsed.y.toFixed(1) + ' B'); } } }) } }) });
    if (!cOI) cOI = mk('mini-oi-chart', { type: 'bar',
      data: { labels: oiH.map(function (_, i) { return i; }), datasets: [{ label: 'Open Interest', data: oiH, borderRadius: 2, barPercentage: .8, categoryPercentage: 1,
        backgroundColor: function (c) { var i = c.dataIndex; return i > 0 && oiH[i] < oiH[i - 1] ? '#FB7185' : '#22D3EE'; } }] },
      options: base({ scales: { x: { display: false }, y: { display: true, min: 32, max: 36.5, ticks: { display: false }, grid: { color: 'rgba(255,255,255,.06)' }, border: { display: false } } },
        plugins: { legend: { display: false }, tooltip: Object.assign({}, tip, { callbacks: { label: function (c) { return 'OI: $' + c.parsed.y.toFixed(2) + ' B'; } } }) } }) });
  }
  function tween(ch, to) {
    var from = ch.$v, t0 = performance.now();
    (function f(t) { var k = clamp((t - t0) / 800, 0, 1); ch.$v = from + (to - from) * (1 - Math.pow(1 - k, 3)); ch.draw(); if (k < 1) requestAnimationFrame(f); })(t0);
  }
  function txt(id, v) { var e = $(id); if (e) e.textContent = v; }
  function delta(id, pct, color) { var e = $(id); if (!e) return; e.textContent = (pct >= 0 ? '▲ ' : '▼ ') + Math.abs(pct).toFixed(2) + '%'; e.className = 'text-[10px] font-mono ' + (pct >= 0 ? color : 'text-rose-400'); }
  function step() {
    build();
    S.btc = walk(S.btc, 59.3, .25, .08, 58.3, 60.3); S.eth = walk(S.eth, 11.4, .15, .08, 10.6, 12.2); S.stb = walk(S.stb, 10.4, .08, .08, 9.6, 11.2);
    if (window.__CGG && window.__CGG.btc) { S.btc = window.__CGG.btc; S.eth = window.__CGG.eth; S.stb = window.__CGG.stb; }
    S.alt = (window.__LV && window.__LV.alt != null) ? window.__LV.alt : walk(S.alt, 68, 2.2, .06, 30, 92);
    S.mcap = walk(S.mcap, 2.92, .02, .04, 2.8, 3.05); S.vol = walk(S.vol, 85.4, 2.5, .08, 60, 110); if (window.__CGG) { var _g = window.__CGG; S.mcap = _g.mcap * (1 + rnd(-.0004, .0004)); S.vol = _g.vol * (1 + rnd(-.003, .003)); if (!_g.seeded) { _g.seeded = 1; for (var _i = 0; _i < mcapH.length; _i++) mcapH[_i] = S.mcap * (1 + rnd(-.004, .004)); } }
    S.oi = walk(S.oi, 34.2, .28, .04, 32.3, 36.3); S.fund = walk(S.fund, .012, .003, .1, -.02, .04); S.ls = walk(S.ls, 1.24, .03, .08, .9, 1.6);
    mcapH.push(S.mcap); mcapH.shift(); volH.push(S.vol); volH.shift(); oiH.push(S.oi); oiH.shift();
    S.altBtc = walk(S.altBtc, 66, 1.1, .05, 52, 82); S.altVol = walk(S.altVol, 80, 3, .08, 40, 130);
    altH.push(S.alt); altH.shift(); altBtcH.push(S.altBtc); altBtcH.shift(); altVolH.push(S.altVol); altVolH.shift();
    altCapH.push(+(0.55 + S.alt / 100 * 0.9 + rnd(-.02, .02)).toFixed(3)); altCapH.shift();
    txt('alt-leg-idx', Math.round(S.alt)); txt('alt-leg-cap', '$' + altCapH[altCapH.length - 1].toFixed(2) + ' T');
    txt('alt-leg-btc', '$' + S.altBtc.toFixed(1) + 'K'); txt('alt-leg-vol', '$' + S.altVol.toFixed(0) + 'B');
    txt('stat-btc-dom', S.btc.toFixed(1) + '%'); txt('leg-btc', S.btc.toFixed(1) + '%'); txt('leg-eth', S.eth.toFixed(1) + '%');
    txt('leg-stb', S.stb.toFixed(1) + '%'); txt('leg-oth', others().toFixed(1) + '%');
    var z = S.alt >= 75 ? ['Altcoin Season', '#A78BFA'] : S.alt <= 25 ? ['Bitcoin Season', '#F59E0B'] : ['Neutral', '#9CA3AF'];
    txt('mini-alt-value', Math.round(S.alt) + ' / 100'); txt('alt-zone', z[0]); var ze = $('alt-zone'); if (ze) ze.style.color = z[1];
    txt('stat-global-mcap', '$' + S.mcap.toFixed(2) + ' T'); txt('mcap-vol', 'Volume 24j $' + S.vol.toFixed(1) + ' Miliar');
    delta('mcap-delta', (mcapH[N - 1] / mcapH[0] - 1) * 100, 'text-emerald-400');
    txt('stat-open-interest', '$' + S.oi.toFixed(1) + ' B');
    txt('oi-sub', 'Funding ' + (S.fund >= 0 ? '+' : '') + S.fund.toFixed(3) + '% • L/S ' + S.ls.toFixed(2));
    delta('oi-delta', (oiH[N - 1] / oiH[0] - 1) * 100, 'text-cyan-400');
    if (window.__domPro) window.__domPro.push(S.btc, S.eth, S.stb, others());
    if (window.__mcapPro) window.__mcapPro.push(S.mcap, S.vol);
    if (window.__oiPro) window.__oiPro.push(S.oi, S.fund, S.ls);
    if (!visible()) { if (cGauge) cGauge.$v = S.alt; return; }
    if (cRing) { cRing.data.datasets[0].data = [S.btc, S.eth, S.stb, others()]; cRing.update(); }
    if (cGauge) { cGauge.$v = S.alt; cGauge.update(); }
    if (cMcap) { var lo = Math.min.apply(null, mcapH), hi = Math.max.apply(null, mcapH), pad = (hi - lo) * .25 + .005;
      cMcap.options.scales.y.min = lo - pad; cMcap.options.scales.y.max = hi + pad; cMcap.options.scales.v.max = Math.max.apply(null, volH) * 4; cMcap.update(); }
    if (cOI) { var l2 = Math.min.apply(null, oiH), h2 = Math.max.apply(null, oiH), p2 = (h2 - l2) * .3 + .05;
      cOI.options.scales.y.min = l2 - p2; cOI.options.scales.y.max = h2 + p2; cOI.update(); }
  }
  function start() {
    safe(step)(); setInterval(safe(step), 2000);
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.nav-link')) setTimeout(safe(function () {
        if (!visible()) return; [cRing, cGauge, cMcap, cOI].forEach(function (c) { if (c) c.resize(); }); step();
      }), 120);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
  else setTimeout(start, 0);
})();
