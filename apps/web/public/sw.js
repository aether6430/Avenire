const CACHE_NAME = "avenire-static-v3";
const STATIC_ASSET_PATH_PATTERN =
  /\.(?:css|js|ico|png|jpg|jpeg|svg|webp|woff2?)$/i;
const IS_LOCAL_HOST = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
  self.location.hostname
);

const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/favicon.ico",
  "/branding/avenire-logo-full.png",
  "/branding/avenire-logo-full.svg",
];

self.addEventListener("install", (event) => {
  if (IS_LOCAL_HOST) {
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  if (IS_LOCAL_HOST) {
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) =>
          Promise.all(cacheNames.map((name) => caches.delete(name)))
        )
        .then(() => self.registration.unregister())
    );
    return;
  }

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (IS_LOCAL_HOST) {
    return;
  }

  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  const isSameOriginStatic =
    url.origin === self.location.origin &&
    STATIC_ASSET_PATH_PATTERN.test(url.pathname);

  if (isSameOriginStatic) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirstNavigation(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    const cachedPage = await caches.match(request);
    if (cachedPage) {
      return cachedPage;
    }
    return (
      (await caches.match("/offline.html")) ||
      new Response("Offline", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const networkResponse = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, networkResponse.clone());
  return networkResponse;
}
