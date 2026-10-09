/* Tambahan sidebar mobile: tutup dengan klik latar / tombol Esc, dan kunci scroll halaman saat terbuka. Aditif. */
(function(){
var m=document.getElementById('mobile-sidebar');if(!m)return;
function close(){try{if(typeof toggleSidebar==='function')toggleSidebar(false)}catch(e){}}
m.addEventListener('click',function(e){if(e.target===m)close()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!m.classList.contains('hidden'))close()});
new MutationObserver(function(){document.body.style.overflow=m.classList.contains('hidden')?'':'hidden'}).observe(m,{attributes:true,attributeFilter:['class']});
/* jam WIB (hanya berjalan saat sidebar terbuka) */
var ck=document.getElementById('sb-clock');
function tick(){if(!ck||m.classList.contains('hidden'))return;try{ck.textContent=window.__baTime(new Date())}catch(e){}}
setInterval(tick,1000);tick();
/* penanda sub-menu aktif */
var subs=m.querySelectorAll('.sb-sublink');
function mark(el){Array.prototype.forEach.call(subs,function(x){x.classList.remove('is-active');x.removeAttribute('aria-current')});if(el){el.classList.add('is-active');el.setAttribute('aria-current','page')}}
Array.prototype.forEach.call(subs,function(a){a.addEventListener('click',function(){mark(a)},true)});
Array.prototype.forEach.call(m.querySelectorAll('.sb-link[data-page]'),function(a){a.addEventListener('click',function(){mark(null)},true)});
})();
