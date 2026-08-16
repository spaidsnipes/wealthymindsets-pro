"use client";
import * as React from "react";
import { WM } from "@/lib/design/wmTokens";
import type { PersonalEdgeVM } from "@/lib/traderMemory/viewModels/selectPersonalEdge";

/**
 * ScoreExplainer — makes RingScore inspectable.
 *
 * Founder Aug-14 §13 explicit ask: "WHY IS MY SCORE THIS? WHAT CHANGED
 * IT? WHAT BEHAVIOR IS COMPOUNDING? WHAT SAMPLE SIZE SUPPORTS THIS?
 * IS THE SCORE RESOLVED, PARTIAL, OR UNKNOWN?"
 *
 * Purely truthful rendering — every number comes from the PersonalEdgeVM
 * the caller already computed. Zero fabrication. UNKNOWN is a first-
 * class row, not a hidden footnote.
 */

export interface ScoreExplainerProps {
  vm: PersonalEdgeVM;
  onDrillClick?: () => void;
  className?: string;
}

function resolutionTone(res: PersonalEdgeVM["resolution"]) {
  switch (res) {
    case "RESOLVED": return { color: WM.state.ok,      label: "Resolved",  detail: "Sample size meets threshold across enough contexts." };
    case "PARTIAL":  return { color: WM.state.watch,   label: "Partial",   detail: "Some contexts meet threshold, others still building." };
    case "UNKNOWN":  return { color: WM.state.unknown, label: "Not yet",   detail: "No context has reached the sample threshold." };
  }
}

function trendMoodFor(vm: PersonalEdgeVM): { label: string; detail: string; color: string } {
  if (typeof vm.overallAvgR !== "number") {
    return {
      label: "Building history.",
      detail: `${vm.totalDecisions} decision${vm.totalDecisions === 1 ? "" : "s"} recorded — need ${Math.max(0, vm.sampleThreshold - vm.totalDecisions)} more per context to resolve.`,
      color: WM.text.muted,
    };
  }
  const r = vm.overallAvgR;
  if (r > 0.3) return { label: "You are compounding.", detail: `Averaging ${r.toFixed(2)}R across ${vm.closedCount} closed decisions.`, color: WM.state.ok };
  if (r < -0.3) return { label: "You are rebuilding.", detail: `Averaging ${r.toFixed(2)}R across ${vm.closedCount} closed decisions.`, color: WM.state.warn };
  return { label: "You are treading water.", detail: `Averaging ${r.toFixed(2)}R across ${vm.closedCount} closed decisions — near breakeven.`, color: WM.state.watch };
}

export function ScoreExplainer({ vm, onDrillClick, className }: ScoreExplainerProps) {
  const tone = resolutionTone(vm.resolution);
  const trend = trendMoodFor(vm);
  const strongest = vm.topStrengths[0] ?? null;
  const watch = vm.topWatch[0] ?? null;

  return (
    <div
      role="region"
      aria-label="Personal Edge score explainer"
      className={["wm-score-explainer", className ?? ""].join(" ")}
      style={{
        border: `1px solid ${WM.border.line}`,
        borderRadius: WM.radius.xl,
        padding: WM.space.lg,
        background: WM.surface.deep,
        display: "flex",
        flexDirection: "column",
        gap: WM.space.md,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: WM.space.sm, flexWrap: "wrap" }}>
        <span style={{ ...WM.type.label, color: WM.gold.mark }}>Why this score?</span>
        <span style={{ ...WM.type.labelSmall, color: tone.color }}>{tone.label}</span>
        <span style={{ fontSize: 10, color: WM.text.dim }}>·</span>
        <span style={{ fontSize: 10, color: WM.text.muted, letterSpacing: 0.2 }}>
          sample threshold {vm.sampleThreshold} per context
        </span>
      </div>

      {/* Trend mood */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, color: trend.color, letterSpacing: 0.2 }}>
          {trend.label}
        </span>
        <span style={{ fontSize: 11, color: WM.text.muted, lineHeight: 1.5 }}>
          {trend.detail}
        </span>
      </div>

      {/* Resolution reason */}
      <div style={{ paddingTop: WM.space.sm, borderTop: `1px solid ${WM.border.hair}` }}>
        <div style={{ fontSize: 10, letterSpacing: 0.3, textTransform: "uppercase", color: WM.text.muted, marginBottom: 4 }}>
          Resolution
        </div>
        <div style={{ fontSize: 12, color: WM.text.body, lineHeight: 1.5 }}>
          {tone.detail}
        </div>
        {vm.reason && (
          <div style={{ fontSize: 11, color: WM.text.muted, lineHeight: 1.5, marginTop: 4, fontStyle: "italic" }}>
            {vm.reason}
          </div>
        )}
      </div>

      {/* Compounding / Leaking edge context */}
      {(strongest || watch) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: WM.space.sm, paddingTop: WM.space.sm, borderTop: `1px solid ${WM.border.hair}` }}>
          <div style={{ padding: `${WM.space.sm}px ${WM.space.md}px`, background: WM.surface.mid, borderLeft: `2px solid ${WM.state.ok}` }}>
            <div style={{ fontSize: 9, letterSpacing: 0.3, textTransform: "uppercase", color: WM.state.ok, fontWeight: 700 }}>
              Compounding
            </div>
            {strongest ? (
              <>
                <div style={{ fontSize: 12, color: WM.text.hero, marginTop: 4 }}>
                  {strongest.label}
                </div>
                <div style={{ fontSize: 10, color: WM.text.muted, marginTop: 2, letterSpacing: 0.2 }}>
                  {typeof strongest.avgRealizedR === "number" ? `${strongest.avgRealizedR.toFixed(2)}R avg` : "avg unresolved"} · n={strongest.sampleCount}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: WM.text.muted, marginTop: 4, fontStyle: "italic" }}>
                No context reached the threshold yet.
              </div>
            )}
          </div>
          <div style={{ padding: `${WM.space.sm}px ${WM.space.md}px`, background: WM.surface.mid, borderLeft: `2px solid ${WM.state.warn}` }}>
            <div style={{ fontSize: 9, letterSpacing: 0.3, textTransform: "uppercase", color: WM.state.warn, fontWeight: 700 }}>
              Leaking edge
            </div>
            {watch ? (
              <>
                <div style={{ fontSize: 12, color: WM.text.hero, marginTop: 4 }}>
                  {watch.label}
                </div>
                <div style={{ fontSize: 10, color: WM.text.muted, marginTop: 2, letterSpacing: 0.2 }}>
                  {typeof watch.avgRealizedR === "number" ? `${watch.avgRealizedR.toFixed(2)}R avg` : "avg unresolved"} · n={watch.sampleCount}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: WM.text.muted, marginTop: 4, fontStyle: "italic" }}>
                No losing context isolated yet.
              </div>
            )}
          </div>
        </div>
      )}

      {onDrillClick && (
        <button
          type="button"
          onClick={onDrillClick}
          aria-label="Open full Personal Edge breakdown"
          style={{
            marginTop: WM.space.sm,
            alignSelf: "flex-start",
            padding: "8px 14px",
            background: "transparent",
            border: `1px solid ${WM.gold.line}`,
            borderRadius: WM.radius.md,
            color: WM.gold.mark,
            fontSize: 10,
            fontFamily: "Georgia, 'Times New Roman', serif",
            letterSpacing: 0.32,
            textTransform: "uppercase",
            cursor: "pointer",
            minHeight: 32,
          }}
        >
          Open full breakdown →
        </button>
      )}
    </div>
  );
}

export default ScoreExplainer;
