(function () {
  'use strict';
  if (window.__baFast) return; window.__baFast = true;
  var W = window, D = document, $ = function (i) { return D.getElementById(i); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var TAU = Math.PI * 2, MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace';
  /* ===== 0. LOG SENYAP: pesan debug modul tidak lagi muncul di konsol (disimpan di window.__baLog) ===== */
  var LOG = W.__baLog = [], TAG = /^\[(gm-|market-pro|global-market|pro-charts|live-module|crypto-cards|liquidity|macro-liq|index-cards|cx-|SE2|fx-quick|Berita Angin)/;
  ['warn', 'error', 'debug', 'log'].forEach(function (k) {
    var o = console[k];
    console[k] = function () {
      var a = arguments;
      if (typeof a[0] === 'string' && TAG.test(a[0])) { LOG.push([Date.now(), k].concat([].slice.call(a))); if (LOG.length > 100) LOG.shift(); return; }
      return o.apply(console, a);
    };
  });
  /* ===== 1. FETCH CEPAT (langsung -> proxy lokal -> proxy publik) ===== */
  var CG = 'https://api.coingecko.com/api/v3/', enc = encodeURIComponent;
  var PX = [function (u) { return u; },
    function (u) { return W.__BA_PROXY ? '/api/proxy?url=' + enc(u) : null; },
    function (u) { return 'https://api.codetabs.com/v1/proxy?quest=' + enc(u); },
    function (u) { return 'https://corsproxy.io/?' + enc(u); }];
  function get(u, ms) { return window.__baFetch(PX, u, false, ms || 6000); }
  /* ===== 2. DATA DOMINASI HARIAN (satu titik per hari UTC, disimpan di perangkat) ===== */
  var KEY = 'ba-dom-v2', ST;
  try { ST = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { ST = {}; }
  ST.days = ST.days || [];
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {} };
  var today = function () { return new Date().toISOString().slice(0, 10); };
  function put(day, rec) {
    var a = ST.days, i = a.length - 1;
    while (i >= 0 && a[i].d > day) i--;
    if (i >= 0 && a[i].d === day) { for (var k in rec) a[i][k] = rec[k]; }
    else { rec.d = day; a.splice(i + 1, 0, rec); }
    while (a.length > 120) a.shift();
  }
  function feedGlobals() {
    var l = ST.days[ST.days.length - 1]; if (!l) return;
    var G = W.__CGG = W.__CGG || {};
    G.btc = l.b; G.eth = l.e; G.stb = l.s;
    if (ST.g) { G.mcap = ST.g.mcap; G.vol = ST.g.vol; }
  }
  function seed() { /* isi riwayat 35 hari sekali (jika provider mengizinkan); gagal = riwayat terkumpul harian */
    if (ST.days.length >= 25 || (ST.seedTry && Date.now() - ST.seedTry < 36e5)) return Promise.resolve();
    ST.seedTry = Date.now(); save();
    var q = function (id) { return get(CG + 'coins/' + id + '/market_chart?vs_currency=usd&days=35&interval=daily', 9000).then(function (j) { return j.market_caps || []; }); };
    var map = function (a) { var o = {}; a.forEach(function (p) { o[new Date(p[0]).toISOString().slice(0, 10)] = p[1]; }); return o; };
    return Promise.all([get(CG + 'global/market_cap_chart?days=35', 9000).then(function (j) { return j.market_cap_chart.market_cap; }), q('bitcoin'), q('ethereum'), q('tether'), q('usd-coin')])
      .then(function (r) {
        var T = map(r[0]), B = map(r[1]), E = map(r[2]), U = map(r[3]), C = map(r[4]), td = today();
        Object.keys(T).forEach(function (d) {
          if (d === td || !(T[d] > 0) || !B[d] || !E[d]) return;
          put(d, { b: B[d] / T[d] * 100, e: E[d] / T[d] * 100, s: ((U[d] || 0) + (C[d] || 0)) / T[d] * 100 });
        });
        save(); render();
      }).catch(function () {});
  }
  function fetchGlobal() {
    var p = W.__baEarly; W.__baEarly = null;
    return (p ? p.then(function (j) { return j && j.data ? j : get(CG + 'global'); }) : get(CG + 'global')).then(function (j) {
      var g = j.data, p = g.market_cap_percentage || {}, b = p.btc, e = p.eth, s = (p.usdt || 0) + (p.usdc || 0);
      if (!(b > 0)) throw 0;
      ST.g = { mcap: g.total_market_cap.usd / 1e12, vol: g.total_volume.usd / 1e9 };
      put(today(), { b: b, e: e, s: s, t: Date.now() });
      ST.ok = Date.now(); save(); feedGlobals(); render();
    });
  }
  function refresh() { return fetchGlobal().then(seed, function () { render(); }); }
  /* ===== 3. GRAFIK STATUS PASAR & DOMINASI (area harian + bar perubahan harian) ===== */
  var cv, ctx, mx = -1, my = -1;
  function pal() {
    var l = D.documentElement.classList.contains('light');
    return { l: l, tx: l ? '#0f172a' : '#F1F5F9', mu: l ? '#64748b' : '#94A3B8', gr: l ? 'rgba(15,23,42,.09)' : 'rgba(255,255,255,.07)', up: l ? '#059669' : '#34D399', dn: l ? '#e11d48' : '#FB7185' };
  }
  function Tx(c, t, x, y, col, al, sz, wt) { c.font = (wt || 400) + ' ' + (sz || 8) + 'px ' + MONO; c.fillStyle = col; c.textAlign = al || 'left'; c.textBaseline = 'middle'; c.fillText(t, x, y); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var dl = function (d) { return +d.slice(8, 10) + ' ' + MON[+d.slice(5, 7) - 1]; };
  function setup() {
    var o = $('mini-dom-pro'); if (!o || o.getAttribute('data-ba2')) return;
    cv = o.cloneNode(false); cv.setAttribute('data-ba2', '1');
    cv.setAttribute('aria-label', 'Grafik radar dominasi BTC, ETH, stablecoin, dan lainnya, data harian CoinGecko');
    o.parentNode.replaceChild(cv, o); ctx = cv.getContext('2d');
    var mv = function (e) { var r = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; mx = p.clientX - r.left; my = p.clientY - r.top; draw(); };
    var lv = function () { mx = -1; my = -1; draw(); };
    cv.addEventListener('mousemove', mv); cv.addEventListener('touchstart', mv, { passive: true }); cv.addEventListener('touchmove', mv, { passive: true });
    cv.addEventListener('mouseleave', lv); cv.addEventListener('touchend', lv);
    if (W.ResizeObserver) new ResizeObserver(function () { draw(); }).observe(cv.parentNode);
    var pg = cv.closest('.page');
    if (pg) new MutationObserver(function () { if (pg.classList.contains('active')) requestAnimationFrame(draw); }).observe(pg, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(function () { draw(); }).observe(D.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
  function draw() {
    if (!cv || !cv.offsetParent) return;
    var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    var dpr = Math.min(W.devicePixelRatio || 1, 2), c = ctx, P = pal(), i;
    if (cv.width !== Math.floor(w * dpr) || cv.height !== Math.floor(h * dpr)) { cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr); }
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h); c.lineJoin = 'round';
    var R0 = ST.days.slice(-30), n = R0.length;
    if (!n) { Tx(c, 'Memuat data live…', w / 2, h / 2, P.mu, 'center', 10, 500); return; }
    var A = R0.map(function (r) { return { d: r.d, v: [r.b, r.e, r.s, Math.max(0, 100 - r.b - r.e - r.s)] }; });
    var AX = [['BTC', '#F7931A'], ['ETH', '#627EEA'], ['Stable', '#26A17B'], ['Lainnya', '#64748B']];
    var cur = A[n - 1].v, prv = A[Math.max(0, n - 8)].v, lo = [], hi = [];
    for (i = 0; i < 4; i++) { var col = A.map(function (r) { return r.v[i]; }); lo[i] = Math.min.apply(null, col); hi[i] = Math.max.apply(null, col); }
    var nm = function (v, k) { return hi[k] - lo[k] < .05 ? .5 : .14 + .86 * (v - lo[k]) / (hi[k] - lo[k]); };
    var cx = w / 2, cy = h / 2 + 3, rad = Math.max(28, Math.min(w / 2 - 50, h / 2 - 22));
    var ang = function (k) { return -Math.PI / 2 + k * Math.PI / 2; };
    var pt = function (k, f) { return [cx + Math.cos(ang(k)) * rad * f, cy + Math.sin(ang(k)) * rad * f]; };
    var ACC = P.l ? '#2f6bb3' : '#7fa6d6', FILL = P.l ? '47,107,179' : '110,150,200';
    Tx(c, 'RADAR · 30 HARI', 6, 8, P.mu, 'left', 8, 600);
    /* cincin & jari-jari */
    for (var g = 1; g <= 4; g++) {
      c.beginPath(); for (i = 0; i < 4; i++) { var p = pt(i, g / 4); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }
      c.closePath(); c.strokeStyle = P.gr; c.lineWidth = 1; c.stroke();
    }
    for (i = 0; i < 4; i++) { var e = pt(i, 1); c.beginPath(); c.moveTo(cx, cy); c.lineTo(e[0], e[1]); c.stroke(); }
    var poly = function (vals) { c.beginPath(); for (var k = 0; k < 4; k++) { var q = pt(k, nm(vals[k], k)); k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } c.closePath(); };
    /* 7 hari lalu (putus-putus) */
    poly(prv); c.setLineDash([3, 3]); c.strokeStyle = P.mu; c.lineWidth = 1.2; c.stroke(); c.setLineDash([]);
    /* kini (terisi) */
    poly(cur); var gd = c.createRadialGradient(cx, cy, 0, cx, cy, rad); gd.addColorStop(0, 'rgba(' + FILL + ',.15)'); gd.addColorStop(1, 'rgba(' + FILL + ',.6)');
    c.fillStyle = gd; c.fill(); c.strokeStyle = ACC; c.lineWidth = 1.8; c.stroke();
    /* sumbu terdekat dengan kursor */
    var hv = -1;
    if (mx >= 0 && my >= 0) { var dx = mx - cx, dy = my - cy; hv = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy < 0 ? 0 : 2); }
    for (i = 0; i < 4; i++) {
      var v = pt(i, nm(cur[i], i)), d = cur[i] - prv[i], up = d >= 0, lp = pt(i, 1);
      c.beginPath(); c.arc(v[0], v[1], i === hv ? 4.5 : 3, 0, TAU); c.fillStyle = AX[i][1]; c.fill();
      c.lineWidth = 1.5; c.strokeStyle = P.l ? '#fff' : '#0f172a'; c.stroke();
      var al = i === 1 ? 'left' : i === 3 ? 'right' : 'center', ox = i === 1 ? 7 : i === 3 ? -7 : 0;
      var ty = i === 0 ? lp[1] - 14 : i === 2 ? lp[1] + 8 : lp[1] - 5;
      var val = cur[i].toFixed(1) + '% ' + (up ? '▲' : '▼');
      if (i === 0 || i === 2) { Tx(c, AX[i][0] + ' ' + val, lp[0], i === 0 ? lp[1] - 8 : lp[1] + 9, hv === i ? P.tx : P.mu, 'center', 8, 700); }
      else { Tx(c, AX[i][0], lp[0] + ox, ty, hv === i ? P.tx : P.mu, al, 8, 700); Tx(c, val, lp[0] + ox, ty + 11, up ? P.up : P.dn, al, 8, 600); }
    }
    c.setLineDash([3, 3]); c.strokeStyle = P.mu; c.lineWidth = 1.2; c.beginPath(); c.moveTo(6, h - 6); c.lineTo(20, h - 6); c.stroke(); c.setLineDash([]);
    Tx(c, '7 hari lalu', 24, h - 6, P.mu, 'left', 8, 500);
    /* tooltip */
    if (hv >= 0) {
      var dd = cur[hv] - prv[hv], rows = [AX[hv][0] + ' · ' + dl(A[n - 1].d), 'Kini    ' + cur[hv].toFixed(2) + '%', '7H lalu ' + prv[hv].toFixed(2) + '% (' + (dd >= 0 ? '+' : '') + dd.toFixed(2) + ')', '30H     ' + lo[hv].toFixed(1) + '–' + hi[hv].toFixed(1) + '%'];
      c.font = '600 8px ' + MONO; var bw = 0; rows.forEach(function (r) { bw = Math.max(bw, c.measureText(r).width); }); bw += 14;
      var bh = rows.length * 11 + 8, bx = mx + 10 + bw > w - 2 ? mx - 10 - bw : mx + 10, by = clamp(my - bh / 2, 2, h - bh - 2);
      c.fillStyle = P.l ? 'rgba(15,23,42,.94)' : 'rgba(226,232,240,.96)'; c.fillRect(bx, by, bw, bh);
      rows.forEach(function (r, ri) { Tx(c, r, bx + 7, by + 9.5 + ri * 11, ri === 1 ? (P.l ? '#fff' : '#0f172a') : (P.l ? '#cbd5e1' : '#334155'), 'left', 8, ri === 1 ? 700 : 600); });
    }
  }
  function txt(id, v) { var e = $(id); if (e) e.textContent = v; }
  function render() {
    setup();
    var l = ST.days[ST.days.length - 1];
    if (l) {
      txt('stat-btc-dom', l.b.toFixed(1) + '%'); txt('leg-btc', l.b.toFixed(1) + '%'); txt('leg-eth', l.e.toFixed(1) + '%');
      txt('leg-stb', l.s.toFixed(1) + '%'); txt('leg-oth', Math.max(0, 100 - l.b - l.e - l.s).toFixed(1) + '%');
      var A = ST.days.slice(-30), avg = A.reduce(function (s, r) { return s + r.b; }, 0) / A.length, ref = A[Math.max(0, A.length - 8)].b;
      var dv = l.b - avg, ar = l.b - ref >= 0 ? '▲' : '▼';
      var z = dv >= .8 ? ['BTC MEMIMPIN', 'bg-amber-500/15 text-amber-300 border-amber-500/30'] : dv <= -.8 ? ['ROTASI ALTCOIN', 'bg-sky-500/15 text-sky-300 border-sky-500/30'] : ['SEIMBANG', 'bg-gray-500/15 text-gray-300 border-gray-500/30'];
      var s = $('dom-status'); if (s) { s.textContent = z[0] + ' ' + ar; s.className = 'px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border ' + z[1]; }
      var card = cv && cv.closest('.bg-card-dark'), lv = card && card.querySelector('.text-emerald-400, .ba-dom-live');
      if (lv) { lv.classList.add('ba-dom-live'); var fresh = ST.ok && Date.now() - ST.ok < 6e5; lv.textContent = (fresh ? '● LIVE · ' : '○ TERAKHIR · ') + new Date(l.t || Date.now()).toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace('.', ':'); lv.style.color = fresh ? '' : '#94a3b8'; }
    }
    draw();
  }
  /* kartu lama berhenti dipakai simulasi: modul LIVE memanggil __domPro.push tiap 2 dtk, kini diabaikan */
  W.__domPro = { push: function () {} };
  feedGlobals(); render();
  /* ===== 4. GLOBAL MARKET OVERVIEW: terbuka instan saat URL dibuka (#global-market) ===== */
  function gmInstant() {
    var pg = $('page-global-market'); if (!pg || !pg.classList.contains('active')) return;
    var on = D.querySelector('[data-gm-tab].bg-brand-primary') || D.querySelector('[data-gm-tab="1"]');
    if (on) on.click(); /* memicu sub() -> gambar ulang KPI/tabel + header segera */
    var t = new Date(), p2 = function (n) { return (n < 10 ? '0' : '') + n; }, e = $('gm-clock');
    if (e) e.textContent = '● LIVE ' + p2(t.getHours()) + ':' + p2(t.getMinutes()) + ':' + p2(t.getSeconds());
  }
  var gp = $('page-global-market');
  if (gp) new MutationObserver(function () { if (gp.classList.contains('active')) requestAnimationFrame(gmInstant); }).observe(gp, { attributes: true, attributeFilter: ['class'] });
  D.addEventListener('visibilitychange', function () { if (!D.hidden) { requestAnimationFrame(gmInstant); render(); if (!ST.ok || Date.now() - ST.ok > 6e4) refresh(); } });
  W.addEventListener('pageshow', function () { requestAnimationFrame(gmInstant); });
  gmInstant();
  /* teks status "○ Statis · ..." (sisa debug) disembunyikan; status sukses tetap tampil */
  setInterval(function () { var b = $('ba-live-ml'); if (b) b.style.display = /^○/.test(b.textContent) ? 'none' : ''; }, 1500);
  /* ===== 6. RESPON CEPAT DI SEMUA HALAMAN ===== */
  var st = D.createElement('style');
  st.textContent = '.gm-nm{display:flex;align-items:center;gap:10px}.gm-lg{position:relative;width:28px;height:28px;flex:0 0 28px;border-radius:8px;display:grid;place-items:center;background:rgba(56,189,248,.1);font-size:13px;overflow:hidden}.gm-lg img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff;padding:4px;box-sizing:border-box}.page.active{animation-duration:.14s!important}.page.ba-enter{animation-duration:.16s!important}a,button,[role=button],[data-gm-tab],.ba-tab,.gm-chip,.liq-btn{touch-action:manipulation;-webkit-tap-highlight-color:transparent}';
  D.head.appendChild(st);
  var rq = 0;
  function kick() { if (rq) return; rq = requestAnimationFrame(function () { rq = 0; W.dispatchEvent(new Event('resize')); }); }
  Array.prototype.forEach.call(D.querySelectorAll('.page'), function (pg) {
    new MutationObserver(function () { if (pg.classList.contains('active')) kick(); }).observe(pg, { attributes: true, attributeFilter: ['class'] });
  });
  /* ===== 5. JADWAL: ambil langsung saat dibuka (tanpa tunggu 1,2 dtk), lalu tiap 90 dtk ===== */
  refresh();
  setInterval(function () { if (!D.hidden) refresh(); }, 9e4);
})();
