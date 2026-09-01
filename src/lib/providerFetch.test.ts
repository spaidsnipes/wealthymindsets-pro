import { describe, expect, it, vi } from "vitest";
import { fetchProviderWithTimeout } from "./providerFetch";

describe("fetchProviderWithTimeout", () => {
  it("returns an upstream response before the deadline", async () => {
    const response = new Response("ok", { status: 200 });
    const fetchImpl = vi.fn(async () => response) as unknown as typeof fetch;

    await expect(fetchProviderWithTimeout(fetchImpl, "https://provider.test", {}, { timeoutMs: 250 }))
      .resolves.toBe(response);
  });

  it("aborts a silent upstream without inventing an entitlement result", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    })) as unknown as typeof fetch;

    const pending = expect(
      fetchProviderWithTimeout(fetchImpl, "https://provider.test", {}, { timeoutMs: 250 }),
    ).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(250);

    await pending;
    vi.useRealTimers();
  });

  it("clamps unsafe timeout values", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    })) as unknown as typeof fetch;

    const pending = expect(
      fetchProviderWithTimeout(fetchImpl, "https://provider.test", {}, { timeoutMs: 1 }),
    ).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(249);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    vi.useRealTimers();
  });
});
