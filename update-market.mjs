// Ambil data pasar dari Yahoo Finance (server-side, tanpa CORS) -> market-data.json
// Isi: kartu Overview Market (symbols) + U.S. Stock Directory & fundamental (directory)
// Jalankan: node scripts/update-market.mjs   (Node 18+, dari root repo)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const H = { 'User-Agent': 'Mozilla/5.0 (compatible; market-snapshot/1.0)' };
const TF = { '1d': ['1d', '5m'], '5d': ['5d', '30m'], '1mo': ['1mo', '1d'], '3mo': ['3mo', '1d'], '1y': ['1y', '1wk'] };
const CARDS = (process.env.SYMBOLS || 'NVDA,AAPL,TSLA,MSFT').split(',');

// Daftar emiten direktori dibaca langsung dari index.html agar selalu sinkron
let DIR = [];
if (existsSync('index.html')) {
  const h = readFileSync('index.html', 'utf8'), i = h.indexOf('const allStockDirectory = [');
  if (i > -1) DIR = [...h.slice(i, h.indexOf('];', i)).matchAll(/symbol:\s*'([A-Z.\-]+)'/g)].map(m => m[1]);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function chart(sym, range, iv) {
  const u = `https://query1.finance.yahoo.com/v8/chart/${sym}?range=${range}&interval=${iv}&includePrePost=false`;
  const r = await fetch(u, { headers: H }); if (!r.ok) throw new Error(sym + ' HTTP ' + r.status);
  const res = (await r.json())?.chart?.result?.[0]; if (!res?.timestamp) throw new Error(sym + ' kosong');
  const q = res.indicators.quote[0], bars = [];
  res.timestamp.forEach((t, i) => { if ([q.open[i], q.high[i], q.low[i], q.close[i]].every(v => v != null)) bars.push({ t: t * 1000, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i], v: q.volume[i] || 0 }); });
  return { meta: res.meta, bars };
}
async function session() { // cookie + crumb untuk endpoint v7/quote
  const r = await fetch('https://fc.yahoo.com', { headers: H, redirect: 'manual' });
  const ck = (r.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
  const c = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { headers: { ...H, cookie: ck } });
  const crumb = await c.text(); if (!c.ok || !crumb || crumb.includes('<')) throw new Error('crumb gagal');
  return { ck, crumb };
}
const num = v => (typeof v === 'number' && isFinite(v) ? v : null);
const out = { updated: new Date().toISOString(), source: 'Yahoo Finance', symbols: {}, directory: {} };

// 1) Kartu Overview Market
for (const s of CARDS) {
  try {
    const d = await chart(s, '5d', '1d'), n = d.bars.length, L = d.bars[n - 1], m = d.meta;
    const e = { quote: { price: m.regularMarketPrice ?? L.c, prev: n >= 2 ? d.bars[n - 2].c : m.chartPreviousClose, hi: m.regularMarketDayHigh ?? L.h, lo: m.regularMarketDayLow ?? L.l, vol: m.regularMarketVolume ?? L.v, open: L.o, ts: (m.regularMarketTime || 0) * 1000 }, charts: {} };
    for (const [k, [r, i]] of Object.entries(TF)) e.charts[k] = (await chart(s, r, i)).bars.slice(-120);
    out.symbols[s] = e; console.log('OK kartu', s);
  } catch (err) { console.error('GAGAL kartu', s, err.message); }
}

