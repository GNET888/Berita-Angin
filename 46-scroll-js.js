(function(){
  try{
    var W=window,D=document,mq=W.matchMedia('(max-width:767px)');
    /* 1) Jangan biarkan scroll terkunci (body overflow:hidden tersangkut) */
    function unlock(){
      if(!mq.matches)return;
      var sh=D.getElementById('ba-sheet'),open=sh&&sh.classList.contains('open');
      if(D.body.style.overflow==='hidden'&&!open)D.body.style.overflow='';
      if(D.documentElement.style.overflow==='hidden')D.documentElement.style.overflow='';
    }
    new MutationObserver(unlock).observe(D.body,{attributes:true,attributeFilter:['style','class']});
    unlock();
    /* 2) Animasi latar 3D berhenti sementara saat jari menggulir, lalu lanjut lagi */
    var prev=false,busy=false,tm;
    function stop(){
      if(!mq.matches)return;
      if(!busy){busy=true;prev=!!W.__BA_3D_OFF;W.__BA_3D_OFF=true;}
      clearTimeout(tm);tm=setTimeout(function(){busy=false;W.__BA_3D_OFF=prev;},220);
    }
    W.addEventListener('scroll',stop,{passive:true});
    D.addEventListener('touchmove',stop,{passive:true});
    /* 3) Bar alamat HP naik/turun hanya mengubah tinggi layar: jangan hitung ulang kanvas */
    var lw=W.innerWidth,lh=W.innerHeight;
    W.addEventListener('resize',function(e){
      if(!mq.matches){lw=W.innerWidth;lh=W.innerHeight;return;}
      var dw=Math.abs(W.innerWidth-lw),dh=Math.abs(W.innerHeight-lh);
      if(dw<2&&dh<=200){e.stopImmediatePropagation();return;}
      lw=W.innerWidth;lh=W.innerHeight;
    },true);
  }catch(e){}
})();
