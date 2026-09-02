import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { getAdapter } from "../../../../../lib/broker/adapters";
import {
  probeWebullBrokerConnection,
  webullBrokerConfigFromEnv,
  type WebullBrokerConnectionState,
} from "@/lib/broker/adapters/webullBrokerConnection";

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
export interface WebullStatus {
  readonly provider: "webull";
  readonly implemented: boolean;
  readonly configured: boolean;
  readonly connected: boolean;
  readonly state: WebullBrokerConnectionState;
  readonly accountCount: number;
  readonly accountTypes: readonly string[];
  readonly note: string;
  readonly checkedAt: string;
  /**
   * Monday Test 2 canonical shape: when the wire cannot connect because
   * a host-runtime secret is missing, name it exactly so the founder
   * pastes it in Cloudflare and re-checks. Empty array when the wire is
   * connected OR the failure is not a config gap (e.g. RATE_LIMITED).
   */
  readonly missing: readonly string[];
}

/**
 * Map a WebullBrokerConnectionState to the exact env-var names the
 * founder must set to move it forward. Anti-fabrication: only NAME
 * variables, never emit values.
 */
function missingSecretsForState(state: WebullBrokerConnectionState): readonly string[] {
  switch (state) {
    case "UNCONFIGURED":
      // probeWebullBrokerConnection short-circuits here when the OpenAPI
      // key pair isn't present together. Both are required by the signed
      // request; see webullBrokerConfigFromEnv (WEBULL_APP_KEY /
      // WEBULL_API_KEY and WEBULL_APP_SECRET / WEBULL_API_SECRET aliases).
      return ["WEBULL_APP_KEY (or WEBULL_API_KEY)", "WEBULL_APP_SECRET (or WEBULL_API_SECRET)"];
    case "BLOCKED_AUTH":
      // Signed request reached Webull but auth was rejected. Most common
      // cause on the Trading API is that 2FA requires an access-token
      // header; the key pair itself may already be correct.
      return ["WEBULL_ACCESS_TOKEN"];
    default:
      return [];
  }
}

export async function GET(request: Request): Promise<Response> {
  // Gated behind a WM session — infra recon consistency with the
  // /api/broker/{status,certification,readiness} routes.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const adapter = getAdapter("webull");
  const h = adapter?.health();
  const live = await probeWebullBrokerConnection(fetch, webullBrokerConfigFromEnv(process.env));
  const body: WebullStatus = {
    provider: "webull",
    implemented: h?.implemented ?? false,
    configured: h?.envConfigured ?? false,
    connected: live.connected,
    state: live.state,
    accountCount: live.accountCount,
    accountTypes: live.accountTypes,
    note: live.note,
    checkedAt: live.checkedAt,
    missing: missingSecretsForState(live.state),
  };
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
