/**
 * Journal "Reference an FVG" → entry save → reload. The proof scene is read
 * only (nothing can be saved there) and WM never writes on the Founder's
 * account, so the save path is proved here: real references from the one
 * as-of accessor, through the Journal's own bytes, back through its own reader.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { JOURNAL_STORAGE_KEY, readJournalStorage } from "@/lib/traderMemory/adapters/journalStorage";
import { fvgReferenceSentence, readJournalFvgReference } from "./fvgDecisionReference";
import { hydrateJournalEntries } from "./hydrateJournalEntries";
import { journalFixture } from "./journalProofFixture";
import { fvgAnswersFromReference } from "./planFvgContext";

const SRC = path.resolve(__dirname, "../..");
function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}
/** A journal entry as the page's form builds it (`{ ...form }`), carrying a reference. */
const entryWith = (id: string, fvgRef: unknown) => ({
  id, date: "2026-01-05", symbol: "SAMPLE-FVG", side: "long", entry: 100, exit: 101, size: 1, pnl: 1, pct: 1, tags: [], notes: "", mood: "neutral", result: "win",
  processQuality: "UNRESOLVED", processOutcome: "UNRESOLVED", starred: false, images: [], voiceSec: 0, setup: "SAMPLE", mistakes: "", lessons: "", emojis: [], fvgRef,
});

describe("Reference an FVG → save → reload: the same snapshot comes back", () => {
  const refs = journalFixture().entries.map(e => e.fvgRef);   // 24 real references read through fvgReferenceAtDecision

  it("all 24 references survive the Journal's own save bytes and reader, deep-equal, with the same sentence and Review answers", () => {
    expect(refs.length).toBe(24);
    const st = mem();
    st.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(refs.map((r, i) => entryWith(`e${i}`, r))));       // the page's persistence effect
    const reloaded = hydrateJournalEntries(readJournalStorage(st).records).entries;                    // the page's load
    expect(reloaded.length).toBe(24);
    reloaded.forEach((e, i) => {
      expect(e.fvgRef).toEqual(refs[i]);
      expect(fvgReferenceSentence(e.fvgRef!)).toBe(fvgReferenceSentence(refs[i]));
      expect(fvgAnswersFromReference(e.fvgRef!)).toEqual(fvgAnswersFromReference(refs[i]));
      expect(e.fvgRef!.readAsOfMs).toBeLessThanOrEqual(e.fvgRef!.decisionAtMs);   // still as of the decision
    });
    // A second save → reload changes nothing (stable bytes).
    const st2 = mem();
    st2.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(reloaded));
    expect(hydrateJournalEntries(readJournalStorage(st2).records).entries.map(e => e.fvgRef)).toEqual(refs);
  });

  it("a damaged stored reference is dropped whole — the entry survives, never a partial or guessed snapshot", () => {
    const st = mem();
    const bad = { ...refs[0], snapshot: { ...refs[0].snapshot, top: refs[0].snapshot.bottom } };   // top ≤ bottom is not a gap
    st.setItem(JOURNAL_STORAGE_KEY, JSON.stringify([entryWith("ok", refs[0]), entryWith("bad", bad), entryWith("tag-only", "FVG = YES")]));
    const [ok, damaged, tag] = hydrateJournalEntries(readJournalStorage(st).records).entries;
    expect(ok.fvgRef).toEqual(refs[0]);
    expect(damaged.id).toBe("bad");
    expect(damaged.fvgRef).toBeUndefined();
    expect(tag.fvgRef).toBeUndefined();
    expect(readJournalFvgReference(bad)).toBeNull();
  });

  it("the page's save path carries the reference: the field writes form.fvgRef, saveEntry spreads the form, the store writes the entries, the loader reads the reference", () => {
    const page = readFileSync(path.join(SRC, "app/journal/page.tsx"), "utf8");
    expect(page.length).toBeGreaterThan(50_000);
    expect(page).toContain("onChange={ref => setForm(f => ({ ...f, fvgRef: ref }))}");
    expect(page).toContain("const e = { ...(form as JournalEntry) };");
    expect(page).toContain("localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));");
    expect(readFileSync(path.join(SRC, "lib/journal/hydrateJournalEntries.ts"), "utf8")).toContain("readJournalFvgReference(value.fvgRef)");
    // The proof scene cannot stand in for this: it is read only by construction.
    expect(readFileSync(path.join(SRC, "components/journal/JournalProofScene.tsx"), "utf8")).not.toMatch(/setItem\(|writeStoryReview|JournalFvgReferenceField/);
  });
});
