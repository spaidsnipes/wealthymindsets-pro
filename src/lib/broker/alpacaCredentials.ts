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
