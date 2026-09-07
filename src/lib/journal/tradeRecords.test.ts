import { describe, it, expect } from "vitest";
import {
  describeNoTradeExclusion,
  describeRecordOutcome,
  isTradeRecord,
  selectTradeRecords,
} from "./tradeRecords";
import { hasJournalCoachEvidence, JOURNAL_COACH_MIN_SAMPLE } from "../journalEvidence";
import type { DayModel } from "../proofLane/proofLaneR";

const M0 = { dayModel: "M0" } as const;
const M1 = { dayModel: "M1" } as const;
const M2 = { dayModel: "M2" } as const;
const LEGACY = {} as const;

describe("isTradeRecord — a no-trade day is not a trade", () => {
  it("THE DEFECT: an M0 NO TRADE record is not a trade", () => {
    // canon §3 / DAY_MODEL_LABELS.M0 = "NO TRADE — Capital preservation".
    // It saves with no entry, no exit and no size, prices to 0, and
    // classifyFinancialOutcome(0) calls it a breakeven TRADE.
    expect(isTradeRecord(M0)).toBe(false);
  });

  it("M1 and M2 days are trades", () => {
    expect(isTradeRecord(M1)).toBe(true);
    expect(isTradeRecord(M2)).toBe(true);
  });

  it("a record with NO day model is a trade, not an assumed abstention", () => {
    // Most of the journal predates the day model. Rounding UNKNOWN down to
    // "no trade" would silently delete history from the statistics — the same
    // class of lie, pointed the other way.
    expect(isTradeRecord(LEGACY)).toBe(true);
    expect(isTradeRecord({ dayModel: undefined })).toBe(true);
  });
});

describe("selectTradeRecords — the denominator of every outcome statistic", () => {
  it("holds out only the M0 rows and preserves order", () => {
    const rows: { dayModel?: DayModel; id: string }[] = [
      { dayModel: "M1", id: "a" },
      { dayModel: "M0", id: "b" },
      { id: "c" },
      { dayModel: "M2", id: "d" },
      { dayModel: "M0", id: "e" },
    ];
    expect(selectTradeRecords(rows).map((r) => r.id)).toEqual(["a", "c", "d"]);
  });

  it("does not mutate the record list it was given", () => {
    const rows = [M1, M0, M2];
    selectTradeRecords(rows);
    expect(rows).toHaveLength(3);
  });

  it("an all-M0 journal has ZERO trades, not a 0% win rate over five trades", () => {
    // The distinction that matters: a trader with five disciplined no-trade
    // days has no sample at all. Reporting 0% of 5 would read as five failures.
    expect(selectTradeRecords([M0, M0, M0, M0, M0])).toEqual([]);
  });

  it("empty in, empty out", () => {
    expect(selectTradeRecords([])).toEqual([]);
  });
});

describe("THE SHARPEST EXPOSURE: no-trade days must not unlock the coach", () => {
  it("M0 days cannot carry a journal over the minimum-evidence threshold", () => {
    // hasJournalCoachEvidence gates win rate, R:R and profit-factor claims
    // ABOUT A STRATEGY. Days on which no strategy was executed must not be
    // what buys the right to make them.
    const oneShyOfTrades = Array.from({ length: JOURNAL_COACH_MIN_SAMPLE - 1 }, () => M1);
    const padded = [...oneShyOfTrades, ...Array.from({ length: 20 }, () => M0)];

    expect(hasJournalCoachEvidence(padded.length)).toBe(true); // the old, wrong count
    expect(hasJournalCoachEvidence(selectTradeRecords(padded).length)).toBe(false);
  });

  it("real trades still unlock it at exactly the documented threshold", () => {
    const trades = Array.from({ length: JOURNAL_COACH_MIN_SAMPLE }, () => M1);
    expect(hasJournalCoachEvidence(selectTradeRecords([...trades, M0]).length)).toBe(true);
  });
});

describe("describeNoTradeExclusion — a denominator never shrinks in silence", () => {
  it("is silent when nothing was held out", () => {
    expect(describeNoTradeExclusion([M1, M2, LEGACY])).toBeNull();
    expect(describeNoTradeExclusion([])).toBeNull();
  });

  it("names the count and says the records still exist", () => {
    const note = describeNoTradeExclusion([M1, M0, M0, M2]);
    expect(note).toContain("2 M0 NO TRADE days");
    expect(note).toContain("still in your journal");
  });

  it("reads correctly for a single held-out day", () => {
    const note = describeNoTradeExclusion([M1, M0]);
    expect(note).toContain("1 M0 NO TRADE day is");
    expect(note).toContain("It is");
    expect(note).not.toContain("days are");
  });

  it("§8: an excluded record is not an error and is never dressed as one", () => {
    const note = describeNoTradeExclusion([M0]) ?? "";
    expect(note).not.toMatch(/\bERROR\b|\bINVALID\b|\bFAILED\b|\bWARNING\b/i);
  });

  it("explains WHY, so the trader can learn the rule from the note alone", () => {
    const note = describeNoTradeExclusion([M0]) ?? "";
    expect(note).toContain("no trade was taken");
  });
});

describe("describeRecordOutcome — a no-trade day is not labelled a breakeven", () => {
  it("THE DEFECT: an M0 record stops reporting a trade outcome", () => {
    // Holding M0 out of the STATISTICS stopped it being counted. It did not
    // stop it being LABELLED: the row still said "be" and "$0.00".
    const o = describeRecordOutcome({ dayModel: "M0", result: "be" });
    expect(o.isTrade).toBe(false);
    expect(o.label).toBe("NO TRADE");
  });

  it("H13: no money moved, so no dollar figure may be shown", () => {
    // "$0.00" is a PRICE. It says money changed hands and came back level —
    // a real trade scratched at entry. On a no-trade day nothing was paid.
    expect(describeRecordOutcome({ dayModel: "M0", result: "be" }).hasMoney).toBe(false);
    expect(describeRecordOutcome({ dayModel: "M1", result: "be" }).hasMoney).toBe(true);
  });

  it("a genuine scratch trade keeps its breakeven label", () => {
    // The distinction this whole module exists for, in one assertion: two
    // records, both pnl 0, and they must NOT read the same.
    const scratched = describeRecordOutcome({ dayModel: "M1", result: "be" });
    const neverTaken = describeRecordOutcome({ dayModel: "M0", result: "be" });
    expect(scratched.label).toBe("BE");
    expect(neverTaken.label).toBe("NO TRADE");
    expect(scratched.label).not.toBe(neverTaken.label);
  });

  it("wins and losses are untouched", () => {
    expect(describeRecordOutcome({ dayModel: "M1", result: "win" }).label).toBe("WIN");
    expect(describeRecordOutcome({ result: "loss" }).label).toBe("LOSS");
  });

  it("an unrecognised stored value reports UNKNOWN, never a silent breakeven", () => {
    // The exact substitution this module exists to end: when WM does not know
    // what a record says, it says so instead of picking the flat answer.
    expect(describeRecordOutcome({ dayModel: "M1", result: "scratch" }).label).toBe("UNKNOWN");
    expect(describeRecordOutcome({ dayModel: "M1" }).label).toBe("UNKNOWN");
  });

  it("§8: an unscored record is not phrased as a failure", () => {
    const o = describeRecordOutcome({ dayModel: "M0" });
    expect(o.label).not.toMatch(/ERROR|INVALID|FAILED|MISSING/);
  });
});
