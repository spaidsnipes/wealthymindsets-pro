import { describe, expect, it } from "vitest";
import {
  actionablePaperQuotePrice,
  initialPaperQuoteReadiness,
  selectPaperQuoteReadiness,
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
      label: "DELAYED BY ENTITLEMENT",
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

  it("rejects future observation or availability chronology", () => {
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
    const futureAvailable = selectPaperQuoteReadiness(
      response({ receivedAt: NOW + 1, availableAt: NOW + 1 }),
      initialPaperQuoteReadiness(),
      NOW,
    );
    expect(futureObserved).toMatchObject({ status: "UNKNOWN", actionable: false, price: null });
    expect(futureAvailable).toMatchObject({ status: "UNKNOWN", actionable: false, price: null });
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
});
