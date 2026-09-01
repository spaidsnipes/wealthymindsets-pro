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
