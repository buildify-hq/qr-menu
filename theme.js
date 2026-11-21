/* Dark / Light mode toggle (remembers choice, follows phone setting first time) */
(function(){const K='sj_theme',de=document.documentElement;
window.tn=t=>/^D\d+$/.test(String(t))?'🛵 Delivery '+t:'Table '+t;
let t;try{t=localStorage.getItem(K)}catch(e){}
if(t!=='light'&&t!=='dark')t=window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
function apply(){de.dataset.theme=t;const m=document.querySelector('meta[name=theme-color]');if(m)m.content=t==='light'?'#fbf6ef':'#15110e';const b=document.getElementById('thm');if(b){const x=t==='light'?'🌙':'☀️';if(b.textContent!==x)b.textContent=x;b.setAttribute('aria-label',t==='light'?'Switch to dark mode':'Switch to light mode')}}
apply();
function place(){if(!document.body)return;let b=document.getElementById('thm');
 if(!b){b=document.createElement('button');b.id='thm';b.type='button';b.className='btn gray';b.onclick=()=>{t=t==='light'?'dark':'light';try{localStorage.setItem(K,t)}catch(e){}apply()}}
 const bar=document.querySelector('.topbar');
 if(bar){if(b.parentNode!==bar){b.style.cssText='width:44px;height:44px;padding:0;flex-shrink:0';bar.appendChild(b)}}
 else if(b.parentNode!==document.body){b.style.cssText='position:fixed;top:10px;right:10px;z-index:60;width:44px;height:44px;padding:0';document.body.appendChild(b)}
 apply()}
new MutationObserver(place).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',place)})();
