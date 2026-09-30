import { afterEach, expect, it, vi } from "vitest";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });
it("an empty Polygon answer still discovers an unfamiliar Yahoo future", async () => {
  vi.stubEnv("POLYGON_KEY", "test-key");
  const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({results:[]})).mockResolvedValueOnce(Response.json({quotes:[{symbol:"ZT=F",shortname:"2-Year Treasury Note Futures",quoteType:"FUTURE",exchange:"CBT"}]}));
  vi.stubGlobal("fetch", fetchMock);
  const { GET } = await import("./route");
  const result = await (await GET(new Request("https://wm.test/api/symbol-search?q=2-year"))).json();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(result.vendor).toBe("yahoo");
  expect(result.results).toContainEqual({sym:"ZT1!",label:"2-Year Treasury Note Futures",cat:"Futures",exchange:"CBT"});
});

it.each([
  ["NQ1!", "NQ1!", "Futures"], ["ES1!", "ES1!", "Futures"],
  ["GC1!", "GC1!", "Futures"], ["CL1!", "CL1!", "Futures"],
  ["Micro Nasdaq", "MNQ1!", "Futures"],
  ["SPX", "SPX", "Index"], ["NDX", "NDX", "Index"],
  ["BTCUSD", "BTCUSD", "Crypto"], ["Bitcoin", "BTCUSD", "Crypto"],
  ["ETHUSD", "ETHUSD", "Crypto"],
  ["US Dollar Mexican Peso", "USDMXN", "Forex"],
  ["Australian Dollar Canadian Dollar", "AUDCAD", "Forex"],
])("API %s preserves canonical %s despite unrelated vendor hits", async (query, sym, cat) => {
  vi.stubEnv("POLYGON_KEY", ""); vi.stubEnv("NEXT_PUBLIC_POLYGON_KEY", "");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({quotes:[{symbol:"UNRELATED",shortname:"Unrelated listing",quoteType:"EQUITY",exchange:"NYQ"}]})));
  const { GET } = await import("./route");
  const res = await GET(new Request(`https://wm.test/api/symbol-search?q=${encodeURIComponent(query)}`));
  const json = await res.json();
  expect(res.status).toBe(200);
  expect(json.results[0]).toMatchObject({sym, cat});
  expect(json.results.some((r: {sym:string}) => r.sym === "UNRELATED")).toBe(true);
});
it("both discovery vendors failing preserves named canonical identity without claiming live search works", async () => {
  vi.stubEnv("POLYGON_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
  const { GET } = await import("./route");
  const res = await GET(new Request("https://wm.test/api/symbol-search?q=BTCUSD"));
  const json = await res.json();
  expect(res.status).toBe(503);
  expect(json.edge).toBe("UNAVAILABLE");
  expect(json.results[0]).toMatchObject({sym:"BTCUSD",cat:"Crypto"});
  expect(json.discoveryScope).toContain("No feed availability is implied");
});
