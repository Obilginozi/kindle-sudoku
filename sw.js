/* Caches the game after the first online open so Kindle can reload it in airplane mode. */
var CACHE = 'kindle-sudoku-v11';

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(['./', './index.html']);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      var pending = [];
      var i;
      for (i = 0; i < keys.length; i++) {
        if (keys[i] !== CACHE) pending.push(caches.delete(keys[i]));
      }
      return Promise.all(pending);
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  event.respondWith(
    fetch(request).then(function (response) {
      var copy = response.clone();
      caches.open(CACHE).then(function (cache) {
        cache.put(request, copy);
      });
      return response;
    })['catch'](function () {
      return caches.match(request).then(function (cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
