/**
 * selectPersonalEdge — VS from FRL D10.
 *
 * Founder doctrine (§10):
 *   "The purpose is not to tell the user they are special. It is to
 *    objectively discover: When does this specific trader actually
 *    perform well?"
 *
 *   "Personal Edge should eventually identify things such as: 'Your
 *    strongest execution occurs on TSLA during X regime when Y location
 *    and Z aggression conditions coexist.' But only after sufficient
 *    sample size and uncertainty handling."
 *
 *   "Never make statistical certainty from three trades."
 *
 * This selector emits `personalEdgeSummary`:
 *   - overall metrics (trades / win rate / avg R / process quality)
 *   - top-3 STRENGTH contexts (playbook × direction × session)
 *   - top-3 WATCH contexts (worst-performing where sample >= threshold)
 *   - explicit `resolution`: UNKNOWN below sample threshold — NEVER
 *     fabricates edge from tiny sample
 *
 * Pure, deterministic, owner-scoped by caller.
 */

import type { DecisionMemorySnapshot } from "./selectProcessLandscape";

export type PersonalEdgeResolution = "RESOLVED" | "PARTIAL" | "UNKNOWN";

export interface ContextBucket {
  readonly key: string;
  readonly label: string;
  readonly sampleCount: number;
  readonly wins: number;
  readonly losses: number;
  readonly winRate: number | "UNKNOWN";
  readonly avgRealizedR: number | "UNKNOWN";
  readonly avgProcessAdherence: number | "UNKNOWN";
  readonly decisionIds: readonly string[];
}

export interface PersonalEdgeVM {
  readonly resolution: PersonalEdgeResolution;
  readonly ownerId: string;
  readonly evaluatedAt: number;

  readonly totalDecisions: number;
  readonly reviewedCount: number;
  readonly closedCount: number;

  readonly overallWinRate: number | "UNKNOWN";
  readonly overallAvgR: number | "UNKNOWN";
  readonly overallProcessAdherence: number | "UNKNOWN";

  /** Contexts where this trader appears strongest (highest avgR × sample). */
  readonly topStrengths: readonly ContextBucket[];
  /** Contexts where this trader appears weakest (worst avgR, still >= threshold). */
  readonly topWatch: readonly ContextBucket[];

  readonly sampleThreshold: number;
  readonly headline: string;
  readonly reason?: string;
}

export interface PersonalEdgeInput {
  readonly ownerId: string;
  readonly decisions: readonly DecisionMemorySnapshot[];
  readonly nowMs: number;
  /** Min bucket sample for RESOLVED. Default 5 (Founder: never certainty from 3). */
  readonly sampleThreshold?: number;
  /** Min total decisions for overall metrics to be RESOLVED. Default 10. */
  readonly overallThreshold?: number;
  /** Top-N bucket count returned. Default 3. */
  readonly topN?: number;
}

function bucketKey(d: DecisionMemorySnapshot): string {
  const dir = d.plan.action.includes("LONG") ? "L" : d.plan.action.includes("SHORT") ? "S" : "N";
  const sess = d.marketStateSummary.session ?? "any";
  return `${d.playbookId}|${dir}|${sess}`;
}

function bucketLabel(d: DecisionMemorySnapshot): string {
  const dir = d.plan.action.includes("LONG") ? "LONG" : d.plan.action.includes("SHORT") ? "SHORT" : "flat";
  const sess = d.marketStateSummary.session ?? "any session";
  return `${d.playbookId} · ${dir} · ${sess}`;
}

