/**
 * FLOW FAMILY SALIENCE (G19, Founder 2026-10-10; register §2d FF-07, FF-10).
 *
 *   · FF-07 intra-candle distribution (footprint "volume-profile" mode): on
 *     serving the buy / sell split read as brass on brass (the profile VP
 *     gear's two resting brasses) — hairlines over the body. It now paints in
 *     the footprint tool's own side pair, solid, with a 2-px dominant-side
 *     leading edge; the POC row keeps the family's POC ink.
 *   · FF-10 failed aggression (a FAILED Delta Keel): 3 × 2 px was unreadable.
 *     On wide glass a failed keel is ≥ KEEL_FAIL_MIN_L long and KEEL_FAIL_H
 *     tall, still hollow; narrow glass keeps its solid fail-only form.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FOOTPRINT_MODE_RECEIPTS } from "@/lib/chart/footprintCanon";

const RAW = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
const CHART = RAW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const slice = (a: string, b: string) => {
  const i = CHART.indexOf(a), j = CHART.indexOf(b, i + a.length);
  expect(i, a).toBeGreaterThan(-1);
  expect(j, b).toBeGreaterThan(i);
  return CHART.slice(i, j);
};

describe("FF-07 intra-candle distribution reads as order flow, not brass hairlines", () => {
  it("reads the chart source", () => {
    expect(RAW.length).toBeGreaterThan(100000);
  });
  const VP = slice('if (effectiveFP === "volume-profile") {', 'if (effectiveFP === "imbalance") {');
  it("splits in the footprint tool's side pair, solid, with a dominant-side edge", () => {
    expect(VP.length).toBeGreaterThan(800);
    expect(VP).toContain("ctx.fillStyle = buyRgba(0.78); ctx.fillRect(x, rowY, hr.buyWidth, rH);");
    expect(VP).toContain("ctx.fillStyle = sellRgba(0.78); ctx.fillRect(x + hr.buyWidth, rowY, hr.sellWidth, rH);");
    expect(VP).toContain("ctx.fillStyle = hr.buyWidth >= hr.sellWidth ? buyRgba(1) : sellRgba(1);");
    expect(VP).not.toContain("vpUpRgba(0.7)");
    expect(VP).toContain('ctx.fillStyle = pk.rgba("POC", 0.9);');
  });
  it("receipts the ink and withdraws it with the other mode receipts", () => {
    expect(VP).toContain("canvas.dataset.fpVpRowInk = `SIDE_PAIR+EDGE:${fpVpSidePair}`;");
    expect(FOOTPRINT_MODE_RECEIPTS).toContain("fpVpRowInk");
  });
});

describe("FF-10 a failed keel (failed aggression) is readable on wide glass", () => {
  it("has its own floor, still hollow, narrow glass unchanged", () => {
    expect(CHART).toContain("const KEEL_FAIL_MIN_L = 8;");
    expect(CHART).toContain("const KEEL_FAIL_H = 4;");
    expect(CHART).toContain("const L = kl.failed && !narrowDK ? Math.max(KEEL_FAIL_MIN_L, L0) : L0;");
    // Restated 2026-10-16: the desk's ordinary keel is KEEL_DESK_H tall; the phone keeps 2.
    expect(CHART).toContain("const hK = kl.failed && !narrowDK ? KEEL_FAIL_H : narrowDK ? 2 : KEEL_DESK_H;");
    expect(CHART).toContain("rect: hollow ? [x + 0.5, y + 0.5, Math.max(1, L - 1), hK - 1] : [x, y, L, hK],");
    expect(CHART).toContain("halo: [x - 1, y - 1, L + 2, hK + 2],");
  });
  it("receipts the failed-keel salience and withdraws it", () => {
    expect(CHART).toContain('canvas.dataset.barDeltaKeelsFailSalience = narrowDK ? "NARROW:SOLID" : `L${KEEL_FAIL_MIN_L}|H${KEEL_FAIL_H}|HOLLOW`;');
    expect(CHART).toContain("delete canvas.dataset.barDeltaKeelsFailSalience;");
  });
});
