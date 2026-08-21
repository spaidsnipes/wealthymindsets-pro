import { describe, it, expect } from "vitest";
import { resolveTradeRules, describeTradeRuleOverrides } from "./tradeRules";

function ruleBy(rules: readonly { trigger: string; threshold?: number; windowMs?: number }[], trigger: string) {
  return rules.find((r) => r.trigger === trigger)!;
}

describe("resolveTradeRules — configurable D06 thresholds", () => {
  it("returns the founder defaults unchanged when no overrides", () => {
    const rules = resolveTradeRules();
    expect(ruleBy(rules, "MAX_TRADES_PER_SESSION").threshold).toBe(3);
    expect(ruleBy(rules, "MAX_LOSSES_PER_SESSION").threshold).toBe(2);
  });

  it("applies valid threshold overrides", () => {
    const rules = resolveTradeRules({ maxTradesPerSession: 5, maxLossesPerSession: 4, minRR: 2 });
    expect(ruleBy(rules, "MAX_TRADES_PER_SESSION").threshold).toBe(5);
    expect(ruleBy(rules, "MAX_LOSSES_PER_SESSION").threshold).toBe(4);
    expect(ruleBy(rules, "MIN_RR").threshold).toBe(2);
  });

  it("applies valid time-window overrides (ms)", () => {
    const rules = resolveTradeRules({ reentryCooldownMs: 120_000, postLossCooldownMs: 600_000 });
    expect(ruleBy(rules, "REENTRY_COOLDOWN").windowMs).toBe(120_000);
    expect(ruleBy(rules, "COOLDOWN_AFTER_LOSS").windowMs).toBe(600_000);
  });

  it("drawdown accepts a negative value, rejects non-negative", () => {
    expect(ruleBy(resolveTradeRules({ maxDailyDrawdownR: -5 }), "MAX_DAILY_DRAWDOWN").threshold).toBe(-5);
    // non-negative → ignored, default kept (-3)
    expect(ruleBy(resolveTradeRules({ maxDailyDrawdownR: 2 }), "MAX_DAILY_DRAWDOWN").threshold).toBe(-3);
  });

  it("ignores invalid overrides and keeps the default (never a nonsensical threshold)", () => {
    const rules = resolveTradeRules({
      maxTradesPerSession: 0,        // not positive
      maxLossesPerSession: 2.5,      // not integer
      minRR: -1,                     // not positive
      reentryCooldownMs: Number.NaN, // not finite
    });
    expect(ruleBy(rules, "MAX_TRADES_PER_SESSION").threshold).toBe(3);
    expect(ruleBy(rules, "MAX_LOSSES_PER_SESSION").threshold).toBe(2);
    expect(ruleBy(rules, "MIN_RR").threshold).toBe(1.5);
    expect(ruleBy(rules, "REENTRY_COOLDOWN").windowMs).toBe(5 * 60_000);
  });

  it("preserves the full rule set + identities (cannot delete a HARD rule via overrides)", () => {
    const base = resolveTradeRules();
    const tuned = resolveTradeRules({ maxTradesPerSession: 9 });
    expect(tuned.map((r) => r.id).sort()).toEqual(base.map((r) => r.id).sort());
    expect(tuned.find((r) => r.id === "max-trades")!.kind).toBe("HARD");
  });

  it("is pure — identical overrides, identical output", () => {
    const o = { maxTradesPerSession: 7 };
    expect(resolveTradeRules(o)).toEqual(resolveTradeRules(o));
  });
});

describe("describeTradeRuleOverrides", () => {
  it("separates applied from ignored overrides", () => {
    const d = describeTradeRuleOverrides({ maxTradesPerSession: 5, maxLossesPerSession: 0, reentryCooldownMs: 60_000 });
    expect(d.applied).toContain("maxTradesPerSession");
    expect(d.applied).toContain("reentryCooldownMs");
    expect(d.ignored).toContain("maxLossesPerSession");
  });

  it("empty when no overrides supplied", () => {
    expect(describeTradeRuleOverrides()).toEqual({ applied: [], ignored: [] });
  });
});
