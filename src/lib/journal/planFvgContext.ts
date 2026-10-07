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

import type { FvgEvent, FvgLedger, FvgObject } from "@/lib/marketData/fvg/fvgEngine";
import type { JournalFvgReference } from "./fvgDecisionReference";
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
  /** Each touch episode: start of its first bar (knownAt − barMs) and the close time that ended it (null while running). */
  readonly touches: readonly { readonly episode: number; readonly atMs: number; readonly endMs: number | null }[];
  /** Close time of the bar whose close traded through the far edge, or null. */
  readonly tradedThroughAt: number | null;
}

/** The object's own events → the context Review reads. */
export function fvgContextFromEvents(
  birth: { readonly objectId: string; readonly timeframe: string; readonly direction: "BULLISH" | "BEARISH"; readonly bottom: number; readonly top: number },
  events: readonly FvgEvent[],
  barMs: number,
): FvgTradeContext {
  const ends = new Map<number, number>();
  for (const e of events) if (e.kind === "EPISODE_END") ends.set(e.episode, e.knownAt);
  const touches = events
    .filter((e): e is Extract<FvgEvent, { kind: "TOUCH_START" }> => e.kind === "TOUCH_START")
    .map(e => ({ episode: e.episode, atMs: e.knownAt - barMs, endMs: ends.get(e.episode) ?? null }))
    .sort((a, b) => a.atMs - b.atMs);
  const tt = events.find(e => e.kind === "TRADED_THROUGH");
  return { ...birth, barMs, touches, tradedThroughAt: tt ? tt.knownAt : null };
}

/** One canonical FVG object (from the one engine's ledger) → the context Review reads. */
export function fvgContextFromObject(o: FvgObject, barMs: number): FvgTradeContext {
  return {
    objectId: o.objectId, timeframe: o.timeframe, direction: o.direction, bottom: o.bottom, top: o.top, barMs,
    touches: o.interactions.map(i => ({ episode: i.episode, atMs: i.startAt - barMs, endMs: i.endAt })).sort((a, b) => a.atMs - b.atMs),
    tradedThroughAt: o.tradedThrough?.at ?? null,
  };
}

/** Bar length for an FVG timeframe id ("1m", "5m", "1h", "1H", "4h", "1D"), or null when it is not a clock timeframe. */
export function fvgTimeframeMs(tf: string): number | null {
  const m = /^(\d{1,3})(s|m|h|H|D|d)$/.exec(tf.trim());
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2] === "s" ? 1_000 : m[2] === "m" ? 60_000 : m[2] === "h" || m[2] === "H" ? 3_600_000 : 86_400_000;
  return n > 0 ? n * unit : null;
}

/**
 * The adapter from the journal's FVG reference: the object re-read from the
 * ONE engine's ledger over the same symbol / timeframe (no second engine).
 * Null when the ledger no longer holds that object — never a reconstruction.
 */
export function fvgContextFromLedger(ledger: FvgLedger, objectId: string): FvgTradeContext | null {
  const o = ledger.objects.find(x => x.objectId === objectId);
  const barMs = fvgTimeframeMs(ledger.timeframe);
  return o && barMs ? fvgContextFromObject(o, barMs) : null;
}

/**
 * Before the ledger is read, the stored reference alone answers the first two
 * questions AS OF THE DECISION (its snapshot was read through the one as-of
 * accessor); whether the territory was later traded through needs the ledger.
 */
export function fvgAnswersFromReference(ref: JournalFvgReference): FvgReviewAnswers {
  const s = ref.snapshot;
  const p = (x: number) => (ref.priceDp !== null ? x.toFixed(ref.priceDp) : fmtPx(x));
  const zone = `${p(s.bottom)}–${p(s.top)} (${s.direction.toLowerCase()} FVG, ${ref.timeframe})`;
  const n = s.interactionsSoFar;
  const touch: FvgReviewAnswers["touch"] =
    s.interaction === "BEFORE_ANY_TOUCH" ? { answer: "BEFORE_ANY_TOUCH", episode: null, sentence: `Your decision came before price first touched the territory ${zone}.` }
    : s.interaction === "DURING_FIRST_INTERACTION" ? { answer: "FIRST_TOUCH", episode: 1, sentence: `Your decision came during the first touch of the territory ${zone}.` }
    : s.interaction === "DURING_LATER_INTERACTION" ? { answer: "LATER_TOUCH", episode: n, sentence: `Your decision came during touch ${n} of the territory ${zone}, not the first.` }
    : { answer: "BETWEEN_TOUCHES", episode: n, sentence: `Your decision came after touch ${n} of the territory ${zone} had ended, before any next touch.` };
  return {
    objectId: ref.objectId,
    touch,
    actedBeforeCondition: s.interaction === "BEFORE_ANY_TOUCH"
      ? { answer: "YES", sentence: `You decided before price had reached the territory ${zone}.` }
      : { answer: "NO", sentence: `Price had reached the territory (${n} interaction${n === 1 ? "" : "s"} by then) before your decision.` },
    heldAfterTradedThrough: { answer: "UNKNOWN", sentence: "Whether the territory was traded through while you held needs the FVG's history after the decision — read it below." },
  };
}

