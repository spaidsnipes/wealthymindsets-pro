/**
 * DecisionReceiptPanel — the receipt shipped with zero tests, and the geometry
 * sweep found out why that mattered.
 *
 * `scripts/measure-experience-geometry.mjs` registered this panel, measured it
 * clear at 390/834/1440px, and the 390px SCREENSHOT showed a complete receipt
 * with no decision id anywhere on it. The selector had compiled `decisionId`
 * all along; the panel rendered every other field.
 *
 * That is not a geometry defect and no measurement could have failed on it —
 * it took reading the picture. It is a DECISION_ID continuity defect: the
 * receipt is the artefact a trader carries to their journal, and one that does
 * not name its own decision cannot be checked against anything. Two receipts
 * for two different decisions were distinguishable only by their contents.
 *
 * These tests stand over that, and over the neighbouring wrong-answer laws the
 * panel already carried unguarded: a disciplined WAIT must read as a COMPLETE
 * decision rather than a debt, and the panel must never compute a composite
 * grade of its own.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DecisionReceiptPanel } from "./DecisionReceiptPanel";
import { selectDecisionReceipt } from "@/lib/traderMemory/viewModels/selectDecisionReceipt";
import {
  DECISION_MEMORY_SCHEMA_VERSION,
  sealDecision,
  attachOutcome,
  attachReview,
  type FrozenState,
  type DecisionPlan,
  type DecisionMemoryRecord,
} from "@/lib/traderMemory/decisionMemory";

const OWNER = "owner-1";
const ID = "wmd_9f3c1a22-5e77-4a10-b2d4-7c918ee0d311";

function frozen(): FrozenState {
  return {
    schemaVersion: DECISION_MEMORY_SCHEMA_VERSION,
    capturedAt: 1_800_000_000_000,
    marketStateSummary: {
      regime: "TREND",
      direction: "LONG",
      location: "VAL",
      volatility: "NORMAL",
      session: "REGULAR",
      structure: "BOS",
      aggression: "HIGH",
      profile: "BALANCED",
      unresolvedDimensionCount: 0,
      canonicalStateId: "cms-123",
    },
    marketProvenance: {
      providersUsed: [{ provider: "alpaca", feed: "iex", coverageScope: "IEX", freshness: "LIVE" }],
    },
    traderState: {
      ownerId: OWNER,
      capturedAt: 1_800_000_000_000,
      planStatus: "ACTIVE",
      ruleAdherenceAtDecision: true,
      externalInfluenceFlagged: false,
      tradeNumberInSession: 1,
      coachingShown: false,
    },
    playbook: { playbookId: "clc-long-v1", playbookVersion: 1, genomeSnapshot: {} },
  };
}

const longPlan: DecisionPlan = {
  action: "ENTER_LONG",
  thesis: "CLC Long at VAL reclaim",
  intendedSize: 100,
  intendedStop: 99.5,
  intendedTargets: [101, 102],
  expectedR: 2,
  availableRAtDecision: 2,
  invalidationCriteria: "Break below VAL - 0.5 ATR",
  expectedBehavior: ["Rejection wick at VAL"],
};

const waitPlan: DecisionPlan = {
  ...longPlan,
  action: "WAIT",
  thesis: "No confirmed CLC — stand aside.",
  intendedTargets: [],
};

function seal(plan: DecisionPlan = longPlan, decisionId: string = ID): DecisionMemoryRecord {
  return sealDecision({ decisionId, ownerId: OWNER, sessionIdentity: "s-1", frozen: frozen(), plan });
}

function render(record: DecisionMemoryRecord | null): string {
  return renderToStaticMarkup(<DecisionReceiptPanel vm={selectDecisionReceipt(record)} />);
}

describe("DecisionReceiptPanel — the receipt names its own decision", () => {
  it("renders the decision id in full", () => {
    const html = render(seal());
    expect(html).toContain('data-testid="receipt-decision-id"');
    expect(html).toContain(ID);
  });

  it("never truncates the id — two decisions sharing a prefix must not look alike", () => {
    // The same law the spine band was fixed under. Static markup has no
    // geometry, but it can see the declarations that cause an ellipsis.
    const html = render(seal());
    const at = html.indexOf('data-testid="receipt-decision-id"');
    expect(at).toBeGreaterThan(-1);
    // React emits attributes in JSX order, so `style` follows `data-testid` on
    // the SAME element. Read forward to the end of that open tag — reading
    // backwards picks up the preceding label span and proves nothing about
    // the id.
    const tag = html.slice(at, html.indexOf(">", at));
    const style = tag.slice(tag.indexOf('style="'));
    expect(style).not.toContain("white-space:nowrap");
    expect(style).not.toContain("text-overflow:ellipsis");
    expect(style).toContain("overflow-wrap:anywhere");
  });

  it("two different sealed decisions produce two distinguishable receipts", () => {
    // The defect this test exists for: before the id was rendered, these two
    // receipts differed in NOTHING a reader could use to tell them apart.
    const a = render(seal(longPlan, "wmd_aaaaaaaa-0000-0000-0000-000000000001"));
    const b = render(seal(longPlan, "wmd_aaaaaaaa-0000-0000-0000-000000000002"));
    expect(a).not.toBe(b);
    expect(a).toContain("wmd_aaaaaaaa-0000-0000-0000-000000000001");
    expect(b).toContain("wmd_aaaaaaaa-0000-0000-0000-000000000002");
  });

  it("an empty receipt discloses that nothing is sealed rather than showing a blank", () => {
    const html = render(null);
    expect(html).toContain('data-testid="receipt-decision-absent"');
    expect(html).toContain("NONE SEALED");
    expect(html).not.toContain('data-testid="receipt-decision-id"');
  });
});

describe("DecisionReceiptPanel — a disciplined WAIT is a complete decision", () => {
  it("receipts a WAIT without rendering it as a debt or a missing trade", () => {
    const html = render(seal(waitPlan));
    expect(html).toContain("No confirmed CLC — stand aside.");
    expect(html).toContain('data-testid="receipt-decision-id"');
  });

  it("renders no composite grade of its own — the score-addiction weakness", () => {
    // The panel must project only what the trader themself recorded. A grade
    // invented here would be a second brain scoring the first.
    const reviewed = attachReview(
      attachOutcome(seal(), { closedAt: 1_800_001_200_000, realizedR: 1.4, reason: "TARGET" }),
      {
        reviewedAt: 1_800_002_000_000,
        marketOpportunityQuality: 4,
        playbookMatch: 5,
        riskQuality: 4,
        executionQuality: 3,
        processAdherence: 5,
        lessons: ["Hesitated on the retest entry."],
      },
    );
    const html = render(reviewed);
    // The trader's own five figures appear...
    expect(html).toContain("4/5");
    expect(html).toContain("3/5");
    // ...and are labelled as theirs, not as a verdict the panel reached.
    expect(html).toContain("trader-declared");

    /* RE-PINNED TO THE MEANING, NOT WEAKENED.
     *
     * This rule read raw markup, and a composite grade is a thing the trader
     * SEES. When the split gained rung ladders the rungs' own geometry —
     * `height:4.25px` — substring-matched the forbidden `4.2` and failed the
     * Sentinel against a panel that had invented no grade at all.
     *
     * Moving the needle would have been the cowardly repair: the rule would
     * stay one stylesheet away from the next false accusation, and an
     * instrument that fails toward "the subject is broken" is the more
     * dangerous direction. So the markup is reduced to what is READ before it
     * is judged, which is what the rule always meant.
     *
     * STRONGER THAN IT WAS. Against visible text the rule can now name the
     * whole family rather than three literals: any x/25 total, any percentage,
     * and any averaged decimal on a five-point scale are grades nobody
     * recorded, and all three are now forbidden by shape.
     */
    const TEXT = html.replace(/<[^>]*>/g, " ");
    expect(TEXT, "a summed total across the five axes").not.toMatch(/\b\d+\s*\/\s*25\b/);
    expect(TEXT, "a percentage nobody recorded").not.toMatch(/\b\d{1,3}\s*%/);
    expect(TEXT, "an averaged score on the 1-5 scale").not.toMatch(/\b[1-5]\.\d\b/);
    // The five declared integers must survive the tighter reading.
    expect(TEXT).toMatch(/\b4\s*\/\s*5\b/);
  });

  it("renders the trader's verbatim lesson, never a paraphrase", () => {
    const reviewed = attachReview(
      attachOutcome(seal(), { closedAt: 1_800_001_200_000, realizedR: 1.4, reason: "TARGET" }),
      {
        reviewedAt: 1_800_002_000_000,
        marketOpportunityQuality: 4,
        playbookMatch: 5,
        riskQuality: 4,
        executionQuality: 3,
        processAdherence: 5,
        lessons: ["Sized correctly but hesitated on the retest entry by two bars."],
      },
    );
    expect(render(reviewed)).toContain("Sized correctly but hesitated on the retest entry by two bars.");
  });
});

