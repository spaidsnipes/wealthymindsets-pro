/**
 * THE STRIP MAY NEVER MAKE THE BUILD LOOK MORE COMPLETE THAN IT IS.
 */

import { describe, expect, it } from "vitest";

import { selectHumilityStrip } from "./selectHumilityStrip";
import type { HumilityItem } from "./selectHumility";

function item(id: string, kind: HumilityItem["kind"]): HumilityItem {
  return { id, kind, title: `t:${id}`, detail: `d:${id}` };
}

describe("selectHumilityStrip", () => {
  it("draws nothing for an absent or empty list", () => {
    expect(selectHumilityStrip(null)).toBeNull();
    // A strip with no marks, under a heading reading "what we do not know",
    // would read as "nothing" — the most dishonest thing this panel can say.
    expect(selectHumilityStrip([])).toBeNull();
  });

  it("makes one mark per gap and never aggregates them into a score", () => {
    const strip = selectHumilityStrip([
      item("a", "UNOBSERVED"),
      item("b", "STRUCTURAL"),
      item("c", "UNOBSERVED"),
    ])!;
    expect(strip.marks).toHaveLength(3);
    expect(strip.total).toBe(3);
    expect(strip.structural).toBe(1);
    expect(strip.unobserved).toBe(2);
    // No completeness figure may exist: the denominator of everything there is
    // to know is itself unknown, so any percentage would be invented.
    expect(Object.keys(strip).sort()).toEqual(
      ["marks", "structural", "total", "unobserved"],
    );
  });

  it("leads with the limits that do not close by themselves", () => {
    const strip = selectHumilityStrip([
      item("obs1", "UNOBSERVED"),
      item("str1", "STRUCTURAL"),
      item("obs2", "UNOBSERVED"),
      item("str2", "STRUCTURAL"),
    ])!;
    // A strip that led with the gaps about to close would read as progress.
    expect(strip.marks.map((m) => m.id)).toEqual(["str1", "str2", "obs1", "obs2"]);
    expect(strip.marks.map((m) => m.permanent)).toEqual([true, true, false, false]);
  });

  it("keeps the selector's order inside each population", () => {
    const strip = selectHumilityStrip([
      item("s3", "STRUCTURAL"),
      item("s1", "STRUCTURAL"),
      item("s2", "STRUCTURAL"),
    ])!;
    // Partition, not sort — the strip must not reshuffle between renders.
    expect(strip.marks.map((m) => m.id)).toEqual(["s3", "s1", "s2"]);
  });

  it("counts a wholly structural book as wholly permanent", () => {
    const strip = selectHumilityStrip([item("a", "STRUCTURAL"), item("b", "STRUCTURAL")])!;
    expect(strip.structural).toBe(2);
    expect(strip.unobserved).toBe(0);
    expect(strip.marks.every((m) => m.permanent)).toBe(true);
  });

  it("counts a wholly observational book as none permanent", () => {
    const strip = selectHumilityStrip([item("a", "UNOBSERVED"), item("b", "UNOBSERVED")])!;
    expect(strip.structural).toBe(0);
    expect(strip.marks.some((m) => m.permanent)).toBe(false);
  });

  it("never reports a future third kind as a gap that closes on its own", () => {
    // Counted by partition rather than by subtraction. If a third kind is ever
    // added, this must NOT quietly land in `unobserved` — which is the
    // optimistic bucket, the one that says "wait and it will resolve".
    const exotic = { id: "x", title: "t", detail: "d", kind: "SOMETHING_NEW" } as unknown as HumilityItem;
    const strip = selectHumilityStrip([item("s", "STRUCTURAL"), exotic])!;
    expect(strip.total).toBe(2);
    expect(strip.structural).toBe(1);
    // It lands outside STRUCTURAL, and the mark is not marked permanent —
    // so the surface renders it as the weaker claim, which is the safe
    // direction for an unrecognised kind to fail in.
    expect(strip.marks.find((m) => m.id === "x")!.permanent).toBe(false);
  });

  it("has marks and counts that always agree", () => {
    const strip = selectHumilityStrip([
      item("a", "STRUCTURAL"),
      item("b", "UNOBSERVED"),
      item("c", "STRUCTURAL"),
      item("d", "UNOBSERVED"),
      item("e", "UNOBSERVED"),
    ])!;
    expect(strip.structural + strip.unobserved).toBe(strip.total);
    expect(strip.marks).toHaveLength(strip.total);
    expect(strip.marks.filter((m) => m.permanent)).toHaveLength(strip.structural);
  });
});
