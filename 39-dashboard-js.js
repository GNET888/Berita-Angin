(function(){
  try{
    var main=document.querySelector('body>main'); if(!main) return;
    var root=document.documentElement, hdr=document.querySelector('header.sticky');
    var TITLES={'home':'Beranda','profile':'Profile & Portofolio','crypto-market':'Crypto Market','stock-exchange':'Stock Exchange','global-market':'Global Market','market-stat':'Market Statistik','settings':'Pengaturan','article-detail':'Detail Artikel'};
    var bar=document.createElement('div'); bar.id='ba-topbar';
    bar.innerHTML='<div class="ba-left"><button id="ba-collapse" type="button" aria-label="Ciutkan / lebarkan sidebar" title="Ciutkan / lebarkan sidebar ( [ )"><i class="fa-solid fa-angles-left"></i></button>'
      +'<div class="ba-crumb"><span class="ba-crumb-root">Dashboard</span><i class="fa-solid fa-chevron-right"></i><b id="ba-page-title">Beranda</b></div></div>'
      +'<div class="ba-top-right"><span class="ba-live"><span class="ba-live-dot"></span>LIVE</span>'
      +'<span class="ba-date" id="ba-date"></span>'
      +'<span class="ba-clock"><i class="fa-regular fa-clock"></i><span id="ba-clock">--:--:--</span> <span class="ba-tzl">WIB</span></span></div>';
    main.parentNode.insertBefore(bar,main);
    var titleEl=document.getElementById('ba-page-title');
    /* Sidebar: lebar/ikon, otomatis ikut ukuran layar, ingat pilihan pengguna */
    var pref=null; try{pref=localStorage.getItem('ba-sb');}catch(e){}
    var mq=window.matchMedia('(max-width:1023px)');
    function apply(){ root.classList.toggle('ba-collapsed', mq.matches || pref==='collapsed'); }
    function toggle(){
      var now=root.classList.contains('ba-collapsed');
      pref=now?'expanded':'collapsed';
      try{localStorage.setItem('ba-sb',pref);}catch(e){}
      root.classList.toggle('ba-collapsed',!now);
      setTimeout(function(){window.dispatchEvent(new Event('resize'));},380);
    }
    apply();
    if(mq.addEventListener) mq.addEventListener('change',apply); else mq.addListener(apply);
    document.getElementById('ba-collapse').addEventListener('click',toggle);
    document.addEventListener('keydown',function(e){
      var t=e.target, tag=t&&t.tagName;
      if(e.key==='['&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&tag!=='INPUT'&&tag!=='TEXTAREA'&&tag!=='SELECT'&&!(t&&t.isContentEditable)) toggle();
    });
    /* Sub-menu: buka otomatis untuk halaman aktif, chevron untuk buka/tutup manual */
    var groups=hdr?hdr.querySelectorAll('.group'):[];
    groups.forEach(function(g){
      var ch=g.querySelector('.fa-chevron-down');
      if(ch) ch.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();g.classList.toggle('ba-open');});
    });
    /* Spotlight mengikuti kursor pada item menu */
    if(hdr) hdr.addEventListener('mousemove',function(e){
      var a=e.target.closest&&e.target.closest('.nav-link'); if(!a) return;
      var r=a.getBoundingClientRect(); a.style.setProperty('--mx',(e.clientX-r.left)+'px'); a.style.setProperty('--my',(e.clientY-r.top)+'px');
    });
    function sync(){
      var act=main.querySelector('.page.active'); var key=act?act.id.replace('page-',''):'home';
      titleEl.textContent=TITLES[key]||'Dashboard';
      document.querySelectorAll('header a.nav-link[data-page], #mobile-sidebar a.nav-link[data-page]').forEach(function(a){
        a.classList.toggle('ba-active',a.getAttribute('data-page')===key);
      });
      groups.forEach(function(g){var a=g.querySelector('a.nav-link[data-page]'); if(a&&a.getAttribute('data-page')===key) g.classList.add('ba-open'); else g.classList.remove('ba-open');});
    }
    new MutationObserver(function(m){
      for(var i=0;i<m.length;i++){var t=m[i].target; if(t.classList&&t.classList.contains('page')){sync();return;}}
    }).observe(main,{attributes:true,attributeFilter:['class'],subtree:true});
    function tick(){
      var d=new Date(), c=document.getElementById('ba-clock'), dt=document.getElementById('ba-date');
      try{
        if(c) c.textContent=window.__baTime(d);
        if(dt) dt.textContent=window.__baDate(d);
      }catch(e){}
    }
    tick(); setInterval(tick,1000); sync();
  }catch(e){}
})();