// 2) Direktori + fundamental (v7/quote bila crumb berhasil, jika tidak: chart API tanpa fundamental)
let sess = null; try { sess = await session(); } catch (e) { console.error('Tanpa crumb:', e.message); }
for (let i = 0; i < DIR.length && sess; i += 25) {
  const part = DIR.slice(i, i + 25);
  try {
    const u = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${part.join(',')}&crumb=${encodeURIComponent(sess.crumb)}`;
    const r = await fetch(u, { headers: { ...H, cookie: sess.ck } }); if (!r.ok) throw new Error('HTTP ' + r.status);
    for (const x of (await r.json())?.quoteResponse?.result || []) {
      if (!(x.regularMarketPrice > 0)) continue;
      let dy = num(x.dividendYield); if (dy == null && num(x.trailingAnnualDividendYield) != null) dy = x.trailingAnnualDividendYield * 100;
      out.directory[x.symbol] = { price: x.regularMarketPrice, chg: num(x.regularMarketChangePercent) ?? 0, cap: num(x.marketCap), pe: num(x.trailingPE), eps: num(x.epsTrailingTwelveMonths), dy, hi: num(x.fiftyTwoWeekHigh), lo: num(x.fiftyTwoWeekLow), ts: (x.regularMarketTime || 0) * 1000 };
    }
  } catch (e) { console.error('GAGAL quote batch', i, e.message); }
  await sleep(500);
}
for (const s of DIR) { // cadangan per simbol bila v7 gagal
  if (out.directory[s]) continue;
  try {
    const m = (await chart(s, '5d', '1d')).meta, pc = m.chartPreviousClose;
    if (m.regularMarketPrice > 0 && pc > 0) out.directory[s] = { price: m.regularMarketPrice, chg: (m.regularMarketPrice / pc - 1) * 100, cap: null, pe: null, eps: null, dy: null, hi: num(m.fiftyTwoWeekHigh), lo: num(m.fiftyTwoWeekLow), ts: (m.regularMarketTime || 0) * 1000 };
  } catch (e) { console.error('GAGAL', s, e.message); }
  await sleep(250);
}
// 3) Kuotasi tambahan untuk US Market Live Monitor (ETF sektor, futures, makro, watchlist)
const EXTRA = ['SPY','QQQ','XLK','XLF','XLE','XLV','XLY','XLP','XLI','XLB','XLU','XLRE','XLC','ES=F','NQ=F','YM=F','RTY=F','^VIX','DX-Y.NYB','^TNX','GC=F','CL=F','BTC-USD','^FVX','^TYX','EURUSD=X','JPY=X','IDR=X','GBPUSD=X','SI=F','HG=F','NG=F','ETH-USD'];
if (existsSync('index.html')) {
  const h = readFileSync('index.html', 'utf8'), i = h.indexOf('var WL=[');
  if (i > -1) for (const m of h.slice(i, h.indexOf('];', i)).matchAll(/\['([A-Z.\-]+)',/g)) EXTRA.push(m[1]);
}
out.quotes = {};
for (const s of [...new Set(EXTRA)].filter(x => !out.directory[x])) {
  try {
    const d = await chart(s, '5d', '1d'), n = d.bars.length, m = d.meta;
    const price = m.regularMarketPrice ?? d.bars[n - 1].c, prev = n >= 2 ? d.bars[n - 2].c : m.chartPreviousClose;
    if (price > 0 && prev > 0) out.quotes[s] = { price, prev, ts: (m.regularMarketTime || 0) * 1000 };
  } catch (e) { console.error('GAGAL kuotasi', s, e.message); }
  await sleep(250);
}
console.log('Kuotasi tambahan:', Object.keys(out.quotes).length);
for (const s of CARDS) { // samakan angka kartu Overview Market dengan baris direktori
  const q = out.symbols[s]?.quote, d = out.directory[s];
  if (q && d && q.prev > 0) { d.price = q.price; d.chg = (q.price / q.prev - 1) * 100; d.ts = q.ts || d.ts; }
}
console.log('Direktori:', Object.keys(out.directory).length, 'dari', DIR.length);
if (!Object.keys(out.symbols).length && !Object.keys(out.directory).length) { console.error('Tidak ada data, file tidak ditimpa.'); process.exit(1); }
writeFileSync('market-data.json', JSON.stringify(out));
writeFileSync('market-data.js', 'window.__MARKET_SNAPSHOT=' + JSON.stringify(out) + ';'); // dibaca lewat <script>, jalan juga dari file lokal
console.log('Selesai: market-data.json + market-data.js');
