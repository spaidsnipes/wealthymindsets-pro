"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    /* The retired PWA worker was cache-first for both /charts and Next chunks.
       `unregister()` prevents FUTURE documents from being controlled, but it
       does not release the document already open in the Founder’s browser.
       That left an exact new Cloudflare Worker serving while the authenticated
       tab kept executing an older cached shell until every controlled tab was
       closed by hand.

       Retire the registration and Cache Storage first, then reload exactly
       once when this document still has a controller. sessionStorage survives
       that navigation but is origin-local and carries no auth, so it prevents
       a reload loop without clearing cookies, localStorage, or sign-in state. */
    if (!("serviceWorker" in navigator)) return;

    const reloadKey = "wm-sw-retirement-reload-v1";
    let cancelled = false;

    void (async () => {
      const wasControlled = navigator.serviceWorker.controller !== null;
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      if (cancelled) return;
      if (wasControlled && sessionStorage.getItem(reloadKey) !== "1") {
        sessionStorage.setItem(reloadKey, "1");
        window.location.reload();
        return;
      }
      sessionStorage.removeItem(reloadKey);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
