import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import {
  buildAthosCapabilityMatrix,
  deriveSessionTruth,
  type AthosCapabilityMatrix,
} from "../../../../../lib/marketData/canonicalCapabilityResolver";
import { probeMarketDataFleet } from "@/lib/marketData/providerProbeFleet";

/**
 * ATHOS capability matrix — one canonical decision per market-data capability.
 *
 * Session is resolved by the canonical closure owner (`deriveSessionTruth` →
 * `provenSessionClosure`), not by a literal in this file. Provider
 * connectivity must never be promoted into session truth: a provider
 * answering us is evidence about the PROVIDER, not about the exchange.
 */
export const dynamic = "force-dynamic";

async function buildMatrix(): Promise<AthosCapabilityMatrix> {
  const now = new Date();
  const generatedAt = now.toISOString();
  // Session truth is DERIVED from the canonical closure owner, never typed
  // here. See deriveSessionTruth for the account of what a hard-coded
  // "UNKNOWN" literal cost this endpoint.
  const session = deriveSessionTruth(now, generatedAt);
  // Membership and env wiring come from `providerProbeFleet`, the owner. This
  // route used to hand-type the list, and the sibling certification route
  // hand-typed a SHORTER one — see that module's header for what the
  // disagreement cost. This file still owns the MATRIX view; it no longer owns
  // an opinion about who WM reads.
  const fleet = await probeMarketDataFleet(fetch);
  return buildAthosCapabilityMatrix(fleet, session, generatedAt);
}

export async function GET(request: NextRequest): Promise<NextResponse<AthosCapabilityMatrix> | Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json(await buildMatrix(), {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
