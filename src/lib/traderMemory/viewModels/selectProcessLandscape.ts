/**
 * selectProcessLandscape — the Founder's "put it all together" loop as a
 * pure selector.
 *
 * The loop (from Founder 2026-08-13 directive):
 *
 *   Heatmap discovers pattern → Memory proves examples →
 *   Replay explains it → Mirror helps interpret it →
 *   Drill trains it → Profile records improvement.
 *
 * This selector composes existing data sources (journal, decision memory,
 * playbooks) into a "Process Landscape" that Profile UI can render as a
 * heatmap AND that any cell click can hand back to Memory/Replay/Mirror/
 * Drill for the next stage of the loop.
 *
 * Pure function — no I/O, no store dependency. Takes plain inputs, returns
 * a landscape with cells + drilldown pointers. UNKNOWN is a valid cell
 * value; a cell with insufficient sample size returns UNKNOWN, not zero.
 */

import type { CanonicalMarketState } from "../../marketData/canonicalMarketState";

// ── Shared truth types ─────────────────────────────────────────────────

export type LandscapeAxis =
  | "time_of_day"
  | "day_of_week"
  | "session"           // PRE / REGULAR / POST / OVERNIGHT
  | "trade_number"      // 1st trade of day, 2nd, ...
  | "playbook"          // playbook id
  | "regime"            // TREND / BALANCE / TRANSITION
  | "direction"         // LONG / SHORT
  | "location"          // location quality bucket
  | "volatility"        // LOW / NORMAL / HIGH / SHOCK
  | "outcome"           // WIN / LOSS / BREAKEVEN
  | "adherence"         // followed rules? Y/N
  | "external_influence"; // self-reported influence during session

export type LandscapeMetric =
  | "rule_adherence"          // % of trades where rules followed
  | "execution_quality"       // 1-5 avg
  | "process_adherence"       // 1-5 avg
  | "market_opportunity"      // 1-5 avg (was the market itself an opportunity?)
  | "playbook_match"          // 1-5 avg (did chosen playbook fit market?)
  | "risk_quality"            // 1-5 avg
  | "outcome_r"               // realized R aggregate
  | "sample_count"            // # of decisions in this cell
  | "unknown_rate";           // % of dimensions unresolved when decision made

export interface DecisionMemorySnapshot {
  readonly decisionId: string;
  readonly capturedAt: number;
  readonly ownerId: string;
  readonly sessionIdentity: string;

  // Frozen at decision time
  readonly marketStateSummary: {
    readonly regime: string | null;
    readonly direction: string | null;
    readonly location: string | null;
    readonly volatility: string | null;
    readonly session: string | null;
  };
  readonly playbookId: string;
  readonly playbookVersion: number;
  readonly plan: {
    readonly action: "ENTER_LONG" | "ENTER_SHORT" | "WAIT" | "NO_TRADE" | "CLOSE_LONG" | "CLOSE_SHORT";
    readonly expectedR: number;
  };
  readonly ruleAdherenceAtDecision: boolean;
  readonly externalInfluenceFlagged: boolean;
  readonly tradeNumberInSession: number;

  // Attached after
  readonly outcome?: {
    readonly closedAt: number;
    readonly realizedR: number;
    readonly reason: "TARGET" | "STOP" | "MANUAL" | "TIME" | "INVALIDATION";
  };
  readonly review?: {
    readonly reviewedAt: number;
    readonly marketOpportunityQuality: 1 | 2 | 3 | 4 | 5;
    readonly playbookMatch: 1 | 2 | 3 | 4 | 5;
    readonly riskQuality: 1 | 2 | 3 | 4 | 5;
    readonly executionQuality: 1 | 2 | 3 | 4 | 5;
    readonly processAdherence: 1 | 2 | 3 | 4 | 5;
  };
}

export interface LandscapeCell {
  readonly rowKey: string;                // human-readable row label
  readonly colKey: string;                // human-readable col label
  readonly rowValue: string | number;     // raw value for filtering
  readonly colValue: string | number;
  readonly metric: LandscapeMetric;
  readonly value: number | "UNKNOWN";     // never 0 as stand-in for UNKNOWN
  readonly confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  readonly sampleCount: number;
  readonly decisionIds: readonly string[]; // enables Heatmap→Memory drill
  readonly reason?: string;                // when UNKNOWN, why
}

export interface LandscapeVM {
  readonly rowAxis: LandscapeAxis;
  readonly colAxis: LandscapeAxis;
  readonly metric: LandscapeMetric;
  readonly cells: readonly LandscapeCell[];
  readonly totalDecisions: number;
  readonly windowStartMs: number;
  readonly windowEndMs: number;
  readonly resolution: "RESOLVED" | "PARTIAL" | "UNKNOWN";
  readonly reason?: string;
  /** Minimum sample count required for a cell to be RESOLVED (else UNKNOWN). */
  readonly sampleThreshold: number;
}

