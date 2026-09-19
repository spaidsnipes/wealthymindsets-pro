/**
 * ONE CONNECTED GATE RAIL — and the two facts it refuses to merge.
 *
 * Visual source: WM_NewMockup_133_Gates_One_Rail_Debt.jpg (2026-09-18).
 * The mockup's right column is headed DECISION_ID D-1842 · ONE CONNECTED GATE
 * RAIL, carries six named gates joined by a single spine, hangs a DEBT node off
 * each one, and closes with a stance block that reads:
 *
 *     STANCE   WAIT
 *     WAIT FINISHED — EVIDENCE DEBT REMAINS
 *     WHY: force present · response unpaid
 *
 * That middle line is the entire reason this module exists.
 *
 * ── THE TWO FACTS ────────────────────────────────────────────────────────────
 *
 * "The wait is finished" and "the evidence is paid" are different claims about
 * different things, and a surface that lets one stand in for the other is not
 * making a rounding error — it is converting a clock into a permission.
 *
 *   WAIT FINISHED is about TIME. The thing the trader was waiting for has
 *   happened, or the window has closed. Nothing about that says the house can
 *   explain what happened.
 *
 *   DEBT REMAINS is about EVIDENCE. Gates are still unanswered. The chain
 *   cannot be reconstructed, which means no receipt written now could be
 *   audited later.
 *
 * The dangerous composition is not "WAIT FINISHED, therefore GO". Nobody writes
 * that. It is a rail that stops drawing the debt column once the wait clears,
 * because the debt column looked like it was ABOUT the wait. The trader then
 * reads a rail with no debt on it and concludes there is none.
 *
 * So `waitVerdict` returns both booleans, never one, and there is deliberately
 * no `canProceed()` here — the same refusal `marketObjectKinds.ts` makes by
 * shipping no `isTradeable()`. A function named for permission is the place a
 * permission gets invented.
 *
 * ── AND WHY AN UNASKED GATE IS NOT A PAID ONE ────────────────────────────────
 *
 * The mockup draws two gate marks, a tick and a question mark. There is a third
 * state it cannot draw, because it is the state where the rung is not on the
 * rail at all: the gate NOBODY ASKED.
 *
 * That is H1 — absence rendered as a value — arriving at the gate rail. An
 * unanswered gate argues with you. An unasked gate is silent, and silence is
 * exactly what "no debt" looks like. So UNASKED counts as debt, is named
 * separately from UNANSWERED, and `buildGateRail` refuses to report a clean
 * rail that it never actually interrogated.
 */

/* ── THE RAIL ──────────────────────────────────────────────────────────────── */

/**
 * The six gates, in the mockup's order, fixed.
 *
 * Position is meaning on a rail a trader reads every session. A rail that
 * sorted itself — unanswered first, say — would be more useful on any single
 * glance and unlearnable across a thousand of them, because the rung under the
 * thumb would be a different gate every morning.
 */
export const GATE_RAIL_ORDER = [
  "REGIME",
  "DIRECTION",
  "LOCATION",
  "ORDER_FLOW",
  "CLC",
  "AVAILABLE_R",
] as const;

export type GateName = (typeof GATE_RAIL_ORDER)[number];

/**
 * Three standings, because two is the bug.
 *
 *   ANSWERED   — the gate was asked and it cleared.
 *   UNANSWERED — the gate was asked and it did not. It argues with you.
 *   UNASKED    — nobody put the question. Silent, and silence reads as clean.
 */
export type GateStanding = "ANSWERED" | "UNANSWERED" | "UNASKED";

export interface GateRung {
  readonly gate: GateName;
  readonly standing: GateStanding;
  /** True for anything not ANSWERED. An unasked gate owes exactly as much. */
  readonly owesDebt: boolean;
}

export interface GateRail {
  readonly rungs: readonly GateRung[];
  readonly answered: number;
  readonly unanswered: number;
  readonly unasked: number;
  /** `unanswered + unasked`. The gates still owed, loud and silent alike. */
  readonly debt: number;
}

