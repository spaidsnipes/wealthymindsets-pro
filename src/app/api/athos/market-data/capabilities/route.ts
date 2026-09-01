import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { probeMoomooMarketData } from "../../../../../lib/marketData/adapters/moomooMarketData";
import { probeWebullMarketData } from "../../../../../lib/marketData/adapters/webullMarketData";
import { probeAlpacaMarketData } from "../../../../../lib/marketData/adapters/alpacaMarketData";
import { certifyTastytradeMarketData } from "../../../../../lib/marketData/adapters/tastytradeMarketData";
import {
  buildAthosCapabilityMatrix,
  type AthosCapabilityMatrix,
  type SessionTruth,
} from "../../../../../lib/marketData/canonicalCapabilityResolver";
import { resolveAlpacaLiveCredentials } from "../../../../../lib/broker/alpacaCredentials";
import { getTastytradeCapabilities } from "../../../../../lib/tastytrade";
import { probeLongbridgeMarketData } from "../../../../../lib/marketData/adapters/longbridgeTicks";

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
  const alpacaCredentials = resolveAlpacaLiveCredentials();
  const [moomoo, webull, alpaca, longbridge, tastytradeObservation] = await Promise.all([
    probeMoomooMarketData(fetch, {
      bridgeUrl: (process.env.MOOMOO_BRIDGE_URL ?? "").replace(/\/+$/, ""),
      bridgeToken: process.env.MOOMOO_BRIDGE_TOKEN,
      canarySymbol: process.env.MOOMOO_CANARY_SYMBOL || undefined,
    }),
    probeWebullMarketData(fetch, {
      dataUrl: process.env.WEBULL_DATA_URL || undefined,
      appKey: process.env.WEBULL_API_KEY || undefined,
      appSecret: process.env.WEBULL_API_SECRET || undefined,
      accessToken: process.env.WEBULL_ACCESS_TOKEN || undefined,
      apiHost: process.env.WEBULL_API_HOST || undefined,
      canarySymbol: process.env.WEBULL_CANARY_SYMBOL || undefined,
    }),
    probeAlpacaMarketData(fetch, {
      key: alpacaCredentials.key,
      secret: alpacaCredentials.secret,
      canarySymbol: process.env.ALPACA_CANARY_SYMBOL || "TSLA",
    }),
    probeLongbridgeMarketData(fetch, {
      bridgeUrl: process.env.LONGBRIDGE_BRIDGE_URL,
      bridgeToken: process.env.LONGBRIDGE_BRIDGE_TOKEN,
      canarySymbol: process.env.LONGBRIDGE_CANARY_SYMBOL || "TSLA",
    }),
    getTastytradeCapabilities(),
  ]);
  // Account auth and a dxFeed quote-token grant are real provider observations,
  // but neither is a timestamped market event. Keep market-data fidelity at
  // NOT_IMPLEMENTED until an event is normalized into the canonical store.
  const tastytrade = certifyTastytradeMarketData({
    configured: tastytradeObservation.configured,
    connected: tastytradeObservation.connected,
    quotes: tastytradeObservation.quotes,
    realTime: tastytradeObservation.realTime,
    note: tastytradeObservation.note,
  });
  return buildAthosCapabilityMatrix([
    { certification: moomoo, providerTier: "CERTIFIED_NEW" },
    { certification: webull, providerTier: "CERTIFIED_NEW" },
    { certification: alpaca, providerTier: "CANONICAL" },
    { certification: longbridge, providerTier: "CERTIFIED_NEW" },
    { certification: tastytrade, providerTier: "CERTIFIED_NEW" },
  ], session, generatedAt);
}

export async function GET(request: NextRequest): Promise<NextResponse<AthosCapabilityMatrix> | Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json(await buildMatrix(), {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
