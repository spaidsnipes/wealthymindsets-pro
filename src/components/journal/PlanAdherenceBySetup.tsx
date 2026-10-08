"use client";

/**
 * PERSONAL EDGE · PLAN ADHERENCE BY SETUP — Garden 19 §28/§29. Read only.
 * Journal entries whose Decision_ID has a frozen plan, compared with what
 * happened and grouped by setup. MEASURED only at 20 decided trades.
 */

import { useManagementOwnerVersion } from "@/lib/journal/useManagementOwner";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { lessonForFinding } from "@/lib/journal/planLoop";

import { journalReviewKey } from "@/lib/journal/captureReviewEvidence";
import type { JournalEntry } from "@/lib/journal/hydrateJournalEntries";
import { readPlanForDecision } from "@/lib/journal/managementPlanStore";
import { planAdherenceBySetup, type SetupAdherence } from "@/lib/journal/planAdherence";
import { composePlanReview, planReviewInputForJournalEntry } from "@/lib/journal/planReview";
import { DEVIATION_LABEL } from "@/lib/journal/planVsActual";
import { readStoryReviews } from "@/lib/journal/storyReview";
import { fvgStudyList, OLD_GAP_AGE_BARS, type FvgStudyRow } from "@/lib/journal/planFvgStudy";
import { compareFvgTakenVsUntaken, type FvgEdgeComparison } from "@/lib/journal/planFvgCounterfactual";
import { loadFvgLedgerFor } from "@/lib/journal/planFvgLoader";
import { DEPARTURES } from "@/lib/journal/planAdherence";
import type { FvgLedger } from "@/lib/marketData/fvg/fvgEngine";
import { fvgContextSplits, type SplitRow } from "@/lib/journal/planFvgContextSplits";
import { managementCounterfactual, type ManagementCounterfactual } from "@/lib/journal/planManagementCounterfactual";
import { FvgContextSplitsView, FvgReviewQuestionsView, ManagementCounterfactualView } from "@/components/journal/FvgContextSplitsView";
import { additionalEvidenceComparison, fillTargetComparison, gapDecisionFrom, type GroupComparison } from "@/lib/journal/planFvgFillTargets";

const GOLD = "#C9A55C", MUTED = "#8a8271", INK = "#ede6d3";

