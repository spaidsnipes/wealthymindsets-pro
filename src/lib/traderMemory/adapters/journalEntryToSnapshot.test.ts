import { describe, it, expect } from "vitest";
import {
  journalEntryToSnapshot,
  journalEntriesToSnapshots,
  type AdaptableJournalEntry,
} from "./journalEntryToSnapshot";

/**
 * Shift-ATHOS truth-lock (Chief Engineering Officer):
 *
 * journalEntryToSnapshot / journalEntriesToSnapshots is a PURE, deterministic
 * adapter bridging local Journal entries into DecisionMemorySnapshot[] for the
 * Founder-loop selectors. It reads NO wall clock (all timestamps derive from
 * `entry.date`), fabricates NO self-report, and null-guards unprojectable
 * entries. It had 0 tests — this file locks its ACTUAL current behavior so a
 * silent edit (wrong R math, adherence drift, dropped null-guard, unsorted
 * batch) fails CI instead of shipping.
 *
 * Every expectation below was computed from the implementation as written, not
 * from what the math "should" be.
 */

function makeEntry(over: Partial<AdaptableJournalEntry> = {}): AdaptableJournalEntry {
  return {
    id: "e1",
    date: "2026-08-20T14:30:00.000Z",
    symbol: "AAPL",
    side: "long",
    entry: 100,
    exit: 110,
    size: 2,
    pnl: 20,
    pct: 10,
    tags: [],
    setup: "Opening Range Break",
    ...over,
  };
}

describe("journalEntryToSnapshot — null guards", () => {
  it("returns null when symbol is empty", () => {
    expect(journalEntryToSnapshot(makeEntry({ symbol: "" }), "owner-1")).toBeNull();
  });

  it("returns null when entry price is not finite", () => {
    expect(journalEntryToSnapshot(makeEntry({ entry: NaN }), "owner-1")).toBeNull();
  });

  it("returns null when entry price is <= 0", () => {
    expect(journalEntryToSnapshot(makeEntry({ entry: 0 }), "owner-1")).toBeNull();
    expect(journalEntryToSnapshot(makeEntry({ entry: -5 }), "owner-1")).toBeNull();
  });

  it("returns null when the date is unparseable (capturedAt NaN)", () => {
    expect(journalEntryToSnapshot(makeEntry({ date: "not-a-date" }), "owner-1")).toBeNull();
  });
});

describe("journalEntryToSnapshot — core projection", () => {
  it("derives capturedAt from entry.date (no wall clock)", () => {
    const snap = journalEntryToSnapshot(makeEntry(), "owner-1")!;
    expect(snap.capturedAt).toBe(new Date("2026-08-20T14:30:00.000Z").getTime());
  });

  it("passes ownerId through untouched and never invents one", () => {
    const snap = journalEntryToSnapshot(makeEntry(), "owner-xyz")!;
    expect(snap.ownerId).toBe("owner-xyz");
  });

  it("uses decisionId = entry.id", () => {
    const snap = journalEntryToSnapshot(makeEntry({ id: "trade-42" }), "o")!;
    expect(snap.decisionId).toBe("trade-42");
  });

  it("defaults sessionIdentity to session-<date> when none provided", () => {
    const snap = journalEntryToSnapshot(makeEntry({ date: "2026-08-20T14:30:00.000Z" }), "o")!;
    expect(snap.sessionIdentity).toBe("session-2026-08-20T14:30:00.000Z");
  });

  it("uses the provided sessionIdentity when given", () => {
    const snap = journalEntryToSnapshot(makeEntry(), "o", "sess-99")!;
    expect(snap.sessionIdentity).toBe("sess-99");
  });

  it("maps a stable constant set of fields (version/expectedR/tradeNumber/external)", () => {
    const snap = journalEntryToSnapshot(makeEntry(), "o")!;
    expect(snap.playbookVersion).toBe(1);
    expect(snap.plan.expectedR).toBe(0);
    expect(snap.tradeNumberInSession).toBe(1);
    expect(snap.externalInfluenceFlagged).toBe(false);
  });

  it("leaves marketStateSummary dimensions null except direction (never fabricated)", () => {
    const snap = journalEntryToSnapshot(makeEntry({ side: "long" }), "o")!;
    expect(snap.marketStateSummary).toEqual({
      regime: null,
      direction: "LONG",
      location: null,
      volatility: null,
      session: null,
    });
  });
});

