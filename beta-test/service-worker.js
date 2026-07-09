const CACHE='mobud-beta-v0-000-008-hotfix3';
const V='0.000.008-hotfix3';
const ASSETS=['./','./index.html','./styles.css?v='+V,'./app.js?v='+V,'./config.js?v='+V,'./i18n.js?v='+V,'./manifest.json','./content/faq.json','./content/mobility-providers.json','./icon-192-v005.png','./icon-512-v005.png','./icon-maskable-512-v005.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html'))))});
