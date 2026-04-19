const CACHE_VERSION = "v2";
const STATIC_CACHE = `school-fees-static-${CACHE_VERSION}`;
const DATA_CACHE = `school-fees-data-${CACHE_VERSION}`;
const OFFLINE_CACHE = `school-fees-offline-${CACHE_VERSION}`;

const CACHE_MAX_AGE = {
  static: 30 * 24 * 60 * 60,
  data: 24 * 60 * 60,
};

const APP_SHELL = ["/", "/index.html", "/manifest.json", "/favicon.svg"];
const OFFLINE_ROUTES = ["/", "/dashboard", "/students", "/families", "/fees", "/payment-history"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)),
      caches.open(OFFLINE_CACHE).then((cache) =>
        Promise.allSettled(OFFLINE_ROUTES.map((route) => cache.add(route).catch(() => undefined))),
      ),
    ]).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.includes(CACHE_VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // Ignore third-party tracking pixel requests that are frequently blocked.
  if (url.hostname === "www.google.com" && url.pathname === "/images/cleardot.gif") return;

  if (
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("firebase.googleapis.com") ||
    url.hostname.includes("identitytoolkit.googleapis.com") ||
    url.hostname.includes("securetoken.googleapis.com")
  ) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // Cache static assets only for this origin.
  if (url.origin === self.location.origin && /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (url.origin === self.location.origin && request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, DATA_CACHE).catch(() => {
        return caches.match("/index.html") || getOfflinePage();
      }),
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    const cacheTime = cached.headers.get("sw-fetch-time");
    if (cacheTime) {
      const age = (Date.now() - parseInt(cacheTime, 10)) / 1000;
      const maxAge = cacheName === STATIC_CACHE ? CACHE_MAX_AGE.static : CACHE_MAX_AGE.data;
      if (age < maxAge) return cached;
    } else {
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      if (new URL(request.url).origin === self.location.origin) {
        const cloned = response.clone();
        const stamped = new Response(cloned.body, {
          status: cloned.status,
          statusText: cloned.statusText,
          headers: new Headers(cloned.headers),
        });
        stamped.headers.set("sw-fetch-time", Date.now().toString());
        await safeCachePut(cache, request, stamped);
      } else {
        await safeCachePut(cache, request, response.clone());
      }
    }
    return response;
  } catch (error) {
    if (new URL(request.url).origin === self.location.origin) {
      console.error("[Service Worker] Fetch failed:", request.url, error);
    }
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
      if (new URL(request.url).origin === self.location.origin) {
        const cloned = response.clone();
        const stamped = new Response(cloned.body, {
          status: cloned.status,
          statusText: cloned.statusText,
          headers: new Headers(cloned.headers),
        });
        stamped.headers.set("sw-fetch-time", Date.now().toString());
        await safeCachePut(cache, request, stamped);
      } else {
        await safeCachePut(cache, request, response.clone());
      }
    }
    return response;
  } catch (error) {
    if (new URL(request.url).origin === self.location.origin) {
      console.error("[Service Worker] Network fetch failed:", request.url, error);
    }

    const cached = await cache.match(request);
    if (cached) return cached;

    if (request.headers.get("accept")?.includes("application/json")) {
      return new Response(JSON.stringify({ error: "Offline - no cached data available" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.mode === "navigate") return getOfflinePage();
    return Response.error();
  }
}

async function safeCachePut(cache, request, response) {
  try {
    await cache.put(request, response);
  } catch (error) {
    console.warn("[Service Worker] Cache put skipped:", request.url, error);
  }
}

function getOfflinePage() {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Feesman</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 2rem; text-align: center; }
    .wrap { max-width: 560px; margin: 10vh auto; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>You're Offline</h1>
    <p>Check your internet connection and try again.</p>
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

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();

  if (event.data === "CLEAR_CACHE") {
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
  }

  if (event.data?.type === "CACHE_URLS") {
    caches.open(DATA_CACHE).then((cache) => {
      cache.addAll(event.data.urls).catch((err) => {
        console.error("[Service Worker] Failed to cache URLs:", err);
      });
    });
  }
});
