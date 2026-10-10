/**
 * WM PRO BILLING — THE ONE PLACE THAT TALKS TO STRIPE (server only).
 *
 * Plain `fetch` with a form-encoded body: the Workers runtime needs no SDK.
 * The secret key is read from the env at call time, placed in the
 * Authorization header and NOWHERE else — never in a URL, a log line, an
 * error or a return value.
 *
 * ONE CUSTOMER PER PASSPORT IDENTITY, ACROSS THE ACCOUNT (Founder ruling
 * 2026-10-09). The Stripe account is shared with the Passport's other
 * products, so before a customer is ever created this looks for the one that
 * already exists: the stored id → a customer whose metadata carries this
 * Passport user id → a single customer with this email (taken, tagged with the
 * id, and FLAGGED for review). More than one candidate is never guessed
 * between: the checkout is refused for review. Only when none exists is one
 * created, under an idempotency key that makes a retry return the same one.
 */
import { PASSPORT_REF_KEY, type EntitlementRecord } from "./entitlement";
import { STRIPE_SECRET_KEY_ENV } from "./standing";
import type { BillingEnv } from "./tiers";

export const STRIPE_API = "https://api.stripe.com/v1";
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface StripeAnswer { readonly ok: boolean; readonly status: number; readonly data: Record<string, unknown> }

/** Nested object → Stripe's bracketed form keys. */
export function stripeForm(obj: Record<string, unknown>, prefix = "", out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v !== null && typeof v === "object") stripeForm(v as Record<string, unknown>, key, out);
    else if (v !== undefined && v !== null) out.append(key, String(v));
  }
  return out;
}

