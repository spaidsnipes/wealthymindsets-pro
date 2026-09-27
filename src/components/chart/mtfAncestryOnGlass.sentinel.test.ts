/**
 * T-210 / F10 — MTF IS NOT FOUR CHARTS, on the glass.
 *
 * Canon plate WM_H_T210_MTF_NOT_FOUR_CHARTS: on the ONE execution chart a
 * translucent green 4H ANCESTRY BAND tagged "4H", a hatched grey 1H NODE tagged
 * "1H", a dashed gold DAILY SHELF tagged "D", and a compact MTF inspect. The
 * switch shipped before its paint once (a dead control, Garden 16 §46); these
 * pins keep switch → owner → glass → Inspect in one chain.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
const CD = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
const IT = readFileSync("src/components/chart/ChartInspectTicket.tsx", "utf8");
const block = (() => {
  const a = MC.indexOf("T-210 / F10 · MTF IS NOT FOUR CHARTS");
  const b = MC.indexOf("H-401 · CONTRADICTION NOT AVERAGED");
  return a > 0 && b > a ? MC.slice(a, b) : "";
})();

describe("T-210 ancestry is painted, not only switched", () => {
  it("the switch has a consumer: the paint block reads it through the governor", () => {
    expect(block.length).toBeGreaterThan(0);
    expect(block).toContain('layerOnRef.current.mtfAncestry === true && att.paints("mtfAncestry")');
    expect(CD).toContain("mtfAncestryOnChart={mtfAncestryOn}");
  });

  it("one owner reads the chart's own bars through the one session owner — nothing fetched", () => {
    expect(block).toContain("selectMtfAncestry({");
    expect(block).toContain("window: sessionWindowFor(symbol, timeframe, !!extendedHours)");
    expect(block).toContain("precision: displayPrecisionFor(symbol, barsM)");
    expect(block).not.toMatch(/fetch\(/);
    // Replay: only later bars may close a bucket.
    expect(block).toContain("asOfSec: replayCameraRef.current ? null : Date.now() / 1000");
  });

  it("the plate's three bodies: green band, hatched node, dashed gold shelf — each with its tag", () => {
    expect(block).toContain('tag("4H"');
    expect(block).toContain('tag("1H"');
    expect(block).toContain('tag("D"');
    expect(block).toMatch(/rgba\(76,175,96,0\.16\)/);           // translucent green band
    expect(block).toMatch(/hx \+= 6/);                           // hatch
    expect(block).toMatch(/setLineDash\(\[7, 5\]\)/);           // dashed shelf
  });

  it("price stays sovereign: fills are cut out of the candles, tags go through the keep-out placer", () => {
    expect(block).toContain('ctx.clip(cutM, "evenodd")');
    expect(block).toContain("placeClearOfKeepOut(");
    expect(block).toContain("rowBodiesAt(ty, ty + TAG_H)");
  });

  it("an off-camera shelf is SAID at the edge with its price, never clamped onto a false height", () => {
    expect(block).toContain("OFF CAMERA IS SAID, NOT CLAMPED");
    expect(block).toMatch(/OFF_\$\{offTop \? "TOP" : "BOTTOM"\}/);
  });

  it("silences are named on the glass and the receipt is published", () => {
    expect(block).toContain("ds.mtfAncestry = mtf.receipt;");
    expect(block).toContain("ds.mtfAncestryPainted =");
    expect(block).toContain("MTF · ${silences.join");
  });

  it("Inspect reads the SAME reading the glass painted, at the market's display decimals", () => {
    expect(block).toContain("onMtfAncestryRef.current?.(mtf);");
    expect(CD).toContain("mtfAncestry={mtfAncestryOn ? mtfAncestryVM : null}");
    expect(CD).toContain("priceDp={chartDisplayDp}");
    expect(IT).toContain("data-inspect-mtf={mtfAncestry.receipt}");
    expect(IT).toContain("MTF INSPECT · ANCESTRY + NODES + SHELF");
    expect(IT).toContain("DERIVED (bar volume spread over each bar&apos;s range)");
  });
});
