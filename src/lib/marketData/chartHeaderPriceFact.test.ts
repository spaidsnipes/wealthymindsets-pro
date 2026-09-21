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

describe("× THE BARE UNATTRIBUTED NUMBER: a quote WM cannot name a provider for", () => {
  // MEASURED on the serving host 2026-09-20, BTCUSDT, one viewport:
  //   header : 81822.00 +632.00 (+0.78%)
  //   footer : SOURCE UNKNOWN
  //   rail   : BTCUSDT · 5m · PRICE UNKNOWN
  // Three owners of one fact, and the biggest number on the screen was the only
  // one making no claim about where it came from.
  const SENTINELS = ["unavailable", "UNAVAILABLE", " unavailable ", "unknown", "none", "n/a", "-", "", "—"];

  it("prints the number AND the doubt, never the number alone", () => {
    for (const s of SENTINELS) {
      const f = chartHeaderPriceFact(81822, null, undefined, 2, s);
      expect(f.kind, `source ${JSON.stringify(s)}`).toBe("UNCERTIFIED_QUOTE");
      // The number is not withheld — understating knowledge is a truth defect.
      expect(f.text).toContain("81822.00");
      // And it is not bare — that would read as a certified live price.
      expect(f.text).not.toBe("81822.00");
      expect(f.text).toBe("81822.00 SOURCE UNCERTIFIED");
      // It IS a reading. WM received this number; it cannot attribute it.
      expect(f.measured).toBe(true);
      expect(f.reason).toMatch(/CANNOT NAME THE PROVIDER/);
    }
  });

  it("a real vendor name is certified and keeps the live-quote slot untouched", () => {
    for (const s of ["finnhub", "polygon", "binance", "Alpaca"]) {
      const f = chartHeaderPriceFact(81822, null, undefined, 2, s);
      expect(f.kind, `source ${JSON.stringify(s)}`).toBe("LIVE_QUOTE");
      expect(f.text).toBe("81822.00");
    }
  });

  it("SILENCE IS NOT CERTIFICATION: a caller that says nothing is unchanged", () => {
    // A caller that has not been taught to ask is not thereby accused. Every
    // pre-existing call site must be byte-identical.
    const silent = chartHeaderPriceFact(81822, null);
    const explicitUndefined = chartHeaderPriceFact(81822, null, undefined, 2, undefined);
    expect(silent.kind).toBe("LIVE_QUOTE");
    expect(silent.text).toBe("81822.00");
    expect(explicitUndefined).toEqual(silent);
  });

  it("uncertainty about the SOURCE never overrides the absence of a PRICE", () => {
    // No live number at all still falls to the bar close / NONE arms. An
    // uncertified source is a claim about provenance, not a price.
    expect(chartHeaderPriceFact(0, CLOSE, undefined, 2, "unavailable").kind).toBe("BAR_CLOSE");
    expect(chartHeaderPriceFact(null, null, undefined, 2, "unavailable").kind).toBe("NONE");
    expect(chartHeaderPriceFact(null, null, false, 2, "unavailable").kind).toBe("AWAITING");
  });

  it("carries the instrument's decimals into the uncertified text", () => {
    const f = chartHeaderPriceFact(1.23456, null, undefined, 4, "unavailable");
    expect(f.text).toBe("1.2346 SOURCE UNCERTIFIED");
  });
});

describe("/charts chrome header adoption — the source actually reaches the owner", () => {
  const code = readFileSync(
    join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"),
    "utf8",
  );

  it("× THE UNASKED QUESTION: the header hands its quote source to the compiler", () => {
    const call = code.slice(
      code.indexOf("const headerPriceFact = chartHeaderPriceFact("),
      code.indexOf("const headerPriceStyle = HEADER_PRICE_STYLE["),
    );
    expect(call, "the header never calls chartHeaderPriceFact").not.toBe("");
    expect(call, "barsSettled is no longer passed").toContain("barsSettled");
    expect(call, "decimals must be explicit so source cannot land in its slot").toMatch(/\n\s*2,/);
    expect(call, "the live quote's source is not handed over").toMatch(/\n\s*source,/);
  });

  it("× THE PROVENANCE-BLIND COLOUR: the new kind has a declared style", () => {
    expect(code).toContain("UNCERTIFIED_QUOTE: {");
  });
});

/**
 * × TWO CALL SITES OF ONE COMPILER ANSWERING ONE QUESTION TWO WAYS.
 *
 * MEASURED on the serving host 2026-09-20, BTCUSDT, ONE viewport. The
 * ChartsDashboard call site — taught to hand over `source` — resolved
 * UNCERTIFIED_QUOTE. MainChart's call site, which did not, resolved
 * LIVE_QUOTE and printed a bare `81224.01` in the largest type on the page.
 * Same compiler, same instrument, same instant, opposite verdicts.
 *
 * And the disagreement was invisible: ChartsDashboard's chrome header row is
 * `display: none` at >=1280px by a deliberate V01 ONE CANVAS decision (locked
 * by src/lib/chartsCategoryFusion.test.ts), so the ONLY one of the two a
 * desktop trader could read was the undisciplined one. Fixing the compiler
 * and one caller looked like a glass proof and was not.
 *
 * ── THE SCOPE OF THIS SCAN IS ITSELF AN ASSERTION ─────────────────────
 * This guard deliberately does NOT assert "every call site in src/ passes a
 * source", because that would be false. A third caller exists —
 * src/lib/experience/selectChartCompanion.ts — and it reads
 * `CanonicalMarketState`, whose `price` record carries `last/bid/ask/eventAt/
 * availableAt` and NO source field. It has nothing to hand over, and
 * SILENCE IS NOT CERTIFICATION cuts in its favour: a caller that was never
 * given a source must keep its pre-existing behaviour rather than be forced
 * to invent one. Widening this scan would make it lie about the world.
 *
 * What IS asserted is the real rule: the two owners of the /charts HEADER
 * PRICE SLOT, which render the same fact for the same instrument in the same
 * viewport, must both ask the provenance question.
 */
describe("× THE INVISIBLE DISAGREEMENT: both /charts header owners ask for provenance", () => {
  const mainChart = readFileSync(
    join(process.cwd(), "src/components/chart/MainChart.tsx"),
    "utf8",
  );

  it("MainChart hands its quote source to the compiler", () => {
    const start = mainChart.indexOf("const headerPriceFact = chartHeaderPriceFact(");
    expect(start, "MainChart no longer calls chartHeaderPriceFact").toBeGreaterThan(-1);
    const call = mainChart.slice(
      start,
      mainChart.indexOf("const headerChangeFact = chartHeaderChangeFact(", start),
    );
    expect(call, "barsSettled is no longer passed").toContain("candleSource !== \"\"");
    // `decimals` sits between `barsSettled` and `quoteSource` and DEFAULTS.
    // Without it explicit, a vendor string lands in the decimal slot — and
    // for this caller the default 2 would be wrong anyway, since MainChart
    // knows instruments whose tick is finer than a hundredth.
    expect(call, "decimals must be explicit so source cannot land in its slot").toMatch(/\n\s*dp,/);
    expect(call, "the live quote's source is not handed over").toMatch(/\n\s*source,/);
  });

  it("MainChart's source is the one useWebSocket certified, not a local invention", () => {
    // The binding must come from the hook that OWNS the certification verdict.
    // A locally-derived string would pass the arity check above while
    // manufacturing exactly the citation quoteSourceNamesProvider exists to
    // refuse.
    expect(mainChart).toMatch(/const \{[^}]*\bsource\b[^}]*\} = useWebSocket\(/);
  });
});
