/**
 * selectATHOSIntervention — truth-lock (Shift-AA AA1).
 *
 * Locks the VS-3 ATHOS assistance selector against silent drift. This is the
 * code embodiment of the 2026-08-30 Founder canon "ATH Intelligence System —
 * Spaidbot, ATHOS & Human Strength Constitution": ATHOS INFORMS, the human
 * DECIDES. The selector must NEVER emit an authority verdict (DENY/BLOCK/STOP)
 * — human sovereignty (§10.14) — and must stay SILENT by default (§14).
 *
 * Silent drift here would either (a) make ATHOS chatter when it should be
 * quiet, violating "silence is a feature", or (b) invent a gate ATHOS is
 * forbidden to have — both are canon breaches, not cosmetic bugs.
 */

import { describe, it, expect } from "vitest";
import {
  selectATHOSIntervention,
  rankInterventions,
  type ATHOSInput,
  type ATHOSIntervention,
  type ATHOSMoment,
  type ATHOSVerdict,
} from "./selectATHOSIntervention";
import type { DecisionMemorySnapshot } from "./selectProcessLandscape";
import type { CLCVM } from "../../marketData/viewModels/selectCLC";
import type { DLARVM } from "../../marketData/viewModels/selectDLAR";

// ── Fixtures ────────────────────────────────────────────────────────────

const T0 = 1_700_000_000_000;

function decision(over: Partial<DecisionMemorySnapshot> = {}): DecisionMemorySnapshot {
  return {
    decisionId: over.decisionId ?? "dec-1",
    capturedAt: over.capturedAt ?? T0,
    ownerId: "owner-1",
    sessionIdentity: "sess-1",
    marketStateSummary: {
      regime: null, direction: null, location: null, volatility: null, session: null,
    },
    playbookId: "pb-1",
    playbookVersion: 1,
    plan: { action: "ENTER_LONG", expectedR: 2 },
    ruleAdherenceAtDecision: over.ruleAdherenceAtDecision ?? true,
    externalInfluenceFlagged: false,
    tradeNumberInSession: over.tradeNumberInSession ?? 1,
    outcome: over.outcome,
    review: over.review,
    ...over,
  };
}

function closed(realizedR: number, closedAt: number, id = "dec-c"): DecisionMemorySnapshot {
  return decision({
    decisionId: id,
    outcome: { closedAt, realizedR, reason: realizedR >= 0 ? "TARGET" : "STOP" },
  });
}

function baseInput(over: Partial<ATHOSInput> = {}): ATHOSInput {
  return {
    ownerId: "owner-1",
    sessionIdentity: "sess-1",
    moment: "IDLE",
    nowMs: T0,
    sessionDecisions: [],
    ...over,
  };
}

// Minimal CLC — only legs + verdict/summary/evidence are read by the selector.
function clc(
  ctx: "SATISFIED" | "UNMET",
  loc: "SATISFIED" | "UNMET",
  conf: "SATISFIED" | "UNMET",
): CLCVM {
  const leg = (v: string, ev: string) => ({
    verdict: v,
    summary: `${v} leg`,
    evidence: [{ eventId: ev }],
  });
  return {
    verdict: "PARTIAL",
    context: leg(ctx, "ev-ctx"),
    location: leg(loc, "ev-loc"),
    confirmation: leg(conf, "ev-conf"),
  } as unknown as CLCVM;
}

// Minimal DLAR — only response.* + narrative are read.
function dlar(responseVerdict: string): DLARVM {
  return {
    narrative: "test narrative",
    response: {
      verdict: responseVerdict,
      displacementRatio: 0.4,
      evidence: [{ eventId: "ev-resp" }],
    },
  } as unknown as DLARVM;
}

const ALLOWED: ReadonlySet<ATHOSVerdict> = new Set(["NONE", "NOTICE", "ADVISORY", "CAUTION"]);

// ── Silence is the default ──────────────────────────────────────────────

describe("selectATHOSIntervention — silence is a feature (§14)", () => {
  it("IDLE moment with no decisions → zero interventions", () => {
    const r = selectATHOSIntervention(baseInput({ moment: "IDLE" }));
    expect(r.interventions).toHaveLength(0);
    expect(r.reason).toContain("silence");
  });

  it("evaluatedAt echoes the injected nowMs (deterministic, no wall clock)", () => {
    const r = selectATHOSIntervention(baseInput({ nowMs: 42 }));
    expect(r.evaluatedAt).toBe(42);
  });

  it("PRE_ENTRY without CLC/DLAR stays silent (no evidence, no chatter)", () => {
    const r = selectATHOSIntervention(baseInput({ moment: "PRE_ENTRY" }));
    expect(r.interventions).toHaveLength(0);
  });
});

// ── Human sovereignty: never an authority verdict ───────────────────────

