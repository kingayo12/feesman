const CACHE_VERSION = "v1";
const CACHE_NAME = `school-fees-${CACHE_VERSION}`;
const STATIC_CACHE = `school-fees-static-${CACHE_VERSION}`;
const DATA_CACHE = `school-fees-data-${CACHE_VERSION}`;
const OFFLINE_CACHE = `school-fees-offline-${CACHE_VERSION}`;

// Cache duration limits (in seconds)
const CACHE_MAX_AGE = {
  static: 30 * 24 * 60 * 60, // 30 days for static assets
  data: 24 * 60 * 60, // 1 day for API data
  offline: 7 * 24 * 60 * 60, // 7 days for offline fallback
};

// App shell files to cache immediately on install
const APP_SHELL = ["/", "/index.html", "/manifest.json", "/favicon.svg"];

// Critical routes for offline support
const OFFLINE_ROUTES = ["/", "/dashboard", "/students", "/families", "/fees", "/payment-history"];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log("[Service Worker] Caching app shell");
        return cache.addAll(APP_SHELL);
      }),
      caches.open(OFFLINE_CACHE).then((cache) => {
        console.log("[Service Worker] Caching offline routes");
        // Attempt to cache offline routes, but don't fail if some are unavailable
        return Promise.allSettled(
          OFFLINE_ROUTES.map((route) =>
            cache.add(route).catch((err) => {
              console.log(`[Service Worker] Failed to cache ${route}:`, err);
            }),
          ),
        );
      }),
    ]).then(() => {
      console.log("[Service Worker] Install complete");
      self.skipWaiting();
    }),
  );
});

// ── Activate — clean up old caches ────────────────────────────────────────
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...");
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        console.log("[Service Worker] Available caches:", keys);
        return Promise.all(
          keys
            .filter((key) => {
              const isOldVersion = !key.includes(CACHE_VERSION);
              if (isOldVersion) {
                console.log("[Service Worker] Deleting old cache:", key);
              }
              return isOldVersion;
            })
            .map((key) => caches.delete(key)),
        );
      })
      .then(() => {
        console.log("[Service Worker] Claiming clients");
        return self.clients.claim();
      }),
  );
});

// ── Fetch — cache strategy ─────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and non-http requests
  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // Firebase / Firestore API calls — Network first, fall back to cache
  if (
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("firebase.googleapis.com") ||
    url.hostname.includes("identitytoolkit.googleapis.com") ||
    url.hostname.includes("securetoken.googleapis.com")
  ) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // Static assets (CSS, JS, Images) — Cache first
  if (/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Google Fonts — Cache first with long expiration
  if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // App routes (navigation) — Network first with offline fallback
  if (url.origin === self.location.origin && request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, DATA_CACHE).catch(() => {
        return caches.match("/index.html") || getOfflinePage();
      }),
    );
    return;
  }

  // Other same-origin requests — Network first
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }
});

// ── Cache strategies with expiration ───────────────────────────────────────

/**
 * Cache first: serve from cache, fetch from network if not cached or expired
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // Check if cache is expired
    const cacheTime = cached.headers.get("sw-fetch-time");
    if (cacheTime) {
      const age = (Date.now() - parseInt(cacheTime)) / 1000;
      const maxAge = cacheName === STATIC_CACHE ? CACHE_MAX_AGE.static : CACHE_MAX_AGE.data;
      if (age < maxAge) {
        console.log("[Service Worker] Serving from cache:", request.url);
        return cached;
      }
    } else {
      // No timestamp, serve it anyway but try to update
      console.log("[Service Worker] Serving from cache (no timestamp):", request.url);
    }
  }

  try {
    console.log("[Service Worker] Fetching from network:", request.url);
    const response = await fetch(request);
    if (response.ok) {
      const clonedResponse = response.clone();
      const modifiedResponse = new Response(clonedResponse.body, {
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
        headers: new Headers(clonedResponse.headers),
      });
      modifiedResponse.headers.set("sw-fetch-time", Date.now().toString());
      cache.put(request, modifiedResponse);
    }
    return response;
  } catch (error) {
    console.error("[Service Worker] Fetch failed:", request.url, error);
    if (cached) return cached;
    return getOfflinePage();
  }
}

/**
 * Network first: try network, fall back to cache
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    console.log("[Service Worker] Attempting network first:", request.url);
    const response = await fetch(request);
    if (response.ok) {
      const clonedResponse = response.clone();
      const modifiedResponse = new Response(clonedResponse.body, {
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
        headers: new Headers(clonedResponse.headers),
      });
      modifiedResponse.headers.set("sw-fetch-time", Date.now().toString());
      cache.put(request, modifiedResponse);
    }
    return response;
  } catch (error) {
    console.error("[Service Worker] Network fetch failed:", request.url, error);
    const cached = await cache.match(request);
    if (cached) {
      console.log("[Service Worker] Serving from cache fallback:", request.url);
      return cached;
    }

    // Return appropriate offline response based on content type
    if (request.headers.get("accept")?.includes("application/json")) {
      return new Response(JSON.stringify({ error: "Offline - no cached data available" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    return getOfflinePage();
  }
}

/**
 * Generate an offline fallback page
 */
function getOfflinePage() {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Feesman</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 3rem 2rem;
      text-align: center;
      max-width: 500px;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 {
      color: #333;
      margin-bottom: 0.5rem;
      font-size: 2rem;
    }
    p {
      color: #666;
      margin-bottom: 1.5rem;
      line-height: 1.6;
    }
    .actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .btn-primary {
      background: #667eea;
      color: white;
    }
    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }
    .btn-secondary:hover {
      background: #e0e0e0;
    }
    .status {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #eee;
      font-size: 0.875rem;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>You're Offline</h1>
    <p>It looks like you've lost your internet connection. Some features may be limited until you're back online.</p>
    <div class="actions">
      <button class="btn-primary" onclick="location.reload()">Retry</button>
      <button class="btn-secondary" onclick="history.back()">Go Back</button>
    </div>
    <div class="status">
      <p>Check your internet connection and try again.</p>
      <p id="timestamp"></p>
    </div>
  </div>
  <script>
    document.getElementById('timestamp').textContent = 'Last checked: ' + new Date().toLocaleTimeString();
  </script>
</body>
</html>`,
    {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

// ── Background sync and messaging ──────────────────────────────────────────
self.addEventListener("message", (event) => {
  console.log("[Service Worker] Message received:", event.data);

  if (event.data === "SKIP_WAITING") {
    console.log("[Service Worker] Skipping waiting...");
    self.skipWaiting();
  }

  if (event.data === "CLEAR_CACHE") {
    console.log("[Service Worker] Clearing all caches...");
    caches.keys().then((keys) => {
      Promise.all(
        keys.map((key) => {
          console.log("[Service Worker] Deleting cache:", key);
          return caches.delete(key);
        }),
      );
    });
  }

  if (event.data?.type === "CACHE_URLS") {
    console.log("[Service Worker] Caching URLs:", event.data.urls);
    caches.open(DATA_CACHE).then((cache) => {
      cache.addAll(event.data.urls).catch((err) => {
        console.error("[Service Worker] Failed to cache URLs:", err);
      });
    });
  }
});
