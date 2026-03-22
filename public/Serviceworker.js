const CACHE_NAME = "school-fees-v1";
const STATIC_CACHE = "school-fees-static-v1";
const DATA_CACHE = "school-fees-data-v1";

// App shell files to cache immediately on install
const APP_SHELL = ["/", "/index.html", "/manifest.json"];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(APP_SHELL);
      })
      .then(() => self.skipWaiting()),
  );
});

// ── Activate — clean up old caches ────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DATA_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch — cache strategy ─────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== "GET") return;
  if (url.protocol === "chrome-extension:") return;

  // Firebase / Firestore API calls — Network first, fall back to cache
  if (
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("firebase.googleapis.com") ||
    url.hostname.includes("identitytoolkit.googleapis.com")
  ) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // App shell / static assets — Cache first, fall back to network
  if (
    url.origin === self.location.origin ||
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com") ||
    url.hostname.includes("cdnjs.cloudflare.com")
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
});

// ── Cache strategies ───────────────────────────────────────────────────────

// Cache first: serve from cache, fetch from network if not cached
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    // Return a basic offline page if we have nothing cached
    return new Response(
      '<html><body style="font-family:sans-serif;text-align:center;padding:2rem"><h2>You are offline</h2><p>Please check your internet connection.</p></body></html>',
      { headers: { "Content-Type": "text/html" } },
    );
  }
}

// Network first: try network, fall back to cache
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return (
      cached ||
      new Response(JSON.stringify({ error: "Offline" }), {
        headers: { "Content-Type": "application/json" },
      })
    );
  }
}

// ── Background sync message ────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();

  if (event.data === "CLEAR_CACHE") {
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
  }
});
