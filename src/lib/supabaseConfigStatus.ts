/**
 * supabaseConfigStatus — presence-only inspection of the Supabase auth
 * configuration on this runtime, so every WM auth route can name the SAME
 * exact missing var(s) instead of emitting vague "account service is not
 * configured" copy.
 *
 * Monday Test 2 law: name the actual proven failure class. When Supabase is
 * unwired on the host, magic-link / email-confirm / password-reset can't
 * originate at all — the honest edge is NOT CONFIGURED and the honest fix
 * is the specific variable names below. No secret VALUE is ever read.
 *
 * Pure / deterministic. Takes an env presence map so tests are total; the
 * caller (a route handler) reads `process.env` and passes it in.
 */

export type EnvPresence = Readonly<Record<string, string | undefined>>;

/** Non-empty-after-trim counts as present. */
function present(env: EnvPresence, name: string): boolean {
  const v = env[name];
  return typeof v === "string" && v.trim().length > 0;
}

export interface SupabaseConfigStatus {
  /** True iff URL + at least one accepted key are present. */
  readonly configured: boolean;
  /** Exact required NAMES that are absent — the honest fix list. */
  readonly missing: readonly string[];
}

/**
 * Trim the key at the boundary.
 *
 * Measured rather than assumed, because the obvious story is wrong: the
 * platform SILENTLY TRIMS leading and trailing whitespace from a header value,
 * so the trailing newline that `echo "$KEY" | wrangler secret put` leaves
 * behind does not break the request at all.
 *
 * What it breaks is the CONFIGURED verdict. A whitespace-only value is a truthy
 * string, so a bare presence check calls it configured, sends an empty `apikey`,
 * and Supabase answers "No API key found" for a host the operator believes is
 * wired. Trimming makes the verdict describe the value that will actually be
 * sent — see `useSupabase` in ./auth.
 *
 * (An INTERNAL newline does throw, and the platform's error message echoes the
 * offending value. That is why the login route surfaces the error NAME and
 * never its message.)
 */
export function normalizeSupabaseKey(raw: string | undefined): string {
  return (raw ?? "").trim();
}

/**
 * The URL is where a config defect really can throw. A value with no scheme —
 * `abc.supabase.co`, easily produced by pasting a hostname into a dashboard —
 * is not an absolute URL, so `new URL()` and therefore `fetch` raise
 * `TypeError: Invalid URL` before any request leaves the host. To the caller
 * that is indistinguishable from a dead backend.
 *
 * A trailing slash does not throw; it silently yields `//auth/v1/token`, which
 * is a different resource. Both are repaired here. The scheme is forced to
 * https because Supabase serves nothing else.
 */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Thrown when the configured auth backend answers with something that is not
 * JSON. Distinct from a generic Error because its message is SAFE BY
 * CONSTRUCTION — built only from the response's origin, status and
 * content-type, never from a header value or a response body. That is what
 * lets a route surface this message while still refusing to surface the
 * message of any other error (see the login route).
 */
export class SupabaseAuthShapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseAuthShapeError";
  }
}

/**
 * A Supabase auth endpoint answers JSON for every request, including rejected
 * ones — a missing key, a mangled path and a bad password all return a JSON
 * body. So a non-JSON answer does not mean "auth failed"; it means the request
 * never reached Supabase at all and some other server replied. The usual cause
 * is `NEXT_PUBLIC_SUPABASE_URL` pointing somewhere that is not the project
 * (a dashboard link, the site's own origin), which returns an HTML page that
 * `res.json()` then rejects with a SyntaxError — indistinguishable, from the
 * outside, from a dead backend.
 *
 * DISCLOSURE RULE — the reason this is not simply "print the URL": the value
 * being described is whatever an operator typed into NEXT_PUBLIC_SUPABASE_URL,
 * and operators paste the wrong thing into that box. A Supabase KEY pasted
 * there would be echoed straight into a public HTTP response by any message
 * that quotes the value. So the value is only ever named when its hostname is
 * a Supabase project host, which is public by design; anything else is
 * described by SHAPE and never quoted. The path is always omitted because some
 * auth paths carry a token, and the response body is never included because it
 * is attacker-influenced.
 */
export function nonJsonAuthResponseMessage(input: {
  readonly url: string;
  readonly status: number;
  readonly contentType?: string | null;
}): string {
  const ct = input.contentType?.trim() ? `"${input.contentType.trim()}"` : "no content-type";
  const answered = `answered HTTP ${input.status} with ${ct} instead of JSON`;

  let hostname: string | null = null;
  try {
    hostname = new URL(input.url).hostname;
  } catch {
    hostname = null;
  }

  if (hostname && /(^|\.)supabase\.(co|in|net)$/i.test(hostname)) {
    return `The auth backend at https://${hostname} ${answered}. Every Supabase auth endpoint answers JSON even when it rejects a request, so NEXT_PUBLIC_SUPABASE_URL on this host does not point at a working Supabase project. Correct it in the host runtime secrets (e.g. Cloudflare) and redeploy.`;
  }

  return `NEXT_PUBLIC_SUPABASE_URL on this host is not a Supabase project URL — its hostname does not end in .supabase.co. Whatever it points at ${answered}. The usual cause is a Supabase KEY pasted into the URL variable. Correct NEXT_PUBLIC_SUPABASE_URL in the host runtime secrets (e.g. Cloudflare) and redeploy. The configured value is withheld here because it may be a secret.`;
}

