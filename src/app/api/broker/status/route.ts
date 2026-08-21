import { NextResponse } from "next/server";
import { getAdapter } from "../../../../lib/broker/adapters";
import { athosHealth } from "../../../../lib/ai/athosGateway";

/**
 * /api/broker/status
 *
 * Founder 2026-08-21 Broker Wiring canon §12 mandates a truthful
 * report of ALL broker/AI adapter wiring state — presence of env
 * variables does not equal completed integration.
 *
 * This unified aggregate endpoint answers "which brokers/AIs are
 * actually wired in this build?" with one honest response. Never
 * returns tokens/secrets/refresh-tokens; only reports whether a
 * server-side adapter exists AND whether the required env names
 * are present at all.
 *
 * Add a new provider here by:
 *   1. Adding its ProviderReport entry to REPORT.
 *   2. Setting `implemented` true only when a real server-side
 *      adapter path exists.
 *   3. Setting `envConfigured` true only when the required env
 *      NAMES are all present (never reads values into the response).
 */

export type ProviderKind = "broker" | "ai";

export interface ProviderReport {
  readonly provider: string;
  readonly kind: ProviderKind;
  /** True only when a real server-side adapter code path exists. */
  readonly implemented: boolean;
  /** True when ALL required env NAMES are present. Never reveals values. */
  readonly envConfigured: boolean;
  /** True only when adapter has authenticated in this process lifecycle. */
  readonly connected: boolean;
  /** Truthful note the surface can render. */
  readonly note: string;
}


function fromRegistry(
  id: "webull" | "alpaca" | "tastytrade",
  fallbackNote: string,
): ProviderReport {
  const adapter = getAdapter(id);
  const h = adapter?.health();
  return {
    provider: id,
    kind: "broker",
    implemented: h?.implemented ?? false,
    envConfigured: h?.envConfigured ?? false,
    connected: h?.connected ?? false,
    note: h?.note ?? fallbackNote,
  };
}

function webullReport(): ProviderReport {
  return fromRegistry("webull", "Webull adapter is not implemented in this build.");
}

function tastytradeReport(): ProviderReport {
  return fromRegistry("tastytrade", "Tastytrade adapter is not registered.");
}

function alpacaReport(): ProviderReport {
  return fromRegistry("alpaca", "Alpaca adapter is not registered.");
}

/**
 * AI providers come straight from the ATHOS gateway's health roll-up — every
 * registered AIAdapter auto-appears here. Adding an AI provider = one registry
 * line in src/lib/ai/adapters, never an edit to this aggregate (the same
 * guarantee brokers have via fromRegistry). One source of truth per provider.
 */
function aiReports(): readonly ProviderReport[] {
  return athosHealth().map((h) => ({
    provider: h.provider,
    kind: "ai" as const,
    implemented: h.implemented,
    envConfigured: h.envConfigured,
    connected: h.connected,
    note: h.note,
  }));
}

export interface BrokerStatusResponse {
  readonly generatedAt: string;
  readonly providers: readonly ProviderReport[];
  /** Convenience: count of providers whose adapter is implemented. */
  readonly implementedCount: number;
  /** Convenience: count of providers whose env credentials are configured. */
  readonly envConfiguredCount: number;
}

export function buildBrokerStatus(): BrokerStatusResponse {
  const providers: readonly ProviderReport[] = [
    webullReport(),
    tastytradeReport(),
    alpacaReport(),
    ...aiReports(),
  ];
  return {
    generatedAt: new Date().toISOString(),
    providers,
    implementedCount: providers.filter(p => p.implemented).length,
    envConfiguredCount: providers.filter(p => p.envConfigured).length,
  };
}

export async function GET(): Promise<NextResponse<BrokerStatusResponse>> {
  const body = buildBrokerStatus();
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
