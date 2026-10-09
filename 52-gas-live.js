/* Gas Fee Live: eth_feeHistory dari RPC publik (Ethereum, Polygon, Arbitrum) tiap ~1,5 dtk, harga ETH/POL dari CoinGecko,
   ambang kemacetan adaptif, rekap harian di perangkat. */
(function(){
var W=window,D=document,$=function(i){return D.getElementById(i)},H=W.__GASH;if(!H)return;
var L=W.__GAS={live:0},CH=H.CH,G=H.G,K=['e','p','a'];
var RPC={e:['https://ethereum-rpc.publicnode.com','https://eth.llamarpc.com','https://cloudflare-eth.com'],p:['https://polygon-bor-rpc.publicnode.com','https://polygon-rpc.com'],a:['https://arb1.arbitrum.io/rpc','https://arbitrum-one-rpc.publicnode.com']},pi={e:0,p:0,a:0};
function rpc(k,m,p,ms){var E=RPC[k],n=E.length,t=0;return new Promise(function(ok,no){(function nx(){if(t>=n)return no(0);var i=(pi[k]+t++)%n,c=new AbortController(),to=setTimeout(function(){c.abort()},ms||4000);
 fetch(E[i],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:m,params:p}),signal:c.signal}).then(function(r){clearTimeout(to);if(!r.ok)throw 0;return r.json()}).then(function(j){if(j.error||j.result==null)throw 0;pi[k]=i;ok(j.result)}).catch(function(){clearTimeout(to);nx()})})()})}
var g=function(h){return parseInt(h,16)/1e9};
function parse(r){var b=r.baseFeePerGas.map(g),w=(r.reward||[]).map(function(x){return g(x[0])}),n=w.length,t=[],i;for(i=0;i<n;i++)t.push(b[i]+w[i]);return{t:t,v:b[n]+w[n-1],tip:w[n-1],base:b[n]}}
var fee=function(k,n){return rpc(k,'eth_feeHistory',['0x'+n.toString(16),'latest',[50]],6000).then(parse)};
var bl={},cfg=function(k){return CH.filter(function(c){return c.k===k})[0]};
function setBase(k,b){var c=cfg(k);if(!c||!(b>0))return;bl[k]=b;c.base=b;c.lo=b*.9;c.hi=b*1.7;c.min=0;c.max=b*10;c.step=b*.05}
/* harga & unit gas -> biaya USD transfer */
var KEY='ba-gas-v1',ST;try{ST=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){ST={}}ST.days=ST.days||{};ST.px=ST.px||{};
var U={e:21000,p:21000,a:21000};
function usd(){var px=ST.px;[['e',px.eth,U.e],['p',px.pol,U.p],['a',px.eth,U.a]].forEach(function(a){var c=cfg(a[0]);if(c&&a[1]>0){c.u0=1;c.usd=a[2]*1e-9*a[1]}})}
function prices(){fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,polygon-ecosystem-token&vs_currencies=usd').then(function(r){return r.json()}).then(function(j){
 if(j.ethereum)ST.px.eth=j.ethereum.usd;if(j['polygon-ecosystem-token'])ST.px.pol=j['polygon-ecosystem-token'].usd;usd()}).catch(function(){})}
function units(){rpc('a','eth_estimateGas',[{from:'0x000000000000000000000000000000000000dEaD',to:'0x000000000000000000000000000000000000dEaD',value:'0x0'}]).then(function(h){var n=parseInt(h,16);if(n>0){U.a=n;usd()}}).catch(function(){})}
/* init: riwayat blok nyata sebagai dasar grafik & ambang adaptif */
function init(k){return fee(k,256).catch(function(){return fee(k,48)}).then(function(r){var s=r.t.slice().sort(function(a,b){return a-b});setBase(k,s[s.length>>1]||r.v);
 var t=r.t.slice(-(G.N+1));while(t.length<G.N+1)t.unshift(t[0]);G.d.forEach(function(p,i){p[k]=t[i]});L[k]=r.v;if(k==='e'){L.pe=r.tip;G.d.forEach(function(p){p.pe=r.tip;p.eb=Math.max(0,p.e-r.tip)})}}).catch(function(){})}
