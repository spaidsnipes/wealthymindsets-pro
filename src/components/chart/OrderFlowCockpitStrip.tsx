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
 */

"use client";

import * as React from "react";
import {
  selectAggressorFlow,
  type AggressorTick,
} from "@/lib/marketData/selectAggressorFlow";

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
 * Format the aggressor imbalance ratio for the chip. Values are
 * derived from real per-trade sizes so crypto's fractional volumes
 * can push the ratio into the millions when one side is tiny. Show
 * an honest cap ("≥100k:1") instead of a 27,261,700:100 string that
 * reads as noise. The unbounded number is preserved in aria-label
 * for keyboard/screen-reader users who want the raw value.
 */
function formatImbalanceRatio(ratio: number, oneSided = false): string {
  // One-sided flow has an UNBOUNDED ratio — the selector's 300 sentinel is not
  // a measurement. Painting it as "300:100" invents a 3:1 reading the tape
  // never produced (LIVING-PIXEL LAW).
  if (oneSided) return "one-sided";
  if (!Number.isFinite(ratio) || ratio <= 100) return "1:1";
  if (ratio >= 1e6) return "≥10k:1";
  if (ratio >= 1e5) return "≥1k:1";
  return `${ratio.toFixed(0)}:100`;
}

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

  const buyColor = snap.askDom ? "#00C076" : "#4A8560";
  const sellColor = !snap.askDom ? "#FF4D67" : "#7A4550";
  const netColor = snap.cvd > 0 ? "#00C076" : snap.cvd < 0 ? "#FF4D67" : "#8B8FA8";

  return (
    <div
      className="wm-order-flow-cockpit-strip"
      style={containerStyle}
      aria-label={`Order flow cockpit — ${snap.askDom ? "aggressive buy" : "aggressive sell"} dominant, ratio ${formatImbalanceRatio(snap.imbRatio, snap.oneSided)}`}
    >
      <span style={{ color: "#c9a55c", letterSpacing: 0.4, fontWeight: 700, textTransform: "uppercase" }}>
        {label}
      </span>

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
