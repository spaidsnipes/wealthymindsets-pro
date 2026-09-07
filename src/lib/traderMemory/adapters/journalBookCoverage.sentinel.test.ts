/**
 * SOURCE SENTINELS FOR THE COVERAGE SPLIT.
 *
 * Behaviour cannot see three of the four things this atom is actually about:
 * that the deck RENDERS the note rather than merely computing it, that the
 * render is not gated behind the very emptiness it explains, that the count is
 * not `total - snapshots`, and that there is ONE storage subscription rather
 * than two hooks racing to describe the same read.
 *
 * Atom 11 proved why this file has to exist: a break that replaced the shape
 * owner's guard with a private copy was BEHAVIOURALLY IDENTICAL and passed
 * every unit test. A duplicated rule does not announce itself by failing. It
 * announces itself six months later when one copy is fixed and the others
 * are not.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const HOOK = read("src/lib/traderMemory/adapters/useJournalSnapshots.ts");
const DECK = read("src/app/command-deck/page.tsx");

/**
 * Source with comments and import paths removed.
 *
 * Both of these bit on the first run and BOTH were the assertion's fault, not
 * the code's: the hook's own doc comment names `total - snapshots` in order to
 * forbid it, and the deck imports from a module whose FILENAME is
 * `useJournalSnapshots.ts`. Matching prose or a path and calling it a
 * violation is how a sentinel earns a reputation for lying, which is how it
 * gets deleted. Narrowed to executable code — never relaxed.
 */
function codeOf(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*import[\s\S]*?from\s*["'][^"']*["'];\s*$/gm, "");
}

const HOOK_CODE = codeOf(HOOK);
const DECK_CODE = codeOf(DECK);

describe("the count is what hydration refused, never total-minus-snapshots", () => {
  it("the hook does no subtraction against the snapshot array", () => {
    // `records.length - snapshots.length` is the wrong number: an M0 no-trade
    // day hydrates and legitimately is not a decision.
    expect(HOOK_CODE).not.toMatch(/snapshots\.length/);
    expect(HOOK_CODE).not.toMatch(/-\s*snapshots/);
    expect(HOOK_CODE).not.toMatch(/\.length\s*-\s*/);
  });

  it("coverage comes from the hydration, not from a local tally", () => {
    expect(HOOK).toMatch(/coverage:\s*hydration\.coverage/);
    expect(HOOK).not.toMatch(/describeRecordCoverage/);
  });

  it("the hook still asks the shape owner rather than re-deriving records", () => {
    expect(HOOK).toMatch(/hydrateJournalEntries\(read\.records\)/);
    expect(HOOK).not.toMatch(/isJournalRecord/);
    expect(HOOK).not.toMatch(/Number\.isFinite/);
  });

  it("no fourth cast — the reason all of this exists", () => {
    expect(HOOK).not.toMatch(/read\.records as /);
  });
});

describe("one subscription, not two", () => {
  it("useJournalSnapshots delegates to useJournalBook", () => {
    expect(HOOK).toMatch(/useJournalSnapshots\([\s\S]*?\)\s*:\s*readonly DecisionMemorySnapshot\[\]\s*\{\s*return useJournalBook\(ownerId\)\.snapshots;/);
  });

  it("there is exactly one storage listener registration in the file", () => {
    // Two hooks each subscribing to the same key on the same mount is how a
    // surface renders a note that describes a different read than its list.
    expect(HOOK.match(/addEventListener/g) ?? []).toHaveLength(2); // event + storage
    expect(HOOK.match(/useEffect\(/g) ?? []).toHaveLength(1);
  });
});

describe("the deck SAYS it, and says it when it matters most", () => {
  it("the deck consumes the book, not the bare snapshots", () => {
    expect(DECK).toMatch(/useJournalBook\(/);
    // The bare-snapshot hook is not CALLED here. (Its name still appears in
    // the import path, which is the module's filename, not a usage.)
    expect(DECK_CODE).not.toMatch(/useJournalSnapshots\s*\(/);
    expect(DECK).toMatch(/coverage:\s*journalCoverage/);
  });

  it("the note is RENDERED, not merely destructured", () => {
    expect(DECK).toMatch(/\{journalCoverage\.note\}/);
  });

  it("the note is not gated behind sessionDecisions.length", () => {
    // A book whose records were ALL unreadable produces zero decisions. That
    // is the exact case where silence reads as 'you have no history' instead
    // of 'WM could not read it'. §24 D: refusal may not be quiet.
    // TIGHTENED after this assertion FAILED TO FIRE. The first version
    // anchored `sessionDecisions.length > 0 &&` to end-of-slice, so moving the
    // gate onto the same line as the note check sailed straight through. A
    // sentinel that only catches the tidy spelling of a defect is decoration.
    // Now: isolate the ENTIRE JSX condition and require it to mention nothing
    // but the note.
    const at = DECK.indexOf("{journalCoverage.note}");
    expect(at).toBeGreaterThan(0);
    const open = DECK.lastIndexOf("{", DECK.lastIndexOf("&& (", at));
    const condition = DECK.slice(open, DECK.indexOf("&& (", open));
    expect(condition).toMatch(/journalCoverage\.note != null/);
    expect(condition).not.toMatch(/sessionDecisions/);
    expect(condition).not.toMatch(/\.length/);
  });

  it("§9 — the disclosure is quiet, and is a note rather than an alert", () => {
    const at = DECK.indexOf("{journalCoverage.note}");
    const window_ = DECK.slice(Math.max(0, at - 500), at + 200);
    expect(window_).toMatch(/role="note"/);
    expect(window_).not.toMatch(/role="alert"/);
    expect(window_).toMatch(/text-wm-text-dim/);
    expect(window_).not.toMatch(/red|#ef4444|danger|text-wm-loss/i);
    // Nothing failed. WM refused to guess.
    expect(window_).not.toMatch(/ERROR|FAILED|INVALID|CORRUPT/);
  });
});

describe("the sentence has one owner", () => {
  it("neither the deck nor the hook rewrites the disclosure wording", () => {
    for (const src of [DECK, HOOK]) {
      expect(src).not.toMatch(/could be read/);
      expect(src).not.toMatch(/Nothing was deleted/);
    }
  });
});
