import { NextResponse } from "next/server";

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

function envAllPresent(names: readonly string[]): boolean {
  return names.every(n => {
    const v = process.env[n];
    return typeof v === "string" && v.length > 0;
  });
}

function webullReport(): ProviderReport {
  // Zero server-side references in the codebase as of 2026-08-21 discovery.
  // Env NAMES the founder may have set in Vercel from July are not read
  // anywhere. Report honestly.
  return {
    provider: "webull",
    kind: "broker",
    implemented: false,
    envConfigured: false, // no code reads WEBULL_*; even if Vercel has values, adapter is absent
    connected: false,
    note: "Webull adapter is not implemented in this build.",
  };
}

function tastytradeReport(): ProviderReport {
  const configured = envAllPresent([
    "TASTYTRADE_CLIENT_ID",
    "TASTYTRADE_CLIENT_SECRET",
    "TASTYTRADE_REFRESH_TOKEN",
  ]);
  return {
    provider: "tastytrade",
    kind: "broker",
    implemented: true, // src/lib/tastytrade.ts + 3 API routes exist
    envConfigured: configured,
    // connected requires actual auth handshake; a passing status route
    // check is where that would be measured. Deferred to keep this
    // aggregate cheap (no upstream calls). Consumers can hit
    // /api/broker/tastytrade/status for the live check.
    connected: false,
    note: configured
      ? "Adapter present. Full live connectivity requires /api/broker/tastytrade/status handshake."
      : "Adapter present but env credentials are missing.",
  };
}

function alpacaReport(): ProviderReport {
  const paperOk = envAllPresent(["ALPACA_PAPER_KEY", "ALPACA_PAPER_SECRET"]);
  const liveOk  = envAllPresent(["ALPACA_KEY", "ALPACA_SECRET"]);
  const anyEnv = paperOk || liveOk;
  return {
    provider: "alpaca",
    kind: "broker",
    implemented: true, // 5 API routes + AlpacaTradingPanel
    envConfigured: anyEnv,
    connected: false, // requires actual credential handshake per request
    note: paperOk && liveOk
      ? "Paper and live env credentials present. Live handshake requires POST /api/broker/alpaca."
      : paperOk
        ? "Paper env credentials present. Live env credentials absent."
        : liveOk
          ? "Live env credentials present. Paper env credentials absent."
          : "Adapter present but env credentials are missing.",
  };
}

function geminiReport(): ProviderReport {
  const configured = envAllPresent(["GEMINI_API_KEY"]);
  return {
    provider: "gemini",
    kind: "ai",
    implemented: true, // /api/spaidbot/route.ts uses Google Gemini 2.0 Flash
    envConfigured: configured,
    connected: false, // no persistent connection concept for REST AI calls
    note: configured
      ? "AI adapter present (spaidbot route). ATHOS Gateway wrapper is a future atom."
      : "AI adapter present but GEMINI_API_KEY is missing.",
  };
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
    geminiReport(),
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
