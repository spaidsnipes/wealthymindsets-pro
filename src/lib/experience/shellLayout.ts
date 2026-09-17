/**
 * shellLayout — pure layout-emphasis mapping for the WM Experience Shell.
 *
 * Founder transformation (2026-08-24): "The market stays the same. The interface
 * changes its emphasis around the human's current job." The seven operating
 * states — PREP · OBSERVE · WAIT · EXECUTE · MANAGE · REVIEW · LEARN — do NOT
 * change market truth; they change what the shell EMPHASISES. This module keeps
 * those emphasis decisions out of JSX and under test.
 *
 * The chart canvas is sacred in every mode (never below `minCanvasWeight`). What
 * varies is whether the contextual guest rail opens by default and what the
 * single job caption says. PURE — no React, no I/O.
 */

import type { ExperienceMode } from "./decisionContextBus";

export interface ShellEmphasis {
  /** The human's current job, in one short imperative line. */
  readonly job: string;
  /**
   * Whether the contextual guest rail (watchlist / prep / review context) opens
   * by default in this mode. EXECUTE and MANAGE keep the chart sacred and the
   * rail closed; PREP / REVIEW / LEARN benefit from context alongside.
   */
  readonly railDefaultOpen: boolean;
  /**
   * Relative weight (0..1) of the primary canvas vs. chrome. The chart is
   * always dominant; this only nudges how much breathing room chrome gets.
   */
  readonly canvasWeight: number;
  /**
   * Whether this mode is a "live-market" job (OBSERVE/WAIT/EXECUTE/MANAGE) vs a
   * "reflection" job (PREP/REVIEW/LEARN). Surfaces can quiet live tickers in
   * reflection modes without changing any market truth.
   */
  readonly liveFocus: boolean;
}

/** Chart is sacred: the canvas never drops below this share of emphasis. */
export const MIN_CANVAS_WEIGHT = 0.7;

/*
  THE CAPTION IS A JOB, NOT AN OBSERVATION OF THE TRADER'S BOOK.

  Measured live in the masthead of wealthymindsetspro.com/charts, 2026-09-17,
  directly under the wordmark, on every route, in the default mode:

      WEALTHYMINDSETS PRO
      Watch the market with no position.

  `inferJobMode` was repaired for this exact sentence and says why in its own
  words: "'with no position' is a POSITIVE CLAIM about the trader's exposure",
  and WM "stops asserting a flatness it never observed". That module now hands
  back "no position is visible from this surface" unless it holds an actual
  `NO_EXPOSURE_OBSERVED`, and `decisionMemoryReachability.test.ts` proves why
  the stronger claim is unavailable: the decision store has no production
  writer, so exposure is structurally UNOBSERVED.

  The repair never reached this table — and this is the copy the trader
  actually reads. The inference's `reason` surfaces on one deck panel; this
  caption is painted in the masthead of every route, in the mode the shell
  lands in before the human has declared anything at all. The fixed sentence
  was the quiet one; the loud one kept the claim.

  Every other caption here is an imperative naming the WORK. Only OBSERVE's
  carried a descriptive clause about exposure, which is what made it a
  reading. It is now an instruction like its six siblings, and it asserts
  nothing WM cannot see.

  MANAGE's "the open position" is deliberately LEFT ALONE: `inferJobMode`
  reaches MANAGE only on `position === "AT_RISK"` — an observed exposure, and
  explicitly not on UNOBSERVED ("UNOBSERVED is not a quiet 'no'"). That
  caption is backed by the same evidence that selects the mode.
*/
const EMPHASIS: Readonly<Record<ExperienceMode, ShellEmphasis>> = {
  PREP: { job: "Plan the session before the bell.", railDefaultOpen: true, canvasWeight: 0.72, liveFocus: false },
  OBSERVE: { job: "Watch the market without taking a position.", railDefaultOpen: false, canvasWeight: 0.85, liveFocus: true },
  WAIT: { job: "Hold the thesis; wait for permission.", railDefaultOpen: false, canvasWeight: 0.85, liveFocus: true },
  EXECUTE: { job: "Place the planned decision.", railDefaultOpen: false, canvasWeight: 0.9, liveFocus: true },
  MANAGE: { job: "Steward the open position.", railDefaultOpen: false, canvasWeight: 0.88, liveFocus: true },
  REVIEW: { job: "Study what you and the market did.", railDefaultOpen: true, canvasWeight: 0.74, liveFocus: false },
  LEARN: { job: "Train the exact weakness found.", railDefaultOpen: true, canvasWeight: 0.72, liveFocus: false },
} as const;

/**
 * Resolve the shell's layout emphasis for a mode. Guarantees the chart canvas
 * stays sacred (>= MIN_CANVAS_WEIGHT) regardless of the table above.
 */
export function shellEmphasis(mode: ExperienceMode): ShellEmphasis {
  const base = EMPHASIS[mode];
  return {
    ...base,
    canvasWeight: Math.max(MIN_CANVAS_WEIGHT, Math.min(1, base.canvasWeight)),
  };
}
