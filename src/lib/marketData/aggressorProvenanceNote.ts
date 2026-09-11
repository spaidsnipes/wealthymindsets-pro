/**
 * aggressorProvenanceNote — the disclosure a non-PROVIDER aggressor flow owes
 * the trader, in words, owned once.
 *
 * WHY THIS IS A LIB MODULE AND NOT A COMPONENT HELPER (2026-09-11).
 *
 * These words were born inside `OrderFlowCockpitStrip.tsx`, exported from it so
 * a test could drive them rather than retype them. That was right for one
 * surface. It stopped being right the moment a SECOND surface needed to make
 * the same disclosure: `SmartMoneyPanel` reads the same `AggressorProvenance`
 * off the same selector, and the only two ways to say the same sentence there
 * are (a) import it from a chart component, or (b) retype it.
 *
 * (b) is the defect class this whole atom exists to kill — a consumer restating
 * what an owner publishes, drifting the day the owner's copy is softened. (a)
 * works, but it points the dependency arrow at a rendering component, which
 * makes the words look like a detail of that component's chrome rather than a
 * property of the fact. They are a property of the FACT: a tick-rule
 * reconstruction is not ground truth on a cockpit strip, on a smart-money
 * panel, or anywhere else, and the sentence that says so should not live inside
 * whichever surface happened to need it first.
 *
 * So the words live beside the type they describe. Every surface that renders
 * `AggressorProvenance` imports these; none of them author disclosure copy.
 */

import type { AggressorProvenance } from "./selectAggressorFlow";

export interface AggressorProvenanceNote {
  /** Short chip label. Uppercase, rendered as-is. */
  readonly chip: string;
  /** Full explanation, for a `title` / tooltip. */
  readonly title: string;
}

/**
 * `null` for PROVIDER — a venue-asserted aggressor needs no asterisk, and
 * hanging one on it would train the eye to ignore the asterisk that matters.
 *
 * Exported so the words are TESTED rather than retyped in a test file: a test
 * that restated "SIDE INFERRED" inline would keep passing after someone
 * softened the shipped copy, which is how labels in this repo have drifted
 * before.
 */
export function aggressorProvenanceNote(
  provenance: AggressorProvenance,
): AggressorProvenanceNote | null {
  switch (provenance) {
    case "PROVIDER":
      return null;
    case "INFERRED":
      return {
        chip: "SIDE INFERRED",
        title:
          "No venue supplied an aggressor flag. Each side was reconstructed by " +
          "comparing the print to the prior price (tick rule) — directional, not ground truth.",
      };
    case "MIXED":
      return {
        chip: "SIDE PART-INFERRED",
        title:
          "Some prints carried a venue-asserted aggressor and some were reconstructed " +
          "by tick rule. The combined figure is only as strong as its weakest print.",
      };
    case "UNDISCLOSED":
    default:
      return {
        chip: "SIDE UNDISCLOSED",
        title:
          "The tape did not state how these aggressor sides were established.",
      };
  }
}
