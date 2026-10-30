import { NextResponse } from "next/server";

import { billingStanding } from "@/lib/billing/standing";
import { PAID_TIERS, tiersOnSale } from "@/lib/billing/tiers";
import { publicProxyLimit } from "@/lib/publicProxyLimit";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/tiers — PUBLIC. Which paid tiers are on sale right now and
 * the standing word. Booleans and one word only: no price id, nothing about
 * the key. A signed-out visitor's pricing page reads this to say "Sign in to
 * buy" on a tier that is on sale, and "Not on sale yet" on the rest.
 */
export async function GET(request: Request) {
  { const limited = await publicProxyLimit(request, "feed"); if (limited) return limited; }
  const standing = billingStanding(process.env);
  const onSale = standing.mode === "NOT_CONFIGURED" ? [] : tiersOnSale(process.env);
  const tiers = Object.fromEntries(PAID_TIERS.map(t => [t, onSale.includes(t)]));
  return NextResponse.json({ mode: standing.mode, tiers }, { headers: { "Cache-Control": "no-store" } });
}
