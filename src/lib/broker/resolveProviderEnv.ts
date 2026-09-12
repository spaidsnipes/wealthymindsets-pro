/**
 * resolveProviderEnv — make a DECLARED alias actually wire the provider.
 *
 * ── The measured failure (observed live 2026-09-11) ─────────────────────────
 *
 * `/api/broker/readiness` on production reported `finnhub` BLOCKED on a
 * missing `FINNHUB_KEY`, while its own near-miss detector reported, in the
 * same payload:
 *
 *   { expected: "FINNHUB_KEY", found: "FINNHUB_KEY_",
 *     confidence: "EXACT_MODULO_PUNCTUATION" }
 *
 * The credential was NOT missing. It was present, as an encrypted Cloudflare
 * Secret, under a name one trailing underscore away from the one the code
 * reads — and the entire real-time US equity tape was off the air because of
 * it. `providerReadiness.ts` has carried a docblock about this exact defect
 * since 2026-09-05. Six days later it was still true in production.
 *
 * It is not one typo. The same host carries `ALPACA_BROKERAGE_KEY_SECRET_`,
 * `ATH_LIVEKIT_KEY_`, `ATH_LIVEKIT_KEY_SECRET_` and `TWELVE_DATA_KEY_`. Four
 * independent humans do not make the same trailing-underscore mistake four
 * times; this is an artifact of how the secrets were bulk-loaded. Treating it
 * as "the founder should go rename things in a dashboard" mistakes a
 * systematic property of the host for an operator error, and leaves the tape
 * dead until someone does manual work.
 *
 * ── Why the fix belongs HERE and not in each route ──────────────────────────
 *
 * `PROVIDER_REQUIREMENTS` already declares `aliases` — it is the canonical
 * owner of "which names can satisfy this credential", and its docblock already
 * promises that "declaring a fallback in PROVIDER_REQUIREMENTS ... also
 * silences it here". But that declaration only ever reached the RECEIPT. The
 * consumers re-derive their own names by hand:
 *
 *   process.env.FINNHUB_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_KEY
 *
 * So the table could declare an alias, readiness could turn green, and the
 * route would still 503 — a receipt that disagrees with the wire, which is
 * strictly worse than a receipt that stays red. This module closes that gap:
 * the table becomes the ONE place an alias is declared, and declaring it
 * there is what actually connects the provider.
 *
 * `resolveAlpacaLiveCredentials` stays as-is and is NOT replaced. Alpaca's
 * legacy pair is an all-or-nothing `alternativeGroup` — half of one pair plus
 * half of the other authenticates nothing — which is a stricter rule than
 * per-name aliasing and must not be flattened into one.
 *
 * ── What this module refuses to do ──────────────────────────────────────────
 *
 * It does NOT strip trailing underscores, fuzzy-match, or otherwise guess. A
 * silent normalization rule would bind a route to whatever secret happened to
 * look close enough, and the first time it bound the WRONG value the failure
 * would be an upstream 401 with no trace back to here. Every accepted name is
 * written down, by hand, in `PROVIDER_REQUIREMENTS`.
 *
 * Values are returned to server-side callers only. The resolved NAME is safe
 * to log and surface; the VALUE must never be serialized, logged, or returned
 * to a client.
 */

import { PROVIDER_REQUIREMENTS, type EnvPresence } from "./providerReadiness";

export interface ResolvedEnv {
  /** The env name the value was actually found under — safe to surface. */
  readonly name: string;
  /** The secret value. NEVER log, serialize, or return this to a client. */
  readonly value: string;
  /** True when the value came from an alias rather than the canonical name. */
  readonly viaAlias: boolean;
}

function clean(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Every name that can satisfy `canonical`, canonical first, then the aliases
 * declared for it anywhere in `PROVIDER_REQUIREMENTS`.
 *
 * The union is taken across ALL provider rows rather than a single row on
 * purpose: `FINNHUB_KEY` is referenced by the finnhub lane today, but nothing
 * stops a second lane from declaring the same credential tomorrow, and a
 * caller should not have to know which row to ask about.
 */
export function acceptedEnvNames(canonical: string): readonly string[] {
  const names = [canonical];
  for (const req of PROVIDER_REQUIREMENTS) {
    for (const alias of req.aliases?.[canonical] ?? []) {
      if (!names.includes(alias)) names.push(alias);
    }
  }
  return names;
}

/**
 * Resolve one credential across its canonical name and every declared alias,
 * in declaration order. Returns `null` when no accepted name carries a
 * non-empty value — the caller decides what that means, because "absent" is a
 * different failure from "present but rejected upstream" and this module must
 * not collapse the two.
 */
export function resolveProviderEnv(
  canonical: string,
  env: EnvPresence = process.env,
): ResolvedEnv | null {
  for (const name of acceptedEnvNames(canonical)) {
    const value = clean(env[name]);
    if (value) return { name, value, viaAlias: name !== canonical };
  }
  return null;
}
