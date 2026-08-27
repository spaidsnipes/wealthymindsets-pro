/**
 * NO TRADE seam — cross-file integration test.
 *
 * Two atoms shipped 2026-08-26 in parallel (`e374845` inferJobMode +
 * `a91c8da` questionRouter) mesh at the seam: when the engine compiles
 * a NO TRADE right-of-way verdict, the OS must
 *
 *   1. suggest OBSERVE (not decay to PREP) — canon: rejection is
 *      decisive, not thin,
 *   2. AND — while the trader is still choosing to WAIT before the
 *      inference lands — surface the honest stand-down question, not
 *      "has the market earned my entry yet?" which implies pending.
 *
 * Each atom has unit tests. This file locks the COMPOSITION so a
 * future refactor can't break the seam by only touching one side.
 */

import { describe, it, expect } from "vitest";
import { inferJobMode, type JobModeSignals } from "./inferJobMode";
import { routeQuestion } from "./questionRouter";
import type { OneStoryVM } from "../marketData/viewModels/selectOneStory";
import type { RightOfWayReading } from "../marketData/viewModels/decisionPermissionCompiler";

const BASE_SIGNALS: JobModeSignals = {
  hasOpenPosition: false,
  hasUnreviewedClose: false,
  decision: null,
  hasResolvedMarketState: false,
};

function reading(): RightOfWayReading {
  return { value: "NO TRADE", detail: "hard rejection", tone: "pending" };
}

function story(over: Partial<OneStoryVM> = {}): OneStoryVM {
  return {
    primary: "Market is in balance around a fair-value zone.",
    contradiction: null,
    missing: null,
    decision: reading(),
    debt: null,
    ...over,
  };
}

describe("NO TRADE seam — inferJobMode ⊗ questionRouter (canon §RightOfWay)", () => {
  it("NO TRADE + no other signals → OBSERVE mode + honest stand-down question", () => {
    // With a NO TRADE verdict and no open position, the inference must
    // suggest OBSERVE ("stand down and watch"), and the question the
    // trader still-in-WAIT sees must be the stand-down question.
    const inferred = inferJobMode({ ...BASE_SIGNALS, decision: "NO TRADE" });
    expect(inferred.suggested).toBe("OBSERVE");

    const q = routeQuestion("WAIT", story());
    expect(q).toContain("setup was rejected");
    expect(q).not.toMatch(/earned my entry/i);
  });

  it("NO TRADE with a live contradiction — contradiction outranks; OBSERVE still holds", () => {
    // The stand-down question is a fallback within WAIT. A live
    // contradiction must still take the first slot.
    const inferred = inferJobMode({ ...BASE_SIGNALS, decision: "NO TRADE" });
    expect(inferred.suggested).toBe("OBSERVE");

    const q = routeQuestion(
      "WAIT",
      story({ contradiction: "sellers absorbing at the level" }),
    );
    expect(q).toMatch(/contradiction/i);
  });

  it("NO TRADE while position open — MANAGE wins the job (open position beats decision)", () => {
    // Composition guard: a NO TRADE verdict must NOT flip a managed
    // position back to OBSERVE. The trader has capital at risk.
    const inferred = inferJobMode({
      ...BASE_SIGNALS,
      decision: "NO TRADE",
      hasOpenPosition: true,
    });
    expect(inferred.suggested).toBe("MANAGE");
  });

  it("resolved OBSERVE mode + NO TRADE → OBSERVE's routeQuestion (no misfired WAIT text)", () => {
    // When the inference has already promoted the trader to OBSERVE,
    // routeQuestion should give the OBSERVE market-doing question,
    // not the WAIT stand-down question — the two must not double-fire.
    const q = routeQuestion("OBSERVE", story());
    expect(q).toMatch(/market/i);
    expect(q).not.toContain("setup was rejected");
  });
});
