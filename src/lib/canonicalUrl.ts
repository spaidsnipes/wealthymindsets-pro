/**
 * Canonical application URL — the ONE host-of-record for auth redirects, email
 * links and the middleware canonical-host guard.
 *
 * Auth recovery (2026-08-23): the reset/signup/confirm links and middleware each
 * independently computed `NEXT_PUBLIC_SITE_URL ?? NEXT_PUBLIC_APP_URL ?? <hardcoded>`,
 * and a stale hardcoded value (the paused Vercel host) leaked into the emails.
 * Consolidating to one source removes the host assumption from five call sites so
 * a migration only has to change ONE thing (the env, or this default).
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL   (explicit production site)
 *   2. NEXT_PUBLIC_APP_URL    (legacy alias)
 *   3. DEFAULT_CANONICAL_URL  (current live host — never the old/paused host)
 *
 * NOTE: NEXT_PUBLIC_* is inlined at BUILD time, so the value baked here is the
 * one present when `opennextjs-cloudflare build` runs. Set NEXT_PUBLIC_SITE_URL
 * in the build environment to the final domain; this default is the safety net.
 */

/** Current live host — the custom domain (apex+www bound to the Cloudflare Worker). */
export const DEFAULT_CANONICAL_URL = "https://wealthymindsetspro.com";

/**
 * The raw workers.dev origin the Worker also answers on. Retained ONLY as an
 * intentional fallback for comparison/debug — never used as the auth host of
 * record. Auth redirects and email links resolve through `resolve()`, which
 * prefers env → DEFAULT_CANONICAL_URL (the custom domain).
 */
export const WORKERS_DEV_FALLBACK = "https://wealthymindsets-pro.dhill5711.workers.dev";

function resolve(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    DEFAULT_CANONICAL_URL;
  return raw.replace(/\/+$/, ""); // no trailing slash — callers append paths
}

/** The canonical origin, e.g. "https://wealthymindsetspro.com". */
export const CANONICAL_URL = resolve();

/**
 * Function form of the canonical-URL resolution. Prefer this at call sites that
 * run per-request (route handlers, middleware) so a runtime env override is
 * honored; the `CANONICAL_URL` constant captures the value at module-eval time.
 */
export function getCanonicalUrl(): string {
  return resolve();
}

/** The canonical host, e.g. "wealthymindsetspro.com". */
export const CANONICAL_HOST = new URL(CANONICAL_URL).host;

/**
 * Dreamboard (Above The Hill) external app URL. Env-driven — set
 * NEXT_PUBLIC_DREAMBOARD_URL to Dreamboard's Cloudflare host. Intentionally has
 * NO Vercel default: the codebase must carry zero Vercel coupling. When unset,
 * callers fall back to the WM canonical origin rather than a dead Vercel link.
 */
export const DREAMBOARD_URL =
  (process.env.NEXT_PUBLIC_DREAMBOARD_URL || CANONICAL_URL).replace(/\/+$/, "");
