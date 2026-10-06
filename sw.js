/* Service worker Berita Angin: shell cepat + tetap bisa dibuka saat offline. Data pasar (API) tidak pernah di-cache. */
const V='ba-v1',SHELL=['./','manifest.webmanifest','icon-192.png','icon-512.png'];
const NOCACHE=/(coingecko|yahoo|codetabs|corsproxy|allorigins|rss2json|alternative\.me|stlouisfed|publicnode|llamarpc|cloudflare-eth|arbitrum|polygon-rpc|\/api\/)/i;
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).catch(()=>{}).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET'||NOCACHE.test(r.url))return;
  const u=new URL(r.url);
  if(r.mode==='navigate'){ /* halaman: jaringan dulu, cadangan dari cache */
    e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(V).then(h=>h.put(r,c));return x}).catch(()=>caches.match(r).then(x=>x||caches.match('./'))));return}
  if(u.origin===location.origin||/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(u.hostname)){ /* aset: cache dulu, perbarui di belakang */
    e.respondWith(caches.open(V).then(c=>c.match(r).then(hit=>{const net=fetch(r).then(x=>{if(x&&(x.ok||x.type==='opaque'))c.put(r,x.clone());return x}).catch(()=>hit);return hit||net})))}
});
