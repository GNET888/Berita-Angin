/* Pengaturan khusus HP / aplikasi terpasang: tandai opsi yang tidak berlaku, beri umpan balik, tambah kartu Aplikasi */
(function(){
  try{
  var D=document,W=window,page=D.getElementById('page-settings');if(!page)return;
  var $=function(q,c){return (c||D).querySelector(q)};
  var narrow=W.matchMedia('(max-width:767px)'),touch=W.matchMedia('(hover:none)');
  var standalone=function(){return (W.matchMedia&&(W.matchMedia('(display-mode: standalone)').matches||W.matchMedia('(display-mode: fullscreen)').matches))||navigator.standalone===true};
  var ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  var toast=function(m){W.baToast&&W.baToast(m)};
  function mark(sel,why,test){var el=$(sel,page),row=el&&el.closest('.st-row');if(!row)return;
    var on=test(),n=$('.ba-note',row);
    row.classList.toggle('ba-na',on);
    if(on&&!n){n=D.createElement('small');n.className='ba-note';n.textContent=why;var box=row.querySelector('label,div');(box||row).appendChild(n)}
    if(!on&&n)n.remove();
    var i=row.querySelector('input');if(i)i.disabled=on;var b=row.querySelector('button');if(b&&sel!=='#st-sb'&&sel!=='#st-tilt')b.disabled=on}
  function fsOk(){var r=D.documentElement;return !!(r.requestFullscreen||r.webkitRequestFullscreen)&&!standalone()}
  function refresh(){
    mark('#st-sb','Tidak berlaku di tampilan HP (sidebar diganti tab bar).',function(){return narrow.matches});
    mark('#st-tilt','Tidak berlaku di layar sentuh.',function(){return touch.matches});
    var fs=$('#st-full',page),row=fs&&fs.closest('.st-row');
    if(row){var off=!fsOk(),n=$('.ba-note',row);row.classList.toggle('ba-na',off);fs.disabled=off;
      if(off&&!n){n=D.createElement('small');n.className='ba-note';n.textContent=standalone()?'Aplikasi sudah tampil layar penuh.':'Peramban ini tidak mendukung layar penuh.';row.firstElementChild.appendChild(n)}
      if(!off&&n)n.remove()}
    var kc=$('.st-keys',page);kc=kc&&kc.closest('.st-card');if(kc)kc.style.display=(touch.matches&&narrow.matches)?'none':''
  }
  refresh();
  [narrow,touch].forEach(function(m){m.addEventListener&&m.addEventListener('change',refresh)});
  W.addEventListener('resize',refresh);
  /* Layar penuh: beri umpan balik bila gagal */
  D.addEventListener('click',function(e){if(!e.target.closest('#st-full'))return;
    setTimeout(function(){if(!D.fullscreenElement&&!D.webkitFullscreenElement)toast('Layar penuh ditolak oleh peramban')},400)},false);
  /* Ekspor: di HP/aplikasi terpasang gunakan lembar Bagikan bila ada (unduhan blob sering tidak jalan) */
  D.addEventListener('click',function(e){
    if(!e.target.closest('#st-export'))return;
    if(!(navigator.canShare&&navigator.share&&(ios||standalone())))return;
    var S=W.__BA_S,o={app:'berita-angin',version:1,settings:S},av=null;try{av=localStorage.getItem('ba-avatar')}catch(x){}if(av)o.avatar=av;
    var f=new File([JSON.stringify(o,null,2)],'berita-angin-pengaturan.json',{type:'application/json'});
    if(!navigator.canShare({files:[f]}))return;
    e.stopImmediatePropagation();e.preventDefault();
    navigator.share({files:[f],title:'Pengaturan Berita Angin'}).then(function(){toast('Pengaturan dibagikan')}).catch(function(){})
  },true);
  /* Kartu Aplikasi: status pemasangan + tombol Pasang */
  var kc2=$('.st-keys',page);kc2=kc2&&kc2.closest('.st-card');
  var card=D.createElement('div');card.className='st-card';card.id='ba-app-card';
  card.innerHTML='<div class="st-h"><i class="fa-solid fa-mobile-screen"></i>Aplikasi</div>'
   +'<div class="st-row first"><div><b>Status aplikasi</b><small id="ba-app-sub"></small></div><span class="st-badge" id="ba-app-badge">...</span></div>'
   +'<div class="st-row" id="ba-app-inst" style="display:none"><div><b>Pasang aplikasi</b><small>Tambahkan ke layar utama agar terbuka seperti aplikasi.</small></div><button type="button" class="st-btn pri" id="ba-app-btn"><i class="fa-solid fa-download"></i>Pasang</button></div>'
   +'<div class="st-row col" id="ba-app-ios" style="display:none"><div class="ba-ios" style="display:block">Di iPhone/iPad: ketuk tombol <b>Bagikan</b> di Safari, lalu pilih <b>Tambahkan ke Layar Utama</b>.</div></div>';
  if(kc2)kc2.parentNode.insertBefore(card,kc2);else $('.st-col:last-child',page)&&$('.st-col:last-child',page).appendChild(card);
  var evt=null;
  function appState(){
    var sa=standalone(),b=$('#ba-app-badge'),sub=$('#ba-app-sub');if(!b)return;
    b.className='st-badge'+(sa?'':' off');b.textContent=sa?'Terpasang':'Di browser';
    sub.textContent=sa?'Berjalan sebagai aplikasi. Pengaturan tersimpan di perangkat ini.':'Dibuka di browser. Pasang agar tampil seperti aplikasi.';
    $('#ba-app-inst').style.display=(!sa&&evt)?'':'none';
    $('#ba-app-ios').style.display=(!sa&&ios&&!evt)?'':'none';
  }
  W.addEventListener('beforeinstallprompt',function(e){evt=e;appState()});
  W.addEventListener('appinstalled',function(){evt=null;appState();toast('Aplikasi terpasang')});
  D.addEventListener('click',function(e){
    if(!e.target.closest('#ba-app-btn')||!evt)return;
    var ev=evt;try{ev.prompt();ev.userChoice.then(function(){evt=null;appState()})}catch(x){toast('Pemasangan belum bisa dimulai')}
  });
  try{W.matchMedia('(display-mode: standalone)').addEventListener('change',appState)}catch(_){}
  appState();
  /* Pengaturan harus tetap terbuka bila terpasang: simpan halaman terakhir saja, jangan paksa kembali ke Pengaturan */
  }catch(err){}
})();
