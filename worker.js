// Cloudflare Worker proxy untuk Berita Angin (gratis). Deploy -> salin URL -> buka situs dengan ?worker=https://NAMA.workers.dev
const OK=/^https:\/\/(query[12]\.finance\.yahoo\.com|stooq\.com|api\.coingecko\.com|api\.alternative\.me|fred\.stlouisfed\.org|api\.kraken\.com)\//;
export default{async fetch(req){
  const h={'access-control-allow-origin':'*'};
  const u=new URL(req.url).searchParams.get('url');
  if(!u||!OK.test(u))return new Response('bad url',{status:400,headers:h});
  const r=await fetch(u,{headers:{'user-agent':'Mozilla/5.0'},cf:{cacheTtl:20,cacheEverything:true}});
  return new Response(r.body,{status:r.status,headers:{...h,'content-type':r.headers.get('content-type')||'text/plain','cache-control':'public,max-age=20'}});
}};
