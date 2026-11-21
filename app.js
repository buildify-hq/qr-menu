const sb=supabase.createClient(CFG.URL,CFG.KEY),$=id=>document.getElementById(id),app=$('app');
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let tm;function toast(m){const t=$('toast');t.textContent=m;t.classList.remove('hidden');clearTimeout(tm);tm=setTimeout(()=>t.classList.add('hidden'),3000)}
async function rpc(n,a){const{data,error}=await sb.rpc(n,a);if(error){toast(error.message==='bad_pin'?'Wrong table PIN. Ask your waiter.':error.message);throw error}return data}
const view=h=>app.innerHTML=h;
const shell=(title,body)=>view(`<header class="topbar"><div class="mini">SJ</div><div class="topname">${esc(title)}</div><button class="icon logout" onclick="logout()" aria-label="Log out">⇥</button></header><main class="content">${body}</main>`);
let R=null,S=null,poll=null,T='orders';
async function logout(){clearInterval(poll);S=null;R=null;await sb.auth.signOut();loginView()}

/* ---------- Login ---------- */
const IC={mail:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zm1.5 2L12 12.2 19.5 7h-15zM4 9.4V17h16V9.4l-8 5.5-8-5.5z"/></svg>',lock:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 10V8a6 6 0 1112 0v2h1a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1h1zm2 0h8V8a4 4 0 10-8 0v2z"/></svg>',store:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16l2 5a3 3 0 01-2 2.8V20H4v-8.2A3 3 0 012 9l2-5zm2 9v5h12v-5H6z"/></svg>'};
const fw=(ic,inner)=>`<div class="fw"><span>${IC[ic]}</span>${inner}</div>`;
function loginView(){
 view(`<div class="login-wrap" style="max-width:440px; margin:40px auto; padding:20px;"><h1 style="text-align:center;color:var(--primary)">SJ Restaurant</h1><p class="sub" style="text-align:center;margin-bottom:20px">Login to manage your restaurant</p><form class="login-card panel" id="f"><label class="label">Shop Name</label>${fw('store','<input name="n" placeholder="Enter restaurant name" required>')}<label class="label">6-Digit PIN</label>${fw('lock','<input name="p" type="password" placeholder="Enter PIN" required>')}<button class="primary" style="margin-top:16px;">Login</button></form></div>`);
 $('f').onsubmit=async e=>{e.preventDefault();const d=new FormData(e.target),n=d.get('n').trim(),p=d.get('p').trim();
  const si=async em=>{const{error}=await sb.auth.signInWithPassword({email:em,password:p});if(error)return false;boot();return true};
  if(n.toLowerCase()==='admin'){if(!await si('sj201205@gmail.com'))toast('Wrong PIN.');return}
  let r;try{r=await rpc('rest_resolve',{c:n})}catch(x){return}
  if(!r)return toast('Restaurant not found.');
  if(await si(r.email))return;
  let st=null;try{st=await rpc('staff_login',{c:r.code,p})}catch(x){return}
  if(st){S={c:r.code,p,...st};return staffView()}
  toast('Wrong PIN.')}}
async function boot(){
 const{data:{session}}=await sb.auth.getSession();if(!session)return loginView();
 const a=await sb.rpc('am_admin'),{data:rs}=await sb.from('restaurants').select('*').order('created_at');
 if(a.data){window._adm=1;return adminView(rs||[])}
 if(rs&&rs.length){R=rs[0];if(R.valid_till&&R.valid_till<ymd(new Date())){await sb.auth.signOut();loginView();return toast('Subscription expired.')}return ownerView()}
 await sb.auth.signOut();loginView();toast('No restaurant linked.')}

/* ---------- Super Admin ---------- */
function adminView(rs){
 shell('Super Admin',`<h1 class="page-title">Restaurants</h1>${rs.map(r=>`<div class="row"><div class="grow"><b>${esc(r.name)}</b><br><small>code: ${esc(r.code)} · valid till ${r.valid_till||'no limit'}</small></div><button class="btn gray" onclick='ext("${r.id}")'>+30d</button><button class="btn gray" onclick='openRest("${r.id}")'>Open</button></div>`).join('')}
 <section class="panel"><h3 style="margin:0 0 12px">Add restaurant</h3><form id="af" class="inline"><input class="field" name="n" placeholder="Name" required><input class="field" name="c" placeholder="Code" required><input class="field" name="o" type="password" placeholder="Owner PIN" required><button class="btn green">Add</button></form></section>`);
 window._rs=rs;$('af').onsubmit=async e=>{e.preventDefault();const d=new FormData(e.target);const c=d.get('c').trim().toLowerCase();const{error}=await sb.from('restaurants').insert({name:d.get('n').trim(),code:c,owner_email:c+'@owner.sjr',tables:10,valid_till:ymd(new Date(Date.now()+30*864e5))});if(error)return toast(error.message);try{await rpc('admin_set_owner',{c,pin:d.get('o').trim()})}catch(x){return}toast('Restaurant added.');boot()}}