export async function stripeCall(env: BillingEnv, path: string, opts: { readonly method?: "GET" | "POST"; readonly params?: Record<string, unknown>; readonly idempotencyKey?: string; readonly fetchImpl?: FetchLike } = {}): Promise<StripeAnswer> {
  const key = (env[STRIPE_SECRET_KEY_ENV] ?? "").trim();
  if (!key) return { ok: false, status: 0, data: {} };
  const method = opts.method ?? "GET";
  const form = opts.params ? stripeForm(opts.params) : null;
  const url = `${STRIPE_API}/${path}${method === "GET" && form ? `?${form.toString()}` : ""}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
  if (method === "POST") headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  try {
    const res = await (opts.fetchImpl ?? fetch)(url, { method, headers, body: method === "POST" ? (form ?? new URLSearchParams()).toString() : undefined, cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, data: data && typeof data === "object" ? data : {} };
  } catch {
    return { ok: false, status: 0, data: {} };
  }
}

const SAFE_USER = /^[A-Za-z0-9_-]{6,64}$/;
const CUSTOMER_ID = /^cus_[A-Za-z0-9]{6,64}$/;
const asList = (a: StripeAnswer): Record<string, unknown>[] => (Array.isArray(a.data.data) ? (a.data.data as Record<string, unknown>[]) : []);
const live = (c: Record<string, unknown>) => typeof c.id === "string" && CUSTOMER_ID.test(c.id) && c.deleted !== true;
const refOf = (c: Record<string, unknown>) => { const m = (c.metadata ?? {}) as Record<string, unknown>; return typeof m[PASSPORT_REF_KEY] === "string" ? (m[PASSPORT_REF_KEY] as string) : null; };

export type CustomerResolution =
  | { readonly ok: true; readonly customerId: string; readonly match: NonNullable<EntitlementRecord["customerMatch"]> }
  | { readonly ok: false; readonly code: "NEEDS_REVIEW" | "STRIPE_UNAVAILABLE" | "BAD_IDENTITY"; readonly detail: string };

export async function resolveCustomer(input: { readonly env: BillingEnv; readonly userId: string; readonly email: string | null; readonly storedCustomerId: string | null; readonly modeWord: "TEST" | "LIVE"; readonly fetchImpl?: FetchLike }): Promise<CustomerResolution> {
  const { env, userId, fetchImpl } = input;
  if (!SAFE_USER.test(userId)) return { ok: false, code: "BAD_IDENTITY", detail: "user id shape" };
  const call = (path: string, o: Parameters<typeof stripeCall>[2] = {}) => stripeCall(env, path, { ...o, fetchImpl });

  // 1. The id this member's record already holds.
  if (input.storedCustomerId && CUSTOMER_ID.test(input.storedCustomerId)) {
    const got = await call(`customers/${input.storedCustomerId}`);
    if (got.ok && live(got.data)) {
      const ref = refOf(got.data);
      if (ref === null || ref === userId) return { ok: true, customerId: input.storedCustomerId, match: "STORED" };
      return { ok: false, code: "NEEDS_REVIEW", detail: "stored customer carries another identity" };
    }
    if (!got.ok && got.status !== 404) return { ok: false, code: "STRIPE_UNAVAILABLE", detail: `customer read ${got.status}` };
  }

  // 2. A customer already tagged with this Passport user id (any product on the account).
  const tagged = await call("customers/search", { params: { query: `metadata['${PASSPORT_REF_KEY}']:'${userId}'`, limit: 3 } });
  if (!tagged.ok) return { ok: false, code: "STRIPE_UNAVAILABLE", detail: `customer search ${tagged.status}` };
  const byTag = asList(tagged).filter(c => live(c) && refOf(c) === userId);
  if (byTag.length === 1) return { ok: true, customerId: byTag[0]!.id as string, match: "METADATA" };
  if (byTag.length > 1) return { ok: false, code: "NEEDS_REVIEW", detail: `${byTag.length} customers carry this identity` };

  // 3. Fallback, flagged for review: exactly one customer with this email and no other identity on it.
  const email = (input.email ?? "").trim().toLowerCase();
  if (email) {
    const byEmail = await call("customers", { params: { email, limit: 3 } });
    if (!byEmail.ok) return { ok: false, code: "STRIPE_UNAVAILABLE", detail: `customer list ${byEmail.status}` };
    const found = asList(byEmail).filter(live);
    if (found.length > 1) return { ok: false, code: "NEEDS_REVIEW", detail: `${found.length} customers share this email` };
    if (found.length === 1) {
      const c = found[0]!;
      const ref = refOf(c);
      if (ref !== null && ref !== userId) return { ok: false, code: "NEEDS_REVIEW", detail: "the email's customer carries another identity" };
      const tag = await call(`customers/${c.id as string}`, { method: "POST", params: { metadata: { [PASSPORT_REF_KEY]: userId } } });
      if (!tag.ok) return { ok: false, code: "STRIPE_UNAVAILABLE", detail: `customer tag ${tag.status}` };
      return { ok: true, customerId: c.id as string, match: "EMAIL" };
    }
  }

  // 4. None exists: create one, tagged, under a key that makes a retry return the same customer.
  const made = await call("customers", { method: "POST", idempotencyKey: `wmpro-customer-${input.modeWord}-${userId}`, params: { ...(email ? { email } : {}), metadata: { [PASSPORT_REF_KEY]: userId } } });
  if (!made.ok || !live(made.data)) return { ok: false, code: "STRIPE_UNAVAILABLE", detail: `customer create ${made.status}` };
  return { ok: true, customerId: made.data.id as string, match: "CREATED" };
}

const idOf = (v: unknown): string | null => (typeof v === "string" && v ? v : v && typeof v === "object" && typeof (v as { id?: unknown }).id === "string" ? (v as { id: string }).id : null);

/** Which subscription (and customer) a charge paid for — one read; nulls when Stripe does not say. */
export async function chargeLink(env: BillingEnv, chargeId: string | null, fetchImpl?: FetchLike): Promise<{ subscriptionId: string | null; customerId: string | null; read: boolean }> {
  if (!chargeId || !/^(ch|py)_[A-Za-z0-9]{6,64}$/.test(chargeId)) return { subscriptionId: null, customerId: null, read: false };
  const got = await stripeCall(env, `charges/${chargeId}`, { params: { expand: { 0: "invoice" } }, fetchImpl });
  if (!got.ok) return { subscriptionId: null, customerId: null, read: false };
  const inv = (got.data.invoice && typeof got.data.invoice === "object" ? got.data.invoice : {}) as Record<string, unknown>;
  const sub = idOf(inv.subscription) ?? idOf(((inv.parent as Record<string, unknown> | undefined)?.subscription_details as Record<string, unknown> | undefined)?.subscription);
  return { subscriptionId: sub, customerId: idOf(got.data.customer), read: true };
}
