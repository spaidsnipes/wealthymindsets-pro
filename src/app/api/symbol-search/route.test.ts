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