async function ext(id){const r=window._rs.find(x=>x.id===id),b=r.valid_till&&r.valid_till>ymd(new Date())?new Date(r.valid_till+'T00:00:00'):new Date();b.setDate(b.getDate()+30);await sb.from('restaurants').update({valid_till:ymd(b)}).eq('id',id);toast('Valid till '+ymd(b));boot()}
const openRest=id=>{R=window._rs.find(r=>r.id===id);ownerView()};

/* ---------- Owner ---------- */
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const dayR=(d,n=1)=>{const a=new Date(d+'T00:00:00'),b=new Date(a);b.setDate(b.getDate()+n);return[a.toISOString(),b.toISOString()]};
const sum=(a,f=x=>x.total)=>a.reduce((s,x)=>s+Number(f(x)),0);
const getBills=async(a,b)=>(await sb.from('bills').select('*').eq('rid',R.id).gte('created_at',a).lt('created_at',b).order('created_at',{ascending:false})).data||[];
const vd=m=>`<i class="vd ${m.veg===false?'nv':'v'}"></i>`;
let P='home',HD=ymd(new Date()),BL=[];
function drawer(v){$('dr').classList.toggle('open',!!v);$('ov').classList.toggle('hidden',!v)}

// NAV अपडेट केले आहे (फक्त ३ बटणं)
const NAV=[['home','🏠','Home'],['menu','📖','Menu'],['history','📊','Reports']];
const DR=[['Menu',[['menu','＋','Add / Edit Items']]],['Settings',[['staff','👥','Staff'],['qr','🪑','QR Codes']]]];

function oShell(){view(`<header class="topbar"><button class="icon" onclick="drawer(1)">☰</button><div class="topname">${esc(R.name)}</div><button class="icon logout" onclick="logout()">⇥</button></header><div class="overlay hidden" id="ov" onclick="drawer(0)"></div><aside class="drawer" id="dr"><div class="drawerhead"><span>${esc(R.name)}</span><button class="icon" onclick="drawer(0)">×</button></div>${DR.map(s=>`<div class="sidehead" style="padding:16px 16px 8px;font-size:12px;color:var(--muted);text-transform:uppercase;font-weight:700;">${s[0]}</div>`+s[1].map(i=>`<button class="navlink" style="display:flex;width:100%;padding:16px;gap:12px;text-align:left;font-size:16px;font-weight:500;color:var(--text)" onclick="go('${i[0]}')"><span>${i[1]}</span>${i[2]}</button>`).join('')).join('')}${window._adm?'<div class="sidehead" style="padding:16px">Admin</div><button class="navlink" style="padding:16px;display:flex;gap:12px;width:100%" onclick="boot()">⬅ Back to Super Admin</button>':''}</aside><main class="content"><div id="pg"></div></main><nav class="bottom">${NAV.map(n=>`<button class="${n[0]===P?'active':''}" onclick="go('${n[0]}')"><b>${n[1]}</b>${n[2]}</button>`).join('')}</nav>`)}

const ownerView=()=>go('home');
async function go(p){P=p;oShell();$('pg').innerHTML='<div class="empty">Loading…</div>';try{await PG[p]()}catch(e){console.error(e);$('pg').innerHTML='<div class="panel empty">Could not load.</div>'}}
const hd=n=>{const d=new Date(HD+'T00:00:00');d.setDate(d.getDate()+n);HD=ymd(d);go('history')};

