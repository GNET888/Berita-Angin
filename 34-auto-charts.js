/* GRAFIK PROFESIONAL OTOMATIS
   • Crypto Asset → Perubahan 24j : area gradien halus + garis open 24j + titik live berdenyut
   • U.S. Stock Directory → CHANGE (%) : mini candlestick intraday + garis previous close
   Data = simulasi ilustratif sampai feed nyata tersambung. */
(function () {
  'use strict';
  if (window.__cxCells) return; window.__cxCells = true;
  var rnd = function () { return Math.random() - .5; };
  var CC = { btc: '#F7931A', eth: '#627EEA', sol: '#9945FF', bnb: '#F3BA2F', xrp: '#23292F', ada: '#0033AD', doge: '#C2A633', avax: '#E84142', dot: '#E6007A', link: '#2A5ADA', pol: '#8247E5', shib: '#E4462B', ltc: '#345D9D', uni: '#FF007A', near: '#00A37A', atom: '#4B4F6E', xlm: '#14B6E7', xmr: '#FF6600', etc: '#3AB83A', fil: '#0090FF', icp: '#3B00B9', hbar: '#3A3A3A', render: '#E5484D', imx: '#17B5CB', inj: '#0AA5C0', mkr: '#1AAB9B', aave: '#B6509E', arb: '#28A0F0', trx: '#FF060A', ton: '#0098EA', bch: '#8DC351', apt: '#00B3A4', sui: '#4DA2FF', vet: '#15BDFF', grt: '#6747ED', algo: '#2B2B2B', stx: '#5546FF', op: '#FF0420' };
  window.cxIcon = function (c) {
    var t = String(c.symbol || '').toUpperCase();
    return '<span class="cx-ico" style="background:' + (CC[c.symbol] || '#475569') + '"><b>' + t.slice(0, 4) + '</b>' +
      (c.image ? '<img src="' + c.image + '" alt="' + t + '" loading="lazy" onerror="this.remove()">' : '') + '</span>';
  };
  window.cxFmt = function (v) {
    if (v >= 1000) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (v >= 1) return v.toFixed(2);
    return v >= .01 ? v.toFixed(4) : v.toFixed(6);
  };
  var isLight = function () { return document.documentElement.classList.contains('light'); };
  var palette = function () { return isLight() ? { up: '#059669', dn: '#e11d48', base: 'rgba(100,116,139,.55)' } : { up: '#34D399', dn: '#FB7185', base: 'rgba(148,163,184,.45)' }; };
  /* ---------- state kripto ---------- */
  var CS = {}, coins = {};
  function initCrypto() {
    if (typeof cryptoPagesData === 'undefined') return;
    Object.keys(cryptoPagesData).forEach(function (k) {
      cryptoPagesData[k].forEach(function (c) {
        coins[c.symbol] = c;
        var cur = c.current_price, open = cur / (1 + c.price_change_percentage_24h / 100), n = 30, s = [], vol = .0011 + Math.abs(c.price_change_percentage_24h) * .00016;
        for (var i = 0; i < n; i++) { var t = i / (n - 1); s.push((open + (cur - open) * t) * (1 + rnd() * vol * 5 * Math.sin(Math.PI * t * .96 + .05))); }
        s[0] = open; s[n - 1] = cur;
        CS[c.symbol] = { s: s, open: open, cur: cur, target: cur, shown: cur, vol: vol };
      });
    });
  }
  /* Dipanggil setelah data online (CoinGecko) masuk: harga live jadi acuan baru, jadi tidak tertimpa simulasi lama */
  window.__baCryptoResync = function () {
    Object.keys(coins).forEach(function (sym) {
      var c = coins[sym], st = CS[sym]; if (!c || !st || !(c.current_price > 0)) return;
      var cur = c.current_price, pc = c.price_change_percentage_24h || 0, open = cur / (1 + pc / 100), n = st.s.length, vol = .0011 + Math.abs(pc) * .00016;
      for (var i = 0; i < n; i++) { var t = i / (n - 1); st.s[i] = (open + (cur - open) * t) * (1 + rnd() * vol * 5 * Math.sin(Math.PI * t * .96 + .05)); }
      st.s[0] = open; st.s[n - 1] = cur; st.open = open; st.cur = cur; st.target = cur; st.shown = cur; st.vol = vol;
    });
  };
  function tickCrypto() {
    Object.keys(CS).forEach(function (sym) {
      var st = CS[sym], c = coins[sym];
      st.cur = Math.max(st.cur * .2, st.cur * (1 + rnd() * st.vol * 2.2) + (st.target - st.cur) * .035);
      st.s.push(st.cur); st.s.shift();
      c.current_price = st.cur; c.price_change_percentage_24h = (st.cur / st.open - 1) * 100;
      c.total_volume = Math.max(1e6, c.total_volume * (1 + rnd() * .006));
    });
    var tb = document.getElementById('crypto-table-body'); if (!tb || tb.offsetParent === null) return;
    tb.querySelectorAll('tr[data-cx]').forEach(function (tr) {
      var c = coins[tr.getAttribute('data-cx')], st = CS[tr.getAttribute('data-cx')]; if (!c) return;
      var p = tr.querySelector('.cx-price'), g = tr.querySelector('.cx-pct'), v = tr.querySelector('.cx-vol'), pct = c.price_change_percentage_24h;
      if (p) { var old = p.getAttribute('data-p') * 1, nw = c.current_price; p.textContent = '$' + cxFmt(nw); p.setAttribute('data-p', nw);
        if (old && old !== nw) { p.classList.remove('cx-fu', 'cx-fd'); void p.offsetWidth; p.classList.add(nw > old ? 'cx-fu' : 'cx-fd'); } }
      if (g) { g.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'; g.classList.remove('text-emerald-400', 'text-rose-400'); g.classList.add(pct >= 0 ? 'text-emerald-400' : 'text-rose-400'); }
      if (v) v.textContent = '$' + (c.total_volume / 1e6).toFixed(1) + 'M';
    });
  }
  /* ---------- state saham ---------- */
  var SS = {}, stocks = {}, NC = 14;
  function candlesFrom(closes, vol) {
    var out = [];
    for (var i = 1; i < closes.length; i++) { var o = closes[i - 1], c = closes[i]; out.push({ o: o, c: c, h: Math.max(o, c) + Math.random() * vol, l: Math.min(o, c) - Math.random() * vol }); }
    return out;
  }
  function initStocks() {
    if (typeof allStockDirectory === 'undefined') return;
    allStockDirectory.forEach(function (s) {
      stocks[s.symbol] = s;
      var chg = parseFloat(s.change) || 0, price = s.price, pc = price / (1 + chg / 100), closes = [pc], vol = price * .0022;
      for (var i = 1; i <= NC; i++) { var t = i / NC; closes.push(i === NC ? price : pc + (price - pc) * t + rnd() * price * .006 * (1 - t * .6)); }
      var cd = candlesFrom(closes, vol);
      SS[s.symbol] = { c: cd, pc: pc, target: price, shown: price, vol: price * .0016, n: 0 };
    });
  }
  function tickStocks() {
    Object.keys(SS).forEach(function (sym) {
      var st = SS[sym], s = stocks[sym], k = st.c[st.c.length - 1];
      st.n++;
      if (st.n % 4 === 0) { st.c.push({ o: k.c, c: k.c, h: k.c, l: k.c }); st.c.shift(); k = st.c[st.c.length - 1]; }
      k.c = Math.max(.01, k.c + rnd() * st.vol * 2 + (st.target - k.c) * .05);
      k.h = Math.max(k.h, k.c); k.l = Math.min(k.l, k.c);
      var chg = +((k.c / st.pc - 1) * 100).toFixed(2);
      if (s._lp > 0) { s.price = s._lp; s.change = (s._lc >= 0 ? '+' : '') + s._lc.toFixed(2) + '%'; } else { s.price = k.c; s.change = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%'; }
    });
    var tb = document.getElementById('stock-table-body'); if (!tb || tb.offsetParent === null) return;
    tb.querySelectorAll('tr[data-st]').forEach(function (tr) {
      var s = stocks[tr.getAttribute('data-st')]; if (!s) return;
      var p = tr.querySelector('.cx-sprice'), g = tr.querySelector('.cx-schg'), up = s.change.indexOf('-') < 0;
      if (p) { var old = p.getAttribute('data-p') * 1; p.textContent = '$' + s.price.toFixed(2); p.setAttribute('data-p', s.price);
        if (old && old !== s.price) { p.classList.remove('cx-fu', 'cx-fd'); void p.offsetWidth; p.classList.add(s.price > old ? 'cx-fu' : 'cx-fd'); } }
      if (g) { g.textContent = s.change; g.classList.remove('text-emerald-400', 'text-rose-400'); g.classList.add(up ? 'text-emerald-400' : 'text-rose-400'); }
    });
  }
  /* ---------- gambar ---------- */
  function prep(cv, dw, dh) {
    var w = cv.clientWidth || dw, h = cv.clientHeight || dh, d = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
    var x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, w, h); return { x: x, w: w, h: h };
  }
  function drawCrypto(cv, now) {
    var st = CS[cv.getAttribute('data-sym')]; if (!st) return;
    st.shown += (st.cur - st.shown) * .2;
    var o = prep(cv, 104, 34), x = o.x, w = o.w, h = o.h, C = palette(), s = st.s.slice(0, -1).concat([st.shown]), n = s.length;
    var mn = Math.min(st.open, Math.min.apply(null, s)), mx = Math.max(st.open, Math.max.apply(null, s)), pad = (mx - mn) * .16 || mx * .001; mn -= pad; mx += pad;
    var X = function (i) { return 3 + i * (w - 9) / (n - 1); }, Y = function (v) { return h - 3 - (v - mn) / (mx - mn) * (h - 6); };
    var up = st.shown >= st.open, col = up ? C.up : C.dn;
    x.strokeStyle = C.base; x.lineWidth = 1; x.setLineDash([2, 3]); x.beginPath(); x.moveTo(0, Math.round(Y(st.open)) + .5); x.lineTo(w, Math.round(Y(st.open)) + .5); x.stroke(); x.setLineDash([]);
    x.beginPath(); x.moveTo(X(0), Y(s[0]));
    for (var i = 1; i < n; i++) { var mx2 = (X(i - 1) + X(i)) / 2, my2 = (Y(s[i - 1]) + Y(s[i])) / 2; x.quadraticCurveTo(X(i - 1), Y(s[i - 1]), mx2, my2); }
    x.lineTo(X(n - 1), Y(s[n - 1]));
    x.save(); x.lineTo(X(n - 1), h); x.lineTo(X(0), h); x.closePath();
    var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, col + '55'); g.addColorStop(1, col + '00'); x.fillStyle = g; x.fill(); x.restore();
    x.beginPath(); x.moveTo(X(0), Y(s[0]));
    for (i = 1; i < n; i++) { x.quadraticCurveTo(X(i - 1), Y(s[i - 1]), (X(i - 1) + X(i)) / 2, (Y(s[i - 1]) + Y(s[i])) / 2); }
    x.lineTo(X(n - 1), Y(s[n - 1])); x.strokeStyle = col; x.lineWidth = 1.6; x.lineJoin = 'round'; x.stroke();
    var ph = (now % 1500) / 1500, ex = X(n - 1), ey = Y(s[n - 1]);
    x.beginPath(); x.arc(ex, ey, 2.5 + ph * 5, 0, 6.2832); x.strokeStyle = col; x.globalAlpha = (1 - ph) * .8; x.lineWidth = 1; x.stroke(); x.globalAlpha = 1;
    x.beginPath(); x.arc(ex, ey, 2.4, 0, 6.2832); x.fillStyle = col; x.fill();
  }
  function drawStock(cv, now) {
    var st = SS[cv.getAttribute('data-sym')]; if (!st) return;
    var k = st.c[st.c.length - 1]; st.shown += (k.c - st.shown) * .25;
    var o = prep(cv, 96, 34), x = o.x, w = o.w, h = o.h, C = palette(), cs = st.c, n = cs.length;
    var mn = st.pc, mx = st.pc; cs.forEach(function (c) { mn = Math.min(mn, c.l); mx = Math.max(mx, c.h); });
    var pad = (mx - mn) * .14 || mx * .001; mn -= pad; mx += pad;
    var slot = (w - 6) / n, Y = function (v) { return h - 3 - (v - mn) / (mx - mn) * (h - 6); };
    x.strokeStyle = C.base; x.lineWidth = 1; x.setLineDash([2, 3]); x.beginPath(); x.moveTo(0, Math.round(Y(st.pc)) + .5); x.lineTo(w, Math.round(Y(st.pc)) + .5); x.stroke(); x.setLineDash([]);
    cs.forEach(function (c, i) {
      var last = i === n - 1, cl = last ? st.shown : c.c, hi = last ? Math.max(c.h, cl) : c.h, lo = last ? Math.min(c.l, cl) : c.l;
      var col = cl >= c.o ? C.up : C.dn, cx = Math.round(3 + (i + .5) * slot) + .5, bw = Math.max(2, Math.floor(slot * .62));
      x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 1;
      x.beginPath(); x.moveTo(cx, Y(hi)); x.lineTo(cx, Y(lo)); x.stroke();
      var y1 = Y(Math.max(c.o, cl)), y2 = Y(Math.min(c.o, cl)); x.fillRect(Math.round(cx - bw / 2), y1, bw, Math.max(1, y2 - y1));
    });
    var lc = st.shown >= st.pc ? C.up : C.dn, ly = Y(st.shown), ph = (now % 1500) / 1500;
    x.strokeStyle = lc; x.globalAlpha = .55; x.lineWidth = 1; x.beginPath(); x.moveTo(w - 8, ly); x.lineTo(w, ly); x.stroke(); x.globalAlpha = 1;
    x.beginPath(); x.arc(w - 3, ly, 1.6 + ph * 2.6, 0, 6.2832); x.globalAlpha = 1 - ph; x.stroke(); x.globalAlpha = 1;
    x.beginPath(); x.arc(w - 3, ly, 1.8, 0, 6.2832); x.fillStyle = lc; x.fill();
  }
  var lastF = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || now - lastF < 33) return; lastF = now;
    document.querySelectorAll('canvas.cx-mini').forEach(function (cv) {
      if (cv.offsetParent === null) return;
      try { cv.getAttribute('data-kind') === 'stock' ? drawStock(cv, now) : drawCrypto(cv, now); } catch (e) { }
    });
  }
  initCrypto(); initStocks();
  setInterval(function () { if (!document.hidden) try { tickCrypto(); } catch (e) { console.warn('[cx-crypto]', e); } }, 1500);
  setInterval(function () { if (!document.hidden) try { tickStocks(); } catch (e) { console.warn('[cx-stock]', e); } }, 1700);
  requestAnimationFrame(frame);
})();
