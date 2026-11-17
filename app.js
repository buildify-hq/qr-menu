const $=s=>document.querySelector(s),A=$('#app'),Q=new URLSearchParams(location.search),H=location.hash.slice(1);
const db=window.supabase.createClient(CFG.URL||'http://x.co',CFG.KEY||'x');
const E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const beep=()=>{try{const c=new AudioContext(),o=c.createOscillator();o.connect(c.destination);o.frequency.value=880;o.start();setTimeout(()=>{o.stop();c.close()},500)}catch(e){}};
const say=t=>{try{const u=new SpeechSynthesisUtterance(t);u.lang='mr-IN';speechSynthesis.speak(u)}catch(e){}};
const ST={new:'नवीन',accepted:'स्वीकारली',ready:'तयार',served:'सर्व्ह झाली',cancelled:'रद्द',done:'पूर्ण'};
const sum=o=>o.items.reduce((a,i)=>a+i.p*i.q,0);
const live=(rid,fn)=>db.channel('l'+Math.random()).on('postgres_changes',{event:'*',schema:'public',table:'orders',filter:'rid=eq.'+rid},p=>fn('o',p)).on('postgres_changes',{event:'*',schema:'public',table:'calls',filter:'rid=eq.'+rid},p=>fn('c',p)).subscribe();
const oc=(o,b='')=>`<div class=card><b>टेबल ${E(o.tbl)}</b> <span class=tag>${ST[o.status]}</span><div>${o.items.map(i=>`${i.e} ${E(i.n)} × ${i.q}`).join('<br>')}</div>${o.note?`<i>📝 ${E(o.note)}</i>`:''}<div class=r>₹${sum(o)} ${b}</div></div>`;
const setS=async(id,s)=>{await db.from('orders').update({status:s}).eq('id',id)};
const done=async id=>{await db.from('calls').update({done:true}).eq('id',id)};

let R,M=[],C={},TB,MY=[],note='';
async function cust(){
 const {data}=await db.from('restaurants').select('*').eq('code',Q.get('r')).maybeSingle();
 if(!data||!data.active)return A.innerHTML='<p class=c>रेस्टॉरंट उपलब्ध नाही</p>';
 R=data;TB=Q.get('t');M=(await db.from('menu').select('*').eq('rid',R.id).order('cat')).data||[];
 live(R.id,()=>myo());await myo()}
async function myo(){MY=(await db.from('orders').select('*').eq('rid',R.id).eq('tbl',TB).not('status','in','(done,cancelled)').order('created_at')).data||[];draw()}
const card=m=>`<div class="card m ${m.available?'':'off'}"><div class=e>${m.emoji}</div><b>${E(m.name)}</b><div>₹${m.price}</div>${!m.available?'<small>उपलब्ध नाही</small>':C[m.id]?`<div class=q><button onclick="add('${m.id}',-1)">−</button><b>${C[m.id]}</b><button onclick="add('${m.id}',1)">+</button></div>`:`<button class=p onclick="add('${m.id}',1)">जोडा</button>`}</div>`;
function add(id,d){C[id]=Math.max(0,(C[id]||0)+d);if(!C[id])delete C[id];draw()}
function draw(){
 const n=Object.values(C).reduce((a,b)=>a+b,0),tot=M.reduce((a,m)=>a+(C[m.id]||0)*m.price,0),F=R.features;
 A.innerHTML=`<header>${E(R.name)}<span>टेबल ${E(TB)}</span></header>`
 +(MY.length&&F.track!==false?'<h3>तुमच्या ऑर्डर</h3>'+MY.map(o=>oc(o)).join(''):'')
 +[...new Set(M.map(m=>m.cat))].map(c=>`<h3>${E(c)}</h3><div class=grid>${M.filter(m=>m.cat===c).map(card).join('')}</div>`).join('')
 +(F.bell!==false?'<button class=bell onclick=bell()>🔔</button>':'')
 +(n?`<div class=bar><input placeholder="सूचना (कमी तिखट…)" value="${E(note)}" oninput="note=this.value"><button class=p onclick=place()>ऑर्डर द्या · ${n} · ₹${tot}</button></div>`:'')}
async function place(){const items=M.filter(m=>C[m.id]).map(m=>({n:m.name,e:m.emoji,p:m.price,q:C[m.id]}));
 const {error}=await db.from('orders').insert({rid:R.id,tbl:TB,items,note,status:'new'});
 if(error)return alert('ऑर्डर गेली नाही, पुन्हा प्रयत्न करा');C={};note='';await myo();alert('ऑर्डर पाठवली ✅')}
async function bell(){await db.from('calls').insert({rid:R.id,tbl:TB});alert('वेटरला बोलावले 🔔')}

function staffLogin(role){A.innerHTML=`<div class=c><h2>${role=='chef'?'👨‍🍳 शेफ':'🧑‍🍽️ वेटर'} लॉगिन</h2><input id=co placeholder="रेस्टॉरंट कोड"><input id=pn type=password placeholder="PIN"><button class=p onclick="sLogin('${role}')">लॉगिन</button></div>`}
async function sLogin(role){const {data}=await db.rpc('staff_login',{c:$('#co').value.trim(),p:$('#pn').value.trim(),r:role});
 if(!data)return alert('चुकीचा कोड किंवा PIN');beep();staffScr(data.rid,role,data.name)}
