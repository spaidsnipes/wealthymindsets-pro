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
    // 21/25, 84%, and an averaged 4.2 are all grades nobody recorded.
    expect(html).not.toContain("21/25");
    expect(html).not.toContain("84%");
    expect(html).not.toContain("4.2");
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
