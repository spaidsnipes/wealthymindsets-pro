/**
 * WM PRO BILLING — THE TIER MAP (Garden 19 Supermax §11; Founder rulings 2026-10-09).
 *
 * Four tiers, as the pricing page states them: $0 / $10 / $20 / $50 a month.
 * WM Pro is its own purchasable product on the SAME Stripe account as the
 * Passport / World Pass, with ONE Stripe customer per Passport identity.
 *
 * THE CLIENT NEVER SENDS A PRICE OR AN AMOUNT. A checkout names a tier; the
 * server looks up that tier's Stripe price id from an environment variable
 * whose NAME is fixed here. No variable set → that tier is not on sale.
 *
 * BUNDLES. Owning another product on the account (World Pass, say) grants no
 * WM Pro tier unless its price id is listed in `BILLING_BUNDLES`. The slot is
 * typed and EMPTY: a bundle is a Founder decision, never an inference.
 *
 * PURE. Reads variable NAMES and the values the caller's env holds; returns a
 * price id only to server code (never placed in a response by this module).
 */
export const BILLING_TIERS = ["FREE", "APP", "PASSPORT", "OS"] as const;
export type BillingTier = (typeof BILLING_TIERS)[number];
export type PaidTier = Exclude<BillingTier, "FREE">;
export const PAID_TIERS: readonly PaidTier[] = ["APP", "PASSPORT", "OS"];

export interface TierSpec {
  readonly tier: BillingTier;
  /** The name the pricing page prints. */
  readonly name: string;
  /** Monthly price in cents, as the page states it. The CHARGE comes from Stripe's price, not this number. */
  readonly monthlyCents: number;
  /** Name of the env var that holds this tier's Stripe price id; null for the free tier. */
  readonly priceEnv: string | null;
  readonly rank: number;
}

export const TIER_SPEC: Readonly<Record<BillingTier, TierSpec>> = {
  FREE: { tier: "FREE", name: "Free · Guest", monthlyCents: 0, priceEnv: null, rank: 0 },
  APP: { tier: "APP", name: "WM Pro App", monthlyCents: 1_000, priceEnv: "WM_STRIPE_PRICE_APP", rank: 1 },
  PASSPORT: { tier: "PASSPORT", name: "Passport", monthlyCents: 2_000, priceEnv: "WM_STRIPE_PRICE_PASSPORT", rank: 2 },
  OS: { tier: "OS", name: "WM Pro OS", monthlyCents: 5_000, priceEnv: "WM_STRIPE_PRICE_OS", rank: 3 },
};

/** The $20 / month tier is the standard one (Founder, 2026-10-09). */
export const STANDARD_TIER: PaidTier = "PASSPORT";

/** A price id from another product on the account that also grants a WM Pro tier. EMPTY until the Founder names one. */
export interface BillingBundle {
  /** Name of the env var holding the OTHER product's Stripe price id. */
  readonly priceEnv: string;
  readonly grants: PaidTier;
  readonly note: string;
}
export const BILLING_BUNDLES: readonly BillingBundle[] = [];

export type BillingEnv = Readonly<Record<string, string | undefined>>;

const PRICE_ID = /^price_[A-Za-z0-9]{8,64}$/;
const priceAt = (env: BillingEnv, name: string | null): string | null => {
  const v = name ? (env[name] ?? "").trim() : "";
  return PRICE_ID.test(v) ? v : null;
};

/** The tier a request named, or null. Only the exact tier ids are accepted — never a price, never an amount. */
export function paidTierByName(raw: unknown): PaidTier | null {
  const s = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  return (PAID_TIERS as readonly string[]).includes(s) ? (s as PaidTier) : null;
}

/** SERVER ONLY: the Stripe price id configured for a tier, or null (not on sale). */
export function tierPriceId(tier: PaidTier, env: BillingEnv): string | null {
  return priceAt(env, TIER_SPEC[tier].priceEnv);
}

/** The paid tiers that can be bought right now (a price id is configured for each). */
export function tiersOnSale(env: BillingEnv): readonly PaidTier[] {
  return PAID_TIERS.filter(t => tierPriceId(t, env) !== null);
}

/** Which WM Pro tier a Stripe price id grants: one of WM Pro's own prices, or an explicitly mapped bundle. Otherwise none. */
export function tierForPriceId(priceId: unknown, env: BillingEnv): PaidTier | null {
  if (typeof priceId !== "string" || !PRICE_ID.test(priceId)) return null;
  for (const t of PAID_TIERS) if (tierPriceId(t, env) === priceId) return t;
  for (const b of BILLING_BUNDLES) if (priceAt(env, b.priceEnv) === priceId) return b.grants;
  return null;
}

/** Every env var NAME this module reads (for the Founder's setup list and the "no secret in a response" sentinel). */
export function billingPriceEnvNames(): readonly string[] {
  return [...PAID_TIERS.map(t => TIER_SPEC[t].priceEnv!), ...BILLING_BUNDLES.map(b => b.priceEnv)];
}
