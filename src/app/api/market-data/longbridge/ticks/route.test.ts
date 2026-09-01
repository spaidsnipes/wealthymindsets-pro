import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  readLongbridgeTicks: vi.fn(),
}));

vi.mock("@/lib/requireAuth", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/marketData/adapters/longbridgeTicks", () => ({ readLongbridgeTicks: mocks.readLongbridgeTicks }));

import { GET } from "./route";

describe("GET /api/market-data/longbridge/ticks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ ok: true });
    mocks.readLongbridgeTicks.mockResolvedValue({
      status: { label: "RECEIVING", detail: "2 executed prints normalized", receiving: true, eventCount: 2 },
      events: [{ eventType: "TRADE", normalizedSymbol: "TSLA" }],
    });
  });

  it("requires a WM session before probing the bridge", async () => {
    mocks.requireAuth.mockResolvedValue({ ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) });
    const response = await GET(new NextRequest("http://localhost/api/market-data/longbridge/ticks?symbol=TSLA"));
    expect(response.status).toBe(401);
    expect(mocks.readLongbridgeTicks).not.toHaveBeenCalled();
  });

  it("maps a bare US symbol to the official Longbridge code and stays no-store", async () => {
    const response = await GET(new NextRequest("http://localhost/api/market-data/longbridge/ticks?symbol=tsla"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ source: "longbridge", label: "RECEIVING", symbol: "TSLA", providerCode: "TSLA.US", eventCount: 2 });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.readLongbridgeTicks).toHaveBeenCalledWith(
      fetch,
      expect.any(Object),
      expect.objectContaining({ providerCode: "TSLA.US", appSymbol: "TSLA" }),
    );
  });

  it("preserves an explicit provider code and blocker label", async () => {
    mocks.readLongbridgeTicks.mockResolvedValue({
      status: { label: "AUTH BLOCKED", detail: "bridge rejected the credential", receiving: false, eventCount: 0 },
      events: [],
    });
    const response = await GET(new NextRequest("http://localhost/api/market-data/longbridge/ticks?symbol=700.HK"));
    const body = await response.json();
    expect(body).toMatchObject({ label: "AUTH BLOCKED", symbol: "700", providerCode: "700.HK", eventCount: 0 });
    expect(body.label).not.toContain("ENTITLEMENT");
  });

  it("rejects malformed symbols without calling the bridge", async () => {
    const response = await GET(new NextRequest("http://localhost/api/market-data/longbridge/ticks?symbol=TSLA%26account%3D1"));
    expect(response.status).toBe(400);
    expect(mocks.readLongbridgeTicks).not.toHaveBeenCalled();
  });
});
