/* Bungkus tabel agar bisa digeser di layar kecil */
(function(){function w(){document.querySelectorAll('.page table').forEach(function(t){if(t.dataset.bw)return;t.dataset.bw=1;if(t.closest('[class*="overflow-x-auto"],[class*="overflow-auto"],.ba-scroll,[style*="overflow"]'))return;var d=document.createElement('div');d.className='ba-scroll overflow-x-auto';d.style.overflowX='auto';t.parentNode.insertBefore(d,t);d.appendChild(t)})}
var q;function s(){clearTimeout(q);q=setTimeout(w,250)}
document.addEventListener('DOMContentLoaded',function(){w();var m=document.querySelector('main');if(m&&window.MutationObserver)new MutationObserver(s).observe(m,{childList:true,subtree:true})});})();
