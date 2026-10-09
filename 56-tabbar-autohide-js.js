/* Tab bar HP: auto-hide saat scroll.
   Jari geser ke atas (halaman turun)  -> tab bar sembunyi
   Jari geser ke bawah (halaman naik)  -> tab bar muncul
   Ubah HIDE_ON_DOWN ke false untuk membalik arah. */
(function(){
  var HIDE_ON_DOWN = true, THRESHOLD = 8, TOP_ZONE = 60;
  var mq = window.matchMedia('(max-width:767px)');
  var last = 0, ticking = false;

  function nav(){ return document.getElementById('ba-tabbar'); }
  function y(){ var s = document.scrollingElement || document.documentElement; return s.scrollTop || window.pageYOffset || 0; }
  function setHidden(h){ var n = nav(); if(n) n.classList.toggle('ba-hide', h); }
  function sheetOpen(){ var s = document.getElementById('ba-sheet'); return !!(s && s.classList.contains('open')); }

  function update(){
    ticking = false;
    var n = nav(); if(!n) return;
    if(!mq.matches || sheetOpen()){ n.classList.remove('ba-hide'); last = y(); return; }
    var cur = y(), d = cur - last;
    var se = document.scrollingElement || document.documentElement;
    var atBottom = cur + window.innerHeight >= se.scrollHeight - 4;
    if(cur < TOP_ZONE || atBottom){ setHidden(false); last = cur; return; }   /* di paling atas / bawah: selalu tampil */
    if(Math.abs(d) < THRESHOLD) return;
    setHidden(HIDE_ON_DOWN ? d > 0 : d < 0);
    last = cur;
  }
  function onScroll(){ if(!ticking){ ticking = true; requestAnimationFrame(update); } }

  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', function(){ setHidden(false); last = y(); });
  window.addEventListener('orientationchange', function(){ setHidden(false); });
  if(mq.addEventListener) mq.addEventListener('change', function(){ setHidden(false); });
  /* ketuk tab / pindah halaman: tampilkan lagi */
  document.addEventListener('click', function(e){ if(e.target.closest && e.target.closest('.ba-tab')){ setHidden(false); last = y(); } }, true);
})();
