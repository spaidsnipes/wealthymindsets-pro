/**
 * ⓘ → THE ACADEMY LESSON, BEFORE A TOOL IS SWITCHED ON (Supermax §9).
 *
 * A trader meeting an unfamiliar invention opens its ⓘ first. The preview
 * already says what the tool is and what it needs; this adds the door to the
 * published lesson about THAT tool — its primer in "Reading the glass"
 * (toolPrimers.ts), which is built from the tool's own ⓘ record — so it can be
 * read BEFORE the switch is flipped.
 *
 * (First cut, 18:30 Oct 9: the doors landed on FVG lessons that mention the
 * tool. Each tool now has a primer of its own.)
 *
 * A small table on purpose — the ⓘ owner must not import the primers (the
 * primers read the ⓘ owner; importing them here would be a cycle).
 * `academyDoorForTool.test.ts` pins every id and title to the primers.
 */

export interface AcademyDoor {
  readonly lessonId: string;
  readonly href: string;
  readonly title: string;
}

/** A tool primer ("Reading the glass" — src/lib/academy/toolPrimers.ts). Titles are pinned to the primers by test. */
const primer = (slug: string, title: string): AcademyDoor => ({ lessonId: `glass-${slug}`, href: `/education?lesson=glass-${slug}`, title });

const PROFILE = primer("living-profile", "Living Profile");
const WALLS = primer("walls", "Brick Walls and Derivatives Pressure");
const ABSORPTION = primer("absorption", "Absorption");
const WEATHER = primer("liquidity-weather", "Liquidity Weather");
const EFFORT = primer("effort-response", "Effort → Response");
const FOOTPRINT = primer("footprint", "Footprint");

/** ⓘ record id (Tool Finder / Profiles menu / footprint mode) → its lesson. */
export const ACADEMY_DOOR_FOR_TOOL: Readonly<Record<string, AcademyDoor>> = {
  LIVING_PROFILE: PROFILE,
  ABSORPTION: ABSORPTION,
  BRICK_WALLS: WALLS,
  DERIVATIVES_PRESSURE: WALLS,
  LIQUIDITY_WEATHER: WEATHER,
  "FP_bid-ask": FOOTPRINT,
  FP_delta: FOOTPRINT,
  FP_imbalance: FOOTPRINT,
  "FP_volume-profile": FOOTPRINT,
  "FP_aggressive-passive": FOOTPRINT,
  "FP_big-trades": FOOTPRINT,
  EFFORT_RESPONSE: EFFORT,
};

export function academyDoorForTool(id: string): AcademyDoor | null {
  return ACADEMY_DOOR_FOR_TOOL[id] ?? null;
}
