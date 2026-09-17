/**
 * deriveCompletionSignals — deck-state → CompletionSignals adapter truth-lock.
 *
 * Canon: Cognitive Sovereignty Helicopter Audit (2026-08-29), §Completion
 * Intelligence + §Exit Ramp. Locks the mapping from observable Command Deck
 * decision state to the engine's signals, including the hard truth guardrails:
 * a sealed receipt can never manufacture completion while live risk or an
 * unreviewed close remains, and a return trigger is surfaced only for the
 * honest WAIT job.
 */

import { describe, it, expect } from "vitest";
import {
  deriveCompletionSignals,
  DERIVE_COMPLETION_SIGNALS_VERSION,
  WAIT_RETURN_CONDITION,
  type DeckCompletionInput,
  type DeckDecisionRecord,
} from "./deriveCompletionSignals";

function rec(overrides: Partial<DeckDecisionRecord> = {}): DeckDecisionRecord {
  return { plan: { action: "OBSERVE" }, ...overrides };
}

function base(overrides: Partial<DeckCompletionInput> = {}): DeckCompletionInput {
  return {
    mode: "OBSERVE",
    decisionRecords: [],
    resolvedObjectCount: 0,
    receiptEmpty: true,
    decision: null,
    ...overrides,
  };
}

describe("deriveCompletionSignals — deck adapter (truth-lock)", () => {
  it("stamps a version literal for drift detection", () => {
    expect(DERIVE_COMPLETION_SIGNALS_VERSION).toBe("wm.derive-completion-signals.v1");
  });

  it("passes the job mode through verbatim", () => {
    expect(deriveCompletionSignals(base({ mode: "MANAGE" })).mode).toBe("MANAGE");
  });

  describe("hasOpenPosition — a live ENTER_* with no outcome", () => {
    it("is true for an unresolved ENTER_LONG", () => {
      const s = deriveCompletionSignals(
        base({ decisionRecords: [rec({ plan: { action: "ENTER_LONG" } })] }),
      );
      expect(s.hasOpenPosition).toBe(true);
    });

    it("is true for an unresolved ENTER_SHORT", () => {
      const s = deriveCompletionSignals(
        base({ decisionRecords: [rec({ plan: { action: "ENTER_SHORT" } })] }),
      );
      expect(s.hasOpenPosition).toBe(true);
    });

    it("is false once the entry has an outcome (closed)", () => {
      const s = deriveCompletionSignals(
        base({ decisionRecords: [rec({ plan: { action: "ENTER_LONG" }, outcome: { pnl: 1 } })] }),
      );
      expect(s.hasOpenPosition).toBe(false);
    });

    it("is false for a non-entry action", () => {
      const s = deriveCompletionSignals(
        base({ decisionRecords: [rec({ plan: { action: "OBSERVE" } })] }),
      );
      expect(s.hasOpenPosition).toBe(false);
    });
  });

  describe("hasUnreviewedClose — a closed decision awaiting review", () => {
    it("is true for an outcome with no review", () => {
      const s = deriveCompletionSignals(
        base({ decisionRecords: [rec({ outcome: { pnl: -1 } })] }),
      );
      expect(s.hasUnreviewedClose).toBe(true);
    });

    it("is false once the close has been reviewed", () => {
      const s = deriveCompletionSignals(
        base({ decisionRecords: [rec({ outcome: { pnl: -1 }, review: { note: "ok" } })] }),
      );
      expect(s.hasUnreviewedClose).toBe(false);
    });

    // THE LOAD-BEARING GROUP. The record path above cannot fire in production:
    // decisionMemoryStore.put() has zero production callers, so every signal
    // derived from `decisionRecords` alone is structurally false for every
    // owner, forever. These pin the second ledger — the Journal — so a trader
    // with today's trades unjudged is never told the job is complete.
    it("a journalled unreviewed close is work owed, with no decision records at all", () => {
      const s = deriveCompletionSignals(
        base({ decisionRecords: [], journalUnreviewedCloses: 1 }),
      );
      expect(s.hasUnreviewedClose).toBe(true);
    });

    it("BLOCKS jobComplete even when a receipt is sealed", () => {
      // A sealed receipt must never manufacture completion over owed work.
      const s = deriveCompletionSignals(
        base({ decisionRecords: [], receiptEmpty: false, journalUnreviewedCloses: 2 }),
      );
      expect(s.jobComplete).toBe(false);
    });

    it("UNIONS, never replaces — the record path still fires on its own", () => {
      // If somebody later wires decision sealing, a sealed-but-unreviewed
      // decision must keep counting even when the Journal is clean.
      const s = deriveCompletionSignals(
        base({ decisionRecords: [rec({ outcome: { pnl: -1 } })], journalUnreviewedCloses: 0 }),
      );
      expect(s.hasUnreviewedClose).toBe(true);
    });

    it("omitting the journal count leaves the record path deciding, exactly as before", () => {
      const s = deriveCompletionSignals(base({ decisionRecords: [] }));
      expect(s.hasUnreviewedClose).toBe(false);
      expect(deriveCompletionSignals(base({ decisionRecords: [], journalUnreviewedCloses: 0 })).hasUnreviewedClose).toBe(false);
    });
  });

  describe("SENTINEL — /command-deck must keep asking the Journal", () => {
    it("consumes selectUnreviewedCloses and feeds it to the adapter", async () => {
      // Deleting the wire would silently restore the defect: the page would
      // compile, the suite above would still pass, and the Exit Ramp would go
      // back to reporting completion it never checked. Comment-stripped, so a
      // rule quoted in a docblock cannot satisfy it.
      const fs = await import("node:fs");
      const path = await import("node:path");
      const src = fs
        .readFileSync(path.join(process.cwd(), "src/app/command-deck/page.tsx"), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect(src).toContain("selectUnreviewedCloses");
      expect(src).toContain("journalUnreviewedCloses:");
      expect(src).toContain("unreviewedCloses.hasUnreviewedClose");
    });
  });

  describe("statePreserved — durable re-entry", () => {
    it("is true when there are decision records", () => {
      expect(deriveCompletionSignals(base({ decisionRecords: [rec()] })).statePreserved).toBe(true);
    });

    it("is true when there are resolved market objects", () => {
      expect(deriveCompletionSignals(base({ resolvedObjectCount: 3 })).statePreserved).toBe(true);
    });

    it("is false when nothing durable exists", () => {
      expect(deriveCompletionSignals(base()).statePreserved).toBe(false);
    });
  });

  describe("jobComplete — a sealed receipt CANNOT fabricate completion", () => {
    it("is true when a receipt is sealed and nothing is pending", () => {
      const s = deriveCompletionSignals(base({ receiptEmpty: false }));
      expect(s.jobComplete).toBe(true);
    });

    it("is false when the receipt is empty", () => {
      expect(deriveCompletionSignals(base({ receiptEmpty: true })).jobComplete).toBe(false);
    });

    it("is false when a position is still open despite a sealed receipt", () => {
      const s = deriveCompletionSignals(
        base({
          receiptEmpty: false,
          decisionRecords: [rec({ plan: { action: "ENTER_LONG" } })],
        }),
      );
      expect(s.jobComplete).toBe(false);
    });

    it("is false when a close is unreviewed despite a sealed receipt", () => {
      const s = deriveCompletionSignals(
        base({ receiptEmpty: false, decisionRecords: [rec({ outcome: { pnl: 1 } })] }),
      );
      expect(s.jobComplete).toBe(false);
    });
  });

  describe("returnCondition — surfaced only for the honest WAIT job", () => {
    it("is the WAIT trigger when mode and decision are both WAIT", () => {
      const s = deriveCompletionSignals(base({ mode: "WAIT", decision: "WAIT" }));
      expect(s.returnCondition).toBe(WAIT_RETURN_CONDITION);
    });

    it("is null when the mode is WAIT but the decision is not", () => {
      expect(deriveCompletionSignals(base({ mode: "WAIT", decision: "ACTION" })).returnCondition).toBeNull();
    });

    it("is null for any non-WAIT mode", () => {
      expect(deriveCompletionSignals(base({ mode: "OBSERVE", decision: "WAIT" })).returnCondition).toBeNull();
    });
  });

  it("holds the always-null / always-false invariants (no fabricated blocker or nag)", () => {
    const s = deriveCompletionSignals(base({ mode: "MANAGE", receiptEmpty: false }));
    expect(s.blockedReason).toBeNull();
    expect(s.hasActiveWork).toBe(false);
    expect(s.lowValueRepetition).toBe(false);
  });

  it("is deterministic and does not mutate its input", () => {
    const input = base({
      mode: "WAIT",
      decision: "WAIT",
      decisionRecords: [rec({ plan: { action: "ENTER_LONG" } })],
      resolvedObjectCount: 2,
    });
    const snapshot = JSON.stringify(input);
    const a = deriveCompletionSignals(input);
    const b = deriveCompletionSignals(input);
    expect(a).toEqual(b);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
