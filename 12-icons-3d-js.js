(function(){
  function add(){
    if(document.getElementById('baIcoDefs'))return;
    var d=document.createElement('div');d.id='baIcoDefs';d.setAttribute('aria-hidden','true');d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
    d.innerHTML='<svg width="0" height="0" focusable="false"><defs><linearGradient id="baIcoGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d4ecff"/></linearGradient></defs></svg>';
    document.body.appendChild(d);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
})();
