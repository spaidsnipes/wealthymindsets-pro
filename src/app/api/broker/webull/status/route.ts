import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { getAdapter } from "../../../../../lib/broker/adapters";

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
  readonly note: string;
  readonly checkedAt: string;
}

export async function GET(request: Request): Promise<Response> {
  // Gated behind a WM session — infra recon consistency with the
  // /api/broker/{status,certification,readiness} routes.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const adapter = getAdapter("webull");
  const h = adapter?.health();
  const body: WebullStatus = {
    provider: "webull",
    implemented: h?.implemented ?? false,
    configured: h?.envConfigured ?? false,
    connected: h?.connected ?? false,
    note: h?.note ?? "Webull adapter is not implemented in this build.",
    checkedAt: new Date().toISOString(),
  };
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
