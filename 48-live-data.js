/* Sinkron data online: Crypto (CoinGecko), Stock Exchange (Yahoo Finance), Komponen Likuiditas Makro (FRED + Yahoo + CoinGecko).
   Dijalankan saat halaman dibuka lalu diulang otomatis; bila sumber tak terjangkau, data lama tetap dipakai dan lencana menunjukkan "statis". */
(function(){
  var enc=encodeURIComponent, W=window;
  var R=[function(u){return W.__BA_PROXY?'/api/proxy?url='+enc(u):null},function(u){return u},function(u){return 'https://api.codetabs.com/v1/proxy?quest='+enc(u)},function(u){return 'https://corsproxy.io/?'+enc(u)},function(u){return 'https://api.allorigins.win/raw?url='+enc(u)}];
  function get(u,txt){return window.__baFetch(R,u,txt,8000)}
  function badge(id,anchor,ok,msg){var el=document.getElementById(id);
    if(!el){var a=document.getElementById(anchor);a=a&&(a.closest('.overflow-x-auto')||a.closest('table')||a);if(!a||!a.parentNode)return;
      el=document.createElement('div');el.id=id;el.className='text-[10px] font-mono px-1 py-1';a.parentNode.insertBefore(el,a.nextSibling)}
    el.style.color=ok?'#34d399':'#94a3b8';el.textContent=(ok?'● Online · ':'○ Statis · ')+msg}
  var hm=function(){return new Date().toLocaleTimeString('id-ID',{hour12:false}).replace(/\./g,':')};
  var CG='https://api.coingecko.com/api/v3/', cgCoins=null;
  /* ---------- 1. CRYPTO ---------- */
  function liveCrypto(){
    return Promise.all([get(CG+'coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&price_change_percentage=24h'),get(CG+'global').catch(function(){return null})]).then(function(r){
      var arr=r[0],g=r[1]&&r[1].data,by={};cgCoins=by;
      arr.forEach(function(c){if(!by[c.symbol])by[c.symbol]=c});
      if(g){var p=g.market_cap_percentage||{};W.__CGG={mcap:g.total_market_cap.usd/1e12,vol:g.total_volume.usd/1e9,btc:p.btc,eth:p.eth,stb:(p.usdt||0)+(p.usdc||0)}}
      var keys=Object.keys(cryptoPagesData).sort(),sizes=keys.map(function(k){return cryptoPagesData[k].length}),all=[];
      keys.forEach(function(k){cryptoPagesData[k].forEach(function(c){all.push(c)})});
      all.forEach(function(c,i){c._o=i;var l=by[String(c.symbol).toLowerCase()];
        if(l){c.current_price=l.current_price;c.price_change_percentage_24h=l.price_change_percentage_24h||0;c.total_volume=l.total_volume;c._mc=l.market_cap||0;if(l.image)c.image=l.image}else c._mc=-1});
      all.sort(function(a,b){return b._mc-a._mc||a._o-b._o});
      all.forEach(function(c,i){c.market_cap_rank=i+1});
      var s=0;keys.forEach(function(k,i){cryptoPagesData[k].splice.apply(cryptoPagesData[k],[0,sizes[i]].concat(all.slice(s,s+sizes[i])));s+=sizes[i]});
      if(W.__baCryptoResync)try{W.__baCryptoResync()}catch(e){}
      var bt=by.btc,et=by.eth,sl=by.sol;
      if(bt&&bt.current_price>0){W.__BA_BTC=bt.current_price;try{lastBtcPrice=bt.current_price}catch(e){}
        var fm=function(v){return '$'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})};
        ['live-index-val','orderbook-mid-price'].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=fm(bt.current_price)});
        var tk=document.getElementById('live-ticks-ticker');
        if(tk)[['BTC/USDT',bt],['ETH/USDT',et],['SOL/USDT',sl]].forEach(function(p){if(!p[1])return;tk.querySelectorAll('div').forEach(function(d){var a=d.children;if(a.length===2&&a[0].textContent.trim()===p[0])a[1].textContent=fm(p[1].current_price)})})}
      if(typeof renderCryptoTable==='function')renderCryptoTable();
      badge('ba-live-cr','crypto-table-body',true,'CoinGecko · urut market cap · '+hm());
    }).catch(function(){badge('ba-live-cr','crypto-table-body',false,'CoinGecko tidak terjangkau')})}
  /* ---------- 2. STOCK EXCHANGE ---------- */
  function money(v){return v>=1e12?'$'+(v/1e12).toFixed(2)+'T':v>=1e9?'$'+(v/1e9).toFixed(1)+'B':'$'+(v/1e6).toFixed(0)+'M'}
  function liveStocks(){
    var sy=allStockDirectory.map(function(s){return s.symbol}).join(',');
    return get('https://query1.finance.yahoo.com/v7/finance/quote?symbols='+enc(sy)).then(function(j){
      var q=j.quoteResponse.result,m={};q.forEach(function(x){m[x.symbol]=x});var hit=0;
      allStockDirectory.forEach(function(s){var x=m[s.symbol];if(!x||!x.marketCap||!x.regularMarketPrice)return;hit++;
        s.price=x.regularMarketPrice;var c=x.regularMarketChangePercent||0;s.change=(c>=0?'+':'')+c.toFixed(2)+'%';s.mktCap=money(x.marketCap);s._mc=x.marketCap;s._lp=x.regularMarketPrice;s._lc=c;s._lv=x.regularMarketVolume||0;s._lt=x.regularMarketTime||0;s._lsrc='live'});
      if(hit<5)throw 0;
      var cmp=function(a,b){return (b._mc||0)-(a._mc||0)};allStockDirectory.sort(cmp);if(filteredStockData!==allStockDirectory)filteredStockData.sort(cmp);
      renderStockTable();badge('ba-live-st','stock-table-body',true,'Yahoo Finance · '+hit+' emiten · urut market cap · '+hm());
    }).catch(function(){badge('ba-live-st','stock-table-body',false,'Yahoo Finance tidak terjangkau')})}
  /* ---------- 3. KOMPONEN LIKUIDITAS MAKRO ---------- */
  function fred(id){return get('https://fred.stlouisfed.org/graph/fredgraph.csv?id='+id+'&cosd='+new Date(Date.now()-120*864e5).toISOString().slice(0,10),1).then(function(t){
    var L=t.trim().split('\n');for(var i=L.length-1;i>0;i--){var v=parseFloat(L[i].split(',')[1]);if(isFinite(v))return v}throw 0})}
  function yq(sym){return get('https://query1.finance.yahoo.com/v8/finance/chart/'+enc(sym)+'?range=1d&interval=5m').then(function(j){return j.chart.result[0].meta.regularMarketPrice})}
  function nz(p){return p.catch(function(){return NaN})}
  function liveMacro(){
    var M=W.__MLC;if(!M)return;
    return Promise.all([nz(fred('WALCL')),nz(fred('RRPONTSYD')),nz(fred('WTREGEN')),nz(fred('M2SL')),nz(fred('DGS10')),nz(fred('ECBASSETSW')),nz(fred('JPNASSETS')),nz(yq('EURUSD=X')),nz(yq('USDJPY=X')),nz(yq('DX-Y.NYB'))]).then(function(a){
      var V={fed:a[0]/1e6,rrp:a[1]/1e3,tga:a[2]/1e6,m2:a[3]/1e3,ust:a[4],ecb:a[5]/1e6*a[7],boj:a[6]*1e8/a[8]/1e12,dxy:a[9]};
      if(cgCoins&&cgCoins.usdt&&cgCoins.usdc)V.stb=(cgCoins.usdt.market_cap+cgCoins.usdc.market_cap)/1e9;
      var n=0;M.C.forEach(function(c){var v=V[c.id];if(!isFinite(v)||v<=0)return;n++;
        c.b=v;c.x=c.o=c.p=v;c.h=c.h.map(function(){return v*(1+(Math.random()-.5)*c.r*2)})});
      var f=M.C.filter(function(c){return c.id==='fed'})[0],r=M.C.filter(function(c){return c.id==='rrp'})[0],t=M.C.filter(function(c){return c.id==='tga'})[0];
      for(var i=0;i<M.H.net.length&&f&&r&&t;i++){M.H.fed[i]=+f.h[i].toFixed(3);M.H.rrp[i]=+r.h[i].toFixed(3);M.H.tga[i]=+t.h[i].toFixed(3);M.H.net[i]=+(f.h[i]-r.h[i]-t.h[i]).toFixed(3)}
      badge('ba-live-ml','mlc-table',n>0,n+' dari 9 komponen dari FRED/Yahoo/CoinGecko · '+hm());
    })}
  function fh(id){return get('https://fred.stlouisfed.org/graph/fredgraph.csv?id='+id+'&cosd='+new Date(Date.now()-110*864e5).toISOString().slice(0,10),1).then(function(t){
    var o=[];t.trim().split('\n').slice(1).forEach(function(l){var p=l.split(','),v=parseFloat(p[1]);if(p[0]&&isFinite(v))o.push([p[0],v])});return o})}
  function histMacro(){var M=W.__MLC;if(!M)return;var MN=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return Promise.all([fh('WALCL'),fh('RRPONTSYD'),fh('WTREGEN')]).then(function(r){
      var F=r[0],R=r[1],T=r[2];if(R.length<10||!F.length||!T.length)throw 0;
      var fi=0,ti=0,fv=null,tv=null,D={t:[],fed:[],rrp:[],tga:[],net:[],iso:[]};
      R.forEach(function(q){var d=q[0];while(fi<F.length&&F[fi][0]<=d){fv=F[fi][1];fi++}while(ti<T.length&&T[ti][0]<=d){tv=T[ti][1];ti++}
        if(fv==null||tv==null)return;var f=fv/1e6,rp=q[1]/1e3,tg=tv/1e6;
        D.iso.push(d);D.t.push(d.slice(8,10)+' '+MN[+d.slice(5,7)-1]);D.fed.push(+f.toFixed(3));D.rrp.push(+rp.toFixed(3));D.tga.push(+tg.toFixed(3));D.net.push(+(f-rp-tg).toFixed(3))});
      if(D.t.length<10)throw 0;Object.keys(D).forEach(function(k){D[k]=D[k].slice(-60)});M.D=D}).catch(function(){})}
  function boot(){liveCrypto().then(function(){return liveMacro()}).then(function(){return histMacro()}).catch(function(){});liveStocks()}
  setTimeout(boot,60);
  setInterval(function(){if(!document.hidden)liveCrypto()},5*6e4);
  setInterval(function(){if(!document.hidden)liveStocks()},10*6e4);
  setInterval(function(){if(!document.hidden){liveMacro();histMacro()}},6*36e5);
})();
