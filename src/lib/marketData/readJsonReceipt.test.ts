import { describe, expect, it, vi } from "vitest";
import { readJsonReceipt } from "./readJsonReceipt";

describe("readJsonReceipt", () => {
  it("bounds a stalled JSON body and aborts the late request", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      requestSignal = init?.signal ?? undefined;
      return {
        ok: true,
        status: 200,
        json: () => new Promise<never>(() => undefined),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const pending = readJsonReceipt(fetchImpl, "/receipt", new AbortController().signal, 50);
    const rejected = expect(pending).rejects.toThrow("Receipt timed out");
    await vi.advanceTimersByTimeAsync(50);
    await rejected;
    expect(requestSignal?.aborted).toBe(true);
    vi.useRealTimers();
  });

  it("propagates HTTP status without parsing the body", async () => {
    const json = vi.fn();
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 503, json }) as unknown as Response) as unknown as typeof fetch;
    await expect(readJsonReceipt(fetchImpl, "/receipt", new AbortController().signal)).rejects.toThrow("HTTP 503");
    expect(json).not.toHaveBeenCalled();
  });

  it("returns a completed current receipt", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ state: "current" }) }) as Response) as unknown as typeof fetch;
    await expect(readJsonReceipt<{ state: string }>(fetchImpl, "/receipt", new AbortController().signal)).resolves.toEqual({ state: "current" });
  });
});
