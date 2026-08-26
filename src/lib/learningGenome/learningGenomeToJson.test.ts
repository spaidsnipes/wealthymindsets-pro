import { describe, it, expect } from "vitest";

import {
  buildLearningGenomeBundle,
  learningGenomeToJson,
  LEARNING_GENOME_JSON_SCHEMA_VERSION,
} from "./learningGenomeToJson";
import type { MisreadEntry } from "./selectMisreadMap";

function e(overrides: Partial<MisreadEntry>): MisreadEntry {
  return {
    date: "2026-08-25",
    result: "win",
    processQuality: "FOLLOWED_PLAN",
    ...overrides,
  };
}

const FIXED_TIMESTAMP = "2026-08-25T00:00:00.000Z";

describe("learningGenomeToJson — canon §Public Blessing exporter", () => {
  it("returns a stable schema version", () => {
    expect(LEARNING_GENOME_JSON_SCHEMA_VERSION).toBe("1.1.1");
  });

  it("produces a bundle with all four §9 primitives even on empty input", () => {
    const bundle = buildLearningGenomeBundle({
      currentEntries: [],
      priorEntries: [],
      currentDays: 7,
      priorDays: 7,
      exportedAt: FIXED_TIMESTAMP,
    });
    expect(bundle.version).toBe("1.1.1");
    expect(bundle.exportedAt).toBe(FIXED_TIMESTAMP);
    expect(bundle.window.current_sample_size).toBe(0);
    expect(bundle.window.prior_sample_size).toBe(0);
    expect(bundle.genome.perception.score).toBeUndefined();
    expect(bundle.drill).toBeUndefined();
    expect(bundle.misread.sample_size).toBe(0);
    expect(bundle.trend.perception.direction).toBe("UNMEASURED");
  });

  it("populates genome/drill/misread/trend when both windows have data", () => {
    // Prior week: perfect week (should give a strong baseline).
    // Current week: TRANSFER weakness (negative mean R).
    const bundle = buildLearningGenomeBundle({
      currentEntries: [
        e({ processQuality: "FOLLOWED_PLAN", realizedR: -1.5, mfeR: 2, maeR: -1.8 }),
        e({ processQuality: "FOLLOWED_PLAN", realizedR: -1.0, mfeR: 2, maeR: -1.5 }),
        e({ processQuality: "FOLLOWED_PLAN", realizedR: -2.0, mfeR: 2, maeR: -2.0 }),
      ],
      priorEntries: [
        e({ processQuality: "FOLLOWED_PLAN", realizedR: 2, mfeR: 2 }),
        e({ processQuality: "FOLLOWED_PLAN", realizedR: 1.5, mfeR: 2 }),
      ],
      currentDays: 7,
      priorDays: 7,
      exportedAt: FIXED_TIMESTAMP,
    });
    expect(bundle.genome.weakest).toBe("TRANSFER");
    expect(bundle.drill).toBeDefined();
    expect(bundle.drill!.dimension).toBe("TRANSFER");
    expect(bundle.drill!.stage).toBe("PROVE");
    // MISREAD: POOR_MANAGEMENT wins the priority (all three trades hit
    // MFE ≥ 1.5R but the trader gave back the runner — that fires
    // before FULL_STOP_LOSS in canonical priority order).
    expect(bundle.misread.dominant).toBe("POOR_MANAGEMENT");
    // TRANSFER degraded (prior was +1.75R mean, current is -1.5R mean).
    expect(bundle.trend.transfer.direction).toBe("DEGRADING");
    expect(bundle.trend.most_degraded).toBe("TRANSFER");
  });

  it("serializes to valid, round-trippable JSON", () => {
    const bundle = buildLearningGenomeBundle({
      currentEntries: [
        e({ processQuality: "FOLLOWED_PLAN", realizedR: 1, mfeR: 1 }),
      ],
      priorEntries: [],
      currentDays: 7,
      priorDays: 7,
      exportedAt: FIXED_TIMESTAMP,
    });
    const json = learningGenomeToJson(bundle);
    // Valid JSON — parses without throwing.
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe("1.1.1");
    expect(parsed.exportedAt).toBe(FIXED_TIMESTAMP);
    // Two-space indent per canon (matches journalToJson style).
    expect(json).toContain('"version": "1.1.1"');
  });

  it("deterministic — same inputs → identical JSON string", () => {
    const input = {
      currentEntries: [
        e({ processQuality: "FOLLOWED_PLAN", realizedR: 1, mfeR: 2 }),
        e({ processQuality: "BROKE_RULES" }),
      ],
      priorEntries: [
        e({ processQuality: "FOLLOWED_PLAN", realizedR: 2, mfeR: 2 }),
      ],
      currentDays: 7,
      priorDays: 7,
      exportedAt: FIXED_TIMESTAMP,
    };
    const j1 = learningGenomeToJson(buildLearningGenomeBundle(input));
    const j2 = learningGenomeToJson(buildLearningGenomeBundle(input));
    expect(j1).toBe(j2);
  });

  it("does not leak internal thresholds — Private Recipe boundary", () => {
    const bundle = buildLearningGenomeBundle({
      currentEntries: [
        e({ processQuality: "FOLLOWED_PLAN", realizedR: 1, mfeR: 3 }),
      ],
      priorEntries: [
        e({ processQuality: "FOLLOWED_PLAN", realizedR: 1, mfeR: 3 }),
      ],
      currentDays: 7,
      priorDays: 7,
      exportedAt: FIXED_TIMESTAMP,
    });
    const json = learningGenomeToJson(bundle);
    // These are internal-recipe values (see comments in
    // selectMisreadMap.ts + genomeTrend.ts). They must not appear as
    // documented keys in the exported bundle.
    expect(json).not.toContain('"TREND_STABLE_THRESHOLD"');
    expect(json).not.toContain('"POOR_MANAGEMENT_MFE_THRESHOLD"');
    expect(json).not.toContain('"FULL_STOP_LOSS_MAE_THRESHOLD"');
  });

  it("window provenance always present so consumers know the sample scope", () => {
    const bundle = buildLearningGenomeBundle({
      currentEntries: [],
      priorEntries: [],
      currentDays: 30,
      priorDays: 30,
      exportedAt: FIXED_TIMESTAMP,
    });
    expect(bundle.window.current_days).toBe(30);
    expect(bundle.window.prior_days).toBe(30);
  });

  it("v1.1.1 exposes week_maturity distribution across §6 verdicts", () => {
    const entries: MisreadEntry[] = [
      // FULFILLED — win with realizedR>0
      e({ result: "win", realizedR: 2.3, mfeR: 2.5, maeR: -0.2 }),
      // WRONG — plan-followed loss hitting stop
      e({ result: "loss", processQuality: "FOLLOWED_PLAN", realizedR: -1, maeR: -0.9 }),
      // ACTIVE — mfeR ≥ 1.5 progression evidence, loss w/o structural stop
      e({ result: "loss", processQuality: "FOLLOWED_PLAN", realizedR: -0.3, mfeR: 1.6, maeR: -0.5 }),
      // EARLY — no destination, no MFE evidence, no structural stop
      e({ result: "be", processQuality: "FOLLOWED_PLAN", realizedR: 0, mfeR: 0.5, maeR: -0.2 }),
      // INSUFFICIENT_INPUT — no mfeR/maeR at all → excluded
      e({ result: "be", processQuality: "FOLLOWED_PLAN" }),
    ];
    const bundle = buildLearningGenomeBundle({
      currentEntries: entries,
      priorEntries: [],
      currentDays: 7,
      priorDays: 7,
      exportedAt: FIXED_TIMESTAMP,
    });
    expect(bundle.week_maturity.FULFILLED).toBe(1);
    expect(bundle.week_maturity.WRONG).toBe(1);
    expect(bundle.week_maturity.classified_count).toBeGreaterThanOrEqual(2);
    expect(bundle.week_maturity.sample_size).toBe(5);
  });

  it("v1.1.1 week_maturity returns zeros on empty input (no NaN, no fake distribution)", () => {
    const bundle = buildLearningGenomeBundle({
      currentEntries: [],
      priorEntries: [],
      currentDays: 7,
      priorDays: 7,
      exportedAt: FIXED_TIMESTAMP,
    });
    expect(bundle.week_maturity).toEqual({
      FULFILLED: 0,
      ACTIVE: 0,
      EARLY: 0,
      WRONG: 0,
      classified_count: 0,
      sample_size: 0,
    });
  });
});
