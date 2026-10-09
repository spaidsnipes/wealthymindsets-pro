/**
 * WM PRO BILLING — THE ENTITLEMENT RECORD AND ITS REDUCER.
 *
 * One record per Passport user. It changes ONLY through `reduceBillingEvent`,
 * fed a signature-verified Stripe event:
 *   · IDEMPOTENT BY EVENT ID — an event already applied changes nothing;
 *   · ORDER-SAFE BY EVENT TIME — an event created before the last applied one
 *     is recorded as seen and changes nothing (Stripe does not deliver in order);
 *   · MODE MUST MATCH — a test event never touches a live record or vice versa;
 *   · A REFUND OR A DISPUTE ENDS THE ENTITLEMENT, and only a NEW paid checkout
 *     (a later event) starts one again — a late "subscription active" update
 *     never resurrects it.
 *
 * `memberTierOf` is the one reading: the tier the record grants RIGHT NOW.
 * What a tier unlocks is not decided here (Founder decision) — nothing in WM
 * Pro gates on it yet.
 *
 * PURE.
 */
import { paidTierByName, tierForPriceId, type BillingEnv, type BillingTier, type PaidTier } from "./tiers";

export const BILLING_PRODUCT = "WM_PRO" as const;
/** The customer / session metadata key that carries the Passport user id (one identity across the account). */
export const PASSPORT_REF_KEY = "passport_id_ref" as const;

export const ENTITLEMENT_STATUSES = ["active", "past_due", "canceled", "refunded", "disputed"] as const;
export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number];

export interface EntitlementRecord {
  readonly v: 1;
  readonly userId: string;
  readonly customerId: string | null;
  readonly subscriptionId: string | null;
  readonly tier: PaidTier | null;
  readonly status: EntitlementStatus | null;
  /** ISO time the paid period ends, when Stripe said. */
  readonly currentPeriodEnd: string | null;
  readonly livemode: boolean;
  readonly lastEventId: string | null;
  /** Stripe's `created` for the last APPLIED event, epoch seconds. */
  readonly lastEventAt: number | null;
  /** Ids of events already seen (applied or ignored), newest last, bounded. */
  readonly seenEventIds: readonly string[];
  /** How the Stripe customer was matched to this identity; EMAIL means a human should review it. */
  readonly customerMatch: "STORED" | "METADATA" | "EMAIL" | "CREATED" | null;
}

export const SEEN_EVENTS_KEPT = 100;

/**
 * A refund or a dispute names a CHARGE, not a subscription. The webhook route
 * resolves which subscription the charge paid for (one Stripe read) and hands
 * it in here; with nothing resolved the event stays unlinked and changes nothing.
 */
export function withChargeLink(ev: BillingEventFacts, link: { readonly subscriptionId: string | null; readonly customerId: string | null }): BillingEventFacts {
  if (ev.type !== "charge.refunded" && ev.type !== "charge.dispute.created") return ev;
  return { ...ev, subscriptionId: link.subscriptionId, customerId: ev.customerId ?? link.customerId };
}

export function emptyEntitlement(userId: string, livemode: boolean): EntitlementRecord {
  return { v: 1, userId, customerId: null, subscriptionId: null, tier: null, status: null, currentPeriodEnd: null, livemode, lastEventId: null, lastEventAt: null, seenEventIds: [], customerMatch: null };
}

/** Parse a stored record fail-closed: anything unreadable is no record. */
export function readEntitlement(raw: unknown): EntitlementRecord | null {
  let o: Record<string, unknown> | null = null;
  if (typeof raw === "string") { try { o = JSON.parse(raw) as Record<string, unknown>; } catch { return null; } }
  else if (raw && typeof raw === "object") o = raw as Record<string, unknown>;
  if (!o || o.v !== 1 || typeof o.userId !== "string" || !o.userId || typeof o.livemode !== "boolean") return null;
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  const status = (ENTITLEMENT_STATUSES as readonly string[]).includes(o.status as string) ? (o.status as EntitlementStatus) : null;
  const match = ["STORED", "METADATA", "EMAIL", "CREATED"].includes(o.customerMatch as string) ? (o.customerMatch as EntitlementRecord["customerMatch"]) : null;
  return {
    v: 1, userId: o.userId, customerId: str(o.customerId), subscriptionId: str(o.subscriptionId), tier: paidTierByName(o.tier), status,
    currentPeriodEnd: str(o.currentPeriodEnd), livemode: o.livemode, lastEventId: str(o.lastEventId),
    lastEventAt: typeof o.lastEventAt === "number" && Number.isFinite(o.lastEventAt) ? o.lastEventAt : null,
    seenEventIds: Array.isArray(o.seenEventIds) ? o.seenEventIds.filter((x): x is string => typeof x === "string").slice(-SEEN_EVENTS_KEPT) : [],
    customerMatch: match,
  };
}

