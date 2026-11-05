/* Word Mix offline support: keeps the game, word list, fonts and QR scanner on the phone. */
var VERSION = 'wordmix-v4';
var SHELL = [
  './', 'index.html', 'styles.css', 'app.js', 'qr.js', 'avatars.js', 'net.js', 'words.txt', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-64.png'
];
var EXTRA = [
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&display=swap'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.addAll(SHELL).then(function () {
      // Best effort: these come from other sites and must not block install.
      return Promise.all(EXTRA.map(function (url) {
        return fetch(url, { mode: 'cors' }).then(function (r) { if (r.ok) return c.put(url, r); }).catch(function () {});
      }));
    });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var fontish = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdn.jsdelivr.net';
  if (url.origin !== self.location.origin && !fontish) return;
  e.respondWith(caches.open(VERSION).then(function (c) {
    return c.match(req, { ignoreSearch: url.origin === self.location.origin }).then(function (hit) {
      var net = fetch(req).then(function (r) {
        if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone());
        return r;
      }).catch(function () { return hit; });
      if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
      return net.then(function (r) {
        if (r) return r;
        if (req.mode === 'navigate') return c.match('index.html');
        return new Response('', { status: 504 });
      });
    });
  }));
});
