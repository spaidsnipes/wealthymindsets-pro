import { describe, expect, it, vi } from "vitest";
import { classifyYahooCandlePayload, parseYahooCandlePayload, YahooCandleConsumer } from "./yahooCandleConsumer";

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

/* ────────────────────────────────────────────────────────────────────────────
   ROLLBACK-SAFETY CONTRACT — candidate-first scan order
   Forge correction, 2026-07-28. Closes Sentinel return item (b).
──────────────────────────────────────────────────────────────────────────── */
describe("candidate-first classification", () => {
  const legacyBody = { candles: [{ time: 1, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 }] };

  it("identifies shape from the body, never from transport metadata", () => {
    expect(classifyYahooCandlePayload({ ok: true }, "1m")).toBe("typed-ok");
    expect(classifyYahooCandlePayload({ ok: false }, "1m")).toBe("typed-error");
    expect(classifyYahooCandlePayload(legacyBody, "1m")).toBe("legacy");
    expect(classifyYahooCandlePayload({ nonsense: 1 }, "1m")).toBe("unrecognized");
  });

  it("does not mistake a malformed body for a rollback signal", () => {
    // Bad OHLC (high < close) must be unrecognized, not "legacy".
    const bad = { candles: [{ time: 1, open: 1, high: 1, low: 0.5, close: 9, volume: 1 }] };
    expect(classifyYahooCandlePayload(bad, "1m")).toBe("unrecognized");
  });

  it("rejects a legacy body whose tf disagrees with the request", () => {
    expect(classifyYahooCandlePayload({ ...legacyBody, tf: "5m" }, "1m")).toBe("unrecognized");
  });
});

describe("rollback safety", () => {
  const legacyBody = { candles: [{ time: 1, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 }] };

  /**
   * `capabilitiesRolledBack` models a REAL rollback, where the capabilities route
   * reverts alongside /api/yahoo. If capabilities still advertises v1 while the
   * data route serves legacy, that is an inconsistent server, and the consumer
   * deliberately stays strict rather than downgrading — see the test below.
   */
  function consumerWith(
    responses: Array<{ version?: string; body: unknown }>,
    capabilitiesRolledBack = false,
  ) {
    let i = 0;
    const fetcher = async (url: RequestInfo | URL) => {
      if (String(url).includes("capabilities")) {
        if (capabilitiesRolledBack) return new Response("Not Found", { status: 404 });
        return new Response(JSON.stringify({ candleEnvelopeVersion: 1 }), { status: 200 });
      }
      const r = responses[Math.min(i++, responses.length - 1)];
      const headers = r.version ? { "X-WM-Candle-Envelope-Version": r.version } : undefined;
      return new Response(JSON.stringify(r.body), { status: 200, headers });
    };
    return new YahooCandleConsumer({ fetcher: fetcher as typeof fetch });
  }

  it("still rejects each individual unversioned payload while latched", async () => {
    // Codex's "never downgrades" invariant: no single legacy body is ever honoured
    // as data while latched, even though the mode may later recover.
    const c = consumerWith([{ body: legacyBody }]);
    c.requireTyped();
    const out = await c.request({ symbol: "AAPL", timeframe: "1m", bars: 5, automaticRetry: false });
    expect(out.status).toBe("malformed");
  });

  it("stays strict when capabilities still advertises v1 — an inconsistent server is not a rollback", async () => {
    const c = consumerWith([{ body: legacyBody }, { body: legacyBody }, { body: legacyBody }]);
    c.requireTyped();
    for (const s of ["A", "B", "C"]) {
      await c.request({ symbol: s, timeframe: "1m", bars: 5, automaticRetry: false });
    }
    // Re-discovery re-latches from the still-live capabilities route.
    expect(c.getMode()).toBe("typed-required");
  });

  it("unlatches the MODE after consecutive confirmations, so the next request recovers", async () => {
    const c = consumerWith(
      [{ body: legacyBody }, { body: legacyBody }, { body: legacyBody }],
      true, // genuine rollback: capabilities route reverted too
    );
    c.requireTyped();
    expect(c.getMode()).toBe("typed-required");

    // 1st sighting — rejected, counted, still latched.
    expect((await c.request({ symbol: "A", timeframe: "1m", bars: 5, automaticRetry: false })).status).toBe("malformed");
    expect(c.getRollbackCandidateCount()).toBe(1);
    expect(c.getMode()).toBe("typed-required");

    // 2nd sighting — still rejected, but the rollback is now confirmed.
    expect((await c.request({ symbol: "B", timeframe: "1m", bars: 5, automaticRetry: false })).status).toBe("malformed");
    expect(c.getMode()).toBe("legacy-compatible");

    // 3rd request recovers — this is what the permanent latch made impossible.
    expect((await c.request({ symbol: "C", timeframe: "1m", bars: 5, automaticRetry: false })).status).toBe("ready");
  });

  it("a versioned response resets the rollback counter", async () => {
    const c = consumerWith([
      { body: legacyBody },
      { version: "1", body: { ok: true, status: "ready", requestedTf: "1m", returnedTf: "1m",
        sourceMode: "native", provider: "yahoo", assetClass: "equity", entitlement: "free",
        registryVersion: "1", candles: [] } },
      { body: legacyBody },
    ]);
    c.requireTyped();
    await c.request({ symbol: "A", timeframe: "1m", bars: 5, automaticRetry: false });
    expect(c.getRollbackCandidateCount()).toBe(1);
    await c.request({ symbol: "B", timeframe: "1m", bars: 5, automaticRetry: false });
    expect(c.getRollbackCandidateCount()).toBe(0); // reset by the typed response
    await c.request({ symbol: "C", timeframe: "1m", bars: 5, automaticRetry: false });
    expect(c.getMode()).toBe("typed-required"); // still latched — not 2 consecutive
  });

  it("does not unlatch on malformed bodies — only on valid legacy envelopes", async () => {
    const c = consumerWith([{ body: { garbage: true } }, { body: { garbage: true } }]);
    c.requireTyped();
    await c.request({ symbol: "A", timeframe: "1m", bars: 5, automaticRetry: false });
    await c.request({ symbol: "B", timeframe: "1m", bars: 5, automaticRetry: false });
    expect(c.getMode()).toBe("typed-required");
  });
});
