import { describe, expect, it } from "vitest";
import { selectRealityCells, REALITY_CELLS_VERSION } from "./selectRealityCells";
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

describe("selectRealityCells", () => {
  it("is versioned so a surface can pin the compiler it renders", () => {
    expect(REALITY_CELLS_VERSION).toBe("wm.reality-cells.v1");
  });

  it("always emits exactly four cells, numbered 1..4 in stable order", () => {
    // The canon frame is NUMBERED. A cell that can vanish renumbers its
    // neighbours, and the Founder's eye learns positions, not labels.
    for (const vm of [selectRealityCells(null), selectRealityCells(story())]) {
      expect(vm.cells).toHaveLength(4);
      expect(vm.cells.map((c) => c.n)).toEqual([1, 2, 3, 4]);
    }
  });

  it("keeps slot labels constant regardless of state", () => {
    const a = selectRealityCells(null).cells.map((c) => c.label);
    const b = selectRealityCells(story({ contradiction: "Delta disagrees." })).cells.map((c) => c.label);
    expect(a).toEqual(b);
    expect(a).toEqual(["Market Posture", "Strongest Contradiction", "Evidence Debt", "Right of Way"]);
  });

  describe("AN ABSENT CELL CANNOT TELL 'NOTHING FOUND' FROM 'NOTHING LOOKED'", () => {
    // The defect this file exists to kill. The old strip rendered NOTHING for
    // both of these, collapsing a resolved answer and an unasked question.
    it("says NONE DETECTED when a thesis was checked and survived", () => {
      const cell = selectRealityCells(
        story({ contradiction: null, contradictionDetectability: "COMPARABLE" }),
      ).cells[1];
      expect(cell.value).toBe("None detected");
      expect(cell.tone).toBe("RESOLVED");
    });

    it("says NOTHING TO COMPARE when no thesis existed to check", () => {
      const cell = selectRealityCells(
        story({ contradiction: null, contradictionDetectability: "NOTHING_TO_COMPARE" }),
      ).cells[1];
      expect(cell.value).toBe("Nothing to compare");
      expect(cell.tone).toBe("UNRESOLVED");
    });

    it("gives the two nulls DIFFERENT text AND different tones", () => {
      const found = selectRealityCells(story({ contradictionDetectability: "COMPARABLE" })).cells[1];
      const looked = selectRealityCells(story({ contradictionDetectability: "NOTHING_TO_COMPARE" })).cells[1];
      expect(found.value).not.toBe(looked.value);
      expect(found.tone).not.toBe(looked.tone);
    });

    it("renders the contradiction verbatim as an OBJECTION when one exists", () => {
      const cell = selectRealityCells(story({ contradiction: "Delta is negative into a bullish break." })).cells[1];
      expect(cell.value).toBe("Delta is negative into a bullish break.");
      expect(cell.tone).toBe("OBJECTION");
    });
  });

  describe("UNKNOWN has a look", () => {
    it("refuses the resolved look for POSTURE when no chapter resolved", () => {
      // `primary` always holds a sentence — when nothing resolved it holds the
      // engine's REASON for silence. Confident ivory would dress a non-answer
      // as an answer.
      const cell = selectRealityCells(
        story({ contradictionDetectability: "NOTHING_TO_COMPARE", primary: "Market state cannot be resolved yet." }),
      ).cells[0];
      expect(cell.value).toBe("Market state cannot be resolved yet.");
      expect(cell.tone).toBe("UNRESOLVED");
    });

    it("marks every cell UNRESOLVED for a null story and invents no subject", () => {
      const vm = selectRealityCells(null);
      expect(vm.cells.every((c) => c.tone === "UNRESOLVED")).toBe(true);
      expect(vm.cells[3].value).toBe("UNKNOWN");
    });

    it("marks an empty ledger UNRESOLVED rather than '0 of 0 paid'", () => {
      // "0 of 0 paid" reads as a clean bill of health for a ledger that was
      // never opened. That is the same lie as a blank.
      const cell = selectRealityCells(story({ debt: debtOf({ total: 0, resolved: 0 }) })).cells[2];
      expect(cell.tone).toBe("UNRESOLVED");
      expect(cell.value).toBe("—");
      expect(cell.detail).toBe("No evidence ledger compiled.");
    });
  });

  describe("LIVING-PIXEL LAW — every number must have its canonical owner", () => {
    it("reads the ledger counts from `resolved`/`total`, never from the capped sample", () => {
      const cell = selectRealityCells(
        story({
          // 9 missing but only 3 sampled labels. A count derived from the
          // sample would render "3" and be wrong by six.
          debt: debtOf({ total: 12, resolved: 3, missing: 9, missingLabels: ["Regime", "Direction", "Location"] }),
          missing: "missing regime + direction +1",
        }),
      ).cells[2];
      expect(cell.value).toBe("3 of 12 paid");
      expect(cell.value).not.toContain("9");
    });

    it("echoes `missing` verbatim instead of re-deriving a second phrasing", () => {
      const cell = selectRealityCells(
        story({ debt: debtOf({ missing: 2, missingLabels: ["Regime"] }), missing: "missing regime +1" }),
      ).cells[2];
      expect(cell.detail).toBe("missing regime +1");
      expect(cell.tone).toBe("DEBT");
    });

    it("calls a fully paid ledger RESOLVED, not DEBT", () => {
      const cell = selectRealityCells(story({ debt: debtOf({ total: 8, resolved: 8 }), missing: null })).cells[2];
      expect(cell.tone).toBe("RESOLVED");
      expect(cell.detail).toBe("Ledger paid in full.");
    });
  });

  describe("RIGHT OF WAY tone tracks permission, not sentiment", () => {
    it("only ACTION earns the resolved look", () => {
      expect(selectRealityCells(story({ decision: { value: "ACTION", detail: "d", tone: "resolved" } })).cells[3].tone)
        .toBe("RESOLVED");
    });

    it("WAIT / NO TRADE / CAUTION all read as DEBT — a block is not a blank", () => {
      for (const v of ["WAIT", "NO TRADE", "CAUTION"] as const) {
        expect(selectRealityCells(story({ decision: { value: v, detail: "d", tone: "warn" } })).cells[3].tone)
          .toBe("DEBT");
      }
    });
  });

  it("is pure — same input yields a deeply equal result", () => {
    const input = story({ contradiction: "Volume is not confirming." });
    expect(selectRealityCells(input)).toEqual(selectRealityCells(input));
  });
});
