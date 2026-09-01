import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  tastytradeConfigStatus: vi.fn(),
  ttGet: vi.fn(),
}));

vi.mock("@/lib/requireAuth", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/tastytrade", () => ({
  tastytradeConfigStatus: mocks.tastytradeConfigStatus,
  ttGet: mocks.ttGet,
}));

import { GET } from "./route";

describe("tastytrade market metrics truth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ ok: true });
    mocks.tastytradeConfigStatus.mockReturnValue({ configured: true });
    mocks.ttGet.mockResolvedValue({ data: { items: [{ symbol: "TSLA" }] } });
  });

  it("labels a successful on-demand response as a snapshot, never live", async () => {
    const response = await GET(new NextRequest("http://localhost/api/broker/tastytrade/market-metrics?symbols=TSLA"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      source: "tastytrade",
      state: "SNAPSHOT",
      note: expect.stringContaining("not a streaming quote"),
      items: [{ symbol: "TSLA" }],
    });
    expect(body.observedAt).toEqual(expect.any(String));
    expect(body.state).not.toBe("LIVE");
  });

  it("caps and normalizes the upstream symbol list", async () => {
    const symbols = Array.from({ length: 30 }, (_, index) => `s${index}`).join(",");
    await GET(new NextRequest(`http://localhost/api/broker/tastytrade/market-metrics?symbols=${symbols}`));

    const path = mocks.ttGet.mock.calls[0]?.[0] as string;
    const forwarded = decodeURIComponent(path.split("symbols=")[1] ?? "").split(",");
    expect(forwarded).toHaveLength(25);
    expect(forwarded[0]).toBe("S0");
    expect(forwarded[24]).toBe("S24");
  });
});
