/* Konversi Cepat otomatis: mengikuti jumlah, mata uang asal, dan kurs live pada kartu Currency Converter. Aditif, tidak mengubah fungsi lama. */
(function(){
'use strict';
var last='';
function q(i){return document.getElementById(i)}
function upd(){try{
 var a=q('converter-amount'),f=q('converter-from'),t=q('converter-to'),box=q('fx-quick');
 if(!a||!f||!t||!box||typeof exchangeRatesToUSD==='undefined'||typeof formatCurrencyValue!=='function')return;
 var amt=parseFloat(a.value)||0,fr=f.value,html='';
 Object.keys(exchangeRatesToUSD).forEach(function(c){
  if(c===fr)return;
  var v=amt*exchangeRatesToUSD[fr]/exchangeRatesToUSD[c],on=c===t.value;
  html+='<button type="button" data-fx="'+c+'" class="text-left p-2.5 bg-black/60 border '+(on?'border-brand-accent':'border-card-border')+' rounded-xl hover:border-brand-accent transition min-w-0"><span class="text-[10px] text-gray-400 font-mono block">'+c+'</span><span class="text-xs font-bold text-white font-mono block truncate">'+formatCurrencyValue(v,c)+'</span></button>';
 });
 if(html!==last){box.innerHTML=html;last=html}
 var n=q('fx-quick-note');if(n)n.textContent=formatCurrencyValue(amt,fr)+' '+fr+' =';
}catch(e){if(window.console)console.warn('[fx-quick]',e)}}
function init(){
 var card=q('currency-converter-card');if(!card)return;
 ['input','change'].forEach(function(ev){card.addEventListener(ev,function(){setTimeout(upd,0)})});
 card.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('[data-fx]');
  if(b){var t=q('converter-to');t.value=b.getAttribute('data-fx');if(typeof convertCurrency==='function')convertCurrency()}
  setTimeout(upd,0)});
 upd();setInterval(upd,1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
