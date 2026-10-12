const CACHE_NAME = 'verbixse-zeuvastec-v7';
const APP_FILES = [
  './', './index.html', './style.css',
  './questions.js', './app.js', './solo.js', './multiplayer.js', './multiplayer-ui.js', './main.js',
  './manifest.json', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Nunca fazer cache das chamadas ao PeerJS/CDN — multiplayer precisa sempre da rede.
  if (event.request.url.includes('unpkg.com') || event.request.url.includes('peerjs')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  // Arquivos do jogo: busca primeiro na rede (pega atualizações na hora)
  // e usa o cache só quando estiver sem internet.
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok && new URL(event.request.url).origin === self.location.origin) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