let RID,ROLE,NAME,ON=true,OR=[],CL=[];
async function staffScr(rid,role,name){RID=rid;ROLE=role;NAME=name;
 live(rid,(k,p)=>{if(ON){const n=p.new||{};
  if(k=='o'&&p.eventType=='INSERT'&&ROLE=='chef'){beep();say('टेबल '+n.tbl+' वर नवीन ऑर्डर आहे')}
  if(k=='o'&&p.eventType=='UPDATE'&&n.status=='ready'&&ROLE=='waiter'){beep();say('टेबल '+n.tbl+' ची ऑर्डर तयार आहे')}
  if(k=='c'&&p.eventType=='INSERT'&&ROLE=='waiter'){beep();say('टेबल '+n.tbl+' वर बोलावत आहेत')}}
  sload()});await sload()}
async function sload(){
 OR=(await db.from('orders').select('*').eq('rid',RID).in('status',ROLE=='chef'?['new','accepted']:['ready']).order('created_at')).data||[];
 CL=ROLE=='chef'?[]:(await db.from('calls').select('*').eq('rid',RID).eq('done',false)).data||[];
 const btn=o=>ROLE=='chef'?(o.status=='new'?`<button class=x onclick="setS('${o.id}','cancelled')">नाकारा</button><button class=g onclick="setS('${o.id}','accepted')">स्वीकारा</button>`:`<button class=g onclick="setS('${o.id}','ready')">तयार</button>`):`<button class=g onclick="setS('${o.id}','served')">सर्व्ह झाली</button>`;
 A.innerHTML=`<header>${ROLE=='chef'?'👨‍🍳 शेफ':'🧑‍🍽️ वेटर'} · ${E(NAME)}<button class="${ON?'g':'x'}" onclick="ON=!ON;sload()">${ON?'ON':'OFF'}</button></header>`
 +(ON?(CL.map(c=>`<div class=card>🔔 टेबल ${E(c.tbl)} बोलावत आहे <button class=g onclick="done('${c.id}')">झाले</button></div>`).join('')+OR.map(o=>oc(o,btn(o))).join(''))||'<p class=c>ऑर्डर नाही</p>':'<p class=c>OFF — सूचना बंद</p>')}

function ownerLogin(adm){A.innerHTML=`<div class=c><h2>${adm?'Super Admin':'ओनर'} लॉगिन</h2><input id=em type=email placeholder="name@hotel.com"><input id=pw type=password placeholder="पासवर्ड"><button class=p onclick="oLogin(${adm})">लॉगिन</button> <button onclick="oSign()">नवीन खाते</button></div>`}
async function oLogin(adm){const {error}=await db.auth.signInWithPassword({email:$('#em').value,password:$('#pw').value});if(error)return alert(error.message);beep();adm?adminScr():ownScr()}
async function oSign(){const {error}=await db.auth.signUp({email:$('#em').value,password:$('#pw').value});alert(error?error.message:'खाते तयार झाले. आता लॉगिन करा')}
let RS,TAB='o';
async function ownScr(){
 const u=(await db.auth.getUser()).data.user;
 RS=(await db.from('restaurants').select('*').eq('owner_email',u.email).maybeSingle()).data;
 if(!RS)return A.innerHTML='<p class=c>या ईमेलला रेस्टॉरंट जोडलेले नाही. Super Admin शी संपर्क करा.</p>';
 live(RS.id,(k,p)=>{if(p.eventType=='INSERT'){beep();say('टेबल '+p.new.tbl+(k=='c'?' बोलावत आहे':' वर नवीन ऑर्डर'))}if(TAB=='o')opaint()});opaint()}
