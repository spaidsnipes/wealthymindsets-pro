import { NextResponse } from "next/server";

import { billingKv, loadEntitlement, saveEntitlement } from "@/lib/billing/billingStore";
import { BILLING_PRODUCT, PASSPORT_REF_KEY, emptyEntitlement } from "@/lib/billing/entitlement";
import {
  FOUNDING_500_CENTS, FOUNDING_500_GRANTS, FOUNDING_500_HOLD_MINUTES, FOUNDING_500_TAG, FOUNDING_APP, FOUNDING_META_KEY, FOUNDING_OFF,
  FOUNDING_USER_META_KEY, foundingLive, foundingPriceId, passportUuid, readReserve, reservationHolds,
} from "@/lib/billing/founding";
import { founding500Reserve } from "@/lib/billing/foundingPassport";
import { BILLING_NOT_ON_SALE, billingStanding } from "@/lib/billing/standing";
import { priceMismatch, resolveCustomer, stripeCall } from "@/lib/billing/stripeApi";
import { worldPassCovers, worldPassTier } from "@/lib/billing/worldPass";
import { currentWorldPass } from "@/lib/billing/worldPassRead";
import { requestIsSameOrigin } from "@/lib/broker/credentialProbeGate";
import { CANONICAL_URL } from "@/lib/canonicalUrl";
import { legalShownAtPurchase } from "@/lib/legal/legalVersion";
import { OFFER_RETIRED, bodyAsksForOffer } from "@/lib/pricing/passportPromo";
import { publicFailure } from "@/lib/publicFailure";
import { checkRateLimit } from "@/lib/rateLimit";
import { requireAuth } from "@/lib/requireAuth";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const LIMIT = { max: 5, windowMs: 10 * 60_000 } as const;
const refuse = (body: object, status: number) => NextResponse.json(body, { status, headers: NO_STORE });
const NOT_STARTED = { error: "FOUNDING 500 can't be started right now. Nothing was charged.", code: "FOUNDING_UNAVAILABLE" } as const;

/**
 * POST /api/billing/founding/checkout — FOUNDING 500: $10/month for as long as you stay subscribed.
 *
 * Flag off (WM_FOUNDING_LIVE ≠ "on") → 404 FOUNDING_OFF before anything else is read.
 * Signed-in Passport member, this site's origin, five starts per ten minutes. The body chooses nothing.
 *
 * ORDER (contract): the price is read back from Stripe (usd / 1000 / month / active) → the SEAT IS RESERVED
 * with the Passport (ath_svc_founding500_reserve) → only then is a customer resolved and the Checkout
 * session created. COHORT_FULL / ALREADY_ACTIVE / anything unreadable → no session, plain words, no count.
 * The session carries NO promotion codes, NO discounts, NO trial days and NO coupon.
 */
