const CACHE_NAME = "financeapp-cache-v1";
const APP_SHELL = ["/", "/settings", "/company"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {
        // ignore pre-cache failures
      });
    }),
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return undefined;
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (
    request.method !== "GET" ||
    request.url.includes("/api/") ||
    request.headers.get("accept")?.includes("text/event-stream")
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, responseToCache))
            .catch(() => {});

          return networkResponse;
        })
        .catch(() => cachedResponse);
    }),
  );
});


