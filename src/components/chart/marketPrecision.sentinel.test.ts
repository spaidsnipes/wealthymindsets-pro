/**
 * THE CHART QUOTES THE MARKET'S OWN PRECISION.
 *
 * Serving EURUSD 1h desktop, 2026-09-25: the price series had no priceFormat
 * (library default: two decimals) and the legend's precision came from a
 * static per-symbol base, so the axis read 1.15 / 1.14 / 1.13 and the header
 * "1.14 +0.00 (+0.20%)" with O/H/L all 1.14. Both now read the bars through
 * one owner, pricePrecision.ts.
 *
 * Garden 16 (2026-09-26): every read now passes the chart's `symbol`, so the
 * owner can hold a US equity at or above $1 on the cents grid its tape's
 * sub-penny prints hide (TSLA on Webull read "388.0000").
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
    // Same site, two owners composed: display decimals from displayPrecisionFor
    // (GP12 §27 — EURUSD read 1.139212 from the grid detector alone) and the
    // axis format that refuses a price the instrument cannot have (§50).
    expect(CHART).toContain("cs.applyOptions({ priceFormat: axisPriceFormatFor(displayPrecisionFor(symbol, data), symbol) });");
    const at = CHART.indexOf("cs.applyOptions({ priceFormat: axisPriceFormatFor(");
    expect(CHART.indexOf("candleRef.current = cs;", at)).toBeGreaterThan(at);
  });

  it("the header legend's precision is read from the bars, the base rule only before any bar", () => {
    // Pin moved 2026-09-26 (GP12 §27): display decimals come from the one
    // display owner, displayPrecisionFor(symbol, …), which asks the instrument
    // first (EURUSD read 1.139212 from the grid detector alone). Not weakened:
    // the same site, a stricter owner.
    expect(CHART).toContain("const dp        = candles.length ? displayPrecisionFor(symbol, candles) : (base < 10 ? 4 : 2);");
    expect(CHART).not.toContain("const dp        = base < 10 ? 4 : 2;");
  });
});

describe("profile-family level names quote the same precision", () => {
  it("one per-frame precision from the owner, used by every level name", () => {
    // Pin moved 2026-09-26 (GP12 §27): display decimals come from the one
    // display owner, displayPrecisionFor(symbol, …), which asks the instrument
    // first (EURUSD read 1.139212 from the grid detector alone). Not weakened:
    // the same site, a stricter owner.
    expect(CHART).toContain("const pxDp = displayPrecisionFor(symbol, barsRef.current ?? []);");
    for (const s of ["`TPO POC ${tpo.poc?.toFixed(pxDp)", "`CMP POC ${cp.poc?.toFixed(pxDp)}`", "`VRP POC ${vrpVM.poc?.toFixed(pxDp)}`", "`FUSED POC ${f.poc.toFixed(pxDp)}`", "`LEG POC ${sp.poc.toFixed(pxDp)}`", "`dPOC ${last.poc.toFixed(pxDp)}"]) {
      expect(CHART, s).toContain(s);
    }
    expect(CHART).not.toMatch(/`TPO (POC|VAH|VAL) \$\{tpo\.\w+\?\.toFixed\(2\)/);
  });
});

describe("the classic VP column's price tags quote the same precision", () => {
  it("computes its own precision from the bars it measured (it can run before the frame's pxDp)", () => {
    // Pin moved 2026-09-26 (GP12 §27): display decimals come from the one
    // display owner, displayPrecisionFor(symbol, …), which asks the instrument
    // first (EURUSD read 1.139212 from the grid detector alone). Not weakened:
    // the same site, a stricter owner.
    expect(CHART).toContain("const vpDp = displayPrecisionFor(symbol, barsToUse);");
    // Pin updated 2026-09-25 (P-110 canon pass, M47): every VP level — POC
    // included — is named and chipped through vpPrice, the market's decimals
    // with thousands grouping. The BTC ≥10,000 rounding ("VAH 64,348") is gone:
    // it quoted a price the market did not print.
    expect(CHART).toContain('const vpPrice = (p: number) => p.toLocaleString("en-US", { minimumFractionDigits: vpDp, maximumFractionDigits: vpDp });');
    // 2026-09-26: ONE label per level (M47) — the price is the chip's alone;
    // the name at the column's left carries no second copy of it.
    expect(CHART).not.toContain("const word = `${tag} ${vpPrice(p)}`;");
    expect(CHART).toContain("const chipTxt = vpPrice(p);");
    expect(CHART).toContain('p.toFixed(vpDp)}`;');
    expect(CHART).not.toContain("ctx.fillText(pocPrice.toFixed(2)");
    expect(CHART).not.toContain('Math.round(p).toLocaleString("en-US")');
  });
});

describe("drawing chips quote the same precision", () => {
  it("the drawing renderer's dec reads the bars; the Fixed Range chip uses it", () => {
    // Pin moved 2026-09-26 (GP12 §27): display decimals come from the one
    // display owner, displayPrecisionFor(symbol, …), which asks the instrument
    // first (EURUSD read 1.139212 from the grid detector alone). Not weakened:
    // the same site, a stricter owner.
    expect(CHART).toContain("const dec = drawBars.length ? displayPrecisionFor(symbol, drawBars) : (base > 100 ? 2 : base > 1 ? 3 : 5);");
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
    // Pin moved 2026-09-26 (GP12 §27): display decimals come from the one
    // display owner, displayPrecisionFor(symbol, …), which asks the instrument
    // first (EURUSD read 1.139212 from the grid detector alone). Not weakened:
    // the same site, a stricter owner.
    expect(CHART).toContain("const overlayPriceFormat = priceFormatFor(displayPrecisionFor(symbol, bars));");
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

describe("every other price named on the glass quotes the same precision", () => {
  // Added 2026-09-25 (NOAH lane): the frame's pxDp is read before the first
  // layer that names a price (the tape bubbles paint long before the profiles).
  it("pxDp is read once, ahead of the bubbles", () => {
    // Pin moved 2026-09-26 (GP12 §27): display decimals come from the one
    // display owner, displayPrecisionFor(symbol, …), which asks the instrument
    // first (EURUSD read 1.139212 from the grid detector alone). Not weakened:
    // the same site, a stricter owner.
    const at = CHART.indexOf("const pxDp = displayPrecisionFor(symbol, barsRef.current ?? []);");
    expect(at).toBeGreaterThan(-1);
    expect(CHART.indexOf("const pxDp =", at + 1)).toBe(-1);
    // The delta bubble writes its signed delta now (v2 §15); the first price it
    // named was the bubble's — the big-trade inscription still names prices.
    expect(at).toBeLessThan(CHART.indexOf("const lbl = signedFlowText(b.ask - b.bid, fmtV);"));
    expect(CHART).not.toContain("const lbl = p >= 100 ? p.toFixed(2)");
  });

  it("the Question Lens band tag, the scaffolding swings and the selected zone's range", () => {
    expect(CHART).toContain("`${tagWord} · ${lens.bandLow.toFixed(pxDp)}–${lens.bandHigh.toFixed(pxDp)}`");
    expect(CHART).toContain("`${tagWord} · ${lens.bandLow.toFixed(pxDp)}`");
    expect(CHART).toContain("const t = `${tag} · ${lvl.toFixed(pxDp)}`;");
    expect(CHART).toContain("`${z.side} · ${z.object.priceLow.toFixed(pxDp)} – ${z.object.priceHigh.toFixed(pxDp)} · ${z.lifecycle.state}`");
    expect(CHART).not.toMatch(/lens\.band(Low|High)\.toFixed\(2\)|lvl\.toFixed\(2\)|z\.object\.price(Low|High)\.toFixed\(2\)/);
  });
});


describe("GP12 §27 — ONE display-precision owner (2026-09-26)", () => {
  // MEASURED ON SERVING 2026-09-26 05:01 CDT, EURUSD 15m: the axis and legend
  // read "1.139212" (six decimals) because every display site asked the bar-grid
  // detector, which cannot see a venue grid in Yahoo's computed FX floats. The
  // display owner asks the instrument first. This pins that every DISPLAY site
  // asks the owner and that the grid detector is called directly only by the
  // CALCULATION path (the drawing magnet's snap grid).
  const DASH = strip(readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8"));

  it("MainChart calls the grid detector exactly once, inside the magnet snap", () => {
    const calls = CHART.match(/pricePrecisionFromBars\(/g) ?? [];
    expect(calls.length).toBe(1);
    const snapAt = CHART.indexOf("const snapLogical = useCallback(");
    const callAt = CHART.indexOf("pricePrecisionFromBars(");
    expect(snapAt).toBeGreaterThan(-1);
    expect(callAt).toBeGreaterThan(snapAt);
    expect(callAt).toBeLessThan(CHART.indexOf("}, [magnetActive, symbol]);", snapAt));
  });

  it("every display site in MainChart asks displayPrecisionFor(symbol, …)", () => {
    for (const s of [
      "axisPriceFormatFor(displayPrecisionFor(symbol, data), symbol)",
      "priceFormatFor(displayPrecisionFor(symbol, bars))",
      "const pxDp = displayPrecisionFor(symbol, barsRef.current ?? []);",
      "const vpDp = displayPrecisionFor(symbol, barsToUse);",
      "priceDp: displayPrecisionFor(symbol, barsRef.current ?? []),",
      "displayPrecisionFor(symbol, candles)",
      "displayPrecisionFor(symbol, drawBars)",
    ]) expect(CHART, s).toContain(s);
    // The Data Window's O/H/L/C cells read the legend's dp, not a base rule.
    expect(CHART).toContain("row.value.toFixed(dp)");
    expect(CHART).not.toContain("row.value.toFixed(base < 10 ? 4 : 2)");
  });

  it("the room's Inspect ticket asks the same owner; no grid-detector call remains there", () => {
    expect(DASH).toContain("displayPrecisionFor(symbol, chartBars)");
    expect(DASH).not.toContain("pricePrecisionFromBars(");
  });
});
