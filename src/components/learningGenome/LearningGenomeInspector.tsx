"use client";

import * as React from "react";

import { SemanticZoom, type SemanticZoomLevels } from "@/components/experience/SemanticZoom";
import type { LearningGenome, LearningDimensionKey } from "@/lib/learningGenome/selectLearningGenome";
import type { DrillPrescription } from "@/lib/learningGenome/prescribeDrill";
import type { MisreadMap, MisreadCategory } from "@/lib/learningGenome/selectMisreadMap";
import type { GenomeTrend } from "@/lib/learningGenome/genomeTrend";
import type { FocusStreak } from "@/lib/learningGenome/selectFocusStreak";
import type { RuleAdherenceStreak } from "@/lib/learningGenome/selectRuleAdherenceStreak";
import type { DayModelCoverage } from "@/lib/learningGenome/selectDayModelCoverage";
import type { DualSideGuardResult } from "@/lib/learningGenome/selectSameDayDualSideGuard";
import type { WeekMaturityDistribution } from "@/lib/learningGenome/learningGenomeToJson";

/**
 * LearningGenomeInspector — canon §9 full-view panel.
 *
 * Canon: "Your setup recognition is not the bottleneck. Management
 * after +2R is unstable." — a two-line diagnostic is not enough;
 * the trader needs to see the four-dimension breakdown, the drill
 * they're being prescribed, the misread map, and the trend arrows
 * in one look.
 *
 * This component is pure presentation. It never fetches, never
 * computes; all data flows in via props. Silent by design when
 * signals are absent (no fake progress bars from 0 sample size).
 */

export interface LearningGenomeInspectorProps {
  readonly genome: LearningGenome;
  readonly drill: DrillPrescription | undefined;
  readonly misread: MisreadMap;
  readonly trend: GenomeTrend;
  // v1.1.0 bundle additions — 2026-08-25 canon primitives (optional
  // so existing callers keep compiling; silent-when-absent render).
  readonly focusStreak?: FocusStreak;
  readonly ruleAdherenceStreak?: RuleAdherenceStreak;
  readonly dayModelCoverage?: DayModelCoverage;
  readonly dualSideGuard?: DualSideGuardResult;
  // v1.1.1 bundle addition — 2026-08-26 canon §6 week-level distribution.
  readonly weekMaturity?: WeekMaturityDistribution;
}

const DIMENSION_LABEL: Record<LearningDimensionKey, string> = {
  PERCEPTION: "Perception",
  REASONING: "Reasoning",
  PROCESS: "Process",
  TRANSFER: "Transfer",
};

const CATEGORY_LABEL: Record<MisreadCategory, string> = {
  MISSED_SETUP: "Missed setup",
  BROKE_PROCESS: "Broke process",
  POOR_MANAGEMENT: "Poor management",
  FULL_STOP_LOSS: "Full stop-loss",
  UNRESOLVED_PROCESS: "Unresolved",
  CLEAN: "Clean",
};

function formatScore(
  key: LearningDimensionKey,
  score: number | undefined,
): string {
  if (score === undefined) return "—";
  if (key === "TRANSFER") return `${score >= 0 ? "+" : ""}${score.toFixed(2)}R`;
  return `${Math.round(score * 100)}%`;
}

function directionGlyph(direction: string): string {
  switch (direction) {
    case "IMPROVING":
      return "▲";
    case "DEGRADING":
      return "▼";
    case "STABLE":
      return "•";
    case "NEW":
      return "★";
    case "LOST":
      return "?";
    default:
      return "";
  }
}

function directionColor(direction: string): string {
  switch (direction) {
    case "IMPROVING":
      return "text-wm-green";
    case "DEGRADING":
      return "text-wm-red";
    case "NEW":
      return "text-wm-gold";
    default:
      return "text-wm-text-muted";
  }
}

