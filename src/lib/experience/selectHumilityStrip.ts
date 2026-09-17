/**
 * WHAT WE DO NOT KNOW, GIVEN A SHAPE.
 *
 * `HumilityPanel` states its census in a heading:
 *
 *     What we do not know · 9 · 3 structural
 *
 * Both numbers are true and the relationship between them is the thing that
 * matters, because the two populations do not behave alike:
 *
 *   · UNOBSERVED gaps close on their own. A source connects, an answer
 *     arrives, the line disappears. Waiting is a strategy.
 *   · STRUCTURAL gaps are limits of the build. They do not close until
 *     somebody ships something. Waiting is not a strategy.
 *
 * "9 · 3 structural" and "9 · 8 structural" are four characters apart and
 * describe very different products. This compiles the census into one mark per
 * item so the proportion is legible before either number is read.
 *
 * ── WHAT IT REFUSES ──────────────────────────────────────────────────────────
 *
 * 1. NO SCORE. There is no "72% observational", no completeness figure, no
 *    grade. A gap is not a fraction of a known whole — the whole point of this
 *    panel is that the denominator of everything-there-is-to-know is itself
 *    unknown. Only the items in hand are counted, and they are counted as
 *    ITEMS, never aggregated into a reassuring percentage.
 *
 * 2. STRUCTURAL SORTS FIRST. Not because it is worse, but because it is the
 *    part that will still be there tomorrow. A strip that led with the gaps
 *    about to close would read as progress.
 *
 * 3. AN EMPTY LIST DRAWS NOTHING. `selectHumility` cannot return one, but a
 *    caller may hand one over, and a strip with no marks under a heading that
 *    says "what we do not know" would read as "nothing" — the single most
 *    dishonest thing this panel could say.
 *
 * COLOUR IS NOT DECIDED HERE, and the panel that renders it deliberately uses
 * none: §9 requires the difference between a gap that may close and one that
 * will not to survive on a greyscale screen and for a colour-blind reader, so
 * the surface distinguishes them by FILL rather than by hue.
 *
 * Pure / deterministic / no clock. Renders elsewhere.
 */

import type { HumilityItem, HumilityKind } from "./selectHumility";

export interface HumilityMark {
  readonly id: string;
  readonly kind: HumilityKind;
  /** True for the limits that do not close by themselves. */
  readonly permanent: boolean;
}

export interface HumilityStrip {
  readonly marks: readonly HumilityMark[];
  readonly structural: number;
  readonly unobserved: number;
  readonly total: number;
}

export function selectHumilityStrip(
  items: readonly HumilityItem[] | null,
): HumilityStrip | null {
  if (!items || items.length === 0) return null;

  // Structural first — see refusal 2. A stable partition rather than a sort,
  // so items keep the order the selector gave them within each population and
  // the strip cannot reshuffle between renders.
  const structural = items.filter((i) => i.kind === "STRUCTURAL");
  const unobserved = items.filter((i) => i.kind !== "STRUCTURAL");

  const marks: HumilityMark[] = [...structural, ...unobserved].map((item) => ({
    id: item.id,
    kind: item.kind,
    permanent: item.kind === "STRUCTURAL",
  }));

  return {
    marks,
    structural: structural.length,
    // Counted by partition rather than by subtracting from the total, so a
    // future third kind cannot be silently absorbed into "unobserved" and
    // reported as a gap that will close on its own.
    unobserved: unobserved.length,
    total: items.length,
  };
}

export default selectHumilityStrip;
