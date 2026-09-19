/**
 * M8 — ONE MAPPING FROM CHART BAR TO ANATOMY INPUT, PER ROOM.
 *
 * ── WHAT THIS GUARDS, AND WHAT IT DOES NOT CLAIM ──────────────────────────
 *
 * `AnatomyBarInput` is an INGRESS BOUNDARY. It is the shape a caller must build
 * before `selectAbsorptionAnatomy` will measure anything, which makes every
 * `chartBars.map(...)` that produces one a place the product decides what a bar
 * is. M8's whole argument is that there should be ONE such place per fact.
 *
 * Until 2026-09-18 `ChartsDashboard.tsx` had TWO, and they were verbatim
 * identical — one feeding the Absorption view, one feeding the Aggression
 * Response scatter. The comment above the second one promised the two surfaces
 * "can never disagree about which bars absorbed", and that promise was true
 * only for as long as two separate blocks of code happened to still agree. That
 * is not a guarantee, it is a coincidence with a maintenance schedule: the first
 * person to add a field, change the `volume` fallback, or fix the `time`
 * coercion in one block and not the other makes two surfaces read two different
 * windows while both claim to read the chart's.
 *
 * They now share ONE memo, so the guarantee is structural. This test is the
 * ratchet that keeps it that way, because re-introducing the second mapping is
 * a three-line copy-paste that no type error and no render test would catch.
 *
 * IT DOES NOT CLAIM ADOPTION. Sharing an input mapping is not routing an
 * ingress through CanonicalBar. `chartBars` still carries no symbolId,
 * sessionId, fidelity, provenance or truthEpoch, so the two surfaces now agree
 * about a past that still has no identity. The smaller claim is the true one:
 * this removed a duplicate decision, and identity is still owed.
 *
 * MAINCHART IS DELIBERATELY NOT IN SCOPE. It builds its own `AnatomyBarInput[]`
 * and that mapping is NOT a duplicate of this one — it reads a real per-bar
 * sub-profile and carries genuine `askVol` / `bidVol` off the tape, where the
 * dashboard's is honestly null because `OHLCVBar` has no aggressor split.
 * Collapsing those two would be the flattering kind of DRY: it would make the
 * count go down by pretending a measured split and an absent one are the same
 * ingress. A different room measuring a different thing is allowed to map it.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import * as path from "node:path";

const DASHBOARD = path.join(__dirname, "ChartsDashboard.tsx");

/** Every `<something>.map(` that is annotated as producing `AnatomyBarInput`. */
function anatomyMappings(src: string): readonly string[] {
  return [...src.matchAll(/AnatomyBarInput\[\]>?\s*(?:=|>\()[\s\S]{0,120}?\.map\(/g)].map(
    (m) => m[0].replace(/\s+/g, " ").slice(0, 60),
  );
}

describe("M8 · ChartsDashboard maps a chart bar into an anatomy input exactly once", () => {
  /**
   * FALSE_RIPENESS GUARD. A regex that matches nothing reports clean forever,
   * and "zero mappings" would be the silent pass if this file were renamed, the
   * import dropped, or the annotation style changed. Assert the room is real
   * and still wired to the selector BEFORE asserting anything about the count.
   */
  it("read the real dashboard and it still feeds both anatomy surfaces", () => {
    const src = readFileSync(DASHBOARD, "utf8");
    expect(src.length, "ChartsDashboard.tsx was read").toBeGreaterThan(10_000);
    expect(src, "the Absorption view is still fed from this room").toContain(
      "selectAbsorptionAnatomyView(",
    );
    expect(src, "the Aggression Response scatter is still fed from this room").toContain(
      "selectAggressionResponse(",
    );
    expect(src, "the ingress shape is still the one being guarded").toContain(
      "AnatomyBarInput",
    );
  });

  it("builds the AnatomyBarInput array in exactly one place", () => {
    const found = anatomyMappings(readFileSync(DASHBOARD, "utf8"));
    expect(
      found,
      `ChartsDashboard.tsx maps chart bars into AnatomyBarInput ${found.length} ` +
        `times. Two mappings of the same bars is two decisions about what a bar ` +
        `is, and the surfaces they feed claim to be reading the SAME window — a ` +
        `claim that holds only until someone edits one copy. Build the array ` +
        `once and let both view models consume it:\n  ` + found.join("\n  "),
    ).toHaveLength(1);
  });

  it("both view models consume that one array rather than re-deriving it", () => {
    const src = readFileSync(DASHBOARD, "utf8");
    expect(src, "the Absorption view reads the shared input").toMatch(
      /selectAbsorptionAnatomyView\(\s*anatomyInput\s*,/,
    );
    expect(src, "the scatter reads the shared input").toMatch(
      /selectAggressionResponse\(\s*anatomyInput\s*,/,
    );
  });
});
