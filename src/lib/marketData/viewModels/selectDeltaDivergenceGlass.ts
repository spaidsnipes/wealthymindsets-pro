/**
 * THE DIVERGENCE, PUT BACK ON THE TWO PRICES IT IS ABOUT.
 *
 * `selectDeltaDivergence` is a careful engine. It refuses to call any two
 * moments a divergence: the pivots come from a stated fractal rule over
 * equal-count segments, the swing must clear the window's own volume-weighted
 * spread, and the delta must actually have moved. All of that care produced a
 * VM whose only readers were two drawer panels — and the VM carries
 * `priorPivot.price` and `recentPivot.price`, which are PRICES, already on the
 * screen with candles drawn through them.
 *
 * ── THE ONE THING THIS COMPILER REFUSES HARDEST ─────────────────────────────
 *
 * IT WILL NOT PUT CUMULATIVE DELTA ON THE PRICE AXIS. The temptation is
 * obvious: the VM ships a `segments` array with a `cvd` on every segment, and
 * that is a lovely line. But a cumulative delta is measured in CONTRACTS, and
 * the axis it would be drawn against is measured in DOLLARS. Any mapping
 * between them is a scale the house invented, and once drawn, the trader reads
 * the crossing of two lines as an event. There is no crossing. There are two
 * units. So the glass carries the pivot PRICES and the cvd numbers only as
 * TEXT, never as a coordinate.
 *
 * ── AND IT WILL NOT PRETEND TO KNOW *WHEN* ──────────────────────────────────
 *
 * The pivots are indexed by SEGMENT — equal-count slices of the tape window —
 * not by timestamp. A segment index cannot be turned into an x coordinate on a
 * time axis without inventing the mapping, and a mark placed at the wrong bar
 * is worse than no mark, because it is a specific false claim. So `timeKnown`
 * is false and the caller is told to draw in a lane, not at a bar. The day the
 * engine carries timestamps, this flips and the drawing can be honest about x.
 *
 * ── SILENCE HAS THE SAME RULE AS EVERYWHERE ELSE IN THIS FAMILY ─────────────
 *
 * CONFIRMED is a real reading — price and delta made the new extreme together,
 * the move was paid for — but it is NOT a warning, and §9 says the absence of a
 * warning is only honest if the calm state is genuinely quiet. So CONFIRMED
 * draws its two prices and says so plainly, and only BEARISH/BULLISH get the
 * finding line. NO_SWING and UNMEASURED draw nothing at all.
 *
 * NO COLOUR. BEARISH and BULLISH are not a scolding and a cheer; they are the
 * same measurement pointing two ways. The verdict travels as a LEAN the canvas
 * can render in direction and edge, never as a hue.
 *
 * PURE — no React, no canvas, no clock.
 */

import type { DeltaDivergenceVM } from "./selectDeltaDivergence";

export const DIVERGENCE_GLASS_VERSION = "wm.delta-divergence-glass.v1" as const;

export type DivergenceGlassReason =
  | "UNMEASURED"
  | "NO_SWING"
  | "DRAWN";

/**
 * Which way the swing ran, in price. DOWN means the later pivot is below the
 * earlier one. This is geometry, not a verdict — the canvas needs it to draw an
 * arrow that points where the prices actually went.
 */
export type SwingLean = "UP" | "DOWN" | "FLAT";

export interface DivergenceGlassVM {
  readonly version: typeof DIVERGENCE_GLASS_VERSION;
  readonly drawn: boolean;
  readonly reason: DivergenceGlassReason;
  /** Price of the earlier compared pivot. */
  readonly priorPrice: number | null;
  /** Price of the later compared pivot. */
  readonly recentPrice: number | null;
  readonly lean: SwingLean;
  /**
   * True when the delta FAILED to follow price — the finding. False on
   * CONFIRMED, where the two prices are still worth drawing but nothing is
   * being warned about.
   */
  readonly diverged: boolean;
  /**
   * Whether the horizontal position of these marks can be trusted. Always
   * FALSE for now: the engine indexes pivots by segment, not by time. A canvas
   * that reads this as true and places a mark at a bar has invented a moment.
   */
  readonly timeKnown: boolean;
  /** The headline. Carries the swing in spreads, the honest scale. */
  readonly label: string;
  /** The finding, or null when there is none to announce. */
  readonly findingLabel: string | null;
  /**
   * The aggressor-side disclosure, or null when the venue asserted the sides
   * itself. A chart has no fine print, so this rides on the glass.
   */
  readonly disclosure: string | null;
}

function empty(reason: DivergenceGlassReason): DivergenceGlassVM {
  return {
    version: DIVERGENCE_GLASS_VERSION,
    drawn: false,
    reason,
    priorPrice: null,
    recentPrice: null,
    lean: "FLAT",
    diverged: false,
    timeKnown: false,
    label: "",
    findingLabel: null,
    disclosure: null,
  };
}

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Compile a divergence reading into the few facts a canvas may honestly draw.
 *
 * Handed null — a chart whose room computed no reading — this is UNMEASURED,
 * the same answer as a tape too thin to segment: there is nothing to place.
 */
export function selectDeltaDivergenceGlass(
  vm: DeltaDivergenceVM | null | undefined,
): DivergenceGlassVM {
  if (!vm) return empty("UNMEASURED");
  if (vm.verdict === "UNMEASURED") return empty("UNMEASURED");
  // NO_SWING is not a quiet market and not a broken one: it is the engine
  // saying the window held no two points far enough apart to compare. Drawing
  // the nearest two anyway is exactly the manufactured divergence the engine
  // spends its length refusing.
  if (vm.verdict === "NO_SWING") return empty("NO_SWING");

  const prior = vm.priorPivot?.price;
  const recent = vm.recentPivot?.price;
  // A verdict with no pivots is a contradiction upstream, not a market state.
  // Nothing is reconstructed from `segments` to paper over it.
  if (!num(prior) || !num(recent)) return empty("UNMEASURED");

  const diverged = vm.verdict === "BEARISH" || vm.verdict === "BULLISH";
  const lean: SwingLean = recent > prior ? "UP" : recent < prior ? "DOWN" : "FLAT";

  const parts = ["DELTA"];
  parts.push(diverged ? "DID NOT FOLLOW" : "FOLLOWED");
  if (num(vm.swingInSpread)) {
    // Spreads, not ticks and not percent — the same unit the value candle and
    // the absorption reading already measure travel in, so the three can be
    // compared without a conversion the trader has to do in their head.
    parts.push(`SWING ${Math.abs(vm.swingInSpread).toFixed(1)}σ`);
  } else {
    parts.push("SWING UNMEASURED");
  }

  return {
    version: DIVERGENCE_GLASS_VERSION,
    drawn: true,
    reason: "DRAWN",
    priorPrice: prior,
    recentPrice: recent,
    lean,
    diverged,
    // See the header. The engine indexes by segment; there is no timestamp to
    // place a mark with, and a mark at the wrong bar is a specific false claim.
    timeKnown: false,
    label: parts.join(" · "),
    // The engine's own sentence, unedited, and only when it found something.
    // CONFIRMED is silent — "the move was paid for" printed on the glass is a
    // safety claim the house did not earn and cannot withdraw in time.
    findingLabel: diverged ? vm.detail : null,
    // Cumulative delta IS a claim about who initiated. On US equities the sides
    // are usually inferred by a tick rule, and a chart has no fine print.
    disclosure: vm.requiresDisclosure ? "SIDES INFERRED" : null,
  };
}

export default selectDeltaDivergenceGlass;
