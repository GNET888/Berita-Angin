/* PUSAT DATA ONLINE HARIAN — satu sumber data untuk semua halaman.
   Menarik riwayat harian NYATA (CoinGecko, Yahoo Finance, FRED, Fear & Greed), disimpan per hari di localStorage
   (sinkron 1x/hari + tombol manual + cek ulang otomatis bila hari berganti atau sinkron gagal).
   Tidak ada angka fiktif: seri yang gagal dimuat ditandai "Belum ada", bukan diisi simulasi.
   Hasilnya (1) menggantikan riwayat acak Komponen Likuiditas Makro dengan data harian asli dan
   (2) ditampilkan menyeluruh di kartu "Pusat Data Online Harian" (halaman Market Statistik). */
(function () {
  'use strict';
  if (window.__baHub) return;
  var W = window, D = document, enc = encodeURIComponent, $ = function (i) { return D.getElementById(i); };
  var R = [function (u) { return W.__BA_PROXY ? '/api/proxy?url=' + enc(u) : null; }, function (u) { return u; },
    function (u) { return 'https://api.codetabs.com/v1/proxy?quest=' + enc(u); }, function (u) { return 'https://corsproxy.io/?' + enc(u); },
    function (u) { return 'https://api.allorigins.win/raw?url=' + enc(u); }];
  var get = function (u, ms) { return W.__baFetch(R, u, false, ms || 10000); };
  var getTxt = function (u) { return W.__baFetch(R, u, true, 10000); };
  var KEY = 'ba-hub-v1', CG = 'https://api.coingecko.com/api/v3/', YH = 'https://query1.finance.yahoo.com/v8/finance/chart/';
  var dayKey = function () { return new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); };
  var iso = function (ms) { return new Date(ms).toISOString().slice(0, 10); };
  var hm = function () { return new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false }).replace(/\./g, ':').slice(0, 5); };
  function toPts(m) { return Object.keys(m).sort().map(function (d) { return [d, m[d]]; }); }

  /* ---------- Daftar seri: id, nama, kelompok, format, pengambil data ---------- */
  var META = [];
  function add(id, n, g, f, task) { META.push({ id: id, n: n, g: g, f: f, task: task }); }
  [['btc', 'Bitcoin', 'bitcoin'], ['eth', 'Ethereum', 'ethereum'], ['sol', 'Solana', 'solana'], ['bnb', 'BNB', 'binancecoin']].forEach(function (c) {
    add(c[0], c[1], 'Crypto', 'usd', function () {
      return get(CG + 'coins/' + c[2] + '/market_chart?vs_currency=usd&days=180&interval=daily').then(function (j) {
        var m = {}; j.prices.forEach(function (p) { if (isFinite(p[1])) m[iso(p[0])] = p[1]; }); return toPts(m); });
    });
  });
  add('fng', 'Fear & Greed Kripto', 'Crypto', 'n0', function () {
    return get('https://api.alternative.me/fng/?limit=180').then(function (j) {
      var m = {}; j.data.forEach(function (x) { var v = parseFloat(x.value); if (isFinite(v)) m[iso(+x.timestamp * 1000)] = v; }); return toPts(m); });
  });
  [['spx', 'S&P 500', 'Saham', '^GSPC', 'n2'], ['ndx', 'NASDAQ Composite', 'Saham', '^IXIC', 'n2'], ['dji', 'Dow Jones', 'Saham', '^DJI', 'n2'],
   ['nvda', 'NVIDIA', 'Saham', 'NVDA', 'usd'], ['aapl', 'Apple', 'Saham', 'AAPL', 'usd'], ['msft', 'Microsoft', 'Saham', 'MSFT', 'usd'],
   ['jkse', 'IHSG', 'Global', '^JKSE', 'n2'], ['n225', 'Nikkei 225', 'Global', '^N225', 'n2'], ['gold', 'Emas (GC)', 'Global', 'GC=F', 'usd'],
   ['oil', 'Minyak WTI', 'Global', 'CL=F', 'usd'], ['dxy', 'Indeks Dolar (DXY)', 'Global', 'DX-Y.NYB', 'n2'], ['vix', 'VIX', 'Global', '^VIX', 'n2'],
   ['eur', 'EUR/USD', 'Global', 'EURUSD=X', 'n4'], ['jpy', 'USD/JPY', 'Global', 'USDJPY=X', 'n2']].forEach(function (y) {
    add(y[0], y[1], y[2], y[4], function () {
      return get(YH + enc(y[3]) + '?range=6mo&interval=1d').then(function (j) {
        var r = j.chart.result[0], ts = r.timestamp, cl = r.indicators.quote[0].close, m = {};
        for (var i = 0; i < ts.length; i++) if (cl[i] != null && isFinite(cl[i])) m[iso(ts[i] * 1000)] = cl[i];
        return toPts(m); });
    });
  });
  [['fed', 'Neraca Fed (WALCL)', 'WALCL', 1e-6, 'T'], ['rrp', 'Reverse Repo (RRP)', 'RRPONTSYD', 1e-3, 'T'],
   ['tga', 'Kas Treasury (TGA)', 'WTREGEN', 1e-6, 'T'], ['ust', 'Imbal Hasil UST 10Y', 'DGS10', 1, 'pct']].forEach(function (f) {
    add(f[0], f[1], 'Makro', f[4], function () {
      return getTxt('https://fred.stlouisfed.org/graph/fredgraph.csv?id=' + f[2] + '&cosd=' + new Date(Date.now() - 200 * 864e5).toISOString().slice(0, 10)).then(function (t) {
        var m = {}; t.trim().split('\n').slice(1).forEach(function (l) { var p = l.split(','), v = parseFloat(p[1]); if (p[0] && isFinite(v)) m[p[0]] = v * f[3]; }); return toPts(m); });
    });
  });
  var BY = {}; META.forEach(function (m) { BY[m.id] = m; });
  var COL = ['#38bdf8', '#f59e0b', '#34d399', '#f472b6', '#a78bfa', '#fb7185', '#facc15', '#2dd4bf', '#60a5fa', '#fb923c', '#4ade80', '#c084fc', '#22d3ee', '#f87171', '#a3e635', '#e879f9', '#fbbf24', '#818cf8', '#5eead4', '#fda4af', '#bef264', '#7dd3fc'];
  META.forEach(function (m, i) { m.c = COL[i % COL.length]; });

  /* ---------- Penyimpanan harian ---------- */
  var S = {}, meta = { day: '', ts: 0, ok: 0 }, busy = null, fresh = {};
  try { var c0 = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c0 && c0.S) { S = c0.S; meta = { day: c0.day || '', ts: c0.ts || 0, ok: c0.ok || 0 }; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ day: meta.day, ts: meta.ts, ok: meta.ok, S: S })); } catch (e) {} }

  function pool(tasks, n) {
    var i = 0, act = 0, res = [];
    return new Promise(function (done) {
      (function nx() {
        if (i >= tasks.length && act === 0) return done(res);
        while (act < n && i < tasks.length) (function (k) {
          act++; Promise.resolve().then(tasks[k]).then(function (v) { res[k] = v; }, function () { res[k] = null; }).then(function () { act--; nx(); });
        })(i++);
      })();
    });
  }
  function sync(force) {
    if (busy) return busy;
    var today = dayKey(), have = Object.keys(S).length;
    if (!force && meta.day === today && have >= Math.ceil(META.length * .5)) { applyMods(); render(); return Promise.resolve('cache'); }
    setStatus('Menyinkron data online…', '#38bdf8');
    busy = pool(META.map(function (m) { return m.task; }), 3).then(function (res) {
      var ok = 0;
      META.forEach(function (m, i) {
        var p = res[i];
        if (p && p.length >= 5) { S[m.id] = { pts: p.slice(-200), upd: Date.now() }; fresh[m.id] = 1; ok++; }
      });
      meta.ok = ok; meta.ts = Date.now();
      if (ok >= Math.ceil(META.length * .5)) meta.day = today;   /* belum cukup → dicoba lagi otomatis */
      save(); busy = null; applyMods(); render();
      try { W.dispatchEvent(new CustomEvent('ba-hub-sync', { detail: { ok: ok, total: META.length } })); } catch (e) {}
      return ok;
    }).catch(function () { busy = null; render(); });
    return busy;
  }

  /* ---------- Ganti data simulasi modul lain dengan data harian asli ---------- */
  function applyMods() {
    try {
      var M = W.__MLC; if (!M || !M.C) return;
      M.C.forEach(function (c) {
        var s = S[c.id]; if (!s || !BY[c.id] || BY[c.id].g !== 'Makro' && c.id !== 'dxy') return;
        var v = s.pts.map(function (p) { return p[1]; }).filter(function (x) { return isFinite(x) && x > 0; });
        if (v.length < 5) return;
        var h = v.slice(-40); while (h.length < 40) h.unshift(h[0]);
        c.h = h; var last = h[h.length - 1]; c.b = c.x = c.o = c.p = last; c.real = 1;
      });
    } catch (e) {}
  }

  /* ---------- Statistik & format ---------- */
  function fmt(m, v) {
    if (!isFinite(v)) return '–';
    var L = function (d) { return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };
    return m.f === 'usd' ? '$' + L(v >= 1000 ? 0 : 2) : m.f === 'T' ? '$' + L(3) + 'T' : m.f === 'pct' ? L(2) + '%' : m.f === 'n4' ? L(4) : m.f === 'n0' ? L(0) : L(2);
  }
  function stat(id) {
    var s = S[id]; if (!s || !s.pts.length) return null;
    var p = s.pts, n = p.length, last = p[n - 1], prev = n > 1 ? p[n - 2][1] : NaN, cut = new Date(new Date(last[0]).getTime() - 30 * 864e5).toISOString().slice(0, 10), b = p[0][1];
    for (var i = 0; i < n; i++) if (p[i][0] >= cut) { b = p[i][1]; break; }
    return { last: last[1], d: last[0], d1: (last[1] / prev - 1) * 100, d30: (last[1] / b - 1) * 100 };
  }
  function pearson(a, b) {
    var n = a.length; if (n < 8) return NaN; var ma = 0, mb = 0, i; for (i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n;
    var sab = 0, saa = 0, sbb = 0; for (i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) * (a[i] - ma); sbb += (b[i] - mb) * (b[i] - mb); }
    return sab / Math.sqrt(saa * sbb || 1);
  }
  function corr(x, y) {
    var A = {}, k; S[x].pts.forEach(function (p) { A[p[0]] = p[1]; });
    var d = [], va = [], vb = []; S[y].pts.forEach(function (p) { if (A[p[0]] != null) { d.push(p[0]); va.push(A[p[0]]); vb.push(p[1]); } });
    var ra = [], rb = []; for (k = 1; k < d.length; k++) { ra.push(va[k] / va[k - 1] - 1); rb.push(vb[k] / vb[k - 1] - 1); }
    return pearson(ra.slice(-60), rb.slice(-60));
  }

  /* ---------- Tampilan ---------- */
  var GR = ['Semua', 'Crypto', 'Saham', 'Global', 'Makro'];
  var st = { g: 'Semua', mode: 'idx', rng: 60, sel: { btc: 1, eth: 1, spx: 1, ndx: 1, gold: 1, oil: 1, dxy: 1, jkse: 1 } }, ch1 = null, ch2 = null;
  var active = function () { var p = $('page-market-stat'); return !!p && p.classList.contains('active'); };
  function setStatus(t, c) { var e = $('bh-status'); if (e) { e.textContent = t; e.style.color = c || '#94a3b8'; } }
  var btn = function (on) { return 'px-2.5 py-1 rounded-lg text-[11px] font-semibold border ' + (on ? 'border-brand-accent text-white bg-brand-primary' : 'border-card-border text-gray-300 bg-black/40'); };
  var vis = function () { return META.filter(function (m) { return st.g === 'Semua' || m.g === st.g; }); };
  var selIds = function () { return vis().filter(function (m) { return st.sel[m.id] && S[m.id]; }).map(function (m) { return m.id; }); };

  function controls() {
    var h = '', e;
    e = $('bh-groups'); if (e) { GR.forEach(function (g) { h += '<button type="button" data-bhg="' + g + '" class="' + btn(st.g === g) + '">' + g + '</button>'; }); e.innerHTML = h; }
    e = $('bh-modes'); if (e) { h = ''; [['idx', 'Indeks = 100'], ['pct', '% Perubahan'], ['price', 'Harga (log)']].forEach(function (m) { h += '<button type="button" data-bhm="' + m[0] + '" class="' + btn(st.mode === m[0]) + '">' + m[1] + '</button>'; });
      [30, 60, 90, 180].forEach(function (r) { h += '<button type="button" data-bhr="' + r + '" class="' + btn(st.rng === r) + '">' + r + 'H</button>'; }); e.innerHTML = h; }
    e = $('bh-chips'); if (e) { h = ''; vis().forEach(function (m) {
      var has = !!S[m.id], on = has && st.sel[m.id], q = has ? stat(m.id) : null;
      h += '<button type="button" role="checkbox" aria-checked="' + (on ? 'true' : 'false') + '" data-bhs="' + m.id + '" class="ms-ck' + (on ? ' on' : '') + (has ? '' : ' off') + '" style="--sc:' + m.c + '"><i class="ms-ck-b"></i><span class="ms-ck-n">' + m.n + '</span><span class="ms-ck-g">' + m.g + '</span>' +
        (q ? '<span class="ms-ck-c ' + (q.d30 >= 0 ? 'ms-up' : 'ms-dn') + '">' + (q.d30 >= 0 ? '+' : '') + q.d30.toFixed(1) + '%</span>' : '<span class="ms-ck-c">Belum ada</span>') + '</button>'; }); e.innerHTML = h; }
  }
  function lineChart(ids) {
    var cv = $('bh-c1'); if (!cv || !W.Chart) return;
    var last = ''; ids.forEach(function (id) { var p = S[id].pts; if (p[p.length - 1][0] > last) last = p[p.length - 1][0]; });
    var cut = last ? new Date(new Date(last).getTime() - st.rng * 864e5).toISOString().slice(0, 10) : '';
    var ds = ids.map(function (id) {
      var pts = S[id].pts.filter(function (p) { return p[0] >= cut; }), b = pts.length ? pts[0][1] : 1;
      return { label: BY[id].n, borderColor: BY[id].c, backgroundColor: BY[id].c, borderWidth: 1.6, pointRadius: 0, pointHoverRadius: 3, tension: .15, spanGaps: true,
        data: pts.map(function (p) { return { x: p[0], y: st.mode === 'idx' ? p[1] / b * 100 : st.mode === 'pct' ? (p[1] / b - 1) * 100 : p[1] }; }) };
    });
    var cfg = { type: 'line', data: { datasets: ds }, options: { responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: '#cbd5e1', boxWidth: 10, font: { size: 10 } } }, tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + c.parsed.y.toLocaleString('en-US', { maximumFractionDigits: 2 }) + (st.mode === 'pct' ? '%' : ''); } } } },
      scales: { x: { type: 'time', time: { unit: st.rng > 90 ? 'month' : 'week', tooltipFormat: 'dd MMM yyyy' }, ticks: { color: '#94a3b8', maxRotation: 0, font: { size: 10 } }, grid: { color: 'rgba(148,163,184,.08)' } },
        y: { type: st.mode === 'price' ? 'logarithmic' : 'linear', ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(148,163,184,.1)' } } } } };
    if (ch1) { try { ch1.destroy(); } catch (e) {} } ch1 = new W.Chart(cv.getContext('2d'), cfg);
  }
  function barChart() {
    var cv = $('bh-c2'); if (!cv || !W.Chart) return;
    var rows = vis().map(function (m) { var s = stat(m.id); return s ? { n: m.n, v: s.d30 } : null; }).filter(Boolean).sort(function (a, b) { return b.v - a.v; });
    var cfg = { type: 'bar', data: { labels: rows.map(function (r) { return r.n; }), datasets: [{ data: rows.map(function (r) { return +r.v.toFixed(2); }), backgroundColor: rows.map(function (r) { return r.v >= 0 ? 'rgba(52,211,153,.8)' : 'rgba(251,113,133,.8)'; }), borderRadius: 3 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return c.parsed.x.toFixed(2) + '%'; } } } },
        scales: { x: { ticks: { color: '#94a3b8', font: { size: 10 }, callback: function (v) { return v + '%'; } }, grid: { color: 'rgba(148,163,184,.1)' } }, y: { ticks: { color: '#cbd5e1', font: { size: 10 } }, grid: { display: false } } } } };
    if (ch2) { try { ch2.destroy(); } catch (e) {} } ch2 = new W.Chart(cv.getContext('2d'), cfg);
  }
  function corrTable(ids) {
    var e = $('bh-corr'); if (!e) return; ids = ids.slice(0, 8);
    if (ids.length < 3) { e.innerHTML = '<div class="text-[11px] text-gray-500">Pilih minimal 3 seri untuk melihat korelasi.</div>'; return; }
    var h = '<table class="w-full text-[10px] font-mono"><tr><td></td>' + ids.map(function (i) { return '<td class="px-1 py-1 text-center text-gray-400">' + BY[i].n.split(' ')[0] + '</td>'; }).join('') + '</tr>';
    ids.forEach(function (a) { h += '<tr><td class="pr-2 py-0.5 text-gray-400 whitespace-nowrap">' + BY[a].n.split(' ')[0] + '</td>';
      ids.forEach(function (b) { var r = a === b ? 1 : corr(a, b), c = !isFinite(r) ? 'rgba(75,85,99,.25)' : r >= 0 ? 'rgba(52,211,153,' + (.12 + Math.abs(r) * .7).toFixed(2) + ')' : 'rgba(251,113,133,' + (.12 + Math.abs(r) * .7).toFixed(2) + ')';
        h += '<td class="px-1 py-1 text-center text-white" style="background:' + c + '">' + (isFinite(r) ? r.toFixed(2) : '–') + '</td>'; }); h += '</tr>'; });
    e.innerHTML = h + '</table>';
  }
  function spark(id, up) {
    var s = S[id]; if (!s || s.pts.length < 3) return '';
    var v = s.pts.slice(-30).map(function (p) { return p[1]; }), lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), r = hi - lo || 1, W2 = 64, H2 = 20, n = v.length;
    var pts = v.map(function (y, i) { return (i / (n - 1) * W2).toFixed(1) + ',' + (H2 - 2 - (y - lo) / r * (H2 - 4)).toFixed(1); }).join(' ');
    return '<svg class="ms-sp ' + (up ? 'ms-up' : 'ms-dn') + '" viewBox="0 0 ' + W2 + ' ' + H2 + '" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }
  function table() {
    var e = $('bh-tbl'); if (!e) return; var h = '', pc = function (x) { return (x >= 0 ? '+' : '') + x.toFixed(2) + '%'; };
    var NM = { Crypto: 'Crypto', Saham: 'Saham', Global: 'Global', Makro: 'Makro' };
    GR.slice(1).forEach(function (g) {
      var L = META.filter(function (m) { return m.g === g; }), ok = L.filter(function (m) { return S[m.id] && S[m.id].pts.length; }).length, rows = '';
      L.forEach(function (m) {
        var s = stat(m.id), f = fresh[m.id], today = s && meta.day === dayKey();
        var stt = !s ? 'Belum ada data' : f ? 'Online · ' + s.d.slice(5) : today ? 'Cache hari ini · ' + s.d.slice(5) : 'Cache lama · ' + s.d.slice(5);
        var sc = !s ? 'ms-s0' : f ? 'ms-s1' : today ? 'ms-s2' : 'ms-s3';
        rows += '<div class="ms-li"><div class="ms-li-n"><i style="background:' + m.c + '"></i><div><b>' + m.n + '</b><small class="' + sc + '">' + stt + '</small></div></div>' +
          (s ? '<span class="ms-li-v">' + fmt(m, s.last) + '</span><span class="ms-li-c ' + (s.d1 >= 0 ? 'ms-up' : 'ms-dn') + '">' + pc(s.d1) + '</span><span class="ms-li-c ' + (s.d30 >= 0 ? 'ms-up' : 'ms-dn') + '">' + pc(s.d30) + '</span><span class="ms-li-s">' + spark(m.id, s.d30 >= 0) + '</span>'
          : '<span class="ms-li-na">Belum ada data online</span>') + '</div>';
      });
      h += '<section class="ms-lst"><div class="ms-lst-h"><b>' + NM[g] + '</b><span>' + ok + ' dari ' + L.length + ' seri tersedia</span></div>' +
        '<div class="ms-li ms-li-hd"><span class="ms-li-n">Seri</span><span class="ms-li-v">Terakhir</span><span class="ms-li-c">1H</span><span class="ms-li-c">30H</span><span class="ms-li-s">Tren 30H</span></div>' + rows + '</section>';
    });
    e.innerHTML = '<div class="ms-lists">' + h + '</div>';
  }
  function render() {
    var n = Object.keys(S).length, f = Object.keys(fresh).length;
    if (!busy) setStatus(n ? (f ? '● Online · ' : '◐ Cache · ') + n + ' dari ' + META.length + ' seri · sinkron ' + (meta.day || '–') + (meta.ts ? ' ' + new Date(meta.ts).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false }).replace(/\./g, ':').slice(0, 5) : '') : '○ Belum ada data online (sumber tidak terjangkau) · mencoba lagi otomatis', f ? '#34d399' : n ? '#38bdf8' : '#94a3b8');
    if (!active()) return;
    controls(); var ids = selIds(); table();
    var em = $('bh-empty'); if (em) em.style.display = ids.length ? 'none' : 'flex';
    if (ids.length) lineChart(ids); else if (ch1) { try { ch1.destroy(); } catch (e) {} ch1 = null; }
    if (n) barChart(); corrTable(ids);
  }

  /* ---------- Interaksi ---------- */
  D.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('[data-bhg],[data-bhm],[data-bhr],[data-bhs],#bh-sync'); if (!t) return;
    if (t.id === 'bh-sync') { sync(true); return; }
    if (t.dataset.bhg) { st.g = t.dataset.bhg; if (st.g !== 'Semua') { st.sel = {}; vis().forEach(function (m) { st.sel[m.id] = 1; }); } else st.sel = { btc: 1, eth: 1, spx: 1, ndx: 1, gold: 1, oil: 1, dxy: 1, jkse: 1 }; }
    else if (t.dataset.bhm) st.mode = t.dataset.bhm;
    else if (t.dataset.bhr) st.rng = +t.dataset.bhr;
    else if (t.dataset.bhs) st.sel[t.dataset.bhs] = st.sel[t.dataset.bhs] ? 0 : 1;
    render();
  });
  function boot() {
    var p = $('page-market-stat');
    if (p && W.MutationObserver) new MutationObserver(function () { if (active()) render(); }).observe(p, { attributes: true, attributeFilter: ['class'] });
    applyMods(); render(); sync(false);
    setInterval(function () { if (!D.hidden) applyMods(); }, 60000);                       /* jaga riwayat asli tidak tertimpa */
    setInterval(function () { if (!D.hidden && !busy && (meta.day !== dayKey())) sync(false); }, 10 * 6e4); /* hari berganti / sinkron sebelumnya gagal */
    D.addEventListener('visibilitychange', function () { if (!D.hidden && meta.day !== dayKey()) sync(false); });
  }
  W.__baHub = { sync: sync, series: function (id) { return S[id] ? S[id].pts.slice() : null; }, stat: stat, ids: function () { return META.map(function (m) { return m.id; }); } };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 1800); }); else setTimeout(boot, 1800);
})();
