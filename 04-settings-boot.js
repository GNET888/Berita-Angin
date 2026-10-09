/* Pengaturan pengguna: dimuat paling awal agar tema/warna langsung benar */
(function(){
  var D={accent:'sky',bg:'black',fs:100,card:58,glow:100,bg3d:true,tilt:true,calm:false,ticker:true,name:'',role:'',tz:'Asia/Jakarta',h12:false,start:'home',theme:'dark',font:'sans',radius:'normal',contrast:false,tickspeed:'normal',topinfo:true,autoplay:false,autosec:20};
  var o={};try{o=JSON.parse(localStorage.getItem('ba-settings')||'{}')||{}}catch(e){}
  var S=window.__BA_S={};for(var k in D)S[k]=(o[k]!==undefined&&typeof o[k]===typeof D[k])?o[k]:D[k];
  window.__BA_D=D;
  var AC={sky:['56 189 248','14 165 233','125 211 252'],emerald:['52 211 153','16 185 129','110 231 183'],violet:['167 139 250','139 92 246','196 181 253'],amber:['251 191 36','245 158 11','252 211 77'],rose:['251 113 133','244 63 94','253 164 175'],cyan:['34 211 238','8 145 178','103 232 249']};
  var BG={black:'#000000',coal:'#0b0d12',night:'#050a18'};
  var TZL={'Asia/Jakarta':'WIB','Asia/Makassar':'WITA','Asia/Jayapura':'WIT','UTC':'UTC','Asia/Singapore':'SGT','Asia/Tokyo':'JST','Europe/London':'UK','America/New_York':'NY'};
  window.baApplyVisual=function(){
    var r=document.documentElement,a=AC[S.accent]||AC.sky,st=r.style;
    r.setAttribute('data-accent',S.accent in AC?S.accent:'sky');
    st.setProperty('--ba-ac',a[0]);st.setProperty('--ba-ac2',a[1]);st.setProperty('--ba-ac3',a[2]);
    st.setProperty('--b-grad','linear-gradient(135deg,rgb('+a[2]+'),rgb('+a[0]+') 45%,rgb('+a[1]+'))');
    st.setProperty('--ba-bg',BG[S.bg]||BG.black);
    r.style.fontSize=S.fs+'%';
    var c=Math.max(0,Math.min(100,+S.card))/100;
    st.setProperty('--card-a',c.toFixed(2));st.setProperty('--tile-a',Math.max(.14,c*.6).toFixed(2));
    st.setProperty('--ba-3d',(Math.max(0,Math.min(100,+S.glow))/100).toFixed(2));
    r.classList.toggle('ba-no3d',!S.bg3d||S.glow<=0);
    r.classList.toggle('ba-no-tilt',!S.tilt);
    r.classList.toggle('ba-calm',!!S.calm);
    r.classList.toggle('ba-no-ticker',!S.ticker);
    window.__BA_3D_OFF=!S.bg3d||S.glow<=0||!!S.calm;
    var lt=S.theme==='light'||(S.theme==='auto'&&window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches);
    r.classList.toggle('light',lt);r.classList.toggle('dark',!lt);
    st.setProperty('--ba-bg',lt?'#f1f5f9':(BG[S.bg]||BG.black));
    st.setProperty('--card-al',Math.max(.55,Math.min(.95,c+.25)).toFixed(2));
    r.setAttribute('data-font',S.font);r.setAttribute('data-radius',S.radius);r.setAttribute('data-tick',S.tickspeed);
    r.classList.toggle('ba-hc',!!S.contrast);r.classList.toggle('ba-no-top',!S.topinfo);
    try{localStorage.setItem('ba-theme',lt?'light':'dark')}catch(e){}
    var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',lt?'#f1f5f9':(BG[S.bg]||'#000000'));
  };
  window.__baTzLabel=function(){return TZL[S.tz]||S.tz};
  window.__baTime=function(d){try{
    if(S.h12)return d.toLocaleTimeString('en-US',{timeZone:S.tz,hour12:true});
    return d.toLocaleTimeString('id-ID',{timeZone:S.tz,hour12:false}).replace(/\./g,':');
  }catch(e){return d.toLocaleTimeString()}};
  window.__baDate=function(d){try{return d.toLocaleDateString('id-ID',{timeZone:S.tz,weekday:'short',day:'numeric',month:'short',year:'numeric'})}catch(e){return d.toLocaleDateString()}};
  try{matchMedia('(prefers-color-scheme: light)').addEventListener('change',function(){if(S.theme==='auto')window.baApplyVisual()})}catch(e){}
  window.baApplyVisual();
})();
