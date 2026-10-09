/**
 * INSPECT ↔ FVG RELATIONSHIPS — the chart room's one call (Garden 19 §12, §16–§18).
 *
 * /charts already holds every owner's reading this needs (ChartsDashboard:
 * `chartStructureVM` = selectMarketStructure, `livingProfileVM` =
 * selectLivingProfile, `derivativesPressureVM` = selectDerivativesPressure,
 * the candle / book liquidity lifecycle). This adapter turns those VMs into
 * `fvgRelationshipsFor` inputs — no owner is re-run here — and returns the
 * Inspect rows (spatial order, each with its source evidence word +
 * provenance) and the silences.
 *
 * PURE.
 */

import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import type { FvgObject } from "./fvgEngine";
import type { MarketStructureVM } from "@/lib/marketData/viewModels/selectMarketStructure";
import type { LivingProfileVM } from "@/lib/marketData/viewModels/selectLivingProfile";
import type { DerivativesPressureVM } from "@/lib/marketData/viewModels/selectDerivativesPressure";
import type { LiquidityLifecycleVM } from "@/lib/marketData/viewModels/selectLiquidityLifecycle";
import { regimeSeriesReach, type RegimeSeriesPoint } from "@/lib/marketData/viewModels/selectRegimeSeries";
import { fvgVolatilityAtFormationByTime } from "./fvgFormationContext";
import { effortFlowIndex, fvgEffortInput, fvgFlowInput, type SignedBarVolume } from "./fvgEffortFlow";
import {
  fvgRelationshipRows,
  fvgRelationshipsFor,
  relationshipBarSec,
  type FvgRelationshipReading,
  type ProfileInput,
} from "./fvgRelationships";

/** A LivingProfileVM as a relationship input (the owner's own fields, nothing recomputed). */
export function livingProfileInput(vm: LivingProfileVM | null | undefined): ProfileInput | null {
  if (!vm) return null;
  return {
    owner: "selectLivingProfile",
    label: "Living Profile",
    drawn: vm.measured,
    quality: vm.quality,
    poc: vm.poc,
    vah: vm.vah,
    val: vm.val,
    hvn: vm.nodesMeasured ? vm.hvn.map(n => n.price) : [],
    lvn: vm.nodesMeasured ? vm.lvn.map(n => n.price) : [],
    reason: vm.measured ? null : vm.missingInputNote,
  };
}

/**
 * §14 — one bar's signed volume from the chart's two owners, in ladder order: the captured tape's
 * row for that bar (TAPE), else the provider's per-bar bid / ask volume (SIDES), else null.
 * A tape bar whose previous bar holds no tape is the first bar the tape was heard on — it cannot be
 * proven whole (tapeCvd's own law), so it is marked partial.
 */
export function chartSignedAt(
  chartBars: readonly Pick<LegacyOhlcvTuple, "time">[],
  tapeAt: ((barTimeSec: number) => { readonly buy: number; readonly sell: number } | null) | null | undefined,
  sidesAt: ((barTimeSec: number) => { readonly buy: number; readonly sell: number } | null | undefined) | null | undefined,
): (barTimeSec: number) => SignedBarVolume | null {
  let prevOf: Map<number, number> | null = null;
  return t => {
    const tape = tapeAt ? tapeAt(t) : null;
    if (tape && tape.buy + tape.sell > 0) {
      if (!prevOf) { prevOf = new Map(); for (let i = 1; i < chartBars.length; i++) prevOf.set(Number(chartBars[i].time), Number(chartBars[i - 1].time)); }
      const prev = prevOf.get(t);
      const before = prev !== undefined && tapeAt ? tapeAt(prev) : null;
      return { buy: tape.buy, sell: tape.sell, basis: "TAPE", partial: !(before && before.buy + before.sell > 0) };
    }
    const sides = sidesAt ? sidesAt(t) : null;
    return sides && sides.buy + sides.sell > 0 ? { buy: sides.buy, sell: sides.sell, basis: "SIDES" } : null;
  };
}

/** One bar's tape-regime reading as the chart's series holds it (selectRegimeSeries' own point). */
export type TapeRegimePoint = RegimeSeriesPoint;

/** Epoch seconds, whichever unit a series or a caller used (ms values are far above any seconds clock). */
const toSec = (t: number) => (Math.abs(t) > 1e11 ? t / 1000 : t);

/**
 * §5 — the regime AT FORMATION, tape scope, BY REFERENCE: read from the chart's own regime series
 * each time Inspect opens, never stored on the gap (a tape reading cannot be recomputed once the
 * tape is gone). `series` is null when the chart keeps no series (Regime Lighting off).
 *
 * The bar is found by CONTAINMENT — the last series bar whose open is at or before b2's open and
 * whose successor (if any) opens after it — so a session-aligned bucket or a clock in ms still
 * finds its bar (cert-lane defect 2026-10-09: an exact-equality lookup never read a word).
 *
 * THREE honest outcomes, never two:
 *   the tape reaches the bar and the regime owner names it   → the owner's word;
 *   the tape reaches the bar but the owner gave no verdict   → "not classified", with the owner's reason
 *                                                              (it is NOT "the tape does not reach");
 *   the tape does not reach the bar (or it is not in the series) → "not read", with how far the tape
 *                                                              regime does reach (regimeSeriesReach).
 */
