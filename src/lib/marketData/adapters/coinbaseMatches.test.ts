/** Coinbase `matches` channel — FIXTURE messages (hand-written, shaped like the public feed). */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { normalizeCoinbaseMatch, normalizeCoinbaseTicker } from "./coinbase";

const MATCH = { type: "match", trade_id: 901, sequence: 50, maker_order_id: "m", taker_order_id: "t", time: "2026-10-10T16:00:01.250Z", product_id: "BTC-USD", size: "0.0131", price: "82923.96", side: "sell" };

describe("Coinbase matches → canonical trade event", () => {
  it("every match carries its own size; maker sell → aggressor BUY; same eventId as the ticker for the same trade", () => {
    const ev = normalizeCoinbaseMatch(MATCH, "BTC-USD", 1, 2)!;
    expect(ev).not.toBeNull();
    expect(ev.size).toBe(0.0131);
    expect(ev.price).toBe(82923.96);
    expect(ev.aggressorSide).toBe("BUY");
    expect(ev.eventId).toBe("coinbase:BTC-USD:901");
    const tk = normalizeCoinbaseTicker({ type: "ticker", trade_id: 901, sequence: 50, time: MATCH.time, product_id: "BTC-USD", last_size: "0.0131", price: "82923.96", side: "sell" }, "BTC-USD", 1, 2)!;
    expect(tk.eventId).toBe(ev.eventId);
    expect(ev.normalizationVersion).toBe("coinbase-match.v1");
  });
  it("last_match is a match; anything else is not", () => {
    expect(normalizeCoinbaseMatch({ ...MATCH, type: "last_match" }, "BTC-USD", 1, 2)).not.toBeNull();
    expect(normalizeCoinbaseMatch({ ...MATCH, type: "ticker" }, "BTC-USD", 1, 2)).toBeNull();
    expect(normalizeCoinbaseMatch({ ...MATCH, size: "0" }, "BTC-USD", 1, 2)).toBeNull();
  });
  it("the live socket subscribes to matches; crypto bars are built from prints only", () => {
    const hook = readFileSync("src/hooks/useWebSocket.ts", "utf8");
    expect(hook.length).toBeGreaterThan(10000);
    expect(hook).toContain('channels: ["matches"]');
    expect(hook).toContain("normalizeCoinbaseMatch(m, symbol, receivedAtMs, Date.now()) ?? normalizeCoinbaseTicker(");
    expect(hook).toContain("else if (tradeHeardRef.current || tradeTapeOnlyRef.current) return;");
    expect(hook).toContain("tradeTapeOnlyRef.current = isCrypto;");
  });
});
