import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { coinbaseProductFor, fetchCoinbaseTradeHistory, normalizeCoinbaseRestTrades } from "./coinbaseTradeBackfill";

describe("coinbase trade backfill", () => {
  it("maker side is inverted to the aggressor (the live adapter's rule) and keeps the live eventId", () => {
    const t = normalizeCoinbaseRestTrades([
      { trade_id: 7, side: "buy", size: "0.5", price: "84000", time: "2026-09-28T17:00:00Z" },
      { trade_id: 8, side: "sell", size: "0.1", price: "84001", time: "2026-09-28T17:00:01Z" },
      { trade_id: 9, side: "?", size: "1", price: "1", time: "2026-09-28T17:00:02Z" },
    ], "BTC-USD", "BTC-USD");
    expect(t.map(x => x.side)).toEqual(["sell", "buy"]);
    expect(t[0].marketEvent?.eventId).toBe("coinbase:BTC-USD:7");
    expect(t[0].marketEvent?.aggressorMethod).toBe("MAKER_SIDE_INVERTED");
    expect(t.every(x => x.trade === true)).toBe(true);
  });
  it("maps crypto symbols to products; equities and futures are not Coinbase", () => {
    expect(coinbaseProductFor("BTC-USD")).toBe("BTC-USD");
    expect(coinbaseProductFor("ETHUSD")).toBe("ETH-USD");
    expect(coinbaseProductFor("NQ1!")).toBe("NQ-USD"); // shape only — the caller also requires a Coinbase tape
  });
  it("pages older via cb-after until the window is reached; returns oldest-first", async () => {
    const pages = [
      [{ trade_id: 3, side: "buy", size: "1", price: "10", time: "2026-09-28T17:03:00Z" }],
      [{ trade_id: 2, side: "sell", size: "1", price: "10", time: "2026-09-28T17:01:00Z" }],
    ];
    let i = 0;
    const f = (async () => new Response(JSON.stringify(pages[i++] ?? []), { status: 200, headers: { "cb-after": String(10 - i) } })) as unknown as typeof fetch;
    const r = await fetchCoinbaseTradeHistory("BTC-USD", "BTC-USD", { sinceMs: Date.parse("2026-09-28T17:02:00Z"), fetchImpl: f, paceMs: 0 });
    expect(r.pages).toBe(2);
    expect(r.complete).toBe(true);
    expect(r.ticks.map(t => t.marketEvent?.sourceEventId)).toEqual(["3"]);
  });
  it("MainChart folds backfill through THE one fold (heardLive=false), never a second ladder", () => {
    const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
    expect(MC).toContain("if (foldPrintRef.current(t, false)) folded++;");
    expect(MC).toContain("if (foldPrint(tick, true)) ladderChanged = true;");
    expect((MC.match(/tickAccRef\.current\.set\(barTime/g) ?? []).length).toBe(1);
  });
});
