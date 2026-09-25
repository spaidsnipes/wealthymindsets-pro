import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import {
  probeWebullPositions,
  type WebullPositionsReceipt,
} from "@/lib/broker/adapters/webullPositions";
import { webullBrokerConfigFromEnv } from "@/lib/broker/adapters/webullBrokerConnection";
import { webullSessionStore, webullWorkerEnv } from "@/lib/marketData/webullSessionStore";
import { webullOwnerGate, webullOwnerRefusal } from "@/lib/broker/webullOwner";

/**
 * /api/broker/webull/positions — the wire behind the BROKER COST LINE
 * (HOUSE PLAN bolt-on, build order #6).
 *
 * READ-ONLY by construction: the probe it delegates to can prove what is
 * held and nothing else — no order, cancel, or transfer path exists in it.
 *
 * Optional `?symbol=TSLA` narrows the receipt to positions whose underlying
 * matches, so the chart room fetches only what it can paint. The narrowing
 * happens AFTER the probe so the state ("OBSERVED" vs "NO_POSITIONS") still
 * describes the whole read — a trader charting a symbol they do not hold
 * gets an empty `positions` array under an honest OBSERVED state, which is
 * exactly the "no position in this symbol" absence, not an error.
 *
 * Account ids, position ids and leg ids never appear in the response —
 * enforced by the probe's own tests. Gated behind a WM session like every
 * /api/broker/* route.
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  // GP12 §15: these are the owner's positions, not every signed-in user's.
  const owner = webullOwnerGate(auth.user.sub, process.env, "TRANSITIONAL");
  if (!owner.allowed) return NextResponse.json(webullOwnerRefusal(owner), { status: 403 });

  const receipt = await probeWebullPositions(fetch, {
    ...webullBrokerConfigFromEnv(process.env),
    // Same runtime session the status + data lanes use — one 2FA approval
    // serves every lane instead of one prompt per lane.
    tokenStore: webullSessionStore(await webullWorkerEnv()),
  });

  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol")?.trim().toUpperCase() || null;
  const narrowed: WebullPositionsReceipt = symbol
    ? { ...receipt, positions: receipt.positions.filter((position) => position.symbol === symbol) }
    : receipt;
  // Stated, not silent, until the owner is named on this deployment.
  const body = { ...narrowed, ownerGate: owner.state };

  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
