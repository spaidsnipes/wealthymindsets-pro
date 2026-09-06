import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Monday Test 2: a rejected Finnhub token must surface as the ACTUAL edge
 * (401 AUTH BLOCKED) with the provider's real status preserved — never a
 * generic HTTP 500, never "delayed by entitlement".
 */

const realFetch = globalThis.fetch;

function loadRoute() {
  vi.resetModules();
  return import("./route");
}

beforeEach(() => {
  vi.stubEnv("FINNHUB_KEY", "test-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe("GET /api/finnhub — honest upstream failure classification", () => {
  it("maps an upstream 401 to AUTH BLOCKED and preserves the 401 status", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "invalid api key" }), { status: 401 }),
    ) as unknown as typeof fetch;

    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/api/finnhub?sym=TSLA&type=quote"));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.edge).toBe("AUTH BLOCKED");
    expect(body.source).toBe("finnhub");
    expect(String(body.error).toUpperCase()).not.toContain("ENTITLEMENT");
    expect(String(body.error).toUpperCase()).not.toContain("DELAYED");
  });

  it("maps an upstream 429 to RATE LIMITED and preserves the 429 status", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "limit" }), { status: 429 }),
    ) as unknown as typeof fetch;

    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/api/finnhub?sym=MSFT&type=quote"));
    const body = await res.json();
    expect(res.status).toBe(429);
    expect(body.edge).toBe("RATE LIMITED");
  });

  /**
   * The symbol the route ACTUALLY asked the provider for. `toFinnhubSym` is
   * unit-tested in src/lib/finnhubSymbol.test.ts; what is proven here is the
   * thing that unit test cannot reach — that the resolved symbol is what goes
   * on the wire, and that it comes back to the caller.
   */
  it("THE WIRE PROOF: a coin whose ticker is a live equity is never fetched as one", async () => {
    // "SUI" is both a coin the Crypto picker offers and Sun Communities Inc
    // (NYSE). The old route asked Finnhub for the REIT and returned its
    // real-time price under the coin's name.
    let requested: string | null = null;
    globalThis.fetch = (async (input: string) => {
      requested = new URL(String(input)).searchParams.get("symbol");
      return new Response(JSON.stringify({ c: 3.41, pc: 3.30, o: 3.32, h: 3.5, l: 3.2, t: 1757000000 }), { status: 200 });
    }) as unknown as typeof fetch;

    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/api/finnhub?sym=SUI&type=quote"));
    const body = await res.json();

    expect(requested, "the equity SUI was requested from Finnhub").toBe("BINANCE:SUIUSDT");
    expect(body.providerSymbol).toBe("BINANCE:SUIUSDT");
    expect(body.sym).toBe("SUI");
  });

  it("THE DISCLOSURE: a USD request reports the USDT pair it was answered from", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ c: 79800, pc: 79000, o: 79100, h: 80000, l: 78900, t: 1757000000 }), { status: 200 }),
    ) as unknown as typeof fetch;

    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/api/finnhub?sym=BTCUSD&type=quote"));
    const body = await res.json();
    // The caller asked for USD and got a USDT market. Small, but real, and the
    // response says so rather than letting the substitution pass unnamed.
    expect(body.providerSymbol).toBe("BINANCE:BTCUSDT");
    expect(body.sym).toBe("BTCUSD");
  });

  it("an ordinary equity is still fetched by its own ticker", async () => {
    // Negative control: the crypto branch must not have widened to swallow
    // equities. Without this, the wire proof above passes for the wrong reason.
    let requested: string | null = null;
    globalThis.fetch = (async (input: string) => {
      requested = new URL(String(input)).searchParams.get("symbol");
      return new Response(JSON.stringify({ c: 320.01, pc: 318, o: 319, h: 321, l: 317, t: 1757000000 }), { status: 200 });
    }) as unknown as typeof fetch;

    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/api/finnhub?sym=AAPL&type=quote"));
    const body = await res.json();
    expect(requested).toBe("AAPL");
    expect(body.providerSymbol).toBe("AAPL");
  });

  it("a venue-pinned coin is refused without calling the provider at all", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;

    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/api/finnhub?sym=BTC.COINBASE&type=quote"));
    expect(res.status).toBe(404);
    expect(spy, "Finnhub was called for a venue this lane cannot honour").not.toHaveBeenCalled();
    expect(String((await res.json()).error)).toContain("Yahoo");
  });

  it("reports a missing key in production as NOT CONFIGURED @ 503, not a generic 500", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FINNHUB_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_FINNHUB_KEY", "");
    // fetch must never be reached — the pre-flight config guard fires first.
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;

    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/api/finnhub?sym=TSLA&type=quote"));
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.edge).toBe("NOT CONFIGURED");
    expect(spy).not.toHaveBeenCalled();
    expect(String(body.error).toUpperCase()).not.toContain("ENTITLEMENT");
  });
});
