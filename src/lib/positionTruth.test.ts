import { describe, expect, it } from "vitest";
import {
  DEFAULT_POSITION_STALENESS_MS,
  RANK_CLIENT,
  RANK_RECONCILIATION,
  UNSETTLED_POSITION_LABELS,
  selectPositionTruth,
} from "./positionTruth";

/**
 * BUILD ORDER §14.1 + §14.4.
 *
 * These are not component tests. They are the two invariants written as
 * executable law, so the defect fixed by hand in AlpacaTradingPanel.tsx on
 * 2026-09-03 ("No open positions" rendered on a FAILED fetch) has a reducer
 * that cannot express it again.
 */

const NOW = 1_700_000_000_000;
const fresh = NOW - 1_000;
const ancient = NOW - 10 * 60_000;

describe("untrusted reconciliation timing", () => {
  it.each([Number.NaN, Infinity, -Infinity, 0])("does not confirm flat with an invalid clock %s", now => {
    const truth = selectPositionTruth({reports:[{source:"broker",qty:0,observedAt:fresh}],now});
    expect(truth.label).toBe("POSITION UNCONFIRMED");
    expect(truth.confidence).toBe("TIME UNVERIFIED");
  });
  it.each([Number.NaN, Infinity, -1])("does not confirm flat with invalid age tolerance %s", stalenessMs => {
    expect(selectPositionTruth({reports:[{source:"broker",qty:0,observedAt:fresh}],now:NOW,stalenessMs}).label).not.toBe("FLAT");
  });
  it("retains reported risk but cannot certify a future observation", () => {
    const truth = selectPositionTruth({reports:[{source:"broker",qty:3,observedAt:NOW+1}],now:NOW});
    expect(truth.qty).toBe(3);
    expect(truth.confidence).toBe("TIME UNVERIFIED");
    expect(truth.sentence).toContain("observation time is unverified");
  });
  it.each([Number.NaN, Infinity, -Infinity])("does not crash or override broker risk on invalid rank %s", rank => {
    const truth = selectPositionTruth({reports:[
      {source:"broker",qty:5,observedAt:fresh,rank:RANK_RECONCILIATION},
      {source:"malformed",qty:0,observedAt:NOW,rank},
    ],now:NOW});
    expect(truth.qty).toBe(5);
    expect(truth.confidence).toBe("UNOBSERVED");
    expect(truth.sentence).toContain("malformed did not report");
  });
});

