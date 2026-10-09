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
  // An owner that drew levels but none near the gap is said under the gap's rows, not left blank.
  return { reading, rows: [...rows, ...absences], silences };
}
