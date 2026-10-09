/* PEMUAT DATA HARIAN: membaca data.js (dibuat update_data.py) dan menimpa nilai dasar. Gagal/tidak ada = pakai nilai tertanam. */
(function(){
  var D=window.__DAILY||null;
  var nf=function(n,d){return n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})};
  window.__dailyGM=function(R){ if(!D||!D.global) return R;
    return R.map(function(a){var u=D.global[a[0]]; if(!u||typeof u.v!=='number') return a;
      var raw=a[3], pre=raw.charAt(0)==='$'?'$':'', suf=raw.slice(-1)==='%'?'%':'', dec=(raw.split('.')[1]||'').replace(/\D/g,'').length;
      var c=a.slice(); c[3]=pre+nf(u.v,dec)+suf;
      if(typeof u.c==='number') c[4]=(u.c>=0?'+':'')+u.c.toFixed(2)+'%'; return c;});};
  window.__dailyCrypto=function(pages){ if(!D||!D.crypto) return;
    Object.keys(pages).forEach(function(k){pages[k].forEach(function(c){
      var u=D.crypto[c.symbol]||(c.alias&&D.crypto[c.alias]); if(!u) return;
      c.current_price=u.p; c.price_change_percentage_24h=u.c; if(u.v) c.total_volume=u.v;});});};
  window.__dailySeed=function(seed){ if(!D||!D.crypto||!D.crypto.btc) return seed;
    var k=D.crypto.btc.p/seed[seed.length-1][3];
    return seed.map(function(r){return r.map(function(x){return Math.round(x*k)})});};
  window.__dailyFXrows=function(rows){ if(!D||!D.fx) return rows;
    return rows.map(function(a){var u=D.fx[a[0]]; if(!u||typeof u.v!=='number') return a; var c=a.slice(); c[1]=u.v; if(typeof u.c==='number') c[2]=u.c; return c;});};
  window.__dailyStocks=function(list){ if(!D||!D.stocks) return;
    list.forEach(function(s){var u=D.stocks[s.symbol]; if(!u||!(u.v>0)) return;
      var old=+s.price, mm=String(s.mktCap||'').match(/^\$([\d.,]+)([TBM])$/i);
      if(mm&&old>0){var val=parseFloat(mm[1].replace(/,/g,''))*(u.v/old), unit=mm[2].toUpperCase();
        s.mktCap='$'+(unit==='T'?val.toFixed(2):Math.round(val))+unit;}
      s.price=u.v; s.change=(u.c>=0?'+':'')+u.c.toFixed(2)+'%';});};
  window.__dailyLiq=function(C){ if(!D||!D.liq) return C;
    var MO=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    C.forEach(function(c){var u=D.liq[c.id]; if(!u||typeof u.v!=='number') return; c.b=u.v;
      if(u.d){var p=u.d.split('-'); if(p.length===3&&c.s) c.s=c.s.replace(/\d{1,2} [A-Za-z]{3} 20\d\d/,(+p[2])+' '+MO[+p[1]-1]+' '+p[0]);}});
    return C;};
  window.__dailyHist=function(sym,rg){ if(!D||!D.hist||!D.hist[sym]) return null;
    var n={'1mo':22,'3mo':64,'6mo':127,'1y':252}[rg]||252, h=D.hist[sym].slice(-n);
    if(h.length<3) return null; return {pts:h,price:h[h.length-1][1]};};
  if(D&&D.cryptoGlobal&&D.cryptoGlobal.btc){window.__CGG=Object.assign({},D.cryptoGlobal);}
  /* Lencana status data: dipanggil saat halaman siap dan setiap data.js diperbarui (lihat data-refresh.js) */
  window.__dailyBadge=function(d){
    d=d||window.__DAILY||null;
    var b=document.getElementById('daily-badge');
    if(!b){ if(!document.body) return; b=document.createElement('div'); b.id='daily-badge'; document.body.appendChild(b); }
    var ts=d&&(d.asOfISO||d.asOf)?Date.parse(d.asOfISO||(d.asOf+'T00:00:00Z')):NaN;
    var hrs=isNaN(ts)?null:(Date.now()-ts)/36e5;
    var stale=hrs===null||hrs>36;
    var label='Data harian tidak termuat';
    if(d&&hrs!==null){
      var when=(d.asOfISO?new Date(ts).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}).replace(/\./g,':'):d.asOf);
      label='Data pasar: '+when+(stale?' (usang '+Math.floor(hrs/24)+' hari)':' (terbaru)');
    }
    b.textContent=label;
    b.style.cssText='position:fixed;right:10px;bottom:10px;z-index:9999;font:600 10px ui-monospace,monospace;padding:4px 8px;border-radius:8px;background:rgba(0,0,0,.65);color:'+(stale?'#f87171':'#34d399')+';border:1px solid '+(stale?'#7f1d1d':'#065f46')+';pointer-events:none';
  };
  document.addEventListener('DOMContentLoaded',function(){window.__dailyBadge(D);});
})();
