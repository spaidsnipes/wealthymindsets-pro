/**
 * SECOND-STATE PROOF without waiting for the market (Garden 19 erasure §7):
 * every Liquidity Weather stage and every Derivatives Pressure climate is fed
 * through the REAL owners (selectLiquidityWeather → selectLiquidityWeatherGlass;
 * selectDerivativesPressure) into the paint receipts MainChart writes
 * (`liquidityWeatherStageInk`, `derivativesPressureTint`). Each state must
 * read as a different TEXTURE / TINT — never only as a word.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { CboeOptionRow, CboeOptionsReceipt } from "@/lib/marketData/cboeDelayedOptions";
import type { AggressorTick } from "@/lib/marketData/selectAggressorFlow";
import { selectDerivativesPressure } from "@/lib/marketData/viewModels/selectDerivativesPressure";
import { selectLiquidityWeather, type WeatherStage } from "@/lib/marketData/viewModels/selectLiquidityWeather";
import { selectLiquidityWeatherGlass } from "@/lib/marketData/viewModels/selectLiquidityWeatherGlass";
import { WEATHER_GRAIN_SPACING, derivativesPressureTint, weatherGrain } from "./stateTextureReceipts";

/* ── Liquidity Weather tapes (the owner's own test shapes) ─────────────────── */
const tick = (price: number, size: number, side: "buy" | "sell" = "buy"): AggressorTick =>
  ({ price, size, side, trade: true, marketEvent: { aggressorMethod: "PROVIDER" as never } });
function leg(from: number, span: number, prints: number, size: number): AggressorTick[] {
  return Array.from({ length: prints }, (_, i) => tick(Number((from + (span * (i + 1)) / prints).toFixed(4)), size, i % 2 === 0 ? "buy" : "sell"));
}
const TAPES: Readonly<Record<WeatherStage, AggressorTick[]>> = {
  UNMEASURED: [],
  STEADY: leg(100, 2, 120, 100),
  THINNING: [...leg(100, 1, 60, 400), ...leg(101, 1, 60, 40)],
  THICKENING: [...leg(100, 1, 60, 40), ...leg(101, 1, 60, 400)],
  HEAVY: [...leg(100, 2, 110, 50), ...Array.from({ length: 10 }, () => tick(102, 800))],
  AIRLESS: [...leg(100, 1, 110, 500), ...leg(101, 1, 10, 5)],
  ERRATIC: Array.from({ length: 12 }, (_, s) => leg(100 + s * 0.5, 0.5, 12, s % 2 === 0 ? 20 : 2000)).flat(),
};

describe("Liquidity Weather — every stage reaches the lens as its own grain", () => {
  const receiptFor = (stage: WeatherStage) => {
    const vm = selectLiquidityWeather(TAPES[stage]);
    expect(vm.stage).toBe(stage); // the real owner calls this stage
    const glass = selectLiquidityWeatherGlass(vm);
    expect(glass.stage).toBe(stage); // the glass carries it unchanged
    return weatherGrain(glass.stage).receipt;
  };

  it("each stage's receipt, through the real owners", () => {
    expect(receiptFor("AIRLESS")).toBe("AIRLESS:GRAIN22");
    expect(receiptFor("THINNING")).toBe("THINNING:GRAIN16");
    expect(receiptFor("STEADY")).toBe("STEADY:GRAIN12");
    expect(receiptFor("THICKENING")).toBe("THICKENING:GRAIN9");
    expect(receiptFor("HEAVY")).toBe("HEAVY:GRAIN6");
    expect(receiptFor("ERRATIC")).toBe("ERRATIC:GRAIN10:JITTER");
    expect(receiptFor("UNMEASURED")).toBe("UNMEASURED:NONE");
  });

  it("density orders the stages (sparser = cheaper travel); ERRATIC is told by jitter, not by spacing alone; no two textures are the same", () => {
    const sp = (s: WeatherStage) => WEATHER_GRAIN_SPACING[s]!;
    expect(sp("AIRLESS")).toBeGreaterThan(sp("THINNING"));
    expect(sp("THINNING")).toBeGreaterThan(sp("STEADY"));
    expect(sp("STEADY")).toBeGreaterThan(sp("THICKENING"));
    expect(sp("THICKENING")).toBeGreaterThan(sp("HEAVY"));
    const forms = (["AIRLESS", "THINNING", "STEADY", "THICKENING", "HEAVY", "ERRATIC", "UNMEASURED"] as const).map(s => { const g = weatherGrain(s); return `${g.spacing}|${g.jitter}`; });
    expect(new Set(forms).size).toBe(forms.length);
  });
});

