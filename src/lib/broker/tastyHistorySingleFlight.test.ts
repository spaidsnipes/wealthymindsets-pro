/**
 * One history read per contract set (2026-10-12): a covered later caller joins the read in flight
 * (one socket, its own window), and a caller's abort stops only its own listening.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./tastyQuoteTokenClient", () => ({ fetchQuoteToken: async () => ({ status: 200, body: { state: "OK", token: "t", dxlinkUrl: "wss://example.test" } }), forgetQuoteToken: () => {} }));

const sockets: FakeSocket[] = [];
class FakeSocket {
  static OPEN = 1;
  readyState = 1;
  onopen: (() => void) | null = null; onerror: (() => void) | null = null; onmessage: ((e: { data: string }) => void) | null = null;
  constructor() { sockets.push(this); }
  send() {}
  close() {}
  /** Deliver two prints (t=1000 and t=5000) and end the snapshot. */
  deliver() {
    const row = (t: number, flags: number) => [/*eventType*/ "TimeAndSale", "/NQZ26:XCME", flags, t, 1, 100, 1, "BUY", 99, 101, "NEW", false];
    const flat = [...row(1000, 0), ...row(5000, 8)];
    this.onmessage?.({ data: JSON.stringify({ type: "FEED_DATA", channel: 3, data: ["TimeAndSale", flat] }) });
  }
}
afterEach(async () => { vi.unstubAllGlobals(); sockets.length = 0; (await import("./tastyHistory")).resetTastyHistoryForTest(); });

describe("fetchTastyTimeAndSales single-flight", () => {
  it("a covered later caller joins the read in flight and keeps only its own window", async () => {
    vi.stubGlobal("WebSocket", FakeSocket);
    const { fetchTastyTimeAndSales } = await import("./tastyHistory");
    const wide = fetchTastyTimeAndSales("/NQZ26:XCME", 0);
    const narrow = fetchTastyTimeAndSales("/NQZ26:XCME", 3000);
    await new Promise(r => setTimeout(r, 0));
    expect(sockets).toHaveLength(1);
    sockets[0].deliver();
    const [w, n] = await Promise.all([wide, narrow]);
    expect(w?.events.map(e => e.values.time)).toEqual([1000, 5000]);
    expect(n?.events.map(e => e.values.time)).toEqual([5000]);
  });
  it("a caller that wants an EARLIER window than the read in flight opens its own", async () => {
    vi.stubGlobal("WebSocket", FakeSocket);
    const { fetchTastyTimeAndSales } = await import("./tastyHistory");
    void fetchTastyTimeAndSales("/NQZ26:XCME", 3000);
    void fetchTastyTimeAndSales("/NQZ26:XCME", 0);
    await new Promise(r => setTimeout(r, 0));
    expect(sockets).toHaveLength(2);
  });
  it("a joiner's abort answers it null and leaves the shared read alive", async () => {
    vi.stubGlobal("WebSocket", FakeSocket);
    const { fetchTastyTimeAndSales } = await import("./tastyHistory");
    const owner = fetchTastyTimeAndSales("/NQZ26:XCME", 0);
    const ctl = new AbortController();
    const joiner = fetchTastyTimeAndSales("/NQZ26:XCME", 0, { signal: ctl.signal });
    ctl.abort();
    expect(await joiner).toBeNull();
    await new Promise(r => setTimeout(r, 0));
    sockets[0].deliver();
    expect((await owner)?.events).toHaveLength(2);
  });
});

describe("a finished read stays joinable briefly", () => {
  it("a covered caller shortly AFTER the read finished reuses it — no second socket", async () => {
    vi.stubGlobal("WebSocket", FakeSocket);
    const { fetchTastyTimeAndSales } = await import("./tastyHistory");
    const first = fetchTastyTimeAndSales("/NQZ26:XCME", 0);
    await new Promise(r => setTimeout(r, 0));
    sockets[0].deliver();
    await first;
    const later = await fetchTastyTimeAndSales("/NQZ26:XCME", 3000);
    expect(sockets).toHaveLength(1);
    expect(later?.events.map(e => e.values.time)).toEqual([5000]);
  });
});
