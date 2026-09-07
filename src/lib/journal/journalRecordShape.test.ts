import { describe, it, expect } from "vitest";

import {
  describeRecordCoverage,
  isJournalRecord,
  readStoredDate,
  readStoredDayModel,
  readStoredNumber,
  readStoredProcessQuality,
  readStoredResult,
} from "./journalRecordShape";

/**
 * OWNER LAW — what a stored journal record is.
 *
 * `readJournalStorage` validates exactly one thing: that the parsed JSON is an
 * array. Five consumers then decide independently what a record is — three by
 * unchecked cast, two by hand-rolled guards written twice. This module is the
 * single answer, so these are the tests that answer for all five.
 */

describe("isJournalRecord", () => {
  it("accepts a plain parsed object", () => {
    expect(isJournalRecord({ date: "2026-09-01" })).toBe(true);
    expect(isJournalRecord({})).toBe(true);
  });

  it("THE typeof TRAP: null and arrays are not records", () => {
    // `typeof null === "object"` is the oldest bug in JavaScript, and an array
    // reaching a `value.date` read yields undefined rather than throwing — so
    // both fail silently rather than loudly if this guard is dropped.
    expect(isJournalRecord(null)).toBe(false);
    expect(isJournalRecord([])).toBe(false);
    expect(isJournalRecord([{ date: "2026-09-01" }])).toBe(false);
  });

  it("rejects primitives, including a JSON string that was never parsed", () => {
    expect(isJournalRecord(undefined)).toBe(false);
    expect(isJournalRecord("{\"date\":\"2026-09-01\"}")).toBe(false);
    expect(isJournalRecord(7)).toBe(false);
    expect(isJournalRecord(false)).toBe(false);
  });
});

describe("readStoredNumber", () => {
  it("reads a real number, including a genuine stored zero", () => {
    expect(readStoredNumber(1.5)).toBe(1.5);
    expect(readStoredNumber(-250)).toBe(-250);
    // A scratch trade is real money data, not an absence.
    expect(readStoredNumber(0)).toBe(0);
  });

  it("THE ROUND-TRIP SHAPE: null is not a number", () => {
    // JSON.stringify(NaN) writes `null`, so any record that ever held a
    // non-finite value comes back as null on the very next load.
    expect(JSON.parse(JSON.stringify({ pnl: NaN })).pnl).toBe(null);
    expect(readStoredNumber(null)).toBeUndefined();
  });

  it("THE WORST ONE: a numeric STRING is not a number", () => {
    // `100 + "250.00"` is "100250.00" — not a failure to add but a fabricated
    // figure three orders of magnitude wrong, rendered as fact.
    expect(readStoredNumber("250.00")).toBeUndefined();
    expect(readStoredNumber("0")).toBeUndefined();
  });

  it("NaN and Infinity are absences, not values", () => {
    expect(readStoredNumber(NaN)).toBeUndefined();
    expect(readStoredNumber(Infinity)).toBeUndefined();
    expect(readStoredNumber(-Infinity)).toBeUndefined();
  });

  it("missing and structural values are absences", () => {
    expect(readStoredNumber(undefined)).toBeUndefined();
    expect(readStoredNumber({})).toBeUndefined();
    expect(readStoredNumber([1])).toBeUndefined();
    // `+true === 1`. Coercion would have made this a one-dollar trade.
    expect(readStoredNumber(true)).toBeUndefined();
  });
});

describe("readStoredDate", () => {
  it("reads a non-empty date string as written", () => {
    expect(readStoredDate("2026-09-01")).toBe("2026-09-01");
  });

  it("a blank date is not a date", () => {
    // One adapter checked `!r.date` and the other checked `.trim() !== ""`.
    // A whitespace-only date passed the first and failed the second — the
    // exact drift that having two copies of a rule produces.
    expect(readStoredDate("")).toBeUndefined();
    expect(readStoredDate("   ")).toBeUndefined();
    expect(readStoredDate("\n\t")).toBeUndefined();
  });

  it("a non-string date is not a date", () => {
    expect(readStoredDate(undefined)).toBeUndefined();
    expect(readStoredDate(null)).toBeUndefined();
    // A stored epoch is not the ISO string every consumer Date.parse()s.
    expect(readStoredDate(1757000000000)).toBeUndefined();
  });
});

