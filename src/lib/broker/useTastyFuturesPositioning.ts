"use client";

/**
 * FUTURES OPTIONS POSITIONING FOR DERIVATIVES PRESSURE — Garden 18 §LX /
 * cross-asset portability (§LX of Garden 17: "if it works on BTC but not NQ,
 * find out why"). Cross-market run 2026-10-01: Derivatives Pressure and Brick
 * Walls read UNSUPPORTED on NQ, ES, GC, CL — Cboe lists no futures options and
 * Deribit is crypto only. tastytrade carries the futures-option chain, and its
 * DXLink stream carries each contract's open interest (Summary) and Greeks.
 *
 * This hook builds the SAME receipt the Cboe and Deribit normalizers build —
 * contract, call/put, expiration, strike, open interest, gamma, IV — for the
 * active parent future's expirations within 60 days and strikes within
 * ±STRIKE_REACH of price, capped at MAX_CONTRACTS streams on the ONE shared
 * socket. It answers only when enough contracts have reported open interest;
 * otherwise it names why. The pressure owner compiles it like any other.
 */
import { useEffect, useMemo, useState } from "react";
import { futuresProductFor, readFuturesOptionChain, type FuturesOptionChain } from "@/lib/broker/tastytradeFuturesChain";
import { useTastyQuotes } from "@/lib/broker/tastyQuoteStream";
import type { CboeOptionRow, CboeOptionsReceipt } from "@/lib/marketData/cboeDelayedOptions";
import { isOwnerRefusal } from "@/lib/broker/ownerRefusal";

const STRIKE_REACH = 0.04;
const MAX_DTE = 60;
const MAX_CONTRACTS = 160;
/** Share of the subscribed contracts that must have reported open interest. */
const MIN_REPORTED = 0.5;

export interface FuturesPositioning {
  readonly receipt: CboeOptionsReceipt | null;
  readonly edge: string | null;
  /** The contracts streamed (Options Flow hears their prints on the same socket). */
  readonly legs?: readonly Leg[];
}

export interface Leg { contract: string; streamer: string; type: "call" | "put"; expiration: string; strike: number; multiplier: number | null }

export function pickPositioningLegs(chain: FuturesOptionChain, price: number): Leg[] {
  const parent = chain.futures.find(f => f.activeMonth)?.symbol ?? chain.expirations[0]?.parent ?? null;
  if (!parent || !(price > 0)) return [];
  const exps = chain.expirations.filter(e => e.parent === parent && (e.dte ?? 999) <= MAX_DTE);
  const legs: Leg[] = [];
  for (const e of exps) {
    for (const s of e.strikes) {
      if (Math.abs(s.strike - price) / price > STRIKE_REACH) continue;
      if (s.call && s.callStreamer) legs.push({ contract: s.call, streamer: s.callStreamer, type: "call", expiration: e.expiration, strike: s.strike, multiplier: e.multiplier });
      if (s.put && s.putStreamer) legs.push({ contract: s.put, streamer: s.putStreamer, type: "put", expiration: e.expiration, strike: s.strike, multiplier: e.multiplier });
    }
  }
  // Nearest strikes first, so the cap keeps the money's neighbourhood.
  return legs.sort((a, b) => Math.abs(a.strike - price) - Math.abs(b.strike - price)).slice(0, MAX_CONTRACTS);
}

export function useTastyFuturesPositioning(symbol: string, enabled: boolean, price: number | null): FuturesPositioning | null {
  const product = enabled ? futuresProductFor(symbol) : null;
  const [chain, setChain] = useState<FuturesOptionChain | null>(null);
  const [edge, setEdge] = useState<string | null>(null);
  useEffect(() => {
    setChain(null); setEdge(null);
    if (!product) return;
    let alive = true;
    fetch(`/api/broker/tastytrade/chain?futuresOptions=${encodeURIComponent(product)}`, { cache: "no-store" })
      .then(async r => ({ status: r.status, j: await r.json().catch(() => null) }))
      .then(({ status, j }) => {
        if (!alive) return;
        // A guest's owner refusal is "no broker on this account", not a
        // CHAIN_403 fault code painted on their chart (garden pass 2026-10-05).
        if (isOwnerRefusal(j, status)) { setEdge("NEEDS_A_CONNECTED_BROKER"); return; }
        if (j?.state !== "OK") { setEdge(j?.state === "NOT_CONFIGURED" ? "TASTYTRADE_NOT_CONNECTED" : `CHAIN_${status}`); return; }
        setChain(readFuturesOptionChain(j.data));
      })
      .catch(() => { if (alive) setEdge("TRANSPORT"); });
    return () => { alive = false; };
  }, [product]);
  // Strikes chosen at the price the chain was first read against (a moving
  // price must not churn the subscription every tick).
  const [anchor, setAnchor] = useState<number | null>(null);
  useEffect(() => { if (chain && price && price > 0 && anchor == null) setAnchor(price); }, [chain, price, anchor]);
  useEffect(() => { setAnchor(null); }, [product]);
  const legs = useMemo(() => (chain && anchor ? pickPositioningLegs(chain, anchor) : []), [chain, anchor]);
  const streamers = useMemo(() => legs.map(l => l.streamer), [legs]);
  const snap = useTastyQuotes(streamers);
  return useMemo(() => {
    if (!product) return null;
    if (edge) return { receipt: null, edge };
    if (!chain || !anchor) return { receipt: null, edge: "LOADING" };
    if (legs.length === 0) return { receipt: null, edge: "NO_CONTRACTS_NEAR_PRICE" };
    const rows: CboeOptionRow[] = [];
    let dropped = 0;
    for (const l of legs) {
      const q = snap.quotes.get(l.streamer);
      if (!q || q.openInterest == null || !(q.openInterest >= 0)) { dropped++; continue; }
      rows.push({ contract: l.contract, type: l.type, expiration: l.expiration, strike: l.strike, openInterest: q.openInterest, gamma: q.gamma, iv: q.iv, volume: q.dayVolume });
    }
    if (rows.length < legs.length * MIN_REPORTED) return { receipt: null, edge: `GATHERING_OI:${rows.length}/${legs.length}`, legs };
    const ivs = rows.map(r => r.iv).filter((v): v is number => v != null && v > 0).sort((a, b) => a - b);
    const iv30 = ivs.length ? ivs[Math.floor(ivs.length / 2)] * 100 : null;
    return {
      edge: null,
      legs,
      receipt: {
        source: "TASTYTRADE_LIVE",
        underlying: symbol.toUpperCase(),
        spot: price,
        iv30,
        chainAsOf: new Date().toISOString(),
        underlyingAsOf: null,
        rows,
        dropped,
      },
    };
  }, [product, edge, chain, anchor, legs, snap, symbol, price]);
}