const PG={
home:async()=>{const t=ymd(new Date()),[a,b]=dayR(t),bs=await getBills(a,b),{data:os}=await sb.from('orders').select('status').eq('rid',R.id).gte('created_at',a),h=new Date().getHours(),live=(os||[]).filter(o=>['new','preparing','ready'].includes(o.status)).length;
 $('pg').innerHTML=`<div class="welcome" style="padding:20px 0"><h2>${esc(R.name)}</h2><p style="color:var(--muted)">Here is your restaurant overview.</p></div><div class="stats" style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px"><div class="panel" style="margin:0"><div class="statlabel" style="color:var(--muted);font-size:13px">Today's sales</div><div class="statvalue" style="font-size:24px;font-weight:700;color:var(--primary)">${money(sum(bs))}</div><div class="statfoot" style="font-size:12px;color:var(--muted)">${bs.length} bills</div></div><div class="panel" style="margin:0"><div class="statlabel" style="color:var(--muted);font-size:13px">Live orders</div><div class="statvalue" style="font-size:24px;font-weight:700;color:var(--primary)">${live}</div><div class="statfoot" style="font-size:12px;color:var(--muted)">${(os||[]).length} orders today</div></div></div><div class="sectionhead"><h3 style="margin:20px 0 10px">Quick actions</h3></div><div class="actions" style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">${[['menu','📖','My Menu'],['history','📊','Reports']].map(x=>`<button class="panel" style="margin:0;display:flex;align-items:center;gap:12px;font-weight:600;" onclick="go('${x[0]}')"><span style="font-size:20px;">${x[1]}</span>${x[2]}</button>`).join('')}</div>`},
menu:async()=>{
  const{data}=await sb.from('menu').select('*').eq('rid',R.id).order('cat');
  $('pg').innerHTML=`<h1 class="page-title">Menu</h1><button class="btn green" style="width:100%;margin-bottom:12px" onclick="openScan()">📷 Scan Menu Card</button><div class="fw"><input id="ms" placeholder="Search item…"></div>${(data||[]).map(m=>`<div class="row mi" data-n="${esc(m.name.toLowerCase())}"><div class="grow">${vd(m)}<b>${esc(m.name)}</b><br><small>${esc(m.cat)} · ${m.sizes&&m.sizes.length?m.sizes.map(s=>esc(s.n)+' '+money(s.p)).join(' / '):money(m.price)}</small></div><button class="btn ${m.available?'green':'gray'}" onclick='mAv("${m.id}",${!m.available})'>${m.available?'In stock':'Sold out'}</button><button class="btn red" onclick='mDel("${m.id}")'>✕</button></div>`).join('')}<section class="panel" style="margin-top:20px"><h3 style="margin:0 0 12px">Add item</h3><form id="mf" class="inline"><input class="field" name="n" placeholder="Item name" required><input class="field" name="p" type="number" min="0" placeholder="Price" required><input class="field" name="c" placeholder="Category" value="Main Course"><input class="field" name="z" placeholder="Sizes (e.g. Half:80, Full:150)"><select class="field" name="v"><option value="1">🟢 Veg</option><option value="0">🔴 Non-veg</option></select><button class="btn green" style="width:100%;margin-top:10px;">Add Item</button></form></section>`;
  
  $('ms').oninput=e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.mi').forEach(x=>x.style.display=x.dataset.n.includes(q)?'':'none')};
  $('mf').onsubmit=async e=>{e.preventDefault();const d=new FormData(e.target);const{error}=await sb.from('menu').insert({rid:R.id,emoji:'',name:d.get('n').trim(),price:+d.get('p'),cat:d.get('c').trim()||'Menu',veg:d.get('v')==='1',...parseSizes(d.get('z'))});if(error)return toast(error.message);go('menu')}},
history:async()=>{const[a,b]=dayR(HD);BL=await getBills(a,b);
 $('pg').innerHTML=`<h1 class="page-title">Reports</h1><div class="inline" style="margin-bottom:12px"><button class="btn gray" onclick="hd(-1)">‹</button><input class="field" type="date" value="${HD}" onchange="HD=this.value||HD;go('history')"><button class="btn gray" onclick="hd(1)">›</button></div><div class="panel"><div class="statlabel" style="color:var(--muted)">Total Sales</div><div class="statvalue" style="font-size:28px;font-weight:700">${money(sum(BL))}</div></div>`+(BL.map((x,i)=>`<button class="row" style="width:100%;text-align:left" onclick="billSheet(BL[${i}],R.name)"><div class="grow"><b>${tn(x.tbl)}</b><br><small>${new Date(x.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · ${esc(x.mode)}</small></div><b>${money(x.total)}</b></button>`).join('')||'<div class="panel empty">No records.</div>')},
staff:async()=>{const{data}=await sb.from('staff').select('*').eq('rid',R.id);
 $('pg').innerHTML=`<h1 class="page-title">Staff</h1>`+(data||[]).map(s=>`<div class="row"><div class="grow"><b>${esc(s.name)}</b><br><small>${s.role} · PIN ${esc(s.pin)}</small></div><button class="btn red" onclick='sDel("${s.id}")'>✕</button></div>`).join('')+`<section class="panel" style="margin-top:20px"><h3>Add staff</h3><form id="sf" class="inline"><input class="field" name="n" placeholder="Name" required><input class="field" name="p" type="password" placeholder="PIN" required><select class="field" name="r"><option value="chef">Chef</option><option value="waiter">Waiter</option></select><label class="label"><input type="checkbox" id="sbill" checked> Can make bills</label><button class="btn green" style="width:100%">Add</button></form></section>`;
 $('sf').onsubmit=async e=>{e.preventDefault();const d=new FormData(e.target);const{error}=await sb.from('staff').insert({rid:R.id,name:d.get('n').trim(),pin:d.get('p').trim(),role:d.get('r'),can_bill:$('sbill').checked});if(error)return toast(error.message);go('staff')}},
qr:async()=>{const base=location.origin+location.pathname;
 $('pg').innerHTML=`<h1 class="page-title">QR Codes</h1><div class="grid">${Array.from({length:R.tables},(_,i)=>{const u=`${base}?r=${encodeURIComponent(R.code)}&t=${i+1}`;return`<div class="panel" style="text-align:center"><img alt="QR" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(u)}"><br>Table ${i+1}</div>`}).join('')}</div>`}
};
async function mAv(id,v){await sb.from('menu').update({available:v}).eq('id',id);go('menu')}
async function mDel(id){if(confirm('Delete?')){await sb.from('menu').delete().eq('id',id);go('menu')}}
async function sDel(id){if(confirm('Remove staff?')){await sb.from('staff').delete().eq('id',id);go('staff')}}
function billSheet(b,name){const m={};(b.items||[]).forEach(i=>{const k=i.name+'|'+i.price;m[k]=m[k]||{...i,qty:0};m[k].qty+=i.qty});const L=Object.values(m),when=new Date(b.created_at).toLocaleString();
 const txt=`*${name}*\nTable ${b.tbl}\n`+L.map(i=>`${i.name} x${i.qty} = ${money(i.price*i.qty)}`).join('\n')+`\n*Total: ${money(b.total)}*`;
 $('sheet').innerHTML=`<div class="panel sheetbox"><h3>${esc(name)}</h3><div>${L.map(i=>`<div class="row"><div class="grow">${esc(i.name)} × ${i.qty}</div><b>${money(i.price*i.qty)}</b></div>`).join('')}</div><div class="totalrow" style="margin-top:10px"><span>Total</span><span>${money(b.total)}</span></div><div class="inline" style="margin-top:16px"><button class="btn" onclick="print()">Print</button><a class="btn green" target="_blank" href="https://wa.me/?text=${encodeURIComponent(txt)}">WhatsApp</a><button class="btn gray" onclick="$('sheet').innerHTML=''">Close</button></div></div>`}

