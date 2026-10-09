/* Kalender Distribusi (gaya GitHub) di Profil: berjalan otomatis (animasi, ganti pasar/metrik tiap 10 dtk, kotak hari ini diperbarui tiap 3 dtk). */
            (function(){
              var $=function(i){return document.getElementById(i)},V=[['Kripto','Aktivitas','cxp-chg'],['Saham','Volatilitas','tm-chg'],['Global','Aktivitas','ov-sp-chg'],['Kripto','Volatilitas','cxp-chg'],['Saham','Aktivitas','tm-chg'],['Global','Volatilitas','ov-sp-chg']],MO=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'],DN=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
              var vi=0,paused=false,sec=0,vals=[],days=[],today=new Date();today.setHours(0,0,0,0);
              function rng(s){return function(){s|=0;s=s+0x6D2B79F5|0;var t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
              function lvl(v){return v<.2?0:v<.4?1:v<.6?2:v<.8?3:4}
              function live(k){var e=$(k),n=e?parseFloat((e.textContent||'').replace('\u2212','-').replace(/[^0-9+\-.]/g,'')):NaN;return isFinite(n)?Math.abs(n):NaN}
              function build(){var v=V[vi],r=rng(vi*7919+13),dow=today.getDay(),n=52*7+dow+1,x=.4;vals=[];days=[];
                for(var i=0;i<n;i++){var d=new Date(today);d.setDate(today.getDate()-(n-1-i));var we=d.getDay()%6===0&&v[0]!=='Kripto';x=.72*x+.28*r()+(r()<.04?.45:0);vals.push(Math.min(1,we?x*.35:x*(v[1]==='Volatilitas'?1.05:1)));days.push(d)}
                var l=live(v[2]);if(isFinite(l))vals[n-1]=Math.min(1,l/(v[1]==='Volatilitas'?3:4)+.08)}
              function draw(){var v=V[vi],g=$('dc-g'),h='',mo='',lm=-1,n=vals.length,off=days[0].getDay();$('dc-view').textContent='\u00b7 '+v[0]+' \u00b7 '+v[1];
                for(var f=0;f<off;f++)h+='<i class="f" style="--w:0"></i>';
                for(var i=0;i<n;i++){var w=Math.floor((i+off)/7),L=lvl(vals[i]);h+='<i class="'+(L?'l'+L:'')+(i===n-1?' t':'')+'" style="--w:'+w+'" data-i="'+i+'"></i>';
                  if(days[i].getDay()===0||i===0){var m=days[i].getMonth();if(m!==lm&&w<51){mo+='<span style="left:'+(w/53*100)+'%">'+MO[m]+'</span>';lm=m}}}
                g.innerHTML=h;$('dc-mo').innerHTML=mo;stats()}
              function stats(){var n=vals.length,a=0,t=0,s=0,b=0,c=0;vals.forEach(function(x){var L=lvl(x);if(L>0){a++;c++;if(c>b)b=c}else c=0;if(L===4)t++;s+=x});
                $('dc-st').innerHTML='<span>Hari aktif <b class="text-white">'+a+'</b></span><span>Intensitas tinggi <b class="text-white">'+t+'</b></span><span>Rangkaian terpanjang <b class="text-white">'+b+' hari</b></span><span>Rata-rata <b class="text-white">'+(s/n*100).toFixed(0)+'/100</b></span><span>Hari ini <b class="text-brand-accent">'+(vals[n-1]*100).toFixed(0)+'/100</b></span>';
                $('dc-now').textContent=new Date().toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta',hour12:false}).replace(/\./g,':')+' WIB'}
              function tickToday(){var n=vals.length,v=V[vi],l=live(v[2]),b=isFinite(l)?Math.min(1,l/(v[1]==='Volatilitas'?3:4)+.08):vals[n-1];vals[n-1]=Math.max(0,Math.min(1,b+(Math.random()-.5)*.08));
                var e=$('dc-g').lastElementChild;if(e){e.className='t'+(lvl(vals[n-1])?' l'+lvl(vals[n-1]):'')}stats()}
              function active(){var p=$('page-profile');return p&&p.classList.contains('active')}
              function init(){if(!$('dc-g'))return;build();draw();var tip=$('dc-tip'),g=$('dc-g');
                g.addEventListener('mousemove',function(e){var i=e.target.getAttribute&&e.target.getAttribute('data-i');if(i==null){tip.classList.add('hidden');return}var d=days[+i];tip.textContent=DN[d.getDay()]+', '+d.getDate()+' '+MO[d.getMonth()]+' '+d.getFullYear()+' \u00b7 intensitas '+(vals[+i]*100).toFixed(0)+'/100';tip.style.left=e.clientX+12+'px';tip.style.top=e.clientY+14+'px';tip.classList.remove('hidden')});
                g.addEventListener('mouseleave',function(){tip.classList.add('hidden')});
                $('dc-pause').addEventListener('click',function(){paused=!paused;this.textContent=paused?'Lanjut':'Jeda'});
                new MutationObserver(function(){if(active()){build();draw()}}).observe($('page-profile'),{attributes:true,attributeFilter:['class']});
                setInterval(function(){if(!active()||paused)return;sec+=3;if(sec>=10){sec=0;vi=(vi+1)%V.length;build();draw()}else tickToday()},3000)}
              if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
            })();
            
