                    function pwConnect(){var b=document.getElementById('pw-connect'),s=document.getElementById('pw-status');
                      try{connectWeb3Wallet()}catch(e){}
                      if(s){s.textContent='Terhubung';s.className='font-semibold text-emerald-400'}
                      if(b){b.innerHTML='<i class="fa-solid fa-circle-check"></i><span>Terhubung</span>';b.className='bg-neutral-800 border border-emerald-500/50 text-emerald-400 font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5'}}
                    setInterval(function(){var a=document.getElementById('wallet-total-balance'),d=document.getElementById('pw-balance');if(a&&d&&a.textContent&&a.textContent!==d.textContent)d.textContent=a.textContent},2000);
                    
