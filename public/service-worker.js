const CACHE_VERSION = "v3";
const STATIC_CACHE = `school-fees-static-${CACHE_VERSION}`;
const DATA_CACHE = `school-fees-data-${CACHE_VERSION}`;

const CACHE_MAX_AGE = {
  static: 30 * 24 * 60 * 60,
  data: 24 * 60 * 60,
};

// Only cache the actual shell files — SPA routes all resolve to index.html
const APP_SHELL = ["/", "/index.html", "/manifest.json", "/favicon.svg"];

// ─────────────────────────────────────────────
// Install — pre-cache app shell only
// ─────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

// ─────────────────────────────────────────────
// Activate — purge old cache versions
// ─────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !key.includes(CACHE_VERSION)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─────────────────────────────────────────────
// Fetch — routing strategy per request type
// ─────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // Ignore third-party tracking pixels
  if (url.hostname === "www.google.com" && url.pathname === "/images/cleardot.gif") return;

  // Firebase/Firestore — the SDK uses WebChannel/WebSocket for real-time
  // listeners so most Firestore traffic bypasses fetch entirely. The SDK's
  // own IndexedDB persistence (enableIndexedDbPersistence / persistentLocalCache)
  // is what gives offline data. We still network-first the REST calls here so
  // any fallback caching is consistent, but don't rely on this for offline data.
  if (
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("firebase.googleapis.com") ||
    url.hostname.includes("identitytoolkit.googleapis.com") ||
    url.hostname.includes("securetoken.googleapis.com")
  ) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // Static assets for this origin — cache-first, long TTL
  if (
    url.origin === self.location.origin &&
    /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Google Fonts — cache-first
  if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // SPA navigation — try network first, fall back to cached index.html so
  // React Router can handle the route offline. Never show the generic error page
  // for navigation: a blank app shell with a stale data banner is far better UX.
  if (url.origin === self.location.origin && request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached =
            (await caches.match(request)) ||
            (await caches.match("/index.html")) ||
            (await caches.match("/"));
          return cached || getOfflinePage();
        }),
    );
    return;
  }

  // All other same-origin requests — network first with cache fallback
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }
});

// ─────────────────────────────────────────────
// Strategies
// ─────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    const cacheTime = cached.headers.get("sw-fetch-time");
    if (cacheTime) {
      const age = (Date.now() - parseInt(cacheTime, 10)) / 1000;
      const maxAge = cacheName === STATIC_CACHE ? CACHE_MAX_AGE.static : CACHE_MAX_AGE.data;
      if (age < maxAge) return cached;
      // Stale — fall through to network revalidation below
    } else {
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      await safeCachePut(cache, request, stampedClone(response));
    }
    return response;
  } catch {
    if (cached) return cached;
    if (request.mode === "navigate") return getOfflinePage();
    return Response.error();
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await safeCachePut(cache, request, stampedClone(response));
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    if (request.headers.get("accept")?.includes("application/json")) {
      return new Response(JSON.stringify({ error: "Offline — no cached data available" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.mode === "navigate") {
      const shell = (await caches.match("/index.html")) || (await caches.match("/"));
      return shell || getOfflinePage();
    }

    return Response.error();
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

// Clone a response and stamp it with a fetch timestamp header so cacheFirst
// can compute its age without touching the original response body.
function stampedClone(response) {
  const headers = new Headers(response.headers);
  headers.set("sw-fetch-time", Date.now().toString());
  return response
    .clone()
    .text()
    .then(
      (body) =>
        new Response(body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        }),
    );
}

async function safeCachePut(cache, request, responseOrPromise) {
  try {
    const response = await responseOrPromise;
    await cache.put(request, response);
  } catch (err) {
    console.warn("[SW] Cache put skipped:", request.url, err);
  }
}

function getOfflinePage() {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline — Feesman</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#f9f8f5;color:#2c2c2a;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem}
    .card{background:#fff;border:1px solid #e5e4df;border-radius:12px;padding:2.5rem 2rem;max-width:420px;width:100%;text-align:center}
    h1{font-size:1.25rem;font-weight:500;margin-bottom:.75rem}
    p{font-size:.875rem;color:#73726c;line-height:1.6;margin-bottom:1.5rem}
    button{background:#185fa5;color:#fff;border:none;border-radius:8px;padding:.625rem 1.5rem;font-size:.875rem;cursor:pointer}
    button:hover{background:#0c447c}
  </style>
</head>
<body>
  <div class="card">
    <h1>You're offline</h1>
    <p>Feesman couldn't reach the server. Check your connection and try again. Any changes you've made may not have saved yet.</p>
    <button onclick="location.reload()">Retry</button>
  </div>
</body>
</html>`,
    {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

// ─────────────────────────────────────────────
// Message bus
// ─────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data === "CLEAR_CACHE") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
    return;
  }

  if (event.data?.type === "CACHE_URLS") {
    event.waitUntil(
      caches.open(DATA_CACHE).then((cache) =>
        cache.addAll(event.data.urls).catch((err) => {
          console.error("[SW] Failed to pre-cache URLs:", err);
        }),
      ),
    );
    return;
  }
});
