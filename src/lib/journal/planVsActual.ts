/**
 * PLAN vs ACTUAL — Garden 19 §26 / §28 (Founder order 2026-10-07). PURE.
 *
 * Given the frozen plan (managementPlan), what actually happened (fills, stop
 * and target moves, adds — from the journal capture, the broker readback or
 * the journal entry) and, when held, the price path after entry, this names
 * the FACTUAL deviations from the plan. It never diagnoses an emotion from
 * price: every finding carries `emotionalReason: "unknown"` unless the trader
 * recorded one in their own words, and Review asks rather than tells
 * ("You exited before the management condition recorded in your plan.").
 *
 * Four truths are kept apart on every fact:
 *   MARKET TRUTH     the broker's fills and the price path (what happened);
 *   CONTEXT TRUTH    session / context the trader recorded around the trade;
 *   TRADER TRUTH     the plan and the trader's own notes (what was intended);
 *   EDUCATION TRUTH  the rule WM applied to compare the two, stated in full.
 *
 * Where a fact is missing (no price path for the hold, no time on a fill, no
 * stop in the plan), the finding is INSUFFICIENT EVIDENCE and says which fact
 * is missing. Nothing is inferred from the result.
 */

import { traderClock } from "@/components/time/traderClock";
import type { ReviewDimension } from "./storyReview";
import { effectivePlanAt, fmtPx, type ManagementPlanSnapshot, type PlanDirection } from "./managementPlan";

export type DeviationId =
  | "EXITED_BEFORE_PLANNED_CONDITION"
  | "EXITED_DURING_NORMAL_RETRACEMENT"
  | "EXITED_AFTER_THESIS_INVALIDATION"
  | "HELD_THROUGH_INVALIDATION"
  | "MOVED_STOP_WITHOUT_PLAN_BASIS"
  | "MOVED_TARGET"
  | "ADDED_RISK_AFTER_THESIS_WEAKENED"
  | "PLAN_FOLLOWED"
  | "PLAN_CHANGED_WITH_DOCUMENTED_NEW_EVIDENCE"
  | "INSUFFICIENT_EVIDENCE";

export const DEVIATION_LABEL: Readonly<Record<DeviationId, string>> = {
  EXITED_BEFORE_PLANNED_CONDITION: "Exited before planned condition",
  EXITED_DURING_NORMAL_RETRACEMENT: "Exited during normal retracement",
  EXITED_AFTER_THESIS_INVALIDATION: "Exited after thesis invalidation",
  HELD_THROUGH_INVALIDATION: "Held through invalidation",
  MOVED_STOP_WITHOUT_PLAN_BASIS: "Moved stop without plan basis",
  MOVED_TARGET: "Moved target",
  ADDED_RISK_AFTER_THESIS_WEAKENED: "Added risk after thesis weakened",
  PLAN_FOLLOWED: "Plan followed",
  PLAN_CHANGED_WITH_DOCUMENTED_NEW_EVIDENCE: "Plan changed with documented new evidence",
  INSUFFICIENT_EVIDENCE: "Insufficient evidence",
};

/** Which Review row (storyReview's ten dimensions) each finding is read under. */
export const FINDING_DIMENSION: Readonly<Record<DeviationId, Extract<ReviewDimension, "MANAGEMENT" | "DISCIPLINE" | "ADHERENCE">>> = {
  EXITED_BEFORE_PLANNED_CONDITION: "MANAGEMENT",
  EXITED_DURING_NORMAL_RETRACEMENT: "MANAGEMENT",
  EXITED_AFTER_THESIS_INVALIDATION: "MANAGEMENT",
  MOVED_STOP_WITHOUT_PLAN_BASIS: "MANAGEMENT",
  MOVED_TARGET: "MANAGEMENT",
  HELD_THROUGH_INVALIDATION: "DISCIPLINE",
  ADDED_RISK_AFTER_THESIS_WEAKENED: "DISCIPLINE",
  PLAN_FOLLOWED: "ADHERENCE",
  PLAN_CHANGED_WITH_DOCUMENTED_NEW_EVIDENCE: "ADHERENCE",
  INSUFFICIENT_EVIDENCE: "ADHERENCE",
};

