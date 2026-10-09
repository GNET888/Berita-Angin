/* Market Statistik: membaca hasil analisis langsung dari elemen di halaman Crypto Market, Stock Exchange, dan Global Market (tanpa mengubah halaman tersebut), diperbarui tiap 2 detik. */
        (function(){
          function T(id){var e=document.getElementById(id);var v=e?(e.textContent||'').replace(/\s+/g,' ').trim():'';return v&&v!=='--'?v:'--'}
          function tone(v){return /buy|bull|beli|naik|long|ekspansi|expan|lancar|\+\d|^\+|greed|easing|longgar/i.test(v)?1:/sell|bear|jual|turun|short|kontraksi|contract|macet|padat|^[-\u2212]|fear|ketat|tight/i.test(v)?-1:0}
          function col(n){return n>0?'text-emerald-400':n<0?'text-rose-400':'text-gray-300'}
          function rows(box,list){var h='';list.forEach(function(r){var v=r[1].map(T).filter(function(x){return x!=='--'}).join(' \u00b7 ')||'--';h+='<div class="ms-row"><span>'+r[0]+'</span><b class="'+(r[2]?col(tone(v)):'')+'">'+v+'</b></div>'});box.innerHTML=h}
          function setPill(id,n){var p=document.getElementById(id);if(!p)return;p.className='ms-pill '+(n>0?'ms-up':n<0?'ms-dn':'ms-nt');p.textContent=n>0?'Bullish':n<0?'Bearish':'Netral'}
          function bias(){var items=[['Crypto',T('cxp-sig'),'ms-pill-crypto'],['Saham',T('tm-sig'),'ms-pill-stock'],['Global',T('liq-k-mom')+' '+T('liq-k-reg'),'ms-pill-global']];var sum=0,chips='';
            items.forEach(function(i){var n=tone(i[1]);sum+=n;setPill(i[2],n);chips+='<div class="ms-mk"><span>'+i[0]+'</span><b class="ms-pill '+(n>0?'ms-up':n<0?'ms-dn':'ms-nt')+'">'+(n>0?'Bullish':n<0?'Bearish':'Netral')+'</b></div>'});
            var KS=sum>=3?'Pasar risk-on penuh: Crypto, Saham, dan Global kompak menguat, tekanan beli dominan.':sum>0?'Pasar cenderung risk-on: tekanan beli lebih kuat di sebagian besar pasar, tetap waspadai koreksi teknikal.':sum<=-3?'Pasar risk-off penuh: ketiga pasar kompak tertekan, aksi jual dan sikap menghindari risiko mendominasi.':sum<0?'Pasar cenderung risk-off: tekanan jual lebih dominan, pelaku pasar bersikap defensif.':'Pasar sideways: sinyal saling bertolak belakang, pelaku pasar menunggu katalis arah.';
            var pos=Math.round((sum+3)/6*100),cls=sum>0?'ms-up':sum<0?'ms-dn':'ms-nt';
            document.getElementById('ms-bias').innerHTML='<div class="ms-vd-l"><div class="ms-vd-lab">Kesimpulan pasar</div><p class="ms-vd-txt">'+KS+'</p><div class="ms-meter" role="img" aria-label="Skor pasar '+sum+' dari rentang -3 sampai 3"><i class="'+cls+'" style="left:'+pos+'%"></i></div><div class="ms-meter-lab"><span>Risk-off</span><span>Netral</span><span>Risk-on</span></div></div><div class="ms-mks">'+chips+'</div>'}
          function run(){try{
            rows(document.getElementById('ms-crypto'),[['Indeks live',['live-index-val']],['Perubahan',['cxp-chg'],1],['RSI 14',['cxp-rsi']],['Sinyal',['cxp-sig'],1],['BTC Dominance',['stat-btc-dom']],['Altcoin Season',['mini-alt-value','alt-zone']],['Market Cap Global',['stat-global-mcap']],['Open Interest',['stat-open-interest']],['Jaringan (Gas)',['gas-congestion-label'],1]]);
            rows(document.getElementById('ms-stock'),[['NASDAQ',['ov-nasdaq-chg'],1],['S&P 500',['ov-sp-chg'],1],['Dow Jones',['ov-dow-chg'],1],['Perubahan',['tm-chg'],1],['RSI 14',['tm-rsi']],['Volatilitas',['tm-vola']],['Sinyal',['tm-sig'],1],['Tekanan Order',['l2-pressure'],1],['Sesi Pasar',['se2-session']]]);
            rows(document.getElementById('ms-global'),[['Saldo Komposit',['liq-k-bal']],['Momentum 3 Bulan',['liq-k-mom'],1],['Rezim Likuiditas',['liq-k-reg','mlc-regime'],1],['Ringkasan',['mlc-hm-sum']]]);
            var al=document.getElementById('mlc-alerts'),ms=document.getElementById('ms-alerts'),a=[];
            if(al)Array.prototype.forEach.call(al.children,function(c){var k=c.children,t,x,cl='';if(k&&k.length>=3){t=(k[1].textContent||'').trim();x=(k[2].textContent||'').replace(/\s+/g,' ').trim();cl=k[0].style&&k[0].style.color||''}else{x=(c.textContent||'').replace(/\s+/g,' ').trim();t=''}if(x&&a.length<5)a.push({t:t,x:x,c:cl})});
            ms.innerHTML=a.length?a.map(function(q){return '<div class="ms-al"'+(q.c?' style="--ac:'+q.c.replace(/[^#a-z0-9(),. %]/gi,'')+'"':'')+'>'+(q.t?'<time>'+q.t.replace(/</g,'&lt;')+'</time>':'')+'<span>'+q.x.replace(/</g,'&lt;')+'</span></div>'}).join(''):'<div class="ms-empty">Belum ada peringatan. Peringatan muncul otomatis saat kondisi likuiditas berubah.</div>';
            bias();document.getElementById('ms-upd').textContent=new Date().toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta',hour12:false}).replace(/\./g,':');
          }catch(e){}}
          if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
          setInterval(run,2000);
        })();
        
