/**
 * OPTIONS FLOW EVENTS — large option prints on the underlying's chart
 * (Garden 18 ATHOS order §6, PROPOSED plate P-03 "Options flow · large
 * contracts on price"; extends Big Trades + Market Sense). PURE.
 *
 * Source: the owner's tastytrade DXLink TimeAndSale on the futures-option
 * contracts Brick Walls already streams for open interest — each print with the
 * exchange's aggressor side (BUY / SELL / UNDEFINED) and the contract's bid /
 * ask at the print.
 *
 * What a mark claims, and what it refuses to:
 *   - QUALIFYING: size ≥ max(MIN_CONTRACTS, 3 × the median size of the prints
 *     heard so far, once 20 are heard). The rule travels in the receipt.
 *   - SIDE: the exchange's aggressor when stamped; otherwise ASK-NEAR / BID-NEAR
 *     from the print against its own bid / ask, labelled INFERRED; otherwise "?".
 *   - OPEN / CLOSE is never known from this source — always UNKNOWN.
 *   - MULTI-LEG?: two qualifying prints on DIFFERENT contracts at the same
 *     instant with the same size are flagged, never merged or explained.
 *   - Duplicates (the same contract, time and sequence heard twice) fold once.
 *   - Premium is an ESTIMATE (price × size × the chain's multiplier) and is
 *     absent when the multiplier is unknown.
 */

export type FlowSide = "BUY" | "SELL" | "ASK_NEAR" | "BID_NEAR" | "UNKNOWN";

export interface OptionPrint {
  readonly streamer: string;
  readonly timeMs: number;
  readonly sequence: number | null;
  readonly price: number;
  readonly size: number;
  readonly aggressor: "BUY" | "SELL" | "UNDEFINED" | null;
  readonly bid: number | null;
  readonly ask: number | null;
  /** dxFeed's TimeAndSale type: a CORRECTION replaces, a CANCEL removes, the print with the same time + sequence. */
  readonly kind?: "NEW" | "CORRECTION" | "CANCEL" | null;
  /** The exchange marked this print as one leg of a spread. */
  readonly spreadLeg?: boolean;
}

export interface OptionLeg {
  readonly contract: string;
  readonly type: "call" | "put";
  readonly strike: number;
  readonly expiration: string;
  readonly multiplier: number | null;
}

export interface OptionFlowEvent {
  readonly id: string;
  readonly timeMs: number;
  readonly contract: string;
  readonly type: "call" | "put";
  readonly strike: number;
  readonly expiration: string;
  readonly size: number;
  readonly price: number;
  readonly side: FlowSide;
  /** True when the side came from the exchange's aggressor stamp. */
  readonly sideStamped: boolean;
  readonly premiumEst: number | null;
  readonly multiLeg: boolean;
}

export interface OptionFlowVM {
  readonly events: readonly OptionFlowEvent[];
  readonly heard: number;
  readonly minSize: number;
  /** The earliest print heard (epoch ms) — the lane's coverage start; null when none. */
  readonly fromMs: number | null;
  readonly receipt: string;
}

export const MIN_CONTRACTS = 5;
const MEDIAN_MULTIPLE = 3;
const MEDIAN_SAMPLE = 20;

export function sideOf(p: OptionPrint): { side: FlowSide; stamped: boolean } {
  if (p.aggressor === "BUY" || p.aggressor === "SELL") return { side: p.aggressor, stamped: true };
  if (p.ask != null && p.ask > 0 && p.price >= p.ask) return { side: "ASK_NEAR", stamped: false };
  if (p.bid != null && p.bid > 0 && p.price <= p.bid) return { side: "BID_NEAR", stamped: false };
  return { side: "UNKNOWN", stamped: false };
}