/** The findings grouped by the Review row they belong under. */
export function findingsByDimension(r: PlanVsActualResult | null | undefined): Readonly<Partial<Record<ReviewDimension, readonly PlanDeviation[]>>> {
  const out: Partial<Record<ReviewDimension, PlanDeviation[]>> = {};
  for (const f of r?.findings ?? []) (out[FINDING_DIMENSION[f.id]] ??= []).push(f);
  return out;
}

export type TruthLayer = "MARKET TRUTH" | "CONTEXT TRUTH" | "TRADER TRUTH" | "EDUCATION TRUTH";

export interface PlanFact {
  readonly layer: TruthLayer;
  readonly text: string;
}

export interface PlanDeviation {
  readonly id: DeviationId;
  readonly label: string;
  /** One factual sentence, second person, no verdict. */
  readonly sentence: string;
  readonly facts: readonly PlanFact[];
  /** The comparison rule, stated (EDUCATION TRUTH), or null. */
  readonly rule: string | null;
  /** "unknown" unless the trader recorded a reason in their own words. */
  readonly emotionalReason: string;
}

/** One fill / event the broker or the journal reported. `atMs` null = time not reported. */
export interface ActualEvent {
  readonly atMs: number | null;
  readonly px: number;
  readonly qty: number | null;
}

export interface LevelMove {
  readonly atMs: number | null;
  readonly fromPx: number | null;
  readonly toPx: number;
}

export interface TradeActuals {
  readonly direction: PlanDirection | null;
  readonly entry: ActualEvent | null;
  /** Every closing fill, in any order. */
  readonly exits: readonly ActualEvent[];
  readonly adds: readonly ActualEvent[];
  readonly stopMoves: readonly LevelMove[];
  readonly targetMoves: readonly LevelMove[];
  /** Where these facts came from, in words ("tastytrade fills", "journal entry"). */
  readonly source: string;
  /** Facts the source cannot establish, said as UNKNOWN in Review (never read as "none happened"). */
  readonly unknowns?: readonly string[];
}

export interface PathBar {
  /** Bar open, epoch ms. */
  readonly t: number;
  readonly h: number;
  readonly l: number;
  readonly c: number;
}

export interface PricePath {
  readonly bars: readonly PathBar[];
  readonly barMs: number;
  /** The feed, in words ("tastytrade 1m candles"). */
  readonly source: string;
}

export interface PlanVsActualInput {
  readonly plan: ManagementPlanSnapshot | null;
  readonly actuals: TradeActuals | null;
  readonly path?: PricePath | null;
  /** The trader's own answer to "why did the plan change?" — TRADER TRUTH. */
  readonly traderReason?: string | null;
}

export interface PlanVsActualResult {
  readonly decisionId: string | null;
  readonly findings: readonly PlanDeviation[];
  /** The finding Review leads with. */
  readonly primary: DeviationId;
  /** The exit was compared against the plan with enough facts to decide. */
  readonly exitDecidable: boolean;
  /** The plan was written after the trade (JOURNAL_ENTRY) — said beside every finding. */
  readonly hindsightRisk: boolean;
  readonly emotionalReason: string;
  readonly emotionalReasonSource: "TRADER RECORDED" | "NOT RECORDED";
}

/** A price this close to a level counts as at the level (fills land on ticks). */
const TOL_FRACTION = 0.0002;
/** A pullback is a "retracement" when it gave back at least this share of 1R (or of the run when no 1R). */
export const RETRACEMENT_MIN_R = 0.25;
/** An add is "after the thesis weakened" when it fills this many R against the entry, or after the invalidation printed. */
export const WEAKENED_ADVERSE_R = 0.5;

const PRIMARY_ORDER: readonly DeviationId[] = [
  "HELD_THROUGH_INVALIDATION",
  "ADDED_RISK_AFTER_THESIS_WEAKENED",
  "EXITED_DURING_NORMAL_RETRACEMENT",
  "EXITED_BEFORE_PLANNED_CONDITION",
  "MOVED_STOP_WITHOUT_PLAN_BASIS",
  "MOVED_TARGET",
  "PLAN_CHANGED_WITH_DOCUMENTED_NEW_EVIDENCE",
  "EXITED_AFTER_THESIS_INVALIDATION",
  "PLAN_FOLLOWED",
  "INSUFFICIENT_EVIDENCE",
];

