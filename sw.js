// AbsensiKu Service Worker v7.1 (Vercel-Ready)
// Auto-update: SW baru langsung aktif dan reload semua client

const CACHE_NAME = 'absensiKu-v7';
const CBT_CACHE  = 'absensiKu-cbt-v2';

// Asset kritis untuk pre-cache (agar offline & first load cepat)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js'
];

// ── Install: pre-cache asset + skipWaiting ─────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching assets:', PRECACHE_ASSETS);
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Pre-cache complete, skipping waiting');
        return self.skipWaiting();
      })
      .catch(err => console.error('[SW] Install failed:', err))
  );
});

// ── Activate: cleanup old caches + claim clients + notify ──
self.addEventListener('activate', event => {
  event.waitUntil(
    // 1. Hapus cache lama
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== CBT_CACHE)
          .map(name => caches.delete(name))
      );
    })
    // 2. Klaim semua client
    .then(() => self.clients.claim())
    // 3. Notify semua window untuk reload
    .then(() => {
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    })
    .then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'SW_UPDATED' });
      });
    })
    .catch(err => console.error('[SW] Activate failed:', err))
  );
});

// ── Fetch: Multi-strategy caching ──────────────────────────
self.addEventListener('fetch', event => {
  // Hanya handle GET requests
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);

  // ── STRATEGY 1: CBT Questions dari Supabase ─────────────
  // Cache First + background update
  if (url.hostname.includes('supabase.co') && url.pathname.includes('cbt_questions')) {
    event.respondWith(
      caches.open(CBT_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        
        // Jika ada di cache, return + update di background
        if (cached) {
          fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
          }).catch(() => {});
          return cached;
        }
        
        // Jika tidak ada, fetch + simpan ke cache
        const fresh = await fetch(event.request);
        if (fresh.ok) cache.put(event.request, fresh.clone());
        return fresh;
      }).catch(() => fetch(event.request))
    );
    return;
  }

  // ── STRATEGY 2: CBT Media Files ─────────────────────────
  // Cache First (media jarang berubah)
  if (url.pathname.includes('/storage/v1/object/public/cbt-media/')) {
    event.respondWith(
      caches.open(CBT_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        
        const fresh = await fetch(event.request);
        if (fresh.ok) cache.put(event.request, fresh.clone());
        return fresh;
      }).catch(() => fetch(event.request))
    );
    return;
  }

  // ── STRATEGY 3: HTML Pages ──────────────────────────────
  // Network First + fallback to cache (Vercel compatible)
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Jika response OK, update cache untuk fallback offline
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request)) // Fallback ke cache jika offline
    );
    return;
  }

  // ── STRATEGY 4: Lainnya (CSS, JS, Images, API) ──────────
  // Network First + fallback
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// ── Message Handler: SKIP_WAITING & CLEAR_CBT_CACHE ───────
self.addEventListener('message', event => {
  if (!event.data) return;
  
  // Clear CBT cache (untuk reset soal)
  if (event.data === 'CLEAR_CBT_CACHE') {
    caches.open(CBT_CACHE).then(cache => {
      return cache.keys().then(keys => {
        return Promise.all(keys.map(key => cache.delete(key)));
      });
    }).then(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'CBT_CACHE_CLEARED' });
        });
      });
    });
    return;
  }
  
  // Force skip waiting (untuk update SW)
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