/**
 * Build the rail from whatever the house actually knows.
 *
 * A gate absent from `answers` is UNASKED, not clean. That default is the
 * whole safety property: the failure mode is a caller who forgets a gate, and
 * forgetting must cost debt rather than earn a tick.
 */
export function buildGateRail(
  answers: Partial<Record<GateName, boolean>>,
): GateRail {
  const rungs: GateRung[] = GATE_RAIL_ORDER.map((gate) => {
    const answer = answers[gate];
    const standing: GateStanding =
      answer === undefined ? "UNASKED" : answer ? "ANSWERED" : "UNANSWERED";
    return { gate, standing, owesDebt: standing !== "ANSWERED" };
  });

  return {
    rungs,
    answered: rungs.filter((r) => r.standing === "ANSWERED").length,
    unanswered: rungs.filter((r) => r.standing === "UNANSWERED").length,
    unasked: rungs.filter((r) => r.standing === "UNASKED").length,
    debt: rungs.filter((r) => r.owesDebt).length,
  };
}

/* ── THE TWO FACTS, NEVER MERGED ───────────────────────────────────────────── */

export interface WaitVerdict {
  /** About TIME. The thing waited for has happened, or the window closed. */
  readonly waitFinished: boolean;
  /** About EVIDENCE. Gates are still owed. Independent of the above. */
  readonly debtRemains: boolean;
  /** The line the mockup prints under STANCE. Both facts, in one sentence. */
  readonly line: string;
}

/**
 * State both facts. Never one.
 *
 * Note that the four combinations are four different sentences, and that the
 * interesting one is not the alarming one:
 *
 *   wait finished + debt remains  — the mockup's case. The reason for the line.
 *   wait finished + no debt       — the only state where nothing is owed, and
 *                                   it STILL says nothing about whether to act.
 *   waiting + debt remains        — ordinary. Both clocks still running.
 *   waiting + no debt             — the chain is explicable and the moment has
 *                                   not arrived. Evidence is not a trigger.
 *
 * The last one is worth naming out loud, because "we have all the evidence" is
 * the most natural thing in the world to mistake for "so go". The rail's job is
 * to describe the chain, not to start it.
 */
export function waitVerdict(rail: GateRail, waitFinished: boolean): WaitVerdict {
  const debtRemains = rail.debt > 0;

  const line = waitFinished
    ? debtRemains
      ? "WAIT FINISHED — EVIDENCE DEBT REMAINS"
      : "WAIT FINISHED — NO EVIDENCE DEBT"
    : debtRemains
      ? "WAITING — EVIDENCE DEBT REMAINS"
      : "WAITING — NO EVIDENCE DEBT";

  return { waitFinished, debtRemains, line };
}

export type RailVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * Refuse a rail that reports clean without having been interrogated.
 *
 * This is the guard against the specific composition that reads best and lies
 * worst: every gate UNASKED produces zero UNANSWERED, and a surface that counts
 * only the arguing gates would print a rail with nothing wrong on it. Zero
 * unanswered out of zero asked is not a clean bill; it is an unread page.
 */
export function checkRailWasAsked(rail: GateRail): RailVerdict {
  if (rail.unasked === GATE_RAIL_ORDER.length) {
    return {
      ok: false,
      reason:
        "No gate on this rail was asked. Zero unanswered out of zero asked is "
        + "an unread page, not a clean bill — and it is the composition that "
        + "renders as a rail with nothing wrong on it.",
    };
  }
  return { ok: true };
}

/**
 * The gates a caller must still put, named rather than counted.
 *
 * A count tells a trader how much is owed. Only the names tell them what to go
 * and do, which is the difference between a scoreboard and a rail.
 */
export function unaskedGates(rail: GateRail): readonly GateName[] {
  return rail.rungs.filter((r) => r.standing === "UNASKED").map((r) => r.gate);
}

export default buildGateRail;
