import { describe, it, expect } from "vitest";
import {
  computeEvidenceDebt,
  computeRightOfWay,
  type EvidenceDebt,
} from "./decisionPermissionCompiler";
import type { DecisionChainNode } from "./selectDecisionChain";
import type { PermissionVM } from "@/lib/traderMemory/viewModels/selectPermission";

/**
 * These tests lock in the Founder 2029 Integration Glue canon rejection #1
 * (EVIDENCE DEBT / RIGHT-OF-WAY CONTRADICTION). Every regression that
 * would allow the surface to show ACTION while evidence is missing
 * must fail here first.
 */

const node = (label: string, indicator: DecisionChainNode["indicator"]): DecisionChainNode => ({
  key: label.toLowerCase(),
  label,
  verdict: indicator === "OK" ? "RESOLVED" : "UNRESOLVED",
  resolution: "RESOLVED",
  narrative: "test",
  indicator,
});

const perm = (verdict: PermissionVM["verdict"], reason?: string): PermissionVM => ({
  verdict,
  ...(reason ? { reason } : {}),
} as PermissionVM);

describe("computeEvidenceDebt", () => {
  it("returns null when nodes undefined", () => {
    expect(computeEvidenceDebt(undefined)).toBeNull();
  });

  it("returns null when nodes empty", () => {
    expect(computeEvidenceDebt([])).toBeNull();
  });

  it("classifies OK / UNKNOWN / WARN nodes into buckets", () => {
    const d = computeEvidenceDebt([
      node("Regime", "OK"),
      node("Direction", "OK"),
      node("Aggression", "UNKNOWN"),
      node("CLC", "UNKNOWN"),
      node("Available R", "WARN"),
      node("Steward", "WATCH"), // WATCH is neither paid nor blocking
    ])!;
    expect(d.total).toBe(6);
    expect(d.resolved).toBe(2);
    expect(d.missing).toBe(2);
    expect(d.warn).toBe(1);
    expect(d.missingLabels).toEqual(["Aggression", "CLC"]);
    expect(d.warnLabels).toEqual(["Available R"]);
  });

  it("caps label arrays at 3 entries", () => {
    const nodes: DecisionChainNode[] = [];
    for (let i = 0; i < 6; i++) nodes.push(node(`Missing${i}`, "UNKNOWN"));
    for (let i = 0; i < 6; i++) nodes.push(node(`Warn${i}`, "WARN"));
    const d = computeEvidenceDebt(nodes)!;
    expect(d.missing).toBe(6);
    expect(d.warn).toBe(6);
    expect(d.missingLabels).toEqual(["Missing0", "Missing1", "Missing2"]);
    expect(d.warnLabels).toEqual(["Warn0", "Warn1", "Warn2"]);
  });
});

describe("computeRightOfWay — canon rejection #1 guarantee", () => {
  it("Rule 1 (highest priority): missing evidence forces WAIT even when permission ALLOWED", () => {
    // This is the canon rejection #1 contradiction guarantee.
    const debt: EvidenceDebt = {
      total: 5,
      resolved: 3,
      missing: 2,
      warn: 0,
      missingLabels: ["Aggression", "CLC"],
      warnLabels: [],
    };
    const r = computeRightOfWay(perm("ALLOWED"), debt);
    expect(r.value).toBe("WAIT");
    expect(r.tone).toBe("warn");
    expect(r.detail).toContain("evidence debt");
    expect(r.detail).toContain("aggression");
    expect(r.detail).toContain("clc");
  });

  it("Rule 1: missing evidence forces WAIT even when permission ADVISORY", () => {
    const debt: EvidenceDebt = {
      total: 3, resolved: 1, missing: 2, warn: 0,
      missingLabels: ["A", "B"], warnLabels: [],
    };
    expect(computeRightOfWay(perm("ADVISORY"), debt).value).toBe("WAIT");
  });

  it("Rule 1: missing evidence forces WAIT even with null permission", () => {
    const debt: EvidenceDebt = {
      total: 1, resolved: 0, missing: 1, warn: 0,
      missingLabels: ["X"], warnLabels: [],
    };
    expect(computeRightOfWay(null, debt).value).toBe("WAIT");
  });

  it("Rule 2: RESTRICTED with no missing evidence → NO TRADE", () => {
    const debt: EvidenceDebt = {
      total: 3, resolved: 3, missing: 0, warn: 0,
      missingLabels: [], warnLabels: [],
    };
    const r = computeRightOfWay(perm("RESTRICTED", "Hard rule engaged"), debt);
    expect(r.value).toBe("NO TRADE");
    expect(r.tone).toBe("warn");
    expect(r.detail).toContain("Hard rule");
  });

  it("Rule 3: ADVISORY with no missing evidence → CAUTION", () => {
    const debt: EvidenceDebt = {
      total: 3, resolved: 3, missing: 0, warn: 0,
      missingLabels: [], warnLabels: [],
    };
    const r = computeRightOfWay(perm("ADVISORY", "Soft rule engaged"), debt);
    expect(r.value).toBe("CAUTION");
    expect(r.tone).toBe("pending");
  });

  it("Rule 4a: ALLOWED with no missing + no warn → ACTION", () => {
    const debt: EvidenceDebt = {
      total: 5, resolved: 5, missing: 0, warn: 0,
      missingLabels: [], warnLabels: [],
    };
    const r = computeRightOfWay(perm("ALLOWED"), debt);
    expect(r.value).toBe("ACTION");
    expect(r.tone).toBe("resolved");
    expect(r.detail).toContain("all evidence paid");
  });

  it("Rule 4b: ALLOWED with no missing but warn present → CAUTION (not ACTION)", () => {
    const debt: EvidenceDebt = {
      total: 5, resolved: 3, missing: 0, warn: 2,
      missingLabels: [], warnLabels: ["Location", "Structure"],
    };
    const r = computeRightOfWay(perm("ALLOWED"), debt);
    expect(r.value).toBe("CAUTION");
    expect(r.tone).toBe("pending");
    expect(r.detail).toContain("2 watch nodes");
  });

  it("Rule 4a with null debt (no chain): ALLOWED → ACTION", () => {
    // When there is no decision chain, Rule 1 cannot block; ALLOWED stands.
    const r = computeRightOfWay(perm("ALLOWED"), null);
    expect(r.value).toBe("ACTION");
  });

  it("Rule 5: UNKNOWN permission → UNKNOWN Right of Way", () => {
    const debt: EvidenceDebt = {
      total: 3, resolved: 3, missing: 0, warn: 0,
      missingLabels: [], warnLabels: [],
    };
    expect(computeRightOfWay(perm("UNKNOWN"), debt).value).toBe("UNKNOWN");
  });

  it("Rule 5: null permission + null debt → UNKNOWN with 'not evaluated'", () => {
    const r = computeRightOfWay(null, null);
    expect(r.value).toBe("UNKNOWN");
    expect(r.detail).toContain("not evaluated");
  });

  it("truncates long permission reason strings", () => {
    const longReason = "This is a very long permission reason that should be truncated at forty characters for display";
    const r = computeRightOfWay(perm("RESTRICTED", longReason), null);
    expect(r.detail.length).toBeLessThanOrEqual(41); // 40 + '…'
    expect(r.detail.endsWith("…")).toBe(true);
  });
});
