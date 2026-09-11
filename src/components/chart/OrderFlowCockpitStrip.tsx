/**
 * OrderFlowCockpitStrip — Founder Visual Canon Asset 10 merge.
 *
 * Asset 10 (Full Operating System Overview) puts an "Order Flow
 * Cockpit" tile at the top: Aggressive Buy / Aggressive Sell /
 * Net Flow / Flow Momentum. This strip is the /charts merge of
 * that grammar with REAL data owners only.
 *
 * Wire: recentTicks → selectAggressorFlow → honest volumes.
 *   - hasFlow=false → render nothing per LIVING-PIXEL LAW. Missing
 *     evidence remains available through canonical diagnostics without
 *     charging every chart visit another chrome row.
 *   - hasFlow=true → three tiles: Aggressive Buy, Aggressive Sell,
 *     Net Flow (signed), with the dominant side subtly highlighted.
 *
 * NO fake numbers, NO invented "68% net buying pressure" score —
 * the canonical selector's real imbRatio and cvd are surfaced
 * as-is with formatting; nothing derived past what the selector
 * says.
 *
 * PROVENANCE CHIP (2026-09-11). "Nothing derived past what the selector says"
 * was true of the NUMBERS and false of the CONFIDENCE. The selector now also
 * reports HOW the sides were established, and this strip renders it, because
 * on a live US equity chart the aggressor is a tick-rule reconstruction from
 * the Alpaca relay — confidence 0.5 — and it was being painted in exactly the
 * chrome a venue-asserted Coinbase aggressor gets. See selectAggressorFlow's
 * header for the full account. A PROVIDER flow shows no chip: disclosure is
 * for the qualified case, not decoration for the clean one.
 */

"use client";

import * as React from "react";
import {
  selectAggressorFlow,
  type AggressorTick,
} from "@/lib/marketData/selectAggressorFlow";
import { aggressorProvenanceNote } from "@/lib/marketData/aggressorProvenanceNote";
import { formatImbalanceRatio } from "@/lib/marketData/formatImbalanceRatio";

export interface OrderFlowCockpitStripProps {
  readonly ticks: readonly AggressorTick[];
  readonly livePrice: number;
  /** Compact label prefix ("ORDER FLOW"). */
  readonly label?: string;
}

function formatVolume(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  if (a >= 1) return v.toFixed(0);
  // Real crypto flow is often fractional (0.011 BTC etc). Rounding
  // to 0 falsely reads as "no aggressor volume" — a from-USE defect
  // observed on BTC where labels showed "0 / 0" while imbRatio was
  // 27,261,700:100 because sub-1 values existed but got truncated.
  if (a > 0) return v.toFixed(4);
  return "0";
}

function formatSignedVolume(v: number): string {
  const sign = v > 0 ? "+" : v < 0 ? "" : "";
  return `${sign}${formatVolume(v)}`;
}

/**
 * MOVED to @/lib/marketData/formatImbalanceRatio.
 *
 * The two rules below it enforced — the 300 one-sided sentinel and the
 * unbounded crypto tail — were correct here and invisible everywhere else,
 * because a private function is not an owner. SmartMoneyPanel was printing the
 * raw ratio and was exposed to both. The behaviour is unchanged for this strip.
 */
/**
 * MOVED to @/lib/marketData/aggressorProvenanceNote.
 *
 * `aggressorProvenanceNote` was born here and exported so a test could drive
 * the shipped words. That was correct for one surface. `SmartMoneyPanel` then
 * needed the same disclosure off the same `AggressorProvenance`, and a second
 * consumer is exactly when a helper stops being a component detail: the words
 * describe the FACT, not this strip's chrome. Importing them from a chart
 * component would have pointed the arrow the wrong way; retyping them would
 * have been the very drift this atom exists to kill.
 *
 * The rendering below is unchanged.
 */

export function OrderFlowCockpitStrip({
  ticks,
  livePrice,
  label = "ORDER FLOW",
}: OrderFlowCockpitStripProps) {
  const snap = React.useMemo(
    () => selectAggressorFlow(ticks, livePrice),
    [ticks, livePrice],
  );

  const containerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    height: 30,
    padding: "0 12px",
    background: "#0D0E14",
    borderBottom: "1px solid #1E2030",
    fontSize: 11,
    lineHeight: 1.2,
    flexShrink: 0,
    overflowX: "auto",
    scrollbarWidth: "none",
  };

  if (!snap.hasFlow) {
    return null;
  }

  const provenanceNote = aggressorProvenanceNote(snap.provenance);
  const buyColor = snap.askDom ? "#00C076" : "#4A8560";
  const sellColor = !snap.askDom ? "#FF4D67" : "#7A4550";
  const netColor = snap.cvd > 0 ? "#00C076" : snap.cvd < 0 ? "#FF4D67" : "#8B8FA8";

  return (
    <div
      className="wm-order-flow-cockpit-strip"
      style={containerStyle}
      aria-label={`Order flow cockpit — ${snap.askDom ? "aggressive buy" : "aggressive sell"} dominant, ratio ${formatImbalanceRatio(snap.imbRatio, snap.oneSided)}${provenanceNote ? `, ${provenanceNote.chip.toLowerCase()}` : ""}`}
    >
      <span style={{ color: "#c9a55c", letterSpacing: 0.4, fontWeight: 700, textTransform: "uppercase" }}>
        {label}
      </span>

      {provenanceNote && (
        <span
          className="wm-order-flow-provenance"
          title={provenanceNote.title}
          style={{
            color: "#C9A55C",
            border: "1px solid #4A4020",
            background: "#1A1608",
            borderRadius: 3,
            padding: "1px 5px",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.3,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {provenanceNote.chip}
        </span>
      )}

      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ color: "#6B7094", fontSize: 9, letterSpacing: 0.3, textTransform: "uppercase" }}>
          Aggressive Buy
        </span>
        <span style={{ color: buyColor, fontWeight: 700, fontFamily: "monospace" }}>
          {formatVolume(snap.askVol)}
        </span>
      </span>

      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ color: "#6B7094", fontSize: 9, letterSpacing: 0.3, textTransform: "uppercase" }}>
          Aggressive Sell
        </span>
        <span style={{ color: sellColor, fontWeight: 700, fontFamily: "monospace" }}>
          {formatVolume(snap.bidVol)}
        </span>
      </span>

      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ color: "#6B7094", fontSize: 9, letterSpacing: 0.3, textTransform: "uppercase" }}>
          Net Flow
        </span>
        <span style={{ color: netColor, fontWeight: 700, fontFamily: "monospace" }}>
          {formatSignedVolume(snap.cvd)}
        </span>
      </span>

      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ color: "#6B7094", fontSize: 9, letterSpacing: 0.3, textTransform: "uppercase" }}>
          Imb
        </span>
        <span style={{ color: netColor, fontWeight: 700, fontFamily: "monospace" }}>
          {formatImbalanceRatio(snap.imbRatio, snap.oneSided)}
        </span>
      </span>

      {snap.vwap > 0 && (
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6, marginLeft: "auto", paddingRight: 4 }}>
          <span style={{ color: "#6B7094", fontSize: 9, letterSpacing: 0.3, textTransform: "uppercase" }}>
            Vwap
          </span>
          <span style={{ color: "#c9c2a7", fontWeight: 700, fontFamily: "monospace" }}>
            {snap.vwap.toFixed(2)}
          </span>
        </span>
      )}
    </div>
  );
}

export default OrderFlowCockpitStrip;
