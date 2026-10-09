/* LIVE CRYPTO INDEX TRACKER PRO — candlestick ala bursa, berjalan otomatis.
   MA20 • EMA9 • Bollinger(20,2) • Volume • RSI14 • crosshair • last-price tag.
   Data = simulasi ilustratif sampai feed nyata tersambung. */
(function () {
  'use strict';
  var cv = document.getElementById('cryptoIndexPro'); if (!cv || window.__cxPro) return; window.__cxPro = true;
  var ctx = cv.getContext('2d'), $ = function (i) { return document.getElementById(i); };
  var MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace', BASE = 85897.72, VIS = 72, MAX = 260;
  var TF = { '3s': 3000, '6s': 6000, '15s': 15000, '30s': 30000 };
  var S = { tf: '3s', price: BASE, open: BASE, hi: BASE, lo: BASE, cs: [], auto: true, drift: 0, ticks: 0, hover: -1, mx: 0, my: 0, g: null, last: Date.now(), ind: { ma: true, ema: true, bb: true, vol: true, rsi: true } };
  var rnd = function () { return Math.random() - .5; };
  var fmt = function (v, d) { d = d == null ? 2 : d; return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var hms = function (t) { return new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
  function advance(ts) {
    var b = TF[S.tf], c = S.cs[S.cs.length - 1];
    if (!c || ts - c.t >= b) { c = { t: ts, o: S.price, h: S.price, l: S.price, c: S.price, v: 0 }; S.cs.push(c); if (S.cs.length > MAX) S.cs.shift(); }
    S.drift = S.drift * .92 + rnd() * .6;
    var d = rnd() * 30 + S.drift * 9 + ((window.__BA_BTC || BASE) - S.price) * .0006;
    S.price = Math.max(1000, S.price + d);
    c.c = S.price; c.h = Math.max(c.h, S.price); c.l = Math.min(c.l, S.price);
    c.v += 1 + Math.random() * 6 + Math.abs(d) * .2;
  }
  function seed() {
    var b = TF[S.tf], now = Date.now(), n = VIS + 40;
    S.cs = []; S.price = BASE + rnd() * 400; S.drift = 0;
    for (var i = 0; i < n; i++) for (var k = 0; k < 8; k++) advance(now - (n - i) * b + k * (b / 8));
    S.open = S.cs[0].o; S.hi = -Infinity; S.lo = Infinity;
    S.cs.forEach(function (c) { S.hi = Math.max(S.hi, c.h); S.lo = Math.min(S.lo, c.l); });
  }
  /* ---------- indikator ---------- */
  function sma(a, n) { var o = [], s = 0; for (var i = 0; i < a.length; i++) { s += a[i]; if (i >= n) s -= a[i - n]; o.push(i >= n - 1 ? s / n : null); } return o; }
  function ema(a, n) { var k = 2 / (n + 1), o = [], e = a[0]; for (var i = 0; i < a.length; i++) { e = i ? a[i] * k + e * (1 - k) : a[0]; o.push(i >= n - 1 ? e : null); } return o; }
  function bb(a, n, m) {
    var mid = sma(a, n), u = [], l = [];
    for (var i = 0; i < a.length; i++) {
      if (mid[i] == null) { u.push(null); l.push(null); continue; }
      var v = 0; for (var j = i - n + 1; j <= i; j++) v += Math.pow(a[j] - mid[i], 2);
      var sd = Math.sqrt(v / n); u.push(mid[i] + m * sd); l.push(mid[i] - m * sd);
    }
    return { u: u, l: l };
  }
  function rsi(a, n) {
    var o = [], g = 0, l = 0;
    for (var i = 0; i < a.length; i++) {
      if (!i) { o.push(null); continue; }
      var d = a[i] - a[i - 1], G = d > 0 ? d : 0, L = d < 0 ? -d : 0;
      if (i <= n) { g += G; l += L; if (i === n) { g /= n; l /= n; o.push(l ? 100 - 100 / (1 + g / l) : 100); } else o.push(null); }
      else { g = (g * (n - 1) + G) / n; l = (l * (n - 1) + L) / n; o.push(l ? 100 - 100 / (1 + g / l) : 100); }
    }
    return o;
  }
  /* ---------- render ---------- */
  function colors() {
    return document.documentElement.classList.contains('light')
      ? { bg: '#ffffff', grid: 'rgba(15,23,42,.07)', ax: '#64748b', up: '#059669', dn: '#e11d48', ma: '#d97706', em: '#2563eb', bb: 'rgba(124,58,237,.9)', bf: 'rgba(124,58,237,.07)', ch: 'rgba(15,23,42,.4)', tag: '#0f172a', tagt: '#ffffff', on: '#ffffff' }
      : { bg: '#050505', grid: 'rgba(255,255,255,.055)', ax: '#94A3B8', up: '#34D399', dn: '#FB7185', ma: '#FBBF24', em: '#38BDF8', bb: 'rgba(167,139,250,.9)', bf: 'rgba(167,139,250,.08)', ch: 'rgba(226,232,240,.4)', tag: '#E2E8F0', tagt: '#050505', on: '#04130c' };
  }
  /* ---------- helper 3D ---------- */
  function b3(col, k, a) { var m = String(col).match(/^#([0-9a-f]{3,6})$/i), r = 100, g = 116, bl = 139;
    if (m) { var h = m[1]; if (h.length < 6) h = h.split('').map(function (z) { return z + z; }).join(''); r = parseInt(h.substr(0, 2), 16); g = parseInt(h.substr(2, 2), 16); bl = parseInt(h.substr(4, 2), 16); }
    else { m = String(col).match(/rgba?\(([^)]+)\)/); if (m) { var q = m[1].split(/[ ,\/]+/).map(parseFloat); r = q[0]; g = q[1]; bl = q[2]; } }
    var f = function (n) { return Math.max(0, Math.min(255, Math.round(n * k))); }; return 'rgba(' + f(r) + ',' + f(g) + ',' + f(bl) + ',' + (a == null ? 1 : a) + ')'; }
  function box3(x, y, w, h, col, d) {
    var ox = d * .75, oy = -d * .6, gr = ctx.createLinearGradient(x, y, x + w, y);
    gr.addColorStop(0, b3(col, 1.15)); gr.addColorStop(1, b3(col, .8));
    ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);                                   /* sisi depan */
    ctx.fillStyle = b3(col, 1.4); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w + ox, y + oy); ctx.lineTo(x + ox, y + oy); ctx.closePath(); ctx.fill();   /* atas */
    ctx.fillStyle = b3(col, .52); ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + ox, y + oy); ctx.lineTo(x + w + ox, y + h + oy); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();   /* kanan */
  }
  function draw() {
    if (cv.offsetParent === null) return;
    var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    var C = colors(), all = S.cs, N = all.length, s0 = Math.max(0, N - VIS), cs = all.slice(s0), n = cs.length;
    var cl = all.map(function (c) { return c.c; });
    var ma = sma(cl, 20), em = ema(cl, 9), bo = bb(cl, 20, 2), rs = rsi(cl, 14), I = S.ind, i, j;
    var L = 8, R = w - 68, T = 30, B = h - 20, gap = 8;
    var rH = I.rsi ? Math.max(46, h * .13) : 0, vH = I.vol ? Math.max(40, h * .12) : 0;
    var rTop = B - rH, vBot = rH ? rTop - gap : B, vTop = vBot - vH, pBot = vH ? vTop - gap : vBot;
    ctx.clearRect(0, 0, w, h); /* latar kanvas dibiarkan transparan */
    var min = Infinity, max = -Infinity;
    cs.forEach(function (c, k) { min = Math.min(min, c.l); max = Math.max(max, c.h); if (I.bb && bo.u[s0 + k] != null) { min = Math.min(min, bo.l[s0 + k]); max = Math.max(max, bo.u[s0 + k]); } });
    var pad = (max - min) * .08 || 1; min -= pad; max += pad;
    var toY = function (v) { return pBot - (v - min) / (max - min) * (pBot - T); };
    var slot = (R - L) / VIS, off = VIS - n, xAt = function (k) { return L + (off + k + .5) * slot; };
    S.g = { L: L, R: R, slot: slot, off: off, n: n, T: T, pBot: pBot, min: min, max: max, B: B };
    /* grid & sumbu */
    ctx.font = '9px ' + MONO; ctx.lineWidth = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (i = 0; i <= 5; i++) { var v = min + (max - min) * i / 5, y = Math.round(toY(v)) + .5; ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke(); ctx.fillStyle = C.ax; ctx.fillText(fmt(v), R + 6, y); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    var every = Math.max(6, Math.round(w / 110));
    for (i = n - 1; i >= 0; i -= every) { var gx = Math.round(xAt(i)) + .5; ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(gx, T); ctx.lineTo(gx, B); ctx.stroke(); ctx.fillStyle = C.ax; ctx.fillText(hms(cs[i].t), Math.min(gx, R - 22), B + 13); }
    var line = function (arr, col, lw, dash, fy) {
      fy = fy || toY; ctx.beginPath(); var on = false;
      for (var k = 0; k < n; k++) { var val = arr[s0 + k]; if (val == null) { on = false; continue; } var x = xAt(k), yy = fy(val); on ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); on = true; }
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
    };
    /* Bollinger */
    if (I.bb) {
      var f = []; for (i = 0; i < n; i++) if (bo.u[s0 + i] != null) f.push(i);
      if (f.length > 1) {
        ctx.beginPath(); f.forEach(function (k, q) { var x = xAt(k), yy = toY(bo.u[s0 + k]); q ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); });
        for (j = f.length - 1; j >= 0; j--) ctx.lineTo(xAt(f[j]), toY(bo.l[s0 + f[j]]));
        ctx.closePath(); ctx.fillStyle = C.bf; ctx.fill();
      }
      line(bo.u, C.bb, .8, [3, 3]); line(bo.l, C.bb, .8, [3, 3]);
    }
    /* candlestick */
    var bw = Math.max(2, Math.min(14, slot * .64));
    cs.forEach(function (c, k) {
      var x = Math.round(xAt(k)) + .5, col = c.c >= c.o ? C.up : C.dn;
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
      var y1 = toY(Math.max(c.o, c.c)), y2 = toY(Math.min(c.o, c.c)), bl = Math.round(x - bw / 2), bwr = Math.round(bw), bh3 = Math.max(1, y2 - y1), d3 = Math.min(9, bw * .8);
      /* 3D: bayangan lantai, sumbu di tengah kedalaman, lalu balok (depan + atas + kanan) */
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(bl + d3 * .75 + 2, y1 - d3 * .6 + 3, bwr, bh3); ctx.restore();
      ctx.strokeStyle = b3(col, .6); ctx.beginPath(); ctx.moveTo(x + d3 * .37, toY(c.h) - d3 * .3); ctx.lineTo(x + d3 * .37, toY(c.l) - d3 * .3); ctx.stroke();
      box3(bl, y1, bwr, bh3, col, d3);
    });
    if (I.ma) line(ma, C.ma, 1.3); if (I.ema) line(em, C.em, 1.3);
    /* high / low terlihat */
    var hi = 0, lo = 0; cs.forEach(function (c, k) { if (c.h > cs[hi].h) hi = k; if (c.l < cs[lo].l) lo = k; });
    ctx.font = '9px ' + MONO; ctx.fillStyle = C.ax; ctx.textAlign = 'center';
    ctx.fillText(fmt(cs[hi].h), Math.max(L + 30, Math.min(R - 30, xAt(hi))), toY(cs[hi].h) - 5);
    ctx.fillText(fmt(cs[lo].l), Math.max(L + 30, Math.min(R - 30, xAt(lo))), toY(cs[lo].l) + 13);
    /* volume */
    var tag = function (x, y, t, bg, fg) { ctx.fillStyle = bg; ctx.fillRect(x, y - 8, 64, 16); ctx.fillStyle = fg; ctx.font = '700 9px ' + MONO; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, x + 4, y); ctx.textBaseline = 'alphabetic'; };
    ctx.font = '9px ' + MONO;
    if (vH) {
      var vm = 0; cs.forEach(function (c) { vm = Math.max(vm, c.v); });
      ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(L, vTop - 4.5); ctx.lineTo(R, vTop - 4.5); ctx.stroke();
      ctx.globalAlpha = .42;
      cs.forEach(function (c, k) { var bh = c.v / (vm || 1) * (vBot - vTop); box3(Math.round(xAt(k) - bw / 2), vBot - bh, Math.round(bw), bh, c.c >= c.o ? C.up : C.dn, Math.min(6, bw * .6)); });
      ctx.globalAlpha = 1; ctx.fillStyle = C.ax; ctx.textAlign = 'left'; ctx.fillText('VOL', L + 2, vTop + 9);
    }
    /* RSI */
    if (rH) {
      var ry = function (q) { return B - q / 100 * (B - rTop); };
      ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(L, rTop - 4.5); ctx.lineTo(R, rTop - 4.5); ctx.stroke();
      [30, 50, 70].forEach(function (q) { ctx.strokeStyle = C.grid; ctx.setLineDash(q === 50 ? [] : [3, 3]); ctx.beginPath(); ctx.moveTo(L, ry(q)); ctx.lineTo(R, ry(q)); ctx.stroke(); ctx.fillStyle = C.ax; ctx.textAlign = 'left'; ctx.fillText(q, R + 6, ry(q) + 3); });
      ctx.setLineDash([]); line(rs, C.bb, 1.3, null, ry);
      var rl = rs[N - 1]; ctx.fillStyle = C.ax; ctx.textAlign = 'left'; ctx.fillText('RSI 14' + (rl == null ? '' : '  ' + rl.toFixed(1)), L + 2, rTop + 9);
    }
    /* harga terakhir */
    var lc = all[N - 1], lcol = lc.c >= lc.o ? C.up : C.dn, ly = toY(S.price);
    ctx.strokeStyle = lcol; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(L, ly); ctx.lineTo(R, ly); ctx.stroke(); ctx.setLineDash([]);
    tag(R, ly, fmt(S.price), lcol, C.on);
    /* header */
    ctx.font = '700 10px ' + MONO; ctx.textAlign = 'left'; ctx.fillStyle = C.up;
    ctx.fillText('CRYPTO COMPOSITE INDEX • ' + S.tf + ' • ' + (S.auto ? 'AUTO' : 'PAUSED'), L, 14);
    if (w > 600) { var lx = R - 190; [['MA20', C.ma, I.ma], ['EMA9', C.em, I.ema], ['BB20', C.bb, I.bb]].forEach(function (t) { if (!t[2]) return; ctx.fillStyle = t[1]; ctx.fillText('— ' + t[0], lx, 14); lx += ctx.measureText('— ' + t[0]).width + 14; }); }
    /* crosshair */
    if (S.hover >= 0 && S.hover < n) {
      var hx = Math.round(xAt(S.hover)) + .5;
      ctx.strokeStyle = C.ch; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(hx, T); ctx.lineTo(hx, B); ctx.stroke();
      if (S.my >= T && S.my <= pBot) { ctx.beginPath(); ctx.moveTo(L, S.my); ctx.lineTo(R, S.my); ctx.stroke(); ctx.setLineDash([]); tag(R, S.my, fmt(min + (pBot - S.my) / (pBot - T) * (max - min)), C.tag, C.tagt); }
      ctx.setLineDash([]); ctx.fillStyle = C.tag; ctx.fillRect(Math.min(hx - 34, R - 68), B + 2, 68, 14);
      ctx.fillStyle = C.tagt; ctx.font = '700 9px ' + MONO; ctx.textAlign = 'center'; ctx.fillText(hms(cs[S.hover].t), Math.min(hx, R - 34), B + 12);
    }
    /* panel OHLC */
    var k0 = S.hover >= 0 && S.hover < n ? s0 + S.hover : N - 1, c0 = all[k0], pv = k0 > 0 ? all[k0 - 1].c : c0.o, dd = c0.c - pv, up = dd >= 0;
    var el = $('cxp-ohlc');
    if (el) el.innerHTML = 'O <b>' + fmt(c0.o) + '</b> &nbsp;H <b>' + fmt(c0.h) + '</b> &nbsp;L <b>' + fmt(c0.l) + '</b> &nbsp;C <b>' + fmt(c0.c) + '</b> &nbsp;<span class="' + (up ? 'text-emerald-400' : 'text-rose-400') + '">' + (up ? '+' : '') + fmt(dd) + ' (' + (up ? '+' : '') + (dd / pv * 100).toFixed(2) + '%)</span> &nbsp;V <b>' + fmt(c0.v * 1000, 0) + '</b>';
  }
  function resize() {
    var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2); if (!r.width || !r.height) return;
    cv.width = Math.floor(r.width * d); cv.height = Math.floor(r.height * d); ctx.setTransform(d, 0, 0, d, 0, 0); draw();
  }
  /* ---------- panel statistik ---------- */
  function tint(id, text, dir) {
    var e = $(id); if (!e) return; e.textContent = text;
    e.classList.remove('text-white', 'text-emerald-400', 'text-rose-400', 'text-amber-400');
    e.classList.add(dir > 0 ? 'text-emerald-400' : dir < 0 ? 'text-rose-400' : dir === 0 ? 'text-white' : 'text-amber-400');
  }
  function panel() {
    var all = S.cs, N = all.length, cl = all.map(function (c) { return c.c; });
    var r = rsi(cl, 14)[N - 1]; r = r == null ? 50 : r;
    var m = sma(cl, 20)[N - 1], e = ema(cl, 9)[N - 1], atr = 0, q = 0;
    for (var i = Math.max(1, N - 14); i < N; i++) { atr += Math.max(all[i].h - all[i].l, Math.abs(all[i].h - all[i - 1].c), Math.abs(all[i].l - all[i - 1].c)); q++; }
    atr = q ? atr / q : 0;
    var chg = S.price - S.open, pct = chg / S.open * 100, vol = all.reduce(function (a, c) { return a + c.v; }, 0);
    var sig = m != null && e > m && r >= 50 ? 'BULLISH' : (m != null && e < m && r < 50 ? 'BEARISH' : 'NETRAL');
    S.hi = Math.max(S.hi, S.price); S.lo = Math.min(S.lo, S.price);
    tint('cxp-open', fmt(S.open), 0); tint('cxp-high', fmt(S.hi), 1); tint('cxp-low', fmt(S.lo), -1);
    tint('cxp-chg', (chg >= 0 ? '+' : '') + pct.toFixed(2) + '%', chg >= 0 ? 1 : -1);
    tint('cxp-vol', fmt(vol * 1000, 0), 0); tint('cxp-rsi', r.toFixed(1), r >= 70 ? -1 : r <= 30 ? 1 : 0);
    tint('cxp-atr', fmt(atr), 0); tint('cxp-sig', sig, sig === 'BULLISH' ? 1 : sig === 'BEARISH' ? -1 : 2);
    var lv = $('live-index-val');
    if (lv) { lv.textContent = '$' + fmt(S.price); lv.classList.remove('text-emerald-400', 'text-rose-400'); lv.classList.add(chg >= 0 ? 'text-emerald-400' : 'text-rose-400'); }
    var st = $('cxp-status'); if (st) st.textContent = (S.auto ? 'AUTO' : 'PAUSED') + ' • ' + S.ticks.toLocaleString('id-ID') + ' tick • ' + hms(S.last);
  }
  /* ---------- kontrol ---------- */
  function setOn(el, on) {
    ['bg-brand-primary', 'text-white', 'border-transparent'].forEach(function (c) { el.classList.toggle(c, on); });
    ['bg-black', 'border-card-border', 'text-gray-300'].forEach(function (c) { el.classList.toggle(c, !on); });
  }
  function mark() {
    document.querySelectorAll('#cxp-tf [data-tf]').forEach(function (b) { setOn(b, b.dataset.tf === S.tf); });
    document.querySelectorAll('#cxp-ind [data-ind]').forEach(function (b) { setOn(b, !!S.ind[b.dataset.ind]); });
    var p = $('cxp-pause'); if (p) { p.textContent = S.auto ? 'PAUSE' : 'RESUME'; setOn(p, !S.auto); }
  }
  document.querySelectorAll('#cxp-tf [data-tf]').forEach(function (b) { b.addEventListener('click', function () { S.tf = b.dataset.tf; S.hover = -1; seed(); mark(); draw(); panel(); }); });
  document.querySelectorAll('#cxp-ind [data-ind]').forEach(function (b) { b.addEventListener('click', function () { S.ind[b.dataset.ind] = !S.ind[b.dataset.ind]; mark(); draw(); }); });
  var pb = $('cxp-pause'); if (pb) pb.addEventListener('click', function () { S.auto = !S.auto; mark(); draw(); panel(); });
  function pos(e) {
    var r = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] : e, g = S.g; if (!g) return;
    S.mx = p.clientX - r.left; S.my = p.clientY - r.top;
    var i = Math.floor((S.mx - g.L) / g.slot) - g.off; S.hover = i >= 0 && i < g.n && S.mx <= g.R ? i : -1; draw();
  }
  cv.addEventListener('mousemove', pos); cv.addEventListener('touchstart', pos, { passive: true }); cv.addEventListener('touchmove', pos, { passive: true });
  ['mouseleave', 'touchend'].forEach(function (ev) { cv.addEventListener(ev, function () { S.hover = -1; draw(); }); });
  seed(); mark(); resize(); panel();
  setInterval(function () {
    if (!S.auto || document.hidden) return;
    S.last = Date.now(); advance(S.last); S.ticks++; panel(); draw();
  }, 300);
  window.addEventListener('resize', resize, { passive: true });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(cv.parentElement || cv);
  if (typeof MutationObserver !== 'undefined') new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
})();
