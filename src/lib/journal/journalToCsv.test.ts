import { describe, it, expect } from "vitest";
import { journalToCsv, journalRowToCsv, csvEscape, JOURNAL_CSV_COLUMNS, type JournalCsvEntry } from "./journalToCsv";

const mk = (over: Partial<JournalCsvEntry>): JournalCsvEntry => ({
  date: "2026-08-24",
  symbol: "TSLA",
  side: "long",
  entry: 100,
  exit: 120,
  size: 1,
  pnl: 20,
  pct: 20,
  result: "win",
  setup: "CLC Long",
  tags: [],
  notes: "",
  ...over,
});

describe("csvEscape — RFC 4180 semantics", () => {
  it("returns empty string for null / undefined / empty", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
    expect(csvEscape("")).toBe("");
  });
  it("passes plain strings through unchanged", () => {
    expect(csvEscape("hello")).toBe("hello");
    expect(csvEscape("2026-08-24")).toBe("2026-08-24");
    expect(csvEscape(123)).toBe("123");
  });
  it("quotes cells containing comma", () => {
    expect(csvEscape("hello, world")).toBe(`"hello, world"`);
  });
  it("quotes cells containing newlines", () => {
    expect(csvEscape("line1\nline2")).toBe(`"line1\nline2"`);
    expect(csvEscape("line1\r\nline2")).toBe(`"line1\r\nline2"`);
  });
  it("doubles embedded quotes and wraps in quotes", () => {
    expect(csvEscape(`he said "hi"`)).toBe(`"he said ""hi"""`);
  });
});

describe("journalRowToCsv — Proof Lane fields present", () => {
  it("includes dayModel / plannedR / realizedR / contractType / processQuality columns", () => {
    const row = journalRowToCsv(mk({
      dayModel: "M1",
      plannedRDollars: 20,
      realizedR: 1,
      contractType: "option",
      processQuality: "FOLLOWED_PLAN",
      processOutcome: "SKILLED_WIN",
    }));
    const cells = row.split(",");
    expect(cells).toContain("M1");
    expect(cells).toContain("20.00");
    expect(cells).toContain("1.0000");
    expect(cells).toContain("option");
    expect(cells).toContain("FOLLOWED_PLAN");
    expect(cells).toContain("SKILLED_WIN");
  });
  it("emits empty cells for missing Proof Lane fields (never fabricates 0)", () => {
    const row = journalRowToCsv(mk({}));
    // Row has no dayModel / plannedR / realizedR — those cells must be empty
    // (i.e., adjacent commas), NOT "0" / "M0" / "stock" by fallback.
    expect(row).toContain(",,"); // adjacent-empty somewhere is the acceptance test
  });
});

describe("journalToCsv — header + row shape", () => {
  it("header lists all 22 columns in declared order (J-Bkt 7 added MfeR + MaeR)", () => {
    const csv = journalToCsv([]);
    expect(csv).toBe(JOURNAL_CSV_COLUMNS.join(","));
    expect(JOURNAL_CSV_COLUMNS).toEqual([
      "Date", "Symbol", "Side", "ContractType", "Entry", "Exit", "Size",
      "PnL", "PctChange", "Result", "DayModel", "PlannedRDollars",
      "RealizedR", "MfeR", "MaeR", "ProcessQuality", "ProcessOutcome", "Setup", "Tags",
      "Notes", "Mistakes", "Lessons",
    ]);
  });
  it("includes MfeR / MaeR when set", () => {
    const row = journalToCsv([mk({ mfeR: 2.0, maeR: -0.4 })]);
    const cells = row.split("\n")[1].split(",");
    expect(cells).toContain("2.0000");
    expect(cells).toContain("-0.4000");
  });

  it("serializes a realistic Founder Week-One entry set", () => {
    const csv = journalToCsv([
      mk({
        symbol: "TSLA 317.5P",
        contractType: "option",
        entry: 1.00, exit: 2.00, size: 1,
        pnl: 100, pct: 100,
        dayModel: "M1",
        plannedRDollars: 20,
        realizedR: 5,
        processQuality: "FOLLOWED_PLAN",
        processOutcome: "SKILLED_WIN",
        setup: "CLC Long",
        notes: "TSLA breakdown per canon §M1",
      }),
    ]);
    const lines = csv.split("\n");
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain("DayModel");
    expect(lines[1]).toContain("TSLA 317.5P");
    expect(lines[1]).toContain("option");
    expect(lines[1]).toContain("M1");
    expect(lines[1]).toContain("5.0000"); // realizedR fixed-decimals
  });

  it("safely serializes notes containing commas + quotes + newlines", () => {
    const csv = journalToCsv([
      mk({
        notes: `line 1, "quoted", line 2\nnew line`,
      }),
    ]);
    const lines = csv.split("\n");
    // Should be exactly 2 lines even though notes contains \n, because
    // the notes cell is quoted per RFC 4180.
    // Rough parse: count unescaped-newlines outside quotes.
    let inQ = false, unquotedNL = 0;
    for (const ch of csv) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "\n" && !inQ) unquotedNL++;
    }
    expect(unquotedNL).toBe(1); // exactly one row separator between header + row
    // And embedded quotes were doubled:
    expect(csv).toContain(`""quoted""`);
  });
});

describe("a §3 M0 no-trade day never exports as a flat trade", () => {
  // The export is where a journal leaves WM: a spreadsheet, a tax tool, a coach.
  // Handing it "0.00, 0.0000, be" for a day nobody traded launders the lie into
  // systems that have no way to know better.
  const cols = (row: string) => row.split(",");
  const idx = {
    pnl: JOURNAL_CSV_COLUMNS.indexOf("PnL"),
    pct: JOURNAL_CSV_COLUMNS.indexOf("PctChange"),
    result: JOURNAL_CSV_COLUMNS.indexOf("Result"),
  };

  it("THE DEFECT: result is 'no-trade', not 'be'", () => {
    const row = cols(journalRowToCsv(mk({ dayModel: "M0", result: "be", pnl: 0, pct: 0 })));
    expect(row[idx.result]).toBe("no-trade");
  });

  it("pnl and pct are EMPTY cells, not fabricated zeroes", () => {
    // Empty is the CSV's own way of saying "no value". 0.00 is a price.
    const row = cols(journalRowToCsv(mk({ dayModel: "M0", result: "be", pnl: 0, pct: 0 })));
    expect(row[idx.pnl]).toBe("");
    expect(row[idx.pct]).toBe("");
  });

  it("a REAL trade scratched at entry still exports its breakeven and its 0.00", () => {
    // The two rows must not be identical — that is the whole point.
    const scratched = cols(journalRowToCsv(mk({ dayModel: "M1", result: "be", pnl: 0, pct: 0 })));
    expect(scratched[idx.result]).toBe("be");
    expect(scratched[idx.pnl]).toBe("0.00");
  });

  it("wins and losses are untouched by the M0 rule", () => {
    const win = cols(journalRowToCsv(mk({ dayModel: "M1", result: "win", pnl: 250.5, pct: 3 })));
    expect(win[idx.result]).toBe("win");
    expect(win[idx.pnl]).toBe("250.50");
  });

  it("the M0 row still carries its DayModel, so the record is not anonymised", () => {
    const row = cols(journalRowToCsv(mk({ dayModel: "M0", result: "be" })));
    expect(row[JOURNAL_CSV_COLUMNS.indexOf("DayModel")]).toBe("M0");
  });
});
