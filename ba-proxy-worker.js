/* Cloudflare Worker: proxy data pasar untuk Berita Angin (gratis, 100rb request/hari).
   Deploy: dash.cloudflare.com > Workers & Pages > Create > Hello World > Edit code > tempel file ini > Deploy.
   Lalu buka situs sekali dengan:  https://SITUS-ANDA/?worker=https://NAMA.AKUN.workers.dev  (tersimpan otomatis). */
const ALLOW = /^(query[12]\.finance\.yahoo\.com|api\.coingecko\.com|www\.okx\.com|fapi\.binance\.com|api\.binance\.com|data-api\.binance\.vision|api\.bybit\.com|api\.kraken\.com|api\.coinlore\.net|api\.frankfurter\.(app|dev))$/;
export default {
  async fetch(req, env, ctx) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Access-Control-Allow-Headers': '*' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    let u; try { u = new URL(new URL(req.url).searchParams.get('url')); } catch (e) { return new Response('bad url', { status: 400, headers: cors }); }
    if (u.protocol !== 'https:' || !ALLOW.test(u.hostname)) return new Response('forbidden', { status: 403, headers: cors });
    const cache = caches.default, key = new Request(u.toString());
    let r = await cache.match(key);
    if (!r) {
      const up = await fetch(u.toString(), { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BeritaAngin)', 'Accept': 'application/json,*/*' } });
      r = new Response(up.body, { status: up.status, headers: { 'Content-Type': up.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'public, max-age=30' } });
      if (up.ok) ctx.waitUntil(cache.put(key, r.clone()));
    }
    const h = new Headers(r.headers); for (const k in cors) h.set(k, cors[k]);
    return new Response(r.body, { status: r.status, headers: h });
  }
};