export function LearningGenomeInspector({
  genome,
  drill,
  misread,
  trend,
  focusStreak,
  ruleAdherenceStreak,
  dayModelCoverage,
  dualSideGuard,
  weekMaturity,
}: LearningGenomeInspectorProps): React.ReactElement {
  const dimensions: readonly {
    key: LearningDimensionKey;
    dim: LearningGenome["perception"];
    trend: GenomeTrend["perception"];
  }[] = [
    { key: "PERCEPTION", dim: genome.perception, trend: trend.perception },
    { key: "REASONING", dim: genome.reasoning, trend: trend.reasoning },
    { key: "PROCESS", dim: genome.process, trend: trend.process },
    { key: "TRANSFER", dim: genome.transfer, trend: trend.transfer },
  ];

  const misreadRows = (Object.keys(CATEGORY_LABEL) as MisreadCategory[])
    .filter((cat) => misread.counts[cat] > 0)
    .sort((a, b) => misread.counts[b] - misread.counts[a]);

  return (
    <section
      aria-label="Learning Genome inspector"
      className="border border-wm-gold/30 bg-wm-surface/60 rounded-lg p-3 space-y-3"
    >
      {/* Headline row */}
      <header className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-wm-gold uppercase tracking-wide">
          Learning Genome
        </span>
        {genome.headlineWeakness && (
          <span className="text-[11px] text-wm-text">
            {genome.headlineWeakness}
          </span>
        )}
        {!genome.headlineWeakness && (
          <span className="text-[11px] text-wm-text-muted italic">
            Not enough measured dimensions yet — log more trades with plan
            adherence + MFE/MAE to unlock the diagnostic.
          </span>
        )}
      </header>

      {/* canon §Phase 2 Experience Shell — the Learning Genome is the
          canonical dense-diagnostic panel and MUST route its body through
          the shared <SemanticZoom> primitive. L1 = 4-dim scorecard;
          L2 = + drill prescription; L3 = + misread + streaks/coverage.
          L4 intentionally unsupplied (canon §Silence Is A Feature — no
          raw-dump surface for LGI yet). Defaults to L3 to preserve the
          pre-Phase-2 baseline (the whole diagnostic shows when opened). */}
      {(() => {
        const dimGrid = (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {dimensions.map(({ key, dim, trend: t }) => (
          <div
            key={key}
            className="border border-wm-border rounded p-2 bg-wm-black/40"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-wm-text-muted">
                {DIMENSION_LABEL[key]}
              </span>
              <span className={`text-[10px] font-bold ${directionColor(t.direction)}`}>
                {directionGlyph(t.direction)}
              </span>
            </div>
            <div className="text-lg font-bold text-wm-text">
              {formatScore(key, dim.score)}
            </div>
            <div className="text-[9px] text-wm-text-dim">
              {dim.label ?? "no signal"}
            </div>
          </div>
            ))}
          </div>
        );

        const drillNode = drill ? (
          <div className="border border-wm-gold/40 bg-wm-gold/5 rounded p-2">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[10px] font-bold text-wm-gold uppercase tracking-wide">
                Drill · {drill.stage}
              </span>
              <span className="text-[10px] text-wm-text-muted">
                {DIMENSION_LABEL[drill.dimension]}
              </span>
            </div>
            <p className="text-[11px] text-wm-text leading-snug">{drill.drill}</p>
            <p className="text-[10px] text-wm-text-dim mt-1">Why: {drill.why}</p>
          </div>
        ) : null;

        const misreadNode = misread.sample_size > 0 ? (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-wm-text-muted mb-1">
              Misread Map · {misread.sample_size} trades
            </div>
            <div className="flex flex-wrap gap-1">
              {misreadRows.map((cat) => (
                <span
                  key={cat}
                  className={`px-1.5 py-0.5 text-[10px] rounded border ${
                    cat === misread.dominant
                      ? "border-wm-red/50 bg-wm-red/10 text-wm-red font-bold"
                      : cat === "CLEAN"
                      ? "border-wm-green/40 bg-wm-green/10 text-wm-green"
                      : "border-wm-border bg-wm-black/40 text-wm-text-muted"
                  }`}
                >
                  {CATEGORY_LABEL[cat]} {misread.counts[cat]}
                </span>
              ))}
            </div>
          </div>
        ) : null;

        const streaksNode = (focusStreak || ruleAdherenceStreak || dayModelCoverage || dualSideGuard || weekMaturity) ? (
          <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-wm-text-muted mb-1">
            Streaks &amp; Coverage
          </div>
          <div className="flex flex-wrap gap-1">
            {focusStreak && focusStreak.sample_size > 0 && (
              <span
                className={`px-1.5 py-0.5 text-[10px] rounded border ${
                  focusStreak.current >= 3
                    ? "border-wm-green/40 bg-wm-green/10 text-wm-green"
                    : "border-wm-border bg-wm-black/40 text-wm-text-muted"
                }`}
                title="Consecutive plan-followed trades (newest-first)"
              >
                Focus streak {focusStreak.current} · best {focusStreak.best}
              </span>
            )}
            {ruleAdherenceStreak && ruleAdherenceStreak.days_measured > 0 && (
              <span
                className={`px-1.5 py-0.5 text-[10px] rounded border ${
                  ruleAdherenceStreak.current >= 3
                    ? "border-wm-green/40 bg-wm-green/10 text-wm-green"
                    : "border-wm-border bg-wm-black/40 text-wm-text-muted"
                }`}
                title="Consecutive days with zero BROKE_RULES entries"
              >
                Rule days {ruleAdherenceStreak.current} · best {ruleAdherenceStreak.best}
              </span>
            )}
            {dayModelCoverage && dayModelCoverage.sample_size > 0 && (
              <span
                className={`px-1.5 py-0.5 text-[10px] rounded border ${
                  (dayModelCoverage.classification_rate ?? 0) >= 0.8
                    ? "border-wm-gold/40 bg-wm-gold/10 text-wm-gold"
                    : "border-wm-border bg-wm-black/40 text-wm-text-muted"
                }`}
                title="§3 Model 0/1/2 — classification honesty"
              >
                Models M0·{dayModelCoverage.m0} M1·{dayModelCoverage.m1} M2·{dayModelCoverage.m2}
                {dayModelCoverage.unclassified > 0 && ` · ?·${dayModelCoverage.unclassified}`}
              </span>
            )}
            {dualSideGuard && dualSideGuard.hazards.length > 0 && (
              <span
                className="px-1.5 py-0.5 text-[10px] rounded border border-wm-red/50 bg-wm-red/10 text-wm-red font-bold"
                title={dualSideGuard.hazards
                  .map((h) => `${h.date} ${h.symbol} L${h.long_side_count}/S${h.short_side_count}`)
                  .join("\n")}
              >
                Dual-side hazard · {dualSideGuard.hazards.length}
              </span>
            )}
            {dualSideGuard && dualSideGuard.hazards.length === 0 && dualSideGuard.days_scanned > 0 && (
              <span
                className="px-1.5 py-0.5 text-[10px] rounded border border-wm-green/40 bg-wm-green/10 text-wm-green"
                title="No unexempted same-day long+short pairs"
              >
                Dual-side clean
              </span>
            )}
            {weekMaturity && weekMaturity.classified_count > 0 && (
              <span
                className={`px-1.5 py-0.5 text-[10px] rounded border ${
                  // FULFILLED-dominant weeks read gold; WRONG-dominant reads red;
                  // otherwise neutral. Compares max class share.
                  (() => {
                    const total = weekMaturity.classified_count;
                    const f = weekMaturity.FULFILLED / total;
                    const w = weekMaturity.WRONG / total;
                    if (f >= 0.5) return "border-wm-gold/40 bg-wm-gold/10 text-wm-gold";
                    if (w >= 0.5) return "border-wm-red/50 bg-wm-red/10 text-wm-red font-bold";
                    return "border-wm-border bg-wm-black/40 text-wm-text-muted";
                  })()
                }`}
                title="§6 ANALYSIS MATURITY — per-trade fulfilled/active/early/wrong distribution"
              >
                Maturity F·{weekMaturity.FULFILLED} A·{weekMaturity.ACTIVE} E·{weekMaturity.EARLY} W·{weekMaturity.WRONG}
              </span>
            )}
            </div>
          </div>
        ) : null;

        const l1 = <>{dimGrid}</>;
        const l2 = <div className="space-y-3">{dimGrid}{drillNode}</div>;
        const l3 = (
          <div className="space-y-3">
            {dimGrid}
            {drillNode}
            {misreadNode}
            {streaksNode}
          </div>
        );

        const levels: SemanticZoomLevels = { 1: l1, 2: l2, 3: l3 };
        return (
          <SemanticZoom
            levels={levels}
            defaultLevel={3}
            ariaLabel="Learning Genome zoom"
          />
        );
      })()}
    </section>
  );
}
