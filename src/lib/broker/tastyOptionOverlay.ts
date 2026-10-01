/**
 * LIVE EQUITY-OPTION QUOTES OVER THE CHAIN INVENTORY — Garden 18 §L–§LIV.
 *
 * The chain's INVENTORY (which contracts exist) stays the reviewed Alpaca
 * snapshot; the PRICE of a visible contract comes from tastytrade's DXLink
 * stream when tastytrade sends one. The streamer symbol is never assembled
 * here: it is read from tastytrade's own nested chain, which pairs each OCC
 * contract (`TSLA  261002C00355000`) with its streamer (`.TSLA261002C355`,
 * `.TSLA261002C357.5` — read from the live chain 2026-10-01).
 *
 * A live field replaces a reference field only where tastytrade sent a value;
 * a missing live value never erases a reference one, and the row says which
 * side is live so the glass can label it. PURE.
 */

import type { ContractQuoteState } from "@/lib/broker/tastyContractQuote";

/** OCC with the root padding removed: `TSLA  261002C00355000` → `TSLA261002C00355000` (Alpaca's spelling). */
export const compactOcc = (occ: string) => occ.replace(/\s+/g, "").toUpperCase();

/** tastytrade's nested equity-option chain → compact OCC → streamer symbol. */
export function tastyStreamerMap(chainData: unknown): Map<string, string> {
  const out = new Map<string, string>();
  const d = (chainData ?? {}) as { items?: unknown[]; data?: { items?: unknown[] } };
  const items = d.items ?? d.data?.items ?? [];
  for (const item of items) {
    for (const exp of ((item as { expirations?: unknown[] }).expirations ?? [])) {
      for (const k of ((exp as { strikes?: unknown[] }).strikes ?? [])) {
        const s = k as Record<string, unknown>;
        for (const side of ["call", "put"] as const) {
          const occ = s[side];
          const streamer = s[`${side}-streamer-symbol`];
          if (typeof occ === "string" && typeof streamer === "string" && streamer) out.set(compactOcc(occ), streamer);
        }
      }
    }
  }
  return out;
}

export interface OptionQuoteFields {
  bid?: number; ask?: number; last?: number;
  impliedVolatility?: number; delta?: number; gamma?: number;
  theta?: number; vega?: number; openInterest?: number; volume?: number;
}

/** The contract's fields with tastytrade's live values laid over them where they exist. */
export function overlayLiveQuote<T extends OptionQuoteFields>(ref: T, q: ContractQuoteState | undefined): { readonly fields: T; readonly live: boolean } {
  if (!q || q.quoteAt == null) return { fields: ref, live: false };
  const pick = (live: number | null, old: number | undefined) => (live != null ? live : old);
  return {
    live: true,
    fields: {
      ...ref,
      bid: pick(q.bid, ref.bid),
      ask: pick(q.ask, ref.ask),
      last: pick(q.last, ref.last),
      impliedVolatility: pick(q.iv, ref.impliedVolatility),
      delta: pick(q.delta, ref.delta),
      gamma: pick(q.gamma, ref.gamma),
      theta: pick(q.theta, ref.theta),
      vega: pick(q.vega, ref.vega),
      openInterest: pick(q.openInterest, ref.openInterest),
      volume: pick(q.dayVolume, ref.volume),
    },
  };
}
