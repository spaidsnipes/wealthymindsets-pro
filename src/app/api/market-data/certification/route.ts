import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { probeMoomooMarketData } from "../../../../lib/marketData/adapters/moomooMarketData";
import { probeWebullMarketData } from "../../../../lib/marketData/adapters/webullMarketData";
import {
  aggregateSourceCertifications,
  type FleetSourceCertification,
} from "../../../../lib/marketData/sourceCertificationRegistry";

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
  const moomoo = await probeMoomooMarketData(fetch, {
    bridgeUrl: (process.env.MOOMOO_BRIDGE_URL ?? "").replace(/\/+$/, ""),
    bridgeToken: process.env.MOOMOO_BRIDGE_TOKEN,
    canarySymbol: process.env.MOOMOO_CANARY_SYMBOL || undefined,
  });
  const webull = await probeWebullMarketData(fetch, {
    dataUrl: process.env.WEBULL_DATA_URL || undefined,
    appKey: process.env.WEBULL_API_KEY || undefined,
    appSecret: process.env.WEBULL_API_SECRET || undefined,
    accessToken: process.env.WEBULL_ACCESS_TOKEN || undefined,
    apiHost: process.env.WEBULL_API_HOST || undefined,
    canarySymbol: process.env.WEBULL_CANARY_SYMBOL || undefined,
  });
  // Future sources (Alpaca, …) slot in here as their probes land — one array
  // entry each, no new truth engine.
  return aggregateSourceCertifications([moomoo, webull]);
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
