import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

import { LearningGenomeInspector } from "./LearningGenomeInspector";
import type { LearningGenome } from "@/lib/learningGenome/selectLearningGenome";
import type { MisreadMap } from "@/lib/learningGenome/selectMisreadMap";
import type { GenomeTrend } from "@/lib/learningGenome/genomeTrend";

/**
 * Presentation tests — assert that the inspector renders the right
 * copy under the right data conditions. Kept lean: this component
 * is pure presentation, so we assert visible text + a11y label
 * rather than DOM structure.
 */

const EMPTY_GENOME: LearningGenome = {
  perception: { score: undefined, sample_size: 0, label: undefined },
  reasoning: { score: undefined, sample_size: 0, label: undefined },
  process: { score: undefined, sample_size: 0, label: undefined },
  transfer: { score: undefined, sample_size: 0, label: undefined },
  strongest: undefined,
  weakest: undefined,
  headlineWeakness: undefined,
};

const EMPTY_MISREAD: MisreadMap = {
  counts: {
    MISSED_SETUP: 0,
    BROKE_PROCESS: 0,
    POOR_MANAGEMENT: 0,
    FULL_STOP_LOSS: 0,
    UNRESOLVED_PROCESS: 0,
    CLEAN: 0,
  },
  sample_size: 0,
  dominant: undefined,
};

const EMPTY_TREND: GenomeTrend = {
  perception: { direction: "UNMEASURED", delta: undefined, current_score: undefined, prior_score: undefined },
  reasoning: { direction: "UNMEASURED", delta: undefined, current_score: undefined, prior_score: undefined },
  process: { direction: "UNMEASURED", delta: undefined, current_score: undefined, prior_score: undefined },
  transfer: { direction: "UNMEASURED", delta: undefined, current_score: undefined, prior_score: undefined },
  most_improved: undefined,
  most_degraded: undefined,
};

