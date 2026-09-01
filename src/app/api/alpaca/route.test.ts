import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * These tests pin two Monday Test 2 guarantees for the Alpaca data route:
 *  1. Crypto is a KEYLESS endpoint — equity credentials must NOT be attached,
 *     so an invalid/expired equity key cannot 401 a request that would have
 *     succeeded unauthenticated.
 *  2. An upstream failure is classified into the ACTUAL edge (401 → AUTH
 *     BLOCKED) with the provider's real status preserved — never a generic 500,
 *     never "delayed by entitlement".
 */

const realFetch = globalThis.fetch;

function loadRoute() {
  vi.resetModules();
  return import("./route");
}

beforeEach(() => {
  // Fake PRESENCE of equity creds so we can prove crypto still omits them.
  vi.stubEnv("ALPACA_KEY", "present-but-should-not-be-sent-to-crypto");
  vi.stubEnv("ALPACA_SECRET", "present-but-should-not-be-sent-to-crypto");
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe("GET /api/alpaca — crypto is keyless", () => {
  it("does NOT attach equity credentials on a crypto request", async () => {
    let sentHeaders: Record<string, string> = {};
    globalThis.fetch = vi.fn(async (_url: string, init: any) => {
      sentHeaders = (init?.headers ?? {}) as Record<string, string>;
      return new Response(
        JSON.stringify({ bars: { "BTC/USD": [{ t: "2026-09-01T00:00:00Z", o: 1, h: 2, l: 1, c: 2, v: 3 }] } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/api/alpaca?sym=BTC&type=candles&tf=1m"));
    expect(res.status).toBe(200);
    // The keyless endpoint must never receive the equity secret.
    expect(sentHeaders["APCA-API-KEY-ID"]).toBeUndefined();
    expect(sentHeaders["APCA-API-SECRET-KEY"]).toBeUndefined();
  });
});

describe("GET /api/alpaca — honest upstream failure classification", () => {
  it("uses the complete legacy Cloudflare pair for a read-only stock request", async () => {
    vi.stubEnv("ALPACA_KEY", "");
    vi.stubEnv("ALPACA_SECRET", "");
    vi.stubEnv("ALPACA_BROKERAGE_KEY", "legacy-key");
    vi.stubEnv("ALPACA_BROKERAGE_KEY_SECRET_", "legacy-secret");
    let sentHeaders: Record<string, string> = {};
    globalThis.fetch = vi.fn(async (_url: string, init: any) => {
      sentHeaders = (init?.headers ?? {}) as Record<string, string>;
      return new Response(JSON.stringify({
        latestTrade: { p: 351.25, s: 1, t: new Date().toISOString() },
        dailyBar: { o: 350, h: 352, l: 349, v: 1000 },
        prevDailyBar: { c: 349.5 },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/api/alpaca?sym=TSLA&type=quote"));
    expect(res.status).toBe(200);
    expect(sentHeaders["APCA-API-KEY-ID"]).toBe("legacy-key");
    expect(sentHeaders["APCA-API-SECRET-KEY"]).toBe("legacy-secret");
  });

  it("maps an upstream 401 to AUTH BLOCKED and preserves the 401 status", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ message: "forbidden" }), { status: 401 }),
    ) as unknown as typeof fetch;

    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/api/alpaca?sym=TSLA&type=quote"));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.edge).toBe("AUTH BLOCKED");
    expect(String(body.error).toUpperCase()).not.toContain("ENTITLEMENT");
    expect(String(body.error).toUpperCase()).not.toContain("DELAYED");
  });

  it("maps an upstream 429 to RATE LIMITED and preserves the 429 status", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ message: "too many requests" }), { status: 429 }),
    ) as unknown as typeof fetch;

    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/api/alpaca?sym=MSFT&type=quote"));
    const body = await res.json();
    expect(res.status).toBe(429);
    expect(body.edge).toBe("RATE LIMITED");
  });
});
