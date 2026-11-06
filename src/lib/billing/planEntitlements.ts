/**
 * WM PRO BILLING — WHAT EACH PLAN UNLOCKS (Founder pricing decision, 2026-11-06).
 *
 * The Founder changed ONLY WealthyMindsets Pro's plans. Passport stays free (it is how everyone signs in to
 * every app); the World Pass and every other app's prices are untouched.
 *
 *   APP       $10 / month  "WM Pro App · Basic" — up to 3 inventions on the chart at once; the standard
 *                          timeframe set (like TradingView's entry tier). Seconds, custom-minute, quarterly and
 *                          trade-count (tick) timeframes are locked.
 *   PASSPORT  $20 / month  "WM Pro Premium" — every invention and every timeframe. This is also what the
 *                          World Pass grants when WM Pro is the member's one Premium app (worldPass.ts).
 *   OS        $30 / month  "WM Pro Auto-Trading" — everything in Premium + Spaidbot automated trading, which
 *                          opens in stages: strategy → backtest → paper → LIVE only behind the account
 *                          holder's explicit per-account approval. Nothing here places, stages or arms an order.
 *
 *   FREE (a signed-in member with no plan): the same chart limits as the $10 plan — an OPEN FOUNDER QUESTION
 *   (docs: ~/Desktop/WM-PRO-PRICING-1106.md). A signed-out guest cannot open the chart at all (authRoutes).
 *
 * FOUNDERS AND PARTNERS (Founder rule 2026-10-31, "Passport = one login, tier decides access"): the King and
 * Queen get everything, by Passport id, server-side — never by a client flag. Partner grants are explicit
 * Passport ids the Founder names in WM_PARTNER_PASSPORT_IDS (comma-separated; a name, never shown).
 *
 * PAY PER TRADE ("they can pay per trade through all of it, every version"): every paid plan may pay per bot-placed
 * trade. The per-trade AMOUNT is the Founder's to set — it is null here and nothing is metered or charged
 * until he sets it and bot executions exist (WM Pro has no automated execution today).
 *
 * THE SERVER DECIDES. `entitlementsFor` runs in GET /api/billing/standing on the tier the server computed from
 * a signature-verified Stripe record + the WOW-signed World Pass read. The chart reads that answer; it never
 * names its own tier.
 *
 * PURE.
 */
import type { BillingEnv, BillingTier } from "./tiers";

/** Timeframes every plan has — the entry-tier set (TradingView's standard intervals + range presets). */
export const STANDARD_TIMEFRAMES: readonly string[] = Object.freeze([
  "1m", "3m", "5m", "15m", "30m", "45m", "1h", "2h", "4h", "1D", "1W", "1M",
  // Range presets: daily / weekly candles over a longer window (not a new bar size).
  "3M", "6M", "1Y", "2Y", "5Y",
]);
const STANDARD_TF_SET = new Set(STANDARD_TIMEFRAMES);

/** Why a timeframe is outside the standard set, in the words the upgrade prompt uses. */
export function lockedTimeframeKind(tf: string): "SECONDS" | "TICK" | "CUSTOM" | null {
  if (STANDARD_TF_SET.has(tf)) return null;
  if (/^\d+s$/.test(tf)) return "SECONDS";
  if (/^\d+T$/.test(tf)) return "TICK";
  return "CUSTOM";
}

export type TimeframeAccess = "STANDARD" | "ALL";

export interface PlanEntitlements {
  /** The tier these limits come from (after any Founder / partner grant). */
  readonly tier: BillingTier;
  /** How many inventions may be on the chart at once; null = no cap. */
  readonly maxActiveInventions: number | null;
  readonly timeframes: TimeframeAccess;
  /** Spaidbot automated trading (staged: strategy → backtest → paper → live behind per-account approval). */
  readonly autoTrading: boolean;
  /** Why this member has these limits. */
  readonly grantedBy: "PLAN" | "FOUNDER" | "PARTNER";
}

/** The cap on the $10 plan (Founder: "up to 3 inventions/indicators on the chart at once"). */
export const STANDARD_INVENTION_CAP = 3;
/** The timeframe a chart falls back to when the one it holds is locked. */
export const STANDARD_FALLBACK_TIMEFRAME = "5m";

const BY_TIER: Readonly<Record<BillingTier, Omit<PlanEntitlements, "tier" | "grantedBy">>> = {
  FREE: { maxActiveInventions: STANDARD_INVENTION_CAP, timeframes: "STANDARD", autoTrading: false },
  APP: { maxActiveInventions: STANDARD_INVENTION_CAP, timeframes: "STANDARD", autoTrading: false },
  PASSPORT: { maxActiveInventions: null, timeframes: "ALL", autoTrading: false },
  OS: { maxActiveInventions: null, timeframes: "ALL", autoTrading: true },
};

/** Founders: full access everywhere, by Passport id (Founder rule 2026-10-31). */
export const FOUNDER_PASSPORT_IDS: readonly string[] = Object.freeze([
  "0d77521c-d5fe-41c3-ab24-a9c86221933d", // King David
  "adcc3b60-ba28-4e0f-b524-ecc458b4851c", // Queen Dominique
]);
/** Env var NAME holding the Founder's partner grants (comma-separated Passport ids). */
export const PARTNER_GRANTS_ENV = "WM_PARTNER_PASSPORT_IDS";

