/**
 * FIVE STAGES ALWAYS, AND AN UNLIT STAGE IS NEVER A PASS.
 */

import { describe, expect, it } from "vitest";

import { selectPracticeEasementStages } from "./selectPracticeEasementStages";
import type { PracticeHonestyLedger } from "@/lib/practiceHonestyLedger";

function ledger(ids: string[]): PracticeHonestyLedger {
  return {
    easements: ids.map((id) => ({
      id: id as PracticeHonestyLedger["easements"][number]["id"],
      heading: `${id} heading`,
      sentences: ["because"],
    })),
    caption: `${ids.length} ways this practice book was easier than a real venue`,
    markCaveat: null,
  };
}

describe("selectPracticeEasementStages", () => {
  it("does not draw an examination that has not happened", () => {
    // null is NOT-READ-YET, distinct from an empty book. Five unlit stages over
    // an unread book would claim WM looked.
    expect(selectPracticeEasementStages(null)).toBeNull();
    expect(selectPracticeEasementStages(ledger([]))).toBeNull();
  });

  it("always draws the whole grammar, not the length of what fired", () => {
    const strip = selectPracticeEasementStages(ledger(["fill"]))!;
    expect(strip.stages).toHaveLength(5);
    expect(strip.stageCount).toBe(5);
    expect(strip.recordedCount).toBe(1);
  });

  it("keeps the order the trader lived the trade in", () => {
    const strip = selectPracticeEasementStages(ledger(["stop", "fill"]))!;
    expect(strip.stages.map((s) => s.word)).toEqual([
      "ENTRY",
      "FILL",
      "REST",
      "CANCEL",
      "STOP",
    ]);
  });

  it("lights only the stages the ledger recorded", () => {
    const strip = selectPracticeEasementStages(ledger(["fill", "stop"]))!;
    const lit = strip.stages.filter((s) => s.recorded).map((s) => s.word);
    expect(lit).toEqual(["FILL", "STOP"]);
    expect(strip.stages.filter((s) => !s.recorded).every((s) => s.heading === null)).toBe(true);
  });

  it("carries the owner's own heading and never rewrites it", () => {
    const strip = selectPracticeEasementStages(ledger(["cancel"]))!;
    const cancel = strip.stages.find((s) => s.id === "cancel")!;
    expect(cancel.heading).toBe("cancel heading");
  });

  it("counts four of five when four fired", () => {
    const strip = selectPracticeEasementStages(
      ledger(["short-located", "fill", "cancel", "stop"]),
    )!;
    expect(strip.recordedCount).toBe(4);
    expect(strip.stages).toHaveLength(5);
  });
});
