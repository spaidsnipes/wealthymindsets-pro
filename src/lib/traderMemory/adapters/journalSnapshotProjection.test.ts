/**
 * WHAT THE SNAPSHOT ADAPTER USED TO DO WITH REAL BROWSER BYTES.
 *
 * `readJournalStorage` verifies exactly one thing — that the parsed JSON is an
 * array — and returns `readonly unknown[]`. `useJournalSnapshots` cast that to
 * an entry type and fed it here. Every case in the first block below was
 * MEASURED against the old implementation, not imagined.
 */

import { describe, expect, it } from "vitest";
import { journalEntryToSnapshot, journalEntriesToSnapshots } from "./journalEntryToSnapshot";
import { readJournalSnapshots } from "./useJournalSnapshots";

const OWNER = "owner-1";

/** A record the adapter can fully read, so each case below changes ONE thing. */
function record(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "e1",
    date: "2026-09-01",
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

function storageOf(records: unknown[]) {
  return {
    getItem: (key: string) =>
      key === "wm_journal_entries" ? JSON.stringify(records) : null,
  };
}

describe("THE MEASURED FAILURES — one bad record, four dead surfaces", () => {
  it("a null in the array does not throw", () => {
    // Old behaviour, verbatim: TypeError "Cannot read properties of null
    // (reading 'symbol')". Thrown inside a hook mounted by /journal, /profile,
    // /morning-prep, /command-deck and the Market Canvas VM. That is not a
    // designed boundary — it is a white screen from one bad byte.
    expect(() => readJournalSnapshots(storageOf([null]), OWNER)).not.toThrow();
    expect(readJournalSnapshots(storageOf([null]), OWNER)).toEqual([]);
  });

  it("neither do arrays, strings, numbers or bare objects", () => {
    const out = readJournalSnapshots(
      storageOf([[], "a string", 7, {}, true, null]),
      OWNER,
    );
    expect(out).toEqual([]);
  });

  it("a record with no side is NOT projected as a short", () => {
    // Old behaviour: `entry.side === "long" ? "LONG" : "SHORT"` had no branch
    // for "the record does not say", so direction came out SHORT and the plan
    // came out ENTER_SHORT. The trader was shown a short he never took, on the
    // surfaces whose job is to describe his own process back to him.
    const { side: _dropped, ...noSide } = record();
    expect(journalEntryToSnapshot(noSide, OWNER)).toBeNull();
  });

  it("nor is a record whose side is some other word", () => {
    expect(journalEntryToSnapshot(record({ side: "LONG" }), OWNER)).toBeNull();
    expect(journalEntryToSnapshot(record({ side: 1 }), OWNER)).toBeNull();
    expect(journalEntryToSnapshot(record({ side: null }), OWNER)).toBeNull();
  });

  it("a numeric STRING pnl does not become an R multiple", () => {
    // Old behaviour: `"250.00" / "2" / 100 * 20` is 25 in JavaScript. Not a
    // failure to divide — a confident, fabricated R on the process landscape.
    const snap = journalEntryToSnapshot(
      record({ pnl: "250.00", size: "2" }),
      OWNER,
    );
    expect(snap).not.toBeNull();
    expect(snap!.outcome).toBeUndefined();
  });

  it("a record with no id is not a decision", () => {
    // decisionId is the key the whole shared-position artery is built on.
    // Old behaviour handed back `decisionId: undefined`, so two such records
    // shared one identity.
    const { id: _dropped, ...noId } = record();
    expect(journalEntryToSnapshot(noId, OWNER)).toBeNull();
    expect(journalEntryToSnapshot(record({ id: "   " }), OWNER)).toBeNull();
  });

  it("a closed trade with no pnl is not reported as a flat one", () => {
    // H1: absence is not zero. Old behaviour reached
    // `Number.isFinite(NaN) ? … : 0` and wrote realizedR 0, which
    // selectProcessLandscape reads as neither a win nor a loss — a flat trade
    // the trader never had.
    const { pnl: _dropped, ...noPnl } = record();
    const snap = journalEntryToSnapshot(noPnl, OWNER)!;
    expect(snap).not.toBeNull();
    expect(snap.outcome).toBeUndefined();
  });

  it("nor is one whose pnl is null — which is what JSON writes for NaN", () => {
    const snap = journalEntryToSnapshot(record({ pnl: null }), OWNER)!;
    expect(snap.outcome).toBeUndefined();
  });
});

describe("the decision still survives — refusing a FIELD is not deleting the trade", () => {
  it("an unreadable pnl leaves the decision, its side and its playbook intact", () => {
    // The distinction that makes the refusal defensible. WM does not know what
    // the trade returned; it still knows the trader took it, which way, and
    // under which playbook. Dropping the whole record would erase a decision
    // he actually made.
    const snap = journalEntryToSnapshot(record({ pnl: "oops" }), OWNER)!;
    expect(snap.decisionId).toBe("e1");
    expect(snap.marketStateSummary.direction).toBe("LONG");
    expect(snap.playbookId).toBe("opening-range-break");
    expect(snap.outcome).toBeUndefined();
  });

  it("an unreadable setup still gets the stable bucket, not a dropped record", () => {
    const snap = journalEntryToSnapshot(record({ setup: 42 }), OWNER)!;
    expect(snap.playbookId).toBe("unspecified");
  });

  it("an unreadable size falls back to raw pnl rather than refusing", () => {
    // size 0 already meant "use the raw pnl". A missing or non-numeric size is
    // the same state, and it was already handled that way.
    const snap = journalEntryToSnapshot(record({ size: "two", entry: 100, pnl: 20 }), OWNER)!;
    expect(snap.outcome?.realizedR).toBe(4);
  });
});

describe("the arithmetic that was already correct is unchanged", () => {
  it("R = (pnl/size)/entry*20, rounded to 3dp", () => {
    expect(
      journalEntryToSnapshot(record({ entry: 100, size: 2, pnl: 20 }), OWNER)!.outcome?.realizedR,
    ).toBe(2);
    expect(
      journalEntryToSnapshot(record({ entry: 100, size: 3, pnl: 10 }), OWNER)!.outcome?.realizedR,
    ).toBe(0.667);
    expect(
      journalEntryToSnapshot(record({ entry: 100, size: 2, pnl: -20 }), OWNER)!.outcome?.realizedR,
    ).toBe(-2);
  });

  it("an open trade (exit 0) still has no outcome", () => {
    expect(journalEntryToSnapshot(record({ exit: 0 }), OWNER)!.outcome).toBeUndefined();
  });

  it("a real breakeven is still a real outcome — the refusal is about UNREADABLE, not zero", () => {
    // `pnl: 0` here is a number the journal wrote. Unlike the edge projection's
    // pnl fallback, nothing downstream is deriving a win/loss verdict FROM this
    // field alone, so a stored zero is simply a zero R.
    const snap = journalEntryToSnapshot(record({ pnl: 0 }), OWNER)!;
    expect(snap.outcome?.realizedR).toBe(0);
  });

  it("short is still SHORT", () => {
    const snap = journalEntryToSnapshot(record({ side: "short" }), OWNER)!;
    expect(snap.marketStateSummary.direction).toBe("SHORT");
    expect(snap.plan.action).toBe("ENTER_SHORT");
  });

  it("a blank or unparseable date is still refused", () => {
    expect(journalEntryToSnapshot(record({ date: "not-a-date" }), OWNER)).toBeNull();
    expect(journalEntryToSnapshot(record({ date: "   " }), OWNER)).toBeNull();
    expect(journalEntryToSnapshot(record({ date: 20260901 }), OWNER)).toBeNull();
  });

  it("a non-positive or non-numeric entry price is still refused", () => {
    expect(journalEntryToSnapshot(record({ entry: 0 }), OWNER)).toBeNull();
    expect(journalEntryToSnapshot(record({ entry: -5 }), OWNER)).toBeNull();
    expect(journalEntryToSnapshot(record({ entry: "100" }), OWNER)).toBeNull();
    expect(journalEntryToSnapshot(record({ entry: Number.NaN }), OWNER)).toBeNull();
  });

  it("legacy ordinal processQuality still produces a review composite", () => {
    expect(journalEntryToSnapshot(record({ processQuality: "GREAT" }), OWNER)!.review)
      .toMatchObject({ processAdherence: 5 });
    expect(journalEntryToSnapshot(record({ processQuality: "FOLLOWED_PLAN" }), OWNER)!.review)
      .toBeUndefined();
  });

  it("adherence is never credited to a record that did not claim it", () => {
    expect(journalEntryToSnapshot(record({ processQuality: 5 }), OWNER)!.ruleAdherenceAtDecision)
      .toBe(false);
  });
});

describe("the batch keeps its order guarantee over a mixed book", () => {
  it("skips what it cannot read and still sorts the rest oldest-first", () => {
    const out = journalEntriesToSnapshots(
      [
        record({ id: "c", date: "2026-09-03" }),
        null,
        record({ id: "a", date: "2026-09-01" }),
        { ...record({ id: "x" }), side: undefined },
        record({ id: "b", date: "2026-09-02" }),
      ],
      OWNER,
    );
    expect(out.map((s) => s.decisionId)).toEqual(["a", "b", "c"]);
  });

  it("an empty book is empty, not an error", () => {
    expect(journalEntriesToSnapshots([], OWNER)).toEqual([]);
  });
});

describe("the hook path still fails closed on the states it already owned", () => {
  it("no ownerId means no snapshots, whatever the bytes say", () => {
    expect(readJournalSnapshots(storageOf([record()]), null)).toEqual([]);
    expect(readJournalSnapshots(storageOf([record()]), "")).toEqual([]);
  });

  it("malformed canonical bytes do not fall back to legacy", () => {
    const storage = {
      getItem: (key: string) =>
        key === "wm_journal_entries" ? "{not json" : JSON.stringify([record()]),
    };
    expect(readJournalSnapshots(storage, OWNER)).toEqual([]);
  });

  it("a readable book still reaches the surface", () => {
    const out = readJournalSnapshots(storageOf([record()]), OWNER);
    expect(out).toHaveLength(1);
    expect(out[0].ownerId).toBe(OWNER);
  });
});
