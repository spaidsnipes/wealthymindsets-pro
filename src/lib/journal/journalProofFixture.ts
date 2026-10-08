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
 *   · ids are prefixed "SAMPLE-" and R values are synthetic (a fixed cycle).
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

export const JOURNAL_FIXTURE_SYMBOL = "SAMPLE-FVG";
export const JOURNAL_FIXTURE_TF = "5m";
export const JOURNAL_FIXTURE_BANNER = "PROOF SCENE — sample data, not your journal";

const N = 2400;
const MIN5 = 5 * 60_000;
const T0 = Date.UTC(2026, 0, 5, 14, 30, 0);
const R_CYCLE = [1.2, -1, 0.6, -0.4, 2.1, -1, 0.3, -0.8, 1.5, -1];

export interface JournalFixtureEntry {
  readonly id: string;
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
}

function bars(): CanonicalBar[] {
  let seed = 20260105;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
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
      timeframe: JOURNAL_FIXTURE_TF, open: +o.toFixed(2), high: +h.toFixed(2), low: +l.toFixed(2), close: +c.toFixed(2), volume: 100,
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
    const r = R_CYCLE[entries.length % R_CYCLE.length];
    entries.push({
      id: `SAMPLE-${entries.length + 1}`,
      symbol: JOURNAL_FIXTURE_SYMBOL,
      date: day(decisionAtMs),
      result: r > 0 ? "win" : r < 0 ? "loss" : "be",
      realizedR: r,
      fvgRef: ref.ref,
      entryAtMs: decisionAtMs,
      exitAtMs: decisionAtMs + 6 * MIN5,
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
  const studyRows = fvgStudyList(entries.map(e => ({ ref: e.fvgRef, result: null, realizedR: e.realizedR })));
  const examples = fvgReferencedExamples(entries.map(e => ({ id: e.id, symbol: e.symbol, date: e.date, result: e.result, realizedR: e.realizedR, fvgRef: e.fvgRef })))
    .map(x => ({ ...x, href: `/journal?scene=journal-fixture#${x.id}` }));
  cached = { ledger, entries, review, counterfactual, studyRows, examples };
  return cached;
}
