/**
 * Trade Rules — the CONFIGURABLE layer of Founder canon D06.
 *
 * D06: "Rule hierarchy — configurable trade-rule schema (max trades, max
 * losses, cooldown, override log)." The rule EVALUATION engine already exists
 * (selectPermission + defaultFounderRules); what was MISSING is (1) letting a
 * trader configure their own thresholds, and (2) an override log. This module
 * is (1); overrideLog.ts is (2).
 *
 * A trader supplies TradeRuleOverrides; resolveTradeRules() merges them onto the
 * founder defaults, producing the effective RuleConfiguration[] the permission
 * engine consumes. Invalid overrides are IGNORED (default kept) — a bad config
 * value can never weaken the safety floor into an invalid state.
 *
 * PURE — no I/O. Respects canon A07 ("the trader is responsible"): these rules
 * are ADVISORY inputs to selectPermission, never hard gates.
 */

import { defaultFounderRules, type RuleConfiguration, type RuleTrigger } from "../traderMemory/viewModels/selectPermission";

export interface TradeRuleOverrides {
  readonly maxTradesPerSession?: number;
  readonly maxLossesPerSession?: number;
  /** Daily drawdown floor in R — negative (e.g. -3). */
  readonly maxDailyDrawdownR?: number;
  readonly minRR?: number;
  readonly reentryCooldownMs?: number;
  readonly postLossCooldownMs?: number;
}

function posInt(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && Number.isInteger(v);
}
function posNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}
function negNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v < 0;
}

/** Which override key feeds which rule trigger, and how to validate it. */
const THRESHOLD_OVERRIDES: {
  readonly key: keyof TradeRuleOverrides;
  readonly trigger: RuleTrigger;
  readonly field: "threshold" | "windowMs";
  readonly valid: (v: unknown) => v is number;
}[] = [
  { key: "maxTradesPerSession", trigger: "MAX_TRADES_PER_SESSION", field: "threshold", valid: posInt },
  { key: "maxLossesPerSession", trigger: "MAX_LOSSES_PER_SESSION", field: "threshold", valid: posInt },
  { key: "maxDailyDrawdownR", trigger: "MAX_DAILY_DRAWDOWN", field: "threshold", valid: negNum },
  { key: "minRR", trigger: "MIN_RR", field: "threshold", valid: posNum },
  { key: "reentryCooldownMs", trigger: "REENTRY_COOLDOWN", field: "windowMs", valid: posNum },
  { key: "postLossCooldownMs", trigger: "COOLDOWN_AFTER_LOSS", field: "windowMs", valid: posNum },
];

/**
 * Merge a trader's overrides onto the founder default rules. Only valid values
 * are applied; anything invalid keeps the default (never produces a rule with a
 * nonsensical threshold). Rule identity, kind, and set are preserved — a trader
 * can retune thresholds but cannot delete a HARD rule via this path.
 */
export function resolveTradeRules(overrides?: TradeRuleOverrides): readonly RuleConfiguration[] {
  const base = defaultFounderRules();
  if (!overrides) return base;

  return base.map((rule) => {
    const spec = THRESHOLD_OVERRIDES.find((o) => o.trigger === rule.trigger);
    if (!spec) return rule;
    const candidate = overrides[spec.key];
    if (!spec.valid(candidate)) return rule; // invalid → keep default
    return { ...rule, [spec.field]: candidate };
  });
}

/**
 * Report which overrides were actually applied vs ignored — so a settings UI
 * can tell the trader "your maxTrades=5 was applied; cooldown=-1 was ignored".
 */
export function describeTradeRuleOverrides(overrides?: TradeRuleOverrides): {
  readonly applied: readonly (keyof TradeRuleOverrides)[];
  readonly ignored: readonly (keyof TradeRuleOverrides)[];
} {
  const applied: (keyof TradeRuleOverrides)[] = [];
  const ignored: (keyof TradeRuleOverrides)[] = [];
  if (!overrides) return { applied, ignored };
  for (const spec of THRESHOLD_OVERRIDES) {
    if (overrides[spec.key] === undefined) continue;
    (spec.valid(overrides[spec.key]) ? applied : ignored).push(spec.key);
  }
  return { applied, ignored };
}