describe("DecisionReceiptPanel — it is a landmark, and it projects only", () => {
  it("is findable by name", () => {
    expect(render(seal())).toContain('aria-label="Decision receipt"');
  });

  it("shows an open decision's stage without inventing an outcome", () => {
    const html = render(seal());
    expect(html).not.toContain("[object Object]");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("NaN");
  });
});

/**
 * × THE RECEIPT DREW NO ORDER, AND THEN IT DREW THE WRONG ONE.
 *
 * Two facts on this receipt are ORDERED and were rendered in forms that carry
 * no order. `vm.stage` is a strict cascade — SEALED → MANAGED → CLOSED →
 * REVIEWED, each requiring everything the last one required plus one more
 * attachment — and it printed as a lone word in one of four near-identical
 * golds. The Decision-Quality Split is five axes that exist precisely so the
 * weak one can be found, and it printed as five `n/5` fractions where `4/5`
 * and `2/5` differ by one glyph at 11px.
 *
 * Drawing them is the cure. Drawing them is also how the SECOND defect got in,
 * and it is the worse one: a four-step track with one step filled asserts that
 * three things are outstanding. For a disciplined WAIT that is a FABRICATED
 * DEBT — the selector is explicit that a non-trade is complete, writing "No
 * position by design" into `pending` rather than flagging a missing outcome.
 * The naive progress bar would have drawn a picture calling that decision 25%
 * done, directly above the sentence saying it was finished.
 *
 * So these tests hold three things: the picture agrees with the word, the
 * ordering has exactly one author, and the picture never invents a debt the
 * prose refuses to claim.
 */
