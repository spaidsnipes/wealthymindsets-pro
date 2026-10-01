import { describe, expect, it } from "vitest";

import { decodeCompactFeedData } from "@/lib/broker/tastyContractQuote";
import { resolveTastyFrontMonth, tastyTradeToMarketEvent } from "./tastytradeFuturesTicks";

// Shape read from the live /instruments/futures?product-code=ES answer, 2026-10-01.
const FUTURES = [
  { symbol: "/ESM7", "streamer-symbol": "/ESM27:XCME", "days-to-expiration": 260, "active-month": false, active: true },
  { symbol: "/ESZ6", "streamer-symbol": "/ESZ26:XCME", "days-to-expiration": 78, "active-month": true, active: true },
  { symbol: "/ESH7", "streamer-symbol": "/ESH27:XCME", "days-to-expiration": 169, "active-month": false, active: true },
];

describe("tastytrade futures prints", () => {
  it("feeds a continuous chart symbol from tastytrade's active-month contract", () => {
    expect(resolveTastyFrontMonth(FUTURES)).toEqual({ symbol: "/ESZ6", streamer: "/ESZ26:XCME" });
    const noActive = FUTURES.map(f => ({ ...f, "active-month": false }));
    expect(resolveTastyFrontMonth(noActive)?.symbol).toBe("/ESZ6");
    expect(resolveTastyFrontMonth(null)).toBeNull();
    expect(resolveTastyFrontMonth([{ symbol: "/ESU6", "streamer-symbol": "/ESU26:XCME", "days-to-expiration": -1 }])).toBeNull();
  });

  it("a Trade becomes an UNSIGNED observed TRADE naming the real contract", () => {
    const [e] = decodeCompactFeedData(["Trade", ["Trade", "/ESZ26:XCME", 7747.75, 812345, 3, 1759300000000]]);
    const ev = tastyTradeToMarketEvent(e, "ES1!", { symbol: "/ESZ6", streamer: "/ESZ26:XCME" }, 1759300000500, 0)!;
    expect(ev).toMatchObject({ symbol: "ES1!", contractId: "/ESZ6", exchange: "XCME", eventType: "TRADE", price: 7747.75, size: 3, aggressorMethod: "NONE", dataMode: "LIVE", timestampProvider: 1759300000000 });
    expect(ev.aggressorSide).toBeUndefined();
  });

  it("refuses other symbols, quotes, empty prints, and future-dated provider times", () => {
    const c = { symbol: "/ESZ6", streamer: "/ESZ26:XCME" };
    const [q] = decodeCompactFeedData(["Quote", ["Quote", "/ESZ26:XCME", 1, 2, 3, 4]]);
    expect(tastyTradeToMarketEvent(q, "ES1!", c, 1, 0)).toBeNull();
    const [other] = decodeCompactFeedData(["Trade", ["Trade", "/NQZ26:XCME", 1, 1, 1, 1]]);
    expect(tastyTradeToMarketEvent(other, "ES1!", c, 1, 0)).toBeNull();
    const [zero] = decodeCompactFeedData(["Trade", ["Trade", "/ESZ26:XCME", 7747, 1, 0, 1]]);
    expect(tastyTradeToMarketEvent(zero, "ES1!", c, 1, 0)).toBeNull();
    const [ahead] = decodeCompactFeedData(["Trade", ["Trade", "/ESZ26:XCME", 7747, 1, 1, 9_000_000]]);
    expect(tastyTradeToMarketEvent(ahead, "ES1!", c, 1_000, 0)?.timestampProvider).toBeUndefined();
  });
});
