// Caches the app shell so it opens fast. Data always comes live from the database (never cached).
const CACHE = 'bcm-shell-v9';
const SHELL = ['./', 'index.html', 'public.html', 'css/app.css', 'css/admin.css', 'js/common.js', 'js/map.js', 'js/state.js',
  'js/booking.js', 'js/pages.js', 'js/admin.js', 'js/public.js', 'js/assistant.js', 'js/i18n.js', 'js/festive.js', 'js/pnl.js', 'css/festive.css', 'css/pnl.css', 'img/logo.svg', 'img/logo-dark.svg', 'img/logo-static.svg', 'img/icon-192.png', 'vendor/supabase.js', 'vendor/xlsx.min.js', 'map-v3.jpg'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.endsWith('config.js')) return;
  // network first, fall back to cache
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
