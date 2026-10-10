import { NextResponse } from "next/server";

import { billingKv, readBillingOps } from "@/lib/billing/billingStore";
import { billingReadiness } from "@/lib/billing/readiness";
import { operatorOnly } from "@/lib/operatorOnly";
import { requireAuth } from "@/lib/requireAuth";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/readiness — OPERATOR ONLY, read only. Which setup names are
 * present (never a value), the standing word, the last verified webhook event
 * and the count of billing records by status. A guest is 401; a member is 403
 * in plain words and reads none of it.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  { const refusal = operatorOnly(auth.user.sub); if (refusal) return refusal; }
  let kv = null;
  try { kv = await billingKv(); } catch { kv = null; }
  return NextResponse.json(billingReadiness(process.env, await readBillingOps(kv), Date.now()), { headers: { "Cache-Control": "no-store" } });
}