describe("§14.1 — the UI never says FLAT while broker quantity > 0", () => {
  it("says FLAT only when every expected source was observed at zero", () => {
    const t = selectPositionTruth({
      reports: [
        { source: "broker-recon", qty: 0, observedAt: fresh, rank: RANK_RECONCILIATION },
      ],
      now: NOW,
    });

    expect(t.label).toBe("FLAT");
    expect(t.qty).toBe(0);
    expect(t.confidence).toBe("CONFIRMED");
    expect(t.sentence).toBe("FLAT — every source reported zero.");
  });

  it("refuses FLAT when a source was expected and never reported", () => {
    const t = selectPositionTruth({
      reports: [{ source: "paper-ledger", qty: 0, observedAt: fresh }],
      unobservedSources: ["broker-recon"],
      now: NOW,
    });

    expect(t.label).toBe("POSITION UNCONFIRMED");
    expect(t.confidence).toBe("UNOBSERVED");
    expect(t.sentence).toContain("broker-recon did not report");
    // The whole point: silence must never read as reassurance.
    expect(t.sentence).toContain("not a confirmation that you are flat");
  });

  it("refuses FLAT when nothing reported at all — the Alpaca panel defect", () => {
    const t = selectPositionTruth({ reports: [], now: NOW });

    expect(t.label).toBe("POSITION UNCONFIRMED");
    expect(t.qty).toBeNull();
    expect(t.confidence).toBe("UNOBSERVED");
    expect(t.authority).toBeNull();
    expect(t.label).not.toBe("FLAT");
    expect(t.sentence).toContain("not a confirmation that you are flat");
  });

  it("a fresher CLIENT zero cannot paint over a broker position", () => {
    // The adversarial ordering. Pure recency-wins prints FLAT here, which is
    // precisely the state §14.1 forbids: a trader holding 5 told they hold none.
    const t = selectPositionTruth({
      reports: [
        { source: "broker-recon", qty: 5, observedAt: fresh - 5_000, rank: RANK_RECONCILIATION },
        { source: "client-cache", qty: 0, observedAt: fresh, rank: RANK_CLIENT },
      ],
      now: NOW,
    });

    expect(t.label).toBe("LONG");
    expect(t.qty).toBe(5);
    expect(t.authority).toBe("broker-recon");
    expect(t.outranked).toEqual(["client-cache"]);
  });

  it("still reports a short position rather than flat", () => {
    const t = selectPositionTruth({
      reports: [
        { source: "broker-recon", qty: -3, observedAt: fresh, rank: RANK_RECONCILIATION },
      ],
      now: NOW,
    });

    expect(t.label).toBe("SHORT");
    expect(t.qty).toBe(-3);
    expect(t.sentence).toBe("SHORT 3");
  });

  it("treats a non-finite quantity as unobserved, never as zero", () => {
    const t = selectPositionTruth({
      reports: [{ source: "broker-recon", qty: Number.NaN, observedAt: fresh }],
      now: NOW,
    });

    expect(t.label).toBe("POSITION UNCONFIRMED");
    expect(t.qty).toBeNull();
    expect(t.confidence).toBe("UNOBSERVED");
  });

  it("treats a non-finite timestamp as unobserved", () => {
    const t = selectPositionTruth({
      reports: [{ source: "broker-recon", qty: 4, observedAt: Number.NaN }],
      now: NOW,
    });

    expect(t.label).toBe("POSITION UNCONFIRMED");
    expect(t.confidence).toBe("UNOBSERVED");
  });

  it("does not let a stale zero settle into FLAT", () => {
    const t = selectPositionTruth({
      reports: [{ source: "broker-recon", qty: 0, observedAt: ancient }],
      now: NOW,
    });

    expect(t.label).toBe("POSITION UNCONFIRMED");
    expect(t.confidence).toBe("STALE");
    expect(t.sentence).toContain("last report is stale");
  });

  it("keeps a stale non-zero position visible, marked LAST KNOWN", () => {
    // Risk must stay on screen. Downgrading the confidence is honest;
    // hiding the position is not.
    const t = selectPositionTruth({
      reports: [{ source: "broker-recon", qty: 7, observedAt: ancient }],
      now: NOW,
    });

    expect(t.label).toBe("LONG");
    expect(t.qty).toBe(7);
    expect(t.confidence).toBe("STALE");
    expect(t.sentence).toBe("LONG 7 — LAST KNOWN, not confirmed");
  });

  it("POSITION UNCONFIRMED is registered as an unsettled label (§15: no green safe badge)", () => {
    expect(UNSETTLED_POSITION_LABELS).toContain("POSITION UNCONFIRMED");
    expect(UNSETTLED_POSITION_LABELS).not.toContain("FLAT");
  });
});

