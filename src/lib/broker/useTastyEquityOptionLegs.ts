"use client";

/**
 * EQUITY / INDEX OPTION CONTRACTS FOR OPTIONS FLOW (ATHOS §6 · P-03, 2026-10-06).
 * The futures lane already streams its contracts for open interest; a stock,
 * ETF or index chart reads Brick Walls from Cboe (delayed, no prints), so its
 * Options Flow needs its own contract list: the owner's tastytrade equity
 * chain, the same near-money pick (pickPositioningLegs), read once per symbol
 * and anchored at the price it was first read against. Only the list — the
 * prints are heard by useTastyOptionFlow on the one shared socket.
 */
import { useEffect, useMemo, useState } from "react";
import { readEquityOptionChain, type FuturesOptionChain } from "@/lib/broker/tastytradeFuturesChain";
import { pickPositioningLegs, type Leg } from "@/lib/broker/useTastyFuturesPositioning";
import { isOwnerRefusal } from "@/lib/broker/ownerRefusal";
import { owned, readOwned, UNOWNED, type Owned } from "@/lib/marketData/symbolOwned";

export function useTastyEquityOptionLegs(symbol: string, enabled: boolean, price: number | null): readonly Leg[] | null {
  const sym = enabled ? symbol.toUpperCase().replace(/^\^/, "") : "";
  // Stored WITH the symbol they were read for (a switch never prices the
  // previous symbol's chain).
  const key = sym || null;
  const [ownedChain, setOwnedChain] = useState<Owned<FuturesOptionChain>>(UNOWNED);
  const [ownedAnchor, setOwnedAnchor] = useState<Owned<number>>(UNOWNED);
  const chain = readOwned(ownedChain, key);
  const anchor = readOwned(ownedAnchor, key);
  useEffect(() => {
    setOwnedChain(UNOWNED); setOwnedAnchor(UNOWNED);
    if (!sym) return;
    let alive = true;
    fetch(`/api/broker/tastytrade/chain?symbol=${encodeURIComponent(sym)}`, { cache: "no-store" })
      .then(async r => ({ status: r.status, j: await r.json().catch(() => null) }))
      .then(({ status, j }) => {
        if (!alive || isOwnerRefusal(j, status) || j?.state !== "OK") return;
        setOwnedChain(owned(key, readEquityOptionChain(j.data)));
      })
      .catch(() => { /* no list: Options Flow stays silent for this symbol */ });
    return () => { alive = false; };
  }, [sym]);
  useEffect(() => { if (chain && price && price > 0 && anchor == null) setOwnedAnchor(owned(key, price)); }, [chain, price, anchor, key]);
  return useMemo(() => (chain && anchor ? pickPositioningLegs(chain, anchor) : null), [chain, anchor]);
}
