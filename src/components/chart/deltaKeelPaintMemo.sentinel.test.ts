/**
 * KEEL PAINT COST (2026-10-07, serving NQ1! 5m: the keel layer's longest frame
 * 2.8–3.0 ms against DELTA_KEEL_BUDGET_MS 1.5). Two memos keep the per-frame
 * walk off the hot path; these locks keep them from being refactored away and
 * keep the cost receipt the proof reads.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = readFileSync(join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

describe("delta keels: the frame replays, it does not re-walk", () => {
  it("per-bar tape delta is memoised on the ladder row (WeakMap keyed by the row)", () => {
    expect(SRC).toContain("const deltaKeelBarMemoRef = useRef(new WeakMap<object,");
    expect(SRC).toMatch(/deltaKeelBarMemoRef\.current\.get\(heardDK\)/);
  });
  it("keel geometry is replayed when keels, camera anchors, body width and inspect are unchanged", () => {
    expect(SRC).toMatch(/const reuseGeo = !!geoDK && geoDK\.keels === keels && geoDK\.key === geoKeyDK && !!xCal && !!yCal;/);
    expect(SRC).toMatch(/if \(!reuseGeo\) for \(let k = 0; k < keels\.length; k\+\+\) \{/);
    expect(SRC).toContain("if (!reuseGeo) deltaKeelGeoRef.current = { keels, key: geoKeyDK, halo, groups, drawn, failed };");
  });
  it("the 1 s re-read is incremental: keels patch from the first moved row, geometry re-lays only moved keels", () => {
    expect(SRC).toContain("patchKeels(cachedDK?.rows ?? null, cachedDK?.keels ?? null, rowsDK)");
    expect(SRC).toContain("const lay = patchKeelGeometry(geoDK.layout, changedDK, glyphDK);");
    expect(SRC).toContain("if (!reuseGeo) deltaKeelGeoRef.current!.layout = layDK!;");
    // the price anchors of the geometry key are fixed prices, not the forming close
    expect(SRC).toContain("${anchorDK(yCal, bs[i0]?.close)}");
  });
  it("the ladder row memo checks the row's write count, bumped only by the one fold", () => {
    expect(SRC.match(/ladderRowRevRef\.current\.set\(/g) ?? []).toHaveLength(1);
    expect(SRC).toContain("ladderRowRevRef.current.set(lvlMap, (ladderRowRevRef.current.get(lvlMap) ?? 0) + 1);");
  });
  it("the cost receipt still measures the whole layer, from the same start", () => {
    expect(SRC).toContain("canvas.dataset.barDeltaKeelsCost = `${ms.toFixed(2)}ms|mean");
    expect(SRC).toContain("const ms = performance.now() - t0DK;");
  });
});
