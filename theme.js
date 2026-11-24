/* Dark / Light mode toggle (remembers choice, follows phone setting first time) */
(function(){const K='sj_theme',de=document.documentElement;
window.tn=t=>/^D\d+$/.test(String(t))?'Delivery '+t:'Table '+t;
let t;try{t=localStorage.getItem(K)}catch(e){}
if(t!=='light'&&t!=='dark')t=window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
const SUN='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>',MOON='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/></svg>';
function apply(){de.dataset.theme=t;const m=document.querySelector('meta[name=theme-color]');if(m)m.content=t==='light'?'#faf5ee':'#14100d';const b=document.getElementById('thm');if(b&&b.dataset.t!==t){b.dataset.t=t;b.innerHTML=t==='light'?MOON:SUN}if(b){b.setAttribute('aria-label',t==='light'?'Switch to dark mode':'Switch to light mode')}}
apply();
function place(){if(!document.body)return;let b=document.getElementById('thm');
 if(!b){b=document.createElement('button');b.id='thm';b.type='button';b.className='icon';b.onclick=()=>{t=t==='light'?'dark':'light';try{localStorage.setItem(K,t)}catch(e){}apply()}}
 const bar=document.querySelector('.topbar');
 if(bar){if(b.parentNode!==bar){bar.appendChild(b)}}
 else if(b.parentNode!==document.body){b.style.cssText='position:fixed;top:12px;right:12px;z-index:60';document.body.appendChild(b)}
 apply()}
new MutationObserver(place).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',place)})();