export function selectOptionFlowEvents(
  prints: readonly OptionPrint[],
  legs: ReadonlyMap<string, OptionLeg>,
  maxEvents = 40,
): OptionFlowVM {
  // One print per (contract, time, sequence), in arrival order: a repeat folds
  // once, a CORRECTION replaces what it corrects, a CANCEL removes it.
  const byKey = new Map<string, OptionPrint>();
  for (const p of prints) {
    if (!legs.has(p.streamer)) continue;
    const key = `${p.streamer}|${p.timeMs}|${p.sequence ?? ""}`;
    if (p.kind === "CANCEL") { byKey.delete(key); continue; }
    if (!(Number.isFinite(p.size) && p.size > 0 && Number.isFinite(p.price) && p.price >= 0 && Number.isFinite(p.timeMs))) continue;
    if (byKey.has(key) && p.kind !== "CORRECTION") continue;
    byKey.set(key, p);
  }
  const clean = [...byKey.values()];
  const sizes = clean.map(p => p.size).sort((a, b) => a - b);
  const median = sizes.length ? sizes[Math.floor((sizes.length - 1) / 2)] : 0;
  // A median from a handful of prints is the big prints themselves: the
  // relative rule waits for MEDIAN_SAMPLE prints, the floor applies before.
  const minSize = Math.max(MIN_CONTRACTS, sizes.length >= MEDIAN_SAMPLE ? Math.ceil(MEDIAN_MULTIPLE * median) : 0);
  const big = clean.filter(p => p.size >= minSize).sort((a, b) => a.timeMs - b.timeMs);
  // Same instant + same size → the contracts that printed it (one pass, not
  // every pair: a session of SPY prints is thousands of qualifying rows).
  const twins = new Map<string, Set<string>>();
  for (const p of big) {
    const k = `${p.timeMs}|${p.size}`;
    const set = twins.get(k) ?? new Set<string>();
    set.add(p.streamer);
    twins.set(k, set);
  }
  const events: OptionFlowEvent[] = big.map(p => {
    const leg = legs.get(p.streamer)!;
    const { side, stamped } = sideOf(p);
    const multiLeg = p.spreadLeg === true || (twins.get(`${p.timeMs}|${p.size}`)?.size ?? 0) > 1;
    return {
      id: `${p.streamer}|${p.timeMs}|${p.sequence ?? ""}`,
      timeMs: p.timeMs, contract: leg.contract, type: leg.type, strike: leg.strike, expiration: leg.expiration,
      size: p.size, price: p.price, side, sideStamped: stamped,
      premiumEst: leg.multiplier != null && leg.multiplier > 0 ? p.price * p.size * leg.multiplier : null,
      multiLeg,
    };
  })
    // The LARGEST qualify for the budget, not the newest (serving SPY overnight:
    // the 40 newest all sat in the closing minutes), then back to time order.
    .sort((a, b) => b.size - a.size || b.timeMs - a.timeMs)
    .slice(0, maxEvents)
    .sort((a, b) => a.timeMs - b.timeMs);
  let fromMs: number | null = null;
  for (const p of clean) if (fromMs == null || p.timeMs < fromMs) fromMs = p.timeMs;
  return {
    events, heard: clean.length, minSize, fromMs,
    receipt: `OPTFLOW:HEARD:${clean.length}|MIN:${minSize}|EVENTS:${events.length}|STAMPED:${events.filter(e => e.sideStamped).length}`,
  };
}

/** "CALL BUY", "PUT ASK-NEAR (inferred)", "CALL ?" — the mark's words, one owner. */
export function flowSideWords(e: OptionFlowEvent): string {
  const t = e.type === "call" ? "CALL" : "PUT";
  const s = e.side === "BUY" ? "BUY" : e.side === "SELL" ? "SELL" : e.side === "ASK_NEAR" ? "ASK-NEAR · inferred" : e.side === "BID_NEAR" ? "BID-NEAR · inferred" : "SIDE ?";
  return `${t} ${s}${e.multiLeg ? " · MULTI-LEG?" : ""} · open/close unknown`;
}
