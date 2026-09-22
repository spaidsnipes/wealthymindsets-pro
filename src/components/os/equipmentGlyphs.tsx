"use client";

/**
 * EQUIPMENT GLYPHS — the drawn mark on an equipment tile.
 *
 * THE DEFECT THIS ENDS
 *
 * The approved frame (canon F24, "workspace equipment over live chart") draws
 * the room's equipment as a column of TILES: a thin gold line drawing above or
 * beside the word, inside a bordered plate. What shipped was a text list — six
 * labels, each with a hint wrapping to three lines inside an 85px column — and
 * a list of words is not equipment, it is a menu.
 *
 * WHY A DECLARED MAP AND NOT AN ARRAY
 *
 * A glyph is the one part of a tile that does not arrive with the entry from
 * `roomEquipment`. The two cheap ways to supply it both fail silently:
 *
 *   · a POSITIONAL array — `GLYPHS[index]` — goes stale the instant anyone
 *     inserts a reading, and the failure is that the eleventh reading wears the
 *     tenth one's picture. Nothing errors.
 *   · a FALLBACK — `GLYPHS[id] ?? genericSquare` — means a new reading ships
 *     with a placeholder and nobody ever finds out.
 *
 * So the map is keyed by id, it is exhaustive, and
 * `equipmentGlyphs.sentinel.test.ts` fails the build the moment
 * `allRoomEquipmentIds()` names something this file does not draw. The
 * accessor has no fallback for the same reason: a missing glyph must be a
 * visible hole, not a quiet default.
 *
 * INK: `currentColor`, always. The tile owns whether this equipment is in the
 * trader's hand (gold) or resting (pearl); a glyph that carried its own colour
 * would be a second opinion about state painted on top of the first.
 */

import * as React from "react";

