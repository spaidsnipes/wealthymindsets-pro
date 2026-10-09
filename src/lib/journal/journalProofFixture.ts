/**
 * /journal PROOF SCENE FIXTURE — `?scene=journal-fixture` (Garden 19, coordinator
 * order 2026-10-07 night). SAMPLE DATA, NOT A TRADER'S JOURNAL.
 *
 * A deterministic, clearly synthetic book so the Review's FVG answers, the
 * first counterfactual slice (traded vs untraded touches), Personal Edge's FVG
 * study list and the Academy's "my examples" can be READ on serving without a
 * single record on anyone's account:
 *
 *   · instrument "SAMPLE-FVG" (not a tradable symbol), 5m, 2,400 bars from a
 *     seeded random walk starting 2026-01-05 14:30 UTC;
 *   · the ONE engine (detectFvgs) finds the gaps; decisions are taken at the
 *     first bar of chosen interactions; each reference is read through the one
 *     as-of accessor (fvgReferenceAtDecision);
 *   · ids are prefixed "SAMPLE-"; each decision carries a synthetic plan frozen at a
 *     sample ticket's send (stop beyond the gap's far edge, standing in as the invalidation,
 *     target 2R, breakeven after +1R, 30-minute time stop), every fourth amended
 *     with new evidence, every fifth with a stop moved to breakeven; exits and R
 *     are read off the same sample bars. 20 decisions are setup "SAMPLE gap
 *     reclaim" (n = 20 → MEASURED), 4 are "SAMPLE gap fade" (INSUFFICIENT).
 *
 * PURE. DETERMINISTIC. Builds nothing on disk, writes nothing, fetches nothing.
 */

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { detectFvgs, type FvgLedger } from "@/lib/marketData/fvg/fvgEngine";
import { fvgReferenceAtDecision, type JournalFvgReference } from "@/lib/journal/fvgDecisionReference";
import { fvgContextFromLedger, fvgReviewAnswersAt, type FvgReviewAnswers } from "@/lib/journal/planFvgContext";
import { compareFvgTakenVsUntaken, type FvgEdgeComparison } from "@/lib/journal/planFvgCounterfactual";
import { fvgStudyList, type FvgStudyRow } from "@/lib/journal/planFvgStudy";
import { fvgReferencedExamples, type FvgJournalExample } from "@/lib/academy/fvgCourse";
import { amendPlan, freezePlanSnapshot, type ManagementPlanSnapshot } from "@/lib/journal/managementPlan";
import type { PricePath, TradeActuals, PlanVsActualResult } from "@/lib/journal/planVsActual";
import { composePlanReview } from "@/lib/journal/planReview";
import { planAdherenceBySetup, type SetupAdherence } from "@/lib/journal/planAdherence";
import { fvgBarContext, fvgBarOnlyRelationships } from "@/lib/marketData/fvg/fvgBarContext";
import { readEffortResponseField } from "@/lib/chart/effortResponseField";
import { fvgContextSplits, type SplitRow } from "@/lib/journal/planFvgContextSplits";
import { managementCounterfactual, type ManagementCounterfactual } from "@/lib/journal/planManagementCounterfactual";

export const JOURNAL_FIXTURE_SYMBOL = "SAMPLE-FVG";
export const JOURNAL_FIXTURE_TF = "5m";
export const JOURNAL_FIXTURE_BANNER = "PROOF SCENE — sample data, not your journal";

const N = 2400;
const MIN5 = 5 * 60_000;
const T0 = Date.UTC(2026, 0, 5, 14, 30, 0);

/** Two synthetic setups: one reaches n ≥ 20 decided (MEASURED), one stays below (INSUFFICIENT EVIDENCE). */
export const JOURNAL_FIXTURE_SETUPS = ["SAMPLE gap reclaim", "SAMPLE gap fade"] as const;

export interface JournalFixtureEntry {
  readonly id: string;
  readonly setup: string;
  /** The plan frozen at the (sample) ticket's send, with any dated amendments. */
  readonly plan: ManagementPlanSnapshot;
  readonly actuals: TradeActuals;
  readonly path: PricePath;
  readonly symbol: string;
  readonly date: string;
  readonly result: "win" | "loss" | "be";
  readonly realizedR: number;
  readonly fvgRef: JournalFvgReference;
  readonly entryAtMs: number;
  readonly exitAtMs: number;
}

