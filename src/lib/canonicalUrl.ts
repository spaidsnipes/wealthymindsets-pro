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

/**
 * Hostname suffixes belonging to a HOSTING PLATFORM rather than to this
 * company — the class of addresses this app is reachable on without anyone
 * having chosen them as the public front door.
 *
 * WHY THIS IS A TABLE AND NOT A SUFFIX LITERAL INSIDE THE MIDDLEWARE
 *
 * The middleware's job is to stop a customer beginning an authenticated
 * journey on a non-canonical host. Cookies are host-scoped, so a Passport
 * created on a platform hostname does not exist on the custom domain: a
 * confirmation email can succeed and still return the customer to a
 * signed-out application.
 *
 * That invariant is about the CLASS of platform hostnames, but the middleware
 * spelled exactly one member of it inline — `.vercel.app`. So the guard
 * stopped guarding anything the moment production moved, and, worse, never
 * began guarding the new platform hostname. Observed 2026-09-11:
 * `https://wealthymindsets-pro.dhill5711.workers.dev/login` served a full
 * login surface with NO redirect (HTTP 200), while the Vercel host it did
 * guard returned 402 and could never reach this Worker at all. The lock was on
 * the door nobody could open.
 *
 * Naming the class here, beside the canonical host it is defined against,
 * means the next migration edits one list instead of rediscovering the
 * invariant from a production incident.
 *
 * Vercel is deliberately absent: a retired host cannot route to this Worker,
 * so a branch matching it is unreachable by construction (Command Center
 * 2026-09-11, RETIREMENT / GHOST-HOST LAW).
 *
 * `localhost` and bare IPs are deliberately absent too. Local development is
 * not a customer journey, and redirecting it to production would make the app
 * impossible to run.
 */
export const PLATFORM_HOST_SUFFIXES = [
  ".workers.dev", // Cloudflare Workers — current production platform
  ".pages.dev", // Cloudflare Pages — preview/branch deployments
] as const;

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
 * True when `host` is a platform address that is NOT the canonical front door,
 * so a customer arriving there must be moved to the canonical host before any
 * cookie is written.
 *
 * Exported so the middleware and its tests share ONE predicate instead of each
 * re-deriving "is this the right host" — the retyped-list defect class, where
 * a hand-written test restates the rule and therefore pins the bug green.
 *
 * `canonicalHost` is a parameter (defaulting to the module constant) only so
 * tests can drive the decision table without mutating build-time env.
 */
export function isNonCanonicalPlatformHost(
  host: string | null | undefined,
  canonicalHost: string = CANONICAL_HOST,
): boolean {
  if (!host) return false;
  const h = host.toLowerCase().trim();
  if (h === canonicalHost.toLowerCase()) return false;
  return PLATFORM_HOST_SUFFIXES.some((suffix) => h.endsWith(suffix));
}

/**
 * Dreamboard (Above The Hill) external app URL. Env-driven — set
 * NEXT_PUBLIC_DREAMBOARD_URL to Dreamboard's Cloudflare host. Intentionally has
 * NO Vercel default: the codebase must carry zero Vercel coupling. When unset,
 * callers fall back to the WM canonical origin rather than a dead Vercel link.
 */
export const DREAMBOARD_URL =
  (process.env.NEXT_PUBLIC_DREAMBOARD_URL || CANONICAL_URL).replace(/\/+$/, "");
