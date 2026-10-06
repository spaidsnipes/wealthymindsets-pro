"use client";

/**
 * ONE answer per underlying to "which tastytrade streamer symbol prices this
 * OCC contract?" — read once per page from tastytrade's own nested chain
 * (tastyStreamerMap) and shared by every consumer: the chain table, the
 * selected expression, the preflight. A refusal (guest, not connected) is
 * remembered as an empty map so nobody keeps asking.
 */

import { owned, readOwned, UNOWNED, type Owned } from "@/lib/marketData/symbolOwned";
import { useEffect, useState } from "react";

import { compactOcc, tastyStreamerMap } from "@/lib/broker/tastyOptionOverlay";

const cache = new Map<string, Promise<Map<string, string>>>();

export function tastyOptionStreamers(underlying: string): Promise<Map<string, string>> {
  const key = underlying.trim().toUpperCase();
  if (!key) return Promise.resolve(new Map());
  let p = cache.get(key);
  if (!p) {
    p = fetch(`/api/broker/tastytrade/chain?symbol=${encodeURIComponent(key)}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(j => (j?.state === "OK" ? tastyStreamerMap(j.data) : new Map<string, string>()))
      .catch(() => new Map<string, string>());
    cache.set(key, p);
    // An empty answer (refused / failed) is retried on the next ask, not kept (garden pass 2026-10-04).
    void p.then(m => { if (m.size === 0 && cache.get(key) === p) cache.delete(key); });
  }
  return p;
}

/** Sign-out: forget the previous account's streamer maps. */
export function forgetTastyOptionStreamers(): void { cache.clear(); }

/** The map for an underlying (null while it is being read). */
export function useTastyOptionStreamers(underlying: string): Map<string, string> | null {
  // Garden 18 §4: stored WITH its underlying — the first frame after a switch
  // never answers "read" with the previous underlying's map.
  const [ownedMap, setOwnedMap] = useState<Owned<Map<string, string>>>(UNOWNED);
  useEffect(() => {
    let live = true;
    setOwnedMap(UNOWNED);
    void tastyOptionStreamers(underlying).then(m => { if (live) setOwnedMap(owned(underlying, m)); });
    return () => { live = false; };
  }, [underlying]);
  return readOwned(ownedMap, underlying);
}

export const streamerForOcc = (map: Map<string, string> | null, occ: string | undefined | null) =>
  map && occ ? map.get(compactOcc(occ)) ?? null : null;