export async function POST(request: Request) {
  if (!foundingLive(process.env)) return refuse(FOUNDING_OFF, 404);
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (!requestIsSameOrigin(request)) return refuse({ error: "Cross-site request refused.", code: "CROSS_SITE_REFUSED" }, 403);
  { const rl = checkRateLimit(`founding-checkout:${auth.user.sub}`, LIMIT); if (!rl.ok) return rl.response; }

  const user = passportUuid(auth.user.sub);
  if (!user) return refuse({ error: "FOUNDING 500 needs a WOW Passport sign-in.", code: "NOT_A_PASSPORT" }, 403);
  const standing = billingStanding(process.env);
  if (standing.mode === "NOT_CONFIGURED") return refuse(BILLING_NOT_ON_SALE, 503);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (bodyAsksForOffer(body)) return refuse(OFFER_RETIRED, 410);
  const priceId = foundingPriceId(process.env);
  if (!priceId) return refuse({ error: "FOUNDING 500 is not on sale yet. Nothing was charged.", code: "FOUNDING_NOT_ON_SALE" }, 503);

  const kv = await billingKv();
  if (!kv) return refuse(BILLING_NOT_ON_SALE, 503);
  let record;
  try { record = await loadEntitlement(kv, auth.user.sub); } catch { return refuse(publicFailure(new Error("billing record unreadable"), "founding-checkout"), 503); }
  if (record && record.livemode === standing.live && record.status === "active") {
    return refuse({ error: "You already have an active plan. Change or cancel it from Manage billing.", code: "ALREADY_ACTIVE" }, 409);
  }
  if (worldPassCovers(worldPassTier(await currentWorldPass(auth.user.sub, kv), standing.live), FOUNDING_500_GRANTS)) {
    return refuse({ error: "You're covered by your World Pass — this plan is already included. Nothing was charged.", code: "COVERED_BY_WORLD_PASS" }, 409);
  }

  // THE PAGE'S PRICE IS THE CHARGE: the FOUNDING price must be exactly $10.00 / month, USD, active.
  const mismatch = await priceMismatch(process.env, priceId, FOUNDING_500_CENTS);
  if (mismatch) {
    console.warn(`[wm:founding] checkout refused reason=${mismatch}`);
    return refuse({ error: "FOUNDING 500 is not on sale yet. Nothing was charged.", code: "FOUNDING_NOT_ON_SALE" }, 503);
  }

  // RESERVE THE SEAT FIRST. No hold → no session.
  const reserved = await founding500Reserve(user, FOUNDING_500_HOLD_MINUTES);
  const hold = reserved.ok ? readReserve(reserved.data) : null;
  if (!reservationHolds(hold)) {
    if (hold?.reason === "COHORT_FULL") return refuse({ error: "FOUNDING 500 is full for WM Pro. Nothing was charged.", code: "COHORT_FULL" }, 409);
    if (hold?.reason === "ALREADY_ACTIVE") return refuse({ error: "You already hold FOUNDING 500.", code: "ALREADY_FOUNDING" }, 409);
    if (hold?.reason === "PROGRAM_NOT_OPEN") return refuse({ error: "FOUNDING 500 is not open right now. Nothing was charged.", code: "PROGRAM_NOT_OPEN" }, 409);
    console.warn(`[wm:founding] reserve failed ${reserved.ok ? `reason=${hold?.reason ?? "UNREADABLE"}` : reserved.why}`);
    return refuse(NOT_STARTED, 503);
  }

  const customer = await resolveCustomer({ env: process.env, userId: auth.user.sub, email: auth.user.email ?? null, storedCustomerId: record && record.livemode === standing.live ? record.customerId : null, modeWord: standing.mode });
  if (!customer.ok) {
    if (customer.code === "NEEDS_REVIEW") return refuse({ error: "Your billing profile needs a quick review before checkout. Nothing was charged.", code: "NEEDS_REVIEW" }, 409);
    return refuse(publicFailure(new Error(`customer ${customer.code} ${customer.detail}`), "founding-checkout"), 502);
  }
  const legalShown = legalShownAtPurchase();
  try {
    const base = record && record.livemode === standing.live ? record : emptyEntitlement(auth.user.sub, standing.live);
    await saveEntitlement(kv, { ...base, customerId: customer.customerId, customerMatch: customer.match, legalShown });
  } catch {
    return refuse(publicFailure(new Error("billing record not saved"), "founding-checkout"), 503);
  }

  // Contract metadata ({founding, app, passport_user_id}) on the session AND the subscription, plus WM Pro's own
  // keys so the existing entitlement reducer records the member's tier exactly as for any plan.
  const metadata = {
    [FOUNDING_META_KEY]: FOUNDING_500_TAG, app: FOUNDING_APP, [FOUNDING_USER_META_KEY]: user,
    [PASSPORT_REF_KEY]: auth.user.sub, product: BILLING_PRODUCT, wm_tier: FOUNDING_500_GRANTS, legal_shown: legalShown,
  };
  // The checkout link lives slightly past the 30-minute hold (Stripe's minimum); bucketed so a retry within
  // five minutes sends identical parameters under the same idempotency key and gets the same session back.
  const bucket = Math.floor(Date.now() / 300_000) * 300;
  const session = await stripeCall(process.env, "checkout/sessions", {
    method: "POST",
    idempotencyKey: `wmpro-founding500-${standing.mode}-${auth.user.sub}-${hold!.enrollmentId ?? "x"}-${bucket}`,
    params: foundingSessionParams({ customerId: customer.customerId, userRef: auth.user.sub, priceId, metadata, expiresAtSec: bucket + 30 * 60 + 300 }),
  });
  const url = typeof session.data.url === "string" ? session.data.url : "";
  if (!session.ok || !url.startsWith("https://")) {
    const said = (session.data.error as { type?: string; code?: string } | undefined) ?? {};
    return refuse(publicFailure(new Error(`founding session HTTP ${session.status} ${said.type ?? ""} ${said.code ?? ""}`), "founding-checkout"), 502);
  }
  if (session.data.livemode !== standing.live) return refuse(BILLING_NOT_ON_SALE, 503);
  return NextResponse.json({ url, mode: standing.mode }, { status: 201, headers: NO_STORE });
}

/**
 * THE FOUNDING 500 SESSION — the only shape it can take. There is no field here for a promotion code, a
 * discount, a coupon or a trial, and a sentinel test reads this function to keep it that way.
 */
function foundingSessionParams(a: { customerId: string; userRef: string; priceId: string; metadata: Record<string, string>; expiresAtSec: number }) {
  return {
    mode: "subscription",
    customer: a.customerId,
    client_reference_id: a.userRef,
    line_items: { 0: { price: a.priceId, quantity: 1 } },
    success_url: `${CANONICAL_URL}/pricing?billing=success&founding=500`,
    cancel_url: `${CANONICAL_URL}/pricing?billing=cancelled`,
    expires_at: a.expiresAtSec,
    metadata: a.metadata,
    subscription_data: { metadata: a.metadata },
  };
}
