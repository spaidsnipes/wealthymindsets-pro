/**
 * providerReadiness — the single canonical answer to "is this provider
 * connected, here?" for BOTH the local runtime and the deployed host.
 *
 * Founder portability directive (2026-08-31 verbatim intent): "everything
 * connected locally also and connected through the host at all times ...
 * make sure my app is connected locally also so we stop running into these
 * issues." The blocker each session was that the per-adapter `health()`
 * methods each carry their OWN scattered knowledge of which env vars they
 * need (alpacaAdapter checks ALPACA_KEY/SECRET, tastytradeAdapter checks
 * three TASTYTRADE_* vars, moomooAdapter checks two MOOMOO_BRIDGE_* vars,
 * webull market-data checks WEBULL_* …). There was no ONE inspectable,
 * testable receipt that says, per provider, READY or BLOCKED(missing VAR) —
 * and no way to prove the local `.env.local` and the Cloudflare host carry
 * the SAME set (env parity).
 *
 * This module is that receipt. It is:
 *   - DECLARATIVE: one `PROVIDER_REQUIREMENTS` table is the drift-proof
 *     source of truth for what each provider needs to even attempt a
 *     connection. Adapters can later read from it instead of re-deriving.
 *   - PRESENCE-ONLY: it accepts an env presence map and checks whether each
 *     required name is present & non-empty. It NEVER reads, returns, logs,
 *     or compares a secret VALUE. Its output is safe to render, serialize,
 *     and commit.
 *   - PURE / DETERMINISTIC: no clock, no I/O, no randomness, no process.env
 *     read of its own — the caller passes the env map so tests are total.
 *
 * A provider being READY here means "the credentials needed to attempt a
 * connection are present." It is deliberately WEAKER than a live health
 * check or the broker Certification Harness (certification.ts) — presence
 * of a key is necessary, not sufficient. Never round READY up to
 * "connected" or "certified."
 */

/** Stable identity for each connectable provider lane. */
export type ProviderId =
  | "webull-data"
  | "webull-broker"
  | "tastytrade"
  | "moomoo"
  | "alpaca-paper"
  | "alpaca-live";

export type ReadinessStatus = "READY" | "BLOCKED";

export type ProviderLane = "market-data" | "broker";

/**
 * Declarative requirement for one provider lane. `required` names MUST all
 * be present & non-empty for READY; `recommended` names improve fidelity
 * (e.g. an explicit host/canary symbol) but do not gate READY.
 */
export interface ProviderRequirement {
  readonly provider: ProviderId;
  readonly label: string;
  readonly lane: ProviderLane;
  readonly required: readonly string[];
  readonly recommended: readonly string[];
  /** One-line human explanation surfaced in the readiness receipt. */
  readonly note: string;
}

/**
 * THE canonical table. Adding a provider here is the ONLY place a new
 * connection's env contract is declared. Mirrors the presence checks the
 * adapters perform today (alpacaAdapter, tastytradeAdapter, moomooAdapter,
 * webullMarketData) so this receipt can never silently disagree with them.
 */
export const PROVIDER_REQUIREMENTS: readonly ProviderRequirement[] = [
  {
    provider: "webull-data",
    label: "Webull market data",
    lane: "market-data",
    required: ["WEBULL_API_KEY", "WEBULL_API_SECRET"],
    recommended: ["WEBULL_ACCESS_TOKEN", "WEBULL_API_HOST", "WEBULL_DATA_URL", "WEBULL_CANARY_SYMBOL"],
    note: "Signed tick reads. WEBULL_ACCESS_TOKEN is optional unless Webull OpenAPI 2FA requires it; WEBULL_API_HOST defaults to Webull's production Data API host.",
  },
  {
    provider: "webull-broker",
    label: "Webull broker execution",
    lane: "broker",
    required: ["WEBULL_API_KEY", "WEBULL_API_SECRET", "WEBULL_CLIENT_ID"],
    recommended: ["WEBULL_ACCESS_TOKEN", "WEBULL_API_HOST"],
    note: "Broker execution is a future adapter atom; credentials alone do not authorize orders.",
  },
  {
    provider: "tastytrade",
    label: "Tastytrade",
    lane: "broker",
    required: ["TASTYTRADE_CLIENT_ID", "TASTYTRADE_CLIENT_SECRET", "TASTYTRADE_REFRESH_TOKEN"],
    recommended: ["TASTYTRADE_ENV"],
    note: "Needs the OAuth client pair AND a refresh token; the client pair alone cannot mint a session.",
  },
  {
    provider: "moomoo",
    label: "Moomoo (OpenD bridge)",
    lane: "broker",
    required: ["MOOMOO_BRIDGE_URL", "MOOMOO_BRIDGE_TOKEN"],
    recommended: ["MOOMOO_CANARY_SYMBOL"],
    note: "Both the bridge URL and shared bearer token must be set AND a reachable OpenD bridge must be running.",
  },
  {
    provider: "alpaca-paper",
    label: "Alpaca (paper)",
    lane: "broker",
    required: ["ALPACA_PAPER_KEY", "ALPACA_PAPER_SECRET"],
    recommended: [],
    note: "Paper-account key/secret pair.",
  },
  {
    provider: "alpaca-live",
    label: "Alpaca (live)",
    lane: "broker",
    required: ["ALPACA_KEY", "ALPACA_SECRET"],
    recommended: [],
    note: "Live-account key/secret pair.",
  },
];

