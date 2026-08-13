// Bump this string on each production deploy to invalidate old caches.
const CACHE_VERSION = "v2";
const STATIC_CACHE = `kahel-static-${CACHE_VERSION}`;
const PAGES_CACHE = `kahel-pages-${CACHE_VERSION}`;
const IMAGES_CACHE = `kahel-images-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

// Precache critical assets on install so the offline page is always available.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        cache.addAll([
          OFFLINE_URL,
          "/kahelstudio-logo_b.svg",
          "/kahelstudio-logo_w.svg",
        ])
      )
      .then(() => self.skipWaiting())
  );
});

// Remove caches from previous versions on activate.
self.addEventListener("activate", (event) => {
  const current = new Set([STATIC_CACHE, PAGES_CACHE, IMAGES_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n.startsWith("kahel-") && !current.has(n))
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // API routes — always hit the network; never cache live data.
  if (url.pathname.startsWith("/api/")) return;

  // Next.js RSC payload requests — network only.
  if (request.headers.has("RSC") || request.headers.has("Next-Router-State-Tree")) return;

  // Next.js hashed static assets (_next/static/**) — cache-first, keep forever.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((resp) => {
            if (resp.ok) {
              caches
                .open(STATIC_CACHE)
                .then((c) => c.put(request, resp.clone()));
            }
            return resp;
          })
      )
    );
    return;
  }

  // Images — cache-first; silently ignore network errors.
  if (request.destination === "image") {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((resp) => {
              if (resp.ok) {
                caches
                  .open(IMAGES_CACHE)
                  .then((c) => c.put(request, resp.clone()));
              }
              return resp;
            })
            .catch(() => new Response("", { status: 404 }))
      )
    );
    return;
  }

  // HTML navigation requests — network-first; fall back to cache then offline page.
  if (request.headers.get("Accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp.ok) {
            caches.open(PAGES_CACHE).then((c) => c.put(request, resp.clone()));
          }
          return resp;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
  }
});
