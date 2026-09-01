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