export type TouchAnswer = "FIRST_TOUCH" | "LATER_TOUCH" | "BETWEEN_TOUCHES" | "BEFORE_ANY_TOUCH" | "UNKNOWN";
export type HeldAnswer = "HELD_AFTER_TRADED_THROUGH" | "EXITED_AS_TRADED_THROUGH" | "NOT_TRADED_THROUGH_WHILE_OPEN" | "UNKNOWN";

export interface FvgReviewAnswers {
  readonly objectId: string;
  readonly touch: { readonly answer: TouchAnswer; readonly episode: number | null; readonly sentence: string };
  readonly actedBeforeCondition: { readonly answer: "YES" | "NO" | "UNKNOWN"; readonly sentence: string };
  readonly heldAfterTradedThrough: { readonly answer: HeldAnswer; readonly sentence: string };
}

const clock = (ms: number) => new Date(ms).toISOString().slice(11, 16) + "Z";

export function fvgReviewAnswers(ctx: FvgTradeContext, a: TradeActuals | null): FvgReviewAnswers {
  const exits = (a?.exits ?? []).map(e => e.atMs);
  return fvgReviewAnswersAt(ctx, a?.entry?.atMs ?? null, exits.length && exits.every(t => t != null) ? Math.max(...(exits as number[])) : null);
}

/** The same answers from the two instants alone (entry, last exit); null = not reported. */
export function fvgReviewAnswersAt(ctx: FvgTradeContext, entryAt: number | null, exitAt: number | null): FvgReviewAnswers {
  const zone = `${fmtPx(ctx.bottom)}–${fmtPx(ctx.top)} (${ctx.direction.toLowerCase()} FVG, ${ctx.timeframe})`;

  let touch: FvgReviewAnswers["touch"];
  let acted: FvgReviewAnswers["actedBeforeCondition"];
  if (entryAt == null) {
    touch = { answer: "UNKNOWN", episode: null, sentence: "The entry fill time was not reported, so the touch cannot be named." };
    acted = { answer: "UNKNOWN", sentence: "The entry fill time was not reported." };
  } else {
    const during = [...ctx.touches].reverse().find(t => t.atMs <= entryAt) ?? null;
    if (!during) {
      touch = { answer: "BEFORE_ANY_TOUCH", episode: null, sentence: `Your entry at ${clock(entryAt)} came before price first touched the territory ${zone}.` };
      acted = { answer: "YES", sentence: `You entered before price had reached the territory ${zone}${ctx.touches[0] ? `; the first touch began in the bar from ${clock(ctx.touches[0].atMs)}` : "; no touch is on record"}.` };
    } else if (during.endMs != null && entryAt > during.endMs) {
      touch = { answer: "BETWEEN_TOUCHES", episode: during.episode, sentence: `Your entry at ${clock(entryAt)} came after touch ${during.episode} of the territory ${zone} had ended (${clock(during.endMs)}), before any next touch.` };
      acted = { answer: "NO", sentence: `Price had reached the territory (touch ${during.episode} began in the bar from ${clock(during.atMs)}) before your entry.` };
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
    case "BETWEEN_TOUCHES": return "FVG · between touches";
    case "BEFORE_ANY_TOUCH": return "FVG · entered before the touch";
    default: return "FVG · touch unknown";
  }
}

/** Personal Edge: plan adherence grouped by FVG context (MEASURED only at ≥20 decided trades). */
export function planAdherenceByFvgContext(rows: readonly { readonly fvg: FvgReviewAnswers | null; readonly result: PlanVsActualResult }[]): SetupAdherence[] {
  return planAdherenceByGroup(rows.map(r => ({ group: fvgContextGroup(r.fvg), result: r.result })));
}
