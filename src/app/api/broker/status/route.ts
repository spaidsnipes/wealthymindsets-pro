import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { getAdapter } from "../../../../lib/broker/adapters";
import { computeCertificationLevel, type CertLevel, type CertStageReport } from "../../../../lib/broker/certification";
import type { BrokerId } from "../../../../lib/broker/BrokerAdapter";

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
  /** Canon §W3 certification level. Absent for AI providers. */
  readonly certLevel?: CertLevel;
  /** Canon §W3 progress "N/12 stages passed". Absent for AI providers. */
  readonly certPassedStages?: number;
}

function envAllPresent(names: readonly string[]): boolean {
  return names.every(n => {
    const v = process.env[n];
    return typeof v === "string" && v.length > 0;
  });
}

/**
 * I-Bkt 10 (canon §W3): derive a minimal cert-stage report from the
 * adapter's health() output so the aggregate can render cert level
 * alongside implemented/envConfigured/connected. Never claims stages
 * we can't verify from health — cert runner will supply richer reports.
 *
 * Rules:
 *   implemented + envConfigured + connected  → auth PASS
 *   implemented + envConfigured               → auth PENDING, other PENDING
 *   !implemented                              → every stage PENDING
 *   Any downstream stage requires a live cert harness run — not yet
 *   available in this stub — so all remain PENDING here.
 */
function deriveCertReports(implemented: boolean, envConfigured: boolean, connected: boolean): readonly CertStageReport[] {
  if (!implemented) return [];
  if (implemented && envConfigured && connected) {
    return [{ stage: "auth", status: "PASS", note: "Derived from adapter.health() — connected in-process." }];
  }
  return [{ stage: "auth", status: "PENDING", note: "Adapter present; live cert harness has not run." }];
}

function fromRegistry(
  id: "webull" | "alpaca" | "tastytrade",
  fallbackNote: string,
): ProviderReport {
  const adapter = getAdapter(id);
  const h = adapter?.health();
  const implemented = h?.implemented ?? false;
  const envConfigured = h?.envConfigured ?? false;
  const connected = h?.connected ?? false;
  const reports = deriveCertReports(implemented, envConfigured, connected);
  const cert = computeCertificationLevel(id as BrokerId, reports);
  return {
    provider: id,
    kind: "broker",
    implemented,
    envConfigured,
    connected,
    note: h?.note ?? fallbackNote,
    certLevel: cert.level,
    certPassedStages: cert.passedStages.length,
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

function buildBrokerStatus(): BrokerStatusResponse {
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

export async function GET(request: Request): Promise<Response> {
  // Gated behind a WM session, matching /api/broker/readiness. The per-provider
  // implemented/envConfigured/connected flags reveal which lanes are wired on
  // the host — that is infra recon even without exposing secret values. A
  // logged-in local session still receives the report.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const body = buildBrokerStatus();
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
