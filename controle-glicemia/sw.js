// Cache do "app shell" para uso offline. Como todos os dados ficam no
// localStorage do aparelho, o app funciona sem internet depois da
// primeira visita — só o login com Google exige rede.
var CACHE_NAME = "glicemia-shell-v4";
var APP_SHELL = [
  "./",
  "./index.html",
  "./privacidade.html",
  "./style.css",
  "./theme.js",
  "./storage.js",
  "./export.js",
  "./auth.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) {
            return name !== CACHE_NAME;
          })
          .map(function (name) {
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  // Fontes e o script do Google Identity: rede primeiro, sem quebrar o
  // app se estiver offline (a página funciona sem eles).
  if (req.url.indexOf(self.location.origin) !== 0) {
    event.respondWith(
      fetch(req).catch(function () {
        return caches.match(req);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req)
        .then(function (res) {
          if (res && res.status === 200) {
            var copy = res.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(req, copy);
            });
          }
          return res;
        })
        .catch(function () {
          return cached;
        });
      return cached || network;
    })
  );
});
