const CACHE='liftlog-v0.8.0';
const ASSETS=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon-192.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.open(CACHE).then(c=>caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE&&caches.delete(k))))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{let y=x.clone();caches.open(CACHE).then(c=>c.put(e.request,y));return x}).catch(()=>caches.match('./index.html')))));
