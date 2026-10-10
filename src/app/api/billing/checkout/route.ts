import { legalShownAtPurchase } from "@/lib/legal/legalVersion";
import { NextResponse } from "next/server";

import { billingKv, loadEntitlement, saveEntitlement } from "@/lib/billing/billingStore";
import { BILLING_PRODUCT, PASSPORT_REF_KEY, emptyEntitlement } from "@/lib/billing/entitlement";
import { BILLING_NOT_ON_SALE, billingStanding } from "@/lib/billing/standing";
import { resolveCustomer, stripeCall } from "@/lib/billing/stripeApi";
import { paidTierByName, tierPriceId } from "@/lib/billing/tiers";
import { requestIsSameOrigin } from "@/lib/broker/credentialProbeGate";
import { CANONICAL_URL } from "@/lib/canonicalUrl";
import { publicFailure } from "@/lib/publicFailure";
import { checkRateLimit } from "@/lib/rateLimit";
import { requireAuth } from "@/lib/requireAuth";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const CHECKOUT_LIMIT = { max: 5, windowMs: 10 * 60_000 } as const;
const refuse = (body: object, status: number) => NextResponse.json(body, { status, headers: NO_STORE });

/**
 * POST /api/billing/checkout — start a Stripe Checkout for ONE tier.
 *
 * Body: `{ "tier": "APP" | "PASSPORT" | "OS" }` and nothing else that matters:
 * the price id is the server's (an env var per tier); the client cannot send a
 * price, an amount, a customer or a URL. Signed-in members only, this site's
 * origin only, five starts per ten minutes.
 *
 * FAIL CLOSED: billing not configured, the tier not on sale, no record store,
 * or a customer that cannot be resolved to exactly one → nothing is created
 * and the member reads plain words.
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (!requestIsSameOrigin(request)) return refuse({ error: "Cross-site request refused.", code: "CROSS_SITE_REFUSED" }, 403);
  { const rl = checkRateLimit(`billing-checkout:${auth.user.sub}`, CHECKOUT_LIMIT); if (!rl.ok) return rl.response; }

  const standing = billingStanding(process.env);
  if (standing.mode === "NOT_CONFIGURED") return refuse(BILLING_NOT_ON_SALE, 503);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const tier = paidTierByName(body?.tier);
  if (!tier) return refuse({ error: "Name the plan to buy.", code: "UNKNOWN_TIER" }, 400);
  const priceId = tierPriceId(tier, process.env);
  if (!priceId) return refuse({ error: "That plan is not on sale yet.", code: "TIER_NOT_ON_SALE" }, 503);

  const kv = await billingKv();
  if (!kv) return refuse(BILLING_NOT_ON_SALE, 503);
  let record;
  try { record = await loadEntitlement(kv, auth.user.sub); } catch { return refuse(publicFailure(new Error("billing record unreadable"), "billing-checkout"), 503); }
  if (record && record.livemode === standing.live && record.status === "active") {
    return refuse({ error: "You already have an active plan. Change or cancel it from Manage billing.", code: "ALREADY_ACTIVE" }, 409);
  }

  // ONE customer per Passport identity across the shared account — found before it is ever created.
  const customer = await resolveCustomer({ env: process.env, userId: auth.user.sub, email: auth.user.email ?? null, storedCustomerId: record && record.livemode === standing.live ? record.customerId : null, modeWord: standing.mode });
  if (!customer.ok) {
    if (customer.code === "NEEDS_REVIEW") {
      console.warn(`[wm:billing] checkout held for review user=${auth.user.sub} reason=${customer.detail}`);
      return refuse({ error: "Your billing profile needs a quick review before checkout. Nothing was charged.", code: "NEEDS_REVIEW" }, 409);
    }
    return refuse(publicFailure(new Error(`customer ${customer.code} ${customer.detail}`), "billing-checkout"), 502);
  }
  try {
    const base = record && record.livemode === standing.live ? record : emptyEntitlement(auth.user.sub, standing.live);
    await saveEntitlement(kv, { ...base, customerId: customer.customerId, customerMatch: customer.match, legalShown: legalShownAtPurchase() });
  } catch {
    return refuse(publicFailure(new Error("billing record not saved"), "billing-checkout"), 503);
  }

  // WHICH LEGAL TEXT THE BUYER COULD READ, recorded with the purchase (one owner: lib/legal/legalVersion).
  const legalShown = legalShownAtPurchase();
  const metadata = { [PASSPORT_REF_KEY]: auth.user.sub, product: BILLING_PRODUCT, wm_tier: tier, legal_shown: legalShown };
  const session = await stripeCall(process.env, "checkout/sessions", {
    method: "POST",
    // Not clock-based: the same member asking for the same tier gets the same session back.
    idempotencyKey: `wmpro-checkout-${standing.mode}-${auth.user.sub}-${tier}`,
    params: {
      mode: "subscription",
      customer: customer.customerId,
      client_reference_id: auth.user.sub,
      line_items: { 0: { price: priceId, quantity: 1 } },
      success_url: `${CANONICAL_URL}/pricing?billing=success`,
      cancel_url: `${CANONICAL_URL}/pricing?billing=cancelled`,
      metadata,
      subscription_data: { metadata },
    },
  });
  const url = typeof session.data.url === "string" ? session.data.url : "";
  if (!session.ok || !url.startsWith("https://")) {
    const said = (session.data.error as { type?: string; code?: string } | undefined) ?? {};
    return refuse(publicFailure(new Error(`checkout session HTTP ${session.status} ${said.type ?? ""} ${said.code ?? ""}`), "billing-checkout"), 502);
  }
  if (session.data.livemode !== standing.live) return refuse(BILLING_NOT_ON_SALE, 503);
  return NextResponse.json({ url, mode: standing.mode, tier }, { status: 201, headers: NO_STORE });
}
