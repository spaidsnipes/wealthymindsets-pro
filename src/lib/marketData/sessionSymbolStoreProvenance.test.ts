/**
 * "Evidence saved" — every row's provider is one that could have produced it.
 *
 * MEASURED LIVE 2026-09-25 on wealthymindsetspro.com/charts: the watchlist's
 * "Evidence saved · N symbols" popover spoke "TSLA, via coinbase" and
 * "Switch chart to NQ1!, via coinbase". Neither instrument trades on Coinbase.
 *
 * Two owners, two guards:
 *   - `useWebSocket` (`marketStateFor`) no longer hands the previous symbol's
 *     tape to the render in which the symbol changed — the commit in which
 *     MainChart's recorder filed BTC's Coinbase prints under TSLA.
 *   - `sessionSymbolStore` (`tapeSourceCanCarry`) refuses, never enumerates,
 *     and never rehydrates a reading no tape could have produced, so the lies
 *     already sitting in a trader's localStorage stop being spoken.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import {
  __resetSessionSymbolStoreForTests,
  getKnownSessionSymbols,
  getSessionSymbolSlot,
  pushCvdSample,
  recordSessionTrade,
  tapeSourceCanCarry,
} from "./sessionSymbolStore";
import { marketStateFor, silentMarketState, type MarketState } from "@/hooks/useWebSocket";

const LS_KEY = "wm:session-symbol-store:v1";
const T = 1_790_000_000_000;

describe("tapeSourceCanCarry — which tape could have printed this symbol", () => {
  it.each([
    // [symbol, tape, verdict]
    ["TSLA", "coinbase", false],   // MEASURED LIE
    ["NQ1!", "coinbase", false],   // MEASURED LIE
    ["AAPL", "binance", false],
    ["ES1!", "alpaca", false],     // equity relay does not print futures
    ["EURUSD", "webull", false],
    ["BTC-USD", "alpaca", false],  // the relay is registered as equity
    ["BTC", "coinbase", true],
    ["ETH-USD", "binance", true],
    ["TSLA", "alpaca", true],
    ["SPY", "webull", true],
    ["AAPL", "moomoo", true],
    // No claim either way: the store's own "unavailable" marker, and sources
    // the capability registry has no tape row for.
    ["TSLA", "unavailable", null],
    ["NQ1!", "finnhub", null],
    ["AAPL", "polygon", null],
  ] as const)("%s via %s → %s", (symbol, tape, verdict) => {
    expect(tapeSourceCanCarry(symbol, tape)).toBe(verdict);
  });
});

describe("the store never files one instrument's prints under another's name", () => {
  beforeEach(() => __resetSessionSymbolStoreForTests());

  it("refuses to record, sample or enumerate an impossible provenance", () => {
    recordSessionTrade("TSLA", "coinbase", { side: "buy", size: 1, time: T }, false);
    recordSessionTrade("NQ1!", "coinbase", { side: "sell", size: 2, time: T }, true);
    pushCvdSample("TSLA", "coinbase");
    // NEGATIVE CONTROL — the lawful pairs still record.
    recordSessionTrade("BTC", "coinbase", { side: "buy", size: 1, time: T }, false);
    recordSessionTrade("TSLA", "alpaca", { side: "buy", size: 3, time: T }, false);

    const known = getKnownSessionSymbols().map(k => `${k.symbol}::${k.tapeSource}`).sort();
    expect(known).toEqual(["BTC::coinbase", "TSLA::alpaca"]);
    // A reader asking for the impossible slot gets an honest zero, not a slot.
    expect(getSessionSymbolSlot("TSLA", "coinbase").stats.tradeCount).toBe(0);
    expect(getKnownSessionSymbols().some(k => k.tapeSource === "coinbase" && k.symbol === "TSLA")).toBe(false);
  });
});

describe("the lies already persisted in a trader's browser stop being spoken", () => {
  function installFakeLocalStorage(seed: Record<string, unknown>): Map<string, string> {
    const store = new Map<string, string>();
    (globalThis as unknown as { window?: unknown }).window = {
      localStorage: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => { store.set(k, v); },
        removeItem: (k: string) => { store.delete(k); },
      },
    };
    __resetSessionSymbolStoreForTests(); // wipes the key, so seed AFTER it
    store.set(LS_KEY, JSON.stringify(seed));
    return store;
  }
  afterEach(() => {
    __resetSessionSymbolStoreForTests();
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("drops TSLA::coinbase and NQ1!::coinbase on hydration, keeps what could be true", async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const slot = (n: number) => ({
      stats: { delta: n, buyVol: n, sellVol: 0, tradeCount: n, bigTradeCount: 0 },
      horizon: null, cvdSpark: [], lastTradeAtMs: T, savedAtSec: nowSec,
    });
    const storage = installFakeLocalStorage({
      "TSLA::coinbase": slot(2000),
      "NQ1!::coinbase": slot(1500),
      "BTC::coinbase": slot(40),
      "TSLA::alpaca": slot(5),
      "BTC::unavailable": slot(3),
    });
    const known = getKnownSessionSymbols().map(k => `${k.symbol}::${k.tapeSource}`).sort();
    expect(known).toEqual(["BTC::coinbase", "BTC::unavailable", "TSLA::alpaca"]);

    // And the next flush RETIRES them from the browser — not merely hidden.
    recordSessionTrade("BTC", "coinbase", { side: "buy", size: 1, time: T }, false);
    pushCvdSample("BTC", "coinbase"); // the store's flush trigger
    await new Promise(r => setTimeout(r, 900));
    const persisted = Object.keys(JSON.parse(storage.get(LS_KEY) ?? "{}")).sort();
    expect(persisted).toEqual(["BTC::coinbase", "BTC::unavailable", "TSLA::alpaca"]);
  });
});

describe("marketStateFor — the render between a symbol switch and the hook's reset", () => {
  const btcTape: MarketState = {
    ...silentMarketState(),
    recentTicks: [{ price: 65_000, size: 0.5, side: "buy", time: T, trade: true }],
    tapeSource: "coinbase",
    source: "coinbase",
    connected: true,
  };

  it("hands the NEW symbol silence, never the previous symbol's tape", () => {
    const seen = marketStateFor("TSLA", "BTC", btcTape, silentMarketState());
    expect(seen.recentTicks).toEqual([]);
    expect(seen.tapeSource).toBeNull();
    expect(seen.source).toBe("unavailable");
    expect(seen.connected).toBe(false);
  });

  it("NEGATIVE CONTROL — once reset for this symbol, its own state flows through", () => {
    expect(marketStateFor("BTC", "BTC", btcTape, silentMarketState())).toBe(btcTape);
  });

  it("the hook actually routes its return through the guard, and moves the owner with the reset", () => {
    // A pure guard nobody calls guards nothing. Read what the hook RUNS.
    const code = stripComments(readFileSync(resolve(process.cwd(), "src/hooks/useWebSocket.ts"), "utf8"));
    expect(code.length, "the scan read the real hook").toBeGreaterThan(20_000);
    expect(code).toMatch(/return marketStateFor\(symbol, stateOwner, state, silentForSymbol\);\s*\}\s*$/);
    expect(code).not.toMatch(/\n  return state;\n\}/);
    expect(code).toContain("setStateOwner(symbol);");
  });
});