/* ---------- Staff ---------- */
async function staffView(){
 const draw=async()=>{if(!S)return;let d;try{d=await rpc('staff_orders',{c:S.c,p:S.p})}catch(e){return}if(!d)return logout();
  window._d=d;kotWatch(d);const chef=S.role==='chef',os=d.orders,card=(o,btns)=>`<div class="panel"><div style="display:flex;justify-content:space-between;margin-bottom:10px"><b>Table ${o.tbl}</b><span class="pill">${o.status}</span></div>${o.items.map(i=>`<b>${i.qty}×</b> ${esc(i.name)}`).join('<br>')}<div style="margin-top:10px;display:flex;gap:8px">${btns}</div></div>`;
  const b=(o,st,l,c='green')=>`<button class="btn ${c}" onclick="setSt('${o.id}','${st}')">${l}</button>`;
  let h=`<h1 class="page-title">${chef?'Kitchen':'Floor'}</h1>`;
  if(chef){const k=os.filter(o=>['new','preparing'].includes(o.status));h+=k.map(o=>card(o,(o.status==='new'?b(o,'preparing','Start')+b(o,'cancelled','Cancel','red'):b(o,'ready','Ready')))).join('')||'<div class="panel">No orders.</div>'}
  else{h+=os.filter(o=>o.status==='ready').map(o=>card(o,b(o,'served','Mark Served'))).join('')||'<div class="panel">Nothing ready.</div>'}
  shell(S.rname+' · '+S.name,h)};
 clearInterval(poll);await draw();poll=setInterval(()=>{if(!document.hidden)draw()},S.role==='chef'?5000:10000);window._draw=draw}
