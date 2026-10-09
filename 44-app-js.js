(function(){
  try{
    var D=document,W=window,root=D.documentElement,main=D.querySelector('body>main');
    if(!main) return;
    var boot=Date.now();
    function acc(){var v=(getComputedStyle(root).getPropertyValue('--ba-ac')||'56 189 248').trim().split(/\s+/);return 'rgb('+v.join(',')+')';}
    function rr(x,l,t,w,h,r){x.beginPath();x.moveTo(l+r,t);x.arcTo(l+w,t,l+w,t+h,r);x.arcTo(l+w,t+h,l,t+h,r);x.arcTo(l,t+h,l,t,r);x.arcTo(l,t,l+w,t,r);x.closePath();}
    function mkIcon(s){var c=D.createElement('canvas');c.width=c.height=s;var x=c.getContext('2d');
      x.fillStyle='#05070d';x.fillRect(0,0,s,s);x.fillStyle=acc();rr(x,s*.14,s*.14,s*.72,s*.72,s*.2);x.fill();
      x.fillStyle='#fff';x.font='800 '+Math.round(s*.34)+'px Inter,Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('BA',s/2,s/2+s*.02);return c.toDataURL('image/png');}
    try{
      var a=W.__BA_ICON192,b=W.__BA_ICON512;
      
      if(location.protocol.indexOf('http')===0&&!D.querySelector('link[rel="manifest"][href="manifest.webmanifest"]')){var base=location.href.split('#')[0];
        var mf={name:'Berita Angin',short_name:'Berita Angin',description:'Berita, pasar kripto, saham, dan pasar global real-time.',start_url:base,scope:base.replace(/[^\/]*$/,''),display:'standalone',orientation:'portrait',background_color:'#000000',theme_color:'#000000',lang:'id',shortcuts:[{name:'Pengaturan',short_name:'Pengaturan',url:base+'#settings',icons:[{src:a,sizes:'192x192',type:'image/png'}]}],icons:[{src:a,sizes:'192x192',type:'image/png',purpose:'any maskable'},{src:b,sizes:'512x512',type:'image/png',purpose:'any maskable'}]};
        var ml=D.createElement('link');ml.rel='manifest';ml.href=URL.createObjectURL(new Blob([JSON.stringify(mf)],{type:'application/manifest+json'}));D.head.appendChild(ml);}
    }catch(e){}
    var TABS=[['home','home','Beranda'],['crypto-market','crypto-market','Kripto'],['stock-exchange','stock-exchange','Saham'],['global-market','global-market','Global'],['more','more','Lainnya']];
    var nav=D.createElement('nav');nav.id='ba-tabbar';nav.setAttribute('aria-label','Navigasi aplikasi');
    nav.innerHTML=TABS.map(function(t){return '<button type="button" class="ba-tab" data-k="'+t[0]+'"><span class="ba-tab-ico">'+W.__baDual(t[1])+'</span><span>'+t[2]+'</span></button>';}).join('');
    D.body.appendChild(nav);
    var scrim=D.createElement('div');scrim.id='ba-scrim';D.body.appendChild(scrim);
    var sheet=D.createElement('div');sheet.id='ba-sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','Menu lainnya');
    sheet.innerHTML='<div class="grab"></div><h3>Lainnya</h3>'
      +'<button type="button" class="ba-row" data-go="profile"><i class="fa-solid fa-user"></i><span>Profil &amp; Portofolio<small>Ringkasan portofolio dan statistik</small></span></button>'
      +'<button type="button" class="ba-row" data-go="market-stat"><i class="fa-solid fa-chart-pie"></i><span>Market Statistik<small>Data dan perbandingan pasar</small></span></button>'
      +'<button type="button" class="ba-row" data-go="settings"><i class="fa-solid fa-sliders"></i><span>Pengaturan<small>Warna, tema, tampilan, dan data</small></span></button>'
      +'<button type="button" class="ba-row" data-act="theme"><i class="fa-solid fa-circle-half-stroke"></i><span>Mode tampilan<small>Ganti terang atau gelap</small></span></button>'
      +'<button type="button" class="ba-row" data-act="install" hidden><i class="fa-solid fa-download"></i><span>Pasang aplikasi<small>Tambahkan ke layar utama</small></span></button>';
    D.body.appendChild(sheet);
    function openSheet(o){sheet.classList.toggle('open',o);scrim.classList.toggle('open',o);}
    scrim.addEventListener('click',function(){openSheet(false);});
    D.addEventListener('keydown',function(e){if(e.key==='Escape')openSheet(false);});
    function cur(){var p=main.querySelector('.page.active');return p?p.id.replace('page-',''):'home';}
    function go(k){var l=D.querySelector('header a.nav-link[data-page="'+k+'"]')||D.querySelector('a.nav-link[data-page="'+k+'"]');if(l)l.click();}
    nav.addEventListener('click',function(e){
      var t=e.target.closest('.ba-tab');if(!t)return;var k=t.getAttribute('data-k');
      if(navigator.vibrate){try{navigator.vibrate(8);}catch(_){}}
      if(k==='more'){openSheet(!sheet.classList.contains('open'));return;}
      if(k===cur())W.scrollTo({top:0,behavior:'smooth'});else go(k);
    });
    var evt=null;
    sheet.addEventListener('click',function(e){
      var r=e.target.closest('.ba-row');if(!r)return;
      var g=r.getAttribute('data-go'),ac=r.getAttribute('data-act');
      openSheet(false);
      if(g)go(g);
      else if(ac==='theme'){var tg=D.getElementById('theme-toggle');if(tg)tg.click();}
      else if(ac==='install'&&evt){evt.prompt();evt.userChoice.then(function(){evt=null;});}
    });
    var last=null,fromPop=false;
    function sync(){
      var k=cur(),main4=['home','crypto-market','stock-exchange','global-market'],tk=main4.indexOf(k)>-1?k:'more';
      Array.prototype.forEach.call(nav.querySelectorAll('.ba-tab'),function(b){var on=b.getAttribute('data-k')===tk;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
      if(k!==last){
        var pg=D.getElementById('page-'+k);
        if(pg){pg.classList.remove('ba-enter');void pg.offsetWidth;pg.classList.add('ba-enter');}
        if(last!==null&&!fromPop){try{(Date.now()-boot<2000?history.replaceState:history.pushState).call(history,{p:k},'','#'+k);}catch(_){}}
        last=k;
      }
    }
    new MutationObserver(function(m){for(var i=0;i<m.length;i++){var t=m[i].target;if(t.classList&&t.classList.contains('page')){sync();return;}}}).observe(main,{attributes:true,attributeFilter:['class'],subtree:true});
    W.addEventListener('popstate',function(e){
      openSheet(false);
      var k=(e.state&&e.state.p)||location.hash.slice(1)||'home';if(k==='article-detail')k='home';
      if(k!==cur()){fromPop=true;go(k);setTimeout(function(){fromPop=false;},0);}
    });
    var h=location.hash.slice(1);
    if(h&&h!=='home'&&h!=='article-detail'&&D.getElementById('page-'+h)){fromPop=true;go(h);setTimeout(function(){fromPop=false;},0);}
    sync();try{history.replaceState({p:cur()},'','#'+cur());}catch(_){}
    var toast=D.createElement('div');toast.id='ba-toast';toast.setAttribute('role','status');D.body.appendChild(toast);
    var tt;function say(t){toast.textContent=t;toast.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){toast.classList.remove('show');},2600);}
    W.addEventListener('offline',function(){say('Anda sedang offline');});
    W.addEventListener('online',function(){say('Kembali online');});
    var standalone=(W.matchMedia&&W.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
    var dismissed=false;try{dismissed=(Date.now()-(+localStorage.getItem('ba-inst-x')||0))<6048e5;}catch(_){}
    var chip=D.createElement('div');chip.id='ba-install';D.body.appendChild(chip);
    function hideChip(s){chip.classList.remove('show');if(s){try{localStorage.setItem('ba-inst-x',String(Date.now()));}catch(_){}}}
    function showChip(html,withGo){if(standalone||dismissed)return;chip.innerHTML='<span>'+html+'</span>'+(withGo?'<button type="button" class="go">Pasang</button>':'')+'<button type="button" class="x" aria-label="Tutup">&times;</button>';setTimeout(function(){chip.classList.add('show');},3500);}
    chip.addEventListener('click',function(e){
      if(e.target.closest('.x')){hideChip(true);return;}
      if(e.target.closest('.go')&&evt){evt.prompt();evt.userChoice.then(function(){evt=null;hideChip(true);});}
    });
    W.addEventListener('beforeinstallprompt',function(e){e.preventDefault();evt=e;var r=sheet.querySelector('[data-act="install"]');if(r&&!standalone)r.hidden=false;showChip('Pasang Berita Angin sebagai aplikasi',true);});
    W.addEventListener('appinstalled',function(){hideChip(true);say('Aplikasi terpasang');});
    if(/iphone|ipad|ipod/i.test(navigator.userAgent)&&!standalone)showChip('Ketuk Bagikan, lalu <b>Tambahkan ke Layar Utama</b>',false);
  }catch(e){}
})();
