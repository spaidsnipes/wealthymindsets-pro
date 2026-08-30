import { describe, expect, it } from "vitest";
import {
  CHALLENGE_JOURNEY,
  CHALLENGE_EXECUTION_BOUNDARY,
  CHALLENGE_ENROLLMENT_BOUNDARY,
} from "./challengeJourney";

describe("Academy Challenge journey", () => {
  it("keeps one ordered learn-plan-practice-review loop", () => {
    expect(CHALLENGE_JOURNEY.map((stage) => stage.id)).toEqual([
      "learn",
      "plan",
      "practice",
      "review",
    ]);
    expect(CHALLENGE_JOURNEY.map((stage) => stage.step)).toEqual([1, 2, 3, 4]);
  });

  it("routes practice to paper simulation and never to a live broker", () => {
    const practice = CHALLENGE_JOURNEY.find((stage) => stage.id === "practice");
    expect(practice).toMatchObject({ href: "/paper", truth: "PAPER_SIMULATION" });
    expect(CHALLENGE_JOURNEY.some((stage) => /broker|trade/i.test(stage.href))).toBe(false);
  });

  it("does not duplicate destinations or truth ownership", () => {
    expect(new Set(CHALLENGE_JOURNEY.map((stage) => stage.href)).size).toBe(
      CHALLENGE_JOURNEY.length,
    );
    expect(CHALLENGE_JOURNEY.every((stage) => stage.truth.length > 0)).toBe(true);
  });

  it("keeps live execution fail-closed", () => {
    expect(CHALLENGE_EXECUTION_BOUNDARY).toBe("LIVE_EXECUTION_EXCLUDED");
    expect(CHALLENGE_ENROLLMENT_BOUNDARY).toBe("ENROLLMENT_NOT_CONNECTED");
  });

  it("keeps every step internal and free of payment, enrollment, and live-order promises", () => {
    for (const stage of CHALLENGE_JOURNEY) {
      expect(stage.href.startsWith("/")).toBe(true);
      expect(`${stage.title} ${stage.description} ${stage.action}`).not.toMatch(
        /pay|purchase|enroll|funded|live order|earnings/i,
      );
    }
  });
});
