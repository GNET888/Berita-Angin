(function(){
  function shake(el){
    if(!el)return;
    el.classList.remove('ba-wig');void el.offsetWidth;el.classList.add('ba-wig');
    var done=function(){el.classList.remove('ba-wig');el.removeEventListener('animationend',done)};
    el.addEventListener('animationend',done);
  }
  document.addEventListener('click',function(e){
    var t=e.target.closest&&e.target.closest('.ba-tab,a[data-page]');
    if(!t)return;
    shake(t.classList.contains('ba-tab')?t.querySelector('.di'):t.querySelector('.nav-ico'));
  },true);
})();
