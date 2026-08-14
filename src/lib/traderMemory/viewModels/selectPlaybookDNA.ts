/**
 * selectPlaybookDNA — FRL F05 Playbook DNA selector.
 *
 * Founder doctrine (§F05):
 *   Playbook DNA: playbooks used, playbook versions, maturity, sample
 *   count, quality bands, failure signatures, best context, weak contexts.
 *   No arbitrary '30 trades = validated' unless company doctrine defines
 *   that threshold — maturity thresholds are policy-driven.
 *
 * Emits per-playbook DNA cards. Never fabricates maturity from small
 * samples — 'MATURING' below N, 'ESTABLISHED' at N+, 'HIGH_CONFIDENCE'
 * at 3N+ where N is caller-supplied `maturityThreshold`.
 */

import type { DecisionMemorySnapshot } from "./selectProcessLandscape";

export type PlaybookMaturity =
  | "EMBRYONIC"        // < threshold/2 decisions
  | "MATURING"         // >= threshold/2, < threshold
  | "ESTABLISHED"      // >= threshold
  | "HIGH_CONFIDENCE"; // >= threshold * 3

export interface PlaybookVersionStats {
  readonly version: number;
  readonly sampleCount: number;
  readonly avgRealizedR: number | "UNKNOWN";
  readonly winRate: number | "UNKNOWN";
}

export interface PlaybookDNAEntry {
  readonly playbookId: string;
  readonly sampleCount: number;
  readonly closedCount: number;
  readonly reviewedCount: number;
  readonly maturity: PlaybookMaturity;
  readonly avgRealizedR: number | "UNKNOWN";
  readonly winRate: number | "UNKNOWN";
  readonly avgProcessAdherence: number | "UNKNOWN";
  readonly versions: readonly PlaybookVersionStats[];
  /** Best-performing context bucket (session + direction) for this playbook. */
  readonly bestContext: { label: string; avgR: number; sampleCount: number } | null;
  /** Worst-performing context bucket (session + direction). */
  readonly weakContext: { label: string; avgR: number; sampleCount: number } | null;
  /** Descriptor of most common failure — reason of losers when threshold met. */
  readonly failureSignature: string | null;
  readonly decisionIds: readonly string[];
}

export interface PlaybookDNAVM {
  readonly ownerId: string;
  readonly evaluatedAt: number;
  readonly playbooks: readonly PlaybookDNAEntry[];
  readonly totalPlaybooks: number;
  readonly reason?: string;
  readonly maturityThreshold: number;
}

export interface PlaybookDNAInput {
  readonly ownerId: string;
  readonly decisions: readonly DecisionMemorySnapshot[];
  readonly nowMs: number;
  /** Sample count at which a playbook becomes ESTABLISHED. Default 20 —
   *  policy-driven per Founder doctrine, callers can override. */
  readonly maturityThreshold?: number;
  /** Min sample per context bucket to consider best/weak. Default 5. */
  readonly contextThreshold?: number;
}

function classify(n: number, threshold: number): PlaybookMaturity {
  if (n >= threshold * 3) return "HIGH_CONFIDENCE";
  if (n >= threshold) return "ESTABLISHED";
  if (n >= threshold / 2) return "MATURING";
  return "EMBRYONIC";
}

