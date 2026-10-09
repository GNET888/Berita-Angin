/* Pengambilan data online yang cepat di hosting statis (GitHub Pages): rute dicoba bertahap-paralel, hasil dibagi antar modul 30 dtk */
(function(){
  var CK={};
  window.__baFetch=function(routes,u,txt,ms){
    var key=u,hit=CK[key];
    if(hit&&Date.now()-hit.t<30000)return hit.p.then(function(t){return txt?t:JSON.parse(t)});
    var p=new Promise(function(res,rej){
      var urls=[];routes.forEach(function(f){var x=null;try{x=f(u)}catch(e){}if(x&&urls.indexOf(x)<0)urls.push(x)});
      if(!urls.length)return rej(new Error('offline'));
      var done=false,fails=0,next=0,ctr=[],tm;
      function launch(){
        if(done||next>=urls.length)return;var i=next++,c=new AbortController(),t=setTimeout(function(){c.abort()},ms||7000);ctr.push(c);
        fetch(urls[i],{signal:c.signal}).then(function(r){if(!r.ok)throw 0;return r.text()}).then(function(v){
          clearTimeout(t);if(done)return;if(!v)throw 0;done=true;clearTimeout(tm);ctr.forEach(function(x){if(x!==c)try{x.abort()}catch(e){}});res(v)
        }).catch(function(){clearTimeout(t);if(done)return;fails++;if(fails>=urls.length){done=true;clearTimeout(tm);rej(new Error('offline'))}else launch()});
        if(next<urls.length)tm=setTimeout(launch,1400);
      }
      launch();
    });
    CK[key]={t:Date.now(),p:p};
    p.catch(function(){if(CK[key]&&CK[key].p===p)delete CK[key]});
    return p.then(function(t){return txt?t:JSON.parse(t)});
  };
})();
