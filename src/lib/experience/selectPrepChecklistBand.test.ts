/**
 * "COULD NOT LOOK" MAY NEVER BE DRAWN AS "DID NOTHING".
 *
 * That is H1, and it is the reason `openingBellPrep` exists at all. A band is a
 * much easier place to commit it than a sentence, because an unlit mark and an
 * absent mark look the same unless someone decides they must not be drawn.
 */

import { describe, expect, it } from "vitest";

import { selectPrepChecklistBand } from "./selectPrepChecklistBand";
import { selectPrepEvidence, type PrepEvidence } from "./openingBellPrep";

const observed = (done: number, total: number): PrepEvidence =>
  selectPrepEvidence({ readState: "PRESENT", checklistDone: done, checklistTotal: total });

describe("selectPrepChecklistBand", () => {
  it("draws nothing without evidence", () => {
    expect(selectPrepChecklistBand(null)).toBeNull();
    expect(selectPrepChecklistBand(undefined)).toBeNull();
  });

  it("REFUSES to draw a count nobody observed — H1", () => {
    // The browser could not read the trader's prep. A band of eleven unlit
    // marks would be a statement about the person, produced from no observation
    // of the person. There is no honest band here, only no band.
    const unreadable = selectPrepEvidence({
      readState: "UNAVAILABLE", checklistDone: 0, checklistTotal: 0,
    });
    expect(unreadable.kind).toBe("UNREADABLE");
    expect(selectPrepChecklistBand(unreadable)).toBeNull();
  });

  it("REFUSES to draw the absence of a prep entry", () => {
    // A finding about STORAGE, not about the morning. The trader may have
    // prepared on paper, in another app, or in their head.
    const absent = selectPrepEvidence({
      readState: "ABSENT", checklistDone: 0, checklistTotal: 0,
    });
    expect(absent.kind).toBe("NO_PREP_TODAY");
    expect(selectPrepChecklistBand(absent)).toBeNull();
  });

  it("draws nothing for an intention written without a list", () => {
    // `total === 0` is a different SHAPE of prep, not a failed one. An empty
    // band beneath a count would read as zero-of-zero failure.
    const noList = observed(0, 0);
    expect(noList.kind).toBe("OBSERVED");
    expect(selectPrepChecklistBand(noList)).toBeNull();
  });

  it("makes one mark per item on the trader's OWN list", () => {
    const b = selectPrepChecklistBand(observed(7, 11))!;
    expect(b.marks).toHaveLength(11);
    expect(b.done).toBe(7);
    expect(b.total).toBe(11);
    expect(b.remaining).toBe(4);
  });

  it("leads with what was checked", () => {
    const b = selectPrepChecklistBand(observed(3, 5))!;
    expect(b.marks.map((m) => m.checked)).toEqual([true, true, true, false, false]);
  });

  it("keeps an unchecked mark at full count — the denominator never shrinks", () => {
    const b = selectPrepChecklistBand(observed(1, 12))!;
    expect(b.marks).toHaveLength(12);
    expect(b.marks.filter((m) => !m.checked)).toHaveLength(11);
  });

  it("lets a fully checked list actually reach full", () => {
    const b = selectPrepChecklistBand(observed(9, 9))!;
    expect(b.remaining).toBe(0);
    expect(b.marks.every((m) => m.checked)).toBe(true);
  });

  it("lets a wholly unchecked list read as unchecked, not as absent", () => {
    // This one IS observed: the trader has a list and has ticked none of it.
    // Distinct from the two refusals above, and it must be drawable.
    const b = selectPrepChecklistBand(observed(0, 6))!;
    expect(b.done).toBe(0);
    expect(b.marks).toHaveLength(6);
    expect(b.marks.every((m) => !m.checked)).toBe(true);
  });

  it("names no item — the system knows HOW MANY, never WHICH", () => {
    // A mark carrying an id or a label would be the invented mapping the owning
    // module refuses, wearing the trader's authority.
    const b = selectPrepChecklistBand(observed(2, 4))!;
    for (const m of b.marks) expect(Object.keys(m)).toEqual(["checked"]);
  });

  it("carries no percentage, no score and no readiness verdict — §15", () => {
    const b = selectPrepChecklistBand(observed(7, 11))!;
    expect(Object.keys(b).sort()).toEqual(["done", "marks", "remaining", "total"]);
  });

  it("refuses a count the owner could not have produced", () => {
    // `selectPrepEvidence` caps and clamps. A band reaching this shape means the
    // owner was bypassed; drawing it would render the bypass as a reading.
    const forged = { kind: "OBSERVED", done: 12, total: 11, sentence: "" } as PrepEvidence;
    expect(selectPrepChecklistBand(forged)).toBeNull();
    const negative = { kind: "OBSERVED", done: -1, total: 11, sentence: "" } as PrepEvidence;
    expect(selectPrepChecklistBand(negative)).toBeNull();
  });

  it("has marks and counts that always agree", () => {
    const b = selectPrepChecklistBand(observed(4, 10))!;
    expect(b.marks).toHaveLength(b.total);
    expect(b.marks.filter((m) => m.checked)).toHaveLength(b.done);
    expect(b.done + b.remaining).toBe(b.total);
  });
});
