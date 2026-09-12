/**
 * Resolve Alpaca's live credential pair across the canonical names and the
 * legacy Cloudflare binding names already used by WM Pro. Values stay
 * server-side; callers must never serialize or log this result.
 */
export type AlpacaCredentialEnv = Readonly<Record<string, string | undefined>>;

export interface AlpacaLiveCredentials {
  readonly key: string;
  readonly secret: string;
  readonly source: "canonical" | "legacy" | "missing";
}

function clean(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveAlpacaLiveCredentials(
  env: AlpacaCredentialEnv = process.env,
): AlpacaLiveCredentials {
  const canonicalKey = clean(env.ALPACA_KEY);
  const canonicalSecret = clean(env.ALPACA_SECRET);
  if (canonicalKey && canonicalSecret) {
    return { key: canonicalKey, secret: canonicalSecret, source: "canonical" };
  }

  const legacyKey = clean(env.ALPACA_BROKERAGE_KEY);
  const legacySecret = clean(env.ALPACA_BROKERAGE_KEY_SECRET_);
  if (legacyKey && legacySecret) {
    return { key: legacyKey, secret: legacySecret, source: "legacy" };
  }

  return { key: "", secret: "", source: "missing" };
}

export function hasAlpacaLiveCredentials(env: AlpacaCredentialEnv = process.env): boolean {
  return resolveAlpacaLiveCredentials(env).source !== "missing";
}

/**
 * The PAPER pair, resolved the same way — and for the same measured reason.
 *
 * On 2026-09-11 `/api/broker/readiness` reported alpaca-paper BLOCKED on
 * ALPACA_PAPER_KEY / ALPACA_PAPER_SECRET while the production host carried
 * `ALPACA_PAPER_TRADE_API_KEY` and `ALPACA_PAPER_TRADE_SECRET_KEY`. Same
 * class of defect as the FINNHUB_KEY_ underscore: the credentials were
 * present, under the names the host actually uses.
 *
 * This is a PAIR resolver, not per-name aliasing (which is what
 * `resolveProviderEnv` does). Mixing half the canonical pair with half the
 * host pair authenticates nothing and would surface as an opaque upstream 401
 * — so a set is taken whole or not at all, exactly as the live pair is.
 */
export function resolveAlpacaPaperCredentials(
  env: AlpacaCredentialEnv = process.env,
): AlpacaLiveCredentials {
  const canonicalKey = clean(env.ALPACA_PAPER_KEY);
  const canonicalSecret = clean(env.ALPACA_PAPER_SECRET);
  if (canonicalKey && canonicalSecret) {
    return { key: canonicalKey, secret: canonicalSecret, source: "canonical" };
  }

  const hostKey = clean(env.ALPACA_PAPER_TRADE_API_KEY);
  const hostSecret = clean(env.ALPACA_PAPER_TRADE_SECRET_KEY);
  if (hostKey && hostSecret) {
    return { key: hostKey, secret: hostSecret, source: "legacy" };
  }

  return { key: "", secret: "", source: "missing" };
}

export function hasAlpacaPaperCredentials(env: AlpacaCredentialEnv = process.env): boolean {
  return resolveAlpacaPaperCredentials(env).source !== "missing";
}
