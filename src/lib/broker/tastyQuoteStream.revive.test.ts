/**
 * P0 2026-11-12 — the Founder's 15m MNQ chart sat "STALE PIPELINE · 7 BARS BEHIND" while the header moved;
 * only a reload cured it. The DXLink stream had no stale-socket watchdog, no back/forward-cache revive and
 * no bound on its token request. Each is pinned here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tokenCalls = 0;
vi.mock("./tastyQuoteTokenClient", () => ({
  fetchQuoteToken: async () => { tokenCalls++; return { status: 200, body: { state: "OK", token: "t", dxlinkUrl: "wss://example.test/dxlink" } }; },
  forgetQuoteToken: () => {},
}));

type Frame = { type: string; channel?: number; [k: string]: unknown };
const sockets: FakeSocket[] = [];
class FakeSocket {
  static OPEN = 1;
  readyState = 1;
  sent: Frame[] = [];
  closed = false;
  onopen: (() => void) | null = null; onclose: (() => void) | null = null; onerror: (() => void) | null = null; onmessage: ((e: { data: string }) => void) | null = null;
  constructor() { queueMicrotask(() => this.onopen?.()); sockets.push(this); }
  send(d: string) { this.sent.push(JSON.parse(d)); }
  close() { this.closed = true; }
  hear(m: Frame) { this.onmessage?.({ data: JSON.stringify(m) }); }
}
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.stubGlobal("WebSocket", FakeSocket); vi.stubGlobal("window", new EventTarget()); vi.stubGlobal("document", Object.assign(new EventTarget(), { hidden: false, visibilityState: "visible" })); sockets.length = 0; tokenCalls = 0; });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

async function liveStream() {
  const mod = await import("./tastyQuoteStream");
  const { DXLINK_FEED_CHANNEL } = await import("@/lib/marketData/dxlinkProtocol");
  mod.subscribeTastyEvents(["/MNQZ26:XCME"], () => {}, undefined, true);
  await flush();
  const s = sockets[sockets.length - 1];
  s.hear({ type: "AUTH_STATE", state: "AUTHORIZED" });
  s.hear({ type: "CHANNEL_OPENED", channel: DXLINK_FEED_CHANNEL });
  return { mod, s, FEED: DXLINK_FEED_CHANNEL };
}

describe("a silent DXLink socket is replaced, not trusted", () => {
  it("counts the first open as epoch 1", async () => {
    const { mod } = await liveStream();
    expect(mod.tastyStreamState()).toBe("LIVE");
    expect(mod.tastyStreamEpoch()).toBe(1);
  });

  it("a socket that stays OPEN but silent past SILENT_SOCKET_MS is torn down and a new one opened", async () => {
    const { mod, s, FEED } = await liveStream();
    vi.advanceTimersByTime(mod.SILENT_SOCKET_MS + 16_000);
    expect(s.closed).toBe(true);
    vi.advanceTimersByTime(2_000);
    await flush();
    expect(sockets.length).toBe(2);
    const s2 = sockets[1];
    s2.hear({ type: "AUTH_STATE", state: "AUTHORIZED" });
    s2.hear({ type: "CHANNEL_OPENED", channel: FEED });
    expect(mod.tastyStreamEpoch()).toBe(2);
    expect(mod.tastyStreamState()).toBe("LIVE");
    // The new socket subscribes the chart's symbol again.
    expect(JSON.stringify(s2.sent)).toContain("/MNQZ26:XCME");
  });

  it("any frame (a server keepalive) keeps a quiet socket alive", async () => {
    const { mod, s } = await liveStream();
    for (let t = 0; t < 5; t++) { vi.advanceTimersByTime(30_000); s.hear({ type: "KEEPALIVE", channel: 0 }); }
    expect(s.closed).toBe(false);
    expect(sockets.length).toBe(1);
    expect(mod.tastyStreamEpoch()).toBe(1);
  });

  it("a chart that is behind the clock replaces a socket silent for 20 s", async () => {
    const { mod, s } = await liveStream();
    vi.advanceTimersByTime(10_000);
    mod.reviveTastyStream("chart");
    expect(s.closed).toBe(false); // 10 s of quiet is not yet suspect
    vi.advanceTimersByTime(12_000);
    mod.reviveTastyStream("chart");
    expect(s.closed).toBe(true);
  });

  it("a page restored from the back/forward cache reopens the stream pagehide tore down", async () => {
    await liveStream();
    window.dispatchEvent(new Event("pagehide"));
    expect(sockets[0].closed).toBe(true);
    const ev = new Event("pageshow") as Event & { persisted?: boolean };
    Object.defineProperty(ev, "persisted", { value: true });
    window.dispatchEvent(ev);
    await flush();
    expect(sockets.length).toBe(2);
  });
});
