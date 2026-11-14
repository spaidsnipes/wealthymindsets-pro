/**
 * WM PRO — FOUNDING 500 and FOUNDING 100 (Founder offer, locked 2026-11-06; shared contract
 * founding-contract-1106). PURE: names, flags, parsers and the copy. The Passport calls live in
 * foundingPassport.ts; the routes are /api/billing/founding/{checkout,trial}.
 *
 *   FOUNDING 500 — $10/month for as long as the member stays subscribed. A paid Stripe Checkout
 *                  subscription on the server's own price (WM_STRIPE_PRICE_FOUNDING), read back from
 *                  Stripe and refused unless it is usd / 1000 / month / active. NO promotion codes, NO
 *                  discounts, NO trial days, NO coupon on the session — ever.
 *   FOUNDING 100 — a free 30-day Premium trial unlocked by a REAL first save the SERVER can see. No card,
 *                  no Stripe, never charges, ends by itself (the Passport grant carries expires_at).
 *
 * The seat ledger is the Passport's (Supabase, service role only). WM Pro never counts seats and NEVER
 * shows a count: no "N left", no scarcity words.
 *
 * THE FLAG. WM_FOUNDING_LIVE = "on" turns the programme on for WM Pro; anything else (unset included) is
 * off. Off ⇒ both routes answer 404 FOUNDING_OFF, the pricing page shows nothing about FOUNDING, and the
 * standing route reads no Passport grant. No config in the repo sets it.
 *
 * FAIL CLOSED. The Passport RPCs are not applied until the Founder runs the SQL. Any RPC error, 404 or
 * unreadable answer means: no checkout, no grant, plain words.
 */
import { FOUNDING_500_GRANTS_TIER, type BillingEnv, type PaidTier } from "./tiers";

/** The app slug the Passport knows WM Pro by (exact). */
export const FOUNDING_APP = "wm_pro" as const;

/** Env var NAME of the on/off flag. Only the exact word "on" turns it on. */
export const FOUNDING_FLAG_ENV = "WM_FOUNDING_LIVE";
/** Env var NAME of the FOUNDING 500 Stripe price id (lookup_key wmpro_founding500_monthly). Set by the Founder's script only. */
export const FOUNDING_PRICE_ENV = "WM_STRIPE_PRICE_FOUNDING";
/** What the FOUNDING 500 price must be when read back from Stripe: $10.00 / month. */
export const FOUNDING_500_CENTS = 1_000;
/** How long a reserved seat is held while the member is in Stripe Checkout. */
export const FOUNDING_500_HOLD_MINUTES = 30;

/**
 * FOUNDER DECISION (listed open in the contract): what FOUNDING 500 unlocks in WM Pro. Default = WM Pro
 * Premium (tier id PASSPORT). The one constant lives in tiers.ts so the price → tier map reads it too;
 * re-exported here so both programmes name it from one place.
 */
export const FOUNDING_500_GRANTS: PaidTier = FOUNDING_500_GRANTS_TIER;
/** What FOUNDING 100's 30-day trial unlocks: Premium (same Founder decision, same default). */
export const FOUNDING_100_GRANTS: PaidTier = FOUNDING_500_GRANTS_TIER;

/** The session / subscription metadata (contract). */
export const FOUNDING_META_KEY = "founding" as const;
export const FOUNDING_500_TAG = "paid_500" as const;
export const FOUNDING_USER_META_KEY = "passport_user_id" as const;

/** Passport entitlement keys (contract). */
export const FOUNDING_100_ENTITLEMENT = `${FOUNDING_APP}.premium_trial`;
export const FOUNDING_500_ENTITLEMENT = `${FOUNDING_APP}.founding_500`;

/** FOUNDING 100 evidence: a trade decision the member recorded to their account (wm_decision.positions). */
export const FOUNDING_100_ACTIVITY_KIND = "other_verified" as const;
export const FOUNDING_100_EVIDENCE_PREFIX = `${FOUNDING_APP}:decision:`;

/** The Stripe events that can concern a FOUNDING 500 subscription (contract). */
export const FOUNDING_EVENT_TYPES = [
  "checkout.session.completed", "customer.subscription.created", "customer.subscription.updated",
  "customer.subscription.deleted", "invoice.paid", "charge.refunded",
] as const;

