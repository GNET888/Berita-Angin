/**
 * Berita Angin - Market Proxy (Cloudflare Worker)
 *
 * Dipanggil index.html sebagai:  https://<worker>.workers.dev/?url=<URL-TUJUAN-YANG-DI-ENCODE>
 * Fungsi: melewati blokir CORS + cache singkat di edge supaya harga saham selalu segar
 * tanpa bergantung pada proxy publik gratisan (codetabs / corsproxy / allorigins).
 */

// Hanya host ini yang boleh di-proxy (mencegah Worker dipakai orang lain sebagai open proxy).
const ALLOWED_HOSTS = new Set([
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
  'stooq.com',
  'api.kraken.com',
  'api.coingecko.com',
  'api.alternative.me',
  'fred.stlouisfed.org',
]);

// Lama cache di edge (detik). Harga saham: pendek. Lainnya: sedikit lebih lama.
const TTL_QUOTE = 15;
const TTL_OTHER = 30;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

function reply(body, status, extra) {
  return new Response(body, {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', ...(extra || {}) },
  });
}

// ---- Yahoo "crumb" (dibutuhkan endpoint v7/finance/quote) ----
let crumbCache = { crumb: '', cookie: '', t: 0 };

async function getCrumb(force) {
  if (!force && crumbCache.crumb && Date.now() - crumbCache.t < 6 * 3600 * 1000) return crumbCache;
  const r1 = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'manual' });
  const raw = typeof r1.headers.getSetCookie === 'function' ? r1.headers.getSetCookie() : [r1.headers.get('set-cookie') || ''];
  const cookie = raw.map((s) => s.split(';')[0]).filter(Boolean).join('; ');
  const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Cookie: cookie },
  });
  const crumb = (await r2.text()).trim();
  if (!r2.ok || !crumb || crumb.length > 60 || crumb.indexOf('<') >= 0) throw new Error('crumb');
  crumbCache = { crumb, cookie, t: Date.now() };
  return crumbCache;
}

async function upstream(target, isQuote) {
  const cfOpts = {
    cacheEverything: true,
    cacheTtlByStatus: { '200-299': isQuote ? TTL_QUOTE : TTL_OTHER, '300-599': 0 },
  };
  const headers = { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*' };

  // v7/finance/quote butuh crumb + cookie
  if (target.pathname.indexOf('/v7/finance/quote') === 0) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const c = await getCrumb(attempt > 0);
        const t = new URL(target.toString());
        t.searchParams.set('crumb', c.crumb);
        const res = await fetch(t.toString(), { headers: { ...headers, Cookie: c.cookie }, cf: cfOpts });
        if (res.status !== 401 && res.status !== 403) return res;
      } catch (e) {
        /* coba lagi / jatuh ke permintaan biasa di bawah */
      }
    }
  }
  return fetch(target.toString(), { headers, cf: cfOpts });
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'GET') return reply('{"error":"method"}', 405);

    const u = new URL(request.url);
    if (u.pathname === '/health') return reply('{"ok":true}', 200);

    const raw = u.searchParams.get('url');
    if (!raw) return reply('{"error":"param url wajib"}', 400);

    let target;
    try {
      target = new URL(raw);
    } catch (e) {
      return reply('{"error":"url tidak valid"}', 400);
    }
    if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
      return reply('{"error":"host tidak diizinkan"}', 403);
    }
    // Buang parameter anti-cache dari browser agar cache edge bisa bekerja
    target.searchParams.delete('_t');

    const isQuote = /finance\.yahoo\.com|api\.kraken\.com/.test(target.hostname);
    try {
      const res = await upstream(target, isQuote);
      const body = await res.arrayBuffer();
      return new Response(body, {
        status: res.status,
        headers: {
          ...CORS,
          'Content-Type': res.headers.get('Content-Type') || 'application/json; charset=utf-8',
          'Cache-Control': res.ok ? 'public, max-age=' + (isQuote ? 10 : 20) : 'no-store',
        },
      });
    } catch (e) {
      return reply('{"error":"upstream gagal"}', 502);
    }
  },
};