export function PlanAdherenceBySetup({ entries }: { readonly entries: readonly JournalEntry[] }) {
  const [rows, setRows] = useState<SetupAdherence[]>([]);
  const [fvgRows, setFvgRows] = useState<FvgStudyRow[]>([]);
  const [followedBy, setFollowedBy] = useState<Record<string, boolean | null>>({});
  const [edge, setEdge] = useState<FvgEdgeComparison | null>(null);
  const [edgeNote, setEdgeNote] = useState<string | null>(null);
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [management, setManagement] = useState<ManagementCounterfactual | null>(null);
  const [q41, setQ41] = useState<{ fill: GroupComparison; evidence: GroupComparison } | null>(null);
  const ownerVersion = useManagementOwnerVersion();
  useEffect(() => {
    try {
      const reviews = readStoryReviews();
      const st = window.localStorage;
      const reviewed = entries.flatMap(e => {
        const input = planReviewInputForJournalEntry(e, id => readPlanForDecision(st, id));
        return input?.plan ? [{ e, input, result: composePlanReview(input, reviews[journalReviewKey(e)]?.planWhy).result }] : [];
      });
      setRows(planAdherenceBySetup(reviewed.map(r => ({ setup: r.e.setup, result: r.result }))));
      setFollowedBy(Object.fromEntries(reviewed.map(r => [r.e.id, r.result.exitDecidable ? !r.result.findings.some(f => DEPARTURES.includes(f.id)) : null])));
      // Garden 19 §23: the FVG study list — every decision that references a gap, by WHEN / DEPTH / AGE, as of each decision.
      const byId = new Map(reviewed.map(r => [r.e.id, r.result]));
      const refd = entries.filter(e => e.fvgRef);
      setFvgRows(refd.length ? fvgStudyList(refd.map(e => ({ ref: e.fvgRef!, result: byId.get(e.id) ?? null, realizedR: e.realizedR ?? null }))) : []);
      // §23 context splits from what the trader's own reference stored (session, timeframe, instrument,
      // order flow). Context it did not store (structure, profile, wall, effort→response, regime, the
      // territory's response) reads NOT RECORDED — never guessed from today's chart.
      setSplits(refd.length ? fvgContextSplits(refd.map(e => ({ ref: e.fvgRef!, realizedR: e.realizedR ?? null, result: byId.get(e.id) ?? null }))) : []);
      // §24 did management help? A journal entry carries no price path, so the plan-alone side stays
      // INSUFFICIENT with its n until paths are loaded; restraint reads the trader's own recorded R.
      // §41: the trader's gap decisions, from the stored reference + the frozen plan + the recorded result.
      const inputById = new Map(reviewed.map(r => [r.e.id, r.input]));
      const gapDs = refd.map(e => { const inp = inputById.get(e.id); return gapDecisionFrom({ id: e.id, fvgRef: e.fvgRef!, plan: inp?.plan ?? null, entryPx: inp?.actuals?.entry?.px ?? null, exitPx: inp?.actuals?.exits[0]?.px ?? null, realizedR: e.realizedR ?? null }); });
      setQ41(gapDs.length ? { fill: fillTargetComparison(gapDs), evidence: additionalEvidenceComparison(gapDs) } : null);
      setManagement(reviewed.length ? managementCounterfactual(reviewed.map(r => ({ plan: r.input.plan, actuals: r.input.actuals, path: r.input.path ?? null, result: r.result, realizedR: r.e.realizedR ?? null }))) : null);
    } catch { setRows([]); setFvgRows([]); setSplits([]); setManagement(null); setQ41(null); }
  }, [entries, ownerVersion]);
  const withRef = entries.filter(e => e.fvgRef);
  const compare = async () => {
    setEdgeNote("Reading the FVG ledgers for the instruments and timeframes you traded…");
    const pairs = new Map<string, string>();
    for (const e of withRef) pairs.set(`${e.fvgRef!.symbol}|${e.fvgRef!.timeframe}`, e.fvgRef!.objectId);
    const ledgers: FvgLedger[] = [];
    const refused: string[] = [];
    for (const [pair, objectId] of pairs) {
      const r = await loadFvgLedgerFor(objectId, Date.now());
      if ("ledger" in r) ledgers.push(r.ledger); else refused.push(`${pair}: ${r.reason}`);
    }
    setEdge(compareFvgTakenVsUntaken(ledgers, withRef.map(e => ({
      objectId: e.fvgRef!.objectId, interaction: e.fvgRef!.snapshot.interaction, interactionsSoFar: e.fvgRef!.snapshot.interactionsSoFar,
      decisionAtMs: e.fvgRef!.decisionAtMs, realizedR: e.realizedR ?? null, followedPlan: followedBy[e.id] ?? null,
    }))));
    setEdgeNote(refused.length ? `Not read: ${refused.join("; ")}.` : null);
  };
  // An empty book is the Journal's own empty state; this line speaks only once there are trades.
  if (!entries.length) return null;
  return <PlanAdherenceView rows={rows} fvgRows={fvgRows} edge={edge} edgeNote={edgeNote} showEdge={withRef.length > 0} onCompare={() => { void compare(); }}
    splits={splits} management={management} q41={q41} />;
}

/** §: no frozen plan in the book yet — say so and name the next action; never a 0% that measures nothing. */
export const PLAN_ADHERENCE_EMPTY_LINE = "Plan adherence: no trade in your Journal has a frozen plan yet. Write the plan on the ticket's plan card before your next trade — Review compares it after the exit.";

/** §23: no Journal entry references a gap yet — say what the splits need; never an empty table. */
export const FVG_SPLITS_EMPTY_LINE = "FVG context splits: no Journal entry references a gap yet. Attach the FVG reference when you journal a gap trade — each decision is then split by session, timeframe, instrument and order flow as of the decision, with the market's answer and yours kept apart.";
/** §23 on a real book: what the stored reference does not carry is named, not filled in. */
export const FVG_SPLITS_CONTEXT_NOTE = "Structure, profile, wall, effort→response, regime and the territory's response are read only when the reference stored them; otherwise they show NOT RECORDED — never re-read from today's chart.";

