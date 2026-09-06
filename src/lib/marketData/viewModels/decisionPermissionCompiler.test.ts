import { describe, it, expect } from "vitest";
import {
  computeEvidenceDebt,
  computeRightOfWay,
  hiddenRemainder,
  EVIDENCE_LABEL_SAMPLE_LIMIT,
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
    expect(r.detail).toContain("required evidence paid");
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

  it("does not turn a missing decision chain into permission to act", () => {
    // Observed on the host: ACTION beside a 0/8 unresolved passport. Absence
    // of an evaluated prerequisite ledger is not proof every prerequisite paid.
    const r = computeRightOfWay(perm("ALLOWED"), null);
    expect(r.value).toBe("UNKNOWN");
    expect(r.detail).toContain("not evaluated");
  });

  it.each([0, 3])("requires paid evidence, not an empty or WATCH-only ledger (total %s)", total => {
    const debt: EvidenceDebt = { total, resolved: 0, missing: 0, warn: 0, missingLabels: [], warnLabels: [] };
    expect(computeRightOfWay(perm("ALLOWED"), debt).value).toBe("UNKNOWN");
  });

  it("does not make explicitly nonblocking WATCH evidence a new hard rule", () => {
    const debt = computeEvidenceDebt([node("Required", "OK"), node("Optional", "WATCH")]);
    expect(computeRightOfWay(perm("ALLOWED"), debt).value).toBe("ACTION");
  });

  it("keeps an explicit hard block even when no evidence ledger was evaluated", () => {
    expect(computeRightOfWay(perm("RESTRICTED"), null).value).toBe("NO TRADE");
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

  /* ── Real from-USE defect (2026-09-03) ──────────────────────────
   * /command-deck rendered "9 evidence nodes unpaid: regime + direction +1".
   * The leading 9 came from the true `missing` count; the "+1" came from
   * `missingLabels.length - 2` where missingLabels is capped at 3. The two
   * numbers in one sentence contradicted each other and the 1 had no owner
   * (LIVING-PIXEL LAW). Canon reference: Asset 07 Evidence Debt ledger. */
  describe("hidden-remainder count consistency", () => {
    it("derives the remainder from the true count, not the capped label array", () => {
      const nodes: DecisionChainNode[] = [];
      for (let i = 0; i < 9; i++) nodes.push(node(`Node${i}`, "UNKNOWN"));
      const debt = computeEvidenceDebt(nodes)!;

      expect(debt.missing).toBe(9);
      // Labels are intentionally sampled, not exhaustive.
      expect(debt.missingLabels.length).toBe(EVIDENCE_LABEL_SAMPLE_LIMIT);

      const r = computeRightOfWay(null, debt);
      // 9 missing, 2 shown → 7 hidden. Never "+1".
      expect(r.detail).toContain("+7");
      expect(r.detail).not.toContain("+1");
    });

    it("hiddenRemainder returns empty when nothing is hidden", () => {
      expect(hiddenRemainder(2, 2)).toBe("");
      expect(hiddenRemainder(1, 2)).toBe("");
      expect(hiddenRemainder(0, 0)).toBe("");
    });

    it("hiddenRemainder counts every unshown item", () => {
      expect(hiddenRemainder(9, 2)).toBe(" +7");
      expect(hiddenRemainder(3, 2)).toBe(" +1");
    });

    it("the sum of shown labels and hidden remainder always equals the true count", () => {
      for (const missingCount of [1, 2, 3, 5, 8, 9, 20]) {
        const nodes: DecisionChainNode[] = [];
        for (let i = 0; i < missingCount; i++) nodes.push(node(`N${i}`, "UNKNOWN"));
        const debt = computeEvidenceDebt(nodes)!;
        const shown = Math.min(2, debt.missingLabels.length);
        const suffix = hiddenRemainder(debt.missing, shown);
        const hidden = suffix ? Number(suffix.trim().slice(1)) : 0;
        expect(shown + hidden).toBe(debt.missing);
      }
    });

    it("counts are never capped even though labels are", () => {
      const nodes: DecisionChainNode[] = [];
      for (let i = 0; i < 12; i++) nodes.push(node(`W${i}`, "WARN"));
      const debt = computeEvidenceDebt(nodes)!;
      expect(debt.warn).toBe(12);
      expect(debt.warnLabels.length).toBe(EVIDENCE_LABEL_SAMPLE_LIMIT);
    });
  });
});
