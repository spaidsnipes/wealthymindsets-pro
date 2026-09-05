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
 * Only the ORIGIN is named. The path is omitted because some auth paths carry
 * a token, and the body is never included because it is attacker-influenced.
 */
export function nonJsonAuthResponseMessage(input: {
  readonly url: string;
  readonly status: number;
  readonly contentType?: string | null;
}): string {
  let origin: string;
  try {
    origin = new URL(input.url).origin;
  } catch {
    origin = "an unparseable URL";
  }
  const ct = input.contentType?.trim() ? `"${input.contentType.trim()}"` : "no content-type";
  return `The auth backend at ${origin} answered HTTP ${input.status} with ${ct}, which is not JSON. Every Supabase auth endpoint answers JSON even when it rejects a request, so this host's NEXT_PUBLIC_SUPABASE_URL does not point at the Supabase project. Correct that value in the host runtime secrets (e.g. Cloudflare) and redeploy.`;
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
