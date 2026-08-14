"use client";
import * as React from "react";
import type { PersonalEdgeVM, ContextBucket } from "@/lib/traderMemory/viewModels/selectPersonalEdge";

/**
 * PersonalEdgePanel — pure display of selectPersonalEdge output.
 *
 * Founder doctrine (§10, D10):
 *   - Personal Edge OBJECTIVELY discovers where the trader performs well
 *   - Never fabricates edge from small samples
 *   - Renders UNKNOWN honestly when threshold not met
 *   - Never P&L vanity — process adherence + avgR + evidence, not
 *     dollar hero numbers
 */

export interface PersonalEdgePanelProps {
  vm: PersonalEdgeVM;
  onBucketClick?: (bucket: ContextBucket) => void;
  className?: string;
}

export function PersonalEdgePanel({ vm, onBucketClick, className }: PersonalEdgePanelProps) {
  return (
    <div
      role="region"
      aria-label="Personal Edge — where this trader performs well"
      className={["wm-personal-edge", className ?? ""].join(" ")}
      style={{
        border: "1px solid rgba(139,106,41,0.35)",
        borderRadius: 10,
        background: "rgba(11,11,13,0.9)",
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800 }}>
          Personal Edge
        </span>
        <span style={{ fontSize: 10, color: "#55503f" }}>·</span>
        <span
          style={{
            fontSize: 9,
            letterSpacing: 0.3,
            textTransform: "uppercase",
            color:
              vm.resolution === "RESOLVED" ? "#5cb85c" :
              vm.resolution === "PARTIAL"  ? "#c9a55c" :
                                              "#55503f",
            fontWeight: 700,
          }}
        >
          {vm.resolution}
        </span>
        <span style={{ fontSize: 10, color: "#8a8271", marginLeft: "auto" }}>
          {vm.totalDecisions} decisions · min sample {vm.sampleThreshold}
        </span>
      </div>

      <div style={{ fontSize: 13, color: "#ede6d3", lineHeight: 1.5, marginBottom: 10 }}>
        {vm.headline}
      </div>
      {vm.reason && (
        <div style={{ fontSize: 11, color: "#8a8271", lineHeight: 1.5, marginBottom: 12, fontStyle: "italic" }}>
          {vm.reason}
        </div>
      )}

      {/* Overall metrics — dim when UNKNOWN, never a fake zero */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
        <Metric label="Win rate" value={vm.overallWinRate} format={(n) => `${Math.round(n * 100)}%`} />
        <Metric label="Avg R" value={vm.overallAvgR} format={(n) => n.toFixed(2)} />
        <Metric label="Process" value={vm.overallProcessAdherence} format={(n) => `${n.toFixed(1)}/5`} />
      </div>

      {vm.topStrengths.length > 0 && (
        <section aria-label="Strength contexts" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: "#5cb85c", fontWeight: 700, marginBottom: 6 }}>
            Strength contexts
          </div>
          <BucketList buckets={vm.topStrengths} tone="positive" onBucketClick={onBucketClick} />
        </section>
      )}

      {vm.topWatch.length > 0 && (
        <section aria-label="Watch contexts">
          <div style={{ fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: "#c05a4a", fontWeight: 700, marginBottom: 6 }}>
            Watch contexts
          </div>
          <BucketList buckets={vm.topWatch} tone="negative" onBucketClick={onBucketClick} />
        </section>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  format,
}: {
  label: string;
  value: number | "UNKNOWN";
  format: (n: number) => string;
}) {
  const unknown = value === "UNKNOWN";
  return (
    <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(19,19,23,0.5)" }}>
      <div style={{ fontSize: 9, letterSpacing: 0.32, textTransform: "uppercase", color: "#8a8271", fontWeight: 700 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: unknown ? "#55503f" : "#ede6d3",
          marginTop: 4,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
        aria-label={unknown ? `${label} unknown` : `${label} ${format(value as number)}`}
      >
        {unknown ? "?" : format(value as number)}
      </div>
    </div>
  );
}

function BucketList({
  buckets,
  tone,
  onBucketClick,
}: {
  buckets: readonly ContextBucket[];
  tone: "positive" | "negative";
  onBucketClick?: (b: ContextBucket) => void;
}) {
  return (
    <div role="list" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {buckets.map((b) => {
        const avgRText = typeof b.avgRealizedR === "number" ? b.avgRealizedR.toFixed(2) : "?";
        const winRateText = typeof b.winRate === "number" ? `${Math.round(b.winRate * 100)}%` : "?";
        const clickable = !!onBucketClick;
        return (
          <button
            key={b.key}
            type="button"
            role="listitem"
            aria-label={`${b.label}: ${b.sampleCount} decisions, avg R ${avgRText}, win rate ${winRateText}`}
            disabled={!clickable}
            onClick={clickable ? () => onBucketClick!(b) : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              textAlign: "left",
              padding: "8px 10px",
              minHeight: 44,
              borderRadius: 4,
              border: `1px solid ${tone === "positive" ? "rgba(92,184,92,0.3)" : "rgba(192,90,74,0.3)"}`,
              background: "rgba(19,19,23,0.4)",
              cursor: clickable ? "pointer" : "default",
              color: "#ede6d3",
            }}
          >
            <span style={{ flex: 1, fontSize: 12 }}>{b.label}</span>
            <span style={{ fontSize: 10, color: "#8a8271", fontVariantNumeric: "tabular-nums" }}>
              n={b.sampleCount}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: tone === "positive" ? "#5cb85c" : "#c05a4a",
                minWidth: 40,
                textAlign: "right",
              }}
            >
              {avgRText}R
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default PersonalEdgePanel;
