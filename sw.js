// AbsensiKu Service Worker v6
// Strategi: Network First untuk HTML, Cache First hanya untuk CBT soal & media

const CACHE_NAME = 'absensiKu-v6';
const CBT_CACHE  = 'absensiKu-cbt-v2';

// ── Install — langsung skipWaiting, TIDAK pre-cache HTML
// (pre-cache HTML di GitHub Pages subfolder sering gagal → SW tidak aktif)
self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

// ── Activate — hapus semua cache lama, klaim semua client ──────────
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
  // Abaikan request non-GET
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

  // 3. Semua request lain (termasuk HTML, Supabase API) → Network First
  // Tidak di-cache agar selalu fresh dari server
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// ── Message handler ────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data === 'CLEAR_CBT_CACHE') {
    caches.delete(CBT_CACHE).then(() => {
      if (e.ports && e.ports[0]) e.ports[0].postMessage('CBT cache cleared');
    });
  }
  if (e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