/** Times the trader reads are the viewer's local time with its zone (traderClock), never bare UTC. */
const clock = (ms: number) => traderClock(ms, { seconds: false });

export function classifyPlanVsActual(input: PlanVsActualInput): PlanVsActualResult {
  const reason = typeof input.traderReason === "string" && input.traderReason.trim() ? input.traderReason.trim().slice(0, 400) : null;
  const emotionalReason = reason ?? "unknown";
  const findings: PlanDeviation[] = [];
  const plan = input.plan;
  const act = input.actuals;
  const push = (id: DeviationId, sentence: string, facts: PlanFact[], rule: string | null = null) =>
    findings.push({ id, label: DEVIATION_LABEL[id], sentence, facts, rule, emotionalReason });
  const done = (exitDecidable: boolean): PlanVsActualResult => {
    const primary = PRIMARY_ORDER.find(id => findings.some(f => f.id === id)) ?? "INSUFFICIENT_EVIDENCE";
    return {
      decisionId: plan?.base.decisionId ?? null,
      findings, primary, exitDecidable,
      hindsightRisk: plan?.hindsightRisk ?? false,
      emotionalReason,
      emotionalReasonSource: reason ? "TRADER RECORDED" : "NOT RECORDED",
    };
  };

  if (!plan) {
    push("INSUFFICIENT_EVIDENCE", "No plan was recorded for this decision, so there is nothing to compare the trade against.", [
      { layer: "TRADER TRUTH", text: "Plan snapshot: none recorded." },
    ]);
    return done(false);
  }
  const direction = plan.base.direction.value ?? act?.direction ?? null;
  const entry = act?.entry ?? null;
  const exits = [...(act?.exits ?? [])].filter(e => Number.isFinite(e.px) && e.px > 0);
  if (!act || !entry || exits.length === 0 || !direction) {
    const missing = !act ? "no trade facts" : !entry ? "no entry fill" : exits.length === 0 ? "no exit fill" : "no direction";
    push("INSUFFICIENT_EVIDENCE", `The trade facts are incomplete (${missing}), so the plan cannot be compared yet.`, [
      { layer: "MARKET TRUTH", text: `Trade facts: ${missing}${act ? ` (${act.source})` : ""}.` },
    ]);
    return done(false);
  }

  const sgn = direction === "LONG" ? 1 : -1;
  const timed = exits.every(e => e.atMs != null);
  const lastExit = timed ? exits.reduce((a, b) => ((b.atMs as number) >= (a.atMs as number) ? b : a)) : exits[exits.length - 1];
  const exitAt = lastExit.atMs;
  const exitPx = lastExit.px;
  const atExit = effectivePlanAt(plan, exitAt ?? Number.MAX_SAFE_INTEGER);
  const base = effectivePlanAt(plan, plan.frozenAtMs);
  const r = base.stopPx != null ? Math.abs(entry.px - base.stopPx) : null;
  const tol = Math.max(entry.px * TOL_FRACTION, 1e-9);
  const atOrBeyond = (px: number, level: number, side: 1 | -1) => side * (px - level) >= -tol;

  const planFacts: PlanFact[] = [
    { layer: "TRADER TRUTH", text: `Plan frozen at ${plan.frozenAt.replace("_", " ").toLowerCase()} ${clock(plan.frozenAtMs)}: stop ${base.stopPx != null ? fmtPx(base.stopPx) : "UNRECORDED"}, target ${base.targetPx != null ? fmtPx(base.targetPx) : "UNRECORDED"}, invalidation ${base.invalidationPx != null ? `${fmtPx(base.invalidationPx)} (${base.invalidationFrom.toLowerCase()})` : "UNRECORDED"}.` },
  ];
  if (plan.hindsightRisk) planFacts.push({ layer: "TRADER TRUTH", text: "This plan was written when the journal entry was saved, after the trade — it is not a pre-trade record." });
  if (plan.base.session.value) planFacts.push({ layer: "CONTEXT TRUTH", text: `Session you recorded: ${plan.base.session.value}.` });
  if (plan.base.context.value) planFacts.push({ layer: "CONTEXT TRUTH", text: `Context you recorded: ${plan.base.context.value}.` });
  const exitFact: PlanFact = { layer: "MARKET TRUTH", text: `Exit ${fmtPx(exitPx)}${exitAt != null ? ` at ${clock(exitAt)}` : " (time not reported)"}; entry ${fmtPx(entry.px)}${entry.atMs != null ? ` at ${clock(entry.atMs)}` : ""} (${act.source}).` };

  /* ── amendments with documented new evidence ─────────────────────────── */
  const evidenced = plan.amendments.filter(a => a.newEvidence && (exitAt == null || a.atMs <= exitAt));
  if (evidenced.length) {
    push("PLAN_CHANGED_WITH_DOCUMENTED_NEW_EVIDENCE",
      `You amended the plan ${evidenced.length === 1 ? "once" : `${evidenced.length} times`} and recorded the new evidence; the trade is compared against the amended plan.`,
      evidenced.map(a => ({ layer: "TRADER TRUTH" as const, text: `${clock(a.atMs)} — ${[a.stopPx != null ? `stop → ${fmtPx(a.stopPx)}` : "", a.targetPx != null ? `target → ${fmtPx(a.targetPx)}` : "", a.invalidationPx != null ? `invalidation → ${fmtPx(a.invalidationPx)}` : ""].filter(Boolean).join(", ") || "plan note"}. New evidence: ${a.newEvidence}` })));
  }
  const coveredByAmendment = (kind: "stopPx" | "targetPx", toPx: number, atMs: number | null) =>
    plan.amendments.some(a => a.newEvidence && a[kind] != null && Math.abs((a[kind] as number) - toPx) <= tol && (atMs == null || a.atMs <= atMs + 60_000));

  /* ── the price path over the hold ───────────────────────────────────── */
  const path = input.path && input.path.bars.length && input.path.barMs > 0 ? input.path : null;
  const holdBars = path && entry.atMs != null && exitAt != null
    ? path.bars.filter(b => b.t + path.barMs > (entry.atMs as number) && b.t <= exitAt).sort((a, b) => a.t - b.t)
    : [];
  const covered = !!path && holdBars.length > 0 && entry.atMs != null && exitAt != null
    && holdBars[0].t <= entry.atMs && holdBars[holdBars.length - 1].t + path.barMs >= exitAt;
  const favour = (b: PathBar) => (sgn === 1 ? b.h : b.l);
  const adverse = (b: PathBar) => (sgn === 1 ? b.l : b.h);
  const firstTouch = (levelAt: (t: number) => number | null, pick: (b: PathBar) => number, side: 1 | -1) =>
    holdBars.find(b => { const lv = levelAt(b.t); return lv != null && side * (pick(b) - lv) >= -tol; }) ?? null;
  const invTouch = covered ? firstTouch(t => effectivePlanAt(plan, t).invalidationPx, adverse, (-sgn) as 1 | -1) : null;
  const tgtTouch = covered ? firstTouch(t => effectivePlanAt(plan, t).targetPx, favour, sgn as 1 | -1) : null;
  const pathFact: PlanFact | null = path
    ? { layer: "MARKET TRUTH", text: covered ? `Price path: ${holdBars.length} bars of ${path.source} cover the hold.` : `Price path: ${path.source} does not cover the whole hold.` }
    : null;

  /* ── the exit ────────────────────────────────────────────────────────── */
  let exitDecidable = false;
  const inv = atExit.invalidationPx;
  const invWord = atExit.invalidationFrom === "PLANNED STOP" ? "the planned stop (your plan recorded no separate invalidation)" : "the invalidation recorded in your plan";
  const qty = (e: ActualEvent) => (e.qty != null ? ` ${e.qty}` : "");
  const tgt = atExit.targetPx;
  const holdMin = atExit.expectedHoldMin;
  const timeStop = atExit.conditions.find(c => c.kind === "TIME_STOP")?.minutes ?? null;
  const minutesHeld = entry.atMs != null && exitAt != null ? (exitAt - entry.atMs) / 60_000 : null;
  const facts = (...extra: (PlanFact | null)[]) => [...planFacts, exitFact, ...extra.filter((f): f is PlanFact => f !== null)];

  if (inv == null && tgt == null) {
    push("INSUFFICIENT_EVIDENCE", "The plan recorded no stop, invalidation or target, so the exit has no planned condition to compare against.", facts());
  } else if (tgt != null && atOrBeyond(exitPx, tgt, sgn as 1 | -1)) {
    exitDecidable = true;
    push("PLAN_FOLLOWED", `You exited at ${fmtPx(exitPx)}, at or beyond the planned target ${fmtPx(tgt)}.`, facts(pathFact));
  } else if (inv != null && atOrBeyond(exitPx, inv, (-sgn) as 1 | -1) && !covered) {
    exitDecidable = true;
    push("EXITED_AFTER_THESIS_INVALIDATION", `You exited at ${fmtPx(exitPx)}, at or through ${invWord} (${fmtPx(inv)}).`, facts(pathFact));
  } else if (covered && invTouch) {
    exitDecidable = true;
    const graceEnd = invTouch.t + 2 * (path as PricePath).barMs;
    const invAtTouch = effectivePlanAt(plan, invTouch.t).invalidationPx as number;
    const touchFact: PlanFact = { layer: "MARKET TRUTH", text: `The invalidation ${fmtPx(invAtTouch)} printed in the bar opening ${clock(invTouch.t)} (${sgn === 1 ? "low" : "high"} ${fmtPx(adverse(invTouch))}).` };
    if ((exitAt as number) <= graceEnd) {
      push("EXITED_AFTER_THESIS_INVALIDATION", `You exited at ${fmtPx(exitPx)} after ${invWord} (${fmtPx(invAtTouch)}) printed.`, facts(touchFact, pathFact),
        "Exit counted as on the invalidation when it comes within the bar the invalidation printed in or the next one.");
    } else {
      const barsLater = Math.round(((exitAt as number) - invTouch.t) / (path as PricePath).barMs);
      push("HELD_THROUGH_INVALIDATION", `${invWord[0].toUpperCase()}${invWord.slice(1)} (${fmtPx(invAtTouch)}) printed at ${clock(invTouch.t)}; the position stayed open ${barsLater} bars longer and closed at ${fmtPx(exitPx)}.`, facts(touchFact, pathFact),
        "Held through invalidation: the position was still open more than one full bar after the bar in which the plan's invalidation price printed.");
    }
  } else if (covered && tgtTouch) {
    exitDecidable = true;
    const trail = atExit.conditions.some(c => c.kind === "TRAIL_STOP");
    const tFact: PlanFact = { layer: "MARKET TRUTH", text: `The planned target ${fmtPx(tgt as number)} printed in the bar opening ${clock(tgtTouch.t)}.` };
    if (trail) push("PLAN_FOLLOWED", `The target printed at ${clock(tgtTouch.t)} and your plan recorded a trailing condition; you exited at ${fmtPx(exitPx)}.`, facts(tFact, pathFact));
    else push("INSUFFICIENT_EVIDENCE", `The planned target printed at ${clock(tgtTouch.t)}; you exited later at ${fmtPx(exitPx)}. Your plan recorded no condition for holding past the target, so WM does not classify the hold.`, facts(tFact, pathFact));
  } else if ((timeStop != null || holdMin != null) && minutesHeld != null && minutesHeld >= (timeStop ?? (holdMin as number)) - 0.5) {
    exitDecidable = true;
    push("PLAN_FOLLOWED", `You exited after ${Math.round(minutesHeld)} min, at the time condition recorded in your plan (${timeStop ?? holdMin} min).`, facts(pathFact));
  } else if (covered) {
    exitDecidable = true;
    const conds = [tgt != null ? `the target ${fmtPx(tgt)}` : null, inv != null ? `the invalidation ${fmtPx(inv)}` : null].filter(Boolean).join(" or ");
    push("EXITED_BEFORE_PLANNED_CONDITION", `You exited at ${fmtPx(exitPx)} before ${conds} recorded in your plan had printed.`, facts(pathFact),
      "Exited before planned condition: during the hold no bar reached the plan's target or invalidation, and no recorded time condition had elapsed.");
    // The retracement view of the same exit.
    const best = holdBars.reduce((m, b) => (sgn * (favour(b) - m) > 0 ? favour(b) : m), entry.px);
    const run = sgn * (best - entry.px);
    const gaveBack = sgn * (best - exitPx);
    const unit = r ?? run;
    if (run > 0 && unit > 0 && gaveBack >= RETRACEMENT_MIN_R * unit) {
      push("EXITED_DURING_NORMAL_RETRACEMENT",
        `After entry the price reached ${fmtPx(best)}, then pulled back to ${fmtPx(exitPx)} where you exited, without reaching ${invWord}${inv != null ? ` (${fmtPx(inv)})` : ""}.`,
        facts({ layer: "MARKET TRUTH", text: `Best price during the hold ${fmtPx(best)}; given back ${fmtPx(gaveBack)}${r ? ` (${(gaveBack / r).toFixed(2)}R)` : ""} by the exit.` }, pathFact),
        `Normal retracement here means: price moved in the plan's direction, then gave back at least ${RETRACEMENT_MIN_R}${r ? "R" : " of that run"} without touching the plan's invalidation — a pullback the plan's own levels treated as inside the thesis.`);
    }
  } else {
    push("INSUFFICIENT_EVIDENCE",
      `You exited at ${fmtPx(exitPx)}, between ${inv != null ? `the invalidation ${fmtPx(inv)}` : "an unrecorded invalidation"} and ${tgt != null ? `the target ${fmtPx(tgt)}` : "an unrecorded target"}. Without the price path for the hold${exitAt == null || entry.atMs == null ? " and the fill times" : ""}, WM cannot say whether either condition printed first.`,
      facts(pathFact));
  }

  /* ── stop moves ──────────────────────────────────────────────────────── */
  for (const m of act.stopMoves) {
    if (!Number.isFinite(m.toPx) || m.toPx <= 0) continue;
    const at = m.atMs;
    const eff = effectivePlanAt(plan, at ?? Number.MAX_SAFE_INTEGER);
    const from = m.fromPx ?? base.stopPx;
    const tightened = from != null ? sgn * (m.toPx - from) > 0 : null;
    const moveFact: PlanFact = { layer: "MARKET TRUTH", text: `Stop moved ${from != null ? `from ${fmtPx(from)} ` : ""}to ${fmtPx(m.toPx)}${at != null ? ` at ${clock(at)}` : " (time not reported)"}${tightened == null ? "" : tightened ? " — toward the market" : " — away from the market (more risk)"}.` };
    if (coveredByAmendment("stopPx", m.toPx, at)) continue;
    if (tightened && eff.conditions.some(c => c.kind === "TRAIL_STOP")) continue;
    const be = eff.conditions.find(c => c.kind === "BREAKEVEN_AFTER_R");
    const toBreakeven = Math.abs(m.toPx - entry.px) <= Math.max(tol, (r ?? 0) * 0.1);
    if (be && toBreakeven && r) {
      if (!covered || at == null) {
        push("INSUFFICIENT_EVIDENCE", `You moved the stop to about breakeven; your plan allowed that after +${be.triggerR}R. Without the price path before ${at != null ? clock(at) : "the move"}, WM cannot say whether +${be.triggerR}R had printed.`, [...planFacts, moveFact]);
        continue;
      }
      const before = holdBars.filter(b => b.t + (path as PricePath).barMs <= at);
      const bestR = before.reduce((mx, b) => Math.max(mx, sgn * (favour(b) - entry.px) / r), 0);
      if (bestR >= (be.triggerR ?? Infinity) - 1e-9) continue;
      push("MOVED_STOP_WITHOUT_PLAN_BASIS", `You moved the stop to breakeven at ${clock(at)}; your plan's condition was +${be.triggerR}R, and the best move before then was +${bestR.toFixed(2)}R.`,
        [...planFacts, moveFact, { layer: "TRADER TRUTH", text: `Management condition you recorded: “${be.text}”.` }],
        `A stop move has a plan basis when a recorded management condition allows it (breakeven after +${be.triggerR}R, a trailing condition) or an amendment records new evidence for it.`);
      continue;
    }
    push("MOVED_STOP_WITHOUT_PLAN_BASIS", `You moved the stop${at != null ? ` at ${clock(at)}` : ""} to ${fmtPx(m.toPx)}; no management condition or amendment in your plan records a basis for that move.`,
      [...planFacts, moveFact],
      "A stop move has a plan basis when a recorded management condition allows it (breakeven after a stated R, a trailing condition) or an amendment records new evidence for it.");
  }

  /* ── target moves ────────────────────────────────────────────────────── */
  for (const m of act.targetMoves) {
    if (!Number.isFinite(m.toPx) || m.toPx <= 0) continue;
    if (coveredByAmendment("targetPx", m.toPx, m.atMs)) continue;
    const from = m.fromPx ?? base.targetPx;
    push("MOVED_TARGET", `You moved the target${m.atMs != null ? ` at ${clock(m.atMs)}` : ""}${from != null ? ` from ${fmtPx(from)}` : ""} to ${fmtPx(m.toPx)}; no amendment in your plan records new evidence for it.`,
      [...planFacts, { layer: "MARKET TRUTH", text: `Target order moved to ${fmtPx(m.toPx)}.` }],
      "A target move is compared with the plan; it is documented when an amendment carries the new evidence.");
  }

  /* ── adds ────────────────────────────────────────────────────────────── */
  for (const a of act.adds) {
    if (!Number.isFinite(a.px) || a.px <= 0) continue;
    const adverseR = r ? (sgn * (entry.px - a.px)) / r : null;
    const invBefore = invTouch && a.atMs != null ? invTouch.t <= a.atMs : false;
    const weakened = invBefore || (adverseR != null && adverseR >= WEAKENED_ADVERSE_R);
    if (!weakened) continue;
    if (plan.amendments.some(x => x.newEvidence && a.atMs != null && x.atMs <= a.atMs)) continue;
    push("ADDED_RISK_AFTER_THESIS_WEAKENED",
      invBefore
        ? `You added${qty(a)} at ${fmtPx(a.px)} after ${invWord} had printed.`
        : `You added${qty(a)} at ${fmtPx(a.px)}, ${(adverseR as number).toFixed(2)}R against your entry and toward ${invWord}.`,
      [...planFacts, { layer: "MARKET TRUTH", text: `Add filled ${fmtPx(a.px)}${a.atMs != null ? ` at ${clock(a.atMs)}` : ""}.` }],
      `Thesis weakened means: the plan's invalidation had printed, or price stood at least ${WEAKENED_ADVERSE_R}R against the entry, when the add filled — and no amendment recorded new evidence.`);
  }

  return done(exitDecidable);
}

