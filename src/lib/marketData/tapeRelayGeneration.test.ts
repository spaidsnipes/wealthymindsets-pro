import { describe, it, expect } from "vitest";
import {
  EMPTY_RELAY_HISTORY,
  GENERATION_END_REASONS,
  aggregateGeneration,
  beginGeneration,
  currentGeneration,
  describeCoverage,
  endGeneration,
  generationWindow,
  type RelayHistory,
} from "./tapeRelayGeneration";
import { candleOpenTimeMs, type ObservedTrade } from "./dxlinkProtocol";

const T0 = 1_700_000_000_000;

describe("relay generations — one unbroken stretch of watching", () => {
  it("starts with nothing observed, and says so", () => {
    expect(currentGeneration(EMPTY_RELAY_HISTORY)).toBeNull();
    expect(describeCoverage(EMPTY_RELAY_HISTORY, T0)).toMatch(/observed no trades/i);
  });

  it("numbers generations from 1 and opens no gap before the first", () => {
    // A relay's birth is not a hole in coverage. Reporting one would
    // manufacture a defect out of the moment the product started running.
    const h = beginGeneration(EMPTY_RELAY_HISTORY, T0);
    expect(h.generations[0].generation).toBe(1);
    expect(h.generations[0].gapBeforeMs).toBe(0);
    expect(currentGeneration(h)?.observingSinceMs).toBe(T0);
  });

  it("REFUSES a second generation while one is open", () => {
    // Two open generations would mean two upstream sockets on one entitlement,
    // and bars aggregated against whichever window was consulted last.
    const h = beginGeneration(EMPTY_RELAY_HISTORY, T0);
    expect(() => beginGeneration(h, T0 + 1000)).toThrow(/still open/i);
  });

  it("measures the gap between generations, not the time connected", () => {
    let h: RelayHistory = beginGeneration(EMPTY_RELAY_HISTORY, T0);
    h = endGeneration(h, T0 + 900_000, GENERATION_END_REASONS.HOST_EVICTION);
    h = beginGeneration(h, T0 + 902_500);
    expect(h.generations[1].generation).toBe(2);
    expect(h.generations[1].gapBeforeMs).toBe(2_500);
  });

  it("names WHY observation stopped — and refuses OPEN as a reason", () => {
    // "This ended because it did not end" is not a state. Allowing it would
    // leave currentGeneration() still returning a closed generation: a relay
    // that believes it is both connected and disconnected.
    const h = beginGeneration(EMPTY_RELAY_HISTORY, T0);
    expect(() => endGeneration(h, T0 + 10, GENERATION_END_REASONS.OPEN)).toThrow(/not an ending/i);
    const closed = endGeneration(h, T0 + 10, GENERATION_END_REASONS.UPSTREAM_CLOSED);
    expect(closed.generations[0].endReason).toBe("UPSTREAM_CLOSED");
    expect(currentGeneration(closed)).toBeNull();
  });

  it("distinguishes the host's eviction from the upstream hanging up", () => {
    // Cloudflare's ~15-minute outbound-socket eviction is expected and is not
    // a fault of tastytrade's. Collapsing the two would make a healthy relay
    // look like a flaky vendor, and hide a flaky vendor behind a healthy host.
    expect(GENERATION_END_REASONS.HOST_EVICTION).not.toBe(GENERATION_END_REASONS.UPSTREAM_CLOSED);
    expect(GENERATION_END_REASONS.RELAY_CLOSED).not.toBe(GENERATION_END_REASONS.UPSTREAM_CLOSED);
  });

  it("refuses to end a generation that was never begun", () => {
    expect(() => endGeneration(EMPTY_RELAY_HISTORY, T0, GENERATION_END_REASONS.RELAY_CLOSED))
      .toThrow(/no generation is open/i);
  });

  it("clamps a backwards clock rather than reporting a negative span", () => {
    // The relay must keep serving through clock skew instead of crashing on
    // it — but never to a span that would make an unwatched window look
    // covered.
    const h = endGeneration(
      beginGeneration(EMPTY_RELAY_HISTORY, T0),
      T0 - 5_000,
      GENERATION_END_REASONS.UPSTREAM_CLOSED,
    );
    expect(h.generations[0].observingUntilMs).toBe(T0);
  });
});

