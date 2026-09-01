import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  getTastytradeCapabilities: vi.fn(),
}));

vi.mock("@/lib/requireAuth", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/tastytrade", () => ({ getTastytradeCapabilities: mocks.getTastytradeCapabilities }));

import { GET } from "./route";

const request = () => new NextRequest("http://localhost/api/broker/tastytrade/status");

describe("GET /api/broker/tastytrade/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ ok: true });
    mocks.getTastytradeCapabilities.mockResolvedValue({ configured: true, connected: true, quotes: true, realTime: null });
  });

  it("rejects anonymous account and quote-token probes", async () => {
    mocks.requireAuth.mockResolvedValue({ ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) });
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(mocks.getTastytradeCapabilities).not.toHaveBeenCalled();
  });

  it("returns a no-store authenticated capability receipt without inventing real-time", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ connected: true, quotes: true, realTime: null });
  });
});
