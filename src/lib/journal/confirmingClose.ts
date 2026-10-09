/**
 * THE CONFIRMING CLOSE — defined ONCE, in the Academy's own words (Garden 19 §23 / §41, 2026-10-09). PURE.
 *
 * "Did the trader wait?" needs a meaning for "a confirming close". WM does not write a second one: it is
 * the FVG course's Lesson 9 (Rejection vs acceptance) for a trade taken WITH the gap, and Lesson 14
 * (Failed FVG / trade-through) for a trade taken AGAINST it — the same sentences the trader learns from,
 * read here from the lesson records themselves, which carry the engine's own thresholds.
 */

import { FVG_LESSONS, fvgLessonHref } from "@/lib/academy/fvgCourse";

export const CONFIRMING_CLOSE_LESSON = "fvg-9";
export const AGAINST_GAP_CLOSE_LESSON = "fvg-14";

const lesson = (id: string) => FVG_LESSONS.find(l => l.id === id) ?? null;

/** The rule, as the Academy states it. */
export function confirmingCloseWords(): { readonly withGap: string; readonly againstGap: string } {
  const l9 = lesson(CONFIRMING_CLOSE_LESSON), l14 = lesson(AGAINST_GAP_CLOSE_LESSON);
  return {
    withGap: l9?.body.find(b => b.startsWith("REJECTION:")) ?? "",
    againstGap: l14?.lede ?? "",
  };
}

/** The door to the lesson that defines it ("Study: Lesson 9 · Rejection vs acceptance"). */
export function confirmingCloseDoor(): { readonly href: string; readonly label: string } | null {
  const l9 = lesson(CONFIRMING_CLOSE_LESSON);
  return l9 ? { href: fvgLessonHref(l9.n), label: `Lesson ${l9.n} · ${l9.title}` } : null;
}

/** One line for the Personal Edge block, under the WAITED group. */
export function confirmingCloseLine(): string {
  const w = confirmingCloseWords();
  return `A confirming close, as the Academy defines it — trading with the gap: ${w.withGap.replace(/^REJECTION:\s*/, "")} Trading against it: ${w.againstGap}`;
}
