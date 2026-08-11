import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearClientRequestCoalescerForTests,
  fetchJsonCoalesced,
} from "./clientRequestCoalescer";

describe("fetchJsonCoalesced", () => {
  afterEach(() => {
    clearClientRequestCoalescerForTests();
    vi.unstubAllGlobals();
  });

  it("serves concurrent identical browser requests from one fetch", async () => {
    let resolve!: (value: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>(done => { resolve = done; }));
    vi.stubGlobal("fetch", fetchMock);

    const a = fetchJsonCoalesced<{ price: number }>("/api/alpaca?sym=TSLA&type=quote");
    const b = fetchJsonCoalesced<{ price: number }>("/api/alpaca?sym=TSLA&type=quote");
    const c = fetchJsonCoalesced<{ price: number }>("/api/alpaca?sym=TSLA&type=quote");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolve(new Response(JSON.stringify({ price: 330 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    await expect(Promise.all([a, b, c])).resolves.toEqual([
      { price: 330 }, { price: 330 }, { price: 330 },
    ]);
  });

  it("coalesces attributed URLs that share one market-data identity", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ price: 330 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const a = fetchJsonCoalesced(
      "/api/alpaca?sym=TSLA&type=quote&consumer=chart",
      1_000,
      "alpaca:quote:TSLA",
    );
    const b = fetchJsonCoalesced(
      "/api/alpaca?sym=TSLA&type=quote&consumer=watchlist",
      1_000,
      "alpaca:quote:TSLA",
    );
    await Promise.all([a, b]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
