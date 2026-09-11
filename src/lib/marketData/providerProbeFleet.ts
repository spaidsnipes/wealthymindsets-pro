/**
 * providerProbeFleet — the ONE place that answers "which providers does WM
 * read market data from, and how do we ask each of them how it is doing?"
 *
 * ─────────────────────────────────────────────────────────────────────
 * TWO FLEETS, ONE QUESTION, DIFFERENT ANSWERS (2026-09-11)
 *
 * Two authenticated routes each hand-typed their own provider list:
 *
 *   /api/athos/market-data/capabilities   moomoo, webull, alpaca, longbridge, tastytrade
 *   /api/market-data/certification        moomoo, webull
 *
 * Same question, two answers, and the shorter one is not a narrower SCOPE —
 * its own header says it certifies "DATA FIDELITY per capability per source",
 * which is exactly what the other three sources have. The comment on its array
 * read `// Future sources (Alpaca, …) slot in here as their probes land`. The
 * probes had landed. `probeAlpacaMarketData` and `probeLongbridgeMarketData`
 * have shipping callers one directory over; `certifyTastytradeMarketData` had
 * exactly one non-test caller. Nothing told the certification route, because
 * nothing could: an array typed in a route file cannot notice that a sibling
 * array grew.
 *
 * The cost is not a missing row. It is that longbridge — which runs a LIVE
 * tape lane in `useWebSocket` (`fetchProviderTickSelection`, and
 * `processUnsignedObservation` ingests its observations) and carries a
 * REVIEWED entry in `capabilityRegistry` — is ABSENT from the data-fidelity
 * surface. Absent is not RED and it is not UNKNOWN. An operator reading that
 * page sees two sources, both accounted for, and no indication that a third
 * feed is pushing observations into the canonical store unexamined. Absence
 * wearing the costume of a decision, which is the shape this codebase keeps
 * rediscovering.
 *
 * ─────────────────────────────────────────────────────────────────────
 * WHAT THIS OWNS, AND WHAT IT REFUSES TO OWN
 *
 * It owns MEMBERSHIP and HOW TO ASK: the set of providers WM reads, and the
 * env-to-probe wiring for each. Nothing else.
 *
 * It does NOT aggregate. `sourceCertificationRegistry` owns the fleet roll-up
 * and `canonicalCapabilityResolver` owns the capability matrix, and both of
 * them are better at it than anything that would be retyped here. Each route
 * still shapes the answer its own way — they are genuinely different views.
 * What they may no longer do is disagree about who was asked.
 *
 * Adding a provider is one entry, and BOTH surfaces get it on the same day,
 * including surfaces that do not exist yet.
 */

import type { SourceCertification } from "./sourceCapabilityCertification";
import type { ProviderTier } from "./canonicalCapabilityResolver";
import { probeMoomooMarketData } from "./adapters/moomooMarketData";
import { probeWebullMarketData, webullDataConfigFromEnv } from "./adapters/webullMarketData";
import { probeAlpacaMarketData } from "./adapters/alpacaMarketData";
import { probeLongbridgeMarketData } from "./adapters/longbridgeTicks";
import { certifyTastytradeMarketData } from "./adapters/tastytradeMarketData";
import { resolveAlpacaLiveCredentials } from "@/lib/broker/alpacaCredentials";
import { getTastytradeCapabilities } from "@/lib/tastytrade";

export interface ProbedProvider {
  readonly certification: SourceCertification;
  readonly providerTier: ProviderTier;
}

/**
 * Provider ids, exported so a Sentinel can compare DECLARED membership against
 * the adapters that actually ship a probe — rather than against a second list
 * typed inside the Sentinel, which would be the same defect one layer up.
 */
export const PROBED_PROVIDER_IDS = [
  "moomoo",
  "webull",
  "alpaca",
  "longbridge",
  "tastytrade",
] as const;

export type ProbedProviderId = (typeof PROBED_PROVIDER_IDS)[number];

type Env = Record<string, string | undefined>;

/**
 * Ask every provider WM reads how it is doing.
 *
 * Probes run in parallel and each one owns its own failure: the adapters
 * return an honest NOT_IMPLEMENTED / unconfigured certification rather than
 * throwing, so one unconfigured bridge cannot blank the fleet. That property
 * belongs to the adapters and is relied on here, not re-implemented.
 */
export async function probeMarketDataFleet(
  fetchImpl: typeof fetch = fetch,
  env: Env = process.env as Env,
): Promise<readonly ProbedProvider[]> {
  const alpacaCredentials = resolveAlpacaLiveCredentials();
  const [moomoo, webull, alpaca, longbridge, tastytradeObservation] = await Promise.all([
    probeMoomooMarketData(fetchImpl, {
      bridgeUrl: (env.MOOMOO_BRIDGE_URL ?? "").replace(/\/+$/, ""),
      bridgeToken: env.MOOMOO_BRIDGE_TOKEN,
      canarySymbol: env.MOOMOO_CANARY_SYMBOL || undefined,
    }),
    probeWebullMarketData(fetchImpl, {
      ...webullDataConfigFromEnv(env),
      canarySymbol: env.WEBULL_CANARY_SYMBOL || undefined,
    }),
    probeAlpacaMarketData(fetchImpl, {
      key: alpacaCredentials.key,
      secret: alpacaCredentials.secret,
      canarySymbol: env.ALPACA_CANARY_SYMBOL || "TSLA",
    }),
    probeLongbridgeMarketData(fetchImpl, {
      bridgeUrl: env.LONGBRIDGE_BRIDGE_URL,
      bridgeToken: env.LONGBRIDGE_BRIDGE_TOKEN,
      canarySymbol: env.LONGBRIDGE_CANARY_SYMBOL || "TSLA",
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

  return [
    { certification: moomoo, providerTier: "CERTIFIED_NEW" },
    { certification: webull, providerTier: "CERTIFIED_NEW" },
    { certification: alpaca, providerTier: "CANONICAL" },
    { certification: longbridge, providerTier: "CERTIFIED_NEW" },
    { certification: tastytrade, providerTier: "CERTIFIED_NEW" },
  ];
}
