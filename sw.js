/* Word Mix offline support.
   Online: always fetch the newest game files (so updates show up straight away) and keep a copy.
   Offline: use the saved copy. */
var VERSION = 'wordmix-v10';
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
    // cache: 'reload' skips the browser's own cache so we save the newest files.
    return Promise.all(SHELL.map(function (u) {
      return fetch(new Request(u, { cache: 'reload' })).then(function (r) { if (r.ok) return c.put(u, r); throw new Error(u); });
    })).then(function () {
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

function timeout(ms) { return new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); }); }

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;
  var external = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdn.jsdelivr.net';
  if (!sameOrigin && !external) return;

  if (sameOrigin) {
    // Network first (checks GitHub for a newer file), saved copy if offline or slow.
    e.respondWith(caches.open(VERSION).then(function (c) {
      var net = fetch(req, { cache: 'no-cache' }).then(function (r) {
        if (r && r.ok) c.put(req, r.clone());
        return r;
      });
      return Promise.race([net, timeout(4000)]).catch(function () {
        return c.match(req, { ignoreSearch: true }).then(function (hit) {
          if (hit) return hit;
          if (req.mode === 'navigate') return c.match('index.html');
          return net;
        });
      });
    }));
    return;
  }
  // Fonts and the QR scanner rarely change: saved copy first.
  e.respondWith(caches.open(VERSION).then(function (c) {
    return c.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (r) { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; });
    });
  }));
});
