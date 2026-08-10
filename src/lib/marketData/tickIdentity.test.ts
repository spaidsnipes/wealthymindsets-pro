import { describe, expect, it } from "vitest";
import { marketTickDedupeKey } from "./tickIdentity";

describe("market tick identity", () => {
  it("prefers canonical event identity over coincident display values", () => {
    const base = { time: 1000, price: 65_000, size: 0.1, side: "buy" };
    expect(marketTickDedupeKey({ ...base, marketEvent: { eventId: "trade-1" } })).not.toBe(
      marketTickDedupeKey({ ...base, marketEvent: { eventId: "trade-2" } }),
    );
  });

  it("deduplicates repeated delivery of the same canonical event", () => {
    const tick = { time: 1000, price: 65_000, size: 0.1, side: "buy", marketEvent: { eventId: "trade-1" } };
    expect(marketTickDedupeKey(tick)).toBe(marketTickDedupeKey({ ...tick }));
  });

  it("retains an explicit legacy fallback for unmigrated adapters", () => {
    expect(marketTickDedupeKey({ time: 1000, price: 100, size: 2, side: "sell" })).toBe(
      "legacy:1000|100|2|sell",
    );
  });
});
