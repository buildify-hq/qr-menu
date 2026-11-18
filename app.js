const sb=supabase.createClient(CFG.URL,CFG.KEY),$=id=>document.getElementById(id),app=$('app');
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let tm;function toast(m){const t=$('toast');t.textContent=m;t.classList.remove('hidden');clearTimeout(tm);tm=setTimeout(()=>t.classList.add('hidden'),3000)}
async function rpc(n,a){const{data,error}=await sb.rpc(n,a);if(error){toast(error.message==='bad_pin'?'Wrong table PIN. Ask your waiter for the PIN.':error.message==='empty_order'?'Items are not available.':error.message);throw error}return data}
const view=h=>app.innerHTML=h;
const shell=(title,body)=>view(`<header class="topbar"><div class="mini">SJ</div><div class="topname">${esc(title)}</div><button class="icon logout" onclick="logout()" aria-label="Log out">⇥</button></header><main class="content">${body}</main>`);
let R=null,S=null,poll=null,T='orders';
async function logout(){clearInterval(poll);S=null;R=null;await sb.auth.signOut();loginView()}
/* ---------- Login ---------- */
const IC={mail:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zm1.5 2L12 12.2 19.5 7h-15zM4 9.4V17h16V9.4l-8 5.5-8-5.5z"/></svg>',lock:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 10V8a6 6 0 1112 0v2h1a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1h1zm2 0h8V8a4 4 0 10-8 0v2z"/></svg>',store:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16l2 5a3 3 0 01-2 2.8V20H4v-8.2A3 3 0 012 9l2-5zm2 9v5h12v-5H6z"/></svg>'};
const fw=(ic,inner)=>`<div class="fw"><span>${IC[ic]}</span>${inner}</div>`;
function loginView(){
 view(`<div class="login-wrap" style="max-width:440px"><img class="logo" src="logo.png" alt="SJ Digital Labs"><h1>SJ Restaurant</h1><p class="sub">Login to manage your restaurant</p><form class="login-card" id="f"><label class="label">Shop Name</label>${fw('store','<input name="n" placeholder="Enter your restaurant name or code" autocapitalize="none" autocomplete="username" required>')}<label class="label">6-Digit PIN / Password</label>${fw('lock','<input name="p" type="password" placeholder="Enter PIN or Password" autocomplete="current-password" required>')}<button class="primary">Login &nbsp;⇥</button></form></div>`);
 $('f').onsubmit=async e=>{e.preventDefault();const d=new FormData(e.target),n=d.get('n').trim(),p=d.get('p').trim();
  const si=async em=>{const{error}=await sb.auth.signInWithPassword({email:em,password:p});if(error)return false;boot();return true};
  if(n.toLowerCase()==='admin'){if(!await si('sj201205@gmail.com'))toast('Wrong PIN.');return}
  let r;try{r=await rpc('rest_resolve',{c:n})}catch(x){return}
  if(!r)return toast('Restaurant not found. Check the name or code.');
  if(await si(r.email))return;
  let st=null;try{st=await rpc('staff_login',{c:r.code,p})}catch(x){return}
  if(st){S={c:r.code,p,...st};return staffView()}
  toast('Wrong PIN.')}}
async function boot(){
 const{data:{session}}=await sb.auth.getSession();if(!session)return loginView();
 const a=await sb.rpc('am_admin'),{data:rs}=await sb.from('restaurants').select('*').order('created_at');
 if(a.data)return adminView(rs||[]);
 if(rs&&rs.length){R=rs[0];return ownerView('orders')}
 await sb.auth.signOut();loginView();toast('No restaurant is linked to this email.')}
/* ---------- Super Admin ---------- */
function adminView(rs){
 shell('Super Admin',`<h1 class="page-title">Restaurants</h1>${rs.map(r=>`<div class="row"><div class="grow"><b>${esc(r.name)}</b><br><small>code: ${esc(r.code)} · ${esc(r.owner_email)} · ${r.tables} tables</small></div><button class="btn gray" onclick='resetPin("${r.code}")' aria-label="Reset PIN">🔑</button><button class="btn gray" onclick='openRest("${r.id}")'>Open</button><button class="btn ${r.active?'green':'red'}" onclick='togRest("${r.id}",${!r.active})'>${r.active?'Active':'Off'}</button></div>`).join('')}
 <section class="panel"><h3 style="margin:0 0 12px">Add restaurant</h3><form id="af" class="inline"><input class="field" name="n" placeholder="Name" required><input class="field" name="c" placeholder="Code (e.g. sagar)" pattern="[a-z0-9-]+" required><input class="field" name="o" inputmode="numeric" pattern="[0-9]{6,}" placeholder="Owner PIN (6 digits)" required><input class="field" name="t" type="number" min="1" max="100" value="10"><button class="btn">Add</button></form><p class="note">Owner signs in with the restaurant name or code and this PIN.</p></section>`);
 window._rs=rs;$('af').onsubmit=async e=>{e.preventDefault();const d=new FormData(e.target);const c=d.get('c').trim().toLowerCase();if(c==='admin')return toast('This code is reserved.');const{error}=await sb.from('restaurants').insert({name:d.get('n').trim(),code:c,owner_email:c+'@owner.sjr',tables:+d.get('t')});if(error)return toast(error.message);try{await rpc('admin_set_owner',{c,pin:d.get('o').trim()})}catch(x){return}toast('Restaurant added.');boot()}}