describe("generations decide which bars were actually watched", () => {
  const W = candleOpenTimeMs(T0, 15);
  const t = (atMs: number, price: number): ObservedTrade =>
    ({ symbol: "AAPL", atMs, price, size: 1 });

  it("the generation number IS the truth epoch", () => {
    // A bar for 09:31 built on generation 3 and one rebuilt on generation 4
    // are different facts — the second saw a different slice of the window.
    // mintBarId folds truthEpoch into the id so the chart can hold both,
    // rather than one silently overwriting a bar the trader already acted on.
    let h: RelayHistory = beginGeneration(EMPTY_RELAY_HISTORY, W);
    h = endGeneration(h, W + 5_000, GENERATION_END_REASONS.HOST_EVICTION);
    h = beginGeneration(h, W + 6_000);

    const gen1 = h.generations[0];
    const gen2 = h.generations[1];
    expect(generationWindow(gen1, 0).truthEpoch).toBe(1);
    expect(generationWindow(gen2, 0).truthEpoch).toBe(2);

    const a = aggregateGeneration(gen1, [t(W + 1_000, 10)], 0).windows[0].bar;
    const b = aggregateGeneration(gen2, [t(W + 7_000, 11)], 0).windows[0].bar;
    // Same symbol, same 15s window, DIFFERENT ids.
    expect(a.asOf).toBe(b.asOf);
    expect(a.barId).not.toBe(b.barId);
    expect(a.barId).toContain("e1");
    expect(b.barId).toContain("e2");
  });

  it("a generation that joined mid-window produces a PARTIAL bar", () => {
    let h: RelayHistory = beginGeneration(EMPTY_RELAY_HISTORY, W);
    h = endGeneration(h, W + 5_000, GENERATION_END_REASONS.HOST_EVICTION);
    // Generation 2 joins 6s into the same 15s window: it never saw the open.
    h = beginGeneration(h, W + 6_000);
    const w = aggregateGeneration(h.generations[1], [t(W + 7_000, 11)], 0).windows[0];
    expect(w.coverage).toBe("PARTIAL");
    expect(w.bar.fidelity).toBe("DEGRADED");
  });

  it("an OPEN generation leaves observingUntil absent, so live bars are not cut short", () => {
    // Guards the guard. If an open generation reported observingUntilMs = now,
    // every bar in the CURRENT window would stamp PARTIAL forever, and the
    // PARTIAL marking would stop meaning anything at all.
    const h = beginGeneration(EMPTY_RELAY_HISTORY, W);
    const gen = h.generations[0];
    expect(gen.observingUntilMs).toBeUndefined();
    expect(generationWindow(gen, 0).observingUntilMs).toBeUndefined();
    const w = aggregateGeneration(gen, [t(W + 7_000, 11)], 0).windows[0];
    expect(w.coverage).toBe("FULL");
  });

  it("does not aggregate across a seam", () => {
    // Bars are built WITHIN a generation. A caller that pooled both
    // generations' trades into one call would staple two observations together
    // and present them as one — which is why aggregateGeneration takes a
    // generation and not a bare window.
    let h: RelayHistory = beginGeneration(EMPTY_RELAY_HISTORY, W);
    h = endGeneration(h, W + 5_000, GENERATION_END_REASONS.HOST_EVICTION);
    h = beginGeneration(h, W + 6_000);
    const before = aggregateGeneration(h.generations[0], [t(W + 1_000, 10)], 0);
    const after = aggregateGeneration(h.generations[1], [t(W + 7_000, 11)], 0);
    expect(before.windows).toHaveLength(1);
    expect(after.windows).toHaveLength(1);
    expect(before.windows[0].bar.close).toBe(10);
    expect(after.windows[0].bar.close).toBe(11);
  });
});

describe("what the relay is willing to SAY about its coverage", () => {
  it("claims continuity only when there has been no seam", () => {
    const h = beginGeneration(EMPTY_RELAY_HISTORY, T0);
    const said = describeCoverage(h, T0 + 30_000);
    expect(said).toMatch(/continuously for 30s/);
    expect(said).toMatch(/no gaps/i);
  });

  it("counts the seams and the time unwatched once there has been one", () => {
    let h: RelayHistory = beginGeneration(EMPTY_RELAY_HISTORY, T0);
    h = endGeneration(h, T0 + 900_000, GENERATION_END_REASONS.HOST_EVICTION);
    h = beginGeneration(h, T0 + 902_000);
    const said = describeCoverage(h, T0 + 932_000);
    expect(said).toMatch(/1 seam/);
    expect(said).toMatch(/2s unwatched/);
    // And it must NOT claim the continuity the single-generation case claims.
    expect(said).not.toMatch(/no gaps/i);
  });

  it("says plainly that it is not watching when it is not", () => {
    let h: RelayHistory = beginGeneration(EMPTY_RELAY_HISTORY, T0);
    h = endGeneration(h, T0 + 60_000, GENERATION_END_REASONS.UPSTREAM_CLOSED);
    const said = describeCoverage(h, T0 + 75_000);
    expect(said).toMatch(/not connected/i);
    expect(said).toMatch(/UPSTREAM_CLOSED/);
    expect(said).toMatch(/not drawn/i);
  });

  it("never claims to have backfilled the gap", () => {
    // The market kept trading and WM Pro was not watching. The honest report
    // of that is a stated hole, not a smooth line — so no coverage sentence
    // this module produces may suggest the hole was filled in.
    let h: RelayHistory = beginGeneration(EMPTY_RELAY_HISTORY, T0);
    h = endGeneration(h, T0 + 900_000, GENERATION_END_REASONS.HOST_EVICTION);
    h = beginGeneration(h, T0 + 902_000);
    for (const now of [T0 + 902_001, T0 + 930_000, T0 + 1_800_000]) {
      const said = describeCoverage(h, now);
      expect(said).not.toMatch(/backfill|recovered|caught up|complete/i);
    }
  });

  it("reports minutes once a span passes a minute, not 90s", () => {
    const h = beginGeneration(EMPTY_RELAY_HISTORY, T0);
    expect(describeCoverage(h, T0 + 90_000)).toMatch(/1m 30s/);
  });
});
