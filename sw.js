const V='v36';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!='GET'||!e.request.url.startsWith(self.location.origin))return;e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{const c=r.clone();caches.open(V).then(k=>k.put(e.request,c));return r}).catch(()=>caches.match(e.request)))});
