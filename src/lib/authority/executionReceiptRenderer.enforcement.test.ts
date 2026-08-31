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

/** Does this file import a raw formatter from the formatExecutionReceipt module? */
function importsRawFormatter(content: string): boolean {
  if (!content.includes("formatExecutionReceipt")) return false;
  return RAW_FORMATTERS.some((name) => new RegExp(`\\b${name}\\b`).test(content));
}

describe("Execution receipt has one honest renderer — surfaces go through the composer", () => {
  const files = SCAN_ROOTS.flatMap((root) => walk(root));

  it("sees the surface tree (sanity — the card is actually scanned)", () => {
    const rels = files.map((f) => f.replace(SRC_ROOT + "/", ""));
    expect(rels).toContain("components/authority/ExecutionReceiptCard.tsx");
  });

  it("no surface imports the raw execution-receipt formatters directly", () => {
    const violations: string[] = [];
    for (const file of files) {
      if (importsRawFormatter(readFileSync(file, "utf8"))) {
        violations.push(file.replace(SRC_ROOT + "/", ""));
      }
    }
    expect(violations).toEqual([]);
  });
});
