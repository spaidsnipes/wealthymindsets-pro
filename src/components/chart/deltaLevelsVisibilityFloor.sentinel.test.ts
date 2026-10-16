import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const CHART = readFileSync("src/components/chart/MainChart.tsx", "utf8");
const start = CHART.indexOf("H-702 · DELTA LEVELS ON GLASS");
const block = CHART.slice(start, CHART.indexOf("H-901 · REGIME LIGHTING", start));

/**
 * Codex plate 03 · 11 "Delta Levels" (Garden 19, 2026-10-16): flow becomes geometry. The lane of ivory rungs
 * (serving NQ1! 1m, 2026-10-01 → NQ1! 5m, 2026-10-16) was replaced by bands across price.
 */
describe("Delta Levels are bands across price (Codex plate 03)", () => {
  it("keeps its alpha floor under the governor", () => {
    expect(CHART).toContain("const DELTA_LEVELS_ALPHA_FLOOR = 0.8;");
    expect(block).toContain('Math.max(DELTA_LEVELS_ALPHA_FLOOR, att.alpha("deltaLevels"))');
  });
  it("each level is a band ending at the plot's right edge, length and ink by weight", () => {
    expect(block).toContain("const len = Math.round(60 + (bandMax - 60) * r.weight);");
    expect(block).toContain("const x0 = dlPlotRight - 6 - len;");
    expect(block).toContain("ctx.fillRect(x0, y - bandH / 2, len, bandH);");
    expect(block).toContain('ds.deltaLevelsLane = "BANDS";');
  });
  it("sides use the house delta ink AND form: buy solid, sell hatched", () => {
    expect(block).toContain('const rgb = r.side === "BUY" ? flowColorsRef.current.dBuy : flowColorsRef.current.dSell;');
    expect(block).toContain('if (r.side === "SELL") {');
    expect(block).toContain("FORM:SOLID_BUY+HATCHED_SELL");
  });
  it("candles are cut out of every band", () => {
    expect(block).toContain("const cutsDL = candleCutOutRects(");
    expect(block).toContain('ctx.clip(clipDL, "evenodd");');
  });
  it("the strongest four say their signed size on a chip, through the ledger, never on the newest column", () => {
    expect(block).toContain(".slice(0, 4)");
    expect(block).toContain("const t = signedFlowText(b.r.delta, fmtV);");
    expect(block).toContain("if (onNewestColumn(box.x, box.y, box.w, box.h)) continue;");
    expect(block).toContain("floatingChips.push(box);");
  });
});
