/**
 * CALL-SITE SENTINEL — /morning-prep must ask the one projection, and must
 * disclose what it skipped.
 *
 * The unit tests prove the owner answers correctly. They cannot prove the
 * badge stopped running its own map, and they cannot prove the coverage note
 * reaches the screen. Both were true failures here: a SECOND stored-record map
 * lived in the app tree, and the records it dropped were dropped silently.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const MORNING = join(ROOT, "src", "app", "morning-prep", "page.tsx");
const OWNER = join(ROOT, "src", "lib", "proofLane", "journalEdgeAdapter.ts");
const JOURNAL = join(ROOT, "src", "app", "journal", "page.tsx");

function code(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("/morning-prep asks the one projection", () => {
  const page = code(MORNING);

  it("calls it", () => {
    expect(page).toMatch(/projectJournalRecordsToEdge\(/);
  });

  it("imports it from the owner, not from a local copy", () => {
    expect(page).toMatch(
      /import \{[^}]*projectJournalRecordsToEdge[^}]*\} from "@\/lib\/proofLane\/journalEdgeAdapter"/,
    );
  });

  it("hands it the raw records — no cast on the way in", () => {
    // `read.records as readonly AdaptableJournalEntry[]` was the door the
    // second projection came through. The whole point of an unknown[] owner is
    // that the caller does not get to assert a shape first.
    expect(page).not.toMatch(/read\.records as /);
  });

  it("no longer derives an outcome from pnl itself", () => {
    expect(page).not.toMatch(/pnl\s*>\s*0/);
    expect(page).not.toMatch(/normalizeSessionOutcome/);
  });

  it("does not spell the three outcomes into the page", () => {
    expect(page).not.toMatch(/"win"[\s\S]{0,40}"loss"[\s\S]{0,40}"be"/);
  });
});

describe("§24 D — what was skipped reaches the screen", () => {
  const raw = readFileSync(MORNING, "utf8");
  const page = code(MORNING);

  it("the coverage is kept, not discarded at the projection", () => {
    expect(page).toMatch(/projection\.coverage/);
  });

  it("and it is RENDERED — computing it and dropping it is the old silence", () => {
    expect(page).toMatch(/\{coverage\.note\}/);
  });

  it("the badge still appears when the streaks are zero but records were skipped", () => {
    // "you have no streak" and "WM could not read four of your records" render
    // identically on a component that returns null. The early return must
    // consider coverage.
    const guard = page.match(/if \(focusStreak\.current === 0[^\n]*\n?[^\n]*return null;/);
    expect(guard).not.toBeNull();
    expect(guard![0]).toMatch(/coverage/);
  });

  it("the note is not rewritten beside the badge", () => {
    // One sentence, one owner. /journal will show the same words.
    expect(page).not.toMatch(/could be read/);
    expect(page).not.toMatch(/left (it|them) out/);
  });

  it("§9: the disclosure is quiet — nothing failed, WM refused to guess", () => {
    const at = raw.indexOf("{coverage.note}");
    expect(at).toBeGreaterThan(-1);
    const block = raw.slice(Math.max(0, at - 500), at + 200);
    expect(block).not.toMatch(/wm-red|text-red|bg-red|role="alert"/);
    expect(block).toMatch(/text-wm-text-dim/);
  });
});

describe("H21 — one projection, and the dead one is deleted", () => {
  it("the second adapter file is gone", () => {
    expect(
      existsSync(join(ROOT, "src", "lib", "traderMemory", "adapters", "journalEntryToEdgeEntry.ts")),
    ).toBe(false);
  });

  it("nothing imports it any more", () => {
    for (const file of [MORNING, JOURNAL]) {
      expect(readFileSync(file, "utf8")).not.toMatch(/journalEntryToEdgeEntry/);
    }
  });

  it("the owner still delegates record-shape questions rather than answering them", () => {
    const owner = code(OWNER);
    expect(owner).toMatch(/from "@\/lib\/journal\/journalRecordShape"/);
    // No third copy of the guards that Atom 6 gave an owner.
    expect(owner).not.toMatch(/!Array\.isArray\(/);
    expect(owner).not.toMatch(/Number\.isFinite/);
    expect(owner).not.toMatch(/\.trim\(\) !== ""/);
  });

  it("the pnl fallback refuses zero, in source as well as in behaviour", () => {
    // Behaviour is tested; this pins the REASON in place, because a future
    // reader deleting `|| pnl === 0` would pass every other test in the suite
    // except the one that names the bug.
    expect(code(OWNER)).toMatch(/pnl === 0/);
  });
});
