import { describe, expect, it } from "vitest";
import { tastyTradeToMarketEvent } from "./tastytradeFuturesTicks";

describe("the extended-hours last dates the feed (2026-10-01)", () => {
  const contract = { symbol: "TSLA", streamer: "TSLA" } as never;
  it("a TradeETH event is a trade observation, a Quote is not", () => {
    const at = Date.parse("2026-10-01T23:59:59Z");
    const eth = tastyTradeToMarketEvent({ type: "TradeETH", symbol: "TSLA", values: { price: 355.7, size: 10, time: at - 1000 }, text: {} } as never, "TSLA", contract, at, 0);
    expect(eth?.price).toBe(355.7);
    expect(eth?.timestampProvider).toBe(at - 1000);
    expect(tastyTradeToMarketEvent({ type: "Quote", symbol: "TSLA", values: { price: 1, size: 1, time: at }, text: {} } as never, "TSLA", contract, at, 0)).toBeNull();
  });
});
