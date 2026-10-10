/**
 * PAPER IS NEVER MIXED INTO LIVE RESULTS (coordinator ruling 2026-10-10).
 *
 * Every module that READS THE JOURNAL BOOK — by its storage reader, its raw reader, its key, its hydrator or its
 * book hook — must route through the one predicate in paperEntry.ts, or be listed below with the reason it may
 * see paper records (the book's own storage, an export of the whole book, a proof of save/reload, a hook whose
 * results are already live). A NEW reader that does neither fails here.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { PAPER_ENVIRONMENT, isPaperEntry, liveJournalRecords, paperRecordCount } from "./paperEntry";

const ROOT = path.resolve(process.cwd(), "src");
const READ = /\b(readJournalStorage|readJournalRaw|readJournalBook|useJournalBook|useJournalSnapshots|hydrateJournalEntries|journalStorageKeys|compilePnlStats)\(/;
const ROUTED = /from "@\/lib\/journal\/paperEntry"|from "\.\/paperEntry"/;

/** Readers allowed to see paper records, each with its reason. */
const EXEMPT: Readonly<Record<string, string>> = {
  "lib/traderMemory/adapters/journalStorage.ts": "the book's own storage — it reads and writes every record",
  "lib/journal/hydrateJournalEntries.ts": "the shape reader — decides what a record IS, not what counts",
  "lib/journal/journalRoundTrip.ts": "proof that a save survives a reload — compares records, computes no result",
  "components/layout/shellPanels.tsx": "Export All Data — the whole book, by design",
  "lib/traderMemory/useSessionDecisions.ts": "consumes useJournalBook, whose snapshots are already live; its entries feed the review question only",
  "components/chart/PnLStatsPanel.tsx": "reads the raw bytes and hands them to compilePnlStats, which leaves paper out",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(n) && !/\.test\.(ts|tsx)$/.test(n)) out.push(p);
  }
  return out;
}
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const readers = walk(ROOT).map(p => ({ rel: path.relative(ROOT, p).split(path.sep).join("/"), src: readFileSync(p, "utf8") }))
  .filter(f => f.rel !== "lib/journal/paperEntry.ts" && READ.test(code(f.src)));

it("scan proof: the scan finds the journal-book readers it is meant to police", () => {
  expect(walk(ROOT).length).toBeGreaterThan(500);
  // Vacuity guard: the known readers are found — if the patterns stop matching, this fails instead of passing empty.
  const names = readers.map(r => r.rel);
  for (const known of ["app/journal/page.tsx", "app/profile/page.tsx", "lib/traderMemory/adapters/useJournalSnapshots.ts", "lib/proofLane/readJournalEdge.ts", "lib/learningGenome/useLearningGenomeBundle.ts", "lib/chart/pnlStatsFacts.ts"]) {
    expect(names, known).toContain(known);
  }
  expect(readers.length).toBeGreaterThanOrEqual(12);
});

describe("every reader of the journal book routes through the paper predicate, or says why it may not", () => {
  it("no reader is unaccounted for", () => {
    const loose = readers.filter(r => !EXEMPT[r.rel] && !ROUTED.test(r.src)).map(r => r.rel);
    expect(loose).toEqual([]);
  });
  it("every exemption is a real reader (no stale entries)", () => {
    const names = new Set(readers.map(r => r.rel));
    for (const k of Object.keys(EXEMPT)) expect(names.has(k), k).toBe(true);
  });
  it("the results readers USE the predicate, not just import it", () => {
    for (const r of readers.filter(x => !EXEMPT[x.rel])) {
      expect(code(r.src), r.rel).toMatch(/\b(liveJournalRecords|isPaperEntry)\(/);
    }
  });
});

describe("the predicate", () => {
  const paper = { id: "p", capture: { environment: { value: PAPER_ENVIRONMENT, provenance: "BROKER-REPORTED", source: "Alpaca paper order readback" } } };
  const live = { id: "l", capture: { environment: { value: "PRODUCTION", provenance: "TICKET-INTENT", source: "x" } } };
  it("a record is paper only when its capture says the environment was PAPER", () => {
    expect(isPaperEntry(paper)).toBe(true);
    for (const r of [live, { id: "n" }, null, "x", { capture: null }, { capture: { environment: null } }, { capture: { environment: { value: "paper" } } }]) expect(isPaperEntry(r)).toBe(false);
  });
  it("live records keep their order; the paper count is said", () => {
    expect(liveJournalRecords([live, paper, { id: "n" }])).toEqual([live, { id: "n" }]);
    expect(paperRecordCount([live, paper, paper])).toBe(2);
  });
});
