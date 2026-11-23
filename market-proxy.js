// Cloudflare Worker (gratis) — proxy data pasar dengan CORS, agar semua kartu live tanpa proxy publik yang rapuh.
// Deploy: dash.cloudflare.com > Workers & Pages > Create Worker > tempel file ini > Deploy.
// Lalu isi window.__BA_WORKER di index.html dengan URL worker (mis. https://market-proxy.akunanda.workers.dev).
const ALLOW = /^(query[12]\.finance\.yahoo\.com|fc\.yahoo\.com|api\.kraken\.com|fred\.stlouisfed\.org|api\.coingecko\.com|stooq\.com)$/;
const UA = 'Mozilla/5.0 (compatible; market-proxy/1.0)';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': '*' };
let sess = null, sessAt = 0;

async function getSession() { // cookie + crumb untuk Yahoo v7/quote (harga, kap. pasar, P/E, EPS, dividen)
  if (sess && Date.now() - sessAt < 36e5) return sess;
  try {
    const r = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'manual' });
    const ck = (r.headers.getSetCookie ? r.headers.getSetCookie() : []).map(c => c.split(';')[0]).join('; ');
    const c = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, cookie: ck } });
    const crumb = await c.text();
    if (c.ok && crumb && !crumb.includes('<')) { sess = { ck, crumb }; sessAt = Date.now(); }
  } catch (e) {}
  return sess;
}

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const target = new URL(req.url).searchParams.get('url');
    if (!target) return new Response('missing url', { status: 400, headers: CORS });
    let u; try { u = new URL(target); } catch (e) { return new Response('bad url', { status: 400, headers: CORS }); }
    if (u.protocol !== 'https:' || !ALLOW.test(u.hostname)) return new Response('host not allowed', { status: 403, headers: CORS });
    u.searchParams.delete('_t'); // parameter anti-cache milik halaman; cache diatur di sini (15 detik)
    const headers = { 'User-Agent': UA, Accept: 'application/json,text/csv,*/*' };
    if (/finance\.yahoo\.com$/.test(u.hostname) && u.pathname.startsWith('/v7/')) {
      const s = await getSession(); if (s) { u.searchParams.set('crumb', s.crumb); headers.cookie = s.ck; }
    }
    const key = new Request(u.toString()); let res = await caches.default.match(key);
    if (!res) {
      const r = await fetch(u.toString(), { headers });
      res = new Response(r.body, r); res.headers.set('cache-control', 'public, max-age=15');
      if (r.ok) ctx.waitUntil(caches.default.put(key, res.clone()));
    }
    const out = new Response(res.body, res);
    for (const k in CORS) out.headers.set(k, CORS[k]);
    return out;
  }
};
