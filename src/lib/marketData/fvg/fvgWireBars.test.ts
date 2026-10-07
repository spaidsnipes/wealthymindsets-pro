import { describe, expect, it } from "vitest";

import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { closedFvgBars, fvgBarCloseMs, rejoinCanonicalBars } from "./fvgWireBars";
import { readFvgBarBody } from "./fvgBarSource";

const DAY = 86_400;
const T = 1_790_000_000; // epoch seconds
const tuple = (i: number): LegacyOhlcvTuple => ({ time: T + i * DAY, open: 10, high: 11, low: 9, close: 10.5, volume: 5 });
const ident = (i: number, over: Partial<CanonicalBarIdentity> = {}): CanonicalBarIdentity => ({
  barId: `SPY|1D|${(T + i * DAY) * 1000}|e0`, symbolId: "SPY", sessionId: "SESSION_UNKNOWN", timeframe: "1D",
  asOf: (T + i * DAY) * 1000, receivedAt: 1, fidelity: "INDICATIVE", source: "yahoo", provenance: "REST_BACKFILL", truthEpoch: 0,
  ...over,
});

describe("FVG wire bars — the producer's identity rejoined, never invented", () => {
  it("pairs each candle with exactly one identity; the OHLCV is the candle's, the lineage the identity's", () => {
    const r = rejoinCanonicalBars({ candles: [tuple(0), tuple(1)], identities: [ident(0), ident(1)], symbolId: "SPY", timeframe: "1D" });
    expect(r.unpaired).toBe(0);
    expect(r.bars).toHaveLength(2);
    expect(r.bars[1]).toMatchObject({ barId: ident(1).barId, source: "yahoo", provenance: "REST_BACKFILL", open: 10, close: 10.5, asOf: (T + DAY) * 1000 });
  });

  it("a candle with no identity, a duplicated identity, a foreign symbol or timeframe is refused and COUNTED", () => {
    const r = rejoinCanonicalBars({
      candles: [tuple(0), tuple(1), tuple(2), tuple(3)],
      identities: [ident(0), ident(1), ident(1, { barId: "dupe" }), ident(2, { symbolId: "QQQ" }), ident(3, { timeframe: "1h" })],
      symbolId: "SPY", timeframe: "1D",
    });
    expect(r.bars.map(b => b.barId)).toEqual([ident(0).barId]);
    expect(r.unpaired).toBe(3);
  });

  it("closed = the engine's clock (open + interval) at or before now; the forming bar is dropped", () => {
    const { bars } = rejoinCanonicalBars({ candles: [tuple(0), tuple(1)], identities: [ident(0), ident(1)], symbolId: "SPY", timeframe: "1D" });
    const now = (T + DAY) * 1000 + 3_600_000; // inside bar 1
    const c = closedFvgBars(bars, "1D", now);
    expect(c.closed).toHaveLength(1);
    expect(c.forming).toBe(1);
    expect(fvgBarCloseMs(bars[0], "1D")).toBe((T + DAY) * 1000);
    expect(closedFvgBars(bars, "100T", now)).toEqual({ closed: [], forming: 0, noClock: true });
  });

  it("route body: refuses plainly — no identities, no bars, route error", () => {
    const now = (T + 10 * DAY) * 1000;
    expect(readFvgBarBody({ candles: [tuple(0)] }, { symbol: "SPY", timeframe: "1D", nowMs: now })).toMatchObject({ ok: false, reason: expect.stringMatching(/canonical identity/) });
    expect(readFvgBarBody({ candles: [] }, { symbol: "SPY", timeframe: "1D", nowMs: now })).toMatchObject({ ok: false, reason: expect.stringMatching(/No 1D bars/) });
    expect(readFvgBarBody({ candles: [], reason: "Unsupported timeframe: 7m" }, { symbol: "SPY", timeframe: "7m", nowMs: now })).toEqual({ ok: false, reason: "Unsupported timeframe: 7m" });
    expect(readFvgBarBody(null, { symbol: "SPY", timeframe: "1D", nowMs: now }).ok).toBe(false);
    const ok = readFvgBarBody({ candles: [tuple(0), tuple(1)], barIdentities: [ident(0), ident(1)], barProvenance: "REST_BACKFILL", barFidelity: "INDICATIVE" }, { symbol: "SPY", timeframe: "1D", nowMs: now });
    expect(ok).toMatchObject({ ok: true, unpaired: 0, forming: 0, provenance: "REST_BACKFILL", fidelity: "INDICATIVE" });
  });
});