describe("readStoredResult", () => {
  it("reads only the three outcomes WM writes", () => {
    expect(readStoredResult("win")).toBe("win");
    expect(readStoredResult("loss")).toBe("loss");
    expect(readStoredResult("be")).toBe("be");
  });

  it("anything else is unknown — never rounded to a nearby outcome", () => {
    expect(readStoredResult("WIN")).toBeUndefined();
    expect(readStoredResult("breakeven")).toBeUndefined();
    expect(readStoredResult("")).toBeUndefined();
    expect(readStoredResult(undefined)).toBeUndefined();
    expect(readStoredResult(null)).toBeUndefined();
  });
});

describe("readStoredDayModel", () => {
  it("reads the canon §3 day models", () => {
    expect(readStoredDayModel("M0")).toBe("M0");
    expect(readStoredDayModel("M1")).toBe("M1");
    expect(readStoredDayModel("M2")).toBe("M2");
  });

  it("ABSENT IS NOT M0", () => {
    // Rounding an unrecorded day model down to "NO TRADE" would delete a real
    // trade from every outcome statistic on the strength of a missing field.
    expect(readStoredDayModel(undefined)).toBeUndefined();
    expect(readStoredDayModel(null)).toBeUndefined();
    expect(readStoredDayModel("M3")).toBeUndefined();
    expect(readStoredDayModel("m0")).toBeUndefined();
  });
});

describe("readStoredProcessQuality", () => {
  it("reads the two recorded verdicts", () => {
    expect(readStoredProcessQuality("FOLLOWED_PLAN")).toBe("FOLLOWED_PLAN");
    expect(readStoredProcessQuality("BROKE_RULES")).toBe("BROKE_RULES");
  });

  it("THE HONEST DEFAULT: unrecognised is UNRESOLVED, never FOLLOWED_PLAN", () => {
    // Defaulting the other way credits the trader with discipline they never
    // recorded, and that credit flows into the process×outcome grid.
    expect(readStoredProcessQuality(undefined)).toBe("UNRESOLVED");
    expect(readStoredProcessQuality(null)).toBe("UNRESOLVED");
    expect(readStoredProcessQuality("")).toBe("UNRESOLVED");
    expect(readStoredProcessQuality("followed_plan")).toBe("UNRESOLVED");
    expect(readStoredProcessQuality(true)).toBe("UNRESOLVED");
  });
});

describe("describeRecordCoverage", () => {
  it("is SILENT when every record was read", () => {
    // A note on a complete read is noise, and noise is what makes a real
    // note invisible.
    expect(describeRecordCoverage(12, 12)).toEqual({
      readable: 12,
      skipped: 0,
      note: null,
    });
    expect(describeRecordCoverage(0, 0).note).toBe(null);
  });

  it("counts and names the skipped records", () => {
    const coverage = describeRecordCoverage(10, 7);
    expect(coverage.readable).toBe(7);
    expect(coverage.skipped).toBe(3);
    expect(coverage.note).toContain("7 of 10");
    expect(coverage.note).toContain("other 3");
  });

  it("§8: the note answers 'have I lost my journal?' and never alarms", () => {
    const note = describeRecordCoverage(10, 7).note ?? "";
    expect(note).toContain("Nothing was deleted");
    expect(note).not.toMatch(/\bERROR\b|\bFATAL\b|\bCRITICAL\b|\bINVALID\b|\bFAILED\b|\bCORRUPT/i);
  });

  it("reads as English for a single skipped record", () => {
    expect(describeRecordCoverage(2, 1).note).toContain("left it out");
    expect(describeRecordCoverage(3, 1).note).toContain("left them out");
  });
});
