import { describe, it, expect } from "vitest";
import {
  journalEntryToSnapshot,
  journalEntriesToSnapshots,
  type AdaptableJournalEntry,
} from "../journalEntryToSnapshot";

const OWNER = "owner-1";

const base = (over: Partial<AdaptableJournalEntry> = {}): AdaptableJournalEntry => ({
  id: "j1",
  date: "2026-08-14",
  symbol: "TSLA",
  side: "long",
  entry: 100,
  exit: 102,
  size: 10,
  pnl: 20,
  pct: 2,
  tags: [],
  setup: "CLC Long",
  processQuality: "GREAT",
  processOutcome: "PROFESSIONAL_WIN",
  ...over,
});

describe("journalEntryToSnapshot", () => {
  it("basic long trade with profit", () => {
    const s = journalEntryToSnapshot(base(), OWNER);
    expect(s).not.toBeNull();
    expect(s!.decisionId).toBe("j1");
    expect(s!.ownerId).toBe(OWNER);
    expect(s!.plan.action).toBe("ENTER_LONG");
    expect(s!.outcome?.realizedR).toBeGreaterThan(0);
    expect(s!.ruleAdherenceAtDecision).toBe(true);
  });

  it("short trade with loss", () => {
    const s = journalEntryToSnapshot(base({
      side: "short",
      entry: 100,
      exit: 105,
      pnl: -50,
      processQuality: "POOR",
    }), OWNER);
    expect(s).not.toBeNull();
    expect(s!.plan.action).toBe("ENTER_SHORT");
    expect(s!.marketStateSummary.direction).toBe("SHORT");
    expect(s!.outcome?.realizedR).toBeLessThan(0);
    expect(s!.ruleAdherenceAtDecision).toBe(false);
  });

  it("returns null on missing symbol", () => {
    expect(journalEntryToSnapshot(base({ symbol: "" }), OWNER)).toBeNull();
  });

  it("returns null on invalid entry price", () => {
    expect(journalEntryToSnapshot(base({ entry: 0 }), OWNER)).toBeNull();
    expect(journalEntryToSnapshot(base({ entry: NaN }), OWNER)).toBeNull();
  });

  it("returns null on invalid date", () => {
    expect(journalEntryToSnapshot(base({ date: "not-a-date" }), OWNER)).toBeNull();
  });

  it("open trade (exit=0) produces snapshot with NO outcome", () => {
    const s = journalEntryToSnapshot(base({ exit: 0, pnl: 0 }), OWNER);
    expect(s).not.toBeNull();
    expect(s!.outcome).toBeUndefined();
  });

  it("processQuality UNRESOLVED → no review attached", () => {
    const s = journalEntryToSnapshot(base({ processQuality: "UNRESOLVED" }), OWNER);
    expect(s!.review).toBeUndefined();
  });

  it("playbookId derives from setup, kebab-cased", () => {
    expect(journalEntryToSnapshot(base({ setup: "CLC Long" }), OWNER)!.playbookId).toBe("clc-long");
    expect(journalEntryToSnapshot(base({ setup: "VWAP Reclaim" }), OWNER)!.playbookId).toBe("vwap-reclaim");
    expect(journalEntryToSnapshot(base({ setup: "" }), OWNER)!.playbookId).toBe("unspecified");
  });

  it("owner scoping — ownerId always matches caller, never fabricated", () => {
    const s = journalEntryToSnapshot(base(), "different-owner");
    expect(s!.ownerId).toBe("different-owner");
  });

  it("determinism — same input produces same output", () => {
    const entry = base();
    const s1 = journalEntryToSnapshot(entry, OWNER);
    const s2 = journalEntryToSnapshot(entry, OWNER);
    expect(s1).toEqual(s2);
  });
});

describe("journalEntriesToSnapshots", () => {
  it("batch converts + drops nulls + sorts chronologically", () => {
    const entries: AdaptableJournalEntry[] = [
      base({ id: "b", date: "2026-08-14" }),
      base({ id: "a", date: "2026-08-13" }),
      base({ id: "invalid", symbol: "" }),
      base({ id: "c", date: "2026-08-15" }),
    ];
    const snaps = journalEntriesToSnapshots(entries, OWNER);
    expect(snaps.map((s) => s.decisionId)).toEqual(["a", "b", "c"]);
  });

  it("empty input → empty output", () => {
    expect(journalEntriesToSnapshots([], OWNER)).toEqual([]);
  });
});
