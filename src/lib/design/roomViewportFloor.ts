/**
 * ONE OS · A ROOM IS NOT THE SCREEN.
 *
 * ── THE DEFECT, AND WHY IT SURVIVED THE FIRST INSTRUMENT ────────────────────
 *
 * `osRoomPlane.ts` catches a room that paints over the sanctuary. It measures
 * the COLOUR. The repairs it prompted therefore fixed the colour — and stopped
 * exactly at the instrument's edge, leaving the HEIGHT on the same elements.
 *
 * `/command-deck` is the proof. Its route plane was moved `100vh` → `100%`
 * with the reasoning written out in a comment. The Suspense fallback directly
 * above it, drawn during the precise frames the trader is waiting, was left at
 * `100vh`. One element repaired, its twin three hundred lines up untouched,
 * because nothing was asking.
 *
 * ── THE RULE, STATED BY EFFECT ──────────────────────────────────────────────
 *
 * A room page's content is a CHILD of the frame's scrolling room, and that room
 * begins below the masthead. So `100vh` — or `min-h-screen`, which is the same
 * value under a shorter name — is a floor one masthead taller than the space
 * the element was actually given. The room scrolls by exactly the masthead's
 * height while it is still EMPTY. "THE INTERFACE SHOULD FEEL STILL" is the law
 * this breaks, and it breaks it on arrival, before any content exists to blame.
 *
 * `100%` / `min-h-full` fills the room it was given. An empty room stays still.
 *
 * ── WHAT IS DELIBERATELY NOT AN OFFENCE ─────────────────────────────────────
 *
 * 1. A `fixed` element. It has left the room's flow and is positioned against
 *    the viewport, so the viewport is the honest thing for it to measure. A
 *    full-screen modal scrim is not this defect.
 * 2. `max-h-*` / `maxHeight`. A CEILING cannot create scroll it does not
 *    already have; this gate is about floors and fixed extents.
 * 3. Anything in a comment — see `stripComments`, which exists because a
 *    repair's own comment quotes the value it replaced.
 *
 * Every one of those fails CLOSED, which is the safe direction for a gate whose
 * false positives teach people to widen it.
 */
import { enclosingOpenTag, stripComments } from "./osRoomPlane";

/** One element that floors itself at the screen's height inside a room. */
export interface ViewportFloorOffence {
  readonly found: string;
  readonly reason: string;
}

/**
 * The viewport height units. `dvh`/`svh`/`lvh` are the same claim with a
 * mobile-toolbar refinement — they still measure the SCREEN, which is the
 * thing a room is not.
 */
export const VIEWPORT_HEIGHT_UNITS = ["vh", "dvh", "svh", "lvh"] as const;

/**
 * An element that has left the room's flow measures the viewport honestly.
 * Word-bounded so `fixed-width` or a `notFixed` identifier cannot exempt a
 * plane by accident.
 */
const OUT_OF_FLOW = /(?<![\w-])(?:fixed|position:\s*["'`]?fixed)(?![\w-])/;

/** Tailwind: min-h-screen, h-screen, h-[100dvh], min-h-[calc(100vh-56px)]. */
const TAILWIND_SCREEN_HEIGHT = new RegExp(
  String.raw`(?<![\w-])(?:min-)?h-(?:screen|\[[^\]]*\b\d+(?:${VIEWPORT_HEIGHT_UNITS.join("|")})\b[^\]]*\])(?![\w-])`,
  "g",
);

/**
 * Inline style: minHeight: "100vh", height: '100dvh', minHeight: "calc(100vh - 56px)".
 *
 * The leading lookbehind is what keeps `maxHeight` out. Without it the pattern
 * matches the `Height:` INSIDE `maxHeight:` and the gate starts reporting
 * ceilings, which cannot create the scroll this exists to prevent.
 */
const INLINE_SCREEN_HEIGHT = new RegExp(
  String.raw`(?<![\w$])(?:min)?[Hh]eight:\s*["'\`][^"'\`]*\b\d+(?:${VIEWPORT_HEIGHT_UNITS.join("|")})\b[^"'\`]*["'\`]`,
  "g",
);

/**
 * Every element in this source that floors itself at the screen's height while
 * living inside a room. Empty means the room fills the room it was given.
 */
export function findViewportFloors(source: string): ViewportFloorOffence[] {
  const code = stripComments(source);
  const offences: ViewportFloorOffence[] = [];

  const record = (m: RegExpMatchArray, reason: string) => {
    const at = m.index ?? 0;
    const tag = enclosingOpenTag(code, at, m[0].length);
    // No tag text means the claim is not on an element we can read — a
    // variable, a stylesheet string, a fragment. Fail closed.
    if (!tag) return;
    if (OUT_OF_FLOW.test(tag)) return; // positioned against the screen on purpose
    offences.push({ found: m[0], reason });
  };

  for (const m of code.matchAll(TAILWIND_SCREEN_HEIGHT)) {
    record(
      m,
      "a screen-height floor inside a room that begins below the masthead — the room scrolls while empty",
    );
  }

  for (const m of code.matchAll(INLINE_SCREEN_HEIGHT)) {
    record(
      m,
      "a viewport-unit height inside a room — `100%` fills the room it was actually given",
    );
  }

  return offences;
}
