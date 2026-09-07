/**
 * CALL-SITE SENTINEL — /journal must READ its book, and must say what it could
 * not open.
 *
 * The unit tests prove the reader is correct. They cannot prove /journal calls
 * it, and they cannot prove the coverage note reaches the screen. Both were the
 * actual failure: the cast lived on the page, and what it dropped was dropped
 * in silence.
 *
 * This is also the LAST of the three casts named in journalRecordShape.ts. When
 * a fourth appears it will be here, not in a header comment.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const JOURNAL = join(ROOT, "src", "app", "journal", "page.tsx");
const OWNER = join(ROOT, "src", "lib", "journal", "hydrateJournalEntries.ts");
const MORNING = join(ROOT, "src", "app", "morning-prep", "page.tsx");
const HOOK = join(ROOT, "src", "lib", "traderMemory", "adapters", "useJournalSnapshots.ts");

function code(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("/journal reads its book instead of asserting it", () => {
  const page = code(JOURNAL);

  it("calls the reader", () => {
    expect(page).toMatch(/hydrateJournalEntries\(/);
  });

  it("imports it from the owner, not a local copy", () => {
    expect(page).toMatch(
      /import \{[^}]*hydrateJournalEntries[^}]*\} from "@\/lib\/journal\/hydrateJournalEntries"/,
    );
  });

  it("the cast is gone", () => {
    expect(page).not.toMatch(/read\.records as /);
    expect(page).not.toMatch(/as JournalEntry\[\]/);
  });

  it("and the entry shape is no longer declared twice", () => {
    // Two copies of a type is how the page and the reader drift apart, and the
    // reader is the only one of the two that can actually prove the shape.
    expect(page).not.toMatch(/interface JournalEntry \{/);
    expect(page).not.toMatch(/interface NectarSnapshot \{/);
    expect(page).not.toMatch(/type Mood =/);
    expect(page).not.toMatch(/type TradeResult =/);
  });
});

describe("§24 D — the records it could not open reach the screen", () => {
  const raw = readFileSync(JOURNAL, "utf8");
  const page = code(JOURNAL);

  it("the coverage is kept, not discarded at the read", () => {
    expect(page).toMatch(/hydration\.coverage/);
  });

  it("and it is RENDERED — computing it and dropping it is the old silence", () => {
    expect(page).toMatch(/\{hydrationCoverage\.note\}/);
  });

  it("it is a SECOND note, not a replacement for the unreadable-total one", () => {
    // Different refusals: one is rows WM could not price, the other is rows it
    // could not open at all. Collapsing them would hide whichever came second.
    expect(page).toMatch(/\{recordedTotal\.note\}/);
  });

  it("the sentence is not rewritten on the page — one owner, one wording", () => {
    expect(page).not.toMatch(/could be read/);
    expect(page).not.toMatch(/Nothing was deleted/);
  });

  it("§9: the disclosure is quiet — nothing failed, WM refused to guess", () => {
    const at = raw.indexOf("{hydrationCoverage.note}");
    expect(at).toBeGreaterThan(-1);
    const block = raw.slice(Math.max(0, at - 400), at + 200);
    expect(block).not.toMatch(/wm-red|text-red|bg-red|role="alert"/);
    expect(block).toMatch(/text-wm-text-dim/);
  });
});

describe("the reader delegates rather than answering shape questions itself", () => {
  const owner = code(OWNER);

  it("asks journalRecordShape", () => {
    expect(owner).toMatch(/from "\.\/journalRecordShape"/);
  });

  it("no fourth private copy of the guards", () => {
    expect(owner).not.toMatch(/Number\.isFinite/);
    expect(owner).not.toMatch(/\.trim\(\) !== ""/);
    expect(owner).not.toMatch(/typeof \w+ === "object" && \w+ !== null/);
  });

  it("processQuality can never fall back to FOLLOWED_PLAN", () => {
    // The one direction this may never fail in: crediting the trader with
    // discipline he did not record.
    expect(owner).not.toMatch(/\?\?\s*"FOLLOWED_PLAN"/);
    expect(owner).toMatch(/\?\?\s*"UNRESOLVED"/);
  });

  it("the outcome is not derived from pnl at load time", () => {
    // classifyProcessOutcome owns that question, and the journal calls it at
    // SAVE time. A reader that also derived it would give the same record two
    // answers depending on which one ran last.
    expect(owner).not.toMatch(/classifyProcessOutcome/);
    expect(owner).not.toMatch(/pnl\s*>\s*0/);
  });
});

describe("all three casts named in journalRecordShape.ts are now gone", () => {
  it("none of the three call sites asserts a shape on read.records", () => {
    for (const file of [JOURNAL, MORNING, HOOK]) {
      expect(code(file)).not.toMatch(/read\.records as /);
    }
  });
});
