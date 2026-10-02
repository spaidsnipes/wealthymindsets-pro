import { describe, expect, it } from "vitest";
import { readCoinbaseStats } from "./cryptoMarketInfo";

describe("crypto Market Info reads the venue's own day (2026-10-02)", () => {
  it("Coinbase stats (shape captured live) and DVOL", () => {
    const rows = readCoinbaseStats({ open: "84075.7", high: "86885.28", low: "83107.03", last: "85981.43", volume: "7701.94902941", volume_30day: "178720.79267796" }, "BTC", 41.3);
    const by = Object.fromEntries(rows.map(r => [r.label, r.value]));
    expect(by["24h change"]).toBe("+2.27%");
    expect(by["24h volume"]).toBe("7,702 BTC");
    expect(by["Implied vol (DVOL 30d)"]).toBe("41.3%");
    expect(by["24h range"]).toBe("4.55%");
  });
  it("leaves out what the venue did not send", () => {
    expect(readCoinbaseStats({}, "SOL", null)).toEqual([]);
  });
});
