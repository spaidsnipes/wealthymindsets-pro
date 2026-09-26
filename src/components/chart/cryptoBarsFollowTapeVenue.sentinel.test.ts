/**
 * ONE VENUE FOR BARS AND TAPE. Serving BTCUSD 1m 2026-09-26: bars from a
 * vendor with ~0 crypto volume under a LIVE TAPE from Coinbase — "V 0" on a
 * minute Coinbase traded 0.485 BTC. Plain crypto symbols take the tape's own
 * venue owner (`coinbaseProduct`) for bars too.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { coinbaseProduct } from "@/hooks/useWebSocket";

describe("crypto bars follow the tape's venue", () => {
  it("the tape owner maps the plain spellings to a Coinbase product", () => {
    expect(coinbaseProduct("BTCUSD")).toBe("BTC-USD");
    expect(coinbaseProduct("ETHUSD")).toBe("ETH-USD");
    expect(coinbaseProduct("TSLA")).toBeNull();
  });

  it("MainChart asks that owner before any generic vendor, and venue-pinned symbols keep their venue", () => {
    const code = readFileSync(join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    const at = code.indexOf("const tapeCoinbase =");
    expect(at).toBeGreaterThan(0);
    const block = code.slice(at, at + 400);
    expect(block).toContain("parseExchangeSymbol(symbol) ? null : coinbaseProduct(symbol)");
    expect(block).toContain('exchange: "coinbase" as const');
    expect(code.indexOf("const tapeCoinbase =")).toBeLessThan(code.indexOf("const alpacaData   = exchangeData ? null"));
  });
});
