(function(){
'use strict';
var $=function(i){return document.getElementById(i)};
var safe=function(f){return function(){try{return f.apply(this,arguments)}catch(e){console.warn('[SE2]',e)}}};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var F=function(n,d){d=d==null?2:d;return (n==null||isNaN(n))?'--':Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})};
var UP='#34d399',DN='#fb7185',pd=function(n){return (n<10?'0':'')+n};
var IDX=[]; /* kartu indeks S&P 500 / NASDAQ / DOW / VIX dihapus */
var SEC=[['XLK','Teknologi'],['XLF','Keuangan'],['XLE','Energi'],['XLV','Kesehatan'],['XLY','Konsumer Siklikal'],['XLP','Konsumer Primer'],['XLI','Industri'],['XLB','Material'],['XLU','Utilitas'],['XLRE','Properti'],['XLC','Komunikasi']];
var WL=[['NVDA','NVIDIA',228.87],['AAPL','Apple',250],['MSFT','Microsoft',500],['AMZN','Amazon',230],['GOOGL','Alphabet',250],['META','Meta',700],['TSLA','Tesla',400],['AVGO','Broadcom',350],['AMD','AMD',200],['NFLX','Netflix',1200],['JPM','JPMorgan',300],['V','Visa',340],['WMT','Walmart',100],['XOM','Exxon Mobil',115],['KO','Coca-Cola',70],['DIS','Disney',110],['BAC','Bank of America',50],['PFE','Pfizer',26],['INTC','Intel',30],['UBER','Uber',90],['BRK-B','Berkshire Hathaway',470],['LLY','Eli Lilly',800],['UNH','UnitedHealth',500],['JNJ','Johnson & Johnson',160],['HD','Home Depot',380],['COST','Costco',950],['PG','Procter & Gamble',165],['CVX','Chevron',155],['ORCL','Oracle',200],['CRM','Salesforce',250],['MA','Mastercard',560],['MRK','Merck',90],['ABBV','AbbVie',190],['PEP','PepsiCo',150],['CSCO','Cisco',65],['ADBE','Adobe',350],['QCOM','Qualcomm',160],['MU','Micron',100],['PLTR','Palantir',150],['GS','Goldman Sachs',600],['CAT','Caterpillar',400],['GE','GE Aerospace',250],['TMO','Thermo Fisher',500],['MCD','McDonalds',300],['IBM','IBM',250],['WFC','Wells Fargo',75],['NKE','Nike',70],['T','AT&T',25]];
var EX=[['SPY','SPDR S&P 500 ETF',680],['QQQ','Invesco QQQ',600]];
var RG={'6M':126,'1Y':252,'2Y':504};
var S={},M={sym:'SPY',range:'1Y',labels:[],data:[],pc:null,src:'sim'},tab='g',inited=false,pollN=0,nextPoll=20,mainChart,scoreChart,idxCharts=[];
/* ---------- RNG & store ---------- */
function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function mk(sym,name,base){var r=rng(hash(sym+new Date().toDateString())),vol=sym==='^VIX'?.06:.011,chg=(r()-.5)*2*vol,pc=base;
  var o={sym:sym,n:name,pc:pc,p:pc*(1+chg),v:Math.round((5+r()*70)*1e6),ser:[],src:'sim',vol:vol};
  var x=o.p;for(var i=0;i<60;i++){o.ser.unshift(x);x*=1+(r()-.5)*vol*.25}o.ser[59]=o.p;S[sym]=o;return o}
