/**
 * NO OFFERS (Founder rule, confirmed 2026-10-30): no free months, no trials, no discounts anywhere in ATH.
 * The Oct 25 holiday special (WM Pro Premium first month $20 → $10 through Dec 25 2026) is RETIRED, the same
 * day it was retired on WAVEMOTION (HOLIDAY_OPEN=false) and WOW (HOLIDAY50 refused, trial codes 410).
 *
 * This file is the one owner of that rule for WM Pro:
 *   - PASSPORT_PROMO_OPEN is a closed constant. Nothing reads an env var or a date to reopen it.
 *   - Checkout applies no coupon and refuses, before Stripe is asked, any body that asks for an offer.
 *   - The pricing page says no offer.
 * Members already on a discounted first month are untouched: their Stripe subscription carries its own
 * one-time coupon, and nothing here reads, edits or cancels an existing subscription.
 */
export const PASSPORT_PROMO_OPEN = false as const;

/** Body fields that ask for a price other than the plan's own. None is honoured; asking is refused. */
export const OFFER_FIELDS = ["promo", "promoCode", "promo_code", "promotion_code", "promotionCode", "coupon", "couponCode", "discount", "discounts", "offer", "trial", "trial_period_days", "trialDays"] as const;

/** The plain words a member reads when a checkout asks for an offer. */
export const OFFER_RETIRED = {
  error: "WM Pro has no discounts, trials or free months. Each plan is its listed price. Nothing was charged.",
  code: "OFFER_RETIRED",
} as const;

/** True when a checkout body names any offer field (any value, even empty): the server refuses it. */
export function bodyAsksForOffer(body: Record<string, unknown> | null | undefined): boolean {
  if (!body || typeof body !== "object") return false;
  return OFFER_FIELDS.some(k => Object.prototype.hasOwnProperty.call(body, k));
}
