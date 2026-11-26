// App files: network first so new versions show up right away, cache as fallback.
// Libraries, fonts and map styles live in their own cache, so an app update never throws them away.
// Map tiles are left to the browser's own cache.
const CACHE = 'molip-v28', LIB = 'molip-libs-1';
const SHELL = ['./', 'index.html', 'manifest.json', 'world.json', 'icon-192.png', 'icon-512.png', 'icon-180.png'];
const NEED = [
  'https://unpkg.com/maplibre-gl@5.6.0/dist/maplibre-gl.js',
  'https://unpkg.com/maplibre-gl@5.6.0/dist/maplibre-gl.css',
  'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js',
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap',
  'https://tiles.openfreemap.org/styles/liberty',
  'https://tiles.openfreemap.org/styles/positron',
  'https://tiles.openfreemap.org/styles/dark'
];
const LIBS = /^(https:\/\/unpkg\.com\/maplibre-gl@|https:\/\/cdn\.jsdelivr\.net\/(npm\/topojson-client@|gh\/orioncactus\/pretendard@)|https:\/\/fonts\.(googleapis|gstatic)\.com\/)/;
const STYLES = /^https:\/\/tiles\.openfreemap\.org\/(styles|fonts|sprites)\//;

// always ask with CORS: a stored CORS answer works for every kind of request, an opaque one does not
async function pull(url) {
  const res = await fetch(url, { credentials: 'omit' });
  if (res.ok) { const c = await caches.open(LIB); await c.put(url, res.clone()); }
  return res;
}
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    await (await caches.open(CACHE)).addAll(SHELL);
    const c = await caches.open(LIB);
    await Promise.allSettled(NEED.map(async u => { if (!(await c.match(u))) await pull(u); }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== LIB).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  if (url.startsWith(self.location.origin)) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
    return;
  }
  if (LIBS.test(url) || STYLES.test(url)) {
    e.respondWith((async () => {
      const hit = await (await caches.open(LIB)).match(url);
      if (hit) { if (STYLES.test(url)) e.waitUntil(pull(url).catch(() => {})); return hit; }
      try { return await pull(url); } catch (_) { return fetch(req); }
    })());
  }
});
