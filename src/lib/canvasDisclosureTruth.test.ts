import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const panel = read("src/components/experience/MarketCanvasPanel.tsx");
const pill = read("src/components/experience/CanvasSummaryPill.tsx");
const whyPanel = read("src/components/experience/DecisionWhyPanel.tsx");
const deck = read("src/app/command-deck/page.tsx");

/**
 * Market Canvas disclosure Sentinel — coverage non-disclosure class.
 *
 * The panel rendered `vm.blockers.slice(0, 6)`. The header did disclose the
 * COUNT ("Why not (8)"), but the 7th and 8th blockers were unreadable. On a
 * decision surface a blocker you cannot read is a blocker you cannot clear,
 * and blockers are the reasons not to put money at risk.
 *
 * The summary pill truncated blockers, invalidators and missing dimensions to
 * a fixed head with no marker at all, so a partial list read as a complete one.
 */
describe("market canvas blocker disclosure", () => {
  it("renders every blocker rather than a head of six", () => {
    expect(panel).not.toContain("vm.blockers.slice(0, 6)");
    expect(panel).toContain("{vm.blockers.map((b, i) => (");
  });

  it("still discloses the remainder for the affirmative list", () => {
    // Clearances stay capped — hiding a PASSED check is a coverage issue, not
    // a safety one — but the count withheld must be stated.
    //
    // RE-PINNED: this read `vm.clearances.length > 6` literally. The cap is now
    // `cap`, which is 6 in a drawer and Infinity on a full screen. The literal
    // was never the point — the point is that a withheld count is ANNOUNCED,
    // and `length > cap` keeps that true at every depth while the old string
    // would have failed a change that strengthened the surface.
    expect(panel).toContain("vm.clearances.length > cap");
    expect(panel).toContain("more cleared, not shown");
  });

  it("the cap may grow with the viewport — the blocker shortfall may not", () => {
    // The strengthening this re-pin accompanies, locked so it cannot quietly
    // reverse. `unabridged` uncaps DISPLAY truncation only. The blocker
    // remainder is a DATA shortfall (the array arrives capped by the compiler),
    // so its disclosure is gated on the counts alone and no prop may silence
    // it. If this ever became `!unabridged && vm.blockerCount > ...`, the full
    // experience would read as a complete list of reasons not to trade while
    // concealing the rest — at exactly the depth a trader trusts most.
    expect(panel).toContain("{vm.blockerCount > vm.blockers.length && (");
    expect(panel).not.toMatch(/unabridged[^\n]*vm\.blockerCount/);
    expect(panel).not.toMatch(/vm\.blockerCount[^\n]*unabridged/);
  });
});