const PASSPORT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function planLimits(tier: BillingTier): PlanEntitlements {
  return { tier, ...BY_TIER[tier], grantedBy: "PLAN" };
}

/** SERVER: what this member may use, from the tier the server computed and the member's own Passport id. */
export function entitlementsFor(input: { readonly tier: BillingTier; readonly userId: string | null; readonly env?: BillingEnv }): PlanEntitlements {
  const id = (input.userId ?? "").trim().toLowerCase();
  if (PASSPORT_ID.test(id)) {
    if (FOUNDER_PASSPORT_IDS.includes(id)) return { ...planLimits("OS"), grantedBy: "FOUNDER" };
    const partners = (input.env?.[PARTNER_GRANTS_ENV] ?? "").split(",").map(s => s.trim().toLowerCase()).filter(s => PASSPORT_ID.test(s));
    if (partners.includes(id)) return { ...planLimits("OS"), grantedBy: "PARTNER" };
  }
  return planLimits(input.tier);
}

/** Parse the standing route's `entitlements` field fail-closed: anything unreadable is null (unknown). */
export function readPlanEntitlements(raw: unknown): PlanEntitlements | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const tier = o.tier;
  if (tier !== "FREE" && tier !== "APP" && tier !== "PASSPORT" && tier !== "OS") return null;
  const cap = o.maxActiveInventions;
  if (!(cap === null || (typeof cap === "number" && Number.isInteger(cap) && cap >= 0))) return null;
  if (o.timeframes !== "STANDARD" && o.timeframes !== "ALL") return null;
  if (typeof o.autoTrading !== "boolean") return null;
  const grantedBy = o.grantedBy === "FOUNDER" || o.grantedBy === "PARTNER" ? o.grantedBy : "PLAN";
  return { tier, maxActiveInventions: cap as number | null, timeframes: o.timeframes, autoTrading: o.autoTrading, grantedBy };
}

/* ── the chart's two gates ───────────────────────────────────────────────────────── */

/**
 * Switches in the chart's one switch map that are ARMED drawing gestures, not inventions on the glass —
 * they never count toward the cap and are never trimmed.
 */
export const NOT_COUNTED_SWITCHES: readonly string[] = Object.freeze(["DELTA_VP", "ANCHORED_RANGE"]);

/** The inventions switched on, in the switch map's own order. */
export function activeInventionIds(active: Readonly<Record<string, boolean | undefined>>): string[] {
  return Object.keys(active).filter(id => active[id] === true && !NOT_COUNTED_SWITCHES.includes(id));
}

/**
 * May this switch go to `next`? Turning anything OFF is always allowed; turning one ON is allowed only while
 * fewer than the cap are on. `ent` null = the plan is not known yet → no gate (the chart never blocks on a read).
 */
export function inventionSwitchAllowed(ent: PlanEntitlements | null, active: Readonly<Record<string, boolean | undefined>>, id: string, next: boolean): boolean {
  if (!next || !ent || ent.maxActiveInventions === null || NOT_COUNTED_SWITCHES.includes(id)) return true;
  if (active[id] === true) return true;
  return activeInventionIds(active).length < ent.maxActiveInventions;
}

/** The inventions to switch OFF so the chart holds at most the cap (the first `cap` in map order stay on). */
export function inventionsOverCap(ent: PlanEntitlements | null, active: Readonly<Record<string, boolean | undefined>>): string[] {
  if (!ent || ent.maxActiveInventions === null) return [];
  return activeInventionIds(active).slice(ent.maxActiveInventions);
}

/** May the chart hold this timeframe? `ent` null = not known yet → allowed. */
export function timeframeAllowed(ent: PlanEntitlements | null, tf: string): boolean {
  if (!ent || ent.timeframes === "ALL") return true;
  return lockedTimeframeKind(tf) === null;
}

/** The plain upgrade words (no countdowns, no scarcity — the plan and its price, once). */
export function upgradeWords(kind: "INVENTION_CAP" | "TIMEFRAME" | "AUTO_TRADING", detail?: string): string {
  if (kind === "INVENTION_CAP") return `Your plan shows up to ${STANDARD_INVENTION_CAP} inventions at once. Switch one off, or WM Pro Premium ($20/month) unlocks every invention.`;
  if (kind === "TIMEFRAME") {
    const what = detail ? lockedTimeframeKind(detail) : null;
    const name = what === "SECONDS" ? "Seconds timeframes" : what === "TICK" ? "Trade-count (tick) timeframes" : "Custom timeframes";
    return `${name}${detail ? ` (${detail})` : ""} are in WM Pro Premium ($20/month), which unlocks every timeframe. Your plan has the standard set.`;
  }
  return "Spaidbot automated trading is in WM Pro Auto-Trading ($30/month).";
}

/* ── pay per trade (spec; the Founder sets the amount) ──────────────────────────────── */

export const PAY_PER_TRADE = Object.freeze({
  /** Every plan may pay per bot-placed trade. */
  plans: ["APP", "PASSPORT", "OS"] as const,
  /** Cents per bot-placed trade — NOT SET. The Founder names it; nothing is metered or charged until then. */
  amountCents: null as number | null,
  status: "AWAITING_FOUNDER_AMOUNT" as const,
});
