/**
 * EnvRegistry — canonical resolver for market-data provider API keys.
 *
 * Founder P0: "Finish EnvRegistry and eliminate duplicate/mystery env usage."
 *
 * Discovery: four server routes (finnhub, market, fmp, symbol-search) each
 * inline the same pattern — prefer a server-only key, fall back to a
 * client-exposed `NEXT_PUBLIC_*` key. That fallback is a transitional bridge
 * during a Vercel key rotation, but it is exactly the "mystery/duplicate env
 * usage" the canon wants centralized: a `NEXT_PUBLIC_*` value ships in the
 * browser bundle, so a server route relying on it is a latent secret-exposure.
 *
 * This module is the ONE place provider keys resolve. It:
 *   · prefers the server-only name;
 *   · falls back to the public name (transitional) and REPORTS the source;
 *   · warns (server-only, once per provider, value never printed) when the
 *     public fallback is the one relied on — the "log first" step of the canon
 *     removal sequence (log → rotate Vercel → delete fallback in code).
 *
 * It does NOT delete the fallback — removing it before the founder rotates
 * Vercel env vars would strand production. Behavior of every caller is
 * preserved; only the resolution is centralized and made diagnosable.
 */

export type ProviderKeyId = "finnhub" | "fmp" | "polygon";
export type KeySource = "server" | "public-fallback" | "missing";

interface KeySpec {
  readonly server: string;
  readonly publicFallback: string;
}

const SPECS: Record<ProviderKeyId, KeySpec> = {
  finnhub: { server: "FINNHUB_KEY", publicFallback: "NEXT_PUBLIC_FINNHUB_KEY" },
  fmp: { server: "FMP_KEY", publicFallback: "NEXT_PUBLIC_FMP_KEY" },
  polygon: { server: "POLYGON_KEY", publicFallback: "NEXT_PUBLIC_POLYGON_KEY" },
};

export interface ResolvedProviderKey {
  readonly id: ProviderKeyId;
  /** The resolved key value, or "" when neither name is set. */
  readonly value: string;
  readonly source: KeySource;
  readonly serverName: string;
  readonly publicName: string;
}

function nonEmpty(v: string | undefined): v is string {
  return typeof v === "string" && v.length > 0;
}

/**
 * Pure resolution from a provided env snapshot — no process.env, fully testable.
 * Prefers the server name; falls back to the public name; else missing.
 */
export function resolveProviderKeyFrom(
  env: Record<string, string | undefined>,
  id: ProviderKeyId,
): ResolvedProviderKey {
  const spec = SPECS[id];
  const base = { id, serverName: spec.server, publicName: spec.publicFallback } as const;
  if (nonEmpty(env[spec.server])) return { ...base, value: env[spec.server] as string, source: "server" };
  if (nonEmpty(env[spec.publicFallback])) return { ...base, value: env[spec.publicFallback] as string, source: "public-fallback" };
  return { ...base, value: "", source: "missing" };
}

const warned = new Set<ProviderKeyId>();

/**
 * Runtime resolution against process.env. Emits a one-time server-only warning
 * (value never printed) when the client-exposed fallback is relied on.
 */
export function resolveProviderKey(id: ProviderKeyId): ResolvedProviderKey {
  const resolved = resolveProviderKeyFrom(process.env as Record<string, string | undefined>, id);
  if (resolved.source === "public-fallback" && !warned.has(id)) {
    warned.add(id);
    console.warn(
      `[EnvRegistry] ${id}: relying on client-exposed ${resolved.publicName} fallback. ` +
        `Set server-only ${resolved.serverName} in Vercel and delete ${resolved.publicName}.`,
    );
  }
  return resolved;
}

/** Test hook — clears the warn-once memo so warning behavior is assertable. */
export function __resetProviderKeyWarnings(): void {
  warned.clear();
}
