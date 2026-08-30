/**
 * proofLanePace — pure math for the $100 → $1M Proof Lane pace mountain.
 *
 * Founder canon: "ATH/WOW Overflow Options Studio — 3·6·9·12 Challenge
 * Engine — Invention Canon v0.2" (fileId 1D98TgwfwvyEWSfbI-ALW4VcbYfGC7ZOo1JGXZC_1JfU),
 * §9 Required Theoretical Pace and §24 Daily Pace Mountain.
 *
 * These numbers are MATHEMATICS, not forecasts. They set the theoretical
 * pace line the Founder's real trading path is COMPARED TO — behind
 * pace changes the timeline, not the setup standard.
 *
 * Rejection guarantees enforced by this module:
 *  1. THEORETICAL vs MEASURED LIVE are never mixed (canon §13 Truth Labels).
 *  2. Behind-pace never lowers the setup standard.
 *  3. Ahead-of-pace never raises the setup standard.
 *  4. Session growth is compound (geometric), never additive.
 *
 * All exports are pure functions with deterministic outputs. No I/O.
 */

/** Supported challenge horizons (canon §8). */
export type ChallengeHorizonMonths = 2 | 3 | 4 | 6 | 9 | 12;

/** Truth label per canon §13 — this module only emits THEORETICAL. */
export const PACE_TRUTH_LABEL = "THEORETICAL" as const;

/** Weeks per month used by canon §9 pace math. */
export const WEEKS_PER_MONTH = 4.345;

/** Sessions per month used by canon §24 daily pace mountain. */
export const SESSIONS_PER_MONTH = 21;

export interface HorizonPaceRow {
  horizonMonths: ChallengeHorizonMonths;
  weeks: number;
  sessions: number;
  /** Required geometric compound rate per WEEK to travel start → target. */
  weeklyRate: number;
  /** Required geometric compound rate per SESSION to travel start → target. */
  sessionRate: number;
}

/**
 * Return the compounded rate `r` such that `start * (1 + r)^periods === target`.
 * Pure. Deterministic. Never negative-infinity (guarded).
 */
export function requiredCompoundRate(start: number, target: number, periods: number): number {
  if (start <= 0 || target <= 0 || periods <= 0) {
    throw new Error("proofLanePace: start, target, periods must be positive");
  }
  return Math.pow(target / start, 1 / periods) - 1;
}

/**
 * Compute one horizon's canonical pace row for a start/target pair.
 * Default start=$100, target=$1,000,000 per canon §8.
 */
export function paceForHorizon(
  horizonMonths: ChallengeHorizonMonths,
  start = 100,
  target = 1_000_000,
): HorizonPaceRow {
  const weeks = horizonMonths * WEEKS_PER_MONTH;
  const sessions = horizonMonths * SESSIONS_PER_MONTH;
  return {
    horizonMonths,
    weeks,
    sessions,
    weeklyRate: requiredCompoundRate(start, target, weeks),
    sessionRate: requiredCompoundRate(start, target, sessions),
  };
}

/** All four canonical challenge lanes plus the two supplementary sprint lanes. */
export const CANONICAL_HORIZONS: readonly ChallengeHorizonMonths[] = [2, 3, 4, 6, 9, 12] as const;

/** Keep a UI session value on a real, whole session inside its lane. */
export function normalizeSessionIndex(
  value: number,
  horizonMonths: ChallengeHorizonMonths,
): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(
    horizonMonths * SESSIONS_PER_MONTH,
    Math.max(0, Math.trunc(value)),
  );
}

/**
 * Compute the theoretical balance on session N of a horizon.
 * Session 0 = starting balance. Session `sessions` = target.
 */
export function theoreticalBalanceAtSession(
  horizonMonths: ChallengeHorizonMonths,
  sessionIndex: number,
  start = 100,
  target = 1_000_000,
): number {
  if (!Number.isFinite(sessionIndex) || !Number.isInteger(sessionIndex) || sessionIndex < 0) {
    throw new Error("proofLanePace: sessionIndex must be a non-negative whole session");
  }
  const row = paceForHorizon(horizonMonths, start, target);
  if (sessionIndex > row.sessions) return target; // past horizon end
  return start * Math.pow(1 + row.sessionRate, sessionIndex);
}

/** Pace-status verdict for the Catch-Up Compass (canon §12). */
export type PaceStatus = "AHEAD" | "ON_PACE" | "BEHIND";

export interface PaceStatusResult {
  status: PaceStatus;
  actualBalance: number;
  theoreticalBalance: number;
  differenceDollars: number;
  /** 0.01 = 1% ahead; -0.05 = 5% behind. */
  differenceRatio: number;
  /** Canon §12 required interface language for BEHIND. */
  humanMessage: string;
}

/**
 * Compare actual balance vs the theoretical pace balance for the given
 * session, returning a pace status the Catch-Up Compass can render.
 *
 * Canon §12: BEHIND changes the timeline, not the setup standard. This
 * function NEVER emits a "risk more" suggestion — the human message is
 * fixed by canon.
 */
export function paceStatus(
  horizonMonths: ChallengeHorizonMonths,
  sessionIndex: number,
  actualBalance: number,
  start = 100,
  target = 1_000_000,
  onPaceTolerance = 0.02,
): PaceStatusResult {
  const theoretical = theoreticalBalanceAtSession(horizonMonths, sessionIndex, start, target);
  const diff = actualBalance - theoretical;
  const ratio = theoretical > 0 ? diff / theoretical : 0;
  let status: PaceStatus;
  let humanMessage: string;
  if (Math.abs(ratio) <= onPaceTolerance) {
    status = "ON_PACE";
    humanMessage = "PACE STATUS: On theoretical lane. Setup standard unchanged.";
  } else if (ratio > onPaceTolerance) {
    status = "AHEAD";
    humanMessage = "PACE STATUS: Ahead of theoretical lane. Setup standard unchanged.";
  } else {
    status = "BEHIND";
    humanMessage =
      "PACE STATUS: Behind theoretical lane. Timeline recalculated. Do not increase risk solely to catch the chart.";
  }
  return {
    status,
    actualBalance,
    theoreticalBalance: theoretical,
    differenceDollars: diff,
    differenceRatio: ratio,
    humanMessage,
  };
}
