/**
 * FVG RELATIONSHIPS FROM BARS ALONE — for readers that hold only bars
 * (Backtest Lab, Scanner). Garden 19 §12, §16–§18.
 *
 * Two owners can be asked from closed bars without hindsight:
 *   STRUCTURE  selectMarketStructure over the series; fvgRelationships keeps
 *              only swings CONFIRMED before b2 opened.
 *   PROFILE    selectVisibleRangeProfile over the FVG_CONTEXT_PROFILE_BARS
 *              closed bars BEFORE b1 — the profile as it stood when the gap
 *              began forming, never one that includes later bars. Bar-built,
 *              so the owner says CANDLE-EST and the evidence word is PARTIAL.
 * Walls need an options chain or a book; bars carry neither, so the WALL
 * family is SILENCE here — said, not guessed.
 *   EFFORT→RESPONSE (§13) the Response Matrix cell of b2 and of each touch bar,
 *              each ranked over the closed bars ending at it (fvgEffortFlow);
 *              SILENCE where the market reports no traded volume.
 *   ORDER FLOW (§14) needs signed volume; bars carry none — SILENCE, said.
 *
 * PURE.
 */

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { selectMarketStructure } from "@/lib/marketData/viewModels/selectMarketStructure";
import { selectVisibleRangeProfile } from "@/lib/marketData/viewModels/selectVisibleRangeProfile";
import { instrumentTickFor } from "@/lib/chart/pricePrecision";
import { volumeTruthFor, type VolumeTruth } from "@/lib/chart/volumeTruth";
import type { FvgObject } from "./fvgEngine";
import { effortFlowIndex, fvgEffortInput, fvgFlowInput } from "./fvgEffortFlow";
import {
  fvgRelationshipsFor,
  relationshipBarSec,
  type FvgRelationshipReading,
  type ProfileInput,
  type StructureInput,
} from "./fvgRelationships";

export const FVG_CONTEXT_PROFILE_BARS = 100;
export const FVG_CONTEXT_PROFILE_LABEL = `Range profile of the ${FVG_CONTEXT_PROFILE_BARS} bars before formation`;

export interface FvgBarContext {
  readonly structure: StructureInput | null;
  readonly bars: readonly CanonicalBar[];
  readonly indexById: ReadonlyMap<string, number>;
  readonly symbol: string;
  /** Bar open time (ms) → index, for the effort / flow anchors. */
  readonly indexByAsOf: ReadonlyMap<number, number>;
  /** volumeTruth's verdict for the series, asked once. */
  readonly volume: VolumeTruth;
}

/** Ask the structure owner once per series. */
export function fvgBarContext(bars: readonly CanonicalBar[], symbol: string, timeframe: string): FvgBarContext {
  const barSec = relationshipBarSec(timeframe);
  const vm = selectMarketStructure(bars.map(b => ({ time: b.asOf / 1000, high: b.high, low: b.low })));
  const indexById = new Map<string, number>();
  bars.forEach((b, i) => indexById.set(b.barId, i));
  return { structure: barSec ? { vm, barSec } : null, bars, indexById, symbol, indexByAsOf: effortFlowIndex(bars), volume: volumeTruthFor(symbol, bars) };
}

/** The profile owner's reading of the bars before b1, as a relationship input. */
export function fvgPriorProfile(ctx: FvgBarContext, o: FvgObject): ProfileInput {
  const i = ctx.indexById.get(o.bars.b1.barId);
  if (i === undefined || i < 1) {
    return { owner: "selectVisibleRangeProfile", label: FVG_CONTEXT_PROFILE_LABEL, drawn: false, quality: null, poc: null, vah: null, val: null, reason: "no bars before the gap formed" };
  }
  const win = ctx.bars.slice(Math.max(0, i - FVG_CONTEXT_PROFILE_BARS), i);
  const tuples = win.map(b => ({ time: b.asOf / 1000, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume }));
  const vm = selectVisibleRangeProfile(tuples, tuples[0].time, tuples[tuples.length - 1].time, instrumentTickFor(ctx.symbol, win[win.length - 1].close));
  return {
    owner: "selectVisibleRangeProfile",
    label: FVG_CONTEXT_PROFILE_LABEL,
    drawn: vm.drawn,
    quality: vm.quality,
    poc: vm.poc,
    vah: vm.vah,
    val: vm.val,
    reason: vm.drawn ? null : `the profile did not draw: ${vm.reason}`,
  };
}

/** Why bars alone carry no order flow. */
export const BARS_CARRY_NO_SIGNED_VOLUME = "these bars carry no signed volume (trades marked at the bid or the ask) — candles are never read as order flow";

/** Structure + prior-profile + effort→response relationships for one object; walls and order flow SILENCE. */
export function fvgBarOnlyRelationships(ctx: FvgBarContext, o: FvgObject): FvgRelationshipReading {
  return fvgRelationshipsFor(o, {
    structure: ctx.structure, profiles: [fvgPriorProfile(ctx, o)], derivatives: null, liquidity: null,
    effort: fvgEffortInput(o, ctx.bars, ctx.symbol, { index: ctx.indexByAsOf, volumeReal: ctx.volume.real, volumeSilenceWhy: ctx.volume.real ? null : ctx.volume.title }),
    flow: fvgFlowInput(o, ctx.bars, null, { silenceWhy: BARS_CARRY_NO_SIGNED_VOLUME }),
  }, ctx.bars);
}