describe("canvas summary pill disclosure", () => {
  it("marks every truncated list with its remainder", () => {
    // RE-STATED. This asserted the literal "more — open the canvas", which
    // welded a FACT (how many items are withheld) to an INSTRUCTION (go open
    // the canvas). On live /charts the pill has no `scrollToSelector`, renders
    // as a static div, and the page carries no canvas at all — so the
    // instruction named a destination that does not exist while the count was
    // the only true half. The remainder is what this test is for; it must be
    // unconditional, and the direction must be earned separately.
    expect(pill).toContain("more${openHint}");
    expect(pill).toContain("const withRemainder");
  });

  it("the direction is earned by the surface, not printed by default", () => {
    // RE-STATED. This pinned the exact spelling
    // `scrollToSelector ? " — open the canvas" : ""`, which welded the INTENT
    // ("only point somewhere this surface can actually reach") to ONE KIND of
    // destination — a selector for something already on the page.
    //
    // /charts has no canvas to scroll to, but it does have press-gated Market
    // Reality equipment, and that spelling made the door unreachable from the
    // pill BY CONSTRUCTION. A test that pins a spelling does not defend a rule;
    // it freezes one implementation of it.
    //
    // What is pinned now is the rule: there is a branch that yields NOTHING,
    // and no branch yields a direction that was not handed down by the surface.
    expect(pill).toMatch(/const openHint =[\s\S]*?: "";/);
    expect(pill, "a hint must never be produced from thin air").not.toMatch(
      /const openHint = ["'`]/,
    );
  });

  it("no list is sliced without going through the disclosing helper", () => {
    expect(pill).not.toContain("vm.blockers.slice(0, 3).map");
    expect(pill).not.toContain("vm.invalidators.slice(0, 3).map");
    expect(pill).not.toContain("vm.missing.slice(0, 4).map");
  });

  it("names the full count in the tooltip heading", () => {
    // This assertion used to read `vm.blockers.length` and called it "the full
    // count". It was not. `selectDecisionWhyNot` builds one evidence blocker per
    // label from `debt.missingLabels` / `debt.warnLabels`, and
    // `computeEvidenceDebt` caps each of those arrays at
    // EVIDENCE_LABEL_SAMPLE_LIMIT (3). So the array length saturates at 6 plus
    // rules: nine unpaid nodes and ninety both printed "6". The deck was live
    // with "WHY · DECISION EVIDENCE  6 BLOCKERS" one column away from
    // "03 EVIDENCE DEBT  0 of 9 paid".
    //
    // A Sentinel that pins the wrong expression does not merely fail to catch
    // the defect — it defends it. Pin the uncapped total.
    expect(pill).toContain("`Why not (${vm.blockerCount}):`");
    expect(pill).not.toContain("${vm.blockers.length}");
    expect(pill).toContain("`Would invalidate (${vm.invalidators.length}):`");
  });

  it("passes the true total to withRemainder for the capped blocker sample", () => {
    // The remainder must be computed against `blockerCount`, not against the
    // sample's own length — otherwise the arithmetic reports "+0 more" while
    // real blockers are withheld. Same lie, arrived at by subtraction.
    expect(pill).toContain("withRemainder(vm.blockers, 3, vm.blockerCount)");
  });
});

/**
 * NO SURFACE MAY COUNT THE SAMPLE.
 *
 * Found by positive control: reverting the /command-deck WHY rail from
 * `blockerCount` back to `blockers.length` left the whole 7877-test suite
 * GREEN. That rail is the precise DOM that shipped "WHY · DECISION EVIDENCE
 * 6 BLOCKERS" beside "03 EVIDENCE DEBT  0 of 9 paid" — the defect's live face
 * — and nothing guarded it. The VM-level tests in selectDecisionWhyNot.test.ts
 * prove the compiler now derives the true total; they cannot prove a surface
 * chose to read it.
 *
 * Orkin: guard the arithmetic at every site that prints it, not the one site
 * that was noticed. `.length` on a capped sample is the mechanism; the panel,
 * the pill, the WHY panel and the deck rail are four doors into the same room.
 */
describe("blocker counts are never taken from the capped sample", () => {
  const surfaces: ReadonlyArray<readonly [string, string, string]> = [
    ["MarketCanvasPanel", panel, "vm.blockers.length"],
    ["CanvasSummaryPill", pill, "vm.blockers.length"],
    ["DecisionWhyPanel", whyPanel, "vm.blockers.length"],
    ["/command-deck WHY rail", deck, "marketCanvas.blockers.length"],
  ];

  for (const [name, src, banned] of surfaces) {
    it(`${name} does not count \`${banned}\` except to size its own remainder`, () => {
      // Two uses of the array length are legitimate and must stay allowed,
      // or this Sentinel would push surfaces into worse code:
      //
      //  1. the remainder arithmetic `blockerCount - blockers.length`, which
      //     is the whole mechanism by which the shortfall gets NAMED; and
      //  2. presence tests on the array itself — `blockers.length > 0` gating
      //     whether to render the list at all. That question really is about
      //     the array, not about the truth.
      //
      // What is banned is the array length appearing as a QUANTITY: printed to
      // the trader, or used to size a layout that represents "how much is
      // blocking". Those are claims about the world, and the array cannot make
      // them — it saturates at 3 labels per evidence bucket.
      // Comments are stripped first. These files are heavily annotated with the
      // history of this exact defect, and those annotations QUOTE the banned
      // expression by name. A Sentinel that cannot tell a warning from a
      // violation punishes the documentation that prevents recurrence.
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
      const allowed = [
        `Count - ${banned}`,
        `Count > ${banned}`,
        `${banned} > 0`,
        `${banned} ||`,
        `${banned} &&`,
      ];
      let residue = code;
      for (const form of allowed) residue = residue.split(form).join("<allowed>");
      expect(residue, `${name} counts a capped sample`).not.toContain(banned);
    });
  }

  it("the deck rail prints the authoritative total", () => {
    expect(deck).toContain("{marketCanvas.blockerCount} blocker");
  });

  it("the panel header prints the authoritative total", () => {
    expect(panel).toContain("Why not ({vm.blockerCount})");
  });

  it("both blocker lists disclose what the sample withheld", () => {
    expect(panel).toContain("market-canvas-blockers-remainder");
    expect(whyPanel).toContain("decision-why-blockers-remainder");
    expect(panel).toContain("more blocking, not named here");
    expect(whyPanel).toContain("more blocking, not named here");
  });
});
