/**
 * supabase — browser/anon Supabase client, LAZY init.
 *
 * SHIFT-K K-Bkt 3 (Noah / Chief Engineering Officer):
 *   The prior module-scope `createClient(url!, key!)` evaluated env vars at
 *   module load. On Cloudflare Workers / OpenNext / Next static analysis,
 *   an empty env at build time made the `!` assertion collapse to
 *   `createClient("", "")` and throw "supabaseUrl is required" — the exact
 *   build-time landmine named in the WM Pro migration contract Phase 2.
 *
 *   Fix: env vars are read only when the client is first *used*, never at
 *   module load. Existing callers using `supabase.from(...)` keep working
 *   via a lazy Proxy that materializes the real client on first property
 *   access. A new `getSupabase()` factory returns `null` when
 *   configuration is missing so server code can degrade honestly instead
 *   of throwing at import time.
 *
 * Rejection guarantees:
 *   - Zero side effects on module load. Safe to import in any runtime.
 *   - `getSupabase()` returns null (never a broken client) when
 *     configuration is absent — canon §Product Truth: prefer honest
 *     unavailability over pretend-working.
 *   - Uses NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (new API keys system)
 *     with legacy NEXT_PUBLIC_SUPABASE_ANON_KEY fallback.
 *   - No SERVICE_ROLE_KEY handled here — this file is public-tier only.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _cached: SupabaseClient | null = null;

/**
 * Return the browser/anon Supabase client, initializing on first use.
 * Returns null when NEXT_PUBLIC_SUPABASE_URL or the anon/publishable key
 * is missing — callers must handle this branch instead of crashing.
 */
export function getSupabase(): SupabaseClient | null {
  if (_cached) return _cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _cached = createClient(url, key);
  return _cached;
}

/**
 * Lazy compat shim — existing callers do `supabase.from(...)`. Proxy
 * defers env read + createClient() until the first property access so
 * `import { supabase } from "@/lib/supabase"` at module top has ZERO
 * side effects. Throws a clear error at CALL time (not import time)
 * if configuration is missing, so a build never crashes on env absence.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabase();
    if (!client) {
      throw new Error(
        "Supabase client not configured — set NEXT_PUBLIC_SUPABASE_URL and " +
          "NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
      );
    }
    return Reflect.get(client, prop, receiver);
  },
});