export function supabaseConfigStatus(env: EnvPresence = process.env): SupabaseConfigStatus {
  const hasUrl  = present(env, "NEXT_PUBLIC_SUPABASE_URL");
  const hasAnon = present(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const hasPub  = present(env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const missing: string[] = [];
  if (!hasUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!hasAnon && !hasPub) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)");
  return { configured: missing.length === 0, missing };
}

/**
 * What a configured value LOOKS LIKE — never what it is.
 *
 * `supabaseConfigStatus` answers "is it set", which was enough while the only
 * failure was an empty box. On 2026-09-05 the boxes were all full and sign-in
 * was still dead, because NEXT_PUBLIC_SUPABASE_URL held a publishable key. A
 * presence check calls that configured, and the operator has no way to tell
 * which of three variables is holding the wrong thing.
 *
 * Shape is the missing fact, and it is safe to publish where the value is not:
 * "this variable holds something shaped like a key" identifies the box to fix
 * without disclosing one character of what is in it. Every branch below returns
 * a fixed label — no input is ever echoed.
 */
export type SupabaseEnvShape =
  | "ABSENT"
  | "SUPABASE_PROJECT_URL"
  | "OTHER_URL"
  | "PUBLISHABLE_KEY"
  | "SECRET_KEY"
  | "JWT"
  | "UNRECOGNISED";

export function supabaseEnvShape(raw: string | undefined): SupabaseEnvShape {
  const v = (raw ?? "").trim();
  if (!v) return "ABSENT";
  if (/^sb_publishable_/.test(v)) return "PUBLISHABLE_KEY";
  if (/^sb_secret_/.test(v)) return "SECRET_KEY";
  // Legacy anon/service keys are JWTs: three base64url segments.
  if (/^ey[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(v)) return "JWT";
  try {
    const host = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`).hostname;
    // A bare token like `sb_publishable_x` parses as a hostname, so a URL verdict
    // requires a dot — otherwise every unrecognised string would look like a URL.
    if (!host.includes(".")) return "UNRECOGNISED";
    return /(^|\.)supabase\.(co|in|net)$/i.test(host) ? "SUPABASE_PROJECT_URL" : "OTHER_URL";
  } catch {
    return "UNRECOGNISED";
  }
}

export interface SupabaseEnvDefect {
  readonly variable: string;
  readonly holds: SupabaseEnvShape;
  readonly expected: string;
  readonly severity: "BLOCKING" | "SECURITY";
}

const URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_VARS = ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

/**
 * Name every variable whose contents are the wrong KIND of thing.
 *
 * The two defects this exists to catch are both real and both invisible to a
 * presence check: a key pasted into the URL box (auth dies, and the key is
 * echoed by any message that quotes the URL), and a SECRET key pasted into a
 * NEXT_PUBLIC_ box, which ships it to every browser that loads the app.
 */
export function supabaseEnvDefects(env: EnvPresence = process.env): readonly SupabaseEnvDefect[] {
  const defects: SupabaseEnvDefect[] = [];

  const urlShape = supabaseEnvShape(env[URL_VAR]);
  if (urlShape !== "ABSENT" && urlShape !== "SUPABASE_PROJECT_URL") {
    defects.push({
      variable: URL_VAR,
      holds: urlShape,
      expected: "a project URL ending in .supabase.co",
      severity: "BLOCKING",
    });
  }

  for (const name of KEY_VARS) {
    const shape = supabaseEnvShape(env[name]);
    if (shape === "ABSENT") continue;
    if (shape === "SECRET_KEY") {
      defects.push({
        variable: name,
        holds: shape,
        // NEXT_PUBLIC_ is inlined into the client bundle by design, so a secret
        // key here is not merely misplaced — it is already published.
        expected: "a publishable key; a secret key in a NEXT_PUBLIC_ variable is exposed to every browser and must be rotated",
        severity: "SECURITY",
      });
    } else if (shape === "SUPABASE_PROJECT_URL" || shape === "OTHER_URL") {
      defects.push({
        variable: name,
        holds: shape,
        expected: "a key, not a URL — this variable and " + URL_VAR + " appear to be swapped",
        severity: "BLOCKING",
      });
    }
  }

  return defects;
}

export interface SupabaseCapabilityGap {
  readonly capability: string;
  readonly variable: string;
  readonly consequence: string;
}

/**
 * Defects above are variables holding the WRONG KIND of value. This is the other
 * half of the operator's question: which variables are simply ABSENT, and what
 * stops working because of it.
 *
 * The gap that forced this to exist is invisible by construction. On 2026-09-05
 * the production host had no SUPABASE_SERVICE_ROLE_KEY. Session revocation runs
 * on every guarded request and reads the user through the admin API, so without
 * that key `supabaseGetSessionEpoch` returns null and `requireAuth` fails CLOSED
 * with 503 — correctly, and for every authenticated route at once.
 *
 * Nobody could observe it, because sign-in was also broken and a session is
 * required to trip it. Repairing NEXT_PUBLIC_SUPABASE_URL on its own would have
 * traded one outage for another: sign-in succeeds, then the whole app answers
 * 503. Reporting both in one place is what makes that a single visit to the
 * secrets box instead of two.
 *
 * Only reported when auth is actually configured — a local host with no Supabase
 * at all skips the revocation check entirely, so nothing is degraded there.
 */
/**
 * The NAMES this codebase accepts for the privileged server-side key, in
 * precedence order.
 *
 * Supabase replaced the `anon` / `service_role` JWT pair with the
 * `sb_publishable_` / `sb_secret_` API-key system, and RENAMED the variables
 * its own onboarding panel hands out: `SUPABASE_PUBLISHABLE_KEY` and
 * `SUPABASE_SECRET_KEY`. The publishable half was adopted long ago — see
 * `KEY_VARS` above and `lib/supabase.ts` — but the secret half was not, so an
 * operator who followed Supabase's current instructions installed
 * `SUPABASE_SECRET_KEY` while every reader here looked for
 * `SUPABASE_SERVICE_ROLE_KEY` and found nothing.
 *
 * That is the 2026-09-05 `FINNHUB_KEY_` failure with a different name: a
 * correctly-installed secret, invisible because the code reads a name nobody
 * issues any more. Following the vendor's own documentation should not break
 * the app.
 *
 * LEGACY FIRST, deliberately. This is additive: a host that works today has
 * SUPABASE_SERVICE_ROLE_KEY set and keeps resolving to exactly the value it
 * resolves to now. The new name is a pure fallback that can only change
 * behaviour on a host where the old name is absent — i.e. where the current
 * behaviour is already "broken".
 */
export const SERVICE_KEY_VARS = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"] as const;

/**
 * The privileged key value, or "" when no accepted name carries one.
 *
 * Returns the trimmed value for the same reason `normalizeSupabaseKey` exists:
 * a whitespace-only secret is a truthy string that passes a bare presence check
 * and then authenticates as nothing.
 */
export function resolveSupabaseServiceKey(env: EnvPresence = process.env): string {
  for (const name of SERVICE_KEY_VARS) {
    const v = normalizeSupabaseKey(env[name]);
    if (v) return v;
  }
  return "";
}

/** Which accepted NAME supplied the key, or null when none did. NAME only. */
export function supabaseServiceKeySource(env: EnvPresence = process.env): string | null {
  for (const name of SERVICE_KEY_VARS) {
    if (normalizeSupabaseKey(env[name])) return name;
  }
  return null;
}

export function supabaseCapabilityGaps(env: EnvPresence = process.env): readonly SupabaseCapabilityGap[] {
  if (!supabaseConfigStatus(env).configured) return [];
  if (resolveSupabaseServiceKey(env)) return [];
  return [{
    capability: "Session verification (and 'log out all devices')",
    variable: SERVICE_KEY_VARS.join(" (or ") + ")",
    consequence:
      "Supabase auth is configured, so every guarded route checks session revocation through the admin API. Without this key that check cannot be performed and fails closed, so all authenticated routes answer 503 'Session verification is temporarily unavailable' — even once sign-in works.",
  }];
}

/**
 * Build the standard honest 503 body for a WM auth route when Supabase is
 * NOT CONFIGURED on this runtime. `verb` is a short human phrase describing
 * what the caller was trying to do (e.g. "Sign-in", "Password recovery",
 * "Email confirmation").
 */
export function notConfiguredBody(verb: string, status: SupabaseConfigStatus): {
  readonly error: string;
  readonly edge: "NOT CONFIGURED";
  readonly missing: readonly string[];
} {
  const list = status.missing.join(", ");
  const noun = status.missing.length === 1 ? "variable" : "variables";
  return {
    error: `${verb} is NOT CONFIGURED on this host runtime — missing required Supabase auth ${noun}: ${list}. Set them in the host runtime secrets (e.g. Cloudflare) and redeploy.`,
    edge: "NOT CONFIGURED",
    missing: status.missing,
  };
}
