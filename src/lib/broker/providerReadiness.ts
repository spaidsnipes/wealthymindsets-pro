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
  | "alpaca-live"
  | "finnhub"
  | "polygon"
  | "livekit";

export type ReadinessStatus = "READY" | "BLOCKED";

export type ProviderLane = "market-data" | "broker" | "realtime";

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
  /**
   * Per-name accepted alternatives, mirroring a `??` fallback the consuming
   * code actually performs (e.g. `FINNHUB_KEY ?? NEXT_PUBLIC_FINNHUB_KEY`).
   * Each canonical required NAME is satisfied independently by any one of its
   * alternatives. Declared here rather than hard-coded in the compute function
   * so the table stays the single place a connection's env contract lives.
   */
  readonly aliases?: Readonly<Record<string, readonly string[]>>;
  /**
   * All-or-nothing alternative credential sets. If EVERY name in one group is
   * present, the whole `required` list is satisfied. This is stricter than
   * `aliases` on purpose: a legacy PAIR must not be mixable with half of the
   * canonical pair, because neither half-set can authenticate.
   */
  readonly alternativeGroups?: readonly (readonly string[])[];
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
    aliases: {
      WEBULL_APP_KEY: ["WEBULL_API_KEY"],
      WEBULL_APP_SECRET: ["WEBULL_API_SECRET"],
    },
    recommended: ["WEBULL_ACCESS_TOKEN", "WEBULL_API_HOST", "WEBULL_DATA_URL", "WEBULL_CANARY_SYMBOL"],
    note: "Signed tick reads use the Webull App Key/Secret. Webull requires WEBULL_ACCESS_TOKEN only when OpenAPI 2FA is enabled, so its absence is reported as a checkpoint without being invented as the cause of a Data API 401. WEBULL_API_HOST defaults to Webull's production Data API host.",
  },
  {
    provider: "webull-broker",
    label: "Webull broker execution",
    lane: "broker",
    required: ["WEBULL_APP_KEY", "WEBULL_APP_SECRET"],
    aliases: {
      WEBULL_APP_KEY: ["WEBULL_API_KEY"],
      WEBULL_APP_SECRET: ["WEBULL_API_SECRET"],
    },
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
    alternativeGroups: [["ALPACA_PAPER_TRADE_API_KEY", "ALPACA_PAPER_TRADE_SECRET_KEY"]],
    recommended: [],
    note: "Paper-account key/secret pair. The ALPACA_PAPER_TRADE_API_KEY / ALPACA_PAPER_TRADE_SECRET_KEY pair this host actually carries is accepted as a COMPLETE alternative set (resolveAlpacaPaperCredentials); half of one pair plus half of the other authenticates nothing.",
  },
  {
    provider: "alpaca-live",
    label: "Alpaca (live)",
    lane: "broker",
    required: ["ALPACA_KEY", "ALPACA_SECRET"],
    alternativeGroups: [["ALPACA_BROKERAGE_KEY", "ALPACA_BROKERAGE_KEY_SECRET_"]],
    recommended: [],
    note: "Live-account key/secret pair. The legacy Cloudflare ALPACA_BROKERAGE_KEY / ALPACA_BROKERAGE_KEY_SECRET_ pair is accepted as a COMPLETE alternative set (resolveAlpacaLiveCredentials) without exposing values; half of one pair plus half of the other authenticates nothing.",
  },
  {
    provider: "finnhub",
    label: "Finnhub market data",
    lane: "market-data",
    required: ["FINNHUB_KEY"],
    aliases: { FINNHUB_KEY: ["FINNHUB_KEY_", "NEXT_PUBLIC_FINNHUB_KEY"] },
    recommended: [],
    note: "Server-side quote/candle proxy behind /api/finnhub and /api/market. When absent in production both routes answer 503 with edge NOT CONFIGURED rather than signing a request with the committed dev fallback — the stock tape simply does not render. FINNHUB_KEY_ (trailing underscore) is the name this host actually carries; it is ACCEPTED here so the tape runs, not blessed as correct — see resolveProviderEnv for why the host's naming is treated as a host property rather than an operator error.",
  },
  {
    provider: "polygon",
    label: "Polygon symbol search",
    lane: "market-data",
    required: ["POLYGON_KEY"],
    aliases: { POLYGON_KEY: ["NEXT_PUBLIC_POLYGON_KEY"] },
    recommended: [],
    note: "Backs /api/symbol-search (stocks, ETFs, forex, crypto, indices, futures). Absent means symbol lookup returns nothing; it does not degrade an already-loaded chart.",
  },
  {
    provider: "livekit",
    label: "LiveKit realtime (Lounge)",
    lane: "realtime",
    required: ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "NEXT_PUBLIC_LIVEKIT_URL"],
    recommended: [],
    note: "The API key/secret mint room tokens server-side; NEXT_PUBLIC_LIVEKIT_URL is the wss host the browser dials. All three are required — a minted token with no host, or a host with no token, cannot open a room.",
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
  // A complete alternative credential set satisfies the whole required list.
  // Empty groups are ignored so a stray `[]` can never declare READY.
  const satisfiedByGroup = (req.alternativeGroups ?? []).some(
    (group) => group.length > 0 && group.every((name) => isEnvPresent(env, name)),
  );
  const missing = satisfiedByGroup
    ? []
    : req.required.filter((name) => {
        if (isEnvPresent(env, name)) return false;
        return !(req.aliases?.[name] ?? []).some((alt) => isEnvPresent(env, alt));
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
    // Alias and alternative-group names are real host names a reader must be
    // able to see in the receipt. Deriving them from the table (rather than
    // re-listing them here) means declaring a fallback in ONE place is enough.
    for (const alts of Object.values(r.aliases ?? {})) for (const n of alts) set.add(n);
    for (const group of r.alternativeGroups ?? []) for (const n of group) set.add(n);
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

/**
 * The canonical one-call entry point for a runtime's env receipt.
 *
 * Two things happen here that a raw detectEnvNameNearMisses call does not do:
 *
 *  1. The expected set is `allProviderEnvNames()` — every name any declared
 *     provider references. Callers cannot accidentally scan a narrower list
 *     and miss the lane that is actually down.
 *
 *  2. Any hit whose `found` name is ITSELF a declared name is dropped. A host
 *     carrying WEBULL_API_HOST is not a mysterious lookalike for a missing
 *     WEBULL_APP_KEY — it is a known variable doing its job, and reporting it
 *     would be exactly the cry-wolf noise that gets a Sentinel ignored. This
 *     is why declaring a fallback in PROVIDER_REQUIREMENTS (as an alias or an
 *     alternativeGroup) also silences it here: accounted-for names stop being
 *     suspects.
 *
 * The presence short-circuit still runs against the FULL host env, so a name
 * that actually resolved stays silent no matter what its neighbours look like.
 */
export function detectUnaccountedEnvNameNearMisses(
  hostEnv: EnvPresence,
): readonly EnvNameNearMiss[] {
  const declared = allProviderEnvNames();
  const declaredSet = new Set(declared);
  return detectEnvNameNearMisses(declared, hostEnv).filter((h) => !declaredSet.has(h.found));
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * WORKER SECRET DECLARATION — the deploy manifest's half of the contract.
 *
 * FAILURE CLASS: UNDECLARED_REQUIRED_BINDING.
 *
 * MEASURED, not hypothetical. `wrangler.jsonc` shipped with no `secrets`
 * block at all. Wrangler's schema HAS one (`secrets.required`, names only —
 * verified against node_modules/wrangler/config-schema.json), and when it is
 * absent wrangler falls back to INFERRING the secret set from .dev.vars /
 * .env / process.env. Inference from a local file is exactly the mechanism
 * that lets a deployed Worker be missing a credential that the developer's
 * laptop happens to have. Nothing in the repo could state, and nothing could
 * check, what the RUNNING Worker is required to carry.
 *
 * The fix is NOT a hand-written list in wrangler.jsonc. A second list is a
 * second truth, and INVASIVE_DUPLICATE_TRUTH is the failure class this whole
 * registry exists to abolish. So the list in the manifest is DERIVED here and
 * a Sentinel asserts the manifest equals this function byte-for-byte. The
 * manifest is a mirror; PROVIDER_REQUIREMENTS is the source.
 *
 * NAMES ONLY. No value is read, returned, or logged — same rule as every
 * other export in this module.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * A non-secret name is CONFIG: which host to dial, which symbol to canary,
 * which environment to select. Absent config degrades a feature; absent
 * credentials fail authentication. `secrets.required` is for the latter, so
 * listing config there would train an operator to ignore the warning.
 */
function isNonSecretConfigName(name: string): boolean {
  if (name.startsWith("NEXT_PUBLIC_")) return true; // build-time public, never a Worker secret
  return (
    name.endsWith("_URL") ||
    name.endsWith("_HOST") ||
    name.endsWith("_CANARY_SYMBOL") ||
    name === "TASTYTRADE_ENV"
  );
}

/**
 * Platform secrets are real Worker credentials that belong to no market-data
 * or broker provider, so PROVIDER_REQUIREMENTS has no row for them.
 *
 * `gatesBoot` separates "the Worker cannot serve a core path without this"
 * from "one feature is dark." Only the former is declared to wrangler: a
 * warning that fires on a deliberately-unconfigured optional feature is a
 * PARKED YELLOW, and a warning nobody can clear is a warning nobody reads.
 */
export interface PlatformSecret {
  readonly name: string;
  /** True when a core server path cannot answer without it. */
  readonly gatesBoot: boolean;
  readonly note: string;
}

export const PLATFORM_SECRETS: readonly PlatformSecret[] = [
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    gatesBoot: true,
    note: "supabaseAdmin.ts mints the server-side client. Without it every privileged read/write path fails, not one feature.",
  },
  {
    name: "JWT_SECRET",
    gatesBoot: true,
    note: "auth.ts signs and verifies the session token. Absent means nobody can hold a session.",
  },
  {
    name: "RESEND_API_KEY",
    gatesBoot: false,
    note: "email.ts only. Absent means transactional email is dark; every other route still answers.",
  },
  {
    name: "GEMINI_API_KEY",
    gatesBoot: false,
    note: "/api/spaidbot only. Absent means the assistant is unavailable and says so.",
  },
  {
    name: "WM_RECONCILIATION_WORKER_SECRET",
    gatesBoot: false,
    note: "/api/decision-position shared-secret guard. Absent means that one worker callback is refused, which is the safe direction.",
  },
];

/**
 * The exact set of secret NAMES a deployed Worker is required to carry.
 *
 * A provider's required name is EXCLUDED when it has an alias or its provider
 * declares an alternativeGroup. That is deliberate and is the whole reason
 * this function is not simply `required.flat()`:
 *
 *   MEASURED — this host carries `FINNHUB_KEY_` (trailing underscore), and
 *   the legacy `ALPACA_BROKERAGE_KEY` / `ALPACA_PAPER_TRADE_API_KEY` pairs.
 *   Those satisfy the provider through `aliases` / `alternativeGroups`, and
 *   the tape runs. Declaring the canonical `FINNHUB_KEY` to wrangler would
 *   emit a missing-secret warning on a host that is CORRECTLY CONFIGURED.
 *
 * wrangler's check is a flat name-presence test — it cannot express "either
 * this name or that one." So the manifest declares only names whose absence
 * is unambiguously a defect, and the alias-bearing names stay owned by
 * computeProviderReadiness, which CAN express the alternation. Two checkers,
 * one source, neither one lying.
 */
export function workerRequiredSecretNames(): readonly string[] {
  const out = new Set<string>();
  for (const r of PROVIDER_REQUIREMENTS) {
    const hasAltGroup = (r.alternativeGroups ?? []).some((g) => g.length > 0);
    if (hasAltGroup) continue;
    for (const name of r.required) {
      if (isNonSecretConfigName(name)) continue;
      if ((r.aliases?.[name] ?? []).length > 0) continue;
      out.add(name);
    }
  }
  for (const p of PLATFORM_SECRETS) if (p.gatesBoot) out.add(p.name);
  return [...out].sort();
}

/**
 * Provider required names deliberately ABSENT from the manifest, each with the
 * reason. Exported so the Sentinel can assert the exclusion is justified by
 * the table rather than by a hard-coded allowlist that would rot — and so a
 * human reading the receipt sees the gap explained instead of discovering it.
 */
export function secretsDeferredToReadiness(): readonly { name: string; reason: string }[] {
  // De-duplicated by NAME: one credential serving two lanes (WEBULL_APP_KEY is
  // required by both webull-data and webull-broker) is ONE secret, not two. A
  // receipt that lists it twice reads like two separate gaps.
  const byName = new Map<string, string>();
  for (const r of PROVIDER_REQUIREMENTS) {
    const hasAltGroup = (r.alternativeGroups ?? []).some((g) => g.length > 0);
    for (const name of r.required) {
      if (isNonSecretConfigName(name)) continue;
      if (byName.has(name)) continue;
      if (hasAltGroup) {
        byName.set(
          name,
          `${r.provider}: a complete alternative credential set may satisfy this; wrangler cannot express all-or-nothing groups.`,
        );
      } else if ((r.aliases?.[name] ?? []).length > 0) {
        byName.set(
          name,
          `${r.provider}: accepted aliases exist (${(r.aliases?.[name] ?? []).join(", ")}); wrangler cannot express alternation.`,
        );
      }
    }
  }
  return [...byName.entries()]
    .map(([name, reason]) => ({ name, reason }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
