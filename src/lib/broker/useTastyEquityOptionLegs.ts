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
import { pickPositioningLegs, positioningFromLegs, useHeldPositioning, type FuturesPositioning, type Leg } from "@/lib/broker/useTastyFuturesPositioning";
import { useTastyQuotes } from "@/lib/broker/tastyQuoteStream";
import { isOwnerRefusal } from "@/lib/broker/ownerRefusal";
import { owned, readOwned, UNOWNED, type Owned } from "@/lib/marketData/symbolOwned";

export function useTastyEquityOptionLegs(symbol: string, enabled: boolean, price: number | null): readonly Leg[] | null {
  return useTastyEquityOptionLegsRead(symbol, enabled, price).legs;
}

/**
 * The legs AND why there are none (shift 2026-11-05): the owner refusal and
 * transport failure used to be swallowed here, so a guest's stock chart said
 * LOADING — rendered as "Unavailable" and "(loading)" — forever.
 */
export function useTastyEquityOptionLegsRead(symbol: string, enabled: boolean, price: number | null): { readonly legs: readonly Leg[] | null; readonly edge: string | null } {
  const sym = enabled ? symbol.toUpperCase().replace(/^\^/, "") : "";
  // Stored WITH the symbol they were read for (a switch never prices the
  // previous symbol's chain).
  const key = sym || null;
  const [ownedChain, setOwnedChain] = useState<Owned<FuturesOptionChain>>(UNOWNED);
  const [ownedAnchor, setOwnedAnchor] = useState<Owned<number>>(UNOWNED);
  const [ownedEdge, setOwnedEdge] = useState<Owned<string>>(UNOWNED);
  const chain = readOwned(ownedChain, key);
  const anchor = readOwned(ownedAnchor, key);
  const edge = readOwned(ownedEdge, key);
  useEffect(() => {
    setOwnedChain(UNOWNED); setOwnedAnchor(UNOWNED); setOwnedEdge(UNOWNED);
    if (!sym) return;
    let alive = true;
    fetch(`/api/broker/tastytrade/chain?symbol=${encodeURIComponent(sym)}`, { cache: "no-store" })
      .then(async r => ({ status: r.status, j: await r.json().catch(() => null) }))
      .then(({ status, j }) => {
        if (!alive) return;
        // Same words as the futures lane (useTastyFuturesPositioning).
        if (isOwnerRefusal(j, status)) { setOwnedEdge(owned(key, "NEEDS_A_CONNECTED_BROKER")); return; }
        if (j?.state !== "OK") { setOwnedEdge(owned(key, j?.state === "NOT_CONFIGURED" ? "TASTYTRADE_NOT_CONNECTED" : `CHAIN_${status}`)); return; }
        setOwnedChain(owned(key, readEquityOptionChain(j.data)));
      })
      .catch(() => { if (alive) setOwnedEdge(owned(key, "TRANSPORT")); });
    return () => { alive = false; };
  }, [sym]);
  useEffect(() => { if (chain && price && price > 0 && anchor == null) setOwnedAnchor(owned(key, price)); }, [chain, price, anchor, key]);
  const legs = useMemo(() => (chain && anchor ? pickPositioningLegs(chain, anchor) : null), [chain, anchor]);
  return useMemo(() => ({ legs, edge: edge ?? null }), [legs, edge]);
}

/**
 * LIVE DERIVATIVES PRESSURE FOR STOCKS, ETFs AND CASH INDICES (Founder 2026-10-12: "remove
 * anything delayed and dead"). These markets used to read Cboe's DELAYED option quotes. They now
 * stream their own near-money contracts from tastytrade — the same legs Options Flow hears — and
 * read each contract's open interest (Summary), gamma and IV (Greeks) from the one shared socket,
 * through the same receipt builder the futures lane uses (positioningFromLegs). No broker chain →
 * no receipt, said as LOADING / a named edge; never a delayed one.
 */
export function useTastyEquityPositioning(symbol: string, enabled: boolean, price: number | null): FuturesPositioning | null {
  const { legs, edge } = useTastyEquityOptionLegsRead(symbol, enabled, price);
  const streamers = useMemo(() => (legs ?? []).map(l => l.streamer), [legs]);
  const snap = useTastyQuotes(streamers);
  const live = useMemo(() => {
    if (!enabled) return null;
    if (edge) return { receipt: null, edge };
    if (!legs) return { receipt: null, edge: "LOADING" };
    const p = positioningFromLegs(legs, snap.quotes, symbol, price);
    return p.receipt ? { ...p, receipt: { ...p.receipt, underlying: symbol.toUpperCase().replace(/^\^/, "") } } : p;
  }, [enabled, legs, edge, snap, symbol, price]);
  return useHeldPositioning(live);
}
