/* Chart redesign: Global M2 supply + Sector Bell Curve.
   Auto animation uses illustrative values; connect a verified provider for genuine live market data. */
(function(){
  const palette={cyan:'#38bdf8',blue:'#818cf8',green:'#34d399',red:'#fb7185',amber:'#fbbf24',purple:'#c084fc',grid:'rgba(148,163,184,.12)',text:'#9ca3af'};
  function commonOptions(yTitle){
    return {responsive:true,maintainAspectRatio:false,animation:{duration:650},
      interaction:{mode:'index',intersect:false},
      plugins:{legend:{labels:{color:'#d1d5db',usePointStyle:true,boxWidth:8,padding:16}},
        tooltip:{backgroundColor:'#09090b',borderColor:'#27272a',borderWidth:1,titleColor:'#fff',bodyColor:'#d1d5db'}},
      scales:{x:{ticks:{color:palette.text,maxRotation:0},grid:{color:palette.grid}},
        y:{ticks:{color:palette.text},grid:{color:palette.grid},title:{display:true,text:yTitle,color:palette.text}}}};
  }
  function initCharts(){
    if(!window.Chart) return;
    const sectorCanvas=document.getElementById('stockSectorBarChart');
    if(sectorCanvas){
      const old=Chart.getChart(sectorCanvas); if(old) old.destroy();
      const xs=Array.from({length:61},(_,i)=>-3+i*.1);
      const bell=(mu,sigma,scale)=>xs.map(x=>({x:+x.toFixed(2),y:+(scale*Math.exp(-Math.pow(x-mu,2)/(2*sigma*sigma))).toFixed(3)}));
      const datasets=[
        {label:'Oversold',data:bell(-2.05,.48,1),borderColor:palette.red,backgroundColor:'rgba(251,113,133,.10)',fill:true,tension:.35,pointRadius:0,borderWidth:2},
        {label:'Buy',data:bell(-.95,.62,.86),borderColor:palette.green,backgroundColor:'rgba(52,211,153,.08)',fill:true,tension:.35,pointRadius:0,borderWidth:2},
        {label:'Sell',data:bell(.95,.62,.86),borderColor:palette.amber,backgroundColor:'rgba(251,191,36,.08)',fill:true,tension:.35,pointRadius:0,borderWidth:2},
        {label:'Overbought',data:bell(2.05,.48,1),borderColor:palette.purple,backgroundColor:'rgba(192,132,252,.10)',fill:true,tension:.35,pointRadius:0,borderWidth:2}
      ];
      const opt=commonOptions('Intensitas relatif');
      opt.scales.x={type:'linear',min:-3,max:3,grid:{color:palette.grid},ticks:{color:palette.text,stepSize:1,callback:v=>v===-2?'Oversold':v===-1?'Buy':v===1?'Sell':v===2?'Overbought':v}};
      opt.plugins.legend.position='bottom';
      window.stockSectorBarChartInstance=new Chart(sectorCanvas,{type:'line',data:{datasets},options:opt});
    }
  }
  function tick(){
    const s=window.stockSectorBarChartInstance;
    if(s){const shift=(Math.random()-.5)*.12;s.data.datasets.forEach((ds,i)=>{const mu=[-2.05,-.95,.95,2.05][i]+shift;ds.data=ds.data.map(p=>({x:p.x,y:+((i===0||i===3?1:.86)*Math.exp(-Math.pow(p.x-mu,2)/(2*Math.pow(i===0||i===3?.48:.62,2)))).toFixed(3)}));});s.update('none');}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{initCharts();setInterval(tick,2500);},700));
  else setTimeout(()=>{initCharts();setInterval(tick,2500);},700);
})();
