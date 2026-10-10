import { NextResponse } from "next/server";

import { billingKv, loadEntitlement } from "@/lib/billing/billingStore";
import { BILLING_NOT_ON_SALE, billingStanding } from "@/lib/billing/standing";
import { stripeCall } from "@/lib/billing/stripeApi";
import { requestIsSameOrigin } from "@/lib/broker/credentialProbeGate";
import { CANONICAL_URL } from "@/lib/canonicalUrl";
import { publicFailure } from "@/lib/publicFailure";
import { checkRateLimit } from "@/lib/rateLimit";
import { requireAuth } from "@/lib/requireAuth";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const refuse = (body: object, status: number) => NextResponse.json(body, { status, headers: NO_STORE });

/**
 * POST /api/billing/portal — a Stripe billing-portal session for the member's
 * OWN customer (update the card, change or cancel the plan). The customer id is
 * the one on the member's record; the client sends nothing.
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (!requestIsSameOrigin(request)) return refuse({ error: "Cross-site request refused.", code: "CROSS_SITE_REFUSED" }, 403);
  { const rl = checkRateLimit(`billing-portal:${auth.user.sub}`, { max: 10, windowMs: 10 * 60_000 }); if (!rl.ok) return rl.response; }
  const standing = billingStanding(process.env);
  if (standing.mode === "NOT_CONFIGURED") return refuse(BILLING_NOT_ON_SALE, 503);
  let record = null;
  try { record = await loadEntitlement(await billingKv(), auth.user.sub); } catch { record = null; }
  if (!record || record.livemode !== standing.live || !record.customerId) return refuse({ error: "There is no plan on this account to manage.", code: "NO_PLAN" }, 404);
  const session = await stripeCall(process.env, "billing_portal/sessions", { method: "POST", params: { customer: record.customerId, return_url: `${CANONICAL_URL}/pricing` } });
  const url = typeof session.data.url === "string" ? session.data.url : "";
  if (!session.ok || !url.startsWith("https://")) return refuse(publicFailure(new Error(`portal session HTTP ${session.status}`), "billing-portal"), 502);
  return NextResponse.json({ url }, { status: 201, headers: NO_STORE });
}
