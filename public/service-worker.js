const CACHE_NAME = "gensaas-v2";
const APP_SHELL = [
  "/",
  "/index.html",
  "/index.css",
  "/login.js",
  "/runtime-config.js",
  "/api.js",
  "/pwa.js",
  "/registration.html",
  "/registration.css",
  "/registration.js",
  "/homepage.html",
  "/homepage.css",
  "/homepage.js",
  "/profile.html",
  "/profile.css",
  "/profile.js",
  "/logout.html",
  "/logout.css",
  "/logout.js",
  "/manifest.json",
  "/user_profile.png",
  "/left-arrow.png",
  "/right-arrow.png",
  "/settings_icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then(cachedResponse => cachedResponse || caches.match("/index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        return networkResponse;
      });
    })
  );
});
