/**
 * THE BAND MAY NEVER REPORT MORE AUTHORITY THAN THE OS HOLDS.
 */

import { describe, expect, it } from "vitest";

import { selectSceneGovernance } from "./selectSceneGovernance";
import { SURFACE_ELEMENTS, type SurfaceElement } from "./compileScene";

describe("selectSceneGovernance", () => {
  it("draws the full surface every time, governed or not", () => {
    // Refusal 2. A route that governs one element still has twelve elements.
    const g = selectSceneGovernance({ admits: ["ONE_STORY"], governed: ["ONE_STORY"] });
    expect(g.total).toBe(SURFACE_ELEMENTS.length);
    expect(g.marks).toHaveLength(SURFACE_ELEMENTS.length);
    expect(g.admitted).toBe(1);
    expect(g.governed).toBe(1);
    expect(g.ungoverned).toBe(SURFACE_ELEMENTS.length - 1);
  });

  it("refuses to call an unapplied verdict admitted", () => {
    // The compiler admits everything; the route wires nothing. The OS ran no
    // pixel here, and the band must not read as a screen under full control.
    const g = selectSceneGovernance({ admits: SURFACE_ELEMENTS, governed: [] });
    expect(g.admitted).toBe(0);
    expect(g.withheld).toBe(0);
    expect(g.governed).toBe(0);
    expect(g.ungoverned).toBe(SURFACE_ELEMENTS.length);
    expect(g.marks.every((m) => m.standing === "UNGOVERNED")).toBe(true);
    expect(g.marks.every((m) => m.governed === false)).toBe(true);
  });

  it("separates an enforced refusal from an opinion nobody applied", () => {
    // Both of these are "not on the screen". Only one of them is the OS
    // working, and collapsing them is how admission becomes decoration.
    const g = selectSceneGovernance({
      admits: ["MARKET_CANVAS"],
      governed: ["MARKET_CANVAS", "FLATTEN_CONFIRM"],
    });
    expect(g.admitted).toBe(1);
    expect(g.withheld).toBe(1); // governed and removed — a real refusal
    expect(g.governed).toBe(2);
    const flatten = g.marks.find((m) => m.element === "FLATTEN_CONFIRM")!;
    expect(flatten.standing).toBe("WITHHELD");
    expect(flatten.governed).toBe(true);
  });

  it("leads with the reach, admitted ahead of withheld", () => {
    // Refusal 3 — the OS's actual reach must read as one run from the left.
    const g = selectSceneGovernance({
      admits: ["ONE_STORY", "OPEN_BROKER"],
      governed: ["ONE_STORY", "OPEN_BROKER", "MARKET_CANVAS", "RECEIPT_SHEET"],
    });
    expect(g.marks.slice(0, 4).map((m) => m.standing)).toEqual([
      "ADMITTED",
      "ADMITTED",
      "WITHHELD",
      "WITHHELD",
    ]);
    expect(g.marks.slice(4).every((m) => m.standing === "UNGOVERNED")).toBe(true);
  });

  it("keeps canonical order inside each population", () => {
    // Partition, not sort — the band must not reshuffle between renders, and
    // the caller's array order must not leak into the picture.
    const g = selectSceneGovernance({
      admits: ["OPEN_BROKER", "MARKET_CANVAS", "ONE_STORY"],
      governed: ["OPEN_BROKER", "MARKET_CANVAS", "ONE_STORY"],
    });
    expect(g.marks.slice(0, 3).map((m) => m.element)).toEqual([
      "MARKET_CANVAS",
      "ONE_STORY",
      "OPEN_BROKER",
    ]);
  });

  it("reports a fully governed, fully admitted screen without hiding the figure", () => {
    // The defect this selector was written for: the old reach sentence lived
    // behind `ungoverned.length > 0`, so it vanished the moment the answer
    // became good news. The counts are unconditional here.
    const g = selectSceneGovernance({ admits: SURFACE_ELEMENTS, governed: SURFACE_ELEMENTS });
    expect(g.governed).toBe(g.total);
    expect(g.admitted).toBe(g.total);
    expect(g.ungoverned).toBe(0);
    expect(g.withheld).toBe(0);
  });

  it("carries no percentage, no grade and no score", () => {
    // §15. "92% governed" reads as a passing mark for a screen the OS mostly
    // does not touch. Elements are what a route wires; a fraction of one is
    // not shippable.
    const g = selectSceneGovernance({ admits: ["ONE_STORY"], governed: ["ONE_STORY"] });
    expect(Object.keys(g).sort()).toEqual(
      ["admitted", "governed", "marks", "total", "ungoverned", "withheld"],
    );
  });

  it("puts an element the compiler grew and nobody wired into UNGOVERNED", () => {
    // Refusal 4 — ADMITTED is the flattering bucket. A new element must never
    // arrive already counted as the OS having run it.
    const exotic = "SOMETHING_NEW" as SurfaceElement;
    const g = selectSceneGovernance({ admits: [exotic, "ONE_STORY"], governed: ["ONE_STORY"] });
    expect(g.admitted).toBe(1);
    expect(g.marks.some((m) => m.element === exotic)).toBe(false);
    expect(g.total).toBe(SURFACE_ELEMENTS.length);
  });

  it("has marks and counts that always agree", () => {
    const g = selectSceneGovernance({
      admits: ["MARKET_CANVAS", "ONE_STORY", "FIDELITY_CHIPS"],
      governed: ["MARKET_CANVAS", "ONE_STORY", "RECEIPT_SHEET", "OPEN_BROKER"],
    });
    expect(g.admitted + g.withheld + g.ungoverned).toBe(g.total);
    expect(g.admitted + g.withheld).toBe(g.governed);
    expect(g.marks).toHaveLength(g.total);
    expect(g.marks.filter((m) => m.governed)).toHaveLength(g.governed);
    // Every element appears exactly once — no element may be double-counted
    // into two populations, which is how a band overstates reach.
    expect(new Set(g.marks.map((m) => m.element)).size).toBe(g.total);
  });
});
