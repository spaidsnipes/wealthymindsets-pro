import { describe, it, expect } from "vitest";
import {
  DEFAULT_CANDLE_PERIOD_SECONDS,
  DXLINK_CONTROL_CHANNEL,
  DXLINK_FEED_CHANNEL,
  TRADE_FIELDS,
  aggregateCandles,
  buildAuthFrame,
  buildChannelRequestFrame,
  buildFeedSetupFrame,
  buildKeepaliveFrame,
  buildSetupFrame,
  buildSubscriptionFrame,
  candleOpenTimeMs,
  coverageFidelity,
  dxlinkSymbolId,
  type AggregateWindow,
  type ObservedTrade,
} from "./dxlinkProtocol";

describe("DXLink frames — transcribed, not invented", () => {
  it("SETUP and KEEPALIVE ride the control channel; feed traffic does not", () => {
    expect(buildSetupFrame().channel).toBe(DXLINK_CONTROL_CHANNEL);
    expect(buildKeepaliveFrame().channel).toBe(DXLINK_CONTROL_CHANNEL);
    expect(buildChannelRequestFrame().channel).toBe(DXLINK_FEED_CHANNEL);
    expect(buildFeedSetupFrame().channel).toBe(DXLINK_FEED_CHANNEL);
  });

  it("FEED_SETUP field order IS the COMPACT decoder contract", () => {
    // COMPACT delivers events as positional arrays in exactly this order. If
    // this frame and the decoder ever disagree, every price silently becomes a
    // volume. One owner, asserted here.
    const fields = (buildFeedSetupFrame().acceptEventFields as Record<string, string[]>).Trade;
    expect(fields).toEqual([...TRADE_FIELDS]);
    expect(fields[0]).toBe("eventType");
    expect(fields[2]).toBe("price");
  });

  it("AUTH carries the passed token and nothing else is stored", () => {
    const f = buildAuthFrame("quote-token-abc");
    expect(f.token).toBe("quote-token-abc");
    // A second call with a different token must not echo the first.
    expect(buildAuthFrame("other").token).toBe("other");
  });

  it("subscription de-duplicates symbols and asks Trade + Quote for each", () => {
    const f = buildSubscriptionFrame(["AAPL", " AAPL ", "TSLA", ""]);
    const add = f.add as Array<{ type: string; symbol: string }>;
    expect(add.map((a) => `${a.type}:${a.symbol}`)).toEqual([
      "Trade:AAPL", "Quote:AAPL", "Trade:TSLA", "Quote:TSLA",
    ]);
  });

  it("subscribes to NO Candle event — the syntax for one was never verified", () => {
    // Guards the deliberate absence documented in the module header. A guessed
    // Candle subscription that returns nothing looks exactly like an
    // entitlement denial, and that confusion already cost this project months.
    const json = JSON.stringify([buildFeedSetupFrame(), buildSubscriptionFrame(["AAPL"])]);
    expect(json).not.toContain("Candle");
    expect(json).not.toContain("{=");
  });
});

