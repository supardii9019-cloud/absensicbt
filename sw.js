// AbsensiKu Service Worker v7
// Auto-update: SW baru langsung aktif dan reload semua client
const CACHE_NAME = 'absensiKu-v7';
const CBT_CACHE  = 'absensiKu-cbt-v2';

// ── Install — skipWaiting langsung agar SW baru aktif segera
self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

// ── Activate — hapus cache lama, klaim semua client, lalu kirim reload signal
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME && k !== CBT_CACHE)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
     .then(() => {
       return self.clients.matchAll({type:'window', includeUncontrolled:true})
         .then(clients => {
           clients.forEach(client => {
             client.postMessage({type:'SW_UPDATED'});
           });
         });
     })
  );
});

// ── Fetch
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // 1. Soal CBT → Cache First + background update
  if (url.hostname.includes('supabase.co') && url.pathname.includes('cbt_questions')) {
    e.respondWith(
      caches.open(CBT_CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) {
          fetch(e.request).then(r => { if(r.ok) cache.put(e.request, r.clone()); }).catch(()=>{});
          return cached;
        }
        const fresh = await fetch(e.request);
        if (fresh.ok) cache.put(e.request, fresh.clone());
        return fresh;
      }).catch(() => fetch(e.request))
    );
    return;
  }

  // 2. Media CBT → Cache First
  if (url.pathname.includes('/storage/v1/object/public/cbt-media/')) {
    e.respondWith(
      caches.open(CBT_CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        const fresh = await fetch(e.request);
        if (fresh.ok) cache.put(e.request, fresh.clone());
        return fresh;
      }).catch(() => fetch(e.request))
    );
    return;
  }

  // 3. HTML → Network First, no-store (selalu ambil terbaru)
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request, {cache:'no-store'}).catch(() => caches.match(e.request))
    );
    return;
  }

  // 4. Lainnya → Network First
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// ── Message
self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data === 'CLEAR_CBT_CACHE') {
    caches.open(CBT_CACHE).then(cache => {
      return cache.keys().then(keys => Promise.all(keys.map(k => cache.delete(k))));
    }).then(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(c => c.postMessage({type:'CBT_CACHE_CLEARED'}));
      });
    });
    return;
  }
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
