const VERSION = 'lazzat-v10-1';
const APP_SHELL = [
  '/', '/index.html', '/order.html', '/account.html',
  '/styles.css', '/app.js', '/manifest.webmanifest',
  '/assets/icons/favicon.svg', '/assets/icons/icon-192.png', '/assets/icons/icon-512.png',
  '/assets/burger.svg','/assets/chicken-burger.svg','/assets/double-burger.svg','/assets/lavash.svg',
  '/assets/pizza.svg','/assets/wings.svg','/assets/nuggets.svg','/assets/fries.svg','/assets/hotdog.svg',
  '/assets/cola.svg','/assets/lemonade.svg','/assets/combo.svg'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => Promise.all(APP_SHELL.map(url=>cache.add(url).catch(()=>null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      const copy=response.clone(); caches.open(VERSION).then(c=>c.put('/index.html',copy)); return response;
    }).catch(() => caches.match(event.request).then(r => r || caches.match('/index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy=response.clone(); caches.open(VERSION).then(c=>c.put(event.request,copy)); return response;
  }).catch(() => caches.match('/assets/icons/icon-192.png'))));
});
