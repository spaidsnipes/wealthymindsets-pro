import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { OFF_GLASS, paintsOnGlass } from "./cleanGlass";

/*
 * CLEAN GLASS (Founder, Codex thread A-3, 2026-11-02 — verbatim asks):
 *   "why we have all this shit right here on the side of the charts where it says, like, Order Flow from 7 p.m. CST,
 *    early bars … it just needs to be a bit more clean."
 *   "I don't know why it says four symbols right here when you click on the Nectar … That's something that's internal."
 *   "Why is this damn Nectar line right here? … Is that a time zone line? … it says 7 a.m. … that's Nectar …
 *    we need not to have split brain anywhere."
 * The engine keeps recording; only its telemetry leaves the glass. Nothing is faked to fill the space.
 */
const CHART = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

describe("clean glass — Nectar and tape-start telemetry stay off the chart", () => {
  it("names each retired mark with the Founder's reason", () => {
    for (const mark of ["NECTAR_HORIZON", "NECTAR_VAULT_CHIP", "ORDER_FLOW_START_WORDS", "ORDER_FLOW_SEAM_LINE"] as const) {
      expect(paintsOnGlass(mark)).toBe(false);
      expect(OFF_GLASS[mark].length).toBeGreaterThan(20);
    }
  });

  it("the Nectar horizon line ('TAPE 7:00 AM · 2h · n trades') is gated off the glass", () => {
    expect(CHART).toMatch(/if \(horizon && horizon\.sym === symbol && footprintEnabled && !seamOwnsTape && att\.paints\("tapeHorizon"\) && paintsOnGlass\("NECTAR_HORIZON"\)\)/);
  });

  it("the Nectar '● N symbols' chip is not on the chart", () => {
    expect(CHART).not.toContain("<NectarVaultChip");
    expect(CHART).not.toContain('import { NectarVaultChip } from "./NectarVaultChip";');
  });

  it("no 'ORDER FLOW FROM … — earlier bars' row and no 'Order flow from' chip on the side of the chart", () => {
    expect(CHART).not.toContain("— earlier bars: candle totals`");
    expect(CHART).not.toMatch(/seamChip\(`Order flow from/);
    // The seam's dashed gold line looked like a time-zone split; it is gated too. The faint hatch stays —
    // bars before the tape carry candle totals, and the absence of footprint cells there is the truth itself.
    expect(CHART).toContain('paintsOnGlass("ORDER_FLOW_SEAM_LINE")');
    // Where the tape begins is still stated, off the glass, for Inspect / proofs.
    expect(CHART).toContain("canvas.dataset.tapeCoverage = firstSided");
  });
});
