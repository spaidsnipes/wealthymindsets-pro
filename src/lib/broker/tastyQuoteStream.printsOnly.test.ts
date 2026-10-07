/**
 * A prints-only consumer (no quote subscription) must still open the shared
 * tastytrade socket. Serving EURUSD 5m (2026-10-07 01:15Z): the CME 6E
 * related-flow line stayed CONNECTING and no quote token was ever asked for —
 * connect() returned because no QUOTE subscriber existed.
 */
import { describe, expect, it, vi } from "vitest";

const fetchQuoteToken = vi.fn(async () => ({ status: 403, body: { error: "owner only" } }));
vi.mock("./tastyQuoteTokenClient", () => ({ fetchQuoteToken: () => fetchQuoteToken(), forgetQuoteToken: () => {} }));

describe("prints-only subscribers open the stream", () => {
  it("asks for a token and reports the stream state", async () => {
    const { subscribeTastyEvents } = await import("./tastyQuoteStream");
    const states: string[] = [];
    const release = subscribeTastyEvents(["/6EZ26:XCME"], () => {}, s => states.push(s), true, false);
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));
    expect(fetchQuoteToken).toHaveBeenCalledTimes(1);
    expect(states).toContain("NOT_OWNER");
    release();
  });
});
