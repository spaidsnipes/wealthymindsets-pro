import { describe, expect, it } from "vitest";
import { barsInWindow, excursions, optionStreamerFor, replayFrame, replayMarkers, replayWindow } from "./tradeReplay";

describe("trade replay — the contract's own bars, no look-ahead", () => {
  it("names the dxFeed streamer symbol of the traded contract", () => {
    expect(optionStreamerFor("TSLA 2026-10-02 390C")).toBe(".TSLA261002C390");
    expect(optionStreamerFor("SPY 2026-01-12 693C")).toBe(".SPY260112C693");
    expect(optionStreamerFor("TSLA 2026-10-02 387.5P")).toBe(".TSLA261002P387.5");
    expect(optionStreamerFor("NVDA")).toBe("NVDA");
    expect(optionStreamerFor("garbage key")).toBeNull();
  });

  it("the cursor hides later bars and later fills", () => {
    const t0 = Date.parse("2026-10-01T13:30:00Z") / 1000;
    const bars = Array.from({ length: 10 }, (_, i) => ({ time: t0 + i * 60, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
    const ep = {
      openedAt: new Date((t0 + 120) * 1000 + 5_000).toISOString(), closedAt: new Date((t0 + 300) * 1000 + 5_000).toISOString(),
      entries: [{ orderId: "a", side: "BUY" as const, quantity: 1, price: 0.13, at: new Date((t0 + 120) * 1000 + 5_000).toISOString(), fees: 0.05, orderType: "LIMIT", comboType: "NORMAL", atIsPlacement: false }],
      exits: [{ orderId: "b", side: "SELL" as const, quantity: 1, price: 0.12, at: new Date((t0 + 300) * 1000 + 5_000).toISOString(), fees: 0.06, orderType: "LIMIT", comboType: "NORMAL", atIsPlacement: false }],
    };
    const m = replayMarkers(ep);
    expect(replayFrame(bars, m, 1).markers).toHaveLength(0);
    expect(replayFrame(bars, m, 2)).toMatchObject({ visible: { length: 3 }, markers: [{ role: "ENTRY" }] });
    expect(replayFrame(bars, m, 9).markers.map(x => x.role)).toEqual(["ENTRY", "EXIT"]);
    const w = replayWindow(ep);
    expect(barsInWindow(bars, w)).toHaveLength(10);
  });

  it("MFE / MAE / capture from the bars while held, per contract", () => {
    const t0 = Date.parse("2026-10-01T13:30:00Z") / 1000;
    const bars = [
      { time: t0, open: 0.18, high: 0.20, low: 0.17, close: 0.19, volume: 1 },
      { time: t0 + 60, open: 0.19, high: 0.26, low: 0.15, close: 0.22, volume: 1 },
      { time: t0 + 120, open: 0.22, high: 0.23, low: 0.20, close: 0.21, volume: 1 },
      { time: t0 + 600, open: 0.5, high: 0.9, low: 0.5, close: 0.9, volume: 1 },   // after the exit: never counted
    ];
    const x = excursions(bars, { openedAt: new Date(t0 * 1000 + 10_000).toISOString(), closedAt: new Date((t0 + 150) * 1000).toISOString(), avgEntry: 0.18, avgExit: 0.21, direction: "LONG", multiplier: 100 })!;
    expect(x).toMatchObject({ mfe: 8, mae: -3, realised: 3, capture: 0.37, barsHeld: 3 });
  });
});
