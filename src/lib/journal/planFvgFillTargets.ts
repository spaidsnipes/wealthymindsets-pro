/**
 * §41 REVIEW QUESTIONS, FACTUAL VERSIONS — Garden 19 (2026-10-08). PURE.
 *
 * The order asks two questions about the trader's gap decisions. WM answers only what the record
 * shows, never a belief the trader did not write:
 *
 *   1. "Fill targets": how often the trader's FROZEN plan put the target at the gap's FAR edge
 *      (entering outside the gap, on the near side, aiming across it), and how those decisions
 *      turned out beside the trader's other gap decisions. This is a fact about where a target was
 *      placed — WM does not call it a belief, a habit or a magnet.
 *   2. "Additional evidence": decisions whose FVG reference had at least one sense attached beyond
 *      price geometry (order flow, derivatives) at decision time, beside price-only decisions. WM
 *      records that a sense was ATTACHED, not whether it agreed with the trade — and says so.
 *
 * Counts are facts at any n. A COMPARISON of outcomes is MEASURED only when every side holds
 * ≥ 20 (STAT_SAMPLE_MIN) recorded results; below that it is INSUFFICIENT EVIDENCE with its n.
 * Descriptive only: one result per decision, never a cause.
 */

import type { JournalFvgReference } from "./fvgDecisionReference";
import { effectivePlanAt, type ManagementPlanSnapshot } from "./managementPlan";
import { INSUFFICIENT, isMeasured, STAT_SAMPLE_MIN } from "./statGuard";

export interface GapDecision {
  readonly id: string;
  readonly direction: "LONG" | "SHORT" | null;
  readonly gapBottom: number;
  readonly gapTop: number;
  readonly entryPx: number | null;
  /** The frozen plan's target (as frozen — not a later amendment). */
  readonly targetPx: number | null;
  readonly exitPx: number | null;
  readonly realizedR: number | null;
  /** The reference's senses at decision time (sense + the owner's state word). */
  readonly evidence: readonly { readonly sense: string; readonly state: string }[];
}

/** A journal decision (reference + frozen plan + result) → the facts these questions read. */
export function gapDecisionFrom(x: {
  readonly id: string;
  readonly fvgRef: JournalFvgReference;
  readonly plan: ManagementPlanSnapshot | null;
  readonly entryPx: number | null;
  readonly exitPx: number | null;
  readonly realizedR: number | null;
}): GapDecision {
  const base = x.plan ? effectivePlanAt(x.plan, x.plan.frozenAtMs) : null;
  return {
    id: x.id,
    direction: x.plan?.base.direction.value ?? null,
    gapBottom: x.fvgRef.snapshot.bottom, gapTop: x.fvgRef.snapshot.top,
    entryPx: x.entryPx, targetPx: base?.targetPx ?? null, exitPx: x.exitPx, realizedR: x.realizedR,
    evidence: x.fvgRef.snapshot.evidence,
  };
}

export type FillTargetGroup = "FILL TARGET" | "OTHER TARGET" | "NOT CLASSIFIED";

/**
 * FILL TARGET: entry outside the gap on its near side, trading toward it, with the frozen target at
 * the gap's far edge (within 10 % of the gap's size). OTHER TARGET: a recorded target anywhere else.
 * NOT CLASSIFIED: no direction, entry, target, or an entry inside / beyond the gap.
 */
export function fillTargetGroupOf(d: GapDecision): FillTargetGroup {
  const { direction: dir, entryPx: e, targetPx: t, gapBottom: lo, gapTop: hi } = d;
  if (!dir || e == null || t == null || !(hi > lo)) return "NOT CLASSIFIED";
  const tol = Math.max((hi - lo) * 0.1, Math.abs(e) * 0.0002);
  const towardAbove = dir === "LONG" && e < lo;    // below the gap, buying toward it
  const towardBelow = dir === "SHORT" && e > hi;   // above the gap, selling toward it
  if (towardAbove) return Math.abs(t - hi) <= tol ? "FILL TARGET" : "OTHER TARGET";
  if (towardBelow) return Math.abs(t - lo) <= tol ? "FILL TARGET" : "OTHER TARGET";
  return "OTHER TARGET";
}

/** At least one sense beyond price geometry was attached at decision time (not NOT_ATTACHED, not SILENCE). */
export function hasAdditionalEvidence(d: GapDecision): boolean {
  return d.evidence.some(e => e.sense !== "PRICE_GEOMETRY" && e.state !== "NOT_ATTACHED" && !/SILEN/i.test(e.state));
}

const round = (x: number) => Math.round(x * 100) / 100;
const fin = (x: number | null): x is number => typeof x === "number" && Number.isFinite(x);

export interface SideOutcome {
  readonly decisions: number;
  readonly withR: number;
  readonly meanR: number | null;
  /** Fill targets only: decisions whose exit reached the frozen target. */
  readonly targetReached?: number;
}

export interface GroupComparison {
  readonly a: SideOutcome;
  readonly b: SideOutcome;
  readonly state: "MEASURED" | "INSUFFICIENT EVIDENCE";
  readonly countLine: string;
  readonly line: string;
  readonly claim: "DESCRIPTIVE — one result per decision; not evidence that the choice caused it";
}

