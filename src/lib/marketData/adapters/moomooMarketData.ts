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
 *   · OpenD reachable + /quote empty → NOT_IMPLEMENTED / no event observed
 *     (an empty set does not prove an entitlement failure)
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

interface MoomooQuoteRow {
  code?: unknown;
  last?: unknown;
  update_time?: unknown;
}

function isValidCanaryQuote(value: unknown, canarySymbol: string): value is MoomooQuoteRow {
  if (!value || typeof value !== "object") return false;
  const row = value as MoomooQuoteRow;
  const code = typeof row.code === "string" ? row.code.trim().toUpperCase() : "";
  const last = typeof row.last === "number" ? row.last : Number(row.last);
  const updateTime = typeof row.update_time === "string" ? row.update_time.trim() : "";
  return code === canarySymbol.trim().toUpperCase() && Number.isFinite(last) && last > 0 && updateTime.length > 0;
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
    return certifySource(
      source,
      MOOMOO_MARKET_CAPS.map((capability) =>
        report(capability, "NOT_IMPLEMENTED", {
          fidelity: "NONE",
          note: "NOT CONFIGURED — MOOMOO_BRIDGE_URL is missing in this runtime; no bridge or provider event was probed.",
        }),
      ),
    );
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
        note: "BRIDGE UNREACHABLE — moomoo-bridge /health did not return a valid success receipt; deployment, transport, and OpenD state remain unproven.",
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
  if (!config.bridgeToken) {
    return certifySource(source, [
      report("PRICE", "NOT_IMPLEMENTED", {
        fidelity: "NONE",
        note: "NOT CONFIGURED — MOOMOO_BRIDGE_TOKEN is missing in this runtime; OpenD was reachable but no authenticated quote probe was attempted.",
      }),
      report("TICKS", "NOT_IMPLEMENTED", {
        fidelity: "NONE",
        note: "NOT CONFIGURED — MOOMOO_BRIDGE_TOKEN is missing in this runtime; no authenticated tick retrieval was attempted.",
      }),
    ]);
  }
  if (!config.canarySymbol) {
    return certifySource(source, [
      report("PRICE", "NOT_IMPLEMENTED", {
        fidelity: "NONE",
        note: "CANARY NOT SELECTED — MOOMOO_CANARY_SYMBOL is absent; OpenD was reachable but no symbol-scoped quote probe was executed.",
      }),
      report("TICKS", "NOT_IMPLEMENTED", {
        fidelity: "NONE",
        note: "CANARY NOT SELECTED — MOOMOO_CANARY_SYMBOL is absent; no symbol-scoped tick retrieval was executed.",
      }),
    ]);
  }
  if (config.canarySymbol && config.bridgeToken) {
    try {
      const res = await fetchImpl(
        `${base}/quote?symbols=${encodeURIComponent(config.canarySymbol)}`,
        { headers: { Authorization: `Bearer ${config.bridgeToken}` } },
      );
      const body = (await res.json()) as QuoteEnvelope;
      if (res.status === 401 || res.status === 403) {
        reports.push(
          report("PRICE", "BLOCKED_AUTH", {
            note: "moomoo-bridge rejected the read-only quote credential.",
          }),
        );
      } else if (res.ok && body.ok === true && Array.isArray(body.quotes) && body.quotes.some((row) => isValidCanaryQuote(row, config.canarySymbol!))) {
        reports.push(
          report("PRICE", "ACTIVE_DEGRADED", {
            fidelity: "SNAPSHOT",
            note: "On-demand symbol-matched snapshot observed via OpenD; realtime-vs-delayed entitlement not yet certified.",
          }),
        );
      } else if (res.ok && body.ok === true && Array.isArray(body.quotes) && body.quotes.length === 0) {
        reports.push(
          report("PRICE", "NOT_IMPLEMENTED", {
            note: "OpenD returned an empty quote set for the canary symbol. No price event was observed, and entitlement is not proven.",
          }),
        );
      } else {
        reports.push(
          report("PRICE", "NOT_IMPLEMENTED", {
            note: "OpenD quote response was unavailable, malformed, stale-looking, or did not match the requested symbol.",
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