export interface JournalFixture {
  readonly ledger: FvgLedger;
  readonly entries: readonly JournalFixtureEntry[];
  /** Review answers per entry (entry + exit instants against the ledger). */
  readonly review: Readonly<Record<string, FvgReviewAnswers>>;
  readonly counterfactual: FvgEdgeComparison;
  readonly studyRows: readonly FvgStudyRow[];
  readonly examples: readonly FvgJournalExample[];
  /** Plan vs actual per entry (the Review's three columns, findings and plan-alone line). */
  readonly planResults: Readonly<Record<string, PlanVsActualResult>>;
  /** Personal Edge adherence by setup. */
  readonly adherence: readonly SetupAdherence[];
  /** Personal Edge × FVG context splits (structure, profile, order flow, wall, effort→response, session, regime, timeframe, instrument). */
  readonly splits: readonly SplitRow[];
  /** §24: did management destroy a valid plan / did restraint improve outcomes (descriptive). */
  readonly management: ManagementCounterfactual;
}

/** The fixture's deterministic sample bars (also the input for the as-of context tests). */
export function journalFixtureBars(): CanonicalBar[] { return bars(); }

function bars(): CanonicalBar[] {
  let seed = 20260105;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // A separate seeded stream for volume, so the OHLC (and every gap) is unchanged by it.
  let vseed = 777;
  const vrnd = () => (vseed = (vseed * 16807) % 2147483647) / 2147483647;
  let px = 100;
  const out: CanonicalBar[] = [];
  for (let i = 0; i < N; i++) {
    const o = px;
    const c = o + (rnd() - 0.5) * 0.9;
    const h = Math.max(o, c) + rnd() * 0.35;
    const l = Math.min(o, c) - rnd() * 0.35;
    px = c;
    const asOf = T0 + i * MIN5;
    out.push({
      barId: `${JOURNAL_FIXTURE_SYMBOL}|${JOURNAL_FIXTURE_TF}|${asOf}|e0`, symbolId: JOURNAL_FIXTURE_SYMBOL, sessionId: "SESSION_CONTINUOUS",
      timeframe: JOURNAL_FIXTURE_TF, open: +o.toFixed(2), high: +h.toFixed(2), low: +l.toFixed(2), close: +c.toFixed(2), volume: Math.round(40 + vrnd() * 160 + (Math.abs(c - o) > 0.3 ? vrnd() * 200 : 0)),
      asOf, receivedAt: asOf + MIN5, fidelity: "INDICATIVE", source: "sample", provenance: "DERIVED", truthEpoch: 0,
    });
  }
  return out;
}

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

let cached: JournalFixture | null = null;

