import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * CALL-SITE SENTINEL — one owner for "what is a stored journal record".
 *
 * WHY THIS FILE EXISTS (§22 — a Sentinel that never fires is worthless):
 *
 * `readJournalStorage` validates exactly ONE thing — that the parsed JSON is an
 * array — and hands back `readonly unknown[]`. Five consumers then answered
 * "what is a record" independently, and TWO of them answered it by writing the
 * same guards twice:
 *
 *     function isRecord(v) { return typeof v === "object" && v !== null && !Array.isArray(v) }
 *     typeof r.mfeR === "number" && Number.isFinite(r.mfeR) ? r.mfeR : undefined
 *
 * Those copies had ALREADY DRIFTED by the time they were found. journalEdge
 * Adapter rejected a whitespace-only date (`.trim() !== ""`); the learning
 * genome accepted it (`!r.date` is false for `"  "`). Same stored book, a
 * session on one surface and not the other. That is not a hypothetical cost of
 * duplication — it is the observed one.
 *
 * The unit tests prove the owner answers correctly. Only this file can prove
 * the adapters ASK it rather than re-deriving it.
 */

const SRC = resolve(__dirname, "..", "..");

function read(...parts: string[]): string {
  return readFileSync(resolve(SRC, ...parts), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const ADAPTERS: ReadonlyArray<readonly [string, string[]]> = [
  ["journalEdgeAdapter", ["lib", "proofLane", "journalEdgeAdapter.ts"]],
  ["useLearningGenomeBundle", ["lib", "learningGenome", "useLearningGenomeBundle.ts"]],
];

describe("journal record shape — the rule has exactly one owner", () => {
  for (const [name, path] of ADAPTERS) {
    describe(name, () => {
      const code = read(...path);

      it("imports the owner rather than re-deriving the rule", () => {
        expect(code).toMatch(
          /import \{[\s\S]*?\bisJournalRecord\b[\s\S]*?\} from "@\/lib\/journal\/journalRecordShape"/,
        );
      });

      it("THE DEFECT: no local copy of the object guard", () => {
        // The `typeof x === "object" && x !== null && !Array.isArray(x)` triple
        // is the signature of a hand-rolled record check.
        expect(code).not.toMatch(/!Array\.isArray\(/);
        expect(code).not.toMatch(/function isRecord\b/);
      });

      it("THE DEFECT: no local copy of the finite-number guard", () => {
        // `Number.isFinite` is correct in the owner and nowhere else — an
        // inline copy is a second place the null/string rule can rot.
        expect(code).not.toMatch(/typeof \w+(\.\w+)? === "number" && Number\.isFinite/);
        expect(code).not.toMatch(/function finite\b/);
      });

      it("THE DEFECT: no local copy of the result / dayModel / process narrowing", () => {
        expect(code).not.toMatch(/=== "win" && /);
        expect(code).not.toMatch(/!== "win" && /);
        expect(code).not.toMatch(/=== "M0" \|\| /);
        expect(code).not.toMatch(/=== "FOLLOWED_PLAN" \|\|/);
      });

      it("still reads every field it used to — a fix that drops data is not a fix", () => {
        // Routing through the owner must not quietly narrow the projection.
        for (const field of ["realizedR", "mfeR", "maeR", "processQuality"]) {
          expect(code).toContain(field);
        }
      });
    });
  }

  it("the drift that was found is now impossible: both use the same date rule", () => {
    // Neither adapter may spell the date check itself again.
    for (const [, path] of ADAPTERS) {
      const code = read(...path);
      expect(code).toMatch(/readStoredDate\(/);
      expect(code).not.toMatch(/typeof \w+\.date !== "string"/);
      expect(code).not.toMatch(/\.date\.trim\(\) === ""/);
    }
  });

  it("the owner does NOT project to a target shape", () => {
    // The adapters legitimately build different things (EdgeEntry,
    // MisreadEntry). What they share is the QUESTION, not the answer — an
    // owner that returned a canned record would force one of them to lie.
    const owner = read("lib", "journal", "journalRecordShape.ts");
    expect(owner).not.toMatch(/EdgeEntry|MisreadEntry|JournalEntry/);
  });
});
