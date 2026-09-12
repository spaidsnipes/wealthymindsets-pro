import { describe, expect, it } from "vitest";
import {
  CAPABILITY_STAGES,
  STAGE_QUESTION,
  assertStageEvidence,
  selectFirstBrokenJoint,
  type CapabilityStage,
  type StageEvidenceMap,
} from "./selectFirstBrokenJoint";
import { HEALTH_DIMENSIONS } from "@/lib/ops/healthDimensions";

/** Build a map that passes every rung up to (not including) `stopAt`. */
function passUntil(stopAt: CapabilityStage): StageEvidenceMap {
  const map: Record<string, { state: "PASS" }> = {};
  for (const stage of CAPABILITY_STAGES) {
    if (stage === stopAt) break;
    map[stage] = { state: "PASS" };
  }
  return map as StageEvidenceMap;
}

const ALL_PASS: StageEvidenceMap = Object.fromEntries(
  CAPABILITY_STAGES.map((s) => [s, { state: "PASS" as const }]),
) as StageEvidenceMap;

describe("capability ladder vocabulary", () => {
  it("carries the Command Center's twelve rungs in its stated order", () => {
    expect([...CAPABILITY_STAGES]).toEqual([
      "CONFIGURED",
      "DEPLOYED_SECRET_PRESENT",
      "AUTHENTICATED",
      "ENTITLED",
      "AVAILABLE",
      "FRESH",
      "NORMALIZED",
      "UI_PROJECTED",
      "EXECUTABLE",
      "RECONCILABLE",
      "RECOVERABLE",
      "HUMAN_PROVEN",
    ]);
  });

  it("glosses every rung — a rung with no question invites an invented one", () => {
    for (const stage of CAPABILITY_STAGES) {
      expect(STAGE_QUESTION[stage]?.length ?? 0).toBeGreaterThan(10);
    }
  });

  /**
   * G2 pin. The ladder and HEALTH_DIMENSIONS share five words. They are the
   * SAME concept and must stay spelled the same, so a rename in the
   * dimension owner fails here instead of silently forking the vocabulary
   * — the exact drift class that produced the retyped broker list in
   * /api/broker/status.
   */
  it("spells its five shared rungs exactly as healthDimensions does", () => {
    const shared = ["ENTITLED", "AVAILABLE", "FRESH", "EXECUTABLE", "RECOVERABLE"] as const;
    for (const name of shared) {
      expect(HEALTH_DIMENSIONS).toContain(name);
      expect(CAPABILITY_STAGES).toContain(name);
    }
  });

  /**
   * The near-miss guard. AUTHENTICATED (did the provider accept who we say
   * we are?) and AUTHORIZED (is this actor permitted to act?) are different
   * questions. Webull measured credential-ready while both signing profiles
   * returned BLOCKED_AUTH — credentials present, identity rejected. If a
   * future tidy-up "unifies" these two words, that distinction dies and this
   * test is what stops it.
   */
  it("keeps AUTHENTICATED and AUTHORIZED in separate vocabularies", () => {
    expect(CAPABILITY_STAGES).toContain("AUTHENTICATED");
    expect(CAPABILITY_STAGES).not.toContain("AUTHORIZED");
    expect(HEALTH_DIMENSIONS).toContain("AUTHORIZED");
    expect(HEALTH_DIMENSIONS).not.toContain("AUTHENTICATED");
  });
});

describe("selectFirstBrokenJoint — naming the rung", () => {
  it("names a measured failure as the first broken joint", () => {
    const v = selectFirstBrokenJoint({
      ...passUntil("AUTHENTICATED"),
      AUTHENTICATED: { state: "FAIL", note: "HTTP 401 from both signing profiles." },
    });
    expect(v.verdictClass).toBe("BROKEN_JOINT");
    expect(v.firstBrokenJoint).toBe("AUTHENTICATED");
    expect(v.provenThrough).toBe("DEPLOYED_SECRET_PRESENT");
    expect(v.headline).toContain("AUTHENTICATED");
    expect(v.headline).toContain("HTTP 401");
  });

  it("names an unmeasured rung as a gap, not as a failure", () => {
    const v = selectFirstBrokenJoint(passUntil("AUTHENTICATED"));
    expect(v.verdictClass).toBe("UNMEASURED_JOINT");
    expect(v.firstUnmeasuredJoint).toBe("AUTHENTICATED");
    expect(v.firstBrokenJoint).toBeNull();
    expect(v.nextDiscriminatingAction).toContain("not a proven defect");
  });

  /**
   * The requirement in the ticket's own words: "without collapsing
   * capability stages." One failure must produce ONE finding, not eleven.
   */
  it("marks every rung below the break UNREACHED, not FAIL", () => {
    const v = selectFirstBrokenJoint({
      ...passUntil("AUTHENTICATED"),
      AUTHENTICATED: { state: "FAIL", note: "bridge refused the credential" },
    });
    const below = v.stages.slice(CAPABILITY_STAGES.indexOf("AUTHENTICATED") + 1);
    // Derived from the ladder, not hand-counted. A literal here was wrong on
    // the first run (8 vs 9) and would silently stop meaning "everything
    // below" the moment a thirteenth rung is added.
    expect(below.length).toBe(CAPABILITY_STAGES.length - CAPABILITY_STAGES.indexOf("AUTHENTICATED") - 1);
    expect(below.length).toBeGreaterThan(0);
    expect(below.every((s) => s.state === "UNREACHED")).toBe(true);
    expect(v.stages.filter((s) => s.state === "FAIL")).toHaveLength(1);
  });

  it("always reports all twelve rungs, never a filtered subset", () => {
    for (const map of [ALL_PASS, {}, passUntil("FRESH")]) {
      const v = selectFirstBrokenJoint(map);
      expect(v.stages).toHaveLength(CAPABILITY_STAGES.length);
      expect(v.stages.map((s) => s.stage)).toEqual([...CAPABILITY_STAGES]);
    }
  });

  it("reports PROVEN_THROUGH only when every rung passed", () => {
    const v = selectFirstBrokenJoint(ALL_PASS);
    expect(v.verdictClass).toBe("PROVEN_THROUGH");
    expect(v.firstBrokenJoint).toBeNull();
    expect(v.firstUnmeasuredJoint).toBeNull();
    expect(v.provenThrough).toBe("HUMAN_PROVEN");
  });

  it("treats an entirely unmeasured provider as a gap at the very first rung", () => {
    const v = selectFirstBrokenJoint({});
    expect(v.verdictClass).toBe("UNMEASURED_JOINT");
    expect(v.firstUnmeasuredJoint).toBe("CONFIGURED");
    expect(v.provenThrough).toBeNull();
    expect(v.headline).toContain("Nothing proven yet");
  });

  /**
   * NOT_APPLICABLE must not halt the walk. A read-only market-data lane has
   * no EXECUTABLE rung, but it still has RECOVERABLE and HUMAN_PROVEN rungs
   * that matter; stopping at EXECUTABLE would hide them behind a stage that
   * was never relevant to the capability.
   */
  it("steps over NOT_APPLICABLE rungs instead of stopping on them", () => {
    const v = selectFirstBrokenJoint({
      ...ALL_PASS,
      EXECUTABLE: { state: "NOT_APPLICABLE", note: "read-only market-data lane" },
      RECONCILABLE: { state: "NOT_APPLICABLE" },
    });
    expect(v.verdictClass).toBe("PROVEN_THROUGH");
    expect(v.provenThrough).toBe("HUMAN_PROVEN");
    expect(v.stages.find((s) => s.stage === "EXECUTABLE")?.state).toBe("NOT_APPLICABLE");
  });
});

