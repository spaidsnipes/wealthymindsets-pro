import { describe, it, expect } from "vitest";
import {
  authorizeExecution,
  classifyOrderActionClass,
  type AuthorizationInput,
  type ProposalSource,
} from "./executionAuthority";

/** A minimal valid intent for the gate (only side/qty/symbol are read). */
const okIntent = { side: "buy" as const, qty: 1, symbol: "TSLA" };

function make(partial: Partial<AuthorizationInput>): AuthorizationInput {
  return {
    intent: okIntent,
    source: "human",
    env: "paper",
    rightOfWay: "ACTION",
    humanApproval: null,
    ...partial,
  };
}

describe("classifyOrderActionClass", () => {
  it("classifies a live order as HIGH_IMPACT_ACT (real money)", () => {
    expect(classifyOrderActionClass("live")).toBe("HIGH_IMPACT_ACT");
  });
  it("classifies paper/sandbox as LOW_RISK_ACT (reversible)", () => {
    expect(classifyOrderActionClass("paper")).toBe("LOW_RISK_ACT");
    expect(classifyOrderActionClass("sandbox")).toBe("LOW_RISK_ACT");
  });
});

describe("authorizeExecution — Rule 0: invalid intent", () => {
  it("denies a zero-qty intent", () => {
    const d = authorizeExecution(make({ intent: { ...okIntent, qty: 0 } }));
    expect(d.authorized).toBe(false);
    expect(d.reasonCode).toBe("DENIED_INVALID_INTENT");
  });
  it("denies a negative-qty intent", () => {
    const d = authorizeExecution(make({ intent: { ...okIntent, qty: -5 } }));
    expect(d.authorized).toBe(false);
    expect(d.reasonCode).toBe("DENIED_INVALID_INTENT");
  });
  it("denies an empty-symbol intent", () => {
    const d = authorizeExecution(make({ intent: { ...okIntent, symbol: "" } }));
    expect(d.authorized).toBe(false);
    expect(d.reasonCode).toBe("DENIED_INVALID_INTENT");
  });
});

describe("authorizeExecution — Rule 1: live requires human approval", () => {
  it("denies a live human order with NO approval token", () => {
    const d = authorizeExecution(make({ env: "live", humanApproval: null }));
    expect(d.authorized).toBe(false);
    expect(d.reasonCode).toBe("DENIED_HUMAN_APPROVAL_REQUIRED");
    expect(d.actionClass).toBe("HIGH_IMPACT_ACT");
    expect(d.requiresHumanApproval).toBe(true);
  });
  it("denies a live order when approval object exists but approved=false", () => {
    const d = authorizeExecution(
      make({ env: "live", humanApproval: { approved: false } }),
    );
    expect(d.authorized).toBe(false);
    expect(d.reasonCode).toBe("DENIED_HUMAN_APPROVAL_REQUIRED");
  });
  it("authorizes a live human order WITH explicit approval and clean evidence", () => {
    const d = authorizeExecution(
      make({ env: "live", humanApproval: { approved: true, approvedBy: "dave" } }),
    );
    expect(d.authorized).toBe(true);
    expect(d.reasonCode).toBe("AUTHORIZED");
  });
});

describe("authorizeExecution — Rule 2: NO MODEL OUTPUT ALONE CREATES AUTHORITY", () => {
  const automated: ProposalSource[] = ["model", "strategy", "external-bot"];
  for (const source of automated) {
    it(`denies a ${source} paper proposal with no human approval, even at RightOfWay=ACTION`, () => {
      const d = authorizeExecution(make({ source, env: "paper", rightOfWay: "ACTION" }));
      expect(d.authorized).toBe(false);
      expect(d.reasonCode).toBe("DENIED_MODEL_CANNOT_SELF_AUTHORIZE");
    });
    it(`allows a ${source} proposal once a human approves and evidence permits`, () => {
      const d = authorizeExecution(
        make({ source, env: "paper", rightOfWay: "ACTION", humanApproval: { approved: true } }),
      );
      expect(d.authorized).toBe(true);
      expect(d.reasonCode).toBe("AUTHORIZED");
    });
    it(`still denies a ${source} LIVE proposal without approval (human-approval rule wins first)`, () => {
      const d = authorizeExecution(make({ source, env: "live", rightOfWay: "ACTION" }));
      expect(d.authorized).toBe(false);
      // Rule 1 (live) is checked before Rule 2 — either denial is canon-correct,
      // but the code returns the live-approval reason first.
      expect(d.reasonCode).toBe("DENIED_HUMAN_APPROVAL_REQUIRED");
    });
  }
});

describe("authorizeExecution — Rule 3: hard rule (NO TRADE)", () => {
  it("blocks a human order at NO TRADE without an explicit override", () => {
    const d = authorizeExecution(
      make({ source: "human", rightOfWay: "NO TRADE", humanApproval: { approved: true } }),
    );
    expect(d.authorized).toBe(false);
    expect(d.reasonCode).toBe("DENIED_HARD_RULE");
  });
  it("allows a human to override their OWN NO-TRADE rule when explicit (sovereignty)", () => {
    const d = authorizeExecution(
      make({
        source: "human",
        rightOfWay: "NO TRADE",
        humanApproval: { approved: true, overrideHardRule: true },
      }),
    );
    expect(d.authorized).toBe(true);
    expect(d.reasonCode).toBe("AUTHORIZED_HUMAN_OVERRIDE");
  });
  it("never lets an automated source override a hard rule (blocked at Rule 2)", () => {
    const d = authorizeExecution(
      make({
        source: "model",
        rightOfWay: "NO TRADE",
        humanApproval: { approved: false, overrideHardRule: true },
      }),
    );
    expect(d.authorized).toBe(false);
    expect(d.reasonCode).toBe("DENIED_MODEL_CANNOT_SELF_AUTHORIZE");
  });
});

describe("authorizeExecution — Rule 4: evidence must permit the act", () => {
  it("denies when RightOfWay is WAIT", () => {
    const d = authorizeExecution(make({ rightOfWay: "WAIT" }));
    expect(d.authorized).toBe(false);
    expect(d.reasonCode).toBe("DENIED_EVIDENCE_INCOMPLETE");
  });
  it("denies when RightOfWay is UNKNOWN", () => {
    const d = authorizeExecution(make({ rightOfWay: "UNKNOWN" }));
    expect(d.authorized).toBe(false);
    expect(d.reasonCode).toBe("DENIED_EVIDENCE_INCOMPLETE");
  });
  it("denies when RightOfWay was never evaluated (null)", () => {
    const d = authorizeExecution(make({ rightOfWay: null }));
    expect(d.authorized).toBe(false);
    expect(d.reasonCode).toBe("DENIED_EVIDENCE_INCOMPLETE");
    expect(d.reason).toMatch(/not evaluated/i);
  });
  it("authorizes at CAUTION (evidence permits but flagged) for a direct human", () => {
    const d = authorizeExecution(make({ rightOfWay: "CAUTION" }));
    expect(d.authorized).toBe(true);
    expect(d.reasonCode).toBe("AUTHORIZED");
  });
});

describe("authorizeExecution — Rule 5: the clean authorized path", () => {
  it("authorizes a direct human paper order at ACTION with no approval token needed", () => {
    const d = authorizeExecution(make({ source: "human", env: "paper", rightOfWay: "ACTION" }));
    expect(d.authorized).toBe(true);
    expect(d.reasonCode).toBe("AUTHORIZED");
    expect(d.requiresHumanApproval).toBe(false);
    expect(d.actionClass).toBe("LOW_RISK_ACT");
  });
});
