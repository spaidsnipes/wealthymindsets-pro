/**
 * Garden 18 §4 (2026-10-06) — component state that belongs to ONE symbol is
 * stored WITH that symbol, so neither the first frame after a switch nor a
 * late answer for the previous symbol can paint under the new one.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { owned, ownedWrite, readOwned, UNOWNED } from "./symbolOwned";

const src = (rel: string) => readFileSync(path.resolve(__dirname, "../..", rel), "utf8");

describe("ownedWrite — the rule useSymbolOwnedState applies", () => {
  it("after BTC → ETH, ETH reads empty and a late BTC write is dropped", () => {
    let s = ownedWrite(UNOWNED as never, "BTC", "BTC", ["btc-level"], [] as string[]);
    expect(readOwned(s, "BTC")).toEqual(["btc-level"]);
    expect(readOwned(s, "ETH")).toBeNull();           // first frame on ETH
    s = ownedWrite(s, "BTC", "ETH", ["late-btc"], []);       // late answer for BTC
    expect(readOwned(s, "ETH")).toBeNull();
    s = ownedWrite(s, "ETH", "ETH", (p: string[]) => [...p, "eth-1"], []);
    expect(readOwned(s, "ETH")).toEqual(["eth-1"]);          // updater saw ETH's empty, not BTC's book
  });
  it("owned values never answer for another key", () => {
    expect(readOwned(owned("AAPL", 1), "TSLA")).toBeNull();
  });
  it("the hook routes every write through ownedWrite and drops stale writers", () => {
    const hook = src("lib/marketData/useSymbolOwnedState.ts");
    expect(hook).toContain("if (keyRef.current !== key) return;");
    expect(hook).toContain("ownedWrite(prev, key, keyRef.current, next, emptyRef.current)");
  });
});

describe("components hold per-symbol state through the owner", () => {
  it.each([
    ["components/chart/SecFundamentalsCard.tsx", ["const quote = readOwned(ownedQuote, key);", "const body = readOwned(ownedBody, key);"]],
    ["components/chart/MarketMetricsCard.tsx", ["const rows = readOwned(ownedRows, product);", "const list = readOwned(ownedList, product);", "const read = readOwned(ownedRead, q);"]],
    ["components/chart/StockInfoPanel.tsx", ["const realOHLC = readOwned(ownedOHLC, ownerKey);", "const favorited = readOwned(ownedFav, ownerKey) === true;"]],
    ["components/chart/DOMPanel.tsx", ["useSymbolOwnedState<DomLevel[]>(sym, [])"]],
    // The contract is owned by the chart symbol through the one shared resolver (brokerReadbackStore keys every answer by symbol).
    ["components/chart/TradePanel.tsx", ["const contractAnswer = useBrokerContract(symbol,", 'contractAnswer.state === "RESOLVED" ? contractAnswer.contract : null']],
    ["components/broker/AlpacaTradingPanel.tsx", ["(symbol.trim().toUpperCase(), null);"]],
    ["lib/broker/tastyOptionStreamers.ts", ["return readOwned(ownedMap, underlying);"]],
  ])("%s", (file, lines) => {
    const code = src(file);
    for (const l of lines) expect(code).toContain(l);
  });
  it("OptionsChain already fences its render on the symbol the chain was received for", () => {
    expect(src("components/chart/OptionsChain.tsx")).toContain("receivedSymbol === symbol && dataSource === OPTION_CHAIN_SOURCE");
  });
});
