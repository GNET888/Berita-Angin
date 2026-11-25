/* Berita Angin - Service Worker (v2)
 * - Halaman utama: jaringan dulu (3 dtk); jika lambat/gagal pakai salinan tersimpan.
 * - File statis lokal (ikon, gambar, skrip): tampil dari cache, diperbarui diam-diam di belakang.
 * - Data pasar (market.json, market-data.json, daily.json, raw.githubusercontent.com) dan
 *   semua permintaan ke domain lain: TIDAK disentuh, selalu langsung ke jaringan,
 *   supaya semua browser menerima data terbaru yang sama.
 * - Naikkan VER setiap kali ingin memaksa semua perangkat membuang cache lama.
 */
const VER = 'ba-v2';
const CACHE = VER + '-static';
const SHELL = ['index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const SCOPE = self.registration.scope;
const SHELL_KEY = SCOPE + 'index.html';
const NET_TIMEOUT = 3000;
const DATA_FILE = /\/(market|market-data|daily|data)\.(json|js)$/i;

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(SHELL.map((u) => c.add(new Request(SCOPE + u, { cache: 'reload' })).catch(() => {})))
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((r) => { clearTimeout(t); resolve(r); }, (err) => { clearTimeout(t); reject(err); });
  });
}

async function putCache(req, res) {
  try {
    if (res && res.ok && res.type !== 'opaque') {
      const c = await caches.open(CACHE);
      await c.put(req, res.clone());
    }
  } catch (e) { /* abaikan */ }
}

/* Halaman utama: jaringan dulu, cadangan cache */
async function handleNavigate(req) {
  const net = fetch(req, { cache: 'no-cache' });
  try {
    const res = await withTimeout(net, NET_TIMEOUT);
    if (res && res.ok) putCache(SHELL_KEY, res.clone());
    return res;
  } catch (e) {
    const hit = await caches.match(SHELL_KEY);
    if (hit) {
      net.then((r) => { if (r && r.ok) putCache(SHELL_KEY, r); }).catch(() => {}); // perbarui diam-diam
      return hit;
    }
    return net; // belum ada cache: tunggu jaringan apa adanya
  }
}

/* File statis lokal: cache dulu, perbarui di belakang */
async function handleStatic(req) {
  const hit = await caches.match(req);
  const refresh = fetch(req)
    .then((res) => { putCache(req, res.clone()); return res; })
    .catch(() => null);
  if (hit) return hit;
  const res = await refresh;
  return res || Response.error();
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // domain lain (termasuk raw.githubusercontent.com): langsung jaringan
  if (DATA_FILE.test(url.pathname)) return;                 // file data pasar lokal: langsung jaringan
  if (url.pathname.indexOf('/api/') !== -1) return;

  if (req.mode === 'navigate') {
    e.respondWith(handleNavigate(req));
    return;
  }
  if (/\.(png|jpe?g|gif|webp|svg|ico|woff2?|webmanifest|css|js)$/i.test(url.pathname)) {
    e.respondWith(handleStatic(req));
  }
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