export interface SelectProcessLandscapeInput {
  readonly decisions: readonly DecisionMemorySnapshot[];
  readonly rowAxis: LandscapeAxis;
  readonly colAxis: LandscapeAxis;
  readonly metric: LandscapeMetric;
  /** Time window filter (inclusive). Defaults to all decisions. */
  readonly windowStartMs?: number;
  readonly windowEndMs?: number;
  /** Min sample count per cell for RESOLVED status. Default 3. */
  readonly sampleThreshold?: number;
  /** Optional filter by ownerId — never cross owners. */
  readonly ownerId?: string;
}

// ── Axis key extractors ─────────────────────────────────────────────────

const AXIS_EXTRACTORS: Record<LandscapeAxis, (d: DecisionMemorySnapshot) => { value: string | number; label: string }> = {
  time_of_day: (d) => {
    const hour = new Date(d.capturedAt).getUTCHours();
    return { value: hour, label: `${hour.toString().padStart(2, "0")}:00 UTC` };
  },
  day_of_week: (d) => {
    const day = new Date(d.capturedAt).getUTCDay();
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return { value: day, label: names[day] };
  },
  session: (d) => {
    const s = d.marketStateSummary.session ?? "UNKNOWN";
    return { value: s, label: s };
  },
  trade_number: (d) => {
    // Bucket into groups: 1, 2-3, 4-6, 7+
    const n = d.tradeNumberInSession;
    const bucket = n === 1 ? "1st" : n <= 3 ? "2nd–3rd" : n <= 6 ? "4th–6th" : "7th+";
    return { value: bucket, label: bucket };
  },
  playbook: (d) => ({ value: d.playbookId, label: d.playbookId }),
  regime: (d) => {
    const r = d.marketStateSummary.regime ?? "UNKNOWN";
    return { value: r, label: r };
  },
  direction: (d) => {
    const direction = d.plan.action.includes("LONG") ? "LONG" : d.plan.action.includes("SHORT") ? "SHORT" : "NONE";
    return { value: direction, label: direction };
  },
  location: (d) => {
    const l = d.marketStateSummary.location ?? "UNKNOWN";
    return { value: l, label: l };
  },
  volatility: (d) => {
    const v = d.marketStateSummary.volatility ?? "UNKNOWN";
    return { value: v, label: v };
  },
  outcome: (d) => {
    if (!d.outcome) return { value: "PENDING", label: "Pending" };
    if (d.outcome.realizedR > 0.1) return { value: "WIN", label: "Win" };
    if (d.outcome.realizedR < -0.1) return { value: "LOSS", label: "Loss" };
    return { value: "BREAKEVEN", label: "Breakeven" };
  },
  adherence: (d) => ({
    value: d.ruleAdherenceAtDecision ? "Y" : "N",
    label: d.ruleAdherenceAtDecision ? "Followed" : "Violated",
  }),
  external_influence: (d) => ({
    value: d.externalInfluenceFlagged ? "Y" : "N",
    label: d.externalInfluenceFlagged ? "Flagged" : "None",
  }),
};

// ── Metric aggregators ──────────────────────────────────────────────────

function aggregateMetric(
  metric: LandscapeMetric,
  decisions: readonly DecisionMemorySnapshot[],
  sampleThreshold: number,
): { value: number | "UNKNOWN"; confidence: LandscapeCell["confidence"]; reason?: string } {
  if (decisions.length === 0) {
    return { value: "UNKNOWN", confidence: "UNKNOWN", reason: "No decisions in this cell" };
  }
  if (decisions.length < sampleThreshold) {
    return {
      value: "UNKNOWN",
      confidence: "LOW",
      reason: `Only ${decisions.length} decision(s), below threshold ${sampleThreshold}`,
    };
  }

  const confidence: LandscapeCell["confidence"] =
    decisions.length >= sampleThreshold * 3 ? "HIGH" : decisions.length >= sampleThreshold ? "MEDIUM" : "LOW";

  switch (metric) {
    case "sample_count":
      return { value: decisions.length, confidence: "HIGH" };
    case "rule_adherence": {
      const followed = decisions.filter((d) => d.ruleAdherenceAtDecision).length;
      return { value: followed / decisions.length, confidence };
    }
    case "unknown_rate": {
      // Portion of decisions where >=2 dimensions were unresolved at decision time
      const withUnknowns = decisions.filter((d) => {
        const sum = [
          d.marketStateSummary.regime,
          d.marketStateSummary.direction,
          d.marketStateSummary.location,
          d.marketStateSummary.volatility,
          d.marketStateSummary.session,
        ].filter((v) => v == null || v === "UNKNOWN").length;
        return sum >= 2;
      }).length;
      return { value: withUnknowns / decisions.length, confidence };
    }
    case "outcome_r": {
      const closed = decisions.filter((d): d is DecisionMemorySnapshot & { outcome: NonNullable<DecisionMemorySnapshot["outcome"]> } => d.outcome != null);
      if (closed.length < sampleThreshold) {
        return { value: "UNKNOWN", confidence: "LOW", reason: `Only ${closed.length} closed decision(s)` };
      }
      const total = closed.reduce((s, d) => s + d.outcome.realizedR, 0);
      return { value: total / closed.length, confidence };
    }
    case "execution_quality":
    case "process_adherence":
    case "market_opportunity":
    case "playbook_match":
    case "risk_quality": {
      const key = ({
        execution_quality: "executionQuality",
        process_adherence: "processAdherence",
        market_opportunity: "marketOpportunityQuality",
        playbook_match: "playbookMatch",
        risk_quality: "riskQuality",
      } as const)[metric];
      const reviewed = decisions.filter((d): d is DecisionMemorySnapshot & { review: NonNullable<DecisionMemorySnapshot["review"]> } => d.review != null);
      if (reviewed.length < sampleThreshold) {
        return { value: "UNKNOWN", confidence: "LOW", reason: `Only ${reviewed.length} reviewed decision(s)` };
      }
      const total = reviewed.reduce((s, d) => s + d.review[key], 0);
      return { value: total / reviewed.length, confidence };
    }
  }
}