export function tapeRegimeAtFormationLine(series: readonly TapeRegimePoint[] | null | undefined, b2Open: number): string {
  if (!series) return "Regime at formation (tape): not read — the chart keeps the tape regime per bar only while Regime Lighting is on.";
  const at = toSec(b2Open);
  let p: TapeRegimePoint | null = null;
  for (let i = 0; i < series.length; i++) {
    const open = toSec(series[i].time);
    if (open > at) break;
    const next = i + 1 < series.length ? toSec(series[i + 1].time) : Infinity;
    if (at < next) { p = series[i]; break; }
  }
  // The newest bar has no successor: it only "contains" b2 when b2 opened within one bar length of it.
  if (p && series.length > 1 && p === series[series.length - 1]) {
    const step = toSec(series[series.length - 1].time) - toSec(series[series.length - 2].time);
    if (step > 0 && at - toSec(p.time) >= step) p = null;
  }
  if (p && p.basis === "TAPE" && p.state !== "UNKNOWN") return `Regime at formation (tape): ${p.state}.`;
  if (p && p.basis === "TAPE") return `Regime at formation (tape): not classified — ${p.why ? p.why.replace(/[.\s]+$/, "") : "the regime owner gave no verdict for this bar"}.`;
  return `Regime at formation (tape): not read — the tape does not reach this bar. ${regimeSeriesReach(series).words}`;
}

export interface FvgInspectRelationships {
  readonly reading: FvgRelationshipReading;
  readonly rows: readonly string[];
  readonly silences: readonly string[];
}

export function fvgInspectRelationships(input: {
  readonly o: FvgObject;
  readonly timeframe: string;
  /** The chart's renderer bars (epoch SECONDS) — for the break / reclaim test. */
  readonly chartBars: readonly LegacyOhlcvTuple[];
  readonly structure?: MarketStructureVM | null;
  readonly livingProfile?: LivingProfileVM | null;
  /** Any further profile readings already compiled by their owners (Session, Visible Range …). */
  readonly otherProfiles?: readonly ProfileInput[];
  readonly derivatives?: DerivativesPressureVM | null;
  readonly liquidity?: LiquidityLifecycleVM | null;
  /**
   * §13 — the chart's own volume verdict (volumeTruth). When given, the effort→response owner is
   * asked about the gap's displacement and touch bars; when absent the family is a stated SILENCE.
   */
  readonly effort?: { readonly symbol: string; readonly volumeReal: boolean; readonly volumeSilenceWhy?: string | null } | null;
  /**
   * §14 — a bar's signed volume by its open time in epoch SECONDS (the chart's key), from the
   * chart's own owners: captured tape first, the provider's per-bar bid / ask volume second.
   */
  readonly signedAt?: ((barTimeSec: number) => SignedBarVolume | null) | null;
  readonly flowSilenceWhy?: string | null;
  /**
   * §5 — the chart's per-bar tape regime series (selectRegimeSeries), or null when it keeps none.
   * Leave undefined to print no regime line (a reader with no chart).
   */
  readonly regimeSeries?: readonly TapeRegimePoint[] | null;
  readonly fmt: (p: number) => string;
}): FvgInspectRelationships {
  const barSec = relationshipBarSec(input.timeframe);
  const lp = livingProfileInput(input.livingProfile);
  const efBars = input.effort || input.signedAt
    ? input.chartBars.map(b => ({ asOf: Number(b.time) * 1000, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume }))
    : [];
  const index = efBars.length ? effortFlowIndex(efBars) : undefined;
  const signedAt = input.signedAt;
  const reading = fvgRelationshipsFor(
    input.o,
    {
      effort: input.effort ? fvgEffortInput(input.o, efBars, input.effort.symbol, { index, volumeReal: input.effort.volumeReal, volumeSilenceWhy: input.effort.volumeSilenceWhy ?? null }) : null,
      flow: fvgFlowInput(input.o, efBars, signedAt ? ms => signedAt(ms / 1000) : null, { index, silenceWhy: input.flowSilenceWhy ?? null }),
      structure: input.structure && barSec ? { vm: input.structure, barSec } : null,
      profiles: [...(lp ? [lp] : []), ...(input.otherProfiles ?? [])],
      derivatives: input.derivatives ?? null,
      liquidity: input.liquidity ?? null,
    },
    input.chartBars.map(b => ({ asOf: Number(b.time) * 1000, low: b.low, high: b.high, close: b.close })),
  );
  const { rows, silences, absences } = fvgRelationshipRows(reading, input.fmt);
  // §5 — two named scopes, never one word: volatility from closed bars (Market Breathing, as of b2),
  // and the regime from the tape, by reference. Both are sentences from their owners.
  const context: string[] = [];
  if (input.chartBars.length) {
    context.push(fvgVolatilityAtFormationByTime({ bars: input.chartBars, b2OpenMs: input.o.bars.b2.asOf, timeOf: b => Number(b.time) * 1000, clocked: barSec !== null }).sentence);
  }
  if (input.regimeSeries !== undefined) context.push(tapeRegimeAtFormationLine(input.regimeSeries, input.o.bars.b2.asOf));
  // An owner that drew levels but none near the gap is said under the gap's rows, not left blank.
  return { reading, rows: [...rows, ...absences, ...context], silences };
}
