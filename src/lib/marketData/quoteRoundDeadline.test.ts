import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchYahooQuoteBody, yahooQuoteRoundInFlight } from "./yahooQuoteRounds";
import { fetchExchangeQuoteBody, exchangeQuoteRoundInFlight } from "./exchangeQuoteRounds";
import {
  fetchAlpacaQuoteBody,
  fetchFinnhubQuoteBody,
  providerQuoteRoundInFlight,
} from "./providerQuoteRounds";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe.each([
  ["yahoo", () => fetchYahooQuoteBody("DEADLINE"), () => yahooQuoteRoundInFlight("DEADLINE")],
  ["exchange", () => fetchExchangeQuoteBody("kraken", "DEADLINE"), () => exchangeQuoteRoundInFlight("kraken", "DEADLINE")],
  // Every owner in the chain, not just the two that had owners first. An
  // unbounded leg would hold its key while the provider stalls, so each later
  // ask JOINS a request that never answers — one hung response becoming an
  // indefinitely stuck symbol on all three surfaces. Finnhub is the leg known
  // to 429-storm, so it is the last one that should be left unbounded.
  ["alpaca", () => fetchAlpacaQuoteBody("DEADLINE"), () => providerQuoteRoundInFlight("alpaca", "DEADLINE")],
  ["finnhub", () => fetchFinnhubQuoteBody("DEADLINE"), () => providerQuoteRoundInFlight("finnhub", "DEADLINE")],
] as const)("%s shared round recovery", (_name, read, inFlight) => {
  it.each(["headers", "body"])("releases a stalled %s round for every joiner and permits retry", async phase => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const fetcher = vi.fn(async (_url: unknown, init: RequestInit) => {
      signal = init.signal as AbortSignal;
      if (phase === "headers") return await new Promise<Response>(() => {});
      return { ok: true, status: 200, json: () => new Promise(() => {}) } as Response;
    });
    vi.stubGlobal("fetch", fetcher);
    const first = read();
    const second = read();
    const results = Promise.allSettled([first, second]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(inFlight()).toBe(true);
    await vi.advanceTimersByTimeAsync(12_000);
    expect((await results).map(r => r.status)).toEqual(["rejected", "rejected"]);
    expect(signal?.aborted).toBe(true);
    expect(inFlight()).toBe(false);
    fetcher.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ price: 123 }) } as Response);
    expect(await read()).toEqual({ price: 123 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(inFlight()).toBe(false);
  });
});
