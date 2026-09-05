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
  | "longbridge-data"
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
    required: ["WEBULL_APP_KEY", "WEBULL_APP_SECRET"],
    recommended: ["WEBULL_API_HOST", "WEBULL_DATA_URL", "WEBULL_CANARY_SYMBOL"],
    note: "Signed tick reads use the Webull App Key/Secret. A trading/account access token is a separate lane and is never inferred missing from a Data API 401; WEBULL_API_HOST defaults to Webull's production Data API host.",
  },
  {
    provider: "webull-broker",
    label: "Webull broker execution",
    lane: "broker",
    required: ["WEBULL_APP_KEY", "WEBULL_APP_SECRET"],
    recommended: ["WEBULL_ACCESS_TOKEN", "WEBULL_API_HOST", "WEBULL_CLIENT_ID"],
    note: "The App Key/Secret can prove the founder's signed Trading API account lane. WEBULL_CLIENT_ID is only required for the separate multi-user Connect OAuth flow. Credentials alone do not authorize orders.",
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
    provider: "longbridge-data",
    label: "Longbridge market data",
    lane: "market-data",
    required: ["LONGBRIDGE_BRIDGE_URL", "LONGBRIDGE_BRIDGE_TOKEN"],
    recommended: ["LONGBRIDGE_CANARY_SYMBOL"],
    note: "Portable Longbridge OpenAPI bridge. Credentials stay in the bridge; WM Pro receives bounded read-only tick receipts.",
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
    note: "Live-account key/secret pair. The legacy Cloudflare ALPACA_BROKERAGE_KEY / ALPACA_BROKERAGE_KEY_SECRET_ pair is accepted without exposing values.",
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
  const hasLegacyAlpacaLivePair = provider === "alpaca-live"
    && isEnvPresent(env, "ALPACA_BROKERAGE_KEY")
    && isEnvPresent(env, "ALPACA_BROKERAGE_KEY_SECRET_");
  const missing = hasLegacyAlpacaLivePair
    ? []
    : req.required.filter((name) => {
        if (provider.startsWith("webull-") && name === "WEBULL_APP_KEY" && isEnvPresent(env, "WEBULL_API_KEY")) return false;
        if (provider.startsWith("webull-") && name === "WEBULL_APP_SECRET" && isEnvPresent(env, "WEBULL_API_SECRET")) return false;
        return !isEnvPresent(env, name);
      });
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
  set.add("ALPACA_BROKERAGE_KEY");
  set.add("ALPACA_BROKERAGE_KEY_SECRET_");
  set.add("WEBULL_API_KEY");
  set.add("WEBULL_API_SECRET");
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

/* ── Near-miss env names (the FINNHUB_KEY_ class) ────────────────────
 *
 * WHY THIS EXISTS — a defect observed in production on 2026-09-05.
 *
 * /api/finnhub answered 503 {"edge":"NOT CONFIGURED","missing":["FINNHUB_KEY"]}
 * while the Cloudflare host carried a secret named `FINNHUB_KEY_`. One
 * trailing underscore took the entire real-time US equity tape off the air,
 * and nothing in this module could see it:
 *
 *   - `FINNHUB_KEY` is absent everywhere, so computeEnvParity scores it
 *     ABSENT_BOTH, which that function documents as "agreement — not drift."
 *   - `FINNHUB_KEY_` is not in allProviderEnvNames(), so it is never even
 *     looked at.
 *
 * Net effect: a parity report reading `inParity: true` beside a dead tape.
 * That is the silent-failure shape this codebase exists to abolish, so a
 * missing name whose LOOKALIKE is present in the host must be the loudest
 * row in the receipt, not the quietest.
 *
 * Presence-only, like everything else here: it compares NAMES. No value is
 * read, returned, or logged.
 */

/**
 * HIGH — identical once punctuation is discarded (`FINNHUB_KEY_` vs
 *        `FINNHUB_KEY`). Effectively always a typo.
 * MEDIUM — shares a distinctive, non-generic token (`ATH_LIVEKIT_KEY_` vs
 *        `LIVEKIT_API_KEY`). A lead to check, not a verdict.
 */
export type NearMissConfidence = "EXACT_MODULO_PUNCTUATION" | "SHARED_DISTINCTIVE_TOKENS";

export interface EnvNameNearMiss {
  /** The name the CODE reads — the source of truth. */
  readonly expected: string;
  /** The lookalike the host actually carries. */
  readonly found: string;
  readonly confidence: NearMissConfidence;
}

/**
 * Tokens too common to imply kinship. Without this filter every *_KEY var
 * looks like every other *_KEY var and the report drowns in noise — the
 * failure mode where a Sentinel gets whitelisted into uselessness.
 */
const GENERIC_TOKENS: ReadonlySet<string> = new Set([
  "KEY", "SECRET", "API", "URL", "TOKEN", "ID", "PUBLIC", "NEXT", "APP", "TRADE",
]);

function normalizeName(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function distinctiveTokens(name: string): ReadonlySet<string> {
  return new Set(
    name.toUpperCase().split(/[^A-Z0-9]+/).filter((t) => t && !GENERIC_TOKENS.has(t)),
  );
}

/**
 * For every expected name that is ABSENT from `hostEnv`, report any present
 * host key that looks like it. Sorted HIGH-confidence first so the most
 * actionable row reads first in any receipt.
 */
export function detectEnvNameNearMisses(
  expectedNames: readonly string[],
  hostEnv: EnvPresence,
): readonly EnvNameNearMiss[] {
  const presentHostKeys = Object.keys(hostEnv).filter((k) => isEnvPresent(hostEnv, k));
  const out: EnvNameNearMiss[] = [];

  for (const expected of expectedNames) {
    // A name that resolved is not a near miss, however odd its neighbours look.
    if (isEnvPresent(hostEnv, expected)) continue;

    const expectedNorm = normalizeName(expected);
    const expectedTokens = distinctiveTokens(expected);

    for (const found of presentHostKeys) {
      if (found === expected) continue;
      if (normalizeName(found) === expectedNorm) {
        out.push({ expected, found, confidence: "EXACT_MODULO_PUNCTUATION" });
        continue;
      }
      const foundTokens = distinctiveTokens(found);
      const shares = [...expectedTokens].some((t) => foundTokens.has(t));
      if (shares) {
        out.push({ expected, found, confidence: "SHARED_DISTINCTIVE_TOKENS" });
      }
    }
  }

  return out.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return a.confidence === "EXACT_MODULO_PUNCTUATION" ? -1 : 1;
    }
    return a.expected.localeCompare(b.expected) || a.found.localeCompare(b.found);
  });
}
