/* SJ Restaurant - Scan Menu Card (free, runs on the phone with Tesseract.js, no API key) */
(function(){
const TJS='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
const NONVEG=/chicken|mutton|egg\b|eggs|fish|prawn|keema|kebab|kabab|lamb|crab|bhurji(?!.*paneer)|चिकन|मटण|अंडे|अंडा|मासे|कोळंबी|कोंबडी|सुरमई|पापलेट/i;
const VEGFIX=/paneer|पनीर|veg\b|vegetable|soya|mushroom/i;
const sh=()=>document.getElementById('sheet');
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let ROWS=[];

function loadTess(){return new Promise((ok,no)=>{if(window.Tesseract)return ok();const s=document.createElement('script');s.src=TJS;s.onload=ok;s.onerror=()=>no(new Error('Could not load OCR. Check internet.'));document.head.appendChild(s)})}

/* shrink + grayscale + contrast so OCR is faster and more accurate on phone photos */
function prep(file){return new Promise((ok,no)=>{const img=new Image(),u=URL.createObjectURL(file);img.onload=()=>{
 const M=1800,k=Math.min(1,M/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
 const x=c.getContext('2d');x.drawImage(img,0,0,c.width,c.height);const d=x.getImageData(0,0,c.width,c.height),p=d.data;
 for(let i=0;i<p.length;i+=4){let g=.299*p[i]+.587*p[i+1]+.114*p[i+2];g=(g-128)*1.35+128;g=g<0?0:g>255?255:g;p[i]=p[i+1]=p[i+2]=g}
 x.putImageData(d,0,0);URL.revokeObjectURL(u);c.toBlob(b=>ok(b),'image/png')};img.onerror=()=>no(new Error('Could not read this photo.'));img.src=u})}

const dev=s=>s.replace(/[०-९]/g,d=>'०१२३४५६७८९'.indexOf(d));

/* turn raw OCR text into [{name,price,cat,veg}] */
function parse(text){
 const out=[];let cat='Menu';
 for(let raw of text.split(/\r?\n/)){
  let l=dev(raw).replace(/[|_~•·●■◆►»«]/g,' ').replace(/\.{2,}|-{2,}|…/g,' ').replace(/\s+/g,' ').trim();
  if(l.length<2)continue;
  const m=l.match(/^(.*?[A-Za-z\u0900-\u097F][^\d]*?)\s*(?:(?:₹|rs\.?|inr)\s*)?(\d{2,4})(?:\s*(?:\/-|₹|rs\.?))?\s*(?:\d{2,4})?\s*$/i);
  if(m){
   let name=m[1].replace(/[\s\-:.,=*()\[\]]+$/g,'').replace(/^[\s\-:.,=*0-9)\]]+(?=[A-Za-z\u0900-\u097F])/,'').trim(),price=+m[2];
   if(name.length<2||price<5||price>5000)continue;
   out.push({on:true,name:name.replace(/\b([a-z])([a-z]*)/gi,(w,a,b)=>a.toUpperCase()+b.toLowerCase()),price,cat,veg:!(NONVEG.test(name)&&!VEGFIX.test(name))});
  }else if(!/\d/.test(l)&&l.length<=32&&/[A-Za-z\u0900-\u097F]{3,}/.test(l)){
   cat=l.replace(/[^A-Za-z\u0900-\u097F &'/]/g,'').trim().replace(/\b([a-z])([a-z]*)/gi,(w,a,b)=>a.toUpperCase()+b.toLowerCase())||cat;
  }
 }
 const seen=new Set();return out.filter(r=>{const k=r.name.toLowerCase();if(seen.has(k))return false;seen.add(k);return true});
}

function box(inner){sh().innerHTML=`<div class="sheetbox" style="width:min(100%,520px)">${inner}</div>`}
const close=()=>{sh().innerHTML=''};

window.openScan=function(){
 box(`<h3 style="margin:0 0 6px">📷 Scan Menu Card</h3>
 <p class="note" style="text-align:left;margin:0 0 14px">Take a clear, straight photo of the menu card. Items and prices are read on your phone (free). You can fix mistakes before saving.</p>
 <label class="btn" style="display:block;text-align:center;margin-bottom:10px">📸 Take photo<input id="scf" type="file" accept="image/*" capture="environment" hidden></label>
 <label class="btn gray" style="display:block;text-align:center;margin-bottom:10px">🖼️ Choose from gallery<input id="scg" type="file" accept="image/*" hidden></label>
 <button class="btn gray" style="width:100%" onclick="document.getElementById('sheet').innerHTML=''">Cancel</button>`);
 const go=e=>{const f=e.target.files[0];if(f)run(f)};document.getElementById('scf').onchange=go;document.getElementById('scg').onchange=go;
};

async function run(file){
 box(`<h3 style="margin:0 0 10px">Reading menu…</h3><div id="scs" class="note" style="text-align:left">Preparing photo…</div><div style="height:8px;background:var(--bg);border-radius:8px;margin-top:12px;overflow:hidden"><div id="scb" style="height:100%;width:3%;background:var(--saffron);transition:width .2s"></div></div><p class="note" style="text-align:left">First time takes longer (language files download).</p>`);
 const st=t=>{const e=document.getElementById('scs');if(e)e.textContent=t},bar=p=>{const e=document.getElementById('scb');if(e)e.style.width=Math.max(3,Math.round(p*100))+'%'};
 let w;
 try{
  const img=await prep(file);st('Loading reader…');await loadTess();
  w=await Tesseract.createWorker(['eng','mar'],1,{logger:m=>{if(m.status==='recognizing text'){st('Reading text…');bar(m.progress)}else if(m.status&&m.status.includes('loading')){st('Downloading language data…');bar(m.progress||.1)}}});
  const {data}=await w.recognize(img);await w.terminate();
  ROWS=parse(data.text||'');
  if(!ROWS.length){box(`<h3 style="margin:0 0 8px">No items found</h3><p class="note" style="text-align:left">Try a brighter, straighter, closer photo where each item has its price on the same line.</p><div class="orderactions" style="margin-top:12px"><button class="btn" onclick="openScan()">Try again</button><button class="btn gray" onclick="document.getElementById('sheet').innerHTML=''">Close</button></div>`);return}
  review();
 }catch(e){try{w&&await w.terminate()}catch(_){}box(`<h3 style="margin:0 0 8px">Could not read</h3><p class="note" style="text-align:left">${E(e.message||e)}</p><div class="orderactions" style="margin-top:12px"><button class="btn" onclick="openScan()">Try again</button><button class="btn gray" onclick="document.getElementById('sheet').innerHTML=''">Close</button></div>`)}
}

function review(){
 box(`<h3 style="margin:0">Check items (${ROWS.length})</h3><p class="note" style="text-align:left;margin:4px 0 10px">Fix names or prices, untick wrong lines, then save.</p>
 <div id="scl">${ROWS.map((r,i)=>`<div class="row" style="flex-wrap:wrap;gap:8px"><input type="checkbox" ${r.on?'checked':''} data-i="${i}" data-k="on" style="width:22px;height:22px">
 <input class="field" style="flex:1 1 150px;height:44px;margin:0" value="${E(r.name)}" data-i="${i}" data-k="name" aria-label="Name">
 <input class="field" style="width:84px;height:44px;margin:0" type="number" min="0" value="${r.price}" data-i="${i}" data-k="price" aria-label="Price">
 <input class="field" style="flex:1 1 110px;height:44px;margin:0" value="${E(r.cat)}" data-i="${i}" data-k="cat" aria-label="Category">
 <select class="field" style="width:104px;height:44px;margin:0" data-i="${i}" data-k="veg"><option value="1" ${r.veg?'selected':''}>Veg</option><option value="0" ${r.veg?'':'selected'}>Non-veg</option></select></div>`).join('')}</div>
 <div class="orderactions" style="margin-top:12px;position:sticky;bottom:0"><button class="btn green" id="scsave">Save selected</button><button class="btn gray" onclick="document.getElementById('sheet').innerHTML=''">Cancel</button></div>`);
 document.getElementById('scl').oninput=document.getElementById('scl').onchange=e=>{const t=e.target,r=ROWS[+t.dataset.i];if(!r)return;const k=t.dataset.k;r[k]=k==='on'?t.checked:k==='price'?+t.value:k==='veg'?t.value==='1':t.value};
 document.getElementById('scsave').onclick=save;
}

async function save(){
 const btn=document.getElementById('scsave');btn.disabled=true;btn.textContent='Saving…';
 const{data:ex}=await sb.from('menu').select('name').eq('rid',R.id),have=new Set((ex||[]).map(x=>x.name.trim().toLowerCase()));
 const pick=ROWS.filter(r=>r.on&&r.name.trim()&&r.price>=0),add=pick.filter(r=>!have.has(r.name.trim().toLowerCase()));
 if(!add.length){btn.disabled=false;btn.textContent='Save selected';return toast(pick.length?'All these items already exist.':'Nothing selected.')}
 const{error}=await sb.from('menu').insert(add.map(r=>({rid:R.id,name:r.name.trim(),price:r.price,cat:(r.cat||'Menu').trim()||'Menu',veg:r.veg,emoji:foodEmoji(r.name)})));
 if(error){btn.disabled=false;btn.textContent='Save selected';return toast(error.message)}
 close();toast(add.length+' items added'+(pick.length>add.length?' ('+(pick.length-add.length)+' already existed)':''));go('menu');
}
})();
