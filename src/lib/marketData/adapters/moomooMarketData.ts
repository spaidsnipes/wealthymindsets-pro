/**
 * moomooMarketData — moomoo as an INTERNAL MARKET-DATA PROVIDER (Phase 3/6).
 *
 * Distinct from `broker/adapters/moomooAdapter.ts` (which is the BROKER /
 * execution door). This module certifies what market DATA the moomoo feed
 * actually delivers, by probing the same read-only bridge:
 *
 *     this probe ──HTTPS──▶ services/moomoo-bridge ──socket──▶ OpenD ──▶ moomoo
 *
 * It maps the REAL bridge state onto the honest capability-certification matrix
 * (`sourceCapabilityCertification.ts`). It NEVER fabricates a certified state:
 *   · bridge not configured / unreachable → NOT_IMPLEMENTED
 *   · bridge up but OpenD gateway offline / not logged in → BLOCKED_AUTH
 *     (OpenD holds the authenticated moomoo session; no OpenD == no auth)
 *   · OpenD reachable + canary /quote returns data → PRICE ACTIVE_DEGRADED
 *     (snapshot observed; realtime-vs-delayed entitlement not yet certified)
 *   · OpenD reachable + /quote empty → BLOCKED_ENTITLEMENT (no market-data sub)
 *
 * PURE except for the injected `fetchImpl` — tests pass a mock; no real network.
 * The bridge envelopes matched here are the ACTUAL shapes emitted by
 * services/moomoo-bridge/bridge.py (do_GET): /health → {ok,opend_reachable,
 * sdk_version}; /quote → {ok, quotes} | {ok:false, error}.
 */

import {
  certifySource,
  type SourceCertification,
  type SourceCapabilityReport,
  type DataCapability,
  type CapabilityCertStatus,
  type CapabilityFidelity,
} from "../sourceCapabilityCertification";

/** Market-data capabilities moomoo could serve (the non-broker rows). */
const MOOMOO_MARKET_CAPS: readonly DataCapability[] = [
  "PRICE",
  "BARS",
  "TICKS",
  "EXECUTED_VOLUME",
  "AGGRESSOR_SIDE",
  "DEPTH",
  "OPTIONS",
  "FUTURES",
];

export interface MoomooBridgeConfig {
  /** e.g. https://bridge.example.ts.net — trailing slash tolerated. */
  readonly bridgeUrl: string;
  /** Bearer secret for the bridge's /quote route. Server-side only. */
  readonly bridgeToken?: string;
  /** Optional symbol (moomoo format, e.g. "US.AAPL") to probe /quote and certify PRICE. */
  readonly canarySymbol?: string;
}

interface HealthEnvelope {
  ok?: unknown;
  opend_reachable?: unknown;
  sdk_version?: unknown;
}

interface QuoteEnvelope {
  ok?: unknown;
  quotes?: unknown;
  error?: unknown;
}

function report(
  capability: DataCapability,
  status: CapabilityCertStatus,
  extra: { fidelity?: CapabilityFidelity; note?: string } = {},
): SourceCapabilityReport {
  return {
    capability,
    status,
    fidelity: extra.fidelity,
    note: extra.note,
    observedAt: new Date().toISOString(),
  };
}

/**
 * Probe the moomoo bridge and return an honest data-capability certification.
 * Injected `fetchImpl` keeps this unit-testable and host-agnostic.
 */
export async function probeMoomooMarketData(
  fetchImpl: typeof fetch,
  config: MoomooBridgeConfig,
): Promise<SourceCertification> {
  const source = "moomoo";
  const base = (config.bridgeUrl ?? "").replace(/\/+$/, "");

  // 1. Not configured → nothing to certify. All rows NOT_IMPLEMENTED (honest).
  if (!base) {
    return certifySource(source, []);
  }

  // 2. Bridge /health (unauthenticated, no secrets).
  let health: HealthEnvelope | null = null;
  try {
    const res = await fetchImpl(`${base}/health`, { method: "GET" });
    if (res.ok) health = (await res.json()) as HealthEnvelope;
  } catch {
    health = null;
  }

  if (!health || health.ok !== true) {
    return certifySource(source, [
      report("PRICE", "NOT_IMPLEMENTED", {
        note: "moomoo-bridge /health unreachable — the read path is not deployed yet.",
      }),
    ]);
  }

  const sdk = typeof health.sdk_version === "string" ? health.sdk_version : "unknown";

  // 3. Bridge up but OpenD gateway offline / not logged in → BLOCKED_AUTH for
  //    every market capability. OpenD holds the authenticated moomoo session,
  //    so no OpenD == no authenticated data access.
  if (health.opend_reachable !== true) {
    const blocked = MOOMOO_MARKET_CAPS.map((c) =>
      report(c, "BLOCKED_AUTH", {
        note: `OpenD gateway offline or not logged in (moomoo SDK ${sdk}). Founder must run + log into OpenD on the bridge host.`,
      }),
    );
    return certifySource(source, blocked);
  }

  // 4. OpenD reachable. Certify PRICE against a real canary quote when we have a
  //    token + symbol; otherwise leave PRICE PENDING (NOT_IMPLEMENTED) — we do
  //    not claim a capability we did not actually exercise.
  const reports: SourceCapabilityReport[] = [];
  if (config.canarySymbol && config.bridgeToken) {
    try {
      const res = await fetchImpl(
        `${base}/quote?symbols=${encodeURIComponent(config.canarySymbol)}`,
        { headers: { Authorization: `Bearer ${config.bridgeToken}` } },
      );
      const body = (await res.json()) as QuoteEnvelope;
      if (res.ok && body.ok === true && body.quotes != null) {
        reports.push(
          report("PRICE", "ACTIVE_DEGRADED", {
            fidelity: "SNAPSHOT",
            note: "Live snapshot observed via OpenD; realtime-vs-delayed entitlement not yet certified.",
          }),
        );
      } else {
        reports.push(
          report("PRICE", "BLOCKED_ENTITLEMENT", {
            note: "OpenD reachable but /quote returned no data — likely no moomoo market-data subscription for this symbol.",
          }),
        );
      }
    } catch {
      reports.push(
        report("PRICE", "NOT_IMPLEMENTED", {
          note: "OpenD reachable but the /quote canary probe threw — transport error.",
        }),
      );
    }
  }
  return certifySource(source, reports);
}
