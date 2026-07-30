import { describe, it, expect, vi } from "vitest";
import {
  DataVersionGuard,
  applyIfCurrent,
  createChartContext,
  unavailableSlot,
} from "./chartContext";

describe("DataVersionGuard — stale-request protection", () => {
  it("starts at version 1 on the first next() call", () => {
    const guard = new DataVersionGuard();
    const { version } = guard.next();
    expect(version).toBe(1);
    expect(guard.currentVersion).toBe(1);
  });

  it("increments monotonically on every next() call", () => {
    const guard = new DataVersionGuard();
    const a = guard.next();
    const b = guard.next();
    const c = guard.next();
    expect([a.version, b.version, c.version]).toEqual([1, 2, 3]);
  });

  it("a response tagged with a superseded version is no longer current", () => {
    const guard = new DataVersionGuard();
    const { version: v1 } = guard.next(); // e.g. request issued for "1m"
    guard.next(); // user switches to "4h" before the 1m response arrives
    expect(guard.isCurrent(v1)).toBe(false);
  });

  it("a response tagged with the latest version is current", () => {
    const guard = new DataVersionGuard();
    guard.next();
    const { version: latest } = guard.next();
    expect(guard.isCurrent(latest)).toBe(true);
  });

  it("aborts the previous signal when a new version starts", () => {
    const guard = new DataVersionGuard();
    const { signal: first } = guard.next();
    expect(first.aborted).toBe(false);
    guard.next();
    expect(first.aborted).toBe(true);
  });

  it("issues a fresh, non-aborted signal for the new version", () => {
    const guard = new DataVersionGuard();
    guard.next();
    const { signal: second } = guard.next();
    expect(second.aborted).toBe(false);
  });

  it("dispose() aborts the in-flight signal without starting a new version", () => {
    const guard = new DataVersionGuard();
    const { signal, version } = guard.next();
    guard.dispose();
    expect(signal.aborted).toBe(true);
    expect(guard.currentVersion).toBe(version); // unchanged — no new request started
  });

  it("dispose() is safe to call before any next()", () => {
    const guard = new DataVersionGuard();
    expect(() => guard.dispose()).not.toThrow();
  });
});

describe("applyIfCurrent — discard stale results, never render them", () => {
  it("applies the value when the tagged version is still current", () => {
    const guard = new DataVersionGuard();
    const { version } = guard.next();
    const apply = vi.fn();
    const applied = applyIfCurrent(guard, version, apply, { candles: [1, 2, 3] });
    expect(applied).toBe(true);
    expect(apply).toHaveBeenCalledWith({ candles: [1, 2, 3] });
  });

  it("discards the value — never calls apply — when the tagged version is stale", () => {
    const guard = new DataVersionGuard();
    const { version: staleVersion } = guard.next(); // 1m request issued
    guard.next(); // superseded by a switch to 4h before the 1m response arrives
    const apply = vi.fn();
    const applied = applyIfCurrent(guard, staleVersion, apply, { candles: ["stale"] });
    expect(applied).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });

  it("simulates a forced-slow 1m response arriving after a 4h switch", async () => {
    const guard = new DataVersionGuard();
    let rendered: string | null = null;

    const { version: v1m } = guard.next();
    const slow1mResponse = new Promise<string>(resolve => setTimeout(() => resolve("1m-candles"), 20));

    // user switches to 4h before the 1m response resolves
    const { version: v4h } = guard.next();
    const fast4hResponse = Promise.resolve("4h-candles");

    // 4h (fast) result arrives first
    applyIfCurrent(guard, v4h, v => { rendered = v; }, await fast4hResponse);
    expect(rendered).toBe("4h-candles");

    // stale 1m (slow) result arrives after — must be discarded, never rendered
    applyIfCurrent(guard, v1m, v => { rendered = v; }, await slow1mResponse);
    expect(rendered).toBe("4h-candles"); // unchanged — the stale response never overwrote it
  });
});

describe("ChartContext shape", () => {
  it("defaults regime/markov/wyckoff to unavailable — never fabricates a state", () => {
    const ctx = createChartContext("AAPL", "1D", 86_400, { startMs: 0, endMs: 1 });
    expect(ctx.regime).toEqual(unavailableSlot());
    expect(ctx.markov).toEqual(unavailableSlot());
    expect(ctx.wyckoff).toEqual(unavailableSlot());
    expect(ctx.dataVersion).toBe(0);
    expect(ctx.loadingState).toBe("idle");
  });

  it("keeps candleIntervalSec and visibleRange as independent fields", () => {
    const ctx = createChartContext("AAPL", "5Y", 7 * 86_400, { startMs: 0, endMs: 1825 * 86_400_000 });
    expect(ctx.candleIntervalSec).toBe(7 * 86_400);
    expect(ctx.visibleRange.endMs).toBeGreaterThan(ctx.candleIntervalSec);
  });
});

describe("WM-CHART-P0-06 — WS tick-folding uses currentVersion at effect run", () => {
  it("captured currentVersion goes stale after a next() bump", () => {
    // Simulates the MainChart tick-folding effect capturing
    // versionGuardRef.current.currentVersion for the CURRENT symbol,
    // then the bootstrap effect calling next() when the user switches symbols.
    const guard = new DataVersionGuard();
    guard.next(); // effect run for AAPL — version becomes 1
    const capturedForAAPL = guard.currentVersion;
    expect(guard.isCurrent(capturedForAAPL)).toBe(true);

    guard.next(); // user switches to TSLA — bootstrap effect bumps to 2
    expect(guard.isCurrent(capturedForAAPL)).toBe(false); // stale AAPL tick dropped
  });

  it("a fresh tick after the switch is current again", () => {
    const guard = new DataVersionGuard();
    guard.next();               // AAPL
    guard.next();               // switch to TSLA
    const capturedForTSLA = guard.currentVersion;
    expect(guard.isCurrent(capturedForTSLA)).toBe(true);
  });
});
