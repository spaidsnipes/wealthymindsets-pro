/**
 * WM PRO BILLING — WHICH MODE THE SERVER IS IN (fail-closed).
 *
 * Derived from the PREFIX of the Stripe secret key and nothing else about it.
 * The key itself is never returned, logged or placed in an error.
 *
 *   NOT_CONFIGURED  no key · an unrecognised key · a LIVE key that has not
 *                   been armed · no webhook signing secret. Nothing is sold.
 *   TEST            a test key and a webhook secret. No real money moves.
 *   LIVE            a live key, armed on purpose (WM_BILLING_LIVE = "ARMED"),
 *                   and a webhook secret.
 *
 * Why the webhook secret is required to sell: entitlement is written ONLY from
 * a signature-verified event. Selling without it would take money and record
 * nothing.
 *
 * PURE.
 */
import type { BillingEnv } from "./tiers";

export const STRIPE_SECRET_KEY_ENV = "STRIPE_SECRET_KEY";
export const STRIPE_WEBHOOK_SECRET_ENV = "WM_STRIPE_WEBHOOK_SECRET";
export const BILLING_LIVE_ARM_ENV = "WM_BILLING_LIVE";
export const BILLING_LIVE_ARMED = "ARMED";

export type BillingNotConfiguredReason = "NO_KEY" | "KEY_UNRECOGNIZED" | "LIVE_KEY_NOT_ARMED" | "NO_WEBHOOK_SECRET";
export type BillingStanding =
  | { readonly mode: "NOT_CONFIGURED"; readonly reason: BillingNotConfiguredReason }
  | { readonly mode: "TEST"; readonly live: false }
  | { readonly mode: "LIVE"; readonly live: true };

export function billingStanding(env: BillingEnv): BillingStanding {
  const key = (env[STRIPE_SECRET_KEY_ENV] ?? "").trim();
  if (!key) return { mode: "NOT_CONFIGURED", reason: "NO_KEY" };
  const test = key.startsWith("sk_test_") || key.startsWith("rk_test_");
  const live = key.startsWith("sk_live_") || key.startsWith("rk_live_");
  if (!test && !live) return { mode: "NOT_CONFIGURED", reason: "KEY_UNRECOGNIZED" };
  if (live && (env[BILLING_LIVE_ARM_ENV] ?? "").trim() !== BILLING_LIVE_ARMED) return { mode: "NOT_CONFIGURED", reason: "LIVE_KEY_NOT_ARMED" };
  if (!(env[STRIPE_WEBHOOK_SECRET_ENV] ?? "").trim().startsWith("whsec_")) return { mode: "NOT_CONFIGURED", reason: "NO_WEBHOOK_SECRET" };
  return live ? { mode: "LIVE", live: true } : { mode: "TEST", live: false };
}

/** What a member reads when billing cannot sell — never a variable name, never why in operator terms. */
export const BILLING_NOT_ON_SALE = { error: "Paid plans are not on sale yet.", code: "NOT_CONFIGURED" } as const;

/** Every env var NAME billing reads besides the price ids. */
export const BILLING_ENV_NAMES: readonly string[] = [STRIPE_SECRET_KEY_ENV, STRIPE_WEBHOOK_SECRET_ENV, BILLING_LIVE_ARM_ENV];
