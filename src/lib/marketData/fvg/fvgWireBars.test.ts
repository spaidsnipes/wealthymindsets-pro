import { describe, expect, it } from "vitest";

import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { closedFvgBars, fvgBarCloseMs, rejoinCanonicalBars } from "./fvgWireBars";
import { readFvgBarBody, traderWords } from "./fvgBarSource";

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
    expect(readFvgBarBody({ candles: [] }, { symbol: "SPY", timeframe: "1D", nowMs: now })).toMatchObject({ ok: false, reason: expect.stringMatching(/No 1D bars could be read for SPY/) });
    expect(readFvgBarBody({ candles: [], reason: "Unsupported timeframe: 7m" }, { symbol: "SPY", timeframe: "7m", nowMs: now })).toEqual({ ok: false, reason: "Unsupported timeframe: 7m" });
    expect(readFvgBarBody(null, { symbol: "SPY", timeframe: "1D", nowMs: now }).ok).toBe(false);
    // Serving fabce3a read "Error: Yahoo HTTP 404" — plumbing is never shown; trader words instead.
    const leak = readFvgBarBody({ error: "Error: Yahoo HTTP 404" }, { symbol: "ZZZZQ", timeframe: "5m", nowMs: now });
    expect(leak).toEqual({ ok: false, reason: "No 5m bars could be read for ZZZZQ — it may not be a symbol we can chart, or it has no history at this timeframe." });
    for (const raw of ["TypeError: Failed to fetch", "finnhub 429", "status 502", "Alpaca said no"]) expect(traderWords(raw)).toBeNull();
    expect(traderWords("Unsupported timeframe: 7m")).toBe("Unsupported timeframe: 7m");
    const ok = readFvgBarBody({ candles: [tuple(0), tuple(1)], barIdentities: [ident(0), ident(1)], barProvenance: "REST_BACKFILL", barFidelity: "INDICATIVE" }, { symbol: "SPY", timeframe: "1D", nowMs: now });
    expect(ok).toMatchObject({ ok: true, unpaired: 0, forming: 0, provenance: "REST_BACKFILL", fidelity: "INDICATIVE" });
  });

  it("a 404 / 5xx from the bar route reads in trader words, never the vendor's", async () => {
    const { fetchFvgBars, clearFvgBarCache } = await import("./fvgBarSource");
    clearFvgBarCache();
    const r404 = await fetchFvgBars({ symbol: "ZZZZQ", timeframe: "5m", bars: 10, nowMs: 1, fetcher: async () => new Response(JSON.stringify({ error: "Error: Yahoo HTTP 404" }), { status: 404 }) });
    expect(r404).toEqual({ ok: false, reason: "No 5m bars could be read for ZZZZQ — it may not be a symbol we can chart, or it has no history at this timeframe." });
    clearFvgBarCache();
    const r502 = await fetchFvgBars({ symbol: "SPY", timeframe: "1D", bars: 10, nowMs: 1, fetcher: async () => new Response("{}", { status: 502 }) });
    expect(r502).toEqual({ ok: false, reason: "The market history did not load just now — try again in a moment." });
    clearFvgBarCache();
  });
});
