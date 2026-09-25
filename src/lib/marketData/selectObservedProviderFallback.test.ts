import { describe, expect, it, vi } from "vitest";
import { OBSERVED_LANE_HEDGE_MS, selectObservedProviderFallback } from "./selectObservedProviderFallback";

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

/**
 * GARDEN 11 — "Do not freeze supported paint waiting on Moomoo. Moomoo =
 * reconnecting / NON-BLOCKING."
 *
 * The hedge is driven by an injected clock so every ordering below is exact.
 */
describe("selectObservedProviderFallback — a silent lane does not block (hedgeMs)", () => {
  const never = <T,>() => new Promise<T>(() => {});
  function manualClock() {
    const pending: Array<() => void> = [];
    return {
      delay: () => new Promise<void>((resolve) => { pending.push(resolve); }),
      fire: async () => { pending.shift()?.(); await new Promise((r) => setTimeout(r, 0)); },
      waiting: () => pending.length,
    };
  }

  it("paints Webull while Moomoo and Longbridge are still silent", async () => {
    const clock = manualClock();
    const round = selectObservedProviderFallback([
      { source: "moomoo", read: never },
      { source: "longbridge", read: never },
      { source: "webull", read: async () => [{ id: "w" }] },
    ], { hedgeMs: 1_500, delay: clock.delay });
    await clock.fire(); // Moomoo silent past the hedge → Longbridge starts
    await clock.fire(); // Longbridge silent past the hedge → Webull starts
    expect(await round).toEqual({ source: "webull", events: [{ id: "w" }] });
  });

  it("keeps priority when the primary answers inside the hedge — the fallbacks are never asked", async () => {
    const clock = manualClock();
    const later = vi.fn(async () => [{ id: "later" }]);
    const result = await selectObservedProviderFallback([
      { source: "moomoo", read: async () => [{ id: "m" }] },
      { source: "longbridge", read: later },
      { source: "webull", read: later },
    ], { hedgeMs: 1_500, delay: clock.delay });
    expect(result?.source).toBe("moomoo");
    expect(later).not.toHaveBeenCalled();
  });

  it("an overdue primary that answers with prints before the fallback still wins", async () => {
    const clock = manualClock();
    let answerMoomoo!: (events: readonly { id: string }[]) => void;
    const moomoo = new Promise<readonly { id: string }[]>((resolve) => { answerMoomoo = resolve; });
    const round = selectObservedProviderFallback([
      { source: "moomoo", read: () => moomoo },
      { source: "longbridge", read: never },
      { source: "webull", read: never },
    ], { hedgeMs: 1_500, delay: clock.delay });
    await clock.fire(); // Longbridge started alongside the silent Moomoo
    answerMoomoo([{ id: "m" }]);
    expect(await round).toEqual({ source: "moomoo", events: [{ id: "m" }] });
  });

  it("an empty answer frees the next lane at once, without waiting for the hedge", async () => {
    const clock = manualClock();
    const result = await selectObservedProviderFallback([
      { source: "moomoo", read: async () => [] },
      { source: "longbridge", read: async () => { throw new Error("offline"); } },
      { source: "webull", read: async () => [{ id: "w" }] },
    ], { hedgeMs: 60_000, delay: clock.delay });
    expect(result?.source).toBe("webull");
  });

  it("returns nothing when no lane answers with prints — it never invents one", async () => {
    const clock = manualClock();
    const result = await selectObservedProviderFallback([
      { source: "moomoo", read: async () => [] },
      { source: "webull", read: async () => [] },
    ], { hedgeMs: 1_500, delay: clock.delay });
    expect(result).toBeNull();
  });

  it("SENTINEL: the /charts provider chain walks the lanes WITH the hedge", async () => {
    // Removing the option silently restores the freeze Garden 11 forbids —
    // Webull's prints held behind a silent Moomoo bridge's 5 s timeout.
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const hook = readFileSync(resolve(__dirname, "../../hooks/useWebSocket.ts"), "utf8");
    const start = hook.indexOf("function fetchProviderTickSelection");
    const chain = hook.slice(start, hook.indexOf("\nfunction fetchProviderTicks", start));
    expect(chain).toContain("selectObservedProviderFallback(");
    expect(chain).toContain("{ hedgeMs: OBSERVED_LANE_HEDGE_MS }");
    expect(OBSERVED_LANE_HEDGE_MS).toBeGreaterThan(0);
    expect(OBSERVED_LANE_HEDGE_MS).toBeLessThan(5_000); // must beat the bridge timeouts it exists for
  });

  it("cancellation still ends the whole round", async () => {
    const clock = manualClock();
    const aborted = Object.assign(new Error("aborted"), { name: "AbortError" });
    const later = vi.fn(async () => [{ id: "later" }]);
    await expect(selectObservedProviderFallback([
      { source: "moomoo", read: async () => { throw aborted; } },
      { source: "webull", read: later },
    ], { hedgeMs: 1_500, delay: clock.delay })).rejects.toMatchObject({ name: "AbortError" });
    expect(later).not.toHaveBeenCalled();
  });
});
