/* Tema Putih/Dark Black cepat, koneksi data, layar penuh, putar halaman otomatis, pintasan keyboard */
(function(){
  var S=window.__BA_S,root=document.documentElement;if(!S||!window.baSettingsChange)return;
  var $=function(q,c){return (c||document).querySelector(q)};
  var PAGES=['home','profile','crypto-market','stock-exchange','global-market','market-stat'],AUTO=['home','crypto-market','stock-exchange','global-market','market-stat'],cur='home';
  function go(p){var a=$('a.nav-link[data-page="'+p+'"]');if(a)a.click()}
  function isLight(){return root.classList.contains('light')}
  function toggleTheme(){var l=isLight();window.baSettingsChange('theme',l?'dark':'light',l?'Tema Dark Black aktif':'Tema Putih aktif')}
  var tr=$('#ba-topbar .ba-top-right'),tb=null;
  function icon(){if(!tb)return;tb.innerHTML='<i class="fa-solid '+(isLight()?'fa-sun':'fa-moon')+'"></i>';tb.title=isLight()?'Ganti ke Dark Black (T)':'Ganti ke Putih (T)'}
  if(tr){tb=document.createElement('button');tb.type='button';tb.className='ba-tt';tb.setAttribute('aria-label','Ganti tema Putih / Dark Black');tb.addEventListener('click',toggleTheme);tr.insertBefore(tb,$('.ba-gear',tr)||null)}
  icon();new MutationObserver(icon).observe(root,{attributes:true,attributeFilter:['class']});
  function full(){try{if(document.fullscreenElement)document.exitFullscreen();else root.requestFullscreen()}catch(e){}}
  function net(){var el=$('#st-net');if(!el)return;var on=navigator.onLine;el.className='st-badge'+(on?'':' off');el.textContent=on?(window.__BA_PROXY?'Online • API aktif':'Online'):'Offline'}
  window.addEventListener('online',net);window.addEventListener('offline',net);net();setTimeout(net,2500);
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a.nav-link[data-page]');
    if(a){cur=a.getAttribute('data-page');if(cur!=='settings'){try{localStorage.setItem('ba-lastpage',cur)}catch(x){}}}
    if(e.target.closest('#st-full'))full();
    if(e.target.closest('#st-refresh')){var ok=false;if(typeof loadLiveRates==='function'){try{loadLiveRates();ok=true}catch(x){}}net();window.baToast&&window.baToast(ok?'Data langsung dimuat ulang':'Data langsung akan dimuat otomatis')}
  },true);
  var timer=null;
  function syncAuto(){clearInterval(timer);timer=null;if(!S.autoplay)return;
    timer=setInterval(function(){if(cur==='settings'||document.hidden)return;var i=AUTO.indexOf(cur);go(AUTO[(i+1)%AUTO.length])},Math.max(5,S.autosec||20)*1000)}
  var base=window.baApplyVisual;window.baApplyVisual=function(){base();syncAuto()};syncAuto();
  document.addEventListener('keydown',function(e){
    if(e.ctrlKey||e.metaKey||e.altKey)return;var t=e.target;
    if(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable))return;
    var k=(e.key||'').toLowerCase();
    if(k==='t')toggleTheme();else if(k==='f')full();else if(/^[1-6]$/.test(k))go(PAGES[+k-1]);
  });
})();
