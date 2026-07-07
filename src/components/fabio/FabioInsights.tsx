"use client";

/**
 * FabioInsights — reusable, context-aware insight feed.
 *
 * Two render modes:
 *   • variant="panel"  → animated right-sidebar column (matches MarkovPanel), takes onClose.
 *   • variant="inline" → compact embeddable card for Journal / News / Morning-Prep.
 *
 * Content comes from src/lib/fabio.ts. While FABIO_CONTENT_IS_PLACEHOLDER is true
 * a visible banner marks the notes as framework placeholders (see that file).
 */

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { X, Lightbulb, Target, Info } from "lucide-react";
import {
  getFabioInsights,
  inferAssetClass,
  FABIO_CONTENT_IS_PLACEHOLDER,
  type FabioInsight,
  type FabioContext,
} from "@/lib/fabio";

const CAT_COLOR: Record<string, string> = {
  "Order Flow": "#4FA3E0",
  "Smart Money": "#8B5CF6",
  "Footprint / VP": "#00D4AA",
  "CLC Rule": "#FF4D6A",
  "Risk": "#F0B429",
  "Psychology": "#E879F9",
  "Session Playbook": "#22D3EE",
};

function InsightCard({ ins, compact }: { ins: FabioInsight; compact?: boolean }) {
  const color = CAT_COLOR[ins.category] ?? "#8B8FA8";
  return (
    <div
      style={{
        border: "1px solid #1E2030",
        borderLeft: `2px solid ${color}`,
        borderRadius: 8,
        background: "#0F1119",
        padding: compact ? "8px 10px" : "10px 11px",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span
          style={{
            fontSize: 8.5, fontWeight: 800, letterSpacing: 0.3,
            padding: "1px 6px", borderRadius: 4,
            background: `${color}18`, color, border: `1px solid ${color}40`,
            textTransform: "uppercase",
          }}
        >
          {ins.category}
        </span>
        <span style={{ fontSize: 9, color: "#4A5070", marginLeft: "auto" }}>{ins.source}</span>
      </div>
      <div style={{ fontSize: compact ? 11.5 : 12.5, fontWeight: 700, color: "#E2E8F0", marginBottom: 3, lineHeight: 1.25 }}>
        {ins.title}
      </div>
      <div style={{ fontSize: compact ? 10.5 : 11, color: "#9AA0BC", lineHeight: 1.45 }}>
        {ins.body}
      </div>
      {ins.action && (
        <div style={{ display: "flex", gap: 5, marginTop: 6, alignItems: "flex-start" }}>
          <Target size={11} style={{ color, flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 10, color: "#B8BED8", fontStyle: "italic", lineHeight: 1.4 }}>{ins.action}</span>
        </div>
      )}
    </div>
  );
}

function PlaceholderBanner() {
  if (!FABIO_CONTENT_IS_PLACEHOLDER) return null;
  return (
    <div
      style={{
        display: "flex", gap: 6, alignItems: "flex-start",
        margin: "0 0 10px", padding: "7px 9px", borderRadius: 7,
        background: "rgba(240,180,41,0.08)", border: "1px solid rgba(240,180,41,0.28)",
      }}
    >
      <Info size={12} style={{ color: "#F0B429", flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontSize: 9.5, color: "#C9A94A", lineHeight: 1.4 }}>
        Playbook notes — proven order-flow &amp; smart-money principles to frame your reads.
        Educational context, not financial advice.
      </span>
    </div>
  );
}

export interface FabioInsightsProps {
  symbol?: string;
  activeIndicators?: string[];
  regime?: FabioContext["regime"];
  surface?: string;
  variant?: "panel" | "inline";
  limit?: number;
  title?: string;
  onClose?: () => void;
}

export function FabioInsights({
  symbol,
  activeIndicators,
  regime,
  surface,
  variant = "panel",
  limit,
  title = "WM Playbook",
  onClose,
}: FabioInsightsProps) {
  const insights = useMemo(
    () =>
      getFabioInsights(
        { symbol, assetClass: inferAssetClass(symbol), regime, activeIndicators, surface },
        limit ?? (variant === "inline" ? 3 : 6),
      ),
    [symbol, activeIndicators, regime, surface, variant, limit],
  );

  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Lightbulb size={13} style={{ color: "#F0B429" }} />
      <span style={{ fontSize: 11.5, fontWeight: 900, color: "#E2E8F0", letterSpacing: 0.3 }}>{title}</span>
      {symbol && (
        <span style={{ fontSize: 9, color: "#4A5070", fontWeight: 700 }}>· {symbol.toUpperCase()}</span>
      )}
    </div>
  );

  /* ── Inline / embedded card (Journal, News, Morning-Prep) ─────────────── */
  if (variant === "inline") {
    return (
      <div
        style={{
          border: "1px solid #1E2030", borderRadius: 10, background: "#0B0D14",
          padding: 12, width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          {header}
          <span style={{ fontSize: 9, color: "#4A5070" }}>context-aware</span>
        </div>
        <PlaceholderBanner />
        {insights.map(ins => (
          <InsightCard key={ins.id} ins={ins} compact />
        ))}
      </div>
    );
  }

  /* ── Sidebar panel (chart) ────────────────────────────────────────────── */
  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="border-l border-wm-border bg-wm-dark flex flex-col shrink-0 overflow-hidden"
      style={{ minWidth: 0 }}
    >
      <div
        className="flex items-center justify-between px-2.5 shrink-0 border-b border-wm-border"
        style={{ height: 34 }}
      >
        {header}
        {onClose && (
          <button onClick={onClose} className="text-wm-text-dim hover:text-wm-text transition-colors p-0.5" title="Close">
            <X size={12} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", padding: 10 }}>
        <PlaceholderBanner />
        {insights.map(ins => (
          <InsightCard key={ins.id} ins={ins} />
        ))}
        <div style={{ fontSize: 9, color: "#3A3F58", textAlign: "center", marginTop: 4 }}>
          Insights adapt to symbol, regime &amp; active indicators.
        </div>
      </div>
    </motion.div>
  );
}

export default FabioInsights;
