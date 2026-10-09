import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MIN_BARS, readMarketBreathing, type BreathBar } from "@/lib/chart/marketBreathing";
import {
  FVG_VOLATILITY_FACET_VALUES, FVG_VOLATILITY_SCOPE_NOTE, fvgVolatilityAtFormation, fvgVolatilityAtFormationByTime, fvgVolatilityFacet,
} from "./fvgFormationContext";

type Bar = BreathBar & { readonly t: number };

/** Deterministic bars: `range(i)` sets each bar's high–low. */
function bars(n: number, range: (i: number) => number): Bar[] {
  const out: Bar[] = [];
  let close = 100;
  for (let i = 0; i < n; i++) {
    const r = range(i);
    close += (i % 2 ? 1 : -1) * r * 0.2;
    out.push({ high: close + r / 2, low: close - r / 2, close, t: 1_700_000_000_000 + i * 300_000 });
  }
  return out;
}

describe("§5 / §12 — volatility at a gap's formation, from closed bars only", () => {
  it("is Market Breathing's own reading over the bars up to and including b2", () => {
    const b = bars(200, () => 1);
    const v = fvgVolatilityAtFormation({ bars: b, b2Index: 150 });
    const owner = readMarketBreathing(b.slice(0, 151))!;
    expect(v.kind).toBe("READ");
    if (v.kind !== "READ") return;
    expect(v.state).toBe(owner.state);
    expect(v.atrRatio).toBe(owner.atrRatio);
    expect(v.atrPercentile).toBe(owner.atrPercentile);
    expect(v.barsRead).toBe(151);
    expect(v.sentence).toBe("Volatility at formation: normal — range 1.00× its normal (from 151 closed bars).");
  });

  it("reads EXPANDED when ranges widened into the gap and COMPRESSED when they shrank", () => {
    const wide = fvgVolatilityAtFormation({ bars: bars(160, i => (i > 140 ? 4 : 1)), b2Index: 159 });
    const tight = fvgVolatilityAtFormation({ bars: bars(160, i => (i > 120 ? 0.25 : 1)), b2Index: 159 });
    expect(wide.kind === "READ" && wide.state).toBe("EXPANDED");
    expect(tight.kind === "READ" && tight.state).toBe("COMPRESSED");
    expect(fvgVolatilityFacet(wide)).toBe("EXPANDED");
    expect(fvgVolatilityFacet(tight)).toBe("COMPRESSED");
  });

  it("FUTURE-LEAK: bars after b2 change nothing — even tripled ranges and prices", () => {
    const base = bars(200, () => 1);
    const at = fvgVolatilityAtFormation({ bars: base, b2Index: 120 });
    const loud = base.map((x, i) => (i > 120 ? { ...x, high: x.high * 3, low: x.low / 3, close: x.close * 3 } : x));
    expect(fvgVolatilityAtFormation({ bars: loud, b2Index: 120 })).toEqual(at);
    expect(fvgVolatilityAtFormation({ bars: base.slice(0, 121), b2Index: 120 })).toEqual(at);
  });

  it("SILENCE under the owner's minimum: fewer than 40 closed bars up to b2", () => {
    const b = bars(200, () => 1);
    const v = fvgVolatilityAtFormation({ bars: b, b2Index: MIN_BARS - 2 });
    expect(v).toEqual({
      kind: "SILENCE", reason: "TOO_FEW_BARS", barsRead: MIN_BARS - 1,
      sentence: `Volatility at formation: not read — ${MIN_BARS - 1} closed bars before the gap, ${MIN_BARS} needed.`,
    });
    expect(fvgVolatilityFacet(v)).toBe("NOT_READ");
    expect(fvgVolatilityAtFormation({ bars: b, b2Index: MIN_BARS - 1 }).kind).toBe("READ");
  });

  it("SILENCE for bars with no clock (tick bars), whatever the bars say", () => {
    const v = fvgVolatilityAtFormation({ bars: bars(200, () => 1), b2Index: 150, clocked: false });
    expect(v.kind === "SILENCE" && v.reason).toBe("NO_CLOCK");
    expect(v.sentence).toBe("Volatility at formation: not read — these bars have no time clock.");
  });

  it("SILENCE when b2 is not among the bars: bad index, or a time no bar opens at", () => {
    const b = bars(100, () => 1);
    for (const i of [-1, 100, 1.5, Number.NaN]) {
      const v = fvgVolatilityAtFormation({ bars: b, b2Index: i });
      expect(v.kind === "SILENCE" && v.reason, String(i)).toBe("BAR_NOT_FOUND");
    }
    const byTime = fvgVolatilityAtFormationByTime({ bars: b, b2OpenMs: 1, timeOf: x => x.t });
    expect(byTime.kind === "SILENCE" && byTime.reason).toBe("BAR_NOT_FOUND");
  });

  it("finding b2 by the OBJECT_ID's open time gives the same answer as its index", () => {
    const b = bars(200, i => (i > 170 ? 3 : 1));
    expect(fvgVolatilityAtFormationByTime({ bars: b, b2OpenMs: b[180].t, timeOf: x => x.t }))
      .toEqual(fvgVolatilityAtFormation({ bars: b, b2Index: 180 }));
  });

  it("two named scopes, never one word: no regime word, no forecast, no second classifier", () => {
    const src = readFileSync("src/lib/marketData/fvg/fvgFormationContext.ts", "utf8");
    const code = src.slice(src.indexOf("import {"));
    expect(code).not.toMatch(/selectRegime|classifyRegime|regimeOf/);
    expect(code).not.toMatch(/COMPRESSED_AT|EXPANDED_AT|atrSeries\(/); // thresholds stay with the owner
    for (const n of [150, 159]) {
      const v = fvgVolatilityAtFormation({ bars: bars(160, i => (i > 140 ? 4 : 1)), b2Index: n });
      expect(v.sentence).not.toMatch(/regime|trend|will|likely|about to|breakout/i);
    }
    expect(FVG_VOLATILITY_SCOPE_NOTE).toMatch(/closed bars/);
    expect(FVG_VOLATILITY_SCOPE_NOTE).toMatch(/not the regime/);
    expect(FVG_VOLATILITY_FACET_VALUES).toEqual(["COMPRESSED", "NORMAL", "EXPANDED", "NOT_READ"]);
  });
});
