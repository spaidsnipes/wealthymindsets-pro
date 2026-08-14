"use client";
import * as React from "react";
import type { OpeningBellVM, ReadinessVerdict, ItemVerdict } from "@/lib/traderMemory/viewModels/selectOpeningBell";

/**
 * OpeningBellPanel — pure display consumer of selectOpeningBell.
 *
 * Founder doctrine: 'Am I prepared?' Opening Bell informs, never gates.
 * The advisory framing is preserved from the selector — WM does not
 * grant or withhold permission to trade.
 *
 * Personal category items (§D09) are rendered but never framed as
 * required — WM does not impose spiritual practices on any user.
 */

const VERDICT_STYLES: Record<ReadinessVerdict, { color: string; glyph: string; label: string }> = {
  READY:         { color: "#5cb85c", glyph: "●", label: "Ready" },
  MOSTLY_READY:  { color: "#c9a55c", glyph: "◐", label: "Mostly ready" },
  NOT_READY:     { color: "#c05a4a", glyph: "!", label: "Not ready" },
  UNKNOWN:       { color: "#55503f", glyph: "?", label: "Unknown" },
};

const ITEM_STYLES: Record<ItemVerdict, { color: string; glyph: string; label: string }> = {
  DONE:      { color: "#5cb85c", glyph: "✓", label: "Done" },
  PARTIAL:   { color: "#c9a55c", glyph: "◐", label: "Partial" },
  NOT_DONE:  { color: "#8a8271", glyph: "○", label: "Not done" },
  SKIPPED:   { color: "#55503f", glyph: "—", label: "Skipped" },
  UNKNOWN:   { color: "#55503f", glyph: "?", label: "Unknown" },
};

export interface OpeningBellPanelProps {
  vm: OpeningBellVM;
  onItemClick?: (itemId: string) => void;
  className?: string;
}

export function OpeningBellPanel({ vm, onItemClick, className }: OpeningBellPanelProps) {
  const s = VERDICT_STYLES[vm.verdict];

  // Group items by category
  const byCategory = React.useMemo(() => {
    const groups: Record<string, typeof vm.items> = {};
    for (const item of vm.items) {
      if (!groups[item.category]) groups[item.category] = [];
      (groups[item.category] as typeof vm.items[number][]).push(item);
    }
    return groups;
  }, [vm.items]);

  return (
    <div
      role="region"
      aria-label="Opening Bell — session readiness"
      className={["wm-opening-bell-panel", className ?? ""].join(" ")}
      style={{
        border: "1px solid rgba(139,106,41,0.35)",
        borderRadius: 10,
        background: "rgba(11,11,13,0.9)",
        padding: 16,
      }}
    >
      {/* Verdict header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span aria-hidden="true" style={{ color: s.color, fontSize: 16, fontWeight: 700 }}>
          {s.glyph}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800 }}>
            Opening Bell
          </div>
          <div style={{ fontSize: 13, color: "#ede6d3", fontWeight: 600, marginTop: 2 }}>
            {s.label}
          </div>
        </div>
        {vm.minutesUntilOpen != null && (
          <div style={{ fontSize: 10, letterSpacing: 0.3, textTransform: "uppercase", color: "#8a8271" }}>
            {vm.minutesUntilOpen}m to open
          </div>
        )}
      </div>

      {/* Advisory — never a gate */}
      {vm.advisory && (
        <div
          style={{
            fontSize: 11,
            color: "#c0b8a0",
            lineHeight: 1.5,
            marginBottom: 12,
            padding: "8px 10px",
            borderLeft: `2px solid ${s.color}`,
            background: "rgba(19,19,23,0.5)",
            fontStyle: "italic",
          }}
        >
          {vm.advisory}
        </div>
      )}

      {vm.reason && !vm.advisory && (
        <div style={{ fontSize: 11, color: "#8a8271", lineHeight: 1.5, marginBottom: 12 }}>
          {vm.reason}
        </div>
      )}

      {/* Items grouped by category */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.entries(byCategory).map(([category, items]) => (
          <div key={category}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                color: "#8a8271",
                marginBottom: 6,
                fontWeight: 700,
              }}
            >
              {category === "personal" && "Personal (optional)"}
              {category === "market" && "Market prep"}
              {category === "risk" && "Risk plan"}
              {category === "playbook" && "Playbook"}
              {category === "data" && "Data health"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }} role="list">
              {items.map((item) => {
                const is = ITEM_STYLES[item.verdict];
                const clickable = !!onItemClick;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="listitem"
                    aria-label={`${item.label}: ${is.label}${item.required ? "" : " (optional)"}`}
                    disabled={!clickable}
                    onClick={clickable ? () => onItemClick!(item.id) : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textAlign: "left",
                      padding: "8px 10px",
                      minHeight: 44,
                      borderRadius: 4,
                      border: `1px solid ${is.color}20`,
                      background: "rgba(19,19,23,0.3)",
                      cursor: clickable ? "pointer" : "default",
                      color: "#ede6d3",
                    }}
                  >
                    <span aria-hidden="true" style={{ color: is.color, fontSize: 12, fontWeight: 700, minWidth: 12, textAlign: "center" }}>
                      {is.glyph}
                    </span>
                    <span style={{ flex: 1, fontSize: 12 }}>
                      {item.label}
                      {!item.required && (
                        <span style={{ fontSize: 9, color: "#55503f", marginLeft: 6, letterSpacing: 0.2 }}>
                          (optional)
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: 9, color: is.color, letterSpacing: 0.3, textTransform: "uppercase" }}>
                      {is.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {vm.requiredOutstanding.length > 0 && (
        <div
          style={{
            fontSize: 10,
            color: "#c9a55c",
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid rgba(139,106,41,0.25)",
            letterSpacing: 0.2,
          }}
        >
          {vm.requiredOutstanding.length} required item{vm.requiredOutstanding.length === 1 ? "" : "s"} outstanding:{" "}
          <span style={{ color: "#ede6d3" }}>{vm.requiredOutstanding.join(", ")}</span>
        </div>
      )}
    </div>
  );
}

export default OpeningBellPanel;
