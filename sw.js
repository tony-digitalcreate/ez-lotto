// EZ LOTTO offline shell — caches the app + Firebase SDK modules so the
// installed PWA opens with no signal. Firestore traffic itself is never cached.
const CACHE = 'ezlotto-v10';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('firestore.googleapis') || url.hostname.includes('identitytoolkit')) return; // live data, never cache

  // Always check the network first for the app page so a newly published
  // version replaces the installed PWA without being trapped behind old HTML.
  if (e.request.mode === 'navigate' || (url.origin === self.location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')))) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); }
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
