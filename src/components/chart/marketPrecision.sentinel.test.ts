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
