/* ============================================================
   LIVE MODULE — MACRO ASSET DISTRIBUTION + ORDER BOOK VISUALIZER & TICK MINI CHART
   Berjalan otomatis & mandiri (tidak bergantung pada urutan init chart lain).
   Hanya menyentuh elemen: #macroAssetBarChart, #global-mini-orderbook, #globalMiniTickChart.
   Data = simulasi ilustratif sampai feed pasar nyata tersambung.
   ============================================================ */
(function () {
  'use strict';
  if (window.__liveMacroObModule) return;
  window.__liveMacroObModule = true;
  var PAGE_ID = 'page-global-market';
  var BASE = 5584;               // acuan S&P 500 Index Spot (sama dengan tampilan awal)
  var TICKS = 40;                // jumlah titik pada tick mini chart
  var LEVELS = 3;                // kedalaman order book (bid & ask)
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function fmt(n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function pageVisible() { var p = document.getElementById(PAGE_ID); return !!p && p.classList.contains('active'); }
  function safe(fn) { return function () { try { fn.apply(null, arguments); } catch (e) { console.warn('[live-module]', e); } }; }
  /* ---------- 1. MACRO ASSET DISTRIBUTION (scatter, bergerak tiap 2 detik) ---------- */
  var macroChart = null;
  var macroRanges = [
    { minX: 30, maxX: 42, minY: 62, maxY: 82 },
    { minX: 17, maxX: 29, minY: 45, maxY: 63 },
    { minX: 11, maxX: 21, minY: 30, maxY: 47 },
    { minX: 7,  maxX: 16, minY: 16, maxY: 34 }
  ];
  function initMacro() {
    var cv = document.getElementById('macroAssetBarChart');
    if (!cv || !window.Chart) return;
    macroChart = Chart.getChart(cv);
    if (macroChart) {
      // Ambil alih chart yang sudah dibuat halaman, agar tidak ada dua penggerak sekaligus.
      try { macroBarChartInstance = null; } catch (e) {}
    } else {
      var mk = function (label, x, y, bg, bd) {
        return { label: label, data: [{ x: x, y: y }], backgroundColor: bg, borderColor: bd, pointRadius: 7, pointHoverRadius: 10 };
      };
      macroChart = new Chart(cv.getContext('2d'), {
        type: 'scatter',
        data: { datasets: [
          mk('Equities', 35, 72, '#4F46E5', '#818CF8'),
          mk('Crypto', 22, 54, '#10B981', '#34D399'),
          mk('communities', 15, 38, '#38BDF8', '#7DD3FC'),
          mk('Bond /Cash', 10, 24, '#F59E0B', '#FBBF24')
        ] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'bottom', labels: { color: '#CBD5E1', boxWidth: 10, boxHeight: 10, padding: 12, font: { size: 9 } } },
            tooltip: { enabled: true, callbacks: { label: function (c) { return c.dataset.label + ': X ' + c.raw.x.toFixed(1) + ' • Y ' + c.raw.y.toFixed(1); } } }
          },
          scales: {
            x: { min: 0, max: 50, title: { display: true, text: 'Macro allocation (%)', color: '#9CA3AF', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9CA3AF', font: { size: 9 } } },
            y: { min: 0, max: 100, title: { display: true, text: 'Relative macro signal', color: '#9CA3AF', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9CA3AF', font: { size: 9 } } }
          }
        }
      });
    }
    // Animasi halus agar perpindahan titik terlihat bergerak
    macroChart.options.animation = { duration: 900, easing: 'easeInOutQuad' };
  }
  function stepMacro() {
    if (!macroChart) { initMacro(); if (!macroChart) return; }
    macroChart.data.datasets.forEach(function (ds, i) {
      var r = macroRanges[i % macroRanges.length], p = ds.data[0];
      var cx = (r.minX + r.maxX) / 2, cy = (r.minY + r.maxY) / 2;
      p.x = clamp(p.x + rnd(-1.6, 1.6) + (cx - p.x) * 0.06, r.minX, r.maxX);
      p.y = clamp(p.y + rnd(-3.0, 3.0) + (cy - p.y) * 0.06, r.minY, r.maxY);
    });
    if (pageVisible()) macroChart.update();
  }
  /* ---------- 2. TICK MINI CHART + ORDER BOOK VISUALIZER (tiap 1 detik) ---------- */
  var tickChart = null;
  var mid = BASE, prevMid = BASE;
  var askSizes = [], bidSizes = [];
  for (var i = 0; i < LEVELS; i++) { askSizes.push(rnd(8, 18)); bidSizes.push(rnd(8, 18)); }
  function initTick() {
    var cv = document.getElementById('globalMiniTickChart');
    if (!cv || !window.Chart) return;
    tickChart = Chart.getChart(cv);
    if (tickChart) {
      var old = tickChart.data.datasets[0].data;
      var last = parseFloat(old[old.length - 1]);
      if (isFinite(last)) mid = last;
      try { globalMiniTickChartInstance = null; } catch (e) {}
    }
    // Riwayat awal berupa random-walk yang berakhir di harga sekarang
    var hist = [mid];
    for (var k = 1; k < TICKS; k++) hist.unshift(clamp(hist[0] + rnd(-1.4, 1.4), BASE - 45, BASE + 45));
    if (!tickChart) {
      tickChart = new Chart(cv.getContext('2d'), {
        type: 'line',
        data: { labels: hist.map(function (_, n) { return String(n + 1); }),
                datasets: [{ data: hist, borderColor: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.05)', fill: true, tension: 0.2, borderWidth: 1.5, pointRadius: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
      });
    } else {
      var ds = tickChart.data.datasets[0];
      ds.data.length = 0; tickChart.data.labels.length = 0;
      hist.forEach(function (v, n) { ds.data.push(v); tickChart.data.labels.push(String(n + 1)); });
    }
    tickChart.options.animation = { duration: 350 };
  }
  function row(side, price, size, maxSize) {
    var isAsk = side === 'ask';
    var pct = Math.round((size / maxSize) * 100);
    var rgb = isAsk ? '244,63,94' : '16,185,129';
    return '<div class="flex justify-between ' + (isAsk ? 'text-rose-400' : 'text-emerald-400') + ' px-1 rounded-sm"' +
           ' style="background:linear-gradient(to left,rgba(' + rgb + ',.20) ' + pct + '%,transparent ' + pct + '%);transition:background .6s">' +
           '<span>' + (isAsk ? 'Ask' : 'Bid') + ' $' + fmt(price, 2) + '</span><span>' + size.toFixed(1) + 'k</span></div>';
  }
  function renderOrderBook(spread) {
    var ob = document.getElementById('global-mini-orderbook');
    if (!ob) return;
    var bestAsk = mid + spread / 2, bestBid = mid - spread / 2;
    var maxSize = Math.max.apply(null, askSizes.concat(bidSizes));
    var html = '';
    for (var a = LEVELS - 1; a >= 0; a--) html += row('ask', bestAsk + a * 0.5, askSizes[a], maxSize);
    var up = mid >= prevMid;
    html += '<div class="text-center font-bold border-y border-card-border py-0.5 ' + (up ? 'text-emerald-300' : 'text-rose-300') + '">' +
            'S&P 500 Index Spot · ' + fmt(mid, 2) + ' ' + (up ? '▲' : '▼') + '</div>';
    for (var b = 0; b < LEVELS; b++) html += row('bid', bestBid - b * 0.5, bidSizes[b], maxSize);
    ob.innerHTML = html;
    var head = ob.previousElementSibling;                       // baris "GLOBAL BID / ASK … SPREAD"
    if (head && head.lastElementChild) head.lastElementChild.textContent = 'SPREAD: ' + spread.toFixed(2);
  }
  function stepBookAndTicks() {
    if (!tickChart) initTick();
    prevMid = mid;
    mid = clamp(mid + rnd(-1.6, 1.6) + (BASE - mid) * 0.01, BASE - 45, BASE + 45);
    var spread = rnd(0.02, 0.10);
    for (var i = 0; i < LEVELS; i++) {
      askSizes[i] = clamp(askSizes[i] + rnd(-2.5, 2.5), 3, 26);
      bidSizes[i] = clamp(bidSizes[i] + rnd(-2.5, 2.5), 3, 26);
    }
    if (tickChart) {
      var ds = tickChart.data.datasets[0];
      ds.data.push(parseFloat(mid.toFixed(2))); ds.data.shift();
      var rising = ds.data[ds.data.length - 1] >= ds.data[0];
      ds.borderColor = rising ? '#34D399' : '#FB7185';
      ds.backgroundColor = rising ? 'rgba(52,211,153,0.07)' : 'rgba(251,113,133,0.07)';
    }
    if (!pageVisible()) return;                                 // hemat CPU saat halaman lain dibuka
    renderOrderBook(spread);
    if (tickChart) {
      tickChart.update();
      var cv = tickChart.canvas, tag = cv.parentElement && cv.parentElement.previousElementSibling;
      if (tag && tag.lastElementChild) tag.lastElementChild.textContent = 'HIGH ' + fmt(Math.max.apply(null, tickChart.data.datasets[0].data), 2);
    }
  }
  /* ---------- Pastikan ukuran chart benar saat halaman baru dibuka ---------- */
  function refreshOnShow() {
    setTimeout(safe(function () {
      if (!pageVisible()) return;
      if (macroChart) macroChart.resize();
      if (tickChart) tickChart.resize();
      stepBookAndTicks();
    }), 120);
  }
  function start() {
    safe(initMacro)(); safe(initTick)();
    safe(stepBookAndTicks)();
    setInterval(safe(stepBookAndTicks), 1000);
    setInterval(safe(stepMacro), 2000);
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.nav-link')) refreshOnShow();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
  else setTimeout(start, 0);
})();