async function resetPin(c){const p=prompt('New owner PIN for '+c+' (6+ digits)');if(!p)return;try{await rpc('admin_set_owner',{c,pin:p.trim()});toast('PIN updated.')}catch(x){}}
const openRest=id=>{R=window._rs.find(r=>r.id===id);ownerView('orders')};
async function togRest(id,v){await sb.from('restaurants').update({active:v}).eq('id',id);boot()}
/* ---------- Owner ---------- */
async function ownerView(tab){
 T=tab;const L={orders:'🧾 Orders',menu:'📖 Menu',staff:'👥 Staff',tables:'🪑 QR'};
 shell(R.name,`<div class="tabs">${Object.keys(L).map(k=>`<button class="${k===tab?'on':''}" onclick="ownerView('${k}')">${L[k]}</button>`).join('')}</div><div id="tab"></div>`);
 const el=$('tab');
 if(tab==='orders'){const s=new Date();s.setHours(0,0,0,0);const{data}=await sb.from('orders').select('*').eq('rid',R.id).gte('created_at',s.toISOString()).order('created_at',{ascending:false});const o=data||[],sales=o.filter(x=>x.status!=='cancelled').reduce((a,x)=>a+Number(x.total),0);
  el.innerHTML=`<div class="stats"><div class="stat"><div class="statlabel">Today's sales</div><div class="statvalue">${money(sales)}</div></div><div class="stat"><div class="statlabel">Orders</div><div class="statvalue">${o.length}</div></div></div>`+(o.map(x=>`<article class="ordercard"><div class="orderhead"><strong>Table ${esc(x.tbl)} · ${new Date(x.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</strong><span class="pill ${x.status}">${x.status}</span></div><div class="orderitems">${x.items.map(i=>`${esc(i.name)} × ${i.qty}`).join('<br>')}${x.note?`<br><small>Note: ${esc(x.note)}</small>`:''}</div><div class="totalrow"><span>Total</span><span>${money(x.total)}</span></div></article>`).join('')||'<div class="panel empty">No orders yet today.</div>')}
 if(tab==='menu'){const{data}=await sb.from('menu').select('*').eq('rid',R.id).order('cat');
  el.innerHTML=(data||[]).map(m=>`<div class="row"><span class="emoji">${esc(m.emoji)}</span><div class="grow"><b>${esc(m.name)}</b><br><small>${esc(m.cat)} · ${money(m.price)}</small></div><button class="btn ${m.available?'green':'gray'}" onclick='mAv("${m.id}",${!m.available})'>${m.available?'On':'Off'}</button><button class="btn red" onclick='mDel("${m.id}")'>✕</button></div>`).join('')+`<section class="panel"><h3 style="margin:0 0 12px">Add item</h3><form id="mf" class="inline"><input class="field" name="e" value="🍽️" style="max-width:70px"><input class="field" name="n" placeholder="Item name" required><input class="field" name="p" type="number" min="0" placeholder="Price" required><input class="field" name="c" placeholder="Category" value="Main Course"><button class="btn">Add</button></form></section>`;
  $('mf').onsubmit=async e=>{e.preventDefault();const d=new FormData(e.target);const{error}=await sb.from('menu').insert({rid:R.id,emoji:d.get('e'),name:d.get('n').trim(),price:+d.get('p'),cat:d.get('c').trim()||'Menu'});if(error)return toast(error.message);ownerView('menu')}}
 if(tab==='staff'){const{data}=await sb.from('staff').select('*').eq('rid',R.id);
  el.innerHTML=(data||[]).map(s=>`<div class="row"><div class="grow"><b>${esc(s.name)}</b><br><small>${s.role} · PIN ${esc(s.pin)}</small></div><button class="btn red" onclick='sDel("${s.id}")'>✕</button></div>`).join('')+`<section class="panel"><h3 style="margin:0 0 12px">Add staff</h3><form id="sf" class="inline"><input class="field" name="n" placeholder="Name" required><input class="field" name="p" inputmode="numeric" pattern="[0-9]{4,6}" placeholder="PIN (4–6 digits)" required><select class="field" name="r"><option value="chef">Chef</option><option value="waiter">Waiter</option></select><button class="btn">Add</button></form><p class="note">Staff sign in with restaurant code <b>${esc(R.code)}</b> and their PIN.</p></section>`;
  $('sf').onsubmit=async e=>{e.preventDefault();const d=new FormData(e.target);const{error}=await sb.from('staff').insert({rid:R.id,name:d.get('n').trim(),pin:d.get('p').trim(),role:d.get('r')});if(error)return toast(error.code==='23505'?'This PIN is already used.':error.message);ownerView('staff')}}
 if(tab==='tables'){const base=location.origin+location.pathname;
  el.innerHTML=`<div class="grid">${Array.from({length:R.tables},(_,i)=>{const u=`${base}?r=${encodeURIComponent(R.code)}&t=${i+1}`;return`<div class="qrc"><img alt="QR table ${i+1}" src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(u)}">Table ${i+1}</div>`}).join('')}</div><p class="note">A copied QR is useless from home: ordering needs the table PIN that your waiter gives after guests sit.</p><button class="btn" style="margin-top:10px" onclick="print()">Print QR codes</button>`}}
async function mAv(id,v){await sb.from('menu').update({available:v}).eq('id',id);ownerView('menu')}
async function mDel(id){if(confirm('Delete this item?')){await sb.from('menu').delete().eq('id',id);ownerView('menu')}}
async function sDel(id){if(confirm('Remove this staff member?')){await sb.from('staff').delete().eq('id',id);ownerView('staff')}}
/* ---------- Staff (Chef / Waiter) ---------- */
async function staffView(){
 const draw=async()=>{if(!S)return;let d;try{d=await rpc('staff_orders',{c:S.c,p:S.p})}catch(e){return}if(!d)return logout();
  const chef=S.role==='chef',os=d.orders,card=(o,btns)=>`<article class="ordercard"><div class="orderhead"><strong>Table ${esc(o.tbl)}</strong><span class="pill ${o.status}">${o.status}</span></div><div class="orderitems">${o.items.map(i=>`<b>${i.qty}×</b> ${esc(i.name)}`).join('<br>')}${o.note?`<br><small>Note: ${esc(o.note)}</small>`:''}</div><div class="orderactions">${btns}</div></article>`;
  const b=(o,st,l,c='green')=>`<button class="btn ${c}" onclick="setSt('${o.id}','${st}')">${l}</button>`;
  let h=`<h1 class="page-title">${chef?'Kitchen':'Floor'}</h1>`;
  if(chef){const k=os.filter(o=>o.status!=='ready');h+=k.map(o=>card(o,o.status==='new'?b(o,'preparing','Start preparing')+b(o,'cancelled','Cancel','red'):b(o,'ready','Mark ready'))).join('')||'<div class="panel empty">No orders in the kitchen.</div>'}
  else{h+=(d.calls.length?`<div class="sectionhead"><h3>🔔 Calls</h3></div>`+d.calls.map(c=>`<div class="row"><div class="grow"><b>Table ${esc(c.tbl)}</b> needs you</div><button class="btn green" onclick="callDone('${c.id}')">Done</button></div>`).join(''):'')
   +`<div class="sectionhead"><h3>Ready to serve</h3></div>`+(os.filter(o=>o.status==='ready').map(o=>card(o,b(o,'served','Mark served'))).join('')||'<div class="panel empty">Nothing ready yet.</div>')
   +`<div class="sectionhead"><h3>Tables</h3><span>Open a table to get its PIN</span></div><div class="grid">${Array.from({length:d.tables},(_,i)=>{const t=String(i+1),s=d.sessions.find(x=>x.tbl===t);return`<div class="tbl ${s?'busy':''}"><b>${t}</b>${s?`<div class="pin">${s.pin}</div><button class="btn gray" onclick="tblClose('${t}')">Close</button>`:`<button class="btn" onclick="tblOpen('${t}')">Open</button>`}</div>`}).join('')}</div>`}
  shell(S.rname+' · '+S.name,h)};
 clearInterval(poll);await draw();poll=setInterval(draw,5000);window._draw=draw}
async function setSt(id,st){await rpc('staff_set',{c:S.c,p:S.p,oid:id,st});_draw()}
async function callDone(id){await rpc('call_done',{c:S.c,p:S.p,cid:id});_draw()}
async function tblOpen(t){await rpc('open_table',{c:S.c,p:S.p,t});_draw()}
async function tblClose(t){await rpc('close_table',{c:S.c,p:S.p,t});_draw()}
/* ---------- Customer (QR) ---------- */
async function customerView(code,t){
 const info=await rpc('rest_info',{c:code});if(!info)return view('<div class="login-wrap"><h1>Restaurant not found</h1></div>');
 const menu=await rpc('get_menu',{c:code});let cart={},pin='',checkout=false,oid=null;
 const cnt=()=>Object.values(cart).reduce((a,b)=>a+b,0),tot=()=>menu.reduce((a,m)=>a+(cart[m.id]||0)*m.price,0);
 const draw=()=>{
  if(checkout){shell(info.name,`<h1 class="page-title">Your order · Table ${esc(t)}</h1>${menu.filter(m=>cart[m.id]).map(m=>`<div class="row"><div class="grow"><b>${esc(m.name)}</b><br><small>${money(m.price)} × ${cart[m.id]}</small></div><b>${money(m.price*cart[m.id])}</b></div>`).join('')}<div class="totalrow"><span>Total</span><span>${money(tot())}</span></div><section class="panel" style="margin-top:16px"><label class="label">Table PIN (ask your waiter)</label><input class="field" id="pin" inputmode="numeric" maxlength="4" value="${pin}" placeholder="4-digit PIN"><label class="label">Note (optional)</label><input class="field" id="nt" maxlength="200" placeholder="Less spicy, no onion…"><button class="primary" id="go">Place order</button><button class="btn gray" style="width:100%;margin-top:10px" id="bk">Back to menu</button></section>`);
   $('bk').onclick=()=>{checkout=false;draw()};
   $('go').onclick=async()=>{pin=$('pin').value.trim();if(pin.length!==4)return toast('Enter the 4-digit table PIN.');try{oid=await rpc('place_order',{c:code,t,p:pin,its:menu.filter(m=>cart[m.id]).map(m=>({id:m.id,qty:cart[m.id]})),nt:$('nt').value});cart={};checkout=false;track()}catch(e){}};return}
  const cats=[...new Set(menu.map(m=>m.cat))];
  shell(info.name,`<h1 class="page-title">Table ${esc(t)} · Menu</h1>${cats.map(c=>`<div class="cat">${esc(c)}</div>`+menu.filter(m=>m.cat===c).map(m=>`<div class="row"><span class="emoji">${esc(m.emoji)}</span><div class="grow"><b>${esc(m.name)}</b><br><small>${money(m.price)}</small></div><div class="qty"><button onclick="chg('${m.id}',-1)" aria-label="Remove">−</button><b>${cart[m.id]||0}</b><button onclick="chg('${m.id}',1)" aria-label="Add">+</button></div></div>`).join('')).join('')}<div style="height:90px"></div>${cnt()?`<button class="cartbar" onclick="goCk()"><span>${cnt()} items</span><span>View order · ${money(tot())}</span></button>`:''}`)};
 window.chg=(id,d)=>{cart[id]=Math.max(0,(cart[id]||0)+d);draw()};window.goCk=()=>{checkout=true;draw()};
 let pl;const track=()=>{clearInterval(pl);const L=['new','preparing','ready','served'],N={new:'Order received',preparing:'Being prepared',ready:'Ready — coming to your table',served:'Served. Enjoy your meal!',cancelled:'Order cancelled'};
  const up=async()=>{let st;try{st=await rpc('order_status',{oid})}catch(e){return}const i=L.indexOf(st);if(st==='served'||st==='cancelled')clearInterval(pl);
   shell(info.name,`<h1 class="page-title">${N[st]||st}</h1><div class="steps">${L.map((s,j)=>`<i class="${j<=i?'on':''}"></i>`).join('')}</div><button class="btn" style="width:100%;margin-bottom:10px" id="bell">🔔 Call waiter</button><button class="btn gray" style="width:100%" id="more">Order more</button>`);
   $('bell').onclick=async()=>{try{await rpc('ring',{c:code,t,p:pin});toast('Waiter is on the way.')}catch(e){}};$('more').onclick=()=>{clearInterval(pl);draw()}};
  up();pl=setInterval(up,4000)};
 draw()}
/* ---------- Start ---------- */
const qp=new URLSearchParams(location.search);
if(qp.get('r')&&qp.get('t'))customerView(qp.get('r').toLowerCase(),qp.get('t'));else boot();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
