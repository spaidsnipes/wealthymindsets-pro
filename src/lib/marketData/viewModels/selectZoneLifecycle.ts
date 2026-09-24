/**
 * THE ZONE LIFECYCLE OWNER — what happened every time price came back.
 *
 * Child: MARKET OBJECT PASSPORT · BIOGRAPHY (tests · defense · consumption ·
 * invalidation · age). Parent: F11 Market Object Passport. Class: ENGINE
 * feeding INSPECTOR. Plate: the Founder's Market Object Passport mockup
 * (selected zone on price; Birth · Age · Touches · Response History ·
 * Current State · Source Fidelity · Invalidation Condition).
 *
 * `selectStructureMarketObjects` said it plainly: "No lifecycle owner exists
 * yet. A later touch could mean TESTED, DEFENDED, CONSUMED or INVALID;
 * choosing among them here would make this selector a second market." This
 * is that owner, and the ONLY place those words are chosen.
 *
 * ── THE RULES, STATED ONCE ─────────────────────────────────────────────────
 *
 * A DEMAND zone sits under price (born at a swing low); a SUPPLY zone sits
 * over it (born at a swing high). Only bars AFTER the birth bar are read.
 *
 *   TOUCH — an episode of consecutive bars whose range enters the zone.
 *   Each episode ends with exactly one response:
 *     REJECTED  — price left the zone on the side it came from (defended).
 *     INVALIDATED — a bar CLOSED beyond the far edge (demand: below the low;
 *                   supply: above the high). Lifecycle stops there.
 *     OPEN      — the episode is still running at the newest bar.
 *   A touch whose wick went through the far edge without a close beyond it
 *   is marked `swept` — liquidity taken, zone not broken.
 *
 *   STATE
 *     INVALID  — any close beyond the far edge.
 *     CONSUMED — alive, but at least one touch swept through the far edge.
 *     DEFENDED — alive, at least one REJECTED touch, none swept.
 *     TESTED   — touched, no response yet (the only touch is OPEN).
 *     ALIVE    — never touched since birth.
 *
 * No probability, no half-life, no "strength". Decay is what happened —
 * age in bars and in time, and how many times it was tested — nothing
 * projected.
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import type { MarketObjectState } from "@/lib/marketData/marketObjectKinds";

export const ZONE_LIFECYCLE_VERSION = 1;

export type ZoneSide = "DEMAND" | "SUPPLY";
export type TouchResponse = "REJECTED" | "INVALIDATED" | "OPEN";

export interface ZoneInput {
  readonly side: ZoneSide;
  readonly low: number;
  readonly high: number;
  /** Time (unix seconds) of the bar the zone was born at. */
  readonly birthTime: number;
}

export interface ZoneTouch {
  /** First bar of the episode (unix seconds). */
  readonly start: number;
  /** Last bar of the episode (unix seconds). */
  readonly end: number;
  readonly bars: number;
  readonly response: TouchResponse;
  /** Wick went through the far edge without a close beyond it. */
  readonly swept: boolean;
}

export interface ZoneLifecycle {
  readonly version: number;
  readonly state: MarketObjectState;
  readonly touches: readonly ZoneTouch[];
  /** The close that ends the zone: demand → below `low`; supply → above `high`. */
  readonly invalidationPrice: number;
  readonly invalidatedAt: number | null;
  /** Bars since birth, and the newest bar's time — age, stated not projected. */
  readonly barsSinceBirth: number;
  readonly asOf: number | null;
}

export function selectZoneLifecycle(
  zone: ZoneInput,
  input: readonly LegacyOhlcvTuple[] | null | undefined,
): ZoneLifecycle {
  const bars = [...(input ?? [])]
    .filter(b => Number.isFinite(b.time) && Number.isFinite(b.high) && Number.isFinite(b.low))
    .sort((a, b) => a.time - b.time);
  const after = bars.filter(b => b.time > zone.birthTime);
  const demand = zone.side === "DEMAND";
  const invalidationPrice = demand ? zone.low : zone.high;

  const enters = (b: LegacyOhlcvTuple) => b.low <= zone.high && b.high >= zone.low;
  const closesBeyond = (b: LegacyOhlcvTuple) => (demand ? b.close < zone.low : b.close > zone.high);
  const wicksThrough = (b: LegacyOhlcvTuple) => (demand ? b.low < zone.low : b.high > zone.high);

  const touches: ZoneTouch[] = [];
  let invalidatedAt: number | null = null;
  let ep: { start: number; end: number; bars: number; swept: boolean } | null = null;

  for (const b of after) {
    if (enters(b)) {
      if (!ep) ep = { start: b.time, end: b.time, bars: 0, swept: false };
      ep.end = b.time;
      ep.bars++;
      if (closesBeyond(b)) {
        touches.push({ ...ep, response: "INVALIDATED", swept: ep.swept });
        invalidatedAt = b.time;
        ep = null;
        break;
      }
      if (wicksThrough(b)) ep.swept = true;
    } else if (ep) {
      // Left the zone. A close beyond the far edge without re-entering is
      // impossible for a bar that did not enter; so this bar left on the
      // near side — the zone held.
      touches.push({ ...ep, response: "REJECTED" });
      ep = null;
    } else if (closesBeyond(b)) {
      // Gapped straight through without a bar inside the zone.
      touches.push({ start: b.time, end: b.time, bars: 1, response: "INVALIDATED", swept: false });
      invalidatedAt = b.time;
      break;
    }
  }
  if (ep) touches.push({ ...ep, response: "OPEN" });

  let state: MarketObjectState;
  if (invalidatedAt !== null) state = "INVALID";
  else if (touches.some(t => t.swept)) state = "CONSUMED";
  else if (touches.some(t => t.response === "REJECTED")) state = "DEFENDED";
  else if (touches.length > 0) state = "TESTED";
  else state = "ALIVE";

  return {
    version: ZONE_LIFECYCLE_VERSION,
    state,
    touches,
    invalidationPrice,
    invalidatedAt,
    barsSinceBirth: after.length,
    asOf: bars.length ? bars[bars.length - 1].time : null,
  };
}

export default selectZoneLifecycle;
