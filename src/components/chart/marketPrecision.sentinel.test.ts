/**
 * THE CHART QUOTES THE MARKET'S OWN PRECISION.
 *
 * Serving EURUSD 1h desktop, 2026-09-25: the price series had no priceFormat
 * (library default: two decimals) and the legend's precision came from a
 * static per-symbol base, so the axis read 1.15 / 1.14 / 1.13 and the header
 * "1.14 +0.00 (+0.20%)" with O/H/L all 1.14. Both now read the bars through
 * one owner, pricePrecision.ts.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

describe("market precision (Sentinel)", () => {
  it("the price series takes its priceFormat from the raw bars", () => {
    expect(CHART).toContain("cs.applyOptions({ priceFormat: priceFormatFor(pricePrecisionFromBars(data)) });");
    const at = CHART.indexOf("cs.applyOptions({ priceFormat: priceFormatFor(");
    expect(CHART.indexOf("candleRef.current = cs;", at)).toBeGreaterThan(at);
  });

  it("the header legend's precision is read from the bars, the base rule only before any bar", () => {
    expect(CHART).toContain("const dp        = candles.length ? pricePrecisionFromBars(candles) : (base < 10 ? 4 : 2);");
    expect(CHART).not.toContain("const dp        = base < 10 ? 4 : 2;");
  });
});

describe("profile-family level names quote the same precision", () => {
  it("one per-frame precision from the owner, used by every level name", () => {
    expect(CHART).toContain("const pxDp = pricePrecisionFromBars(barsRef.current ?? []);");
    for (const s of ["`TPO POC ${tpo.poc?.toFixed(pxDp)", "`CMP POC ${cp.poc?.toFixed(pxDp)}`", "`VRP POC ${vrpVM.poc?.toFixed(pxDp)}`", "`FUSED POC ${f.poc.toFixed(pxDp)}`", "`LEG POC ${sp.poc.toFixed(pxDp)}`", "`dPOC ${last.poc.toFixed(pxDp)}"]) {
      expect(CHART, s).toContain(s);
    }
    expect(CHART).not.toMatch(/`TPO (POC|VAH|VAL) \$\{tpo\.\w+\?\.toFixed\(2\)/);
  });
});

describe("the classic VP column's price tags quote the same precision", () => {
  it("computes its own precision from the bars it measured (it can run before the frame's pxDp)", () => {
    expect(CHART).toContain("const vpDp = pricePrecisionFromBars(barsToUse);");
    expect(CHART).toContain("ctx.fillText(pocPrice.toFixed(vpDp), pocLineLeft - 2, pocTagY);");
    expect(CHART).toContain('p.toFixed(vpDp)}`;');
    expect(CHART).not.toContain("ctx.fillText(pocPrice.toFixed(2)");
  });
});

describe("drawing chips quote the same precision", () => {
  it("the drawing renderer's dec reads the bars; the Fixed Range chip uses it", () => {
    expect(CHART).toContain("const dec = drawBars.length ? pricePrecisionFromBars(drawBars) : (base > 100 ? 2 : base > 1 ? 3 : 5);");
    expect(CHART).toContain("POC ${vm.poc?.toFixed(dec)}${est}`");
  });
});

describe("GP12 §27 — calculation precision is not display precision", () => {
  it("indicator math never rounds by a price-level rule", () => {
    // `> 100 ? 2 : 5` cut USDJPY (≈150, quoted to 3 dp) to cents inside the math.
    expect(CHART).not.toMatch(/\.toFixed\(closes\[0\] > 100 \? 2 : 5\)/);
    expect(CHART).not.toMatch(/\.toFixed\(b\.close > 100 \? 2 : 5\)/);
    expect(CHART).toContain("return slice.reduce((a, b) => a + b, 0) / period;");
  });

  it("overlay indicator lines speak the market's own decimals", () => {
    expect(CHART).toContain("const overlayPriceFormat = priceFormatFor(pricePrecisionFromBars(bars));");
    expect(CHART).toMatch(/crosshairMarkerVisible: false, priceFormat: overlayPriceFormat \}/);
  });

  it("the risk callout prints prices at the market's precision (R and % stay 2 dp)", () => {
    expect(CHART).toContain("STOP / INVALIDATION ${rv.stop.toFixed(pxDp)} · risk ${rv.riskPerUnit.toFixed(pxDp)}");
    expect(CHART).toContain("`ENTRY ${rv.entry.toFixed(pxDp)}");
    expect(CHART).toContain("`TARGET ${rv.target.toFixed(pxDp)}");
  });

  it("the drawing magnet snaps to the market's grid, not a guessed tick", () => {
    expect(CHART).toContain("const minTick = 10 ** -dp;");
    expect(CHART).not.toMatch(/const minTick = symBase > 10_000/);
  });
});
