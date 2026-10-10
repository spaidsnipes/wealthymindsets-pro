/**
 * THE CHAIN'S COLUMNS (ruling 2026-10-10) — which numbers a strike row shows, and each cell's words. PURE.
 *
 *   DESKTOP (≥ CHAIN_WIDE_MIN_PX): BID · MID · ASK · SPREAD · OI · IV · Δ · Γ · Θ, all visible, no switch.
 *   TABLET / PHONE: BID · ASK plus ONE switchable pair; the default pair is MID · SPREAD.
 *
 * MID is shown only when BOTH sides are live (readContractQuote state LIVE); otherwise "—" with the reason.
 * SPREAD is ask − bid in PRICE units (the same rule). Greeks, IV and OI are tastytrade's own values, "—" when
 * not received. Calls read toward the strike, puts away from it; BID stays left of ASK on both sides.
 */

import { readContractQuote, type ContractQuoteState } from "./tastyContractQuote";

export const CHAIN_WIDE_MIN_PX = 1100;

export type ChainKey = "BID" | "MID" | "ASK" | "SPREAD" | "OI" | "IV" | "DELTA" | "GAMMA" | "THETA" | "VEGA";
export type ChainPair = "MID_SPREAD" | "DELTA_THETA" | "GAMMA_VEGA" | "IV_OI";
export const CHAIN_PAIRS: Readonly<Record<ChainPair, readonly [ChainKey, ChainKey]>> = {
  MID_SPREAD: ["MID", "SPREAD"], DELTA_THETA: ["DELTA", "THETA"], GAMMA_VEGA: ["GAMMA", "VEGA"], IV_OI: ["IV", "OI"],
};
export const CHAIN_PAIR_WORDS: Readonly<Record<ChainPair, string>> = {
  MID_SPREAD: "Mid · Spread", DELTA_THETA: "Δ · Θ", GAMMA_VEGA: "Γ · Vega", IV_OI: "IV · OI",
};
export const DEFAULT_NARROW_PAIR: ChainPair = "MID_SPREAD";
export const CHAIN_HEAD: Readonly<Record<ChainKey, string>> = {
  BID: "BID", MID: "MID", ASK: "ASK", SPREAD: "SPREAD", OI: "OI", IV: "IV", DELTA: "Δ", GAMMA: "Γ", THETA: "Θ", VEGA: "Vega",
};

/** Puts' columns, strike outward. */
export function putColumns(wide: boolean, pair: ChainPair): readonly ChainKey[] {
  return wide ? ["BID", "MID", "ASK", "SPREAD", "OI", "IV", "DELTA", "GAMMA", "THETA"] : ["BID", "ASK", ...CHAIN_PAIRS[pair]];
}
/** Calls' columns, left edge → strike (the mirror of the puts, with BID · MID · ASK kept in reading order). */
export function callColumns(wide: boolean, pair: ChainPair): readonly ChainKey[] {
  return wide ? ["THETA", "GAMMA", "DELTA", "IV", "OI", "SPREAD", "BID", "MID", "ASK"] : [...[...CHAIN_PAIRS[pair]].reverse(), "BID", "ASK"];
}

const px = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? null : n.toFixed(d));

/** One cell: its text, and — when it is "—" — why. */
export function chainCell(q: ContractQuoteState | undefined, stream: Parameters<typeof readContractQuote>[1], nowMs: number, key: ChainKey): { readonly text: string; readonly why: string | null } {
  const dash = (why: string) => ({ text: "—", why });
  if (!q) return dash("not quoted on this stream yet");
  const r = readContractQuote(q, stream, nowMs);
  switch (key) {
    case "BID": return q.quoteAt != null && px(q.bid) ? { text: px(q.bid)!, why: null } : dash("no bid received");
    case "ASK": return q.quoteAt != null && px(q.ask) ? { text: px(q.ask)!, why: null } : dash("no ask received");
    case "MID":
    case "SPREAD": {
      if (r.state !== "LIVE") return dash(`mid and spread need both sides live — this quote is ${r.state.toLowerCase()}`);
      const v = key === "MID" ? r.mark : r.spread;
      // A mid between two cent ticks keeps its half cent (1.35 × 1.36 → 1.355), never rounded onto a tick it is not.
      return v != null ? { text: Math.abs(v * 100 - Math.round(v * 100)) > 1e-6 ? v.toFixed(3) : v.toFixed(2), why: null } : dash("both sides are needed");
    }
    case "OI": return q.openInterest != null ? { text: String(Math.round(q.openInterest)), why: null } : dash("open interest not received");
    case "IV": return q.iv != null ? { text: `${(q.iv * 100).toFixed(1)}%`, why: null } : dash("IV not received");
    case "DELTA": return px(q.delta, 2) ? { text: px(q.delta, 2)!, why: null } : dash("Greeks not received");
    case "GAMMA": return px(q.gamma, 4) ? { text: px(q.gamma, 4)!, why: null } : dash("Greeks not received");
    case "THETA": return px(q.theta, 3) ? { text: px(q.theta, 3)!, why: null } : dash("Greeks not received");
    case "VEGA": return px(q.vega, 3) ? { text: px(q.vega, 3)!, why: null } : dash("Greeks not received");
  }
}