describe("selectFirstBrokenJoint — direction of error", () => {
  /**
   * The load-bearing safety property: this function can only ever DOWNGRADE.
   * A PASS appears in the output if and only if the caller supplied PASS.
   * A false PASS here would tell the Founder a broker rung is proven when it
   * is not — the FALSE_RIPENESS the ladder exists to prevent.
   */
  it("never reports PASS for a rung the caller did not supply as PASS", () => {
    const maps: StageEvidenceMap[] = [
      {},
      ALL_PASS,
      passUntil("ENTITLED"),
      { ...passUntil("FRESH"), FRESH: { state: "FAIL", note: "observation 40m old" } },
      { ...ALL_PASS, AUTHENTICATED: { state: "UNKNOWN" } },
      { ...ALL_PASS, CONFIGURED: { state: "NOT_APPLICABLE" } },
    ];
    for (const map of maps) {
      const v = selectFirstBrokenJoint(map);
      for (const verdict of v.stages) {
        if (verdict.state === "PASS") {
          expect(map[verdict.stage]?.state).toBe("PASS");
        }
      }
    }
  });

  /**
   * Evidence gathered BELOW a broken joint is overridden to UNREACHED even
   * though it was supplied as PASS. A probe claiming ENTITLED=PASS while
   * AUTHENTICATED=FAIL is describing a cached or assumed entitlement, not a
   * measured one; promoting it would let one stale reading certify a rung
   * the provider never answered on this pass.
   */
  it("refuses a supplied PASS that sits below a broken joint", () => {
    const v = selectFirstBrokenJoint({
      ...ALL_PASS,
      AUTHENTICATED: { state: "FAIL", note: "401" },
    });
    expect(v.stages.find((s) => s.stage === "ENTITLED")?.state).toBe("UNREACHED");
    expect(v.stages.find((s) => s.stage === "HUMAN_PROVEN")?.state).toBe("UNREACHED");
  });

  it("reports the break, not the gap, when a provider has both", () => {
    const v = selectFirstBrokenJoint({
      CONFIGURED: { state: "PASS" },
      DEPLOYED_SECRET_PRESENT: { state: "FAIL", note: "host carries neither bridge name" },
      AUTHENTICATED: { state: "UNKNOWN" },
    });
    expect(v.verdictClass).toBe("BROKEN_JOINT");
    expect(v.firstBrokenJoint).toBe("DEPLOYED_SECRET_PRESENT");
    expect(v.firstUnmeasuredJoint).toBeNull();
  });
});

describe("assertStageEvidence", () => {
  /**
   * "A failure must name the first failed rung. 'Keys missing,' 'API issue,'
   * 'blocked,' 'connected,' or 'ready' alone is invalid." A named rung with
   * an unnamed cause is half of that non-diagnosis, caught where the
   * evidence is built rather than where it is rendered.
   */
  it("rejects a FAIL with no cause", () => {
    expect(() => assertStageEvidence("AUTHENTICATED", { state: "FAIL" })).toThrow(/unnamed cause/);
    expect(() => assertStageEvidence("AUTHENTICATED", { state: "FAIL", note: "   " })).toThrow();
  });

  it("accepts a FAIL that names what the provider said", () => {
    expect(() =>
      assertStageEvidence("AUTHENTICATED", { state: "FAIL", note: "HTTP 401, code 40101" }),
    ).not.toThrow();
  });

  it("does not demand a note for states that are not failures", () => {
    expect(() => assertStageEvidence("ENTITLED", { state: "UNKNOWN" })).not.toThrow();
    expect(() => assertStageEvidence("ENTITLED", { state: "PASS" })).not.toThrow();
    expect(() => assertStageEvidence("EXECUTABLE", { state: "NOT_APPLICABLE" })).not.toThrow();
  });
});