async function opaint(){
 let b='';const id=RS.id;
 if(TAB=='o'){const o=(await db.from('orders').select('*').eq('rid',id).not('status','in','(done,cancelled)').order('created_at')).data||[];
  const c=(await db.from('calls').select('*').eq('rid',id).eq('done',false)).data||[];
  b=c.map(x=>`<div class=card>🔔 टेबल ${E(x.tbl)} <button class=g onclick="done('${x.id}')">झाले</button></div>`).join('')+(o.map(x=>oc(x,`<button onclick="setS('${x.id}','done')">टेबल बंद</button>`)).join('')||'<p class=c>सध्या ऑर्डर नाही</p>')}
 if(TAB=='m'){const m=(await db.from('menu').select('*').eq('rid',id).order('cat')).data||[];
  b=`<div class=card><input id=mn placeholder="पदार्थाचे नाव"><input id=me placeholder="इमोजी 🍛" maxlength=4><input id=mp type=number placeholder="किंमत"><input id=mc placeholder="कॅटेगरी (स्टार्टर)"><button class=p onclick=addM()>पदार्थ जोडा</button></div>`
  +m.map(x=>`<div class="card r">${x.emoji} ${E(x.name)} ₹${x.price} <small>${E(x.cat)}</small><button class="${x.available?'g':'x'}" onclick="tgM('${x.id}',${!x.available})">${x.available?'आहे':'नाही'}</button><button onclick="delM('${x.id}')">🗑</button></div>`).join('')}
 if(TAB=='s'){const s=(await db.from('staff').select('*').eq('rid',id)).data||[];
  b=`<div class=card><input id=sn placeholder="नाव"><input id=sp placeholder="PIN (4 अंक)" maxlength=6><select id=sr><option value=chef>शेफ</option><option value=waiter>वेटर</option></select><button class=p onclick=addS()>स्टाफ जोडा</button><p>लॉगिन: <b>${location.pathname}#chef</b> / <b>#waiter</b> · कोड: <b>${E(RS.code)}</b></p></div>`
  +s.map(x=>`<div class="card r">${E(x.name)} · ${x.role=='chef'?'शेफ':'वेटर'} · PIN ${E(x.pin)}<button onclick="delS('${x.id}')">🗑</button></div>`).join('')}
 if(TAB=='q'){b='<div class=c><button class=p onclick=print()>प्रिंट</button><br>';
  for(let i=1;i<=RS.tables;i++){const u=location.origin+location.pathname+`?r=${RS.code}&t=${i}`,q=qrcode(0,'M');q.addData(u);q.make();b+=`<div class=qr>${q.createImgTag(4)}<br><b>टेबल ${i}</b></div>`}b+='</div>'}
 A.innerHTML=`<header>${E(RS.name)}</header><nav>${[['o','ऑर्डर'],['m','मेनू'],['s','स्टाफ'],['q','QR']].map(t=>`<button class="${t[0]==TAB?'p':''}" onclick="TAB='${t[0]}';opaint()">${t[1]}</button>`).join('')}</nav>`+b}
const addM=async()=>{await db.from('menu').insert({rid:RS.id,name:$('#mn').value,emoji:$('#me').value||'🍽️',price:+$('#mp').value,cat:$('#mc').value||'मेनू'});opaint()};
const tgM=async(id,v)=>{await db.from('menu').update({available:v}).eq('id',id);opaint()};
const delM=async id=>{await db.from('menu').delete().eq('id',id);opaint()};
const addS=async()=>{await db.from('staff').insert({rid:RS.id,name:$('#sn').value,pin:$('#sp').value,role:$('#sr').value});opaint()};
const delS=async id=>{await db.from('staff').delete().eq('id',id);opaint()};

async function adminScr(){
 if(!(await db.rpc('is_admin')).data)return A.innerHTML='<p class=c>तुम्ही Super Admin नाही</p>';
 const r=(await db.from('restaurants').select('*').order('created_at')).data||[],N={bell:'बेल',track:'ट्रॅकिंग',waiter:'वेटर'};
 A.innerHTML=`<header>⚡ Super Admin</header><div class=card><input id=an placeholder="रेस्टॉरंट नाव"><input id=ac placeholder="कोड (hotel1)"><input id=ae placeholder="ओनर ईमेल"><input id=at type=number placeholder="टेबल संख्या"><button class=p onclick=addR()>रेस्टॉरंट जोडा</button></div>`
 +r.map(x=>`<div class=card><b>${E(x.name)}</b> <small>${E(x.code)} · ${E(x.owner_email)}</small><div class=r><button class="${x.active?'g':'x'}" onclick="tgR('${x.id}',${!x.active})">${x.active?'सुरू':'बंद'}</button>${Object.keys(N).map(f=>`<button class="${x.features[f]!==false?'g':'x'}" onclick="tgF('${x.id}','${f}')">${N[f]}</button>`).join('')}</div></div>`).join('')}
const addR=async()=>{await db.from('restaurants').insert({name:$('#an').value,code:$('#ac').value.trim(),owner_email:$('#ae').value.trim(),tables:+$('#at').value||10});adminScr()};
const tgR=async(id,v)=>{await db.from('restaurants').update({active:v}).eq('id',id);adminScr()};
async function tgF(id,f){const x=(await db.from('restaurants').select('features').eq('id',id).single()).data.features;x[f]=x[f]===false;await db.from('restaurants').update({features:x}).eq('id',id);adminScr()}

(async()=>{
 if(!CFG.URL)return A.innerHTML='<p class=c>config.js मध्ये Supabase URL आणि KEY टाका</p>';
 if(Q.get('r')&&Q.get('t'))return cust();
 const s=(await db.auth.getSession()).data.session;
 if(H=='chef'||H=='waiter')return staffLogin(H);
 if(H=='owner')return s?ownScr():ownerLogin(0);
 if(H=='admin')return s?adminScr():ownerLogin(1);
 A.innerHTML='<div class=c><h2>🍽️ QR Menu</h2><p><a href="#owner">ओनर</a> · <a href="#chef">शेफ</a> · <a href="#waiter">वेटर</a> · <a href="#admin">Super Admin</a></p></div>'})();
addEventListener('hashchange',()=>location.reload());
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
