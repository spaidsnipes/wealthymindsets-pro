import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  fetchWebullTickSnapshot: vi.fn(),
  resolveWebullSessionToken: vi.fn(),
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

vi.mock("@/lib/marketData/webullSessionStore", () => ({
  resolveWebullSessionToken: mocks.resolveWebullSessionToken,
  webullSessionStore: () => ({ read: async () => null, write: async () => {} }),
  webullWorkerEnv: async () => undefined,
}));

import { GET } from "./route";

describe("GET /api/market-data/webull/ticks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ ok: true });
    mocks.resolveWebullSessionToken.mockResolvedValue({
      accessToken: "minted-session-value", awaiting2fa: false, note: "live",
    });
    mocks.fetchWebullTickSnapshot.mockResolvedValue({
      source: "webull",
      state: "OBSERVED",
      fidelity: "SNAPSHOT",
      symbol: "TSLA",
      requestedAt: "2026-08-31T14:30:00Z",
      signingProfile: "legacy-sha1",
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

  /**
   * THIS TEST USED TO PIN THE DEFECT.
   *
   * It asserted that whatever sat in `WEBULL_ACCESS_TOKEN` was forwarded to
   * the signer. That value is a SESSION with an expiry, not a secret, so the
   * assertion was locking in a lane that 401s the moment the pasted string
   * ages out — and a 401 on a market-data route reads to every human as
   * "market data is not subscribed". That misreading has already cost this
   * project three months. The assertion is now INVERTED: the pasted value must
   * be discarded and the minted session sent instead.
   */
  it("signs with the minted session and never the pasted environment value", async () => {
    const previousAccessToken = process.env.WEBULL_ACCESS_TOKEN;
    process.env.WEBULL_ACCESS_TOKEN = "stale-pasted-token";
    const response = await GET(new NextRequest("http://localhost/api/market-data/webull/ticks?symbol=tsla"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ source: "webull", state: "OBSERVED", fidelity: "SNAPSHOT", symbol: "TSLA" });
    expect(body.state).not.toBe("LIVE");
    expect(mocks.fetchWebullTickSnapshot).toHaveBeenCalledWith(fetch, expect.objectContaining({
      accessToken: "minted-session-value",
      canarySymbol: "TSLA",
    }));
    // The negative half is the whole point of the fix.
    expect(mocks.fetchWebullTickSnapshot).not.toHaveBeenCalledWith(fetch, expect.objectContaining({
      accessToken: "stale-pasted-token",
    }));
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    if (previousAccessToken === undefined) delete process.env.WEBULL_ACCESS_TOKEN;
    else process.env.WEBULL_ACCESS_TOKEN = previousAccessToken;
  });

  it("names a 2FA wait as itself instead of signing into a 401", async () => {
    // Signing anyway earns a 401 that reads as an entitlement gap. The honest
    // answer is the one-tap state, with the provider never called.
    mocks.resolveWebullSessionToken.mockResolvedValue({
      accessToken: undefined, awaiting2fa: true, note: "Approve the Webull session in the Webull app.",
    });
    const response = await GET(new NextRequest("http://localhost/api/market-data/webull/ticks?symbol=TSLA"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ source: "webull", state: "BLOCKED_AUTH", fidelity: "NONE", awaiting2fa: true });
    expect(body.ticks).toEqual([]);
    expect(mocks.fetchWebullTickSnapshot).not.toHaveBeenCalled();
  });

  it("rejects malformed symbols without calling Webull", async () => {
    const response = await GET(new NextRequest("http://localhost/api/market-data/webull/ticks?symbol=TSLA%26account%3D1"));
    expect(response.status).toBe(400);
    expect(mocks.fetchWebullTickSnapshot).not.toHaveBeenCalled();
  });

  it("runs exactly one explicit signing profile and rejects unknown profiles", async () => {
    const response = await GET(new NextRequest("http://localhost/api/market-data/webull/ticks?symbol=TSLA&profile=sdk-sha256"));
    expect(response.status).toBe(200);
    expect(mocks.fetchWebullTickSnapshot).toHaveBeenCalledTimes(1);
    expect(mocks.fetchWebullTickSnapshot).toHaveBeenCalledWith(fetch, expect.objectContaining({ signingProfile: "sdk-sha256" }));

    mocks.fetchWebullTickSnapshot.mockClear();
    const invalid = await GET(new NextRequest("http://localhost/api/market-data/webull/ticks?symbol=TSLA&profile=auto"));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ source: "webull", state: "INVALID_PROFILE" });
    expect(mocks.fetchWebullTickSnapshot).not.toHaveBeenCalled();
  });
});
