// Cloudflare Worker — proxy CORS untuk data saham (Yahoo Finance & Kraken).
// Cara pakai: dash.cloudflare.com > Workers & Pages > Create > Hello World > Deploy > Edit code > tempel file ini > Deploy.
// Lalu buka situs dengan  ?worker=https://NAMA-ANDA.workers.dev  (disimpan otomatis di browser), atau isi window.__BA_WORKER di index.html.
const OK = /^https:\/\/(query[12]\.finance\.yahoo\.com|api\.kraken\.com|api\.coingecko\.com)\//;
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,OPTIONS', 'access-control-allow-headers': '*' };
export default {
  async fetch(req) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const u = new URL(req.url).searchParams.get('url');
    if (!u || !OK.test(u)) return new Response('forbidden', { status: 403, headers: CORS });
    const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; BeritaAngin/1.0)', accept: 'application/json' }, cf: { cacheTtl: 5, cacheEverything: true } });
    return new Response(r.body, { status: r.status, headers: { ...CORS, 'content-type': r.headers.get('content-type') || 'application/json', 'cache-control': 'public, max-age=5' } });
  }
};