IDX.concat(SEC.map(function(s){return [s[0],s[1],100]}),WL,EX).forEach(function(a){mk(a[0],a[1],a[2])});
/* ---------- fetch online ---------- */
var ROUTES=[function(u){return window.__BA_PROXY?'/api/proxy?url='+encodeURIComponent(u):u},function(u){return u},function(u){return u.replace('query1.','query2.')},function(u){return 'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(u)},function(u){return 'https://corsproxy.io/?'+encodeURIComponent(u)},function(u){return 'https://api.allorigins.win/raw?url='+encodeURIComponent(u)}],ri=0,deadUntil=0;
function seqJ(u){return new Promise(function(res,rej){if(Date.now()<deadUntil)return rej(new Error('offline'));var k=0,nf=false;
  (function next(){if(k>=ROUTES.length){if(!nf)deadUntil=Date.now()+30000;return rej(new Error(nf?'notfound':'offline'))}
   var idx=(ri+k)%ROUTES.length;k++;var c=new AbortController(),t=setTimeout(function(){c.abort()},4500);
   fetch(ROUTES[idx](u),{signal:c.signal}).then(function(r){clearTimeout(t);if(r.status===404){nf=true;throw 0}if(!r.ok)throw 0;return r.json()})
   .then(function(j){if(!j||!j.chart||!j.chart.result||!j.chart.result[0])throw 0;ri=idx;res(j.chart.result[0])}).catch(function(){clearTimeout(t);if(nf)return rej(new Error('notfound'));next()})})()})}
var routeOk=false,probeP=null;
function raceJ(u){return new Promise(function(res,rej){if(Date.now()<deadUntil)return rej(new Error('offline'));var n=ROUTES.length,fail=0,done=false,nf=false;
  ROUTES.forEach(function(R,idx){var c=new AbortController(),t=setTimeout(function(){c.abort()},4500);
   fetch(R(u),{signal:c.signal}).then(function(r){clearTimeout(t);if(r.status===404){nf=true;throw 0}if(!r.ok)throw 0;return r.json()})
   .then(function(j){if(!j||!j.chart||!j.chart.result||!j.chart.result[0])throw 0;if(!done){done=true;routeOk=true;ri=idx;res(j.chart.result[0])}})
   .catch(function(){clearTimeout(t);if(++fail>=n&&!done){if(!nf)deadUntil=Date.now()+30000;rej(new Error(nf?'notfound':'offline'))}})})})}
function getJ(u){
  if(routeOk)return seqJ(u).catch(function(e){if(e.message==='offline')routeOk=false;throw e});
  if(probeP)return probeP.then(function(){return getJ(u)},function(){return seqJ(u)});
  var p=raceJ(u);probeP=p;p.then(function(){probeP=null},function(){probeP=null});return p}
var TF={timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false};
function fetchChart(sym,rg,iv){return getJ('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(sym)+'?range='+rg+'&interval='+iv).then(function(r){
  var q=r.indicators&&r.indicators.quote&&r.indicators.quote[0]||{},ts=r.timestamp||[],cl=q.close||[],L=[],D=[];
  for(var i=0;i<ts.length;i++){if(cl[i]==null)continue;var d=new Date(ts[i]*1000);D.push(cl[i]);L.push(iv.indexOf('m')>0?d.toLocaleTimeString('en-US',TF):d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'}))}
  if(!D.length)throw new Error('empty');var m=r.meta||{};
  return {labels:L,data:D,pc:m.chartPreviousClose||m.previousClose||D[0],price:m.regularMarketPrice||D[D.length-1],vol:m.regularMarketVolume,t:m.regularMarketTime,name:m.shortName||m.symbol}})}
function apply(sym,r){var o=S[sym]||(S[sym]={sym:sym,n:r.name||sym,v:0,vol:.01});o.p=r.price;o.pc=r.pc;if(r.vol)o.v=r.vol;o.ser=r.data.slice(-80);o.src='live';if(r.t)o.t=r.t;if(r.name&&(!o.n||o.n===sym))o.n=r.name}
function poll(list){var q=list.slice();function w(){var s=q.shift();if(!s)return Promise.resolve();return fetchChart(s,'1d','5m').then(function(r){apply(s,r)}).catch(function(){var o=S[s];if(o&&o.src==='live'&&Date.now()<deadUntil)o.src=MVS[s]?'cache':'sim'}).then(w)}
  return Promise.all([w(),w(),w(),w(),w(),w()]).then(function(){saveMv();$('se2-upd').textContent='Pembaruan terakhir: '+new Date().toLocaleTimeString('id-ID')})}
/* ---------- simulasi ---------- */
function stepSim(){Object.keys(S).forEach(function(k){var o=S[k];if(o.src!=='sim')return;o.p*=1+(Math.random()-.5)*o.vol*.12;o.v+=Math.round(Math.random()*4e4);o.ser.push(o.p);if(o.ser.length>80)o.ser.shift()})}
function genSim(){var o=S[M.sym];if(!o)return;var r=rng(hash(M.sym+'mtpi')),n=504,x=o.p,D=[],L=[],d=new Date(),ph=r()*6;
  for(var i=0;i<n;i++){D.unshift(x);while(d.getDay()===0||d.getDay()===6)d.setDate(d.getDate()-1);L.unshift(d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'}));d.setDate(d.getDate()-1);
   var dr=.0007*Math.sin(i/38+ph),sh=(r()+r()+r()-1.5)*Math.max(o.vol,.008)*.9;x/=1+dr+sh}
  M.data=D;M.labels=L;M.pc=o.pc;M.src='sim'}
/* ---------- sesi pasar ---------- */
var DF=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',weekday:'short'});
function ny(){var o={};DF.formatToParts(new Date()).forEach(function(p){o[p.type]=p.value});return {y:+o.year,m:+o.month,d:+o.day,h:(+o.hour)%24,mi:+o.minute,s:+o.second,wd:o.weekday}}
var HOL={'2026-01-01':"Tahun Baru",'2026-01-19':'Martin Luther King Jr. Day','2026-02-16':"Presidents' Day",'2026-04-03':'Good Friday','2026-05-25':'Memorial Day','2026-06-19':'Juneteenth','2026-07-03':'Hari Kemerdekaan (observed)','2026-09-07':'Labor Day','2026-11-26':'Thanksgiving','2026-12-25':'Natal','2027-01-01':'Tahun Baru','2027-01-18':'Martin Luther King Jr. Day'};
var EARLY={'2026-11-27':'Setelah Thanksgiving (tutup 13:00 ET)','2026-12-24':'Malam Natal (tutup 13:00 ET)'};
function key(y,m,d){return y+'-'+pd(m)+'-'+pd(d)}
function wdOf(y,m,d){return new Date(Date.UTC(y,m-1,d)).getUTCDay()}
function trading(y,m,d){var w=wdOf(y,m,d);return w!==0&&w!==6&&!HOL[key(y,m,d)]}
function addDay(y,m,d,k){var t=new Date(Date.UTC(y,m-1,d+k));return [t.getUTCFullYear(),t.getUTCMonth()+1,t.getUTCDate()]}
function hms(ms){ms=Math.max(0,Math.floor(ms/1000));var d=Math.floor(ms/86400),h=Math.floor(ms%86400/3600),m=Math.floor(ms%3600/60);return (d?d+'h ':'')+pd(h)+':'+pd(m)+':'+pd(ms%60)}
function session(){var n=ny(),k=key(n.y,n.m,n.d),tr=trading(n.y,n.m,n.d),mn=n.h*60+n.mi,er=!!EARLY[k],cl=er?780:960,now=Date.UTC(n.y,n.m-1,n.d,n.h,n.mi,n.s),ph,open=false,tgt,lbl;
  if(!tr)ph=(wdOf(n.y,n.m,n.d)%6===0)?'TUTUP · Akhir Pekan':'TUTUP · '+HOL[k];
  else if(mn>=570&&mn<cl){ph='BUKA · Sesi Reguler'+(er?' (Early Close)':'');open=true}
  else if(mn>=240&&mn<570)ph='PRE-MARKET';else if(mn>=cl&&mn<(er?1020:1200))ph='AFTER-HOURS';else ph='TUTUP';
  if(open){tgt=Date.UTC(n.y,n.m-1,n.d,Math.floor(cl/60),cl%60);lbl='Tutup dalam '}
  else{var y=n.y,m=n.m,d=n.d;if(!(tr&&mn<570)){do{var a=addDay(y,m,d,1);y=a[0];m=a[1];d=a[2]}while(!trading(y,m,d))}tgt=Date.UTC(y,m-1,d,9,30);lbl='Buka dalam '}
  return {ph:ph,open:open,cd:lbl+hms(tgt-now),ny:pd(n.h)+':'+pd(n.mi)+':'+pd(n.s)}}
function clock(){var s=session(),e=$('se2-session');e.textContent=s.ph;e.style.color=s.open?UP:(s.ph==='PRE-MARKET'||s.ph==='AFTER-HOURS'?'#fbbf24':'#9ca3af');
  $('se2-clock').textContent='NY '+s.ny+' · WIB '+new Date().toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta',hour12:false});
  $('se2-cd').textContent=s.cd+' · Refresh data dalam '+nextPoll+' dtk'}
function holidays(){var n=ny(),t=Date.UTC(n.y,n.m-1,n.d),all=[];Object.keys(HOL).forEach(function(k){all.push([k,HOL[k],0])});Object.keys(EARLY).forEach(function(k){all.push([k,EARLY[k],1])});
  all.sort();var out=all.filter(function(a){var p=a[0].split('-');return Date.UTC(+p[0],p[1]-1,+p[2])>=t}).slice(0,5);
  $('se2-hol').innerHTML=out.map(function(a){var p=a[0].split('-'),dd=Math.round((Date.UTC(+p[0],p[1]-1,+p[2])-t)/864e5);
   return '<div class="flex items-center justify-between p-2.5 bg-black/50 border border-card-border rounded-xl"><div><div class="text-white font-semibold">'+esc(a[1])+'</div><div class="text-[10px] text-gray-500">'+new Date(Date.UTC(+p[0],p[1]-1,+p[2])).toLocaleDateString('id-ID',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'})+'</div></div><span class="se2-tag '+(a[2]?'se2-sim':'se2-live')+'">'+(dd===0?'HARI INI':dd+' HARI')+(a[2]?' · EARLY':'')+'</span></div>'}).join('')||'<p class="text-gray-500">Tidak ada data.</p>'}
/* ---------- render ---------- */
function pct(o){return o.pc?(o.p/o.pc-1)*100:0}
function col(v){return v>=0?UP:DN}
function spark(cv,c){return new Chart(cv,{type:'line',data:{labels:[],datasets:[{data:[],borderColor:c,borderWidth:1.6,pointRadius:0,fill:true,backgroundColor:c+'22',tension:.3}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:false}}}})}
function tag(o){return o.src==='live'?'<span class="se2-tag se2-live">LIVE</span>':'<span class="se2-tag se2-sim">OFF</span>'}
/* ---------- Sector Rotation Monitor (peringkat otomatis + animasi) ---------- */
var ROWH=34,SECRANK={},CYC=['XLK','XLY','XLF','XLI','XLB','XLE','XLC'],DEF=['XLP','XLU','XLV','XLRE'];
function buildSec(){var b=$('se2-sec');b.style.height=SEC.length*ROWH+'px';
  b.innerHTML=SEC.map(function(s){return '<div class="se2-srow" data-sym="'+s[0]+'" data-k="'+s[0]+'" title="Klik untuk membuka MTPI '+s[0]+'"><span class="se2-rk text-[10px] text-gray-500 font-mono w-7 text-right"></span><span class="text-[11px] font-bold text-white font-mono w-11">'+s[0]+'</span><span class="text-[10px] text-gray-400 w-24 truncate hidden sm:block">'+esc(s[1])+'</span><div class="se2-bar"><i class="se2-fill"></i></div><svg class="se2-sp" viewBox="0 0 54 18" width="54" height="18"><polyline fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="se2-pv text-[11px] font-mono font-bold w-14 text-right"></span></div>'}).join('')}
var SECH={XLK:['NVDA','AAPL','MSFT'],XLF:['BRK-B','JPM','V'],XLE:['XOM','CVX','COP'],XLV:['LLY','UNH','JNJ'],XLY:['AMZN','TSLA','HD'],XLP:['WMT','COST','PG'],XLI:['GE','CAT','RTX'],XLB:['LIN','SHW','FCX'],XLU:['NEE','SO','DUK'],XLRE:['PLD','AMT','EQIX'],XLC:['META','GOOGL','NFLX']},SLH='';
var XB={'BRK-B':470,CVX:155,COP:105,LLY:800,UNH:500,JNJ:160,HD:380,COST:950,PG:165,GE:250,CAT:400,RTX:150,LIN:450,SHW:350,FCX:45,NEE:75,SO:90,DUK:115,PLD:110,AMT:200,EQIX:850},EXT=[];
Object.keys(SECH).forEach(function(k){SECH[k].forEach(function(t){if(!S[t]&&EXT.indexOf(t)<0){mk(t,t,XB[t]||100);EXT.push(t)}})});
function cp(t){var o=S[t];if(!o)return '';var p=pct(o);return ' <span style="color:'+col(p)+'">'+(p>=0?'+':'')+F(p)+'%</span>'}
function allSyms(){var u={};[M.sym,'SPY','QQQ'].concat(SEC.map(function(s){return s[0]}),WL.map(function(w){return w[0]}),EXT).forEach(function(k){u[k]=1});return Object.keys(u)}
function rSecList(a){var el=$('se2-seclist');if(!el)return;
  var h=a.map(function(x,i){var c=col(x.p),cy=CYC.indexOf(x.k)>=0,gc=cy?'#38BDF8':'#c084fc';
   return '<div class="se2-row p-2 rounded-lg border border-card-border bg-black/40" data-sym="'+x.k+'"><div class="flex items-center justify-between gap-2"><span class="flex items-center gap-1.5 min-w-0"><span class="text-[10px] text-gray-500 font-mono w-4 text-right">'+(i+1)+'</span><b class="text-white font-mono text-[11px]">'+x.k+'</b><span class="text-[10px] text-gray-400 truncate">'+esc(x.n)+'</span></span><span class="flex items-center gap-2 font-mono text-[11px] shrink-0"><span class="text-gray-300">$'+F(x.o.p)+'</span><b style="color:'+c+'">'+(x.p>=0?'+':'')+F(x.p)+'%</b></span></div><div class="flex flex-wrap items-center gap-1 mt-1.5"><span class="se2-tag" style="color:'+gc+';border-color:'+gc+'55">'+(cy?'SIKLIKAL':'DEFENSIF')+'</span>'+(SECH[x.k]||[]).map(function(t){return '<button type="button" data-sym="'+t+'" class="px-1.5 py-0.5 rounded border border-card-border bg-black text-[10px] font-mono text-gray-300 hover:text-white hover:border-brand-accent">'+t+cp(t)+'</button>'}).join('')+'</div></div>'}).join('');
  if(h!==SLH){var st=el.scrollTop;SLH=h;el.innerHTML=h;el.scrollTop=st}}
function rSec(){var b=$('se2-sec');if(!b)return;if(!b.firstChild)buildSec();
  var a=SEC.map(function(s){return {k:s[0],n:s[1],p:pct(S[s[0]]),o:S[s[0]]}}).sort(function(x,y){return y.p-x.p}),mx=Math.max(1,Math.max.apply(null,a.map(function(x){return Math.abs(x.p)})));
  a.forEach(function(x,i){var el=b.querySelector('[data-k="'+x.k+'"]');if(!el)return;el.style.top=i*ROWH+'px';var c=col(x.p),w=Math.abs(x.p)/mx*50,pr=SECRANK[x.k],mv=pr==null||pr===i?'':(i<pr?'<b style="color:'+UP+'">▲</b>':'<b style="color:'+DN+'">▼</b>');
   el.querySelector('.se2-rk').innerHTML=mv+(i+1);var f=el.querySelector('.se2-fill');f.style.left=x.p>=0?'50%':(50-w)+'%';f.style.width=w+'%';f.style.background='linear-gradient('+(x.p>=0?'90deg':'270deg')+','+c+'55,'+c+')';
   var s=x.o.ser.slice(-40),mn=Math.min.apply(null,s),mxv=Math.max.apply(null,s),rg=(mxv-mn)||1;el.querySelector('polyline').setAttribute('points',s.map(function(v,j){return (j/(s.length-1||1)*54).toFixed(1)+','+(16.5-(v-mn)/rg*15).toFixed(1)}).join(' '));el.querySelector('polyline').setAttribute('stroke',c);
   var pv=el.querySelector('.se2-pv'),t=(x.p>=0?'+':'')+F(x.p)+'%';if(pv.textContent!==t){pv.textContent=t;pv.style.color=c;el.classList.remove('se2-flash');void el.offsetWidth;el.classList.add('se2-flash')}});
  a.forEach(function(x,i){SECRANK[x.k]=i});
  rSecList(a);
  var avg=function(L){var v=a.filter(function(x){return L.indexOf(x.k)>=0});return v.reduce(function(s,x){return s+x.p},0)/(v.length||1)},d=avg(CYC)-avg(DEF),up=a.filter(function(x){return x.p>=0}).length,
   rg=d>.15?['RISK-ON',UP]:d<-.15?['RISK-OFF',DN]:['NETRAL','#fbbf24'],L=a[0],Z=a[a.length-1],
   T=function(h,v,c){return '<div class="bg-black/50 border border-card-border rounded-lg px-2 py-1.5 min-w-0"><div class="text-gray-500 uppercase tracking-wider text-[9px]">'+h+'</div><div class="font-bold text-xs font-mono truncate" style="color:'+c+'">'+v+'</div></div>'};
  $('se2-rot').innerHTML=T('Pemimpin',L.k+' '+(L.p>=0?'+':'')+F(L.p)+'%',col(L.p))+T('Tertinggal',Z.k+' '+(Z.p>=0?'+':'')+F(Z.p)+'%',col(Z.p))+T('Rotasi',rg[0],rg[1])+T('Breadth',up+' / '+a.length+' naik',up>=6?UP:DN);
  $('se2-sect').innerHTML=tag(S.XLK)}
/* ---------- Top Movers • Large Cap: ditarik dari U.S. Stock Directory & Fundamental Matrix (allStockDirectory) ---------- */
var MVS={};WL.forEach(function(w){MVS[w[0]]=1});
var MVK='se2-mv-cache-v2';
function dirAll(){try{return allStockDirectory}catch(e){return []}}
function mcN(s){if(s._mc>0)return s._mc;var m=String(s.mktCap||'').match(/([\d.,]+)\s*([TBM])/i);if(!m)return 0;return parseFloat(m[1].replace(/,/g,''))*({T:1e12,B:1e9,M:1e6}[m[2].toUpperCase()]||0)}
function saveMv(){try{var d=[];dirAll().forEach(function(s){if(s._lsrc==='live'&&s._lp>0)d.push([s.symbol,s._lp,s._lc,s._lv||0,s._lt||0])});if(d.length>=5)localStorage.setItem(MVK,JSON.stringify({ts:Date.now(),d:d}))}catch(e){}}
function loadMv(){try{var c=JSON.parse(localStorage.getItem(MVK)||'null');if(!c||Date.now()-c.ts>5*864e5)return;var m={};dirAll().forEach(function(s){m[s.symbol]=s});c.d.forEach(function(a){var s=m[a[0]];if(s&&s._lp==null){s._lp=a[1];s._lc=a[2];s._lv=a[3];s._lt=a[4];s._lsrc='cache'}})}catch(e){}}
loadMv();
function rMov(){var L=[],nl=0,ts=0;
  dirAll().forEach(function(d){if(mcN(d)<1e10)return;var live=d._lp>0,p=live?d._lp:+d.price,c=live?d._lc:parseFloat(d.change);if(!(p>0)||isNaN(c))return;
    if(live&&d._lsrc==='live')nl++;if(live&&d._lt>ts)ts=d._lt;L.push({sym:d.symbol,n:d.name,mc:d.mktCap,p:p,c:c,v:live?(d._lv||0):0})});
  if(L.length<3){$('se2-breadth').innerHTML='';$('se2-breadtxt').innerHTML='<span style="color:#fbbf24">Stock Directory belum termuat.</span>';$('se2-mv').innerHTML='<tr><td colspan="4" class="py-6 text-center text-gray-500">Menunggu data U.S. Stock Directory...</td></tr>';return}
  var adv=L.filter(function(o){return o.c>=0}).length,dec=L.length-adv,
      lb=nl===L.length?['LIVE',UP]:nl?['LIVE '+nl+'/'+L.length,'#fbbf24']:['DATA DIREKTORI','#fbbf24'],
      dt=ts?new Date(ts*1000).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false})+' WIB':'';
  $('se2-breadth').innerHTML='<div style="width:'+adv/L.length*100+'%;background:'+UP+'"></div><div style="width:'+dec/L.length*100+'%;background:'+DN+'"></div>';
  $('se2-breadtxt').innerHTML='Naik <b style="color:'+UP+'">'+adv+'</b> · Turun <b style="color:'+DN+'">'+dec+'</b> dari '+L.length+' saham large cap (≥ $10B) · sumber: U.S. Stock Directory · <b style="color:'+lb[1]+'">'+lb[0]+'</b>'+(dt?' · harga per '+dt:'');
  L.sort(tab==='g'?function(a,b){return b.c-a.c}:tab==='l'?function(a,b){return a.c-b.c}:function(a,b){return b.v-a.v||b.c-a.c});
  $('se2-mv').innerHTML=L.slice(0,8).map(function(o){var p=o.c;return '<tr class="se2-row border-t border-card-border" data-sym="'+esc(o.sym)+'"><td class="py-2"><span class="stk-sym">'+(window.stkIcon?window.stkIcon(o.sym):'')+'<span><b class="text-white">'+esc(o.sym)+'</b> <span class="text-gray-500 font-sans text-[10px]">'+esc(o.n)+' · '+esc(o.mc)+'</span></span></span></td><td class="text-right text-white">$'+F(o.p)+'</td><td class="text-right font-bold" style="color:'+col(p)+'">'+(p>=0?'+':'')+F(p)+'%<div class="ml-auto h-1 rounded-full mt-1" style="width:'+Math.min(100,Math.abs(p)*25)+'%;background:'+col(p)+'"></div></td><td class="text-right text-gray-400 hidden sm:table-cell">'+(o.v?F(o.v/1e6,1)+'M':'--')+'</td></tr>'}).join('')}
/* ---------- Confirmed Close MTPI (12 indikator, skor -1..+1) ---------- */
function ema(a,n){var k=2/(n+1),o=[],p;for(var i=0;i<a.length;i++){p=i?a[i]*k+p*(1-k):a[i];o.push(p)}return o}
function sma(a,n){var o=[],s=0;for(var i=0;i<a.length;i++){s+=a[i];if(i>=n)s-=a[i-n];o.push(i>=n-1?s/n:null)}return o}
function rsiA(a,n){var o=[null],g=0,l=0;for(var i=1;i<a.length;i++){var d=a[i]-a[i-1],u=d>0?d:0,w=d<0?-d:0;if(i<=n){g+=u;l+=w;if(i===n){g/=n;l/=n;o.push(l===0?100:100-100/(1+g/l))}else o.push(null)}else{g=(g*(n-1)+u)/n;l=(l*(n-1)+w)/n;o.push(l===0?100:100-100/(1+g/l))}}return o}
var VN=[['EMA 12/26',0],['SMA 50/200',0],['MACD 12/26/9',0],['Harga > EMA 50',0],['Donchian 55',0],['ROC 63',0],['RSI 14',1],['Stochastic 14',1],['CCI 20',1],['Momentum 10',1],['Awesome Osc',1],['Bollinger %B',1]];
function mtpi(c,f){var n=c.length-f,x=c.slice(0,n),e12=ema(x,12),e26=ema(x,26),e50=ema(x,50),s50=sma(x,50),s200=sma(x,200),s5=sma(x,5),s34=sma(x,34),s20=sma(x,20),ml=e12.map(function(v,i){return v-e26[i]}),sg=ema(ml,9),rs=rsiA(x,14);
  var fn=[function(i){return e12[i]>e26[i]},function(i){return s200[i]==null?null:s50[i]>s200[i]},function(i){return ml[i]>sg[i]},function(i){return x[i]>e50[i]},
   function(i){if(i<55)return null;var h=-1/0,l=1/0;for(var j=i-55;j<i;j++){if(x[j]>h)h=x[j];if(x[j]<l)l=x[j]}return x[i]>(h+l)/2},function(i){return i<63?null:x[i]>x[i-63]},
   function(i){return rs[i]==null?null:rs[i]>50},function(i){if(i<14)return null;var h=-1/0,l=1/0;for(var j=i-13;j<=i;j++){if(x[j]>h)h=x[j];if(x[j]<l)l=x[j]}return h===l?null:(x[i]-l)/(h-l)>.5},
   function(i){if(i<19||s20[i]==null)return null;var d=0;for(var j=i-19;j<=i;j++)d+=Math.abs(x[j]-s20[i]);d/=20;return d?(x[i]-s20[i])/(.015*d)>0:null},function(i){return i<10?null:x[i]>x[i-10]},
   function(i){return s34[i]==null?null:s5[i]>s34[i]},function(i){return s20[i]==null?null:x[i]>s20[i]}];
  var V=fn.map(function(){return []}),sc=[],st=[],fl=[],ag=0,ac=0,tot=0,s;
  for(var i=0;i<n;i++){s=0;fn.forEach(function(g,j){var r=g(i),v=r==null?(i?V[j][i-1]:0):(r?1:-1);V[j].push(v);s+=v});sc.push(s/12);
   var pv=i?st[i-1]:0,cur=sc[i]>0?1:sc[i]<0?-1:pv;st.push(cur);fl.push(i&&cur!==pv&&pv!==0?cur:0);if(i>=200){tot++;if(Math.sign(sc[i])===V[0][i])ag++}}
  if(f){sc.push(sc[n-1]);st.push(st[n-1]);fl.push(0);V.forEach(function(v){v.push(v[n-1])})}
  var rg=1;for(var k=c.length-2;k>=0&&st[k]===st[c.length-1];k--)rg++;
  return {score:sc,state:st,flip:fl,votes:V,e50:e50.concat(f?[e50[n-1]]:[]),regime:rg,agree:tot?Math.round(ag/tot*100):0,forming:f}}
var LIV=[],PSIG={};
function ivals(c){var n=c.length,i=n-1,x=c[i],e12=ema(c,12),e26=ema(c,26),e50=ema(c,50),s50=sma(c,50),s200=sma(c,200),s5=sma(c,5),s34=sma(c,34),s20=sma(c,20),ml=e12.map(function(v,k){return v-e26[k]}),sg=ema(ml,9),rs=rsiA(c,14),o=[],
  P=function(v){return (v>=0?'+':'')+F(v)+'%'},sg1=function(t){return t?1:-1},j,h,l,d,m,sd;
  o[0]={t:P((e12[i]/e26[i]-1)*100),s:sg1(e12[i]>e26[i])};
  o[1]=s200[i]==null?null:{t:P((s50[i]/s200[i]-1)*100),s:sg1(s50[i]>s200[i])};
  o[2]={t:P((ml[i]-sg[i])/x*100),s:sg1(ml[i]>sg[i])};
  o[3]={t:P((x/e50[i]-1)*100),s:sg1(x>e50[i])};
  if(i<55)o[4]=null;else{h=-1/0;l=1/0;for(j=i-55;j<i;j++){if(c[j]>h)h=c[j];if(c[j]<l)l=c[j]}m=(h+l)/2;o[4]={t:P((x/m-1)*100),s:sg1(x>m)}}
  o[5]=i<63?null:{t:P((x/c[i-63]-1)*100),s:sg1(x>c[i-63])};
  o[6]=rs[i]==null?null:{t:F(rs[i],1),s:sg1(rs[i]>50)};
  if(i<14)o[7]=null;else{h=-1/0;l=1/0;for(j=i-13;j<=i;j++){if(c[j]>h)h=c[j];if(c[j]<l)l=c[j]}o[7]=h===l?null:{t:F((x-l)/(h-l)*100,1),s:sg1((x-l)/(h-l)>.5)}}
  if(i<19||s20[i]==null)o[8]=null;else{d=0;for(j=i-19;j<=i;j++)d+=Math.abs(c[j]-s20[i]);d/=20;o[8]=d?{t:F((x-s20[i])/(.015*d),1),s:sg1((x-s20[i])/(.015*d)>0)}:null}
  o[9]=i<10?null:{t:P((x/c[i-10]-1)*100),s:sg1(x>c[i-10])};
  o[10]=s34[i]==null?null:{t:P((s5[i]/s34[i]-1)*100),s:sg1(s5[i]>s34[i])};
  if(s20[i]==null)o[11]=null;else{sd=0;for(j=i-19;j<=i;j++)sd+=Math.pow(c[j]-s20[i],2);sd=Math.sqrt(sd/20);o[11]=sd?{t:F((x-(s20[i]-2*sd))/(4*sd),2),s:sg1(x>s20[i])}:null}
  return o}
function indBox(g,R,L){var rows=[],lg=0,sh=0;
  VN.forEach(function(v,j){if(v[1]!==g)return;var iv=LIV[j];
   if(!iv){rows.push('<div class="flex items-center justify-between py-1 border-b border-card-border/40 last:border-0"><span class="text-gray-400">'+v[0]+'</span><span class="text-gray-600 font-mono">menunggu data</span></div>');return}
   var u=iv.s>0,k=M.sym+'|'+j,ch=PSIG[k]!=null&&PSIG[k]!==iv.s,pre=R.votes[j][L]!==iv.s;PSIG[k]=iv.s;if(u)lg++;else sh++;
   rows.push('<div class="flex items-center justify-between gap-2 py-1 border-b border-card-border/40 last:border-0 rounded'+(ch?' se2-flash':'')+'"><span class="text-gray-400 truncate">'+v[0]+'</span><span class="font-mono text-gray-300 ml-auto">'+iv.t+'</span><b class="w-16 text-right" style="color:'+(u?UP:DN)+'">'+(u?'▲ LONG':'▼ SHORT')+'</b>'+(pre?'<span class="se2-tag" style="color:#fbbf24;border-color:#fbbf2455" title="Sinyal live — belum terkonfirmasi close">LIVE</span>':'')+'</div>')});
  return '<div class="bg-black/50 border border-card-border rounded-xl p-3 text-[11px]"><div class="flex items-center justify-between mb-1"><span class="text-[10px] text-brand-accent uppercase tracking-wider">'+(g?'Osilator (6)':'Trend-following (6)')+'</span><span class="text-[10px] font-mono"><b style="color:'+UP+'">'+lg+'▲</b> <b style="color:'+DN+'">'+sh+'▼</b></span></div>'+rows.join('')+'</div>'}
function rMain(){var o=S[M.sym];if(!o||!M.data.length)return;M.data[M.data.length-1]=o.p;
  var f=(session().open||M.src==='sim')?1:0,R=mtpi(M.data,f),n=M.data.length,N=Math.min(RG[M.range],n),a=n-N,sl=function(z){return z.slice(a)},p=pct(o),c=col(p),L=n-1;
  $('se2-msym').textContent=M.sym;$('se2-mname').textContent=o.n;$('se2-mtag').outerHTML=tag(o).replace('class="','id="se2-mtag" class="');
  $('se2-mp').textContent='$'+F(o.p);$('se2-mc').innerHTML='<span style="color:'+c+'">'+(p>=0?'▲ +':'▼ ')+F(o.p-o.pc)+' ('+(p>=0?'+':'')+F(p)+'%)</span>';
  if(!mainChart){mainChart=new Chart($('se2-main'),radarCfg());
   scoreChart=new Chart($('se2-score'),{type:'bar',data:{labels:[],datasets:[{data:[],barPercentage:1,categoryPercentage:1}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(x){return 'MTPI '+(x.raw>=0?'+':'')+F(x.raw)}}}},scales:{x:{display:false},y:{min:-1,max:1,position:'right',ticks:{color:'#9ca3af',stepSize:.5,callback:function(v){return F(v,1)}},grid:{color:function(x){return x.tick.value===0?'rgba(255,255,255,.35)':'rgba(255,255,255,.05)'}}}}}})}
  M.R=R;M.a=a;var lb=sl(M.labels),LV=M.range==='LIVE';if(LV&&LT.length)M.lc=LT[LT.length-1][1]>=LT[0][1]?UP:DN;
  var sd=scoreChart.data.datasets[0];scoreChart.data.labels=lb;sd.data=sl(R.score);sd.backgroundColor=sl(R.score).map(function(v){return v>0?'rgba(52,211,153,'+(.35+v*.55).toFixed(2)+')':v<0?'rgba(251,113,133,'+(.35-v*.55).toFixed(2)+')':'#6b7280'});scoreChart.update('none');
  var sc=R.score[L],sn=R.state[L],cl=sn>0?UP:sn<0?DN:'#9ca3af',lbl=sn>0?'BULLISH':sn<0?'BEARISH':'NETRAL',g=Math.abs(sc)*50;
  var vt=function(t){return VN.map(function(v,j){return [v,R.votes[j][L]]}).filter(function(z){return z[0][1]===t}).map(function(z){var u=z[1]>0;return '<div class="flex justify-between py-0.5"><span class="text-gray-400">'+z[0][0]+'</span><b style="color:'+(u?UP:DN)+'">'+(u?'▲ LONG':'▼ SHORT')+'</b></div>'}).join('')};
  var last=M.labels[L-f]||'';
  LIV=ivals(M.data);safe(rRadar)(R,L);var onl=M.src==='live'&&o.src==='live';
  $('se2-live').innerHTML='<span class="flex items-center gap-2"><span class="se2-pulse'+(onl?'':' sim')+'"></span><b class="'+(onl?'text-emerald-400':'text-amber-400')+'">AUTO · '+(onl?'ONLINE':'OFFLINE')+'</b> Trend-following &amp; Osilator dihitung ulang otomatis dari harga '+esc(M.sym)+'</span><span class="font-mono">update '+new Date().toLocaleTimeString('id-ID',{hour12:false})+' · nilai indikator = bar berjalan (tag LIVE = belum terkonfirmasi close)</span>';
  $('se2-dash').innerHTML='<div class="bg-black/50 border border-card-border rounded-xl p-3 space-y-2"><div class="text-[10px] text-gray-500 uppercase tracking-wider">Confirmed Close MTPI</div><div class="flex items-baseline gap-2"><span class="text-3xl font-extrabold font-mono" style="color:'+cl+'">'+(sc>=0?'+':'')+F(sc)+'</span><span class="se2-tag" style="color:'+cl+';border-color:'+cl+'66">'+lbl+'</span></div>'+
   '<div class="relative h-2 rounded-full bg-neutral-800"><div class="absolute top-0 h-2 rounded-full" style="background:'+cl+';'+(sc>=0?'left:50%':'right:50%')+';width:'+g+'%"></div><div class="absolute left-1/2 -top-0.5 w-px h-3 bg-gray-400"></div></div>'+
   '<div class="flex justify-between text-[10px] text-gray-400"><span>Regime: <b class="text-white">'+R.regime+' bar</b></span><span>EMA-cross setuju: <b class="text-white">'+R.agree+'%</b></span></div></div>'+
   indBox(0,R,L)+indBox(1,R,L);
  $('se2-cf').textContent=f?'Bar berjalan (garis putus-putus) tidak dihitung — skor & sinyal hanya berubah setelah bar close terkonfirmasi. Bar terkonfirmasi terakhir: '+last:'Semua bar sudah close — skor dihitung dari bar terakhir: '+last}
function rAll(){if(!inited||!active())return;safe(rSec)();safe(rMov)();safe(rMain)();safe(rTape)();
  var ks=Object.keys(S),lv=ks.filter(function(k){return S[k].src==='live'}).length,e=$('se2-src');e.className='se2-tag '+(lv?'se2-live':'se2-sim');e.textContent=lv?'ONLINE · '+lv+'/'+ks.length+' LIVE':'OFFLINE'}
/* ---------- Radar Deteksi Keputusan (12 indikator MTPI, sapuan otomatis) ---------- */
var RAD={V:[],c:UP},RSC=[.8,2,.25,3,3,8,0,0,0,4,1.5,0];
function cl1(x){return Math.max(-1,Math.min(1,x))}
function radVals(){return VN.map(function(nm,j){var iv=LIV[j];if(!iv)return {v:0,s:0,t:'--',n:nm[0]};var n=parseFloat(String(iv.t).replace('+','')),v;
  v=j===6?(n-50)/25:j===7?(n-50)/50:j===8?n/150:j===11?(n-.5)*2:Math.tanh(n/RSC[j]);v=cl1(v);v=iv.s*Math.max(.08,Math.abs(v));return {v:v,s:iv.s,t:iv.t,n:nm[0]}})}
var SL=['EMA','SMA','MACD','P>EMA50','Donchian','ROC','RSI','Stoch','CCI','Mom','AO','%B'];
function radarCfg(){return {type:'radar',data:{labels:SL,datasets:[{label:'Sinyal',data:[],backgroundColor:UP+'33',borderColor:UP,borderWidth:2,pointRadius:4,tension:.4,pointBackgroundColor:[]},{label:'Netral',data:VN.map(function(){return 0}),borderColor:'rgba(255,255,255,.4)',borderDash:[4,4],borderWidth:1,pointRadius:0,tension:.4,fill:false}]},
  options:{responsive:true,maintainAspectRatio:false,animation:{duration:700},layout:{padding:14},plugins:{legend:{display:false},tooltip:{callbacks:{title:function(a){return a.length?VN[a[0].dataIndex][0]:''},label:function(x){var o=RAD.V[x.dataIndex];return x.datasetIndex||!o?'':o.t+' · '+(o.s>0?'LONG':'SHORT')}}}},
   scales:{r:{min:-1,max:1,ticks:{stepSize:.5,color:'#6b7280',backdropColor:'transparent',font:{size:9},callback:function(v){return F(v,1)}},grid:{color:'rgba(255,255,255,.08)',circular:true},angleLines:{color:'rgba(255,255,255,.1)'},pointLabels:{color:'#9ca3af',font:{size:10}}}}}}}
function rRadar(R,L){var V=radVals(),cnt=0,sm=0,lg=0,sh=0;RAD.V=V;V.forEach(function(x){if(x.s){cnt++;sm+=x.s;if(x.s>0)lg++;else sh++}});
  var lv=cnt?sm/cnt:0,sc=R.score[L],d=sc>.33?['LONG · BELI',UP]:sc<-.33?['SHORT · JUAL / HINDARI',DN]:['TAHAN · NETRAL','#fbbf24'],c=d[1];RAD.c=c;
  if(mainChart){var ds=mainChart.data.datasets[0];ds.data=V.map(function(x){return x.v});ds.borderColor=c;ds.backgroundColor=c+'33';ds.pointBackgroundColor=V.map(function(x){return x.s>0?UP:x.s<0?DN:'#6b7280'});mainChart.update()}
  var top=V.filter(function(x){return x.s}).sort(function(a,b){return Math.abs(b.v)-Math.abs(a.v)}).slice(0,3),ls=lv>.33?'LONG':lv<-.33?'SHORT':'NETRAL',diff=(sc>.33&&lv<-.33)||(sc<-.33&&lv>.33);
  var e=$('se2-dec');if(!e)return;e.innerHTML='<div class="flex items-center justify-between"><span class="text-[10px] text-gray-500 uppercase tracking-wider">Radar Keputusan · '+esc(M.sym)+'</span><span class="flex items-center gap-1 text-[10px]" style="color:'+c+'"><span class="se2-pulse"></span>SCANNING</span></div>'+
   '<div class="rounded-lg p-2.5 text-center" style="border:1px solid '+c+'66;background:'+c+'14"><div class="text-[9px] text-gray-400 uppercase tracking-wider">Keputusan terkonfirmasi close</div><div class="text-base font-extrabold" style="color:'+c+'">'+d[0]+'</div><div class="font-mono text-[11px] text-gray-300">Skor MTPI '+(sc>=0?'+':'')+F(sc)+'</div></div>'+
   '<div class="grid grid-cols-2 gap-2"><div class="bg-black/50 border border-card-border rounded-lg p-2"><div class="text-[9px] text-gray-500 uppercase">Skor live</div><b class="font-mono" style="color:'+col(lv)+'">'+(lv>=0?'+':'')+F(lv)+'</b> <span class="text-gray-400">'+ls+'</span></div><div class="bg-black/50 border border-card-border rounded-lg p-2"><div class="text-[9px] text-gray-500 uppercase">Keyakinan</div><b class="font-mono text-white">'+Math.round(Math.abs(sc)*100)+'%</b></div></div>'+
   '<div><div class="flex justify-between text-[10px] mb-1"><b style="color:'+UP+'">'+lg+' LONG</b><b style="color:'+DN+'">'+sh+' SHORT</b></div><div class="flex h-2 rounded-full overflow-hidden bg-neutral-800"><div style="width:'+(cnt?lg/cnt*100:0)+'%;background:'+UP+'"></div><div style="width:'+(cnt?sh/cnt*100:0)+'%;background:'+DN+'"></div></div></div>'+
   '<div><div class="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Sinyal terkuat terdeteksi</div>'+top.map(function(x){return '<div class="flex justify-between py-0.5"><span class="text-gray-300">'+esc(x.n)+'</span><b style="color:'+col(x.v)+'">'+(x.s>0?'▲ LONG':'▼ SHORT')+' '+Math.round(Math.abs(x.v)*100)+'%</b></div>'}).join('')+'</div>'+
   (diff?'<div class="text-[10px] text-amber-400">Sinyal live berlawanan dengan bar terkonfirmasi — tunggu close.</div>':'')+'<div class="text-[9px] text-gray-500">Analisis indikator otomatis, bukan saran investasi.</div>'}
var SW={a:0,t:0};
function sweepFrame(ts){requestAnimationFrame(sweepFrame);var dt=SW.t?Math.min(.1,(ts-SW.t)/1000):0;if(ts-SW.t<30)return;SW.t=ts;SW.a=(SW.a+dt*.9)%(Math.PI*2);
  var cv=$('se2-sweep'),w=$('se2-radwrap');if(!cv||!w||!mainChart||!mainChart.scales||!mainChart.scales.r||!active())return;
  var r=mainChart.scales.r,W=w.clientWidth,H=w.clientHeight,dp=window.devicePixelRatio||1;if(cv.width!==Math.round(W*dp)||cv.height!==Math.round(H*dp)){cv.width=Math.round(W*dp);cv.height=Math.round(H*dp)}
  var x=cv.getContext('2d'),cx=r.xCenter,cy=r.yCenter,R=r.drawingArea,c=RAD.c||UP,a=SW.a,P=Math.PI*2;x.setTransform(dp,0,0,dp,0,0);x.clearRect(0,0,W,H);x.strokeStyle=c+'99';x.lineWidth=1.5;x.beginPath();x.arc(cx,cy,R,0,P);x.stroke();
  if(x.createConicGradient){var g=x.createConicGradient(a-1.1,cx,cy),k=1.1/P;g.addColorStop(0,c+'00');g.addColorStop(k,c+'55');g.addColorStop(Math.min(.999,k+.002),c+'00');g.addColorStop(1,c+'00');x.fillStyle=g;x.beginPath();x.arc(cx,cy,R,0,P);x.fill()}
  x.strokeStyle=c;x.lineWidth=1.6;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);x.stroke();
  RAD.V.forEach(function(o,j){if(!o.s)return;var an=-Math.PI/2+j*P/RAD.V.length,rr=(o.v+1)/2*R,px=cx+Math.cos(an)*rr,py=cy+Math.sin(an)*rr,d=((a-an)%P+P)%P,al=d<1.4?1-d/1.4:0,bc=o.s>0?UP:DN;
   x.fillStyle=bc;x.beginPath();x.arc(px,py,4,0,P);x.fill();if(al>0){x.strokeStyle=bc;x.globalAlpha=al;x.lineWidth=2;x.beginPath();x.arc(px,py,5+al*11,0,P);x.stroke();x.globalAlpha=1}})}
requestAnimationFrame(sweepFrame);
/* ---------- kontrol ---------- */
function msg(t){var e=$('se2-msg');e.textContent=t||'';e.classList.toggle('hidden',!t)}
function loadMain(){var sym=M.sym;fetchChart(sym,'2y','1d').then(function(r){if(sym!==M.sym)return;if(r.data.length<210)throw new Error('short');M.labels=r.labels;M.data=r.data;M.pc=r.pc;M.src='live';if(!S[sym])apply(sym,r);msg('');rAll()})
  .catch(function(e){if(e.message==='notfound'&&!S[sym]){msg('Ticker "'+sym+'" tidak ditemukan.');M.sym='SPY';return loadMain()}
   if(!S[sym]){msg('Tidak dapat memuat '+sym+' (offline).');M.sym='SPY'}else msg(e.message==='Online'?'Mode: Graph AI Networking Infrastructure.':'');genSim();rAll()})}
function setSym(s){M.sym=s;msg('');genSim();rAll();loadMain();chips()}
function chips(){$('se2-chips').innerHTML=['SPY','QQQ','NVDA','AAPL','MSFT','TSLA','AMZN','META'].map(function(s){return '<button type="button" data-sym="'+s+'" class="px-2.5 py-1 rounded-lg border '+(M.sym===s?'bg-brand-primary text-white border-transparent font-bold':'bg-black border-card-border text-gray-400')+'">'+s+'</button>'}).join('');
  $('se2-ranges').innerHTML=Object.keys(RG).map(function(r){return '<button type="button" data-rg="'+r+'" class="px-2.5 py-1 rounded-lg '+(M.range===r?'bg-brand-primary text-white font-bold':'bg-black border border-card-border text-gray-400')+'">'+r+'</button>'}).join('');
  $('se2-tabs').innerHTML=[['g','Gainers'],['l','Losers'],['a','Paling Aktif']].map(function(t){return '<button type="button" data-tab="'+t[0]+'" class="px-2.5 py-1 rounded-lg '+(tab===t[0]?'bg-brand-primary text-white font-bold':'bg-black border border-card-border text-gray-400')+'">'+t[1]+'</button>'}).join('')}
var NEWS=[],NF='all',NLOAD=false,NP=1,NPS=6; /* NP = halaman berita aktif, NPS = jumlah berita per halaman */
var FEEDS=[['Yahoo Finance','https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC&region=US&lang=en-US'],['CNBC Finance','https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664'],['CNBC Top News','https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114'],['CNBC Investing','https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069'],['MarketWatch','https://feeds.content.dowjones.io/public/rss/mw_marketpulse']];
/* kejadian pasar AS: [kode, label, warna, pola, sektor terdampak] — urutan = prioritas */
var EVT=[
 ['fed','Fed & Suku Bunga','#a78bfa',/\b(fed|federal reserve|powell|fomc|rate cuts?|rate hikes?|interest rates?|treasury yields?|bond yields?|10-year)\b/i,'XLF'],
 ['laba','Laporan Keuangan','#34d399',/\b(earnings|quarterly results|guidance|eps|beats? estimates|misses? estimates|profit warning)\b/i,''],
 ['makro','Data Ekonomi AS','#fbbf24',/\b(cpi|pce|ppi|inflation|gdp|jobs report|nonfarm|payrolls?|unemployment|jobless|retail sales|consumer sentiment|consumer confidence|recession|economy|economic)\b/i,'XLY'],
 ['tarif','Kebijakan & Tarif','#fb7185',/\b(tariffs?|trade (war|deal|talks)|trump|white house|congress|senate|sanctions?|shutdown|bessent|debt ceiling|tax bill|export controls?)\b/i,'XLI'],
 ['energi','Energi & Komoditas','#f97316',/\b(oil|crude|opec|natural gas|gasoline|gold|copper|silver|energy)\b/i,'XLE'],
 ['kripto','Kripto','#f59e0b',/\b(bitcoin|crypto|cryptocurrency|ethereum|coinbase|stablecoin)\b/i,'XLF'],
 ['tech','Teknologi & AI','#38BDF8',/\b(ai|artificial intelligence|nvidia|chips?|semiconductors?|openai|apple|microsoft|alphabet|google|meta|amazon|tesla|broadcom|software|cloud|tech)\b/i,'XLK'],
 ['bank','Perbankan & Korporasi','#22d3ee',/\b(banks?|jpmorgan|goldman|morgan stanley|citigroup|wells fargo|ipo|merger|acquisition|buyout|takeover)\b/i,'XLF'],
 ['sehat','Kesehatan & Farmasi','#4ade80',/\b(fda|drugs?|pharma|vaccines?|healthcare|unitedhealth|pfizer|eli lilly|medicare|biotech)\b/i,'XLV'],
 ['pasar','Pasar Saham AS','#94a3b8',/\b(stocks?|wall street|s&p 500|nasdaq|dow|rally|sell-?off|futures|shares|market|markets)\b/i,'']
];
var US_RE=/\b(u\.?s\.?|america|american|wall street|fed|federal reserve|nyse|nasdaq|s&p|dow|treasury|white house|congress|senate|trump|washington|irs|sec|fda|ftc|doj)\b/i,
    NON_US=/\b(china|chinese|beijing|japan|nikkei|europe|european|ecb|britain|uk|india|hang seng|asia|australia|korea)\b/i,
    BULL=/\b(rall(y|ies)|surges?|jumps?|gains?|climbs?|soars?|rises?|record high|upgrades?|beats?|rebounds?)\b/i,
    BEAR=/\b(falls?|drops?|slumps?|plunges?|tumbles?|sinks?|slides?|losses|sell-?off|downgrades?|misses?|fears?|warns?|slides?)\b/i;
var WLR=WL.map(function(w){return {s:w[0],rs:w[0].length>1?new RegExp('\\b'+w[0]+'\\b'):null,rn:new RegExp('\\b'+w[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i')}});
function evtOf(t){for(var i=0;i<EVT.length;i++)if(EVT[i][3].test(t))return EVT[i];return null}
function relT(d){var m=Math.max(0,Math.round((Date.now()-d.getTime())/60000));return m<1?'baru saja':m<60?m+' mnt lalu':m<1440?Math.floor(m/60)+' jam lalu':Math.floor(m/1440)+' hari lalu'}
function fetchFeed(f){if(!window.__BA_PROXY)return fetchFeedOrig(f);
  return fetch('/api/proxy?url='+encodeURIComponent(f[1])).then(function(r){if(!r.ok)throw 0;return r.text()}).then(function(t){var x=new DOMParser().parseFromString(t,'text/xml');
    var a=[].slice.call(x.querySelectorAll('item')).map(function(it){var g=function(k){var e=it.querySelector(k);return e?e.textContent:''},d=new Date(g('pubDate'));return {title:g('title'),link:g('link'),date:isNaN(d)?new Date():d,src:f[0]}});
    if(!a.length)throw 0;return a}).catch(function(){return fetchFeedOrig(f)})}
function fetchFeedOrig(f){var ok=function(a){if(!a.length)throw 0;return a};
  return fetch('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(f[1])).then(function(r){return r.json()}).then(function(j){return ok((j.items||[]).map(function(i){var d=i.pubDate?new Date(i.pubDate.replace(' ','T')+'Z'):new Date();return {title:i.title,link:i.link,date:isNaN(d)?new Date():d,src:f[0]}}))})
  .catch(function(){return fetch('https://api.allorigins.win/raw?url='+encodeURIComponent(f[1])).then(function(r){return r.text()}).then(function(t){var x=new DOMParser().parseFromString(t,'text/xml');
    return ok([].slice.call(x.querySelectorAll('item')).map(function(it){var g=function(k){var e=it.querySelector(k);return e?e.textContent:''},d=new Date(g('pubDate'));return {title:g('title'),link:g('link'),date:isNaN(d)?new Date():d,src:f[0]}}))}).catch(function(){return []})})}
function rPg(total,pages){var el=$('se2-npg');if(!el)return;
  if(total<=NPS){el.innerHTML=total?'<span class="text-gray-500">'+total+' berita</span>':'';return}
  var from=(NP-1)*NPS+1,to=Math.min(total,NP*NPS),B='px-2.5 py-1 rounded-lg border min-w-[30px] text-center ',
      on=B+'bg-brand-primary text-white border-transparent font-bold',off=B+'bg-black border-card-border text-gray-300 hover:text-white',dis=B+'bg-black border-card-border text-gray-600 cursor-not-allowed',
      nums=[],i,last=0;
  for(i=1;i<=pages;i++)if(i===1||i===pages||Math.abs(i-NP)<=1)nums.push(i);
  var h='<span class="text-gray-500">Menampilkan '+from+'&ndash;'+to+' dari '+total+' berita &bull; Halaman '+NP+' / '+pages+'</span><div class="flex flex-wrap items-center gap-1.5">';
  h+='<button type="button" data-np="prev" '+(NP<=1?'disabled ':'')+'class="'+(NP<=1?dis:off)+'" aria-label="Halaman sebelumnya">&laquo; Sebelumnya</button>';
  nums.forEach(function(n){if(last&&n-last>1)h+='<span class="text-gray-600 px-1">&hellip;</span>';last=n;
    h+='<button type="button" data-np="'+n+'" class="'+(n===NP?on:off)+'"'+(n===NP?' aria-current="page"':'')+'>'+n+'</button>'});
  h+='<button type="button" data-np="next" '+(NP>=pages?'disabled ':'')+'class="'+(NP>=pages?dis:off)+'" aria-label="Halaman berikutnya">Berikutnya &raquo;</button></div>';
  el.innerHTML=h}
function rNews(){var box=$('se2-news'),fl=$('se2-nfilt');if(!box)return;
  var cnt={};NEWS.forEach(function(n){cnt[n.e[0]]=(cnt[n.e[0]]||0)+1});
  fl.innerHTML=NEWS.length?[['all','Semua ('+NEWS.length+')','#38BDF8']].concat(EVT.filter(function(e){return cnt[e[0]]}).map(function(e){return [e[0],e[1]+' ('+cnt[e[0]]+')',e[2]]})).map(function(t){var on=NF===t[0];return '<button type="button" data-nf="'+t[0]+'" class="px-2.5 py-1 rounded-lg border '+(on?'text-white font-bold':'bg-black text-gray-400 border-card-border')+'" style="'+(on?'background:'+t[2]+'33;border-color:'+t[2]:'')+'">'+esc(t[1])+'</button>'}).join(''):'';
  var L=NEWS.filter(function(n){return NF==='all'||n.e[0]===NF});
  var NPG=Math.max(1,Math.ceil(L.length/NPS));if(NP>NPG)NP=NPG;if(NP<1)NP=1;
  var PGL=L.slice((NP-1)*NPS,NP*NPS);rPg(L.length,NPG);
  if(!L.length){box.innerHTML='<p class="text-gray-500 md:col-span-2">'+(NLOAD?'Memuat berita...':'Berita online belum dapat dimuat (koneksi/CORS). Akan dicoba lagi otomatis setiap 3 menit.')+'</p>';return}
  box.innerHTML=PGL.map(function(n){var e=n.e,sc=n.sn>0?[UP,'▲ POSITIF']:n.sn<0?[DN,'▼ NEGATIF']:['#9ca3af','● NETRAL'];
   return '<div class="se2-nc p-3 bg-black/50 border border-card-border rounded-xl hover:border-brand-accent space-y-1.5"><div class="flex items-center justify-between gap-2"><span class="se2-tag" style="color:'+e[2]+';border-color:'+e[2]+'66;background:'+e[2]+'14">'+esc(e[1].toUpperCase())+'</span><span class="se2-tag" style="color:'+sc[0]+';border-color:'+sc[0]+'55">'+sc[1]+'</span></div>'+
    '<a href="'+esc(n.link)+'" target="_blank" rel="noopener noreferrer" class="block text-gray-200 font-semibold leading-snug hover:text-white">'+esc(n.title)+'</a>'+
    '<div class="flex flex-wrap items-center gap-1.5 text-[10px]"><span class="text-gray-500">'+esc(n.src)+' · '+relT(n.date)+'</span>'+(e[4]?'<button type="button" data-sym="'+e[4]+'" class="px-1.5 py-0.5 rounded border border-card-border bg-black text-gray-300 hover:text-white" title="Sektor terdampak">Sektor '+e[4]+'</button>':'')+n.tk.map(function(t){return '<button type="button" data-sym="'+t+'" class="px-1.5 py-0.5 rounded border border-card-border bg-black font-mono text-brand-accent hover:text-white">'+t+'</button>'}).join('')+'</div></div>'}).join('')}
function news(){NLOAD=true;if(!NEWS.length)rNews();
  Promise.all(FEEDS.map(fetchFeed)).then(function(a){NLOAD=false;var seen={},all=[];
   a.forEach(function(x){x.forEach(function(n){if(!n.title||!/^https?:\/\//.test(n.link||''))return;var k=n.title.toLowerCase().slice(0,60);if(seen[k])return;seen[k]=1;all.push(n)})});
   var out=[];all.forEach(function(n){var t=n.title,e=evtOf(t),us=US_RE.test(t);if(NON_US.test(t)&&!us)return;if(!e&&!us)return;
    n.e=e||['umum','Pasar AS Umum','#94a3b8','',''];n.sn=(BULL.test(t)?1:0)-(BEAR.test(t)?1:0);
    n.tk=WLR.filter(function(w){return (w.rs&&w.rs.test(t))||w.rn.test(t)}).map(function(w){return w.s}).slice(0,3);out.push(n)});
   out.sort(function(x,y){return y.date-x.date});
   if(out.length){NEWS=out.slice(0,48);var u=$('se2-nts');if(u)u.textContent='diperbarui '+new Date().toLocaleTimeString('id-ID',{hour12:false});if(NF!=='all'&&!NEWS.some(function(n){return n.e[0]===NF}))NF='all'}
   rNews()})}
/* ---------- siklus otomatis (berjalan sendiri sejak halaman dimuat) ---------- */
var PI=5,pre=false,polling=false,LT=[],LTs='',tapeChart;
function bgOk(){return !document.hidden}
function active(){var p=$('page-stock-exchange'),s=$('se-sub-2');return p&&p.classList.contains('active')&&s&&!s.classList.contains('hidden')&&!document.hidden}
function boot(){if(pre)return;pre=true;mvPoll();genSim();poll(allSyms()).then(rAll);loadMain();news()}
function enter(){if(inited)return;inited=true;chips();holidays();boot();rAll()}
var TK={timeZone:'America/New_York',hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'};
function liveFill(sym){fetchChart(sym,'1d','5m').then(function(r){if(sym!==M.sym)return;LT=r.labels.map(function(l,i){return [l,r.data[i]]}).concat(LT).slice(-300)}).catch(function(){if(sym!==M.sym||LT.length>5)return;var o=S[sym];if(!o)return;var g=rng(hash(sym+'intra')),x=o.p,A=[],t=Date.now();for(var i=0;i<78;i++){A.unshift([new Date(t-i*3e5).toLocaleTimeString('en-US',TF),x]);x/=1+(g()-.5)*Math.max(o.vol,.006)*.35}LT=A.concat(LT).slice(-300)})}
function tickLive(){var o=S[M.sym];if(!o)return;if(LTs!==M.sym){LTs=M.sym;LT=[];liveFill(M.sym)}LT.push([new Date().toLocaleTimeString('en-US',TK),o.p]);if(LT.length>300)LT.shift()}
function rTape(){var cv=$('se2-tape');if(!cv||!LT.length)return;var c=LT[LT.length-1][1]>=LT[0][1]?UP:DN;
  if(!tapeChart)tapeChart=new Chart(cv,{type:'line',data:{labels:[],datasets:[{data:[],borderWidth:1.6,pointRadius:0,tension:.25,fill:true}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(x){return '$'+F(x.raw)}}}},scales:{x:{ticks:{color:'#6b7280',maxTicksLimit:6,maxRotation:0},grid:{display:false}},y:{position:'right',ticks:{color:'#9ca3af',maxTicksLimit:4,callback:function(v){return F(v)}},grid:{color:'rgba(255,255,255,.05)'}}}}});
  var d=tapeChart.data.datasets[0];tapeChart.data.labels=LT.slice(-90).map(function(z){return z[0]});d.data=LT.slice(-90).map(function(z){return z[1]});d.borderColor=c;d.backgroundColor=c+'22';tapeChart.update('none')}
setInterval(safe(function(){if(!bgOk())return;if(!pre)boot();if(active()){if(!inited)enter();clock()}if(nextPoll>0)nextPoll--}),1000);
setInterval(safe(function(){if(!bgOk()||!pre)return;stepSim();tickLive();rAll()}),2000);
setInterval(safe(function(){if(!bgOk()||!pre||polling||nextPoll>0)return;nextPoll=PI;pollN++;polling=true;var full=pollN%6===0;
  poll(full?allSyms():[M.sym]).then(function(){polling=false;rAll()},function(){polling=false});
  if(full)holidays();if(full||M.src==='sim')loadMain()}),1000);
/* ---------- Top Movers: polling khusus berkecepatan tinggi, tampil progresif tanpa menunggu semua saham ---------- */
var mvBusy=false,mvLast=0,mvT=0;
function mvPaint(){if(mvT)return;mvT=setTimeout(function(){mvT=0;if(active())safe(rMov)()},150)}
function mvGap(){var p=session();return p.open?10000:(p.ph==='PRE-MARKET'||p.ph==='AFTER-HOURS')?20000:60000}
function mvPoll(){if(mvBusy||!bgOk())return;mvBusy=true;var M2={},q=dirAll().map(function(d){M2[d.symbol]=d;return d.symbol});
  function w(){var y=q.shift();if(!y)return Promise.resolve();return fetchChart(y,'1d','5m').then(function(r){var d=M2[y];if(r.pc>0&&r.price>0){d._lp=r.price;d._lc=(r.price/r.pc-1)*100;d._lv=r.vol||0;d._lt=r.t||0;d._lsrc='live'}if(S[y])apply(y,r);mvPaint()}).catch(function(){var d=M2[y];if(d&&d._lsrc==='live'&&Date.now()<deadUntil)d._lsrc='cache'}).then(w)}
  var W=[];for(var i=0;i<8;i++)W.push(w());
  return Promise.all(W).then(function(){mvBusy=false;mvLast=Date.now();saveMv();var u=$('se2-upd');if(u)u.textContent='Pembaruan terakhir: '+new Date().toLocaleTimeString('id-ID');if(active())safe(rMov)()},function(){mvBusy=false})}
setInterval(safe(function(){if(!pre||mvBusy||!bgOk())return;if(!mvLast||(active()&&Date.now()-mvLast>=mvGap()))mvPoll()}),1500);
setInterval(safe(function(){if(bgOk())news()}),180000);
setTimeout(safe(function(){if(bgOk())boot()}),150);
/* ---------- sub-halaman ---------- */
var ACT='px-4 py-1.5 rounded-lg text-xs font-bold bg-brand-primary text-white transition',INA='px-4 py-1.5 rounded-lg text-xs font-bold bg-black border border-card-border text-gray-300 hover:text-white transition';
function sub(n){[1,2].forEach(function(i){var e=$('se-sub-'+i);if(e)e.classList.toggle('hidden',i!==n)});var ind=$('se-sub-ind');if(ind)ind.textContent='Halaman '+n+' dari 2';
  Array.prototype.forEach.call(document.querySelectorAll('[data-se-tab]'),function(b){b.className=(+b.getAttribute('data-se-tab')===n)?ACT:INA});
  if(n===2){nextPoll=Math.min(nextPoll,3);mvLast=0;mvPoll();safe(function(){if(!inited)enter();clock()})()}setTimeout(function(){window.dispatchEvent(new Event('resize'))},80)}
document.addEventListener('click',safe(function(e){var t=e.target,a=t.closest&&t.closest('[data-se-sub]');
  if(a){e.preventDefault();var pg=$('page-stock-exchange');if(pg&&!pg.classList.contains('active')){Array.prototype.forEach.call(document.querySelectorAll('.page'),function(p){p.classList.remove('active')});pg.classList.add('active');window.scrollTo({top:0,behavior:'smooth'})}
   try{if(typeof toggleSidebar==='function')toggleSidebar(false)}catch(x){}sub(+a.getAttribute('data-se-sub'));return}
  var nf=t.closest&&t.closest('#se-sub-2 [data-nf]');if(nf){NF=nf.getAttribute('data-nf');NP=1;rNews();return}
  var np=t.closest&&t.closest('#se2-npg [data-np]');if(np){if(np.disabled)return;var nv=np.getAttribute('data-np');NP=nv==='prev'?NP-1:nv==='next'?NP+1:+nv;rNews();
   var nb=$('se2-nfilt');if(nb){window.scrollTo({top:Math.max(0,nb.getBoundingClientRect().top+window.pageYOffset-140),behavior:'smooth'})}return}
  var c=t.closest&&t.closest('#se-sub-2 [data-sym]');if(c){setSym(c.getAttribute('data-sym'));return}
  c=t.closest&&t.closest('#se-sub-2 [data-rg]');if(c){M.range=c.getAttribute('data-rg');rAll();chips();return}
  c=t.closest&&t.closest('#se-sub-2 [data-tab]');if(c){tab=c.getAttribute('data-tab');chips();rMov();return}
  if(t.closest&&t.closest('#se2-go')){var v=($('se2-q').value||'').toUpperCase().trim();if(/^[A-Z0-9.\-^=]{1,10}$/.test(v)){M.sym=v;M.range=M.range;msg('Memuat '+v+'...');genSim();loadMain();chips()}return}
  if(t.closest&&t.closest('#se2-nrf')){news()}}));
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target&&e.target.id==='se2-q'){var b=$('se2-go');if(b)b.click()}});
/* ---------- status aktif ikon navigasi ---------- */
function navSync(){var a=document.querySelector('.page.active'),n=a?a.id.replace('page-',''):'';if(n==='article-detail')n='home';
  Array.prototype.forEach.call(document.querySelectorAll('a.nav-item'),function(l){l.classList.toggle('is-active',l.getAttribute('data-page')===n)})}
function navInit(){Array.prototype.forEach.call(document.querySelectorAll('.nav-ico'),function(i){var a=i.closest('a');if(a&&a.getAttribute('data-page'))a.classList.add('nav-item')});
  Array.prototype.forEach.call(document.querySelectorAll('.page'),function(p){new MutationObserver(navSync).observe(p,{attributes:true,attributeFilter:['class']})});navSync()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',safe(navInit));else safe(navInit)();
})();
