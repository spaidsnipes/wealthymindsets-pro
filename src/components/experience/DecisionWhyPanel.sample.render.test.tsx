/**
 * A REFERENCE PAGE FOR THE EVIDENCE DEBT BAND.
 *
 * The band's claim is that an unpaid node is legible as a GAP IN THE LIGHT
 * before either number is read — that "8/9 paid" and "1/9 paid" stop being one
 * character apart and start looking different. That cannot be settled by an
 * assertion about markup; it has to be looked at. So this writes a page showing
 * the same real panel at four debts, and a human (or a screenshot) can check
 * whether the difference actually lands.
 *
 * Every panel is the REAL `DecisionWhyPanel` fed by the REAL
 * `selectEvidenceDebtLedger`. Nothing here is a mockup of the component.
 *
 * The debts are a FIXTURE and the page says so in its own heading. A reference
 * page that could be mistaken for a live screen is a worse problem than no
 * reference page.
 */

import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import path from "node:path";

import { DecisionWhyPanel } from "./DecisionWhyPanel";
import { selectEvidenceDebtLedger } from "@/lib/experience/selectEvidenceDebtLedger";
import type { DecisionWhyVM } from "@/lib/marketData/viewModels/selectDecisionWhyNot";
import type { EvidenceDebt } from "@/lib/marketData/viewModels/decisionPermissionCompiler";

const ledger = (p: Partial<EvidenceDebt>) =>
  selectEvidenceDebtLedger({
    payable: 0, watch: 0, resolved: 0, missing: 0, warn: 0,
    missingLabels: [], warnLabels: [],
    missingPayableLabels: p.missingLabels ?? [], missingPayable: p.missing ?? 0,
    ...p,
  });

/**
 * The four debts worth looking at, and why each is here:
 *
 *   OWES EVERYTHING — the honest floor. No filled run at all.
 *   THE LIVE SHAPE  — what /command-deck actually renders. The uncomfortable one.
 *   ONE SHORT       — the case a sentence rounds away: "8/9 paid" reads as done.
 *   FULLY PAID      — the reading the band exists to earn, and must be able to reach.
 */
const CASES: readonly (readonly [string, string, ReturnType<typeof ledger>, readonly string[]])[] = [
  [
    "Owes everything",
    "Nine payable nodes, none resolved. No filled run at all.",
    ledger({ payable: 9, resolved: 0, warn: 2, missing: 7 }),
    ["0/9 evidence nodes paid."],
  ],
  [
    "The live shape",
    "The clearance sentence says 5/8 PAID. The band says three nodes are still owed.",
    ledger({ payable: 8, resolved: 5, warn: 1, missing: 2, watch: 1 }),
    ["5/8 evidence nodes paid."],
  ],
  [
    "One short",
    "The case a sentence rounds away — '8/9 paid' reads as done. One dark mark does not.",
    ledger({ payable: 9, resolved: 8, warn: 1, missing: 0 }),
    ["8/9 evidence nodes paid."],
  ],
  [
    "Fully paid",
    "The reading the band exists to earn. A meter that cannot reach full is not a meter.",
    ledger({ payable: 9, resolved: 9, warn: 0, missing: 0 }),
    ["9/9 evidence nodes paid."],
  ],
];

const vm = (l: ReturnType<typeof ledger>, clearances: readonly string[]): DecisionWhyVM => ({
  version: "wm.decision-why.v1",
  verdict: "WAIT",
  clear: false,
  headline: "Right-of-way withheld — evidence debt unpaid.",
  blockers: [],
  blockerCount: 0,
  clearances,
  invalidators: [],
  evidenceLedger: l,
});

const SAMPLE_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Evidence debt band</title></head>
<body style="margin:0;padding:28px;background:#07080a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <h1 style="font-family:Georgia,serif;font-size:17px;color:#c9a55c;letter-spacing:.5px;margin:0 0 4px">
    Evidence debt band — what the chain still owes
  </h1>
  <p style="font-size:12px;color:#8a8271;margin:0 0 22px;max-width:760px;line-height:1.6">
    FIXTURE DEBT — NOT A LIVE CHAIN. Four debts of the same real panel. Read the
    bands, not the numbers: the filled run from the left edge is what is paid.
    Solid = resolved, outlined = evidence present but below confirmation, flat
    grey = no indicator at all. Every mark holds its width whatever it is worth.
  </p>
  ${CASES.map(
    ([title, note, l, clearances]) => `
  <section style="margin-bottom:26px;max-width:760px">
    <div style="font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:#8a8271;margin-bottom:6px">
      ${title} — ${note}
    </div>
    ${renderToStaticMarkup(<DecisionWhyPanel vm={vm(l, clearances)} />)}
  </section>`,
  ).join("")}
</body></html>`;

const TMP = path.join("/tmp", "evidence-debt-sample.html");
writeFileSync(TMP, SAMPLE_HTML, "utf8");

describe("evidence debt sample page", () => {
  it("shows four genuinely different debts", () => {
    // If all four drew the same band, the page would prove nothing and the band
    // would be decoration.
    const resolved = [...SAMPLE_HTML.matchAll(/data-resolved="(\d+)"/g)].map((m) => m[1]);
    expect(resolved).toEqual(["0", "5", "8", "9"]);
  });

  it("draws the full denominator in every case, including the one that owes everything", () => {
    const payable = [...SAMPLE_HTML.matchAll(/data-payable="(\d+)"/g)].map((m) => m[1]);
    expect(payable).toEqual(["9", "8", "9", "9"]);
    const marks = [...SAMPLE_HTML.matchAll(/data-standing="/g)];
    expect(marks).toHaveLength(9 + 8 + 9 + 9);
  });

  it("puts the band beside the sentence it corrects, in every case", () => {
    // The point of the page: "8/9 paid" and one dark mark on the same screen.
    for (const [, , , clearances] of CASES) expect(SAMPLE_HTML).toContain(clearances[0]);
    const bands = [...SAMPLE_HTML.matchAll(/decision-why-evidence-band/g)];
    expect(bands).toHaveLength(CASES.length);
  });

  it("lets the fully paid case actually reach full", () => {
    expect(SAMPLE_HTML).toContain("All 9 payable evidence nodes are resolved.");
  });

  it("names the watch node rather than leaving an unexplained gap", () => {
    expect(SAMPLE_HTML).toContain("1 watch node sits outside this ledger and is not drawn.");
  });

  it("says on its face that the debt is a fixture", () => {
    expect(SAMPLE_HTML).toContain("FIXTURE DEBT — NOT A LIVE CHAIN");
  });

  it("teaches no grade vocabulary and prints no percentage — §15", () => {
    expect(SAMPLE_HTML).not.toMatch(/\b(SCORE|GRADE|PASSING|HEALTHY|EXCELLENT|POOR)\b/i);
    expect(SAMPLE_HTML).not.toMatch(/\d+%/);
  });

  it("carries no green-dominant colour — §9", () => {
    for (const m of SAMPLE_HTML.matchAll(/#([0-9a-f]{6})\b/gi)) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
      expect(g > r && g > b, `green-dominant #${m[1]}`).toBe(false);
    }
  });
});

// eslint-disable-next-line no-console
console.log(`\n  Evidence debt sample written to: ${TMP}\n  Open it: file://${TMP}\n`);
