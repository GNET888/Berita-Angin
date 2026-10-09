/* Berita Angin - Sinkron Online Harian: Saham (Yahoo), Global Market (Yahoo), Crypto (CoinGecko, alternative.me),
   snapshot harian di perangkat untuk Market Statistik. Gagal jaringan = data lama tetap dipakai. */
(function(){
var W=window,D=document,enc=encodeURIComponent,$=function(i){return D.getElementById(i)};
var LV=W.__LV=W.__LV||{};
var P=[function(u){return W.__BA_PROXY?'/api/proxy?url='+enc(u):null},function(u){return u},function(u){return 'https://api.codetabs.com/v1/proxy?quest='+enc(u)},function(u){return 'https://corsproxy.io/?'+enc(u)}];
function get(u){return window.__baFetch(P,u,false,8000)}
function chart(sym,rg,iv){return get('https://query1.finance.yahoo.com/v8/finance/chart/'+enc(sym)+'?range='+rg+'&interval='+iv).then(function(j){
 var r=j.chart.result[0],m=r.meta,q=r.indicators.quote[0].close||[],ts=r.timestamp||[],a=[],i;
 for(i=0;i<q.length;i++)if(q[i]!=null&&isFinite(q[i]))a.push(q[i]);
 var px=m.regularMarketPrice||a[a.length-1],prev=m.chartPreviousClose;
 if(rg!=='1d'){var n=ts.length,lastDay=new Date(ts[n-1]*1000).toISOString().slice(0,10),mDay=new Date((m.regularMarketTime||ts[n-1])*1000).toISOString().slice(0,10);
  prev=lastDay===mDay&&a.length>1?a[a.length-2]:a[a.length-1]}
 if(!(px>0)||!(prev>0))throw 0;return{px:px,prev:prev,h:a}})}
function pool(list,fn,n){var i=0,run=0;return new Promise(function(done){function nx(){if(i>=list.length&&!run)return done();
 while(run<n&&i<list.length){(function(x){run++;fn(x).catch(function(){}).then(function(){run--;nx()})})(list[i++])}}nx()})}
function fit(a,n){if(!a.length)return a;var o=[],i;for(i=0;i<n;i++)o.push(a[Math.round(i/(n-1)*(a.length-1))]);return o}
var pc=function(x){return x?(x.px/x.prev-1)*100:null};
var NOW={};
/* ---- Global Market ---- */
var GS={'S&P 500':'^GSPC','NASDAQ Composite':'^IXIC','Dow Jones Industrial':'^DJI','Russell 2000':'^RUT','FTSE 100':'^FTSE','DAX Performance Index':'^GDAXI','CAC 40':'^FCHI','Euro Stoxx 50':'^STOXX50E','Nikkei 225':'^N225','TOPIX Index':'1306.T','Hang Seng Index':'^HSI','Shanghai Composite':'000001.SS','CSI 300':'000300.SS','Nifty 50':'^NSEI','KOSPI':'^KS11','ASX 200':'^AXJO','IHSG':'^JKSE','Straits Times Index':'^STI','MSCI Emerging Markets':'EEM','Spot Gold (XAU)':'GC=F','Spot Silver (XAG)':'SI=F','Crude Oil WTI':'CL=F','Brent Crude Oil':'BZ=F','Natural Gas':'NG=F','Copper Futures':'HG=F','US Dollar Index (DXY)':'DX-Y.NYB'};
var FXS={'USD/IDR':'IDR=X','EUR/USD':'EURUSD=X','USD/JPY':'JPY=X','GBP/USD':'GBPUSD=X','USD/SGD':'SGD=X','AUD/USD':'AUDUSD=X'};
function put(o,r,mul){mul=mul||1;o.v=o.v0=r.px*mul;o.p=r.prev*mul;var h=fit(r.h.map(function(v){return v*mul}),40);if(h.length){h[h.length-1]=o.v;o.h=h}o.live=1}
function liveGlobal(){var G=W.__GM;if(!G)return Promise.resolve();var L=[],k;
 for(k in GS)L.push([G.items,k,GS[k]]);for(k in FXS)L.push([G.FX,k,FXS[k]]);
 return pool(L,function(e){return chart(e[2],'1mo','1d').then(function(r){var o=e[0].filter(function(x){return x.n===e[1]})[0];if(!o)return;
  put(o,r,e[2]==='HG=F'?2204.62:1);NOW[e[2]]=r})},4)}
/* ---- Ringkasan indeks Saham ---- */
function liveStock(){var X=W.__IX;if(!X)return Promise.resolve();var M={nasdaq:'^IXIC',sp:'^GSPC',dow:'^DJI',msft:'MSFT'};
 return pool(X,function(x){return chart(M[x.key],'1d','5m').then(function(r){x.start=r.px;x.prev=r.prev;x.px=r.px;x.live=1;
  if(W.__IXseed)W.__IXseed(x);if(x.h&&r.h.length>3){x.h=fit(r.h,x.h.length)}x.hi=Math.max.apply(null,x.h||[r.px]);x.lo=Math.min.apply(null,x.h||[r.px]);NOW[M[x.key]]=r})},4)}
/* ---- Crypto ---- */
var STB=/^(usdt|usdc|dai|usde|fdusd|usds|busd|tusd|steth|wsteth|wbtc|weth|wbeth|usdt0|usd1|pyusd|susds|bsc-usd)$/;
function liveCrypto(){var CG='https://api.coingecko.com/api/v3/';
 return Promise.all([get(CG+'coins/markets?vs_currency=usd&order=market_cap_desc&per_page=60&page=1&price_change_percentage=24h,30d').catch(function(){return null}),
  get('https://api.alternative.me/fng/?limit=1').catch(function(){return null})]).then(function(r){var a=r[0];
  if(a){var by={};a.forEach(function(c){by[c.symbol]=c});var b=by.btc;
   if(b){var al=a.filter(function(c){return c.symbol!=='btc'&&!STB.test(c.symbol)}).slice(0,50),bt=b.price_change_percentage_30d_in_currency;
    var w=al.filter(function(c){return (c.price_change_percentage_30d_in_currency||-1e9)>bt}).length;LV.alt=Math.round(w/al.length*100)}
   NOW.btc=by.btc;NOW.eth=by.eth}
  if(r[1]&&r[1].data&&r[1].data[0])NOW.fng={v:+r[1].data[0].value,c:r[1].data[0].value_classification}})}
/* ---- Snapshot harian ---- */
var KEY='ba-daily-v1',ST;try{ST=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){ST={}}ST.days=ST.days||[];
function snap(){var d=new Date().toISOString().slice(0,10),r={d:d},g=function(s){return NOW[s]?NOW[s].px:null},c=function(s){return pc(NOW[s])};
 r.btc=NOW.btc?NOW.btc.current_price:null;r.btcc=NOW.btc?NOW.btc.price_change_percentage_24h:null;r.eth=NOW.eth?NOW.eth.current_price:null;r.ethc=NOW.eth?NOW.eth.price_change_percentage_24h:null;
 r.fng=NOW.fng?NOW.fng.v:null;r.alt=LV.alt!=null?LV.alt:null;
 r.spx=g('^GSPC');r.spxc=c('^GSPC');r.ndx=g('^IXIC');r.ndxc=c('^IXIC');r.dji=g('^DJI');r.djic=c('^DJI');
 r.gold=g('GC=F');r.goldc=c('GC=F');r.wti=g('CL=F');r.wtic=c('CL=F');r.dxy=g('DX-Y.NYB');r.dxyc=c('DX-Y.NYB');
 if(r.btc==null&&r.spx==null)return;
 var a=ST.days,i=a.length-1;if(i>=0&&a[i].d===d){for(var k in r)if(r[k]!=null)a[i][k]=r[k]}else a.push(r);
 while(a.length>90)a.shift();ST.t=Date.now();try{localStorage.setItem(KEY,JSON.stringify(ST))}catch(e){}}
function f(v,n){return v==null?'--':v.toLocaleString('en-US',{minimumFractionDigits:n,maximumFractionDigits:n})}
function ch(v){return v==null?'<span class="text-gray-500">--</span>':'<span class="'+(v>=0?'text-emerald-400':'text-rose-400')+'">'+(v>=0?'+':'')+v.toFixed(2)+'%</span>'}
function summary(){var t=ST.days[ST.days.length-1];if(!t)return'Menunggu data online pertama...';var up=[t.btcc,t.spxc,t.ndxc,t.goldc].filter(function(v){return v!=null});
 var pos=up.filter(function(v){return v>0}).length,tx;
 tx=!up.length?'':pos===up.length?'Crypto, saham AS, dan emas kompak menguat hari ini.':pos===0?'Crypto, saham AS, dan emas kompak melemah hari ini.':pos+' dari '+up.length+' aset utama menguat, sinyal pasar campuran.';
 if(t.dxyc!=null)tx+=' Dolar AS (DXY) '+(t.dxyc>=0?'menguat':'melemah')+' '+Math.abs(t.dxyc).toFixed(2)+'%.';
 if(t.fng!=null)tx+=' Fear &amp; Greed Crypto '+t.fng+(NOW.fng?' ('+NOW.fng.c+')':'')+'.';
 if(t.alt!=null)tx+=' Indeks Altcoin Season '+t.alt+'/100.';return tx}
function render(){var box=$('ms-bias');if(!box)return;var el=$('ms-daily');
 if(!el){el=D.createElement('div');el.id='ms-daily';el.className='mt-4 bg-black/40 border border-card-border rounded-xl p-4';box.parentNode.insertBefore(el,box.nextSibling)}
 var rows=ST.days.slice(-14).reverse().map(function(r){return '<tr class="border-t border-card-border"><td class="py-1.5 pr-3 text-gray-400">'+r.d+'</td><td class="pr-3">$'+f(r.btc,0)+' '+ch(r.btcc)+'</td><td class="pr-3">$'+f(r.eth,0)+'</td><td class="pr-3">'+f(r.spx,0)+' '+ch(r.spxc)+'</td><td class="pr-3">'+f(r.ndx,0)+' '+ch(r.ndxc)+'</td><td class="pr-3">$'+f(r.gold,0)+' '+ch(r.goldc)+'</td><td class="pr-3">'+f(r.dxy,2)+'</td><td class="pr-3">'+(r.fng==null?'--':r.fng)+'</td><td>'+(r.alt==null?'--':r.alt)+'</td></tr>'}).join('');
 el.innerHTML='<div class="flex items-center justify-between mb-2"><h3 class="text-sm font-bold text-white"><i class="fa-solid fa-calendar-day text-brand-accent mr-1.5"></i>Rangkuman Harian (Online)</h3><span class="text-[10px] font-mono text-gray-500">'+(ST.t?'Sinkron '+new Date(ST.t).toLocaleTimeString('id-ID',{hour12:false}).replace(/\./g,':'):'belum sinkron')+'</span></div><p class="text-xs text-gray-300 mb-3">'+summary()+'</p><div class="overflow-x-auto"><table class="w-full text-[11px] font-mono text-white whitespace-nowrap"><thead class="text-gray-500 text-left"><tr><th class="pb-1 pr-3">Tanggal</th><th class="pr-3">BTC</th><th class="pr-3">ETH</th><th class="pr-3">S&amp;P 500</th><th class="pr-3">NASDAQ</th><th class="pr-3">Emas</th><th class="pr-3">DXY</th><th class="pr-3">F&amp;G</th><th>Alt</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="text-[10px] text-gray-500 mt-2">Riwayat terkumpul tiap hari dari data online dan disimpan di perangkat ini (maks. 90 hari).</p>'}
var busy=0;function sync(){if(busy)return;busy=1;Promise.all([liveCrypto(),liveStock(),liveGlobal()]).then(function(){snap()}).catch(function(){}).then(function(){busy=0;render()})}
render();setTimeout(sync,1500);setInterval(function(){if(!D.hidden)sync()},5*60*1000);
D.addEventListener('visibilitychange',function(){if(!D.hidden&&Date.now()-(ST.t||0)>5*60*1000)sync()});
})();
