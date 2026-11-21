// app.js — पूर्ण दुरुस्त फाईल
const sb=supabase.createClient(CFG.URL,CFG.KEY),$=id=>document.getElementById(id),app=$('app');
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let tm;function toast(m){const t=$('toast');t.textContent=m;t.classList.remove('hidden');clearTimeout(tm);tm=setTimeout(()=>t.classList.add('hidden'),3000)}
async function rpc(n,a){const{data,error}=await sb.rpc(n,a);if(error){toast(error.message==='bad_pin'?'Wrong table PIN. Ask your waiter for the PIN.':error.message==='empty_order'?'Items are not available.':error.message);throw error}return data}
const view=h=>app.innerHTML=h;
const shell=(title,body)=>view(`<header class="topbar"><img class="mini" src="logo.png" alt="SJ"><div class="topname">${esc(title)}</div><button class="icon logout" onclick="logout()" aria-label="Log out">⇥</button></header><main class="content">${body}</main>`);
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
 if(a.data){window._adm=1;return adminView(rs||[])}
 if(rs&&rs.length){R=rs[0];if(R.valid_till&&R.valid_till<ymd(new Date())){await sb.auth.signOut();loginView();return toast('Subscription expired. Contact SJ Digital Labs.')}return ownerView()}
 await sb.auth.signOut();loginView();toast('No restaurant is linked to this email.')}
