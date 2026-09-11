import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { listAdapters } from "../../../../lib/broker/adapters";
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
 * HOW A PROVIDER GETS INTO THIS REPORT — read this before editing.
 *
 * Broker rows are ENUMERATED FROM the adapter registry
 * (`lib/broker/adapters`), never retyped here. Registering an adapter
 * is the whole act of wiring it; this route then reports it.
 *
 * It did not used to work that way, and the cost was a silent lie on the
 * one surface whose entire job is to answer "which brokers are actually
 * wired?". The list was hard-coded as webull / tastytrade / alpaca /
 * gemini, with a comment instructing the next person to add a fourth
 * entry by hand. `moomooAdapter` was then written, registered in
 * REGISTRY, given a bridge topology, capability discovery and honesty
 * notes — and NEVER APPEARED. Nothing threw. `tsc --noEmit` stayed at
 * exit 0, because a hard-coded array of four function calls is
 * type-correct no matter how many adapters exist. The route's own test
 * asserted the four-name list verbatim, so the omission was not merely
 * uncaught — it was PINNED GREEN.
 *
 * That is the same defect class as the producer/matcher vocabulary drift
 * fixed in selectMarketStory (51d6fa3): one half of a pair retypes what
 * the other half owns, and the two drift apart in silence. The cure is
 * the same — one side EXPORTS the list as data, the other side IMPORTS
 * it, and a Sentinel iterates the exported list so a fifth adapter fails
 * the suite until this route reports it.
 *
 * Gemini stays hand-written on purpose: it is an AI provider, not a
 * BrokerAdapter, so it has no registry entry to be enumerated from. It
 * is appended after the broker rows and is the ONLY hand-written row.
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

/**
 * One broker row, built from the adapter's OWN health() answer.
 *
 * The adapter is the single writer of implemented/envConfigured/
 * connected/note. This function adds no judgement of its own — if a
 * row here disagreed with `/api/broker/{id}/status`, the Founder would
 * have two answers to one question.
 */
function brokerReport(adapter: { readonly id: BrokerId; health(): BrokerHealthLike }): ProviderReport {
  const h = adapter.health();
  const reports = deriveCertReports(h.implemented, h.envConfigured, h.connected);
  const cert = computeCertificationLevel(adapter.id, reports);
  return {
    provider: adapter.id,
    kind: "broker",
    implemented: h.implemented,
    envConfigured: h.envConfigured,
    connected: h.connected,
    note: h.note,
    certLevel: cert.level,
    certPassedStages: cert.passedStages.length,
  };
}

interface BrokerHealthLike {
  readonly implemented: boolean;
  readonly envConfigured: boolean;
  readonly connected: boolean;
  readonly note: string;
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
  // Every registered adapter, in the registry's own stable order, then the
  // non-adapter AI row. No broker name is typed in this file.
  const providers: readonly ProviderReport[] = [
    ...listAdapters().map(brokerReport),
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
