import { describe, it, expect } from "vitest";
import {
  computeEvidenceDebt,
  computeRightOfWay,
  hiddenRemainder,
  sampledLabelPhrase,
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
    // SIX nodes, but only FIVE are payable — the WATCH node is ungradeable and
    // must not sit in a denominator no numerator can reach.
    expect(d.payable).toBe(5);
    expect(d.watch).toBe(1);
    expect(d.resolved).toBe(2);
    expect(d.missing).toBe(2);
    expect(d.warn).toBe(1);
    expect(d.missingLabels).toEqual(["Aggression", "CLC"]);
    expect(d.warnLabels).toEqual(["Available R"]);
  });

  it("THE MEASURED DEFECT: `X of N paid` and `M unpaid` must add up on one card", () => {
    /*
      Observed live on https://wealthymindsetspro.com/command-deck, two lines
      apart inside the SAME card:

          EVIDENCE DEBT   0 of 9 paid
          8 evidence nodes unpaid: regime + direction +6

      Zero paid plus eight unpaid is eight, not nine. The ninth was a WATCH
      node — in the denominator, in no numerator. LIVING-PIXEL LAW: that 9 had
      no owner anywhere on the screen.
    */
    const nodes: DecisionChainNode[] = [];
    for (let i = 0; i < 8; i++) nodes.push(node(`Unpaid${i}`, "UNKNOWN"));
    nodes.push(node("Steward", "WATCH"));

    const d = computeEvidenceDebt(nodes)!;
    expect(nodes.length).toBe(9);
    expect(d.payable).toBe(8);
    expect(d.watch).toBe(1);
    expect(d.resolved + d.missing).toBe(d.payable); // "0 of 8 paid" + "8 unpaid"
  });

  it("the INVARIANT: payable is exactly the gradeable buckets, and watch is the rest", () => {
    // This is what makes the arithmetic above structural rather than incidental.
    const nodes: DecisionChainNode[] = [
      node("a", "OK"), node("b", "OK"), node("c", "UNKNOWN"),
      node("d", "WARN"), node("e", "WATCH"), node("f", "WATCH"),
    ];
    const d = computeEvidenceDebt(nodes)!;
    expect(d.payable).toBe(d.resolved + d.missing + d.warn);
    expect(d.payable + d.watch).toBe(nodes.length);
  });

  it("a FULLY PAID ledger can reach resolved === payable even holding WATCH nodes", () => {
    // Under `total: nodes.length` this was UNREACHABLE for any chain with a
    // WATCH node, which made the ribbon's "authorization complete" branch dead
    // code on exactly the chains closest to complete.
    const d = computeEvidenceDebt([
      node("a", "OK"), node("b", "OK"), node("optional", "WATCH"),
    ])!;
    expect(d.resolved).toBe(d.payable);
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
      payable: 5,
    watch: 0,
      resolved: 3,
      missing: 2,
      warn: 0,
      missingLabels: ["Aggression", "CLC"],
      warnLabels: [],
      missingPayableLabels: ["Aggression", "CLC"],
      missingPayable: 2,
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
      payable: 3, watch: 0, resolved: 1, missing: 2, warn: 0,
      missingLabels: ["A", "B"], missingPayableLabels: ["A", "B"], missingPayable: 2, warnLabels: [],
    };
    expect(computeRightOfWay(perm("ADVISORY"), debt).value).toBe("WAIT");
  });

  it("Rule 1: missing evidence forces WAIT even with null permission", () => {
    const debt: EvidenceDebt = {
      payable: 1, watch: 0, resolved: 0, missing: 1, warn: 0,
      missingLabels: ["X"], missingPayableLabels: ["X"], missingPayable: 1, warnLabels: [],
    };
    expect(computeRightOfWay(null, debt).value).toBe("WAIT");
  });

  it("Rule 2: RESTRICTED with no missing evidence → NO TRADE", () => {
    const debt: EvidenceDebt = {
      payable: 3, watch: 0, resolved: 3, missing: 0, warn: 0,
      missingLabels: [], missingPayableLabels: [], missingPayable: 0, warnLabels: [],
    };
    const r = computeRightOfWay(perm("RESTRICTED", "Hard rule engaged"), debt);
    expect(r.value).toBe("NO TRADE");
    expect(r.tone).toBe("warn");
    expect(r.detail).toContain("Hard rule");
  });

  it("Rule 3: ADVISORY with no missing evidence → CAUTION", () => {
    const debt: EvidenceDebt = {
      payable: 3, watch: 0, resolved: 3, missing: 0, warn: 0,
      missingLabels: [], missingPayableLabels: [], missingPayable: 0, warnLabels: [],
    };
    const r = computeRightOfWay(perm("ADVISORY", "Soft rule engaged"), debt);
    expect(r.value).toBe("CAUTION");
    expect(r.tone).toBe("pending");
  });

  it("Rule 4a: ALLOWED with no missing + no warn → ACTION", () => {
    const debt: EvidenceDebt = {
      payable: 5, watch: 0, resolved: 5, missing: 0, warn: 0,
      missingLabels: [], missingPayableLabels: [], missingPayable: 0, warnLabels: [],
    };
    const r = computeRightOfWay(perm("ALLOWED"), debt);
    expect(r.value).toBe("ACTION");
    expect(r.tone).toBe("resolved");
    expect(r.detail).toContain("required evidence paid");
  });

  it("Rule 4b: ALLOWED with no missing but warn present → CAUTION (not ACTION)", () => {
    const debt: EvidenceDebt = {
      payable: 5, watch: 0, resolved: 3, missing: 0, warn: 2,
      missingLabels: [], missingPayableLabels: [], missingPayable: 0, warnLabels: ["Location", "Structure"],
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

  it("requires paid evidence — an empty ledger is not an authorized one", () => {
    const debt: EvidenceDebt = {
      payable: 0, watch: 0, resolved: 0, missing: 0, warn: 0, missingLabels: [], missingPayableLabels: [], missingPayable: 0, warnLabels: [],
    };
    expect(computeRightOfWay(perm("ALLOWED"), debt).value).toBe("UNKNOWN");
  });

  it("a WATCH-ONLY chain has graded nothing — it cannot authorize", () => {
    // Three nodes, zero payable. Before `payable` existed this chain reported
    // `total: 3` and so LOOKED like an evaluated ledger to every gate.
    const debt = computeEvidenceDebt([
      node("A", "WATCH"), node("B", "WATCH"), node("C", "WATCH"),
    ])!;
    expect(debt.payable).toBe(0);
    expect(debt.watch).toBe(3);
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
      payable: 3, watch: 0, resolved: 3, missing: 0, warn: 0,
      missingLabels: [], missingPayableLabels: [], missingPayable: 0, warnLabels: [],
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

    describe("sampledLabelPhrase — the suffix had an owner, the PHRASE did not", () => {
      // `hiddenRemainder` owned the "+N" and nothing owned the three lines
      // around it, so those three lines were re-typed at six call sites. The
      // sixth — CommandContextRibbon's WARN branch, one line below a correct
      // application of the same law — dropped the remainder entirely.
      it("names the sample and discloses everything it did not name", () => {
        expect(sampledLabelPhrase(["Regime", "Direction", "Location"], 9)).toBe(
          "Regime + Direction +7",
        );
      });

      it("derives the remainder from the TRUE count, not the capped array", () => {
        // labels are capped at EVIDENCE_LABEL_SAMPLE_LIMIT (3). A remainder
        // read off the array would print "+1" against a true count of 9.
        const labels = ["Regime", "Direction", "Location"];
        expect(labels.length).toBe(EVIDENCE_LABEL_SAMPLE_LIMIT);
        expect(sampledLabelPhrase(labels, 9)).not.toContain("+1");
      });

      it("adds no suffix when the sample IS the whole set", () => {
        expect(sampledLabelPhrase(["Regime", "Direction"], 2)).toBe("Regime + Direction");
        expect(sampledLabelPhrase(["Regime"], 1)).toBe("Regime");
      });

      it("lowercases only when asked — casing is typography, not a second answer", () => {
        expect(sampledLabelPhrase(["Regime", "Direction"], 5, { lowercase: true })).toBe(
          "regime + direction +3",
        );
        expect(sampledLabelPhrase(["Regime", "Direction"], 5)).toBe("Regime + Direction +3");
      });

      it("honours a custom limit and still reconciles", () => {
        expect(sampledLabelPhrase(["A", "B", "C"], 10, { limit: 3 })).toBe("A + B + C +7");
        expect(sampledLabelPhrase(["A", "B", "C"], 10, { limit: 1 })).toBe("A +9");
      });

      it("shown + hidden always equals the true count, at every limit", () => {
        for (const limit of [1, 2, 3]) {
          for (const trueCount of [1, 2, 3, 5, 9, 40]) {
            const labels = ["A", "B", "C"].slice(0, Math.min(3, trueCount));
            const phrase = sampledLabelPhrase(labels, trueCount, { limit });
            const shown = labels.slice(0, limit).length;
            const m = /\+(\d+)$/.exec(phrase);
            const hidden = m ? Number(m[1]) : 0;
            expect(shown + hidden).toBe(trueCount);
          }
        }
      });

      it("says nothing when the ledger named nothing — no bare suffix", () => {
        // A phrase that is only "+5" names no node and helps nobody. The
        // caller must take its own no-labels branch.
        expect(sampledLabelPhrase([], 5)).toBe(" +5");
        expect(sampledLabelPhrase([], 5).trim()).toBe("+5");
      });
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
