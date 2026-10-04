import { afterEach, describe, expect, it, vi } from "vitest";

describe("quote token — one request, shared", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  it("concurrent callers share one request and a usable answer is remembered", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ state: "OK", token: "t", dxlinkUrl: "wss://x" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchQuoteToken, forgetQuoteToken } = await import("./tastyQuoteTokenClient");
    const [a, b, c] = await Promise.all([fetchQuoteToken(), fetchQuoteToken(), fetchQuoteToken()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect([a.body?.token, b.body?.token, c.body?.token]).toEqual(["t", "t", "t"]);
    await fetchQuoteToken();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    forgetQuoteToken();
    await fetchQuoteToken();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("a refusal is not remembered", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: "owner only" }), { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchQuoteToken } = await import("./tastyQuoteTokenClient");
    expect((await fetchQuoteToken()).status).toBe(403);
    await fetchQuoteToken();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
