import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { tastytradeOwnerGate } from "@/lib/broker/brokerOwner";
import { getAdapter, listAdapters } from "../../../../lib/broker/adapters";
import {
  computeCertificationLevel,
  certificationSummary,
  type CertLevel,
  type CertStageReport,
} from "../../../../lib/broker/certification";
import type { BrokerId } from "../../../../lib/broker/BrokerAdapter";
import { observedCertification } from "../../../../lib/broker/observedCertification";

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
  /**
   * Whether an adapter for this broker EXISTS in-process.
   *
   * ── The identity loss this restores ────────────────────────────────────────
   *
   * `deriveReports` produces `[]` for a broker with no adapter and a single
   * PENDING `auth` for a broker whose adapter is present but has never been
   * probed. `computeCertificationLevel` then collapses BOTH into the identical
   * structured payload — `NONE`, 0 passed, 0 failed, 0 blocked, all 12 pending.
   * The only surviving difference was the freeform `note` PROSE, which no
   * structured consumer can branch on without string-matching English.
   *
   * Those two states have opposite remedies. "No adapter" is ENGINEERING work —
   * nobody has written the integration. "Adapter present, never probed" is
   * HARNESS work — the code exists and no one has run it against it. A cert
   * surface that shows both as "0/12" tells the Founder to go do the wrong
   * thing, and does it with a number that looks precise.
   *
   * The producer already computed this on the line below and threw it away.
   */
  readonly implemented: boolean;
  /** Truthful note from the adapter's health(). */
  readonly note: string;
}

export interface BrokerCertificationResponse {
  /**
   * Who the body was shaped for (security pass 2026-10-08, Sheriff P1-5). An
   * adapter's note names the operator's env vars and setup paths ("MOOMOO_BRIDGE_URL
   * / MOOMOO_BRIDGE_TOKEN … services/moomoo-bridge/README.md"); only the broker
   * owner gets them. Everyone else gets the levels and stages with an empty note.
   */
  readonly audience: "OWNER" | "MEMBER";
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

async function buildBrokerCertification(nowMs: number, userId: string | null = null): Promise<Omit<BrokerCertificationResponse, "audience">> {
  const brokers = await Promise.all(listAdapters().map(async (adapter) => {
    const id = adapter.id;
    const h = adapter.health();
    const implemented = h?.implemented ?? false;
    const envConfigured = h?.envConfigured ?? false;
    const connected = h?.connected ?? false;
    // A broker with a durable observation is certified FROM it (G3/G4,
    // 2026-09-29: Webull read 0/12 while its reads were proven live).
    const observed = implemented ? await observedCertification(id, nowMs, { userId }) : null;
    const reports = observed ? observed.reports : deriveReports(implemented, envConfigured, connected);
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
      implemented,
      note: h?.note ?? "Adapter not registered.",
    };
  }));
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
  const full = await buildBrokerCertification(Date.now(), auth.user.sub);
  // Operator internals (setup notes naming env vars and repo paths) are the
  // owner's — server-gated here, not hidden by a component.
  const body: BrokerCertificationResponse = tastytradeOwnerGate(auth.user.sub, process.env).allowed
    ? { audience: "OWNER", ...full }
    : { audience: "MEMBER", ...full, brokers: full.brokers.map(b => ({ ...b, note: "" })) };
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
