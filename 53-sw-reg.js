(function(){try{if(!('serviceWorker' in navigator))return;var h=location.hostname;if(!(location.protocol==='https:'||h==='localhost'||h==='127.0.0.1'))return;
window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}catch(e){}})();
