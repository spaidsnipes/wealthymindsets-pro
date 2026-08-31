import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  readMoomooTicks: vi.fn(),
}));

vi.mock("@/lib/requireAuth", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/marketData/adapters/moomooTicksClient", () => ({ readMoomooTicks: mocks.readMoomooTicks }));

import { GET } from "./route";

describe("GET /api/market-data/moomoo/ticks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ ok: true });
    mocks.readMoomooTicks.mockResolvedValue({
      status: { label: "RECEIVING", detail: "2 executed prints normalized from moomoo ticker", receiving: true, eventCount: 2 },
      events: [{ eventType: "TRADE", normalizedSymbol: "TSLA" }],
    });
  });

  it("requires a WM session before probing the bridge", async () => {
    mocks.requireAuth.mockResolvedValue({ ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) });
    const response = await GET(new NextRequest("http://localhost/api/market-data/moomoo/ticks?symbol=TSLA"));
    expect(response.status).toBe(401);
    expect(mocks.readMoomooTicks).not.toHaveBeenCalled();
  });

  it("addresses a bare US symbol to the US market (US.<symbol>) and stays no-store", async () => {
    const response = await GET(new NextRequest("http://localhost/api/market-data/moomoo/ticks?symbol=tsla"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ source: "moomoo", label: "RECEIVING", symbol: "TSLA", providerCode: "US.TSLA", eventCount: 2 });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.readMoomooTicks).toHaveBeenCalledWith(
      fetch,
      expect.any(Object),
      expect.objectContaining({ providerCode: "US.TSLA", appSymbol: "TSLA" }),
    );
  });

  it("passes an explicit provider code through and derives the app symbol from it", async () => {
    await GET(new NextRequest("http://localhost/api/market-data/moomoo/ticks?symbol=HK.00700"));
    expect(mocks.readMoomooTicks).toHaveBeenCalledWith(
      fetch,
      expect.any(Object),
      expect.objectContaining({ providerCode: "HK.00700", appSymbol: "00700" }),
    );
  });

  it("surfaces the honest blocker label verbatim, never upgrading it", async () => {
    mocks.readMoomooTicks.mockResolvedValue({
      status: { label: "BRIDGE UNREACHABLE", detail: "OpenD not reachable on 127.0.0.1:11111", receiving: false, eventCount: 0 },
      events: [],
    });
    const response = await GET(new NextRequest("http://localhost/api/market-data/moomoo/ticks?symbol=TSLA"));
    const body = await response.json();
    expect(body.label).toBe("BRIDGE UNREACHABLE");
    expect(body.label).not.toContain("ENTITLEMENT");
    expect(body.eventCount).toBe(0);
    expect(body.events).toEqual([]);
  });

  it("rejects malformed symbols without calling the bridge", async () => {
    const response = await GET(new NextRequest("http://localhost/api/market-data/moomoo/ticks?symbol=TSLA%26account%3D1"));
    expect(response.status).toBe(400);
    expect(mocks.readMoomooTicks).not.toHaveBeenCalled();
  });
});
