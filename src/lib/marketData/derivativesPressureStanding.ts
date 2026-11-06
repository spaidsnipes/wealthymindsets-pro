/**
 * DERIVATIVES PRESSURE / BRICK WALLS — WHY NOTHING IS DRAWN, ONE OWNER.
 *
 * Shift 2026-11-05 (Lane E). Every positioning source (tastytrade futures and
 * equity chains, Deribit) hands the chart an `edge` string when it has no
 * receipt. The surfaces printed that edge raw, through two wordings:
 *
 *   Brick Walls row     "Unavailable on this feed"   for EVERY edge
 *   chart silence line  "no option positioning for TSLA (loading)"
 *
 * Both claimed an ABSENCE while the chain request was still in flight, which
 * is the "awaiting is not unavailable" defect priceSource.ts already records
 * for quotes. A guest's stock chart was worse: the equity chain hook swallowed
 * the owner refusal, so it said LOADING forever.
 *
 * This module turns an edge into a STANDING — which question is open, or what
 * was found — with plain member words. No vendor names in member words
 * (WM-CHART-PROV-EMERG-01). PURE.
 */

export type DerivativesStandingKind =
  /** The chain has not answered yet. Not a finding. */
  | "AWAITING"
  /** The chain answered and contract data is still arriving. */
  | "GATHERING"
  /** This account has no connected broker that carries the chain. */
  | "NEEDS_BROKER"
  /** No listed options market exists for this instrument on any wired source. */
  | "NO_OPTIONS_MARKET"
  /** The provider reports no open interest near price. */
  | "NO_POSITIONING"
  /** The request failed in transport or was throttled; it is retried. */
  | "UNREACHABLE"
  /** Anything else the provider said, named, never rounded into one of the above. */
  | "OTHER";

export interface DerivativesStanding {
  readonly kind: DerivativesStandingKind;
  /** True only when the question is still open (nothing has been found yet). */
  readonly pending: boolean;
  /** Short words for a row or chip. */
  readonly short: string;
  /** One sentence for the chart's silence line and tooltips. */
  readonly sentence: string;
}

export function derivativesPressureStanding(edge: string | null | undefined, symbol: string): DerivativesStanding {
  const e = String(edge ?? "").trim().toUpperCase();
  const sym = String(symbol ?? "").trim().toUpperCase() || "this market";
  if (e === "" || e === "LOADING") {
    return { kind: "AWAITING", pending: true, short: "Reading options positioning", sentence: `reading options positioning for ${sym}…` };
  }
  if (e.startsWith("GATHERING_OI")) {
    const m = /:(\d+)\/(\d+)/.exec(e);
    const n = m ? ` (${m[1]} of ${m[2]} contracts reported)` : "";
    return { kind: "GATHERING", pending: true, short: "Gathering open interest", sentence: `gathering open interest for ${sym}${n}` };
  }
  if (e === "NEEDS_A_CONNECTED_BROKER" || e === "OWNER_ONLY" || e === "TASTYTRADE_NOT_CONNECTED" || e === "NOT CONFIGURED" || e === "NOT_CONFIGURED") {
    return { kind: "NEEDS_BROKER", pending: false, short: "Needs a connected broker", sentence: `options positioning for ${sym} needs a connected broker account` };
  }
  if (e === "UNSUPPORTED") {
    return { kind: "NO_OPTIONS_MARKET", pending: false, short: "No listed options", sentence: `no listed options market is wired for ${sym}` };
  }
  if (e.startsWith("PROVIDER_REPORTS_ZERO_OI") || e === "NO_CONTRACTS_NEAR_PRICE") {
    return { kind: "NO_POSITIONING", pending: false, short: "No open interest near price", sentence: `the provider reports no open interest near ${sym}'s price` };
  }
  if (e === "TRANSPORT" || e === "TIMEOUT" || e === "RATE_LIMITED" || /^HTTP 5\d\d$/.test(e) || /^CHAIN_5\d\d$/.test(e) || e === "HTTP 429" || e === "CHAIN_429") {
    return { kind: "UNREACHABLE", pending: false, short: "Chain unreachable · retrying", sentence: `the options chain for ${sym} could not be reached — retrying` };
  }
  const named = e.replace(/_/g, " ").toLowerCase();
  return { kind: "OTHER", pending: false, short: "Chain refused", sentence: `the options chain for ${sym} was refused (${named})` };
}
