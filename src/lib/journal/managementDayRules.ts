/**
 * TODAY'S MANAGEMENT RULES — Garden 19 §55 (patience and management belong in
 * Morning Prep and the session plan). Storage injected.
 *
 * In Morning Prep the trader writes, before the session, the management rules
 * for TODAY (one per line, e.g. "move to breakeven after +1R"), a default
 * expected hold, and one session-plan line. They are kept for that market day
 * (New York, `marketDayKey`) only.
 *
 *   · They are NOT a plan. The plan card offers them as defaults; nothing joins
 *     a plan until the trader presses "Use today's rules" (trader-confirmed).
 *   · The session-plan line rides onto a Decision_ID at its freeze as the
 *     plan's session (CONTEXT TRUTH, source "morning prep") — only when the
 *     trader did not write a session on the card, and only when the line was
 *     written before the trade.
 */

import type { TraderPlanInput } from "./managementPlan";
import { marketDayKey } from "./localDayKey";

export const MANAGEMENT_DAY_RULES_KEY = "wm:management-day-rules:v1";

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

export interface ManagementDayRules {
  readonly day: string;
  readonly conditions: readonly string[];
  readonly expectedHoldMin: number | null;
  readonly sessionPlan: string | null;
  readonly updatedAtMs: number;
}

const clean = (s: unknown, n = 300) => (typeof s === "string" && s.trim() ? s.trim().slice(0, n) : null);

export function readDayRules(storage: Storage | null | undefined, nowMs: number): ManagementDayRules | null {
  if (!storage) return null;
  try {
    const o = JSON.parse(storage.getItem(MANAGEMENT_DAY_RULES_KEY) ?? "null") as Record<string, unknown> | null;
    if (!o || typeof o !== "object" || o.day !== marketDayKey(new Date(nowMs)) || typeof o.updatedAtMs !== "number") return null;
    const hold = typeof o.expectedHoldMin === "number" && Number.isFinite(o.expectedHoldMin) && o.expectedHoldMin > 0 ? o.expectedHoldMin : null;
    return {
      day: o.day as string,
      conditions: Array.isArray(o.conditions) ? o.conditions.map(c => clean(c)).filter((c): c is string => !!c).slice(0, 12) : [],
      expectedHoldMin: hold,
      sessionPlan: clean(o.sessionPlan),
      updatedAtMs: o.updatedAtMs,
    };
  } catch { return null; }
}

/** Save today's rules (the trader's own action in Morning Prep). Empty → cleared. */
export function writeDayRules(storage: Storage | null | undefined, input: { conditions: readonly string[]; expectedHoldMin: number | null; sessionPlan: string | null }, nowMs: number): ManagementDayRules | null {
  if (!storage) return null;
  const conditions = input.conditions.map(c => clean(c)).filter((c): c is string => !!c).slice(0, 12);
  const hold = input.expectedHoldMin != null && Number.isFinite(input.expectedHoldMin) && input.expectedHoldMin > 0 ? input.expectedHoldMin : null;
  const sessionPlan = clean(input.sessionPlan);
  const r: ManagementDayRules = { day: marketDayKey(new Date(nowMs)), conditions, expectedHoldMin: hold, sessionPlan, updatedAtMs: nowMs };
  try { storage.setItem(MANAGEMENT_DAY_RULES_KEY, JSON.stringify(conditions.length || hold != null || sessionPlan ? r : null)); } catch { return null; }
  return conditions.length || hold != null || sessionPlan ? r : null;
}

/** What "Use today's rules" puts into the card's draft — only fields the draft has left blank. */
export function draftWithDayRules(draft: TraderPlanInput, rules: ManagementDayRules | null): TraderPlanInput {
  if (!rules) return draft;
  const have = new Set((draft.conditions ?? []).map(c => c.trim().toLowerCase()));
  return {
    ...draft,
    conditions: [...(draft.conditions ?? []), ...rules.conditions.filter(c => !have.has(c.toLowerCase()))],
    expectedHoldMin: draft.expectedHoldMin ?? rules.expectedHoldMin,
  };
}

/** The session-plan line that may ride onto a freeze at `atMs` (written that market day, before the trade). */
export function sessionPlanForFreeze(storage: Storage | null | undefined, atMs: number): string | null {
  const r = readDayRules(storage, atMs);
  return r && r.sessionPlan && r.updatedAtMs <= atMs ? r.sessionPlan : null;
}
