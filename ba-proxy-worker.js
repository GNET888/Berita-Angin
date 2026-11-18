// Cloudflare Worker: proxy CORS pribadi untuk Berita Angin. Deploy -> salin URL -> index.html?worker=https://NAMA.workers.dev
const OK=/^(query[12]\.finance\.yahoo\.com|stooq\.com|api\.coingecko\.com|api\.kraken\.com|api\.alternative\.me|fred\.stlouisfed\.org)$/;
export default{async fetch(req){
  const h={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS'};
  if(req.method==='OPTIONS')return new Response(null,{headers:h});
  const t=new URL(req.url).searchParams.get('url');let u;try{u=new URL(t)}catch(e){return new Response('bad url',{status:400,headers:h})}
  if(u.protocol!=='https:'||!OK.test(u.hostname))return new Response('host not allowed',{status:403,headers:h});
  const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0'},cf:{cacheTtl:20,cacheEverything:true}});
  return new Response(r.body,{status:r.status,headers:{...h,'Content-Type':r.headers.get('Content-Type')||'text/plain','Cache-Control':'public,max-age=20'}});
}};
