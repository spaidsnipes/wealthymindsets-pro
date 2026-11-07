import { NextResponse } from "next/server";

import { foundingLive, foundingPriceId, readFoundingOpen } from "@/lib/billing/founding";
import { foundingOpen } from "@/lib/billing/foundingPassport";
import { billingStanding } from "@/lib/billing/standing";
import { PAID_TIERS, tiersOnSale } from "@/lib/billing/tiers";
import { publicProxyLimit } from "@/lib/publicProxyLimit";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/tiers — PUBLIC. Which paid tiers are on sale right now and
 * the standing word. Booleans and one word only: no price id, nothing about
 * the key. A signed-out visitor's pricing page reads this to say "Sign in to
 * buy" on a tier that is on sale, and "Not on sale yet" on the rest. `founding` (booleans) appears only
 * while WM_FOUNDING_LIVE=on.
 */
export async function GET(request: Request) {
  { const limited = await publicProxyLimit(request, "feed"); if (limited) return limited; }
  const standing = billingStanding(process.env);
  const onSale = standing.mode === "NOT_CONFIGURED" ? [] : tiersOnSale(process.env);
  const tiers = Object.fromEntries(PAID_TIERS.map(t => [t, onSale.includes(t)]));
  // FOUNDING (Founder 2026-11-06): present ONLY while WM_FOUNDING_LIVE=on and the Passport answers. Booleans,
  // never a count. Off, or unreadable → the key is absent and the pricing page shows nothing about FOUNDING.
  let founding: { paid500: boolean; promotional100: boolean } | null = null;
  if (foundingLive(process.env)) {
    const got = await foundingOpen();
    const open = got.ok ? readFoundingOpen(got.data) : null;
    // FOUNDING 500 is offered only when it can actually be bought here (billing on + its price configured).
    if (open) founding = { paid500: open.paid500 && standing.mode !== "NOT_CONFIGURED" && foundingPriceId(process.env) !== null, promotional100: open.promotional100 };
  }
  return NextResponse.json({ mode: standing.mode, tiers, ...(founding ? { founding } : {}) }, { headers: { "Cache-Control": "no-store" } });
}
