/**
 * COVERAGE, DRAWN — the part of a position nobody is holding.
 *
 * `ProtectionState` already carries the three numbers that matter: how much is
 * filled, how much a working stop covers, and how much is not covered by
 * anything. The line rendered them as the §7 sentence —
 *
 *     POSITION 3 PROTECTED 2 UNPROTECTED 1
 *
 * — which is precise and completely unranked. "PROTECTED 2 UNPROTECTED 1" and
 * "PROTECTED 1 UNPROTECTED 2" are one character apart on a surface whose whole
 * subject is how much of the trader's size is exposed.
 *
 * This compiles the proportion. It measures nothing: `selectProtectionState`
 * already clamped protection to the filled size precisely so an over-covered
 * reading could never appear, and this only divides its output.
 *
 * ── TWO REFUSALS ─────────────────────────────────────────────────────────────
 *
 * 1. FLAT DRAWS NOTHING. A zero-length position has no proportion to show, and
 *    an empty track would read as "nothing is covered" rather than "nothing is
 *    held". The sentence already says FLAT.
 *
 * 2. AN UNVERIFIED READ IS MARKED, NOT SMOOTHED. When the book could not be
 *    read this cycle the grade is UNVERIFIED — LAST KNOWN, and a confident
 *    solid bar over stale counts is the reassuring failure mode §9 bans:
 *    "Do not increase certainty". The bar carries a `stale` flag so the surface
 *    can draw it as evidently unfresh.
 *
 * COLOUR IS NOT DECIDED HERE, but the rule that governs it is: §9 — "No green
 * shield. No green means safe." Covered size is restrained ivory FACT; it is
 * never rendered as reassurance, because a working stop can still gap.
 *
 * Pure / deterministic. Renders elsewhere.
 */

import type { ProtectionState } from "./protectionState";

export interface ProtectionCoverageBar {
  /** Share of the filled size a working stop covers, 0–100. */
  readonly protectedPct: number;
  /** Share nobody is holding, 0–100. Always `100 - protectedPct`. */
  readonly uncoveredPct: number;
  /** The denominator the two shares divide — the filled size. */
  readonly positionQty: number;
  readonly uncoveredQty: number;
  /** The read behind these counts failed this cycle. */
  readonly stale: boolean;
}

export function selectProtectionCoverageBar(
  state: ProtectionState | null,
): ProtectionCoverageBar | null {
  if (!state) return null;
  if (state.positionQty <= 0) return null;

  const protectedPct = (state.protectedQty / state.positionQty) * 100;

  return {
    protectedPct,
    // Derived by subtraction rather than divided a second time, so the two
    // shares cannot round into a gap or an overlap that has no owner.
    uncoveredPct: 100 - protectedPct,
    positionQty: state.positionQty,
    uncoveredQty: state.uncoveredQty,
    stale: state.grade === "UNVERIFIED — LAST KNOWN",
  };
}

export default selectProtectionCoverageBar;
