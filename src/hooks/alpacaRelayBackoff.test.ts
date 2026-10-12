/**
 * A relay that is not there is not redialled every 3 s (G19 Mansion 2026-10-11: the default Railway relay
 * answers 404 "Application not found"; every stock chart re-opened a doomed socket every 3 s).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALPACA_RELAY_MAX_BACKOFF_MS, alpacaRelayRetryMs } from "./useWebSocket";

describe("alpaca relay back-off", () => {
  it("3 s → 6 s → 12 s … capped at 5 min for a relay that never opened", () => {
    expect([1, 2, 3, 4].map(alpacaRelayRetryMs)).toEqual([3_000, 6_000, 12_000, 24_000]);
    expect(alpacaRelayRetryMs(50)).toBe(ALPACA_RELAY_MAX_BACKOFF_MS);
    expect(ALPACA_RELAY_MAX_BACKOFF_MS).toBe(300_000);
  });
  it("an open clears the shared count; a relay that opened reconnects at 3 s; the next symbol waits when the relay is known absent", () => {
    const src = readFileSync("src/hooks/useWebSocket.ts", "utf8");
    expect(src).toContain("relayNeverOpened.set(proxyBase, 0);");
    expect(src).toContain("retryTimer = setTimeout(connectSock, opened ? 3000 : alpacaRelayRetryMs(fails));");
    expect(src).toContain("if (knownFails >= 3) retryTimer = setTimeout(connectSock, alpacaRelayRetryMs(knownFails));");
  });
});
