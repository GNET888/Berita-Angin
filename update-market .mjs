// Ambil data pasar dari Yahoo Finance (server-side, tanpa CORS) -> market-data.json
// Jalankan: node scripts/update-market.mjs   (Node 18+)
import { writeFileSync } from 'node:fs';
const SYMBOLS = (process.env.SYMBOLS || 'NVDA,AAPL,TSLA,MSFT').split(',');
const TF = { '1d': ['1d', '5m'], '5d': ['5d', '30m'], '1mo': ['1mo', '1d'], '3mo': ['3mo', '1d'], '1y': ['1y', '1wk'] };
const H = { 'User-Agent': 'Mozilla/5.0 (compatible; market-snapshot/1.0)' };
async function chart(sym, range, iv) {
  const u = `https://query1.finance.yahoo.com/v8/chart/${sym}?range=${range}&interval=${iv}&includePrePost=false`;
  const r = await fetch(u, { headers: H }); if (!r.ok) throw new Error(sym + ' HTTP ' + r.status);
  const res = (await r.json())?.chart?.result?.[0]; if (!res?.timestamp) throw new Error(sym + ' kosong');
  const q = res.indicators.quote[0], bars = [];
  res.timestamp.forEach((t, i) => { if ([q.open[i], q.high[i], q.low[i], q.close[i]].every(v => v != null)) bars.push({ t: t * 1000, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i], v: q.volume[i] || 0 }); });
  return { meta: res.meta, bars };
}
const out = { updated: new Date().toISOString(), source: 'Yahoo Finance', symbols: {} };
for (const s of SYMBOLS) {
  try {
    const d = await chart(s, '5d', '1d'), n = d.bars.length, L = d.bars[n - 1], m = d.meta;
    const e = { quote: { price: m.regularMarketPrice ?? L.c, prev: n >= 2 ? d.bars[n - 2].c : m.chartPreviousClose, hi: m.regularMarketDayHigh ?? L.h, lo: m.regularMarketDayLow ?? L.l, vol: m.regularMarketVolume ?? L.v, open: L.o, ts: (m.regularMarketTime || 0) * 1000 }, charts: {} };
    for (const [k, [r, i]] of Object.entries(TF)) e.charts[k] = (await chart(s, r, i)).bars.slice(-120);
    out.symbols[s] = e; console.log('OK', s);
  } catch (err) { console.error('GAGAL', s, err.message); }
}
if (!Object.keys(out.symbols).length) { console.error('Tidak ada data, file tidak ditimpa.'); process.exit(1); }
writeFileSync('market-data.json', JSON.stringify(out));
