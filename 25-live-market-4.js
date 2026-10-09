/* ============================================================
   LIVE MODULE — KOMPONEN LIKUIDITAS MAKRO (v2: tabel otomatis + grafik pendukung)
   Tabel dapat diurutkan, dicari, difilter, diekspor CSV; 3 grafik Chart.js otomatis
   (Likuiditas Bersih vs Neraca Fed, kontribusi komponen, riwayat skor). Hanya menyentuh elemen #mlc-*.
   Nilai dasar (b) = data resmi terbaru per 2 Okt 2026 (FRED, ECB, BoJ, Treasury, pasar valas, DefiLlama); pergerakan antar-tick = simulasi,
   lalu ditimpa data online oleh skrip #ba-live-data.
   ============================================================ */
(function () {
  'use strict';
  if (window.__liveMacroComponents) return;
  window.__liveMacroComponents = true;
  var PAGE = 'page-global-market';
  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  var clockAt = function (ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); };
  var clock = function () { return clockAt(Date.now()); };
  var vis = function () { var p = $(PAGE); return !!p && p.classList.contains('active') && !document.hidden; };
  var safe = function (f) { return function () { try { f.apply(null, arguments); } catch (e) { console.warn('[macro-liq]', e); } }; };
  var C = [
    { id: 'fed', n: 'Neraca Fed (WALCL)', s: 'Federal Reserve · H.4.1 30 Sep 2026', u: 'T', b: 6.743, r: .0012, d: 3, e: 1, ic: 'fa-building-columns' },
    { id: 'rrp', n: 'Reverse Repo (RRP)', s: 'NY Fed · semalam (30 Sep 2026)', u: 'T', b: 0.012, r: .02, d: 3, e: -1, ic: 'fa-rotate' },
    { id: 'tga', n: 'Kas Treasury (TGA)', s: 'US Treasury · 30 Sep 2026', u: 'T', b: 0.984, r: .012, d: 3, e: -1, ic: 'fa-vault' },
    { id: 'ecb', n: 'Neraca ECB', s: 'ECB · Eurosystem 25 Sep 2026 (€5,897B × 1,1253)', u: 'T', b: 6.636, r: .001, d: 3, e: 1, ic: 'fa-euro-sign' },
    { id: 'boj', n: 'Neraca BoJ', s: 'BoJ · Agu 2026 (¥644,66T ÷ 157,83)', u: 'T', b: 4.085, r: .0015, d: 3, e: 1, ic: 'fa-yen-sign' },
    { id: 'm2', n: 'Suplai Uang M2 AS', s: 'Federal Reserve · Agu 2026', u: 'T', b: 23.343, r: .0006, d: 3, e: 1, ic: 'fa-money-bill-trend-up' },
    { id: 'ust', n: 'Imbal Hasil UST 10Y', s: 'US Treasury · 2 Okt 2026', u: '%', b: 5.28, r: .006, d: 3, e: -1, ic: 'fa-percent' },
    { id: 'dxy', n: 'Indeks Dolar (DXY)', s: 'ICE Futures · 2 Okt 2026', u: '', b: 101.9, r: .0018, d: 2, e: -1, ic: 'fa-dollar-sign' },
    { id: 'stb', n: 'Suplai Stablecoin', s: 'Kripto · USDT+USDC (10 Sep 2026)', u: 'B', b: 257.6, r: .0025, d: 1, e: 1, ic: 'fa-coins' }
  ];
  if (window.__dailyLiq) C = window.__dailyLiq(C);
  var st = { iv: 2000, paused: false, f: 'all', q: '', sk: 'i', sd: 1, score: 50, shown: 50, reg: '' };
  var alerts = [], H = { t: [], net: [], fed: [], sc: [], rrp: [], tga: [] }, CH = {};
  window.__MLC = { C: C, H: H };
  function step(c) { c.p = c.x; c.x = c.x + (c.b - c.x) * .05 + rnd(-1, 1) * c.b * c.r; }
  C.forEach(function (c, i) { c.i = i; c.k = 0; c.dp = 0; c.x = c.b * (1 + rnd(-c.r, c.r) * 2); c.h = []; for (var j = 0; j < 40; j++) { step(c); c.h.push(c.x); } c.o = c.x; });
  var G = function (id) { return C.filter(function (c) { return c.id === id; })[0]; };
  function fm(c, v) {
    var s = v.toLocaleString('en-US', { minimumFractionDigits: c.d, maximumFractionDigits: c.d });
    return c.u === 'T' ? '$' + s + 'T' : c.u === 'B' ? '$' + s + 'B' : c.u === '%' ? s + '%' : s;
  }
  function scoreFrom(get) { var mz = 0; C.forEach(function (c) { mz += c.e * (get(c) - c.b) / (c.b * c.r * 1.85); }); return clamp(50 + 60 * mz / C.length, 3, 97); }
  (function () { var f = G('fed'), r = G('rrp'), t = G('tga'), now = Date.now(); for (var i = 0; i < 40; i++) { H.t.push(clockAt(now - (39 - i) * 2000)); H.fed.push(+f.h[i].toFixed(3)); H.net.push(+(f.h[i] - r.h[i] - t.h[i]).toFixed(3)); H.rrp.push(+r.h[i].toFixed(3)); H.tga.push(+t.h[i].toFixed(3)); H.sc.push(+scoreFrom(function (c) { return c.h[i]; }).toFixed(1)); } })();
  /* ---------- Tabel ---------- */
  function rowHtml(c) {
    return '<tr id="mlc-r-' + c.id + '"><td class="text-gray-500 font-mono" id="mlc-no-' + c.id + '"></td>' +
      '<td><div class="flex items-center gap-2"><div class="mlc-ic"><i class="fa-solid ' + c.ic + '"></i></div><div class="min-w-0"><div class="font-semibold text-white">' + c.n + '</div><div class="text-[10px] text-gray-500">' + c.s + '</div></div></div></td>' +
      '<td><span class="mlc-badge" style="' + (c.e > 0 ? 'background:rgba(52,211,153,.12);color:#34d399' : 'background:rgba(251,113,133,.12);color:#fb7185') + '">' + (c.e > 0 ? 'Sumber ▲' : 'Penyerap ▼') + '</span></td>' +
      '<td class="text-right"><b id="mlc-v-' + c.id + '" class="font-mono text-white"></b></td>' +
      '<td class="text-right font-mono" id="mlc-d-' + c.id + '"></td><td id="mlc-s-' + c.id + '"></td>' +
      '<td><span id="mlc-i-' + c.id + '" class="mlc-badge"></span></td>' +
      '<td><div class="mlc-cb"><i id="mlc-k-' + c.id + '"></i></div></td></tr>';
  }
  function sparkSvg(c, col) {
    var a = c.h, mn = Math.min.apply(null, a), mx = Math.max.apply(null, a), rg = (mx - mn) || 1, w = 90, h = 26;
    var pts = a.map(function (v, i) { return (i / (a.length - 1) * w).toFixed(1) + ',' + (h - 3 - (v - mn) / rg * (h - 6)).toFixed(1); }).join(' ');
    var ly = h - 3 - (a[a.length - 1] - mn) / rg * (h - 6);
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="90" height="26"><polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="' + w + '" cy="' + ly.toFixed(1) + '" r="2.4" fill="' + col + '"/></svg>';
  }
  function match(c) {
    return (st.f === 'all' || (c.e > 0 ? 'src' : 'sink') === st.f) && (!st.q || (c.n + ' ' + c.s).toLowerCase().indexOf(st.q) > -1);
  }
  function keyOf(c) { return st.sk === 'n' ? c.n : st.sk === 'e' ? c.e : st.sk === 'x' ? c.x : st.sk === 'd' ? c.dp : st.sk === 'k' ? c.k : c.i; }
  function layout() {
    var tb = $('mlc-tb'); if (!tb) return;
    var shown = C.filter(match).sort(function (p, q) { var A = keyOf(p), B = keyOf(q); return (A > B ? 1 : A < B ? -1 : 0) * st.sd; });
    C.forEach(function (c) { var r = $('mlc-r-' + c.id); if (r) r.style.display = match(c) ? '' : 'none'; });
    shown.forEach(function (c, i) { var r = $('mlc-r-' + c.id); if (r) { tb.appendChild(r); var n = $('mlc-no-' + c.id); if (n) n.textContent = i + 1; } });
    var el = $('mlc-cnt'); if (el) el.textContent = '· ' + shown.length + ' / ' + C.length + ' komponen';
    Array.prototype.forEach.call(document.querySelectorAll('#mlc-table thead th[data-k]'), function (th) {
      th.classList.remove('asc', 'desc');
      if (th.getAttribute('data-k') === st.sk) th.classList.add(st.sd > 0 ? 'asc' : 'desc');
    });
  }
  /* ---------- Panel lama (dipertahankan) ---------- */
  function pushAlert(txt, col) {
    alerts.unshift({ t: clock(), x: txt, c: col }); if (alerts.length > 8) alerts.pop();
    var el = $('mlc-alerts'); if (!el) return;
    el.innerHTML = alerts.map(function (a) { return '<div class="mlc-row"><span style="color:' + a.c + '">●</span><span class="text-gray-500 font-mono">' + a.t + '</span><span class="text-gray-200">' + a.x + '</span></div>'; }).join('');
  }
  var CORR = [['Bitcoin (BTC)', .72], ['S&P 500', .61], ['Emas', .38], ['DXY', -.55]].map(function (q) { return { n: q[0], b: q[1], v: q[1] }; });
  function corrRender() {
    var el = $('mlc-corr'); if (!el) return;
    el.innerHTML = CORR.map(function (q) {
      var a = Math.abs(q.v) * 50, col = q.v >= 0 ? '#34d399' : '#fb7185';
      return '<div class="mlc-row"><span class="text-gray-300" style="width:88px">' + q.n + '</span><div style="flex:1;height:6px;background:#1f1f1f;border-radius:4px;position:relative"><i style="position:absolute;top:0;height:100%;border-radius:4px;background:' + col + ';left:' + (q.v >= 0 ? 50 : 50 - a) + '%;width:' + a + '%;transition:all .5s"></i></div><b class="font-mono" style="width:42px;text-align:right;color:' + col + '">' + (q.v >= 0 ? '+' : '') + q.v.toFixed(2) + '</b></div>';
    }).join('');
  }
  var EV = [['FOMC (The Fed)', 18, 'fa-building-columns'], ['ECB', 11, 'fa-euro-sign'], ['BoJ', 25, 'fa-yen-sign'], ['BoE', 32, 'fa-sterling-sign']].map(function (q) { return { n: q[0], t: Date.now() + q[1] * 864e5 + rnd(0, 6) * 36e5, ic: q[2] }; });
  function calRender() {
    var el = $('mlc-cal'); if (!el) return;
    el.innerHTML = EV.map(function (q) {
      var s = Math.max(0, ((q.t - Date.now()) / 1000) | 0), d = (s / 86400) | 0, h = ((s % 86400) / 3600) | 0, m = ((s % 3600) / 60) | 0;
      return '<div class="mlc-row"><i class="fa-solid ' + q.ic + ' text-brand-accent" style="width:16px"></i><span class="text-gray-200" style="flex:1">' + q.n + '</span><b class="font-mono text-white">' + d + ' hr ' + pad(h) + ':' + pad(m) + ':' + pad(s % 60) + '</b></div>';
    }).join('');
  }
  function gauge() {
    var cv = $('mlc-gauge'); if (!cv) return;
    var g = cv.getContext('2d'), w = cv.width, h = cv.height, cx = w / 2, cy = h - 16, R = Math.min(cx - 14, h - 30), PI = Math.PI;
    g.clearRect(0, 0, w, h); g.lineCap = 'butt';
    [['#fb7185', 0, .33], ['#fbbf24', .33, .66], ['#34d399', .66, 1]].forEach(function (s) {
      g.beginPath(); g.arc(cx, cy, R, PI * (1 + s[1]), PI * (1 + s[2])); g.lineWidth = 14; g.strokeStyle = s[0]; g.globalAlpha = .85; g.stroke();
    });
    g.globalAlpha = 1;
    var a = PI * (1 + st.shown / 100);
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (R - 8), cy + Math.sin(a) * (R - 8)); g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round'; g.stroke();
    g.beginPath(); g.arc(cx, cy, 6, 0, 6.2832); g.fillStyle = '#fff'; g.fill();
    g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '800 24px Inter, sans-serif'; g.fillText(Math.round(st.shown), cx, cy - R * .38);
    g.fillStyle = '#6b7280'; g.font = '10px Inter, sans-serif'; g.textAlign = 'left'; g.fillText('0', cx - R - 4, cy + 12); g.textAlign = 'right'; g.fillText('100', cx + R + 4, cy + 12);
  }
  /* ---------- Peta Panas Skor Likuiditas (kohort x horizon, segitiga seperti cohort heat map) ---------- */
  var HM = { mode: 'd', R: 10, C: 10 };
  var HMS = [[-1, [215, 48, 39]], [-.6, [244, 109, 67]], [-.25, [253, 190, 120]], [0, [254, 250, 180]], [.25, [200, 230, 130]], [.6, [102, 189, 99]], [1, [26, 152, 80]]];
  function hmColor(t) {
    t = clamp(t, -1, 1);
    for (var i = 1; i < HMS.length; i++) {
      if (t <= HMS[i][0]) {
        var a = HMS[i - 1], b = HMS[i], f = (t - a[0]) / (b[0] - a[0]);
        return 'rgb(' + [0, 1, 2].map(function (k) { return Math.round(a[1][k] + (b[1][k] - a[1][k]) * f); }).join(',') + ')';
      }
    }
    return 'rgb(26,152,80)';
  }
  function hmFmt(v, d) { var a = Math.abs(v); return d ? (a >= 10 ? Math.round(v) + '' : v.toFixed(1)) : Math.round(v) + ''; }
  function hmRender() {
    var el = $('mlc-hm'); if (!el) return;
    var sc = H.sc, n = sc.length, R = HM.R, C = HM.C, d = HM.mode === 'd', i, k;
    if (n < R + 2) return;
    var rows = [], mx = 1.5, sum = 0, cnt = 0, pos = 0;
    for (i = 0; i < R; i++) {
      var s = n - 1 - (R - i), avail = Math.min(C, n - 1 - s), cells = [];
      for (k = 1; k <= C; k++) {
        if (k > avail) { cells.push(null); continue; }
        var v = d ? sc[s + k] - sc[s] : sc[s + k];
        cells.push(v); sum += v; cnt++;
        if (d) { mx = Math.max(mx, Math.abs(v)); if (v > 0) pos++; } else if (v >= 62) pos++;
      }
      rows.push({ t: H.t[s], b: sc[s], c: cells, s: s });
    }
    var out = '<div class="h" style="text-align:left">KOHORT</div><div class="h">AWAL</div>';
    for (k = 1; k <= C; k++) out += '<div class="h">' + k + '</div>';
    rows.forEach(function (r) {
      out += '<div class="l">' + r.t + '</div><div class="l" style="text-align:center">' + r.b.toFixed(0) + '</div>';
      r.c.forEach(function (v, j) {
        if (v === null) { out += '<div class="e"></div>'; return; }
        var col = hmColor(d ? v / mx : (v - 50) / 20);
        var tip = 'Kohort ' + r.t + ' (skor ' + r.b.toFixed(1) + ') → +' + (j + 1) + ' langkah: ' + (d ? (v >= 0 ? '+' : '') + v.toFixed(2) + ' poin' : 'skor ' + v.toFixed(1));
        out += '<div class="c" style="background:' + col + '" title="' + tip + '">' + hmFmt(v, d) + '</div>';
      });
    });
    el.innerHTML = out;
    var q;
    if ((q = $('mlc-hm-l1'))) q.textContent = d ? '▼ −' + mx.toFixed(1) + ' poin' : 'KETAT (≤30)';
    if ((q = $('mlc-hm-l2'))) q.textContent = d ? '0' : '50';
    if ((q = $('mlc-hm-l3'))) q.textContent = d ? '+' + mx.toFixed(1) + ' poin ▲' : 'EKSPANSIF (≥70)';
    if ((q = $('mlc-hm-sub'))) q.textContent = d ? 'Δ skor vs kohort awal · baris = waktu mulai, kolom = langkah ke depan' : 'Skor absolut pada tiap langkah · baris = waktu mulai, kolom = langkah ke depan';
    if ((q = $('mlc-hm-sum'))) {
      var avg = cnt ? sum / cnt : 0;
      q.innerHTML = d
        ? 'Sel naik: <b class="text-emerald-400">' + Math.round(pos / cnt * 100) + '%</b> · Rata-rata Δ: <b class="' + (avg >= 0 ? 'text-emerald-400' : 'text-rose-400') + '">' + (avg >= 0 ? '+' : '') + avg.toFixed(2) + '</b> poin'
        : 'Sel zona ekspansif: <b class="text-emerald-400">' + Math.round(pos / cnt * 100) + '%</b> · Rata-rata skor: <b class="text-white">' + avg.toFixed(1) + '</b>';
    }
  }
  function hmWire() {
    [['mlc-hm-d', 'd'], ['mlc-hm-v', 'v']].forEach(function (z) {
      var b = $(z[0]); if (!b) return;
      b.onclick = function () {
        HM.mode = z[1];
        $('mlc-hm-d').classList.toggle('on', z[1] === 'd'); $('mlc-hm-v').classList.toggle('on', z[1] === 'v');
        hmRender();
      };
    });
  }
  /* ---------- Grafik canvas v2 (otomatis via rAF, mengikuti tema) ---------- */
  function mkCharts() {
    if (CH.made) return; var K = window.__proKit; if (!K) return; CH.made = true;
    var T = K.T, Tw = K.Tw, tag = K.tag, tip = K.tip, hline = K.hline, vline = K.vline, hgrid = K.hgrid, dot = K.dot, tri = K.tri, sma = K.sma, ema = K.ema, lerp = K.lerp, TAU = 6.2832;
    ['mlc-ch-net', 'mlc-ch-imp', 'mlc-ch-sc'].forEach(function (id) { var cv = $(id); if (!cv) return; cv.style.cssText = 'display:block;width:100%;height:100%'; cv.parentNode.style.height = '300px'; });
    var cap = function (s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; };
    /* ---- Helper desain grafik profesional (lokal) ---- */
    var MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
    var ra = function (hex, a) { var v = parseInt(hex.slice(1), 16); return 'rgba(' + (v >> 16 & 255) + ',' + (v >> 8 & 255) + ',' + (v & 255) + ',' + a + ')'; };
    var rr = function (c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    var fx = function (v, d) { return K.fmt ? K.fmt(v, d) : v.toFixed(d); };
    function swatch(c, x, y, col, kind) {
      if (kind === 'box') { rr(c, x, y - 4, 8, 8, 2); c.fillStyle = ra(col, .55); c.fill(); c.strokeStyle = col; c.lineWidth = 1; c.stroke(); return x + 12; }
      c.save(); c.strokeStyle = col; c.lineWidth = kind === 'bold' ? 2.2 : 1.5; if (kind === 'dash') c.setLineDash([3, 2]); c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 11, y); c.stroke(); c.restore(); return x + 15;
    }
    function legend(c, x, y, col, kind, label, val, vcol, P) {
      x = swatch(c, x, y, col, kind); x = K.Tw(c, label, x, y, P.mu, 8, 600) - 4; return K.Tw(c, val, x, y, vcol || P.tx, 8, 700) + 6;
    }
    function card(c, w, x, y0, title, rows, P) {
      c.font = '600 8px ' + MONO; var bw = c.measureText(title).width + 8;
      rows.forEach(function (r) { bw = Math.max(bw, c.measureText(r[0]).width + c.measureText(r[1]).width + 30); });
      bw += 12; var bh = 21 + rows.length * 12, bx = x + 12 + bw > w - 2 ? x - 12 - bw : x + 12;
      c.save(); c.shadowColor = 'rgba(0,0,0,' + (P.l ? .16 : .55) + ')'; c.shadowBlur = 12; c.shadowOffsetY = 3; rr(c, bx, y0, bw, bh, 6); c.fillStyle = P.l ? 'rgba(255,255,255,.98)' : 'rgba(10,12,18,.96)'; c.fill(); c.restore();
      rr(c, bx + .5, y0 + .5, bw - 1, bh - 1, 6); c.strokeStyle = P.l ? '#cbd5e1' : 'rgba(148,163,184,.30)'; c.lineWidth = 1; c.stroke();
      K.T(c, title, bx + 8, y0 + 9, P.mu, 'left', 8, 700); K.hline(c, bx + 6, bx + bw - 6, y0 + 17, P.gr);
      rows.forEach(function (r, i) { var y = y0 + 26 + i * 12; rr(c, bx + 8, y - 3, 6, 6, 1.5); c.fillStyle = r[2]; c.fill(); K.T(c, r[0], bx + 19, y, P.mu, 'left', 8, 600); K.T(c, r[1], bx + bw - 8, y, P.tx, 'right', 8, 700); });
    }
    function axisTag(c, t, x, y, col, P) { c.font = '700 8px ' + MONO; var tw = c.measureText(t).width + 8; rr(c, x, y - 6.5, tw, 13, 3); c.fillStyle = col; c.fill(); K.T(c, t, x + 4, y, P.l ? '#fff' : '#0b1220', 'left', 8, 700); }
    function timeTag(c, t, x, y, w, P) { c.font = '700 8px ' + MONO; var tw = c.measureText(t).width + 10, bx = clamp(x - tw / 2, 2, w - tw - 2); rr(c, bx, y - 6.5, tw, 13, 3); c.fillStyle = P.l ? '#334155' : '#e2e8f0'; c.fill(); K.T(c, t, bx + tw / 2, y, P.l ? '#fff' : '#0f172a', 'center', 8, 700); }
    function xAxis(c, X, n, L, R, y0, y1, P, TL) {
      for (var i = n - 1; i >= 0; i -= 10) { var x = X(i); if (x < L + 14) continue; c.save(); c.strokeStyle = P.gr; c.lineWidth = 1; c.beginPath(); c.moveTo(Math.round(x) + .5, y0); c.lineTo(Math.round(x) + .5, y0 + 3); c.stroke(); c.restore(); K.T(c, (TL || H.t)[i], x, y1, P.mu, 'center', 8); }
    }
    /* === 1. LIKUIDITAS BERSIH vs NERACA FED — AREA BERTUMPUK harian: Bersih + TGA + RRP = Neraca Fed, panel Δ harian === */
    K.host('mlc-ch-net', function (c, w, h, now, s, P) {
      var MM = window.__MLC || {}, Dd = (MM.D && MM.D.t && MM.D.t.length >= 10) ? MM.D : H, daily = Dd !== H;
      var net = Dd.net, fed = Dd.fed, rrp = Dd.rrp || [], tga = Dd.tga || [], lab = Dd.t, n = net.length; if (n < 3) return;
      var cF = P.l ? '#2563EB' : '#60A5FA', cN = P.l ? '#0891B2' : '#22D3EE', cT = P.l ? '#d97706' : '#FBBF24', cR = P.l ? '#7c3aed' : '#A78BFA';
      var L = 10, R = w - 44, a = 38, b = Math.round(h * .66), m0 = b + 22, m1 = h - 22, slot = (R - L) / (n - 1), i, mn = 1e9, mx = -1e9;
      var X = function (k) { return L + k * slot; };
      for (i = 0; i < n; i++) { mn = Math.min(mn, net[i]); mx = Math.max(mx, fed[i]); }
      var pd = (mx - mn) * .12 + .004, rg = K.lerp(s, 'r', mn - pd, mx + pd, .12); mn = rg.mn; mx = rg.mx;
      var Y = function (v) { return b - (v - mn) / (mx - mn) * (b - a); };
      var cn = net[n - 1], cf = fed[n - 1], dr = cf - cn, d0 = cn - net[0], dp = d0 / net[0] * 100, d1 = cn - net[n - 2];
      /* legenda 2 baris + penanda mode */
      var lx = legend(c, L, 9, cN, 'bold', 'LIKUIDITAS BERSIH', fx(cn, 3) + 'T', cN, P);
      K.T(c, (d1 >= 0 ? '▲ +' : '▼ ') + d1.toFixed(3) + 'T ' + (daily ? '1H' : 'tick') + '  ·  ' + (d0 >= 0 ? '+' : '') + dp.toFixed(2) + '%', R + 40, 9, d1 >= 0 ? P.up : P.dn, 'right', 8, 700);
      lx = legend(c, L, 22, cF, 'line', 'NERACA FED', fx(cf, 3) + 'T', cF, P);
      lx = legend(c, lx, 22, cT, 'box', 'TGA', fx(tga[n - 1] || 0, 3), cT, P);
      legend(c, lx, 22, cR, 'box', 'RRP', fx(rrp[n - 1] || 0, 3), cR, P);
      K.T(c, daily ? 'HARIAN · FRED' : 'LIVE', R + 40, 22, daily ? P.up : cT, 'right', 8, 700);
      /* area plot */
      rr(c, L, a, R - L, b - a, 4); c.fillStyle = P.bg; c.fill();
      K.hgrid(c, L, R, a, b, mn, mx, P, 2, 4);
      c.save(); rr(c, L, a, R - L, b - a, 4); c.clip();
      /* pita bertumpuk: TGA di atas Bersih, RRP di atas TGA (puncak = Neraca Fed) */
      var band = function (lo, hi, col) { c.beginPath(); for (i = 0; i < n; i++) i ? c.lineTo(X(i), Y(hi(i))) : c.moveTo(X(i), Y(hi(i))); for (i = n - 1; i >= 0; i--) c.lineTo(X(i), Y(lo(i))); c.closePath(); c.fillStyle = col; c.fill(); };
      band(function (k) { return net[k] + (tga[k] || 0); }, function (k) { return fed[k]; }, ra(cR, P.l ? .30 : .42));
      band(function (k) { return net[k]; }, function (k) { return net[k] + (tga[k] || 0); }, ra(cT, P.l ? .30 : .38));
      var g = c.createLinearGradient(0, a, 0, b); g.addColorStop(0, ra(cN, P.l ? .34 : .42)); g.addColorStop(1, ra(cN, .04));
      c.beginPath(); for (i = 0; i < n; i++) i ? c.lineTo(X(i), Y(net[i])) : c.moveTo(X(i), Y(net[i])); c.lineTo(X(n - 1), b); c.lineTo(X(0), b); c.closePath(); c.fillStyle = g; c.fill();
      /* garis Fed (puncak tumpukan) */
      c.lineWidth = 1.5; c.strokeStyle = cF; c.beginPath(); for (i = 0; i < n; i++) i ? c.lineTo(X(i), Y(fed[i])) : c.moveTo(X(i), Y(fed[i])); c.stroke();
      /* garis Net */
      c.shadowColor = cN; c.shadowBlur = P.l ? 0 : 7; c.lineWidth = 2.2; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = cN; c.beginPath(); for (i = 0; i < n; i++) i ? c.lineTo(X(i), Y(net[i])) : c.moveTo(X(i), Y(net[i])); c.stroke(); c.shadowBlur = 0;
      c.restore();
      /* garis nilai terakhir + tag sumbu kanan */
      [[cn, cN], [cf, cF]].forEach(function (z) { K.hline(c, X(n - 1), R, Y(z[0]), ra(z[1], .7), [3, 3]); });
      var yn = Y(cn), yf = Y(cf); if (yn - yf < 14) yn = yf + 14;
      K.dot(c, X(n - 1), Y(cn), cN, now); axisTag(c, cn.toFixed(2), R + 2, yn, cN, P); axisTag(c, cf.toFixed(2), R + 2, yf, cF, P);
      /* panel Δ harian likuiditas bersih (batang naik/turun dari garis nol) */
      K.T(c, daily ? 'Δ HARIAN LIKUIDITAS BERSIH ($T)' : 'Δ PER TICK LIKUIDITAS BERSIH ($T)', L + 1, m0 - 7, P.mu, 'left', 7, 700);
      var dl = [], dm = .001; for (i = 0; i < n; i++) { dl.push(i ? net[i] - net[i - 1] : 0); dm = Math.max(dm, Math.abs(dl[i])); } dm *= 1.15;
      var zy = (m0 + m1) / 2, hh = (m1 - m0) / 2, bw = Math.max(1.6, slot * .66);
      K.hline(c, L, R, zy, P.gr);
      for (i = 1; i < n; i++) { var vh = Math.abs(dl[i]) / dm * hh; c.fillStyle = ra(dl[i] >= 0 ? (P.l ? '#059669' : '#34D399') : (P.l ? '#e11d48' : '#FB7185'), .85); c.fillRect(X(i) - bw / 2, dl[i] >= 0 ? zy - vh : zy, bw, Math.max(.6, vh)); }
      xAxis(c, X, n, L, R, m1, h - 7, P, lab);
      /* crosshair */
      if (s.mx >= L && s.mx <= R) {
        var k = clamp(Math.round((s.mx - L) / slot), 0, n - 1), x = X(k), dk = net[k] - (k ? net[k - 1] : net[k]);
        K.vline(c, x, a, m1, P);
        if (s.my >= a && s.my <= b) { K.hline(c, L, R, s.my, P.mu, [3, 3]); axisTag(c, (mn + (b - s.my) / (b - a) * (mx - mn)).toFixed(3), R + 2, s.my, P.l ? '#334155' : '#e2e8f0', P); }
        [[net[k], cN], [fed[k], cF]].forEach(function (z) { c.beginPath(); c.arc(x, Y(z[0]), 3.4, 0, TAU); c.fillStyle = z[1]; c.fill(); c.lineWidth = 1.5; c.strokeStyle = P.l ? '#fff' : '#0b1220'; c.stroke(); });
        timeTag(c, lab[k], x, h - 7, w, P);
        card(c, w, x, a + 4, lab[k], [['Neraca Fed', fx(fed[k], 3) + 'T', cF], ['Likuiditas Bersih', fx(net[k], 3) + 'T', cN], ['TGA', fx(tga[k] || 0, 3) + 'T', cT], ['RRP', fx(rrp[k] || 0, 3) + 'T', cR], [daily ? 'Δ harian' : 'Δ / tick', (dk >= 0 ? '+' : '') + dk.toFixed(4), dk >= 0 ? P.up : P.dn]], P);
      }
    });
    /* === 2. Kontribusi per komponen: bar diverging beranimasi, diurutkan live, penanda EMA lambat, total impuls === */
    var cs = {};
    K.host('mlc-ch-imp', function (c, w, h, now, s, P) {
      var rows = C.map(function (x) { var v = clamp(x.k, -1, 1), q = cs[x.id] || (cs[x.id] = { v: v, g: v, y: -1 }); q.v += (v - q.v) * .14; q.g += (v - q.g) * .02; return { x: x, q: q }; }).sort(function (p, q) { return q.q.v - p.q.v; });
      var LN = Math.min(118, w * .36), zl = LN + 4, zr = w - 46, zx = (zl + zr) / 2, half = (zr - zl) / 2, top = 26, bot = h - 30, rh = (bot - top) / rows.length, i, pos = 0, neg = 0;
      T(c, '◄ MENYERAP', zx - 6, 8, P.dn, 'right', 8, 700); T(c, 'MENAMBAH ►', zx + 6, 8, P.up, 'left', 8, 700);
      [-1, -.5, 0, .5, 1].forEach(function (g) { var x = zx + g * half; c.save(); c.strokeStyle = g === 0 ? P.mu : P.gr; c.lineWidth = 1; c.beginPath(); c.moveTo(Math.round(x) + .5, top - 4); c.lineTo(Math.round(x) + .5, bot + 2); c.stroke(); c.restore(); T(c, (g > 0 ? '+' : '') + g, x, bot + 9, P.mu, 'center', 7); });
      var hy = -1; if (s.my >= top && s.my < bot && s.mx >= 0) hy = Math.floor((s.my - top) / rh);
      rows.forEach(function (r, k) {
        var x = r.x, q = r.q, ty = top + k * rh, y; if (q.y < 0) q.y = ty; q.y += (ty - q.y) * .2; y = q.y;
        var col = q.v > .02 ? P.up : q.v < -.02 ? P.dn : P.mu, bh = Math.max(6, rh - 6), bx = zx, bwid = q.v * half;
        if (k === hy) { c.fillStyle = 'rgba(56,189,248,.09)'; c.fillRect(0, y, w, rh); }
        c.fillStyle = x.e > 0 ? P.up : P.dn; c.fillRect(2, y + rh / 2 - 3, 3, 6); T(c, cap(x.n.replace(/ \(.*\)/, ''), Math.floor((LN - 10) / 4.9)), 9, y + rh / 2, P.tx, 'left', 8, 600);
        var gr = c.createLinearGradient(bx, 0, bx + bwid, 0); gr.addColorStop(0, col + '33'); gr.addColorStop(1, col);
        c.shadowColor = col; c.shadowBlur = P.l ? 0 : 5; c.fillStyle = gr; c.fillRect(Math.min(bx, bx + bwid), y + (rh - bh) / 2, Math.max(1.5, Math.abs(bwid)), bh); c.shadowBlur = 0;
        var gx = zx + q.g * half; c.fillStyle = P.tx; c.globalAlpha = .55; c.fillRect(gx - .5, y + (rh - bh) / 2 - 2, 1.5, bh + 4); c.globalAlpha = 1;
        T(c, (q.v > 0 ? '+' : '') + q.v.toFixed(2), w - 3, y + rh / 2, col, 'right', 8, 700);
        if (q.v > 0) pos += q.v; else neg -= q.v;
        if (k === hy) tip(c, w, Math.min(zx, w - 120), [[x.n, P.tx], [x.s, P.mu], [(x.e > 0 ? 'Sumber likuiditas' : 'Penyerap likuiditas') + ' · ' + (q.v > 0 ? '+' : '') + q.v.toFixed(2), col]], P);
      });
      var tot = pos - neg, sh = pos + neg > 0 ? pos / (pos + neg) : .5, by = h - 11, bl = LN, bw2 = zr - bl;
      T(c, 'IMPULS BERSIH', 2, by, P.mu, 'left', 8, 700); c.fillStyle = P.dn; c.fillRect(bl + 20, by - 3, bw2 - 20, 6); c.fillStyle = P.up; c.fillRect(bl + 20, by - 3, (bw2 - 20) * sh, 6);
      T(c, (tot >= 0 ? '+' : '') + tot.toFixed(2), w - 3, by, tot >= 0 ? P.up : P.dn, 'right', 9, 700);
    });
    /* === 3. RIWAYAT SKOR KOMPOSIT — pita rezim, garis berwarna per rezim, batas putus-putus, strip rezim & distribusi === */
    K.host('mlc-ch-sc', function (c, w, h, now, s, P) {
      var sc = H.sc, n = sc.length; if (n < 3) return;
      var cE = P.up, cA = P.l ? '#d97706' : '#FBBF24', cK = P.dn;
      var L = 10, R = w - 36, a = 44, b = h - 46, sy = b + 6, slot = (R - L) / (n - 1), i, X = function (k) { return L + k * slot; }, Y = function (v) { return b - v / 100 * (b - a); };
      var rgm = function (v) { return v >= 62 ? ['EKSPANSIF', cE] : v <= 38 ? ['KETAT', cK] : ['NETRAL', cA]; };
      var cur = sc[n - 1], rc = rgm(cur), d0 = cur - sc[0], av = sc.reduce(function (p, q) { return p + q; }, 0) / n, em = K.ema(sc, 8);
      /* header: skor besar + pil rezim */
      K.T(c, cur.toFixed(1), L, 13, rc[1], 'left', 15, 700); var tx = L + c.measureText(cur.toFixed(1)).width + 8;
      c.font = '700 8px ' + MONO; var pw = c.measureText(rc[0]).width + 12; rr(c, tx, 6, pw, 15, 7.5); c.fillStyle = ra(rc[1], .16); c.fill(); c.strokeStyle = ra(rc[1], .55); c.lineWidth = 1; c.stroke(); K.T(c, rc[0], tx + pw / 2, 13.5, rc[1], 'center', 8, 700);
      K.T(c, (d0 >= 0 ? '▲ +' : '▼ ') + d0.toFixed(1) + ' poin', R + 34, 13, d0 >= 0 ? P.up : P.dn, 'right', 8, 700);
      var lx = legend(c, L, 31, rc[1], 'bold', 'SKOR', '', P.tx, P); lx = legend(c, lx - 4, 31, P.tx, 'dash', 'EMA8', em[n - 1].toFixed(1), P.tx, P); legend(c, lx, 31, P.mu, 'dash', 'RATA2', av.toFixed(1), P.mu, P);
      /* pita rezim */
      c.save(); rr(c, L, a, R - L, b - a, 4); c.clip();
      c.fillStyle = ra(cE, P.l ? .10 : .09); c.fillRect(L, Y(100), R - L, Y(62) - Y(100));
      c.fillStyle = ra(cA, P.l ? .05 : .035); c.fillRect(L, Y(62), R - L, Y(38) - Y(62));
      c.fillStyle = ra(cK, P.l ? .10 : .09); c.fillRect(L, Y(38), R - L, Y(0) - Y(38));
      c.restore();
      [0, 25, 50, 75, 100].forEach(function (v) { K.hline(c, L, R, Y(v), P.gr); K.T(c, v + '', R + 4, Y(v), P.mu, 'left', 8); });
      K.T(c, 'EKSPANSIF', L + 5, Y(100) + 8, ra(cE, .9), 'left', 7, 700); K.T(c, 'NETRAL', L + 5, Y(50), ra(cA, .9), 'left', 7, 700); K.T(c, 'KETAT', L + 5, Y(0) - 8, ra(cK, .9), 'left', 7, 700);
      /* garis batas rezim (putus-putus) */
      K.hline(c, L, R, Y(62), cE, [5, 4]); K.hline(c, L, R, Y(38), cK, [5, 4]);
      var yc0 = Y(cur); if (Math.abs(yc0 - Y(62)) > 13) axisTag(c, '62', R + 2, Y(62) - 1, cE, P); if (Math.abs(yc0 - Y(38)) > 13) axisTag(c, '38', R + 2, Y(38) + 1, cK, P);
      /* area + garis berwarna per rezim */
      c.save(); c.beginPath(); c.rect(L, a, R - L, b - a); c.clip();
      var g = c.createLinearGradient(0, a, 0, b); g.addColorStop(0, ra(rc[1], .30)); g.addColorStop(1, ra(rc[1], 0));
      c.beginPath(); for (i = 0; i < n; i++) i ? c.lineTo(X(i), Y(sc[i])) : c.moveTo(X(i), Y(sc[i])); c.lineTo(X(n - 1), b); c.lineTo(X(0), b); c.closePath(); c.fillStyle = g; c.fill();
      var o62 = clamp((Y(62) - a) / (b - a), 0, 1), o38 = clamp((Y(38) - a) / (b - a), 0, 1), gl = c.createLinearGradient(0, a, 0, b);
      gl.addColorStop(0, cE); gl.addColorStop(o62, cE); gl.addColorStop(Math.min(1, o62 + .001), cA); gl.addColorStop(o38, cA); gl.addColorStop(Math.min(1, o38 + .001), cK); gl.addColorStop(1, cK);
      c.setLineDash([2, 3]); c.lineWidth = 1; c.strokeStyle = P.tx; c.globalAlpha = .5; c.beginPath(); for (i = 0; i < n; i++) i ? c.lineTo(X(i), Y(em[i])) : c.moveTo(X(i), Y(em[i])); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
      c.shadowColor = rc[1]; c.shadowBlur = P.l ? 0 : 7; c.lineWidth = 2.2; c.lineCap = 'round'; c.strokeStyle = gl; c.beginPath(); for (i = 0; i < n; i++) i ? c.lineTo(X(i), Y(sc[i])) : c.moveTo(X(i), Y(sc[i])); c.stroke(); c.shadowBlur = 0;
      /* penanda lintas batas rezim */
      for (i = 1; i < n; i++) { var p = sc[i - 1], q = sc[i], th = (p < 62) !== (q < 62) ? 62 : (p > 38) !== (q > 38) ? 38 : 0; if (th) { var f = (th - p) / (q - p), mxp = X(i - 1) + f * slot; c.beginPath(); c.arc(mxp, Y(th), 3.2, 0, TAU); c.fillStyle = P.l ? '#fff' : '#0b1220'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = rgm(q)[1]; c.stroke(); } }
      c.restore();
      K.dot(c, X(n - 1), Y(cur), rc[1], now); axisTag(c, cur.toFixed(1), R + 2, clamp(Y(cur), a + 7, b - 7), rc[1], P);
      /* strip rezim */
      var cnt = { E: 0, A: 0, K: 0 };
      for (i = 0; i < n; i++) { var rv = rgm(sc[i]); rv[0] === 'EKSPANSIF' ? cnt.E++ : rv[0] === 'KETAT' ? cnt.K++ : cnt.A++; c.fillStyle = ra(rv[1], .9); c.fillRect(X(i) - slot / 2 + .3, sy, slot - .6, 6); }
      /* sumbu waktu + distribusi rezim */
      xAxis(c, X, n, L, R, sy + 6, sy + 18, P);
      var dx = L, dy = h - 7, pc = function (v) { return Math.round(v / n * 100) + '%'; };
      [['EKSPANSIF', cE, cnt.E], ['NETRAL', cA, cnt.A], ['KETAT', cK, cnt.K]].forEach(function (z) { dx = legend(c, dx, dy, z[1], 'box', z[0], pc(z[2]), z[1], P); });
      /* crosshair */
      if (s.mx >= L && s.mx <= R) {
        var k = clamp(Math.round((s.mx - L) / slot), 0, n - 1), x = X(k), r = rgm(sc[k]), dk = sc[k] - (k ? sc[k - 1] : sc[k]), nb = sc[k] >= 50 ? 62 : 38;
        K.vline(c, x, a, sy + 6, P);
        if (s.my >= a && s.my <= b) { K.hline(c, L, R, s.my, P.mu, [3, 3]); axisTag(c, ((b - s.my) / (b - a) * 100).toFixed(1), R + 2, s.my, P.l ? '#334155' : '#e2e8f0', P); }
        c.beginPath(); c.arc(x, Y(sc[k]), 3.6, 0, TAU); c.fillStyle = r[1]; c.fill(); c.lineWidth = 1.5; c.strokeStyle = P.l ? '#fff' : '#0b1220'; c.stroke();
        timeTag(c, H.t[k], x, sy + 18, w, P);
        card(c, w, x, a + 4, H.t[k], [['Skor', sc[k].toFixed(1), r[1]], ['Rezim', r[0], r[1]], ['EMA8', em[k].toFixed(1), P.mu], ['Δ / tick', (dk >= 0 ? '+' : '') + dk.toFixed(1), dk >= 0 ? P.up : P.dn], ['Jarak ke ' + nb, (sc[k] - nb >= 0 ? '+' : '') + (sc[k] - nb).toFixed(1), P.mu]], P);
      }
    });
  }
  function updCharts() { /* grafik canvas menggambar sendiri tiap frame (rAF) */ }
  /* ---------- Render & siklus otomatis ---------- */
  function render() {
    var el, nSrc = 0, nSink = 0, nNeu = 0;
    C.forEach(function (c) {
      var dp = (c.x / c.o - 1) * 100, dead = Math.abs(c.x - c.o) / c.o < c.r * .25, imp = dead ? 0 : c.e * (c.x > c.o ? 1 : -1);
      c.dp = dp; c.k = c.e * (c.x - c.b) / (c.b * c.r * 1.85);
      imp > 0 ? nSrc++ : imp < 0 ? nSink++ : nNeu++;
      var col = imp > 0 ? '#34d399' : imp < 0 ? '#fb7185' : '#94a3b8', v = $('mlc-v-' + c.id);
      if (v) { v.textContent = fm(c, c.x); v.classList.remove('mlc-fu', 'mlc-fd'); void v.offsetWidth; v.classList.add(c.x >= c.p ? 'mlc-fu' : 'mlc-fd'); }
      if ((el = $('mlc-d-' + c.id))) { el.textContent = (dp >= 0 ? '▲ +' : '▼ ') + dp.toFixed(2) + '%'; el.style.color = dp >= 0 ? '#34d399' : '#fb7185'; }
      if ((el = $('mlc-s-' + c.id))) el.innerHTML = sparkSvg(c, col);
      if ((el = $('mlc-i-' + c.id))) { el.textContent = imp > 0 ? 'Menambah' : imp < 0 ? 'Menyerap' : 'Netral'; el.style.color = col; el.style.background = col + '1f'; }
      if ((el = $('mlc-k-' + c.id))) { var w = clamp(c.k, -1, 1) * 50; el.style.background = col; el.style.left = (w >= 0 ? 50 : 50 + w) + '%'; el.style.width = Math.abs(w) + '%'; }
    });
    layout();
    if ((el = $('mlc-tf'))) el.innerHTML = 'Menambah likuiditas: <b class="text-emerald-400">' + nSrc + '</b> &nbsp;·&nbsp; Menyerap: <b class="text-rose-400">' + nSink + '</b> &nbsp;·&nbsp; Netral: <b class="text-gray-300">' + nNeu + '</b> &nbsp;·&nbsp; Klik judul kolom untuk mengurutkan';
    var fed = G('fed'), rrp = G('rrp'), tga = G('tga'), net = fed.x - rrp.x - tga.x, net0 = fed.o - rrp.o - tga.o, nd = (net / net0 - 1) * 100;
    if ((el = $('mlc-net'))) el.textContent = '$' + net.toFixed(3) + 'T';
    if ((el = $('mlc-netd'))) { el.textContent = (nd >= 0 ? '▲ +' : '▼ ') + nd.toFixed(2) + '%'; el.style.color = nd >= 0 ? '#34d399' : '#fb7185'; }
    if ((el = $('mlc-bn'))) el.style.width = (net / fed.x * 100).toFixed(1) + '%';
    if ((el = $('mlc-bt'))) el.style.width = (tga.x / fed.x * 100).toFixed(1) + '%';
    if ((el = $('mlc-br'))) el.style.width = (rrp.x / fed.x * 100).toFixed(1) + '%';
    if ((el = $('mlc-g3'))) el.textContent = '$' + (fed.x + G('ecb').x + G('boj').x).toFixed(2) + 'T';
    st.score = scoreFrom(function (c) { return c.x; });
    var rg = st.score >= 62 ? ['EKSPANSIF', '#34d399', 'Kondisi likuiditas longgar — mendukung aset berisiko'] : st.score <= 38 ? ['KETAT', '#fb7185', 'Likuiditas mengetat — tekanan pada aset berisiko'] : ['NETRAL', '#fbbf24', 'Sumber & penyerap likuiditas relatif seimbang'];
    if ((el = $('mlc-regime'))) { el.textContent = rg[0]; el.style.color = rg[1]; }
    if ((el = $('mlc-regime-d'))) el.textContent = rg[2];
    if (st.reg && st.reg !== rg[0]) pushAlert('Rezim likuiditas berubah menjadi <b style="color:' + rg[1] + '">' + rg[0] + '</b>', rg[1]);
    st.reg = rg[0];
    CORR.forEach(function (q) { q.v = clamp(q.v + rnd(-.025, .025) + (q.b - q.v) * .1, -.95, .95); });
    corrRender();
    if ((el = $('mlc-upd'))) el.textContent = 'Update ' + clock();
    H.t.push(clock()); H.net.push(+net.toFixed(3)); H.fed.push(+fed.x.toFixed(3)); H.sc.push(+st.score.toFixed(1)); H.rrp.push(+rrp.x.toFixed(3)); H.tga.push(+tga.x.toFixed(3));
    if (H.t.length > 60) { H.t.shift(); H.net.shift(); H.fed.shift(); H.sc.shift(); H.rrp.shift(); H.tga.shift(); }
    safe(hmRender)();
    if (vis()) { mkCharts(); updCharts(); }
  }
  function tick() {
    var fired = false;
    C.forEach(function (c) {
      step(c); c.h.push(c.x); c.h.shift();
      if (!fired && Math.abs(c.x - c.p) / c.b > c.r * .92) {
        fired = true; var up = c.x > c.p, ip = c.e * (up ? 1 : -1);
        pushAlert(c.n + ' ' + (up ? 'naik' : 'turun') + ' ke ' + fm(c, c.x) + ' → ' + (ip > 0 ? 'menambah' : 'menyerap') + ' likuiditas', ip > 0 ? '#34d399' : '#fb7185');
      }
    });
    render();
  }
  function exportCsv() {
    var rows = [['Komponen', 'Sumber', 'Jenis', 'Nilai', 'Delta sesi (%)', 'Kontribusi']];
    C.forEach(function (c) { rows.push([c.n, c.s, c.e > 0 ? 'Sumber' : 'Penyerap', fm(c, c.x), c.dp.toFixed(3), c.k.toFixed(3)]); });
    var txt = rows.map(function (r) { return r.map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv' })); a.download = 'komponen-likuiditas-makro.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }
  function wire() {
    var tb = $('mlc-tb'); if (tb) tb.innerHTML = C.map(rowHtml).join('');
    Array.prototype.forEach.call(document.querySelectorAll('#mlc-table thead th[data-k]'), function (th) {
      th.onclick = function () { var k = th.getAttribute('data-k'); if (st.sk === k) st.sd = -st.sd; else { st.sk = k; st.sd = 1; } layout(); };
    });
    var q = $('mlc-q'); if (q) q.oninput = function () { st.q = q.value.trim().toLowerCase(); layout(); };
    var cv = $('mlc-csv'); if (cv) cv.onclick = exportCsv;
    var f = $('mlc-filter'); if (f) Array.prototype.forEach.call(f.children, function (b) {
      b.onclick = function () { st.f = b.getAttribute('data-f'); Array.prototype.forEach.call(f.children, function (x) { x.classList.remove('on'); }); b.classList.add('on'); layout(); };
    });
    var iv = $('mlc-ivs'); if (iv) Array.prototype.forEach.call(iv.children, function (b) {
      b.onclick = function () { st.iv = +b.getAttribute('data-iv'); Array.prototype.forEach.call(iv.children, function (x) { x.classList.remove('on'); }); b.classList.add('on'); };
    });
    var p = $('mlc-pause'); if (p) p.onclick = function () {
      st.paused = !st.paused; p.innerHTML = st.paused ? '<i class="fa-solid fa-play"></i> Lanjut' : '<i class="fa-solid fa-pause"></i> Jeda'; p.classList.toggle('on', st.paused);
    };
  }
  function loop() { if (!st.paused && vis()) safe(tick)(); setTimeout(loop, st.iv); }
  function start() {
    safe(wire)(); safe(hmWire)(); safe(function () { render(); calRender(); gauge(); })();
    pushAlert('Monitor komponen likuiditas aktif — nilai dasar data resmi per 2 Okt 2026', '#38BDF8');
    loop();
    setInterval(safe(function () { if (vis()) { st.shown += (st.score - st.shown) * .15; gauge(); } }), 60);
    setInterval(safe(function () { if (vis()) calRender(); }), 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
  else setTimeout(start, 0);
})();
