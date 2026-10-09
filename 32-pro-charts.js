/* ============================================================
   PRO CHARTS 2 — PEMANTAU GAS FEE • NASDAQ COMPOSITE • S&P 500 • DOW JONES
   Grafik canvas multi-panel, bergerak otomatis (rAF), crosshair interaktif, mengikuti tema terang/gelap.
   Gas Fee: 3 lane (Ethereum base+priority, Polygon, Arbitrum) + zona ambang + pita σ + EMA + penanda lonjakan + strip indeks kemacetan.
   NASDAQ: area + EMA9/EMA21 + penanda cross + volume + RSI14.
   S&P 500: candlestick + EMA8 + volume + MACD(6,13,4).
   Dow Jones: Bollinger ±2σ + SMA20 + garis warna arah + %B + bandwidth + deteksi squeeze.
   Data = simulasi ilustratif sampai feed nyata tersambung.
   ============================================================ */
(function () {
  'use strict';
  if (window.__mktPro2) return; window.__mktPro2 = true;
  var TAU = 6.2832, MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace';
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); }, rnd = function () { return Math.random() - .5; };
  var fmt = function (v, d) { return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var hms = function (t) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2); };
  var dec = function (mn, mx) { var r = mx - mn; return r < 6 ? 2 : r < 60 ? 1 : 0; };
  function pal() {
    var l = document.documentElement.classList.contains('light');
    return { l: l, tx: l ? '#0f172a' : '#F1F5F9', mu: l ? '#64748b' : '#94A3B8', gr: l ? 'rgba(15,23,42,.09)' : 'rgba(255,255,255,.07)',
      up: l ? '#059669' : '#34D399', dn: l ? '#e11d48' : '#FB7185', cy: l ? '#0891b2' : '#22D3EE', am: l ? '#d97706' : '#FBBF24', vi: l ? '#7c3aed' : '#A78BFA',
      bg: l ? 'rgba(15,23,42,.035)' : 'rgba(255,255,255,.025)' };
  }
  function host(id, draw) {
    var cv = document.getElementById(id); if (!cv) return;
    var ctx = cv.getContext('2d'), s = { w: 0, h: 0, mx: -1, my: -1, sh: 0 }, dpr = 1;
    function mv(e) { var r = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; s.mx = p.clientX - r.left; s.my = p.clientY - r.top; }
    cv.addEventListener('mousemove', mv); cv.addEventListener('touchstart', mv, { passive: true }); cv.addEventListener('touchmove', mv, { passive: true });
    cv.addEventListener('mouseleave', function () { s.mx = -1; }); cv.addEventListener('touchend', function () { s.mx = -1; });
    (function f(now) {
      requestAnimationFrame(f);
      if (cv.offsetParent === null || document.hidden) return;
      var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      if (w !== s.w || h !== s.h) { s.w = w; s.h = h; dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); ctx.lineJoin = 'round';
      try { draw(ctx, w, h, now, s, pal()); } catch (e) { console.warn('[pro-charts-2]', e); }
    })(performance.now());
  }
  function T(c, t, x, y, col, al, sz, wt) { c.font = (wt || 400) + ' ' + (sz || 8) + 'px ' + MONO; c.fillStyle = col; c.textAlign = al || 'left'; c.textBaseline = 'middle'; c.fillText(t, x, y); }
  function Tw(c, t, x, y, col, sz, wt) { T(c, t, x, y, col, 'left', sz, wt); return x + c.measureText(t).width + 7; }
  function tag(c, t, x, y, bg, fg) { c.font = '700 8px ' + MONO; var w = c.measureText(t).width + 6; c.fillStyle = bg; c.fillRect(x, y - 6, w, 12); T(c, t, x + 3, y, fg, 'left', 8, 700); }
  function tip(c, w, x, lines, P) {
    c.font = '600 8px ' + MONO; var bw = 0; lines.forEach(function (l) { bw = Math.max(bw, c.measureText(l[0]).width); }); bw += 10;
    var bh = lines.length * 11 + 6, bx = x + 10 + bw > w - 2 ? x - 10 - bw : x + 10;
    c.fillStyle = P.l ? 'rgba(255,255,255,.96)' : 'rgba(9,9,11,.94)'; c.strokeStyle = P.l ? '#cbd5e1' : '#3f3f46'; c.lineWidth = 1;
    c.fillRect(bx, 3, bw, bh); c.strokeRect(bx + .5, 3.5, bw, bh);
    lines.forEach(function (l, i) { T(c, l[0], bx + 5, 3 + 3 + 5.5 + i * 11, l[1], 'left', 8, 600); });
  }
  function hline(c, L, R, y, col, dash) { c.save(); if (dash) c.setLineDash(dash); c.strokeStyle = col; c.lineWidth = 1; c.beginPath(); c.moveTo(L, Math.round(y) + .5); c.lineTo(R, Math.round(y) + .5); c.stroke(); c.restore(); }
  function vline(c, x, y0, y1, P) { c.save(); c.setLineDash([3, 3]); c.strokeStyle = P.mu; c.lineWidth = 1; c.beginPath(); c.moveTo(Math.round(x) + .5, y0); c.lineTo(Math.round(x) + .5, y1); c.stroke(); c.restore(); }
  function hgrid(c, L, R, y0, y1, mn, mx, P, d, n) {
    for (var g = 0; g <= n; g++) { var v = mn + (mx - mn) * g / n, y = y1 - (v - mn) / (mx - mn) * (y1 - y0); hline(c, L, R, y, P.gr); T(c, fmt(v, d), R + 3, Math.round(y) + .5, P.mu); }
  }
  function dot(c, x, y, col, now) {
    var p = (now % 1600) / 1600; c.beginPath(); c.arc(x, y, 3 + p * 6, 0, TAU); c.strokeStyle = col; c.globalAlpha = 1 - p; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1;
    c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fillStyle = col; c.fill();
  }
  function tri(c, x, y, up, col, r) { c.beginPath(); if (up) { c.moveTo(x, y - r); c.lineTo(x - r, y + r * .8); c.lineTo(x + r, y + r * .8); } else { c.moveTo(x, y + r); c.lineTo(x - r, y - r * .8); c.lineTo(x + r, y - r * .8); } c.closePath(); c.fillStyle = col; c.fill(); }
  function sma(a, i, n) { var m = 0, k = 0; for (var j = Math.max(0, i - n + 1); j <= i; j++) { m += a[j]; k++; } return m / k; }
  function sdv(a, i, n, m) { var v = 0, k = 0; for (var j = Math.max(0, i - n + 1); j <= i; j++) { v += (a[j] - m) * (a[j] - m); k++; } return Math.sqrt(v / k); }
  function ema(a, n) { var k = 2 / (n + 1), o = [a[0]], i; for (i = 1; i < a.length; i++) o.push(o[i - 1] + (a[i] - o[i - 1]) * k); return o; }
  function rsi(a, n) { var o = [], i, j, g, l, d; for (i = 0; i < a.length; i++) { if (i < n) { o.push(50); continue; } g = 0; l = 0; for (j = i - n + 1; j <= i; j++) { d = a[j] - a[j - 1]; if (d > 0) g += d; else l -= d; } o.push(l === 0 ? (g === 0 ? 50 : 100) : 100 - 100 / (1 + g / l)); } return o; }
  function lerp(o, k, tmn, tmx, f) { if (!o[k]) o[k] = { mn: tmn, mx: tmx }; o[k].mn += (tmn - o[k].mn) * f; o[k].mx += (tmx - o[k].mx) * f; return o[k]; }
  window.__proKit = { host: host, T: T, Tw: Tw, tag: tag, tip: tip, hline: hline, vline: vline, hgrid: hgrid, dot: dot, tri: tri, sma: sma, sdv: sdv, ema: ema, lerp: lerp, clamp: clamp, fmt: fmt, hms: hms, dec: dec };
  /* ================= 1. PEMANTAU GAS FEE JARINGAN ================= */
  var G = { N: 48, DUR: 2000, t0: performance.now(), d: [] };
  var CH = [
    { k: 'e', name: 'Ethereum', col: '#3B82F6', el: 'gas-eth', us: 'gas-eth-usd', lo: 12, hi: 26, min: 8, max: 45, base: 18, step: 1.4, usd: .85, u0: 18, dg: 2, dc: 1 },
    { k: 'p', name: 'Polygon', col: '#A855F7', el: 'gas-polygon', us: 'gas-polygon-usd', lo: 24, hi: 42, min: 10, max: 60, base: 32, step: 2.1, usd: .01, u0: 32, dg: 3, dc: 1 },
    { k: 'a', name: 'Arbitrum', col: '#10B981', el: 'gas-arb', us: 'gas-arb-usd', lo: .07, hi: .14, min: .03, max: .25, base: .10, step: .015, usd: .002, u0: .1, dg: 3, dc: 3 }
  ];
  var fG = function (v) { return v < 0.01 ? v.toFixed(4) : v < 1 ? v.toFixed(3) : v < 10 ? v.toFixed(2) : v.toFixed(1); };
  function gstep(prev, t) {
    var o = { t: t };
    CH.forEach(function (c) {
      var v = prev ? prev[c.k] : c.base, sp = Math.random() < .05 ? c.step * (2.5 + Math.random() * 2) : 0;
      o[c.k] = clamp(v + rnd() * c.step * 2 + (c.base - v) * .07 + sp, c.min, c.max);
    });
    o.pe = clamp((prev ? prev.pe : 1.2) + rnd() * .5, .4, 3.2); o.eb = Math.max(1, o.e - o.pe);
    var LG = window.__GAS; if (LG && LG.live) { CH.forEach(function (c) { if (LG[c.k] != null) o[c.k] = LG[c.k]; }); if (LG.pe != null) o.pe = LG.pe; o.eb = Math.max(0, o.e - o.pe); }
    return o;
  }
  (function () { var now = Date.now(), i; for (i = 0; i <= G.N; i++) G.d.push(gstep(G.d[G.d.length - 1], now - (G.N - i) * G.DUR)); })();
  function gcong(p) { var s = 0; CH.forEach(function (c) { s += clamp((p[c.k] - c.lo) / (c.hi - c.lo) / 1.3, 0, 1); }); return s / CH.length; }
  var GV = { m: 'all' };
  window.__GASH = { G: G, CH: CH, gdom: function () { gdom(); } };
  function gseg() { Array.prototype.forEach.call(document.querySelectorAll('[data-gasnet]'), function (b) { b.classList.toggle('on', b.getAttribute('data-gasnet') === GV.m); }); }
  function gk() {
    var el = document.getElementById('gas-kpi'); if (!el) return;
    var D = G.d, o = D[D.length - 1], h = '', ar = function (d) { return (d >= 0 ? '▲ ' : '▼ ') + Math.abs(d).toFixed(1) + '%'; };
    var card = function (l, v, sub, col) { return '<div class="gas-k"><div class="gas-kl">' + l + '</div><div class="gas-kv"' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</div><div class="gas-ks">' + sub + '</div></div>'; };
    var gw = function (v) { return fG(v) + ' <small>Gwei</small>'; };
    if (GV.m === 'all') {
      CH.forEach(function (c) { h += card(c.name, gw(o[c.k]), ar((o[c.k] / D[0][c.k] - 1) * 100), c.col); });
      var ci = Math.round(gcong(o) * 100); h += card('Kemacetan', ci + '%', ci > 66 ? 'Padat' : ci > 40 ? 'Sedang' : 'Lancar', ci > 66 ? '#FB7185' : ci > 40 ? '#FBBF24' : '#34D399');
    } else {
      var c = CH.filter(function (x) { return x.k === GV.m; })[0], a = D.map(function (p) { return p[c.k]; }), av = a.reduce(function (t, v) { return t + v; }, 0) / a.length, sb = 'jendela ' + Math.round(G.N * G.DUR / 1000) + ' dtk';
      h = card('Saat ini', gw(a[a.length - 1]), ar((a[a.length - 1] / a[0] - 1) * 100), c.col) + card('Rata-rata', gw(av), sb) + card('Terendah', gw(Math.min.apply(null, a)), sb) + card('Tertinggi', gw(Math.max.apply(null, a)), sb);
    }
    el.innerHTML = h;
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-gasnet]'); if (!b) return; GV.m = b.getAttribute('data-gasnet'); gseg(); gk(); });
  var GAS_TX_UNITS = { transfer: 1, swap: 7, nft: 4, contract: 8 };
  function gdom() {
    var o = G.d[G.d.length - 1], q = function (id) { return document.getElementById(id); };
    CH.forEach(function (c) {
      var v = o[c.k], e = q(c.el), u = q(c.us), cls = v > c.hi * 1.25 ? 'text-rose-400' : v > c.hi ? 'text-amber-400' : 'text-emerald-400';
      if (e) { e.textContent = fG(v) + ' Gwei'; e.className = 'font-bold text-sm ' + cls; }
      if (u) u.textContent = '~ $' + (function (x) { return x < 0.01 ? x.toFixed(5) : x < 1 ? x.toFixed(4) : x.toFixed(2); })(c.usd * v / c.u0) + ' (Transfer)';
    });
    var up = q('gas-chart-updated'); if (up) up.textContent = 'Auto update: ' + hms(o.t);
    /* ⚡ Kalkulator estimasi biaya transaksi otomatis mengikuti tipe transaksi terpilih */
    var txSel = q('gas-tx-type'), mult = GAS_TX_UNITS[txSel ? txSel.value : 'transfer'] || 1;
    var costMap = { e: 'gas-cost-eth', p: 'gas-cost-polygon', a: 'gas-cost-arb' };
    CH.forEach(function (c) {
      var el = q(costMap[c.k]); if (!el) return;
      var cost = c.usd * (o[c.k] / c.u0) * mult;
      el.textContent = '$' + cost.toFixed(cost < 0.01 ? 4 : cost < 1 ? 3 : 2);
    });
    /* ⚡ Ringkasan Indeks Kemacetan Jaringan (di luar kanvas, mudah dibaca) */
    var pct = Math.round(gcong(o) * 100), zone = pct > 66 ? ['PADAT', '#FB7185'] : pct > 40 ? ['SEDANG', '#FBBF24'] : ['LANCAR', '#34D399'];
    var bar = q('gas-congestion-bar'), lbl = q('gas-congestion-label'), pctEl = q('gas-congestion-pct');
    if (bar) { bar.style.width = pct + '%'; bar.style.background = zone[1]; }
    if (lbl) { lbl.textContent = zone[0]; lbl.style.color = zone[1]; }
    if (pctEl) pctEl.textContent = pct + '%';
    gk();
  }
  setInterval(function () {
    var l = G.d[G.d.length - 1]; G.d.push(gstep(l, Date.now())); G.d.shift(); G.t0 = performance.now(); gdom();
  }, G.DUR);
  document.addEventListener('change', function (e) { if (e.target && e.target.id === 'gas-tx-type') gdom(); });
  gseg(); gdom();
  /* GAS FEE v3 — desain modern: pilih jaringan, kurva halus + gradient, zona ambang, EMA8, panel indeks kemacetan, tooltip kartu */
  var UI = 'Inter,system-ui,-apple-system,sans-serif';
  function gt(c, t, x, y, col, al, sz, wt) { c.font = (wt || 500) + ' ' + (sz || 11) + 'px ' + UI; c.fillStyle = col; c.textAlign = al || 'left'; c.textBaseline = 'middle'; c.fillText(t, x, y); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function sp(c, P_, mv) {
    var n = P_.length, i, d = [], m = [], h, lim;
    for (i = 0; i < n - 1; i++) d[i] = (P_[i + 1][1] - P_[i][1]) / (P_[i + 1][0] - P_[i][0]);
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (i = 1; i < n - 1; i++) { m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2; lim = 3 * Math.min(Math.abs(d[i - 1]), Math.abs(d[i])); m[i] = clamp(m[i], -lim, lim); }
    mv ? c.moveTo(P_[0][0], P_[0][1]) : c.lineTo(P_[0][0], P_[0][1]);
    for (i = 0; i < n - 1; i++) { h = (P_[i + 1][0] - P_[i][0]) / 3; c.bezierCurveTo(P_[i][0] + h, P_[i][1] + m[i] * h, P_[i + 1][0] - h, P_[i + 1][1] - m[i + 1] * h, P_[i + 1][0], P_[i + 1][1]); }
  }
  function pill(c, t, x, y, bg) { c.font = '700 11px ' + UI; var w = c.measureText(t).width + 14; rr(c, x, y - 10, w, 20, 10); c.fillStyle = bg; c.fill(); gt(c, t, x + 7, y + .5, '#fff', 'left', 11, 700); }
  function gtip(c, w, x, title, rows, P) {
    var bw = 130, bh = 34 + rows.length * 18, bx; c.font = '500 11px ' + UI;
    rows.forEach(function (q) { bw = Math.max(bw, c.measureText(q[1]).width + c.measureText(q[2]).width + 44); });
    bx = x + 14 + bw > w - 4 ? x - 14 - bw : x + 14;
    c.save(); c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 18; c.shadowOffsetY = 6; rr(c, bx, 12, bw, bh, 10); c.fillStyle = P.l ? 'rgba(255,255,255,.98)' : 'rgba(17,19,26,.97)'; c.fill(); c.restore();
    rr(c, bx + .5, 12.5, bw, bh, 10); c.strokeStyle = P.l ? '#e2e8f0' : '#2a2f3a'; c.lineWidth = 1; c.stroke();
    gt(c, title, bx + 12, 28, P.mu, 'left', 10.5, 600);
    rows.forEach(function (q, i) { var y = 48 + i * 18; c.beginPath(); c.arc(bx + 16, y, 3.5, 0, TAU); c.fillStyle = q[0]; c.fill(); gt(c, q[1], bx + 26, y, P.mu, 'left', 11, 500); gt(c, q[2], bx + bw - 12, y, P.tx, 'right', 11, 700); });
  }
  host('gas-pro-canvas', function (c, w, h, now, s, P) {
    var N = G.N, D = G.d, all = GV.m === 'all', L = 8, R = w - (w < 420 ? 48 : 56), slot = (R - L) / (N - 1), prog = clamp((now - G.t0) / G.DUR, 0, 1), i, k;
    var xAt = function (q) { return R - (N - q) * slot + slot * (1 - prog); };
    var a1 = 10, b1 = Math.round(h * .7), a2 = b1 + 28, b2 = h - 24, cur = D[N];
    var ch = all ? null : CH.filter(function (x) { return x.k === GV.m; })[0];
    var ser = (all ? CH : [ch]).map(function (x) { return { c: x, f: all ? function (p) { return p[x.k] / x.hi * 100; } : function (p) { return p[x.k]; } }; });
    var mn = 1e9, mx = -1e9;
    ser.forEach(function (z) { D.forEach(function (p) { var v = z.f(p); mn = Math.min(mn, v); mx = Math.max(mx, v); }); });
    (all ? [0, 100] : [ch.lo, ch.hi]).forEach(function (v) { mn = Math.min(mn, v); mx = Math.max(mx, v); });
    var pd = (mx - mn) * .1, rg = lerp(s, 'g' + GV.m, Math.max(0, mn - pd), mx + pd, .12); mn = rg.mn; mx = rg.mx;
    var yv = function (v) { return b1 - (v - mn) / (mx - mn) * (b1 - a1); }, dc = all ? 0 : dec(mn, mx), fm = function (v) { return all ? Math.round(v) + '%' : fmt(v, dc); };
    [[a1, b1], [a2, b2]].forEach(function (z) { rr(c, L, z[0], R - L, z[1] - z[0], 10); c.fillStyle = P.bg; c.fill(); });
    for (i = 0; i <= 4; i++) { var gv = mn + (mx - mn) * i / 4, gy = yv(gv); if (i > 0 && i < 4) hline(c, L + 1, R - 1, gy, P.gr, [2, 4]); gt(c, fm(gv), R + 8, clamp(gy, a1 + 6, b1 - 6), P.mu, 'left', 10.5, 500); }
    /* --- panel utama --- */
    c.save(); rr(c, L, a1, R - L, b1 - a1, 10); c.clip();
    if (!all) {
      var zh = yv(ch.hi), zl = yv(ch.lo), gz = c.createLinearGradient(0, a1, 0, zh);
      gz.addColorStop(0, 'rgba(244,63,94,.13)'); gz.addColorStop(1, 'rgba(244,63,94,0)'); c.fillStyle = gz; c.fillRect(L, a1, R - L, Math.max(0, zh - a1));
      gz = c.createLinearGradient(0, b1, 0, zl); gz.addColorStop(0, 'rgba(16,185,129,.13)'); gz.addColorStop(1, 'rgba(16,185,129,0)'); c.fillStyle = gz; c.fillRect(L, zl, R - L, Math.max(0, b1 - zl));
    }
    (all ? [[100, P.dn, 'Ambang 100%']] : [[ch.hi, P.dn, 'Mahal ≥ ' + fG(ch.hi)], [ch.lo, P.up, 'Murah ≤ ' + fG(ch.lo)]]).forEach(function (t) {
      var y = yv(t[0]); if (y > a1 + 22 && y < b1 - 4) { c.globalAlpha = .6; hline(c, L, R, y, t[1], [4, 4]); c.globalAlpha = 1; gt(c, t[2], L + 12, y - 8, t[1], 'left', 10, 600); }
    });
    ser.forEach(function (z) {
      var pts = D.map(function (p, q) { return [xAt(q), yv(z.f(p))]; }), col = z.c.col, g = c.createLinearGradient(0, a1, 0, b1);
      g.addColorStop(0, col); g.addColorStop(1, col + '00');
      c.beginPath(); sp(c, pts, 1); c.lineTo(pts[N][0], b1); c.lineTo(pts[0][0], b1); c.closePath(); c.globalAlpha = all ? .10 : .30; c.fillStyle = g; c.fill(); c.globalAlpha = 1;
      c.shadowColor = col; c.shadowBlur = P.l ? 0 : 10; c.lineWidth = all ? 2 : 2.6; c.lineCap = 'round'; c.strokeStyle = col; c.beginPath(); sp(c, pts, 1); c.stroke(); c.shadowBlur = 0;
    });
    if (!all) { var ea = ema(D.map(function (p) { return p[ch.k]; }), 8); c.setLineDash([5, 4]); c.lineWidth = 1.2; c.strokeStyle = P.am; c.beginPath(); sp(c, ea.map(function (v, q) { return [xAt(q), yv(v)]; }), 1); c.stroke(); c.setLineDash([]); }
    c.restore();
    var tl = all ? 'BEBAN RELATIF · % DARI AMBANG TINGGI' : ch.name.toUpperCase() + ' · GWEI'; gt(c, tl, L + 12, a1 + 14, P.mu, 'left', 10.5, 700);
    if (!all) gt(c, '– – EMA 8', L + 24 + c.measureText(tl).width, a1 + 14, P.am, 'left', 10.5, 600);
    var tg = ser.map(function (z) { var p0 = D[N - 1], vb = z.f(p0) + (z.f(cur) - z.f(p0)) * prog; return { y: yv(vb), c: z.c.col, t: fm(vb) }; }).sort(function (p, q) { return p.y - q.y; });
    tg.forEach(function (q, j) { dot(c, R, q.y, q.c, now); if (j && q.y < tg[j - 1].y + 22) q.y = tg[j - 1].y + 22; pill(c, q.t, R + 6, clamp(q.y, a1 + 10, b1 - 10), q.c); });
    /* --- panel indeks kemacetan --- */
    var yc = function (v) { return b2 - 4 - v / 100 * (b2 - a2 - 12); }, ci = Math.round(gcong(cur) * 100), cc = ci > 66 ? P.dn : ci > 40 ? P.am : P.up;
    c.save(); rr(c, L, a2, R - L, b2 - a2, 10); c.clip();
    [40, 66].forEach(function (v) { c.globalAlpha = .5; hline(c, L, R, yc(v), v > 50 ? P.dn : P.am, [2, 4]); c.globalAlpha = 1; });
    var cp = D.map(function (p, q) { return [xAt(q), yc(gcong(p) * 100)]; }), g3 = c.createLinearGradient(0, a2, 0, b2); g3.addColorStop(0, cc); g3.addColorStop(1, cc + '00');
    c.beginPath(); sp(c, cp, 1); c.lineTo(cp[N][0], b2); c.lineTo(cp[0][0], b2); c.closePath(); c.globalAlpha = .28; c.fillStyle = g3; c.fill(); c.globalAlpha = 1;
    c.lineWidth = 1.8; c.strokeStyle = cc; c.beginPath(); sp(c, cp, 1); c.stroke(); c.restore();
    gt(c, 'INDEKS KEMACETAN', L + 12, a2 + 13, P.mu, 'left', 10.5, 700); pill(c, ci + '%', R + 6, clamp(yc(ci), a2 + 10, b2 - 10), cc);
    for (i = N; i >= 0; i -= 12) { var xx = xAt(i); if (xx > L + 26 && xx < R - 26) gt(c, hms(D[i].t), xx, h - 9, P.mu, 'center', 10.5, 500); }
    /* --- crosshair + tooltip kartu --- */
    if (s.mx >= L && s.mx <= R) {
      k = clamp(Math.round(N - (R + slot * (1 - prog) - s.mx) / slot), 0, N); var x = xAt(k), p = D[k], rows = [];
      c.save(); c.setLineDash([4, 4]); c.strokeStyle = P.mu; c.lineWidth = 1; c.beginPath(); c.moveTo(Math.round(x) + .5, a1); c.lineTo(Math.round(x) + .5, b2); c.stroke(); c.restore();
      ser.forEach(function (z) { var y = yv(z.f(p)); c.beginPath(); c.arc(x, y, 4.5, 0, TAU); c.fillStyle = P.l ? '#fff' : '#0b0b0f'; c.fill(); c.lineWidth = 2; c.strokeStyle = z.c.col; c.stroke(); rows.push([z.c.col, z.c.name, fG(p[z.c.k]) + ' Gwei' + (all ? ' · ' + Math.round(z.f(p)) + '%' : '')]); });
      if (!all && ch.k === 'e') { rows.push([P.mu, 'Base fee', fG(p.eb)]); rows.push([P.mu, 'Priority tip', fG(p.pe)]); }
      rows.push([cc, 'Kemacetan', Math.round(gcong(p) * 100) + '%']); gtip(c, w, x, hms(p.t), rows, P);
    }
  });
  /* ================= 2. INDEKS SAHAM AS ================= */
  var K = 60, KEEP = 240, PER = 6, VC = 30, IXP = {};
  var DEF = { nasdaq: { cv: 'overview-pro-nasdaq', start: 138.20, prev: 138.20 / 1.0082, vol: .0016 }, sp: { cv: 'overview-pro-sp', start: 228.50, prev: 228.50 / 1.0035, vol: .0012 }, dow: { cv: 'overview-pro-dow', start: 245.60, prev: 245.60 / .9982, vol: .0018 }, msft: { cv: 'overview-pro-msft', start: 428.30, prev: 428.30 / 1.0046, vol: .0012 } };
  Object.keys(DEF).forEach(function (key) {
    var d = DEF[key], X = { key: key, start: d.start, prev: d.prev, p: [], t: [], v: [], i: [], cnt: 0, t0: performance.now(), cache: null, dc: 0 }, p = d.start, a = [], j, now = Date.now();
    for (j = 0; j < KEEP; j++) { a.unshift(p); p = clamp(p * (1 + rnd() * 2 * d.vol * 1.3), d.start * .988, d.start * 1.012); }
    for (j = 0; j < KEEP; j++) { X.p.push(a[j]); X.t.push(now - (KEEP - 1 - j) * 1000); X.v.push(.6 + Math.random() * 1.4); X.i.push(X.cnt++); }
    X.hi = Math.max.apply(null, a); X.lo = Math.min.apply(null, a); X.dc = a[KEEP - 1]; IXP[key] = X;
  });
  window.__ixPro = { push: function (key, px, prev) {
    var X = IXP[key]; if (!X) return; var last = X.p[X.p.length - 1];
    X.p.push(px); X.t.push(Date.now()); X.v.push((.6 + Math.random() * 1.4) * (1 + Math.abs(px / last - 1) * 3000)); X.i.push(X.cnt++);
    if (X.p.length > KEEP) { X.p.shift(); X.t.shift(); X.v.shift(); X.i.shift(); }
    X.prev = prev; X.hi = Math.max(X.hi, px); X.lo = Math.min(X.lo, px); X.t0 = performance.now(); X.cache = null;
  } };
  function ixHead(c, X, L, R, P, now, yAt, vb, up, ybnd) {
    var dy = yAt(vb), col = up ? P.up : P.dn; dot(c, R, dy, col, now); tag(c, fmt(vb, 2), R + 2, clamp(dy, ybnd[0], ybnd[1]), col, '#111');
  }
  function pcline(c, X, L, R, yAt, y0, y1, P) {
    var y = yAt(X.prev); if (!(y > y0 && y < y1)) return; hline(c, L, R, y, P.mu, [3, 3]); T(c, 'PC', L + 2, y - 5, P.mu, 'left', 8, 700);
  }
  /* --- NASDAQ: area + EMA9/21 + cross + volume + RSI --- */
  host(DEF.nasdaq.cv, function (c, w, h, now, s, P) {
    var X = IXP.nasdaq, p = X.p, n = p.length, L = 6, R = w - 54, T0 = 16, M1 = Math.round(h * .6), R0 = M1 + 12, R1 = h - 13, i;
    if (!X.cache) X.cache = { e9: ema(p, 9), e21: ema(p, 21), rs: rsi(p, 14) }; var e9 = X.cache.e9, e21 = X.cache.e21, rs = X.cache.rs;
    var slot = (R - L) / (K - 1), prog = clamp((now - X.t0) / 1000, 0, 1), a0 = n - 1 - K;
    var xAt = function (q) { return R - (n - 1 - q) * slot + slot * (1 - prog); };
    var up = p[n - 1] >= X.prev, uc = up ? P.up : P.dn, rgb = up ? '16,185,129' : '239,68,68', mn = Infinity, mx = -Infinity, vm = 0;
    for (i = a0; i < n; i++) { mn = Math.min(mn, p[i], e9[i], e21[i]); mx = Math.max(mx, p[i], e9[i], e21[i]); vm = Math.max(vm, X.v[i]); }
    var pd = (mx - mn) * .15 + X.start * .00008, rg = lerp(s, 'rg', mn - pd, mx + pd, .12); mn = rg.mn; mx = rg.mx;
    var yAt = function (v) { return M1 - (v - mn) / (mx - mn) * (M1 - T0); }, d0 = dec(mn, mx);
    Tw(c, 'NVDA', L, 6, P.tx, 8, 700) ; var hx = Tw(c, 'EMA9', L + 46, 6, P.am, 8, 700); Tw(c, 'EMA21', hx, 6, P.vi, 8, 700);
    T(c, 'H ' + fmt(X.hi, 2) + '  L ' + fmt(X.lo, 2), R + 52, 6, P.mu, 'right', 8, 600);
    hgrid(c, L, R, T0, M1, mn, mx, P, d0, 3);
    c.save(); c.beginPath(); c.rect(L, T0 - 2, R - L + 1, M1 - T0 + 4); c.clip();
    for (i = a0 + 1; i < n; i++) { var vh = X.v[i] / vm * (M1 - T0) * .18; c.fillStyle = p[i] >= p[i - 1] ? P.up : P.dn; c.globalAlpha = .32; c.fillRect(xAt(i) - slot * .36, M1 - vh, slot * .72, vh); }
    c.globalAlpha = 1;
    var gd = c.createLinearGradient(0, T0, 0, M1); gd.addColorStop(0, 'rgba(' + rgb + ',.38)'); gd.addColorStop(1, 'rgba(' + rgb + ',0)');
    c.beginPath(); for (i = a0; i < n; i++) i > a0 ? c.lineTo(xAt(i), yAt(p[i])) : c.moveTo(xAt(i), yAt(p[i])); c.lineTo(xAt(n - 1), M1); c.lineTo(xAt(a0), M1); c.closePath(); c.fillStyle = gd; c.fill();
    pcline(c, X, L, R, yAt, T0, M1, P);
    c.lineWidth = 1.2; c.strokeStyle = P.am; c.beginPath(); for (i = a0; i < n; i++) i > a0 ? c.lineTo(xAt(i), yAt(e9[i])) : c.moveTo(xAt(i), yAt(e9[i])); c.stroke();
    c.strokeStyle = P.vi; c.beginPath(); for (i = a0; i < n; i++) i > a0 ? c.lineTo(xAt(i), yAt(e21[i])) : c.moveTo(xAt(i), yAt(e21[i])); c.stroke();
    c.lineWidth = 1.8; c.strokeStyle = uc; c.beginPath(); for (i = a0; i < n; i++) i > a0 ? c.lineTo(xAt(i), yAt(p[i])) : c.moveTo(xAt(i), yAt(p[i])); c.stroke();
    for (i = a0 + 1; i < n; i++) { var d1 = e9[i - 1] - e21[i - 1], d2 = e9[i] - e21[i]; if (d1 * d2 < 0) tri(c, xAt(i), yAt(e9[i]) + (d2 > 0 ? 7 : -7), d2 > 0, d2 > 0 ? P.up : P.dn, 3); }
    c.restore();
    var vb = p[n - 2] + (p[n - 1] - p[n - 2]) * prog; ixHead(c, X, L, R, P, now, yAt, vb, up, [T0 + 6, M1 - 6]);
    /* RSI */
    var ry = function (v) { return R1 - v / 100 * (R1 - R0); };
    c.fillStyle = P.bg; c.fillRect(L, R0, R - L, R1 - R0); c.fillStyle = 'rgba(167,139,250,.10)'; c.fillRect(L, ry(70), R - L, ry(30) - ry(70));
    hline(c, L, R, ry(70), P.dn, [2, 3]); hline(c, L, R, ry(30), P.up, [2, 3]); hline(c, L, R, ry(50), P.gr);
    T(c, '70', R + 3, ry(70), P.dn, 'left', 8, 600); T(c, '30', R + 3, ry(30), P.up, 'left', 8, 600); T(c, 'RSI14', L + 2, R0 + 6, P.mu, 'left', 8, 700);
    c.save(); c.beginPath(); c.rect(L, R0, R - L + 1, R1 - R0); c.clip(); c.lineWidth = 1.4;
    for (i = a0 + 1; i < n; i++) { var rv = rs[i]; c.strokeStyle = rv >= 70 ? P.dn : rv <= 30 ? P.up : P.vi; c.beginPath(); c.moveTo(xAt(i - 1), ry(rs[i - 1])); c.lineTo(xAt(i), ry(rv)); c.stroke(); }
    c.restore();
    var rc = rs[n - 1] >= 70 ? P.dn : rs[n - 1] <= 30 ? P.up : P.vi; T(c, rs[n - 1].toFixed(0), R + 3, clamp(ry(rs[n - 1]), R0 + 6, R1 - 6), rc, 'left', 9, 700);
    for (i = n - 1; i > a0; i -= 15) { var xx = xAt(i); if (xx > L + 18 && xx < R - 18) T(c, hms(X.t[i]), xx, h - 5, P.mu, 'center', 8); }
    if (s.mx >= L && s.mx <= R) {
      var k = clamp(Math.round(n - 1 - (R + slot * (1 - prog) - s.mx) / slot), a0, n - 1), x = xAt(k);
      vline(c, x, T0, R1, P); c.beginPath(); c.arc(x, yAt(p[k]), 3, 0, TAU); c.fillStyle = uc; c.fill();
      var ch = (p[k] / X.prev - 1) * 100;
      tip(c, w, x, [[hms(X.t[k]), P.tx], ['Harga ' + fmt(p[k], 2), uc], [(ch >= 0 ? '▲ ' : '▼ ') + Math.abs(ch).toFixed(2) + '% vs PC', ch >= 0 ? P.up : P.dn], ['EMA9  ' + fmt(e9[k], 2), P.am], ['EMA21 ' + fmt(e21[k], 2), P.vi], ['RSI ' + rs[k].toFixed(1) + '  Vol ' + X.v[k].toFixed(1), P.mu]], P);
    }
  });
  /* --- S&P 500: candlestick + EMA8 + volume + MACD --- */
  host(DEF.sp.cv, function (c, w, h, now, s, P) {
    var X = IXP.sp, p = X.p, n = p.length, L = 6, R = w - 54, T0 = 16, M1 = Math.round(h * .55), V0 = M1 + 5, V1 = V0 + Math.round(h * .1), C0 = V1 + 9, C1 = h - 6, i, j;
    X.dc += (p[n - 1] - X.dc) * .2;
    var cs = [], g = -1; for (j = 0; j < n; j++) { var gi = Math.floor(X.i[j] / PER); if (gi !== g) { g = gi; cs.push({ o: p[j], h: p[j], l: p[j], c: p[j], v: 0, t: X.t[j], g: gi }); } var q = cs[cs.length - 1]; q.h = Math.max(q.h, p[j]); q.l = Math.min(q.l, p[j]); q.c = p[j]; q.v += X.v[j]; }
    var cn = cs.length, lastc = cs[cn - 1]; lastc.c = X.dc; lastc.h = Math.max(lastc.h, X.dc); lastc.l = Math.min(lastc.l, X.dc);
    if (s.lg === undefined) s.lg = lastc.g; else if (lastc.g !== s.lg) { s.lg = lastc.g; s.sh = 1; } s.sh *= .9;
    var cl = cs.map(function (x) { return x.c; }), e8 = ema(cl, 8), ef = ema(cl, 6), es = ema(cl, 13), mc = cl.map(function (_, q2) { return ef[q2] - es[q2]; }), sg = ema(mc, 4), hs = mc.map(function (v, q3) { return v - sg[q3]; });
    var a0 = Math.max(0, cn - VC), vn = cn - a0, slot = (R - L) / vn, xAt = function (k) { return L + (k - a0 + .5) * slot + s.sh * slot; };
    var mn = Infinity, mx = -Infinity, vm = 0, hm = 1e-6; for (i = a0; i < cn; i++) { mn = Math.min(mn, cs[i].l); mx = Math.max(mx, cs[i].h); vm = Math.max(vm, cs[i].v); hm = Math.max(hm, Math.abs(hs[i]), Math.abs(mc[i]), Math.abs(sg[i])); }
    var pd = (mx - mn) * .14 + X.start * .00004, rg = lerp(s, 'rg', mn - pd, mx + pd, .12); mn = rg.mn; mx = rg.mx;
    var yAt = function (v) { return M1 - (v - mn) / (mx - mn) * (M1 - T0); }, d0 = dec(mn, mx), up = X.dc >= X.prev, uc = up ? P.up : P.dn;
    var hx = Tw(c, 'AAPL', L, 6, P.tx, 8, 700); Tw(c, 'EMA8', hx, 6, P.am, 8, 700); T(c, 'H ' + fmt(X.hi, 2) + '  L ' + fmt(X.lo, 2), R + 52, 6, P.mu, 'right', 8, 600);
    hgrid(c, L, R, T0, M1, mn, mx, P, d0, 3);
    c.save(); c.beginPath(); c.rect(L, T0 - 3, R - L, M1 - T0 + 6); c.clip(); pcline(c, X, L, R, yAt, T0, M1, P);
    for (i = a0; i < cn; i++) { var o = cs[i].o, cc = cs[i].c, xx = xAt(i), col = cc >= o ? P.up : P.dn, y1 = yAt(Math.max(o, cc)), y2 = yAt(Math.min(o, cc));
      c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1; c.beginPath(); c.moveTo(Math.round(xx) + .5, yAt(cs[i].h)); c.lineTo(Math.round(xx) + .5, yAt(cs[i].l)); c.stroke(); c.fillRect(xx - slot * .32, y1, slot * .64, Math.max(1.5, y2 - y1)); }
    c.lineWidth = 1.3; c.strokeStyle = P.am; c.beginPath(); for (i = a0; i < cn; i++) i > a0 ? c.lineTo(xAt(i), yAt(e8[i])) : c.moveTo(xAt(i), yAt(e8[i])); c.stroke(); c.restore();
    var ly = yAt(X.dc); c.save(); c.setLineDash([3, 3]); c.strokeStyle = uc; c.beginPath(); c.moveTo(xAt(cn - 1), Math.round(ly) + .5); c.lineTo(R, Math.round(ly) + .5); c.stroke(); c.restore();
    dot(c, xAt(cn - 1), ly, uc, now); tag(c, fmt(X.dc, 2), R + 2, clamp(ly, T0 + 6, M1 - 6), uc, '#111');
    /* volume */
    T(c, 'VOL', L + 1, V0 + 3, P.mu, 'left', 8, 700);
    c.save(); c.beginPath(); c.rect(L, V0 - 1, R - L, V1 - V0 + 2); c.clip();
    for (i = a0; i < cn; i++) { var vh = cs[i].v / vm * (V1 - V0); c.fillStyle = cs[i].c >= cs[i].o ? P.up : P.dn; c.globalAlpha = .55; c.fillRect(xAt(i) - slot * .32, V1 - vh, slot * .64, vh); } c.globalAlpha = 1; c.restore();
    /* MACD */
    var zy = (C0 + C1) / 2, hh = (C1 - C0) / 2, my = function (v) { return zy - v / hm * hh; };
    c.fillStyle = P.bg; c.fillRect(L, C0, R - L, C1 - C0); hline(c, L, R, zy, P.gr); T(c, 'MACD(6,13,4)', L + 2, C0 + 5, P.mu, 'left', 8, 700);
    c.save(); c.beginPath(); c.rect(L, C0, R - L, C1 - C0); c.clip();
    for (i = a0; i < cn; i++) { var bh = hs[i] / hm * hh; c.fillStyle = hs[i] >= 0 ? P.up : P.dn; c.globalAlpha = .7; c.fillRect(xAt(i) - slot * .3, bh >= 0 ? zy - bh : zy, slot * .6, Math.max(1, Math.abs(bh))); } c.globalAlpha = 1;
    c.lineWidth = 1.2; c.strokeStyle = P.cy; c.beginPath(); for (i = a0; i < cn; i++) i > a0 ? c.lineTo(xAt(i), my(mc[i])) : c.moveTo(xAt(i), my(mc[i])); c.stroke();
    c.strokeStyle = P.am; c.beginPath(); for (i = a0; i < cn; i++) i > a0 ? c.lineTo(xAt(i), my(sg[i])) : c.moveTo(xAt(i), my(sg[i])); c.stroke(); c.restore();
    T(c, (hs[cn - 1] >= 0 ? '+' : '') + hs[cn - 1].toFixed(2), R + 3, zy, hs[cn - 1] >= 0 ? P.up : P.dn, 'left', 8, 700);
    if (s.mx >= L && s.mx <= R) {
      var k = clamp(Math.floor((s.mx - L - s.sh * slot) / slot) + a0, a0, cn - 1), q4 = cs[k], xk = xAt(k), chg = (q4.c / q4.o - 1) * 100;
      vline(c, xk, T0, C1, P);
      tip(c, w, xk, [[hms(q4.t), P.tx], ['O ' + fmt(q4.o, 2) + '  H ' + fmt(q4.h, 2), P.tx], ['L ' + fmt(q4.l, 2) + '  C ' + fmt(q4.c, 2), P.tx], [(chg >= 0 ? '▲ ' : '▼ ') + Math.abs(chg).toFixed(2) + '%  Vol ' + q4.v.toFixed(1), chg >= 0 ? P.up : P.dn], ['MACD ' + mc[k].toFixed(2) + ' Sig ' + sg[k].toFixed(2), P.cy]], P);
    }
  });
  /* --- Dow Jones: Bollinger ±2σ + SMA20 + %B + bandwidth + squeeze --- */
  function bbCard(key, label) { host(DEF[key].cv, function (c, w, h, now, s, P) {
    var X = IXP[key], p = X.p, n = p.length, L = 6, R = w - 54, T0 = 16, M1 = Math.round(h * .62), B0 = M1 + 12, B1 = h - 13, i;
    if (!X.cache) { var m20 = [], up20 = [], lw20 = [], pb = [], bw = []; for (i = 0; i < n; i++) { var m = sma(p, i, 20), sd = sdv(p, i, 20, m), u = m + 2 * sd, l = m - 2 * sd; m20.push(m); up20.push(u); lw20.push(l); pb.push(u - l > 0 ? (p[i] - l) / (u - l) : .5); bw.push((u - l) / m * 100); } X.cache = { m: m20, u: up20, l: lw20, pb: pb, bw: bw }; }
    var m20a = X.cache.m, u20 = X.cache.u, l20 = X.cache.l, pbs = X.cache.pb, bws = X.cache.bw;
    var slot = (R - L) / (K - 1), prog = clamp((now - X.t0) / 1000, 0, 1), a0 = n - 1 - K, xAt = function (q) { return R - (n - 1 - q) * slot + slot * (1 - prog); };
    var mn = Infinity, mx = -Infinity, bmx = 1e-6, bmn = Infinity; for (i = a0; i < n; i++) { mn = Math.min(mn, l20[i], p[i]); mx = Math.max(mx, u20[i], p[i]); bmx = Math.max(bmx, bws[i]); bmn = Math.min(bmn, bws[i]); }
    var pd = (mx - mn) * .1 + X.start * .00006, rg = lerp(s, 'rg', mn - pd, mx + pd, .12); mn = rg.mn; mx = rg.mx;
    var yAt = function (v) { return M1 - (v - mn) / (mx - mn) * (M1 - T0); }, d0 = dec(mn, mx), up = p[n - 1] >= X.prev, uc = up ? P.up : P.dn;
    var hx = Tw(c, label, L, 6, P.tx, 8, 700); hx = Tw(c, 'BB(20,2σ)', hx, 6, '#818CF8', 8, 700); if (bws[n - 1] <= bmn + (bmx - bmn) * .2) tag(c, 'SQUEEZE', hx, 6, P.am, '#111');
    T(c, 'H ' + fmt(X.hi, 2) + '  L ' + fmt(X.lo, 2), R + 52, 6, P.mu, 'right', 8, 600);
    hgrid(c, L, R, T0, M1, mn, mx, P, d0, 3);
    c.save(); c.beginPath(); c.rect(L, T0 - 2, R - L + 1, M1 - T0 + 4); c.clip();
    c.beginPath(); for (i = a0; i < n; i++) i > a0 ? c.lineTo(xAt(i), yAt(u20[i])) : c.moveTo(xAt(i), yAt(u20[i])); for (i = n - 1; i >= a0; i--) c.lineTo(xAt(i), yAt(l20[i])); c.closePath(); c.fillStyle = 'rgba(129,140,248,.13)'; c.fill();
    c.lineWidth = 1; c.strokeStyle = 'rgba(129,140,248,.7)'; [u20, l20].forEach(function (ar) { c.beginPath(); for (var q = a0; q < n; q++) q > a0 ? c.lineTo(xAt(q), yAt(ar[q])) : c.moveTo(xAt(q), yAt(ar[q])); c.stroke(); });
    c.setLineDash([3, 3]); c.strokeStyle = P.mu; c.beginPath(); for (i = a0; i < n; i++) i > a0 ? c.lineTo(xAt(i), yAt(m20a[i])) : c.moveTo(xAt(i), yAt(m20a[i])); c.stroke(); c.setLineDash([]);
    pcline(c, X, L, R, yAt, T0, M1, P);
    c.lineWidth = 1.8; for (i = a0 + 1; i < n; i++) { c.strokeStyle = p[i] >= m20a[i] ? P.up : P.dn; c.beginPath(); c.moveTo(xAt(i - 1), yAt(p[i - 1])); c.lineTo(xAt(i), yAt(p[i])); c.stroke(); }
    for (i = a0; i < n; i++) if (p[i] > u20[i] || p[i] < l20[i]) { c.beginPath(); c.arc(xAt(i), yAt(p[i]), 2.6, 0, TAU); c.strokeStyle = P.am; c.lineWidth = 1.3; c.stroke(); }
    c.restore();
    var vb = p[n - 2] + (p[n - 1] - p[n - 2]) * prog; ixHead(c, X, L, R, P, now, yAt, vb, up, [T0 + 6, M1 - 6]);
    /* panel %B + BBW */
    var yb = function (v) { return B1 - (clamp(v, -.2, 1.2) + .2) / 1.4 * (B1 - B0); };
    c.fillStyle = P.bg; c.fillRect(L, B0, R - L, B1 - B0); c.fillStyle = 'rgba(129,140,248,.10)'; c.fillRect(L, yb(.8), R - L, yb(.2) - yb(.8));
    hline(c, L, R, yb(1), P.dn, [2, 3]); hline(c, L, R, yb(0), P.up, [2, 3]); hline(c, L, R, yb(.5), P.gr);
    T(c, '1.0', R + 3, yb(1), P.dn, 'left', 8, 600); T(c, '0', R + 3, yb(0), P.up, 'left', 8, 600); T(c, '%B / BBW', L + 2, B0 + 6, P.mu, 'left', 8, 700);
    c.save(); c.beginPath(); c.rect(L, B0, R - L + 1, B1 - B0); c.clip();
    for (i = a0 + 1; i < n; i++) { var bh = bws[i] / bmx * (B1 - B0) * .5; c.fillStyle = 'rgba(148,163,184,.30)'; c.fillRect(xAt(i) - slot * .36, B1 - bh, slot * .72, bh); }
    c.lineWidth = 1.4; for (i = a0 + 1; i < n; i++) { c.strokeStyle = pbs[i] > 1 ? P.dn : pbs[i] < 0 ? P.up : P.cy; c.beginPath(); c.moveTo(xAt(i - 1), yb(pbs[i - 1])); c.lineTo(xAt(i), yb(pbs[i])); c.stroke(); }
    c.restore(); T(c, pbs[n - 1].toFixed(2), R + 3, clamp(yb(pbs[n - 1]), B0 + 6, B1 - 6), P.cy, 'left', 9, 700);
    for (i = n - 1; i > a0; i -= 15) { var xx = xAt(i); if (xx > L + 18 && xx < R - 18) T(c, hms(X.t[i]), xx, h - 5, P.mu, 'center', 8); }
    if (s.mx >= L && s.mx <= R) {
      var k = clamp(Math.round(n - 1 - (R + slot * (1 - prog) - s.mx) / slot), a0, n - 1), x = xAt(k), ch = (p[k] / X.prev - 1) * 100;
      vline(c, x, T0, B1, P); c.beginPath(); c.arc(x, yAt(p[k]), 3, 0, TAU); c.fillStyle = p[k] >= m20a[k] ? P.up : P.dn; c.fill();
      tip(c, w, x, [[hms(X.t[k]), P.tx], ['Harga ' + fmt(p[k], 2), p[k] >= m20a[k] ? P.up : P.dn], [(ch >= 0 ? '▲ ' : '▼ ') + Math.abs(ch).toFixed(2) + '% vs PC', ch >= 0 ? P.up : P.dn], ['Atas ' + fmt(u20[k], 2), '#818CF8'], ['SMA20 ' + fmt(m20a[k], 2), P.mu], ['Bawah ' + fmt(l20[k], 2), '#818CF8'], ['%B ' + pbs[k].toFixed(2) + ' BBW ' + bws[k].toFixed(2) + '%', P.cy]], P);
    }
  }); }
  bbCard('dow', 'TSLA');
  /* --- Microsoft: Donchian 20 + garis tengah + breakout + Stochastic (14,3) --- */
  host(DEF.msft.cv, function (c, w, h, now, s, P) {
    var X = IXP.msft, p = X.p, n = p.length, L = 6, R = w - 54, T0 = 16, M1 = Math.round(h * .62), S0 = M1 + 12, S1 = h - 13, i, j;
    if (!X.cache) {
      var du = [], dl = [], dm = [], kk = [], dd = [];
      for (i = 0; i < n; i++) {
        var a20 = Math.max(0, i - 19), a14 = Math.max(0, i - 13), hi20 = -Infinity, lo20 = Infinity, hi14 = -Infinity, lo14 = Infinity;
        for (j = a20; j <= i; j++) { hi20 = Math.max(hi20, p[j]); lo20 = Math.min(lo20, p[j]); }
        for (j = a14; j <= i; j++) { hi14 = Math.max(hi14, p[j]); lo14 = Math.min(lo14, p[j]); }
        du.push(hi20); dl.push(lo20); dm.push((hi20 + lo20) / 2); kk.push(hi14 - lo14 > 0 ? (p[i] - lo14) / (hi14 - lo14) * 100 : 50);
      }
      for (i = 0; i < n; i++) dd.push(sma(kk, i, 3));
      X.cache = { u: du, l: dl, m: dm, k: kk, d: dd };
    }
    var du = X.cache.u, dl = X.cache.l, dm = X.cache.m, kk = X.cache.k, dd = X.cache.d;
    var slot = (R - L) / (K - 1), prog = clamp((now - X.t0) / 1000, 0, 1), a0 = n - 1 - K, xAt = function (q) { return R - (n - 1 - q) * slot + slot * (1 - prog); };
    var mn = Infinity, mx = -Infinity; for (i = a0; i < n; i++) { mn = Math.min(mn, dl[i], p[i]); mx = Math.max(mx, du[i], p[i]); }
    var pd = (mx - mn) * .12 + X.start * .00006, rg = lerp(s, 'rg', mn - pd, mx + pd, .12); mn = rg.mn; mx = rg.mx;
    var yAt = function (v) { return M1 - (v - mn) / (mx - mn) * (M1 - T0); }, d0 = dec(mn, mx), up = p[n - 1] >= X.prev, uc = up ? P.up : P.dn;
    var hx = Tw(c, 'MSFT', L, 6, P.tx, 8, 700); hx = Tw(c, 'DONCHIAN 20', hx, 6, P.vi, 8, 700);
    T(c, 'H ' + fmt(X.hi, 2) + '  L ' + fmt(X.lo, 2), R + 52, 6, P.mu, 'right', 8, 600);
    hgrid(c, L, R, T0, M1, mn, mx, P, d0, 3);
    c.save(); c.beginPath(); c.rect(L, T0 - 2, R - L + 1, M1 - T0 + 4); c.clip();
    /* kanal Donchian (stepped) */
    c.beginPath(); for (i = a0; i < n; i++) { if (i > a0) c.lineTo(xAt(i), yAt(du[i - 1])); i > a0 ? c.lineTo(xAt(i), yAt(du[i])) : c.moveTo(xAt(i), yAt(du[i])); }
    for (i = n - 1; i >= a0; i--) { c.lineTo(xAt(i), yAt(dl[i])); if (i > a0) c.lineTo(xAt(i), yAt(dl[i - 1])); } c.closePath(); c.fillStyle = 'rgba(167,139,250,.12)'; c.fill();
    c.lineWidth = 1; c.strokeStyle = 'rgba(167,139,250,.8)';
    [du, dl].forEach(function (ar) { c.beginPath(); for (var q = a0; q < n; q++) { if (q > a0) c.lineTo(xAt(q), yAt(ar[q - 1])); q > a0 ? c.lineTo(xAt(q), yAt(ar[q])) : c.moveTo(xAt(q), yAt(ar[q])); } c.stroke(); });
    c.setLineDash([3, 3]); c.strokeStyle = P.mu; c.beginPath(); for (i = a0; i < n; i++) i > a0 ? c.lineTo(xAt(i), yAt(dm[i])) : c.moveTo(xAt(i), yAt(dm[i])); c.stroke(); c.setLineDash([]);
    pcline(c, X, L, R, yAt, T0, M1, P);
    /* harga: area tipis + garis berwarna sesuai posisi terhadap garis tengah */
    var gd = c.createLinearGradient(0, T0, 0, M1); gd.addColorStop(0, up ? 'rgba(16,185,129,.22)' : 'rgba(239,68,68,.22)'); gd.addColorStop(1, 'rgba(0,0,0,0)');
    c.beginPath(); for (i = a0; i < n; i++) i > a0 ? c.lineTo(xAt(i), yAt(p[i])) : c.moveTo(xAt(i), yAt(p[i])); c.lineTo(xAt(n - 1), M1); c.lineTo(xAt(a0), M1); c.closePath(); c.fillStyle = gd; c.fill();
    c.lineWidth = 1.8; for (i = a0 + 1; i < n; i++) { c.strokeStyle = p[i] >= dm[i] ? P.up : P.dn; c.beginPath(); c.moveTo(xAt(i - 1), yAt(p[i - 1])); c.lineTo(xAt(i), yAt(p[i])); c.stroke(); }
    /* penanda breakout: harga menembus batas atas/bawah 20 periode sebelumnya */
    for (i = a0 + 1; i < n; i++) { if (p[i] > du[i - 1]) tri(c, xAt(i), yAt(p[i]) - 7, true, P.up, 3); else if (p[i] < dl[i - 1]) tri(c, xAt(i), yAt(p[i]) + 7, false, P.dn, 3); }
    c.restore();
    var vb = p[n - 2] + (p[n - 1] - p[n - 2]) * prog; ixHead(c, X, L, R, P, now, yAt, vb, up, [T0 + 6, M1 - 6]);
    /* panel Stochastic (14,3) */
    var sy = function (v) { return S1 - v / 100 * (S1 - S0); };
    c.fillStyle = P.bg; c.fillRect(L, S0, R - L, S1 - S0); c.fillStyle = 'rgba(167,139,250,.10)'; c.fillRect(L, sy(80), R - L, sy(20) - sy(80));
    hline(c, L, R, sy(80), P.dn, [2, 3]); hline(c, L, R, sy(20), P.up, [2, 3]);
    T(c, '80', R + 3, sy(80), P.dn, 'left', 8, 600); T(c, '20', R + 3, sy(20), P.up, 'left', 8, 600); T(c, 'STOCH(14,3)', L + 2, S0 + 6, P.mu, 'left', 8, 700);
    c.save(); c.beginPath(); c.rect(L, S0, R - L + 1, S1 - S0); c.clip();
    c.lineWidth = 1.3; c.strokeStyle = P.cy; c.beginPath(); for (i = a0; i < n; i++) i > a0 ? c.lineTo(xAt(i), sy(kk[i])) : c.moveTo(xAt(i), sy(kk[i])); c.stroke();
    c.lineWidth = 1.2; c.strokeStyle = P.am; c.beginPath(); for (i = a0; i < n; i++) i > a0 ? c.lineTo(xAt(i), sy(dd[i])) : c.moveTo(xAt(i), sy(dd[i])); c.stroke();
    c.restore();
    T(c, kk[n - 1].toFixed(0), R + 3, clamp(sy(kk[n - 1]), S0 + 6, S1 - 6), kk[n - 1] >= 80 ? P.dn : kk[n - 1] <= 20 ? P.up : P.cy, 'left', 9, 700);
    for (i = n - 1; i > a0; i -= 15) { var xx = xAt(i); if (xx > L + 18 && xx < R - 18) T(c, hms(X.t[i]), xx, h - 5, P.mu, 'center', 8); }
    if (s.mx >= L && s.mx <= R) {
      var k = clamp(Math.round(n - 1 - (R + slot * (1 - prog) - s.mx) / slot), a0, n - 1), x = xAt(k), ch = (p[k] / X.prev - 1) * 100;
      vline(c, x, T0, S1, P); c.beginPath(); c.arc(x, yAt(p[k]), 3, 0, TAU); c.fillStyle = p[k] >= dm[k] ? P.up : P.dn; c.fill();
      tip(c, w, x, [[hms(X.t[k]), P.tx], ['Harga ' + fmt(p[k], 2), p[k] >= dm[k] ? P.up : P.dn], [(ch >= 0 ? '▲ ' : '▼ ') + Math.abs(ch).toFixed(2) + '% vs PC', ch >= 0 ? P.up : P.dn], ['Atas ' + fmt(du[k], 2), P.vi], ['Bawah ' + fmt(dl[k], 2), P.vi], ['%K ' + kk[k].toFixed(0) + '  %D ' + dd[k].toFixed(0), P.cy]], P);
    }
  });
})();
