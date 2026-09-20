/**
 * SENTINEL — AN OWED CONDITION MUST KEEP ITS NAME, ALL THE WAY TO THE GLASS.
 *
 * ── The measured defect ──────────────────────────────────────────────────────
 *
 * MEASURED LIVE 2026-09-20, https://wealthymindsetspro.com/charts, BTC · 1h.
 * The decision rail's evidence ledger read:
 *
 *     WAIT  ●●●■■■■
 *
 * Three settled, four owed, and not one of the four saying WHICH condition it
 * was. One was named in the sentence below it, sampled from an array capped at
 * three; the other three were on no surface of the product. A trader could see
 * the SIZE of the debt and could not see the DEBT.
 *
 * Canon mockup WM_NewMockup_123_F16_Evidence_Debt_WAIT_Finished draws the same
 * ledger as named first-class conditions:
 *
 *     EVIDENCE DEBT — FIRST-CLASS CONDITION · PERMISSION WITHHELD
 *     [DIRECTION ✓] [LOCATION ✓] [AVAILABLE R ✓] [AGGRESSION ?] [CLC ?]
 *
 * ── Why a Sentinel rather than one more unit test ────────────────────────────
 *
 * The identity crosses THREE owners — `computeEvidenceDebt` mints the roll,
 * `selectEvidenceLadder` carries it, `DecisionSpineBand` draws it — and each of
 * the three has its own green suite that stays green if a LATER one drops the
 * names on the floor. The failure mode is silent by construction: names simply
 * stop appearing, the bar still renders, the counts still reconcile, and
 * nothing throws. That is exactly the shape of defect that took four weeks to
 * notice the first time.
 *
 * So this file asserts the WIRE, not the behaviour of any one link in it.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { computeEvidenceDebt } from "./decisionPermissionCompiler";
import { selectEvidenceLadder } from "./selectEvidenceLadder";
import type { DecisionChainNode } from "./selectDecisionChain";

const node = (
  label: string,
  indicator: DecisionChainNode["indicator"],
): DecisionChainNode => ({
  key: label.toLowerCase().replace(/\s+/g, "-"),
  label,
  verdict: indicator === "OK" ? "RESOLVED" : "UNRESOLVED",
  resolution: "RESOLVED",
  narrative: "sentinel",
  indicator,
});

/** The live shape, reproduced: three settled, four owed, none named. */
const LIVE_CHAIN: DecisionChainNode[] = [
  node("Direction", "OK"),
  node("Location", "OK"),
  node("Available R", "OK"),
  node("Aggression", "UNKNOWN"),
  node("CLC", "UNKNOWN"),
  node("Absorption", "UNKNOWN"),
  node("Regime", "UNKNOWN"),
];

describe("SENTINEL — evidence debt keeps its names end to end", () => {
  it("the compiler names every node the chain gave it", () => {
    const debt = computeEvidenceDebt(LIVE_CHAIN)!;
    expect(debt.roll).toBeDefined();
    expect(debt.roll!.map((e) => e.label)).toEqual(LIVE_CHAIN.map((n) => n.label));
  });

  it("the ladder carries every name through — including the ones the sample cap drops", () => {
    const debt = computeEvidenceDebt(LIVE_CHAIN)!;
    const ladder = selectEvidenceLadder(debt)!;

    // The cap is why the defect existed: it reaches three of the four owed.
    expect(debt.missingLabels.length).toBeLessThan(debt.missing);

    const owed = ladder.segments.filter((s) => s.state === "MISSING").map((s) => s.label);
    expect(owed).toHaveLength(debt.missing);
    expect(owed.every((l) => typeof l === "string" && l.length > 0)).toBe(true);

    // The one the sentence would have named is among them, and so are the
    // three it could never have reached.
    const chainOwed = LIVE_CHAIN.filter((n) => n.indicator === "UNKNOWN").map((n) => n.label);
    expect(new Set(owed)).toEqual(new Set(chainOwed));
  });

  it("no owed condition can ever reach the glass anonymous while the rest are named", () => {
    const ladder = selectEvidenceLadder(computeEvidenceDebt(LIVE_CHAIN)!)!;
    const named = ladder.segments.filter((s) => s.label).length;
    // All or nothing — a partial roster is the failure this asserts against,
    // because four chips over a seven-segment bar reads as the whole debt.
    expect(named === 0 || named === ladder.segments.length).toBe(true);
    expect(named).toBe(ladder.segments.length);
  });

  it("the rail still renders the roster — the last link in the wire", () => {
    // Source-literal, because the two selectors above can be perfect while the
    // component quietly stops mapping them. There is no green suite that
    // catches a component which simply does not call its own selector.
    const src = readFileSync(
      resolve(__dirname, "../../../components/experience/DecisionSpineBand.tsx"),
      "utf8",
    );
    expect(src).toContain("evidence-ladder-roster");
    expect(src).toContain("LadderChip");
    expect(src).toContain("visibleLadderChips?.map");
    // H-101 caps the always-visible rail without making the collapsed names
    // disappear. The +N disclosure must still speak the remainder.
    expect(src).toContain("collapsedLadderDetail");
    expect(src).toContain("more conditions");
  });
});
