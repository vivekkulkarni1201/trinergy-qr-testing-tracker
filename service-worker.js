const CACHE_NAME='trinergy-pwa-v6.13';
const APP_SHELL=[
  './',
  './index.html',
  './styles.css',
  './shared.js',
  './dashboard.js',
  './active.html',
  './active.js',
  './bays.html',
  './bays.js',
  './buffer.html',
  './buffer.js',
  './faulty.html',
  './faulty.js',
  './parking.html',
  './parking.js',
  './qr.html',
  './qr.js',
  './reports.html',
  './reports.js',
  './scan.html',
  './scan.js',
  './admin.html',
  './admin.js',
  './manifest.webmanifest',
  './icon-128.png',
  './icon-256.png',
  './favicon.ico',
  './icon-192.png',
  './icon-512.png',
  './trinergy-ups.png',
  './trinergy-brand-banner.png'
];

self.addEventListener('install', event=>{
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL).catch(()=>{}))
  );
});

self.addEventListener('activate', event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', event=>{
  const req=event.request;
  if(req.method!=='GET') return;

  const url=new URL(req.url);

  // Never cache Supabase/API requests.
  if(url.hostname.includes('supabase.co')) return;

  // Navigation: network first so deployed updates appear quickly; cache fallback offline.
  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req).then(res=>{
        const copy=res.clone();
        caches.open(CACHE_NAME).then(c=>c.put(req,copy));
        return res;
      }).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html')))
    );
    return;
  }

  // Static files: cache first, refresh in background.
  event.respondWith(
    caches.match(req).then(cached=>{
      const fresh=fetch(req).then(res=>{
        if(res && res.status===200 && res.type!=='opaque'){
          const copy=res.clone();
          caches.open(CACHE_NAME).then(c=>c.put(req,copy));
        }
        return res;
      }).catch(()=>cached);
      return cached || fresh;
    })
  );
});
