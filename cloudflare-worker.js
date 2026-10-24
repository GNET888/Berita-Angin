// Proxy CORS pribadi untuk Berita Angin (Cloudflare Workers, paket gratis)
// Cara: dash.cloudflare.com > Workers & Pages > Create > Hello World > Edit code > tempel file ini > Deploy.
// Lalu isi URL worker di index.html (window.__BA_WORKER) atau lewat konsol: localStorage.setItem('ba-worker','https://NAMA.workers.dev')
const ALLOW = [/(^|\.)finance\.yahoo\.com$/, /^api\.kraken\.com$/, /^api\.coingecko\.com$/, /(^|\.)cnbc\.com$/, /(^|\.)alternative\.me$/, /(^|\.)stlouisfed\.org$/];
export default {
  async fetch(req) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const raw = new URL(req.url).searchParams.get('url');
    if (!raw) return new Response('ok', { headers: cors });
    let t; try { t = new URL(raw); } catch (e) { return new Response('bad url', { status: 400, headers: cors }); }
    if (t.protocol !== 'https:' || !ALLOW.some(r => r.test(t.hostname))) return new Response('forbidden', { status: 403, headers: cors });
    const r = await fetch(t.toString(), { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept': 'application/json,text/xml,*/*' }, cf: { cacheTtl: 20, cacheEverything: true } });
    const h = new Headers(cors); h.set('Content-Type', r.headers.get('Content-Type') || 'application/json'); h.set('Cache-Control', 'public, max-age=20');
    return new Response(r.body, { status: r.status, headers: h });
  }
};
