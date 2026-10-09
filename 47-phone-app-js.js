(function(){try{
  var r=document.documentElement;
  /* Cadangan untuk browser lama yang belum mengenal satuan dvh */
  if(!(window.CSS&&CSS.supports&&CSS.supports('height','100dvh'))){
    var fx=function(){r.style.setProperty('--ba-vh',window.innerHeight+'px')};
    fx();addEventListener('resize',fx);addEventListener('orientationchange',fx);
  }
  /* Pindah tab/menu di HP: kembali ke atas halaman, seperti aplikasi */
  document.addEventListener('click',function(e){
    var t=e.target.closest&&e.target.closest('.ba-tab,.ba-row[data-go]');
    if(t&&matchMedia('(max-width:767px)').matches)setTimeout(function(){window.scrollTo({top:0,behavior:'smooth'})},40);
  },true);
}catch(e){}})();