/** One drawn mark. 24x24 viewBox, stroked, never filled. */
function Glyph({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/**
 * The two persistent activators. They are not room equipment — they are the
 * chrome that HANDS you room equipment — so they are named here rather than
 * keyed by an equipment id, and the sentinel does not police them against
 * `allRoomEquipmentIds()`.
 */
export const ACTIVATOR_GLYPHS = {
  /** F24 draws Workspace as a brick grid. */
  workspace: (
    <Glyph>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17M3.5 14.5h17M9 4.5v5M15 9.5v5M9 14.5v5" />
    </Glyph>
  ),
  /** F24 draws Tools as a magnifier — a lens, which is what Tools holds. */
  tools: (
    <Glyph>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l4.5 4.5" />
    </Glyph>
  ),
} as const satisfies Record<string, React.ReactElement>;

/**
 * id → drawn mark, one entry per declared equipment id. Exhaustive by sentinel.
 */
export const EQUIPMENT_GLYPHS: Readonly<Record<string, React.ReactElement>> = {
  /** Walk the market forward one bar at a time — F24's clock-and-arrow. */
  "bar-replay": (
    <Glyph>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4.5V7h2.5" />
      <path d="M12 8.5V12l2.5 1.5" />
    </Glyph>
  ),
  /**
   * Just the market — a bare frame holding nothing but the price line.
   * Deliberately the emptiest mark in the map: the arrangement it names is a
   * subtraction, and a busy glyph would promise the opposite.
   */
  "clean-room": (
    <Glyph>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="M6.5 14.5l3.5-4 2.5 2 4.5-5" />
    </Glyph>
  ),
  /**
   * THE THREE NAMED ARRANGEMENTS. Each mark is drawn as the SAME frame as
   * `clean-room` with different furniture inside it, because that is literally
   * what they are: one market room, arranged three ways. A glyph family that
   * looked unrelated would imply three destinations, and there is only one.
   *
   * Order Flow — aggression against the tape: two opposed pressure bars inside
   * the frame, the taller one winning.
   */
  "arrange-order-flow": (
    <Glyph>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="M7 16.5V9" />
      <path d="M10.5 16.5v-4" />
      <path d="M14 16.5V7.5" />
      <path d="M17.5 16.5v-6" />
    </Glyph>
  ),
  /**
   * Regime — where price has been ACCEPTED: a horizontal profile leaning off
   * the left edge of the frame, fattest at value.
   */
  "arrange-regime": (
    <Glyph>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="M6.5 7.5h4" />
      <path d="M6.5 10.5h8" />
      <path d="M6.5 13.5h6" />
      <path d="M6.5 16.5h3" />
    </Glyph>
  ),
  /**
   * Review — after the fact: the frame with a backward arc over it, the same
   * counter-clockwise gesture `bar-replay` uses, but closed rather than walking.
   */
  "arrange-review": (
    <Glyph>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="M8 15.5a4 4 0 1 0-1.2-2.9" />
      <path d="M6.8 10.2v2.4h2.4" />
    </Glyph>
  ),
  /**
   * The chart's own bench of controls — a tool tray with three implements
   * standing in it. Not a magnifier: `tools` above already owns that mark for
   * the masthead door, and two identical glyphs one press apart would undo in
   * pictures the separation `oneNamePerDoor` enforces in words.
   */
  "chart-tools": (
    <Glyph>
      <path d="M3.5 14.5h17v5h-17z" />
      <path d="M7 14.5V6a1.5 1.5 0 0 1 3 0v8.5" />
      <path d="M12 14.5V4" />
      <path d="M17 14.5V8l-2.5 2.5" />
    </Glyph>
  ),
  /** What you actually did this session — a face turned back on itself. */
  "behaviour-mirror": (
    <Glyph>
      <rect x="4.5" y="3.5" width="15" height="17" rx="7.5" />
      <path d="M12 3.5v17" />
      <path d="M8 9.5l-2 2.5 2 2.5" />
      <path d="M16 9.5l2 2.5-2 2.5" />
    </Glyph>
  ),
  /** What the setup must still satisfy — links in a chain. */
  "decision-chain": (
    <Glyph>
      <rect x="2.5" y="9" width="9" height="6" rx="3" />
      <rect x="12.5" y="9" width="9" height="6" rx="3" />
      <path d="M8.5 12h7" />
    </Glyph>
  ),
  /** Mark the levels you are trading — F24's pencil. */
  "draw-tools": (
    <Glyph>
      <path d="M4 20l1.2-4.2L16 5a2.2 2.2 0 0 1 3.1 3.1L8.2 18.8 4 20z" />
      <path d="M14.4 6.6l3 3" />
    </Glyph>
  ),
  /** Which part of the work is the bottleneck — a strand of nodes. */
  "learning-genome": (
    <Glyph>
      <path d="M7 3.5c0 5 10 5 10 9s-10 4-10 8" />
      <circle cx="7" cy="3.5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="17" cy="20.5" r="1.6" />
    </Glyph>
  ),
  /** Where each reading came from — a stamped document. */
  "market-object-passport": (
    <Glyph>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="10" r="2.6" />
      <path d="M8.5 16h7" />
    </Glyph>
  ),
  /** What is resolved and what blocks entry — stacked planes of the market. */
  "market-reality": (
    <Glyph>
      <path d="M12 3.2l8.5 4.3L12 11.8 3.5 7.5z" />
      <path d="M3.5 12l8.5 4.3L20.5 12" />
      <path d="M3.5 16.5l8.5 4.3 8.5-4.3" />
    </Glyph>
  ),
  /** Whether the pressing side is being paid — flow against flow. */
  "order-flow": (
    <Glyph>
      <path d="M3.5 8.5h13" />
      <path d="M13 5l3.5 3.5L13 12" />
      <path d="M20.5 15.5h-13" />
      <path d="M11 12l-3.5 3.5L11 19" />
    </Glyph>
  ),
  /** Where you have actually performed — your own measured curve. */
  "personal-edge": (
    <Glyph>
      <path d="M3.5 19.5V4.5" />
      <path d="M3.5 19.5h17" />
      <path d="M6.5 16l4-4.5 3.5 2.5L20 7" />
    </Glyph>
  ),
  /** How the practice book was easier than a venue — a balance. */
  "practice-honesty": (
    <Glyph>
      <path d="M12 4v16" />
      <path d="M6 20h12" />
      <path d="M4 8h16" />
      <path d="M4 8l-2.2 4.6a3.2 3.2 0 0 0 4.4 0L4 8z" />
      <path d="M20 8l-2.2 4.6a3.2 3.2 0 0 0 4.4 0L20 8z" />
    </Glyph>
  ),
  /** Anything worth stopping for — the machine keeping watch. */
  "session-watch": (
    <Glyph>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.7" />
    </Glyph>
  ),
  // "smart-money" retired 2026-09-22 — ONE W DOOR (bolt-on #5). Its glyph is
  // removed with the entry because the sentinel's second direction ("draws
  // nothing no room hands out") is right: a mark for a door no room offers is
  // dead paint that teaches readers of this map not to trust it.
};

/**
 * The drawn mark for an equipment id, or `null` when none is declared.
 *
 * NO FALLBACK, deliberately. A generic placeholder square would satisfy the
 * layout and hide exactly the condition the sentinel exists to catch.
 */
export function equipmentGlyph(id: string): React.ReactElement | null {
  return EQUIPMENT_GLYPHS[id] ?? null;
}
