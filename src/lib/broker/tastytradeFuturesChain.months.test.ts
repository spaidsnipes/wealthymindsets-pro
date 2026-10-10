import { describe, expect, it } from "vitest";

import { readFuturesContracts } from "./tastytradeFuturesChain";

describe("listed futures months — tastytrade's own, nearest first, never guessed", () => {
  it("keeps open months with their expiration dates; drops expired, inactive and closing-only", () => {
    const m = readFuturesContracts([
      { symbol: "/MNQH7", "expiration-date": "2027-03-19", "days-to-expiration": 160, "active-month": false },
      { symbol: "/MNQZ6", "expiration-date": "2026-12-18", "days-to-expiration": 69, "active-month": true, "streamer-symbol": "/MNQZ26:XCME" },
      { symbol: "/MNQU6", "expiration-date": "2026-09-18", "days-to-expiration": -22 },
      { symbol: "/MNQM7", "expiration-date": "2027-06-18", "days-to-expiration": 251, "is-closing-only": true },
      { symbol: "/MNQU7", active: false, "days-to-expiration": 342 },
    ]);
    expect(m.map(c => c.symbol)).toEqual(["/MNQZ6", "/MNQH7"]);
    expect(m[0]).toMatchObject({ expiration: "2026-12-18", activeMonth: true, streamer: "/MNQZ26:XCME" });
    expect(m[1]!.expiration).toBe("2027-03-19");
  });
  it("orders by tastytrade's expiration date even when days-to-expiration is absent (serving 2026-10-10)", () => {
    const m = readFuturesContracts([
      { symbol: "/MNQH7", "expiration-date": "2027-03-19" },
      { symbol: "/MNQM7", "expiration-date": "2027-06-17" },
      { symbol: "/MNQZ6", "expiration-date": "2026-12-18", "active-month": true },
    ]);
    expect(m.map(c => c.symbol)).toEqual(["/MNQZ6", "/MNQH7", "/MNQM7"]);
  });
  it("a non-list answer is no months", () => {
    expect(readFuturesContracts(null)).toEqual([]);
    expect(readFuturesContracts({ items: [] })).toEqual([]);
  });
});
