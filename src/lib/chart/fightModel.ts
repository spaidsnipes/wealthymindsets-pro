/**
 * THE TWO MODELS — KNOCKOUT / BODY SHOTS / WAIT (Founder 2026-11-05 09:40:
 * "Body shots… aiming for the middle. Knockout… model ones").
 *
 * One chip, read from two things the chart already measured and drew:
 *   · the tape regime (the drift box: TREND when the net drift covers half the
 *     observed range, BALANCE when the tape retraced, THIN when too few prints);
 *   · where price sits inside that observed range.
 *
 *   KNOCKOUT    TREND tape, price at the edge the drift points to (outer quarter):
 *               the fight is being won in one direction — swing for the break.
 *   BODY SHOTS  BALANCE tape, price in an outer quarter: aim back at the middle.
 *   WAIT        anything else — a thin tape, price in the middle, or a trend
 *               tape with price back at the far edge from its drift.
 *
 * Arithmetic only, on the tape the drift box was drawn from. It names a model,
 * not a trade: no entry, no stop, no size.
 */

export type FightModel = "KNOCKOUT" | "BODY_SHOTS" | "WAIT";

export interface FightModelInput {
  readonly verdict: "TREND" | "BALANCE" | "THIN";
  readonly min: number;
  readonly max: number;
  readonly first: number;
  readonly last: number;
  /** The live price; the tape's last print when absent. */
  readonly price?: number | null;
}

export interface FightModelReading {
  readonly model: FightModel;
  /** 0 = range low, 1 = range high; null when the range is empty. */
  readonly position: number | null;
  /** BODY SHOTS: the middle of the observed range (the body). Null otherwise. */
  readonly middle: number | null;
  readonly why: string;
}

/** The outer quarter of the range counts as "at the edge". */
export const FIGHT_EDGE = 0.25;

export function selectFightModel(x: FightModelInput): FightModelReading {
  const price = x.price != null && Number.isFinite(x.price) ? x.price : x.last;
  const span = x.max - x.min;
  if (!(span > 0) || !Number.isFinite(price)) return { model: "WAIT", position: null, middle: null, why: "WAIT — the tape has no range yet" };
  const p = Math.max(0, Math.min(1, (price - x.min) / span));
  const pct = Math.round(p * 100);
  if (x.verdict === "THIN") return { model: "WAIT", position: p, middle: null, why: "WAIT — too few trades to call the tape" };
  if (x.verdict === "TREND") {
    const up = x.last >= x.first;
    const atLeadingEdge = up ? p >= 1 - FIGHT_EDGE : p <= FIGHT_EDGE;
    return atLeadingEdge
      ? { model: "KNOCKOUT", position: p, middle: null, why: `KNOCKOUT — trend tape, price at the ${up ? "top" : "bottom"} of its range (${pct}%)` }
      : { model: "WAIT", position: p, middle: null, why: `WAIT — trend tape, but price is off its ${up ? "high" : "low"} edge (${pct}%)` };
  }
  const middle = x.min + span / 2;
  return Math.abs(p - 0.5) >= 0.5 - FIGHT_EDGE
    ? { model: "BODY_SHOTS", position: p, middle, why: `BODY SHOTS — balance tape, price at the ${p > 0.5 ? "top" : "bottom"} of its range (${pct}%); the middle is the target` }
    : { model: "WAIT", position: p, middle, why: `WAIT — balance tape, price already near the middle (${pct}%)` };
}

export const FIGHT_MODEL_WORD: Readonly<Record<FightModel, string>> = { KNOCKOUT: "KNOCKOUT", BODY_SHOTS: "BODY SHOTS", WAIT: "WAIT" };
