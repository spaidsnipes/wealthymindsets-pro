import { NextRequest, NextResponse } from "next/server";

import { brokerOwnerRefusal, tastytradeOwnerGate } from "@/lib/broker/brokerOwner";
import { orderDecisionKv } from "@/lib/broker/orderDecisionLedger";
import { applyLimitsChange, loadServerOrderLimits, saveServerOrderLimits, type LimitsPatch } from "@/lib/execution/serverOrderLimitsStore";
import { webullWorkerEnv } from "@/lib/marketData/webullSessionStore";
import { requireAuth } from "@/lib/requireAuth";
import { tastytradeConfigStatus } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Garden 19 §23 / P0.3 — THE SERVER-HELD ORDER LIMITS AND THE KILL SWITCH.
 * Owner only. GET reads them (plus the environment the server trades); PUT
 * changes them. The order-submit route reads the same record on every send.
 * No KV store on this deployment → NO_STORE, and every live send is refused.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const owner = tastytradeOwnerGate(auth.user.sub, process.env);
  if (!owner.allowed) return NextResponse.json(brokerOwnerRefusal(owner), { status: 403, headers: NO_STORE });
  const kv = orderDecisionKv(await webullWorkerEnv());
  if (!kv) return NextResponse.json({ state: "NO_STORE", limits: null, environment: tastytradeConfigStatus().env }, { headers: NO_STORE });
  try {
    const limits = await loadServerOrderLimits(kv, auth.user.sub);
    return NextResponse.json({ state: limits ? "SET" : "UNSET", limits, environment: tastytradeConfigStatus().env }, { headers: NO_STORE });
  } catch (e) {
    return NextResponse.json({ state: "UNREADABLE", reason: e instanceof Error ? e.message : "unknown", limits: null, environment: tastytradeConfigStatus().env }, { headers: NO_STORE });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const owner = tastytradeOwnerGate(auth.user.sub, process.env);
  if (!owner.allowed) return NextResponse.json(brokerOwnerRefusal(owner), { status: 403, headers: NO_STORE });
  let patch: LimitsPatch;
  try { patch = (await req.json()) as LimitsPatch; } catch { return NextResponse.json({ state: "BAD_REQUEST", reason: "Body must be JSON." }, { status: 400, headers: NO_STORE }); }
  const kv = orderDecisionKv(await webullWorkerEnv());
  if (!kv) return NextResponse.json({ state: "NO_STORE", reason: "This deployment has no store for order limits; live sends stay refused." }, { status: 503, headers: NO_STORE });
  try {
    const current = await loadServerOrderLimits(kv, auth.user.sub);
    const change = applyLimitsChange(current, patch ?? {}, Date.now());
    if (!change.ok) return NextResponse.json({ state: "REFUSED", reason: change.reason, limits: current }, { status: 422, headers: NO_STORE });
    await saveServerOrderLimits(kv, auth.user.sub, change.limits);
    return NextResponse.json({ state: "SET", limits: change.limits, environment: tastytradeConfigStatus().env }, { headers: NO_STORE });
  } catch (e) {
    return NextResponse.json({ state: "NOT_SAVED", reason: e instanceof Error ? e.message : "unknown" }, { status: 500, headers: NO_STORE });
  }
}
