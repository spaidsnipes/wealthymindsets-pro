/**
 * Execution-receipt single-renderer Sentinel — canon (Aug-30) "... WHY/evidence
 * view -> AI Execution Receipt ...".
 *
 * The WHY/evidence view has exactly one honest composer: executionReceiptView
 * (which runs the defensive parser, then the truthful line / tone / evidence
 * formatters). A surface that reaches PAST that composer to the raw formatters
 * (formatExecutionReceiptLine / formatExecutionReceiptWhy / executionResultTone)
 * could re-assemble a receipt view by hand — and a hand-assembled view is
 * exactly where overclaim creeps back in (e.g. showing a broker line for a
 * DENIED verdict). This is the same drift class that let a SECOND ungated order
 * route ship: one wiring path was covered, a sibling path was not.
 *
 * This Sentinel walks src/app and src/components and FAILS if any file imports
 * the raw formatters directly. Everyone renders a receipt through
 * executionReceiptView / ExecutionReceiptCard, or not at all.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SRC_ROOT = resolve(__dirname, "..", "..");
const SCAN_ROOTS = ["app", "components"].map((d) => join(SRC_ROOT, d));

/** The raw formatters a surface must NOT import directly. */
const RAW_FORMATTERS = [
  "formatExecutionReceiptLine",
  "formatExecutionReceiptWhy",
  "executionResultTone",
];

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next" || name === ".open-next") continue;
      walk(p, acc);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      acc.push(p);
    }
  }
  return acc;
}

/** The module the raw formatters live in — the import source being policed. */
const FORMATTER_MODULE = "formatExecutionReceipt";

/**
 * The ONE file allowed to import the raw formatters: the honest composer.
 * It lives in src/lib/authority, outside SCAN_ROOTS, which is exactly why it is
 * legitimate — and why it makes the right POSITIVE CONTROL specimen below.
 */
const COMPOSER = "lib/authority/executionReceiptView.ts";

/** The rendered surface the rule must be able to see, or it is scanning the wrong tree. */
const CANONICAL_SURFACE = "components/authority/ExecutionReceiptCard.tsx";

/** Does this file import a raw formatter from the formatExecutionReceipt module? */
function importsRawFormatter(content: string): boolean {
  if (!content.includes(FORMATTER_MODULE)) return false;
  return RAW_FORMATTERS.some((name) => new RegExp(`\\b${name}\\b`).test(content));
}

/** Walked ONCE so the guard below and the rule agree on what was scanned. */
const ALL_FILES = SCAN_ROOTS.flatMap((root) => walk(root));

describe("Execution receipt has one honest renderer — surfaces go through the composer", () => {
  const files = ALL_FILES;

  /**
   * ANTI-VACUITY — added 2026-09-19, paying down the frozen debt recorded in
   * `src/lib/ops/sentinelsProveTheyScanned.test.ts`.
   *
   * The rule below asserts a collection is EMPTY, and it is a LATENT rule — it
   * is SUPPOSED to find nothing today. "Nothing found" is therefore the expected
   * answer and tells you nothing about whether the scan still functions. Two
   * specific ways it can go quietly vacuous:
   *
   *   1. SCOPE. `SCAN_ROOTS` is hardcoded to `src/app` and `src/components`. If
   *      receipt surfaces move (a `src/features/` or `src/ui/` reorganisation,
   *      an app-router restructure), the walk keeps succeeding on two directories
   *      that no longer contain the surfaces, and the rule polices a tree with
   *      nothing in it.
   *   2. VOCABULARY. `importsRawFormatter` is a two-stage NAME match: the file
   *      must mention `formatExecutionReceipt` AND one of the three exported
   *      formatter names. Rename `formatExecutionReceiptLine` to `receiptLine`,
   *      or move the formatters into `executionReceipt.ts`, and the detector is
   *      hunting identifiers that no longer exist. A surface could then import
   *      the raw formatters freely and this gate would stay green.
   *
   * The POSITIVE CONTROL is the composer, `executionReceiptView.ts`. It is the
   * correct specimen because it is the one file in the repo that legitimately
   * DOES import all three raw formatters — that is its whole job, wrapping them
   * behind one honest view. So it is a guaranteed live example of the exact
   * shape the detector hunts. Note the deliberate inversion: the composer sits
   * OUTSIDE SCAN_ROOTS, so asserting it matches cannot mask a real violation —
   * the rule below never looks at it.
   */
  it("ANTI-VACUITY: the scan reaches the surface tree and the detector still recognises the composer", () => {
    expect(
      ALL_FILES.length,
      "walk(src/app) + walk(src/components) found almost no code files — did " +
        "those directories move or get reorganised, or did this test file move " +
        "relative to them? An empty scan makes the rule below permanently green " +
        "while policing nothing. Re-point SCAN_ROOTS at the real surface tree",
    ).toBeGreaterThan(200);

    const rels = ALL_FILES.map((f) => f.replace(SRC_ROOT + "/", ""));
    expect(
      rels,
      `${CANONICAL_SURFACE} — the canonical receipt surface — is not in the ` +
        "scanned set. The scan roots no longer cover where receipts are " +
        "rendered, so the rule below is green over the wrong tree. Add the new " +
        "location to SCAN_ROOTS",
    ).toContain(CANONICAL_SURFACE);

    const composer = readFileSync(resolve(SRC_ROOT, COMPOSER), "utf8");
    expect(
      importsRawFormatter(composer),
      `importsRawFormatter() no longer recognises ${COMPOSER} — the one file ` +
        "that is SUPPOSED to import the raw formatters, and therefore the only " +
        "guaranteed live specimen of the shape this rule hunts. The formatters " +
        `were renamed, or moved out of the ${FORMATTER_MODULE} module, and ` +
        "RAW_FORMATTERS was not updated with them. The rule below now matches " +
        "nothing anywhere: a surface could hand-assemble a receipt from the raw " +
        "formatters and pass CI. Re-derive RAW_FORMATTERS from what the " +
        "composer actually imports today",
    ).toBe(true);
  });

  it("sees the surface tree (sanity — the card is actually scanned)", () => {
    const rels = files.map((f) => f.replace(SRC_ROOT + "/", ""));
    expect(rels).toContain(CANONICAL_SURFACE);
  });

  it("no surface imports the raw execution-receipt formatters directly", () => {
    const violations: string[] = [];
    for (const file of files) {
      if (importsRawFormatter(readFileSync(file, "utf8"))) {
        violations.push(file.replace(SRC_ROOT + "/", ""));
      }
    }
    expect(
      violations,
      `These surfaces import the raw execution-receipt formatters directly: ` +
        `${violations.join(", ")}. A hand-assembled receipt view is where ` +
        "overclaim creeps back in (e.g. a broker line under a DENIED verdict). " +
        `Render through ${COMPOSER} / ExecutionReceiptCard instead`,
    ).toEqual([]);
  });
});