describe("selectATHOSIntervention — never emits DENY/BLOCK/STOP (§10.14)", () => {
  it("every possible intervention verdict is within the informational scale", () => {
    const moments: ATHOSMoment[] = [
      "PRE_ENTRY", "AT_ENTRY_TRIGGER", "IN_POSITION", "AT_EXIT",
      "POST_EXIT", "PRE_REENTRY", "POST_RULE_VIOLATION", "IDLE", "SESSION_REVIEW",
    ];
    for (const moment of moments) {
      const r = selectATHOSIntervention(baseInput({
        moment,
        clc: clc("SATISFIED", "SATISFIED", "UNMET"),
        dlar: dlar("ABSORBED"),
        maxTradesPerSession: 1,
        maxLossesPerSession: 1,
        sessionDecisions: [closed(-1, T0 - 60_000, "l1"), closed(1, T0 - 30_000, "w1")],
      }));
      for (const iv of r.interventions) {
        expect(ALLOWED.has(iv.verdict)).toBe(true);
      }
    }
  });
});

// ── Pre-entry confirmation notice ───────────────────────────────────────

describe("detectPreEntryConfirmation", () => {
  it("Context + Location satisfied, Confirmation unmet → NOTICE / OBSERVED", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_ENTRY",
      clc: clc("SATISFIED", "SATISFIED", "UNMET"),
      dlar: dlar("NEUTRAL"),
    }));
    const hit = r.interventions.find((i) => i.id.startsWith("preentry-await-confirmation"));
    expect(hit).toBeDefined();
    expect(hit!.verdict).toBe("NOTICE");
    expect(hit!.evidenceClass).toBe("OBSERVED");
    expect(hit!.evidenceIds).toContain("ev-ctx");
    expect(hit!.evidenceIds).toContain("ev-loc");
  });

  it("all three legs satisfied → no confirmation notice (nothing outstanding)", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "AT_ENTRY_TRIGGER",
      clc: clc("SATISFIED", "SATISFIED", "SATISFIED"),
      dlar: dlar("NEUTRAL"),
    }));
    expect(r.interventions.find((i) => i.id.startsWith("preentry-await-confirmation"))).toBeUndefined();
  });
});

// ── Pre-entry absorption advisory ───────────────────────────────────────

describe("detectPreEntryAbsorption", () => {
  it("DLAR response ABSORBED → ADVISORY", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_ENTRY",
      dlar: dlar("ABSORBED"),
    }));
    const hit = r.interventions.find((i) => i.id.startsWith("preentry-absorption"));
    expect(hit).toBeDefined();
    expect(hit!.verdict).toBe("ADVISORY");
    expect(hit!.evidenceClass).toBe("OBSERVED");
  });

  it("non-ABSORBED response → no absorption advisory", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_ENTRY",
      dlar: dlar("RESPONDING"),
    }));
    expect(r.interventions.find((i) => i.id.startsWith("preentry-absorption"))).toBeUndefined();
  });
});

// ── Post-exit continuation integrity ────────────────────────────────────

describe("detectPostExitContinuationIntegrity", () => {
  it("recent exit (<30m) → NOTICE / SYSTEM_CANDIDATE", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "POST_EXIT",
      nowMs: T0,
      sessionDecisions: [closed(1.5, T0 - 10 * 60_000, "e1")],
    }));
    const hit = r.interventions.find((i) => i.id.startsWith("post-exit-integrity"));
    expect(hit).toBeDefined();
    expect(hit!.verdict).toBe("NOTICE");
    expect(hit!.evidenceClass).toBe("SYSTEM_CANDIDATE");
  });

  it("stale exit (>30m) → silent", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "POST_EXIT",
      nowMs: T0,
      sessionDecisions: [closed(1.5, T0 - 45 * 60_000, "e1")],
    }));
    expect(r.interventions.find((i) => i.id.startsWith("post-exit-integrity"))).toBeUndefined();
  });

  it("no closed decision → silent", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "POST_EXIT",
      sessionDecisions: [decision({ decisionId: "open-1" })],
    }));
    expect(r.interventions).toHaveLength(0);
  });
});

// ── Pre-reentry missed-profit revenge ───────────────────────────────────

describe("detectPreReentryMissedProfitRevenge", () => {
  it("winner exited within window → CAUTION", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_REENTRY",
      nowMs: T0,
      sessionDecisions: [closed(2, T0 - 2 * 60_000, "w1")],
    }));
    const hit = r.interventions.find((i) => i.id.startsWith("pre-reentry-missed-profit"));
    expect(hit).toBeDefined();
    expect(hit!.verdict).toBe("CAUTION");
  });

  it("prior loser → no missed-profit caution (only fires on a winner)", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_REENTRY",
      nowMs: T0,
      sessionDecisions: [closed(-1, T0 - 2 * 60_000, "l1")],
    }));
    expect(r.interventions.find((i) => i.id.startsWith("pre-reentry-missed-profit"))).toBeUndefined();
  });

  it("winner outside the re-entry window → silent for this detector", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_REENTRY",
      nowMs: T0,
      reentryWindowMs: 60_000,
      sessionDecisions: [closed(2, T0 - 10 * 60_000, "w1")],
    }));
    expect(r.interventions.find((i) => i.id.startsWith("pre-reentry-missed-profit"))).toBeUndefined();
  });
});

