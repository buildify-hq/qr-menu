/* SJ Restaurant - UI polish + extras: nav icons, offline banner, install button, category chips, daily summary share */
(function(){
if(typeof window.closeSheet!=='function')window.closeSheet=()=>{$('sheet').innerHTML=''};
const I=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const P={home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',orders:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',menu:'<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13.5"/>',history:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',plus:'<path d="M12 5v14M5 12h14"/>',sales:'<path d="M5 20V11M12 20V5M19 20v-7"/>',closing:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',gst:'<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.2"/><circle cx="17" cy="17" r="2.2"/>',gstrep:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',qr:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',staff:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.2a3 3 0 010 5.6M18 14.3c1.8.8 3 2.6 3 5.2"/>',floors:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12.5l9 5 9-5M3 17l9 5 9-5"/>',dues:'<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M4 7a2 2 0 012-2h11v2"/><circle cx="16" cy="13.5" r="1.2"/>',exp:'<circle cx="12" cy="12" r="8.5"/><path d="M9 15l6-6M10 9h5v5"/>',acc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',audit:'<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',stock:'<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',recipes:'<path d="M4 11h16v6a3 3 0 01-3 3H7a3 3 0 01-3-3z"/><path d="M8 11V9M12 11V7M16 11V9M2 11h20"/>',suppliers:'<path d="M2 6h11v10H2zM13 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',deliv:'<path d="M6 8h12l-1 12H7z"/><path d="M9 8a3 3 0 016 0"/>',riders:'<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17l4-8h4l4 8M10 9l-1-3h-2"/>',card:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',back:'<path d="M15 5l-7 7 7 7"/>'};
window.ICO={};Object.keys(P).forEach(k=>ICO[k]=I(P[k]));
if(typeof NAV!=='undefined')NAV.forEach(n=>{if(ICO[n[0]])n[1]=ICO[n[0]]});
if(typeof DR!=='undefined')DR.forEach(s=>s[1].forEach(i=>{const k=i[2]==='Add / Edit Items'?'plus':i[0];if(ICO[k])i[1]=ICO[k]}));
/* offline banner */
const off=document.createElement('div');off.className='offline hidden';off.setAttribute('role','status');off.textContent='You are offline. Changes will not save until the internet is back.';document.body.appendChild(off);
const upd=()=>off.classList.toggle('hidden',navigator.onLine!==false);addEventListener('online',upd);addEventListener('offline',upd);upd();
/* install app button */
let ev=null;const ib=document.createElement('div');ib.className='install hidden';ib.innerHTML='<span>Install this app on your phone</span><button class="btn" type="button">Install</button><button class="btn gray" type="button" aria-label="Dismiss">✕</button>';document.body.appendChild(ib);
const [bi,bx]=ib.querySelectorAll('button');
addEventListener('beforeinstallprompt',e=>{e.preventDefault();ev=e;let d;try{d=localStorage.getItem('sj_noinst')}catch(x){}if(!d)ib.classList.remove('hidden')});
addEventListener('appinstalled',()=>ib.classList.add('hidden'));
bi.onclick=async()=>{if(!ev)return;ib.classList.add('hidden');ev.prompt();try{await ev.userChoice}catch(e){}ev=null};
bx.onclick=()=>{ib.classList.add('hidden');try{localStorage.setItem('sj_noinst','1')}catch(e){}};
/* category chips on the customer QR menu */
const qp=new URLSearchParams(location.search);let t;
if(qp.get('r')&&qp.get('t')){const chips=()=>{const cats=[...document.querySelectorAll('.content .cat')].filter(c=>c.style.display!=='none');if(cats.length<3||document.getElementById('catbar'))return;
  const bar=document.createElement('nav');bar.id='catbar';bar.className='catbar';bar.setAttribute('aria-label','Categories');
  cats.forEach(c=>{const b=document.createElement('button');b.type='button';b.textContent=c.textContent.trim();b.onclick=()=>scrollTo({top:c.getBoundingClientRect().top+scrollY-130,behavior:'smooth'});bar.appendChild(b)});
  cats[0].parentNode.insertBefore(bar,cats[0])};
 new MutationObserver(()=>{clearTimeout(t);t=setTimeout(chips,80)}).observe(document.getElementById('app'),{childList:true,subtree:true})}
/* owner: share today's summary on WhatsApp */
if(typeof PG!=='undefined'&&PG.home){const _h=PG.home;PG.home=async()=>{await _h();const g=$('pg');if(!g)return;const w=g.querySelector&&g.querySelector('.welcome'),html='<button class="btn gray" style="width:100%;margin:12px 0 0" onclick="shareDay()">Share today\u2019s summary</button>';if(w&&w.insertAdjacentHTML)w.insertAdjacentHTML('afterend',html)}}
window.shareDay=async()=>{const day=ymd(new Date()),[a,b]=dayR(day),bs=await getBills(a,b);let ex=[];try{const r=await sb.from('expenses').select('amount').eq('rid',R.id).eq('spent_on',day);ex=r.data||[]}catch(e){}
 const m=k=>sum(bs.filter(x=>x.mode===k)),tax=sum(bs,x=>x.tax||0),sales=sum(bs,x=>x.subtotal!=null?(+x.subtotal-+(x.discount||0)):+x.total),exp=sum(ex,x=>x.amount),it={};
 bs.forEach(x=>(x.items||[]).forEach(i=>it[i.name]=(it[i.name]||0)+i.qty));const top=Object.entries(it).sort((p,q)=>q[1]-p[1]).slice(0,3).map(t=>t[0]+' ×'+t[1]).join(', '),r2=n=>Math.round(n*100)/100;
 const txt=`*${R.name}* · ${new Date().toLocaleDateString()}\nSales (before GST): ₹${r2(sales)}\nGST: ₹${r2(tax)} · Bills: ${bs.length}\nCash ₹${r2(m('Cash'))} · UPI ₹${r2(m('UPI'))} · Card ₹${r2(m('Card'))} · Udhaar ₹${r2(m('Udhaar'))}\nExpenses: ₹${r2(exp)} · Profit: ₹${r2(sales-exp)}`+(top?`\nTop: ${top}`:'');
 $('sheet').innerHTML=`<div class="sheetbox"><h3>Today\u2019s summary</h3><pre style="white-space:pre-wrap;font:inherit;margin:0 0 14px;color:var(--muted)">${esc(txt)}</pre><div class="orderactions"><a class="btn green" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">WhatsApp</a><button class="btn gray" id="shc">Copy</button><button class="btn gray" onclick="closeSheet()">Close</button></div></div>`;
 $('shc').onclick=async()=>{try{await navigator.clipboard.writeText(txt);toast('Copied.')}catch(e){toast('Could not copy.')}}};
})();
