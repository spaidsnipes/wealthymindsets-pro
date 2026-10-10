"use client";

/**
 * Which trade rails are connected for THIS signed-in trader — the runtime half
 * of the family verdict (instrumentCapability.ts owns the rest).
 *
 * READ ROUTES ONLY: tastytrade status, Webull status, the Alpaca paper account.
 * No order route is reachable from here. Answers are shared by every ticket in
 * the tab for a minute (one read per minute, not one per open). Fails closed:
 * an error, a refusal or no answer is NOT_CONNECTED; a guest is NOT_YOURS and
 * nothing is asked; a proof scene asks nothing (NOT_READ).
 */

import { useEffect, useState } from "react";

import type { RailConnection, RailConnections } from "./instrumentCapability";

const TTL_MS = 60_000;
let cache: { atMs: number; value: Promise<RailConnections> } | null = null;

const read = (url: string, ok: (j: Record<string, unknown>) => boolean): Promise<RailConnection> =>
  fetch(url, { cache: "no-store" })
    .then(async r => (r.status === 401 || r.status === 403 ? "NOT_YOURS" : r.ok && ok(((await r.json().catch(() => null)) ?? {}) as Record<string, unknown>) ? "CONNECTED" : "NOT_CONNECTED") as RailConnection)
    .catch((): RailConnection => "NOT_CONNECTED");

function readRails(): Promise<RailConnections> {
  const now = Date.now();
  if (cache && now - cache.atMs < TTL_MS) return cache.value;
  const value = Promise.all([
    read("/api/broker/tastytrade/status", j => j.connected === true),
    read("/api/broker/webull/status", j => j.connected === true),
    read("/api/alpaca-trading?action=account", j => j._connected === true),
  ]).then(([tastytrade, webull, paper]) => ({ tastytrade, Webull: webull, "Alpaca paper": paper }));
  cache = { atMs: now, value };
  return value;
}

const ALL = (c: RailConnection): RailConnections => ({ tastytrade: c, Webull: c, "Alpaca paper": c });

export function useTradeRails(audience: "OWNER" | "GUEST" | null, proofScene: boolean): RailConnections {
  const [rails, setRails] = useState<RailConnections>(ALL("CHECKING"));
  useEffect(() => {
    if (proofScene) { setRails(ALL("NOT_READ")); return; }
    if (audience === null) { setRails(ALL("CHECKING")); return; }
    if (audience === "GUEST") { setRails(ALL("NOT_YOURS")); return; }
    let live = true;
    void readRails().then(r => { if (live) setRails(r); });
    return () => { live = false; };
  }, [audience, proofScene]);
  return rails;
}
