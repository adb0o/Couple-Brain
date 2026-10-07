// Service worker : l'application s'ouvre même sans réseau (les données, elles, sont gardées par le cache Firestore).
// Si vous modifiez les fichiers de l'app, changez le numéro de version ci-dessous.
const V = 'nous-deux-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const mine = u.origin === location.origin;
  const lib = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(u.hostname);
  if (!mine && !lib) return; // l'API Firestore/Auth ne passe jamais par ce cache
  const page = r.mode === 'navigate' || u.pathname.endsWith('/index.html') || u.pathname.endsWith('/firebase-config.txt');
  if (page) { // réseau d'abord (toujours à jour), cache en secours hors ligne
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; })
      .catch(() => caches.match(r).then(m => m || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { // cache d'abord (SDK, polices, icônes)
    if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
    return res;
  })));
});
