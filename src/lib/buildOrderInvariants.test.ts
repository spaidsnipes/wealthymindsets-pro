import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  selectPaperQuoteReadiness,
  initialPaperQuoteReadiness,
  actionablePaperQuotePrice,
} from "./marketData/viewModels/selectPaperQuoteReadiness";
import { selectCloseOrderPlan, selectOrderRejection, canCancelOrder, PAPER_KEY } from "./paperTrade";
import { CANONICAL_FIDELITY_LABELS } from "./marketData/canonicalFidelityLabels";

/**
 * BUILD ORDER §14 — "TESTS THAT MATTER MORE THAN COMPONENT TESTS".
 *
 * Binding canon: "WM Pro — Operating System BUILD ORDER — Natural Language —
 * September 3, 2026". These invariants are ranked ABOVE component tests because
 * each one, if violated, lets the screen claim capital truth it does not have.
 *
 * Encoded here against the implementation that exists today. Steps requiring a
 * real broker ACK cannot be proven — every BrokerAdapter.submitOrder() returns
 * status "rejected" with brokerOrderId null, which is honest refusal rather than
 * a defect. Those are recorded as named blockers, not silently skipped.
 */
describe("BUILD ORDER §14 invariants", () => {
  const NOW = 1_788_000_900_000;
  const OBSERVED = NOW - 60_000;

  function goodQuote() {
    return {
      price: 381.05,
      observation: {
        specVersion: "wm.sf-d01.v1.0.1",
        resolution: "RESOLVED",
        price: 381.05,
        observedAt: OBSERVED,
        availableAt: NOW - 500,
        receivedAt: NOW - 500,
        ageMs: 60_000,
      },
    };
  }

  /* §14.8 — "A failed estimate returns UNKNOWN, not last week's dollar." */
  it("14.8 a failed quote never re-serves a stale price as actionable", () => {
    const accepted = selectPaperQuoteReadiness(goodQuote(), initialPaperQuoteReadiness(), NOW);
    expect(accepted.actionable).toBe(true);

    // Refresh fails entirely.
    const failed = selectPaperQuoteReadiness(null, accepted, NOW + 30_000);
    expect(failed.actionable).toBe(false);
    // The last price may remain VISIBLE, but must never authorize action.
    expect(actionablePaperQuotePrice(failed)).toBeNull();
  });

  it("14.8 a cold start reports UNKNOWN rather than inventing a price", () => {
    const cold = selectPaperQuoteReadiness(null, initialPaperQuoteReadiness(), NOW);
    expect(cold.status).toBe("UNKNOWN");
    expect(cold.price).toBeNull();
    expect(actionablePaperQuotePrice(cold)).toBeNull();
  });

  /* §14.11 — "Double flatten is one order intent." */
  it("14.11 repeated flatten requests collapse to one intent", () => {
    let pending: Parameters<typeof selectCloseOrderPlan>[1] = [];
    for (let i = 0; i < 4; i++) {
      const plan = selectCloseOrderPlan(10, pending, "TSLA");
      if (plan) {
        pending = [
          { symbol: "TSLA", side: plan.side, type: "market", qty: plan.qty, status: "pending" },
          ...pending,
        ];
      }
    }
    expect(pending).toHaveLength(1);
    const net = pending.reduce((s, o) => s + (o.side === "buy" ? o.qty : -o.qty), 0);
    expect(10 + net).toBe(0);
  });

  /* §21 — buying power still governs every path, including MANUAL_OVERRIDE. */
  it("21 an order the account cannot fund is refused, not silently filled", () => {
    const r = selectOrderRejection({ side: "buy", qty: 500, price: 381.05, cash: 100_000 });
    expect(r).toContain("Insufficient cash");
  });

  /* §14.1-adjacent — a settled order can never be relabelled. */
  it("a filled order can never transition again", () => {
    expect(canCancelOrder("filled")).toBe(false);
    expect(canCancelOrder("rejected")).toBe(false);
    expect(canCancelOrder("cancelled")).toBe(false);
    expect(canCancelOrder("pending")).toBe(true);
  });

  /* §14.12 — "Closed is not delayed." */
  it("14.12 closed and delayed are distinct labels", () => {
    const closed = CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED;
    const delayed = CANONICAL_FIDELITY_LABELS.DELAYED_BY_ENTITLEMENT;
    expect(closed).not.toBe(delayed);
    expect(closed).toContain("CLOSED");
    expect(closed).not.toContain("DELAYED");
    expect(delayed).toContain("DELAYED");
  });

  /* §14.9 — "Paper cannot mutate live." */
  it("14.9 paper state is namespaced to its own store key", () => {
    expect(PAPER_KEY).toBe("wm_paper_state");
    expect(PAPER_KEY).toContain("paper");
  });

  /* §14.13 — "Halted is not closed." NAMED BLOCKER, not a silent skip. */
  it("14.13 BLOCKER: no HALTED session state exists to distinguish from CLOSED", () => {
    const identity = readFileSync(
      resolve(process.cwd(), "src/lib/marketData/canonicalIdentity.ts"), "utf8");
    const hasHalted = /CanonicalSession[\s\S]{0,200}HALTED/.test(identity);

    // BUILD ORDER §7 lists "SESSION HALTED" as required screen vocabulary and
    // §14.13 requires halted to be distinguishable from closed. Neither exists.
    //
    // This is deliberately asserted as the CURRENT state rather than skipped, so
    // the gap stays visible and this test flips the moment HALTED lands.
    //
    // Not fixed here on purpose: adding an enum member no provider can produce
    // would be dead vocabulary — the same defect pattern as OrderStatus
    // "rejected", which existed unused until cdb1483 gave it a producer. A halt
    // signal requires a data source that reports halts; none is wired.
    expect(hasHalted).toBe(false);
  });
});