/** The tier a record grants right now: its tier while ACTIVE in the server's current mode, otherwise FREE. */
export function memberTierOf(record: EntitlementRecord | null, serverLive: boolean | null): BillingTier {
  if (!record || serverLive === null || record.livemode !== serverLive) return "FREE";
  return record.status === "active" && record.tier ? record.tier : "FREE";
}

/* ── events ───────────────────────────────────────────────────────────── */

export const HANDLED_EVENT_TYPES = [
  "checkout.session.completed", "customer.subscription.updated", "customer.subscription.deleted",
  "invoice.payment_failed", "charge.refunded", "charge.dispute.created",
] as const;
export type HandledEventType = (typeof HANDLED_EVENT_TYPES)[number];

/** The facts of one Stripe event that billing reads — nothing else from the payload travels further. */
export interface BillingEventFacts {
  readonly id: string;
  readonly type: string;
  readonly createdSec: number;
  readonly livemode: boolean;
  /** Passport user id from the object's metadata, when Stripe carries it. */
  readonly userId: string | null;
  readonly product: string | null;
  readonly customerId: string | null;
  readonly subscriptionId: string | null;
  readonly chargeId: string | null;
  readonly tierName: string | null;
  readonly priceId: string | null;
  readonly sessionMode: string | null;
  readonly paymentStatus: string | null;
  readonly subscriptionStatus: string | null;
  readonly periodEndSec: number | null;
  readonly fullyRefunded: boolean;
}

const idOf = (v: unknown): string | null => (typeof v === "string" && v ? v : v && typeof v === "object" && typeof (v as { id?: unknown }).id === "string" ? (v as { id: string }).id : null);
const s = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

/** Read a verified event's JSON. Null when it is not a Stripe event shape. */
export function readStripeEvent(raw: unknown): BillingEventFacts | null {
  const ev = raw as Record<string, unknown> | null;
  if (!ev || typeof ev !== "object" || typeof ev.id !== "string" || !ev.id || typeof ev.type !== "string" || typeof ev.livemode !== "boolean" || typeof ev.created !== "number") return null;
  const obj = ((ev.data as Record<string, unknown> | undefined)?.object ?? {}) as Record<string, unknown>;
  const meta = (obj.metadata ?? {}) as Record<string, unknown>;
  const items = ((obj.items as Record<string, unknown> | undefined)?.data as unknown[] | undefined) ?? [];
  const item0 = (items[0] ?? {}) as Record<string, unknown>;
  const isSubscription = ev.type.startsWith("customer.subscription.");
  const periodEnd = typeof obj.current_period_end === "number" ? obj.current_period_end : typeof item0.current_period_end === "number" ? item0.current_period_end : null;
  return {
    id: ev.id, type: ev.type, createdSec: ev.created, livemode: ev.livemode,
    userId: s(meta[PASSPORT_REF_KEY]) ?? (ev.type === "checkout.session.completed" ? s(obj.client_reference_id) : null),
    product: s(meta.product),
    customerId: idOf(obj.customer),
    // An invoice names its subscription directly (older API) or under parent.subscription_details (newer).
    subscriptionId: isSubscription ? s(obj.id) : idOf(obj.subscription) ?? idOf(((obj.parent as Record<string, unknown> | undefined)?.subscription_details as Record<string, unknown> | undefined)?.subscription),
    chargeId: ev.type === "charge.refunded" ? s(obj.id) : ev.type === "charge.dispute.created" ? idOf(obj.charge) : null,
    tierName: s(meta.wm_tier),
    priceId: idOf(item0.price),
    sessionMode: s(obj.mode),
    paymentStatus: s(obj.payment_status),
    subscriptionStatus: isSubscription ? s(obj.status) : null,
    periodEndSec: periodEnd,
    fullyRefunded: ev.type === "charge.refunded" && obj.refunded === true,
  };
}

const SUBSCRIPTION_STATUS: Readonly<Record<string, EntitlementStatus>> = {
  active: "active", trialing: "active", past_due: "past_due", unpaid: "past_due", paused: "past_due", canceled: "canceled", incomplete_expired: "canceled",
};

export type ReduceOutcome =
  | "ACTIVATED" | "STATUS_UPDATED" | "PAST_DUE" | "REFUNDED" | "DISPUTED"
  | "REPLAYED" | "STALE" | "WRONG_MODE" | "NOT_HANDLED" | "NOT_THIS_PRODUCT" | "NOT_THIS_USER" | "NOT_PAID" | "UNKNOWN_TIER"
  | "DIFFERENT_SUBSCRIPTION" | "DIFFERENT_CUSTOMER" | "NO_RECORD" | "PARTIAL_REFUND" | "ENDED_BY_REFUND_OR_DISPUTE" | "NOT_LINKED";

