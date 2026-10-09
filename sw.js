/* Service worker Berita Angin.
   - Data harian (data.js, data-meta.json) dan halaman: NETWORK-FIRST agar selalu data terbaru, cache hanya cadangan offline.
   - CSS/JS/ikon lokal: stale-while-revalidate (cepat, diperbarui di latar belakang).
   - Pustaka CDN (chart.js, font): cache-first.
   - API pasar (CoinGecko, Yahoo, proxy, dll): tidak disentuh.
   __BUILD__ diganti otomatis oleh GitHub Actions tiap deploy sehingga cache lama dibuang. */
const BUILD = '__BUILD__';
const CACHE = 'ba-' + BUILD;
const CDN = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const SHELL = ['./', 'index.html', 'data.js', 'data-meta.json', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('ba-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(req) {
  return fetch(req, { cache: 'no-store' }).then((res) => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then((m) => m || caches.match('index.html')));
}
function staleWhileRevalidate(req) {
  return caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  });
}
function cacheFirst(req) {
  return caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    const p = url.pathname;
    if (req.mode === 'navigate' || /\/(data\.js|data-meta\.json|index\.html)$/.test(p) || p.endsWith('/')) {
      e.respondWith(networkFirst(req)); return;
    }
    e.respondWith(staleWhileRevalidate(req)); return;
  }
  if (CDN.includes(url.hostname)) { e.respondWith(cacheFirst(req)); return; }
  /* lainnya (API pasar, proxy): biarkan langsung ke jaringan */
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });
