/* Berita Angin - Service Worker
 * Tujuan: aplikasi terbuka cepat dan tetap tampil saat jaringan lemah.
 * - Halaman utama & data harian: jaringan dulu (3 dtk), jika lambat/gagal pakai salinan tersimpan.
 * - File statis (ikon, gambar, skrip lokal): tampil dari cache, diperbarui diam-diam di belakang.
 * - Data pasar & semua permintaan ke domain lain: tidak disentuh (selalu langsung ke jaringan).
 * Naikkan VER setiap kali ingin memaksa semua perangkat membuang cache lama.
 */
const VER = 'ba-v1';
const CACHE = VER + '-static';
const SHELL = ['index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'profil.gif'];
const SCOPE = self.registration.scope;
const SHELL_KEY = SCOPE + 'index.html';
const NET_TIMEOUT = 3000;

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(new Request(SCOPE + u, { cache: 'reload' })).catch(() => {}))))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.indexOf('ba-') === 0 && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function okToCache(res) {
  return res && res.status === 200 && res.type === 'basic';
}

// Simpan salinan; untuk berkas data berparameter jam (data.js?d=...) buang versi lama dengan path sama.
async function store(key, res, dropSamePath) {
  try {
    const c = await caches.open(CACHE);
    if (dropSamePath) {
      const p = new URL(key).pathname;
      const ks = await c.keys();
      await Promise.all(ks.filter((k) => new URL(k.url).pathname === p && k.url !== key).map((k) => c.delete(k)));
    }
    await c.put(key, res);
  } catch (e) {}
}

function networkFirst(req, key, dropSamePath) {
  return new Promise((resolve) => {
    let settled = false;
    const fallback = async () => {
      const c = await caches.open(CACHE);
      return (await c.match(key)) || null;
    };
    const timer = setTimeout(async () => {
      const hit = await fallback();
      if (hit && !settled) { settled = true; resolve(hit); }
    }, NET_TIMEOUT);
    fetch(req)
      .then(async (res) => {
        clearTimeout(timer);
        if (okToCache(res)) store(key, res.clone(), dropSamePath);
        if (!settled) { settled = true; resolve(res); }
      })
      .catch(async () => {
        clearTimeout(timer);
        if (settled) return;
        const hit = await fallback();
        settled = true;
        resolve(hit || Response.error());
      });
  });
}

async function staleWhileRevalidate(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  const net = fetch(req)
    .then((res) => { if (okToCache(res)) c.put(req, res.clone()); return res; })
    .catch(() => null);
  return hit || (await net) || Response.error();
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // API pasar, CDN, dsb: langsung ke jaringan
  const path = url.pathname;
  if (/sw\.js$/.test(path) || /market[^/]*\.json$/.test(path)) return; // selalu segar

  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, SHELL_KEY, false));
  } else if (/(^|\/)(data|market-data)\.js$/.test(path)) {
    e.respondWith(networkFirst(req, url.href, true));
  } else {
    e.respondWith(staleWhileRevalidate(req));
  }
});
