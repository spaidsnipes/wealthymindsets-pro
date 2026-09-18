/**
 * THE CHART'S SWINGS AND THE PASSPORT'S SEQUENCE MUST BE THE SAME SWINGS.
 *
 * `MainChart` calls `swingHighLow` inline four times. The Market Object
 * Passport does not — it reads `selectMarketStructure`, which calls the same
 * detector at `STRUCTURE_DEFAULT_LOOKBACK`.
 *
 * Until 2026-09-18 all four chart lookbacks were bare numeric literals with
 * nothing connecting them to that constant. Either side could move and the
 * chart would then draw a swing the Passport's sequence does not contain — or
 * omit one it does — on the same bars, at the same instant. Canon Weakness #1,
 * and the symptom is nothing: no throw, no red test, no console warning. Two
 * lines on a chart quietly disagreeing with the words beside them.
 *
 * So the relationship is asserted rather than remembered.
 *
 * ── WHY THIS IS A SOURCE SCAN AND NOT A BEHAVIOURAL TEST ────────────────────
 *
 * The four calls live inside a ~200-line imperative chart-drawing effect that
 * needs a real lightweight-charts canvas. Rendering it to assert an argument
 * would test the charting library. The defect being guarded is textual — a
 * number written twice — so the scan is aimed at exactly that, and a vacuity
 * guard below makes sure the scan actually read the file.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { STRUCTURE_DEFAULT_LOOKBACK } from "@/lib/marketData/viewModels/selectMarketStructure";
import { swingHighLow } from "./indicators";

const SRC = readFileSync(resolve(__dirname, "MainChart.tsx"), "utf8");

/** Every argument list passed to the detector in MainChart. */
const CALLS = [...SRC.matchAll(/IND\.swingHighLow\(([^)]*)\)/g)].map(m => m[1]);

describe("MainChart's pivot lookbacks are named, not typed twice", () => {
  it("VACUITY GUARD: the scan read MainChart and found the calls", () => {
    // Without this, a renamed file or a changed call spelling would empty
    // CALLS and every assertion below would pass over nothing.
    expect(SRC.length).toBeGreaterThan(50_000);
    expect(CALLS.length).toBeGreaterThan(0);
  });

  it("no call passes a bare numeric lookback", () => {
    for (const args of CALLS) {
      expect(
        args,
        `swingHighLow(${args}) hard-codes its lookback. The Passport reads ` +
          `STRUCTURE_DEFAULT_LOOKBACK; a second copy of the number is free to ` +
          `drift from it silently.`,
      ).not.toMatch(/,\s*\d+\s*$/);
    }
  });

  it("the chart's swing lookback IS the owner's constant, not a copy of its value", () => {
    // `= 5` would satisfy the test above and still be the defect. The binding
    // has to be to the imported constant itself.
    expect(SRC).toMatch(
      /import\s*\{\s*STRUCTURE_DEFAULT_LOOKBACK\s*\}\s*from\s*"@\/lib\/marketData\/viewModels\/selectMarketStructure"/,
    );
    expect(SRC).toMatch(
      /const CHART_SWING_LOOKBACK\s*=\s*STRUCTURE_DEFAULT_LOOKBACK\s*;/,
    );
  });

  it("the unexplained 4 is disclosed by name, and still exactly 4", () => {
    // Preserved deliberately. Harmonising it would change what the Founder's
    // chart draws, which a naming pass has no business doing. The point is
    // that the divergence is now reviewable instead of invisible.
    expect(SRC).toMatch(/const LIQUIDITY_SWEEP_LOOKBACK\s*=\s*4\s*;/);
  });
});

describe("the detector's own default cannot drift from the owner", () => {
  it("calling swingHighLow with no lookback equals calling it with the owner's", () => {
    // One chart call site relies on the parameter default. If that default
    // ever moved away from STRUCTURE_DEFAULT_LOOKBACK, that site would start
    // drawing a different set of pivots than the Passport reasons about —
    // and nothing else in the repo would notice.
    const bars = Array.from({ length: 60 }, (_, i) => {
      const close = 100 + Math.sin(i / 3) * 10;
      return { time: i * 60, open: close - 0.5, high: close + 2, low: close - 2, close, volume: 100 };
    });
    const implicit = swingHighLow(bars as never[]);
    const explicit = swingHighLow(bars as never[], STRUCTURE_DEFAULT_LOOKBACK);

    // Anti-vacuity: a detector that found nothing would make these trivially
    // equal and prove nothing about the lookback at all.
    expect(implicit.highs.length + implicit.lows.length).toBeGreaterThan(0);
    expect(implicit).toEqual(explicit);
  });
});
