/* ============================================================
   LIVE MODULE — INDEKS LIKUIDITAS & KOMPOSIT PASAR GLOBAL (PRO)
   Grafik garis multi-pasar (basis 100) bergaya infografis: Jepang, Inggris, Eropa, China, AS, India
   + garis komposit, area gradien pada pasar teratas, label ujung kanan, anotasi peristiwa otomatis.
   Data: Yahoo Finance (rute proxy bertahap lewat window.__baFetch), diperbarui tiap 60 detik.
   Jika semua rute gagal: data simulasi ditandai jelas "SIMULASI" lalu dicoba ulang otomatis.
   Hanya menyentuh elemen #globalMarketChart dan #liq-*.
   ============================================================ */
(function () {
  'use strict';
  if (window.__liveGlobalLiquidity) return;
  window.__liveGlobalLiquidity = true;
  var W = window, D = document, enc = encodeURIComponent, PAGE = 'page-global-market';
  var MK = [
    { name: 'Jepang',  lab: 'JEPANG',  sym: '^N225',     col: '#34d399', w: 1.8 },
    { name: 'Inggris', lab: 'INGGRIS', sym: '^FTSE',     col: '#3b9cff', w: 1.8 },
    { name: 'Eropa',   lab: 'EROPA',   sym: '^STOXX50E', col: '#b79cff', w: 2.4 },
    { name: 'China',   lab: 'CHINA',   sym: '000001.SS', col: '#ff8a2a', w: 2.6 },
    { name: 'AS',      lab: 'AS',      sym: '^GSPC',     col: '#19e6d0', w: 3.2 },
    { name: 'India',   lab: 'INDIA',   sym: '^NSEI',     col: '#7fcf86', w: 1.8 },
    { name: 'Hong Kong', lab: 'HONG KONG', sym: '^HSI',    col: '#ef4444', w: 1.6 },
    { name: 'Korea',   lab: 'KOREA',   sym: '^KS11',     col: '#eab308', w: 1.6 },
    { name: 'Taiwan',  lab: 'TAIWAN',  sym: '^TWII',     col: '#d946ef', w: 1.6 },
    { name: 'Singapura', lab: 'SINGAPURA', sym: '^STI',  col: '#a3e635', w: 1.6 },
    { name: 'Indonesia', lab: 'INDONESIA', sym: '^JKSE', col: '#f472b6', w: 1.6 },
    { name: 'Jerman',  lab: 'JERMAN',  sym: '^GDAXI',    col: '#94a3b8', w: 1.6 },
    { name: 'Prancis', lab: 'PRANCIS', sym: '^FCHI',     col: '#0ea5e9', w: 1.6 },
    { name: 'Australia', lab: 'AUSTRALIA', sym: '^AXJO', col: '#c2a878', w: 1.6 }
  ];
  var NM = MK.length, CI = NM, CORE = 6, PS = 7;                       /* indeks dataset komposit = 6 */
  var RG = [['1B', '1mo', 22], ['3B', '3mo', 64], ['6B', '6mo', 127], ['1T', '1y', 252]];
  var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
  var st = { rg: 1, mode: 'line', paused: false, vis: MK.map(function (_, i) { return i < CORE; }).concat([true]), pg: 0, hl: null };
  var $ = function (id) { return D.getElementById(id); };
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  var visible = function () { var p = $(PAGE); return !!p && p.classList.contains('active') && !D.hidden; };
  var safe = function (f) { return function () { try { return f.apply(null, arguments); } catch (e) { console.warn('[liquidity]', e); } }; };
  var sg = function (v, d) { return (v >= 0 ? '+' : '') + v.toFixed(d); };
  var light = function () { return D.documentElement.classList.contains('light'); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };

  /* ---------- pengambilan data online ---------- */
  var R = [
    function (u) { return W.__BA_PROXY ? '/api/proxy?url=' + enc(u) : null; },
    function (u) { return u; },
    function (u) { return u.replace('query1.', 'query2.'); },
    function (u) { return 'https://api.codetabs.com/v1/proxy?quest=' + enc(u); },
    function (u) { return 'https://corsproxy.io/?' + enc(u); }
  ];
  function get(u) {
    if (W.__baFetch) return W.__baFetch(R, u, false, 8000);
    return fetch(u).then(function (r) { if (!r.ok) throw 0; return r.json(); });
  }
  function iso(ts) { return new Date(ts * 1000).toISOString().slice(0, 10); }
  function pull(m, rg) {
    return pull0(m, rg).catch(function (e) { var h = W.__dailyHist && W.__dailyHist(m.sym, rg); if (h) return h; throw e; });
  }
  function pull0(m, rg) {
    return get('https://query1.finance.yahoo.com/v8/finance/chart/' + enc(m.sym) + '?range=' + rg + '&interval=1d').then(function (j) {
      var r = j.chart.result[0], ts = r.timestamp || [], cl = ((r.indicators.quote || [])[0] || {}).close || [], mt = r.meta || {}, out = [], i;
      for (i = 0; i < ts.length; i++) if (cl[i] != null && isFinite(cl[i])) out.push([iso(ts[i]), cl[i]]);
      if (out.length < 3) throw new Error('empty');
      var px = mt.regularMarketPrice, pt = mt.regularMarketTime;
      if (px && pt) { var k = iso(pt), L = out[out.length - 1]; if (L[0] === k) L[1] = px; else if (k > L[0]) out.push([k, px]); }
      return { pts: out, price: out[out.length - 1][1] };
    });
  }
  function build(res, src) {
    var set = {}, dates, ser, i0 = 0, k, i;
    res.forEach(function (r) { if (r) r.pts.forEach(function (p) { set[p[0]] = 1; }); });
    dates = Object.keys(set).sort();
    ser = MK.map(function (m, q) {
      var r = res[q]; if (!r) return null;
      var map = {}, out = [], last = null; r.pts.forEach(function (p) { map[p[0]] = p[1]; });
      dates.forEach(function (d) { if (map[d] != null) last = map[d]; out.push(last); });
      return out;
    });
    for (; i0 < dates.length; i0++) if (ser.every(function (s) { return !s || s[i0] != null; })) break;
    dates = dates.slice(i0);
    var px = res.map(function (r) { return r ? r.price : null; });
    ser = ser.map(function (s) { if (!s) return null; var b = s[i0]; return s.slice(i0).map(function (v) { return +(v / b * 100).toFixed(3); }); });
    var comp = dates.map(function (_, i) { var t = 0, n = 0; ser.forEach(function (s, q) { if (s && q < CORE) { t += s[i]; n++; } }); return +(t / n).toFixed(3); });
    return { dates: dates, s: ser, comp: comp, px: px, src: src, t: Date.now() };
  }
  function sim(n) {
    var dates = [], d = new Date(), res, k, i;
    while (dates.length < n) { d.setDate(d.getDate() - 1); if (d.getDay() % 6) dates.unshift(d.toISOString().slice(0, 10)); }
    res = MK.map(function (m) {
      var v = 100, o = [], dr = rnd(-.0004, .0012);
      for (i = 0; i < n; i++) { v *= 1 + dr + rnd(-.011, .011); o.push([dates[i], v * 100]); }
      return { pts: o, price: o[n - 1][1] };
    });
    return build(res, 'sim');
  }

  /* ---------- model & anotasi ---------- */
  var model = sim(RG[st.rg][2]), cache = {}, loading = false, heat = [], chart = null, lastK = 0;
  function dlab(s) { var p = s.split('-'); return +p[2] + ' ' + MON[+p[1] - 1]; }
  function leader() {
    var b = -1, v = -1e9; model.s.forEach(function (s, q) { if (s && s[s.length - 1] > v) { v = s[s.length - 1]; b = q; } }); return b;
  }
  function events() {
    var M = model, n = M.dates.length, mv = [], q, i, ev = [];
    for (q = 0; q < NM; q++) {
      var s = M.s[q]; if (!s || !st.vis[q]) continue; var bi = 1, br = 0;
      for (i = 1; i < n; i++) { var r = (s[i] / s[i - 1] - 1) * 100; if (Math.abs(r) > Math.abs(br)) { br = r; bi = i; } }
      mv.push({ q: q, i: bi, r: br });
    }
    mv.sort(function (a, b) { return Math.abs(b.r) - Math.abs(a.r); });
    if (mv[0]) {
      var e = mv[0], m = MK[e.q];
      ev.push({ i: e.i, q: e.q, col: m.col, v: M.s[e.q][e.i], title: dlab(M.dates[e.i]) + ' / ' + m.lab,
        text: (e.r >= 0 ? 'Melonjak ' : 'Anjlok ') + Math.abs(e.r).toFixed(1).replace('.', ',') + '% dalam sehari, pergerakan harian terbesar di antara bursa yang tampil pada periode ini.' });
    }
    var L = leader();
    if (L >= 0) {
      var s2 = M.s[L], pk = 0; for (i = 1; i < n; i++) if (s2[i] > s2[pk]) pk = i;
      var same = ev[0] && ev[0].q === L && Math.abs(ev[0].i - pk) < 3;
      if (!same) ev.push({ i: pk, q: L, col: MK[L].col, v: s2[pk], title: dlab(M.dates[pk]) + ' / ' + MK[L].lab,
        text: (pk === n - 1 ? 'Indeks berada di puncak periode, ' : 'Puncak periode, indeks mencapai ' + s2[pk].toFixed(1).replace('.', ',') + ' atau ') + sg(s2[pk] - 100, 1).replace('.', ',') + '% dari awal periode.' });
      else if (mv[1]) {
        var e2 = mv[1], m2 = MK[e2.q];
        ev.push({ i: e2.i, q: e2.q, col: m2.col, v: M.s[e2.q][e2.i], title: dlab(M.dates[e2.i]) + ' / ' + m2.lab,
          text: (e2.r >= 0 ? 'Naik ' : 'Turun ') + Math.abs(e2.r).toFixed(1).replace('.', ',') + '% dalam sehari, gerak harian terbesar kedua.' });
      }
    }
    M.ev = ev;
  }
  function wrap(c, txt, maxW) {
    var w = txt.split(' '), ln = '', out = [];
    w.forEach(function (x) { var t = ln ? ln + ' ' + x : x; if (c.measureText(t).width > maxW && ln) { out.push(ln); ln = x; } else ln = t; });
    if (ln) out.push(ln); return out;
  }

  /* ---------- plugin gambar: baseline, label ujung, anotasi, LIVE ---------- */
  var deco = { id: 'liqDeco', afterDatasetsDraw: function (ch) {
    var c = ch.ctx, a = ch.chartArea, X = ch.scales.x, Y = ch.scales.y, n = model.dates.length, tt = performance.now() / 1000, lt = light(), q;
    var txt = lt ? '#334155' : '#e5e7eb', sub = lt ? '#64748b' : '#9ca3af';
    c.save();
    /* garis dasar 100 */
    var y100 = Y.getPixelForValue(100);
    if (y100 > a.top && y100 < a.bottom) {
      c.setLineDash([3, 5]); c.strokeStyle = lt ? 'rgba(15,23,42,.35)' : 'rgba(255,255,255,.35)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(a.left, Math.round(y100) + .5); c.lineTo(a.right, Math.round(y100) + .5); c.stroke(); c.setLineDash([]);
    }
    /* garis hover */
    var act = ch.tooltip && ch.tooltip.getActiveElements ? ch.tooltip.getActiveElements() : [];
    if (act.length) { var ax = act[0].element.x; c.setLineDash([4, 4]); c.strokeStyle = 'rgba(148,163,184,.6)'; c.beginPath(); c.moveTo(ax, a.top); c.lineTo(ax, a.bottom); c.stroke(); c.setLineDash([]); }
    /* anotasi peristiwa */
    var boxes = [], maxW = Math.max(110, Math.min(160, a.width * .42));
    (model.ev || []).forEach(function (e) {
      if (!ch.isDatasetVisible(e.q) || e.i >= n) return;
      var px = X.getPixelForValue(e.i), py = Y.getPixelForValue(e.v);
      c.font = '500 11px Inter, system-ui, sans-serif';
      var lines = wrap(c, e.text, maxW), bw = maxW, bh = 16 + lines.length * 14;
      var bx = px - 6, by = a.top + 4, tryL = false, k, hit;
      function over(x, y) { return boxes.some(function (b) { return x < b.x + b.w + 8 && x + bw > b.x - 8 && y < b.y + b.h + 6 && y + bh > b.y - 6; }); }
      if (bx + bw > a.right) bx = a.right - bw;
      if (bx < a.left) bx = a.left;
      if (over(bx, by)) { var bx2 = Math.max(a.left, px - bw + 6); if (!over(bx2, by)) bx = bx2; else { var lb = boxes[boxes.length - 1]; by = lb.y + lb.h + 8; } }
      boxes.push({ x: bx, y: by, w: bw, h: bh });
      /* garis penuntun + penanda */
      c.strokeStyle = e.col; c.globalAlpha = .75; c.lineWidth = 1; c.beginPath(); c.moveTo(px, by + bh + 2); c.lineTo(px, py); c.stroke(); c.globalAlpha = 1;
      var pl = 0.5 + 0.5 * Math.sin(tt * 3);
      c.strokeStyle = e.col; c.globalAlpha = .35 + .35 * pl; c.beginPath(); c.arc(px, py, 7 + 2 * pl, 0, 6.2832); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = e.col; c.beginPath(); c.arc(px, py, 3.2, 0, 6.2832); c.fill();
      /* kotak teks */
      c.textAlign = 'left'; c.textBaseline = 'top';
      c.font = '700 11px Inter, system-ui, sans-serif'; c.fillStyle = e.col; c.fillText(e.title, bx, by);
      c.font = '500 11px Inter, system-ui, sans-serif'; c.fillStyle = lt ? '#475569' : '#cbd5e1';
      lines.forEach(function (l, i) { c.fillText(l, bx, by + 16 + i * 14); });
    });
    /* label ujung kanan (hindari tumpang tindih) */
    var lb = [];
    for (q = 0; q < NM; q++) {
      var s = model.s[q]; if (!s || !ch.isDatasetVisible(q)) continue;
      lb.push({ q: q, y: Y.getPixelForValue(s[n - 1]), v: s[n - 1] });
    }
    lb.sort(function (p, r) { return p.y - r.y; });
    var gap = 25, i;
    for (i = 1; i < lb.length; i++) if (lb[i].y - lb[i - 1].y < gap) lb[i].y = lb[i - 1].y + gap;
    var over2 = lb.length ? lb[lb.length - 1].y - (a.bottom - 6) : 0;
    if (over2 > 0) for (i = lb.length - 1; i >= 0; i--) { lb[i].y -= over2; if (i && lb[i].y - lb[i - 1].y >= gap) break; }
    lb.forEach(function (o) {
      var m = MK[o.q], ex = X.getPixelForValue(n - 1), ey = Y.getPixelForValue(o.v), pl = 0.5 + 0.5 * Math.sin(tt * 4 + o.q);
      if (!st.paused) { c.fillStyle = m.col; c.globalAlpha = .3 * (1 - pl); c.beginPath(); c.arc(ex, ey, 4 + 6 * pl, 0, 6.2832); c.fill(); c.globalAlpha = 1; }
      c.fillStyle = m.col; c.beginPath(); c.arc(ex, ey, 3, 0, 6.2832); c.fill();
      c.textAlign = 'left'; c.textBaseline = 'middle';
      c.font = '800 12px Inter, system-ui, sans-serif'; c.fillStyle = m.col; c.fillText(m.lab, a.right + 10, o.y - 6);
      c.font = '600 10px Inter, system-ui, sans-serif'; c.fillStyle = o.v >= 100 ? (lt ? '#0f766e' : '#5eead4') : (lt ? '#a16207' : '#fde047');
      c.fillText(sg(o.v - 100, 1).replace('.', ',') + '%', a.right + 10, o.y + 7);
    });
    /* status */
    var s2 = model.src === 'sim' ? ['◌ OFFLINE', 'rgba(251,146,60,.95)'] : st.paused ? ['❚❚ JEDA', 'rgba(251,191,36,.95)'] : ['● LIVE', 'rgba(52,211,153,' + (0.6 + 0.4 * Math.sin(tt * 4)).toFixed(2) + ')'];
    c.textAlign = 'right'; c.textBaseline = 'top'; c.font = '700 10px Inter, system-ui, sans-serif'; c.fillStyle = s2[1]; c.fillText(s2[0], a.right, 0);
    c.restore();
  } };

  /* ---------- grafik ---------- */
  function areaFill(col, top) {
    return function (cx) {
      var ch = cx.chart, a = ch.chartArea; if (!a) return 'transparent';
      var g = ch.ctx.createLinearGradient(0, a.top, 0, a.bottom);
      g.addColorStop(0, col + top); g.addColorStop(1, col + '04'); return g;
    };
  }
  function ensure() {
    var cv = $('globalMarketChart'); if (!cv || !W.Chart) return false;
    if (chart && Chart.getChart(cv) === chart) return true;
    var old = Chart.getChart(cv); if (old) old.destroy();
    try { globalMarketChartInstance = null; } catch (e) {}
    var wrapEl = cv.parentElement;
    if (wrapEl) { wrapEl.style.background = 'transparent'; wrapEl.style.borderRadius = '12px'; wrapEl.style.padding = '8px 4px 8px 12px'; }
    var ds = MK.map(function (m) {
      return { type: 'line', label: m.name, data: [], borderColor: m.col, borderWidth: m.w, tension: .28, pointRadius: 0, pointHoverRadius: 4,
        pointHoverBackgroundColor: m.col, fill: false, backgroundColor: 'transparent', spanGaps: true, order: 2 };
    });
    ds.push({ type: 'line', label: 'Komposit Global', data: [], borderColor: 'rgba(255,255,255,.7)', borderWidth: 1.3, borderDash: [5, 4], tension: .28,
      pointRadius: 0, pointHoverRadius: 3, fill: false, order: 1 });
    chart = new Chart(cv.getContext('2d'), {
      type: 'line', plugins: [deco], data: { labels: [], datasets: ds },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        layout: { padding: { left: 2, right: 92, top: 16, bottom: 0 } }, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#09090b', borderColor: '#27272a', borderWidth: 1, titleColor: '#fff', bodyColor: '#d1d5db',
          itemSort: function (p, r) { return r.parsed.y - p.parsed.y; },
          callbacks: {
            title: function (it) { var l = it[0] && model.dates[it[0].dataIndex]; return l ? dlab(l) + ' ' + l.slice(0, 4) : ''; },
            label: function (c) { return c.dataset.label + ': ' + sg(c.parsed.y - 100, 2) + '%  (indeks ' + c.parsed.y.toFixed(1) + ')'; } } } },
        scales: {
          x: { border: { display: false }, grid: { display: false },
            ticks: { autoSkip: true, maxTicksLimit: 7, maxRotation: 0, color: '#9ca3af', font: { size: 11 }, callback: function (v) { var l = this.getLabelForValue(v); return l ? dlab(l) : ''; } } },
          y: { position: 'left', border: { display: false }, grid: { color: 'rgba(148,163,184,.09)' },
            ticks: { color: '#9ca3af', font: { size: 11 }, maxTicksLimit: 6, callback: function (v) { return v.toFixed(0); } } }
        }
      }
    });
    return true;
  }
  function render() {
    if (!ensure()) return;
    var M = model, n = M.dates.length, lo = 1e9, hi = -1e9, L = leader(), q;
    var lt = light(), tk = lt ? '#64748b' : '#9ca3af';
    chart.options.scales.x.ticks.color = tk; chart.options.scales.y.ticks.color = tk;
    chart.options.scales.y.grid.color = lt ? 'rgba(15,23,42,.08)' : 'rgba(148,163,184,.09)';
    chart.data.labels = M.dates;
    for (q = 0; q < NM; q++) {
      var s = M.s[q], d = chart.data.datasets[q];
      d.data = s || []; d.hidden = !st.vis[q] || !s;
      d.borderColor = st.hl == null || st.hl === q ? MK[q].col : MK[q].col + '33'; d.borderWidth = MK[q].w + (st.hl === q ? 1.8 : 0);
      var fillIt = st.mode === 'area' || q === L;
      d.fill = fillIt && s ? 'start' : false;
      d.backgroundColor = areaFill(MK[q].col, st.mode === 'area' ? (q === L ? '66' : '33') : '70');
      if (s && st.vis[q]) s.forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); });
    }
    var cd = chart.data.datasets[CI]; cd.data = M.comp; cd.hidden = !st.vis[CI];
    cd.borderColor = lt ? 'rgba(15,23,42,.6)' : 'rgba(255,255,255,.7)';
    if (!st.vis[CI]) {} else M.comp.forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); });
    if (lo > hi) { lo = 95; hi = 105; }
    var span = Math.max(hi - lo, 2);
    chart.options.scales.y.min = lo - span * .08;
    chart.options.scales.y.max = hi + span * .55;           /* ruang atas untuk kotak anotasi */
    events();
    chart.update('none');
  }

  /* ---------- KPI, panel pasar, peta panas ---------- */
  function kpi() {
    var M = model, n = M.dates.length, v = M.comp[n - 1], p5 = M.comp[Math.max(0, n - 6)], m = (v / p5 - 1) * 100, k, q, e, rank = 0;
    if ((e = $('liq-k-bal'))) { e.textContent = v.toFixed(1); e.style.color = v >= 100 ? '#5eead4' : '#fde047'; }
    if ((e = $('liq-k-mom'))) { e.textContent = (m >= 0 ? '▲ ' : '▼ ') + sg(m, 2) + '%'; e.style.color = m >= 0 ? '#34d399' : '#fb7185'; }
    var reg = v > 100 && m >= 0 ? ['RISK-ON', '#34d399', 'Selera risiko global menguat'] : (v < 100 && m < 0 ? ['RISK-OFF', '#fb7185', 'Bursa dunia melemah'] : ['NETRAL', '#fbbf24', 'Arah belum tegas']);
    if ((e = $('liq-k-reg'))) { e.textContent = reg[0]; e.style.color = reg[1]; e.style.fontSize = '17px'; }
    if ((e = $('liq-k-regd'))) e.textContent = reg[2];
    for (k = 0; k < n; k++) if (M.comp[k] <= v) rank++;
    if ((e = $('liq-k-pct'))) e.textContent = 'P' + Math.round(rank / n * 100);
    var rs = [], tot = 0;
    for (q = 0; q < NM; q++) { var s = M.s[q]; rs[q] = s ? s[n - 1] - 100 : null; if (s) tot = Math.max(tot, Math.abs(rs[q])); }
    tot = tot || 1; rs.forEach(function (v, q) { var c = D.querySelector('.liq-card[data-q="' + q + '"]'); if (c) c.classList.toggle('up', v != null && v >= 0); });
    for (q = 0; q < NM; q++) {
      if ((e = $('liq-rv' + q))) { e.textContent = rs[q] == null ? 'offline' : sg(rs[q], 2) + '%'; e.style.color = rs[q] == null ? '#9ca3af' : rs[q] >= 0 ? '#5eead4' : '#fde047'; }
      if ((e = $('liq-rs' + q))) e.style.width = rs[q] == null ? '0' : (Math.abs(rs[q]) / tot * 100).toFixed(0) + '%';
      spark($('liq-sp' + q), M.s[q], MK[q].col);
      var dd = M.s[q] && n > 1 ? (M.s[q][n - 1] / M.s[q][n - 2] - 1) * 100 : null;
      if ((e = $('liq-rd' + q))) { e.textContent = dd == null ? '--' : (dd >= 0 ? '▲ ' : '▼ ') + sg(dd, 2) + '%'; e.style.color = dd == null ? '#9ca3af' : dd >= 0 ? '#5eead4' : '#fde047'; }
      if ((e = $('liq-ra' + q))) e.textContent = M.px[q] == null ? '--' : M.px[q].toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
    /* statistik pendukung peta panas */
    (function () {
      var w = Math.min(36, n - 1), R = [], i, up = 0, sum = 0, bi = 0, wi = 0, pk = -1e9, dd = 0;
      for (i = n - w; i < n; i++) { var r = (M.comp[i] / M.comp[i - 1] - 1) * 100; R.push(r); if (r >= 0) up++; sum += r; if (r > R[bi]) bi = R.length - 1; if (r < R[wi]) wi = R.length - 1; var lv = M.comp[i]; if (lv > pk) pk = lv; dd = Math.min(dd, (lv / pk - 1) * 100); }
      var mu = sum / R.length, sd = Math.sqrt(R.reduce(function (a, b) { return a + (b - mu) * (b - mu); }, 0) / R.length), set = function (id, t, c) { var x = $(id); if (x) { x.textContent = t; if (c) x.style.color = c; } };
      set('liq-x1', up + '/' + R.length + ' (' + Math.round(up / R.length * 100) + '%)', up * 2 >= R.length ? '#5eead4' : '#fde047');
      set('liq-x2', sg(mu, 2) + '%', mu >= 0 ? '#5eead4' : '#fde047'); set('liq-x3', sd.toFixed(2) + '%');
      set('liq-x4', sg(R[bi], 2) + '%', '#5eead4'); set('liq-x5', sg(R[wi], 2) + '%', '#fde047'); set('liq-x6', dd.toFixed(2) + '%', '#fde047');
      var ok = [], u = 0; for (q = 0; q < NM; q++) if (rs[q] != null) { ok.push({ q: q, v: rs[q] }); if (rs[q] >= 0) u++; }
      var bu = $('liq-br-u'), bd = $('liq-br-d'), tot2 = ok.length || 1;
      if (bu) bu.style.width = (u / tot2 * 100) + '%'; if (bd) bd.style.width = ((ok.length - u) / tot2 * 100) + '%';
      set('liq-br-t', u + ' naik · ' + (ok.length - u) + ' turun dari ' + ok.length + ' negara');
      ok.sort(function (a, b) { return b.v - a.v; });
      var row = function (o) { return '<div><img class="fl" src="' + FLG[o.q] + '">' + MK[o.q].name + '<b style="color:' + (o.v >= 0 ? '#5eead4' : '#fde047') + '">' + sg(o.v, 2) + '%</b></div>'; }, tb = $('liq-tb');
      if (tb) tb.innerHTML = ok.slice(0, 3).map(row).join('') + (ok.length > 5 ? '<hr>' + ok.slice(-3).map(row).join('') : '');
    })();
    for (k = 0; k < heat.length; k++) {
      var ix = n - heat.length + k, c = heat[k];
      c.classList.toggle('now', k === heat.length - 1);
      if (ix < 1) { c.style.setProperty('background', 'rgba(148,163,184,.12)', 'important'); c.textContent = ''; c.title = ''; continue; }
      var r = (M.comp[ix] / M.comp[ix - 1] - 1) * 100, al = 0.25 + 0.75 * Math.min(1, Math.abs(r) / 1.2);
      c.style.setProperty('background', r >= 0 ? 'rgba(45,212,191,' + al.toFixed(2) + ')' : 'rgba(250,204,21,' + al.toFixed(2) + ')', 'important');
      c.style.color = al > .55 ? '#0b1220' : (light() ? '#334155' : '#cbd5e1');
      c.textContent = +M.dates[ix].slice(8);
      c.title = dlab(M.dates[ix]) + ': ' + sg(r, 2).replace('.', ',') + '%';
    }
    if ((e = $('liq-day'))) e.textContent = 'penutupan ' + dlab(M.dates[n - 1]) + ' ' + M.dates[n - 1].slice(0, 4) + ' vs ' + dlab(M.dates[n - 2]);
    var t = new Date(M.t);
    if ((e = $('liq-updated'))) e.textContent = (M.src === 'live' ? 'Update ' : M.src === 'cache' ? 'Cache ' : 'Offline ') + pad(t.getHours()) + ':' + pad(t.getMinutes()) + ':' + pad(t.getSeconds());
    if ((e = $('liq-src'))) { e.textContent = M.src === 'live' ? 'Yahoo Finance · Live' : M.src === 'cache' ? 'Yahoo Finance · Cache' : loading ? 'Memuat data online…' : 'Offline'; e.style.color = M.src === 'sim' && !loading ? '#fb923c' : ''; }
  }

  /* ---------- muat data ---------- */
  /* peta panas: jumlah kolom menyesuaikan lebar card (36 sel = 18/12/9/6 kolom) */
  function fitHeat() {
    var ht = $('liq-heat'); if (!ht || !heat.length) return;
    var w = ht.clientWidth || (ht.parentElement && ht.parentElement.clientWidth) || 0; if (!w) return;
    var gap = 3, opts = [18, 12, 9, 6], cols = 6, i;
    for (i = 0; i < opts.length; i++) if ((w - gap * (opts[i] - 1)) / opts[i] >= 20) { cols = opts[i]; break; }
    ht.style.gridTemplateColumns = 'repeat(' + cols + ',minmax(0,1fr))'; ht.style.gap = gap + 'px';
    ht.classList.toggle('liq-heat-sm', (w - gap * (cols - 1)) / cols < 20);
  }
  function load(force) {
    if (loading) return;
    var rg = RG[st.rg][1], hit = cache[rg];
    if (hit && !force && Date.now() - hit.t < 45000) { model = hit; render(); kpi(); return; }
    loading = true; kpi();
    Promise.all(MK.map(function (m) { return pull(m, rg).catch(function () { return null; }); })).then(function (res) {
      var ok = res.filter(Boolean).length;
      if (ok >= 2) { model = build(res, 'live'); cache[rg] = model; }
      else if (cache[rg]) { model = cache[rg]; model.src = 'cache'; }
      else model = sim(RG[st.rg][2]);
      loading = false; render(); kpi();
    }).catch(function () { loading = false; });
  }

  function csv() {
    var M = model, rows = ['Tanggal,' + MK.map(function (m) { return m.name; }).join(',') + ',Komposit Global (basis 100)'];
    M.dates.forEach(function (d, i) { rows.push([d].concat(MK.map(function (_, q) { return M.s[q] ? M.s[q][i] : ''; }), [M.comp[i]]).join(',')); });
    var bl = new Blob([rows.join('\n')], { type: 'text/csv' }), a = D.createElement('a');
    a.href = URL.createObjectURL(bl); a.download = 'indeks-pasar-global.csv'; D.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 800);
  }
  var FLG = ['data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMCAyMCI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTAgMGgzMHYyMEgweiIvPjxjaXJjbGUgY3g9IjE1IiBjeT0iMTAiIHI9IjYiIGZpbGw9IiNCQzAwMkQiLz48L3N2Zz4=','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMCAyMCI+PHBhdGggZmlsbD0iIzAxMjE2OSIgZD0iTTAgMGgzMHYyMEgweiIvPjxwYXRoIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSI0IiBkPSJNMCAwbDMwIDIwTTMwIDBMMCAyMCIvPjxwYXRoIHN0cm9rZT0iI0M4MTAyRSIgc3Ryb2tlLXdpZHRoPSIxLjUiIGQ9Ik0wIDBsMzAgMjBNMzAgMEwwIDIwIi8+PHBhdGggc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjYiIGQ9Ik0xNSAwdjIwTTAgMTBoMzAiLz48cGF0aCBzdHJva2U9IiNDODEwMkUiIHN0cm9rZS13aWR0aD0iMy40IiBkPSJNMTUgMHYyME0wIDEwaDMwIi8+PC9zdmc+','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMCAyMCI+PHBhdGggZmlsbD0iIzAzOSIgZD0iTTAgMGgzMHYyMEgweiIvPjxjaXJjbGUgY3g9IjIxLjAiIGN5PSIxMC4wIiByPSIxIiBmaWxsPSIjZmMwIi8+PGNpcmNsZSBjeD0iMjAuMiIgY3k9IjEzLjAiIHI9IjEiIGZpbGw9IiNmYzAiLz48Y2lyY2xlIGN4PSIxOC4wIiBjeT0iMTUuMiIgcj0iMSIgZmlsbD0iI2ZjMCIvPjxjaXJjbGUgY3g9IjE1LjAiIGN5PSIxNi4wIiByPSIxIiBmaWxsPSIjZmMwIi8+PGNpcmNsZSBjeD0iMTIuMCIgY3k9IjE1LjIiIHI9IjEiIGZpbGw9IiNmYzAiLz48Y2lyY2xlIGN4PSI5LjgiIGN5PSIxMy4wIiByPSIxIiBmaWxsPSIjZmMwIi8+PGNpcmNsZSBjeD0iOS4wIiBjeT0iMTAuMCIgcj0iMSIgZmlsbD0iI2ZjMCIvPjxjaXJjbGUgY3g9IjkuOCIgY3k9IjcuMCIgcj0iMSIgZmlsbD0iI2ZjMCIvPjxjaXJjbGUgY3g9IjEyLjAiIGN5PSI0LjgiIHI9IjEiIGZpbGw9IiNmYzAiLz48Y2lyY2xlIGN4PSIxNS4wIiBjeT0iNC4wIiByPSIxIiBmaWxsPSIjZmMwIi8+PGNpcmNsZSBjeD0iMTguMCIgY3k9IjQuOCIgcj0iMSIgZmlsbD0iI2ZjMCIvPjxjaXJjbGUgY3g9IjIwLjIiIGN5PSI3LjAiIHI9IjEiIGZpbGw9IiNmYzAiLz48L3N2Zz4=','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMCAyMCI+PHBhdGggZmlsbD0iI0RFMjkxMCIgZD0iTTAgMGgzMHYyMEgweiIvPjxwb2x5Z29uIGZpbGw9IiNGRkRFMDAiIHBvaW50cz0iNi4wLDIuNSA2LjgsNC45IDkuMyw0LjkgNy4zLDYuNCA4LjEsOC44IDYuMCw3LjQgMy45LDguOCA0LjcsNi40IDIuNyw0LjkgNS4yLDQuOSIvPjxjaXJjbGUgY3g9IjExIiBjeT0iMiIgcj0iLjkiIGZpbGw9IiNGRkRFMDAiLz48Y2lyY2xlIGN4PSIxMyIgY3k9IjQiIHI9Ii45IiBmaWxsPSIjRkZERTAwIi8+PGNpcmNsZSBjeD0iMTMiIGN5PSI3IiByPSIuOSIgZmlsbD0iI0ZGREUwMCIvPjxjaXJjbGUgY3g9IjExIiBjeT0iOSIgcj0iLjkiIGZpbGw9IiNGRkRFMDAiLz48L3N2Zz4=','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMCAyMCI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTAgMGgzMHYyMEgweiIvPjxwYXRoIGZpbGw9IiNCMjIyMzQiIGQ9Ik0wIDAuMDBoMzB2MS41NEgweiIvPjxwYXRoIGZpbGw9IiNCMjIyMzQiIGQ9Ik0wIDMuMDhoMzB2MS41NEgweiIvPjxwYXRoIGZpbGw9IiNCMjIyMzQiIGQ9Ik0wIDYuMTZoMzB2MS41NEgweiIvPjxwYXRoIGZpbGw9IiNCMjIyMzQiIGQ9Ik0wIDkuMjRoMzB2MS41NEgweiIvPjxwYXRoIGZpbGw9IiNCMjIyMzQiIGQ9Ik0wIDEyLjMyaDMwdjEuNTRIMHoiLz48cGF0aCBmaWxsPSIjQjIyMjM0IiBkPSJNMCAxNS40MGgzMHYxLjU0SDB6Ii8+PHBhdGggZmlsbD0iI0IyMjIzNCIgZD0iTTAgMTguNDhoMzB2MS41NEgweiIvPjxwYXRoIGZpbGw9IiMzQzNCNkUiIGQ9Ik0wIDBoMTN2MTAuOEgweiIvPjwvc3ZnPg==','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMCAyMCI+PHBhdGggZmlsbD0iI0ZGOTkzMyIgZD0iTTAgMGgzMHY3SDB6Ii8+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTAgNi43aDMwdjYuN0gweiIvPjxwYXRoIGZpbGw9IiMxMzg4MDgiIGQ9Ik0wIDEzLjNoMzBWMjBIMHoiLz48Y2lyY2xlIGN4PSIxNSIgY3k9IjEwIiByPSIyLjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMDA4MCIvPjwvc3ZnPg==','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMCAyMCI+PHBhdGggZmlsbD0iI0RFMjkxMCIgZD0iTTAgMGgzMHYyMEgweiIvPjxjaXJjbGUgY3g9IjE1IiBjeT0iMTAiIHI9IjQuNSIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMCAyMCI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTAgMGgzMHYyMEgweiIvPjxjaXJjbGUgY3g9IjE1IiBjeT0iMTAiIHI9IjQiIGZpbGw9IiNDRDJFM0EiLz48cGF0aCBmaWxsPSIjMDA0N0EwIiBkPSJNMTEgMTBhNCA0IDAgMDA4IDB6Ii8+PHBhdGggc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEuMiIgZD0iTTMgM2wzIDJNMy44IDQuNmwzIDJNMjQgMTVsMyAyTTIzIDE2LjRsMyAyTTI0IDVsMy0yTTIzIDMuNmwzLTJNMyAxN2wzLTJNMy44IDE1LjRsMy0yIi8+PC9zdmc+','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMCAyMCI+PHBhdGggZmlsbD0iI0ZFMDAwMCIgZD0iTTAgMGgzMHYyMEgweiIvPjxwYXRoIGZpbGw9IiMwMDAwOTUiIGQ9Ik0wIDBoMTV2MTBIMHoiLz48Y2lyY2xlIGN4PSI3LjUiIGN5PSI1IiByPSIzIiBmaWxsPSIjZmZmIi8+PC9zdmc+','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMCAyMCI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTAgMGgzMHYyMEgweiIvPjxwYXRoIGZpbGw9IiNFRjMzNDAiIGQ9Ik0wIDBoMzB2MTBIMHoiLz48Y2lyY2xlIGN4PSI2IiBjeT0iNSIgcj0iMyIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjcuMyIgY3k9IjUiIHI9IjIuNiIgZmlsbD0iI0VGMzM0MCIvPjwvc3ZnPg==','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMCAyMCI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTAgMGgzMHYyMEgweiIvPjxwYXRoIGZpbGw9IiNFNzAwMTEiIGQ9Ik0wIDBoMzB2MTBIMHoiLz48L3N2Zz4=','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMCAyMCI+PHBhdGggZmlsbD0iIzAwMCIgZD0iTTAgMGgzMHY3SDB6Ii8+PHBhdGggZmlsbD0iI0QwMCIgZD0iTTAgNi43aDMwdjYuN0gweiIvPjxwYXRoIGZpbGw9IiNGRkNFMDAiIGQ9Ik0wIDEzLjNoMzBWMjBIMHoiLz48L3N2Zz4=','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMCAyMCI+PHBhdGggZmlsbD0iIzAwMjM5NSIgZD0iTTAgMGgxMHYyMEgweiIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0xMCAwaDEwdjIwSDEweiIvPjxwYXRoIGZpbGw9IiNFRDI5MzkiIGQ9Ik0yMCAwaDEwdjIwSDIweiIvPjwvc3ZnPg==','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMCAyMCI+PHBhdGggZmlsbD0iIzAxMjE2OSIgZD0iTTAgMGgzMHYyMEgweiIvPjxnIHRyYW5zZm9ybT0ic2NhbGUoLjUpIj48cGF0aCBmaWxsPSIjMDEyMTY5IiBkPSJNMCAwaDMwdjIwSDB6Ii8+PHBhdGggc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjQiIGQ9Ik0wIDBsMzAgMjBNMzAgMEwwIDIwIi8+PHBhdGggc3Ryb2tlPSIjQzgxMDJFIiBzdHJva2Utd2lkdGg9IjEuNSIgZD0iTTAgMGwzMCAyME0zMCAwTDAgMjAiLz48cGF0aCBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iNiIgZD0iTTE1IDB2MjBNMCAxMGgzMCIvPjxwYXRoIHN0cm9rZT0iI0M4MTAyRSIgc3Ryb2tlLXdpZHRoPSIzLjQiIGQ9Ik0xNSAwdjIwTTAgMTBoMzAiLz48L2c+PHBvbHlnb24gZmlsbD0iI2ZmZiIgcG9pbnRzPSI4LjAsMTIuMCA4LjcsMTQuMCAxMC45LDE0LjEgOS4xLDE1LjQgOS44LDE3LjQgOC4wLDE2LjIgNi4yLDE3LjQgNi45LDE1LjQgNS4xLDE0LjEgNy4zLDE0LjAiLz48cG9seWdvbiBmaWxsPSIjZmZmIiBwb2ludHM9IjIyLjAsMTIuMCAyMi41LDEzLjQgMjMuOSwxMy40IDIyLjgsMTQuMiAyMy4yLDE1LjYgMjIuMCwxNC44IDIwLjgsMTUuNiAyMS4yLDE0LjIgMjAuMSwxMy40IDIxLjUsMTMuNCIvPjxwb2x5Z29uIGZpbGw9IiNmZmYiIHBvaW50cz0iMjQuMCwzLjAgMjQuNSw0LjQgMjUuOSw0LjQgMjQuOCw1LjIgMjUuMiw2LjYgMjQuMCw1LjggMjIuOCw2LjYgMjMuMiw1LjIgMjIuMSw0LjQgMjMuNSw0LjQiLz48cG9seWdvbiBmaWxsPSIjZmZmIiBwb2ludHM9IjE5LjAsNy4wIDE5LjUsOC40IDIwLjksOC40IDE5LjgsOS4yIDIwLjIsMTAuNiAxOS4wLDkuOCAxNy44LDEwLjYgMTguMiw5LjIgMTcuMSw4LjQgMTguNSw4LjQiLz48cG9seWdvbiBmaWxsPSIjZmZmIiBwb2ludHM9IjI2LjAsOC4wIDI2LjUsOS40IDI3LjksOS40IDI2LjgsMTAuMiAyNy4yLDExLjYgMjYuMCwxMC44IDI0LjgsMTEuNiAyNS4yLDEwLjIgMjQuMSw5LjQgMjUuNSw5LjQiLz48L3N2Zz4='];
  function spark(el, s, col) {
    if (!el || !s) { if (el) el.innerHTML = ''; return; }
    var a = s.slice(-36), lo = Math.min.apply(null, a), hi = Math.max.apply(null, a), sp = hi - lo || 1, W2 = 96, H = 28, pts = a.map(function (v, i) { return [(i / (a.length - 1) * (W2 - 6) + 2).toFixed(1), (H - 4 - (v - lo) / sp * (H - 8)).toFixed(1)]; });
    var ln = pts.map(function (p) { return p.join(','); }).join(' '), L = pts[pts.length - 1], y0 = (H - 4 - (100 - lo) / sp * (H - 8)), id = 'g' + col.slice(1) + a.length;
    el.innerHTML = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".45"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>'
      + '<polygon fill="url(#' + id + ')" points="2,' + H + ' ' + ln + ' ' + L[0] + ',' + H + '"/><polyline fill="none" stroke="' + col + '" stroke-width="1.6" stroke-linejoin="round" points="' + ln + '"/><circle cx="' + L[0] + '" cy="' + L[1] + '" r="2.4" fill="' + col + '"/>';
  }
  /* ---------- kartu negara (terhubung ke grafik), halaman, jaringan latar ---------- */
  function setVis(i, v) {
    st.vis[i] = v; var ch = $('liq-chips'), c = D.querySelector('.liq-card[data-q="' + i + '"]');
    if (ch && ch.children[i]) ch.children[i].classList.toggle('off', !v);
    if (c) c.classList.toggle('off', !v);
    render();
  }
  function cards() {
    var rg = $('liq-regions'); if (!rg) return;
    var pages = Math.ceil(NM / PS); st.pg = Math.max(0, Math.min(pages - 1, st.pg));
    rg.innerHTML = '<table id="liq-tbl"><thead><tr><th>#</th><th>Negara · Indeks</th><th>Hari ini</th><th>Periode</th><th>Tren Kekuatan</th><th class="r">Harga terakhir</th><th>Grafik</th></tr></thead><tbody></tbody></table>';
    var tb = rg.querySelector('tbody');
    MK.slice(st.pg * PS, st.pg * PS + PS).forEach(function (g, k) {
      var r = st.pg * PS + k, tr = D.createElement('tr');
      tr.className = 'liq-card' + (st.vis[r] ? '' : ' off'); tr.dataset.q = r; tr.style.setProperty('--c', g.col);
      tr.innerHTML = '<td class="n">' + (r + 1) + '</td><td class="nm"><img class="fl" alt="" src="' + FLG[r] + '">' + g.name + '<small>' + g.sym.replace('^', '').replace('.SS', '') + '</small></td><td><b class="d" id="liq-rd' + r + '">--</b></td><td><b id="liq-rv' + r + '">--</b></td><td><svg class="spk" id="liq-sp' + r + '" width="96" height="28" viewBox="0 0 96 28"></svg></td><td class="px" id="liq-ra' + r + '">--</td><td><em></em></td>';
      tr.onclick = function () { setVis(r, !st.vis[r]); };
      tr.onmouseenter = function () { st.hl = r; render(); };
      tr.onmouseleave = function () { st.hl = null; render(); };
      tb.appendChild(tr);
    });
    var pg = $('liq-pg'); if (pg) pg.textContent = (st.pg + 1) + ' / ' + pages;
    var a = $('liq-pv'), b = $('liq-nx'); if (a) a.disabled = st.pg === 0; if (b) b.disabled = st.pg === pages - 1;
    kpi();
  }
  function net() {
    var cv = $('liq-net'), box = cv && cv.parentElement; if (!cv) return;
    var cx = cv.getContext('2d'), N = [], T = MK.map(function (m) { return m.lab; }).concat(['GOLD', 'DXY', 'NVDA', 'BBCA', 'TLKM', 'BBRI']), i;
    function size() { cv.width = box.clientWidth; cv.height = box.clientHeight; }
    size(); if (W.ResizeObserver) new ResizeObserver(size).observe(box);
    for (i = 0; i < T.length; i++) N.push({ x: rnd(0, cv.width || 600), y: rnd(0, cv.height || 300), vx: rnd(-.25, .25), vy: rnd(-.25, .25), t: T[i], c: i < NM ? MK[i].col : '#64748b' });
    (function f() {
      if (visible() && cv.width) {
        cx.clearRect(0, 0, cv.width, cv.height);
        N.forEach(function (n) { n.x += n.vx; n.y += n.vy; if (n.x < 0 || n.x > cv.width) n.vx *= -1; if (n.y < 0 || n.y > cv.height) n.vy *= -1; });
        N.forEach(function (a, x) { N.forEach(function (b, y) { var d = Math.hypot(a.x - b.x, a.y - b.y); if (y > x && d < 170) { cx.strokeStyle = 'rgba(99,130,190,' + (0.35 * (1 - d / 170)).toFixed(2) + ')'; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke(); } }); });
        cx.font = '700 9px ui-monospace,Menlo,monospace';
        N.forEach(function (n) { cx.fillStyle = n.c; cx.globalAlpha = .8; cx.beginPath(); cx.arc(n.x, n.y, 2, 0, 6.2832); cx.fill(); cx.globalAlpha = .55; cx.fillText(n.t, n.x + 5, n.y - 4); cx.globalAlpha = 1; });
      }
      requestAnimationFrame(f);
    })();
  }
  function btn(txt, cls) { var b = D.createElement('button'); b.className = 'liq-btn' + (cls ? ' ' + cls : ''); b.textContent = txt; return b; }
  function ui() {
    var chips = $('liq-chips'), tf = $('liq-tf'), md = $('liq-mode'), rg = $('liq-regions'), ht = $('liq-heat');
    if (chips) { chips.innerHTML = '';
      MK.concat([{ name: 'Komposit Global', col: '#ffffff' }]).forEach(function (g, i) {
        var b = D.createElement('button'); b.className = 'liq-btn liq-chip';
        b.innerHTML = '<span class="liq-sw" style="background:' + g.col + '"></span>' + g.name;
        if (!st.vis[i]) b.classList.add('off'); b.onclick = function () { setVis(i, !st.vis[i]); };
        chips.appendChild(b);
      });
    }
    if (tf) { tf.innerHTML = ''; RG.forEach(function (r, k) {
      var b = btn(r[0], k === st.rg ? 'on' : '');
      b.onclick = function () { st.rg = k; Array.prototype.forEach.call(tf.children, function (x) { x.classList.remove('on'); }); b.classList.add('on'); var h = cache[r[1]]; model = h || sim(r[2]); render(); kpi(); load(false); };
      tf.appendChild(b);
    }); }
    if (md) { md.innerHTML = ''; [['line', 'Garis'], ['area', 'Area']].forEach(function (m) {
      var b = btn(m[1], m[0] === st.mode ? 'on' : '');
      b.onclick = function () { st.mode = m[0]; Array.prototype.forEach.call(md.children, function (x) { x.classList.remove('on'); }); b.classList.add('on'); render(); };
      md.appendChild(b);
    }); }
    cards(); net();
    var pv = $('liq-pv'), nx = $('liq-nx'), al = $('liq-all'), co = $('liq-core');
    if (pv) pv.onclick = function () { st.pg--; cards(); };
    if (nx) nx.onclick = function () { st.pg++; cards(); };
    if (al) al.onclick = function () { MK.forEach(function (_, i) { st.vis[i] = true; }); cards(); chips && Array.prototype.forEach.call(chips.children, function (c) { c.classList.remove('off'); }); render(); };
    if (co) co.onclick = function () { MK.forEach(function (_, i) { st.vis[i] = i < CORE; }); cards(); chips && Array.prototype.forEach.call(chips.children, function (c, i) { c.classList.toggle('off', i < NM && i >= CORE); }); render(); };
    if (ht) { ht.innerHTML = ''; heat = []; for (var k = 0; k < 36; k++) { var c = D.createElement('i'); ht.appendChild(c); heat.push(c); } fitHeat(); if (W.ResizeObserver) new ResizeObserver(safe(fitHeat)).observe(ht.parentElement || ht); else W.addEventListener('resize', safe(fitHeat)); }
    var p = $('liq-pause'); if (p) p.onclick = function () { st.paused = !st.paused; p.innerHTML = st.paused ? '<i class="fa-solid fa-play"></i> Lanjut' : '<i class="fa-solid fa-pause"></i> Jeda'; p.classList.toggle('on', st.paused); if (!st.paused) load(true); };
    var c2 = $('liq-csv'); if (c2) c2.onclick = safe(csv);
    var fs = $('liq-fs'); if (fs) fs.onclick = function () { var el = $('liq-pro-card'); try { if (D.fullscreenElement) D.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); } catch (e) {} };
    D.addEventListener('fullscreenchange', function () { var w = $('liq-wrap'); if (w) w.style.height = D.fullscreenElement ? 'max(300px, calc(100vh - 400px))' : '380px'; setTimeout(function () { if (chart) chart.resize(); fitHeat(); }, 100); });
  }
  function start() {
    safe(ui)(); safe(function () { render(); kpi(); })(); safe(load)(true);
    setInterval(safe(function () { if (chart && visible() && !st.paused) chart.draw(); }), 90);       /* denyut LIVE */
    setInterval(safe(function () { if (!st.paused && !D.hidden) load(true); }), 60000);
    var today = new Date().toDateString();
    setInterval(safe(function () { var d = new Date().toDateString(); if (d !== today) { today = d; cache = {}; load(true); } }), 30000);   /* ganti hari: muat ulang data harian */                 /* data online tiap 60 dtk */
    setInterval(safe(function () { if (model.src === 'sim' && !loading && !st.paused) load(true); }), 15000);  /* coba lagi bila offline */
    new MutationObserver(safe(function () { if (chart) render(); })).observe(D.documentElement, { attributes: true, attributeFilter: ['class'] });
    D.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.nav-link')) setTimeout(safe(function () { if (visible() && chart) { chart.resize(); render(); fitHeat(); } }), 120);
    });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
  else setTimeout(start, 0);
})();
