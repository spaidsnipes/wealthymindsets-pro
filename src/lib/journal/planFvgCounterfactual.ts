/**
 * MARKET EDGE vs EXECUTION EDGE — Garden 19 §24, first honest slice. PURE.
 *
 * Two different questions, kept apart:
 *
 *   MARKET   How did the FVG territory itself behave in the state the trader
 *            acted on — compared with the SAME state on the gaps the trader
 *            did NOT act on (same instrument, timeframe and New York days, read
 *            from the one FVG engine's ledger)? The engine's own facts per
 *            interaction: its first response (REJECTED / ACCEPTED /
 *            TRADED_THROUGH / NONE) and its post-touch displacement in ATR.
 *   EXECUTION  What the trader's own trades on those interactions returned
 *            (realized R where the journal recorded it) and how often the
 *            frozen plan was followed.
 *
 * Only states with a like-for-like untaken counterpart are compared in this
 * slice: a decision DURING the first interaction vs untaken first
 * interactions, and DURING a later interaction vs untaken later interactions.
 * Decisions before any touch or between touches are counted and listed as not
 * compared. Interactions still running (OPEN) are left out of both sides.
 *
 * Every side carries its n; a comparison is MEASURED only when BOTH sides
 * hold ≥ 20. Descriptive only — no claim of edge, no forecast, no emotion.
 */

import type { FvgInteraction, FvgLedger } from "@/lib/marketData/fvg/fvgEngine";
import type { FvgDecisionInteraction } from "./fvgDecisionReference";
import { PATTERN_SAMPLE_MIN } from "./founderAnalytics";

export type CompareGroup = "FIRST_TOUCH" | "LATER_TOUCH";

export interface TakenFvgTrade {
  readonly objectId: string;
  readonly interaction: FvgDecisionInteraction;
  /** Interactions begun by decision time (the reference's snapshot). */
  readonly interactionsSoFar: number;
  readonly decisionAtMs: number;
  readonly realizedR?: number | null;
  /** From plan-vs-actual on decided trades; null when not decided. */
  readonly followedPlan?: boolean | null;
}

export interface ResponseTally {
  readonly n: number;
  readonly rejected: number;
  readonly accepted: number;
  readonly tradedThrough: number;
  readonly none: number;
  readonly rejectedShare: number | null;
  readonly meanDisplacementAtr: number | null;
}

export interface MarketComparison {
  readonly group: CompareGroup;
  readonly taken: ResponseTally;
  readonly untaken: ResponseTally;
  readonly state: "MEASURED" | "INSUFFICIENT EVIDENCE";
  readonly sentence: string;
}

export interface ExecutionSummary {
  readonly trades: number;
  readonly withR: number;
  readonly meanR: number | null;
  readonly positiveShare: number | null;
  readonly decided: number;
  readonly followed: number;
  readonly state: "MEASURED" | "INSUFFICIENT EVIDENCE";
  readonly sentence: string;
}

/**
 * §24 "Did the trader enter too early?" — answered as a fact: decisions taken BEFORE the gap was touched
 * beside decisions taken DURING a touch, each with its recorded R. No verdict; a comparison only at ≥ 20 each side.
 */
export interface TimingComparison {
  readonly beforeTouch: { readonly decisions: number; readonly withR: number; readonly meanR: number | null };
  readonly duringTouch: { readonly decisions: number; readonly withR: number; readonly meanR: number | null };
  readonly state: "MEASURED" | "INSUFFICIENT EVIDENCE";
  readonly sentence: string;
}

/**
 * §24 "Did they avoid valid situations?" — answered as a fact: on the days the trader traded gaps, the settled
 * touches he did NOT trade, and how the territory answered them. A share only at ≥ 20 untraded touches.
 */
export interface UntradedTouches {
  readonly n: number;
  readonly rejected: number;
  readonly accepted: number;
  readonly tradedThrough: number;
  readonly state: "MEASURED" | "INSUFFICIENT EVIDENCE";
  readonly sentence: string;
}

