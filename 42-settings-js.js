/* Halaman Pengaturan: semua kontrol langsung diterapkan & disimpan (localStorage 'ba-settings') */
(function(){
  var S=window.__BA_S,D=window.__BA_D,KEY='ba-settings',root=document.documentElement;
  if(!S||!D)return;
  var page=document.getElementById('page-settings');if(!page)return;
  var $=function(q,c){return (c||document).querySelector(q)},$$=function(q,c){return Array.prototype.slice.call((c||document).querySelectorAll(q))};
  function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
  var tt;function toast(m){var t=$('#st-toast');if(!t){t=document.createElement('div');t.id='st-toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('on')},1400)}
  var OUT={card:function(v){return v+'%'},glow:function(v){return v+'%'}};
  /* ---- Profil: nama & jabatan ---- */
  function setText(el,val){if(!el)return;if(el.dataset.orig===undefined)el.dataset.orig=el.textContent;el.textContent=val||el.dataset.orig}
  function applyProfile(){
    var hn=$('.hp-profile .hp-cap strong'),hr=$('.hp-profile .hp-cap span'),pn=$('#prof-col-left h2'),pr=pn&&pn.nextElementSibling,im=$('.hp-profile .hp-photo img');
    setText(hn,S.name);setText(hr,S.role);setText(pn,S.name);setText(pr,S.role);
    if(im){if(im.dataset.alt===undefined)im.dataset.alt=im.alt;im.alt=S.name||im.dataset.alt}
  }
  /* ---- Jam: label zona waktu ---- */
  function applyClock(){$$('.ba-tzl').forEach(function(e){e.textContent=window.__baTzLabel()})}
  /* ---- Sidebar ringkas ---- */
  var mq=window.matchMedia('(max-width:1023px)');
  function sbPref(){var v=null;try{v=localStorage.getItem('ba-sb')}catch(e){}return v==='collapsed'}
  function sbSet(on){try{localStorage.setItem('ba-sb',on?'collapsed':'expanded')}catch(e){}root.classList.toggle('ba-collapsed',mq.matches||on);setTimeout(function(){window.dispatchEvent(new Event('resize'))},380)}
  /* ---- Sinkron UI dari state ---- */
  function syncUI(){
    $$('[data-set]',page).forEach(function(el){var k=el.getAttribute('data-set');
      if(el.type==='checkbox')el.checked=!!S[k];else if(document.activeElement!==el)el.value=S[k]})
    $$('[data-out]',page).forEach(function(el){var k=el.getAttribute('data-out');el.textContent=OUT[k]?OUT[k](S[k]):S[k]});
    $$('[data-seg]',page).forEach(function(g){var k=g.getAttribute('data-seg');$$('button',g).forEach(function(b){b.classList.toggle('is-on',String(S[k])===b.getAttribute('data-val'))})});
    $$('[data-accent-pick]',page).forEach(function(b){var on=b.getAttribute('data-accent-pick')===S.accent;b.classList.toggle('is-on',on);b.setAttribute('aria-pressed',on)});
    var sb=$('[data-sb]',page);if(sb)sb.checked=root.classList.contains('ba-collapsed');
  }
  function applyAll(){window.baApplyVisual();applyProfile();applyClock();syncUI()}
  function change(k,v,msg){S[k]=v;save();applyAll();toast(msg||'Pengaturan tersimpan')}
  page.addEventListener('input',function(e){var el=e.target,k=el.getAttribute&&el.getAttribute('data-set');if(!k||el.type==='checkbox'||el.tagName==='SELECT')return;
    S[k]=el.type==='range'?Number(el.value):el.value.trim();save();window.baApplyVisual();applyProfile();syncUI();if(el.type!=='range')toast('Tersimpan')});
  page.addEventListener('change',function(e){var el=e.target;
    if(el.hasAttribute('data-sb')){sbSet(el.checked);toast('Pengaturan tersimpan');return}
    var k=el.getAttribute&&el.getAttribute('data-set');if(!k)return;
    if(el.type==='checkbox')change(k,el.checked);else if(el.tagName==='SELECT')change(k,el.value);else toast('Pengaturan tersimpan')});
  page.addEventListener('click',function(e){
    var a=e.target.closest('[data-accent-pick]');if(a){change('accent',a.getAttribute('data-accent-pick'));return}
    var b=e.target.closest('[data-seg] button');if(b){var k=b.closest('[data-seg]').getAttribute('data-seg'),v=b.getAttribute('data-val');
      change(k,typeof D[k]==='number'?Number(v):typeof D[k]==='boolean'?v==='true':v);return}
    if(e.target.closest('#st-reset')){if(confirm('Kembalikan semua pengaturan ke bawaan? (Foto profil tidak dihapus.)')){for(var x in D)S[x]=D[x];save();sbSet(false);applyAll();toast('Pengaturan dikembalikan ke bawaan')}return}
    if(e.target.closest('#st-export')){
      var o={app:'berita-angin',version:1,settings:S},av=null;try{av=localStorage.getItem('ba-avatar')}catch(x){}if(av)o.avatar=av;
      var u=URL.createObjectURL(new Blob([JSON.stringify(o,null,2)],{type:'application/json'})),l=document.createElement('a');
      l.href=u;l.download='berita-angin-pengaturan.json';document.body.appendChild(l);l.click();l.remove();setTimeout(function(){URL.revokeObjectURL(u)},1000);toast('Pengaturan diekspor');return}
    if(e.target.closest('#st-import')){fi.click()}
  });
  var fi=document.createElement('input');fi.type='file';fi.accept='application/json,.json';fi.style.display='none';document.body.appendChild(fi);
  fi.addEventListener('change',function(){var f=fi.files&&fi.files[0];fi.value='';if(!f||f.size>8*1024*1024)return;
    var r=new FileReader();r.onload=function(){try{
      var o=JSON.parse(r.result),src=(o&&o.settings)||{},n=0;
      for(var k in D){if(src[k]!==undefined&&typeof src[k]===typeof D[k]){S[k]=src[k];n++}}
      if(!n)throw new Error('kosong');
      save();if(o.avatar&&/^data:image\//.test(o.avatar)){try{localStorage.setItem('ba-avatar',o.avatar)}catch(x){}}
      toast('Pengaturan diimpor, memuat ulang…');setTimeout(function(){location.reload()},700);
    }catch(x){toast('File pengaturan tidak valid')}};r.readAsText(f)});
  /* ---- Tombol gear di topbar + pintasan Ctrl+, ---- */
  function openSettings(){var a=$('header a.nav-link[data-page="settings"]')||$('a.nav-link[data-page="settings"]');if(a)a.click()}
  var tr=$('#ba-topbar .ba-top-right');
  if(tr&&!$('.ba-gear',tr)){var g=document.createElement('button');g.type='button';g.className='ba-gear';g.title='Pengaturan (Ctrl + ,)';g.setAttribute('aria-label','Buka Pengaturan');
    g.innerHTML='<i class="fa-solid fa-gear"></i>';g.addEventListener('click',openSettings);tr.appendChild(g)}
  document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key===','){e.preventDefault();openSettings()}});
  new MutationObserver(function(){var sb=$('[data-sb]',page);if(sb)sb.checked=root.classList.contains('ba-collapsed')}).observe(root,{attributes:true,attributeFilter:['class']});
  window.baSettingsChange=change;window.baToast=toast;
  applyAll();
  /* Halaman awal (hanya saat dimuat) */
  var tgt=S.start==='last'?(function(){try{return localStorage.getItem('ba-lastpage')}catch(e){return null}})():S.start;
  if(tgt&&tgt!=='home'&&tgt!=='settings'){setTimeout(function(){var a=$('a.nav-link[data-page="'+tgt+'"]');if(a)a.click()},60)}
})();
