(function(){
  var D=document,W=window;
  function pageOf(el){return el&&el.id?el.id.replace('page-',''):''}
  function openSettings(){
    var a=D.querySelector('header a.nav-link[data-page="settings"]')||D.querySelector('a.nav-link[data-page="settings"]');
    if(a){a.click();return true}
    var main=D.querySelector('body>main'),pg=D.getElementById('page-settings');if(!main||!pg)return false;
    main.querySelectorAll('.page').forEach(function(p){p.classList.remove('active')});
    pg.classList.add('active');W.scrollTo(0,0);return true;
  }
  W.baOpenSettings=openSettings;
  /* Cadangan: jika klik pada ikon/baris Pengaturan tidak berpindah halaman, paksa buka */
  D.addEventListener('click',function(e){
    var t=e.target.closest&&e.target.closest('.ba-gear,#ba-sheet .ba-row[data-go="settings"],a.nav-link[data-page="settings"]');
    if(!t)return;
    setTimeout(function(){var act=D.querySelector('body>main .page.active');if(pageOf(act)!=='settings')openSettings()},120);
  },false);
  /* Tautan #settings (pintasan ikon aplikasi / bookmark) */
  function fromHash(){if(location.hash==='#settings'&&pageOf(D.querySelector('body>main .page.active'))!=='settings')openSettings()}
  W.addEventListener('hashchange',fromHash);
  W.addEventListener('load',function(){setTimeout(fromHash,400)});
  /* Parameter ?page=settings untuk aplikasi terpasang */
  try{if(/[?&]page=settings\b/.test(location.search))setTimeout(openSettings,500)}catch(_){}
  /* Pintasan Ctrl/Cmd + , sudah ada; tambah Alt+S sebagai cadangan */
  D.addEventListener('keydown',function(e){
    if(e.altKey&&!e.ctrlKey&&!e.metaKey&&(e.key==='s'||e.key==='S')){var t=e.target;if(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable))return;e.preventDefault();openSettings()}
  });
})();
