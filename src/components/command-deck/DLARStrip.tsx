"use client";
import * as React from "react";
import type { DLARVM } from "@/lib/marketData/viewModels/selectDLAR";
import type { MarketStateDimension } from "@/lib/marketData/canonicalMarketState";

/**
 * DLARStrip — the DIRECTION × LOCATION × AGGRESSION × RESPONSE support row.
 *
 * Founder Aug-14 correction §"THE FIRST SCREEN MUST HAVE ONE HERO TRUTH":
 *   Supporting strip: DIRECTION · LOCATION · AGGRESSION · RESPONSE
 *
 * Renders four compact chips with truthful UNKNOWN when dimensions are
 * unresolved. Each chip is clickable and calls onDrillClick with the
 * dimension key so the parent can open the WHY? evidence inspector.
 */

export type DLARDimensionKey = "direction" | "location" | "aggression" | "response";

const KEY_LABELS: Record<DLARDimensionKey, string> = {
  direction: "Direction",
  location: "Location",
  aggression: "Aggression",
  response: "Response",
};

interface Cell {
  key: DLARDimensionKey;
  label: string;
  value: string;
  color: string;
  glyph: string;
  reason?: string;
}

function chipStateForDim(dim: MarketStateDimension): { value: string; color: string; glyph: string } {
  if (dim.resolution === "RESOLVED" && dim.value) {
    return { value: dim.value, color: "#5cb85c", glyph: "●" };
  }
  if (dim.resolution === "PARTIAL") {
    return { value: dim.value ?? "partial", color: "#c9a55c", glyph: "◐" };
  }
  return { value: "unknown", color: "#55503f", glyph: "?" };
}

export interface DLARStripProps {
  dlar: DLARVM;
  onDrillClick?: (dim: DLARDimensionKey) => void;
  className?: string;
}

export function DLARStrip({ dlar, onDrillClick, className }: DLARStripProps) {
  const cells: Cell[] = [
    (() => {
      const s = chipStateForDim(dlar.direction);
      return { key: "direction", label: KEY_LABELS.direction, ...s };
    })(),
    (() => {
      const s = chipStateForDim(dlar.location);
      return { key: "location", label: KEY_LABELS.location, ...s };
    })(),
    (() => {
      const s = chipStateForDim(dlar.aggression);
      return { key: "aggression", label: KEY_LABELS.aggression, ...s };
    })(),
    {
      key: "response",
      label: KEY_LABELS.response,
      value: dlar.response.verdict.toLowerCase(),
      color:
        dlar.response.verdict === "RESPONDING" ? "#5cb85c" :
        dlar.response.verdict === "ABSORBED"  ? "#c9a55c" :
        dlar.response.verdict === "FADING"    ? "#c05a4a" :
        dlar.response.verdict === "QUIET"     ? "#8a8271" : "#55503f",
      glyph:
        dlar.response.verdict === "RESPONDING" ? "●" :
        dlar.response.verdict === "ABSORBED"  ? "◐" :
        dlar.response.verdict === "FADING"    ? "!" :
        dlar.response.verdict === "QUIET"     ? "○" : "?",
      reason: dlar.response.reason,
    },
  ];

  return (
    <section
      role="region"
      aria-label="Direction, Location, Aggression, Response"
      className={["wm-dlar-strip", className ?? ""].join(" ")}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 8,
      }}
    >
      {cells.map((c) => {
        const clickable = !!onDrillClick;
        return (
          <button
            key={c.key}
            type="button"
            disabled={!clickable}
            onClick={clickable ? () => onDrillClick!(c.key) : undefined}
            aria-label={`${c.label}: ${c.value}${c.reason ? `. ${c.reason}` : ""}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 6,
              textAlign: "left",
              padding: "12px 14px",
              minHeight: 44,
              borderRadius: 8,
              border: `1px solid ${c.color}40`,
              background: "rgba(19,19,23,0.55)",
              cursor: clickable ? "pointer" : "default",
              color: "#ede6d3",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span aria-hidden="true" style={{ color: c.color, fontSize: 12, fontWeight: 700 }}>
                {c.glyph}
              </span>
              <span style={{ fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: "#8a8271", fontWeight: 700 }}>
                {c.label}
              </span>
            </span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: c.color === "#55503f" ? "#8a8271" : "#ede6d3",
                letterSpacing: 0.2,
              }}
            >
              {c.value}
            </span>
          </button>
        );
      })}
    </section>
  );
}

export default DLARStrip;