export interface FvgEdgeComparison {
  readonly market: readonly MarketComparison[];
  readonly execution: ExecutionSummary;
  readonly timing: TimingComparison;
  readonly untraded: UntradedTouches;
  /** Taken trades whose state has no untaken counterpart in this slice, or whose object the ledgers no longer hold. */
  readonly notCompared: { readonly state: string; readonly count: number }[];
  readonly days: readonly string[];
  readonly claim: "DESCRIPTIVE — not evidence of edge";
}

const nyDay = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
const round = (x: number, dp = 3) => Math.round(x * 10 ** dp) / 10 ** dp;

function tally(xs: readonly FvgInteraction[]): ResponseTally {
  const c = (r: string) => xs.filter(i => i.response === r).length;
  const disp = xs.filter(i => i.displacementComplete && Number.isFinite(i.displacementAtr)).map(i => i.displacementAtr);
  return {
    n: xs.length, rejected: c("REJECTED"), accepted: c("ACCEPTED"), tradedThrough: c("TRADED_THROUGH"), none: c("NONE"),
    rejectedShare: xs.length ? round(c("REJECTED") / xs.length) : null,
    meanDisplacementAtr: disp.length ? round(disp.reduce((s, x) => s + x, 0) / disp.length, 2) : null,
  };
}

const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);

