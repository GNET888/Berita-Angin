/* Foto profil: unggah sendiri (disimpan di browser). Tanpa foto -> monogram "AE", bukan foto stok. */
(function(){
  var KEY='ba-avatar',root=document.documentElement,PH='data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20200%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%230b1220%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%231e293b%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22200%22%20height%3D%22200%22%20fill%3D%22url%28%23g%29%22%2F%3E%3Ctext%20x%3D%22100%22%20y%3D%22124%22%20text-anchor%3D%22middle%22%20font-family%3D%22Inter%2CArial%2Csans-serif%22%20font-size%3D%2284%22%20font-weight%3D%22800%22%20fill%3D%22%2338BDF8%22%3EAE%3C%2Ftext%3E%3C%2Fsvg%3E';
  function apply(src,custom){
    document.querySelectorAll('img[data-avatar]').forEach(function(i){i.src=src});
    root.style.setProperty('--ba-avatar','url("'+src+'")');
    document.querySelectorAll('[data-avatar-reset]').forEach(function(b){b.style.display=custom?'':'none'});
  }
  function load(){
    var v=null;try{v=localStorage.getItem(KEY)}catch(e){}
    if(v){apply(v,true);return}
    apply(PH,false);
    var t=new Image();t.onload=function(){apply('profil.gif',false)};t.src='profil.gif';
  }
  var inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.style.display='none';document.body.appendChild(inp);
  inp.addEventListener('change',function(){
    var f=inp.files&&inp.files[0];inp.value='';
    if(!f||!/^image\//.test(f.type)||f.size>12*1024*1024)return;
    var fr=new FileReader();
    fr.onload=function(){
      var im=new Image();
      im.onload=function(){
        var S=480,c=document.createElement('canvas');c.width=c.height=S;
        var m=Math.min(im.width,im.height),sx=(im.width-m)/2,sy=(im.height-m)/2;
        c.getContext('2d').drawImage(im,sx,sy,m,m,0,0,S,S);
        var d=c.toDataURL('image/jpeg',.88);
        try{localStorage.setItem(KEY,d)}catch(e){}
        apply(d,true);
      };
      im.src=fr.result;
    };
    fr.readAsDataURL(f);
  });
  document.addEventListener('click',function(e){
    var t=e.target.closest&&e.target.closest('[data-avatar-change],[data-avatar-reset]');
    if(!t)return;e.preventDefault();e.stopPropagation();
    if(t.hasAttribute('data-avatar-change'))inp.click();
    else{try{localStorage.removeItem(KEY)}catch(x){}load()}
  });
  load();
})();
/* Tilt 3D pada kartu berita */
(function(){
  if(!window.matchMedia||!matchMedia('(hover:hover)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  var cur=null;
  function reset(){if(cur){cur.style.transform='';cur=null}}
  document.addEventListener('pointermove',function(e){
    if(document.documentElement.classList.contains('ba-no-tilt')){reset();return}
    var c=e.target.closest?e.target.closest('.card-3d'):null;
    if(cur&&cur!==c)reset();
    if(!c)return;cur=c;
    var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    c.style.transform='perspective(900px) rotateX('+(-y*7).toFixed(2)+'deg) rotateY('+(x*9).toFixed(2)+'deg) translateZ(6px)';
  },{passive:true});
  document.addEventListener('mouseleave',reset);
})();