/* ── Derivatives Pressure chains (the owner's own test shapes) ─────────────── */
const NOW = Date.parse("2026-09-27T07:00:00Z");
const chain = (rows: CboeOptionRow[], spot = 100): CboeOptionsReceipt =>
  ({ source: "CBOE_DELAYED", underlying: "XYZ", spot, iv30: 40, chainAsOf: "2026-09-27 00:57:30", underlyingAsOf: "2026-09-25T15:59:59", rows, dropped: 0 });
const row = (type: "call" | "put", strike: number, oi: number): CboeOptionRow =>
  ({ contract: `XYZ${type}${strike}`, type, expiration: "2026-10-16", strike, openInterest: oi, gamma: null, iv: 0.4, volume: null });
const ladder = (fn: (k: number) => CboeOptionRow[]) => Array.from({ length: 41 }, (_, i) => 80 + i).flatMap(fn);

describe("Derivatives Pressure — every climate reaches the field as its own tint split", () => {
  const read = (rows: CboeOptionRow[]) => {
    const vm = selectDerivativesPressure(chain(rows), [], NOW);
    if (!vm.drawn) throw new Error(vm.reason);
    return { climate: vm.climate, tint: derivativesPressureTint(vm.geography) };
  };

  it("DAMPING (call-heavy): the field is all BLUE", () => {
    const r = read(ladder(k => [row("call", k, 1000), row("put", k, 100)]));
    expect(r.climate).toBe("DAMPING");
    expect(r.tint.negative).toBe(0);
    expect(r.tint.positive).toBeGreaterThan(0);
    expect(r.tint.receipt).toMatch(/^NET_POS:BLUE:\d+\|NET_NEG:ORANGE:0$/);
  });

  it("AMPLIFYING (put-heavy): the field is all ORANGE", () => {
    const r = read(ladder(k => [row("call", k, 100), row("put", k, 1000)]));
    expect(r.climate).toBe("AMPLIFYING");
    expect(r.tint.positive).toBe(0);
    expect(r.tint.receipt).toMatch(/^NET_POS:BLUE:0\|NET_NEG:ORANGE:\d+$/);
  });

  it("MIXED (puts below, calls above, price on the front): BOTH tints, split at the zero-gamma front", () => {
    const r = read(ladder(k => (k < 100 ? [row("put", k, 1500)] : k > 100 ? [row("call", k, 1500)] : [])));
    expect(r.climate).toBe("MIXED");
    expect(r.tint.positive).toBeGreaterThan(0);
    expect(r.tint.negative).toBeGreaterThan(0);
  });

  it("the three climates give three different tint receipts", () => {
    const rs = [
      read(ladder(k => [row("call", k, 1000), row("put", k, 100)])).tint.receipt,
      read(ladder(k => [row("call", k, 100), row("put", k, 1000)])).tint.receipt,
      read(ladder(k => (k < 100 ? [row("put", k, 1500)] : k > 100 ? [row("call", k, 1500)] : []))).tint.receipt,
    ];
    expect(new Set(rs).size).toBe(3);
  });

  it("INSUFFICIENT evidence draws no field, so no tint receipt is claimed", () => {
    const vm = selectDerivativesPressure(chain([row("call", 100, 10)]), [], NOW);
    expect(vm.drawn).toBe(false);
  });
});

describe("MainChart paints through these owners (one rule, one receipt)", () => {
  const CHART = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
  it("both receipts come from stateTextureReceipts; no private copy of the spacing table", () => {
    expect(CHART.length).toBeGreaterThan(100_000);
    expect(CHART).toContain("const grainW = weatherGrain(glass.stage);");
    expect(CHART).toContain("ds.liquidityWeatherStageInk = grainW.receipt;");
    expect(CHART).toContain("ds.derivativesPressureTint = derivativesPressureTint(geo).receipt;");
    expect(CHART).not.toMatch(/AIRLESS: 22, THINNING: 16/);
  });
});