export interface ReduceResult {
  readonly record: EntitlementRecord;
  readonly outcome: ReduceOutcome;
  /** True when anything about the member's entitlement changed (seen-id bookkeeping alone is not a change). */
  readonly changed: boolean;
}

/**
 * Apply one verified event to one user's record. `record` may be the empty
 * record for that user. Never throws; an event that does not apply returns the
 * record with the event marked seen and `changed: false`.
 */
export function reduceBillingEvent(record: EntitlementRecord, ev: BillingEventFacts, ctx: { readonly serverLive: boolean; readonly env: BillingEnv }): ReduceResult {
  const same = (outcome: ReduceOutcome, markSeen = true): ReduceResult => ({
    record: markSeen && !record.seenEventIds.includes(ev.id) ? { ...record, seenEventIds: [...record.seenEventIds, ev.id].slice(-SEEN_EVENTS_KEPT) } : record,
    outcome, changed: false,
  });
  // Mode first: a wrong-mode event is not even remembered against this record.
  if (ev.livemode !== ctx.serverLive || (record.lastEventId !== null && record.livemode !== ev.livemode)) return same("WRONG_MODE", false);
  if (record.seenEventIds.includes(ev.id) || record.lastEventId === ev.id) return same("REPLAYED", false);
  if (!(HANDLED_EVENT_TYPES as readonly string[]).includes(ev.type)) return same("NOT_HANDLED");
  if (ev.userId !== null && ev.userId !== record.userId) return same("NOT_THIS_USER", false);
  if (record.lastEventAt !== null && ev.createdSec < record.lastEventAt) return same("STALE");

  const apply = (patch: Partial<EntitlementRecord>, outcome: ReduceOutcome): ReduceResult => ({
    record: { ...record, ...patch, livemode: ev.livemode, lastEventId: ev.id, lastEventAt: ev.createdSec, seenEventIds: [...record.seenEventIds, ev.id].slice(-SEEN_EVENTS_KEPT) },
    outcome, changed: true,
  });
  const ended = record.status === "refunded" || record.status === "disputed";

  if (ev.type === "checkout.session.completed") {
    if (ev.product !== BILLING_PRODUCT) return same("NOT_THIS_PRODUCT");
    if (ev.sessionMode !== "subscription" || ev.paymentStatus !== "paid") return same("NOT_PAID");
    const tier = paidTierByName(ev.tierName);
    if (!tier || !ev.customerId || !ev.subscriptionId) return same("UNKNOWN_TIER");
    if (record.customerId && record.customerId !== ev.customerId) return same("DIFFERENT_CUSTOMER");
    return apply({ customerId: ev.customerId, subscriptionId: ev.subscriptionId, tier, status: "active" }, "ACTIVATED");
  }

  if (!record.customerId) return same("NO_RECORD");

  if (ev.type === "customer.subscription.updated" || ev.type === "customer.subscription.deleted") {
    if (ev.product !== null && ev.product !== BILLING_PRODUCT) return same("NOT_THIS_PRODUCT");
    if (ev.subscriptionId !== record.subscriptionId) return same("DIFFERENT_SUBSCRIPTION");
    const status = ev.type === "customer.subscription.deleted" ? "canceled" : SUBSCRIPTION_STATUS[ev.subscriptionStatus ?? ""];
    if (!status) return same("NOT_HANDLED");
    // A refund or a dispute ended this entitlement: a later "active" on the same subscription does not bring it back.
    if (ended && status === "active") return same("ENDED_BY_REFUND_OR_DISPUTE");
    const tier = tierForPriceId(ev.priceId, ctx.env) ?? record.tier;
    return apply({ status: ended ? record.status : status, tier, currentPeriodEnd: ev.periodEndSec ? new Date(ev.periodEndSec * 1000).toISOString() : record.currentPeriodEnd }, "STATUS_UPDATED");
  }

  if (ev.customerId !== null && ev.customerId !== record.customerId) return same("DIFFERENT_CUSTOMER");
  // ONE CUSTOMER, SEVERAL PRODUCTS. The Stripe customer is shared with the Passport's other purchases, so an
  // invoice, a refund or a dispute counts here ONLY when it is tied to THIS record's WM Pro subscription. One
  // that cannot be tied to it (the caller could not resolve the charge's subscription) changes nothing.
  if (ev.subscriptionId === null) return same("NOT_LINKED");
  if (ev.subscriptionId !== record.subscriptionId) return same("DIFFERENT_SUBSCRIPTION");

  if (ev.type === "invoice.payment_failed") {
    if (ended || record.status === "canceled") return same("ENDED_BY_REFUND_OR_DISPUTE");
    return apply({ status: "past_due" }, "PAST_DUE");
  }
  if (ev.type === "charge.refunded") {
    if (!ev.fullyRefunded) return same("PARTIAL_REFUND");
    return apply({ status: "refunded" }, "REFUNDED");
  }
  return apply({ status: "disputed" }, "DISPUTED");        // charge.dispute.created
}
