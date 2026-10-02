import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { seedRecentTicks, type Tick } from "./useWebSocket";

const t = (time: number, price = 100, size = 1, side: "buy" | "sell" = "buy"): Tick => ({ time, price, size, side, trade: true });

describe("the order-flow ring is seeded with the exchange's recent prints (2026-10-01)", () => {
  it("history goes behind live prints, newest-first, without repeats", () => {
    const live = [t(500), t(400)];
    const out = seedRecentTicks(live, [t(100), t(300), t(400), t(450), t(200)]);
    expect(out.map(x => x.time)).toEqual([500, 400, 300, 200, 100]);
  });
  it("an empty ring takes the history newest-first, bounded", () => {
    expect(seedRecentTicks([], [t(1), t(3), t(2)], 2).map(x => x.time)).toEqual([3, 2]);
  });
  it("futures seed from tastytrade's TimeAndSale; equities do not", () => {
    const src = readFileSync("src/hooks/useWebSocket.ts", "utf8");
    expect(src).toContain("if (!contract.equity) {\n            void fetchTastyTimeAndSales(contract.streamer, Date.now() - 15 * 60_000)");
    expect(src).toContain("recentTicks: seedRecentTicks(prev.recentTicks, seeded),");
  });
});