describe("journalEntryToSnapshot — side mapping", () => {
  it("long → direction LONG + plan ENTER_LONG", () => {
    const snap = journalEntryToSnapshot(makeEntry({ side: "long" }), "o")!;
    expect(snap.marketStateSummary.direction).toBe("LONG");
    expect(snap.plan.action).toBe("ENTER_LONG");
  });

  it("short → direction SHORT + plan ENTER_SHORT", () => {
    const snap = journalEntryToSnapshot(makeEntry({ side: "short" }), "o")!;
    expect(snap.marketStateSummary.direction).toBe("SHORT");
    expect(snap.plan.action).toBe("ENTER_SHORT");
  });
});

describe("journalEntryToSnapshot — playbookId from setup", () => {
  it("lowercases and hyphenates the setup string", () => {
    const snap = journalEntryToSnapshot(makeEntry({ setup: "Opening Range Break" }), "o")!;
    expect(snap.playbookId).toBe("opening-range-break");
  });

  it("falls back to 'unspecified' when setup is empty", () => {
    const snap = journalEntryToSnapshot(makeEntry({ setup: "" }), "o")!;
    expect(snap.playbookId).toBe("unspecified");
  });
});

describe("journalEntryToSnapshot — R-multiple derivation", () => {
  it("computes scale-free R = (pnl/size)/entry*20, rounded to 3dp", () => {
    // perUnitPnl = 20/2 = 10; scaleFreeR = 10/100*20 = 2.000
    const snap = journalEntryToSnapshot(makeEntry({ entry: 100, size: 2, pnl: 20 }), "o")!;
    expect(snap.outcome?.realizedR).toBe(2);
  });

  it("rounds to exactly 3 decimal places", () => {
    // perUnitPnl = 10/3 = 3.3333...; scaleFreeR = (3.3333/100)*20 = 0.66666...
    const snap = journalEntryToSnapshot(makeEntry({ entry: 100, size: 3, pnl: 10, exit: 110 }), "o")!;
    expect(snap.outcome?.realizedR).toBe(0.667);
  });

  it("when size is 0 uses raw pnl as perUnitPnl", () => {
    // size 0 → perUnitPnl = pnl = 20; scaleFreeR = (20/100)*20 = 4.000
    const snap = journalEntryToSnapshot(makeEntry({ entry: 100, size: 0, pnl: 20 }), "o")!;
    expect(snap.outcome?.realizedR).toBe(4);
  });

  it("negative pnl yields a negative R", () => {
    // perUnitPnl = -20/2 = -10; scaleFreeR = (-10/100)*20 = -2.000
    const snap = journalEntryToSnapshot(makeEntry({ pnl: -20 }), "o")!;
    expect(snap.outcome?.realizedR).toBe(-2);
  });
});

describe("journalEntryToSnapshot — outcome only when closed", () => {
  it("populates outcome when exit > 0", () => {
    const snap = journalEntryToSnapshot(makeEntry({ exit: 110 }), "o")!;
    expect(snap.outcome).toBeDefined();
    expect(snap.outcome?.reason).toBe("MANUAL");
    expect(snap.outcome?.closedAt).toBe(snap.capturedAt);
  });

  it("omits outcome when exit is 0 (open trade)", () => {
    const snap = journalEntryToSnapshot(makeEntry({ exit: 0 }), "o")!;
    expect(snap.outcome).toBeUndefined();
  });
});

