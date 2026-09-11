import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import {
  aggregateSourceCertifications,
  type FleetSourceCertification,
} from "../../../../lib/marketData/sourceCertificationRegistry";
import { probeMarketDataFleet } from "@/lib/marketData/providerProbeFleet";

/**
 * /api/market-data/certification — the DATA-side companion to
 * /api/broker/certification.
 *
 * broker/certification certifies the TRADE loop (auth→submit→fill→reconcile).
 * THIS endpoint certifies DATA FIDELITY per capability (PRICE, BARS, TICKS,
 * EXECUTED VOLUME, AGGRESSOR/SIDE, DEPTH, …) per source, and derives the CVD
 * law honestly. It probes the REAL read-only bridges — it never fabricates a
 * certified state. With no bridge env configured every row is NOT_IMPLEMENTED
 * and CVD is UNAVAILABLE, which is the truthful "not proven" answer.
 *
 * Server-side only: the bridge token is read from env and used to sign the
 * canary /quote probe; it is NEVER returned in the response.
 */

export const dynamic = "force-dynamic";

async function buildFleet(): Promise<FleetSourceCertification> {
  // Membership comes from `providerProbeFleet`, the owner. What stood here was
  // a two-source array under the comment "Future sources (Alpaca, …) slot in
  // here as their probes land" — and the probes HAD landed, with shipping
  // callers one directory over. Three sources WM genuinely reads, including
  // longbridge (a live tape lane in `useWebSocket`), were absent from this
  // surface: not RED, not UNKNOWN, simply unasked.
  const fleet = await probeMarketDataFleet(fetch);
  return aggregateSourceCertifications(fleet.map(entry => entry.certification));
}

export async function GET(request: NextRequest): Promise<NextResponse<FleetSourceCertification> | Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const body = await buildFleet();
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
