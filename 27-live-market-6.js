/* ============================================================
   LIVE MODULE — GLOBAL MARKET (2 sub-halaman)
   Satu sumber data untuk KPI, tabel 28 direktori, valas, movers, dan sesi.
   Data awal = snapshot pasar 8 Oktober 2026; status sesi mengikuti jam nyata (UTC).
   Hanya menyentuh #page-global-market (#gm-*).
   ============================================================ */
(function () {
  'use strict';
  if (window.__gmHub) return; window.__gmHub = true;
  var PAGE = 'page-global-market', R = [
    ["S&P 500","Amerika Serikat","Ekuitas / Saham","7,765.36","-0.47%","us","s"], ["NASDAQ Composite","Amerika Serikat","Ekuitas Teknologi","27,193.34","-1.25%","us","s"], ["Dow Jones Industrial","Amerika Serikat","Ekuitas Blue-Chip","51,231.64","+0.10%","us","s"], ["Russell 2000","Amerika Serikat","Saham Kapitalisasi Kecil","2,832.89","+0.94%","us","s"],
    ["FTSE 100","Inggris / Eropa","Ekuitas Regional","10,458.50","-0.79%","eu","s"], ["DAX Performance Index","Jerman / Eropa","Ekuitas Utama","24,759.00","-0.75%","eu","s"], ["CAC 40","Prancis / Eropa","Ekuitas Utama","8,218.00","-0.32%","eu","s"], ["Euro Stoxx 50","Zona Euro","Indeks Gabungan","6,062.00","-0.68%","eu","s"],
    ["Nikkei 225","Jepang / Asia","Ekuitas Utama","70,035.71","-0.92%","jp","s"], ["TOPIX Index","Jepang / Asia","Ekuitas Luas","4,130.73","+0.97%","jp","s"], ["Hang Seng Index","Hong Kong","Ekuitas Asia","24,163.04","-0.48%","cn","s"], ["Shanghai Composite","Tiongkok","Ekuitas Domestik","3,842.19","+0.31%","cn","s"],
    ["CSI 300","Tiongkok","Saham Unggulan","4,357.62","+0.29%","cn","s"], ["Nifty 50","India","Ekuitas Berkembang","22,776.10","+0.98%","in","s"], ["KOSPI","Korea Selatan","Ekuitas Utama","6,803.90","-0.89%","kr","s"], ["ASX 200","Australia","Ekuitas Pasifik","8,200.00","+0.55%","au","s"],
    ["IHSG","Indonesia","Ekuitas Domestik","6,118.86","+1.36%","id","s"], ["Straits Times Index","Singapura","Ekuitas Asia Tenggara","5,664.33","+0.52%","sg","s"], ["MSCI Emerging Markets","Global","Pasar Berkembang","1,744.93","+0.00%","gl","s"], ["Spot Gold (XAU)","Global","Logam Mulia","$4,158.00","+0.42%","gl","k"],
    ["Spot Silver (XAG)","Global","Logam Mulia","$62.08","+2.80%","gl","k"], ["Crude Oil WTI","Global","Energi / Minyak","$90.20","-1.00%","gl","k"], ["Brent Crude Oil","Global","Energi / Minyak","$105.21","+1.20%","gl","k"], ["Natural Gas","Global","Energi / Komoditas","$3.036","+0.00%","gl","k"],
    ["Copper Futures","Global","Logam Industri","$14,555.00","+0.80%","gl","k"], ["US Dollar Index (DXY)","Amerika Serikat","Mata Uang / Valas","101.97","+0.25%","gl","v"], ["Bloomberg Commodity Index","Global","Komoditas Gabungan","140.19","+0.00%","gl","k"], ["Bitcoin Dominance Index","Global","Indeks Aset Kripto","56.4%","+0.44%","cx","v"]
  ];
  if (window.__dailyGM) R = window.__dailyGM(R);
  var HRS = { us: [13.5, 20], eu: [7, 15.5], jp: [0, 6], cn: [1.5, 8], 'in': [3.75, 10], kr: [0, 6.5], au: [0, 6], id: [2, 8.83], sg: [1, 9] };
  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var pd = function (n) { return n < 10 ? '0' + n : '' + n; };
  var nf = function (n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
  var safe = function (f) { return function () { try { f.apply(null, arguments); } catch (e) { console.warn('[global-market]', e); } }; };
  var pageOn = function () { var p = $(PAGE); return !!p && p.classList.contains('active'); };
  function isOpen(k) {
    if (k === 'cx') return true;
    var iso = new Date().toISOString().slice(0,10);
    if (iso === '2026-10-05' && (k === 'cn' || k === 'kr')) return false;
    var d = new Date(), w = d.getUTCDay(); if (w === 0 || w === 6) return false;
    if (k === 'gl') return true;
    var h = d.getUTCHours() + d.getUTCMinutes() / 60, s = HRS[k]; return h >= s[0] && h < s[1];
  }
  function mkItem(o) {
    var h = [], i, t; for (i = 0; i < 40; i++) { t = i / 39; h.push(o.p + (o.v - o.p) * t + (i < 39 ? rnd(-1, 1) * o.v * o.vol * 2.5 : 0)); }
    o.v0 = o.v; o.h = h; o.u = o.u || ''; o.pre = o.pre || ''; o.suf = o.suf || ''; return o;
  }
  var items = R.map(function (a) {
    var raw = a[3], v = parseFloat(raw.replace(/[$,%]/g, '')), ch = parseFloat(a[4]);
    return mkItem({ n: a[0], r: a[1], c: a[2], pre: raw.charAt(0) === '$' ? '$' : '', suf: raw.slice(-1) === '%' ? '%' : '',
      d: (raw.split('.')[1] || '').replace(/\D/g, '').length, v: v, p: v / (1 + ch / 100), mk: a[5], g: a[6], vol: a[6] === 'k' ? .0011 : a[6] === 'v' ? .0004 : .0006 });
  });
  var by = function (n) { return items.filter(function (x) { return x.n === n; })[0]; };
  window.__GM = { items: items, FX: null, by: by };
  var mc = mkItem({ n: 'Kapitalisasi', pre: '$', u: ' Triliun', d: 1, v: 108.4, p: 108.4 / 1.018, mk: 'gl', vol: .0004 });
  var FX = (window.__dailyFXrows || function (x) { return x; })([['USD/IDR', 16240, .12, 0], ['EUR/USD', 1.085, -.08, 4], ['USD/JPY', 157.2, .21, 2], ['GBP/USD', 1.285, -.05, 4], ['USD/SGD', 1.348, .03, 4], ['AUD/USD', .665, .1, 4]]).map(function (a) {
    return mkItem({ n: a[0], d: a[3], v: a[1], p: a[1] / (1 + a[2] / 100), mk: 'gl', vol: .00035 });
  });
  window.__GM.FX = FX;
  var fv = function (x, v) { return x.pre + nf(v, x.d) + x.suf + x.u; };
  var chg = function (x) { return (x.v / x.p - 1) * 100; };
  var ct = function (c) { return (c >= 0 ? '+' : '') + c.toFixed(2) + '%'; };
  var cl = function (c) { return c >= 0 ? 'text-emerald-400' : 'text-rose-400'; };
  function step(x) {
    if (x.live || !isOpen(x.mk)) return;
    x.v = clamp(x.v + (x.v0 - x.v) * .02 + rnd(-1, 1) * x.v * x.vol, x.p * .94, x.p * 1.06);
    x.h.push(x.v); x.h.shift();
  }
  function spark(x) {
    var a = x.h, mn = Math.min.apply(0, a), mx = Math.max.apply(0, a), g = (mx - mn) || 1, col = x.v >= x.p ? '#34d399' : '#fb7185';
    var pts = a.map(function (v, i) { return (i / (a.length - 1) * 76).toFixed(1) + ',' + (24 - (v - mn) / g * 21).toFixed(1); }).join(' ');
    return '<svg class="gm-spark" viewBox="0 0 76 27" preserveAspectRatio="none"><polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  /* --- KPI (sub-halaman 1) --- */
  var KPI = [
    ['mc', 'NILAI KAPITALISASI PASAR GLOBAL', mc, 'fa-globe', 'bg-brand-primary/10 text-brand-accent', function () { return ' dari kemarin'; }],
    ['dxy', 'INDEKS DOLAR (DXY)', by('US Dollar Index (DXY)'), 'fa-dollar-sign', 'bg-emerald-500/10 text-emerald-400', function (c) { return c < 0 ? ' (Bearish)' : ' (Bullish)'; }],
    ['xau', 'HARGA EMAS (SPOT)', by('Spot Gold (XAU)'), 'fa-coins', 'bg-amber-500/10 text-amber-400', function (c) { return c >= 0 ? ' (Safe Haven)' : ' (Koreksi)'; }],
    ['wti', 'MINYAK MENTAH (WTI)', by('Crude Oil WTI'), 'fa-oil-well', 'bg-sky-500/10 text-sky-400', function () { return ''; }]
  ];
  function kpis() {
    var box = $('gm-kpis'); if (!box) return;
    if (!box.firstChild) box.innerHTML = KPI.map(function (k) {
      return '<div class="bg-card-dark border border-card-border p-5 rounded-2xl shadow-xl card-3d"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><span class="text-[11px] text-gray-400 uppercase tracking-wider block">' + k[1] + '</span><h4 id="gm-k-' + k[0] + '" class="text-xl font-extrabold text-white mt-1 font-mono"></h4><span id="gm-kc-' + k[0] + '" class="text-[11px] font-medium inline-block mt-1"></span></div><div class="w-10 h-10 rounded-xl ' + k[4] + ' flex items-center justify-center text-base flex-shrink-0"><i class="fa-solid ' + k[3] + '"></i></div></div><div id="gm-ks-' + k[0] + '" class="mt-3"></div></div>';
    }).join('');
    KPI.forEach(function (k) {
      var x = k[2], c = chg(x), a = $('gm-k-' + k[0]), b = $('gm-kc-' + k[0]), s = $('gm-ks-' + k[0]);
      if (a) a.textContent = fv(x, x.v);
      if (b) { b.textContent = ct(c) + k[5](c); b.className = 'text-[11px] font-medium inline-block mt-1 ' + cl(c); }
      if (s) { if (!s.firstChild) s.innerHTML = '<div class="gmk-wrap"><canvas id="gm-pro-' + k[0] + '" class="gmk-cv" role="img" aria-label="Grafik profesional ' + k[1] + '"></canvas></div>'; if (window.__gmKpiPro) window.__gmKpiPro.push(k[0], x.v, x.p); }
    });
  }
  /* --- Tabel direktori (sub-halaman 2) --- */
  var q = '', grp = 'all', page = 1, PER = 10;
  /* --- Logo per direktori: favicon resmi penyelenggara indeks (fallback: ikon Font Awesome) --- */
  var LG = {
    'S&P 500': ['spglobal.com'], 'NASDAQ Composite': ['nasdaq.com'], 'Dow Jones Industrial': ['dowjones.com'], 'Russell 2000': ['lseg.com'],
    'FTSE 100': ['lseg.com'], 'DAX Performance Index': ['deutsche-boerse.com'], 'CAC 40': ['euronext.com'], 'Euro Stoxx 50': ['stoxx.com'],
    'Nikkei 225': ['nikkei.com'], 'TOPIX Index': ['jpx.co.jp'], 'Hang Seng Index': ['hsi.com.hk'], 'Shanghai Composite': ['sse.com.cn'],
    'CSI 300': ['csindex.com.cn'], 'Nifty 50': ['nseindia.com'], 'KOSPI': ['krx.co.kr'], 'ASX 200': ['asx.com.au'], 'IHSG': ['idx.co.id'],
    'Straits Times Index': ['sgx.com'], 'MSCI Emerging Markets': ['msci.com'], 'Bloomberg Commodity Index': ['bloomberg.com'],
    'Spot Gold (XAU)': [0, 'fa-solid fa-coins', '#fbbf24'], 'Spot Silver (XAG)': [0, 'fa-solid fa-coins', '#cbd5e1'],
    'Crude Oil WTI': [0, 'fa-solid fa-oil-can', '#94a3b8'], 'Brent Crude Oil': [0, 'fa-solid fa-oil-well', '#64748b'],
    'Natural Gas': [0, 'fa-solid fa-fire-flame-curved', '#38bdf8'], 'Copper Futures': [0, 'fa-solid fa-industry', '#f97316'],
    'US Dollar Index (DXY)': [0, 'fa-solid fa-dollar-sign', '#34d399'], 'Bitcoin Dominance Index': [0, 'fa-brands fa-bitcoin', '#f7931a']
  };
  function logo(n) {
    var m = LG[n] || [0, 'fa-solid fa-chart-line', '#38bdf8'];
    return '<span class="gm-lg"><i class="' + (m[1] || 'fa-solid fa-chart-line') + '"' + (m[2] ? ' style="color:' + m[2] + '"' : '') + '></i>' +
      (m[0] ? '<img src="https://www.google.com/s2/favicons?domain=' + m[0] + '&sz=64" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">' : '') + '</span>';
  }
  function row(x) {
    var c = chg(x), o = isOpen(x.mk);
    return '<tr class="hover:bg-neutral-900 transition-colors"><td class="py-3 px-6 font-bold text-white"><div class="gm-nm">' + logo(x.n) + '<span>' + esc(x.n) + '</span></div></td><td class="py-3 px-6 text-gray-400 text-xs">' + x.r + '</td><td class="py-3 px-6 text-gray-300 text-xs">' + x.c + '</td><td class="py-3 px-6 font-mono font-medium text-right text-white">' + fv(x, x.v) + '</td><td class="py-2 px-3 text-right"><div class="flex items-center justify-end gap-2"><span class="font-mono font-semibold ' + cl(c) + '">' + ct(c) + '</span>' + spark(x) + '</div></td><td class="py-3 px-6 text-center"><span class="px-2.5 py-1 rounded-full text-[10px] font-semibold ' + (o ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-gray-400 border border-card-border') + '">' + (o ? 'Buka' : 'Tutup') + '</span></td></tr>';
  }
  function table() {
    var tb = $('gm-tbody'); if (!tb) return;
    var f = items.filter(function (x) { return (grp === 'all' || x.g === grp) && (!q || (x.n + ' ' + x.r + ' ' + x.c).toLowerCase().indexOf(q) > -1); });
    var tp = Math.max(1, Math.ceil(f.length / PER)); page = clamp(page, 1, tp);
    var s = (page - 1) * PER, cur = f.slice(s, s + PER);
    tb.innerHTML = cur.length ? cur.map(row).join('') : '<tr><td colspan="6" class="py-8 text-center text-gray-500 text-sm">Tidak ada hasil untuk pencarian ini.</td></tr>';
    $('gm-info').textContent = f.length ? 'Menampilkan ' + (s + 1) + '-' + (s + cur.length) + ' dari ' + f.length + ' direktori' : 'Menampilkan 0 direktori';
    var pg = '<button data-p="' + (page - 1) + '" class="px-2.5 py-1 bg-black border border-card-border rounded hover:bg-neutral-800 text-white">Prev</button>';
    for (var i = 1; i <= tp; i++) pg += '<button data-p="' + i + '" class="px-2.5 py-1 rounded ' + (i === page ? 'bg-brand-primary text-white font-bold' : 'bg-black border border-card-border hover:bg-neutral-800 text-white') + '">' + i + '</button>';
    $('gm-pg').innerHTML = pg + '<button data-p="' + (page + 1) + '" class="px-2.5 py-1 bg-black border border-card-border rounded hover:bg-neutral-800 text-white">Next</button>';
  }
  /* --- Panel pendukung --- */
  var SES = [['New York (NYSE)', 'us', -4], ['London (LSE)', 'eu', 1], ['Frankfurt (XETRA)', 'eu', 2], ['Tokyo (TSE)', 'jp', 9], ['Hong Kong (HKEX)', 'cn', 8], ['Sydney (ASX)', 'au', 10], ['Jakarta (IDX)', 'id', 7]];
  function side() {
    var d = new Date(), h = d.getUTCHours() + d.getUTCMinutes() / 60, e;
    if ((e = $('gm-sessions'))) e.innerHTML = SES.map(function (s) {
      var o = isOpen(s[1]), a = HRS[s[1]], pr = o ? clamp((h - a[0]) / (a[1] - a[0]), 0, 1) * 100 : 0, t = new Date(d.getTime() + s[2] * 36e5);
      return '<div class="gm-row"><span class="' + (o ? 'text-emerald-400' : 'text-gray-600') + '">●</span><span class="text-gray-200" style="flex:1">' + s[0] + '</span><span class="text-gray-500 font-mono">' + pd(t.getUTCHours()) + ':' + pd(t.getUTCMinutes()) + '</span><div style="width:54px;height:5px;background:#1f1f1f;border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:' + pr.toFixed(0) + '%;background:#34d399"></i></div></div>';
    }).join('');
    var so = items.slice().sort(function (a, b) { return chg(b) - chg(a); }), mv = so.slice(0, 3).concat(so.slice(-3));
    if ((e = $('gm-movers'))) e.innerHTML = mv.map(function (x) { var c = chg(x); return '<div class="gm-row"><span class="text-gray-200" style="flex:1">' + esc(x.n) + '</span><span class="font-mono text-white">' + fv(x, x.v) + '</span><b class="font-mono ' + cl(c) + '" style="width:58px;text-align:right">' + ct(c) + '</b></div>'; }).join('');
    if ((e = $('gm-fx'))) e.innerHTML = FX.map(function (x) { var c = chg(x); return '<div class="gm-row"><span class="text-gray-200" style="flex:1">' + x.n + '</span><span class="font-mono text-white">' + nf(x.v, x.d) + '</span><b class="font-mono ' + cl(c) + '" style="width:54px;text-align:right">' + ct(c) + '</b></div>'; }).join('');
  }
  function head() {
    var e = $('gm-open'), t = new Date(); if (e) e.textContent = items.filter(function (x) { return isOpen(x.mk); }).length + ' / ' + items.length + ' buka';
    if ((e = $('gm-clock'))) e.textContent = '● LIVE ' + pd(t.getHours()) + ':' + pd(t.getMinutes()) + ':' + pd(t.getSeconds());
  }
  /* --- sub-halaman & navigasi --- */
  var cur = 1, ACT = 'px-4 py-1.5 rounded-lg text-xs font-bold bg-brand-primary text-white transition', INA = 'px-4 py-1.5 rounded-lg text-xs font-bold bg-black border border-card-border text-gray-300 hover:text-white transition';
  function draw() { if (cur === 1) kpis(); else { table(); side(); } head(); }
  function sub(n) {
    cur = n;
    [1, 2].forEach(function (i) { var e = $('gm-sub-' + i); if (e) e.classList.toggle('hidden', i !== n); });
    var ind = $('gm-sub-ind'); if (ind) ind.textContent = 'Halaman ' + n + ' dari 2';
    Array.prototype.forEach.call(document.querySelectorAll('[data-gm-tab]'), function (b) { b.className = (+b.getAttribute('data-gm-tab') === n) ? ACT : INA; });
    safe(draw)();
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 60);
  }
  function wire() {
    document.addEventListener('click', function (e) {
      var t = e.target, a = t.closest && t.closest('[data-gm-sub]');
      if (a) {
        e.preventDefault(); var pg = $(PAGE);
        if (pg && !pg.classList.contains('active')) { Array.prototype.forEach.call(document.querySelectorAll('.page'), function (p) { p.classList.remove('active'); }); pg.classList.add('active'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        try { if (typeof toggleSidebar === 'function') toggleSidebar(false); } catch (x) {}
        sub(+a.getAttribute('data-gm-sub')); return;
      }
      var p = t.closest && t.closest('#gm-pg [data-p]'); if (p) { page = +p.getAttribute('data-p'); safe(table)(); return; }
      var c = t.closest && t.closest('#gm-chips .gm-chip');
      if (c) { grp = c.getAttribute('data-g'); page = 1; Array.prototype.forEach.call(c.parentNode.children, function (x) { x.classList.toggle('on', x === c); }); safe(table)(); }
    });
    var s = $('gm-search'); if (s) s.addEventListener('input', function () { q = s.value.toLowerCase().trim(); page = 1; safe(table)(); });
  }
  function start() {
    safe(wire)(); safe(draw)();
    setInterval(safe(function () { if (document.hidden) return; items.concat([mc], FX).forEach(step); if (pageOn()) draw(); }), 2000);
    setInterval(safe(function () { if (pageOn()) head(); }), 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
  else setTimeout(start, 0);
})();
