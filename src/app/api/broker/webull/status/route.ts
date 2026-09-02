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
  readonly authMode: "SIGNED_OPENAPI";
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
export function missingSecretsForState(
  state: WebullBrokerConnectionState,
  env: Readonly<Record<string, string | undefined>>,
): readonly string[] {
  if (state !== "UNCONFIGURED") return [];

  const missing: string[] = [];
  if (!(env.WEBULL_APP_KEY || env.WEBULL_API_KEY)?.trim()) {
    missing.push("WEBULL_APP_KEY (or WEBULL_API_KEY)");
  }
  if (!(env.WEBULL_APP_SECRET || env.WEBULL_API_SECRET)?.trim()) {
    missing.push("WEBULL_APP_SECRET (or WEBULL_API_SECRET)");
  }
  return missing;
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
  };
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