/** The only words the pricing page says about FOUNDING (Founder copy; no counts, no scarcity). */
export const FOUNDING_COPY = Object.freeze({
  paid500: "FOUNDING 500 — $10/month while you stay subscribed, with a 1-year price guarantee: your $10 is locked for 12 months, then it moves to the standard price and we tell you first.",
  promo100: "FOUNDING 100 — a free 30-day Premium trial after your first real save. No card. It never charges.",
});

/** Is FOUNDING on for WM Pro? Only `WM_FOUNDING_LIVE=on`. */
export function foundingLive(env: BillingEnv): boolean {
  return (env[FOUNDING_FLAG_ENV] ?? "").trim() === "on";
}

/** The answer every FOUNDING route gives while the flag is off. */
export const FOUNDING_OFF = { error: "FOUNDING_OFF" } as const;

const PRICE_ID = /^price_[A-Za-z0-9]{8,64}$/;
/** SERVER ONLY: the FOUNDING 500 price id, or null (not set → no checkout). */
export function foundingPriceId(env: BillingEnv): string | null {
  const v = (env[FOUNDING_PRICE_ENV] ?? "").trim();
  return PRICE_ID.test(v) ? v : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** The Passport user id as the RPCs take it (uuid), or null. */
export function passportUuid(raw: unknown): string | null {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return UUID.test(s) ? s : null;
}

/** The evidence reference for one recorded decision (contract: 10–512 chars). */
export function foundingEvidenceRef(decisionId: string): string | null {
  const ref = `${FOUNDING_100_EVIDENCE_PREFIX}${decisionId}`;
  return ref.length >= 10 && ref.length <= 512 ? ref : null;
}

/* ── Passport answers, read fail-closed ──────────────────────────────────────────── */

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export const RESERVE_REASONS = ["HELD", "HOLD_REFRESHED", "ALREADY_ACTIVE", "COHORT_FULL", "PROGRAM_NOT_OPEN", "INVALID_REQUEST"] as const;
export type ReserveReason = (typeof RESERVE_REASONS)[number];
export interface ReserveAnswer { readonly ok: boolean; readonly reason: ReserveReason; readonly enrollmentId: string | null; readonly holdUntil: string | null }

/** ath_svc_founding500_reserve's answer, or null when it is not one. */
export function readReserve(data: unknown): ReserveAnswer | null {
  const o = obj(data);
  if (!o || typeof o.ok !== "boolean" || !(RESERVE_REASONS as readonly string[]).includes(o.reason as string)) return null;
  return { ok: o.ok, reason: o.reason as ReserveReason, enrollmentId: str(o.enrollment_id), holdUntil: str(o.hold_until) };
}

/** May checkout proceed on this reservation? Only a held seat. */
export function reservationHolds(r: ReserveAnswer | null): boolean {
  return !!r && r.ok && (r.reason === "HELD" || r.reason === "HOLD_REFRESHED");
}

export const CLAIM_REASONS = ["ACTIVATED", "ALREADY_ENROLLED", "COHORT_FULL", "PROGRAM_NOT_OPEN", "INVALID_REQUEST", "ACTIVITY_KIND_INVALID"] as const;
export type ClaimReason = (typeof CLAIM_REASONS)[number];
export interface ClaimAnswer { readonly ok: boolean; readonly reason: ClaimReason; readonly enrollmentId: string | null; readonly expiresAt: string | null }

/** ath_svc_founding100_claim's answer, or null. */
export function readClaim(data: unknown): ClaimAnswer | null {
  const o = obj(data);
  if (!o || typeof o.ok !== "boolean" || !(CLAIM_REASONS as readonly string[]).includes(o.reason as string)) return null;
  return { ok: o.ok, reason: o.reason as ClaimReason, enrollmentId: str(o.enrollment_id), expiresAt: str(o.expires_at) };
}

/** ath_svc_founding_open's answer, or null. Booleans only — never a count. */
export function readFoundingOpen(data: unknown): { paid500: boolean; promotional100: boolean } | null {
  const o = obj(data);
  if (!o || typeof o.paid_500 !== "boolean" || typeof o.promotional_100 !== "boolean") return null;
  return { paid500: o.paid_500, promotional100: o.promotional_100 };
}

export interface FoundingGrant { readonly source: "founding_100" | "founding_500"; readonly entitlement: string; readonly expiresAt: string | null }

/**
 * Which WM Pro FOUNDING grant the member holds RIGHT NOW, from ath_svc_entitlements_for:
 *   · `wm_pro.founding_500` present (no expiry; the Passport revokes it on cancel), or
 *   · `wm_pro.premium_trial` whose expires_at is a real time still in the future.
 * A trial with no expiry, an unreadable expiry, or one already past grants NOTHING (a trial always ends).
 * Anything that is not a list → null (no grant).
 */
export function foundingGrantFrom(data: unknown, nowMs: number): FoundingGrant | null {
  if (!Array.isArray(data)) return null;
  let trial: FoundingGrant | null = null;
  for (const row of data) {
    const r = obj(row);
    if (!r || r.app !== FOUNDING_APP) continue;
    const startsAt = str(r.starts_at);
    if (startsAt && Number.isFinite(Date.parse(startsAt)) && Date.parse(startsAt) > nowMs) continue;
    const expiresAt = str(r.expires_at);
    const expMs = expiresAt ? Date.parse(expiresAt) : NaN;
    if (r.entitlement === FOUNDING_500_ENTITLEMENT) {
      if (expiresAt && !(Number.isFinite(expMs) && expMs > nowMs)) continue;
      return { source: "founding_500", entitlement: FOUNDING_500_ENTITLEMENT, expiresAt };
    }
    if (r.entitlement === FOUNDING_100_ENTITLEMENT && Number.isFinite(expMs) && expMs > nowMs) {
      trial = { source: "founding_100", entitlement: FOUNDING_100_ENTITLEMENT, expiresAt };
    }
  }
  return trial;
}

/** The tier a FOUNDING grant unlocks (the Founder-decision constants above), or null. */
export function foundingGrantTier(grant: FoundingGrant | null): PaidTier | null {
  if (!grant) return null;
  return grant.source === "founding_500" ? FOUNDING_500_GRANTS : FOUNDING_100_GRANTS;
}

/* ── the subscription read back from Stripe (webhook) ───────────────────────────── */

export interface FoundingSubscription {
  readonly id: string;
  readonly status: string;
  readonly paid: boolean;
  readonly userId: string;
  readonly livemode: boolean;
}

/**
 * A subscription object re-read from Stripe (expand latest_invoice). It is a WM Pro FOUNDING 500
 * subscription only when its OWN metadata says founding=paid_500, app=wm_pro and names a Passport uuid.
 * `paid` = latest_invoice.status === "paid" (contract). Anything else → null.
 */
export function readFoundingSubscription(data: unknown): FoundingSubscription | null {
  const o = obj(data);
  if (!o || o.object !== "subscription" || typeof o.id !== "string" || !/^sub_[A-Za-z0-9]{6,64}$/.test(o.id) || typeof o.status !== "string" || typeof o.livemode !== "boolean") return null;
  const m = obj(o.metadata) ?? {};
  if (m[FOUNDING_META_KEY] !== FOUNDING_500_TAG || m.app !== FOUNDING_APP) return null;
  const userId = passportUuid(m[FOUNDING_USER_META_KEY]);
  if (!userId) return null;
  const inv = obj(o.latest_invoice);
  return { id: o.id, status: o.status, paid: inv?.status === "paid", userId, livemode: o.livemode };
}

/**
 * From a VERIFIED event payload: does it say anything about FOUNDING? true = it says founding, false = its
 * metadata is present and says not founding, null = it cannot tell (an invoice without metadata, a charge).
 * This only decides whether to re-read the subscription; what is applied comes from the re-read.
 */
export function eventFoundingHint(event: unknown, foundingPrice: string | null): boolean | null {
  const ev = obj(event);
  const o = obj(obj(ev?.data)?.object);
  if (!ev || !o) return null;
  const tagged = (meta: unknown): boolean | null => { const m = obj(meta); return m ? m[FOUNDING_META_KEY] === FOUNDING_500_TAG : null; };
  if (ev.type === "checkout.session.completed" || String(ev.type).startsWith("customer.subscription.")) return tagged(o.metadata) ?? false;
  if (ev.type === "invoice.paid") {
    const fromParent = tagged(obj(obj(o.parent)?.subscription_details)?.metadata) ?? tagged(obj(o.subscription_details)?.metadata);
    if (fromParent) return true;
    const lines = (obj(o.lines)?.data as unknown[] | undefined) ?? [];
    if (foundingPrice && lines.some(l => { const li = obj(l); const p = obj(li?.price)?.id ?? obj(obj(li?.pricing)?.price_details)?.price; return p === foundingPrice; })) return true;
    return fromParent === false ? false : null;
  }
  return null;
}
