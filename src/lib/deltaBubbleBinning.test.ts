/**
 * SENTINEL — delta bubble binning has ONE writer.
 *
 * The behaviour is tested in deltaBubbleLevels.test.ts against the shipped
 * function. This file exists to stop the loop being re-implemented inline in
 * the renderer, which is where it used to live.
 *
 * WHY THAT MATTERS MORE THAN IT SOUNDS
 *
 * The previous version of THIS file re-typed the binning loop into the test
 * and asserted on the copy, then string-matched MainChart for three
 * identifiers. That arrangement is wrong in both directions:
 *
 *   - renaming a local (`bucketLo` → `lo`) went red with no behaviour change;
 *   - changing behaviour while keeping the identifiers stayed green.
 *
 * And it could never have caught what was actually wrong in the shipped
 * function, because the copy only reproduced the part that had already been
 * fixed. Two real defects sat one line below the copied loop for as long as
 * the copy was the coverage: a bubble printing a bucket CENTRE as the price
 * flow occurred at, and a rounded price used as bucket identity — which
 * silently merged buckets on tight bars and dropped their aggressor volume.
 *
 * A test that mirrors the implementation tests the mirror.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..");
const MAIN_CHART = join(REPO_ROOT, "src/components/chart/MainChart.tsx");

const src = readFileSync(MAIN_CHART, "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("delta bubble binning — single writer", () => {
  it("MainChart delegates to the shared module instead of binning inline", () => {
    expect(src).toContain("computeDeltaBubbleLevels");
    expect(src).toContain("@/lib/deltaBubbleLevels");
  });

  it("MainChart does not re-implement the bucket loop", () => {
    // Both the original strict-centre form and the half-open form that
    // replaced it. Either one appearing here means the logic forked again.
    expect(src).not.toContain("Math.abs(t.price - priceLevel) < half");
    expect(src).not.toContain("bidByLevel");
    expect(src).not.toContain("askByLevel");
  });

  it("the bubble spawn key is the bucket, not the price", () => {
    // `dt:<time>:<price>` de-duplicated by a rounded display value, so two
    // buckets that rounded alike produced one bubble and the second bucket's
    // volume never reached the chart. The key is the bucket index now.
    expect(src).toContain("`dt:${c.time}:L${lv.levelIdx}`");
    expect(src).not.toContain("`dt:${c.time}:${lv.priceLevel}`");
  });
});

/**
 * Historical record of the original defect, kept because it explains the
 * comment in the shared module and is cheap to keep honest.
 */
describe("regression record — the strict-centre comparison", () => {
  /** Old behaviour, reproduced exactly. NOT the shipped code. */
  function assignStrict(price: number, lo: number, step: number, numLev: number): number | null {
    const half = step / 2;
    for (let i = 0; i < numLev; i++) {
      const center = lo + i * step + step / 2;
      if (Math.abs(price - center) < half) return i;
    }
    return null;
  }

  it("dropped every exact bucket edge, including the bar's own low and high", () => {
    const lo = 0, hi = 1, numLev = 4, step = (hi - lo) / numLev;
    for (const edge of [0.0, 0.25, 0.5, 1.0]) {
      expect(assignStrict(edge, lo, step, numLev)).toBeNull();
    }
  });
});
