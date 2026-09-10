import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/requireAuth", () => ({ requireAuth: mocks.requireAuth }));

const realFetch = globalThis.fetch;
const request = (suffix = "?symbol=TSLA&spot=365") => new Request(`http://localhost/api/market-data/alpaca/options${suffix}`);

async function loadRoute() {
  vi.resetModules();
  return import("./route");
}

beforeEach(() => {
  mocks.requireAuth.mockResolvedValue({ ok: true, user: { sub: "u1" } });
  vi.stubEnv("ALPACA_KEY", "test-key");
  vi.stubEnv("ALPACA_SECRET", "test-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  globalThis.fetch = realFetch;
});

describe("GET /api/market-data/alpaca/options", () => {
  it("rejects an unauthenticated caller before input or provider access", async () => {
    mocks.requireAuth.mockResolvedValueOnce({ ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { GET } = await loadRoute();
    const response = await GET(request("?symbol=%25%25%25"));
    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses the official indicative chain endpoint and keeps credentials server-side", async () => {
    let sentUrl = "";
    let sentResourceWasString = false;
    let sentHeaders: Record<string, string> = {};
    globalThis.fetch = vi.fn(async (url: string | URL | Request, init: RequestInit) => {
      sentResourceWasString = typeof url === "string";
      sentUrl = String(url);
      sentHeaders = init.headers as Record<string, string>;
      return Response.json({ snapshots: {
        TSLA260918C00365000: {
          latestQuote: { t: "2026-09-09T19:59:59Z", bp: 11.22, ap: 11.58 },
          latestTrade: { t: "2026-09-09T19:59:58Z", p: 11.55, s: 1 },
        },
      }, next_page_token: null });
    }) as unknown as typeof fetch;

    const { GET } = await loadRoute();
    const response = await GET(request());
    const body = await response.json();
    const upstream = new URL(sentUrl);
    expect(response.status).toBe(200);
    expect(upstream.origin + upstream.pathname).toBe("https://data.alpaca.markets/v1beta1/options/snapshots/TSLA");
    expect(sentResourceWasString).toBe(true);
    expect(upstream.searchParams.get("feed")).toBe("indicative");
    expect(upstream.searchParams.get("strike_price_gte")).toBe("310");
    expect(upstream.searchParams.get("strike_price_lte")).toBe("420");
    expect(sentHeaders["APCA-API-KEY-ID"]).toBe("test-key");
    expect(sentHeaders["APCA-API-SECRET-KEY"]).toBe("test-secret");
    expect(body).toMatchObject({ source: "alpaca", fidelity: "INDICATIVE", coverage: "COMPLETE" });
    expect(JSON.stringify(body)).not.toMatch(/test-key|test-secret/);
  });

  it("fails closed when no complete credential pair exists", async () => {
    vi.stubEnv("ALPACA_KEY", "");
    vi.stubEnv("ALPACA_SECRET", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { GET } = await loadRoute();
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect((await response.json()).edge).toBe("NOT CONFIGURED");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([[401, "AUTH BLOCKED"], [403, "REQUEST DENIED"], [429, "RATE LIMITED"], [500, "PROVIDER ERROR"]])(
    "classifies upstream HTTP %i without inventing entitlement",
    async (status, edge) => {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: Number(status) })));
      const { GET } = await loadRoute();
      const response = await GET(request());
      const body = await response.json();
      expect(response.status).toBe(status);
      expect(body.edge).toBe(edge);
      expect(JSON.stringify(body)).not.toMatch(/entitlement|delayed/i);
    },
  );

  it("bounds a stalled provider response", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { GET } = await loadRoute();
    const pending = GET(request());
    await vi.advanceTimersByTimeAsync(12_000);
    const response = await pending;
    expect(response.status).toBe(504);
    expect((await response.json()).edge).toBe("TIMEOUT");
  });

  it("identifies a transport failure without exposing its exception", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("https://provider.invalid?token=private"); }));
    const { GET } = await loadRoute();
    const response = await GET(request());
    const body = await response.json();
    expect(response.status).toBe(502);
    expect(body).toMatchObject({ source: "alpaca", edge: "INVALID RESPONSE", stage: "TRANSPORT" });
    expect(JSON.stringify(body)).not.toMatch(/provider\.invalid|private|token/);
  });

  it("identifies an undecodable success body without reflecting it", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("private malformed body", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));
    const { GET } = await loadRoute();
    const response = await GET(request());
    const body = await response.json();
    expect(body).toMatchObject({ source: "alpaca", edge: "INVALID RESPONSE", stage: "DECODE" });
    expect(JSON.stringify(body)).not.toContain("private malformed body");
  });

  it("identifies a schema failure without reflecting provider fields", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ private_payload: "do-not-reflect" })));
    const { GET } = await loadRoute();
    const response = await GET(request());
    const body = await response.json();
    expect(body).toMatchObject({ source: "alpaca", edge: "INVALID RESPONSE", stage: "NORMALIZE" });
    expect(JSON.stringify(body)).not.toContain("do-not-reflect");
  });

  it("refuses to forward credentials across a provider redirect", async () => {
    let redirectMode: RequestRedirect | undefined;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      redirectMode = init.redirect;
      return new Response(null, { status: 302, headers: { Location: "https://private.invalid" } });
    }));
    const { GET } = await loadRoute();
    const response = await GET(request());
    const body = await response.json();
    expect(redirectMode).toBe("manual");
    expect(response.status).toBe(502);
    expect(body).toMatchObject({ source: "alpaca", edge: "REDIRECT BLOCKED" });
    expect(JSON.stringify(body)).not.toContain("private.invalid");
  });

  it("does not call a non-redirect 304 response a redirect", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 304 })));
    const { GET } = await loadRoute();
    const response = await GET(request());
    const body = await response.json();
    expect(response.status).toBe(502);
    expect(body).toMatchObject({ source: "alpaca", edge: "UNKNOWN" });
    expect(JSON.stringify(body)).not.toMatch(/redirect/i);
  });
});
