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

const GOLD = "#C9A55C", MUTED = "#8a8271", INK = "#ede6d3";

export function PlanAdherenceBySetup({ entries }: { readonly entries: readonly JournalEntry[] }) {
  const [rows, setRows] = useState<SetupAdherence[]>([]);
  useEffect(() => {
    try {
      const reviews = readStoryReviews();
      const st = window.localStorage;
      setRows(planAdherenceBySetup(entries.flatMap(e => {
        const input = planReviewInputForJournalEntry(e, id => readPlanForDecision(st, id));
        return input?.plan ? [{ setup: e.setup, result: composePlanReview(input, reviews[journalReviewKey(e)]?.planWhy).result }] : [];
      })));
    } catch { setRows([]); }
  }, [entries]);
  if (!rows.length) return null;
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
    </div>
  );
}
