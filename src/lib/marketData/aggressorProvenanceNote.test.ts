/**
 * Two kinds of test, because the defect has two shapes.
 *
 * 1. BEHAVIOUR — the note is derived from the provenance, and the shipped words
 *    are asserted through the exported function rather than retyped here. A
 *    test that inlined "SIDE INFERRED" as its own string literal would keep
 *    passing after someone softened the shipped copy, which is precisely how
 *    labels in this repo have drifted before.
 *
 * 2. ADOPTION — every surface that renders an aggressor figure imports the
 *    owner. This is the guard that fails when the next engineer, needing the
 *    same disclosure on a third surface, types the sentence again instead of
 *    importing it. Nothing throws when they do that; `tsc --noEmit` exits 0
 *    when they do that; only a guard that reads the SOURCE can see it.
 *
 * The adoption guard is deliberately written against the two files that render
 * `AggressorProvenance` today. It is not a list of "files that must import a
 * module" for its own sake — each entry is a surface that shows a trader an
 * aggressor number, and therefore owes the trader the qualifier.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { aggressorProvenanceNote } from "./aggressorProvenanceNote";
import type { AggressorProvenance } from "./selectAggressorFlow";

/**
 * The IMPORT, not the module path.
 *
 * This guard originally matched the bare path `@/lib/marketData/...`, and the
 * first Orkin §22 revive caught it out immediately: the revived surface had no
 * import at all, yet the guard stayed green, because a nearby CODE COMMENT
 * mentioned the module by name. Prose pinned the defect green — the same
 * mechanism that made two of this shift's four stale restatements survive their
 * own test files. Matching `from "<path>"` requires the real edge.
 */
const OWNER_IMPORT = 'from "@/lib/marketData/aggressorProvenanceNote"';

/** Surfaces that render an aggressor figure to a trader. */
const DISCLOSING_SURFACES = [
  "src/components/chart/OrderFlowCockpitStrip.tsx",
  "src/components/smart-money/SmartMoneyPanel.tsx",
] as const;

function read(rel: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");
}

describe("aggressorProvenanceNote — the qualifier is derived, and owned once", () => {
  it("says nothing for PROVIDER, because a venue-asserted side needs no asterisk", () => {
    // An asterisk on the clean case trains the eye to ignore the asterisk that
    // matters. Silence here is the disclosure working, not the disclosure
    // missing.
    expect(aggressorProvenanceNote("PROVIDER")).toBeNull();
  });

  it.each<AggressorProvenance>(["INFERRED", "MIXED", "UNDISCLOSED"])(
    "discloses %s with a chip and a full explanation",
    (provenance) => {
      const note = aggressorProvenanceNote(provenance);
      expect(note).not.toBeNull();
      expect(note!.chip.length).toBeGreaterThan(0);
      expect(note!.chip).toBe(note!.chip.toUpperCase());
      // The chip is a label; the title has to actually explain. A one-word
      // tooltip is decoration, not disclosure.
      expect(note!.title.length).toBeGreaterThan(40);
    },
  );

  it("gives each disclosed provenance its OWN words", () => {
    // MIXED must not borrow INFERRED's sentence: "every side was guessed" and
    // "some sides were guessed" are different facts about the tape, and a
    // trader sizing off the number needs to know which one they have.
    const chips = (["INFERRED", "MIXED", "UNDISCLOSED"] as const).map(
      (p) => aggressorProvenanceNote(p)!.chip,
    );
    expect(new Set(chips).size).toBe(chips.length);

    const titles = (["INFERRED", "MIXED", "UNDISCLOSED"] as const).map(
      (p) => aggressorProvenanceNote(p)!.title,
    );
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("names the tick rule where the tick rule is what happened", () => {
    // Asserted through the function, never retyped: this reads the shipped
    // string. "reconstructed" alone would let the copy drift into something
    // that no longer tells the trader WHICH heuristic produced the side.
    expect(aggressorProvenanceNote("INFERRED")!.title).toContain("tick rule");
    expect(aggressorProvenanceNote("MIXED")!.title).toContain("tick rule");
  });

  it("never claims ground truth in a disclosed case", () => {
    for (const p of ["INFERRED", "MIXED", "UNDISCLOSED"] as const) {
      const title = aggressorProvenanceNote(p)!.title.toLowerCase();
      expect(title).not.toContain("confirmed");
      expect(title).not.toContain("guaranteed");
    }
  });
});

describe("aggressorProvenanceNote — adoption guard", () => {
  it.each(DISCLOSING_SURFACES)(
    "%s imports the disclosure from its owner",
    (rel) => {
      expect(read(rel)).toContain(OWNER_IMPORT);
    },
  );

  it.each(DISCLOSING_SURFACES)(
    "%s renders the note rather than branching on the raw provenance",
    (rel) => {
      const src = read(rel);
      expect(src).toContain("aggressorProvenanceNote(");
      // The chip strings must exist in exactly one place in src/. A surface
      // that hard-codes "SIDE INFERRED" has restated the owner and will not
      // follow it when the copy changes.
      expect(src).not.toContain("SIDE INFERRED");
      expect(src).not.toContain("SIDE PART-INFERRED");
      expect(src).not.toContain("SIDE UNDISCLOSED");
    },
  );

  it("suppresses the chip when there is no flow at all", () => {
    // "TAPE UNAVAILABLE" already answers "how do you know" — by saying there is
    // nothing to know. A SIDE UNDISCLOSED chip beside it is noise, and noise
    // beside a disclosure is how disclosures stop being read.
    expect(read("src/components/smart-money/SmartMoneyPanel.tsx")).toContain(
      "flow.hasFlow && provenanceNote",
    );
  });
});