/* ── adapters ───────────────────────────────────────────────────────────── */

/**
 * A saved journal entry → actuals. The journal holds entry and exit PRICES but
 * not their times, so path-based findings will say INSUFFICIENT EVIDENCE —
 * honestly — until fill times come from the broker readback.
 */
export function actualsFromJournalEntry(e: {
  readonly side?: "long" | "short";
  readonly entry?: number;
  readonly exit?: number;
  readonly size?: number;
  readonly capture?: { readonly fillPx: { readonly value: number | null }; readonly filledAt: { readonly value: string | null }; readonly action: { readonly value: string | null } } | null;
}): TradeActuals {
  const pos = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x > 0;
  const capAt = e.capture?.filledAt.value ? Date.parse(e.capture.filledAt.value) : NaN;
  const closing = /to close/i.test(e.capture?.action.value ?? "");
  const capPx = e.capture?.fillPx.value ?? null;
  return {
    direction: e.side === "long" ? "LONG" : e.side === "short" ? "SHORT" : null,
    entry: pos(e.entry) ? { atMs: !closing && Number.isFinite(capAt) && capPx === e.entry ? capAt : null, px: e.entry, qty: pos(e.size) ? e.size : null } : null,
    exits: pos(e.exit) ? [{ atMs: closing && Number.isFinite(capAt) && capPx === e.exit ? capAt : null, px: e.exit, qty: pos(e.size) ? e.size : null }] : [],
    adds: [],
    stopMoves: [],
    targetMoves: [],
    source: e.capture ? "journal entry with broker capture" : "journal entry",
  };
}
