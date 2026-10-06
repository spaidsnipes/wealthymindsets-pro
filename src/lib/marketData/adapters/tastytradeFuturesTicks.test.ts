import { describe, expect, it } from "vitest";

import { decodeCompactFeedData } from "@/lib/broker/tastyContractQuote";
import { resolveTastyFrontMonth, tastyTimeAndSaleToMarketEvent, tastyTradeToMarketEvent } from "./tastytradeFuturesTicks";

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

  it("a TimeAndSale print carries the EXCHANGE's aggressor side, bid and ask", () => {
    const c = { symbol: "/ESZ6", streamer: "/ESZ26:XCME" };
    // Shape from the owner's live socket, 2026-10-01 (+ validTick, 2026-10-02; + type, spreadLeg, 2026-10-06).
    const [e] = decodeCompactFeedData(["TimeAndSale", ["TimeAndSale", "/ESZ26:XCME", 1790834578430, 1122904, 7766, 1, "BUY", 7765.75, 7766, true, "NEW", false]]);
    const ev = tastyTimeAndSaleToMarketEvent(e, "ES1!", c, 1790834578600, 0)!;
    expect(ev).toMatchObject({ price: 7766, size: 1, aggressorSide: "BUY", aggressorMethod: "PROVIDER", aggressorConfidence: 1, bid: 7765.75, ask: 7766, timestampProvider: 1790834578430, contractId: "/ESZ6" });
    // The exchange print's own identity — the same id whether heard live or from history.
    expect(ev.eventId).toBe("tastytrade:/ESZ26:XCME:1790834578430:1122904");
    expect(tastyTimeAndSaleToMarketEvent(e, "ES1!", c, 999_999_999_999_999, 42)!.eventId).toBe(ev.eventId);
    const [u] = decodeCompactFeedData(["TimeAndSale", ["TimeAndSale", "/ESZ26:XCME", 1790834578430, 1122905, 7766, 2, "UNDEFINED", "NaN", "NaN", true, "NEW", false]]);
    expect(e.values.validTick).toBe(1);
    const unsigned = tastyTimeAndSaleToMarketEvent(u, "ES1!", c, 1790834578600, 1)!;
    expect(unsigned).toMatchObject({ aggressorSide: "UNKNOWN", aggressorMethod: "NONE" });
    expect(unsigned.bid).toBeUndefined();
    expect(unsigned.aggressorConfidence).toBeUndefined();
  });
});
