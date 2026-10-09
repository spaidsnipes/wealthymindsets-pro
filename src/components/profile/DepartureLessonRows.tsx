"use client";

/**
 * PERSONAL EDGE · DEPARTURES FROM YOUR PLANS, EACH WITH ITS LESSON (design call 2026-10-09).
 *
 * One row per kind of departure among decided trades (planAdherence.departureRows). At a sufficient
 * sample (≥ 20 decided) the row carries "Study: Lesson N · title →" — the journal's own mapping, not a
 * copy. While INSUFFICIENT EVIDENCE the row has no door and says why. A fact about the plan; never a
 * grade of the trader.
 */

import Link from "next/link";
import React from "react";

import { PLAN_ADHERENCE_EMPTY_LINE } from "@/components/journal/PlanAdherenceBySetup";
import { usePlanResults } from "@/components/journal/usePlanResults";
import { departureRows, type DepartureRow } from "@/lib/journal/planAdherence";
import type { PlanVsActualResult } from "@/lib/journal/planVsActual";

const GOLD = "#c9a55c", MUTED = "#8a8271", INK = "#ede6d3";

/** No departure among decided trades — said plainly, with the count it is said over. */
export const noDepartureLine = (decided: number): string =>
  decided === 0
    ? "Departures from your plans: no trade with a frozen plan could be compared yet (fill times and the price path are needed)."
    : `Departures from your plans: none found in ${decided} decided ${decided === 1 ? "trade" : "trades"}.`;

/** Pure view — the profile and its proof scene both render this. */
export function DepartureLessonRowsView({ rows, decided, hasPlans }: { readonly rows: readonly DepartureRow[]; readonly decided: number; readonly hasPlans: boolean }) {
  return (
    <div role="region" aria-label="Personal Edge — departures from your plans" data-testid="edge-departures"
      style={{ border: "1px solid rgba(139,106,41,0.35)", borderRadius: 10, background: "rgba(11,11,13,0.9)", padding: 16, display: "grid", gap: 6 }}>
      <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: GOLD, fontWeight: 800 }}>Personal Edge · departures from your plans</span>
      {!hasPlans ? (
        <p data-testid="edge-departures-empty" style={{ margin: 0, fontSize: 11, color: MUTED }}>{PLAN_ADHERENCE_EMPTY_LINE}</p>
      ) : rows.length === 0 ? (
        <p data-testid="edge-departures-none" style={{ margin: 0, fontSize: 11, color: MUTED }}>{noDepartureLine(decided)}</p>
      ) : rows.map(r => (
        <div key={r.id} data-testid="edge-departure-row" data-state={r.state} data-departure={r.id}
          style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", fontSize: 11.5, color: INK, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>
          <span style={{ color: r.state === "MEASURED" ? INK : MUTED }}>{r.line}</span>
          {r.door ? (
            <Link href={r.door.href} prefetch={false} data-testid="edge-departure-study" style={{ color: GOLD, minHeight: 24 }}>Study: {r.door.label} →</Link>
          ) : null}
          {r.why ? <span data-testid="edge-departure-why" style={{ color: MUTED }}>{r.why}</span> : null}
        </div>
      ))}
    </div>
  );
}

/** From results already in hand (the proof scene's sample). */
export function DepartureLessonRowsFor({ results }: { readonly results: readonly PlanVsActualResult[] }) {
  return <DepartureLessonRowsView rows={departureRows(results)} decided={results.filter(r => r.decisionId && r.exitDecidable).length} hasPlans={results.length > 0} />;
}

/** The trader's own book: read once per member, nothing written. */
export function DepartureLessonRows() {
  const results = usePlanResults();
  if (results === null) return null;
  return <DepartureLessonRowsFor results={results} />;
}
