/**
 * SOURCE SENTINEL — the cast is the defect, and behaviour tests cannot see it.
 *
 * Every failure this atom fixed was reachable only because
 * `read.records as readonly AdaptableJournalEntry[]` told the compiler that
 * bytes in a browser's localStorage had a shape nobody checked. A future edit
 * can re-add that one line and every behavioural test above still passes,
 * because the tests hand the adapter values the compiler already believes.
 *
 * So the cast itself is pinned here, along with the two guards a reader is most
 * likely to "simplify" back into the bugs they replaced.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const HERE = __dirname;
const ROOT = join(HERE, "..", "..", "..", "..");
const HOOK = join(HERE, "useJournalSnapshots.ts");
const ADAPTER = join(HERE, "journalEntryToSnapshot.ts");
const SHAPE = join(ROOT, "src", "lib", "journal", "journalRecordShape.ts");

function code(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("the door the bad records came through is shut", () => {
  const hook = code(HOOK);

  it("useJournalSnapshots does not cast the stored records", () => {
    expect(hook).not.toMatch(/read\.records as /);
    expect(hook).not.toMatch(/as readonly AdaptableJournalEntry/);
  });

  it("it hands the raw unknown[] straight to the adapter", () => {
    expect(hook).toMatch(/journalEntriesToSnapshots\(\s*read\.records\s*,/);
  });

  it("and it no longer needs the entry type at all", () => {
    expect(hook).not.toMatch(/AdaptableJournalEntry/);
  });
});

describe("the adapter asks the one record-shape owner", () => {
  const adapter = code(ADAPTER);

  it("imports the shape guards rather than growing a fourth copy", () => {
    expect(adapter).toMatch(/from "@\/lib\/journal\/journalRecordShape"/);
  });

  it("takes unknown, not an asserted entry type", () => {
    expect(adapter).toMatch(/record: unknown,/);
    expect(adapter).toMatch(/entries: readonly unknown\[\]/);
  });

  it("does not re-implement the guards the owner already answers", () => {
    // `Number.isFinite` survives in exactly one place: the derived R, which is
    // arithmetic on already-validated numbers, not a shape question.
    const finiteChecks = adapter.match(/Number\.isFinite/g) ?? [];
    expect(finiteChecks.length).toBeLessThanOrEqual(2);
    expect(adapter).not.toMatch(/typeof record\.\w+ === "number"/);
    expect(adapter).not.toMatch(/typeof \w+ === "object" && \w+ !== null/);
  });

  it("the side has no default branch — absence is refused, not turned into SHORT", () => {
    // This is the exact expression that invented a short:
    expect(adapter).not.toMatch(/record\.side === "long" \? "LONG" : "SHORT"/);
    expect(adapter).not.toMatch(/entry\.side === "long"/);
    // and the refusal must survive:
    expect(adapter).toMatch(/if \(side === undefined\) return null;/);
  });

  it("the derived R is never floored to zero", () => {
    // The old line was `Number.isFinite(scaleFreeR) ? Number(...) : 0`. A reader
    // restoring that `: 0` would silently report unknown-return trades as flat
    // ones again.
    //
    // This assertion is here because an EARLIER version of it did not fire when
    // that exact `: 0` was restored during break/recover: it pinned an
    // assignment to `realizedR`, and the floor actually lives in the derive
    // function's RETURN. Pin the return.
    const derive = adapter.slice(adapter.indexOf("function derivePnlR"));
    expect(derive).toMatch(/if \(pnl === undefined\) return undefined;/);
    expect(derive).not.toMatch(/Number\.isFinite\([^)]*\) \?[^;]*:\s*0;/);
    expect(adapter).toMatch(/realizedR !== undefined/);
  });

  it("the id is read, not passed through from a property access", () => {
    expect(adapter).not.toMatch(/decisionId: entry\.id/);
    expect(adapter).toMatch(/readStoredText\(record\.id\)/);
  });
});

describe("the shape owner owns the side question, and only once", () => {
  const shape = code(SHAPE);

  it("readStoredSide exists there", () => {
    expect(shape).toMatch(/export function readStoredSide\(/);
  });

  it("it recognises exactly the two sides the journal writes", () => {
    expect(shape).toMatch(/value === "long" \|\| value === "short"/);
  });

  it("readStoredDate delegates rather than repeating the non-empty-string rule", () => {
    // Two copies of one rule is how the first stops being true — the reason
    // this module exists at all.
    expect(shape).toMatch(/export function readStoredDate\([^)]*\)[^{]*\{\s*return readStoredText\(value\);/);
  });
});

describe("no surface reintroduced a private copy of the projection", () => {
  it("nothing outside the adapter maps stored records into snapshots itself", () => {
    for (const rel of [
      ["src", "app", "journal", "page.tsx"],
      ["src", "app", "morning-prep", "page.tsx"],
      ["src", "app", "command-deck", "page.tsx"],
      ["src", "lib", "marketData", "viewModels", "useMarketCanvasVM.ts"],
    ]) {
      const src = readFileSync(join(ROOT, ...rel), "utf8");
      expect(src).not.toMatch(/journalEntryToSnapshot\(/);
    }
  });
});