describe("§14.4 — a stale client cannot overwrite newer reconciliation", () => {
  it("newer reconciliation wins over an older client snapshot", () => {
    const t = selectPositionTruth({
      reports: [
        { source: "client-cache", qty: 5, observedAt: fresh - 5_000, rank: RANK_RECONCILIATION },
        { source: "broker-recon", qty: 2, observedAt: fresh, rank: RANK_RECONCILIATION },
      ],
      now: NOW,
    });

    expect(t.qty).toBe(2);
    expect(t.authority).toBe("broker-recon");
    expect(t.superseded).toEqual(["client-cache"]);
  });

  it("arrival order does not change the outcome", () => {
    const a = { source: "client-cache", qty: 5, observedAt: fresh - 5_000 };
    const b = { source: "broker-recon", qty: 2, observedAt: fresh };

    const forward = selectPositionTruth({ reports: [a, b], now: NOW });
    const reversed = selectPositionTruth({ reports: [b, a], now: NOW });

    expect(forward).toEqual(reversed);
    expect(forward.qty).toBe(2);
  });

  it("an older disagreeing report is superseded, not a dispute", () => {
    const t = selectPositionTruth({
      reports: [
        { source: "client-cache", qty: 9, observedAt: fresh - 5_000 },
        { source: "broker-recon", qty: 0, observedAt: fresh },
      ],
      now: NOW,
    });

    expect(t.disputedBy).toEqual([]);
    expect(t.confidence).toBe("CONFIRMED");
    expect(t.label).toBe("FLAT");
  });

  it("equal-recency disagreement is DISPUTED with no assertable quantity", () => {
    const t = selectPositionTruth({
      reports: [
        { source: "broker-recon", qty: 5, observedAt: fresh },
        { source: "paper-ledger", qty: 0, observedAt: fresh },
      ],
      now: NOW,
    });

    expect(t.confidence).toBe("DISPUTED");
    expect(t.qty).toBeNull();
    expect(t.label).toBe("POSITION UNCONFIRMED");
    expect(t.disputedBy).toEqual(["paper-ledger"]);
    expect(t.sentence).toContain("sources disagree");
  });

  it("a dispute can never resolve to FLAT even when one side says zero", () => {
    const t = selectPositionTruth({
      reports: [
        { source: "paper-ledger", qty: 0, observedAt: fresh },
        { source: "broker-recon", qty: 12, observedAt: fresh },
      ],
      now: NOW,
    });

    expect(t.label).not.toBe("FLAT");
    expect(t.sentence).toContain("not a confirmation that you are flat");
  });

  it("agreement at equal recency is not a dispute", () => {
    const t = selectPositionTruth({
      reports: [
        { source: "broker-recon", qty: 4, observedAt: fresh },
        { source: "paper-ledger", qty: 4, observedAt: fresh },
      ],
      now: NOW,
    });

    expect(t.confidence).toBe("CONFIRMED");
    expect(t.disputedBy).toEqual([]);
    expect(t.qty).toBe(4);
  });

  it("rank outranks recency, and outranked sources are named not silently dropped", () => {
    const t = selectPositionTruth({
      reports: [
        { source: "broker-recon", qty: 8, observedAt: fresh - 20_000, rank: RANK_RECONCILIATION },
        { source: "client-a", qty: 0, observedAt: fresh, rank: RANK_CLIENT },
        { source: "client-b", qty: 1, observedAt: fresh, rank: RANK_CLIENT },
      ],
      now: NOW,
    });

    expect(t.authority).toBe("broker-recon");
    expect(t.qty).toBe(8);
    expect(t.outranked).toEqual(["client-a", "client-b"]);
    // Client-side disagreement is not a dispute with the broker's own book.
    expect(t.disputedBy).toEqual([]);
  });

  it("staleness is measured from the authority, not from the newest of any rank", () => {
    const t = selectPositionTruth({
      reports: [
        { source: "broker-recon", qty: 3, observedAt: ancient, rank: RANK_RECONCILIATION },
        { source: "client-cache", qty: 3, observedAt: NOW, rank: RANK_CLIENT },
      ],
      now: NOW,
    });

    // A chatty client must not make a cold broker book look fresh.
    expect(t.confidence).toBe("STALE");
  });

  it("honours a caller-supplied staleness tolerance", () => {
    const reports = [{ source: "broker-recon", qty: 0, observedAt: NOW - 45_000 }];

    expect(selectPositionTruth({ reports, now: NOW }).confidence).toBe("STALE");
    expect(
      selectPositionTruth({ reports, now: NOW, stalenessMs: 60_000 }).confidence,
    ).toBe("CONFIRMED");
  });

  it("defaults the staleness tolerance to 30s", () => {
    expect(DEFAULT_POSITION_STALENESS_MS).toBe(30_000);

    const atEdge = selectPositionTruth({
      reports: [{ source: "broker-recon", qty: 0, observedAt: NOW - 30_000 }],
      now: NOW,
    });
    expect(atEdge.confidence).toBe("CONFIRMED");

    const pastEdge = selectPositionTruth({
      reports: [{ source: "broker-recon", qty: 0, observedAt: NOW - 30_001 }],
      now: NOW,
    });
    expect(pastEdge.confidence).toBe("STALE");
  });

  it("is a pure selector — the same input always yields the same truth (§15)", () => {
    const input = {
      reports: [{ source: "broker-recon", qty: 5, observedAt: fresh }],
      now: NOW,
    };

    expect(selectPositionTruth(input)).toEqual(selectPositionTruth(input));
    // No hidden state: a second reducer is not a second position store.
    expect(input.reports).toHaveLength(1);
  });
});
