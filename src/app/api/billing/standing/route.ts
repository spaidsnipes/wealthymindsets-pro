import { NextResponse } from "next/server";

import { billingKv, loadEntitlement } from "@/lib/billing/billingStore";
import { memberTierOf } from "@/lib/billing/entitlement";
import { billingStanding } from "@/lib/billing/standing";
import { PAID_TIERS, tiersOnSale } from "@/lib/billing/tiers";
import { publicProxyLimit } from "@/lib/publicProxyLimit";
import { requireAuth } from "@/lib/requireAuth";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/standing — the signed-in member's OWN billing standing:
 * the tier their record grants now, its status, when the paid period ends, and
 * which tiers are on sale. A guest is 401. Read only.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  { const limited = await publicProxyLimit(request, "data"); if (limited) return limited; }
  const standing = billingStanding(process.env);
  const onSale = standing.mode === "NOT_CONFIGURED" ? [] : tiersOnSale(process.env);
  const tiers = Object.fromEntries(PAID_TIERS.map(t => [t, onSale.includes(t)]));
  let record = null;
  let store: "READ" | "NO_STORE" | "UNREADABLE" = "READ";
  try {
    const kv = await billingKv();
    if (!kv) store = "NO_STORE";
    record = await loadEntitlement(kv, auth.user.sub);
  } catch {
    store = "UNREADABLE";
  }
  const inMode = standing.mode !== "NOT_CONFIGURED" && record !== null && record.livemode === standing.live;
  return NextResponse.json(
    {
      mode: standing.mode,
      tiers,
      tier: memberTierOf(record, standing.mode === "NOT_CONFIGURED" ? null : standing.live),
      status: inMode ? record!.status : null,
      currentPeriodEnd: inMode ? record!.currentPeriodEnd : null,
      canManage: inMode && !!record!.customerId,
      store,
      asOf: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
