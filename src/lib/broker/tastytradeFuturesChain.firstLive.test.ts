import { describe, expect, it } from "vitest";
import { firstLiveExpiration } from "./tastytradeFuturesChain";

describe("a chain opens on an expiry that still trades (2026-10-01)", () => {
  const now = Date.parse("2026-10-02T04:50:00Z");
  it("skips an expiry that stopped trading", () => {
    const ex = [{ e: "a", stopsTradingAt: "2026-10-01T20:00:00Z" }, { e: "b", stopsTradingAt: "2026-10-02T20:00:00Z" }];
    expect(firstLiveExpiration(ex, now)?.e).toBe("b");
  });
  it("unknown counts as trading; all expired falls back to the first", () => {
    expect(firstLiveExpiration([{ e: "a", stopsTradingAt: null }], now)?.e).toBe("a");
    expect(firstLiveExpiration([{ e: "a", stopsTradingAt: "2026-10-01T20:00:00Z" }], now)?.e).toBe("a");
    expect(firstLiveExpiration([], now)).toBeNull();
  });
});
