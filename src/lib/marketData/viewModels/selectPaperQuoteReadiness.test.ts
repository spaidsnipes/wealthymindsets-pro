import { describe, expect, it } from "vitest";
import {
  actionablePaperQuotePrice,
  initialPaperQuoteReadiness,
  selectPaperQuoteReadiness,
  PAPER_DELAYED_QUOTE_MAX_AGE_MS,
  TRANSPORT_CLOCK_SKEW_TOLERANCE_MS,
} from "./selectPaperQuoteReadiness";

const NOW = 1_788_000_900_000;
const OBSERVED = NOW - 10 * 60_000;

function response(overrides: Record<string, unknown> = {}) {
  return {
    price: 29_509.5,
    observation: {
      specVersion: "wm.sf-d01.v1.0.1",
      resolution: "RESOLVED",
      price: 29_509.5,
      observedAt: OBSERVED,
      availableAt: NOW - 1_000,
      receivedAt: NOW - 1_000,
      ageMs: 10 * 60_000,
      ...overrides,
    },
  };
}

describe("selectPaperQuoteReadiness — Paper actionability truth gate", () => {
  it("cold-starts without a fabricated price and cannot authorize an action", () => {
    expect(initialPaperQuoteReadiness()).toMatchObject({
      status: "LOADING",
      actionable: false,
      price: null,
      observedAt: null,
    });
  });

  it("accepts a strictly valid canonical delayed observation", () => {
    expect(selectPaperQuoteReadiness(response(), initialPaperQuoteReadiness(), NOW)).toMatchObject({
      status: "DELAYED",
      actionable: true,
      price: 29_509.5,
      observedAt: OBSERVED,
      ageMs: 10 * 60_000,
      label: "ACTIVE DEGRADED",
    });
  });

  it("rejects UNKNOWN chronology and never borrows the legacy response price", () => {
    const result = selectPaperQuoteReadiness(
      response({ resolution: "UNKNOWN" }),
      initialPaperQuoteReadiness(),
      NOW,
    );
    expect(result).toMatchObject({ status: "UNKNOWN", actionable: false, price: null });
  });

  it("rejects a response without the canonical observation object", () => {
    const result = selectPaperQuoteReadiness(
      { price: 29_509.5 },
      initialPaperQuoteReadiness(),
      NOW,
    );
    expect(result).toMatchObject({ status: "UNKNOWN", actionable: false, price: null });
  });

  it("rejects mismatched or malformed price chronology", () => {
    const mismatch = selectPaperQuoteReadiness(
      { ...response(), price: 1 },
      initialPaperQuoteReadiness(),
      NOW,
    );
    expect(mismatch.actionable).toBe(false);

    const malformed = selectPaperQuoteReadiness(
      response({ observedAt: null }),
      initialPaperQuoteReadiness(),
      NOW,
    );
    expect(malformed.actionable).toBe(false);
  });

  it("marks an over-budget observation STALE and not actionable", () => {
    const result = selectPaperQuoteReadiness(
      response({ observedAt: NOW - 16 * 60_000 }),
      initialPaperQuoteReadiness(),
      NOW,
    );
    expect(result).toMatchObject({ status: "STALE", actionable: false, price: 29_509.5 });
  });

  it("accepts exactly 15:00 but marks 15:00.001 stale", () => {
    const boundary = selectPaperQuoteReadiness(
      response({ observedAt: NOW - 15 * 60_000 }),
      initialPaperQuoteReadiness(),
      NOW,
    );
    const over = selectPaperQuoteReadiness(
      response({ observedAt: NOW - 15 * 60_000 - 1 }),
      initialPaperQuoteReadiness(),
      NOW,
    );
    expect(boundary).toMatchObject({ status: "DELAYED", actionable: true });
    expect(over).toMatchObject({ status: "STALE", actionable: false });
  });

  it("rejects future OBSERVATION chronology", () => {
    const futureObserved = selectPaperQuoteReadiness(
      response({
        observedAt: NOW + 60_000,
        receivedAt: NOW - 1_000,
        availableAt: NOW + 60_000,
        ageMs: 0,
      }),
      initialPaperQuoteReadiness(),
      NOW,
    );
    expect(futureObserved).toMatchObject({ status: "UNKNOWN", actionable: false, price: null });
  });

  /* This case previously asserted that receivedAt/availableAt === NOW + 1 must
   * be rejected. That assertion encoded the 2026-09-03 P0: those two fields are
   * stamped by the edge server, so a sub-millisecond server clock lead made the
   * whole /paper route unusable. Transport chronology now carries a bounded
   * cross-clock-domain tolerance; observation chronology (above) stays strict.
   * See the "client/server clock-domain skew" suite for the full contract. */
  it("tolerates transport chronology one millisecond ahead of the client clock", () => {
    const futureAvailable = selectPaperQuoteReadiness(
      response({ receivedAt: NOW + 1, availableAt: NOW + 1 }),
      initialPaperQuoteReadiness(),
      NOW,
    );
    expect(futureAvailable).toMatchObject({ status: "DELAYED", actionable: true });
  });

  it("retains a prior accepted price only as STALE when refresh fails", () => {
    const accepted = selectPaperQuoteReadiness(response(), initialPaperQuoteReadiness(), NOW);
    const failed = selectPaperQuoteReadiness(null, accepted, NOW + 20_000);
    expect(failed).toMatchObject({
      status: "STALE",
      actionable: false,
      price: 29_509.5,
      observedAt: OBSERVED,
    });
  });

  it("keeps symbol readiness isolated when callers provide separate prior states", () => {
    const nq = selectPaperQuoteReadiness(response(), initialPaperQuoteReadiness(), NOW);
    const es = selectPaperQuoteReadiness(null, initialPaperQuoteReadiness(), NOW);
    expect(nq.actionable).toBe(true);
    expect(es).toMatchObject({ actionable: false, price: null });
  });

  it("exposes an actionable price only for a finite accepted observation", () => {
    const accepted = selectPaperQuoteReadiness(response(), initialPaperQuoteReadiness(), NOW);
    expect(actionablePaperQuotePrice(accepted)).toBe(29_509.5);
    expect(actionablePaperQuotePrice(initialPaperQuoteReadiness())).toBeNull();
    expect(actionablePaperQuotePrice({ ...accepted, status: "STALE", actionable: false })).toBeNull();
    expect(actionablePaperQuotePrice({ ...accepted, price: Number.NaN })).toBeNull();
    expect(actionablePaperQuotePrice({ ...accepted, price: 0 })).toBeNull();
  });

  /* ── Real from-USE P0 (2026-09-03) ──────────────────────────────
   * Measured in the Founder's own browser on prod /paper: the edge
   * server stamped receivedAt 8ms AHEAD of browser Date.now(), so
   * `receivedAt <= capturedAt` failed for all 16 UNIVERSE symbols on
   * every poll. Order Ticket, AI Trading Bot and the options chain all
   * gate on this selector, so the whole route was unusable. */
  describe("client/server clock-domain skew (real from-USE P0)", () => {
    it("accepts server-stamped transport timestamps a few ms ahead of the client clock", () => {
      // Browser clock 8ms behind the edge server — the exact measured case.
      const skewed = response({
        observedAt: OBSERVED,
        availableAt: NOW + 8,
        receivedAt: NOW + 8,
      });
      const result = selectPaperQuoteReadiness(skewed, initialPaperQuoteReadiness(), NOW);
      expect(result.actionable).toBe(true);
      expect(result.status).toBe("DELAYED");
      expect(result.price).toBe(29_509.5);
    });

    it("accepts transport skew up to the tolerance bound", () => {
      const atBound = response({
        observedAt: OBSERVED,
        availableAt: NOW + TRANSPORT_CLOCK_SKEW_TOLERANCE_MS,
        receivedAt: NOW + TRANSPORT_CLOCK_SKEW_TOLERANCE_MS,
      });
      expect(
        selectPaperQuoteReadiness(atBound, initialPaperQuoteReadiness(), NOW).actionable,
      ).toBe(true);
    });

    it("still rejects transport chronology beyond the tolerance, naming the real cause", () => {
      const absurd = response({
        observedAt: OBSERVED,
        availableAt: NOW + TRANSPORT_CLOCK_SKEW_TOLERANCE_MS + 1,
        receivedAt: NOW + TRANSPORT_CLOCK_SKEW_TOLERANCE_MS + 1,
      });
      const result = selectPaperQuoteReadiness(absurd, initialPaperQuoteReadiness(), NOW);
      expect(result.actionable).toBe(false);
      // Monday Test 2: the visible blocker names the proven failure class.
      expect(result.reason).toContain("clock-skew tolerance");
      expect(result.reason).not.toContain("malformed");
    });

    it("keeps OBSERVATION chronology strict — a future observedAt is never actionable", () => {
      const future = response({
        observedAt: NOW + 1,
        availableAt: NOW + 1,
        receivedAt: NOW + 1,
      });
      const result = selectPaperQuoteReadiness(future, initialPaperQuoteReadiness(), NOW);
      expect(result.actionable).toBe(false);
      expect(result.reason).toContain("observed ahead of the evaluation clock");
    });

    it("clock tolerance does not loosen the staleness budget", () => {
      // observedAt is far past the freshness budget; transport is skewed ahead.
      const stale = response({
        observedAt: NOW - (PAPER_DELAYED_QUOTE_MAX_AGE_MS + 60_000),
        availableAt: NOW + 8,
        receivedAt: NOW + 8,
      });
      const result = selectPaperQuoteReadiness(stale, initialPaperQuoteReadiness(), NOW);
      expect(result.actionable).toBe(false);
      expect(result.status).toBe("STALE");
    });

    it("a genuinely malformed payload still reports malformed, not clock skew", () => {
      const broken = response({
        observedAt: OBSERVED,
        availableAt: NOW - 5_000,
        receivedAt: NOW - 1_000, // availableAt !== max(observedAt, receivedAt)
      });
      const result = selectPaperQuoteReadiness(broken, initialPaperQuoteReadiness(), NOW);
      expect(result.actionable).toBe(false);
      expect(result.reason).toContain("malformed");
    });
  });
});
