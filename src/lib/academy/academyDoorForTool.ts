/**
 * ⓘ → THE ACADEMY LESSON, BEFORE A TOOL IS SWITCHED ON (Supermax §9).
 *
 * A trader meeting an unfamiliar invention opens its ⓘ first. The preview
 * already says what the tool is and what it needs; this adds the door to the
 * published lesson that teaches it, so the lesson can be read BEFORE the
 * switch is flipped.
 *
 * Only published lessons are doors (the FVG / Imbalance & Patience course —
 * the rest of the catalogue has no published content yet, and a door to an
 * outline would promise a lesson that is not there). Each tool points at the
 * lesson that actually teaches it beside a gap:
 *
 *   profiles                      → 12  FVG + profile
 *   footprint modes, absorption,
 *   options walls, liquidity      → 13  FVG + order flow (evidence per sense;
 *                                       walls and resting liquidity by reference)
 *   effort → response             → 5   Displacement (effort and response of the middle bar)
 *
 * A small table on purpose — the ⓘ owner must not import the whole course to
 * print one link. `academyDoorForTool.test.ts` pins every number and title to
 * the course, and pins that each lesson really names the tool it is a door for.
 */

export interface AcademyDoor {
  readonly lessonId: string;
  readonly href: string;
  readonly title: string;
}

const door = (n: number, title: string): AcademyDoor => ({ lessonId: `fvg-${n}`, href: `/education?lesson=fvg-${n}`, title });

const PROFILE = door(12, "FVG + profile");
const EVIDENCE = door(13, "FVG + order flow");
const DISPLACEMENT = door(5, "Displacement");

/** ⓘ record id (Tool Finder / Profiles menu / footprint mode) → its lesson. */
export const ACADEMY_DOOR_FOR_TOOL: Readonly<Record<string, AcademyDoor>> = {
  LIVING_PROFILE: PROFILE,
  ABSORPTION: EVIDENCE,
  BRICK_WALLS: EVIDENCE,
  DERIVATIVES_PRESSURE: EVIDENCE,
  LIQUIDITY_WEATHER: EVIDENCE,
  LIQUIDITY_LIFECYCLE: EVIDENCE,
  "FP_bid-ask": EVIDENCE,
  FP_delta: EVIDENCE,
  FP_imbalance: EVIDENCE,
  "FP_volume-profile": EVIDENCE,
  "FP_aggressive-passive": EVIDENCE,
  "FP_big-trades": EVIDENCE,
  EFFORT_RESPONSE: DISPLACEMENT,
  EFFORT_MARK: DISPLACEMENT,
};

export function academyDoorForTool(id: string): AcademyDoor | null {
  return ACADEMY_DOOR_FOR_TOOL[id] ?? null;
}