/* rekap harian */
function day(k,v){var d=new Date().toISOString().slice(0,10),o=ST.days[d]=ST.days[d]||{},c=cfg(k),a=o[k]=o[k]||[0,0,v,v,0];
 a[0]++;a[1]+=v;a[2]=Math.min(a[2],v);a[3]=Math.max(a[3],v);a[4]+=c&&c.usd?c.usd*v/c.u0:0;
 var ks=Object.keys(ST.days).sort();while(ks.length>30)delete ST.days[ks.shift()]}
var fx=function(v){return v==null?'--':v<0.01?v.toFixed(4):v<1?v.toFixed(3):v<10?v.toFixed(2):v.toFixed(1)};
var fu=function(v){return v?'$'+(v<0.01?v.toFixed(5):v<1?v.toFixed(4):v.toFixed(2)):'--'};
function recap(){var h=$('gas-kpi');if(!h)return;var el=$('gas-daily');if(!el){el=D.createElement('div');el.id='gas-daily';el.style.cssText='margin-top:10px;overflow-x:auto';h.parentNode.insertBefore(el,h.nextSibling)}
 var ds=Object.keys(ST.days).sort().reverse().slice(0,7),nm={e:'Ethereum',p:'Polygon',a:'Arbitrum'};
 el.innerHTML='<div style="font-size:11px;font-weight:700;color:#fff;margin-bottom:4px">Rekap Harian (gwei: rata-rata · min–maks · biaya transfer)</div><table style="width:100%;font:11px ui-monospace,monospace;color:#e5e7eb;white-space:nowrap"><thead><tr style="color:#6b7280;text-align:left"><th>Tanggal</th>'+K.map(function(k){return '<th style="color:'+cfg(k).col+'">'+nm[k]+'</th>'}).join('')+'</tr></thead><tbody>'+
 ds.map(function(d){return '<tr style="border-top:1px solid rgba(255,255,255,.07)"><td style="color:#9ca3af;padding:3px 8px 3px 0">'+d+'</td>'+K.map(function(k){var a=ST.days[d][k];return '<td style="padding-right:10px">'+(a?fx(a[1]/a[0])+' · '+fx(a[2])+'–'+fx(a[3])+' · '+fu(a[4]/a[0]):'--')+'</td>'}).join('')+'</tr>'}).join('')+'</tbody></table>'}
/* poll cepat */
var busy=0,n=0,on=function(){var p=$('page-crypto-market');return p&&p.classList.contains('active')};
function status(ok){var s=$('gas-feed-status');if(!s)return;s.style.color=ok?'#34d399':'#94a3b8';s.textContent=(ok?'● Online · RPC publik · ':'○ Statis · RPC tidak terjangkau · ')+new Date().toLocaleTimeString('id-ID',{hour12:false}).replace(/\./g,':')}
function poll(){if(busy||D.hidden)return;busy=1;Promise.all(K.map(function(k){return fee(k,1).then(function(r){L[k]=r.v;if(k==='e')L.pe=r.tip;bl[k]=bl[k]*.9995+r.v*.0005;setBase(k,bl[k]);day(k,r.v);return 1}).catch(function(){return 0})})).then(function(a){
  L.live=a.some(Boolean)?1:L.live;status(L.live&&a.some(Boolean));if(++n%10===0){try{localStorage.setItem(KEY,JSON.stringify(ST))}catch(e){}if(on())recap()}}).then(function(){busy=0})}
Promise.all(K.map(init)).then(function(){L.live=1;usd();prices();units();recap();H.gdom();setInterval(function(){if(on())poll()},1500);setInterval(poll,15000);setInterval(prices,60000);setInterval(units,300000)});
D.addEventListener('visibilitychange',function(){if(!D.hidden)poll()});
})();
