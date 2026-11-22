/* SJ Restaurant - Printable Menu Card (no emoji, owner's own name, A4 print / PDF / image) */
(function(){
const TH={classic:['Classic','#1b1b1b','#ffffff'],saffron:['Saffron','#c2560a','#ffffff'],maroon:['Maroon','#7a1f2b','#fffaf2'],green:['Green','#1f6b3a','#ffffff'],navy:['Navy','#1f3a68','#ffffff']};
const CSS='.mc{width:794px;background:var(--paper);color:#1b1b1b;padding:44px 48px 36px;font-family:Georgia,"Times New Roman","Noto Serif",serif;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
+'.mc *{box-sizing:border-box}.mc .top{text-align:center;padding-bottom:14px;border-bottom:3px double var(--rule);margin-bottom:18px}'
+'.mc .nm{font-size:40px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--hd);line-height:1.1;overflow-wrap:anywhere}'
+'.mc .tg{font-size:15px;letter-spacing:4px;text-transform:uppercase;margin-top:8px;color:#555}.mc .ad{font:13px/1.4 system-ui,sans-serif;color:#555;margin-top:8px}'
+'.mc .cols{column-count:2;column-gap:40px;column-rule:1px solid #00000014}.mc.c3 .cols{column-count:3;column-gap:26px}'
+'.mc .sec{margin:0 0 20px;break-inside:avoid;-webkit-column-break-inside:avoid}.mc .sec.long{break-inside:auto}'
+'.mc .hd{display:flex;align-items:flex-end;gap:6px;border-bottom:2px solid var(--hd);padding-bottom:4px;margin-bottom:6px;break-after:avoid}'
+'.mc .hd h3{margin:0;flex:1;font-size:17px;letter-spacing:1.5px;text-transform:uppercase;color:var(--hd);line-height:1.2}'
+'.mc .hd .pc{width:46px;text-align:right;font:700 12px system-ui,sans-serif;color:#555;text-transform:uppercase}'
+'.mc .it{display:flex;align-items:baseline;gap:6px;padding:3px 0;font:14.5px/1.3 system-ui,sans-serif;break-inside:avoid}'
+'.mc .it .n{overflow-wrap:anywhere}.mc .it .l{flex:1;border-bottom:1px dotted #00000050;min-width:10px;transform:translateY(-3px)}'
+'.mc .it .p{width:46px;flex:none;text-align:right;font-weight:700}.mc .it .p.s{font-weight:400;color:#999}'
+'.mc .vm{width:11px;height:11px;border:1.5px solid;display:inline-block;position:relative;flex:none;align-self:center}.mc .vm:after{content:"";position:absolute;left:2px;top:2px;right:2px;bottom:2px;border-radius:50%;background:currentColor}.mc .vm.v{color:#1e8a3c}.mc .vm.n{color:#c62828}'
+'.mc .ft{margin-top:10px;padding-top:12px;border-top:1px solid var(--rule);text-align:center;font:12.5px system-ui,sans-serif;color:#555}'
+'@page card{size:A4;margin:8mm}@media print{.cardprint{page:card;width:auto!important;max-width:none!important;max-height:none!important;overflow:visible!important}.cardprint .mc{width:100%;padding:0}}';
const fmt=v=>Number(v).toLocaleString('en-IN',{maximumFractionDigits:2});
window.cardHTML=(S,rows)=>{
 const th=TH[S.theme]||TH.classic,hide=new Set(S.hide||[]),by={};
 (rows||[]).filter(r=>(S.unavail||r.available!==false)&&!hide.has(r.cat||'Menu')).forEach(r=>(by[r.cat||'Menu']=by[r.cat||'Menu']||[]).push(r));
 const cats=[...(S.order||[]).filter(c=>by[c]),...Object.keys(by).filter(c=>!(S.order||[]).includes(c)).sort()];
 const cmp=S.sort==='lo'?(a,b)=>a.price-b.price:S.sort==='hi'?(a,b)=>b.price-a.price:(a,b)=>String(a.name).localeCompare(String(b.name));
 const p=(v,c)=>'<span class="p'+(c?' '+c:'')+'">'+(c==='s'?'–':(S.rs?'₹':'')+fmt(v))+'</span>';
 const secs=cats.map(c=>{const it=by[c].slice().sort(cmp),cols=[];
  it.forEach(r=>(r.sizes||[]).forEach(s=>{if(s&&s.n&&!cols.includes(s.n)&&cols.length<3)cols.push(s.n)}));
  const rowsH=it.map(r=>{let cells;
   if(cols.length){const sz=r.sizes||[];cells=cols.map((n,i)=>{const s=sz.find(x=>x.n===n);return s?p(s.p):(!sz.length&&i===cols.length-1?p(r.price):p(0,'s'))}).join('')}else cells=p(r.price);
   return '<div class="it">'+(S.veg?'<i class="vm '+(r.veg===false?'n':'v')+'"></i>':'')+'<span class="n">'+esc(r.name)+'</span><span class="l"></span>'+cells+'</div>'});
  return '<div class="sec'+(it.length>14?' long':'')+'"><div class="hd"><h3>'+esc(c)+'</h3>'+cols.map(n=>'<span class="pc">'+esc(n)+'</span>').join('')+'</div>'+rowsH.join('')+'</div>'}).join('');
 return '<div class="mc'+(+S.cols===3?' c3':'')+'" style="--hd:'+th[1]+';--rule:'+th[1]+';--paper:'+th[2]+'"><div class="top"><div class="nm">'+esc(S.name||'')+'</div>'+(S.tag?'<div class="tg">'+esc(S.tag)+'</div>':'')+(S.addr?'<div class="ad">'+esc(S.addr)+'</div>':'')+'</div><div class="cols">'+secs+'</div>'+(S.foot?'<div class="ft">'+esc(S.foot)+'</div>':'')+'</div>'};
let ST,ROWS=[],printing=false;
const key=()=>'sj_card_'+R.id,save=()=>{try{localStorage.setItem(key(),JSON.stringify(ST))}catch(e){}};
const load=()=>{let d={};try{d=JSON.parse(localStorage.getItem(key())||'{}')}catch(e){}return Object.assign({name:R.name,tag:'MENU',addr:'',foot:'',theme:'classic',cols:2,rs:false,veg:false,unavail:false,sort:'az',order:[],hide:[]},d)};
const css=()=>{if(!document.getElementById('mccss')){const s=document.createElement('style');s.id='mccss';s.textContent=CSS;document.head.appendChild(s)}};
const fit=()=>{const w=$('mcw'),c=w&&w.querySelector&&w.querySelector('.mc');if(!c)return;const s=Math.min(1,w.clientWidth/794);c.style.transform='scale('+s+')';c.style.transformOrigin='top left';w.style.height=Math.ceil(c.offsetHeight*s)+'px'};
const draw=()=>{$('mcw').innerHTML=cardHTML(ST,ROWS);fit()};
const catList=()=>ST.order.map((c,i)=>'<div class="row" style="padding:8px 12px"><input type="checkbox" style="width:22px;height:22px;flex:none" '+(ST.hide.includes(c)?'':'checked')+' onchange="mcHide('+i+',this.checked)" aria-label="Show"><div class="grow">'+esc(c)+'</div><button class="btn gray" style="min-height:38px;padding:6px 12px" onclick="mcMove('+i+',-1)" aria-label="Up">&#8593;</button><button class="btn gray" style="min-height:38px;padding:6px 12px" onclick="mcMove('+i+',1)" aria-label="Down">&#8595;</button></div>').join('')||'<div class="empty">Add menu items first.</div>';
window.mcHide=(i,on)=>{const c=ST.order[i];ST.hide=ST.hide.filter(x=>x!==c);if(!on)ST.hide.push(c);save();draw()};
window.mcMove=(i,d)=>{const j=i+d;if(j<0||j>=ST.order.length)return;[ST.order[i],ST.order[j]]=[ST.order[j],ST.order[i]];save();$('mcc').innerHTML=catList();draw()};
const opts=(o,v)=>o.map(x=>'<option value="'+x[0]+'"'+(String(v)===String(x[0])?' selected':'')+'>'+x[1]+'</option>').join('');
PG.card=async()=>{css();const{data}=await sb.from('menu').select('*').eq('rid',R.id);ROWS=data||[];ST=load();
 const cats=[...new Set(ROWS.map(r=>r.cat||'Menu'))];ST.order=[...ST.order.filter(c=>cats.includes(c)),...cats.filter(c=>!ST.order.includes(c)).sort()];
 $('pg').innerHTML='<h1 class="page-title">Menu Card</h1><p class="note" style="text-align:left;margin:0 0 12px">A printable menu card made from your menu, with your restaurant name. No pictures or emoji.</p>'
 +'<section class="panel" id="mcf"><label class="label">Restaurant name</label><input class="field" data-k="name" maxlength="60" value="'+esc(ST.name)+'"><label class="label">Heading under name (example: VEG &amp; NON VEG)</label><input class="field" data-k="tag" maxlength="60" value="'+esc(ST.tag)+'"><label class="label">Address / phone (optional)</label><input class="field" data-k="addr" maxlength="120" value="'+esc(ST.addr)+'"><label class="label">Bottom note (optional)</label><input class="field" data-k="foot" maxlength="140" value="'+esc(ST.foot)+'" placeholder="Prices are without GST">'
 +'<div class="inline" style="margin-bottom:12px"><div style="flex:1;min-width:120px"><label class="label">Colour</label><select class="field" data-k="theme" style="margin:0">'+opts(Object.entries(TH).map(([k,v])=>[k,v[0]]),ST.theme)+'</select></div><div style="flex:1;min-width:120px"><label class="label">Columns</label><select class="field" data-k="cols" data-n="1" style="margin:0">'+opts([[2,'2 columns'],[3,'3 columns']],ST.cols)+'</select></div><div style="flex:1;min-width:120px"><label class="label">Sort items</label><select class="field" data-k="sort" style="margin:0">'+opts([['az','A to Z'],['lo','Price low to high'],['hi','Price high to low']],ST.sort)+'</select></div></div>'
 +['rs|Show rupee sign','veg|Show veg / non-veg marks','unavail|Include sold-out items'].map(x=>{const[k,t]=x.split('|');return'<label class="label" style="display:flex;align-items:center;gap:10px;color:var(--text);margin-bottom:10px"><input type="checkbox" style="width:22px;height:22px" data-k="'+k+'"'+(ST[k]?' checked':'')+'>'+t+'</label>'}).join('')+'</section>'
 +'<div class="sectionhead"><h3>Sections</h3><span>tick to show, arrows to reorder</span></div><div id="mcc">'+catList()+'</div>'
 +'<div class="orderactions" style="margin:16px 0 12px"><button class="btn" onclick="mcPrint()">Print / Save PDF</button><button class="btn gray" onclick="mcPng(0)">Download image</button><button class="btn gray" onclick="mcPng(1)">Share</button></div><div id="mcw" style="overflow:hidden;border:1px solid var(--line);border-radius:12px;background:#fff"></div>';
 $('mcf').oninput=$('mcf').onchange=e=>{const t=e.target,k=t.dataset&&t.dataset.k;if(!k)return;ST[k]=t.type==='checkbox'?t.checked:t.dataset.n?+t.value:t.value;save();draw()};
 draw()};
addEventListener('resize',()=>{if(typeof P!=='undefined'&&P==='card')fit()});
window.mcPrint=()=>{css();printing=true;$('sheet').innerHTML='<div class="sheetbox cardprint" style="width:auto;max-width:none;padding:12px;background:#fff"><button class="btn gray" style="margin-bottom:10px" onclick="closeSheet()">Close</button>'+cardHTML(ST,ROWS)+'</div>';
 addEventListener('afterprint',()=>{if(printing){printing=false;$('sheet').innerHTML=''}},{once:true});setTimeout(()=>print(),150)};
window.mcPng=async share=>{try{css();const el=$('mcw').querySelector('.mc'),h=el.offsetHeight,W=794,sc=h>3500?1.5:2,xml='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+h+'"><foreignObject x="0" y="0" width="'+W+'" height="'+h+'"><div xmlns="http://www.w3.org/1999/xhtml"><style>'+CSS+'</style>'+cardHTML(ST,ROWS)+'</div></foreignObject></svg>';
 const img=new Image();await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(xml)});
 const c=document.createElement('canvas');c.width=W*sc;c.height=h*sc;const x=c.getContext('2d');x.fillStyle=(TH[ST.theme]||TH.classic)[2];x.fillRect(0,0,c.width,c.height);x.scale(sc,sc);x.drawImage(img,0,0);
 const blob=await new Promise(r=>c.toBlob(r,'image/png')),name=(ST.name||'menu').replace(/[^\w\u0900-\u097F]+/g,'-')+'-menu.png';if(!blob)throw new Error('no image');
 const f=new File([blob],name,{type:'image/png'});
 if(share&&navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:ST.name});return}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();toast('Image saved.')}
 catch(e){if(e&&e.name==='AbortError')return;toast('Image is not supported on this browser. Use Print / Save PDF.')}};
const ICON='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>';
DR.find(s=>s[0]==='Menu')[1].push(['card',ICON,'Menu Card']);
})();
