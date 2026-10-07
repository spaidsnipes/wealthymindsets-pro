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

  it("a token in flight when the account changes is never remembered for the next person", async () => {
    let answer!: (r: Response) => void;
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>(r => { answer = r; }))
      .mockImplementation(async () => new Response(JSON.stringify({ state: "OK", token: "member-B", dxlinkUrl: "wss://x" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchQuoteToken, forgetQuoteToken } = await import("./tastyQuoteTokenClient");
    const pending = fetchQuoteToken();
    forgetQuoteToken(); // sign-out while member A's token was being asked for
    answer(new Response(JSON.stringify({ state: "OK", token: "member-A", dxlinkUrl: "wss://x" }), { status: 200 }));
    expect((await pending).body?.token).toBe("member-A"); // the caller that asked hears its own answer
    expect((await fetchQuoteToken()).body?.token).toBe("member-B"); // the next one asks again
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