export function selectPersonalEdge(input: PersonalEdgeInput): PersonalEdgeVM {
  const scoped = input.decisions.filter((d) => d.ownerId === input.ownerId);
  const threshold = input.sampleThreshold ?? 5;
  const overallThreshold = input.overallThreshold ?? 10;
  const topN = input.topN ?? 3;

  if (scoped.length === 0) {
    return {
      resolution: "UNKNOWN",
      ownerId: input.ownerId,
      evaluatedAt: input.nowMs,
      totalDecisions: 0,
      reviewedCount: 0,
      closedCount: 0,
      overallWinRate: "UNKNOWN",
      overallAvgR: "UNKNOWN",
      overallProcessAdherence: "UNKNOWN",
      topStrengths: [],
      topWatch: [],
      sampleThreshold: threshold,
      headline: "No decisions in scope — Personal Edge cannot be measured yet.",
      reason: "Owner has no decisions in the store.",
    };
  }

  // Overall metrics
  const closed = scoped.filter((d): d is DecisionMemorySnapshot & { outcome: NonNullable<DecisionMemorySnapshot["outcome"]> } => d.outcome != null);
  const reviewed = scoped.filter((d): d is DecisionMemorySnapshot & { review: NonNullable<DecisionMemorySnapshot["review"]> } => d.review != null);
  const wins = closed.filter((d) => d.outcome.realizedR > 0).length;
  const overallWinRate = closed.length >= overallThreshold ? wins / closed.length : "UNKNOWN";
  const overallAvgR = closed.length >= overallThreshold
    ? Number((closed.reduce((s, d) => s + d.outcome.realizedR, 0) / closed.length).toFixed(3))
    : "UNKNOWN";
  const overallProcessAdherence = reviewed.length >= overallThreshold
    ? Number((reviewed.reduce((s, d) => s + d.review.processAdherence, 0) / reviewed.length).toFixed(2))
    : "UNKNOWN";

  // Bucket by (playbook × direction × session)
  const buckets = new Map<string, DecisionMemorySnapshot[]>();
  for (const d of scoped) {
    const key = bucketKey(d);
    const arr = buckets.get(key) ?? [];
    arr.push(d);
    buckets.set(key, arr);
  }

  // Build ContextBuckets for those meeting threshold
  const bucketList: ContextBucket[] = [];
  for (const [key, items] of buckets) {
    if (items.length < threshold) continue;
    const bClosed = items.filter((d) => d.outcome != null);
    const bReviewed = items.filter((d) => d.review != null);
    const bWins = bClosed.filter((d) => d.outcome!.realizedR > 0).length;
    const bLosses = bClosed.filter((d) => d.outcome!.realizedR < 0).length;
    const winRate: ContextBucket["winRate"] = bClosed.length >= threshold ? bWins / bClosed.length : "UNKNOWN";
    const avgRealizedR: ContextBucket["avgRealizedR"] = bClosed.length >= threshold
      ? Number((bClosed.reduce((s, d) => s + d.outcome!.realizedR, 0) / bClosed.length).toFixed(3))
      : "UNKNOWN";
    const avgProcess: ContextBucket["avgProcessAdherence"] = bReviewed.length >= threshold
      ? Number((bReviewed.reduce((s, d) => s + d.review!.processAdherence, 0) / bReviewed.length).toFixed(2))
      : "UNKNOWN";
    bucketList.push({
      key,
      label: bucketLabel(items[0]),
      sampleCount: items.length,
      wins: bWins,
      losses: bLosses,
      winRate,
      avgRealizedR,
      avgProcessAdherence: avgProcess,
      decisionIds: items.map((d) => d.decisionId),
    });
  }

  // Rank strengths by (avgR × sample) — bigger avgR × more evidence wins
  const withNumR = bucketList.filter((b) => typeof b.avgRealizedR === "number");
  const rankScore = (b: ContextBucket) =>
    typeof b.avgRealizedR === "number" ? b.avgRealizedR * Math.log(1 + b.sampleCount) : 0;
  const sortedByStrength = [...withNumR].sort((a, b) => rankScore(b) - rankScore(a));
  const topStrengths = sortedByStrength.filter((b) => (b.avgRealizedR as number) > 0).slice(0, topN);
  const topWatch = sortedByStrength.filter((b) => (b.avgRealizedR as number) < 0).slice(-topN).reverse();

  // Resolution + headline
  let resolution: PersonalEdgeResolution;
  let headline: string;
  let reason: string | undefined;

  if (bucketList.length === 0) {
    resolution = "UNKNOWN";
    headline = `${scoped.length} decision(s) — no context has reached the ${threshold}-decision sample threshold.`;
    reason = `Personal Edge requires ${threshold}+ decisions per context bucket (playbook × direction × session). Never certainty from small samples.`;
  } else if (topStrengths.length === 0 && topWatch.length === 0) {
    resolution = "PARTIAL";
    headline = `${bucketList.length} context(s) evaluated but none clearly strong or watch-worthy.`;
    reason = "Buckets have adequate sample size but avgR near zero — no clear edge to surface.";
  } else if (overallAvgR === "UNKNOWN") {
    resolution = "PARTIAL";
    headline = `${topStrengths.length} strength context(s), ${topWatch.length} watch context(s).`;
    reason = `Overall metrics not yet ${overallThreshold} decisions — bucket-level edge is directional only.`;
  } else {
    resolution = "RESOLVED";
    headline = `${topStrengths.length} strength · ${topWatch.length} watch · overall avgR ${overallAvgR}`;
  }

  return {
    resolution,
    ownerId: input.ownerId,
    evaluatedAt: input.nowMs,
    totalDecisions: scoped.length,
    reviewedCount: reviewed.length,
    closedCount: closed.length,
    overallWinRate,
    overallAvgR,
    overallProcessAdherence,
    topStrengths,
    topWatch,
    sampleThreshold: threshold,
    headline,
    reason,
  };
}