describe("journalEntryToSnapshot — rule adherence + review from processQuality", () => {
  it("FOLLOWED_PLAN → adherence true, no ordinal review (binary source)", () => {
    const snap = journalEntryToSnapshot(makeEntry({ processQuality: "FOLLOWED_PLAN" }), "o")!;
    expect(snap.ruleAdherenceAtDecision).toBe(true);
    expect(snap.review).toBeUndefined();
  });

  it("BROKE_RULES → adherence false, no review", () => {
    const snap = journalEntryToSnapshot(makeEntry({ processQuality: "BROKE_RULES" }), "o")!;
    expect(snap.ruleAdherenceAtDecision).toBe(false);
    expect(snap.review).toBeUndefined();
  });

  it("undefined processQuality → adherence false, no review", () => {
    const snap = journalEntryToSnapshot(makeEntry({ processQuality: undefined }), "o")!;
    expect(snap.ruleAdherenceAtDecision).toBe(false);
    expect(snap.review).toBeUndefined();
  });

  it("legacy GREAT → adherence true + full 5/5 ordinal review", () => {
    const snap = journalEntryToSnapshot(makeEntry({ processQuality: "GREAT" }), "o")!;
    expect(snap.ruleAdherenceAtDecision).toBe(true);
    expect(snap.review).toEqual({
      reviewedAt: snap.capturedAt,
      marketOpportunityQuality: 5,
      playbookMatch: 5,
      riskQuality: 5,
      executionQuality: 5,
      processAdherence: 5,
    });
  });

  it("legacy GOOD → adherence true + 4/4 ordinal review", () => {
    const snap = journalEntryToSnapshot(makeEntry({ processQuality: "GOOD" }), "o")!;
    expect(snap.ruleAdherenceAtDecision).toBe(true);
    expect(snap.review?.processAdherence).toBe(4);
  });

  it("legacy MID → adherence false but a 3/3 ordinal review", () => {
    const snap = journalEntryToSnapshot(makeEntry({ processQuality: "MID" }), "o")!;
    expect(snap.ruleAdherenceAtDecision).toBe(false);
    expect(snap.review?.executionQuality).toBe(3);
  });

  it("legacy POOR → adherence false + 2/2 review", () => {
    const snap = journalEntryToSnapshot(makeEntry({ processQuality: "POOR" }), "o")!;
    expect(snap.ruleAdherenceAtDecision).toBe(false);
    expect(snap.review?.riskQuality).toBe(2);
  });

  it("legacy TERRIBLE → adherence false + 1/1 review", () => {
    const snap = journalEntryToSnapshot(makeEntry({ processQuality: "TERRIBLE" }), "o")!;
    expect(snap.ruleAdherenceAtDecision).toBe(false);
    expect(snap.review?.marketOpportunityQuality).toBe(1);
  });
});

describe("journalEntriesToSnapshots — batch", () => {
  it("drops unprojectable entries and keeps valid ones", () => {
    const out = journalEntriesToSnapshots(
      [
        makeEntry({ id: "ok", date: "2026-08-20T10:00:00.000Z" }),
        makeEntry({ id: "bad", symbol: "" }),
      ],
      "o",
    );
    expect(out).toHaveLength(1);
    expect(out[0].decisionId).toBe("ok");
  });

  it("sorts snapshots by capturedAt ascending (oldest first)", () => {
    const out = journalEntriesToSnapshots(
      [
        makeEntry({ id: "newer", date: "2026-08-22T00:00:00.000Z" }),
        makeEntry({ id: "older", date: "2026-08-20T00:00:00.000Z" }),
        makeEntry({ id: "mid", date: "2026-08-21T00:00:00.000Z" }),
      ],
      "o",
    );
    expect(out.map((s) => s.decisionId)).toEqual(["older", "mid", "newer"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(journalEntriesToSnapshots([], "o")).toEqual([]);
  });

  it("stamps every snapshot with the batch ownerId", () => {
    const out = journalEntriesToSnapshots([makeEntry(), makeEntry({ id: "e2" })], "batch-owner");
    expect(out.every((s) => s.ownerId === "batch-owner")).toBe(true);
  });
});
