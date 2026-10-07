/**
 * THE FVG QUESTIONS IN REVIEW — Garden 19 §23 / §41. PURE.
 *
 * When a trade is tied to one FVG object (the journal's FVG reference, owned
 * by fvgDecisionReference — read, never written here), Review answers three
 * factual questions from that object's own event history and the trade's
 * fill times:
 *
 *   1. FIRST TOUCH OR LATER TOUCH? Which touch episode of the territory the
 *      entry fill fell in (or that it fell in none).
 *   2. ACTED BEFORE THE CONDITION? Whether the entry filled before price had
 *      reached the territory at all.
 *   3. HELD AFTER THE TERRITORY WAS TRADED THROUGH? Whether the position was
 *      still open more than one bar after the object's TRADED_THROUGH event.
 *
 * Event times are the close time of the bar that revealed each fact
 * (`knownAt`); a touch therefore began within the bar ending at `knownAt`.
 * Missing fill times answer UNKNOWN — never a guess. No edge is claimed, and
 * no emotion is named.
 */

import type { FvgEvent } from "@/lib/marketData/fvg/fvgEngine";
import { fmtPx } from "./managementPlan";
import type { PlanVsActualResult, TradeActuals } from "./planVsActual";
import { planAdherenceByGroup, type SetupAdherence } from "./planAdherence";

export interface FvgTradeContext {
  readonly objectId: string;
  readonly timeframe: string;
  readonly direction: "BULLISH" | "BEARISH";
  readonly bottom: number;
  readonly top: number;
  /** Bar length of the object's timeframe, ms. */
  readonly barMs: number;
  /** Start of each touch episode's first bar (knownAt − barMs), in order. */
  readonly touchStarts: readonly { readonly episode: number; readonly atMs: number }[];
  /** Close time of the bar whose close traded through the far edge, or null. */
  readonly tradedThroughAt: number | null;
}

/** The object's own events → the context Review reads. */
export function fvgContextFromEvents(
  birth: { readonly objectId: string; readonly timeframe: string; readonly direction: "BULLISH" | "BEARISH"; readonly bottom: number; readonly top: number },
  events: readonly FvgEvent[],
  barMs: number,
): FvgTradeContext {
  const touchStarts = events
    .filter((e): e is Extract<FvgEvent, { kind: "TOUCH_START" }> => e.kind === "TOUCH_START")
    .map(e => ({ episode: e.episode, atMs: e.knownAt - barMs }))
    .sort((a, b) => a.atMs - b.atMs);
  const tt = events.find(e => e.kind === "TRADED_THROUGH");
  return { ...birth, barMs, touchStarts, tradedThroughAt: tt ? tt.knownAt : null };
}

export type TouchAnswer = "FIRST_TOUCH" | "LATER_TOUCH" | "BEFORE_ANY_TOUCH" | "UNKNOWN";
export type HeldAnswer = "HELD_AFTER_TRADED_THROUGH" | "EXITED_AS_TRADED_THROUGH" | "NOT_TRADED_THROUGH_WHILE_OPEN" | "UNKNOWN";

export interface FvgReviewAnswers {
  readonly objectId: string;
  readonly touch: { readonly answer: TouchAnswer; readonly episode: number | null; readonly sentence: string };
  readonly actedBeforeCondition: { readonly answer: "YES" | "NO" | "UNKNOWN"; readonly sentence: string };
  readonly heldAfterTradedThrough: { readonly answer: HeldAnswer; readonly sentence: string };
}

const clock = (ms: number) => new Date(ms).toISOString().slice(11, 16) + "Z";

