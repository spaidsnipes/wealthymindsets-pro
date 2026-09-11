import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { probeMoomooMarketData } from "../../../../../lib/marketData/adapters/moomooMarketData";
import { probeWebullMarketData, webullDataConfigFromEnv } from "../../../../../lib/marketData/adapters/webullMarketData";
import { probeAlpacaMarketData } from "../../../../../lib/marketData/adapters/alpacaMarketData";
import { certifyTastytradeMarketData } from "../../../../../lib/marketData/adapters/tastytradeMarketData";
import {
  buildAthosCapabilityMatrix,
  deriveSessionTruth,
  type AthosCapabilityMatrix,
} from "../../../../../lib/marketData/canonicalCapabilityResolver";
import { resolveAlpacaLiveCredentials } from "../../../../../lib/broker/alpacaCredentials";
import { getTastytradeCapabilities } from "../../../../../lib/tastytrade";
import { probeLongbridgeMarketData } from "../../../../../lib/marketData/adapters/longbridgeTicks";

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
  const alpacaCredentials = resolveAlpacaLiveCredentials();
  const [moomoo, webull, alpaca, longbridge, tastytradeObservation] = await Promise.all([
    probeMoomooMarketData(fetch, {
      bridgeUrl: (process.env.MOOMOO_BRIDGE_URL ?? "").replace(/\/+$/, ""),
      bridgeToken: process.env.MOOMOO_BRIDGE_TOKEN,
      canarySymbol: process.env.MOOMOO_CANARY_SYMBOL || undefined,
    }),
    probeWebullMarketData(fetch, {
      ...webullDataConfigFromEnv(process.env),
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