export function compareFvgTakenVsUntaken(ledgers: readonly FvgLedger[], taken: readonly TakenFvgTrade[]): FvgEdgeComparison {
  const byId = new Map(ledgers.flatMap(l => l.objects.map(o => [o.objectId, o] as const)));
  const days = [...new Set(taken.map(t => nyDay(t.decisionAtMs)))].sort();
  const daySet = new Set(days);
  const takenKeys = new Set<string>();
  const takenBy: Record<CompareGroup, FvgInteraction[]> = { FIRST_TOUCH: [], LATER_TOUCH: [] };
  const notCompared = new Map<string, number>();
  for (const t of taken) {
    const o = byId.get(t.objectId);
    const group: CompareGroup | null = t.interaction === "DURING_FIRST_INTERACTION" ? "FIRST_TOUCH" : t.interaction === "DURING_LATER_INTERACTION" ? "LATER_TOUCH" : null;
    if (!group) { notCompared.set(t.interaction, (notCompared.get(t.interaction) ?? 0) + 1); continue; }
    const ep = o?.interactions.find(i => i.episode === (group === "FIRST_TOUCH" ? 1 : t.interactionsSoFar));
    if (!o || !ep) { notCompared.set("NOT IN THE LEDGERS READ", (notCompared.get("NOT IN THE LEDGERS READ") ?? 0) + 1); continue; }
    takenKeys.add(`${o.objectId}#${ep.episode}`);
    if (ep.response !== "OPEN") takenBy[group].push(ep);
  }
  const untakenBy: Record<CompareGroup, FvgInteraction[]> = { FIRST_TOUCH: [], LATER_TOUCH: [] };
  for (const o of byId.values()) {
    for (const i of o.interactions) {
      if (i.response === "OPEN" || takenKeys.has(`${o.objectId}#${i.episode}`) || !daySet.has(nyDay(i.startAt))) continue;
      untakenBy[i.episode === 1 ? "FIRST_TOUCH" : "LATER_TOUCH"].push(i);
    }
  }
  const market = (["FIRST_TOUCH", "LATER_TOUCH"] as const).map(group => {
    const a = tally(takenBy[group]), b = tally(untakenBy[group]);
    const state = a.n >= PATTERN_SAMPLE_MIN && b.n >= PATTERN_SAMPLE_MIN ? "MEASURED" as const : "INSUFFICIENT EVIDENCE" as const;
    const word = group === "FIRST_TOUCH" ? "first touches" : "later touches";
    return {
      group, taken: a, untaken: b, state,
      sentence: state === "MEASURED"
        ? `On ${word}, the territory rejected on ${pct(a.rejectedShare)} of the ${a.n} you traded and ${pct(b.rejectedShare)} of the ${b.n} you did not. Descriptive only.`
        : `INSUFFICIENT EVIDENCE on ${word}: ${a.n} traded and ${b.n} not traded (20 each side needed).`,
    };
  });
  const rs = taken.map(t => t.realizedR).filter((r): r is number => typeof r === "number" && Number.isFinite(r));
  const decided = taken.filter(t => t.followedPlan != null);
  const followed = decided.filter(t => t.followedPlan).length;
  const exState = rs.length >= PATTERN_SAMPLE_MIN ? "MEASURED" as const : "INSUFFICIENT EVIDENCE" as const;
  const meanR = rs.length ? round(rs.reduce((s, x) => s + x, 0) / rs.length, 2) : null;
  const execution: ExecutionSummary = {
    trades: taken.length, withR: rs.length, meanR,
    positiveShare: rs.length ? round(rs.filter(r => r > 0).length / rs.length) : null,
    decided: decided.length, followed,
    state: exState,
    sentence: exState === "MEASURED"
      ? `Your ${rs.length} FVG trades with a recorded R averaged ${meanR}R; ${pct(rs.filter(r => r > 0).length / rs.length)} closed above 0R. Plan followed on ${followed} of ${decided.length} decided trades. Descriptive only.`
      : `INSUFFICIENT EVIDENCE for execution: ${rs.length} of 20 FVG trades carry a recorded R; plan followed on ${followed} of ${decided.length} decided trades.`,
  };
  /* ── §24: entered before the touch, beside entered during a touch ────── */
  const rOf = (xs: readonly TakenFvgTrade[]) => xs.map(t => t.realizedR).filter((r): r is number => typeof r === "number" && Number.isFinite(r));
  const sideOf = (xs: readonly TakenFvgTrade[]) => { const r = rOf(xs); return { decisions: xs.length, withR: r.length, meanR: r.length ? round(r.reduce((a, x) => a + x, 0) / r.length, 2) : null }; };
  const before = sideOf(taken.filter(t => t.interaction === "BEFORE_ANY_TOUCH"));
  const during = sideOf(taken.filter(t => t.interaction === "DURING_FIRST_INTERACTION" || t.interaction === "DURING_LATER_INTERACTION"));
  const tState = before.withR >= PATTERN_SAMPLE_MIN && during.withR >= PATTERN_SAMPLE_MIN ? "MEASURED" as const : "INSUFFICIENT EVIDENCE" as const;
  const timing: TimingComparison = {
    beforeTouch: before, duringTouch: during, state: tState,
    sentence: tState === "MEASURED"
      ? `Entered before the gap was touched: mean ${before.meanR}R over ${before.withR}. Entered during a touch: mean ${during.meanR}R over ${during.withR}. Descriptive only.`
      : `You entered before the gap was touched on ${before.decisions} of ${taken.length} gap decisions, and during a touch on ${during.decisions}. INSUFFICIENT EVIDENCE to compare their results: ${before.withR} and ${during.withR} with a recorded R (20 each side needed).`,
  };
  /* ── §24: the settled touches the trader did not trade, on his own days ─ */
  const all = [...untakenBy.FIRST_TOUCH, ...untakenBy.LATER_TOUCH];
  const u = tally(all);
  const uState = u.n >= PATTERN_SAMPLE_MIN ? "MEASURED" as const : "INSUFFICIENT EVIDENCE" as const;
  const untraded: UntradedTouches = {
    n: u.n, rejected: u.rejected, accepted: u.accepted, tradedThrough: u.tradedThrough, state: uState,
    sentence: !taken.length || !ledgers.length
      ? "Touches you did not trade: not read (no gap decision, or no ledger loaded)."
      : uState === "MEASURED"
        ? `On the days you traded gaps, ${u.n} touches you did not trade have settled: the territory rejected on ${u.rejected} (${pct(u.rejectedShare)}), was accepted on ${u.accepted} and traded through on ${u.tradedThrough}. Descriptive only — a touch you left is not a trade you missed.`
        : `On the days you traded gaps, ${u.n} touches you did not trade have settled (rejected ${u.rejected}, accepted ${u.accepted}, traded through ${u.tradedThrough}). INSUFFICIENT EVIDENCE for a share — ${u.n} of 20.`,
  };
  return { market, execution, timing, untraded, notCompared: [...notCompared].map(([state, count]) => ({ state, count })), days, claim: "DESCRIPTIVE — not evidence of edge" };
}
