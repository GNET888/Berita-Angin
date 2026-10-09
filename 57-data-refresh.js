/* PENGHUBUNG DATA HARIAN — menjaga halaman selalu memakai data.js terbaru yang dibuat update_data.py
   (dijalankan GitHub Actions tiap hari). Alur:
   1. Tiap 10 menit / saat tab aktif lagi / saat online kembali: ambil data-meta.json (kecil, tanpa cache).
   2. Bila asOfISO lebih baru dari data.js yang sedang dipakai: ambil ulang data.js (cache:'reload'
      agar cache browser ikut diperbarui), perbarui lencana, lalu
        - tab sedang tersembunyi  -> halaman dimuat ulang otomatis (tak mengganggu pengguna),
        - tab sedang dilihat      -> tampil banner "Data baru tersedia · Muat ulang".
   Gagal jaringan = diam saja, data lama tetap dipakai. */
(function () {
  'use strict';
  var W = window, D = document, EVERY = 10 * 60 * 1000, busy = false, lastCheck = 0;
  function cur() { return (W.__DAILY && W.__DAILY.asOfISO) || ''; }

  function banner() {
    if (D.getElementById('daily-update-banner')) return;
    var b = D.createElement('div');
    b.id = 'daily-update-banner';
    b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 64px);z-index:10000;' +
      'display:flex;gap:10px;align-items:center;padding:8px 12px;border-radius:12px;background:#0b0d12;color:#e5e7eb;' +
      'border:1px solid #065f46;font:600 12px Inter,system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5)';
    b.innerHTML = '<span>Data pasar baru tersedia</span>' +
      '<button type="button" style="all:unset;cursor:pointer;padding:4px 10px;border-radius:8px;background:#10b981;color:#04130d">Muat ulang</button>' +
      '<button type="button" aria-label="Tutup" style="all:unset;cursor:pointer;padding:2px 6px;color:#94a3b8">✕</button>';
    var btn = b.getElementsByTagName('button');
    btn[0].onclick = function () { location.reload(); };
    btn[1].onclick = function () { b.remove(); };
    D.body.appendChild(b);
  }

  function applyNew() {
    if (W.__dailyBadge) W.__dailyBadge(W.__DAILY);
    try { W.dispatchEvent(new CustomEvent('ba:daily-updated', { detail: W.__DAILY })); } catch (e) {}
    if (D.hidden) { location.reload(); } else { banner(); }
  }

  function check(force) {
    if (busy || !/^https?:$/.test(location.protocol)) return;
    if (!force && Date.now() - lastCheck < 60 * 1000) return;
    busy = true; lastCheck = Date.now();
    fetch('data-meta.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (m) {
        if (!m || !m.asOfISO || m.asOfISO <= cur()) return;
        return fetch('data.js', { cache: 'reload' })
          .then(function (r) { if (!r.ok) throw 0; return r.text(); })
          .then(function (txt) {
            if (txt.indexOf('window.__DAILY') < 0) throw 0;
            var s = D.createElement('script'); s.textContent = txt; D.head.appendChild(s); s.remove();
            applyNew();
          });
      })
      .catch(function () { /* offline / belum ada meta: abaikan */ })
      .then(function () { busy = false; });
  }

  W.__dailyCheck = function () { check(true); };
  setTimeout(function () { check(true); }, 4000);
  setInterval(function () { if (!D.hidden) check(false); }, EVERY);
  D.addEventListener('visibilitychange', function () { if (!D.hidden) check(false); });
  W.addEventListener('online', function () { check(true); });
  W.addEventListener('focus', function () { check(false); });
})();
