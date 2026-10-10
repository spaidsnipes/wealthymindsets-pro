/**
 * WM PRO BILLING — WHERE THE ENTITLEMENT RECORD LIVES.
 *
 * WM Pro manages no database migrations, so the record lives in the Worker's
 * existing KV namespace (the one the order ledger and member grants already
 * use), under its own prefix. Two keys per member:
 *   billing:v1:user:<userId>        → the EntitlementRecord (JSON)
 *   billing:v1:customer:<customerId> → the userId (so an event that names only
 *                                      a customer can find its member)
 * No secret is stored. No KV → no record can be read or written: every reader
 * then answers FREE and the checkout refuses (fail closed).
 */
import { orderDecisionKv } from "@/lib/broker/orderDecisionLedger";
import type { WebullKvNamespace } from "@/lib/marketData/webullKvTokenStore";
import { webullWorkerEnv } from "@/lib/marketData/webullSessionStore";

import { memberTierOf, readEntitlement, type EntitlementRecord } from "./entitlement";
import { billingStanding } from "./standing";
import type { BillingEnv, BillingTier } from "./tiers";

export type BillingKv = Pick<WebullKvNamespace, "get" | "put">;

export const BILLING_KEY_PREFIX = "billing:v1:";
const SAFE_ID = /^[A-Za-z0-9_-]{3,96}$/;
export const billingUserKey = (userId: string) => `${BILLING_KEY_PREFIX}user:${userId}`;
export const billingCustomerKey = (customerId: string) => `${BILLING_KEY_PREFIX}customer:${customerId}`;

/** The Worker's KV, or null off the edge / when the binding is absent. */
export async function billingKv(): Promise<BillingKv | null> {
  try { return orderDecisionKv(await webullWorkerEnv()); } catch { return null; }
}

export async function loadEntitlement(kv: BillingKv | null, userId: string): Promise<EntitlementRecord | null> {
  if (!kv || !SAFE_ID.test(userId)) return null;
  const rec = readEntitlement(await kv.get(billingUserKey(userId)));
  return rec && rec.userId === userId ? rec : null;
}

export async function saveEntitlement(kv: BillingKv, record: EntitlementRecord): Promise<void> {
  if (!SAFE_ID.test(record.userId)) throw new Error("billing: unsafe user id");
  await kv.put(billingUserKey(record.userId), JSON.stringify(record));
  if (record.customerId && SAFE_ID.test(record.customerId)) await kv.put(billingCustomerKey(record.customerId), record.userId);
  // The operator's count of records by status (KV cannot list): one small index, best effort — the record above is the truth.
  try {
    const index = readIndex(await kv.get(BILLING_INDEX_KEY));
    const word = `${record.livemode ? "live" : "test"}:${record.status ?? "none"}`;
    if (index[record.userId] !== word) { index[record.userId] = word; await kv.put(BILLING_INDEX_KEY, JSON.stringify(index)); }
  } catch { /* the index is a convenience; never fail a billing write over it */ }
}

/* ── the operator's readiness facts (no secret, no member detail) ─────────────────────── */

export const BILLING_INDEX_KEY = `${BILLING_KEY_PREFIX}index`;
export const BILLING_WEBHOOK_LAST_KEY = `${BILLING_KEY_PREFIX}webhook:last`;

function readIndex(raw: string | null): Record<string, string> {
  try {
    const o = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const out: Record<string, string> = {};
    if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) if (SAFE_ID.test(k) && typeof v === "string") out[k] = v.slice(0, 24);
    return out;
  } catch { return {}; }
}

export interface WebhookLastVerified { readonly atMs: number; readonly type: string; readonly outcome: string; readonly livemode: boolean }

/** Note the last event whose signature verified (type, outcome, time) — never its body. */
export async function noteWebhookVerified(kv: BillingKv | null, last: WebhookLastVerified): Promise<void> {
  if (!kv) return;
  try { await kv.put(BILLING_WEBHOOK_LAST_KEY, JSON.stringify({ atMs: last.atMs, type: last.type.slice(0, 60), outcome: last.outcome.slice(0, 40), livemode: last.livemode })); } catch { /* a note, not the event */ }
}

export interface BillingOps {
  readonly store: "READ" | "NO_STORE" | "UNREADABLE";
  readonly lastWebhook: WebhookLastVerified | null;
  /** Records by "<mode>:<status>" (e.g. "live:active", "test:canceled", "test:none" = a customer resolved, nothing bought). */
  readonly counts: Readonly<Record<string, number>>;
}

export async function readBillingOps(kv: BillingKv | null): Promise<BillingOps> {
  if (!kv) return { store: "NO_STORE", lastWebhook: null, counts: {} };
  try {
    const counts: Record<string, number> = {};
    for (const word of Object.values(readIndex(await kv.get(BILLING_INDEX_KEY)))) counts[word] = (counts[word] ?? 0) + 1;
    let lastWebhook: WebhookLastVerified | null = null;
    try {
      const o = JSON.parse((await kv.get(BILLING_WEBHOOK_LAST_KEY)) ?? "null") as Record<string, unknown> | null;
      if (o && typeof o.atMs === "number" && typeof o.type === "string" && typeof o.outcome === "string" && typeof o.livemode === "boolean") lastWebhook = { atMs: o.atMs, type: o.type, outcome: o.outcome, livemode: o.livemode };
    } catch { lastWebhook = null; }
    return { store: "READ", lastWebhook, counts };
  } catch {
    return { store: "UNREADABLE", lastWebhook: null, counts: {} };
  }
}

export async function userForCustomer(kv: BillingKv | null, customerId: string | null): Promise<string | null> {
  if (!kv || !customerId || !SAFE_ID.test(customerId)) return null;
  const v = (await kv.get(billingCustomerKey(customerId)) ?? "").trim();
  return SAFE_ID.test(v) ? v : null;
}

/**
 * THE ONE SERVER-SIDE READING of what a member has bought: the tier their
 * record grants right now, in the server's current mode. FREE when billing is
 * not configured, when no record exists, or when the record cannot be read.
 * Nothing in WM Pro gates on it yet — what a tier unlocks is a Founder decision.
 */
export async function memberTier(userId: string, env: BillingEnv = process.env, loadKv: () => Promise<BillingKv | null> = billingKv): Promise<BillingTier> {
  const standing = billingStanding(env);
  if (standing.mode === "NOT_CONFIGURED") return "FREE";
  try { return memberTierOf(await loadEntitlement(await loadKv(), userId), standing.live); } catch { return "FREE"; }
}
