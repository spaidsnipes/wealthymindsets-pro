import { NextResponse } from "next/server";

import { billingKv, loadEntitlement, saveEntitlement, userForCustomer } from "@/lib/billing/billingStore";
import { emptyEntitlement, readStripeEvent, reduceBillingEvent, withChargeLink } from "@/lib/billing/entitlement";
import { STRIPE_WEBHOOK_SECRET_ENV, billingStanding } from "@/lib/billing/standing";
import { chargeLink } from "@/lib/billing/stripeApi";
import { verifyStripeSignature } from "@/lib/billing/webhookSignature";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const answer = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

/**
 * POST /api/billing/webhook — Stripe's events for WM Pro.
 *
 * The RAW body is verified against the endpoint's signing secret before
 * anything is parsed: unsigned, stale or forged → 400 and nothing is read.
 * A verified event in the wrong mode, for another product, or already applied
 * is answered 200 and changes nothing. The entitlement changes ONLY through
 * the reducer. If the record cannot be read or written the answer is 503, so
 * Stripe delivers the event again rather than losing it.
 */
export async function POST(request: Request) {
  const payload = await request.text();
  const signed = await verifyStripeSignature(payload, request.headers.get("stripe-signature"), process.env[STRIPE_WEBHOOK_SECRET_ENV], Math.floor(Date.now() / 1000));
  if (!signed) return answer({ error: "A valid signature is required.", code: "BAD_SIGNATURE" }, 400);

  let parsed: unknown;
  try { parsed = JSON.parse(payload); } catch { return answer({ error: "Not an event.", code: "INVALID_EVENT" }, 400); }
  let ev = readStripeEvent(parsed);
  if (!ev) return answer({ error: "Not an event.", code: "INVALID_EVENT" }, 400);

  const standing = billingStanding(process.env);
  if (standing.mode === "NOT_CONFIGURED") return answer({ outcome: "IGNORED_NOT_CONFIGURED" });
  if (ev.livemode !== standing.live) return answer({ outcome: "WRONG_MODE" });

  // A refund or a dispute names a charge: find which subscription it paid for before judging it.
  if (ev.type === "charge.refunded" || ev.type === "charge.dispute.created") {
    const link = await chargeLink(process.env, ev.chargeId);
    if (!link.read) return answer({ error: "The charge could not be read yet.", code: "RETRY" }, 503);
    ev = withChargeLink(ev, link);
  }

  let kv;
  try { kv = await billingKv(); } catch { kv = null; }
  if (!kv) return answer({ error: "The record store is not available.", code: "RETRY" }, 503);
  try {
    const userId = ev.userId ?? (await userForCustomer(kv, ev.customerId));
    if (!userId) return answer({ outcome: "NO_RECORD" });
    const stored = await loadEntitlement(kv, userId);
    const before = stored && stored.livemode === standing.live ? stored : emptyEntitlement(userId, standing.live);
    const result = reduceBillingEvent(before, ev, { serverLive: standing.live, env: process.env });
    if (result.record !== before) await saveEntitlement(kv, result.record);
    return answer({ outcome: result.outcome, changed: result.changed });
  } catch {
    return answer({ error: "The record could not be written.", code: "RETRY" }, 503);
  }
}
