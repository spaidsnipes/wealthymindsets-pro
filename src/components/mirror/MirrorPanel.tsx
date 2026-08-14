"use client";
import * as React from "react";
import type { MirrorVM, MirrorPattern, EvidenceClass } from "@/lib/traderMemory/viewModels/selectMirror";

/**
 * MirrorPanel — pure display consumer of selectMirror.
 *
 * Founder doctrine: Mirror asks 'What does my behavior teach me?' Mirror
 * REFLECTS, never diagnoses. Every pattern must carry its evidenceClass
 * so a system-derived HYPOTHESIS is never rendered as an OBSERVED fact.
 *
 * Renders nothing when the VM has no patterns (silence when there is
 * nothing to reflect — same as ATHOS §14).
 */

const DIRECTION_STYLES: Record<MirrorPattern["direction"], { color: string; glyph: string; label: string }> = {
  STRENGTH: { color: "#5cb85c", glyph: "◇", label: "Strength" },
  WATCH:    { color: "#c9a55c", glyph: "◐", label: "Watch" },
  NEUTRAL:  { color: "#8a8271", glyph: "○", label: "Neutral" },
};

const EVIDENCE_LABEL: Record<EvidenceClass, string> = {
  OBSERVED: "Observed",
  USER_DECLARED: "You reported",
  SYSTEM_CANDIDATE: "Pattern candidate",
  UNKNOWN: "Unknown",
};

export interface MirrorPanelProps {
  vm: MirrorVM;
  onDrill?: (pattern: MirrorPattern) => void;
  className?: string;
}

export function MirrorPanel({ vm, onDrill, className }: MirrorPanelProps) {
  if (vm.patterns.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Mirror — behavioral patterns"
      className={["wm-mirror-panel", className ?? ""].join(" ")}
      style={{
        border: "1px solid rgba(139,106,41,0.35)",
        borderRadius: 10,
        background: "rgba(11,11,13,0.9)",
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800 }}>
          Mirror
        </span>
        <span style={{ fontSize: 10, color: "#55503f" }}>·</span>
        <span style={{ fontSize: 10, color: "#8a8271", letterSpacing: 0.3 }}>
          {vm.patterns.length} pattern{vm.patterns.length === 1 ? "" : "s"} from {vm.totalDecisions} decision{vm.totalDecisions === 1 ? "" : "s"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }} role="list">
        {vm.patterns.map((p) => {
          const s = DIRECTION_STYLES[p.direction];
          const clickable = !!onDrill;
          const label = `${p.label}: ${s.label}, ${EVIDENCE_LABEL[p.evidenceClass]}. ${p.statement}`;
          return (
            <button
              key={p.id}
              type="button"
              role="listitem"
              aria-label={label}
              disabled={!clickable}
              onClick={clickable ? () => onDrill!(p) : undefined}
              style={{
                display: "flex",
                gap: 12,
                textAlign: "left",
                padding: "12px 12px",
                minHeight: 44,
                borderRadius: 6,
                border: `1px solid ${s.color}30`,
                background: "rgba(19,19,23,0.5)",
                cursor: clickable ? "pointer" : "default",
                color: "#ede6d3",
              }}
            >
              <span aria-hidden="true" style={{ color: s.color, fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                {s.glyph}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#ede6d3", fontWeight: 600 }}>
                    {p.label}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      letterSpacing: 0.3,
                      textTransform: "uppercase",
                      color: s.color,
                      fontWeight: 700,
                    }}
                  >
                    {s.label}
                  </span>
                  <span style={{ fontSize: 9, color: "#55503f" }}>·</span>
                  <span
                    style={{
                      fontSize: 9,
                      letterSpacing: 0.3,
                      textTransform: "uppercase",
                      color: "#8a8271",
                    }}
                    title="Evidence class"
                  >
                    {EVIDENCE_LABEL[p.evidenceClass]}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#c0b8a0", lineHeight: 1.5 }}>
                  {p.statement}
                </div>
                {p.evidence.length > 0 && (
                  <div style={{ fontSize: 10, color: "#8a8271", lineHeight: 1.5, marginTop: 6, fontStyle: "italic" }}>
                    {p.evidence.slice(0, 2).join(" · ")}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {vm.reason && (
        <div style={{ fontSize: 10, color: "#55503f", marginTop: 8, letterSpacing: 0.2, fontStyle: "italic" }}>
          {vm.reason}
        </div>
      )}
    </div>
  );
}

export default MirrorPanel;
