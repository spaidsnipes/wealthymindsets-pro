/**
 * ONE CONNECT IN FLIGHT (G19 Mansion, serving 0ce4515, cold NQ1! 5m, 2026-10-11): every subscriber that
 * arrived while the quote token was being fetched opened its own DXLink socket — seven in one millisecond —
 * and the orphans re-sent FEED_SETUP through the live socket mid candle-snapshot, so futures bars waited
 * the 8 s timeout. However many subscribers arrive during the token wait, ONE token is asked and ONE socket opens.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

let release: (v: { status: number; body: unknown }) => void = () => {};
const fetchQuoteToken = vi.fn(() => new Promise<{ status: number; body: unknown }>(r => { release = r; }));
vi.mock("./tastyQuoteTokenClient", () => ({ fetchQuoteToken: () => fetchQuoteToken(), forgetQuoteToken: () => {} }));

const sockets: string[] = [];
class FakeSocket {
  static OPEN = 1;
  readyState = 0;
  onopen: (() => void) | null = null; onclose: (() => void) | null = null; onerror: (() => void) | null = null; onmessage: ((e: unknown) => void) | null = null;
  constructor(url: string) { sockets.push(url); }
  send() {}
  close() {}
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("the shared tastytrade socket", () => {
  it("opens once for every subscriber that arrived during the token wait", async () => {
    vi.stubGlobal("WebSocket", FakeSocket);
    const { subscribeTastyEvents } = await import("./tastyQuoteStream");
    const releases = ["/NQZ26:XCME", "/ESZ26:XCME", "/GCZ26:XCMX", "/CLZ26:XNYM", "SPY", "AAPL", "/6EZ26:XCME"]
      .map(s => subscribeTastyEvents([s], () => {}, () => {}, true, true));
    await Promise.resolve();
    expect(fetchQuoteToken).toHaveBeenCalledTimes(1);
    release({ status: 200, body: { state: "OK", token: "t", dxlinkUrl: "wss://example.test/dxlink" } });
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(sockets).toEqual(["wss://example.test/dxlink"]);
    for (const r of releases) r();
  });
  it("a socket that is no longer the live one is closed on its first word, never forwarded", () => {
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const src = readFileSync("src/lib/broker/tastyQuoteStream.ts", "utf8");
    expect(src).toContain("if (ws || connecting || !wanted()) return;");
    expect(src).toContain("if (ws !== sock) { try { sock.close(); } catch { /* closed */ } return; }");
  });
});
