// AbsensiKu Service Worker v4
// + CBT soal cache untuk performa 300-500 siswa bersamaan

const CACHE_NAME = 'absensiKu-v4';
const CBT_CACHE  = 'absensiKu-cbt-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ── Install — cache aset statis ────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate — hapus cache lama ────────────────────────────────────
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
  const url = new URL(e.request.url);

  // 1. Supabase API soal CBT → Cache First (soal jarang berubah saat ujian)
  if (url.hostname.includes('supabase.co') &&
      url.pathname.includes('cbt_questions') &&
      e.request.method === 'GET') {
    e.respondWith(
      caches.open(CBT_CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) {
          // Background update agar tetap fresh
          fetch(e.request).then(r => { if(r.ok) cache.put(e.request, r.clone()); }).catch(()=>{});
          return cached;
        }
        const fresh = await fetch(e.request);
        if (fresh.ok) cache.put(e.request, fresh.clone());
        return fresh;
      })
    );
    return;
  }

  // 2. Supabase Storage media (gambar/audio/video) → Cache First
  if (url.pathname.includes('/storage/v1/object/public/cbt-media/')) {
    e.respondWith(
      caches.open(CBT_CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        const fresh = await fetch(e.request);
        if (fresh.ok) cache.put(e.request, fresh.clone());
        return fresh;
      })
    );
    return;
  }

  // 3. Supabase API lain (absensi, sessions, dll) → Network First
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // 4. Aset statis app → Cache First
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// ── Message: clear CBT cache (admin bisa trigger setelah update soal)
self.addEventListener('message', e => {
  if (e.data === 'CLEAR_CBT_CACHE') {
    caches.delete(CBT_CACHE).then(() => {
      e.ports[0].postMessage('CBT cache cleared');
    });
  }
});
