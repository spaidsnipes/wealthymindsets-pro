import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { getAdapter, listAdapters } from "../../../../lib/broker/adapters";
import {
  computeCertificationLevel,
  certificationSummary,
  type CertLevel,
  type CertStageReport,
} from "../../../../lib/broker/certification";
import type { BrokerId } from "../../../../lib/broker/BrokerAdapter";

/**
 * /api/broker/certification — canon §W3 aggregate.
 *
 * Reports per-broker certification level derived from adapter.health().
 * Never fabricates a PASS from partial evidence. Downstream stages
 * (submit / ack / fill / cancel / reconnect / auth refresh / journal
 * receipt) remain PENDING until a live cert harness runner supplies
 * real PASS/FAIL evidence — that harness is a future atom; this
 * endpoint is the durable read side.
 */

export interface BrokerCertificationReport {
  readonly brokerId: BrokerId;
  readonly certLevel: CertLevel;
  readonly summary: string;
  readonly passedStages: readonly string[];
  readonly pendingStages: readonly string[];
  readonly failedStages: readonly string[];
  readonly blockedStages: readonly string[];
  readonly fullyCertified: boolean;
  /** Truthful note from the adapter's health(). */
  readonly note: string;
}

export interface BrokerCertificationResponse {
  readonly generatedAt: string;
  readonly brokers: readonly BrokerCertificationReport[];
  readonly fullyCertifiedCount: number;
}

function deriveReports(implemented: boolean, envConfigured: boolean, connected: boolean): readonly CertStageReport[] {
  if (!implemented) return [];
  if (implemented && envConfigured && connected) {
    return [{ stage: "auth", status: "PASS", note: "Derived from adapter.health() — connected in-process." }];
  }
  return [{ stage: "auth", status: "PENDING", note: "Adapter present; live cert harness has not run." }];
}

function buildBrokerCertification(): BrokerCertificationResponse {
  const brokers = listAdapters().map((adapter) => {
    const id = adapter.id;
    const h = adapter.health();
    const implemented = h?.implemented ?? false;
    const envConfigured = h?.envConfigured ?? false;
    const connected = h?.connected ?? false;
    const reports = deriveReports(implemented, envConfigured, connected);
    const result = computeCertificationLevel(id, reports);
    return {
      brokerId: id,
      certLevel: result.level,
      summary: certificationSummary(result),
      passedStages: result.passedStages,
      pendingStages: result.pendingStages,
      failedStages: result.failedStages,
      blockedStages: result.blockedStages,
      fullyCertified: result.fullyCertified,
      note: h?.note ?? "Adapter not registered.",
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    brokers,
    fullyCertifiedCount: brokers.filter((b) => b.fullyCertified).length,
  };
}

export async function GET(request: Request): Promise<Response> {
  // Gated behind a WM session — per-broker certification stages reveal
  // which lanes are wired on the host (same recon class as /api/broker/status
  // and /api/broker/readiness). Presence-only, no secret VALUE ever shipped.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const body = buildBrokerCertification();
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
