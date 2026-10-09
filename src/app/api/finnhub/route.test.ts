import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The route requires a WM session since 2026-10-04 (guest audit); these tests
// exercise the provider logic behind that gate.
vi.mock("@/lib/requireAuth", () => ({ requireAuth: async () => ({ ok: true, user: { sub: "u1", email: "u1@example.test" } }) }));

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

  it("THE CANDLE WIRE: a USDT pair's bars are asked of /crypto/candle, an equity's of /stock/candle", async () => {
    const asked: URL[] = [];
    globalThis.fetch = (async (input: string) => {
      asked.push(new URL(String(input)));
      return new Response(JSON.stringify({ s: "ok", t: [1757000000], o: [1], h: [2], l: [0.5], c: [1.5], v: [10] }), { status: 200 });
    }) as unknown as typeof fetch;

    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/api/finnhub?sym=BTCUSDT&type=candles&tf=1D&bars=10"));
    const body = await res.json();
    expect(asked[0].pathname).toBe("/api/v1/crypto/candle");
    expect(asked[0].searchParams.get("symbol")).toBe("BINANCE:BTCUSDT");
    expect(asked[0].searchParams.get("resolution")).toBe("D");
    expect(body.candles).toHaveLength(1);

    await GET(new Request("http://localhost/api/finnhub?sym=TSLA&type=candles&tf=1h&bars=10"));
    expect(asked[1].pathname).toBe("/api/v1/stock/candle");
    expect(asked[1].searchParams.get("symbol")).toBe("TSLA");
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
    // NEW RULE (Founder ruling 2026-10-09) — NAMES FOR THE OPERATOR ONLY. This test used to stand for the
    // "every surface names the missing variable" contract. The caller here ("u1") is a member, not the
    // operator: the edge and the status are unchanged, a stable code is added, and the variable name is gone.
    expect(body.code).toBe("NOT_CONFIGURED");
    expect(body.missing).toEqual([]);
    expect(String(body.error)).not.toMatch(/FINNHUB_KEY|host runtime|[A-Z]{3,}_[A-Z_]{3,}/);
    expect(body.source).toBe("finnhub");
  });

  it("the OPERATOR still reads the missing variable's name (names for the operator only, 2026-10-09)", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FINNHUB_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_FINNHUB_KEY", "");
    vi.stubEnv("TASTYTRADE_OWNER_USER_ID", "u1");
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/api/finnhub?sym=TSLA&type=quote"));
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.edge).toBe("NOT CONFIGURED");
    expect(body.code).toBe("NOT_CONFIGURED");
    expect(body.missing).toContain("FINNHUB_KEY");
    expect(String(body.error)).toContain("FINNHUB_KEY");
  });
});

describe("GET /api/finnhub?type=news — reachable without a symbol", () => {
  it("asks Finnhub /news for the category and returns its items", async () => {
    const asked: string[] = [];
    globalThis.fetch = (async (input: string) => {
      asked.push(String(input));
      return new Response(JSON.stringify([{ id: 1, headline: "h" }]), { status: 200 });
    }) as unknown as typeof fetch;
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/api/finnhub?type=news&category=crypto"));
    expect(res.status).toBe(200);
    expect((await res.json()).items).toHaveLength(1);
    expect(asked[0]).toContain("/news?category=crypto");
  });

  it("refuses a category Finnhub does not define", async () => {
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/api/finnhub?type=news&category=everything"));
    expect(res.status).toBe(400);
  });
});
