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
  readonly fmt: (p: number) => string;
}): FvgInspectRelationships {
  const barSec = relationshipBarSec(input.timeframe);
  const lp = livingProfileInput(input.livingProfile);
  const reading = fvgRelationshipsFor(
    input.o,
    {
      structure: input.structure && barSec ? { vm: input.structure, barSec } : null,
      profiles: [...(lp ? [lp] : []), ...(input.otherProfiles ?? [])],
      derivatives: input.derivatives ?? null,
      liquidity: input.liquidity ?? null,
    },
    input.chartBars.map(b => ({ asOf: Number(b.time) * 1000, low: b.low, high: b.high, close: b.close })),
  );
  const { rows, silences } = fvgRelationshipRows(reading, input.fmt);
  return { reading, rows, silences };
}
