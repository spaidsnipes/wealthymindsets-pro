"use client";
import * as React from "react";
import Panel from "@/components/ui/Panel";
import Heatmap, { type HeatmapCell } from "@/components/ui/Heatmap";
import Pill from "@/components/ui/Pill";
import {
  selectProcessLandscape,
  selectMemoryExamplesForCell,
  type DecisionMemorySnapshot,
  type LandscapeAxis,
  type LandscapeMetric,
  type LandscapeCell,
  type LandscapeVM,
} from "@/lib/traderMemory/viewModels/selectProcessLandscape";

/**
 * ProcessLandscape — the "Your Process Landscape" surface from the
 * Founder's 2026-08-13 directive.
 *
 * Composes selectProcessLandscape (pure) → Heatmap primitive → onCellClick
 * → selectMemoryExamplesForCell → parent's onDrilldown callback.
 *
 * This is Profile's answer to the question:
 *   "Where does my process actually break down or excel?"
 *
 * The loop:
 *   Heatmap discovers pattern (this component)
 *     → Memory proves examples (onDrilldown handles routing)
 *     → Replay explains it (parent renders when a decision is selected)
 *     → Mirror interprets (parent's Mirror module)
 *     → Drill trains it (Academy/Puzzle module)
 *     → Profile records improvement (Profile update on drill completion)
 *
 * Pure display: takes decisions + axis config as props. Parent owns the
 * data source (usually a hook subscribed to the Decision Memory store).
 */

const AXIS_LABELS: Record<LandscapeAxis, string> = {
  time_of_day: "Time of day",
  day_of_week: "Day of week",
  session: "Session",
  trade_number: "Trade #",
  playbook: "Playbook",
  regime: "Regime",
  direction: "Direction",
  location: "Location quality",
  volatility: "Volatility",
  outcome: "Outcome",
  adherence: "Rule adherence",
  external_influence: "External influence",
};

const METRIC_LABELS: Record<LandscapeMetric, { label: string; unit: string; scheme: "monotone" | "diverging" }> = {
  rule_adherence:       { label: "Rule adherence",        unit: "%",  scheme: "monotone" },
  execution_quality:    { label: "Execution quality",     unit: "/5", scheme: "monotone" },
  process_adherence:    { label: "Process adherence",     unit: "/5", scheme: "monotone" },
  market_opportunity:   { label: "Market opportunity",    unit: "/5", scheme: "monotone" },
  playbook_match:       { label: "Playbook match",        unit: "/5", scheme: "monotone" },
  risk_quality:         { label: "Risk quality",          unit: "/5", scheme: "monotone" },
  outcome_r:            { label: "Realized R",            unit: "R",  scheme: "diverging" },
  sample_count:         { label: "Decision count",        unit: "",   scheme: "monotone" },
  unknown_rate:         { label: "Decisions w/ UNKNOWNs", unit: "%",  scheme: "monotone" },
};

const formatValue = (metric: LandscapeMetric) => (v: number | "UNKNOWN"): string => {
  if (v === "UNKNOWN") return "?";
  switch (metric) {
    case "rule_adherence":
    case "unknown_rate":
      return `${Math.round(v * 100)}%`;
    case "outcome_r":
      return v.toFixed(2);
    case "sample_count":
      return String(Math.round(v));
    default:
      return v.toFixed(1);
  }
};

export interface ProcessLandscapeProps {
  /** All decision memory snapshots for the viewing user. */
  decisions: readonly DecisionMemorySnapshot[];
  /** Owner id — never cross-owner. */
  ownerId: string;
  /** Initial axis config. Defaults to time_of_day × playbook. */
  initialRowAxis?: LandscapeAxis;
  initialColAxis?: LandscapeAxis;
  initialMetric?: LandscapeMetric;
  /** Time window (ms). Defaults to all decisions. */
  windowStartMs?: number;
  windowEndMs?: number;
  /** Min sample per cell for RESOLVED. Default 3. */
  sampleThreshold?: number;
  /** Called when a cell is clicked with its decision examples — enables
   *  the Heatmap → Memory bridge from the Founder's loop. Parent routes
   *  to Replay / Mirror / Drill as appropriate. */
  onDrilldown?: (cell: LandscapeCell, examples: readonly DecisionMemorySnapshot[]) => void;
  className?: string;
}

