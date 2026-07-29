import { describe, expect, it, vi } from "vitest";
import { parseYahooCandlePayload, YahooCandleConsumer } from "./yahooCandleConsumer";

const candle = { time: 1_700_000_000, open: 10, high: 12, low: 9, close: 11, volume: 100 };
const typedReady = {
  ok: true, status: "ready", requestedTf: "5m", returnedTf: "5m",
  sourceMode: "native", provider: "yahoo", assetClass: "equity",
  entitlement: "public", registryVersion: "2026-07-28.1", candles: [candle],
};
const typedFailure = (status: "unavailable" | "error", retryable: boolean) => ({
  ok: false, status, requestedTf: "5m", provider: "yahoo", assetClass: "equity",
  entitlement: "public", reasonCode: status === "error" ? "PROVIDER_ERROR" : "UNSUPPORTED_INTERVAL",
  retryable, message: "  Safe   message  ",
});

describe("parseYahooCandlePayload", () => {
  it("accepts validated legacy and typed ready payloads only in their explicit modes", () => {
    expect(parseYahooCandlePayload({ candles: [candle], tf: "5m" }, "5m", "legacy-compatible").status).toBe("ready");
    expect(parseYahooCandlePayload(typedReady, "5m", "legacy-compatible").status).toBe("ready");
    expect(parseYahooCandlePayload({ candles: [candle] }, "5m", "typed-required", { requireVersionHeader: false }).status).toBe("malformed");
    expect(parseYahooCandlePayload(typedReady, "5m", "typed-required", { requireVersionHeader: false }).status).toBe("ready");
  });

  it("distinguishes empty ready, unavailable, retryable errors, and malformed data", () => {
    expect(parseYahooCandlePayload({ ...typedReady, candles: [] }, "5m", "typed-required", { requireVersionHeader: false })).toMatchObject({ status: "ready", empty: true });
    expect(parseYahooCandlePayload(typedFailure("unavailable", false), "5m", "typed-required", { requireVersionHeader: false })).toMatchObject({ status: "unavailable", retryable: false, message: "Safe message" });
    expect(parseYahooCandlePayload({ ...typedFailure("error", true), retryAfterMs: 250 }, "5m", "typed-required", { requireVersionHeader: false })).toMatchObject({ status: "error", retryable: true, retryAfterMs: 250 });
    expect(parseYahooCandlePayload({ ...typedReady, returnedTf: "15m" }, "5m", "typed-required", { requireVersionHeader: false }).status).toBe("malformed");
    expect(parseYahooCandlePayload({ ...typedReady, candles: [{ ...candle, high: 8 }] }, "5m", "typed-required", { requireVersionHeader: false }).status).toBe("malformed");
    expect(parseYahooCandlePayload({ ok: true, status: "ready", candles: [candle] }, "5m", "typed-required", { requireVersionHeader: false }).status).toBe("malformed");
  });
});

describe("YahooCandleConsumer", () => {
  it("latches typed mode from capabilities before the first candle request", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ candleEnvelopeVersion: 1 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(typedReady), { headers: { "X-WM-Candle-Envelope-Version": "1" } }));
    const consumer = new YahooCandleConsumer({ fetcher });
    expect((await consumer.request({ symbol: "AAPL", timeframe: "5m", bars: 20 })).status).toBe("ready");
    expect(consumer.getMode()).toBe("typed-required");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("never downgrades after a typed response header disappears", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(typedReady), { headers: { "X-WM-Candle-Envelope-Version": "1" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candles: [candle] })));
    const consumer = new YahooCandleConsumer({ fetcher });
    expect((await consumer.request({ symbol: "AAPL", timeframe: "5m", bars: 20, automaticRetry: false })).status).toBe("ready");
    expect((await consumer.request({ symbol: "AAPL", timeframe: "5m", bars: 20, automaticRetry: false })).status).toBe("malformed");
    expect(consumer.getMode()).toBe("typed-required");
  });

  it.each([
    [422, "unavailable", false],
    [501, "unavailable", false],
    [503, "unavailable", false],
    [429, "error", true],
    [502, "error", true],
  ] as const)("preserves the typed outcome for HTTP %i", async (_http: number, status: "unavailable" | "error", retryable: boolean) => {
    const payload = typedFailure(status, retryable);
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ candleEnvelopeVersion: 1 })))
      .mockResolvedValue(new Response(JSON.stringify(payload), { status: _http, headers: { "X-WM-Candle-Envelope-Version": "1" } }));
    const result = await new YahooCandleConsumer({ fetcher }).request({ symbol: "AAPL", timeframe: "5m", bars: 20, automaticRetry: false });
    expect(result).toMatchObject({ status, retryable });
  });

  it("bounds an automatic retry to one additional attempt", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockRejectedValueOnce(new Error("upstream"))
      .mockRejectedValueOnce(new Error("upstream"));
    const result = await new YahooCandleConsumer({ fetcher }).request({ symbol: "AAPL", timeframe: "5m", bars: 20 });
    expect(result).toMatchObject({ status: "error", retryable: true });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("serializes capability initialization and coalesces an identical in-flight request", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ candleEnvelopeVersion: 1 })))
      .mockResolvedValueOnce(new Response(JSON.stringify(typedReady), { headers: { "X-WM-Candle-Envelope-Version": "1" } }));
    const consumer = new YahooCandleConsumer({ fetcher });
    const request = { symbol: "AAPL", timeframe: "5m", bars: 20 };
    const [first, second] = await Promise.all([consumer.request(request), consumer.request(request)]);
    expect(first.status).toBe("ready");
    expect(second.status).toBe("ready");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
