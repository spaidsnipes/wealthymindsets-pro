/**
 * LOGOUT ISOLATION FOR THE SHARED TASTYTRADE STREAM (MEMBER-BROKER-CONNECT.md).
 * A member's own grant serves that member only. On a shared device, sign-out or
 * an account switch must drop the quote token, close the socket and forget the
 * last values — the next person must not ride the previous member's stream.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  tokens: [] as string[],
  forgets: 0,
}));
vi.mock("./tastyQuoteTokenClient", () => ({
  fetchQuoteToken: () => {
    const token = h.tokens.shift() ?? "none";
    return Promise.resolve({ status: 200, body: { state: "OK", token, dxlinkUrl: "wss://dx.test/realtime" } });
  },
  forgetQuoteToken: () => { h.forgets += 1; },
}));

class FakeSocket {
  static OPEN = 1;
  static all: FakeSocket[] = [];
  readyState = 0;
  closed = false;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  constructor(public url: string) { FakeSocket.all.push(this); }
  send() {}
  close() { this.closed = true; }
}

const tick = () => new Promise(r => setTimeout(r, 0));

describe("tastytrade stream — sign-out and account switch", () => {
  beforeEach(() => {
    vi.resetModules();
    FakeSocket.all = [];
    h.tokens = ["member-A", "member-B"];
    h.forgets = 0;
    vi.stubGlobal("WebSocket", FakeSocket);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("closeTastyStreamForSignOut closes the socket, forgets the token and does NOT reconnect", async () => {
    const m = await import("./tastyQuoteStream");
    const release = m.subscribeTastyEvents(["SPY"], () => {});
    await tick(); await tick();
    expect(FakeSocket.all).toHaveLength(1);
    expect(m.tastyStreamSocketCount()).toBe(1);

    m.closeTastyStreamForSignOut();
    expect(FakeSocket.all[0].closed).toBe(true);
    expect(m.tastyStreamSocketCount()).toBe(0);
    expect(h.forgets).toBeGreaterThanOrEqual(1);
    expect(m.peekTastyQuote("SPY")).toBeNull();
    await tick(); await tick();
    expect(FakeSocket.all).toHaveLength(1); // no new socket for the next person
    release();
  });

  it("reopenTastyStream (account switch) opens a NEW socket under the new account's token", async () => {
    const m = await import("./tastyQuoteStream");
    const release = m.subscribeTastyEvents(["SPY"], () => {});
    await tick(); await tick();
    m.reopenTastyStream();
    await tick(); await tick();
    expect(FakeSocket.all).toHaveLength(2);
    expect(FakeSocket.all[0].closed).toBe(true);
    release();
  });

  it("a connect still waiting on the previous account's token never opens a socket after sign-out", async () => {
    let answer!: (v: unknown) => void;
    vi.doMock("./tastyQuoteTokenClient", () => ({
      fetchQuoteToken: () => new Promise(r => { answer = r; }),
      forgetQuoteToken: () => {},
    }));
    const m = await import("./tastyQuoteStream");
    const release = m.subscribeTastyEvents(["SPY"], () => {});
    await tick();
    m.closeTastyStreamForSignOut();
    answer({ status: 200, body: { state: "OK", token: "member-A", dxlinkUrl: "wss://dx.test/realtime" } });
    await tick(); await tick();
    expect(FakeSocket.all).toHaveLength(0);
    release();
    vi.doUnmock("./tastyQuoteTokenClient");
  });

  it("AuthContext: both sign-out flows close the stream; an identity change drops or re-asks it", () => {
    const src = readFileSync(resolve(__dirname, "../../contexts/AuthContext.tsx"), "utf8");
    expect(src.match(/forgetQuoteToken,\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*closeTastyStreamForSignOut,/g)?.length).toBe(2);
    expect(src).toMatch(/if \(id === null\) closeTastyStreamForSignOut\(\);\s*else reopenTastyStream\(\);/);
    expect(src).toMatch(/\}, \[user\?\.id\]\);/);
  });
});
