"use client";

/**
 * PERSONAL EDGE · PLAN ADHERENCE BY SETUP — Garden 19 §28/§29. Read only.
 * Journal entries whose Decision_ID has a frozen plan, compared with what
 * happened and grouped by setup. MEASURED only at 20 decided trades.
 */

import React, { useEffect, useState } from "react";

import { journalReviewKey } from "@/lib/journal/captureReviewEvidence";
import type { JournalEntry } from "@/lib/journal/hydrateJournalEntries";
import { readPlanForDecision } from "@/lib/journal/managementPlanStore";
import { planAdherenceBySetup, type SetupAdherence } from "@/lib/journal/planAdherence";
import { composePlanReview, planReviewInputForJournalEntry } from "@/lib/journal/planReview";
import { DEVIATION_LABEL } from "@/lib/journal/planVsActual";
import { readStoryReviews } from "@/lib/journal/storyReview";
import { fvgAnswersFromReference, planAdherenceByFvgContext } from "@/lib/journal/planFvgContext";
import { compareFvgTakenVsUntaken, type FvgEdgeComparison } from "@/lib/journal/planFvgCounterfactual";
import { loadFvgLedgerFor } from "@/lib/journal/planFvgLoader";
import { DEPARTURES } from "@/lib/journal/planAdherence";
import type { FvgLedger } from "@/lib/marketData/fvg/fvgEngine";

const GOLD = "#C9A55C", MUTED = "#8a8271", INK = "#ede6d3";

export function PlanAdherenceBySetup({ entries }: { readonly entries: readonly JournalEntry[] }) {
  const [rows, setRows] = useState<SetupAdherence[]>([]);
  const [fvgRows, setFvgRows] = useState<SetupAdherence[]>([]);
  const [followedBy, setFollowedBy] = useState<Record<string, boolean | null>>({});
  const [edge, setEdge] = useState<FvgEdgeComparison | null>(null);
  const [edgeNote, setEdgeNote] = useState<string | null>(null);
  useEffect(() => {
    try {
      const reviews = readStoryReviews();
      const st = window.localStorage;
      const reviewed = entries.flatMap(e => {
        const input = planReviewInputForJournalEntry(e, id => readPlanForDecision(st, id));
        return input?.plan ? [{ e, result: composePlanReview(input, reviews[journalReviewKey(e)]?.planWhy).result }] : [];
      });
      setRows(planAdherenceBySetup(reviewed.map(r => ({ setup: r.e.setup, result: r.result }))));
      setFollowedBy(Object.fromEntries(reviewed.map(r => [r.e.id, r.result.exitDecidable ? !r.result.findings.some(f => DEPARTURES.includes(f.id)) : null])));
      // Garden 19 §23/§41: the same counting by FVG context, as of each decision (the reference's own snapshot).
      setFvgRows(reviewed.some(r => r.e.fvgRef)
        ? planAdherenceByFvgContext(reviewed.map(r => ({ fvg: r.e.fvgRef ? fvgAnswersFromReference(r.e.fvgRef) : null, result: r.result })))
        : []);
    } catch { setRows([]); setFvgRows([]); }
  }, [entries]);
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
  const edgeBlock = withRef.length ? (
    <div data-testid="fvg-market-vs-execution" style={{ display: "grid", gap: 4, marginTop: 4 }}>
      <span style={{ fontSize: 10, letterSpacing: 1, color: GOLD }}>MARKET EDGE vs EXECUTION EDGE · FVG · descriptive only</span>
      {!edge ? (
        <button type="button" data-testid="fvg-compare-untaken" onClick={() => { void compare(); }}
          style={{ justifySelf: "start", fontSize: 11, color: GOLD, background: "none", border: "1px solid rgba(139,106,41,0.25)", borderRadius: 6, padding: "3px 10px", minHeight: 28, cursor: "pointer" }}>
          Compare with the gaps you did not trade (same instrument, timeframe, days)
        </button>
      ) : (
        <>
          {edge.market.map(m => <span key={m.group} data-state={m.state} style={{ fontSize: 11.5, color: m.state === "MEASURED" ? INK : MUTED }}>{m.sentence}</span>)}
          <span data-state={edge.execution.state} style={{ fontSize: 11.5, color: edge.execution.state === "MEASURED" ? INK : MUTED }}>{edge.execution.sentence}</span>
          {edge.notCompared.map(n => <span key={n.state} style={{ fontSize: 10.5, color: MUTED }}>Not compared: {n.count} decision{n.count === 1 ? "" : "s"} {n.state.replace(/_/g, " ").toLowerCase()}.</span>)}
          <span style={{ fontSize: 10.5, color: MUTED }}>Days compared: {edge.days.join(", ") || "none"}. {edge.claim}.</span>
        </>
      )}
      {edgeNote ? <span role="status" style={{ fontSize: 10.5, color: MUTED }}>{edgeNote}</span> : null}
    </div>
  ) : null;
  if (!rows.length) return edgeBlock ? <div style={{ marginTop: 6 }}>{edgeBlock}</div> : null;
  return (
    <div data-testid="plan-adherence-by-setup" style={{ display: "grid", gap: 4, marginTop: 6 }}>
      <span style={{ fontSize: 10, letterSpacing: 1, color: GOLD }}>PLAN ADHERENCE BY SETUP · trades with a frozen plan</span>
      {rows.map(r => (
        <div key={r.setup} data-state={r.state} style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", fontSize: 11.5, color: INK, fontVariantNumeric: "tabular-nums" }}>
          <b style={{ fontWeight: 600 }}>{r.setup}</b>
          <span style={{ color: r.state === "MEASURED" ? INK : MUTED }}>{r.line}</span>
          {r.commonDeparture ? <span style={{ color: MUTED }}>most common departure: {DEVIATION_LABEL[r.commonDeparture.id].toLowerCase()} ({r.commonDeparture.count})</span> : null}
        </div>
      ))}
      {fvgRows.length ? (
        <div data-testid="plan-adherence-by-fvg" style={{ display: "grid", gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: 10, letterSpacing: 1, color: GOLD }}>PLAN ADHERENCE BY FVG CONTEXT · as of each decision</span>
          {fvgRows.map(r => (
            <div key={r.setup} data-state={r.state} style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", fontSize: 11.5, color: INK, fontVariantNumeric: "tabular-nums" }}>
              <b style={{ fontWeight: 600 }}>{r.setup}</b>
              <span style={{ color: r.state === "MEASURED" ? INK : MUTED }}>{r.line}</span>
            </div>
          ))}
        </div>
      ) : null}
      {edgeBlock}
    </div>
  );
}
