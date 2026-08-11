import { describe, expect, it, vi } from "vitest";
import {
  parseRetryAfterMs,
  ProviderHttpError,
  ProviderRequestGovernor,
} from "./providerRequestGovernor";

describe("ProviderRequestGovernor", () => {
  it("coalesces concurrent requests sharing one semantic key", async () => {
    let resolve!: (value: { price: number }) => void;
    const fetcher = vi.fn(() => new Promise<{ price: number }>(done => { resolve = done; }));
    const governor = new ProviderRequestGovernor(() => 1_000, () => 0);

    const a = governor.execute({ key: "quote:BTC", ttlMs: 5_000, maxStaleMs: 60_000, fetcher });
    const b = governor.execute({ key: "quote:BTC", ttlMs: 5_000, maxStaleMs: 60_000, fetcher });
    expect(fetcher).toHaveBeenCalledTimes(1);
    resolve({ price: 64_000 });

    expect((await a).cache).toBe("MISS");
    expect((await b).cache).toBe("COALESCED");
  });

  it("uses stale data and opens a circuit on 429", async () => {
    let now = 1_000;
    const governor = new ProviderRequestGovernor(() => now, () => 0);
    await governor.execute({
      key: "quote:TSLA",
      ttlMs: 1_000,
      maxStaleMs: 60_000,
      fetcher: async () => ({ price: 330 }),
    });
    now = 3_000;
    const limited = await governor.execute({
      key: "quote:TSLA",
      ttlMs: 1_000,
      maxStaleMs: 60_000,
      fetcher: async () => { throw new ProviderHttpError(429, 8_000); },
    });
    expect(limited).toMatchObject({ health: "STALE_CACHE", cache: "STALE", retryAfterMs: 8_000 });

    const shouldNotRun = vi.fn(async () => ({ price: 331 }));
    const duringCircuit = await governor.execute({
      key: "quote:TSLA",
      ttlMs: 1_000,
      maxStaleMs: 60_000,
      fetcher: shouldNotRun,
    });
    expect(duringCircuit.cache).toBe("STALE");
    expect(shouldNotRun).not.toHaveBeenCalled();
  });

  it("parses both Retry-After formats", () => {
    expect(parseRetryAfterMs("3", 1_000)).toBe(3_000);
    expect(parseRetryAfterMs("Thu, 01 Jan 1970 00:00:05 GMT", 1_000)).toBe(4_000);
    expect(parseRetryAfterMs("bad", 1_000)).toBeNull();
  });
});
