/**
 * selectSessionEdge — FRL E05 heatmap family: WHEN does this trader
 * behaviorally change?
 *
 * Founder doctrine (§E05):
 *   Session Map — axes: time of day, day of week, session, market phase.
 *   Metrics: volatility, volume, setup frequency, process quality, outcome.
 *   Do not conflate correlation with prediction.
 *
 * Emits per-cell time-slice performance. Never fabricates edge from tiny
 * samples — cells below threshold return UNKNOWN, never 0.
 */

import type { DecisionMemorySnapshot } from "./selectProcessLandscape";

export type SessionEdgeMetric =
  | "avg_realized_r"     // outcome
  | "win_rate"           // outcome
  | "sample_count"       // decision frequency
  | "process_adherence"; // review

export interface SessionEdgeCell {
  readonly dayOfWeek: number;      // 0..6 (Sun..Sat)
  readonly dayLabel: string;       // "Mon", "Tue", ...
  readonly hour: number;           // 0..23 UTC
  readonly hourLabel: string;      // "09:00"
  readonly sampleCount: number;
  readonly value: number | "UNKNOWN";
  readonly decisionIds: readonly string[];
}

export interface SessionEdgeVM {
  readonly ownerId: string;
  readonly evaluatedAt: number;
  readonly metric: SessionEdgeMetric;
  readonly cells: readonly SessionEdgeCell[];
  readonly totalDecisions: number;
  readonly bestCell: SessionEdgeCell | null;
  readonly worstCell: SessionEdgeCell | null;
  readonly sampleThreshold: number;
  readonly reason?: string;
}

export interface SessionEdgeInput {
  readonly ownerId: string;
  readonly decisions: readonly DecisionMemorySnapshot[];
  readonly nowMs: number;
  readonly metric: SessionEdgeMetric;
  /** Min decisions per (day×hour) cell for RESOLVED value. Default 3. */
  readonly sampleThreshold?: number;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function aggregate(
  decisions: readonly DecisionMemorySnapshot[],
  metric: SessionEdgeMetric,
  threshold: number,
): { value: number | "UNKNOWN"; sample: number } {
  if (decisions.length === 0) return { value: "UNKNOWN", sample: 0 };
  const closed = decisions.filter((d) => d.outcome != null);
  const reviewed = decisions.filter((d) => d.review != null);
  switch (metric) {
    case "sample_count":
      return { value: decisions.length, sample: decisions.length };
    case "avg_realized_r": {
      if (closed.length < threshold) return { value: "UNKNOWN", sample: closed.length };
      const total = closed.reduce((s, d) => s + d.outcome!.realizedR, 0);
      return { value: Number((total / closed.length).toFixed(3)), sample: closed.length };
    }
    case "win_rate": {
      if (closed.length < threshold) return { value: "UNKNOWN", sample: closed.length };
      const wins = closed.filter((d) => d.outcome!.realizedR > 0).length;
      return { value: Number((wins / closed.length).toFixed(3)), sample: closed.length };
    }
    case "process_adherence": {
      if (reviewed.length < threshold) return { value: "UNKNOWN", sample: reviewed.length };
      const total = reviewed.reduce((s, d) => s + d.review!.processAdherence, 0);
      return { value: Number((total / reviewed.length).toFixed(2)), sample: reviewed.length };
    }
  }
}

export function selectSessionEdge(input: SessionEdgeInput): SessionEdgeVM {
  const scoped = input.decisions.filter((d) => d.ownerId === input.ownerId);
  const threshold = input.sampleThreshold ?? 3;

  if (scoped.length === 0) {
    return {
      ownerId: input.ownerId,
      evaluatedAt: input.nowMs,
      metric: input.metric,
      cells: [],
      totalDecisions: 0,
      bestCell: null,
      worstCell: null,
      sampleThreshold: threshold,
      reason: "No decisions in scope — Session Edge cannot be evaluated.",
    };
  }

  // Bucket by day-of-week × hour
  type Bucket = { dow: number; hour: number; decisions: DecisionMemorySnapshot[] };
  const buckets = new Map<string, Bucket>();
  for (const d of scoped) {
    const dt = new Date(d.capturedAt);
    if (Number.isNaN(dt.getTime())) continue;
    const dow = dt.getUTCDay();
    const hour = dt.getUTCHours();
    const key = `${dow}|${hour}`;
    const b = buckets.get(key) ?? { dow, hour, decisions: [] };
    b.decisions.push(d);
    buckets.set(key, b);
  }

  const cells: SessionEdgeCell[] = [];
  for (const b of buckets.values()) {
    const agg = aggregate(b.decisions, input.metric, threshold);
    cells.push({
      dayOfWeek: b.dow,
      dayLabel: DAY_LABELS[b.dow] ?? String(b.dow),
      hour: b.hour,
      hourLabel: `${b.hour.toString().padStart(2, "0")}:00`,
      sampleCount: agg.sample,
      value: agg.value,
      decisionIds: b.decisions.map((d) => d.decisionId),
    });
  }
  // Sort cells for stable output
  cells.sort((a, b) => (a.dayOfWeek - b.dayOfWeek) || (a.hour - b.hour));

  const numericCells = cells.filter((c) => typeof c.value === "number");
  const sortedByValue = [...numericCells].sort((a, b) => (b.value as number) - (a.value as number));
  const bestCell = sortedByValue[0] ?? null;
  const worstCell = sortedByValue[sortedByValue.length - 1] && sortedByValue.length > 1 ? sortedByValue[sortedByValue.length - 1] : null;

  return {
    ownerId: input.ownerId,
    evaluatedAt: input.nowMs,
    metric: input.metric,
    cells,
    totalDecisions: scoped.length,
    bestCell,
    worstCell,
    sampleThreshold: threshold,
    reason: numericCells.length === 0
      ? `${scoped.length} decision(s) but no (day × hour) bucket has reached the ${threshold}-decision sample threshold.`
      : undefined,
  };
}
