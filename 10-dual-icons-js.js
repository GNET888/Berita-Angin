/* Pustaka ikon dual-state: [outline, solid]. Dipakai header, sidebar, dan tab bar HP. */
(function(){
  var n=0;
  var L={
    'home':['<path d="M4 10.3 12 3.6l8 6.7V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
            '<path d="M12 2.6 3.2 9.9A1 1 0 0 0 3 10.7V20a1.5 1.5 0 0 0 1.5 1.5H9.5V15h5v6.5h5A1.5 1.5 0 0 0 21 20v-9.3a1 1 0 0 0-.2-.8z"/>'],
    'profile':['<circle cx="12" cy="7.5" r="4"/><path d="M4.5 21v-1.3c0-3 3.4-5.2 7.5-5.2s7.5 2.2 7.5 5.2V21z"/>',
            '<circle cx="12" cy="7.5" r="4.6"/><path d="M3.8 21.6v-1.9c0-3.4 3.8-5.9 8.2-5.9s8.2 2.5 8.2 5.9v1.9z"/>'],
    'crypto-market':['<circle cx="12" cy="12" r="9"/><path d="M9.7 7.6v8.8M9.7 7.6h3.1a2.2 2.2 0 0 1 0 4.4H9.7m3.4 0a2.2 2.2 0 0 1 0 4.4H9.7M11.6 6v1.6M11.6 16.4V18"/>',
            '<path fill-rule="evenodd" d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19zM9 7.2h3.8a2.5 2.5 0 0 1 1.7 4.3 2.7 2.7 0 0 1-1.4 5H9zm2 2v2.3h1.8a1.15 1.15 0 0 0 0-2.3zm0 4.2v2.3h2a1.15 1.15 0 0 0 0-2.3z"/>'],
    'stock-exchange':['<path d="M3 9.2 12 4l9 5.2"/><path d="M6 11.5v6M10 11.5v6M14 11.5v6M18 11.5v6"/><path d="M4 20.5h16"/>',
            '<path d="M12 2.8 2.6 8.6a.8.8 0 0 0 .4 1.5h18a.8.8 0 0 0 .4-1.5z"/><rect x="4.6" y="11.4" width="3" height="7" rx="1"/><rect x="8.8" y="11.4" width="3" height="7" rx="1"/><rect x="13" y="11.4" width="3" height="7" rx="1"/><rect x="17.2" y="11.4" width="3" height="7" rx="1"/><rect x="2.8" y="19.8" width="18.4" height="2.2" rx="1.1"/>'],
    'global-market':['<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
            'GLOBE'],
    'market-stat':['<path d="M5 21V11M12 21V3M19 21v-7"/>',
            '<rect x="3.4" y="9.6" width="3.2" height="12" rx="1.2"/><rect x="10.4" y="2" width="3.2" height="20" rx="1.2"/><rect x="17.4" y="12.6" width="3.2" height="9" rx="1.2"/>'],
    'settings':['<circle cx="12" cy="12" r="3"/><path d="GEARD"/>',
            '<path fill-rule="evenodd" d="GEARD M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0z"/>'],
    'more':['<circle cx="12" cy="12" r="9"/><path d="M8 12h.01M12 12h.01M16 12h.01" stroke-width="2.4"/>',
            '<path fill-rule="evenodd" d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19zM6.8 12a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 0 0-2.4 0zM10.8 12a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 0 0-2.4 0zM14.8 12a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 0 0-2.4 0z"/>']
  };
  var GEARD="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z";
  function solid(k){
    var s=L[k][1];
    if(s==='GLOBE'){var id='dm'+(++n);
      return '<mask id="'+id+'"><rect width="24" height="24" fill="#fff"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" fill="none" stroke="#000" stroke-width="1.7" stroke-linecap="round"/></mask><circle cx="12" cy="12" r="9.5" mask="url(#'+id+')"/>';}
    return s.replace(/GEARD/g,GEARD);
  }
  function outline(k){return L[k][0].replace(/GEARD/g,GEARD);}
  window.__baDual=function(k){
    if(!L[k])return '';
    return '<span class="di"><svg class="di-off" viewBox="0 0 24 24" aria-hidden="true">'+outline(k)+'</svg><svg class="di-on" viewBox="0 0 24 24" aria-hidden="true">'+solid(k)+'</svg></span>';
  };
  /* Header desktop + sidebar mobile: tambahkan lapisan solid pada ikon outline yang sudah ada */
  function enhance(){
    Array.prototype.forEach.call(document.querySelectorAll('a[data-page] .nav-ico'),function(ico){
      if(ico.querySelector('.di-on'))return;
      var a=ico.closest('a'),k=a&&a.getAttribute('data-page'),svg=ico.querySelector('svg');
      if(!k||!L[k]||!svg)return;
      svg.classList.add('di-off');
      ico.insertAdjacentHTML('beforeend','<svg class="di-on" viewBox="0 0 24 24" aria-hidden="true">'+solid(k)+'</svg>');
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();
