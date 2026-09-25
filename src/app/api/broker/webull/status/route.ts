import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { getAdapter } from "../../../../../lib/broker/adapters";
import {
  probeWebullBrokerConnection,
  webullBrokerConfigFromEnv,
} from "@/lib/broker/adapters/webullBrokerConnection";
import {
  missingSecretsForState,
  webullConnectOAuthReadiness,
  webullCredentialPresence,
  type WebullStatus,
} from "@/lib/broker/webullStatus";
import { webullSessionStore, webullWorkerEnv } from "@/lib/marketData/webullSessionStore";
import { readWebullKeeperRecord } from "@/lib/marketData/webullSessionKeeperJob";
import { webullOwnerGate, webullOwnerRefusal } from "@/lib/broker/webullOwner";

/**
 * /api/broker/webull/status
 *
 * Founder canon §12 truthful status endpoint. As of shift-F this
 * route delegates to the canonical BrokerAdapter registry —
 * getAdapter("webull").health() is the single source of truth for
 * every Webull-related status surface. When a real adapter lands
 * (Webull) the endpoint updates automatically without route churn.
 *
 * Never returns tokens or secret values.
 */
export async function GET(request: Request): Promise<Response> {
  // Gated behind a WM session — infra recon consistency with the
  // /api/broker/{status,certification,readiness} routes.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  // GP12 §15: account state belongs to the owner of these credentials.
  const owner = webullOwnerGate(auth.user.sub, process.env, "TRANSITIONAL");
  if (!owner.allowed) return NextResponse.json(webullOwnerRefusal(owner), { status: 403 });
  const adapter = getAdapter("webull");
  const h = adapter?.health();
  const workerEnv = await webullWorkerEnv();
  const live = await probeWebullBrokerConnection(fetch, {
    ...webullBrokerConfigFromEnv(process.env),
    // Same runtime session the data lane uses, so one 2FA approval serves
    // both lanes instead of one prompt per lane.
    tokenStore: webullSessionStore(workerEnv),
  });
  const keeper = await readWebullKeeperRecord(workerEnv);
  const body: WebullStatus = {
    provider: "webull",
    authMode: "SIGNED_OPENAPI",
    implemented: h?.implemented ?? false,
    configured: h?.envConfigured ?? false,
    connected: live.connected,
    state: live.state,
    accountCount: live.accountCount,
    accountTypes: live.accountTypes,
    note: live.note,
    checkedAt: live.checkedAt,
    missing: missingSecretsForState(live.state, process.env),
    credentialPresence: webullCredentialPresence(process.env),
    connectOAuth: webullConnectOAuthReadiness(process.env),
    ownerGate: owner.state,
    sessionKeeper: keeper
      ? { outcome: keeper.outcome, note: keeper.note, atMs: keeper.atMs, expiresInMs: keeper.expiresInMs }
      : null,
  };
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
