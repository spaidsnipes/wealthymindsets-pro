/**
 * WealthyMindsets Pro — Service Worker
 * Provides offline support, asset caching, and background sync
 */

const CACHE_VERSION = "wm-pro-v2";
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/charts",
  "/scanner",
  "/heatmaps",
  "/news",
  "/education",
  "/lounge",
  "/shop",
  "/profile",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

/* ── Install: pre-cache static shell ──────────── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[SW] Pre-caching static assets");
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        // Don't fail install if some URLs 404 (dev mode)
        console.warn("[SW] Pre-cache partial fail:", err);
      });
    })
  );
  self.skipWaiting();
});

/* ── Activate: clean old caches ───────────────── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch: network-first for API, cache-first for assets ── */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // API routes → network only (real-time data)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "Offline" }), {
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // Next.js chunks / static assets → cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetchAndCache(request, STATIC_CACHE)
      )
    );
    return;
  }

  // App pages → stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetchAndCache(request, DYNAMIC_CACHE);
      return cached || networkFetch;
    })
  );
});

async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match("/") || new Response("Offline", { status: 503 });
  }
}

/* ── Push notifications ────────────────────────── */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "WealthyMindsets Pro", {
      body:    data.body   || "New alert",
      icon:    "/icons/icon-192x192.png",
      badge:   "/icons/icon-72x72.png",
      tag:     data.tag    || "wm-alert",
      data:    data.url    || "/charts",
      vibrate: [100, 50, 100],
      actions: [
        { action: "view",    title: "View Chart" },
        { action: "dismiss", title: "Dismiss" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const url = event.notification.data || "/charts";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
