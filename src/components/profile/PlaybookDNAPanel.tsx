"use client";
import * as React from "react";
import type { PlaybookDNAVM, PlaybookDNAEntry, PlaybookMaturity } from "@/lib/traderMemory/viewModels/selectPlaybookDNA";

/**
 * PlaybookDNAPanel — Profile Growth surface for FRL F05.
 *
 * Shows per-playbook DNA cards: maturity (embryonic/maturing/established/
 * high-confidence), sample count, avgR, win rate, best/weak context,
 * failure signature. UNKNOWN metrics render as '?' — never 0.
 */

const MATURITY_STYLES: Record<PlaybookMaturity, { color: string; label: string; glyph: string }> = {
  EMBRYONIC:       { color: "#55503f", label: "Embryonic",       glyph: "○" },
  MATURING:        { color: "#c9a55c", label: "Maturing",        glyph: "◐" },
  ESTABLISHED:     { color: "#5cb85c", label: "Established",     glyph: "●" },
  HIGH_CONFIDENCE: { color: "#8b6a29", label: "High confidence", glyph: "◈" },
};

export function PlaybookDNAPanel({ vm, onPlaybookClick }: { vm: PlaybookDNAVM; onPlaybookClick?: (entry: PlaybookDNAEntry) => void }) {
  if (vm.playbooks.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Playbook DNA"
      style={{
        border: "1px solid rgba(139,106,41,0.35)",
        borderRadius: 10,
        background: "rgba(11,11,13,0.9)",
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800 }}>
          Playbook DNA
        </span>
        <span style={{ fontSize: 10, color: "#8a8271", marginLeft: "auto" }}>
          {vm.totalPlaybooks} playbook{vm.totalPlaybooks === 1 ? "" : "s"} · maturity at {vm.maturityThreshold} decisions
        </span>
      </div>

      <div role="list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {vm.playbooks.map((p) => {
          const m = MATURITY_STYLES[p.maturity];
          const clickable = !!onPlaybookClick;
          const avgRText = typeof p.avgRealizedR === "number" ? `${p.avgRealizedR.toFixed(2)}R` : "?";
          const winRateText = typeof p.winRate === "number" ? `${Math.round(p.winRate * 100)}%` : "?";
          return (
            <button
              key={p.playbookId}
              type="button"
              role="listitem"
              aria-label={`Playbook ${p.playbookId}: ${m.label}, ${p.sampleCount} decisions, avg ${avgRText}, win rate ${winRateText}`}
              disabled={!clickable}
              onClick={clickable ? () => onPlaybookClick!(p) : undefined}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                textAlign: "left",
                padding: 12,
                minHeight: 44,
                borderRadius: 8,
                border: `1px solid ${m.color}30`,
                background: "rgba(19,19,23,0.5)",
                cursor: clickable ? "pointer" : "default",
                color: "#ede6d3",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span aria-hidden="true" style={{ color: m.color, fontSize: 14, fontWeight: 700 }}>
                  {m.glyph}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 100 }}>
                  {p.playbookId}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                    color: m.color,
                    fontWeight: 700,
                  }}
                >
                  {m.label}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                <Stat label="Sample" value={p.sampleCount.toString()} />
                <Stat label="Avg R" value={avgRText} color={typeof p.avgRealizedR === "number" && p.avgRealizedR > 0 ? "#5cb85c" : typeof p.avgRealizedR === "number" && p.avgRealizedR < 0 ? "#c05a4a" : undefined} />
                <Stat label="Win rate" value={winRateText} />
              </div>

              {(p.bestContext || p.weakContext || p.failureSignature) && (
                <div style={{ fontSize: 10, color: "#8a8271", lineHeight: 1.5, paddingTop: 6, borderTop: "1px solid rgba(139,106,41,0.15)" }}>
                  {p.bestContext && (
                    <div>
                      <span style={{ color: "#5cb85c" }}>↑ best:</span> {p.bestContext.label} · {p.bestContext.avgR.toFixed(2)}R (n={p.bestContext.sampleCount})
                    </div>
                  )}
                  {p.weakContext && (
                    <div>
                      <span style={{ color: "#c05a4a" }}>↓ weak:</span> {p.weakContext.label} · {p.weakContext.avgR.toFixed(2)}R (n={p.weakContext.sampleCount})
                    </div>
                  )}
                  {p.failureSignature && (
                    <div>
                      <span style={{ color: "#c9a55c" }}>failure:</span> {p.failureSignature}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: "6px 8px", background: "rgba(11,11,13,0.4)", borderRadius: 4 }}>
      <div style={{ fontSize: 8, letterSpacing: 0.32, textTransform: "uppercase", color: "#8a8271", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color ?? "#ede6d3", marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

export default PlaybookDNAPanel;
