import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

function request(sym: string) {
  return new Request(`https://wealthymindsetspro.com/api/alpaca?sym=${sym}&type=quote`);
}

describe("GET /api/alpaca auth boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env = {
      ...ORIGINAL_ENV,
      ALPACA_KEY: "configured-but-not-for-public-crypto",
      ALPACA_SECRET: "configured-secret",
    };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(["BTC", "ETH"])(
    "keeps public %s requests unauthenticated even when stock credentials exist",
    async (symbol) => {
      const providerSymbol = `${symbol}/USD`;
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          bars: {
            [providerSymbol]: [
              { o: 100, h: 110, l: 95, c: 105, v: 10 },
              { o: 105, h: 115, l: 100, c: 112, v: 12 },
            ],
          },
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { GET } = await import("./route");
      const response = await GET(request(symbol));

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ sym: symbol, price: 112, source: "alpaca" });
      const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
      expect(headers).toEqual({ Accept: "application/json" });
      expect(headers).not.toHaveProperty("APCA-API-KEY-ID");
      expect(headers).not.toHaveProperty("APCA-API-SECRET-KEY");
    },
  );

  it("retains required auth headers for stock requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        latestTrade: { p: 210, t: new Date().toISOString() },
        minuteBar: { c: 210 },
        dailyBar: { o: 200, h: 215, l: 198, v: 1000 },
        prevDailyBar: { c: 205 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("./route");
    const response = await GET(request("TSLA"));

    expect(response.status).toBe(200);
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers["APCA-API-KEY-ID"]).toBe("configured-but-not-for-public-crypto");
    expect(headers["APCA-API-SECRET-KEY"]).toBe("configured-secret");
  });

  it("reports upstream rejection as a dependency failure without leaking details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    const { GET } = await import("./route");
    const response = await GET(request("BTC"));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Alpaca upstream unavailable",
      upstreamStatus: 401,
    });
  });
});
