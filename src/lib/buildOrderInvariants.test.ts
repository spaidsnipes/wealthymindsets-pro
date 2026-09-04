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
import { selectExitPermission } from "./exitPermission";
import {
  weakestCapability,
  PRICE_BEARING_CAPABILITIES,
} from "./marketData/perCapabilityFidelity";
import { selectSessionEdge, type EdgeEntry } from "./proofLane/selectSessionEdge";
import { PACE_TRUTH_LABEL, theoreticalBalanceAtSession } from "./proofLane/proofLanePace";

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

  /* §14.5 — "A journal close cannot change execution."
   *
   * Structural, because the invariant is about who is ALLOWED to write, and no
   * runtime call can prove the absence of a future one. Every module that
   * touches the journal store is enumerated, and each is checked for a write
   * into the paper execution store. A reflection surface may read execution
   * truth; it may never author it. */
  it("14.5 no journal writer mutates paper execution state", () => {
    const JOURNAL_TOUCHING = [
      "src/app/journal/page.tsx",
      "src/app/morning-prep/page.tsx",
      "src/components/chart/PnLStatsPanel.tsx",
      "src/lib/traderMemory/adapters/journalStorage.ts",
      "src/lib/traderMemory/adapters/useJournalSnapshots.ts",
      "src/lib/learningGenome/useLearningGenomeBundle.ts",
    ];

    for (const rel of JOURNAL_TOUCHING) {
      const src = readFileSync(resolve(process.cwd(), rel), "utf8");
      // Sanity: the file must still be a journal module, or this list has
      // rotted and the invariant is silently guarding nothing.
      expect(src, `${rel} no longer references the journal store`)
        .toMatch(/wm_journal_entries|JOURNAL_STORAGE_KEY/);

      expect(src, `${rel} writes paper execution state`)
        .not.toMatch(/setItem\(\s*["'`]wm_paper_state/);
      expect(src, `${rel} calls the paper state writer`)
        .not.toContain("savePaperState");
      expect(src, `${rel} applies a fill`).not.toContain("applyFill(");
      expect(src, `${rel} places an order`).not.toContain("placeChartMarketOrder");
    }
  });

  /* §14.6 — "Nectar being down cannot block a flatten."
   *
   * The live defect this replaced: AlpacaTradingPanel disabled its whole order
   * form on `!account`, so a read-only ACCOUNT BALANCE failure greyed out SELL
   * and trapped a trader in a position while it moved against him. */
  it("14.6 a degraded dependency never blocks an order that reduces risk", () => {
    const flatten = selectExitPermission({
      side: "sell", qty: 4, heldQty: 4,
      accountObserved: false,
      degraded: ["Nectar", "Account", "Positions"],
    });
    expect(flatten.allowed).toBe(true);
    expect(flatten.effect).toBe("REDUCES_RISK");

    // A short cover is an exit too — the sign, not just the word "sell".
    const cover = selectExitPermission({
      side: "buy", qty: 3, heldQty: -3, accountObserved: false, degraded: ["Nectar"],
    });
    expect(cover.allowed).toBe(true);
    expect(cover.effect).toBe("REDUCES_RISK");
  });

  it("14.6 the asymmetry holds — degradation may still withhold ADDING risk", () => {
    // The law is not "allow everything when degraded". It is: degradation
    // removes the ability to add risk, never the ability to shed it.
    const opening = selectExitPermission({
      side: "buy", qty: 10, heldQty: 0, accountObserved: false,
    });
    expect(opening.allowed).toBe(false);
    expect(opening.effect).toBe("INCREASES_RISK");

    // And a refusal must name the exit that IS available, or it is a trap
    // with better manners.
    const oversized = selectExitPermission({
      side: "sell", qty: 10, heldQty: 4, accountObserved: false,
    });
    expect(oversized.riskReducingQty).toBe(4);
    expect(oversized.reason).toContain("close up to 4");
  });

  /* §14.7 — "Missing Greeks cannot dirty a verified last price." */
  it("14.7 a non-price capability cannot be reported as the price's weakness", () => {
    const report = {
      bars:   CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
      quotes: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
      greeks: CANONICAL_FIDELITY_LABELS.BLOCKED_BY_ENTITLEMENT,
      depth:  CANONICAL_FIDELITY_LABELS.BLOCKED_BY_ENTITLEMENT,
    };
    const priceWeakness = weakestCapability(report, PRICE_BEARING_CAPABILITIES);
    expect(priceWeakness?.label).toBe(CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE);

    // …and the scope is not a mute button: a stale tick feed IS the price's.
    const stale = weakestCapability(
      { ...report, ticks: CANONICAL_FIDELITY_LABELS.STALE_PIPELINE },
      PRICE_BEARING_CAPABILITIES,
    );
    expect(stale?.capability).toBe("ticks");
  });

  /* §14.10 — "A counterfactual cannot enter live statistics." */
  it("14.10 an entry with no realized R cannot move measured expectancy", () => {
    const realized: EdgeEntry[] = [
      { date: "2026-09-01", result: "win",  realizedR: 2, processQuality: "FOLLOWED_PLAN" },
      { date: "2026-09-02", result: "loss", realizedR: -1, processQuality: "FOLLOWED_PLAN" },
    ];
    // A trade that was logged but never carried a realized R — the "what if I
    // had held" entry. It is counted as unclassified, never as performance.
    const withCounterfactual: EdgeEntry[] = [
      ...realized,
      { date: "2026-09-03", result: "win", processQuality: "FOLLOWED_PLAN" },
    ];

    const a = selectSessionEdge(realized);
    const b = selectSessionEdge(withCounterfactual);

    expect(b.expectancyR).toBe(a.expectancyR);
    expect(b.cumulativeR).toBe(a.cumulativeR);
    expect(b.rTaggedEntries).toBe(2);
    expect(b.unclassifiedEntries).toBe(1);
  });

  it("14.10 an empty measured sample reports UNDEFINED, never a flat 0.0R", () => {
    // A 0 here would render as "flat performance" — a statistic nobody earned.
    const none = selectSessionEdge([
      { date: "2026-09-01", result: "win", processQuality: "UNRESOLVED" },
    ]);
    expect(none.expectancyR).toBeUndefined();
    expect(none.avgWinnerR).toBeUndefined();
    expect(none.rulesAdheredPct).toBeUndefined();
  });

  it("14.10 the projected curve is labelled THEORETICAL and is not a measured R", () => {
    // theoreticalBalanceAtSession is compound arithmetic on a target, not an
    // observation. It carries its own label and shares no field with SessionEdge.
    expect(PACE_TRUTH_LABEL).toBe("THEORETICAL");
    // 3-month horizon, session 21 of 63, $2,000 → $10,000.
    const projected = theoreticalBalanceAtSession(3, 21, 2_000, 10_000);
    expect(projected).toBeGreaterThan(2_000);
    expect(projected).toBeLessThan(10_000);
    expect(Object.keys(selectSessionEdge([]))).not.toContain("theoreticalBalance");
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