async function setSt(id,st){await rpc('staff_set',{c:S.c,p:S.p,oid:id,st});_draw()}

/* ---------- Customer (QR) ---------- */
async function customerView(code,t){
 const info=await rpc('rest_info',{c:code});if(!info)return view('<div class="panel">Restaurant not found</div>');
 const menu=expandSizes(await rpc('get_menu',{c:code}));let cart={},pin='',checkout=false,oid=null;
 let vFilter='all';
 const cnt=()=>Object.values(cart).reduce((a,b)=>a+b,0),tot=()=>menu.reduce((a,m)=>a+(cart[m.id]||0)*m.price,0);
 
 const draw=()=>{
  if(checkout){shell(info.name,`<h1 class="page-title">Order · Table ${esc(t)}</h1>${menu.filter(m=>cart[m.id]).map(m=>`<div class="row"><div class="grow"><b>${esc(m.name)}</b><br><small>${money(m.price)} × ${cart[m.id]}</small></div><b>${money(m.price*cart[m.id])}</b></div>`).join('')}<div class="totalrow"><span>Total</span><span>${money(tot())}</span></div><section class="panel" style="margin-top:16px"><label class="label">Table PIN</label><input class="field" id="pin" type="password" maxlength="4" value="${pin}" placeholder="4-digit PIN"><button class="primary" id="go" style="margin-top:10px">Place order</button></section>`);
   $('go').onclick=async()=>{pin=$('pin').value.trim();if(pin.length!==4)return toast('Enter PIN');try{oid=await rpc('place_order',{c:code,t,p:pin,its:menu.filter(m=>cart[m.id]).map(m=>({id:m.rid||m.id,sz:m.sz||'',qty:cart[m.id]})),nt:''});cart={};checkout=false;track()}catch(e){}};return}
  
  const cats=[...new Set(menu.map(m=>m.cat))];
  let showMenu = menu;
  if(vFilter==='veg') showMenu = menu.filter(m=>m.veg!==false);
  if(vFilter==='nonveg') showMenu = menu.filter(m=>m.veg===false);
  
  const tabs = `<div class="tabs"><button class="${vFilter==='all'?'on':''}" onclick="window.sVF('all')">All</button><button class="${vFilter==='veg'?'on':''}" onclick="window.sVF('veg')">🟢 Veg</button><button class="${vFilter==='nonveg'?'on':''}" onclick="window.sVF('nonveg')">🔴 Non-Veg</button></div>`;
  
  shell(info.name,`<h1 class="page-title">Table ${esc(t)}</h1>${tabs}${cats.map(c=>{
   const items = showMenu.filter(m=>m.cat===c);
   if(items.length === 0) return ''; 
   return `<div class="cat">${esc(c)}</div>`+items.map(m=>`<div class="row"><div class="grow">${vd(m)}<b>${esc(m.name)}</b><br><small>${money(m.price)}</small></div><div class="qty"><button onclick="chg('${m.id}',-1)">−</button><b>${cart[m.id]||0}</b><button onclick="chg('${m.id}',1)">+</button></div></div>`).join('');
  }).join('')}<div style="height:100px"></div>${cnt()?`<button class="primary" style="position:fixed;bottom:20px;left:16px;right:16px;z-index:100;display:flex;justify-content:space-between" onclick="goCk()"><span>${cnt()} items</span><span>View order · ${money(tot())}</span></button>`:''}`)};
 
 window.sVF=(v)=>{vFilter=v;draw()};
 window.chg=(id,d)=>{cart[id]=Math.max(0,(cart[id]||0)+d);draw()};window.goCk=()=>{checkout=true;draw()};
 let pl;const track=()=>{clearInterval(pl);const L=['new','preparing','ready','served'],N={new:'Order received',preparing:'Preparing',ready:'Ready',served:'Served',cancelled:'Cancelled'};
  const up=async()=>{let st;try{st=await rpc('order_status',{oid})}catch(e){return}const i=L.indexOf(st);if(st==='served'||st==='cancelled')clearInterval(pl);
   shell(info.name,`<h1 class="page-title">${N[st]||st}</h1><div class="steps">${L.map((s,j)=>`<i class="${j<=i?'on':''}"></i>`).join('')}</div>`);};
  up();pl=setInterval(()=>{if(!document.hidden)up()},8000)};
 draw()}

/* ---------- Start ---------- */
const qp=new URLSearchParams(location.search);
if(qp.get('r')&&qp.get('t'))customerView(qp.get('r').toLowerCase(),qp.get('t'));else boot();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
