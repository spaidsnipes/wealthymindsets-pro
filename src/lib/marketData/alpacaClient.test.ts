import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAlpacaCandles, fetchAlpacaTrades } from "./alpacaClient";
import { clearClientRequestCoalescerForTests } from "./clientRequestCoalescer";
import { clearOperationalGapReporterForTests } from "./operationalGapReporter";

describe("Alpaca channel gap reporting", () => {
  afterEach(() => {
    clearClientRequestCoalescerForTests();
    clearOperationalGapReporterForTests();
    vi.unstubAllGlobals();
  });

  it.each([
    ["candles", () => fetchAlpacaCandles("TSLA", "5m", 300, "test"), "bar"],
    ["trades", () => fetchAlpacaTrades("TSLA", 1_000, "test"), "trade"],
  ])("persists a %s RATE_LIMIT gap with the correct affected channel", async (_label, request, channel) => {
    const bodies: any[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/market-memory/gaps") {
        bodies.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "rate limited", retryAfterMs: 5_000 }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("window", {});
    vi.stubGlobal("fetch", fetchMock);

    await expect(request()).rejects.toMatchObject({ status: 429 });
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({
      action: "OPEN",
      assetClass: "equity",
      channel,
      reasonCode: "RATE_LIMIT",
    });
  });
});
