/**
 * WM PRO — FOUNDING 500 PAYMENT EVENTS → THE PASSPORT (server only).
 *
 * Called by /api/billing/webhook AFTER the Stripe signature verified and the existing WM Pro reducer ran.
 * For an event that can concern a FOUNDING 500 subscription (founding.FOUNDING_EVENT_TYPES), the
 * subscription is RE-READ FROM STRIPE (expand latest_invoice) — the event's own copy is never trusted —
 * and only a subscription whose own metadata says founding=paid_500 / app=wm_pro is applied, via
 * ath_svc_founding500_apply_payment_event (idempotent by event id on the Passport side):
 *   status = the re-read subscription.status, paid = latest_invoice.status === "paid".
 *
 * Nothing here runs while no FOUNDING price is configured (WM_STRIPE_PRICE_FOUNDING unset — today): existing
 * subscribers' events are untouched. It deliberately does NOT depend on WM_FOUNDING_LIVE: once a FOUNDING
 * subscription exists, its cancellation and refunds must still reach the Passport if the flag is later off.
 *
 * `retry: true` → the webhook answers 503 so Stripe delivers the event again (a Stripe read or the Passport
 * failed). The WM Pro reducer is idempotent by event id, so the redelivery changes nothing there twice.
 */
import type { BillingEventFacts } from "./entitlement";
import { FOUNDING_EVENT_TYPES, eventFoundingHint, foundingPriceId, readFoundingSubscription } from "./founding";
import { founding500ApplyPaymentEvent, type RpcResult } from "./foundingPassport";
import { stripeCall, type FetchLike } from "./stripeApi";
import type { BillingEnv } from "./tiers";

export type FoundingWebhookResult =
  | { readonly handled: false }
  | { readonly handled: true; readonly retry: false; readonly outcome: string }
  | { readonly handled: true; readonly retry: true; readonly reason: string };

export interface FoundingWebhookDeps {
  readonly fetchImpl?: FetchLike;
  readonly apply?: typeof founding500ApplyPaymentEvent;
}

const SUB_ID = /^sub_[A-Za-z0-9]{6,64}$/;

export async function applyFoundingPaymentEvent(ev: BillingEventFacts, rawEvent: unknown, env: BillingEnv, deps: FoundingWebhookDeps = {}): Promise<FoundingWebhookResult> {
  const price = foundingPriceId(env);
  if (!price) return { handled: false };
  if (!(FOUNDING_EVENT_TYPES as readonly string[]).includes(ev.type)) return { handled: false };
  const hint = eventFoundingHint(rawEvent, price);
  if (hint === false) return { handled: false };
  if (hint === null && ev.type !== "invoice.paid" && ev.type !== "charge.refunded") return { handled: false };
  const subId = ev.subscriptionId;
  if (!subId || !SUB_ID.test(subId)) {
    // A founding-tagged event that names no subscription (an unpaid session) has nothing to apply yet.
    return hint ? { handled: true, retry: false, outcome: "NO_SUBSCRIPTION_YET" } : { handled: false };
  }

  const got = await stripeCall(env, `subscriptions/${subId}`, { params: { expand: { 0: "latest_invoice" } }, fetchImpl: deps.fetchImpl });
  if (!got.ok) return { handled: true, retry: true, reason: `subscription read HTTP ${got.status}` };
  const sub = readFoundingSubscription(got.data);
  if (!sub) return hint ? { handled: true, retry: false, outcome: "NOT_FOUNDING_ON_REREAD" } : { handled: false };

  const res: RpcResult = await (deps.apply ?? founding500ApplyPaymentEvent)({
    eventId: ev.id, eventType: ev.type, eventCreatedSec: ev.createdSec, livemode: ev.livemode, userId: sub.userId,
    subscriptionRef: sub.id, subscriptionStatus: sub.status, paid: sub.paid,
  });
  if (!res.ok) return { handled: true, retry: true, reason: res.why };
  const outcome = res.data && typeof res.data === "object" && typeof (res.data as { outcome?: unknown }).outcome === "string" ? (res.data as { outcome: string }).outcome.slice(0, 60) : null;
  if (!outcome || (res.data as { ok?: unknown }).ok === undefined) return { handled: true, retry: true, reason: "unreadable passport answer" };
  return { handled: true, retry: false, outcome };
}
