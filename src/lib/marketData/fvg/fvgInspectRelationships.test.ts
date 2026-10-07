import { describe, expect, it } from "vitest";

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import type { LivingProfileVM } from "@/lib/marketData/viewModels/selectLivingProfile";
import { selectMarketStructure } from "@/lib/marketData/viewModels/selectMarketStructure";
import { toLegacySecondsTuple } from "@/lib/marketData/yahooCandleIngress";
import { detectFvgs } from "./fvgEngine";
import { fvgInspectRelationships, livingProfileInput } from "./fvgInspectRelationships";

type Row = readonly [number, number, number, number];
const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 6, 10, 0, 0);
const SYM = "BTC-USD";
const bars: CanonicalBar[] = ([...Array.from({ length: 15 }, (_, i) => (i === 7 ? [100, 103, 99, 100] : [100, 101, 99, 100]) as Row),
  [100, 101, 99, 100.5], [100.5, 104, 100.3, 103.8], [103.8, 105, 102, 104.5]] as Row[]).map(([o, h, l, c], i) => ({
  barId: `${SYM}|1m|${T0 + i * MIN}|e0`, symbolId: SYM, sessionId: "SESSION_CONTINUOUS", timeframe: "1m",
  open: o, high: h, low: l, close: c, volume: 1, asOf: T0 + i * MIN, receivedAt: 0,
  fidelity: "INDICATIVE", source: "f", provenance: "REST_BACKFILL", truthEpoch: 0,
}));
const obj = detectFvgs(bars, { symbolId: SYM, timeframe: "1m" }).objects[0];
const tuples = bars.map(toLegacySecondsTuple);

describe("Inspect relationships — the chart's owners' VMs, adapted, never re-run", () => {
  it("structure (from renderer tuples) + Living Profile levels, spatially ordered, evidence per source", () => {
    const lp = { measured: true, missingInputNote: null, quality: "trade-based", poc: 101.4, vah: 102.2, val: 95, nodesMeasured: true, hvn: [{ price: 101.6 }], lvn: [] } as unknown as LivingProfileVM;
    const r = fvgInspectRelationships({
      o: obj, timeframe: "1m", chartBars: tuples,
      structure: selectMarketStructure(tuples.map(t => ({ time: t.time, high: t.high, low: t.low }))),
      livingProfile: lp, fmt: p => p.toFixed(2),
    });
    // Spatial order, highest first: the swing at 103 above the gap, then VAH 102.20 near it.
    expect(r.rows[0]).toMatch(/^Market structure broke the swing 103\.00 — at formation/);
    expect(r.rows[1]).toMatch(/^Living Profile VAH 102\.20 — near/);
    expect(r.rows.some(x => /^Living Profile HVN 101\.60 — inside · FULL/.test(x))).toBe(true);
    expect(r.silences).toEqual(["Options walls: SILENCE — no options positioning attached", "Liquidity pools: SILENCE — no liquidity reading attached"]);
  });

  it("an unmeasured Living Profile is a SILENCE with the owner's own note", () => {
    const lp = { measured: false, missingInputNote: "too few buckets", quality: "candle-estimated", poc: null, vah: null, val: null, nodesMeasured: false, hvn: [], lvn: [] } as unknown as LivingProfileVM;
    expect(livingProfileInput(lp)).toMatchObject({ drawn: false, reason: "too few buckets" });
    const r = fvgInspectRelationships({ o: obj, timeframe: "1m", chartBars: tuples, livingProfile: lp, fmt: String });
    expect(r.silences).toContain("Living Profile: SILENCE — too few buckets");
  });
});
