// App files: network first so new versions show up right away, cache as fallback.
// Libraries and fonts: cache first, they never change at a pinned version.
// Map tiles are left to the browser's own cache.
const CACHE = 'molip-v12';
const SHELL = ['./', 'index.html', 'manifest.json', 'world.json', 'icon-192.png', 'icon-512.png', 'icon-180.png'];
const LIBS = /^(https:\/\/unpkg\.com\/maplibre-gl@|https:\/\/cdn\.jsdelivr\.net\/(npm\/topojson-client@|gh\/orioncactus\/pretendard@)|https:\/\/fonts\.(googleapis|gstatic)\.com\/)/;
const STYLES = /^https:\/\/tiles\.openfreemap\.org\/(styles|fonts)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  const sameOrigin = url.startsWith(self.location.origin);
  if (sameOrigin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  if (LIBS.test(url) || STYLES.test(url)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      });
      return hit || net;
    }));
  }
});