// ── Success-triggered rule bending ──────────────────────────────────────

describe("detectSuccessTriggeredRuleBending", () => {
  it("attempted >= max trades AND at least one winner → CAUTION", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_REENTRY",
      maxTradesPerSession: 2,
      sessionDecisions: [closed(1, T0 - 5 * 60_000, "w1"), closed(-0.5, T0 - 3 * 60_000, "x2")],
    }));
    const hit = r.interventions.find((i) => i.id.startsWith("success-triggered-rule-bending"));
    expect(hit).toBeDefined();
    expect(hit!.verdict).toBe("CAUTION");
  });

  it("under the trade-count plan → silent", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_ENTRY",
      maxTradesPerSession: 3,
      sessionDecisions: [closed(1, T0 - 5 * 60_000, "w1")],
    }));
    expect(r.interventions.find((i) => i.id.startsWith("success-triggered-rule-bending"))).toBeUndefined();
  });

  it("at/over the plan but no winner → silent (bending is success-triggered)", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_ENTRY",
      maxTradesPerSession: 1,
      sessionDecisions: [closed(-1, T0 - 5 * 60_000, "l1")],
    }));
    expect(r.interventions.find((i) => i.id.startsWith("success-triggered-rule-bending"))).toBeUndefined();
  });
});

// ── Post-rule-violation process/outcome separation ──────────────────────

describe("detectPostRuleViolationSeparation", () => {
  it("rule-adherence violations present at SESSION_REVIEW → ADVISORY", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "SESSION_REVIEW",
      sessionDecisions: [
        decision({ decisionId: "v1", ruleAdherenceAtDecision: false, outcome: { closedAt: T0, realizedR: 1.2, reason: "TARGET" } }),
      ],
    }));
    const hit = r.interventions.find((i) => i.id.startsWith("process-outcome-separation"));
    expect(hit).toBeDefined();
    expect(hit!.verdict).toBe("ADVISORY");
  });

  it("no violations → silent", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "SESSION_REVIEW",
      sessionDecisions: [decision({ decisionId: "ok", ruleAdherenceAtDecision: true })],
    }));
    expect(r.interventions.find((i) => i.id.startsWith("process-outcome-separation"))).toBeUndefined();
  });
});

// ── Max-losses reached (informational, never a gate) ────────────────────

describe("detectMaxLossesReached", () => {
  it("losses >= max → CAUTION (informational only, no gate)", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "IN_POSITION",
      maxLossesPerSession: 2,
      sessionDecisions: [closed(-1, T0 - 8 * 60_000, "l1"), closed(-0.7, T0 - 4 * 60_000, "l2")],
    }));
    const hit = r.interventions.find((i) => i.id.startsWith("max-losses"));
    expect(hit).toBeDefined();
    expect(hit!.verdict).toBe("CAUTION");
    // Canon: informational, agency retained — never DENY/BLOCK/STOP.
    expect(ALLOWED.has(hit!.verdict)).toBe(true);
  });

  it("below the loss limit → silent", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "IN_POSITION",
      maxLossesPerSession: 3,
      sessionDecisions: [closed(-1, T0 - 8 * 60_000, "l1")],
    }));
    expect(r.interventions.find((i) => i.id.startsWith("max-losses"))).toBeUndefined();
  });

  it("no rule configured → silent", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "IN_POSITION",
      sessionDecisions: [closed(-1, T0 - 8 * 60_000, "l1")],
    }));
    expect(r.interventions.find((i) => i.id.startsWith("max-losses"))).toBeUndefined();
  });
});

// ── rankInterventions ordering ──────────────────────────────────────────

describe("rankInterventions", () => {
  const mk = (verdict: ATHOSVerdict, id: string): ATHOSIntervention => ({
    id, verdict, moment: "IDLE", headline: id, evidenceClass: "OBSERVED",
    evidenceIds: [], reason: id,
  });

  it("orders CAUTION > ADVISORY > NOTICE", () => {
    const ranked = rankInterventions([mk("NOTICE", "n"), mk("CAUTION", "c"), mk("ADVISORY", "a")]);
    expect(ranked.map((i) => i.verdict)).toEqual(["CAUTION", "ADVISORY", "NOTICE"]);
  });

  it("is a pure copy — does not mutate the input array", () => {
    const input = [mk("NOTICE", "n"), mk("CAUTION", "c")];
    const ranked = rankInterventions(input);
    expect(input.map((i) => i.verdict)).toEqual(["NOTICE", "CAUTION"]);
    expect(ranked).not.toBe(input);
  });
});
