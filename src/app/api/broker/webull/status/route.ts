import { NextResponse } from "next/server";

/**
 * /api/broker/webull/status
 *
 * Founder 2026-08-21 Broker Wiring canon §12:
 *   "Presence of environment variables does not equal completed
 *    integration. Tonight the coding team must discover, trace,
 *    repair, unify and certify the existing paths."
 *
 * Discovery finding (2026-08-21 shift-F): the repository has ZERO
 * server-side Webull code. The only references are a UI stub in
 * BrokerConnectPanel + chart chrome mentions. No adapter, no
 * capability discovery, no VaultLine token lifecycle, no
 * TradeLine/PulseLine wiring.
 *
 * This endpoint tells the honest truth so any consumer polling
 * broker status can distinguish "we have env vars from July but
 * nothing is wired" from "connected + tradable." Zero fabrication.
 *
 * When a real adapter lands, replace this with real capability
 * discovery via the same shape the tastytrade status route uses.
 *
 * Never returns tokens or secret values.
 */
export interface WebullStatus {
  readonly provider: "webull";
  /** True only when a real server-side adapter is present. */
  readonly implemented: boolean;
  /** True only when the adapter has successfully authenticated. */
  readonly configured: boolean;
  readonly connected: boolean;
  /** Truthful reason string surfaced to the client. */
  readonly note: string;
  /** ISO timestamp of this status response. */
  readonly checkedAt: string;
}

export async function GET(): Promise<NextResponse<WebullStatus>> {
  const body: WebullStatus = {
    provider: "webull",
    implemented: false,
    configured: false,
    connected: false,
    note: "Webull adapter is not implemented in this build. Env credentials from the July period may be present in Vercel but no server-side adapter, capability discovery, credential lifecycle handler, or execution wiring exists yet. Broker certification (Founder canon §12) is a future atom.",
    checkedAt: new Date().toISOString(),
  };
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