/** The fixture, built once per page load (deterministic). */
export function journalFixture(): JournalFixture {
  if (cached) return cached;
  const b = bars();
  const ledger = detectFvgs(b, { symbolId: JOURNAL_FIXTURE_SYMBOL, timeframe: JOURNAL_FIXTURE_TF, tickSize: 0.01 });
  const entries: JournalFixtureEntry[] = [];
  let k = 0;
  for (const o of ledger.objects) {
    if (entries.length >= 24) break;
    // Alternate first and later interactions so both counterfactual groups are fed.
    const ep = k % 3 === 2 && o.interactions.length >= 2 ? o.interactions[1] : o.interactions[0];
    k++;
    if (!ep) continue;
    const decisionAtMs = ep.startAt;
    const ref = fvgReferenceAtDecision({ objectId: o.objectId, decisionAtMs, bars: b });
    if (!ref.ok) continue;
    const i = entries.length;
    // A synthetic plan on the gap: long a bullish gap / short a bearish one; stop beyond the far edge,
    // invalidation at the far edge, target 2R; management: breakeven after +1R, a 30-minute time stop.
    const dir = o.direction === "BULLISH" ? 1 : -1;
    const at = (t: number) => b.find(x => x.asOf <= t && t < x.asOf + MIN5) ?? b[b.length - 1];
    const entryPx = at(decisionAtMs).close;
    const far = dir === 1 ? o.bottom : o.top;   // the stop sits beyond the far edge; the plan names no separate invalidation
    const stopPx = +(far - dir * 0.3).toFixed(2);
    const risk = Math.abs(entryPx - stopPx) || 0.3;
    const targetPx = +(entryPx + dir * 2 * risk).toFixed(2);
    const frozenAt = decisionAtMs - 60_000;
    const base = freezePlanSnapshot({
      decisionId: `SAMPLE-DEC-${i + 1}`, frozenAt: "TICKET_SEND", atMs: frozenAt, source: "sample ticket at send",
      plan: { symbol: JOURNAL_FIXTURE_SYMBOL, direction: dir === 1 ? "LONG" : "SHORT", entryPx, stopPx, targetPx,
        thesis: "sample: price returns to the gap and holds it", conditions: ["move to breakeven after +1R", "time stop 30 min"], expectedHoldMin: 30, session: "sample session" },
    })!;
    // Every fourth decision is amended mid-trade with new evidence (a tighter target).
    const amended = i % 4 === 3 ? amendPlan(base, { atMs: decisionAtMs + 2 * MIN5, targetPx: +(entryPx + dir * 1.2 * risk).toFixed(2), newEvidence: "sample: momentum faded on the second bar", note: null }) : null;
    const plan = amended && amended.ok ? amended.snapshot : base;
    // The sample trader's exit: the stop or the target if a bar reaches it first, else a planned exit
    // bar that varies (some before the 30-minute time stop — early exits — some at it). Every seventh
    // ignores the stop (held through), every fifth moves the stop to breakeven after two bars.
    const startAt = b.findIndex(x => x.asOf + MIN5 > decisionAtMs);
    const planned = 2 + (i % 6) * 2;
    let exitAtMs = b[Math.min(b.length - 1, startAt + planned)].asOf + 60_000;
    let exitPx = b[Math.min(b.length - 1, startAt + planned)].close;
    for (let j = startAt + 1; j <= startAt + planned && j < b.length; j++) {
      const x = b[j];
      const hitStop = dir === 1 ? x.low <= stopPx : x.high >= stopPx;
      const hitTarget = dir === 1 ? x.high >= targetPx : x.low <= targetPx;
      if (hitStop && i % 7 !== 6) { exitAtMs = x.asOf + 60_000; exitPx = stopPx; break; }
      if (hitTarget) { exitAtMs = x.asOf + 60_000; exitPx = targetPx; break; }
    }
    const actuals: TradeActuals = {
      direction: dir === 1 ? "LONG" : "SHORT",
      entry: { atMs: decisionAtMs, px: entryPx, qty: 1 },
      adds: [],
      exits: [{ atMs: exitAtMs, px: exitPx, qty: 1 }],
      stopMoves: i % 5 === 1 ? [{ atMs: decisionAtMs + 2 * MIN5, fromPx: stopPx, toPx: entryPx }] : [],
      targetMoves: [],
      source: "sample fills (proof scene)",
    };
    const startIdx = b.findIndex(x => x.asOf + MIN5 > decisionAtMs);
    const path: PricePath = { barMs: MIN5, source: "sample 5m bars (proof scene)", bars: b.slice(Math.max(0, startIdx), startIdx + 48).map(x => ({ t: x.asOf, h: x.high, l: x.low, c: x.close })) };
    const r = +((dir * (exitPx - entryPx)) / risk).toFixed(2);
    entries.push({
      id: `SAMPLE-${i + 1}`,
      setup: JOURNAL_FIXTURE_SETUPS[i < 20 ? 0 : 1],
      plan, actuals, path,
      symbol: JOURNAL_FIXTURE_SYMBOL,
      date: day(decisionAtMs),
      result: r > 0 ? "win" : r < 0 ? "loss" : "be",
      realizedR: r,
      fvgRef: ref.ref,
      entryAtMs: decisionAtMs,
      exitAtMs,
    });
  }
  const review: Record<string, FvgReviewAnswers> = {};
  for (const e of entries) {
    const ctx = fvgContextFromLedger(ledger, e.fvgRef.objectId);
    if (ctx) review[e.id] = fvgReviewAnswersAt(ctx, e.entryAtMs, e.exitAtMs);
  }
  const counterfactual = compareFvgTakenVsUntaken([ledger], entries.map(e => ({
    objectId: e.fvgRef.objectId, interaction: e.fvgRef.snapshot.interaction, interactionsSoFar: e.fvgRef.snapshot.interactionsSoFar,
    decisionAtMs: e.fvgRef.decisionAtMs, realizedR: e.realizedR, followedPlan: null,
  })));
  const planResults: Record<string, PlanVsActualResult> = {};
  for (const e of entries) planResults[e.id] = composePlanReview({ plan: e.plan, actuals: e.actuals, path: e.path }).result;
  const adherence = planAdherenceBySetup(entries.map(e => ({ setup: e.setup, result: planResults[e.id] })));
  const studyRows = fvgStudyList(entries.map(e => ({ ref: e.fvgRef, result: planResults[e.id], realizedR: e.realizedR })));
  const examples = fvgReferencedExamples(entries.map(e => ({ id: e.id, symbol: e.symbol, date: e.date, result: e.result, realizedR: e.realizedR, fvgRef: e.fvgRef })))
    .map(x => ({ ...x, href: `/journal?scene=journal-fixture#${x.id}` }));
  // Context as of formation, from the owners that can be asked from bars alone (structure; the
  // profile of the bars BEFORE b1; walls SILENCE), the Response Matrix cell of the displacement bar,
  // the gap's regime tag, and the territory's own response in the decision's interaction (MARKET).
  const ctx = fvgBarContext(b, JOURNAL_FIXTURE_SYMBOL, JOURNAL_FIXTURE_TF);
  const tuples = b.map(x => ({ time: x.asOf / 1000, open: x.open, high: x.high, low: x.low, close: x.close, volume: x.volume }));
  const byId = new Map(ledger.objects.map(o => [o.objectId, o] as const));
  const splits = fvgContextSplits(entries.map(e => {
    const o = byId.get(e.fvgRef.objectId)!;
    const i2 = ctx.indexById.get(o.bars.b2.barId) ?? 0;
    const field = readEffortResponseField(tuples, Math.max(0, i2 - 99), i2, { volumeReal: true });
    const s0 = e.fvgRef.snapshot;
    const ep = s0.interaction === "BEFORE_ANY_TOUCH" ? 1 : s0.interaction === "AFTER_FIRST_INTERACTION" || s0.interaction === "AFTER_LATER_INTERACTION" ? s0.interactionsSoFar + 1 : s0.interactionsSoFar;
    return {
      ref: e.fvgRef,
      relationships: fvgBarOnlyRelationships(ctx, o),
      // The cell of b2 itself; if the owner did not read b2 (no volume / no ATR yet) it is SILENT, never a neighbour's cell.
      effortCell: field.state === "DRAWN" && field.bars[field.bars.length - 1].time === tuples[i2].time ? field.bars[field.bars.length - 1].cell : "SILENT" as const,
      regime: o.regime,
      marketResponse: o.interactions.find(x => x.episode === ep)?.response ?? null,
      realizedR: e.realizedR,
      result: planResults[e.id],
    };
  }));
  const management = managementCounterfactual(entries.map(e => ({ plan: e.plan, actuals: e.actuals, path: e.path, result: planResults[e.id], realizedR: e.realizedR })));
  cached = { ledger, entries, review, counterfactual, studyRows, examples, planResults, adherence, splits, management };
  return cached;
}

/** How many sample decisions the proof scene's Review shows before any link asks for another. */
export const JOURNAL_FIXTURE_SHOWN = 6;

/** The sample decision a URL fragment names (`#SAMPLE-24`), or null. Only ids the fixture really has. */
export function fixtureAnchorId(hash: string | null | undefined, entries: readonly { readonly id: string }[]): string | null {
  const raw = (hash ?? "").replace(/^#/, "");
  let id = raw;
  try { id = decodeURIComponent(raw); } catch { id = raw; }
  return id && entries.some(e => e.id === id) ? id : null;
}

/**
 * The decisions the Review section renders: the first JOURNAL_FIXTURE_SHOWN, plus the one a link's
 * fragment names when it is not among them — so "Show me my examples → #SAMPLE-24" lands ON that
 * decision instead of at the top of the page (education lane finding, 2026-10-09).
 */
export function shownFixtureEntries<T extends { readonly id: string }>(entries: readonly T[], anchorId: string | null): readonly T[] {
  const first = entries.slice(0, JOURNAL_FIXTURE_SHOWN);
  if (!anchorId || first.some(e => e.id === anchorId)) return first;
  const hit = entries.find(e => e.id === anchorId);
  return hit ? [...first, hit] : first;
}
