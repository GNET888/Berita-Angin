(function(){
 function paintMiniSparks(){
  document.querySelectorAll('.mini-spark').forEach((el)=>{
   const positive=el.classList.contains('up');
   let y=positive?19:5;
   const pts=[];
   for(let i=0;i<12;i++){
    y+=(Math.random()-0.48)*(positive?-2.3:2.3);
    y=Math.max(3,Math.min(24,y));
    pts.push((i*7)+','+y.toFixed(1));
   }
   const color=positive?'#34d399':'#fb7185';
   el.innerHTML='<svg viewBox="0 0 77 27" preserveAspectRatio="none"><polyline style="stroke:'+color+'" points="'+pts.join(' ')+'"/></svg>';
  });
 }
 document.addEventListener('DOMContentLoaded',()=>{
  paintMiniSparks();
  setInterval(paintMiniSparks,1800);
 });
})();
