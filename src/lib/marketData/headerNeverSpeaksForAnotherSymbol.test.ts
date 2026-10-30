/**
 * THE HEADER NEVER SPEAKS FOR ANOTHER SYMBOL (2026-10-25).
 *
 * Founder recording rec1.mov ~0:06, /charts BTC → NQ1! 1h: under "Loading
 * NQ1! 1h bars…" the legend read
 *   NQ1! 1h 80155.40 LAST 1h BAR CLOSE −230.56 (−0.29%) vs prior 1h bar
 *   O 80155.41 H 80625.84 L 80136.17 NOW 80356.83
 * for about a second — BTC's held bars under NQ1!'s label. The bars now carry
 * the symbol|timeframe they were written for (symbolOwned.ts), and every
 * header input reads them through readOwned.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { owned, readOwned, UNOWNED } from "./symbolOwned";
import { chartHeaderPriceFact } from "./chartHeaderPriceFact";
import { deriveLastBarClose } from "./deriveLastBarClose";

const code = readFileSync(path.resolve(__dirname, "../../components/chart/MainChart.tsx"), "utf8");

const btcBars = [
  { time: 1761300000, open: 80300, high: 80700, low: 80100, close: 80386, volume: 10 },
  { time: 1761303600, open: 80386, high: 80625.84, low: 80136.17, close: 80155.4, volume: 12 },
];

describe("held bars belong to the symbol|timeframe they were loaded for", () => {
  it("BTC's bars are not NQ1!'s — the header compiler is handed none, and waits", () => {
    const held = owned("BTC|1h", btcBars);
    const forNq = readOwned(held, "NQ1!|1h") ?? [];
    expect(forNq).toEqual([]);
    const fact = chartHeaderPriceFact(null, deriveLastBarClose(forNq, "1h", 1761310000 * 1000), false, 2, "unavailable");
    expect(fact.kind).toBe("AWAITING");
    expect(fact.text).not.toContain("80155");
  });

  it("a timeframe switch is a different owner too (30m bars never read as LAST 1h BAR CLOSE)", () => {
    expect(readOwned(owned("BTC|30m", btcBars), "BTC|1h")).toBeNull();
  });

  it("the chart's own bars still speak", () => {
    expect(readOwned(owned("NQ1!|1h", btcBars), "NQ1!|1h")).toBe(btcBars);
    expect(readOwned(UNOWNED, "NQ1!|1h")).toBeNull();
  });
});

describe("MainChart routes every header input through the owned bars", () => {
  it("stores the bars WITH their key", () => {
    expect(code).toContain("useState<Owned<LegacyOhlcvTuple[]>>(UNOWNED)");
    expect(code).toContain("const ownedCandles = readOwned(candlesHeld, candlesOwnerKey);");
    expect(code).not.toMatch(/const \[candles,\s+setCandles\]\s+=\s+useState/);
  });

  it("price, change and OHLC strip read headerCandles / candlesOwned, never the raw held bars", () => {
    expect(code).toContain("deriveLastBarClose(headerCandles, servedTimeframeFor(timeframe, symbol), Date.now())");
    expect(code).toContain("deriveBarOverBarChange(headerCandles, servedTimeframeFor(timeframe, symbol), Date.now())");
    expect(code).toContain("const last      = candlesOwned ? candles[candles.length - 1] : undefined;");
    expect(code).not.toContain("deriveLastBarClose(candles,");
    expect(code).not.toContain("deriveBarOverBarChange(candles,");
  });

  it("a live tick folded onto another symbol's bars cannot adopt them", () => {
    expect(code).toContain("setCandlesHeld(prev => owned(prev.key, bars));");
    expect(code).toContain("setCandlesFolded(next);");
  });

  it("a switch in flight says Loading <symbol>, never a number", () => {
    const at = code.indexOf('data-price-kind="SWITCHING"');
    expect(at).toBeGreaterThan(-1);
    // After the data-price-kind attribute itself (its own name says "price").
    const cell = code.slice(code.indexOf("\n", at), code.indexOf("</span>", at));
    expect(cell).toContain("Loading {symbol}…");
    expect(cell).not.toMatch(/toFixed|price|close/i);
  });
});
