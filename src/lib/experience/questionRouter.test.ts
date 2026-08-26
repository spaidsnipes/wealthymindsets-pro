/**
 * questionRouter tests — the router compiles the ONE dominant question from
 * (job mode) × (canonical One Story signals). It must never invent a market
 * claim, must branch honestly on contradiction/missing/right-of-way, and must
 * stay safe when the engine is silent (null One Story).
 */

import { describe, it, expect } from "vitest";
import { routeQuestion, QUESTION_ROUTER_VERSION } from "./questionRouter";
import type { OneStoryVM } from "../marketData/viewModels/selectOneStory";
import type {
  RightOfWay,
  RightOfWayReading,
  EvidenceDebt,
} from "../marketData/viewModels/decisionPermissionCompiler";

function reading(value: RightOfWay): RightOfWayReading {
  return { value, detail: `${value} detail`, tone: "pending" };
}

function story(
  over: Partial<OneStoryVM> & { decision?: RightOfWayReading } = {},
): OneStoryVM {
  return {
    primary: "Market is in balance around a fair-value zone.",
    contradiction: null,
    missing: null,
    decision: over.decision ?? reading("UNKNOWN"),
    debt: null,
    ...over,
  };
}

const debt: EvidenceDebt = {
  total: 3,
  resolved: 1,
  missing: 1,
  warn: 1,
  missingLabels: ["order flow"],
  warnLabels: ["volatility"],
};

describe("questionRouter", () => {
  it("exposes a stable version", () => {
    expect(QUESTION_ROUTER_VERSION).toBe("wm.question-router.v1");
  });

  it("returns a non-empty question for every mode, with and without a story", () => {
    const modes = [
      "PREP",
      "OBSERVE",
      "WAIT",
      "EXECUTE",
      "MANAGE",
      "REVIEW",
      "LEARN",
    ] as const;
    for (const m of modes) {
      expect(routeQuestion(m, null).length).toBeGreaterThan(0);
      expect(routeQuestion(m, story()).length).toBeGreaterThan(0);
    }
  });

  it("PREP is invariant to engine state (plan + invalidation)", () => {
    expect(routeQuestion("PREP", null)).toContain("invalidation");
    expect(routeQuestion("PREP", story({ contradiction: "x" }))).toContain(
      "invalidation",
    );
  });

  it("OBSERVE distinguishes a live story from still-forming evidence", () => {
    expect(routeQuestion("OBSERVE", story())).toBe(
      "What is the market actually doing right now?",
    );
    expect(routeQuestion("OBSERVE", null)).toContain("still forming");
  });

  it("WAIT prioritises a live contradiction above all other signals", () => {
    const s = story({
      contradiction: "sellers absorbing",
      missing: "order flow",
      decision: reading("ACTION"),
    });
    expect(routeQuestion("WAIT", s)).toBe(
      "Is this contradiction fatal to the thesis, or noise?",
    );
  });

  it("WAIT asks about decay when confirmation is still missing", () => {
    expect(routeQuestion("WAIT", story({ missing: "order flow" }))).toBe(
      "Is my confirmation arriving, or is the thesis decaying?",
    );
  });

  it("WAIT recognises open right-of-way as a location question", () => {
    expect(routeQuestion("WAIT", story({ decision: reading("ACTION") }))).toContain(
      "planned location",
    );
  });

  it("WAIT asks the stand-down question on a NO TRADE verdict (never 'earned my entry')", () => {
    // A hard-rejected setup must not be phrased as if entry is still pending.
    const q = routeQuestion("WAIT", story({ decision: reading("NO TRADE") }));
    expect(q).toContain("rejected");
    expect(q).not.toBe("Has the market earned my entry yet?");
  });

  it("WAIT still lets a live contradiction outrank a NO TRADE verdict", () => {
    // The trader's most urgent cognitive question when the thesis is contradicted
    // stays first; NO TRADE only governs the otherwise-quiet case.
    const q = routeQuestion(
      "WAIT",
      story({ contradiction: "sellers absorbing", decision: reading("NO TRADE") }),
    );
    expect(q).toBe("Is this contradiction fatal to the thesis, or noise?");
  });

  it("WAIT asks the degraded-conditions question on a CAUTION verdict (never 'earned my entry')", () => {
    // CAUTION is a degraded grant, not still-pending permission — the
    // earned-entry fallback would misrepresent it.
    const q = routeQuestion("WAIT", story({ decision: reading("CAUTION") }));
    expect(q).toContain("degraded");
    expect(q).not.toBe("Has the market earned my entry yet?");
  });

  it("WAIT still lets a live contradiction outrank a CAUTION verdict", () => {
    const q = routeQuestion(
      "WAIT",
      story({ contradiction: "sellers absorbing", decision: reading("CAUTION") }),
    );
    expect(q).toBe("Is this contradiction fatal to the thesis, or noise?");
  });

  it("WAIT falls back to the earned-entry question when quiet", () => {
    expect(routeQuestion("WAIT", story())).toBe(
      "Has the market earned my entry yet?",
    );
  });

  it("EXECUTE branches to stand-down on a blocked right-of-way", () => {
    expect(
      routeQuestion("EXECUTE", story({ decision: reading("NO TRADE") })),
    ).toContain("stand down");
  });

  it("EXECUTE asks about cut size on a CAUTION (degraded) grant, not the clean price re-check", () => {
    // A degraded verdict must not be phrased like the clean ACTION grant.
    const q = routeQuestion("EXECUTE", story({ decision: reading("CAUTION") }));
    expect(q).toContain("degraded");
    expect(q).toContain("size");
    expect(q).not.toBe("Is right-of-way still granted at this exact price?");
  });

  it("EXECUTE otherwise re-checks right-of-way at the exact price", () => {
    expect(routeQuestion("EXECUTE", story({ decision: reading("ACTION") }))).toContain(
      "exact price",
    );
  });

  it("MANAGE surfaces thesis breakdown when contradicted", () => {
    expect(
      routeQuestion("MANAGE", story({ contradiction: "momentum stalling" })),
    ).toContain("break down");
  });

  it("MANAGE otherwise asks if the position is behaving as expected", () => {
    expect(routeQuestion("MANAGE", story())).toContain("still doing what I expected");
  });

  it("REVIEW is retrospective and engine-invariant", () => {
    expect(routeQuestion("REVIEW", null)).toBe(
      "What did I — and the market — actually do?",
    );
  });

  it("LEARN targets missed evidence when there is an unpaid debt", () => {
    expect(routeQuestion("LEARN", story({ missing: "order flow", debt }))).toContain(
      "evidence did I miss",
    );
  });

  it("LEARN otherwise targets the next weakness to train", () => {
    expect(routeQuestion("LEARN", story())).toContain("weakness do I train next");
  });
});
