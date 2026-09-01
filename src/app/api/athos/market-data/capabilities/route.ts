import { NextResponse } from "next/server";
import { probeMoomooMarketData } from "../../../../../lib/marketData/adapters/moomooMarketData";
import { probeWebullMarketData } from "../../../../../lib/marketData/adapters/webullMarketData";
import {
  buildAthosCapabilityMatrix,
  type AthosCapabilityMatrix,
  type SessionTruth,
} from "../../../../../lib/marketData/canonicalCapabilityResolver";

/**
 * ATHOS capability matrix — one canonical decision per market-data capability.
 *
 * Session remains UNKNOWN until the canonical exchange-calendar owner is wired;
 * provider connectivity must never be promoted into session truth.
 */
export const dynamic = "force-dynamic";

async function buildMatrix(): Promise<AthosCapabilityMatrix> {
  const generatedAt = new Date().toISOString();
  const session: SessionTruth = {
    state: "UNKNOWN",
    asOf: generatedAt,
    reason: "canonical exchange-calendar session owner is not wired to this endpoint yet",
  };
  const [moomoo, webull] = await Promise.all([
    probeMoomooMarketData(fetch, {
      bridgeUrl: (process.env.MOOMOO_BRIDGE_URL ?? "").replace(/\/+$/, ""),
      bridgeToken: process.env.MOOMOO_BRIDGE_TOKEN,
      canarySymbol: process.env.MOOMOO_CANARY_SYMBOL || undefined,
    }),
    probeWebullMarketData(fetch, {
      dataUrl: process.env.WEBULL_DATA_URL || undefined,
      appKey: process.env.WEBULL_API_KEY || undefined,
      appSecret: process.env.WEBULL_API_SECRET || undefined,
      apiHost: process.env.WEBULL_API_HOST || undefined,
      canarySymbol: process.env.WEBULL_CANARY_SYMBOL || undefined,
    }),
  ]);
  return buildAthosCapabilityMatrix([
    { certification: moomoo, providerTier: "CERTIFIED_NEW" },
    { certification: webull, providerTier: "CERTIFIED_NEW" },
  ], session, generatedAt);
}

export async function GET(): Promise<NextResponse<AthosCapabilityMatrix>> {
  return NextResponse.json(await buildMatrix(), {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
