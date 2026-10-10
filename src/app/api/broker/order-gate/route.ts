import { readOrderRate } from "@/lib/execution/orderRateLimit";
import { NextRequest, NextResponse } from "next/server";

import { brokerOwnerRefusal, tastytradeOwnerGate } from "@/lib/broker/brokerOwner";
import { orderDecisionKv } from "@/lib/broker/orderDecisionLedger";
import { webullOwnerGate, webullOwnerRefusal } from "@/lib/broker/webullOwner";
import type { ServerOrderLimits } from "@/lib/execution/liveOrderPreflight";
import { GATE_BROKERS, orderGateStanding, type GateBroker } from "@/lib/execution/orderGateStanding";
import { loadServerOrderLimits } from "@/lib/execution/serverOrderLimitsStore";
import { webullWorkerEnv } from "@/lib/marketData/webullSessionStore";
import { requireAuth } from "@/lib/requireAuth";
import { tastytradeConfigStatus } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Garden 19 §66 — THE SERVER GATE, READ. Owner only, GET only, read only.
 *
 *   GET /api/broker/order-gate?broker=webull|tastytrade
 *
 * Loads the same server-held limits the submit door loads and asks the same
 * gate (`orderGateStanding` → `preflightLiveOrder`) what it would say right now
 * to a risk-increasing order. It contacts NO broker, writes NO ledger row and
 * stores nothing. A guest is 401; a member is 403 with the owner refusal.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const asked = (req.nextUrl.searchParams.get("broker") ?? "").trim().toLowerCase();
  const broker = GATE_BROKERS.find(b => b === asked) as GateBroker | undefined;
  if (!broker) return NextResponse.json({ state: "BAD_REQUEST", reason: "Pass ?broker=webull or ?broker=tastytrade." }, { status: 400, headers: NO_STORE });

  if (broker === "webull") {
    const owner = webullOwnerGate(auth.user.sub, process.env);
    if (!owner.allowed) return NextResponse.json(webullOwnerRefusal(owner), { status: 403, headers: NO_STORE });
  } else {
    const owner = tastytradeOwnerGate(auth.user.sub, process.env);
    if (!owner.allowed) return NextResponse.json(brokerOwnerRefusal(owner), { status: 403, headers: NO_STORE });
  }

  // The SAME read the submit doors make. Unreadable limits read as none: the gate then refuses (fail closed).
  let limits: ServerOrderLimits | null = null;
  let limitsRead: "READ" | "NO_STORE" | "UNREADABLE" = "READ";
  let kv: ReturnType<typeof orderDecisionKv> = null;
  try {
    kv = orderDecisionKv(await webullWorkerEnv());
    if (!kv) limitsRead = "NO_STORE";
    limits = await loadServerOrderLimits(kv, auth.user.sub);
  } catch {
    limits = null;
    limitsRead = "UNREADABLE";
  }
  const serverEnvironment = tastytradeConfigStatus().env === "cert" ? "cert" : "production";
  const standing = orderGateStanding({ broker, limits, serverEnvironment, nowMs: Date.now() });
  // The order-rate budget, read only (the same counter the submit door reserves against).
  let orderRate = null;
  try { orderRate = await readOrderRate(kv, { broker, ownerId: auth.user.sub, limits, nowMs: standing.asOfMs }); } catch { orderRate = null; }
  return NextResponse.json(
    { state: "OK", ...standing, orderRate, limitsRead, asOf: new Date(standing.asOfMs).toISOString(), sent: false, note: "Read only: no order, no broker call, no ledger write." },
    { headers: NO_STORE },
  );
}
