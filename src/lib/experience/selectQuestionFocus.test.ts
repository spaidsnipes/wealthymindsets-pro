import { describe, expect, it } from "vitest";
import { selectQuestionFocus, QUESTION_FOCUS_VERSION } from "./selectQuestionFocus";
import type { OneStoryVM } from "../marketData/viewModels/selectOneStory";
import type { EvidenceDebt } from "../marketData/viewModels/decisionPermissionCompiler";

const debtOf = (over: Partial<EvidenceDebt> = {}): EvidenceDebt => ({
  total: 8,
  resolved: 5,
  missing: 0,
  warn: 0,
  missingLabels: [],
  warnLabels: [],
  ...over,
});

const story = (over: Partial<OneStoryVM> = {}): OneStoryVM =>
  ({
    primary: "Market is in balance around a fair-value zone.",
    contradiction: null,
    contradictionDetectability: "COMPARABLE",
    missing: null,
    decision: { value: "UNKNOWN", detail: "", tone: "unknown" },
    debt: debtOf(),
    ...over,
  }) as OneStoryVM;

describe("selectQuestionFocus", () => {
  it("is versioned so a surface can pin the compiler it renders", () => {
    expect(QUESTION_FOCUS_VERSION).toBe("wm.question-focus.v1");
  });

  describe("precedence — the focus must track the same field routeQuestion did", () => {
    it("names the CONTRADICTION first, because an objection outranks a gap", () => {
      const vm = selectQuestionFocus(
        story({
          contradiction: "Delta is negative into a bullish break.",
          debt: debtOf({ missing: 3, missingLabels: ["Regime", "Direction"] }),
        }),
      );
      expect(vm.basis).toBe("CONTRADICTION");
      expect(vm.focus).toBe("Delta is negative into a bullish break");
      expect(vm.unresolved).toBe(false);
    });

    it("names UNPAID EVIDENCE over the decision, because WAIT is the debt's CONSEQUENCE", () => {
      // canon rejection #1: missing evidence FORCES WAIT. Naming the verdict
      // would present the symptom and hide the cause.
      const vm = selectQuestionFocus(
        story({
          debt: debtOf({ missing: 3, missingLabels: ["Regime", "Direction", "Location"] }),
          decision: { value: "WAIT", detail: "evidence debt: need regime + direction +1", tone: "warn" },
        }),
      );
      expect(vm.basis).toBe("EVIDENCE_DEBT");
      expect(vm.focus).toBe("Unpaid evidence: Regime + Direction");
    });

    it("falls to the DECISION detail when the ledger is clean but a rule engaged", () => {
      const vm = selectQuestionFocus(
        story({ decision: { value: "NO TRADE", detail: "daily loss limit reached.", tone: "warn" } }),
      );
      expect(vm.basis).toBe("DECISION");
      expect(vm.focus).toBe("daily loss limit reached");
    });

    it("falls to the resolved chapter when nothing else is speaking", () => {
      const vm = selectQuestionFocus(story());
      expect(vm.basis).toBe("PRIMARY");
      expect(vm.focus).toBe("Market is in balance around a fair-value zone");
      expect(vm.unresolved).toBe(false);
    });
  });

  describe("UNKNOWN has a look — the canon requires it, so the VM must carry it", () => {
    it("marks a null story unresolved rather than inventing a subject", () => {
      const vm = selectQuestionFocus(null);
      expect(vm.basis).toBe("UNRESOLVED");
      expect(vm.unresolved).toBe(true);
      expect(vm.focus).toBe("Market state unresolved");
    });

    it("marks NOTHING_TO_COMPARE unresolved even though `primary` holds a sentence", () => {
      // `primary` always has text — when no chapter resolved it holds the
      // engine's REASON for silence. Rendering that in confident ivory would
      // dress a non-answer as an answer.
      const vm = selectQuestionFocus(
        story({
          contradictionDetectability: "NOTHING_TO_COMPARE",
          primary: "Market state cannot be resolved yet.",
        }),
      );
      expect(vm.unresolved).toBe(true);
      expect(vm.basis).toBe("UNRESOLVED");
      expect(vm.focus).toBe("Market state cannot be resolved yet");
    });
  });

  describe("LIVING-PIXEL LAW — the focus may never mint a number", () => {
    it("names the sampled labels but states NO count, because missingLabels is capped", () => {
      // The authoritative count is `missing` and it belongs to the Evidence
      // Debt cell. A count derived from the capped sample array is the exact
      // defect that once rendered '9 evidence nodes unpaid: regime + direction +1'.
      const vm = selectQuestionFocus(
        story({
          debt: debtOf({
            missing: 9,
            missingLabels: ["Regime", "Direction", "Location"],
          }),
        }),
      );
      expect(vm.focus).toBe("Unpaid evidence: Regime + Direction");
      expect(vm.focus).not.toMatch(/\d/);
    });

    it("does not claim EVIDENCE_DEBT when the count is positive but no labels sampled", () => {
      const vm = selectQuestionFocus(
        story({ debt: debtOf({ missing: 2, missingLabels: [] }) }),
      );
      expect(vm.basis).not.toBe("EVIDENCE_DEBT");
    });
  });

  it("is pure — same input yields a deeply equal result", () => {
    const input = story({ contradiction: "Volume is not confirming." });
    expect(selectQuestionFocus(input)).toEqual(selectQuestionFocus(input));
  });
});