describe("× THE RECEIPT'S ORDERED FACTS ARE DRAWN IN ORDER — without inventing a debt", () => {
  const reviewed = () =>
    attachReview(
      attachOutcome(seal(), { closedAt: 1_800_001_200_000, realizedR: 1.4, reason: "TARGET" }),
      {
        reviewedAt: 1_800_002_000_000,
        marketOpportunityQuality: 4,
        playbookMatch: 5,
        riskQuality: 4,
        executionQuality: 3,
        processAdherence: 5,
        lessons: ["Hesitated on the retest entry."],
      },
    );

  it("the track's filled position equals the selector's own stage index", () => {
    // Walked across the whole cascade rather than sampled: an off-by-one or an
    // inverted order survives any single reading.
    const cases: readonly (readonly [DecisionMemoryRecord, number])[] = [
      [seal(), 0],
      [attachOutcome(seal(), { closedAt: 1_800_001_200_000, realizedR: 1.4, reason: "TARGET" }), 2],
      [reviewed(), 3],
    ];
    for (const [record, expected] of cases) {
      const html = render(record);
      expect(html, "no track drawn").toContain('data-testid="receipt-stage-track"');
      expect(html, `stage index for ${selectDecisionReceipt(record).stage}`).toContain(
        `data-stage-index="${expected}"`,
      );
    }
  });

  it("THE WORD SURVIVES THE PICTURE", () => {
    const html = render(seal());
    expect(html).toContain("SEALED");
    expect(html).toContain('aria-hidden="true"');
  });

  it("the track keeps its length — four stages always read as four", () => {
    // A shortened track silently redraws the denominator: 1-of-2 filled reads
    // as half done when the cascade is actually four long.
    const html = render(seal());
    const steps = html.match(/data-step-state="/g)?.length ?? 0;
    expect(steps).toBe(4);
  });

  it("A DISCIPLINED WAIT IS NEVER DRAWN AS A DEBT", () => {
    const html = render(seal(waitPlan));
    // The selector's own words. The picture must not contradict them.
    expect(html).toContain("No position by design");
    // MANAGED and CLOSED are not owed by a decision that took no position.
    expect(html).toMatch(/data-stage="MANAGED"[^>]*data-step-state="not-owed"/);
    expect(html).toMatch(/data-stage="CLOSED"[^>]*data-step-state="not-owed"/);
    // REVIEWED is still genuinely outstanding — a trader can and should review
    // a WAIT, so marking it "not owed" would be the opposite overreach.
    expect(html).toMatch(/data-stage="REVIEWED"[^>]*data-step-state="awaited"/);
  });

  it("a real trade's unreached stages ARE outstanding, and say so", () => {
    const html = render(seal(longPlan));
    expect(html).toContain("Outcome not yet attached.");
    expect(html).not.toContain('data-step-state="not-owed"');
    expect(html).toMatch(/data-stage="CLOSED"[^>]*data-step-state="awaited"/);
  });

  it("each split axis draws the rating the trader declared, and keeps the fraction", () => {
    const html = render(reviewed());
    for (const score of [4, 5, 4, 3, 5]) {
      expect(html).toContain(`data-score="${score}"`);
    }
    const rungs = html.match(/data-testid="receipt-split-rungs"/g)?.length ?? 0;
    expect(rungs, "one ladder per axis").toBe(5);
    // The fraction is an ADDITION's companion, not its casualty.
    expect(html).toContain("3/5");
  });

  it("the panel does NOT keep its own stage ordering or quality scale", () => {
    // Comments stripped before matching. A source rule that reads raw text
    // fires on the fix's own archaeology, and rules that punish written-down
    // history get the history erased.
    const RAW = readFileSync(
      join(process.cwd(), "src/components/experience/DecisionReceiptPanel.tsx"),
      "utf8",
    );
    const SRC = RAW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(SRC).toMatch(/import\s*\{[^}]*RECEIPT_STAGE_ORDER[^}]*\}/);
    expect(SRC).toMatch(/import\s*\{[^}]*DECISION_QUALITY_MAX[^}]*\}/);
    // No local sequence of the four stage names, in any container.
    expect(SRC).not.toMatch(/"SEALED"\s*,\s*"MANAGED"/);
    // No hardcoded denominator standing in for the imported scale.
    expect(SRC).not.toMatch(/\/5\b/);
  });
});

