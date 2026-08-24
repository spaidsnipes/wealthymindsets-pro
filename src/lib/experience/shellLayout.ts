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

const EMPHASIS: Readonly<Record<ExperienceMode, ShellEmphasis>> = {
  PREP: { job: "Plan the session before the bell.", railDefaultOpen: true, canvasWeight: 0.72, liveFocus: false },
  OBSERVE: { job: "Watch the market with no position.", railDefaultOpen: false, canvasWeight: 0.85, liveFocus: true },
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
