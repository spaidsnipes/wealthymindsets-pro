import { beforeEach, describe, expect, it } from "vitest";
import { clearFvgBarCache, fetchFvgBars, upstreamSaysMissing } from "./fvgBarSource";

const respond = (status: number, body: unknown) => async () =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

describe("an unknown symbol is not a transient fault (night shift 2026-10-07)", () => {
  beforeEach(() => clearFvgBarCache());

  it("the serving shape — 500 wrapping an upstream 404 — reads as 'not a symbol we can chart', no retry advice", async () => {
    const r = await fetchFvgBars({ symbol: "ZZZZQ", timeframe: "5m", bars: 300, nowMs: 1, fetcher: respond(500, { error: "Error: Yahoo HTTP 404" }) });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("may not be a symbol we can chart");
    expect(r.reason).not.toMatch(/try again/i);
    expect(r.reason).not.toMatch(/yahoo|HTTP|404/i);
  });

  it("our own 404 / 400 read the same way", async () => {
    for (const status of [404, 400]) {
      clearFvgBarCache();
      const r = await fetchFvgBars({ symbol: "NOPE", timeframe: "1h", bars: 300, nowMs: 1, fetcher: respond(status, null) });
      expect(r.ok ? "" : r.reason).not.toMatch(/try again/i);
    }
  });

  it("an empty candle list is 'no history at this timeframe', not a retry", async () => {
    const r = await fetchFvgBars({ symbol: "AAPL", timeframe: "1m", bars: 300, nowMs: 1, fetcher: respond(200, { candles: [] }) });
    expect(r.ok ? "" : r.reason).toContain("no history at this timeframe");
    expect(r.ok ? "" : r.reason).not.toMatch(/try again/i);
  });

  it("a genuine 5xx or a network failure keeps the retry sentence", async () => {
    const a = await fetchFvgBars({ symbol: "AAPL", timeframe: "5m", bars: 300, nowMs: 1, fetcher: respond(503, { error: "Error: Yahoo HTTP 503" }) });
    expect(a.ok ? "" : a.reason).toMatch(/try again in a moment/);
    clearFvgBarCache();
    const b = await fetchFvgBars({ symbol: "AAPL", timeframe: "5m", bars: 300, nowMs: 1, fetcher: async () => { throw new TypeError("Failed to fetch"); } });
    expect(b.ok ? "" : b.reason).toMatch(/try again in a moment/);
  });

  it("the classifier itself", () => {
    expect(upstreamSaysMissing(500, { error: "Error: Yahoo HTTP 404" })).toBe(true);
    expect(upstreamSaysMissing(502, { error: "Error: Yahoo HTTP 502" })).toBe(false);
    expect(upstreamSaysMissing(500, null)).toBe(false);
  });
});
