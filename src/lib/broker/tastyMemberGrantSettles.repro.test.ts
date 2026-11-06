/**
 * FRIENDS' TASTYTRADE CONNECT — the 403 right after a successful connect is a
 * WAIT, not "these accounts belong to another user" (shift 1106).
 *
 * Diagnosed from code: the member grant is written to Workers KV by the connect
 * POST and read back by quote-token on the next request; KV is eventually
 * consistent and caches lookups (a miss included) up to 60 s, and the Brokers
 * card reads the same key just before the connect. A 403 then LATCHED the
 * shared stream at NOT_OWNER with no retry until a reload.
 *
 * Reproduced first against 5bdba8d9: after reopenTastyStream following a
 * connect, a first 403 left the stream NOT_OWNER and never opened a socket.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ answers: [] as number[] }));
vi.mock("./tastyQuoteTokenClient", () => ({
  fetchQuoteToken: () => {
    const status = h.answers.shift() ?? 200;
    return Promise.resolve(status === 403
      ? { status, body: { error: "These broker accounts belong to another user." } }
      : { status, body: { state: "OK", token: "member", dxlinkUrl: "wss://dx.test/realtime" } });
  },
  forgetQuoteToken: () => {},
}));

class FakeSocket {
  static all: FakeSocket[] = [];
  readyState = 0;
  onopen: (() => void) | null = null; onclose: (() => void) | null = null;
  onerror: (() => void) | null = null; onmessage: ((e: { data: string }) => void) | null = null;
  constructor(public url: string) { FakeSocket.all.push(this); }
  send() {} close() {}
}

describe("a member's freshly saved grant settles instead of latching NOT_OWNER", () => {
  beforeEach(() => { vi.resetModules(); FakeSocket.all = []; vi.stubGlobal("WebSocket", FakeSocket); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("connect → 403 (grant not visible yet) → retried → socket opens", async () => {
    const m = await import("./tastyQuoteStream");
    h.answers = [200];
    const release = m.subscribeTastyEvents(["/NQZ26:XCME"], () => {});
    await vi.advanceTimersByTimeAsync(0);
    h.answers = [403, 403, 200];
    (m.reopenTastyStream as (o?: { grantJustSaved?: boolean }) => void)({ grantJustSaved: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(m.tastyStreamState()).not.toBe("NOT_OWNER");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(m.tastyStreamState()).not.toBe("NOT_OWNER");
    expect(FakeSocket.all.length).toBe(2); // the first identity's socket + the member's
    release();
  });

  it("outside the settle window a 403 is still the verdict (a guest never retries)", async () => {
    const m = await import("./tastyQuoteStream");
    h.answers = [403];
    const release = m.subscribeTastyEvents(["/NQZ26:XCME"], () => {});
    await vi.advanceTimersByTimeAsync(0);
    expect(m.tastyStreamState()).toBe("NOT_OWNER");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeSocket.all.length).toBe(0);
    release();
  });

  it("the settle window is bounded", async () => {
    const m = await import("./tastyQuoteStream");
    expect(m.memberGrantSettling(1000, 1000 + m.MEMBER_GRANT_SETTLE_MS)).toBe(true);
    expect(m.memberGrantSettling(1000 + m.MEMBER_GRANT_SETTLE_MS, 1000 + m.MEMBER_GRANT_SETTLE_MS)).toBe(false);
    expect(m.MEMBER_GRANT_SETTLE_MS).toBeLessThanOrEqual(90_000);
  });
});
