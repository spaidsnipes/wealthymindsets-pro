/**
 * Garden 18 §4 (2026-10-06) — after a symbol switch no value read for the
 * previous symbol may render (quote, chains, flow, book).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { owned, readOwned, UNOWNED } from "./symbolOwned";
import { marketStateFor, silentMarketState } from "@/hooks/useWebSocket";

const src = (rel: string) => readFileSync(path.resolve(__dirname, "../..", rel), "utf8");

describe("readOwned", () => {
  it("returns a value only for the key it was read for", () => {
    const s = owned("BTC", { flow: 1 });
    expect(readOwned(s, "BTC")).toEqual({ flow: 1 });
    expect(readOwned(s, "ETH")).toBeNull();
    expect(readOwned(s, null)).toBeNull();
    expect(readOwned(UNOWNED, "BTC")).toBeNull();
  });
});

describe("the quote owner hands a switched symbol silence, not the previous tape", () => {
  it("marketStateFor", () => {
    const btc = { ...silentMarketState(), ticker: { price: 62000, change: 100, changePct: 0.2, volume: 5 } };
    expect(marketStateFor("TSLA", "BTC", btc, silentMarketState()).ticker.price).toBe(0);
  });
});

describe("per-symbol hooks store values WITH their key", () => {
  it.each([
    ["lib/marketData/useDeribitOptionFlow.ts", "return readOwned(ownedVm, currency);"],
    ["lib/marketData/useBookLiquidityLifecycle.ts", "return pair ? readOwned(ownedVm, `${pair}|${stepKey}`) : null;"],
    ["lib/broker/useTastyFuturesPositioning.ts", "const chain = readOwned(ownedChain, product);"],
    ["lib/broker/useTastyEquityOptionLegs.ts", "const chain = readOwned(ownedChain, key);"],
  ])("%s", (file, line) => {
    const code = src(file);
    expect(code).toContain(line);
    // The old shape: a bare nullable state reset only by an after-paint effect.
    expect(code).not.toMatch(/useState<(OptionFlowVM|LiquidityLifecycleVM|FuturesOptionChain) \| null>/);
  });
});
