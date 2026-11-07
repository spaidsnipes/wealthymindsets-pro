import { NextResponse } from "next/server";

import { billingKv, loadEntitlement } from "@/lib/billing/billingStore";
import { memberTierOf } from "@/lib/billing/entitlement";
import { billingStanding } from "@/lib/billing/standing";
import { PAID_TIERS, tiersOnSale } from "@/lib/billing/tiers";
import { publicProxyLimit } from "@/lib/publicProxyLimit";
import { requireAuth } from "@/lib/requireAuth";
import { combinedTier, worldPassCovers, worldPassTier, WORLD_PASS_BUY_URL } from "@/lib/billing/worldPass";
import { currentWorldPass } from "@/lib/billing/worldPassRead";
import { entitlementsFor } from "@/lib/billing/planEntitlements";
import { foundingGrantFrom, foundingGrantTier, foundingLive, passportUuid, type FoundingGrant } from "@/lib/billing/founding";
import { entitlementsFor as passportEntitlementsFor } from "@/lib/billing/foundingPassport";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/standing — the signed-in member's OWN billing standing:
 * the tier their record grants now, its status, when the paid period ends, and
 * which tiers are on sale. A guest is 401. Read only (it may refresh the cached
 * World Pass read from WOW OS; `?worldPass=refresh` — the pricing page — forces it).
 *
 * `entitlements` is what that tier unlocks (planEntitlements.ts): invention cap, timeframes, auto-trading.
 *
 * `tier` is what the member HAS: the highest of their own WM Pro tier (`ownTier`), what their World
 * Pass covers (`worldPass.grants`) and — only while WM_FOUNDING_LIVE=on — a FOUNDING grant read from the
 * Passport (`founding`), never added up.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  { const limited = await publicProxyLimit(request, "data"); if (limited) return limited; }
  const standing = billingStanding(process.env);
  const onSale = standing.mode === "NOT_CONFIGURED" ? [] : tiersOnSale(process.env);
  const tiers = Object.fromEntries(PAID_TIERS.map(t => [t, onSale.includes(t)]));
  let record = null;
  let pass = null;
  let store: "READ" | "NO_STORE" | "UNREADABLE" = "READ";
  try {
    const kv = await billingKv();
    if (!kv) store = "NO_STORE";
    record = await loadEntitlement(kv, auth.user.sub);
    if (standing.mode !== "NOT_CONFIGURED") pass = await currentWorldPass(auth.user.sub, kv, { force: new URL(request.url).searchParams.get("worldPass") === "refresh" });
  } catch {
    store = "UNREADABLE";
  }
  const inMode = standing.mode !== "NOT_CONFIGURED" && record !== null && record.livemode === standing.live;
  const serverLive = standing.mode === "NOT_CONFIGURED" ? null : standing.live;
  const ownTier = memberTierOf(record, serverLive);
  const grants = worldPassTier(pass, serverLive);
  // FOUNDING (Founder 2026-11-06), only while WM_FOUNDING_LIVE=on: the Passport's grant — FOUNDING 500 held, or
  // a FOUNDING 100 trial not yet expired — unlocks Premium. Unreadable → no grant (fail closed).
  let founding: FoundingGrant | null = null;
  if (foundingLive(process.env)) {
    const uuid = passportUuid(auth.user.sub);
    const got = uuid ? await passportEntitlementsFor(uuid) : null;
    founding = got && got.ok ? foundingGrantFrom(got.data, Date.now()) : null;
  }
  const tier = combinedTier(combinedTier(ownTier, grants), foundingGrantTier(founding));
  return NextResponse.json(
    {
      ...(foundingLive(process.env) ? { founding: founding ? { source: founding.source, expiresAt: founding.expiresAt } : null } : {}),
      mode: standing.mode,
      tiers,
      tier,
      ownTier,
      // WHAT THE MEMBER MAY USE (Founder pricing 2026-11-06), decided HERE from the tier above + the member's own
      // Passport id (Founders / partner grants). The chart obeys this answer; it never names its own tier.
      entitlements: entitlementsFor({ tier, userId: auth.user.sub, env: process.env }),
      // The one World Pass lives on WOW OS. `paidAlso`: the member also pays WM Pro for a tier the pass covers (cancel it; never stacked).
      worldPass: pass && pass.livemode === serverLive ? { status: pass.status, chosenApp: pass.chosenApp, grants, currentPeriodEnd: pass.currentPeriodEnd, fetchedAt: pass.fetchedAt, paidAlso: worldPassCovers(grants, ownTier) } : null,
      worldPassUrl: WORLD_PASS_BUY_URL,
      status: inMode ? record!.status : null,
      currentPeriodEnd: inMode ? record!.currentPeriodEnd : null,
      canManage: inMode && !!record!.customerId,
      store,
      asOf: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
