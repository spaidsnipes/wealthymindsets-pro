"use client";
import * as React from "react";
import type { SessionEdgeVM, SessionEdgeMetric, SessionEdgeCell } from "@/lib/traderMemory/viewModels/selectSessionEdge";

/**
 * SessionEdgePanel — pure display for FRL E05 Session Heatmap.
 *
 * Renders a compact day-of-week × hour matrix. UNKNOWN cells stay
 * empty (never a fake 0). Best/worst cells labeled at the top when
 * present. Metric selector inline.
 */

const METRIC_LABELS: Record<SessionEdgeMetric, { label: string; unit: string; scheme: "diverging" | "monotone" }> = {
  avg_realized_r:    { label: "Avg R",       unit: "R",  scheme: "diverging" },
  win_rate:          { label: "Win rate",    unit: "%",  scheme: "monotone" },
  sample_count:      { label: "Sample",      unit: "",   scheme: "monotone" },
  process_adherence: { label: "Process",     unit: "/5", scheme: "monotone" },
};

const HOURS_TO_RENDER = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 – 19:00 UTC (market hours-ish)
const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function formatValue(metric: SessionEdgeMetric, v: number): string {
  switch (metric) {
    case "avg_realized_r": return v.toFixed(2);
    case "win_rate":       return `${Math.round(v * 100)}%`;
    case "sample_count":   return String(Math.round(v));
    case "process_adherence": return v.toFixed(1);
  }
}

function cellColor(v: number, metric: SessionEdgeMetric, minV: number, maxV: number): string {
  const cfg = METRIC_LABELS[metric];
  if (cfg.scheme === "diverging") {
    if (v > 0) {
      const norm = Math.min(1, v / Math.max(0.1, maxV));
      return `rgba(92,184,92,${0.15 + norm * 0.55})`;
    } else if (v < 0) {
      const norm = Math.min(1, Math.abs(v) / Math.max(0.1, Math.abs(minV)));
      return `rgba(192,90,74,${0.15 + norm * 0.55})`;
    }
    return "rgba(139,106,41,0.15)";
  }
  const range = maxV - minV || 1;
  const norm = (v - minV) / range;
  return `rgba(201,165,92,${0.1 + norm * 0.55})`;
}

export interface SessionEdgePanelProps {
  vm: SessionEdgeVM;
  onMetricChange?: (metric: SessionEdgeMetric) => void;
  onCellClick?: (cell: SessionEdgeCell) => void;
  className?: string;
}

export function SessionEdgePanel({ vm, onMetricChange, onCellClick, className }: SessionEdgePanelProps) {
  const cfg = METRIC_LABELS[vm.metric];
  const cellByKey = React.useMemo(() => {
    const m = new Map<string, SessionEdgeCell>();
    for (const c of vm.cells) m.set(`${c.dayLabel}|${c.hour}`, c);
    return m;
  }, [vm.cells]);

  const numericValues = vm.cells
    .map((c) => (typeof c.value === "number" ? (c.value as number) : null))
    .filter((v): v is number => v !== null);
  const minV = numericValues.length ? Math.min(...numericValues) : 0;
  const maxV = numericValues.length ? Math.max(...numericValues) : 1;

  return (
    <div
      role="region"
      aria-label="Session Edge — when this trader performs"
      className={["wm-session-edge", className ?? ""].join(" ")}
      style={{
        border: "1px solid rgba(139,106,41,0.35)",
        borderRadius: 10,
        background: "rgba(11,11,13,0.9)",
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800 }}>
          Session Edge
        </span>
        <span style={{ fontSize: 10, color: "#8a8271" }}>
          {vm.totalDecisions} decisions
        </span>
        {onMetricChange && (
          <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#8a8271" }}>
            metric
            <select
              value={vm.metric}
              onChange={(e) => onMetricChange(e.target.value as SessionEdgeMetric)}
              style={{
                background: "transparent",
                border: "1px solid rgba(139,106,41,0.35)",
                color: "#ede6d3",
                padding: "6px 8px",
                minHeight: 32,
                borderRadius: 4,
                fontSize: 11,
              }}
            >
              {Object.entries(METRIC_LABELS).map(([k, v]) => (
                <option key={k} value={k} style={{ background: "#0b0b0d" }}>{v.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {vm.reason && (
        <div style={{ fontSize: 11, color: "#8a8271", marginBottom: 8, fontStyle: "italic" }}>
          {vm.reason}
        </div>
      )}

      {vm.cells.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 10, color: "#ede6d3", width: "100%" }}>
            <thead>
              <tr>
                <th aria-hidden="true" style={{ padding: 4 }} />
                {HOURS_TO_RENDER.map((h) => (
                  <th
                    key={h}
                    scope="col"
                    style={{ padding: 4, fontWeight: 700, color: "#8a8271", letterSpacing: 0.3, fontSize: 9, minWidth: 36 }}
                  >
                    {h.toString().padStart(2, "0")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAY_ORDER.map((dow) => (
                <tr key={dow}>
                  <th
                    scope="row"
                    style={{ padding: 4, fontWeight: 700, color: "#8a8271", letterSpacing: 0.3, fontSize: 9, textAlign: "right", minWidth: 32 }}
                  >
                    {dow}
                  </th>
                  {HOURS_TO_RENDER.map((h) => {
                    const cell = cellByKey.get(`${dow}|${h}`);
                    if (!cell) {
                      return <td key={h} style={{ padding: 4, background: "rgba(19,19,23,0.3)", border: "1px solid rgba(139,106,41,0.1)" }} />;
                    }
                    const unknown = cell.value === "UNKNOWN";
                    const bg = unknown ? "rgba(85,80,63,0.15)" : cellColor(cell.value as number, vm.metric, minV, maxV);
                    const label = unknown
                      ? `${cell.dayLabel} ${cell.hourLabel}: value unknown, sample ${cell.sampleCount}`
                      : `${cell.dayLabel} ${cell.hourLabel}: ${cfg.label} ${formatValue(vm.metric, cell.value as number)}${cfg.unit}, sample ${cell.sampleCount}`;
                    const clickable = !!onCellClick;
                    return (
                      <td
                        key={h}
                        style={{ padding: 0, border: "1px solid rgba(139,106,41,0.15)" }}
                      >
                        <button
                          type="button"
                          aria-label={label}
                          title={label}
                          disabled={!clickable}
                          onClick={clickable ? () => onCellClick!(cell) : undefined}
                          style={{
                            width: "100%",
                            minHeight: 32,
                            padding: 4,
                            border: "none",
                            cursor: clickable ? "pointer" : "default",
                            background: bg,
                            color: "#ede6d3",
                            fontSize: 10,
                            fontVariantNumeric: "tabular-nums",
                            textAlign: "center",
                          }}
                        >
                          {unknown ? "?" : formatValue(vm.metric, cell.value as number)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(vm.bestCell || vm.worstCell) && (
        <div style={{ fontSize: 10, color: "#8a8271", marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {vm.bestCell && (
            <div>
              <span style={{ color: "#5cb85c" }}>↑ best:</span> {vm.bestCell.dayLabel} {vm.bestCell.hourLabel} · {formatValue(vm.metric, vm.bestCell.value as number)}{cfg.unit} (n={vm.bestCell.sampleCount})
            </div>
          )}
          {vm.worstCell && (
            <div>
              <span style={{ color: "#c05a4a" }}>↓ worst:</span> {vm.worstCell.dayLabel} {vm.worstCell.hourLabel} · {formatValue(vm.metric, vm.worstCell.value as number)}{cfg.unit} (n={vm.worstCell.sampleCount})
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SessionEdgePanel;