export function fvgReviewAnswers(ctx: FvgTradeContext, a: TradeActuals | null): FvgReviewAnswers {
  const zone = `${fmtPx(ctx.bottom)}–${fmtPx(ctx.top)} (${ctx.direction.toLowerCase()} FVG, ${ctx.timeframe})`;
  const entryAt = a?.entry?.atMs ?? null;
  const exits = (a?.exits ?? []).map(e => e.atMs);
  const exitAt = exits.length && exits.every(t => t != null) ? Math.max(...(exits as number[])) : null;

  let touch: FvgReviewAnswers["touch"];
  let acted: FvgReviewAnswers["actedBeforeCondition"];
  if (entryAt == null) {
    touch = { answer: "UNKNOWN", episode: null, sentence: "The entry fill time was not reported, so the touch cannot be named." };
    acted = { answer: "UNKNOWN", sentence: "The entry fill time was not reported." };
  } else {
    const during = [...ctx.touchStarts].reverse().find(t => t.atMs <= entryAt) ?? null;
    if (!during) {
      touch = { answer: "BEFORE_ANY_TOUCH", episode: null, sentence: `Your entry at ${clock(entryAt)} came before price first touched the territory ${zone}.` };
      acted = { answer: "YES", sentence: `You entered before price had reached the territory ${zone}${ctx.touchStarts[0] ? `; the first touch began in the bar from ${clock(ctx.touchStarts[0].atMs)}` : "; no touch is on record"}.` };
    } else {
      touch = during.episode === 1
        ? { answer: "FIRST_TOUCH", episode: 1, sentence: `Your entry at ${clock(entryAt)} came on the first touch of the territory ${zone}.` }
        : { answer: "LATER_TOUCH", episode: during.episode, sentence: `Your entry at ${clock(entryAt)} came on touch ${during.episode} of the territory ${zone}, not the first.` };
      acted = { answer: "NO", sentence: `Price had reached the territory (touch ${during.episode} began in the bar from ${clock(during.atMs)}) before your entry.` };
    }
  }

  let held: FvgReviewAnswers["heldAfterTradedThrough"];
  if (ctx.tradedThroughAt == null) {
    held = { answer: "NOT_TRADED_THROUGH_WHILE_OPEN", sentence: "The territory was not traded through in the object's recorded history." };
  } else if (exitAt == null || entryAt == null) {
    held = { answer: "UNKNOWN", sentence: `The territory was traded through (bar closing ${clock(ctx.tradedThroughAt)}); a fill time was not reported, so WM cannot say whether you were still in.` };
  } else if (exitAt <= ctx.tradedThroughAt - ctx.barMs || entryAt > ctx.tradedThroughAt) {
    held = { answer: "NOT_TRADED_THROUGH_WHILE_OPEN", sentence: `The territory was traded through at ${clock(ctx.tradedThroughAt)}, outside the time you held the position.` };
  } else if (exitAt <= ctx.tradedThroughAt + ctx.barMs) {
    held = { answer: "EXITED_AS_TRADED_THROUGH", sentence: `You exited at ${clock(exitAt)}, within a bar of the territory being traded through (${clock(ctx.tradedThroughAt)}).` };
  } else {
    held = { answer: "HELD_AFTER_TRADED_THROUGH", sentence: `The territory was traded through at ${clock(ctx.tradedThroughAt)}; the position stayed open until ${clock(exitAt)}.` };
  }
  return { objectId: ctx.objectId, touch, actedBeforeCondition: acted, heldAfterTradedThrough: held };
}

/** The FVG context group a trade belongs to in Personal Edge. */
export function fvgContextGroup(ans: FvgReviewAnswers | null): string {
  if (!ans) return "no FVG reference";
  switch (ans.touch.answer) {
    case "FIRST_TOUCH": return "FVG · first touch";
    case "LATER_TOUCH": return "FVG · later touch";
    case "BEFORE_ANY_TOUCH": return "FVG · entered before the touch";
    default: return "FVG · touch unknown";
  }
}

/** Personal Edge: plan adherence grouped by FVG context (MEASURED only at ≥20 decided trades). */
export function planAdherenceByFvgContext(rows: readonly { readonly fvg: FvgReviewAnswers | null; readonly result: PlanVsActualResult }[]): SetupAdherence[] {
  return planAdherenceByGroup(rows.map(r => ({ group: fvgContextGroup(r.fvg), result: r.result })));
}