// ── Main selector ───────────────────────────────────────────────────────

export function selectProcessLandscape(input: SelectProcessLandscapeInput): LandscapeVM {
  const sampleThreshold = input.sampleThreshold ?? 3;
  const windowStartMs = input.windowStartMs ?? 0;
  const windowEndMs = input.windowEndMs ?? Number.POSITIVE_INFINITY;

  // Filter decisions to owner + window
  const scoped = input.decisions.filter(
    (d) =>
      (input.ownerId == null || d.ownerId === input.ownerId) &&
      d.capturedAt >= windowStartMs &&
      d.capturedAt <= windowEndMs,
  );

  if (scoped.length === 0) {
    return {
      rowAxis: input.rowAxis,
      colAxis: input.colAxis,
      metric: input.metric,
      cells: [],
      totalDecisions: 0,
      windowStartMs: windowStartMs === 0 ? 0 : windowStartMs,
      windowEndMs: windowEndMs === Number.POSITIVE_INFINITY ? 0 : windowEndMs,
      resolution: "UNKNOWN",
      reason: "No decisions in scope (owner + window)",
      sampleThreshold,
    };
  }

  const rowFn = AXIS_EXTRACTORS[input.rowAxis];
  const colFn = AXIS_EXTRACTORS[input.colAxis];

  // Bucket decisions by (row, col)
  const buckets = new Map<string, { rowKey: string; colKey: string; rowValue: string | number; colValue: string | number; decisions: DecisionMemorySnapshot[] }>();
  for (const d of scoped) {
    const r = rowFn(d);
    const c = colFn(d);
    const bucketId = `${String(r.value)}||${String(c.value)}`;
    let bucket = buckets.get(bucketId);
    if (!bucket) {
      bucket = { rowKey: r.label, colKey: c.label, rowValue: r.value, colValue: c.value, decisions: [] };
      buckets.set(bucketId, bucket);
    }
    bucket.decisions.push(d);
  }

  // Build cells
  const cells: LandscapeCell[] = [];
  for (const bucket of buckets.values()) {
    const agg = aggregateMetric(input.metric, bucket.decisions, sampleThreshold);
    cells.push({
      rowKey: bucket.rowKey,
      colKey: bucket.colKey,
      rowValue: bucket.rowValue,
      colValue: bucket.colValue,
      metric: input.metric,
      value: agg.value,
      confidence: agg.confidence,
      sampleCount: bucket.decisions.length,
      decisionIds: bucket.decisions.map((d) => d.decisionId),
      reason: agg.reason,
    });
  }

  // Overall resolution
  const resolvedCells = cells.filter((c) => c.value !== "UNKNOWN").length;
  const resolution: LandscapeVM["resolution"] =
    cells.length === 0
      ? "UNKNOWN"
      : resolvedCells === 0
        ? "UNKNOWN"
        : resolvedCells === cells.length
          ? "RESOLVED"
          : "PARTIAL";

  return {
    rowAxis: input.rowAxis,
    colAxis: input.colAxis,
    metric: input.metric,
    cells,
    totalDecisions: scoped.length,
    windowStartMs: windowStartMs === 0 ? Math.min(...scoped.map((d) => d.capturedAt)) : windowStartMs,
    windowEndMs: windowEndMs === Number.POSITIVE_INFINITY ? Math.max(...scoped.map((d) => d.capturedAt)) : windowEndMs,
    resolution,
    reason: resolution === "UNKNOWN" ? "No cells reached sample threshold" : undefined,
    sampleThreshold,
  };
}

// ── Loop bridge — Heatmap cell → Memory examples ────────────────────────

/**
 * Given a LandscapeCell, return the DecisionMemorySnapshots it references.
 * This is the "Heatmap discovers pattern → Memory proves examples" bridge.
 * UI passes the cell + full decision store; this returns the concrete
 * decisions that produced the pattern.
 */
export function selectMemoryExamplesForCell(
  cell: LandscapeCell,
  allDecisions: readonly DecisionMemorySnapshot[],
): readonly DecisionMemorySnapshot[] {
  const ids = new Set(cell.decisionIds);
  return allDecisions.filter((d) => ids.has(d.decisionId));
}
