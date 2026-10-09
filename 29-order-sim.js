(function () {
  'use strict';
  var N = 12, LVL = 5, ORDER = 20000, SLIP_MAX = 0.05;
  var $ = function (id) { return document.getElementById(id); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var r50 = function (x) { return Math.min(9000, Math.max(100, Math.round(x / 50) * 50)); };
  var fmt = function (n) { return Math.round(n).toLocaleString('en-US'); };
  var bidSz = [], askSz = [], bias = 0.5, prevMid = 0, model = null;
  for (var i = 0; i < N; i++) { bidSz.push(r50(rnd(500, 2600) * (1 + i * 0.12))); askSz.push(r50(rnd(500, 2600) * (1 + i * 0.12))); }
  function livePrice() { return (window.stockLive && window.stockLive.price) || 228.87; }
  function row(side, lv, cum, max, added) {
    var pct = Math.min(100, cum / max * 100).toFixed(0), a = side === 'a';
    return '<div class="grid grid-cols-3 ' + (a ? 'text-rose-400' : 'text-emerald-400') + ' py-1 px-1 rounded ' + (added ? (a ? 'l2-add-a' : 'l2-add-b') : '') +
      '" style="background:linear-gradient(to left,rgba(' + (a ? '244,63,94' : '16,185,129') + ',.16) ' + pct + '%,transparent ' + pct + '%)"><span>' + lv.p.toFixed(2) +
      '</span><span class="text-right">' + fmt(lv.s) + (added ? ' <b>+</b>' : '') + '</span><span class="text-right text-gray-400">' + fmt(cum) + '</span></div>';
  }
  function walk(levels, qty) {
    var rem = qty, cost = 0;
    for (var j = 0; j < levels.length && rem > 0; j++) { var t = Math.min(rem, levels[j].s); cost += t * levels[j].p; rem -= t; }
    if (rem > 0) cost += rem * (levels[levels.length - 1].p + 0.02);
    return cost / qty;
  }
  function step() {
    var asksEl = $('l2-asks'), bidsEl = $('l2-bids');
    if (!asksEl || !bidsEl || asksEl.offsetParent === null || document.hidden) return;
    var price = livePrice(), i, prevB = bidSz.slice(), prevA = askSz.slice();
    bias = Math.max(0.3, Math.min(0.7, bias + rnd(-0.04, 0.04)));
    for (i = 0; i < N; i++) {
      var base = 1400 * (1 + i * 0.14);
      bidSz[i] = r50(bidSz[i] * 0.7 + base * (0.5 + bias) * 0.3 * rnd(0.6, 1.4) + (Math.random() < 0.1 ? rnd(300, 1200) : 0));
      askSz[i] = r50(askSz[i] * 0.7 + base * (1.5 - bias) * 0.3 * rnd(0.6, 1.4) + (Math.random() < 0.1 ? rnd(300, 1200) : 0));
    }
    var ts = Math.random() < 0.55 ? 2 : (Math.random() < 0.6 ? 1 : 3);
    var bestBid = Math.round((price - 0.005 * ts) * 100) / 100, bestAsk = Math.round((bestBid + 0.01 * ts) * 100) / 100;
    var bids = [], asks = [], cumB = [], cumA = [], cb = 0, ca = 0;
    for (i = 0; i < N; i++) {
      bids.push({ p: bestBid - i * 0.01, s: bidSz[i], add: bidSz[i] - prevB[i] > 500 });
      asks.push({ p: bestAsk + i * 0.01, s: askSz[i], add: askSz[i] - prevA[i] > 500 });
      cb += bidSz[i]; ca += askSz[i]; cumB.push(cb); cumA.push(ca);
    }
    var max5 = Math.max(cumB[LVL - 1], cumA[LVL - 1]), h = '', k;
    for (k = LVL - 1; k >= 0; k--) h += row('a', asks[k], cumA[k], max5, asks[k].add);
    asksEl.innerHTML = h; h = '';
    for (k = 0; k < LVL; k++) h += row('b', bids[k], cumB[k], max5, bids[k].add);
    bidsEl.innerHTML = h;
    var mid = (bestBid + bestAsk) / 2, up = mid >= prevMid; prevMid = mid;
    var midEl = $('l2-mid'); if (midEl) { midEl.textContent = '$' + price.toFixed(2); midEl.parentNode.classList.toggle('text-emerald-400', up); midEl.parentNode.classList.toggle('text-rose-400', !up); }
    var spr = bestAsk - bestBid, sprEl = $('l2-spread'); if (sprEl) sprEl.textContent = '$' + spr.toFixed(2) + ' (' + (spr / mid * 100).toFixed(3) + '%)';
    var pb = cumB[LVL - 1] / (cumB[LVL - 1] + cumA[LVL - 1]), pEl = $('l2-pressure');
    if (pEl) { var buy = pb >= 0.5; pEl.textContent = Math.round((buy ? pb : 1 - pb) * 100) + '% ' + (buy ? 'BUY' : 'SELL') + ' PRESSURE';
      pEl.classList.toggle('text-emerald-400', buy); pEl.classList.toggle('text-rose-400', !buy); }
    var totB = cumB[N - 1], totA = cumA[N - 1];
    var shield = Math.max(0, Math.min(100, 100 - Math.abs(totB - totA) / (totB + totA) * 60));
    var slip = Math.max((walk(asks, ORDER) - bestAsk) / bestAsk * 100, (bestBid - walk(bids, ORDER)) / bestBid * 100);
    var ok = slip <= SLIP_MAX && shield >= 60;
    var sh = $('dm-shield'); if (sh) { sh.textContent = (ok ? 'ACTIVE (' : 'THIN (') + shield.toFixed(1) + '%)'; sh.className = (ok ? 'text-emerald-400' : 'text-amber-400') + ' font-bold'; }
    var bar = $('dm-shield-bar'); if (bar) { bar.style.width = shield.toFixed(0) + '%'; bar.className = (ok ? 'bg-emerald-500' : 'bg-amber-500') + ' h-full rounded-full transition-all duration-500'; }
    var sl = $('dm-slip'); if (sl) sl.textContent = 'Est. ' + slip.toFixed(3) + '% / Max ' + SLIP_MAX.toFixed(2) + '% (' + fmt(ORDER) + ' sh)';
    var gb = $('guard-badge'); if (gb) { gb.textContent = ok ? 'GUARD : ON' : 'GUARD : ALERT';
      gb.className = 'px-2 py-0.5 rounded font-bold border text-[10px] animate-pulse ' + (ok ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'); }
    var sc = $('l2-secure'); if (sc) { sc.innerHTML = ok ? '&#9679; SECURE' : '&#9679; THIN BOOK';
      sc.className = 'text-[10px] uppercase font-sans tracking-wider px-2 py-0.5 rounded border ' + (ok ? 'text-gray-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/30'); }
    var wall = null; bids.forEach(function (l) { if (!wall || l.s > wall.s) wall = { s: l.s, p: l.p, side: 'BID' }; });
    asks.forEach(function (l) { if (!wall || l.s > wall.s) wall = { s: l.s, p: l.p, side: 'ASK' }; });
    var we = $('dm-wall'); if (we) { we.textContent = wall.side + ' ' + wall.p.toFixed(2) + ' • ' + fmt(wall.s); we.className = (wall.side === 'BID' ? 'text-emerald-400' : 'text-rose-400') + ' font-bold'; }
    model = { bids: bids, asks: asks, cumB: cumB, cumA: cumA, mid: mid, wall: wall };
    drawDepth();
  }
  function drawDepth() {
    var cv = $('depth-map-canvas'); if (!cv || !model || cv.offsetParent === null) return;
    var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.floor(w * dpr) || cv.height !== Math.floor(h * dpr)) { cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr); }
    var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    var light = document.documentElement.classList.contains('light');
    var G = light ? { bg: '#ffffff', up: '#059669', dn: '#e11d48', upF: 'rgba(5,150,105,.20)', dnF: 'rgba(225,29,72,.20)', txt: '#475569', mid: '#0284c7' }
                  : { bg: '#050505', up: '#34D399', dn: '#FB7185', upF: 'rgba(52,211,153,.22)', dnF: 'rgba(251,113,133,.22)', txt: '#94A3B8', mid: '#38BDF8' };
    /* latar kanvas depth map dibiarkan transparan */
    var B = model.bids, A = model.asks, pmin = B[N - 1].p, pmax = A[N - 1].p, base = h - 14, topY = 12;
    var cmax = Math.max(model.cumB[N - 1], model.cumA[N - 1]) * 1.08;
    var X = function (p) { return 4 + (p - pmin) / (pmax - pmin) * (w - 8); }, Y = function (v) { return base - v / cmax * (base - topY); };
    function area(L, cum, col, fill) {
      c.beginPath(); c.moveTo(X(L[0].p), base);
      for (var i = 0; i < N; i++) { c.lineTo(X(L[i].p), Y(cum[i])); if (i < N - 1) c.lineTo(X(L[i + 1].p), Y(cum[i])); }
      c.lineTo(X(L[N - 1].p), base); c.closePath(); c.fillStyle = fill; c.fill();
      c.beginPath(); c.moveTo(X(L[0].p), Y(cum[0]));
      for (var j = 0; j < N; j++) { c.lineTo(X(L[j].p), Y(cum[j])); if (j < N - 1) c.lineTo(X(L[j + 1].p), Y(cum[j])); }
      c.strokeStyle = col; c.lineWidth = 1.6; c.stroke();
    }
    area(B, model.cumB, G.up, G.upF); area(A, model.cumA, G.dn, G.dnF);
    var mx = X(model.mid); c.strokeStyle = G.mid; c.setLineDash([3, 3]); c.lineWidth = 1; c.beginPath(); c.moveTo(mx, topY - 4); c.lineTo(mx, base); c.stroke(); c.setLineDash([]);
    var wl = model.wall, wx = X(wl.p); c.strokeStyle = wl.side === 'BID' ? G.up : G.dn; c.globalAlpha = 0.6; c.setLineDash([2, 3]);
    c.beginPath(); c.moveTo(wx, topY); c.lineTo(wx, base); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    c.font = '8px ui-monospace, Menlo, monospace'; c.fillStyle = G.txt; c.textAlign = 'left'; c.fillText(pmin.toFixed(2), 4, h - 3);
    c.textAlign = 'right'; c.fillText(pmax.toFixed(2), w - 4, h - 3); c.textAlign = 'center'; c.fillStyle = G.mid; c.fillText(model.mid.toFixed(2), mx, h - 3);
    c.textAlign = 'left'; c.fillStyle = G.txt; c.fillText('BID ' + fmt(model.cumB[N - 1]), 4, 9); c.textAlign = 'right'; c.fillText('ASK ' + fmt(model.cumA[N - 1]), w - 4, 9);
  }
  window.addEventListener('resize', drawDepth, { passive: true });
  if (typeof MutationObserver !== 'undefined') new MutationObserver(drawDepth).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  setTimeout(step, 400); setInterval(step, 800);
})();
