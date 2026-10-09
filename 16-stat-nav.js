/* Navigasi lompat Market Statistik */
        (function(){document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-ms-go]');if(!b)return;var t=document.getElementById(b.getAttribute('data-ms-go'));if(!t)return;var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;t.scrollIntoView({behavior:rm?'auto':'smooth',block:'start'})})})();
        