/* ---------- Super Admin ---------- */
function adminView(rs){
 shell('Super Admin',`<h1 class="page-title">Restaurants</h1>${rs.map(r=>`<div class="row"><div class="grow"><b>${esc(r.name)}</b><br><small>code: ${esc(r.code)} · ${r.tables} tables · valid till ${r.valid_till||'no limit'}</small></div><button class="btn gray" onclick='resetPin("${r.code}")' aria-label="Reset PIN">🔑</button><button class="btn gray" onclick='ext("${r.id}")'>+30d</button><button class="btn gray" onclick='openRest("${r.id}")'>Open</button><button class="btn ${r.active?'green':'red'}' onclick='togRest("${r.id}",${!r.active})'>${r.active?'Active':'Off'}</button></div>`).join('')}
 <section class="panel"><h3 style="margin:0 0 12px">Add restaurant</h3><form id="af" class="inline"><input class="field" name="n" placeholder="Name" required><input class="field" name="c" placeholder="Code (e.g. sagar)" pattern="[a-z0-9-]+" required><input class="field" name="o" inputmode="numeric" pattern="[0-9]{6,}" placeholder="Owner PIN (6 digits)" required><input class="field" name="t" type="number" min="1" max="100" value="10"><button class="btn">Add</button></form><p class="note">Owner signs in with the restaurant name or code and this PIN.</p></section>`);
 window._rs=rs;$('af').onsubmit=async e=>{e.preventDefault();const d=new FormData(e.target);const c=d.get('c').trim().toLowerCase();if(c==='admin')return toast('This code is reserved.');const{error}=await sb.from('restaurants').insert({name:d.get('n').trim(),code:c,owner_email:c+'@owner.sjr',tables:+d.get('t'),valid_till:ymd(new Date(Date.now()+30*864e5))});if(error)return toast(error.message);try{await rpc('admin_set_owner',{c,pin:d.get('o').trim()})}catch(x){return}toast('Restaurant added.');boot()}}
async function resetPin(c){
  $('sheet').innerHTML = `<div class="sheetbox">
    <h3 style="margin:0 0 8px">New owner PIN</h3>
    <label class="label">PIN for ${esc(c)} (6+ digits)</label>
    <input class="field" id="newpin" inputmode="numeric" pattern="[0-9]{6,}" placeholder="Enter new PIN">
    <div class="popup-actions">
      <button class="btn green" id="savepin">Save</button>
      <button class="btn gray" onclick="$('sheet').innerHTML=''">Cancel</button>
    </div>
  </div>`;
  $('savepin').onclick = async () => {
    const p = $('newpin').value.trim();
    if (!p || p.length < 6) return toast('PIN must be at least 6 digits.');
    try {
      await rpc('admin_set_owner', { c, pin: p });
      toast('PIN updated.');
      $('sheet').innerHTML = '';
    } catch (e) {}
  };
}
async function ext(id){const r=window._rs.find(x=>x.id===id),b=r.valid_till&&r.valid_till>ymd(new Date())?new Date(r.valid_till+'T00:00:00'):new Date();b.setDate(b.getDate()+30);await sb.from('restaurants').update({valid_till:ymd(b)}).eq('id',id);toast('Valid till '+ymd(b));boot()}
const openRest=id=>{R=window._rs.find(r=>r.id===id);ownerView()};
async function togRest(id,v){await sb.from('restaurants').update({active:v}).eq('id',id);boot()}
/* ---------- Owner ---------- */
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const dayR=(d,n=1)=>{const a=new Date(d+'T00:00:00'),b=new Date(a);b.setDate(b.getDate()+n);return[a.toISOString(),b.toISOString()]};
const sum=(a,f=x=>x.total)=>a.reduce((s,x)=>s+Number(f(x)),0);
const getBills=async(a,b)=>(await sb.from('bills').select('*').eq('rid',R.id).gte('created_at',a).lt('created_at',b).order('created_at',{ascending:false})).data||[];
const modes=bs=>['Cash','UPI','Card','Udhaar'].map(m=>`<div class="row"><div class="grow">${m}</div><b>${money(sum(bs.filter(b=>b.mode===m)))}</b></div>`).join('');
const FE=[[/vada\s?pav|wada\s?pav|वडा\s?पाव|burger/,'🍔'],[/pav\s?bhaji|पाव\s?भाजी/,'🍛'],[/misal|मिसळ|soup|सूप|rasam/,'🍲'],[/biryani|biriyani|बिर्याणी|pulao|पुलाव|curry|gravy|dal\b|डाळ|paneer|पनीर|sabzi|भाजी|kadai|korma|thali|थाळी/,'🍛'],[/pizza|पिझ्झा/,'🍕'],[/sandwich|सँडविच|toast/,'🥪'],[/fries|french|chips|वेफर/,'🍟'],[/momo|samosa|समोसा|dumpling|kachori|कचोरी/,'🥟'],[/noodle|chowmein|chow mein|hakka|maggi|pasta|मॅगी/,'🍜'],[/manchurian|machurian/,'🥡'],[/dosa|डोसा|uttapam|pancake|उत्तपा/,'🥞'],[/idli|इडली|poha|पोहे|upma|उपमा|rice|भात|khichdi|खिचडी|sheera/,'🍚'],[/chicken|tandoori|tikka|kebab|kabab|चिकन|wings/,'🍗'],[/mutton|मटण|keema|lamb/,'🍖'],[/fish|मासे|prawn|कोळंबी|surmai|pomfret/,'🐟'],[/egg|अंडे|anda|omelet|omelette/,'🍳'],[/roti|chapati|chapatti|bhakri|भाकरी|पोळी|paratha|पराठा|kulcha|naan|puri\b|पुरी/,'🫓'],[/bread|bun|pav\b|पाव|slice/,'🍞'],[/pani\s?puri|पाणीपुरी|chaat|चाट|bhel|भेळ|sev/,'🥙'],[/salad|सलाड|कोशिंबीर/,'🥗'],[/tea|chai|चहा/,'🍵'],[/coffee|कॉफी|cappuccino|latte/,'☕'],[/beer|बिअर/,'🍺'],[/water|पाणी/,'💧'],[/lassi|लस्सी|shake|juice|ज्यूस|lemon|nimbu|सरबत|sharbat|soda|cola|pepsi|coke|thums|sprite|cold\s?drink|drink|mojito|ताक|buttermilk/,'🥤'],[/ice\s?cream|आईस्क्रीम|kulfi|कुल्फी|falooda|sundae/,'🍨'],[/cake|केक|pastry|brownie|cookie/,'🍰'],[/gulab|गुलाब|jalebi|जिलेबी|halwa|हलवा|rasmalai|laddu|लाडू|barfi|sweet|मिठाई|kheer|खीर|shrikhand|श्रीखंड/,'🍮'],[/corn|भुट्टा|bhutta/,'🌽'],[/mushroom/,'🍄'],[/popcorn/,'🍿'],[/chocolate|चॉकलेट/,'🍫']];
const foodEmoji=n=>{const s=String(n||'').toLowerCase();for(const[r,e]of FE)if(r.test(s))return e;return'🍽️'};
const vd=m=>`<i class="vd ${m.veg===false?'nv':'v'}"></i>`;
let P='home',HD=ymd(new Date()),BL=[];
function drawer(v){$('dr').classList.toggle('open',!!v);$('ov').classList.toggle('hidden',!v)}
const NAV=[['home','🏠','Home'],['orders','🧾','Orders'],['menu','📖','Menu'],['history','🕘','History']];
const DR=[['Reports',[['history','🕘','History'],['closing','🔒','Day Closing'],['sales','📊','Sales Report'],['gst','🧾','GST Settings'],['gstrep','📑','GST Summary']]],['Menu',[['menu','＋','Add / Edit Items']]],['Tables & Staff',[['qr','🪑','QR Codes'],['staff','👥','Staff']]]];
function oShell(){view(`<header class="topbar"><button class="icon" onclick="drawer(1)" aria-label="Menu">☰</button><img class="mini" src="logo.png" alt="SJ"><div class="topname">${esc(R.name)}</div><button class="icon logout" onclick="logout()" aria-label="Log out">⇥</button></header><div class="overlay hidden" id="ov" onclick="drawer(0)"></div><aside class="drawer" id="dr"><div class="drawerhead"><span>${esc(R.name)}</span><button class="icon" onclick="drawer(0)" aria-label="Close">×</button></div>${DR.map(s=>`<div class="sidehead">${s[0]}</div>`+s[1].map(i=>`<button class="navlink" onclick="go('${i[0]}')"><span class="navicon">${i[1]}</span>${i[2]}</button>`).join('')).join('')}${window._adm?'<div class="sidehead">Admin</div><button class="navlink" onclick="boot()"><span class="navicon">⬅</span>Back to Super Admin</button>':''}</aside><main class="content"><div id="pg"></div></main><nav class="bottom">${NAV.map(n=>`<button class="${n[0]===P?'active':''}" onclick="go('${n[0]}')"><b>${n[1]}</b>${n[2]}</button>`).join('')}</nav>`)}
const ownerView=()=>go('home');
async function go(p){P=p;oShell();$('pg').innerHTML='<div class="empty">Loading…</div>';try{await PG[p]()}catch(e){console.error(e);$('pg').innerHTML='<div class="panel empty">Could not load. Check your connection.</div>'}}
const hd=n=>{const d=new Date(HD+'T00:00:00');d.setDate(d.getDate()+n);HD=ymd(d);go('history')};
const PG={
home:async()=>{const t=ymd(new Date()),[a,b]=dayR(t),bs=await getBills(a,b),{data:os}=await sb.from('orders').select('status').eq('rid',R.id).gte('created_at',a),h=new Date().getHours(),live=(os||[]).filter(o=>['new','preparing','ready'].includes(o.status)).length;
 $('pg').innerHTML=`<div class="welcome"><div><div class="eyebrow">${h<12?'Good morning':h<17?'Good afternoon':'Good evening'}</div><h2>${esc(R.name)}</h2><p>Here is your restaurant overview.</p></div><div class="welcomeicon">🍽️</div></div><div class="stats" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="stat"><div class="statlabel">Today's sales</div><div class="statvalue">${money(sum(bs))}</div><div class="statfoot">${bs.length} bills</div></div><div class="stat"><div class="statlabel">Live orders</div><div class="statvalue">${live}</div><div class="statfoot">${(os||[]).length} orders today</div></div></div><div class="inline" style="margin:10px 0"><button class="btn green" style="flex:1" onclick="go('orders')">🧾 Live orders</button><button class="btn" style="flex:1" onclick="go('closing')">🔒 Day closing</button></div><div class="sectionhead"><h3>Quick actions</h3><span>Shortcuts</span></div><div class="actions">${[['menu','📖','My Menu'],['menu','＋','Add Item'],['sales','📊','Reports'],['history','🕘','History']].map(x=>`<button class="action" onclick="go('${x[0]}')"><span class="actionicon">${x[1]}</span>${x[2]}</button>`).join('')}</div>`},
orders:async()=>{const[a]=dayR(ymd(new Date()));const{data}=await sb.from('orders').select('*').eq('rid',R.id).gte('created_at',a).order('created_at',{ascending:false});const o=data||[];
 $('pg').innerHTML=`<h1 class="page-title">Orders</h1>`+(o.map(x=>`<article class="ordercard"><div class="orderhead"><strong>${tn(x.tbl)} · ${new Date(x.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</strong><span class="pill ${x.status}">${x.status}</span></div><div class="orderitems">${x.items.map(i=>`${esc(i.name)} × ${i.qty}`).join('<br>')}${x.note?`<br><small>Note: ${esc(x.note)}</small>`:''}</div><div class="totalrow"><span>${x.bill_id?'Paid ✓':'Unpaid'}</span><span>${money(x.total)}</span></div></article>`).join('')||'<div class="panel empty">No orders yet today.</div>')},
menu:async()=>{const{data}=await sb.from('menu').select('*').eq('rid',R.id).order('cat');(data||[]).filter(m=>m.emoji==='🍽️'&&foodEmoji(m.name)!=='🍽️').forEach(m=>{m.emoji=foodEmoji(m.name);sb.from('menu').update({emoji:m.emoji}).eq('id',m.id).then(()=>{})});
 $('pg').innerHTML=`<h1 class="page-title">Menu</h1><button class="btn" style="width:100%;margin-bottom:12px" onclick="openScan()">📷 Scan Menu Card</button><div class="fw" style="margin-bottom:12px"><input id="ms" placeholder="Search item…"></div>${(data||[]).map(m=>`<div class="row mi" data-n="${esc(m.name.toLowerCase())}"><span class="emoji">${esc(m.emoji)}</span><div class="grow">${vd(m)}<b>${esc(m.name)}</b><br><small>${esc(m.cat)} · ${m.sizes&&m.sizes.length?m.sizes.map(s=>esc(s.n)+' '+money(s.p)).join(' / '):money(m.price)}</small></div><button class="btn ${m.available?'green':'gray'}" onclick='mAv("${m.id}",${!m.available})'>${m.available?'In stock':'Sold out'}</button><button class="btn red" onclick='mDel("${m.id}")' aria-label="Delete">✕</button></div>`).join('')}<section class="panel"><h3 style="margin:0 0 12px">Add item</h3><form id="mf" class="inline"><input class="field" name="e" value="🍽️" style="max-width:70px"><input class="field" name="n" placeholder="Item name" required><input class="field" name="p" type="number" min="0" placeholder="Price" required><input class="field" name="c" placeholder="Category" value="Main Course"><input class="field" name="z" placeholder="Sizes (optional) Half:80, Full:150"><select class="field" name="v"><option value="1">Veg</option><option value="0">Non-veg</option></select><button class="btn">Add</button></form></section>`;
 const fm=$('mf').elements,fe=fm.e,fn=fm.n;fe.dataset.auto='1';fe.oninput=()=>{delete fe.dataset.auto};fn.oninput=()=>{if(fe.dataset.auto)fe.value=foodEmoji(fn.value)};
 $('ms').oninput=e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.mi').forEach(x=>x.style.display=x.dataset.n.includes(q)?'':'none')};
 $('mf').onsubmit=async e=>{e.preventDefault();const d=new FormData(e.target);const{error}=await sb.from('menu').insert({rid:R.id,emoji:(d.get('e').trim()&&d.get('e')!=='🍽️')?d.get('e').trim():foodEmoji(d.get('n')),name:d.get('n').trim(),price:+d.get('p'),cat:d.get('c').trim()||'Menu',veg:d.get('v')==='1',...parseSizes(d.get('z'))});if(error)return toast(error.message);go('menu')}},
history:async()=>{const[a,b]=dayR(HD);BL=await getBills(a,b);
 $('pg').innerHTML=`<h1 class="page-title">History</h1><div class="inline" style="margin-bottom:12px;flex-wrap:nowrap"><button class="btn gray" onclick="hd(-1)" aria-label="Previous day">‹</button><input class="field" type="date" value="${HD}" onchange="HD=this.value||HD;go('history')"><button class="btn gray" onclick="hd(1)" aria-label="Next day">›</button></div><div class="stats" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="stat"><div class="statlabel">Sales</div><div class="statvalue">${money(sum(BL))}</div></div><div class="stat"><div class="statlabel">Bills</div><div class="statvalue">${BL.length}</div></div></div>`+(BL.map((x,i)=>`<button class="row" style="width:100%;color:inherit;text-align:left" onclick="billSheet(BL[${i}],R.name)"><div class="grow"><b>${tn(x.tbl)}</b><br><small>${new Date(x.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · ${esc(x.mode)}</small></div><b>${money(x.total)}</b></button>`).join('')||'<div class="panel empty">No records for this day.</div>')},
sales:async()=>{const n=+(window._rg||1),end=new Date(),st=new Date();end.setDate(end.getDate()+1);st.setDate(st.getDate()-(n-1));const bs=await getBills(dayR(ymd(st))[0],dayR(ymd(end))[0]),top={};
 bs.forEach(b=>(b.items||[]).forEach(i=>{top[i.name]=(top[i.name]||0)+i.qty}));const tl=Object.entries(top).sort((x,y)=>y[1]-x[1]).slice(0,5);
 $('pg').innerHTML=`<h1 class="page-title">Sales Report</h1><div class="tabs">${[[1,'Today'],[7,'7 days'],[30,'30 days']].map(r=>`<button class="${r[0]===n?'on':''}" onclick="window._rg=${r[0]};go('sales')">${r[1]}</button>`).join('')}</div><div class="stats" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="stat"><div class="statlabel">Sales</div><div class="statvalue">${money(sum(bs))}</div></div><div class="stat"><div class="statlabel">Bills</div><div class="statvalue">${bs.length}</div></div></div><div class="sectionhead"><h3>By payment</h3></div>${modes(bs)}<div class="sectionhead"><h3>Best sellers</h3></div>${tl.map((t,i)=>`<div class="row"><div class="grow">${i+1}. ${esc(t[0])}</div><b>${t[1]} sold</b></div>`).join('')||'<div class="panel empty">No sales yet.</div>'}`},
closing:async()=>{const[a,b]=dayR(ymd(new Date())),bs=await getBills(a,b),cash=sum(bs.filter(x=>x.mode==='Cash'));
 $('pg').innerHTML=`<h1 class="page-title">Day Closing</h1><div class="stat"><div class="statlabel">Total sales today</div><div class="statvalue">${money(sum(bs))}</div><div class="statfoot">${bs.length} bills</div></div><div class="sectionhead"><h3>By payment</h3></div>${modes(bs)}<section class="panel"><label class="label">Cash counted in drawer (₹)</label><input class="field" id="cc" type="number" min="0" inputmode="numeric" placeholder="0"><div class="totalrow"><span>Difference</span><span id="df">—</span></div></section>`;
 $('cc').oninput=e=>{const d=(+e.target.value)-cash;$('df').textContent=e.target.value===''?'—':d===0?'Matches ✓':(d>0?'+':'−')+money(Math.abs(d));$('df').style.color=d===0?'var(--leaf)':'var(--red-text)'}},
staff:async()=>{const{data}=await sb.from('staff').select('*').eq('rid',R.id);
 $('pg').innerHTML=`<h1 class="page-title">Staff</h1>`+(data||[]).map(s=>`<div class="row"><div class="grow"><b>${esc(s.name)}</b><br><small>${s.role} · PIN ${esc(s.pin)}</small></div><button class="btn red" onclick='sDel("${s.id}")' aria-label="Remove">✕</button></div>`).join('')+`<section class="panel"><h3 style="margin:0 0 12px">Add staff</h3><form id="sf" class="inline"><input class="field" name="n" placeholder="Name" required><input class="field" name="p" inputmode="numeric" pattern="[0-9]{4,6}" placeholder="PIN (4–6 digits)" required><select class="field" name="r"><option value="chef">Chef</option><option value="waiter">Waiter</option></select><button class="btn">Add</button></form><p class="note">Staff sign in with Shop Name <b>${esc(R.code)}</b> and their PIN.</p></section>`;
 $('sf').onsubmit=async e=>{e.preventDefault();const d=new FormData(e.target);const{error}=await sb.from('staff').insert({rid:R.id,name:d.get('n').trim(),pin:d.get('p').trim(),role:d.get('r')});if(error)return toast(error.code==='23505'?'This PIN is already used.':error.message);go('staff')}},
qr:async()=>{const base=location.origin+location.pathname;
 $('pg').innerHTML=`<h1 class="page-title">QR Codes</h1><div class="grid">${Array.from({length:R.tables},(_,i)=>{const u=`${base}?r=${encodeURIComponent(R.code)}&t=${i+1}`;return`<div class="qrc"><img alt="QR table ${i+1}" src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(u)}">Table ${i+1}</div>`}).join('')}</div><p class="note">A copied QR is useless from home: ordering needs the table PIN your waiter gives.</p><button class="btn" style="margin-top:10px" onclick="print()">Print QR codes</button>`}};
async function mAv(id,v){await sb.from('menu').update({available:v}).eq('id',id);go('menu')}
async function mDel(id){
  $('sheet').innerHTML = `<div class="sheetbox">
    <h3 style="margin:0 0 8px">Delete item?</h3>
    <p class="note" style="text-align:left">This will permanently remove the item from the menu.</p>
    <div class="popup-actions">
      <button class="btn red" id="delok">Delete</button>
      <button class="btn gray" onclick="$('sheet').innerHTML=''">Cancel</button>
    </div>
  </div>`;
  $('delok').onclick = async () => {
    await sb.from('menu').delete().eq('id', id);
    $('sheet').innerHTML = '';
    go('menu');
  };
}
async function sDel(id){
  $('sheet').innerHTML = `<div class="sheetbox">
    <h3 style="margin:0 0 8px">Remove staff?</h3>
    <p class="note" style="text-align:left">This will remove the staff member's access.</p>
    <div class="popup-actions">
      <button class="btn red" id="delok">Remove</button>
      <button class="btn gray" onclick="$('sheet').innerHTML=''">Cancel</button>
    </div>
  </div>`;
  $('delok').onclick = async () => {
    await sb.from('staff').delete().eq('id', id);
    $('sheet').innerHTML = '';
    go('staff');
  };
}
function billSheet(b,name){const m={};(b.items||[]).forEach(i=>{const k=i.name+'|'+i.price;m[k]=m[k]||{...i,qty:0};m[k].qty+=i.qty});const L=Object.values(m),when=new Date(b.created_at).toLocaleString();
 const txt=`*${name}*\nTable ${b.tbl} · ${when}\n`+L.map(i=>`${i.name} x${i.qty} = ${money(i.price*i.qty)}`).join('\n')+`\nDiscount: ${money(b.discount)}\n*Total: ${money(b.total)}* (${b.mode})\nThank you, visit again!`;
 $('sheet').innerHTML=`<div class="sheetbox"><h3 style="margin:0">${esc(name)}</h3><small>Table ${esc(b.tbl)} · ${when}</small><div style="margin:12px 0">${L.map(i=>`<div class="row" style="margin:4px 0"><div class="grow">${esc(i.name)} × ${i.qty}</div><b>${money(i.price*i.qty)}</b></div>`).join('')}</div><div class="totalrow" style="font-size:14px;font-weight:600"><span>Discount</span><span>${money(b.discount)}</span></div><div class="totalrow"><span>Total · ${esc(b.mode)}</span><span>${money(b.total)}</span></div><div class="orderactions" style="margin-top:14px"><button class="btn" onclick="print()">Print</button><a class="btn green" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">WhatsApp</a><button class="btn gray" onclick="$('sheet').innerHTML=''">Close</button></div></div>`}
/* ---------- Staff (Chef / Waiter) ---------- */
async function staffView(){
 const draw=async()=>{if(!S)return;let d;try{d=await rpc('staff_orders',{c:S.c,p:S.p})}catch(e){return}if(!d)return logout();
  window._d=d;kotWatch(d);const chef=S.role==='chef',os=d.orders,card=(o,btns)=>`<article class="ordercard"><div class="orderhead"><strong>${tn(o.tbl)}</strong><span class="pill ${o.status}">${o.status}</span></div><div class="orderitems">${o.items.map(i=>`<b>${i.qty}×</b> ${esc(i.name)}`).join('<br>')}${o.note?`<br><small>Note: ${esc(o.note)}</small>`:''}</div><div class="orderactions">${btns}</div></article>`;
  const b=(o,st,l,c='green')=>`<button class="btn ${c}" onclick="setSt('${o.id}','${st}')">${l}</button>`;
  let h=`<h1 class="page-title">${chef?'Kitchen':'Floor'}</h1><button class="btn gray" style="margin-bottom:10px" onclick="${chef?'chime':'bell'}()">🔊 Test sound</button>`;
  if(chef){const k=os.filter(o=>['new','preparing'].includes(o.status));h+=k.map(o=>card(o,(o.status==='new'?b(o,'preparing','Start preparing')+b(o,'cancelled','Cancel','red'):b(o,'ready','Mark ready'))+`<button class="btn gray" onclick="kotPrint('${o.id}')">🖨 KOT</button>`)).join('')||'<div class="panel empty">No orders in the kitchen.</div>'}
  else{h+=(d.calls.length?`<div class="sectionhead"><h3>🔔 Calls</h3></div>`+d.calls.map(c=>`<div class="row"><div class="grow"><b>Table ${esc(c.tbl)}</b> needs you</div><button class="btn green" onclick="callDone('${c.id}')">Done</button></div>`).join(''):'')
   +`<div class="sectionhead"><h3>Ready to serve</h3></div>`+(os.filter(o=>o.status==='ready').map(o=>card(o,b(o,'served','Mark served'))).join('')||'<div class="panel empty">Nothing ready yet.</div>')
   +`<div class="sectionhead"><h3>Tables</h3><span>Open a table to get its PIN</span></div>${floorGrid(d,i=>{const t=String(i+1),s=d.sessions.find(x=>x.tbl===t),u=os.some(o=>o.tbl===t&&!o.bill_id);return`<div class="tbl ${s?'busy':''}"><b>${t}</b>${s?`<div class="pin">${s.pin}</div>`:''}${u&&(!d.me||d.me.can_bill!==false)?`<button class="btn green" onclick="payUI('${t}')">Bill</button>`:''}${s?`<button class="btn gray" onclick="tblClose('${t}')">Close</button>`:`<button class="btn" onclick="tblOpen('${t}')">Open</button>`}</div>`})}`}
  shell(S.rname+' · '+S.name,h)};
 clearInterval(poll);await draw();poll=setInterval(()=>{if(!document.hidden)draw()},S.role==='chef'?5000:10000);window._draw=draw}
async function setSt(id,st){await rpc('staff_set',{c:S.c,p:S.p,oid:id,st});_draw()}
async function callDone(id){await rpc('call_done',{c:S.c,p:S.p,cid:id});_draw()}
async function tblOpen(t){await rpc('open_table',{c:S.c,p:S.p,t});_draw()}
function payUI(t){const os=_d.orders.filter(o=>o.tbl===t&&!o.bill_id),sub=sum(os);$('sheet').innerHTML=`<div class="sheetbox"><h3 style="margin:0 0 10px">Table ${esc(t)} · Bill</h3>${os.map(o=>o.items.map(i=>`<div class="row" style="margin:4px 0"><div class="grow">${esc(i.name)} × ${i.qty}</div><b>${money(i.price*i.qty)}</b></div>`).join('')).join('')}<div class="totalrow"><span>Subtotal</span><span>${money(sub)}</span></div><label class="label" style="margin-top:12px">Discount (₹)</label><input class="field" id="dsc" type="number" min="0" value="0" inputmode="numeric"><div class="label">Collect payment</div><div class="orderactions">${['Cash','UPI','Card'].map(m=>`<button class="btn green" onclick="payTable('${t}','${m}')">${m}</button>`).join('')}<button class="btn gray" onclick="$('sheet').innerHTML=''">Cancel</button></div></div>`}
async function payTable(t,m){try{const b=await rpc('pay_table',{c:S.c,p:S.p,t,mode:m,disc:+$('dsc').value||0});billSheet(b,S.rname);_draw()}catch(e){}}
async function tblClose(t){await rpc('close_table',{c:S.c,p:S.p,t});_draw()}
/* ---------- Customer (QR) ---------- */
async function customerView(code,t){
 const info=await rpc('rest_info',{c:code});if(!info)return view('<div class="login-wrap"><h1>Restaurant not found</h1></div>');
 const menu=expandSizes(await rpc('get_menu',{c:code}));let cart={},pin='',checkout=false,oid=null;
 const cnt=()=>Object.values(cart).reduce((a,b)=>a+b,0),tot=()=>menu.reduce((a,m)=>a+(cart[m.id]||0)*m.price,0);
 const draw=()=>{
  if(checkout){shell(info.name,`<h1 class="page-title">Your order · Table ${esc(t)}</h1>${menu.filter(m=>cart[m.id]).map(m=>`<div class="row"><div class="grow"><b>${esc(m.name)}</b><br><small>${money(m.price)} × ${cart[m.id]}</small></div><b>${money(m.price*cart[m.id])}</b></div>`).join('')}<div class="totalrow"><span>Total</span><span>${money(tot())}</span></div><section class="panel" style="margin-top:16px"><label class="label">Table PIN (ask your waiter)</label><input class="field" id="pin" inputmode="numeric" maxlength="4" value="${pin}" placeholder="4-digit PIN"><label class="label">Note (optional)</label><input class="field" id="nt" maxlength="200" placeholder="Less spicy, no onion…"><button class="primary" id="go">Place order</button><button class="btn gray" style="width:100%;margin-top:10px" id="bk">Back to menu</button></section>`);
   $('bk').onclick=()=>{checkout=false;draw()};
   $('go').onclick=async()=>{pin=$('pin').value.trim();if(pin.length!==4)return toast('Enter the 4-digit table PIN.');try{oid=await rpc('place_order',{c:code,t,p:pin,its:menu.filter(m=>cart[m.id]).map(m=>({id:m.rid||m.id,sz:m.sz||'',qty:cart[m.id]})),nt:$('nt').value});cart={};checkout=false;track()}catch(e){}};return}
  const cats=[...new Set(menu.map(m=>m.cat))];
  shell(info.name,`<h1 class="page-title">Table ${esc(t)} · Menu</h1>${cats.map(c=>`<div class="cat">${esc(c)}</div>`+menu.filter(m=>m.cat===c).map(m=>`<div class="row"><span class="emoji">${esc(m.emoji)}</span><div class="grow">${vd(m)}<b>${esc(m.name)}</b><br><small>${money(m.price)}</small></div><div class="qty"><button onclick="chg('${m.id}',-1)" aria-label="Remove">−</button><b>${cart[m.id]||0}</b><button onclick="chg('${m.id}',1)" aria-label="Add">+</button></div></div>`).join('')).join('')}<div style="height:90px"></div>${cnt()?`<button class="cartbar" onclick="goCk()"><span>${cnt()} items</span><span>View order · ${money(tot())}</span></button>`:''}`)};
 window.chg=(id,d)=>{cart[id]=Math.max(0,(cart[id]||0)+d);draw()};window.goCk=()=>{checkout=true;draw()};
 let pl;const track=()=>{clearInterval(pl);const L=['new','preparing','ready','served'],N={new:'Order received',preparing:'Being prepared',ready:'Ready — coming to your table',served:'Served. Enjoy your meal!',cancelled:'Order cancelled'};
  const up=async()=>{let st;try{st=await rpc('order_status',{oid})}catch(e){return}const i=L.indexOf(st);if(st==='served'||st==='cancelled')clearInterval(pl);
   shell(info.name,`<h1 class="page-title">${N[st]||st}</h1><div class="steps">${L.map((s,j)=>`<i class="${j<=i?'on':''}"></i>`).join('')}</div><button class="btn" style="width:100%;margin-bottom:10px" id="bell">🔔 Call waiter</button><button class="btn gray" style="width:100%" id="more">Order more</button>`);
   $('bell').onclick=async()=>{try{await rpc('ring',{c:code,t,p:pin});toast('Waiter is on the way.')}catch(e){}};$('more').onclick=()=>{clearInterval(pl);draw()}};
  up();pl=setInterval(()=>{if(!document.hidden)up()},8000)};
 draw()}
/* ---------- Start ---------- */
const qp=new URLSearchParams(location.search);
if(qp.get('r')&&qp.get('t'))customerView(qp.get('r').toLowerCase(),qp.get('t'));else boot();
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S&&window._draw)_draw()});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
