/* ============================================================
   MARKET CARDS PRO — STATUS PASAR & DOMINASI (area + bar, model price-history) • KAPITALISASI PASAR GLOBAL • DERIVATIVES (OPEN INT.)
   Grafik canvas multi-panel, bergerak otomatis (rAF), crosshair interaktif, mengikuti tema terang/gelap.
   Data diumpankan modul LIVE tiap 2 detik lewat window.__domPro / __mcapPro / __oiPro. Data = simulasi ilustratif.
   ============================================================ */
(function () {
  'use strict';
  if (window.__mktPro) return; window.__mktPro = true;
  var TAU = 6.2832, MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace';
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); }, rnd = function () { return Math.random() - .5; };
  function pal() {
    var l = document.documentElement.classList.contains('light');
    return { l: l, tx: l ? '#0f172a' : '#F1F5F9', mu: l ? '#64748b' : '#94A3B8', gr: l ? 'rgba(15,23,42,.09)' : 'rgba(255,255,255,.07)',
      up: l ? '#059669' : '#34D399', dn: l ? '#e11d48' : '#FB7185', cy: l ? '#0891b2' : '#22D3EE' };
  }
  function host(id, draw) {
    var cv = document.getElementById(id); if (!cv) return;
    var ctx = cv.getContext('2d'), s = { w: 0, h: 0, mx: -1, my: -1 }, dpr = 1;
    function mv(e) { var r = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; s.mx = p.clientX - r.left; s.my = p.clientY - r.top; }
    cv.addEventListener('mousemove', mv); cv.addEventListener('touchstart', mv, { passive: true }); cv.addEventListener('touchmove', mv, { passive: true });
    cv.addEventListener('mouseleave', function () { s.mx = -1; }); cv.addEventListener('touchend', function () { s.mx = -1; });
    (function f(now) {
      requestAnimationFrame(f);
      if (cv.offsetParent === null || document.hidden) return;
      var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      if (w !== s.w || h !== s.h) { s.w = w; s.h = h; dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); ctx.lineJoin = 'round';
      try { draw(ctx, w, h, now, s, pal()); } catch (e) { console.warn('[market-pro]', e); }
    })(performance.now());
  }
  function T(c, t, x, y, col, al, sz, wt) { c.font = (wt || 400) + ' ' + (sz || 8) + 'px ' + MONO; c.fillStyle = col; c.textAlign = al || 'left'; c.textBaseline = 'middle'; c.fillText(t, x, y); }
  function tag(c, t, x, y, bg, fg) { c.font = '700 8px ' + MONO; var w = c.measureText(t).width + 6; c.fillStyle = bg; c.fillRect(x, y - 6, w, 12); T(c, t, x + 3, y, fg, 'left', 8, 700); }
  function tip(c, w, x, lines, P) {
    c.font = '600 8px ' + MONO; var bw = 0; lines.forEach(function (l) { bw = Math.max(bw, c.measureText(l[0]).width); }); bw += 10;
    var bh = lines.length * 11 + 6, bx = x + 10 + bw > w - 2 ? x - 10 - bw : x + 10;
    c.fillStyle = P.l ? 'rgba(255,255,255,.96)' : 'rgba(9,9,11,.94)'; c.strokeStyle = P.l ? '#cbd5e1' : '#3f3f46'; c.lineWidth = 1;
    c.fillRect(bx, 3, bw, bh); c.strokeRect(bx + .5, 3.5, bw, bh);
    lines.forEach(function (l, i) { T(c, l[0], bx + 5, 3 + 3 + 5.5 + i * 11, l[1], 'left', 8, 600); });
  }
  function hgrid(c, L, R, y0, y1, mn, mx, P, d, n) {
    for (var g = 0; g <= n; g++) { var v = mn + (mx - mn) * g / n, y = Math.round(y1 - (v - mn) / (mx - mn) * (y1 - y0)) + .5;
      c.strokeStyle = P.gr; c.lineWidth = 1; c.beginPath(); c.moveTo(L, y); c.lineTo(R, y); c.stroke(); T(c, v.toFixed(d), R + 3, y, P.mu); }
  }
  function dot(c, x, y, col, now) {
    var p = (now % 1600) / 1600; c.beginPath(); c.arc(x, y, 3 + p * 6, 0, TAU); c.strokeStyle = col; c.globalAlpha = 1 - p; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1;
    c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fillStyle = col; c.fill();
  }
  function sma(a, i, n) { var m = 0; for (var j = i - n + 1; j <= i; j++) m += a[j]; return m / n; }
  function sdv(a, i, n, m) { var v = 0; for (var j = i - n + 1; j <= i; j++) v += (a[j] - m) * (a[j] - m); return Math.sqrt(v / n); }
  function vline(c, x, y0, y1, P) { c.save(); c.setLineDash([3, 3]); c.strokeStyle = P.mu; c.lineWidth = 1; c.beginPath(); c.moveTo(Math.round(x) + .5, y0); c.lineTo(Math.round(x) + .5, y1); c.stroke(); c.restore(); }
  /* ================= 1. STATUS PASAR & DOMINASI ================= */
  var D = { N: 40, DUR: 1900, COL: ['#F7931A', '#627EEA', '#26A17B', '#64748B'], hist: [], cur: null, t0: performance.now() }, sv = [56.4, 16.2, 7.1];
  for (var di = 0; di <= D.N; di++) {
    sv = [clamp(sv[0] + rnd() * .5 + (56.4 - sv[0]) * .08, 54.5, 58.5), clamp(sv[1] + rnd() * .3 + (16.2 - sv[1]) * .08, 15, 17.5), clamp(sv[2] + rnd() * .16 + (7.1 - sv[2]) * .08, 6.3, 8)];
    D.hist.push([sv[0], sv[1], sv[2], 100 - sv[0] - sv[1] - sv[2]]);
  }
  D.cur = D.hist[D.N].slice();
  function status(b) {
    var e = document.getElementById('dom-status'); if (!e) return;
    var tr = D.hist[D.N][0] - D.hist[D.N - 20][0], ar = tr >= 0 ? '▲' : '▼';
    var z = b >= 57.5 ? ['BTC MEMIMPIN', 'bg-amber-500/15 text-amber-300 border-amber-500/30'] : b <= 55.3 ? ['ROTASI ALTCOIN', 'bg-sky-500/15 text-sky-300 border-sky-500/30'] : ['SEIMBANG', 'bg-gray-500/15 text-gray-300 border-gray-500/30'];
    e.textContent = z[0] + ' ' + ar; e.className = 'px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border ' + z[1];
  }
  window.__domPro = { push: function (b, e, s, o) { D.hist.push([b, e, s, o]); D.hist.shift(); D.t0 = performance.now(); status(b); } };
  status(D.hist[D.N][0]);
  host('mini-dom-pro', function (c, w, h, now, s, P) {
    /* MODEL "PRICE HISTORY": area halus BTC.D + bar perubahan (Δ) di bawah + crosshair + label nilai di sumbu kanan */
    var N = D.N, H = D.hist, i, q;
    var L = 0, R = w - 38, T0 = 20, B1 = Math.round(h * .64), V0 = B1 + 6, V1 = h - 14;
    if (R - L < 50) return;
    var ACC = P.l ? '#2f6bb3' : '#7fa6d6', FILL = P.l ? '47,107,179' : '110,150,200', TAGBG = P.l ? '#2f6bb3' : '#3b82d6';
    var ser = []; for (i = 0; i <= N; i++) ser.push(H[i][0]);
    var mn = Math.min.apply(null, ser), mx = Math.max.apply(null, ser), pd = Math.max((mx - mn) * .18, .12); mn -= pd; mx += pd;
    D.ymn = D.ymn == null ? mn : D.ymn + (mn - D.ymn) * .1; D.ymx = D.ymx == null ? mx : D.ymx + (mx - D.ymx) * .1; mn = D.ymn; mx = D.ymx;
    var slot = (R - L) / (N - 1), prog = clamp((now - D.t0) / D.DUR, 0, 1);
    var xAt = function (k) { return R - (N - k) * slot + slot * (1 - prog); };
    var yAt = function (v) { return B1 - (v - mn) / (mx - mn) * (B1 - T0); };
    var vb = ser[N - 1] + (ser[N] - ser[N - 1]) * prog;
    var base = Date.now() - (performance.now() - D.t0), tk = function (k) { return base - (N - k) * 2000; };
    var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
    var hms = function (t) { var d = new Date(t); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()); };
    /* legenda */
    c.beginPath(); c.arc(8, 8, 3, 0, TAU); c.fillStyle = ACC; c.fill(); T(c, 'BTC.D', 15, 8, P.tx, 'left', 8, 700); T(c, '%', 45, 8, P.mu, 'left', 8, 500);
    /* grid + sumbu kanan */
    for (q = 0; q <= 3; q++) { var gv = mn + (mx - mn) * q / 3, gy = Math.round(yAt(gv)) + .5;
      c.strokeStyle = P.gr; c.lineWidth = 1; c.beginPath(); c.moveTo(L, gy); c.lineTo(R, gy); c.stroke(); if (Math.abs(gy - yAt(vb)) > 9) T(c, gv.toFixed(1), R + 5, gy, P.mu, 'left', 8, 500); }
    /* titik seri (ujung kanan diinterpolasi agar bergeser mulus) */
    var pts = []; for (i = 0; i < N; i++) pts.push([xAt(i), yAt(ser[i])]); pts.push([R, yAt(vb)]);
    var curve = function (mv) {
      if (mv) c.moveTo(pts[0][0], pts[0][1]); else c.lineTo(pts[0][0], pts[0][1]);
      for (var j = 1; j < pts.length - 1; j++) { var mxp = (pts[j][0] + pts[j + 1][0]) / 2, myp = (pts[j][1] + pts[j + 1][1]) / 2; c.quadraticCurveTo(pts[j][0], pts[j][1], mxp, myp); }
      c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    };
    c.save(); c.beginPath(); c.rect(L, T0 - 4, R - L + 1, B1 - T0 + 8); c.clip();
    var gd = c.createLinearGradient(0, T0, 0, B1); gd.addColorStop(0, 'rgba(' + FILL + ',.55)'); gd.addColorStop(1, 'rgba(' + FILL + ',.08)');
    c.beginPath(); c.moveTo(pts[0][0], B1); curve(false); c.lineTo(R, B1); c.closePath(); c.fillStyle = gd; c.fill();
    c.beginPath(); curve(true); c.strokeStyle = ACC; c.lineWidth = 1.5; c.stroke();
    /* garis harga terakhir */
    c.setLineDash([2, 3]); c.strokeStyle = TAGBG; c.globalAlpha = .8; c.lineWidth = 1; c.beginPath(); c.moveTo(L, Math.round(yAt(vb)) + .5); c.lineTo(R, Math.round(yAt(vb)) + .5); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    c.restore();
    /* bar perubahan per tick */
    var df = [], am = .04; for (i = 1; i <= N; i++) { df.push(Math.abs(ser[i] - ser[i - 1])); am = Math.max(am, df[i - 1]); }
    c.save(); c.beginPath(); c.rect(L, V0 - 1, R - L + 1, V1 - V0 + 2); c.clip();
    for (i = 1; i <= N; i++) { var bh = Math.max(1, df[i - 1] / am * (V1 - V0)); c.fillStyle = 'rgba(' + FILL + ',' + (P.l ? .6 : .55) + ')'; c.fillRect(xAt(i) - slot * .32, V1 - bh, slot * .64, bh); }
    c.restore();
    c.strokeStyle = P.gr; c.beginPath(); c.moveTo(L, V1 + .5); c.lineTo(R, V1 + .5); c.stroke();
    T(c, 'Δ', R + 5, V0 + 4, P.mu, 'left', 8, 600);
    /* label waktu tiap 20 detik */
    for (i = 1; i <= N; i++) { if (Math.floor(tk(i) / 20000) !== Math.floor(tk(i - 1) / 20000)) { var lx = xAt(i); if (lx > L + 22 && lx < R - 22) T(c, hms(tk(i)), lx, h - 5, P.mu, 'center', 8, 500); } }
    /* label nilai live di sumbu kanan */
    var ty = clamp(yAt(vb), T0 - 2, B1 + 2); tag(c, vb.toFixed(2), R + 2, ty, TAGBG, '#ffffff');
    /* crosshair */
    if (s.mx >= L && s.mx <= R + 2) {
      var k = clamp(Math.round(N - (R + slot * (1 - prog) - s.mx) / slot), 0, N), x = Math.min(xAt(k), R), p = H[k], yv = k >= N ? yAt(vb) : yAt(ser[k]);
      c.strokeStyle = P.l ? 'rgba(15,23,42,.55)' : 'rgba(226,232,240,.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(Math.round(x) + .5, T0 - 4); c.lineTo(Math.round(x) + .5, V1); c.stroke();
      c.beginPath(); c.arc(x, yv, 3.5, 0, TAU); c.fillStyle = P.l ? '#fff' : '#0f172a'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = ACC; c.stroke();
      var rows = [[hms(tk(k)), P.l ? '#e2e8f0' : '#64748b'], ['BTC.D   ' + p[0].toFixed(2) + '%', P.l ? '#fff' : '#0f172a'], ['ETH.D   ' + p[1].toFixed(2) + '%', P.l ? '#cbd5e1' : '#334155'], ['Stable  ' + p[2].toFixed(2) + '%', P.l ? '#cbd5e1' : '#334155'], ['Lainnya ' + p[3].toFixed(2) + '%', P.l ? '#cbd5e1' : '#334155']];
      c.font = '600 8px ' + MONO; var bw = 0; rows.forEach(function (r) { bw = Math.max(bw, c.measureText(r[0]).width); }); bw += 14;
      var bh2 = rows.length * 11 + 8, bx = x + 10 + bw > w - 2 ? x - 10 - bw : x + 10, by = clamp(yv - bh2 / 2, 2, h - bh2 - 14), rd = 4;
      c.beginPath(); c.moveTo(bx + rd, by); c.arcTo(bx + bw, by, bx + bw, by + bh2, rd); c.arcTo(bx + bw, by + bh2, bx, by + bh2, rd); c.arcTo(bx, by + bh2, bx, by, rd); c.arcTo(bx, by, bx + bw, by, rd); c.closePath();
      c.fillStyle = P.l ? 'rgba(15,23,42,.94)' : 'rgba(226,232,240,.96)'; c.fill();
      rows.forEach(function (r, ri) { T(c, r[0], bx + 7, by + 4 + 5.5 + ri * 11, r[1], 'left', 8, ri === 1 ? 700 : 600); });
    }
  });
  /* ================= 2. KAPITALISASI PASAR GLOBAL — candlestick + EMA/SMA + volume ================= */
  var M = { GS: 3, VIS: 26, cs: [], dc: 2.45, mn: 2.4, mx: 2.5, sh: 0 };
  function upd(cd, p, v) { cd.h = Math.max(cd.h, p); cd.l = Math.min(cd.l, p); cd.c = p; cd.vs += v; cd.n++; cd.v = cd.vs / cd.n; return cd; }
  (function () {
    var p = 2.45, v = 85.4, i, j, pp, cd;
    for (i = 0; i < M.VIS; i++) { cd = null;
      for (j = 0; j < M.GS; j++) { pp = p; p = clamp(p + rnd() * .04 + (2.45 - p) * .05, 2.3, 2.6); v = clamp(v + rnd() * 5 + (85.4 - v) * .08, 60, 110);
        cd = cd ? upd(cd, p, v) : { o: pp, h: Math.max(pp, p), l: Math.min(pp, p), c: p, vs: v, n: 1, v: v }; }
      M.cs.push(cd); }
    M.dc = p;
  })();
  window.__mcapPro = { push: function (m, v) {
    var l = M.cs[M.cs.length - 1];
    if (l.n >= M.GS) { M.cs.push({ o: l.c, h: Math.max(l.c, m), l: Math.min(l.c, m), c: m, vs: v, n: 1, v: v }); M.cs.shift(); M.sh = 1; } else upd(l, m, v);
  } };
  host('mini-mcap-pro', function (c, w, h, now, s, P) {
    var cs = M.cs, n = cs.length, L = 6, R = w - 38, T0 = 18, B1 = Math.round(h * .7), V0 = B1 + 8, V1 = h - 6, i;
    var last = cs[n - 1]; M.dc += (last.c - M.dc) * .14; M.sh *= .9;
    var dc = M.dc, lh = Math.max(last.h, dc), ll = Math.min(last.l, dc), mn = Infinity, mx = -Infinity, hi = -Infinity, lo = Infinity, vm = 0;
    for (i = 0; i < n; i++) { var hh = i === n - 1 ? lh : cs[i].h, lw = i === n - 1 ? ll : cs[i].l; mn = Math.min(mn, lw); mx = Math.max(mx, hh); vm = Math.max(vm, cs[i].v); }
    hi = mx; lo = mn; var pd = (mx - mn) * .15 + .004; mn -= pd; mx += pd; M.mn += (mn - M.mn) * .12; M.mx += (mx - M.mx) * .12; mn = M.mn; mx = M.mx;
    var slot = (R - L) / n, xAt = function (k) { return L + (k + .5) * slot + M.sh * slot; }, yAt = function (v) { return B1 - (v - mn) / (mx - mn) * (B1 - T0); };
    var cl = cs.map(function (x, k) { return k === n - 1 ? dc : x.c; }), em = [cl[0]]; for (i = 1; i < n; i++) em.push(em[i - 1] + (cl[i] - em[i - 1]) * 2 / 7);
    T(c, 'EMA6', L, 7, '#F59E0B', 'left', 8, 700); T(c, 'SMA12', L + 30, 7, '#A78BFA', 'left', 8, 700); T(c, 'H ' + hi.toFixed(3) + '  L ' + lo.toFixed(3), R + 36, 7, P.mu, 'right', 8, 600);
    hgrid(c, L, R, T0, B1, mn, mx, P, 3, 3);
    c.save(); c.beginPath(); c.rect(L, 0, R - L, h); c.clip();
    for (i = 0; i < n; i++) { var x = xAt(i), up = cl[i] >= cs[i].o; c.fillStyle = up ? P.up : P.dn; c.globalAlpha = .5; c.fillRect(x - slot * .31, V1 - cs[i].v / vm * (V1 - V0), slot * .62, cs[i].v / vm * (V1 - V0)); c.globalAlpha = 1; }
    c.setLineDash([2, 3]); c.strokeStyle = P.mu; c.lineWidth = 1; [hi, lo].forEach(function (v) { c.beginPath(); c.moveTo(L, Math.round(yAt(v)) + .5); c.lineTo(R, Math.round(yAt(v)) + .5); c.stroke(); }); c.setLineDash([]);
    for (i = 0; i < n; i++) {
      var o = cs[i].o, cc = cl[i], hg = i === n - 1 ? lh : cs[i].h, lg = i === n - 1 ? ll : cs[i].l, xx = xAt(i), col = cc >= o ? P.up : P.dn, y1 = yAt(Math.max(o, cc)), y2 = yAt(Math.min(o, cc));
      c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1; c.beginPath(); c.moveTo(Math.round(xx) + .5, yAt(hg)); c.lineTo(Math.round(xx) + .5, yAt(lg)); c.stroke(); c.fillRect(xx - slot * .31, y1, slot * .62, Math.max(1.5, y2 - y1));
    }
    c.lineWidth = 1.3; c.strokeStyle = '#F59E0B'; c.beginPath(); for (i = 0; i < n; i++) i ? c.lineTo(xAt(i), yAt(em[i])) : c.moveTo(xAt(i), yAt(em[i])); c.stroke();
    c.strokeStyle = '#A78BFA'; c.beginPath(); for (i = 11; i < n; i++) i > 11 ? c.lineTo(xAt(i), yAt(sma(cl, i, 12))) : c.moveTo(xAt(i), yAt(sma(cl, i, 12))); c.stroke();
    c.restore();
    var ly = yAt(dc), lc = dc >= last.o ? P.up : P.dn; c.save(); c.setLineDash([3, 3]); c.strokeStyle = lc; c.beginPath(); c.moveTo(xAt(n - 1), Math.round(ly) + .5); c.lineTo(R, Math.round(ly) + .5); c.stroke(); c.restore();
    dot(c, xAt(n - 1), ly, lc, now); tag(c, dc.toFixed(3), R + 2, ly, lc, '#111');
    T(c, 'VOL', L, V0 + 3, P.mu, 'left', 8, 700);
    if (s.mx >= L && s.mx <= R) {
      var k = clamp(Math.floor((s.mx - L - M.sh * slot) / slot), 0, n - 1), q = cs[k], cq = cl[k], hq = k === n - 1 ? lh : q.h, lq = k === n - 1 ? ll : q.l, xk = xAt(k);
      vline(c, xk, T0, V1, P); if (s.my >= T0 && s.my <= B1) { c.save(); c.setLineDash([3, 3]); c.strokeStyle = P.mu; c.beginPath(); c.moveTo(L, Math.round(s.my) + .5); c.lineTo(R, Math.round(s.my) + .5); c.stroke(); c.restore(); tag(c, (mn + (B1 - s.my) / (B1 - T0) * (mx - mn)).toFixed(3), R + 2, s.my, P.l ? '#334155' : '#e2e8f0', P.l ? '#fff' : '#111'); }
      tip(c, w, xk, [['O ' + q.o.toFixed(3) + '  H ' + hq.toFixed(3), P.tx], ['L ' + lq.toFixed(3) + '  C ' + cq.toFixed(3), P.tx], [((cq / q.o - 1) * 100 >= 0 ? '▲ ' : '▼ ') + Math.abs((cq / q.o - 1) * 100).toFixed(2) + '%  Vol $' + q.v.toFixed(1) + 'B', cq >= q.o ? P.up : P.dn]], P);
    }
  });
  /* ================= 3. DERIVATIVES (OPEN INT.) — OI + funding rate + long/short ratio ================= */
  var O = { N: 48, DUR: 1900, h: [], t0: performance.now() };
  (function () {
    var o = 34.2, f = .012, l = 1.24;
    for (var i = 0; i <= O.N; i++) { o = clamp(o + rnd() * .5 + (34.2 - o) * .05, 32.3, 36.3); f = clamp(f + rnd() * .006 + (.012 - f) * .1, -.02, .04); l = clamp(l + rnd() * .06 + (1.24 - l) * .08, .9, 1.6); O.h.push([o, f, l]); }
  })();
  window.__oiPro = { push: function (o, f, l) { O.h.push([o, f, l]); O.h.shift(); O.t0 = performance.now(); } };
  host('mini-oi-pro', function (c, w, h, now, s, P) {
    var N = O.N, H = O.h, i, L = 6, R = w - 34, A0 = 16, A1 = Math.round(h * .55), B0 = A1 + 9, B1 = B0 + Math.round(h * .14), C0 = B1 + 8, C1 = h - 6;
    var oi = H.map(function (p) { return p[0]; }), fd = H.map(function (p) { return p[1]; }), ls = H.map(function (p) { return p[2]; });
    var mn = Math.min.apply(null, oi), mx = Math.max.apply(null, oi), pd = Math.max((mx - mn) * .2, .1), pk = 0; mn -= pd; mx += pd;
    for (i = 1; i <= N; i++) if (oi[i] > oi[pk]) pk = i;
    var slot = (R - L) / (N - 1), prog = clamp((now - O.t0) / O.DUR, 0, 1);
    var xAt = function (k) { return R - (N - k) * slot + slot * (1 - prog); }, yA = function (v) { return A1 - (v - mn) / (mx - mn) * (A1 - A0); };
    T(c, 'OI $B', L, 7, P.cy, 'left', 8, 700); T(c, 'SMA8', L + 40, 7, P.mu, 'left', 8, 600); T(c, 'PEAK ' + oi[pk].toFixed(1), R + 34, 7, P.mu, 'right', 8, 600);
    hgrid(c, L, R, A0, A1, mn, mx, P, 1, 2);
    c.save(); c.beginPath(); c.rect(L, A0 - 2, R - L + 1, A1 - A0 + 4); c.clip();
    var gd = c.createLinearGradient(0, A0, 0, A1); gd.addColorStop(0, P.l ? 'rgba(8,145,178,.30)' : 'rgba(34,211,238,.30)'); gd.addColorStop(1, 'rgba(34,211,238,0)');
    c.beginPath(); for (i = 0; i <= N; i++) i ? c.lineTo(xAt(i), yA(oi[i])) : c.moveTo(xAt(i), yA(oi[i])); c.lineTo(xAt(N), A1); c.lineTo(xAt(0), A1); c.closePath(); c.fillStyle = gd; c.fill();
    c.lineWidth = 1.8; c.lineCap = 'round'; for (i = 1; i <= N; i++) { c.strokeStyle = oi[i] >= oi[i - 1] ? P.cy : P.dn; c.beginPath(); c.moveTo(xAt(i - 1), yA(oi[i - 1])); c.lineTo(xAt(i), yA(oi[i])); c.stroke(); }
    c.setLineDash([3, 3]); c.strokeStyle = P.mu; c.lineWidth = 1; c.beginPath(); for (i = 7; i <= N; i++) i > 7 ? c.lineTo(xAt(i), yA(sma(oi, i, 8))) : c.moveTo(xAt(i), yA(sma(oi, i, 8))); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.arc(xAt(pk), yA(oi[pk]), 3, 0, TAU); c.strokeStyle = '#F59E0B'; c.lineWidth = 1.2; c.stroke(); c.restore();
    var vb = oi[N - 1] + (oi[N] - oi[N - 1]) * prog, dy = yA(vb), lc = oi[N] >= oi[N - 1] ? P.cy : P.dn; dot(c, R, dy, lc, now); tag(c, vb.toFixed(2), R + 2, dy, lc, '#111');
    /* funding rate */
    var fm = .01; for (i = 0; i <= N; i++) fm = Math.max(fm, Math.abs(fd[i])); fm *= 1.1; var zy = (B0 + B1) / 2, hh = (B1 - B0) / 2;
    T(c, 'FUND', L, B0 + 3, P.mu, 'left', 8, 700);
    c.save(); c.beginPath(); c.rect(L, B0 - 1, R - L + 1, B1 - B0 + 2); c.clip();
    for (i = 0; i <= N; i++) { var bh = fd[i] / fm * hh; c.fillStyle = fd[i] >= 0 ? P.up : P.dn; c.globalAlpha = .8; c.fillRect(xAt(i) - slot * .35, bh >= 0 ? zy - bh : zy, slot * .7, Math.max(1, Math.abs(bh))); }
    c.globalAlpha = 1; c.strokeStyle = P.gr; c.beginPath(); c.moveTo(L, Math.round(zy) + .5); c.lineTo(R, Math.round(zy) + .5); c.stroke(); c.restore();
    T(c, (fd[N] >= 0 ? '+' : '') + fd[N].toFixed(3), R + 3, zy, fd[N] >= 0 ? P.up : P.dn, 'left', 8, 700);
    /* long/short ratio */
    var lmn = Math.min(.98, Math.min.apply(null, ls)) - .03, lmx = Math.max(1.02, Math.max.apply(null, ls)) + .03, yC = function (v) { return C1 - (v - lmn) / (lmx - lmn) * (C1 - C0); }, base = yC(1);
    function poly() { c.beginPath(); for (var j = 0; j <= N; j++) j ? c.lineTo(xAt(j), yC(ls[j])) : c.moveTo(xAt(j), yC(ls[j])); c.lineTo(xAt(N), base); c.lineTo(xAt(0), base); c.closePath(); }
    c.save(); c.beginPath(); c.rect(L, C0, R - L + 1, base - C0); c.clip(); poly(); c.fillStyle = 'rgba(52,211,153,.28)'; c.fill(); c.restore();
    c.save(); c.beginPath(); c.rect(L, base, R - L + 1, C1 - base); c.clip(); poly(); c.fillStyle = 'rgba(251,113,133,.28)'; c.fill(); c.restore();
    c.save(); c.beginPath(); c.rect(L, C0 - 1, R - L + 1, C1 - C0 + 2); c.clip();
    c.setLineDash([2, 3]); c.strokeStyle = P.mu; c.lineWidth = 1; c.beginPath(); c.moveTo(L, Math.round(base) + .5); c.lineTo(R, Math.round(base) + .5); c.stroke(); c.setLineDash([]);
    c.beginPath(); for (i = 0; i <= N; i++) i ? c.lineTo(xAt(i), yC(ls[i])) : c.moveTo(xAt(i), yC(ls[i])); c.strokeStyle = '#A78BFA'; c.lineWidth = 1.4; c.stroke(); c.restore();
    T(c, 'L/S', L, C0 + 3, P.mu, 'left', 8, 700); T(c, ls[N].toFixed(2), R + 3, yC(ls[N]), '#A78BFA', 'left', 8, 700);
    if (s.mx >= L && s.mx <= R) {
      var k = clamp(Math.round(N - (R + slot * (1 - prog) - s.mx) / slot), 0, N), x = xAt(k), p = H[k];
      vline(c, x, A0, C1, P); c.beginPath(); c.arc(x, yA(p[0]), 3, 0, TAU); c.fillStyle = P.cy; c.fill(); c.beginPath(); c.arc(x, yC(p[2]), 2.5, 0, TAU); c.fillStyle = '#A78BFA'; c.fill();
      tip(c, w, x, [['OI $' + p[0].toFixed(2) + ' B', P.cy], ['Funding ' + (p[1] >= 0 ? '+' : '') + p[1].toFixed(3) + '%', p[1] >= 0 ? P.up : P.dn], ['L/S ' + p[2].toFixed(2) + (p[2] >= 1 ? ' (long)' : ' (short)'), '#A78BFA']], P);
    }
  });
})();
