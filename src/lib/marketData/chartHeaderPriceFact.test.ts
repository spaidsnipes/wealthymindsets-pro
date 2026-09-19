import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chartHeaderPriceFact } from "./chartHeaderPriceFact";
import { deriveLastBarClose } from "./deriveLastBarClose";
import type { LegacyOhlcvTuple } from "./canonicalBar";

function bar(time: number, close: number): LegacyOhlcvTuple {
  return { time, open: close, high: close, low: close, close, volume: 0 } as LegacyOhlcvTuple;
}

const CLOSE = { close: 357.47, barOpenedAtMs: 1_757_959_240_000, timeframe: "15m" };

describe("chartHeaderPriceFact — a live quote answers the question the slot asks", () => {
  it("a live quote takes the slot and refuses to claim freshness", () => {
    const f = chartHeaderPriceFact(357.87, CLOSE);
    expect(f.kind).toBe("LIVE_QUOTE");
    expect(f.text).toBe("357.87");
    expect(f.measured).toBe(true);
    expect(f.reason).toMatch(/does not claim how stale/i);
  });

  it("× THE SILENT UPGRADE: a bar close must never wear a live quote's clothes", () => {
    const f = chartHeaderPriceFact(0, CLOSE);
    expect(f.kind).toBe("BAR_CLOSE");
    // The number is NEVER alone. A bare "357.47" in this slot reads as live.
    expect(f.text).toBe("357.47 LAST 15m BAR CLOSE");
    expect(f.text).not.toBe("357.47");
    expect(f.text).toContain("BAR CLOSE");
    expect(f.reason).toMatch(/will not render a candle close in a live price's clothes/i);
    expect(f.reason).toMatch(/DIFFERENT READING, not a substitute/i);
  });

  it("× THE WITHHELD KNOWLEDGE: a verified bar close is SAID, not swallowed", () => {
    // The exact live defect: TSLA | — | HISTORICAL BARS VERIFIED, while the
    // same chartBars were already publishing a close to another consumer.
    const f = chartHeaderPriceFact(undefined, CLOSE);
    expect(f.measured).toBe(true);
    expect(f.text).not.toBe("—");
    expect(f.text).toContain("357.47");
    expect(f.reason).toMatch(/said out loud instead of withheld/i);
  });

  it("× THE COLLAPSED ABSENCE: no quote AND no bars names BOTH empty channels", () => {
    for (const bc of [null, undefined, { ...CLOSE, close: 0 }, { ...CLOSE, timeframe: "  " }]) {
      const f = chartHeaderPriceFact(0, bc as never);
      expect(f.kind).toBe("NONE");
      expect(f.measured).toBe(false);
      expect(f.text).toBe("No price");
      expect(f.text).not.toBe("—");
    }
    const f = chartHeaderPriceFact(0, null);
    expect(f.reason).toMatch(/no live quote/i);
    expect(f.reason).toMatch(/cannot name a last bar close/i);
    expect(f.reason).toMatch(/still forming has no close/i);
    expect(f.reason).toMatch(/not a price of zero/i);
  });

  it("× THE PHANTOM ZERO: a non-positive or non-finite live price is not a quote", () => {
    for (const v of [0, -1, Number.NaN, "357.87", null, undefined]) {
      expect(chartHeaderPriceFact(v, null).kind).toBe("NONE");
    }
  });

  it("composes with the real deriver — a forming bar never reaches the header", () => {
    // Newest bar opened at t=1000s on a 15m chart and has NOT elapsed at
    // t=1000s+1min, so PROOF 2 fails and the runner-up is named instead.
    const bars = [bar(1000, 10), bar(1900, 99)];
    const evidence = deriveLastBarClose(bars, "15m", 1_960_000);
    const f = chartHeaderPriceFact(0, evidence);
    expect(f.text).not.toContain("99.00");
    expect(f.text).toContain("10.00");
    expect(f.kind).toBe("BAR_CLOSE");
  });
});

describe("a formatter must not manufacture a flat price", () => {
  /**
   * THE DEFECT THIS PARAMETER EXISTS TO PREVENT.
   *
   * This module hardcoded `toFixed(2)`. MainChart trades instruments whose
   * quotes carry four decimals (`dp = base < 10 ? 4 : 2`), so adopting this
   * owner naively would have printed `0.0034` as `0.00` — not a rounding, a
   * FLAT PRICE invented by the formatter and then rendered in the largest type
   * on the product. Same family as the defect the module was written against:
   * a number that was never observed, wearing an observation's clothes.
   */
  it("× THE ZERO THE MARKET NEVER PRINTED: a sub-cent price survives its own instrument", () => {
    const f = chartHeaderPriceFact(0.0034, null, undefined, 4);
    expect(f.kind).toBe("LIVE_QUOTE");
    expect(f.text).toBe("0.0034");
    expect(f.text, "the formatter flattened a real price to zero").not.toBe("0.00");
  });

  it("the bar-close arm carries the same precision — in the text AND in the reason", () => {
    // The reason is the tooltip a trader actually reads. A reason that names a
    // different number than the cell shows is two answers again, one hop down.
    const f = chartHeaderPriceFact(0, { ...CLOSE, close: 0.0034, timeframe: "5m" }, undefined, 4);
    expect(f.kind).toBe("BAR_CLOSE");
    expect(f.text).toBe("0.0034 LAST 5m BAR CLOSE");
    expect(f.reason).toContain("0.0034");
    expect(f.reason, "the tooltip names a number the cell does not show").not.toContain("0.00 ");
  });

  it("defaults to 2 so every caller that never asked is untouched", () => {
    expect(chartHeaderPriceFact(357.875, null).text).toBe("357.88");
    expect(chartHeaderPriceFact(357.875, null, undefined, 2).text).toBe("357.88");
  });
});

describe("/charts chrome header adoption", () => {
  const code = readFileSync(
    join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"),
    "utf8",
  );

  it("× THE WITHHELD KNOWLEDGE ON SCREEN: the header consults the bar close", () => {
    expect(code).toContain("chartHeaderPriceFact");
    expect(code).toContain("headerPriceFact");
  });

  it("× THE BARE GLYPH ON SCREEN: the price slot no longer ternaries into a dash", () => {
    expect(code).not.toContain('<span title={PRICE_UNAVAILABLE_TITLE} aria-label={PRICE_UNAVAILABLE_TITLE}>—</span>');
    expect(code).not.toContain("ticker.price > 0\n                  ? ticker.price.toFixed(2)");
  });

  it("× THE PROVENANCE-BLIND COLOUR: the slot styles from kind, not from presence", () => {
    expect(code).toContain("headerPriceFact.kind");
    expect(code).toMatch(/headerPriceFact\.reason/);
  });
});
