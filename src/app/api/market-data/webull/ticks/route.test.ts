import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  fetchWebullTickSnapshot: vi.fn(),
}));

vi.mock("@/lib/requireAuth", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/marketData/adapters/webullMarketData", () => ({
  fetchWebullTickSnapshot: mocks.fetchWebullTickSnapshot,
  webullDataConfigFromEnv: (env: Record<string, string | undefined>) => ({
    appKey: env.WEBULL_APP_KEY || env.WEBULL_API_KEY,
    appSecret: env.WEBULL_APP_SECRET || env.WEBULL_API_SECRET,
    accessToken: env.WEBULL_ACCESS_TOKEN,
    apiHost: env.WEBULL_API_HOST,
  }),
}));

import { GET } from "./route";

describe("GET /api/market-data/webull/ticks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ ok: true });
    mocks.fetchWebullTickSnapshot.mockResolvedValue({
      source: "webull",
      state: "OBSERVED",
      fidelity: "SNAPSHOT",
      symbol: "TSLA",
      requestedAt: "2026-08-31T14:30:00Z",
      ticks: [{ symbol: "TSLA", price: 351.12, volume: 10, observedAtMs: 1788186600000, side: "UNKNOWN" }],
      note: "Bounded on-demand stock prints.",
    });
  });

  it("requires a WM session before probing the provider", async () => {
    mocks.requireAuth.mockResolvedValue({ ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) });
    const response = await GET(new NextRequest("http://localhost/api/market-data/webull/ticks?symbol=TSLA"));
    expect(response.status).toBe(401);
    expect(mocks.fetchWebullTickSnapshot).not.toHaveBeenCalled();
  });

  it("returns a bounded snapshot without upgrading it to live", async () => {
    const previousAccessToken = process.env.WEBULL_ACCESS_TOKEN;
    process.env.WEBULL_ACCESS_TOKEN = "test-access-token";
    const response = await GET(new NextRequest("http://localhost/api/market-data/webull/ticks?symbol=tsla"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ source: "webull", state: "OBSERVED", fidelity: "SNAPSHOT", symbol: "TSLA" });
    expect(body.state).not.toBe("LIVE");
    expect(mocks.fetchWebullTickSnapshot).toHaveBeenCalledWith(fetch, expect.objectContaining({
      accessToken: "test-access-token",
      canarySymbol: "TSLA",
    }));
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    if (previousAccessToken === undefined) delete process.env.WEBULL_ACCESS_TOKEN;
    else process.env.WEBULL_ACCESS_TOKEN = previousAccessToken;
  });

  it("rejects malformed symbols without calling Webull", async () => {
    const response = await GET(new NextRequest("http://localhost/api/market-data/webull/ticks?symbol=TSLA%26account%3D1"));
    expect(response.status).toBe(400);
    expect(mocks.fetchWebullTickSnapshot).not.toHaveBeenCalled();
  });
});