describe("LearningGenomeInspector — canon §9 presentation", () => {
  it("shows the honest empty-state copy when nothing is measured", () => {
    const html = renderToStaticMarkup(
      React.createElement(LearningGenomeInspector, {
        genome: EMPTY_GENOME,
        drill: undefined,
        misread: EMPTY_MISREAD,
        trend: EMPTY_TREND,
      }),
    );
    expect(html).toContain("Learning Genome");
    expect(html).toContain("Not enough measured dimensions");
    // Every dimension renders with an "—" placeholder + "no signal" label.
    expect(html).toContain("—");
    expect(html).toContain("no signal");
    // Drill section is silent when drill is undefined.
    expect(html).not.toContain("Drill ·");
    // Misread section is silent when sample_size is 0.
    expect(html).not.toContain("Misread Map ·");
  });

  it("renders headline weakness, drill card, and misread rows when populated", () => {
    const genome: LearningGenome = {
      perception: { score: 0.9, sample_size: 10, label: "Process resolved on 90% of 10 trades" },
      reasoning: { score: 0.6, sample_size: 8, label: "Plan followed on 5/8 resolved trades" },
      process: { score: 0.4, sample_size: 6, label: "Capture 40% of MFE across 6 trades" },
      transfer: { score: -0.3, sample_size: 5, label: "Mean -0.30R across 5 plan-followed trades" },
      strongest: "PERCEPTION",
      weakest: "TRANSFER",
      headlineWeakness: "Setup recognition is not the bottleneck. Live R capture is the weakest link.",
    };
    const drill = {
      dimension: "TRANSFER" as const,
      stage: "PROVE" as const,
      drill: "Drop live size to 1/3 for the next 5 plan-followed trades.",
      why: "Mean -0.30R across 5 plan-followed trades",
    };
    const misread: MisreadMap = {
      counts: {
        MISSED_SETUP: 1,
        BROKE_PROCESS: 2,
        POOR_MANAGEMENT: 3,
        FULL_STOP_LOSS: 0,
        UNRESOLVED_PROCESS: 0,
        CLEAN: 4,
      },
      sample_size: 10,
      dominant: "CLEAN",
    };
    const trend: GenomeTrend = {
      perception: { direction: "IMPROVING", delta: 0.1, current_score: 0.9, prior_score: 0.8 },
      reasoning: { direction: "STABLE", delta: 0.02, current_score: 0.6, prior_score: 0.58 },
      process: { direction: "DEGRADING", delta: -0.2, current_score: 0.4, prior_score: 0.6 },
      transfer: { direction: "NEW", delta: undefined, current_score: -0.3, prior_score: undefined },
      most_improved: "PERCEPTION",
      most_degraded: "PROCESS",
    };
    const html = renderToStaticMarkup(
      React.createElement(LearningGenomeInspector, { genome, drill, misread, trend }),
    );
    expect(html).toContain("Setup recognition is not the bottleneck");
    expect(html).toContain("Drill ·");
    expect(html).toContain("PROVE");
    expect(html).toContain("Drop live size to 1/3");
    expect(html).toContain("Misread Map · 10 trades");
    expect(html).toContain("Poor management 3");
    expect(html).toContain("Clean 4");
  });

  it("renders v1.1.0 Streaks & Coverage chips when signals are supplied", () => {
    const html = renderToStaticMarkup(
      React.createElement(LearningGenomeInspector, {
        genome: EMPTY_GENOME,
        drill: undefined,
        misread: EMPTY_MISREAD,
        trend: EMPTY_TREND,
        focusStreak: { current: 4, best: 7, sample_size: 12 },
        ruleAdherenceStreak: { current: 3, best: 5, days_measured: 6, newest_day: "2026-08-26" },
        dayModelCoverage: {
          m0: 1,
          m1: 5,
          m2: 2,
          unclassified: 1,
          sample_size: 9,
          classification_rate: 8 / 9,
          m0_share: 1 / 8,
          m1_share: 5 / 8,
          m2_share: 2 / 8,
        },
        dualSideGuard: {
          pairs: [],
          hazards: [
            {
              date: "2026-08-26",
              symbol: "TSLA",
              long_side_count: 1,
              short_side_count: 1,
              exempted: false,
              exempt_reason: null,
            },
          ],
          days_scanned: 1,
          symbols_scanned: 1,
          sample_size: 2,
        },
      }),
    );
    expect(html).toContain("Streaks &amp; Coverage");
    expect(html).toContain("Focus streak 4");
    expect(html).toContain("best 7");
    expect(html).toContain("Rule days 3");
    expect(html).toContain("M0·1");
    expect(html).toContain("M1·5");
    expect(html).toContain("M2·2");
    expect(html).toContain("Dual-side hazard · 1");
  });

  it("stays silent on Streaks & Coverage when no signals supplied", () => {
    const html = renderToStaticMarkup(
      React.createElement(LearningGenomeInspector, {
        genome: EMPTY_GENOME,
        drill: undefined,
        misread: EMPTY_MISREAD,
        trend: EMPTY_TREND,
      }),
    );
    expect(html).not.toContain("Streaks &amp; Coverage");
    expect(html).not.toContain("Dual-side");
  });

  it("renders Dual-side clean chip when guard scanned days but found no hazards", () => {
    const html = renderToStaticMarkup(
      React.createElement(LearningGenomeInspector, {
        genome: EMPTY_GENOME,
        drill: undefined,
        misread: EMPTY_MISREAD,
        trend: EMPTY_TREND,
        dualSideGuard: {
          pairs: [],
          hazards: [],
          days_scanned: 3,
          symbols_scanned: 4,
          sample_size: 12,
        },
      }),
    );
    expect(html).toContain("Dual-side clean");
    expect(html).not.toContain("hazard ·");
  });

  it("formats TRANSFER score as R, not percent (canon: R is bounded, % is not)", () => {
    const genome: LearningGenome = {
      ...EMPTY_GENOME,
      transfer: { score: 1.25, sample_size: 5, label: "" },
      strongest: "TRANSFER",
      weakest: "TRANSFER",
      headlineWeakness: undefined,
    };
    const html = renderToStaticMarkup(
      React.createElement(LearningGenomeInspector, {
        genome,
        drill: undefined,
        misread: EMPTY_MISREAD,
        trend: EMPTY_TREND,
      }),
    );
    expect(html).toContain("+1.25R");
    expect(html).not.toContain("125%"); // must not treat R as a percentage
  });
});
