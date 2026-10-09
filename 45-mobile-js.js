(function(){
  try{
    var D=document,W=window,main=D.querySelector('body>main');if(!main)return;
    var mq=W.matchMedia('(max-width:767px)');
    var tk=D.getElementById('live-ticks-ticker');
    if(tk){var w=tk.closest('.border-b');if(w)w.classList.add('ba-tickwrap');}
    /* Tabel tanpa pembungkus scroll -> bisa digeser mendatar di HP */
    function scan(){
      if(!mq.matches)return;
      var pg=main.querySelector('.page.active');if(!pg)return;
      Array.prototype.forEach.call(pg.querySelectorAll('table:not([data-ba-t])'),function(t){
        t.setAttribute('data-ba-t','1');
        var p=t.parentElement,ok=false;
        while(p&&p!==main){var o=getComputedStyle(p).overflowX;if(o==='auto'||o==='scroll'){ok=true;break;}p=p.parentElement;}
        if(!ok)t.classList.add('ba-tscroll');
      });
    }
    var tm;function later(){clearTimeout(tm);tm=setTimeout(scan,350);}
    new MutationObserver(later).observe(main,{childList:true,subtree:true});
    new MutationObserver(later).observe(main,{attributes:true,attributeFilter:['class'],subtree:true,childList:false});
    if(mq.addEventListener)mq.addEventListener('change',scan);
    scan();setTimeout(scan,1500);
    /* Tutup lembar Lainnya saat layar diputar/diubah ukurannya ke desktop */
    mq.addEventListener&&mq.addEventListener('change',function(e){if(!e.matches){var sh=D.getElementById('ba-sheet'),sc=D.getElementById('ba-scrim');if(sh)sh.classList.remove('open');if(sc)sc.classList.remove('open');}});
  }catch(e){}
})();
