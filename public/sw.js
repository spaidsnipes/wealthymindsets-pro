/**
 * WealthyMindsets Pro — RETIRED service worker, now a kill switch (2026-10-04).
 *
 * The old cache-first worker (wm-pro-v2) precached /charts, /scanner, … and
 * could keep serving a stale house to any browser it still controlled. Nothing
 * registers a worker any more (ServiceWorkerRegistrar only unregisters), but a
 * browser that installed the old one re-fetches THIS file on update — so this
 * file must be the cure, not the disease: clear every cache, unregister, and
 * reload the open tabs onto the live network.
 */
self.addEventListener("install", () => { self.skipWaiting(); });

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (_) { /* nothing cached */ }
    try { await self.registration.unregister(); } catch (_) { /* already gone */ }
    try {
      const tabs = await self.clients.matchAll({ type: "window" });
      for (const tab of tabs) { try { tab.navigate(tab.url); } catch (_) { /* tab closed */ } }
    } catch (_) { /* no tabs */ }
  })());
});

// No fetch handler: every request goes straight to the network.
