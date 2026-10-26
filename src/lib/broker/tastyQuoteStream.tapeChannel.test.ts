/**
 * THE PRINT TAPE RIDES ITS OWN, UNAGGREGATED CHANNEL (perf 2026-10-25 night, the Founder's 1m lag).
 * The quote channel's acceptAggregationPeriod 0.25 s batched every futures print into 250 ms clumps.
 * TimeAndSale now subscribes on a second FEED channel set up with aggregation 0; if that channel does
 * not open (or is refused) the prints fall back to the quote channel — on exactly ONE channel always.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./tastyQuoteTokenClient", () => ({
  fetchQuoteToken: async () => ({ status: 200, body: { state: "OK", token: "t", dxlinkUrl: "wss://example.test/dxlink" } }),
  forgetQuoteToken: () => {},
}));

type Frame = { type: string; channel?: number; [k: string]: unknown };
let live: FakeSocket | null = null;
function setLive(s: FakeSocket) { live = s; }
class FakeSocket {
  static OPEN = 1;
  readyState = 1;
  sent: Frame[] = [];
  onopen: (() => void) | null = null; onclose: (() => void) | null = null; onerror: (() => void) | null = null; onmessage: ((e: { data: string }) => void) | null = null;
  constructor() { queueMicrotask(() => this.onopen?.()); setLive(this); }
  send(d: string) { this.sent.push(JSON.parse(d)); }
  close() {}
  hear(m: Frame) { this.onmessage?.({ data: JSON.stringify(m) }); }
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const tapeSubs = (s: FakeSocket) => s.sent.filter(f => f.type === "FEED_SUBSCRIPTION" && JSON.stringify(f).includes("TimeAndSale"));

beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.stubGlobal("WebSocket", FakeSocket); live = null; });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

async function authorized() {
  const mod = await import("./tastyQuoteStream");
  const { DXLINK_FEED_CHANNEL } = await import("@/lib/marketData/dxlinkProtocol");
  const heard: number[] = [];
  const release = mod.subscribeTastyEvents(["/NQZ26:XCME"], e => { if (e.type === "TimeAndSale") heard.push(e.values.price ?? NaN); }, undefined, true);
  await flush();
  const s = live!;
  s.hear({ type: "AUTH_STATE", state: "AUTHORIZED" });
  return { mod, s, heard, release, FEED: DXLINK_FEED_CHANNEL, TAPE: mod.TAPE_CHANNEL };
}

describe("the tastytrade print tape", () => {
  it("asks for a second FEED channel and sets it up with NO aggregation", async () => {
    const { s, FEED, TAPE } = await authorized();
    const requests = s.sent.filter(f => f.type === "CHANNEL_REQUEST").map(f => f.channel);
    expect(requests).toEqual([FEED, TAPE]);
    s.hear({ type: "CHANNEL_OPENED", channel: FEED });
    s.hear({ type: "CHANNEL_OPENED", channel: TAPE });
    const setups = s.sent.filter(f => f.type === "FEED_SETUP");
    expect(setups.find(f => f.channel === TAPE)?.acceptAggregationPeriod).toBe(0);
    expect(setups.find(f => f.channel === FEED)?.acceptAggregationPeriod).toBe(0.25);
  });

  it("subscribes prints on the tape channel only — never on both", async () => {
    const { s, FEED, TAPE } = await authorized();
    s.hear({ type: "CHANNEL_OPENED", channel: FEED });
    s.hear({ type: "CHANNEL_OPENED", channel: TAPE });
    vi.advanceTimersByTime(10_000);
    const subs = tapeSubs(s);
    expect(subs.length).toBeGreaterThan(0);
    expect(subs.every(f => f.channel === TAPE)).toBe(true);
  });

  it("hears a print on the tape channel at once", async () => {
    const { s, FEED, TAPE, heard } = await authorized();
    s.hear({ type: "CHANNEL_OPENED", channel: FEED });
    s.hear({ type: "CHANNEL_OPENED", channel: TAPE });
    // COMPACT: eventType, eventSymbol, time, sequence, price, size, aggressorSide, bidPrice, askPrice, validTick, type, spreadLeg
    s.hear({ type: "FEED_DATA", channel: TAPE, data: ["TimeAndSale", ["TimeAndSale", "/NQZ26:XCME", Date.now(), 1, 25001.25, 2, "BUY", 25001, 25001.25, 1, "NEW", false]] });
    expect(heard).toEqual([25001.25]);
  });

  it("falls back to the quote channel when the tape channel never opens", async () => {
    const { s, FEED, TAPE } = await authorized();
    s.hear({ type: "CHANNEL_OPENED", channel: FEED });
    expect(tapeSubs(s)).toEqual([]);
    vi.advanceTimersByTime(3000);
    const subs = tapeSubs(s);
    expect(subs.length).toBe(1);
    expect(subs[0].channel).toBe(FEED);
    // A late tape channel is not used: the prints stay on one channel.
    s.hear({ type: "CHANNEL_OPENED", channel: TAPE });
    expect(tapeSubs(s).every(f => f.channel === FEED)).toBe(true);
  });

  it("a refused tape channel falls back without tearing the stream down", async () => {
    const { mod, s, FEED, TAPE } = await authorized();
    s.hear({ type: "CHANNEL_OPENED", channel: FEED });
    s.hear({ type: "CHANNEL_OPENED", channel: TAPE });
    s.hear({ type: "ERROR", channel: TAPE, error: "UNSUPPORTED", message: "no" });
    expect(mod.tastyStreamState()).toBe("LIVE");
    const subs = tapeSubs(s);
    expect(subs[subs.length - 1].channel).toBe(FEED);
  });
});
