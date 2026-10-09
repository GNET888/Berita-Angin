/* Analyst Toolkit Statistik: terminal otomatis (tick live ~1,5 dtk, rotasi aset tiap 20 dtk) dengan 6 grafik + matriks korelasi; mode Manual untuk data sendiri. */
        (function(){
          var $=function(i){return document.getElementById(i)};
function parse(s){var out=[];(s||'').split(/[\s,;]+/).forEach(function(x){if(x==='')return;var n=parseFloat(x);if(isFinite(n))out.push(n)});return out}
          function rets(p){var r=[];for(var i=1;i<p.length;i++){if(p[i-1]!==0)r.push(p[i]/p[i-1]-1)}return r}
          function mean(a){var s=0;for(var i=0;i<a.length;i++)s+=a[i];return a.length?s/a.length:NaN}
          function sd(a){if(a.length<2)return NaN;var m=mean(a),s=0;for(var i=0;i<a.length;i++)s+=(a[i]-m)*(a[i]-m);return Math.sqrt(s/(a.length-1))}
          function pct(a,q){var b=a.slice().sort(function(x,y){return x-y}),k=(b.length-1)*q,f=Math.floor(k),c=Math.ceil(k);return b[f]+(b[c]-b[f])*(k-f)}
          function skew(a){var n=a.length,m=mean(a),s=sd(a);if(n<3||!s)return NaN;var x=0;a.forEach(function(v){x+=Math.pow((v-m)/s,3)});return n/((n-1)*(n-2))*x}
          function kurt(a){var n=a.length,m=mean(a),s=sd(a);if(n<4||!s)return NaN;var x=0;a.forEach(function(v){x+=Math.pow((v-m)/s,4)});return n*(n+1)/((n-1)*(n-2)*(n-3))*x-3*Math.pow(n-1,2)/((n-2)*(n-3))}
          function sma(p,n){if(p.length<n)return NaN;var s=0;for(var i=p.length-n;i<p.length;i++)s+=p[i];return s/n}
          function smaSeries(p,n){return p.map(function(_,i){if(i<n-1)return null;var s=0;for(var j=i-n+1;j<=i;j++)s+=p[j];return s/n})}
          function ema(p,n){if(p.length<n)return NaN;var k=2/(n+1),e=mean(p.slice(0,n));for(var i=n;i<p.length;i++)e=p[i]*k+e*(1-k);return e}
          function rsi(p,n){if(p.length<=n)return NaN;var g=0,l=0,i;for(i=1;i<=n;i++){var d=p[i]-p[i-1];if(d>=0)g+=d;else l-=d}g/=n;l/=n;for(i=n+1;i<p.length;i++){var d2=p[i]-p[i-1];g=(g*(n-1)+Math.max(d2,0))/n;l=(l*(n-1)+Math.max(-d2,0))/n}return l===0?100:100-100/(1+g/l)}
          function mdd(p){var pk=p[0],m=0;p.forEach(function(v){if(v>pk)pk=v;var d=v/pk-1;if(d<m)m=d});return m}
          function reg(p){var n=p.length,x=0,y=0,xy=0,xx=0,yy=0,i;var ly=p.map(function(v){return v>0?Math.log(v):NaN});if(ly.some(isNaN))return null;
            for(i=0;i<n;i++){x+=i;y+=ly[i];xy+=i*ly[i];xx+=i*i;yy+=ly[i]*ly[i]}var den=n*xx-x*x,b=(n*xy-x*y)/den,r=(n*xy-x*y)/Math.sqrt(den*(n*yy-y*y)||1);return{slope:Math.exp(b)-1,r2:r*r}}
          function cov(a,b){var ma=mean(a),mb=mean(b),s=0;for(var i=0;i<a.length;i++)s+=(a[i]-ma)*(b[i]-mb);return s/(a.length-1)}
          function f(v,d){return isFinite(v)?v.toFixed(d==null?2:d):'--'}
          function fp(v,d){return isFinite(v)?(v>=0?'+':'')+(v*100).toFixed(d==null?2:d)+'%':'--'}
          function num(v){if(!isFinite(v))return '--';var a=Math.abs(v);return v.toLocaleString('en-US',{maximumFractionDigits:a>=1000?0:a>=1?2:6})}
          function kpi(label,val,tone,hint){var c=tone>0?'text-emerald-400':tone<0?'text-rose-400':'text-white';return '<div class="bg-black/40 border border-card-border rounded-lg px-2.5 py-2 min-w-0"><div class="text-[9px] uppercase tracking-wider text-gray-500 truncate" title="'+(hint||'')+'">'+label+'</div><div class="font-mono font-bold text-sm truncate '+c+'">'+val+'</div></div>'}
          function msg(s){$('tk-msg').textContent=s||''}
          function calc3(){
            var cap=+$('tk-cap').value,rp=(+$('tk-rp').value)/100,en=+$('tk-en').value,sl=+$('tk-sl').value,tp=+$('tk-tp').value;
            if(!(cap>0&&rp>0&&en>0&&sl>0&&en!==sl)){$('tk-kpi3').innerHTML='';$('tk-read3').textContent='Isi modal, risiko, harga masuk, dan stop loss (stop tidak boleh sama dengan harga masuk).';return}
            var long=sl<en,rk=Math.abs(en-sl),amt=cap*rp,units=amt/rk,val=units*en,lev=val/cap,gain=isFinite(tp)&&tp>0?(long?tp-en:en-tp)*units:NaN,rr=gain/amt,okT=isFinite(tp)&&tp>0&&(long?tp>en:tp<en);
            $('tk-kpi3').innerHTML=[kpi('Arah',long?'LONG':'SHORT',long?1:-1),kpi('Risiko (uang)',num(amt),-1),kpi('Ukuran posisi',num(units)+' unit',0),kpi('Nilai posisi',num(val),0),
              kpi('Jarak stop',f(rk/en*100)+'%',0),kpi('Leverage efektif',f(lev)+'x',lev>3?-1:0),kpi('Potensi profit',okT?num(gain):'--',okT?1:0),kpi('Risk : Reward',okT?'1 : '+f(rr):'--',okT?(rr>=2?1:rr<1?-1:0):0)].join('');
            var be=okT?1/(1+rr):NaN;
            $('tk-read3').innerHTML='Dengan risiko <b>'+f(rp*100)+'%</b> dari modal, posisi <b>'+(long?'long':'short')+'</b> sebesar <b>'+num(units)+' unit</b> (nilai '+num(val)+'). Bila stop kena, kerugian sekitar <b>'+num(amt)+'</b>. '+(okT?'Rasio R:R 1 : '+f(rr)+' berarti titik impas win rate sekitar <b>'+f(be*100,1)+'%</b>.':'Target tidak valid untuk arah posisi ini (long: target di atas harga masuk; short: di bawah).')+(lev>1?' Nilai posisi melebihi modal, perlu leverage atau margin.':'');
          }
          
          var A=[['BTC','Bitcoin',67000,.55,365,.35,.6,'SPX'],['ETH','Ethereum',3400,.7,365,.3,.65,'BTC'],['SOL','Solana',150,.9,365,.25,.6,'BTC'],['NDX','NASDAQ 100',19500,.24,252,.9,0,'SPX'],['SPX','S&P 500',5700,.17,252,.95,0,'NDX'],['XAU','Emas',2600,.15,252,.1,0,'SPX'],['WTI','Minyak WTI',72,.35,252,.35,0,'SPX']];
          var N=240,K=30,D={},ai=0,tab=1,manual=false,rot=true,paused=false,sec=0,tk=0,ch={},inited=false,seed=20260610;
          function rn(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
          function nz(g){var u=1-g(),v=g();return Math.sqrt(-2*Math.log(u))*Math.cos(6.283185307*v)}
          function ld(a){return Math.sqrt(Math.max(0,1-a[5]*a[5]-a[6]*a[6]))}
          function gen(){A.forEach(function(a){D[a[0]]={p:[a[2]],v:[]}});
            for(var i=0;i<N-1;i++){var zm=nz(rn),zc=nz(rn);A.forEach(function(a){var s=a[3]/Math.sqrt(a[4]),r=.0002+s*(a[5]*zm+a[6]*zc+ld(a)*nz(rn)),d=D[a[0]];d.p.push(d.p[i]*(1+r));d.v.push(1e3*(1+14*Math.abs(r)/s)*(.6+rn()))});}
            A.forEach(function(a){var d=D[a[0]];d.v.push(1e3*(.6+rn()))})}
          function live(){tk++;var zm=nz(Math.random),zc=nz(Math.random),roll=tk%K===0;
            A.forEach(function(a){var d=D[a[0]],s=a[3]/Math.sqrt(a[4])/Math.sqrt(K),r=s*(a[5]*zm+a[6]*zc+ld(a)*nz(Math.random)),n=d.p.length;
              if(roll){d.p.push(d.p[n-1]);d.v.push(1e3*.5);d.p.shift();d.v.shift();n=d.p.length}d.p[n-1]*=1+r;d.v[n-1]+=1e3*(.1+8*Math.abs(r)/s*.05)})}
          function emaS(a,n){var o=[],k=2/(n+1),e=null,c=0,s=0;a.forEach(function(v){if(v==null){o.push(null);return}if(e==null){s+=v;c++;if(c===n){e=s/n;o.push(e)}else o.push(null)}else{e=v*k+e*(1-k);o.push(e)}});return o}
          function rsiS(p,n){var o=p.map(function(){return null});if(p.length<=n)return o;var g=0,l=0,i;for(i=1;i<=n;i++){var d=p[i]-p[i-1];d>=0?g+=d:l-=d}g/=n;l/=n;o[n]=l?100-100/(1+g/l):100;for(i=n+1;i<p.length;i++){var e=p[i]-p[i-1];g=(g*(n-1)+Math.max(e,0))/n;l=(l*(n-1)+Math.max(-e,0))/n;o[i]=l?100-100/(1+g/l):100}return o}
          function bbS(p,n){var u=[],l=[];p.forEach(function(_,i){if(i<n-1){u.push(null);l.push(null);return}var w=p.slice(i-n+1,i+1),m=mean(w),s=sd(w);u.push(m+2*s);l.push(m-2*s)});return[u,l]}
          function ddS(p){var pk=p[0];return p.map(function(v){if(v>pk)pk=v;return(v/pk-1)*100})}
          function lab(n,an){var o=[],d=new Date();for(var i=n-1;i>=0;i--){var x=new Date(d);x.setDate(d.getDate()-i*(an>=365?1:an>=252?1:an>=52?7:30));o.push(x.getDate()+'/'+(x.getMonth()+1))}return o}
          function cur(){if(manual){var a=parse($('tk-a').value),b=parse($('tk-b').value),m=Math.min(a.length,b.length);return{nm:'Seri A (manual)',p:a,b:m>=5?b.slice(-a.length).length===a.length?b.slice(-a.length):b:null,v:null,an:+$('tk-ann').value}}
            var x=A[ai],bn=A.filter(function(q){return q[0]===x[7]})[0];return{nm:x[1]+' ('+x[0]+')  vs  '+bn[1],p:D[x[0]].p.slice(),b:D[bn[0]].p.slice(),v:D[x[0]].v.slice(),an:x[4]}}
          var C={t:'#9CA3AF',g:'rgba(255,255,255,.05)',up:'#34d399',dn:'#fb7185',ac:'#38BDF8',am:'#fbbf24',pu:'#a78bfa'};
          function base(extra){var o={responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false}},scales:{x:{ticks:{color:C.t,maxTicksLimit:7,font:{size:9}},grid:{color:C.g}},y:{position:'right',ticks:{color:C.t,font:{size:9}},grid:{color:C.g}}}};if(extra)Object.keys(extra).forEach(function(k){o.scales[k]=extra[k]});return o}
          var xh={id:'xh',afterDatasetsDraw:function(c){var a=c.tooltip&&c.tooltip._active;if(!a||!a.length)return;var x=a[0].element.x,y=c.chartArea,g=c.ctx;g.save();g.strokeStyle='rgba(148,163,184,.5)';g.setLineDash([3,3]);g.beginPath();g.moveTo(x,y.top);g.lineTo(x,y.bottom);g.stroke();g.restore()}};
          var zones={id:'zn',beforeDatasetsDraw:function(c){var s=c.scales.y,a=c.chartArea,g=c.ctx;g.save();g.fillStyle='rgba(251,113,133,.10)';g.fillRect(a.left,s.getPixelForValue(100),a.width,s.getPixelForValue(70)-s.getPixelForValue(100));g.fillStyle='rgba(52,211,153,.10)';g.fillRect(a.left,s.getPixelForValue(30),a.width,s.getPixelForValue(0)-s.getPixelForValue(30));g.restore()}};
          var lastP={id:'lp',afterDatasetsDraw:function(c){var d=c.data.datasets[2].data,v=d[d.length-1];if(v==null)return;var s=c.scales.y,a=c.chartArea,g=c.ctx,y=s.getPixelForValue(v);g.save();g.strokeStyle=C.ac;g.setLineDash([4,3]);g.beginPath();g.moveTo(a.left,y);g.lineTo(a.right,y);g.stroke();g.setLineDash([]);g.fillStyle=C.ac;g.fillRect(a.right-46,y-8,46,16);g.fillStyle='#000';g.font='bold 9px monospace';g.textAlign='center';g.fillText(num(v),a.right-23,y+3);g.restore()}};
          function mk(id,cfg){var e=$(id);if(!e||typeof Chart==='undefined')return null;return new Chart(e.getContext('2d'),cfg)}
          function build(){
            ch.main=mk('tk-c-main',{type:'line',data:{labels:[],datasets:[{label:'BB atas',data:[],borderColor:'rgba(167,139,250,.5)',borderWidth:1,pointRadius:0,fill:false},{label:'BB bawah',data:[],borderColor:'rgba(167,139,250,.5)',backgroundColor:'rgba(167,139,250,.08)',borderWidth:1,pointRadius:0,fill:'-1'},{label:'Harga',data:[],borderColor:C.ac,borderWidth:2,pointRadius:0,tension:.15},{label:'SMA 20',data:[],borderColor:C.am,borderWidth:1.2,borderDash:[5,4],pointRadius:0},{label:'EMA 50',data:[],borderColor:C.pu,borderWidth:1.2,pointRadius:0},{type:'bar',label:'Volume',data:[],yAxisID:'y2',backgroundColor:[],order:9}]},options:base({y2:{display:false,max:1,min:0,grid:{display:false}}}),plugins:[xh,lastP]});
            ch.rsi=mk('tk-c-rsi',{type:'line',data:{labels:[],datasets:[{data:[],borderColor:C.am,borderWidth:1.6,pointRadius:0}]},options:(function(){var o=base();o.scales.y.min=0;o.scales.y.max=100;o.scales.y.ticks.stepSize=30;return o})(),plugins:[zones,xh]});
            ch.macd=mk('tk-c-macd',{type:'bar',data:{labels:[],datasets:[{type:'line',data:[],borderColor:C.ac,borderWidth:1.4,pointRadius:0},{type:'line',data:[],borderColor:C.am,borderWidth:1.2,pointRadius:0},{data:[],backgroundColor:[]}]},options:base(),plugins:[xh]});
            ch.dd=mk('tk-c-dd',{type:'line',data:{labels:[],datasets:[{data:[],borderColor:C.dn,backgroundColor:'rgba(251,113,133,.25)',fill:true,borderWidth:1.4,pointRadius:0}]},options:base(),plugins:[xh]});
            ch.hist=mk('tk-c-hist',{type:'bar',data:{labels:[],datasets:[{type:'bar',data:[],backgroundColor:[],borderWidth:0,barPercentage:.95,categoryPercentage:1},{type:'line',data:[],borderColor:C.am,borderWidth:1.6,pointRadius:0,tension:.4}]},options:base()});
            ch.sc=mk('tk-c-sc',{type:'scatter',data:{datasets:[{data:[],pointRadius:2.5,backgroundColor:'rgba(56,189,248,.55)'},{type:'line',data:[],borderColor:C.am,borderWidth:1.6,pointRadius:0}]},options:(function(){var o=base();o.interaction={mode:'nearest',intersect:true};o.scales.x.type='linear';o.scales.x.ticks.callback=function(v){return v+'%'};o.scales.y.ticks.callback=function(v){return v+'%'};return o})()})}
          function upd(c,L,sets){if(!c)return;c.data.labels=L;sets.forEach(function(s,i){if(c.data.datasets[i])Object.keys(s).forEach(function(k){c.data.datasets[i][k]=s[k]})});c.update('none')}
          function heat(){var R=A.map(function(a){return rets(D[a[0]].p)}),h='<table class="text-[10px] font-mono w-full" style="border-collapse:separate;border-spacing:2px"><tr><td></td>'+A.map(function(a){return'<td class="text-gray-500 text-center">'+a[0]+'</td>'}).join('')+'</tr>';
            A.forEach(function(a,i){h+='<tr><td class="text-gray-500 pr-1">'+a[0]+'</td>';A.forEach(function(b,j){var r=i===j?1:cov(R[i],R[j])/(sd(R[i])*sd(R[j])),al=Math.min(.9,Math.abs(r)*.9+.05);h+='<td class="text-center text-white rounded" style="padding:3px 2px;background:'+(r>=0?'rgba(52,211,153,':'rgba(251,113,133,')+al+')">'+r.toFixed(2)+'</td>'});h+='</tr>'});$('tk-heat').innerHTML=h+'</table>'}
          function render(){
            var s=cur(),p=s.p,AN=s.an,rf=(parseFloat($('tk-rf').value)||0)/100;
            if(p.length<5){msg('Seri A butuh minimal 5 angka.');return}msg('');
            var r=rets(p),m=mean(r),sg=sd(r),av=sg*Math.sqrt(AN),ar=Math.pow(1+m,AN)-1,dd=ddS(p),mx=Math.min.apply(null,dd)/100,v95=pct(r,.05),tl=r.filter(function(x){return x<=v95}),cv=mean(tl),sh=(ar-rf)/av,rs=rsiS(p,14),rl=rs[rs.length-1],s20=smaSeries(p,20),e50=emaS(p,50),e12=emaS(p,12),e26=emaS(p,26),mc=e12.map(function(v,i){return v==null||e26[i]==null?null:v-e26[i]}),sgl=emaS(mc,9),hs=mc.map(function(v,i){return v==null||sgl[i]==null?null:v-sgl[i]}),bb=bbS(p,20),L=lab(p.length,AN),lp=p[p.length-1],chg=lp/p[p.length-2]-1;
            var bt=NaN,rho=NaN,sc=[],pb=s.b;if(pb&&pb.length>=5){var n=Math.min(p.length,pb.length),ra=rets(p.slice(-n)),rb=rets(pb.slice(-n));bt=cov(ra,rb)/(sd(rb)*sd(rb));rho=cov(ra,rb)/(sd(ra)*sd(rb));sc=ra.map(function(v,i){return{x:+(rb[i]*100).toFixed(3),y:+(v*100).toFixed(3)}})}
            $('tk-nm').textContent=s.nm;$('tk-px').textContent=num(lp);var ce=$('tk-ch');ce.textContent=fp(chg);ce.className='font-mono text-sm font-bold '+(chg>=0?'text-emerald-400':'text-rose-400');
            $('tk-kpi').innerHTML=[kpi('Vol tahunan',fp(av).replace('+',''),0),kpi('Sharpe',f(sh),sh),kpi('Max DD',fp(mx),mx),kpi('VaR 95%',fp(v95),v95),kpi('CVaR 95%',fp(cv),cv),kpi('RSI 14',f(rl,1),0),kpi('Beta',f(bt),0),kpi('Korelasi',f(rho),0),kpi('Skew',f(skew(r)),0),kpi('Kurtosis',f(kurt(r)),0),kpi('Z-score',f((lp-mean(p))/sd(p)),0),kpi('Data',p.length,0)].join('');
            var xs=p.length-1,vs=s.v,mv=vs?Math.max.apply(null,vs):1;
            upd(ch.main,L,[{data:bb[0]},{data:bb[1]},{data:p},{data:s20},{data:e50},{data:vs?vs.map(function(v){return v/mv}):[],backgroundColor:p.map(function(v,i){return i&&v<p[i-1]?'rgba(251,113,133,.35)':'rgba(52,211,153,.35)'})}]);
            if(ch.main){ch.main.options.scales.y2.max=4;ch.main.update('none')}
            upd(ch.rsi,L,[{data:rs}]);
            upd(ch.macd,L,[{data:mc},{data:sgl},{data:hs,backgroundColor:hs.map(function(v){return v>=0?'rgba(52,211,153,.55)':'rgba(251,113,133,.55)'})}]);
            upd(ch.dd,L,[{data:dd}]);
            var nb=21,lo=m-4*sg,w=8*sg/nb,cn=[],bc=[],bl=[],nc=[];for(var i=0;i<nb;i++){cn.push(0);var c=lo+(i+.5)*w;bl.push((c*100).toFixed(1)+'%');nc.push(r.length*w*Math.exp(-Math.pow((c-m)/sg,2)/2)/(sg*2.50663))}
            r.forEach(function(x){var k=Math.floor((x-lo)/w);if(k>=0&&k<nb)cn[k]++});for(i=0;i<nb;i++)bc.push(lo+(i+1)*w<=v95?'rgba(251,113,133,.7)':'rgba(56,189,248,.55)');
            upd(ch.hist,bl,[{data:cn,backgroundColor:bc},{data:nc}]);
            var xr=sc.map(function(q){return q.x}),x0=Math.min.apply(null,xr),x1=Math.max.apply(null,xr),al=(mean(sc.map(function(q){return q.y}))-bt*mean(xr));
            upd(ch.sc,null,[{data:sc},{data:isFinite(bt)?[{x:x0,y:al+bt*x0},{x:x1,y:al+bt*x1}]:[]}]);
            var sc2=(rl>55?1:rl<45?-1:0)+(hs[hs.length-1]>0?1:hs[hs.length-1]<0?-1:0)+(lp>s20[s20.length-1]?1:-1)+(m>0?1:-1),zt=Math.max(-4,Math.min(4,sc2));
            $('tk-gauge').style.left=(50+zt*11.5)+'%';
            var bias=zt>=3?'Pasar bullish kuat: tekanan beli dominan dan momentum searah naik.':zt>=1?'Bias bullish: pembeli unggul tipis, tetap waspadai aksi ambil untung.':zt<=-3?'Pasar bearish kuat: tekanan jual dominan dan momentum searah turun.':zt<=-1?'Bias bearish: penjual lebih unggul, pelaku pasar cenderung defensif.':'Pasar sideways: sinyal campuran, menunggu katalis arah.';
            $('tk-sum').innerHTML='<b class="text-white">'+bias+'</b><br>Volatilitas '+(av>=.8?'sangat tinggi':av>=.4?'tinggi':av>=.2?'sedang':'rendah')+' ('+fp(av).replace('+','')+'), RSI '+f(rl,0)+(rl>=70?' (jenuh beli)':rl<=30?' (jenuh jual)':' (netral)')+', harga '+(lp>=s20[s20.length-1]?'di atas':'di bawah')+' SMA 20. Drawdown maksimum '+fp(mx)+'; hari terburuk 5% teratas rata-rata '+fp(cv)+'.'+(isFinite(bt)?' Beta '+f(bt)+' terhadap pembanding (korelasi '+f(rho)+').':'')}
          function chips(){$('tk-chips').innerHTML=A.map(function(a,i){return'<button type="button" data-tk-a="'+i+'" class="px-2.5 py-1 rounded-lg text-[11px] font-semibold border '+(i===ai&&!manual?'border-brand-accent text-brand-accent bg-black/40':'border-card-border text-gray-300 bg-black/40')+'">'+a[0]+'</button>'}).join('')}
          function act(){var p=$('page-market-stat');return p&&p.classList.contains('active')}
          function step(){if(!act()||paused||manual||tab!==1)return;if(!inited){inited=true;build();heat()}
            live();sec+=1.5;if(rot&&sec>=20){sec=0;ai=(ai+1)%A.length;chips()}$('tk-bar').style.width=Math.min(100,sec/20*100)+'%';$('tk-clk').textContent=new Date().toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta',hour12:false}).replace(/\./g,':');
            if(tk%10===0)heat();try{render()}catch(e){}}
          function setTab(n){tab=n;$('tk-p-data').classList.toggle('hidden',n===3);$('tk-p-risk').classList.toggle('hidden',n!==3);Array.prototype.forEach.call(document.querySelectorAll('.tk-tab'),function(b){var on=+b.getAttribute('data-tk-tab')===n;b.classList.toggle('bg-brand-primary',on);b.classList.toggle('text-white',on);b.classList.toggle('bg-black/40',!on);b.classList.toggle('text-gray-300',!on)});if(n===3)calc3();else{if(inited)try{render()}catch(e){}}}
          function init(){var root=$('analyst-toolkit');if(!root)return;gen();chips();$('tk-a').value=D.BTC.p.slice(-60).map(function(x){return x.toFixed(2)}).join(' ');$('tk-b').value=D.SPX.p.slice(-60).map(function(x){return x.toFixed(2)}).join(' ');
            root.addEventListener('input',function(e){if(tab===3)calc3();else if(manual)try{render()}catch(x){}});root.addEventListener('change',function(){if(tab===3)calc3();else if(manual)try{render()}catch(x){}});
            root.addEventListener('click',function(e){var q=function(s){return e.target.closest&&e.target.closest(s)},b;
              if(b=q('[data-tk-tab]'))return setTab(+b.getAttribute('data-tk-tab'));
              if(b=q('[data-tk-a]')){ai=+b.getAttribute('data-tk-a');rot=false;$('tk-rot').textContent='Rotasi: Off';manual=false;sec=0;chips();if(inited)render();return}
              if(q('#tk-mode')){manual=!manual;$('tk-mode').textContent='Mode: '+(manual?'Manual':'Auto');$('tk-manual').classList.toggle('hidden',!manual);$('tk-badge').textContent=manual?'MANUAL':'AUTO LIVE';chips();if(inited)try{render()}catch(x){}return}
              if(q('#tk-rot')){rot=!rot;$('tk-rot').textContent='Rotasi: '+(rot?'On':'Off');return}
              if(q('#tk-pause')){paused=!paused;$('tk-pause').textContent=paused?'Lanjut':'Jeda'}});
            setInterval(step,1500);setTimeout(step,300)}
          if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
        })();
        
