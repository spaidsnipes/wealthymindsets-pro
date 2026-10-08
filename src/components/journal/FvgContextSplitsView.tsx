"use client";

/**
 * PERSONAL EDGE × FVG — CONTEXT SPLITS and "DID MANAGEMENT HELP?" (Garden 19
 * §23, §24). Pure views: they render what planFvgContextSplits and
 * planManagementCounterfactual computed. MARKET and TRADER outcomes sit in
 * separate columns, each with its own n and its own INSUFFICIENT EVIDENCE.
 */

import React from "react";
import type { SplitRow } from "@/lib/journal/planFvgContextSplits";
import type { ManagementCounterfactual } from "@/lib/journal/planManagementCounterfactual";
import type { GroupComparison } from "@/lib/journal/planFvgFillTargets";

const GOLD = "#C9A55C", MUTED = "#8a8271", INK = "#ede6d3", LINE = "rgba(139,106,41,0.25)";

export function FvgContextSplitsView({ rows }: { readonly rows: readonly SplitRow[] }) {
  if (!rows.length) return null;
  const dims = [...new Set(rows.map(r => r.dimension))];
  return (
    <div data-testid="fvg-context-splits" style={{ display: "grid", gap: 6, marginTop: 6 }}>
      <span style={{ fontSize: 10, letterSpacing: 1, color: GOLD }}>FVG CONTEXT SPLITS · as of each decision · MARKET outcome and TRADER outcome kept apart</span>
      {dims.map(d => (
        <div key={d} data-dimension={d} style={{ display: "grid", gap: 3, borderTop: `1px solid ${LINE}`, paddingTop: 4 }}>
          <span style={{ fontSize: 10, letterSpacing: 0.8, color: MUTED }}>{d}</span>
          {rows.filter(r => r.dimension === d).map(r => (
            <div key={r.group} data-testid="fvg-split-row" data-market={r.market.state} data-trader={r.trader.state}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "2px 12px", fontSize: 11.5, color: INK, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>
              <b style={{ fontWeight: 600 }}>{r.group} <span style={{ color: MUTED, fontWeight: 400 }}>· {r.decisions}</span></b>
              <span style={{ color: r.market.state === "MEASURED" ? INK : MUTED }}>{r.market.line}</span>
              <span style={{ color: r.trader.state === "MEASURED" ? INK : MUTED }}>{r.trader.line}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ManagementCounterfactualView({ m }: { readonly m: ManagementCounterfactual | null }) {
  if (!m) return null;
  return (
    <div data-testid="management-counterfactual" style={{ display: "grid", gap: 4, marginTop: 6 }}>
      <span style={{ fontSize: 10, letterSpacing: 1, color: GOLD }}>DID MANAGEMENT HELP? · the plan alone on the same path · descriptive only</span>
      <span data-state={m.departed.state} style={{ fontSize: 11.5, color: m.departed.state === "MEASURED" ? INK : MUTED, overflowWrap: "anywhere" }}>{m.departed.line}</span>
      <span data-state={m.restraint.state} style={{ fontSize: 11.5, color: m.restraint.state === "MEASURED" ? INK : MUTED, overflowWrap: "anywhere" }}>{m.restraint.line}</span>
      <span style={{ fontSize: 10.5, color: MUTED }}>{m.claim}.</span>
    </div>
  );
}

/** §41 two Review questions, factual: far-edge (fill) targets, and an additional sense attached. Counts, then a ≥ 20 comparison. */
export function FvgReviewQuestionsView({ fill, evidence }: { readonly fill: GroupComparison | null; readonly evidence: GroupComparison | null }) {
  if (!fill && !evidence) return null;
  const block = (title: string, c: GroupComparison, id: string) => (
    <div data-testid={id} data-state={c.state} style={{ display: "grid", gap: 2 }}>
      <span style={{ fontSize: 10, letterSpacing: 0.8, color: MUTED }}>{title}</span>
      <span style={{ fontSize: 11.5, color: INK, overflowWrap: "anywhere" }}>{c.countLine}</span>
      <span style={{ fontSize: 11.5, color: c.state === "MEASURED" ? INK : MUTED, overflowWrap: "anywhere" }}>{c.line}</span>
    </div>
  );
  return (
    <div data-testid="fvg-review-questions" style={{ display: "grid", gap: 6, marginTop: 6 }}>
      <span style={{ fontSize: 10, letterSpacing: 1, color: GOLD }}>YOUR GAP DECISIONS · two questions, answered from the record · descriptive only</span>
      {fill ? block("WHERE YOUR FROZEN TARGET SAT · the gap's far edge, or elsewhere", fill, "fvg-fill-targets") : null}
      {evidence ? block("A SENSE BEYOND PRICE ATTACHED AT THE DECISION · or price only", evidence, "fvg-additional-evidence") : null}
      <span style={{ fontSize: 10.5, color: MUTED }}>{(fill ?? evidence)!.claim}.</span>
    </div>
  );
}
