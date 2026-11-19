// Cache public training pages and static assets for offline reading.
// Excludes sign-in, private member/admin pages, query-token forms, and API responses.
const CACHE = 'flatout-public-v13';
const PUBLIC = [
  '/', '/index.html', '/site.css', '/styles.css', '/academy-interior.css', '/carbon-gold-interior.css', '/design4-specialty.css', '/luxury-artwork-detail.css', '/sponsor-hall-v5.css', '/interior-preview-four.css', '/assets/sponsor-invitation-request-qr.svg',
  '/site.js', '/free-sections.js', '/approved-homepage.png', '/assets/homepage-reference.jpg', '/assets/homepage-reference-sharpened.jpg', '/logo-original.jpeg',
  '/assets/flat-out-built-up-roofing-logo.svg',
  '/manifest.webmanifest', '/academy-roof-illustration.svg',
  '/assets/premium-roofing-interior.svg', '/assets/premium-roofing-materials.svg',
  '/courses.html', '/free-hub.html', '/new-to-flat-roofing.html',
  '/lessons/introduction.html', '/lessons/inspection-and-preparation.html',
  '/lessons/drainage-and-details.html', '/cscs.html', '/health-safety.html',
  '/tool-safety.html', '/tapered-insulation.html', '/tapered-animated-lessons.html',
  '/tapered-falls-practice.html', '/tapered-video-academy.html',
  '/community.html', '/sponsors.html', '/terms.html', '/privacy.html',
  '/cookies.html', '/refunds.html'
];
const PUBLIC_PATHS = new Set(PUBLIC);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(PUBLIC.map(async path => {
      try {
        const request = new Request(new URL(path, self.registration.scope), { cache: 'reload' });
        const response = await fetch(request);
        if (response.ok && response.type !== 'opaque') await cache.put(request, response);
      } catch (_) {
        // Keep installation available when one optional public resource is offline.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) {
    if (name.startsWith('flatout-public-') && name !== CACHE) await caches.delete(name);
  }
  await self.clients.claim();
})()));

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.search || !PUBLIC_PATHS.has(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request, { cache: 'reload' });
      if (response.ok && response.type !== 'opaque') await cache.put(event.request, response.clone());
      return response;
    } catch (_) {
      const cached = await cache.match(event.request);
      return cached || Response.error();
    }
  })());
});
