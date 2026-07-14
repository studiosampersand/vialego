const CACHE='mobud-beta-v0.000.016-storage-safe-0174';
const V='0174';
const ASSETS=['./','./index.html','./styles.css?v='+V,'./app.js?v='+V,'./config.js?v='+V,'./i18n.js?v='+V,'./pdf-lib.min.js?v='+V,'./manifest.json','./content/faq.json','./content/mobility-providers.json','./faq/index.html','./faq/faq.css?v='+V,'./faq/faq.js?v='+V,'./icon-192-v005.png','./icon-512-v005.png','./icon-maskable-512-v005.png'];
const STATIC_PATHS=new Set(ASSETS.map(x=>new URL(x,self.registration.scope).pathname));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('mobud-beta-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){event.respondWith(fetch(req).catch(()=>caches.match('./index.html')));return;}
  if(!STATIC_PATHS.has(url.pathname))return;
  event.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(req,response.clone()));return response})));
});