/** The Personal Edge block itself — pure, so it can be proved without a signed-in book. */
export function PlanAdherenceView({ rows, fvgRows, edge, edgeNote, showEdge, onCompare, splits, management, q41 }: {
  readonly q41?: { readonly fill: GroupComparison; readonly evidence: GroupComparison } | null;
  readonly splits?: readonly SplitRow[];
  readonly management?: ManagementCounterfactual | null;
  readonly rows: readonly SetupAdherence[];
  readonly fvgRows: readonly FvgStudyRow[];
  readonly edge: FvgEdgeComparison | null;
  readonly edgeNote: string | null;
  readonly showEdge: boolean;
  readonly onCompare: () => void;
}) {
  const edgeBlock = showEdge ? (
    <div data-testid="fvg-market-vs-execution" style={{ display: "grid", gap: 4, marginTop: 4 }}>
      <span style={{ fontSize: 10, letterSpacing: 1, color: GOLD }}>MARKET EDGE vs EXECUTION EDGE · FVG · descriptive only</span>
      {!edge ? (
        <button type="button" data-testid="fvg-compare-untaken" onClick={onCompare}
          style={{ justifySelf: "start", fontSize: 11, color: GOLD, background: "none", border: "1px solid rgba(139,106,41,0.25)", borderRadius: 6, padding: "3px 10px", minHeight: 28, cursor: "pointer" }}>
          Compare with the gaps you did not trade (same instrument, timeframe, days)
        </button>
      ) : (
        <>
          {edge.market.map(m => <span key={m.group} data-state={m.state} style={{ fontSize: 11.5, color: m.state === "MEASURED" ? INK : MUTED }}>{m.sentence}</span>)}
          <span data-state={edge.execution.state} style={{ fontSize: 11.5, color: edge.execution.state === "MEASURED" ? INK : MUTED }}>{edge.execution.sentence}</span>
          {edge.notCompared.map(n => <span key={n.state} style={{ fontSize: 10.5, color: MUTED }}>Not compared: {n.count} decision{n.count === 1 ? "" : "s"} {n.state.replace(/_/g, " ").toLowerCase()}.</span>)}
          <span style={{ fontSize: 10.5, color: MUTED, overflowWrap: "anywhere" }}>Days compared: {edge.days.join(", ") || "none"}. {edge.claim}.</span>
        </>
      )}
      {edgeNote ? <span role="status" style={{ fontSize: 10.5, color: MUTED }}>{edgeNote}</span> : null}
    </div>
  ) : null;
  const splitsBlock = splits === undefined ? null : splits.length ? (
    <div style={{ display: "grid", gap: 2 }}>
      <FvgContextSplitsView rows={splits} />
      {q41 ? <FvgReviewQuestionsView fill={q41.fill} evidence={q41.evidence} /> : null}
      <span data-testid="fvg-splits-context-note" style={{ fontSize: 10.5, color: MUTED }}>{FVG_SPLITS_CONTEXT_NOTE}</span>
    </div>
  ) : (
    <p data-testid="fvg-splits-empty" style={{ margin: "6px 0 0", fontSize: 11, color: MUTED }}>{FVG_SPLITS_EMPTY_LINE}</p>
  );
  const managementBlock = management ? <ManagementCounterfactualView m={management} /> : null;
  if (!rows.length && !fvgRows.length) {
    return edgeBlock ? <div style={{ marginTop: 6 }}>{edgeBlock}{splitsBlock}</div> : (
      <div style={{ display: "grid" }}>
        <p data-testid="plan-adherence-empty" style={{ margin: "6px 0 0", fontSize: 11, color: MUTED }}>
          {PLAN_ADHERENCE_EMPTY_LINE}
        </p>
        {splitsBlock}
      </div>
    );
  }
  return (
    <div data-testid="plan-adherence-by-setup" style={{ display: "grid", gap: 4, marginTop: 6 }}>
      {rows.length ? <span style={{ fontSize: 10, letterSpacing: 1, color: GOLD }}>PLAN ADHERENCE BY SETUP · trades with a frozen plan</span> : null}
      {rows.map(r => (
        <div key={r.setup} data-state={r.state} style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", fontSize: 11.5, color: INK, fontVariantNumeric: "tabular-nums" }}>
          <b style={{ fontWeight: 600 }}>{r.setup}</b>
          <span style={{ color: r.state === "MEASURED" ? INK : MUTED }}>{r.line}</span>
          {r.commonDeparture ? <span style={{ color: MUTED }}>most common departure: {DEVIATION_LABEL[r.commonDeparture.id].toLowerCase()} ({r.commonDeparture.count})</span> : null}
          {r.commonDeparture && lessonForFinding(r.commonDeparture.id) ? (
            <Link href={lessonForFinding(r.commonDeparture.id)!.href} prefetch={false} data-testid="plan-adherence-study" style={{ color: GOLD }}>Study: {lessonForFinding(r.commonDeparture.id)!.label} →</Link>
          ) : null}
        </div>
      ))}
      {fvgRows.length ? (
        <div data-testid="plan-adherence-by-fvg" style={{ display: "grid", gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: 10, letterSpacing: 1, color: GOLD }}>FVG STUDY LIST · as of each decision · old gap = more than {OLD_GAP_AGE_BARS} bars</span>
          {(["WHEN", "DEPTH", "AGE"] as const).map(dim => (
            <div key={dim} data-dimension={dim} style={{ display: "grid", gap: 2 }}>
              {fvgRows.filter(r => r.dimension === dim).map(r => (
                <div key={r.group} data-state={r.rState} data-adherence={r.adherence?.state ?? "NONE"} style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", fontSize: 11.5, color: INK, fontVariantNumeric: "tabular-nums" }}>
                  <b style={{ fontWeight: 600 }}>{r.group}</b>
                  <span style={{ color: r.rState === "MEASURED" ? INK : MUTED }}>{r.line}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
      {edgeBlock}
      {splitsBlock}
      {managementBlock}
    </div>
  );
}