/**
 * THE FLAT TRADE IS NOT A WIN.
 *
 * The outcome row used to read `realizedR >= 0 ? "#9db88a" : "#e07b5c"` — mint
 * for a gain, warm for a loss. One expression, two separate defects, and the
 * §9 colour sweep only names the first.
 *
 * THE COLOUR is the §9 breach: green means safe, and the house does not get to
 * tell a trader that a profitable trade was therefore a good one. A loss taken
 * BY RULE is the receipt working; a win taken discretionarily is a rule that
 * was broken and got away with it. That fact — the one thing on this row the
 * house actually judges — is printed immediately to the right in muted grey,
 * while the P&L held the loud channel.
 *
 * THE SIGN is the quieter defect, and it survives any colour repair. `>= 0`
 * prefixed a `+` to a scratch, so a trade closed flat was filed under the
 * favourable outcome for free. That is H1's shape: a nothing drawn as a
 * something, in the one place a trader will read fastest.
 *
 * These tests exist because the Sentinel next door CANNOT SEE EITHER FROM
 * SOURCE ALONE. `noGreenInTheRoom` guards the file by shape — it forbids the
 * `realizedR >= 0 ? "#..."` construction — and that guard stays green if the
 * ternary is restored for the SIGN alone, with no colour attached. So these
 * read the rendered glyph instead.
 */
describe("DecisionReceiptPanel — the P&L states its sign and passes no verdict", () => {
  const closed = (realizedR: number) =>
    render(attachOutcome(seal(), { closedAt: 1_800_001_200_000, realizedR, reason: "TARGET" }));

  const text = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

  /** The style of the one span whose whole text is the R figure. */
  const figureStyle = (html: string, glyph: string): string => {
    const m = html.match(
      new RegExp(`<span style="([^"]*)"[^>]*>${glyph.replace(/[+.\-]/g, "\\$&")}</span>`),
    );
    expect(m, `no span renders exactly "${glyph}"`).not.toBeNull();
    return m![1];
  };

  it("DRAWS A SCRATCH AS 0R — NEVER +0R", () => {
    const TEXT = text(closed(0));
    expect(TEXT).toMatch(/(?:^|\s)0R\b/);
    expect(TEXT, "a flat trade filed as a gain").not.toContain("+0R");
  });

  it("keeps the + on a real gain, and does not double the minus on a loss", () => {
    expect(text(closed(1.4))).toContain("+1.4R");
    expect(text(closed(-1))).toContain("-1R");
    // The number already carries its own sign; a prefix on top would read
    // "+-1R" and make the row unparseable at a glance.
    expect(text(closed(-1))).not.toContain("+-1R");
  });

  it("GIVES GAIN, SCRATCH AND LOSS THE SAME IVORY — the house does not cheer", () => {
    const styles = ["+1.4R", "0R", "-1R"].map((glyph, i) =>
      figureStyle(closed([1.4, 0, -1][i]), glyph),
    );
    // One colour across all three outcomes. If any sign gets its own, the
    // panel has started grading the result rather than reporting it.
    expect(new Set(styles).size, "the figure changes appearance with its sign").toBe(1);
    expect(styles[0]).toContain("color:#ede6d3");
  });

  it("carries no green-dominant colour on a winning receipt — §9", () => {
    // The regression this whole block was written over. Read on the RENDERED
    // pixel rather than the source, so a green arriving by any route — a
    // token, a variable, a computed string — still fails here.
    for (const m of closed(1.4).matchAll(/#([0-9a-f]{6})\b/gi)) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
      expect(g > r && g > b, `green-dominant #${m[1]}`).toBe(false);
    }
  });
});