function side(ds: readonly GapDecision[], reached?: (d: GapDecision) => boolean): SideOutcome {
  const rs = ds.map(d => d.realizedR).filter(fin);
  const out = { decisions: ds.length, withR: rs.length, meanR: rs.length ? round(rs.reduce((s, x) => s + x, 0) / rs.length) : null };
  return reached ? { ...out, targetReached: ds.filter(reached).length } : out;
}

const CLAIM = "DESCRIPTIVE — one result per decision; not evidence that the choice caused it" as const;

/** Question 1, factually: where the frozen target sat relative to the gap, and the results beside each other. */
export function fillTargetComparison(ds: readonly GapDecision[]): GroupComparison & { readonly notClassified: number } {
  const fill = ds.filter(d => fillTargetGroupOf(d) === "FILL TARGET");
  const other = ds.filter(d => fillTargetGroupOf(d) === "OTHER TARGET");
  const reached = (d: GapDecision) => d.exitPx != null && d.targetPx != null && d.direction != null
    && (d.direction === "LONG" ? d.exitPx >= d.targetPx - Math.abs(d.targetPx) * 0.0002 : d.exitPx <= d.targetPx + Math.abs(d.targetPx) * 0.0002);
  const a = side(fill, reached), b = side(other);
  const state = isMeasured(a.withR) && isMeasured(b.withR) ? "MEASURED" as const : "INSUFFICIENT EVIDENCE" as const;
  const classified = fill.length + other.length;
  return {
    a, b, state, claim: CLAIM, notClassified: ds.length - classified,
    countLine: `${fill.length} of ${classified} gap decisions with a recorded target planned it at the gap's far edge (entering outside the gap and aiming across it).`
      + (ds.length - classified ? ` ${ds.length - classified} not classified (no direction, entry or target recorded, or the entry was inside the gap).` : ""),
    line: state === "MEASURED"
      ? `Far-edge targets: mean ${a.meanR}R over ${a.withR}, the exit reached the target on ${a.targetReached} of ${a.decisions}. Other gap targets: mean ${b.meanR}R over ${b.withR}. Descriptive only.`
      : `Far-edge targets beside other gap targets: ${INSUFFICIENT} — ${a.withR} and ${b.withR} decisions with a recorded result (${STAT_SAMPLE_MIN} each side needed)${fill.length ? `; so far the exit reached the far edge on ${a.targetReached} of ${a.decisions}` : ""}.`,
  };
}

/** Question 2, factually: decisions with an additional sense attached beside price-only decisions. */
export function additionalEvidenceComparison(ds: readonly GapDecision[]): GroupComparison {
  const withEv = ds.filter(hasAdditionalEvidence);
  const priceOnly = ds.filter(d => !hasAdditionalEvidence(d));
  const a = side(withEv), b = side(priceOnly);
  const state = isMeasured(a.withR) && isMeasured(b.withR) ? "MEASURED" as const : "INSUFFICIENT EVIDENCE" as const;
  return {
    a, b, state, claim: CLAIM,
    countLine: `${withEv.length} of ${ds.length} gap decisions had at least one sense beyond price attached at the decision (order flow or derivatives); ${priceOnly.length} were price only. WM records that a sense was attached, not whether it agreed with the trade.`,
    line: state === "MEASURED"
      ? `With an additional sense: mean ${a.meanR}R over ${a.withR}. Price only: mean ${b.meanR}R over ${b.withR}. Descriptive only.`
      : `With an additional sense beside price only: ${INSUFFICIENT} — ${a.withR} and ${b.withR} decisions with a recorded result (${STAT_SAMPLE_MIN} each side needed).`,
  };
}

/* ── a deterministic SAMPLE for the proof scene: both questions MEASURED ─────────────── */

export function fillTargetSample(): readonly GapDecision[] {
  const out: GapDecision[] = [];
  for (let i = 0; i < 48; i++) {
    const long = i % 4 < 2;
    const lo = 100 + (i % 7), hi = lo + 1;
    const entry = long ? lo - 1.5 : hi + 1.5;
    const fill = i % 2 === 0;                                   // 24 far-edge targets, 24 others
    const target = fill ? (long ? hi : lo) : (long ? lo - 0.6 : hi + 0.6);
    const reached = i % 3 !== 0;
    const exit = reached ? target : (long ? entry - 0.5 : entry + 0.5);
    const risk = 0.5;
    const r = round(((long ? 1 : -1) * (exit - entry)) / risk);
    const attached = i % 6 < 3;                                 // 24 with an attached sense, 24 price only
    out.push({
      id: `SAMPLE-GAP-${i + 1}`, direction: long ? "LONG" : "SHORT", gapBottom: lo, gapTop: hi, entryPx: entry, targetPx: +target.toFixed(2), exitPx: +exit.toFixed(2), realizedR: r,
      evidence: [{ sense: "PRICE_GEOMETRY", state: "FULL" }, { sense: "ORDER_FLOW", state: attached ? "PARTIAL" : "NOT_ATTACHED" }, { sense: "DERIVATIVES", state: "NOT_ATTACHED" }],
    });
  }
  return out;
}
