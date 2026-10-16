const CACHE_NAME='trinergy-pwa-v6.14.16';

// Keep initial install deliberately small for iPhone/Safari.
// Other pages/assets are cached on demand after first use.
const CORE_SHELL=[
  './',
  './index.html',
  './styles.css',
  './shared.js',
  './dashboard.js',
  './ferrari-f1-rosso-corsa.png',
  './manifest.webmanifest',
  './trinergy-app-icon-180-v6147.png',
  './trinergy-app-icon-192-v6147.png',
  './trinergy-app-icon-512-v6147.png'
];

self.addEventListener('message', event=>{
  if(event.data?.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', event=>{
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache=>{
      for(const url of CORE_SHELL){
        try{ await cache.add(url); }catch(e){}
      }
    })
  );
});

self.addEventListener('activate', event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', event=>{
  const req=event.request;
  if(req.method!=='GET') return;

  const url=new URL(req.url);

  // Supabase and external CDN must stay live; never put API responses in PWA cache.
  if(url.hostname.includes('supabase.co') || url.origin!==self.location.origin) return;

  // HTML navigation: network first, instant cache fallback.
  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req,{cache:'no-store'}).then(res=>{
        if(res && res.status===200){
          const copy=res.clone();
          caches.open(CACHE_NAME).then(c=>c.put(req,copy));
        }
        return res;
      }).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html')))
    );
    return;
  }

  // JS/CSS: network first so factory users get new code quickly; fallback to cache.
  if(/\.(?:js|css|json)(?:$|\?)/i.test(url.pathname+url.search)){
    event.respondWith(
      fetch(req,{cache:'no-store'}).then(res=>{
        if(res && res.status===200){
          const copy=res.clone();
          caches.open(CACHE_NAME).then(c=>c.put(req,copy));
        }
        return res;
      }).catch(()=>caches.match(req))
    );
    return;
  }

  // Images/icons: cache first; refresh silently in background.
  event.respondWith(
    caches.match(req).then(cached=>{
      if(cached){
        event.waitUntil(
          fetch(req).then(res=>{
            if(res && res.status===200) return caches.open(CACHE_NAME).then(c=>c.put(req,res.clone()));
          }).catch(()=>{})
        );
        return cached;
      }
      return fetch(req).then(res=>{
        if(res && res.status===200){
          const copy=res.clone();
          caches.open(CACHE_NAME).then(c=>c.put(req,copy));
        }
        return res;
      });
    })
  );
});
