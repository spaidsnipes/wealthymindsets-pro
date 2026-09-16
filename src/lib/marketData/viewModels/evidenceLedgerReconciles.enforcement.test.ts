/**
 * The Evidence Debt cell must not contradict itself.
 *
 * ── The same lie, twice, through two mechanisms ──────────────────────────────
 *
 * Observed live on /command-deck 2026-09-03, two lines apart in ONE card:
 *
 *     EVIDENCE DEBT   0 of 9 paid
 *     8 evidence nodes unpaid: regime + direction +6
 *
 * Diagnosed then as a WATCH node padding the denominator, and fixed by renaming
 * `total` → `payable` so WATCH could no longer sit in a denominator no
 * numerator could reach. `decisionPermissionCompiler.ts` documents that repair
 * at length.
 *
 * On 2026-09-16 the SAME TWO LINES were still on the deck — measured, not
 * assumed, at http://localhost:3000/command-deck:
 *
 *     evidenceDebtCell: "0 of 9 paid"
 *     debtDetail:       "8 evidence nodes unpaid: regime + direction +6"
 *
 * The denominator was no longer padded. The SENTENCE was short. Because
 * `payable = resolved + missing + warn`, a denominator of 9 with 0 resolved and
 * 8 missing is arithmetically a chain holding exactly one WARN node — and
 * `missingPhrase` counted only `debt.missing`, so that node sat in the
 * denominator and appeared in no clause that explained it.
 *
 * ── Why this file exists rather than one more example test ───────────────────
 *
 * The first repair cured the mechanism it found. The lie came back through the
 * neighbouring bucket, unchallenged, because every existing test asserted
 * behaviour for chains that happened to have no WARN node. A full suite of 7846
 * tests was green while the defect was on screen.
 *
 * So these tests are written against the ARITHMETIC, not against WATCH or WARN
 * by name: whatever the sentence leads with must equal `payable - resolved`.
 * A third bucket, or a fourth, cannot revive this without failing here.
 */

import { describe, it, expect } from "vitest";

import { selectOneStory } from "./selectOneStory";
import { computeEvidenceDebt } from "./decisionPermissionCompiler";
import type { DecisionChainNode } from "./selectDecisionChain";

const node = (label: string, indicator: DecisionChainNode["indicator"]): DecisionChainNode => ({
  key: label.toLowerCase(),
  label,
  verdict: "TEST",
  resolution: "RESOLVED",
  narrative: "test",
  indicator,
});

// `permission: null` on purpose. These tests are about the EVIDENCE ledger's
// internal arithmetic; supplying a permission would only let the decision layer
// influence a sentence it must never be able to soften.
const compile = (chainNodes: readonly DecisionChainNode[]) =>
  selectOneStory({ story: null, chainNodes, permission: null });

/** The number the sentence leads with — the one a trader reads first. */
const leadCount = (phrase: string | null): number | null => {
  if (!phrase) return null;
  const m = phrase.match(/^(\d+)\s+evidence node/);
  return m ? Number(m[1]) : null;
};

/**
 * The exact live chain, reconstructed from the measured counts.
 * 8 UNKNOWN + 1 WARN → payable 9, resolved 0, missing 8, warn 1.
 */
const LIVE_CHAIN: readonly DecisionChainNode[] = [
  node("Regime", "UNKNOWN"),
  node("Direction", "UNKNOWN"),
  node("Location", "UNKNOWN"),
  node("Aggression", "UNKNOWN"),
  node("Structure", "UNKNOWN"),
  node("Volatility", "UNKNOWN"),
  node("Profile", "UNKNOWN"),
  node("OrderFlow", "UNKNOWN"),
  node("Liquidity", "WARN"),
];

describe("the ledger headline and the ledger sentence describe the same set", () => {
  it("reproduces the 2026-09-16 live shape and no longer under-counts it", () => {
    const vm = compile(LIVE_CHAIN);
    const debt = vm.debt!;

    // The measured live numbers, pinned so this test fails if the fixture
    // drifts away from the defect it was built to reproduce.
    expect(debt.payable).toBe(9);
    expect(debt.resolved).toBe(0);
    expect(debt.missing).toBe(8);
    expect(debt.warn).toBe(1);

    // BEFORE this repair, the sentence led with 8 beside a headline of 9.
    expect(leadCount(vm.missing)).toBe(9);
    // The missing nodes are still named, and the remainder still derives from
    // the authoritative `missing` count (8 - 2 shown = +6), not from the
    // capped label array.
    expect(vm.missing).toContain("regime + direction +6");
    // The WARN node is counted with the others and named apart from them. An
    // unknown and a contested answer are different debts; folding the warning
    // into "unknown" would hand the trader a softer picture than the ledger
    // holds.
    expect(vm.missing).toContain("1 warned: liquidity");
  });

  it("the lead count equals payable - resolved for every bucket mix", () => {
    // This is the property the first repair lacked. It does not mention WATCH
    // or WARN, so a new indicator bucket cannot slip a node into the
    // denominator without showing up in the sentence.
    const indicators: readonly DecisionChainNode["indicator"][] = [
      "OK",
      "UNKNOWN",
      "WARN",
      "WATCH",
    ];
    for (const a of indicators) {
      for (const b of indicators) {
        for (const c of indicators) {
          const chain = [node("Alpha", a), node("Beta", b), node("Gamma", c)];
          const vm = compile(chain);
          const debt = computeEvidenceDebt(chain)!;
          const unpaid = debt.payable - debt.resolved;
          const lead = leadCount(vm.missing);
          const where = `${a}/${b}/${c}`;

          if (unpaid === 0) {
            // Nothing is owed, so there must be no unpaid sentence at all —
            // a sentence here would invent a debt.
            expect(vm.missing, where).toBeNull();
          } else {
            expect(lead, where).toBe(unpaid);
          }
        }
      }
    }
  });

  it("a warn-only ledger is never captioned as paid in full", () => {
    // Latent second head of the same defect: `missingPhrase` returned null
    // whenever `missing === 0`, and `selectRealityCells` renders
    // "Ledger paid in full." for a null phrase. A chain whose only debt is a
    // WARN node would therefore have printed "0 of 1 paid" directly above
    // "Ledger paid in full."
    const vm = compile([node("Liquidity", "WARN")]);
    expect(vm.debt!.payable).toBe(1);
    expect(vm.debt!.resolved).toBe(0);
    expect(vm.missing).not.toBeNull();
    expect(leadCount(vm.missing)).toBe(1);
    expect(vm.missing).toContain("1 warned: liquidity");
    // Singular, because one node is one node.
    expect(vm.missing).toContain("1 evidence node unpaid");
    expect(vm.missing).not.toContain("nodes unpaid");
  });

  it("a fully resolved ledger still says nothing, so silence keeps meaning zero", () => {
    const vm = compile([node("Regime", "OK"), node("Direction", "OK")]);
    expect(vm.debt!.payable).toBe(2);
    expect(vm.debt!.resolved).toBe(2);
    expect(vm.missing).toBeNull();
  });

  it("WATCH nodes stay out of both the denominator and the sentence", () => {
    // The original repair's property, re-pinned here so removing it from the
    // compiler fails in the same file that owns the reconciliation.
    const chain = [node("Regime", "UNKNOWN"), node("Tape", "WATCH")];
    const vm = compile(chain);
    expect(vm.debt!.payable).toBe(1);
    expect(vm.debt!.watch).toBe(1);
    expect(leadCount(vm.missing)).toBe(1);
    expect(vm.missing).not.toContain("tape");
  });
});
