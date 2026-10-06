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

export function useTastyEquityOptionLegs(symbol: string, enabled: boolean, price: number | null): readonly Leg[] | null {
  const sym = enabled ? symbol.toUpperCase().replace(/^\^/, "") : "";
  const [chain, setChain] = useState<FuturesOptionChain | null>(null);
  const [anchor, setAnchor] = useState<number | null>(null);
  useEffect(() => {
    setChain(null); setAnchor(null);
    if (!sym) return;
    let alive = true;
    fetch(`/api/broker/tastytrade/chain?symbol=${encodeURIComponent(sym)}`, { cache: "no-store" })
      .then(async r => ({ status: r.status, j: await r.json().catch(() => null) }))
      .then(({ status, j }) => {
        if (!alive || isOwnerRefusal(j, status) || j?.state !== "OK") return;
        setChain(readEquityOptionChain(j.data));
      })
      .catch(() => { /* no list: Options Flow stays silent for this symbol */ });
    return () => { alive = false; };
  }, [sym]);
  useEffect(() => { if (chain && price && price > 0 && anchor == null) setAnchor(price); }, [chain, price, anchor]);
  return useMemo(() => (chain && anchor ? pickPositioningLegs(chain, anchor) : null), [chain, anchor]);
}
