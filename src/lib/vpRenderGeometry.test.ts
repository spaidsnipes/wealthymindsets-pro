/**
 * SENTINEL — the Volume Profile has ONE writer.
 *
 * `src/lib/vpEngine.ts` is the canonical, pure, tested profile engine. It had a
 * full suite and ZERO production callers, while `drawWMVP` in MainChart computed
 * its own grid inline with no coverage at all. Two implementations of the same
 * math, and the tested one was not the shipped one.
 *
 * They had drifted. The inline version bucketed a bar's range with
 *
 *     const first = Math.floor(b.low  / tickSz);
 *     const last  = Math.ceil (b.high / tickSz);
 *
 * and `Math.ceil` on the high names the bucket ABOVE the one holding it whenever
 * the high does not land exactly on a grid edge. Every bar therefore deposited a
 * share of its volume at prices it never reached, worst on the tightest bars
 * (a one-bucket bar put HALF its volume above its own high), and the error only
 * ever pointed upward — so POC, VAH and VAL were all dragged with it.
 *
 * The behaviour is tested in vpEngine.test.ts against the shipped function.
 * This file exists to stop the loop being re-implemented in the renderer again.
 *
 * VACUITY GUARD FIRST. A Sentinel that silently stops reading its target reports
 * "no problems" forever and is indistinguishable from a clean bill of health —
 * that has now happened once in this codebase for real (lane J, the /paper
 * contract-multiplier guard passed GREEN while CL1! had no point value). So the
 * first test here proves the source was actually loaded and is the file we mean.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..");
const MAIN_CHART = join(REPO_ROOT, "src/components/chart/MainChart.tsx");

const raw = readFileSync(MAIN_CHART, "utf8");
/** Comments describe the defect on purpose; only real code may be matched. */
const src = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("VP render geometry — single writer", () => {
  it("POSITIVE CONTROL: the renderer source was actually read", () => {
    // Without this, every `not.toContain` below passes against an empty string.
    expect(raw.length).toBeGreaterThan(100_000);
    expect(src.length).toBeGreaterThan(50_000);
    expect(src, "this is not MainChart").toContain("function drawWMVP");
    expect(src, "comment stripping ate the code").toContain("const rows = 320");
  });

  it("MainChart delegates the profile to the shared engine", () => {
    expect(src).toContain("computeProfileFromBars");
    expect(src).toContain("@/lib/vpEngine");
  });

  it("MainChart does not re-implement the bucket grid", () => {
    // The exact defect: ceil on the bar's high.
    expect(src).not.toContain("Math.ceil(b.high / tickSz)");
    expect(src).not.toContain("Math.ceil(b.high/tickSz)");
    // The inline accumulation's own locals. Either reappearing means the
    // profile math forked back out of the engine.
    expect(src).not.toContain("const perBucket =");
    expect(src).not.toContain("const isUpBar =");
  });

  it("the value area is the engine's, not a second expansion loop", () => {
    // `vaAcc` was the inline 70% accumulator. The renderer may still nudge VAH/VAL
    // apart for the draw guard, but it must not re-derive them.
    expect(src).not.toContain("vaAcc");
    expect(src).not.toContain("const vaTarget =");
    expect(src).toContain("snap.vah");
    expect(src).toContain("snap.val");
  });

  it("vpEngine is no longer an orphan", () => {
    // It shipped with a full test suite and no callers. A tested module nobody
    // calls is not coverage of anything the trader sees.
    const importers = ["src/components/chart/MainChart.tsx"];
    for (const f of importers) {
      const s = readFileSync(join(REPO_ROOT, f), "utf8");
      expect(s, `${f} should import the canonical VP engine`).toContain("@/lib/vpEngine");
    }
  });
});