describe("15-second bars — canonical, with their coverage attached", () => {
  const t = (atMs: number, price: number, size = 1, symbol = "AAPL"): ObservedTrade =>
    ({ symbol, atMs, price, size });

  // A real 15s boundary, derived rather than eyeballed. The first draft of
  // this file picked round-LOOKING epoch numbers that were not on a 15s
  // boundary at all, and three tests failed against correct code. Windows are
  // multiples of 15000ms from the epoch, not from anywhere convenient.
  const W = candleOpenTimeMs(1_700_000_000_000, 15); // window start
  const NEXT = W + 15_000;

  /** First window, when the test only cares about one. */
  const one = (trades: readonly ObservedTrade[], window: AggregateWindow) => {
    const result = aggregateCandles(trades, window);
    expect(result.refusals).toEqual([]);
    return result.windows[0];
  };

  it("floors trades into fixed 15s windows", () => {
    expect(DEFAULT_CANDLE_PERIOD_SECONDS).toBe(15);
    expect(candleOpenTimeMs(W, 15)).toBe(W);
    expect(candleOpenTimeMs(W + 14_999, 15)).toBe(W);
    expect(candleOpenTimeMs(NEXT, 15)).toBe(NEXT);
  });

  it("declares NO bar shape of its own — it mints CanonicalBar", () => {
    // The M8 census holds at four private pasts and may only shrink. A fifth
    // would cost nothing to write and would quietly extend a migration that is
    // still in flight, which is what canonicalBarAdoption.sentinel.test.ts
    // exists to prevent. Asserted here too, so the reason is readable from the
    // module that had to obey it.
    const { bar } = one([t(W + 1_000, 10)], { observingSinceMs: 0 });
    expect(bar.barId).toBe(`TASTYTRADE:AAPL|15s|${W}|e0`);
    expect(bar.symbolId).toBe("TASTYTRADE:AAPL");
    expect(bar.timeframe).toBe("15s");
    expect(bar.source).toBe("tastytrade");
  });

  it("venue-prefixes the symbol so two ingresses cannot mint one id", () => {
    // mintBarId keys on symbolId|timeframe|asOf|epoch. A bare "AAPL" here
    // would collide with a bare "AAPL" from any other feed, and admitBar would
    // then discard a real bar as a redelivery of an unrelated one.
    expect(dxlinkSymbolId("AAPL")).toBe("TASTYTRADE:AAPL");
    expect(dxlinkSymbolId("  AAPL  ")).toBe("TASTYTRADE:AAPL");
    // Blank must stay FALSY. "TASTYTRADE:" is truthy and would smuggle an
    // empty instrument past the check written to catch it.
    expect(dxlinkSymbolId("   ")).toBe("");
  });

  it("calls the bar DERIVED, not LIVE_STREAM", () => {
    // The trades arrived live. The BAR is something WM Pro assembled out of
    // them — no venue ever printed this 15-second candle.
    const { bar } = one([t(W + 1_000, 10)], { observingSinceMs: 0 });
    expect(bar.provenance).toBe("DERIVED");
  });

  it("says it does not know the session, rather than guessing one", () => {
    // TRADE_FIELDS carries no session, so this ingress cannot place a print
    // inside or outside RTH. SESSION_CONTINUOUS would be the crypto answer and
    // is plainly false for US equities.
    const { bar } = one([t(W + 1_000, 10)], { observingSinceMs: 0 });
    expect(bar.sessionId).toBe("SESSION_UNKNOWN");
    // Which also means admitBar would refuse an EXECUTABLE claim on it. This
    // module never makes one.
    expect(bar.fidelity).not.toBe("EXECUTABLE");
  });

  it("computes OHLC from trade ORDER, not from arrival order", () => {
    // Out-of-order arrival is normal on a stream. Open/close must follow the
    // clock, or the first bar of every reconnect is wrong.
    const { bar, trades } = one(
      [t(W + 9_000, 12), t(W + 1_000, 10), t(W + 4_000, 15)],
      { observingSinceMs: 0 },
    );
    expect(bar.open).toBe(10);
    expect(bar.close).toBe(12);
    expect(bar.high).toBe(15);
    expect(bar.low).toBe(10);
    expect(trades).toBe(3);
  });

  it("sums the size it OBSERVED into volume, and marks the bar accordingly", () => {
    const full = one([t(W + 1_000, 10, 5), t(W + 2_000, 11, 7)], {
      observingSinceMs: W,
      observingUntilMs: NEXT,
    });
    expect(full.bar.volume).toBe(12);
    // On a FULL window "volume" is an honest name. On a PARTIAL one it is
    // short of the venue's figure BY CONSTRUCTION, and the bar says so in the
    // two places a renderer actually reads.
    const partial = one([t(W + 9_000, 10, 5)], { observingSinceMs: W + 7_000 });
    expect(partial.bar.volume).toBe(5);
    expect(partial.coverage).toBe("PARTIAL");
    expect(partial.bar.fidelity).toBe("DEGRADED");
  });

  it("marks a window PARTIAL when the stream joined mid-window", () => {
    // Cloudflare evicts an outbound-WebSocket Durable Object after ~15 min, so
    // reconnect seams are a certainty on this host. A seam that printed as an
    // ordinary candle would be a lie with a timestamp on it.
    expect(one([t(W + 9_000, 10)], { observingSinceMs: W + 7_000 }).coverage).toBe("PARTIAL");
  });

  it("marks a window PARTIAL when the stream dropped mid-window", () => {
    const w = one([t(W + 6_000, 10)], { observingSinceMs: 0, observingUntilMs: W + 12_000 });
    expect(w.coverage).toBe("PARTIAL");
  });

  it("marks FULL only when observation covered the whole window", () => {
    // Guards the guard: an aggregator that stamped PARTIAL on everything would
    // pass both tests above while telling a trader nothing.
    const w = one([t(W + 6_000, 10)], { observingSinceMs: W, observingUntilMs: NEXT });
    expect(w.coverage).toBe("FULL");
    expect(w.bar.fidelity).toBe("INDICATIVE");
  });

  it("maps coverage onto DEGRADED, not onto the fidelity spelled PARTIAL", () => {
    // MARKET_FIDELITIES.PARTIAL means "bar exists; some ATTACHMENTS missing",
    // which is a different wound. Same word, different claim — asserted so the
    // collision cannot be resolved by whoever reads it next in a hurry.
    expect(coverageFidelity("PARTIAL")).toBe("DEGRADED");
    expect(coverageFidelity("PARTIAL")).not.toBe("PARTIAL");
    expect(coverageFidelity("FULL")).toBe("INDICATIVE");
  });

  it("emits NO bar for a window with no trades", () => {
    // A quiet window and a disconnected window are different facts. A
    // zero-volume bar for both would erase the difference — and only one of
    // them is about the market.
    const { windows } = aggregateCandles(
      [t(W + 1_000, 10), t(W + 40_000, 11)],
      { observingSinceMs: 0 },
    );
    // Two bars, two windows apart. The window between them is SILENT — it
    // produced no bar at all, rather than a zero-volume one.
    expect(windows.length).toBe(2);
    expect(windows[1].bar.asOf - windows[0].bar.asOf).toBe(30_000);
  });

  it("keeps symbols in separate bars", () => {
    const { windows } = aggregateCandles(
      [t(W + 1_000, 10, 1, "AAPL"), t(W + 2_000, 400, 1, "TSLA")],
      { observingSinceMs: 0 },
    );
    expect(windows.length).toBe(2);
    expect(new Set(windows.map((w) => w.bar.symbolId)))
      .toEqual(new Set(["TASTYTRADE:AAPL", "TASTYTRADE:TSLA"]));
  });

  it("drops junk ticks instead of poisoning a bar with NaN", () => {
    const w = one(
      [{ symbol: "AAPL", atMs: W + 1_000, price: NaN, size: 1 }, t(W + 2_000, 10)],
      { observingSinceMs: 0 },
    );
    expect(w.trades).toBe(1);
    expect(Number.isFinite(w.bar.open)).toBe(true);
  });

  it("REFUSES a nameless window instead of minting an anonymous bar", () => {
    // Kept, not swallowed. A dropped bar reads as a quiet market, and a quiet
    // market is a claim about the venue that a refusal never makes.
    const { windows, refusals } = aggregateCandles(
      [{ symbol: "   ", atMs: W + 1_000, price: 10, size: 1 }],
      { observingSinceMs: 0 },
    );
    expect(windows).toEqual([]);
    expect(refusals.length).toBe(1);
    expect(refusals[0].reason).toMatch(/no symbol/i);
  });

  it("refuses a nonsense period rather than dividing by zero", () => {
    expect(() => aggregateCandles([], { observingSinceMs: 0 }, 0)).toThrow(/positive/i);
  });

  it("returns bars in chronological order", () => {
    const { windows } = aggregateCandles(
      [t(W + 40_000, 11), t(W + 1_000, 10)],
      { observingSinceMs: 0 },
    );
    expect(windows[0].bar.asOf).toBeLessThan(windows[1].bar.asOf);
  });

  it("does not let arrival time become an ordering authority", () => {
    // receivedAt is a different clock and never the tiebreaker. Handing it a
    // wildly divergent value must change nothing about the bars.
    const early = aggregateCandles([t(W + 1_000, 10)], { observingSinceMs: 0, receivedAt: 1 });
    const late = aggregateCandles([t(W + 1_000, 10)], { observingSinceMs: 0, receivedAt: 9e12 });
    expect(early.windows[0].bar.barId).toBe(late.windows[0].bar.barId);
    expect(early.windows[0].bar.asOf).toBe(late.windows[0].bar.asOf);
  });
});
