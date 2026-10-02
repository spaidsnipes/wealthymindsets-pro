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
  it("an equity chain (no instant) uses the date's close", () => {
    const ex = [{ e: "a", expiration: "2026-10-01", stopsTradingAt: null }, { e: "b", expiration: "2026-10-02", stopsTradingAt: null }];
    expect(firstLiveExpiration(ex, now)?.e).toBe("b");
    expect(firstLiveExpiration(ex, Date.parse("2026-10-01T19:00:00Z"))?.e).toBe("a");
  });
});
