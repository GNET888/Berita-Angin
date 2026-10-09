/* ============================================================
   GLOBAL MARKET KPI PRO — Kapitalisasi Pasar Global • DXY • Emas (XAU) • Minyak WTI
   Grafik canvas profesional multi-panel: candlestick/area + indikator (EMA, SMA, Bollinger, Donchian)
   + panel bawah (Volume, RSI, MACD, Stochastic), crosshair, tag harga & waktu, scroll berbasis waktu.
   Data diumpankan modul LIVE Global Market lewat window.__gmKpiPro.push dari snapshot pasar halaman.
   ============================================================ */
(function () {
  'use strict';
  if (window.__gmKpiPro) return;
  var TAU = 6.2832, MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace', TICK = 2000, GS = 3, CGS = TICK * GS, NC = 80, NT = 160;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var isN = function (v) { return v === v && isFinite(v); };
  var nf = function (n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var hms = function (t) { var d = new Date(t); return p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()); };
  function pal() {
    var l = document.documentElement.classList.contains('light');
    return { l: l, tx: l ? '#0f172a' : '#e5e7eb', mu: l ? '#64748b' : '#8b95a7', gr: l ? 'rgba(15,23,42,.08)' : 'rgba(255,255,255,.06)',
      up: l ? '#059669' : '#26d99a', dn: l ? '#e11d48' : '#f4607a', amb: l ? '#d97706' : '#fbbf24', cyn: l ? '#0891b2' : '#22d3ee',
      vio: l ? '#7c3aed' : '#a78bfa', sky: l ? '#0284c7' : '#38bdf8', gld: l ? '#d97706' : '#f5b301', tg: l ? '#ffffff' : '#0b0b0d', hv: l ? '#334155' : '#475569' };
  }
  /* ---------- indikator ---------- */
  function sma(a, n) { var r = [], s = 0, i; for (i = 0; i < a.length; i++) { s += a[i]; if (i >= n) s -= a[i - n]; r.push(i >= n - 1 ? s / n : NaN); } return r; }
  function emaRaw(a, n) { var k = 2 / (n + 1), e = a[0], r = [a[0]], i; for (i = 1; i < a.length; i++) { e = a[i] * k + e * (1 - k); r.push(e); } return r; }
  function ema(a, n) { var r = emaRaw(a, n), i; for (i = 0; i < n - 1 && i < r.length; i++) r[i] = NaN; return r; }
  function stdv(a, m, n) { var r = [], i, j, v; for (i = 0; i < a.length; i++) { if (i < n - 1) { r.push(NaN); continue; } v = 0; for (j = i - n + 1; j <= i; j++) v += (a[j] - m[i]) * (a[j] - m[i]); r.push(Math.sqrt(v / n)); } return r; }
  function rsi(a, n) {
    var r = [NaN], g = 0, l = 0, i, d;
    for (i = 1; i < a.length; i++) {
      d = a[i] - a[i - 1];
      if (i <= n) { g += Math.max(d, 0); l += Math.max(-d, 0); if (i === n) { g /= n; l /= n; r.push(l === 0 ? 100 : 100 - 100 / (1 + g / l)); } else r.push(NaN); }
      else { g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; r.push(l === 0 ? 100 : 100 - 100 / (1 + g / l)); }
    }
    return r;
  }
  function stoch(cs, n, m) {
    var k = [], d = [], i, j, hh, ll, s;
    for (i = 0; i < cs.length; i++) { if (i < n - 1) { k.push(NaN); continue; } hh = -1e18; ll = 1e18; for (j = i - n + 1; j <= i; j++) { hh = Math.max(hh, cs[j].h); ll = Math.min(ll, cs[j].l); } k.push(hh === ll ? 50 : (cs[i].c - ll) / (hh - ll) * 100); }
    for (i = 0; i < k.length; i++) { if (i < n - 1 + m - 1) { d.push(NaN); continue; } s = 0; for (j = i - m + 1; j <= i; j++) s += k[j]; d.push(s / m); }
    return [k, d];
  }
  function donch(cs, n) {
    var u = [], l = [], i, j, h, lo;
    for (i = 0; i < cs.length; i++) { if (i < n - 1) { u.push(NaN); l.push(NaN); continue; } h = -1e18; lo = 1e18; for (j = i - n + 1; j <= i; j++) { h = Math.max(h, cs[j].h); lo = Math.min(lo, cs[j].l); } u.push(h); l.push(lo); }
    return [u, l];
  }
  /* ---------- data ---------- */
  var CFG = {
    mc:  { id: 'mc',  k: 'candle', t: 'Mcap Global',  desc: 'Candlestick • EMA 9 • SMA 20 • Volume',          d: 2, sig: .0006, vb: 100 },
    dxy: { id: 'dxy', k: 'line',   t: 'DXY',          desc: 'Garis • Bollinger (20,2) • RSI 14',               d: 2, sig: .0006, vb: 60 },
    xau: { id: 'xau', k: 'area',   t: 'XAU/USD',      desc: 'Area • EMA 12/26 • MACD (12,26,9)',               d: 2, sig: .0016, vb: 80 },
    wti: { id: 'wti', k: 'candle', t: 'WTI Crude',    desc: 'Candlestick • Donchian 20 • Stochastic (14,3)',  d: 2, sig: .0016, vb: 90 }
  }, S = {};
  function volGen(cf, d, x) { return cf.vb * (.55 + Math.random() * .9 + Math.min(1.6, Math.abs(d) / (cf.sig * x) * .5)); }
  function walk(n, v, p, sig) {
    var m = (v + p) / 2, x = m, a = [], i, e; for (i = 0; i < n; i++) { x += (m - x) * .015 + (Math.random() - .5) * 2 * sig * x; a.push(x); }
    e = v - a[n - 1]; for (i = 0; i < n; i++) a[i] += e * (i / (n - 1)); return a;
  }
  function init(key, v, p) {
    var cf = CFG[key], now = performance.now(), total = NC * GS, a = walk(total, v, p, cf.sig), i, j, o, hi, lo, sv, x;
    var s = { key: key, cf: cf, tk: [], tt: [], cs: [], cn: GS, prev: p, dv: v, dc: v, ymn: null, ymx: null };
    for (i = 0; i < NT; i++) { s.tk.push(a[total - NT + i]); s.tt.push(now - (NT - 1 - i) * TICK); }
    for (i = 0; i < NC; i++) {
      o = i ? a[i * GS - 1] : a[0]; hi = o; lo = o; sv = 0;
      for (j = 0; j < GS; j++) { x = a[i * GS + j]; hi = Math.max(hi, x); lo = Math.min(lo, x); sv += volGen(cf, x - (j ? a[i * GS + j - 1] : o), x); }
      s.cs.push({ o: o, h: hi, l: lo, c: a[i * GS + GS - 1], v: sv, t: now - (total - 1 - i * GS) * TICK });
    }
    return s;
  }
  window.__gmKpiPro = { push: function (key, v, p) {
    var cf = CFG[key]; if (!cf || !isN(v)) return;
    var s = S[key]; if (!s) { S[key] = init(key, v, p); return; }
    var now = performance.now(), gap = now - s.tt[s.tt.length - 1], i, cd, vv, d;
    if (gap > TICK * 2.5) { var sh = gap - TICK; for (i = 0; i < s.tt.length; i++) s.tt[i] += sh; for (i = 0; i < s.cs.length; i++) s.cs[i].t += sh; }
    d = v - s.tk[s.tk.length - 1]; vv = volGen(cf, d, v);
    s.tk.push(v); s.tt.push(now); s.tk.shift(); s.tt.shift();
    cd = s.cs[s.cs.length - 1];
    if (s.cn >= GS) { s.cs.push({ o: cd.c, h: Math.max(cd.c, v), l: Math.min(cd.c, v), c: v, v: vv, t: now }); s.cs.shift(); s.cn = 1; }
    else { cd.h = Math.max(cd.h, v); cd.l = Math.min(cd.l, v); cd.c = v; cd.v += vv; s.cn++; }
    s.prev = p;
  } };
  /* ---------- util gambar ---------- */
  function T(c, t, x, y, col, al, sz, wt) { c.font = (wt || 500) + ' ' + (sz || 8) + 'px ' + MONO; c.fillStyle = col; c.textAlign = al || 'left'; c.textBaseline = 'middle'; c.fillText(t, x, y); }
  function tag(c, t, x, y, bg, fg) { c.font = '700 8px ' + MONO; var w = c.measureText(t).width + 8; c.fillStyle = bg; c.fillRect(x, y - 7, w, 14); T(c, t, x + 4, y, fg, 'left', 8, 700); return w; }
  function leg(c, items, x, y, xmax) { var i, w; for (i = 0; i < items.length; i++) { c.font = '600 8px ' + MONO; w = c.measureText(items[i][0]).width; if (x + w > xmax) break; T(c, items[i][0], x, y, items[i][1], 'left', 8, 600); x += w + 9; } }
  function pathArr(c, a, X, Y, i0, xr) { var st = false, i, lx = -1; c.beginPath(); for (i = i0; i < a.length; i++) { if (!isN(a[i])) continue; if (st) c.lineTo(X(i), Y(a[i])); else { c.moveTo(X(i), Y(a[i])); st = true; } lx = i; } if (xr != null && lx >= 0) c.lineTo(xr, Y(a[lx])); }
  function band(c, a, b, X, Y, i0, col) { var i, s = false; c.beginPath(); for (i = i0; i < a.length; i++) if (isN(a[i])) { if (s) c.lineTo(X(i), Y(a[i])); else { c.moveTo(X(i), Y(a[i])); s = true; } } for (i = a.length - 1; i >= i0; i--) if (isN(b[i])) c.lineTo(X(i), Y(b[i])); c.closePath(); c.fillStyle = col; c.fill(); }
  function stroke(c, a, X, Y, i0, col, lw, dash, xr) { pathArr(c, a, X, Y, i0, xr); c.strokeStyle = col; c.lineWidth = lw; if (dash) c.setLineDash(dash); c.stroke(); c.setLineDash([]); }
  /* ---------- gambar utama ---------- */
  function draw(s, c, w, h, now, st, P) {
    var cf = s.cf, id = cf.id, isC = cf.k === 'candle', i, j, v, g;
    var L = 6, R = w - 50, T0 = 32, B1 = Math.round(h * .6), S0 = B1 + 20, S1 = h - 18;
    if (R - L < 90) return;
    var n, C = null, cl, slot, ppm, xNow, X, tms, VISN;
    s.dv += (s.tk[s.tk.length - 1] - s.dv) * .2;
    if (isC) {
      C = s.cs.map(function (d) { return { o: d.o, h: d.h, l: d.l, c: d.c, v: d.v, t: d.t }; }); n = C.length;
      var lc = C[n - 1]; s.dc += (lc.c - s.dc) * .2; lc.c = s.dc; lc.h = Math.max(lc.h, s.dc); lc.l = Math.min(lc.l, s.dc);
      cl = C.map(function (d) { return d.c; }); VISN = w < 420 ? 30 : 44; slot = (R - L) / VISN; ppm = slot / CGS; xNow = R - slot * .85;
      X = function (k) { return xNow - (now - C[k].t - CGS / 2) * ppm; }; tms = function (k) { return C[k].t; };
    } else {
      n = s.tk.length; cl = s.tk.slice(); cl[n - 1] = s.dv; VISN = w < 420 ? 70 : 100; slot = (R - L) / VISN; ppm = slot / TICK; xNow = R - 3;
      X = function (k) { return xNow - (now - s.tt[k]) * ppm; }; tms = function (k) { return s.tt[k]; };
    }
    var off = isC ? CGS / 2 : 0, wallNow = Date.now();
    var i0 = 0; while (i0 < n && X(i0) < L - slot) i0++; i0 = Math.max(0, i0 - 1);
    /* indikator */
    var o1 = null, o2 = null, o3 = null, o4 = null, sub = {};
    if (id === 'mc') { o1 = ema(cl, 9); o2 = sma(cl, 20); }
    else if (id === 'dxy') { o2 = sma(cl, 20); var sd = stdv(cl, o2, 20); o3 = o2.map(function (m, k) { return m + 2 * sd[k]; }); o4 = o2.map(function (m, k) { return m - 2 * sd[k]; }); sub.rsi = rsi(cl, 14); }
    else if (id === 'xau') { o1 = ema(cl, 12); o2 = ema(cl, 26); var e12 = emaRaw(cl, 12), e26 = emaRaw(cl, 26); sub.macd = e12.map(function (a, k) { return a - e26[k]; }); sub.sig = emaRaw(sub.macd, 9); sub.hist = sub.macd.map(function (a, k) { return a - sub.sig[k]; }); }
    else { var dn = donch(C, 20); o3 = dn[0]; o4 = dn[1]; o2 = o3.map(function (a, k) { return (a + o4[k]) / 2; }); var sk = stoch(C, 14, 3); sub.k = sk[0]; sub.d = sk[1]; }
    /* skala Y */
    var mn = 1e18, mx = -1e18, ext = function (q) { if (isN(q)) { if (q < mn) mn = q; if (q > mx) mx = q; } };
    for (i = i0; i < n; i++) { if (isC) { ext(C[i].h); ext(C[i].l); } else ext(cl[i]); if (o1) ext(o1[i]); if (o2) ext(o2[i]); if (o3) ext(o3[i]); if (o4) ext(o4[i]); }
    var pd = (mx - mn) * .1 || mx * .0005; mn -= pd; mx += pd;
    s.ymn = s.ymn == null ? mn : s.ymn + (mn - s.ymn) * .12; s.ymx = s.ymx == null ? mx : s.ymx + (mx - s.ymx) * .12; mn = s.ymn; mx = s.ymx;
    var Y = function (q) { return B1 - (q - mn) / (mx - mn) * (B1 - T0); }, Yi = function (y) { return mn + (B1 - y) / (B1 - T0) * (mx - mn); };
    /* hover */
    var hk = -1;
    if (st.mx >= L && st.mx <= R + 2) { var bd = 1e9; for (i = i0; i < n; i++) { var dd = Math.abs(X(i) - st.mx); if (dd < bd) { bd = dd; hk = i; } } }
    var idx = hk >= 0 ? hk : n - 1;
    /* grid horizontal + sumbu kanan */
    c.lineWidth = 1;
    for (g = 0; g <= 4; g++) { v = mn + (mx - mn) * g / 4; var gy = Math.round(Y(v)) + .5; c.strokeStyle = P.gr; c.beginPath(); c.moveTo(L, gy); c.lineTo(R, gy); c.stroke(); if (Math.abs(gy - Y(cl[n - 1])) > 9) T(c, nf(v, cf.d), R + 5, gy, P.mu, 'left', 8, 500); }
    /* grid vertikal + label waktu */
    var step = w < 420 ? 60000 : 30000, wl = wallNow - (xNow - L) / ppm - off, wr = wallNow - (xNow - R) / ppm - off;
    for (var m = Math.ceil(wl / step) * step; m <= wr; m += step) {
      var gx = Math.round(xNow - (wallNow - off - m) * ppm) + .5;
      c.strokeStyle = P.gr; c.beginPath(); c.moveTo(gx, T0 - 3); c.lineTo(gx, S1); c.stroke();
      if (gx > L + 20 && gx < R - 20 && Math.abs(gx - (hk >= 0 ? clamp(X(hk), L, R) : -999)) > 34) T(c, hms(m), gx, h - 8, P.mu, 'center', 8, 500);
    }
    /* ---- panel utama ---- */
    var lastC = isC ? (C[n - 1].c >= C[n - 1].o ? P.up : P.dn) : (id === 'xau' ? P.gld : P.sky);
    c.save(); c.beginPath(); c.rect(L, T0 - 3, R - L + 1, B1 - T0 + 6); c.clip();
    if (id === 'dxy') { band(c, o3, o4, X, Y, i0, P.l ? 'rgba(2,132,199,.10)' : 'rgba(56,189,248,.10)'); stroke(c, o3, X, Y, i0, P.sky, .8, null, R); stroke(c, o4, X, Y, i0, P.sky, .8, null, R); }
    if (id === 'wti') { band(c, o3, o4, X, Y, i0, P.l ? 'rgba(124,58,237,.08)' : 'rgba(167,139,250,.08)'); stroke(c, o3, X, Y, i0, P.vio, 1, null); stroke(c, o4, X, Y, i0, P.vio, 1, null); }
    if (isC) {
      var bw = Math.max(2, slot * .62);
      for (i = i0; i < n; i++) {
        var cd = C[i], x = X(i), col = cd.c >= cd.o ? P.up : P.dn, yo = Y(cd.o), yc = Y(cd.c);
        c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1; c.beginPath(); c.moveTo(x, Y(cd.h)); c.lineTo(x, Y(cd.l)); c.stroke();
        c.fillRect(x - bw / 2, Math.min(yo, yc), bw, Math.max(1, Math.abs(yo - yc)));
      }
    } else {
      var gr = c.createLinearGradient(0, T0, 0, B1), fc = id === 'xau' ? (P.l ? '217,119,6' : '245,179,1') : (P.l ? '2,132,199' : '56,189,248');
      gr.addColorStop(0, 'rgba(' + fc + ',' + (id === 'xau' ? .34 : .16) + ')'); gr.addColorStop(1, 'rgba(' + fc + ',.01)');
      pathArr(c, cl, X, Y, i0, R); c.lineTo(R, B1); c.lineTo(X(i0), B1); c.closePath(); c.fillStyle = gr; c.fill();
    }
    if (id === 'mc') { stroke(c, o1, X, Y, i0, P.amb, 1.2); stroke(c, o2, X, Y, i0, P.cyn, 1.2); }
    if (id === 'dxy') stroke(c, o2, X, Y, i0, P.mu, 1, [3, 3], R);
    if (id === 'wti') stroke(c, o2, X, Y, i0, P.mu, 1, [3, 3]);
    if (!isC) stroke(c, cl, X, Y, i0, lastC, 1.7, null, R);
    if (id === 'xau') {
      stroke(c, o1, X, Y, i0, P.sky, 1.1, null, R); stroke(c, o2, X, Y, i0, P.vio, 1.1, null, R);
      for (j = Math.max(i0, 1); j < n; j++) {
        if (!(isN(o1[j]) && isN(o1[j - 1]) && isN(o2[j]) && isN(o2[j - 1]))) continue;
        var d0 = o1[j - 1] - o2[j - 1], d1 = o1[j] - o2[j], mxp = X(j), myp = Y(cl[j]);
        if (d0 <= 0 && d1 > 0) { c.fillStyle = P.up; c.beginPath(); c.moveTo(mxp, myp + 7); c.lineTo(mxp - 4, myp + 14); c.lineTo(mxp + 4, myp + 14); c.closePath(); c.fill(); }
        else if (d0 >= 0 && d1 < 0) { c.fillStyle = P.dn; c.beginPath(); c.moveTo(mxp, myp - 7); c.lineTo(mxp - 4, myp - 14); c.lineTo(mxp + 4, myp - 14); c.closePath(); c.fill(); }
      }
    }
    var lp = cl[n - 1], ly = Math.round(Y(lp)) + .5;
    c.setLineDash([2, 3]); c.strokeStyle = lastC; c.globalAlpha = .85; c.beginPath(); c.moveTo(L, ly); c.lineTo(R, ly); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    c.restore();
    tag(c, nf(lp, cf.d), R + 2, clamp(Y(lp), T0, B1), lastC, P.tg);
    /* ---- panel bawah ---- */
    c.strokeStyle = P.gr; c.strokeRect(L + .5, S0 + .5, R - L - 1, S1 - S0 - 1);
    c.save(); c.beginPath(); c.rect(L, S0, R - L + 1, S1 - S0 + 1); c.clip();
    var subInv = null, subFmt = null, subItems = [], bw2 = Math.max(2, slot * .62), Ys, vals;
    if (id === 'mc') {
      var vv = C.map(function (d) { return d.v; }), vm = 1, vs = sma(vv, 20); for (i = i0; i < n; i++) vm = Math.max(vm, vv[i]); vm *= 1.1;
      Ys = function (q) { return S1 - q / vm * (S1 - S0 - 3); };
      for (i = i0; i < n; i++) { c.fillStyle = C[i].c >= C[i].o ? P.up : P.dn; c.globalAlpha = .7; c.fillRect(X(i) - bw2 / 2, Ys(vv[i]), bw2, S1 - Ys(vv[i])); } c.globalAlpha = 1;
      stroke(c, vs, X, Ys, i0, P.amb, 1.1);
      subInv = function (y) { return (S1 - y) / (S1 - S0 - 3) * vm; }; subFmt = function (q) { return nf(q, 0); };
      subItems = [['Volume ' + nf(vv[idx], 0), P.tx], ['MA20 ' + (isN(vs[idx]) ? nf(vs[idx], 0) : '--'), P.amb]];
    } else if (id === 'dxy' || id === 'wti') {
      var lo_ = id === 'dxy' ? 30 : 20, hi_ = id === 'dxy' ? 70 : 80, A = id === 'dxy' ? sub.rsi : sub.k, B = id === 'wti' ? sub.d : null;
      Ys = function (q) { return S1 - q / 100 * (S1 - S0); };
      c.fillStyle = P.l ? 'rgba(124,58,237,.07)' : 'rgba(167,139,250,.09)'; c.fillRect(L, Ys(hi_), R - L, Ys(lo_) - Ys(hi_));
      c.setLineDash([3, 3]); c.strokeStyle = P.gr; [lo_, 50, hi_].forEach(function (q) { var yy = Math.round(Ys(q)) + .5; c.beginPath(); c.moveTo(L, yy); c.lineTo(R, yy); c.stroke(); }); c.setLineDash([]);
      stroke(c, A, X, Ys, i0, id === 'dxy' ? P.vio : P.sky, 1.4); if (B) stroke(c, B, X, Ys, i0, P.amb, 1.2);
      subInv = function (y) { return (S1 - y) / (S1 - S0) * 100; }; subFmt = function (q) { return nf(q, 1); };
      subItems = id === 'dxy' ? [['RSI(14) ' + (isN(A[idx]) ? nf(A[idx], 1) : '--'), P.vio], [(isN(A[idx]) ? (A[idx] >= 70 ? 'Jenuh beli' : A[idx] <= 30 ? 'Jenuh jual' : 'Netral') : ''), P.mu]]
        : [['%K ' + (isN(A[idx]) ? nf(A[idx], 1) : '--'), P.sky], ['%D ' + (isN(B[idx]) ? nf(B[idx], 1) : '--'), P.amb], [(isN(A[idx]) ? (A[idx] >= 80 ? 'Jenuh beli' : A[idx] <= 20 ? 'Jenuh jual' : 'Netral') : ''), P.mu]];
      var lastA = A[n - 1]; if (isN(lastA)) { c.restore(); c.save(); tag(c, nf(lastA, 1), R + 2, clamp(Ys(lastA), S0 + 6, S1 - 6), id === 'dxy' ? P.vio : P.sky, P.tg); }
    } else {
      var mm = 1e-9; for (i = i0; i < n; i++) { mm = Math.max(mm, Math.abs(sub.macd[i]), Math.abs(sub.sig[i]), Math.abs(sub.hist[i])); } mm *= 1.15;
      var zero = (S0 + S1) / 2, half = (S1 - S0) / 2 - 2; Ys = function (q) { return zero - q / mm * half; };
      c.strokeStyle = P.gr; c.beginPath(); c.moveTo(L, Math.round(zero) + .5); c.lineTo(R, Math.round(zero) + .5); c.stroke();
      for (i = i0; i < n; i++) { var hv = sub.hist[i]; c.fillStyle = hv >= 0 ? P.up : P.dn; c.globalAlpha = .75; c.fillRect(X(i) - bw2 / 2, Math.min(zero, Ys(hv)), bw2, Math.max(1, Math.abs(Ys(hv) - zero))); } c.globalAlpha = 1;
      stroke(c, sub.macd, X, Ys, i0, P.sky, 1.2, null, R); stroke(c, sub.sig, X, Ys, i0, P.amb, 1.2, null, R);
      subInv = function (y) { return (zero - y) / half * mm; }; subFmt = function (q) { return q.toFixed(2); };
      subItems = [['MACD ' + sub.macd[idx].toFixed(2), P.sky], ['Sinyal ' + sub.sig[idx].toFixed(2), P.amb], ['Hist ' + sub.hist[idx].toFixed(2), sub.hist[idx] >= 0 ? P.up : P.dn]];
    }
    c.restore();
    if (id === 'dxy' || id === 'wti') { T(c, String(id === 'dxy' ? 70 : 80), R + 5, Math.round(Ys(id === 'dxy' ? 70 : 80)), P.mu, 'left', 8, 500); T(c, String(id === 'dxy' ? 30 : 20), R + 5, Math.round(Ys(id === 'dxy' ? 30 : 20)), P.mu, 'left', 8, 500); }
    leg(c, subItems, L + 2, S0 - 9, R);
    /* ---- header ---- */
    var wt = (function () { c.font = '700 10px ' + MONO; return c.measureText(cf.t).width; })();
    T(c, cf.t, L + 2, 9, P.tx, 'left', 10, 700); T(c, cf.desc, L + 2 + wt + 10, 9, P.mu, 'left', 8, 500);
    var items = [], chgv, cc;
    if (isC) { cc = C[idx]; chgv = (cc.c / cc.o - 1) * 100; items = [['O ' + nf(cc.o, cf.d), P.tx], ['H ' + nf(cc.h, cf.d), P.tx], ['L ' + nf(cc.l, cf.d), P.tx], ['C ' + nf(cc.c, cf.d), P.tx]]; }
    else { chgv = (cl[idx] / s.prev - 1) * 100; items = [['Harga ' + nf(cl[idx], cf.d), P.tx]]; }
    items.push([(chgv >= 0 ? '+' : '−') + Math.abs(chgv).toFixed(2) + '%', chgv >= 0 ? P.up : P.dn]);
    var fv = function (a) { return isN(a[idx]) ? nf(a[idx], cf.d) : '--'; };
    if (id === 'mc') items.push(['EMA9 ' + fv(o1), P.amb], ['SMA20 ' + fv(o2), P.cyn]);
    if (id === 'dxy') items.push(['SMA20 ' + fv(o2), P.mu], ['BB↑ ' + fv(o3), P.sky], ['BB↓ ' + fv(o4), P.sky]);
    if (id === 'xau') items.push(['EMA12 ' + fv(o1), P.sky], ['EMA26 ' + fv(o2), P.vio]);
    if (id === 'wti') items.push(['DC↑ ' + fv(o3), P.vio], ['DC↓ ' + fv(o4), P.vio]);
    leg(c, items, L + 2, 22, R + 46);
    T(c, isC ? 'Candle 6 dtk' : 'Tick 2 dtk', R + 46, 9, P.mu, 'right', 8, 500);
    /* ---- crosshair ---- */
    if (hk >= 0) {
      var cx = clamp(X(hk), L, R);
      c.save(); c.setLineDash([3, 3]); c.strokeStyle = P.l ? 'rgba(15,23,42,.45)' : 'rgba(226,232,240,.5)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(Math.round(cx) + .5, T0 - 3); c.lineTo(Math.round(cx) + .5, S1); c.stroke();
      if (st.my >= T0 && st.my <= S1) { c.beginPath(); c.moveTo(L, Math.round(st.my) + .5); c.lineTo(R, Math.round(st.my) + .5); c.stroke(); }
      c.restore();
      if (!isC) { c.beginPath(); c.arc(cx, Y(cl[hk]), 3.5, 0, TAU); c.fillStyle = P.l ? '#fff' : '#0b0b0d'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = lastC; c.stroke(); }
      if (st.my >= T0 && st.my <= B1) tag(c, nf(Yi(st.my), cf.d), R + 2, st.my, P.hv, '#fff');
      else if (st.my >= S0 && st.my <= S1 && subInv) tag(c, subFmt(subInv(st.my)), R + 2, st.my, P.hv, '#fff');
      var tl = hms(wallNow - (now - tms(hk))); c.font = '700 8px ' + MONO; var tw = c.measureText(tl).width + 10, tx = clamp(cx - tw / 2, L, R - tw + 40);
      c.fillStyle = P.hv; c.fillRect(tx, h - 15, tw, 13); T(c, tl, tx + 5, h - 8.5, '#fff', 'left', 8, 700);
    }
  }
  /* ---------- host kanvas ---------- */
  function host(key) {
    var cv = null, ctx = null, st = { mx: -1, my: -1 }, dpr = 1, W = 0, H = 0;
    function mv(e) { var r = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; st.mx = p.clientX - r.left; st.my = p.clientY - r.top; }
    function bind(el) {
      cv = el; ctx = el.getContext('2d'); W = 0; el.addEventListener('mousemove', mv); el.addEventListener('touchstart', mv, { passive: true }); el.addEventListener('touchmove', mv, { passive: true });
      el.addEventListener('mouseleave', function () { st.mx = -1; }); el.addEventListener('touchend', function () { st.mx = -1; });
    }
    (function f(now) {
      requestAnimationFrame(f);
      var el = document.getElementById('gm-pro-' + key), s = S[key]; if (!el || !s || document.hidden) return;
      if (el !== cv) bind(el);
      if (el.offsetParent === null) return;
      var w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      if (w !== W || h !== H) { W = w; H = h; dpr = Math.min(window.devicePixelRatio || 1, 2); el.width = Math.floor(w * dpr); el.height = Math.floor(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); ctx.lineJoin = 'round';
      try { draw(s, ctx, w, h, now, st, pal()); } catch (e) { console.warn('[gm-kpi-pro]', e); }
    })(performance.now());
  }
  Object.keys(CFG).forEach(host);
})();
