/**
 * Megazord §5 P0 acceptance chain, end to end on the pure path the Journal runs:
 *   external trade → journal entry → persisted → read back (paper held out) → provenance + what is missing
 *   → Learning Genome gap → ONE drill → the next week reassessed against this one.
 * Every record is SYNTHETIC: TradingView days typed by a trader, never a broker's fill.
 */
import { describe, expect, it } from "vitest";

import { selectLearningGenome } from "@/lib/learningGenome/selectLearningGenome";
import { prescribeDrill } from "@/lib/learningGenome/prescribeDrill";
import { genomeTrend } from "@/lib/learningGenome/genomeTrend";

import { entryCompleteness } from "./entryCompleteness";
import { hydrateJournalEntries, type JournalEntry } from "./hydrateJournalEntries";
import { liveJournalRecords } from "./paperEntry";
import { entryProvenance } from "./tradeVenue";

const day = (n: number) => `2026-10-${String(n).padStart(2, "0")}T14:35:00.000Z`;
const trade = (id: string, date: string, processQuality: string, realizedR: number | undefined, extra: Record<string, unknown> = {}) => ({
  id, date, symbol: "MNQ", side: "long", entry: 20000, exit: 20010, size: 1, pnl: realizedR === undefined ? 0 : realizedR * 50, pct: 0.05,
  tags: [], notes: "", mood: "neutral", result: (realizedR ?? 0) > 0 ? "win" : "loss", processQuality, processOutcome: "UNRESOLVED",
  starred: false, images: [], voiceSec: 0, setup: "Opening range retest", mistakes: "", lessons: "", emojis: [],
  venue: "TRADINGVIEW", plannedRDollars: realizedR === undefined ? undefined : 50, realizedR, ...extra,
});
const edge = (es: readonly JournalEntry[]) => es.map(e => ({ date: e.date, result: e.result, realizedR: e.realizedR, processQuality: e.processQuality, mfeR: e.mfeR, maeR: e.maeR }));

// Week 1: half the trades never marked, one rule break. Week 2: all marked, mostly to plan — plus a PAPER capture that must not count.
const week1 = [trade("w1a", day(6), "UNRESOLVED", undefined), trade("w1b", day(7), "BROKE_RULES", -1), trade("w1c", day(8), "FOLLOWED_PLAN", 1), trade("w1d", day(9), "UNRESOLVED", undefined)];
const week2 = [trade("w2a", day(13), "FOLLOWED_PLAN", 1.5), trade("w2b", day(14), "FOLLOWED_PLAN", -1), trade("w2c", day(15), "FOLLOWED_PLAN", 2), trade("w2d", day(16), "BROKE_RULES", -1)];
const paper = trade("p1", day(15), "BROKE_RULES", -3, { capture: { environment: { value: "PAPER" } } });

describe("an outside trade is learned from, end to end", () => {
  // Persisted the way the Journal persists: JSON on this device, read back through the paper predicate.
  const stored = JSON.stringify([...week2, paper, ...week1]);
  const book = hydrateJournalEntries(liveJournalRecords(JSON.parse(stored) as unknown[])).entries;
  const w1 = book.filter(e => e.id.startsWith("w1"));
  const w2 = book.filter(e => e.id.startsWith("w2"));

  it("every typed trade survives the round trip with its venue; the paper capture is held out", () => {
    expect(book.map(e => e.id).sort()).toEqual([...week1, ...week2].map(t => t.id).sort());
    expect(book.every(e => e.venue === "TRADINGVIEW")).toBe(true);
  });
  it("each says how the Journal knows it — self-reported, on TradingView", () => {
    const p = entryProvenance({ venue: book[0].venue, hasBrokerCapture: !!book[0].capture });
    expect(p.kind).toBe("SELF_REPORTED");
    expect(p.detail).toMatch(/traded on TradingView/);
  });
  it("an unmarked trade says what it is missing instead of silently dropping out", () => {
    const bare = w1.find(e => e.id === "w1a")!;
    expect(entryCompleteness(bare).gaps.map(g => g.id)).toEqual(expect.arrayContaining(["PROCESS", "PLANNED_RISK"]));
  });
  it("the genome finds the gap, and exactly one drill is prescribed for it", () => {
    const g1 = selectLearningGenome(edge(w1));
    expect(g1.weakest).toBeDefined();
    const drill = prescribeDrill(g1)!;
    expect(drill.dimension).toBe(g1.weakest);
    expect(drill.drill.length).toBeGreaterThan(0);
  });
  it("the next week is reassessed against this one — and process is read apart from outcome", () => {
    const g1 = selectLearningGenome(edge(w1));
    const g2 = selectLearningGenome(edge(w2));
    expect(g1.perception.score).toBe(0.5);
    expect(g2.perception.score).toBe(1);
    expect(genomeTrend(g2, g1).perception.direction).toBe("IMPROVING");
    // A plan-followed LOSS still counts as following the plan (process ≠ outcome).
    expect(g2.reasoning.score).toBe(0.75);
  });
});
