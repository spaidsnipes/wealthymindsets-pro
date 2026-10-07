/**
 * ONE SNAPSHOT, EVERY ASKER (serving /desk, 2026-10-07). Two Desk screens moved
 * onto AAPL 5m at the same instant (one typed, one by its link group) drew
 * DIFFERENT history: the second candle request for the same symbol answered
 * null at once, so that screen fell through to a delayed vendor (regular
 * session, ending at yesterday's close). A switched screen must equal a fresh
 * one: both askers receive the same tastytrade snapshot.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./tastyQuoteTokenClient", () => ({
  fetchQuoteToken: () => Promise.resolve({ status: 200, body: { state: "OK", token: "t", dxlinkUrl: "wss://dx.test/realtime" } }),
  forgetQuoteToken: () => {},
}));

class FakeSocket {
  static OPEN = 1;
  static all: FakeSocket[] = [];
  readyState = 1;
  sent: unknown[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  constructor(public url: string) { FakeSocket.all.push(this); }
  send(m: string) { this.sent.push(JSON.parse(m)); }
  close() {}
}
const tick = () => new Promise(r => setTimeout(r, 0));
const SYM = "AAPL{=5m}";
const row = (t: number, flags: number) => ["Candle", SYM, flags, t, 1, 2, 0.5, 1.5, 100, 40, 60];

describe("tastytrade candle requests are single-flight, not first-come-only", () => {
  beforeEach(() => { vi.resetModules(); FakeSocket.all = []; vi.stubGlobal("WebSocket", FakeSocket); });
  afterEach(() => vi.unstubAllGlobals());

  it("a second concurrent asker joins the same snapshot instead of answering null", async () => {
    const m = await import("./tastyQuoteStream");
    const a = m.requestTastyCandles(SYM, "AAPL", 1_000, 5_000);
    const b = m.requestTastyCandles(SYM, "AAPL", 2_000, 5_000);
    let bEarly: unknown = "pending";
    void b.then(v => { bEarly = v; });
    await tick(); await tick();
    expect(bEarly).toBe("pending"); // it used to be null here — the fall-through
    const sock = FakeSocket.all[0];
    sock.onmessage!({ data: JSON.stringify({ type: "CHANNEL_OPENED", channel: 3 }) });
    // Exactly one Candle subscription for the two askers.
    const adds = sock.sent.filter(f => JSON.stringify(f).includes('"add":[{"type":"Candle"'));
    expect(adds).toHaveLength(1);
    sock.onmessage!({ data: JSON.stringify({ type: "FEED_DATA", channel: 3, data: ["Candle", [...row(1_000, 0), ...row(2_000, 8)]] }) });
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra).not.toBeNull();
    expect(rb).toBe(ra);
    expect(ra!.length).toBe(2);
  });

  it("an asker wanting OLDER history waits, then gets its own snapshot", async () => {
    const m = await import("./tastyQuoteStream");
    const a = m.requestTastyCandles(SYM, "AAPL", 5_000, 5_000);
    const b = m.requestTastyCandles(SYM, "AAPL", 1_000, 5_000);
    await tick(); await tick();
    const sock = FakeSocket.all[0];
    sock.onmessage!({ data: JSON.stringify({ type: "CHANNEL_OPENED", channel: 3 }) });
    sock.onmessage!({ data: JSON.stringify({ type: "FEED_DATA", channel: 3, data: ["Candle", row(5_000, 8)] }) });
    expect((await a)!.length).toBe(1);
    await tick();
    const adds = sock.sent.filter(f => JSON.stringify(f).includes('"add":[{"type":"Candle"'));
    expect(adds).toHaveLength(2);
    expect(JSON.stringify(adds[1])).toContain('"fromTime":1000');
    sock.onmessage!({ data: JSON.stringify({ type: "FEED_DATA", channel: 3, data: ["Candle", [...row(1_000, 0), ...row(5_000, 8)]] }) });
    expect((await b)!.length).toBe(2);
  });

  it("a chart that joins a live futures stream names tastytrade as its quote source", () => {
    const src = readFileSync(resolve(__dirname, "../../hooks/useWebSocket.ts"), "utf8");
    expect(src).toContain('{ ...previous, tapeSource: "tastytrade", source: "tastytrade", connected: true }');
  });
});