/** Env presence map — values may be present, empty, or undefined. */
export type EnvPresence = Readonly<Record<string, string | undefined>>;

/** A required/recommended var counts as present only when non-empty after trim. */
export function isEnvPresent(env: EnvPresence, name: string): boolean {
  const v = env[name];
  return typeof v === "string" && v.trim().length > 0;
}

export interface ProviderReadiness {
  readonly provider: ProviderId;
  readonly label: string;
  readonly lane: ProviderLane;
  readonly status: ReadinessStatus;
  /** Required vars that are absent/empty — the exact reason for BLOCKED. */
  readonly missing: readonly string[];
  /** Recommended vars that are absent/empty — fidelity gaps, not blockers. */
  readonly missingRecommended: readonly string[];
  readonly note: string;
}

function requirementFor(provider: ProviderId): ProviderRequirement {
  const req = PROVIDER_REQUIREMENTS.find((r) => r.provider === provider);
  if (!req) throw new Error(`Unknown provider: ${provider}`);
  return req;
}

/**
 * Compute readiness for a single provider. READY iff every required var is
 * present & non-empty. Never inspects values beyond presence.
 */
export function computeProviderReadiness(
  provider: ProviderId,
  env: EnvPresence,
): ProviderReadiness {
  const req = requirementFor(provider);
  const missing = req.required.filter((name) => !isEnvPresent(env, name));
  const missingRecommended = req.recommended.filter((name) => !isEnvPresent(env, name));
  return {
    provider: req.provider,
    label: req.label,
    lane: req.lane,
    status: missing.length === 0 ? "READY" : "BLOCKED",
    missing,
    missingRecommended,
    note: req.note,
  };
}

/** Compute readiness for every declared provider, in table order. */
export function computeAllProviderReadiness(env: EnvPresence): readonly ProviderReadiness[] {
  return PROVIDER_REQUIREMENTS.map((r) => computeProviderReadiness(r.provider, env));
}

/**
 * The complete union of every var name any provider references (required OR
 * recommended), de-duplicated and sorted. This is the exact key set that
 * local `.env.local` and the deployed host should agree on.
 */
export function allProviderEnvNames(): readonly string[] {
  const set = new Set<string>();
  for (const r of PROVIDER_REQUIREMENTS) {
    for (const n of r.required) set.add(n);
    for (const n of r.recommended) set.add(n);
  }
  return [...set].sort();
}

export type ParityStatus = "OK" | "LOCAL_ONLY" | "HOST_ONLY" | "ABSENT_BOTH";

export interface EnvParityRow {
  readonly name: string;
  readonly inLocal: boolean;
  readonly inHost: boolean;
  readonly status: ParityStatus;
}

export interface EnvParityReport {
  readonly rows: readonly EnvParityRow[];
  /** Rows where local and host disagree (present in exactly one). */
  readonly drift: readonly EnvParityRow[];
  /** True when NO name is present in exactly one side. */
  readonly inParity: boolean;
}

/**
 * Compare a local env presence map against a host env presence map across a
 * fixed set of names. Presence-only: it reports WHICH names differ, never a
 * value. `LOCAL_ONLY` / `HOST_ONLY` are the drift the portability directive
 * asks us to eliminate ("connected locally also and connected through the
 * host at all times"). `ABSENT_BOTH` is agreement (both empty) — not drift.
 */
export function computeEnvParity(
  names: readonly string[],
  localEnv: EnvPresence,
  hostEnv: EnvPresence,
): EnvParityReport {
  const rows: EnvParityRow[] = names.map((name) => {
    const inLocal = isEnvPresent(localEnv, name);
    const inHost = isEnvPresent(hostEnv, name);
    let status: ParityStatus;
    if (inLocal && inHost) status = "OK";
    else if (inLocal && !inHost) status = "LOCAL_ONLY";
    else if (!inLocal && inHost) status = "HOST_ONLY";
    else status = "ABSENT_BOTH";
    return { name, inLocal, inHost, status };
  });
  const drift = rows.filter((r) => r.status === "LOCAL_ONLY" || r.status === "HOST_ONLY");
  return { rows, drift, inParity: drift.length === 0 };
}

/** One-line summary for logs / the readiness dashboard. Never emits values. */
export function readinessSummary(readiness: readonly ProviderReadiness[]): string {
  const ready = readiness.filter((r) => r.status === "READY").length;
  return `${ready}/${readiness.length} providers READY`;
}
