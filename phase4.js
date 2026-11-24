/* SJ Restaurant - Phase 4: delete menu items (one / many) + Clear history */
(function(){
const sheet=h=>$('sheet').innerHTML=`<div class="sheetbox" style="max-height:90vh;overflow:auto">${h}</div>`,cl=()=>$('sheet').innerHTML='';
Object.assign(window.AL||{},{history_clear:'🧹 History cleared',menu_delete_many:'🗑 Many items deleted'});
/* in-app confirm (browser pop-up confirm can be blocked on some phones) */
window.askSheet=(msg,okText)=>new Promise(res=>{sheet(`<p style="margin:0 0 14px;font-size:16px">${msg}</p><div class="orderactions"><button class="btn red" id="ask_ok">${esc(okText||'OK')}</button><button class="btn gray" id="ask_no">Cancel</button></div>`);$('ask_ok').onclick=()=>{cl();res(true)};$('ask_no').onclick=()=>{cl();res(false)}});
/* ---- delete one menu item ---- */
mDel=async id=>{const{data:m}=await sb.from('menu').select('name').eq('id',id).maybeSingle(),nm=m?m.name:'this item';
 if(!await askSheet('Delete <b>'+esc(nm)+'</b> from the menu?','Delete'))return;
 const{error}=await sb.from('menu').delete().eq('id',id);if(error)return toast('Could not delete: '+error.message);
 audit('menu_delete',nm);toast('Deleted.');go(P||'menu')};
/* ---- delete many ---- */
let MS=[],SEL=new Set();
window.mSel=async()=>{const{data}=await sb.from('menu').select('id,name,price,cat').eq('rid',R.id).order('cat').order('name');MS=data||[];SEL=new Set();msDraw()};
const msDraw=()=>sheet(`<h3 style="margin:0 0 8px">Delete menu items</h3><div class="inline" style="margin-bottom:8px"><button class="btn gray" onclick="msAll(true)">Select all</button><button class="btn gray" onclick="msAll(false)">Select none</button></div><div>${MS.map(m=>`<label class="row" style="cursor:pointer"><input type="checkbox" style="width:22px;height:22px;flex:none" ${SEL.has(m.id)?'checked':''} onchange="msTog('${m.id}',this.checked)"><div class="grow">${esc(m.name)}<br><small>${esc(m.cat||'')} · ${money(m.price)}</small></div></label>`).join('')||'<div class="panel empty">No items.</div>'}</div><div class="orderactions" style="position:sticky;bottom:0;background:var(--panel);padding:8px 0;margin-top:8px"><button class="btn red" id="msd" onclick="msDel()">Delete (${SEL.size})</button><button class="btn gray" onclick="closeSheet()">Close</button></div>`);
window.msAll=v=>{SEL=new Set(v?MS.map(m=>m.id):[]);msDraw()};
window.msTog=(id,on)=>{on?SEL.add(id):SEL.delete(id);const b=$('msd');if(b)b.textContent='Delete ('+SEL.size+')'};
window.msDel=async()=>{const ids=[...SEL],n=ids.length;if(!n)return toast('Select items first.');
 if(!await askSheet('Delete <b>'+n+'</b> menu item'+(n>1?'s':'')+'? This cannot be undone.','Delete '+n)){msDraw();return}
 for(let i=0;i<n;i+=80){const{error}=await sb.from('menu').delete().in('id',ids.slice(i,i+80));if(error)return toast('Could not delete: '+error.message)}
 audit('menu_delete_many',n+' items');toast(n+' item'+(n>1?'s':'')+' deleted.');go(P||'menu')};
const tool=k=>{const o=PG[k];if(!o)return;PG[k]=async()=>{await o();const h=$('pg').querySelector&&$('pg').querySelector('h1.page-title');if(h&&h.insertAdjacentHTML)h.insertAdjacentHTML('afterend','<div class="inline" style="margin-bottom:12px"><button class="btn gray" onclick="mSel()">☑ Select &amp; delete items</button><button class="btn gray" onclick="go(\'card\')">Menu Card</button></div>')}};
tool('menu');tool('recipes');
/* ---- clear history ---- */
const hcQ=(q,w)=>{if(w==='day'){const[a,b]=dayR(HD);return q.gte('created_at',a).lt('created_at',b)}if(w==='all')return q;const d=new Date();d.setDate(d.getDate()-(+w));return q.lt('created_at',dayR(ymd(d))[0])};
const hcLabel=w=>w==='day'?'day '+HD:w==='all'?'everything':'older than '+w+' days';
const _hist=PG.history;
PG.history=async()=>{await _hist();const g=$('pg');if(g&&g.insertAdjacentHTML)g.insertAdjacentHTML('beforeend','<button class="btn red" style="width:100%;margin-top:16px" onclick="hcOpen()">🧹 Clear history…</button>')};
window.hcOpen=()=>sheet(`<h3 style="margin:0 0 8px">🧹 Clear history</h3><p class="note" style="text-align:left">Deletes bills and finished orders. They also disappear from Sales, GST and Accounts reports. Dues, Expenses, Stock and Riders are not touched.</p><label class="label">What to clear</label><select class="field" id="hcw"><option value="day">Only ${esc(HD)} (date shown)</option><option value="30">Older than 30 days</option><option value="7">Older than 7 days</option><option value="all">Everything</option></select><button class="btn gray" style="width:100%;margin-bottom:12px" onclick="hcCsv()">⬇ Download backup (CSV) first</button><label class="label">Type DELETE to confirm</label><input class="field" id="hcc" autocomplete="off" oninput="$('hcgo').disabled=this.value.trim()!=='DELETE'"><div class="orderactions"><button class="btn red" id="hcgo" disabled onclick="hcGo()">Clear</button><button class="btn gray" onclick="closeSheet()">Cancel</button></div>`);
window.hcCsv=async()=>{const w=$('hcw').value,{data,error}=await hcQ(sb.from('bills').select('*').eq('rid',R.id),w).order('created_at');if(error)return toast(error.message);
 const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"',rows=[['Date','Table','Items','Subtotal','Discount','Tax','Total','Mode']].concat((data||[]).map(b=>[new Date(b.created_at).toLocaleString(),b.tbl,(b.items||[]).map(i=>i.name+' x'+i.qty).join('; '),b.subtotal,b.discount,b.tax||0,b.total,b.mode]));
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(q).join(',')).join('\n')],{type:'text/csv'}));a.download='bills-backup.csv';a.click();toast((data||[]).length+' bills in backup.')};
window.hcGo=async()=>{if($('hcc').value.trim()!=='DELETE')return;const w=$('hcw').value,b=$('hcgo');b.disabled=true;b.textContent='Clearing…';
 const{data,error}=await hcQ(sb.from('bills').delete().eq('rid',R.id),w).select('id');if(error){b.disabled=false;b.textContent='Clear';return toast('Could not clear: '+error.message)}
 const n=(data||[]).length,{error:e2}=await hcQ(sb.from('orders').delete().eq('rid',R.id).or('bill_id.not.is.null,status.in.(served,cancelled)'),w);
 audit('history_clear',hcLabel(w)+' · '+n+' bills');cl();toast(e2?n+' bills cleared (orders: '+e2.message+')':n+' bills cleared.');go('history')};
})();
