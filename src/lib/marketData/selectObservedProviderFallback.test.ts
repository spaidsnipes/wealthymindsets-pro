import { describe, expect, it, vi } from "vitest";
import { selectObservedProviderFallback } from "./selectObservedProviderFallback";

describe("selectObservedProviderFallback", () => {
  it("reaches Webull when Moomoo throws and Longbridge is empty", async () => {
    const event = { id: "webull-event" };
    const result = await selectObservedProviderFallback([
      { source: "moomoo", read: async () => { throw new TypeError("network"); } },
      { source: "longbridge", read: async () => [] },
      { source: "webull", read: async () => [event] },
    ]);
    expect(result).toEqual({ source: "webull", events: [event] });
  });

  it("reaches Webull when Longbridge throws", async () => {
    const result = await selectObservedProviderFallback([
      { source: "moomoo", read: async () => [] },
      { source: "longbridge", read: async () => { throw new SyntaxError("bad json"); } },
      { source: "webull", read: async () => [{ id: "w" }] },
    ]);
    expect(result?.source).toBe("webull");
  });

  it("stops after the first accepted provider", async () => {
    const later = vi.fn(async () => [{ id: "later" }]);
    const result = await selectObservedProviderFallback([
      { source: "moomoo", read: async () => [{ id: "m" }] },
      { source: "longbridge", read: later },
      { source: "webull", read: later },
    ]);
    expect(result?.source).toBe("moomoo");
    expect(later).not.toHaveBeenCalled();
  });

  it("retains the Longbridge source and skips Webull", async () => {
    const webull = vi.fn(async () => [{ id: "w" }]);
    const result = await selectObservedProviderFallback([
      { source: "moomoo", read: async () => [] },
      { source: "longbridge", read: async () => [{ id: "l" }] },
      { source: "webull", read: webull },
    ]);
    expect(result).toEqual({ source: "longbridge", events: [{ id: "l" }] });
    expect(webull).not.toHaveBeenCalled();
  });

  it("propagates cancellation and does not try later providers", async () => {
    const later = vi.fn(async () => [{ id: "later" }]);
    const aborted = Object.assign(new Error("aborted"), { name: "AbortError" });
    await expect(selectObservedProviderFallback([
      { source: "moomoo", read: async () => { throw aborted; } },
      { source: "longbridge", read: later },
      { source: "webull", read: later },
    ])).rejects.toMatchObject({ name: "AbortError" });
    expect(later).not.toHaveBeenCalled();
  });

  it("returns no selection when every provider is empty or unavailable", async () => {
    const result = await selectObservedProviderFallback([
      { source: "moomoo", read: async () => [] },
      { source: "longbridge", read: async () => { throw new Error("offline"); } },
      { source: "webull", read: async () => [] },
    ]);
    expect(result).toBeNull();
  });
});
