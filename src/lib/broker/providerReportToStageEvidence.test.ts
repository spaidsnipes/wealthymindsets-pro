import { describe, expect, it } from "vitest";
import {
  providerReportToStageEvidence,
  providerReportToCheckedStageEvidence,
} from "./providerReportToStageEvidence";
import { CAPABILITY_STAGES, selectFirstBrokenJoint } from "./selectFirstBrokenJoint";

type Report = Parameters<typeof providerReportToStageEvidence>[0];

/** The shape `/api/broker/status` emits for a fully wired, fully proven provider. */
const PROVEN: Report = {
  implemented: true,
  envConfigured: true,
  connected: true,
  note: "Adapter authenticated this process lifecycle.",
};

/**
 * The shape moomooAdapter actually emits today: real code, credentials
 * deployed, and `connected: false` because it refuses to claim a
 * connection it did not observe this request.
 */
const MOOMOO_SHAPED: Report = {
  implemented: true,
  envConfigured: true,
  connected: false,
  note: "WM Pro receives Moomoo data through an authenticated OpenD bridge.",
};

describe("providerReportToStageEvidence — the one judgement", () => {
  /**
   * The load-bearing test of this module. `connected: false` is an
   * ABSENCE OF OBSERVATION, not an observation of refusal. Reporting it
   * as FAIL would invent a defect and send a human to debug an
   * authentication that was never attempted.
   */
  it("reads connected:false as UNKNOWN, never as FAIL", () => {
    const map = providerReportToStageEvidence(MOOMOO_SHAPED);
    expect(map.AUTHENTICATED?.state).toBe("UNKNOWN");
    expect(map.AUTHENTICATED?.state).not.toBe("FAIL");
  });

  /**
   * And the consequence a human actually reads. The card must say "go
   * measure this", not "this is broken" — the two have opposite next
   * actions, which is the entire UNKNOWN-vs-FAIL distinction.
   */
  it("makes a moomoo-shaped provider a GAP at AUTHENTICATED, not a break", () => {
    const v = selectFirstBrokenJoint(providerReportToStageEvidence(MOOMOO_SHAPED));
    expect(v.verdictClass).toBe("UNMEASURED_JOINT");
    expect(v.firstUnmeasuredJoint).toBe("AUTHENTICATED");
    expect(v.firstBrokenJoint).toBeNull();
    expect(v.provenThrough).toBe("DEPLOYED_SECRET_PRESENT");
  });

  /**
   * The asymmetry that makes the rung above defensible. For
   * DEPLOYED_SECRET_PRESENT the observer and the observed are the SAME
   * PROCESS, so absence really is evidence. For AUTHENTICATED the
   * observed party is remote, and silence proves nothing.
   */
  it("reads envConfigured:false as a measured FAIL, because the process read its own env", () => {
    const map = providerReportToStageEvidence({
      ...PROVEN,
      envConfigured: false,
      note: "host carries neither bridge name",
    });
    expect(map.DEPLOYED_SECRET_PRESENT?.state).toBe("FAIL");
    const v = selectFirstBrokenJoint(map);
    expect(v.verdictClass).toBe("BROKEN_JOINT");
    expect(v.firstBrokenJoint).toBe("DEPLOYED_SECRET_PRESENT");
    expect(v.headline).toContain("host carries neither bridge name");
  });
});

describe("providerReportToStageEvidence — what it refuses to claim", () => {
  /**
   * FALSE_RIPENESS guard. The endpoint measures three things. A card with
   * nine blanks looks unfinished, and filling them to look finished is
   * precisely the collapse the ladder exists to prevent. The nine blanks
   * ARE the finding: they show how far provider proof actually reaches.
   */
  it("emits at most the three rungs the report can answer", () => {
    for (const r of [PROVEN, MOOMOO_SHAPED]) {
      const keys = Object.keys(providerReportToStageEvidence(r));
      expect(keys.length).toBeLessThanOrEqual(3);
      for (const k of keys) {
        expect(["CONFIGURED", "DEPLOYED_SECRET_PRESENT", "AUTHENTICATED"]).toContain(k);
      }
    }
  });

  it("never claims a rung below AUTHENTICATED, even when everything it measured passed", () => {
    const map = providerReportToStageEvidence(PROVEN);
    const below = CAPABILITY_STAGES.slice(CAPABILITY_STAGES.indexOf("AUTHENTICATED") + 1);
    expect(below.length).toBeGreaterThan(0);
    for (const stage of below) {
      expect(map[stage]).toBeUndefined();
    }
    // And the fully-passing provider is still honestly a GAP, not PROVEN.
    expect(selectFirstBrokenJoint(map).verdictClass).toBe("UNMEASURED_JOINT");
    expect(selectFirstBrokenJoint(map).firstUnmeasuredJoint).toBe("ENTITLED");
  });

  /**
   * With no adapter there is nothing to authenticate WITH. Emitting
   * UNKNOWN downstream would invite someone to "go measure it," which
   * cannot be done; omitting it lets the walk say UNREACHED instead.
   */
  it("stops at CONFIGURED when no adapter exists, rather than emitting measurable-looking gaps", () => {
    const map = providerReportToStageEvidence({
      implemented: false,
      envConfigured: false,
      connected: false,
      note: "No server-side adapter code path exists for this provider.",
    });
    expect(Object.keys(map)).toEqual(["CONFIGURED"]);
    const v = selectFirstBrokenJoint(map);
    expect(v.firstBrokenJoint).toBe("CONFIGURED");
    expect(v.stages.find((s) => s.stage === "AUTHENTICATED")?.state).toBe("UNREACHED");
  });
});

describe("providerReportToCheckedStageEvidence", () => {
  it("passes every emitted rung through the evidence assertion", () => {
    expect(() => providerReportToCheckedStageEvidence(PROVEN)).not.toThrow();
    expect(() => providerReportToCheckedStageEvidence(MOOMOO_SHAPED)).not.toThrow();
  });

  /**
   * A causeless FAIL is half the "blocked" / "API issue" non-diagnosis the
   * Command Center bans. An empty note must not become a red with nothing
   * to read, so the mapping substitutes a stated fallback rather than
   * emitting an empty string and letting the assertion throw on a
   * provider the Founder is merely looking at.
   */
  it("never produces a causeless FAIL, even from a report with a blank note", () => {
    const map = providerReportToCheckedStageEvidence({
      implemented: false,
      envConfigured: false,
      connected: false,
      note: "   ",
    });
    expect(map.CONFIGURED?.state).toBe("FAIL");
    expect((map.CONFIGURED?.note ?? "").trim().length).toBeGreaterThan(10);
  });
});