export function selectPlaybookDNA(input: PlaybookDNAInput): PlaybookDNAVM {
  const scoped = input.decisions.filter((d) => d.ownerId === input.ownerId);
  const threshold = input.maturityThreshold ?? 20;
  const contextThreshold = input.contextThreshold ?? 5;

  if (scoped.length === 0) {
    return {
      ownerId: input.ownerId,
      evaluatedAt: input.nowMs,
      playbooks: [],
      totalPlaybooks: 0,
      reason: "No decisions in scope — no playbook DNA to surface.",
      maturityThreshold: threshold,
    };
  }

  // Group by playbookId
  const byPlaybook = new Map<string, DecisionMemorySnapshot[]>();
  for (const d of scoped) {
    const arr = byPlaybook.get(d.playbookId) ?? [];
    arr.push(d);
    byPlaybook.set(d.playbookId, arr);
  }

  const entries: PlaybookDNAEntry[] = [];
  for (const [playbookId, items] of byPlaybook) {
    const closed = items.filter((d) => d.outcome != null);
    const reviewed = items.filter((d) => d.review != null);
    const closedThreshold = Math.min(closed.length, threshold);

    const wins = closed.filter((d) => d.outcome!.realizedR > 0).length;
    const winRate: PlaybookDNAEntry["winRate"] =
      closed.length >= contextThreshold ? wins / closed.length : "UNKNOWN";
    const avgRealizedR: PlaybookDNAEntry["avgRealizedR"] =
      closed.length >= contextThreshold
        ? Number((closed.reduce((s, d) => s + d.outcome!.realizedR, 0) / closed.length).toFixed(3))
        : "UNKNOWN";
    const avgProcessAdherence: PlaybookDNAEntry["avgProcessAdherence"] =
      reviewed.length >= contextThreshold
        ? Number((reviewed.reduce((s, d) => s + d.review!.processAdherence, 0) / reviewed.length).toFixed(2))
        : "UNKNOWN";

    // Version breakdown
    const byVersion = new Map<number, DecisionMemorySnapshot[]>();
    for (const d of items) {
      const arr = byVersion.get(d.playbookVersion) ?? [];
      arr.push(d);
      byVersion.set(d.playbookVersion, arr);
    }
    const versions: PlaybookVersionStats[] = [];
    for (const [ver, verItems] of byVersion) {
      const verClosed = verItems.filter((d) => d.outcome != null);
      const verWins = verClosed.filter((d) => d.outcome!.realizedR > 0).length;
      versions.push({
        version: ver,
        sampleCount: verItems.length,
        avgRealizedR: verClosed.length >= contextThreshold
          ? Number((verClosed.reduce((s, d) => s + d.outcome!.realizedR, 0) / verClosed.length).toFixed(3))
          : "UNKNOWN",
        winRate: verClosed.length >= contextThreshold
          ? verWins / verClosed.length
          : "UNKNOWN",
      });
    }
    versions.sort((a, b) => a.version - b.version);

    // Context buckets: session × direction
    type ContextRow = { label: string; sample: number; totalR: number };
    const ctx = new Map<string, ContextRow>();
    for (const d of items) {
      if (!d.outcome) continue;
      const dir = d.plan.action.includes("LONG") ? "LONG" : d.plan.action.includes("SHORT") ? "SHORT" : "flat";
      const sess = d.marketStateSummary.session ?? "any";
      const key = `${dir}|${sess}`;
      const row = ctx.get(key) ?? { label: `${dir} · ${sess}`, sample: 0, totalR: 0 };
      row.sample += 1;
      row.totalR += d.outcome.realizedR;
      ctx.set(key, row);
    }
    const ctxWithAvg = Array.from(ctx.values())
      .filter((r) => r.sample >= contextThreshold)
      .map((r) => ({ label: r.label, avgR: r.totalR / r.sample, sampleCount: r.sample }));
    const sortedCtx = [...ctxWithAvg].sort((a, b) => b.avgR - a.avgR);
    const bestContext = sortedCtx[0] ?? null;
    const weakContext = sortedCtx[sortedCtx.length - 1] && sortedCtx.length > 1 ? sortedCtx[sortedCtx.length - 1] : null;

    // Failure signature: most-common outcome reason for LOSERS (when >= contextThreshold losers)
    const losers = closed.filter((d) => d.outcome!.realizedR < 0);
    let failureSignature: string | null = null;
    if (losers.length >= contextThreshold) {
      const reasonCounts = new Map<string, number>();
      for (const d of losers) reasonCounts.set(d.outcome!.reason, (reasonCounts.get(d.outcome!.reason) ?? 0) + 1);
      const [topReason, topCount] = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      failureSignature = `${topCount}/${losers.length} losses via ${topReason.toLowerCase()}`;
    }

    entries.push({
      playbookId,
      sampleCount: items.length,
      closedCount: closed.length,
      reviewedCount: reviewed.length,
      maturity: classify(items.length, threshold),
      avgRealizedR,
      winRate,
      avgProcessAdherence,
      versions,
      bestContext: bestContext ? { label: bestContext.label, avgR: Number(bestContext.avgR.toFixed(3)), sampleCount: bestContext.sampleCount } : null,
      weakContext: weakContext ? { label: weakContext.label, avgR: Number(weakContext.avgR.toFixed(3)), sampleCount: weakContext.sampleCount } : null,
      failureSignature,
      decisionIds: items.map((d) => d.decisionId),
    });
  }

  // Sort playbooks by sample size desc (most-used first)
  entries.sort((a, b) => b.sampleCount - a.sampleCount);

  return {
    ownerId: input.ownerId,
    evaluatedAt: input.nowMs,
    playbooks: entries,
    totalPlaybooks: entries.length,
    maturityThreshold: threshold,
  };
}
