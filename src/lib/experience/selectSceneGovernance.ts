/**
 * HOW MUCH OF THIS SCREEN THE OS ACTUALLY RUNS, GIVEN A SHAPE.
 *
 * `SceneAdmissionPanel`'s own header states the number this compiles:
 *
 *     "The honest consequence is that this panel now shows how much of the
 *      screen the OS actually governs — 1 of 12 on the deck today. That number
 *      is meant to be uncomfortable and to rise. It is the §10 progress meter."
 *
 * It was never drawn, and it was barely printed. The figure lived in one prose
 * sentence at the foot of the third chip list, and — the part that matters —
 * that sentence was rendered inside `{ungoverned.length > 0 && ...}`. A route
 * that governed every element printed no reach figure at all, so the single
 * number proving the OS had finally taken the screen disappeared exactly when
 * it became good news. A meter that hides its best reading is not a meter.
 *
 * ── THE THREE POPULATIONS ────────────────────────────────────────────────────
 *
 *   ADMITTED   — governed, and the scene allowed it. The OS ran this pixel.
 *   WITHHELD   — governed, and the scene removed it. A real, enforced refusal.
 *   UNGOVERNED — the compiler holds an opinion this route does not apply.
 *
 * The first two are the OS working. The third is the OS being decorative here.
 * Read as three separate headings — "Admitted · 1", "Withheld · 0", "Not
 * governed here · 11" — they are three facts. Read as one band they are the
 * single fact: eleven twelfths of this screen answers to nobody.
 *
 * ── WHAT IT REFUSES ──────────────────────────────────────────────────────────
 *
 * 1. NO PERCENTAGE, NO GRADE. "92% governed" invites a passing mark, and §15
 *    forbids a score. The band is counted in ELEMENTS because elements are what
 *    a route wires — a fraction of a point cannot be shipped.
 *
 * 2. THE DENOMINATOR IS FIXED AND FULL. Every entry in `SURFACE_ELEMENTS` gets
 *    a mark, always, including the ones this route has never heard of. A band
 *    drawn only over governed elements would be full at all times and would
 *    report total authority over a screen the OS does not touch.
 *
 * 3. GOVERNED SORTS FIRST, ADMITTED AHEAD OF WITHHELD. So the OS's actual reach
 *    reads as one contiguous run from the left edge and can be judged by
 *    length. Partition, never sort — order inside each population is
 *    `SURFACE_ELEMENTS` order, so the band cannot reshuffle between renders.
 *
 * 4. ADMITTED IS COUNTED, NEVER INFERRED. It is the flattering bucket — the one
 *    that says "the OS ran this" — so membership requires being named in BOTH
 *    `governed` and `admits`. An element the compiler grows tomorrow and no
 *    caller has wired lands in UNGOVERNED, which is the truthful place for it.
 *
 * Pure / deterministic / no clock. Renders elsewhere.
 */

import { SURFACE_ELEMENTS, type SurfaceElement } from "./compileScene";

export type GovernanceStanding = "ADMITTED" | "WITHHELD" | "UNGOVERNED";

export interface GovernanceMark {
  readonly element: SurfaceElement;
  readonly standing: GovernanceStanding;
  /** True when the scene's verdict on this element is actually applied here. */
  readonly governed: boolean;
}

export interface SceneGovernance {
  readonly marks: readonly GovernanceMark[];
  readonly admitted: number;
  readonly withheld: number;
  readonly ungoverned: number;
  /** `admitted + withheld` — the elements the OS genuinely rules on this route. */
  readonly governed: number;
  /** Always `SURFACE_ELEMENTS.length`. Named so a surface cannot re-derive it. */
  readonly total: number;
}

export interface SceneGovernanceInput {
  /** `compilation.admits` — the compiler's verdict. */
  readonly admits: readonly SurfaceElement[];
  /** The elements the calling surface actually routes through `SceneAdmits`. */
  readonly governed: readonly SurfaceElement[];
}

export function selectSceneGovernance(input: SceneGovernanceInput): SceneGovernance {
  const admitsSet = new Set<SurfaceElement>(input.admits);
  const governedSet = new Set<SurfaceElement>(input.governed);

  // Standing is decided per element against BOTH sets — see refusal 4. An
  // element absent from `governed` is UNGOVERNED whatever the compiler said
  // about it, because a verdict nobody applies moved no pixel.
  const standingOf = (element: SurfaceElement): GovernanceStanding => {
    if (!governedSet.has(element)) return "UNGOVERNED";
    return admitsSet.has(element) ? "ADMITTED" : "WITHHELD";
  };

  // Governed first, admitted ahead of withheld — refusal 3. Three filters over
  // the canonical order rather than a comparator, so each population keeps
  // `SURFACE_ELEMENTS` order and no two renders can disagree.
  const byStanding = (want: GovernanceStanding): GovernanceMark[] =>
    SURFACE_ELEMENTS.filter((e) => standingOf(e) === want).map((element) => ({
      element,
      standing: want,
      governed: want !== "UNGOVERNED",
    }));

  const admitted = byStanding("ADMITTED");
  const withheld = byStanding("WITHHELD");
  const ungoverned = byStanding("UNGOVERNED");

  return {
    marks: [...admitted, ...withheld, ...ungoverned],
    admitted: admitted.length,
    withheld: withheld.length,
    ungoverned: ungoverned.length,
    governed: admitted.length + withheld.length,
    total: SURFACE_ELEMENTS.length,
  };
}

export default selectSceneGovernance;