export function ProcessLandscape({
  decisions,
  ownerId,
  initialRowAxis = "time_of_day",
  initialColAxis = "playbook",
  initialMetric = "process_adherence",
  windowStartMs,
  windowEndMs,
  sampleThreshold = 3,
  onDrilldown,
  className,
}: ProcessLandscapeProps) {
  const [rowAxis, setRowAxis] = React.useState<LandscapeAxis>(initialRowAxis);
  const [colAxis, setColAxis] = React.useState<LandscapeAxis>(initialColAxis);
  const [metric, setMetric] = React.useState<LandscapeMetric>(initialMetric);

  const vm: LandscapeVM = React.useMemo(
    () =>
      selectProcessLandscape({
        decisions,
        ownerId,
        rowAxis,
        colAxis,
        metric,
        windowStartMs,
        windowEndMs,
        sampleThreshold,
      }),
    [decisions, ownerId, rowAxis, colAxis, metric, windowStartMs, windowEndMs, sampleThreshold],
  );

  const heatmapCells: HeatmapCell[] = React.useMemo(
    () =>
      vm.cells.map((c) => ({
        rowKey: c.rowKey,
        colKey: c.colKey,
        value: c.value,
        confidence: c.confidence,
        sampleCount: c.sampleCount,
        drilldownRef: c.decisionIds,
        reason: c.reason,
      })),
    [vm.cells],
  );

  const metricConfig = METRIC_LABELS[metric];

  const handleCellClick = React.useCallback(
    (hCell: HeatmapCell) => {
      // Map back to the LandscapeCell (with typed decisionIds) — the
      // HeatmapCell.drilldownRef IS the decisionIds array we stored above.
      const original = vm.cells.find((c) => c.rowKey === hCell.rowKey && c.colKey === hCell.colKey);
      if (!original || !onDrilldown) return;
      const examples = selectMemoryExamplesForCell(original, decisions);
      onDrilldown(original, examples);
    },
    [vm.cells, decisions, onDrilldown],
  );

  const resolutionPillState =
    vm.resolution === "RESOLVED" ? "aligned" :
    vm.resolution === "PARTIAL"  ? "warning" :
                                    "unknown";

  return (
    <Panel
      label="Your Process Landscape"
      sublabel="Heatmap discovers pattern → click a cell to see the actual decisions"
      className={className}
      halo
    >
      {/* Controls row — axis + metric selectors, no card-in-card nesting */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-[11px]">
        <label className="flex items-center gap-1.5 text-[color:var(--wm-text-2,#8a8271)]">
          <span className="uppercase tracking-[0.18em]">Rows</span>
          <select
            value={rowAxis}
            onChange={(e) => setRowAxis(e.target.value as LandscapeAxis)}
            className="bg-transparent border border-[color:var(--wm-gold-hair,#6d5220)] text-[color:var(--wm-text-1,#ede6d3)] px-1.5 py-0.5 rounded text-[11px]"
          >
            {Object.entries(AXIS_LABELS).map(([key, label]) => (
              <option key={key} value={key} className="bg-[color:var(--wm-ob-1,#0b0b0d)]">{label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-[color:var(--wm-text-2,#8a8271)]">
          <span className="uppercase tracking-[0.18em]">Cols</span>
          <select
            value={colAxis}
            onChange={(e) => setColAxis(e.target.value as LandscapeAxis)}
            className="bg-transparent border border-[color:var(--wm-gold-hair,#6d5220)] text-[color:var(--wm-text-1,#ede6d3)] px-1.5 py-0.5 rounded text-[11px]"
          >
            {Object.entries(AXIS_LABELS).map(([key, label]) => (
              <option key={key} value={key} className="bg-[color:var(--wm-ob-1,#0b0b0d)]">{label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-[color:var(--wm-text-2,#8a8271)]">
          <span className="uppercase tracking-[0.18em]">Metric</span>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as LandscapeMetric)}
            className="bg-transparent border border-[color:var(--wm-gold-hair,#6d5220)] text-[color:var(--wm-text-1,#ede6d3)] px-1.5 py-0.5 rounded text-[11px]"
          >
            {Object.entries(METRIC_LABELS).map(([key, cfg]) => (
              <option key={key} value={key} className="bg-[color:var(--wm-ob-1,#0b0b0d)]">{cfg.label}</option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2">
          <Pill state={resolutionPillState}>
            {vm.resolution === "RESOLVED" ? "Full coverage"
             : vm.resolution === "PARTIAL"  ? "Partial coverage"
                                            : "Unknown"}
          </Pill>
          <span className="text-[10px] text-[color:var(--wm-text-3,#55503f)] tracking-[0.14em] uppercase">
            {vm.totalDecisions} decisions · min sample {vm.sampleThreshold}
          </span>
        </div>
      </div>

      {/* Show reason for UNKNOWN outcome, if applicable */}
      {vm.resolution === "UNKNOWN" && vm.reason && (
        <div className="text-[12px] text-[color:var(--wm-text-2,#8a8271)] italic mb-3">
          {vm.reason}
        </div>
      )}

      <Heatmap
        cells={heatmapCells}
        scheme={metricConfig.scheme}
        format={formatValue(metric)}
        onCellClick={onDrilldown ? handleCellClick : undefined}
        ariaLabel={`Process landscape: ${AXIS_LABELS[rowAxis]} by ${AXIS_LABELS[colAxis]}, colored by ${metricConfig.label}`}
        legendLabel={metricConfig.label}
        legendUnit={metricConfig.unit}
      />

      {onDrilldown && (
        <div className="mt-3 text-[10px] text-[color:var(--wm-text-3,#55503f)] tracking-[0.14em] uppercase">
          click any cell → open the actual decisions that produced this pattern
        </div>
      )}
    </Panel>
  );
}

export default ProcessLandscape;
