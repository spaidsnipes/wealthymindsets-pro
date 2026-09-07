import { describe, it, expect } from "vitest";
import {
  describeNoTradeExclusion,
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
