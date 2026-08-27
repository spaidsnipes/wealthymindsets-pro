import { describe, it, expect } from "vitest";
import type { AdaptableJournalEntry } from "./journalEntryToSnapshot";
import {
  journalEntryToEdgeEntry,
  journalEntriesToEdgeEntries,
  normalizeSessionOutcome,
  normalizeSessionProcess,
} from "./journalEntryToEdgeEntry";

function e(over: Partial<AdaptableJournalEntry>): AdaptableJournalEntry {
  return {
    id: "id",
    date: "2026-08-27",
    symbol: "TSLA",
    side: "long",
    entry: 300,
    exit: 305,
    size: 1,
    pnl: 5,
    pct: 1,
    tags: [],
    setup: "",
    ...over,
  };
}

describe("normalizeSessionProcess — current + legacy vocab", () => {
  it("passes through current canon values", () => {
    expect(normalizeSessionProcess("FOLLOWED_PLAN")).toBe("FOLLOWED_PLAN");
    expect(normalizeSessionProcess("BROKE_RULES")).toBe("BROKE_RULES");
  });

  it("maps legacy GREAT/GOOD to FOLLOWED_PLAN", () => {
    expect(normalizeSessionProcess("GREAT")).toBe("FOLLOWED_PLAN");
    expect(normalizeSessionProcess("GOOD")).toBe("FOLLOWED_PLAN");
  });

  it("maps legacy POOR/TERRIBLE to BROKE_RULES", () => {
    expect(normalizeSessionProcess("POOR")).toBe("BROKE_RULES");
    expect(normalizeSessionProcess("TERRIBLE")).toBe("BROKE_RULES");
  });

  it("legacy MID → UNRESOLVED (neither pride nor shame)", () => {
    expect(normalizeSessionProcess("MID")).toBe("UNRESOLVED");
  });

  it("absent / empty / unknown → UNRESOLVED", () => {
    expect(normalizeSessionProcess(undefined)).toBe("UNRESOLVED");
    expect(normalizeSessionProcess(null)).toBe("UNRESOLVED");
    expect(normalizeSessionProcess("")).toBe("UNRESOLVED");
    expect(normalizeSessionProcess("banana")).toBe("UNRESOLVED");
  });

  it("case + whitespace tolerant", () => {
    expect(normalizeSessionProcess("  followed_plan  ")).toBe("FOLLOWED_PLAN");
    expect(normalizeSessionProcess("Broke_Rules")).toBe("BROKE_RULES");
  });
});

describe("normalizeSessionOutcome — pnl-derived", () => {
  it("positive pnl → win", () => {
    expect(normalizeSessionOutcome(1)).toBe("win");
  });

  it("negative pnl → loss", () => {
    expect(normalizeSessionOutcome(-1)).toBe("loss");
  });

  it("zero / undefined / null / NaN → be (canon: absence is not a loss)", () => {
    expect(normalizeSessionOutcome(0)).toBe("be");
    expect(normalizeSessionOutcome(undefined)).toBe("be");
    expect(normalizeSessionOutcome(null)).toBe("be");
    expect(normalizeSessionOutcome(NaN)).toBe("be");
  });
});

describe("journalEntryToEdgeEntry — canon §journalProcess", () => {
  it("maps a clean win into the expected EdgeEntry shape", () => {
    const r = journalEntryToEdgeEntry(e({ pnl: 100, processQuality: "FOLLOWED_PLAN" }));
    expect(r).toEqual({
      date: "2026-08-27",
      result: "win",
      processQuality: "FOLLOWED_PLAN",
    });
  });

  it("a plan-followed loss is still a loss (canon §Loss-as-Data)", () => {
    const r = journalEntryToEdgeEntry(e({ pnl: -50, processQuality: "FOLLOWED_PLAN" }));
    expect(r.result).toBe("loss");
    expect(r.processQuality).toBe("FOLLOWED_PLAN");
  });

  it("a rule-broken win still records BROKE_RULES", () => {
    const r = journalEntryToEdgeEntry(e({ pnl: 100, processQuality: "BROKE_RULES" }));
    expect(r.result).toBe("win");
    expect(r.processQuality).toBe("BROKE_RULES");
  });
});

describe("journalEntriesToEdgeEntries — batch", () => {
  it("preserves input order (needed for focus-streak `current`)", () => {
    const rs = journalEntriesToEdgeEntries([
      e({ id: "a", date: "2026-08-27", pnl: 1 }),
      e({ id: "b", date: "2026-08-26", pnl: -1 }),
      e({ id: "c", date: "2026-08-25", pnl: 0 }),
    ]);
    expect(rs.map((r) => r.date)).toEqual([
      "2026-08-27",
      "2026-08-26",
      "2026-08-25",
    ]);
  });

  it("empty input → empty output", () => {
    expect(journalEntriesToEdgeEntries([])).toEqual([]);
  });
});
