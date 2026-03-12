// AbsensiKu Service Worker v6
// Strategi: Network First untuk HTML, Cache First hanya untuk CBT soal & media

const CACHE_NAME = 'absensiKu-v6';
const CBT_CACHE  = 'absensiKu-cbt-v2';

// ── Install — langsung skipWaiting, TIDAK pre-cache HTML
self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

// ── Activate — hapus cache lama, klaim client
// PENTING: clients.claim() tidak menyebabkan reload halaman —
// hanya mengambil kontrol tab yang belum dikontrol SW
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME && k !== CBT_CACHE)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch — strategi cache ─────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // 1. Supabase API soal CBT → Cache First + background update
  if (url.hostname.includes('supabase.co') &&
      url.pathname.includes('cbt_questions')) {
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

  // 2. Supabase Storage media CBT → Cache First
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

  // 3. Semua request lain → Network First (tidak di-cache)
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// ── Message handler ────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (!e.data) return;

  // Hapus HANYA cache CBT soal — tidak reload, tidak claim ulang
  if (e.data === 'CLEAR_CBT_CACHE') {
    caches.open(CBT_CACHE).then(cache => {
      return cache.keys().then(keys =>
        Promise.all(keys.map(k => cache.delete(k)))
      );
    }).then(() => {
      // Broadcast ke semua client agar hapus sessionStorage cbt_q_ juga
      self.clients.matchAll().then(clients => {
        clients.forEach(client =>
          client.postMessage({type:'CBT_CACHE_CLEARED'})
        );
      });
    });
    return;
  }

  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
