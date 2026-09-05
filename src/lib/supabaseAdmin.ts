/**
 * supabaseAdmin — server-only privileged Supabase client, LAZY init.
 *
 * SHIFT-K K-Bkt 3 (Noah / Chief Engineering Officer + Sentinel):
 *   Extracted from src/app/api/upload-track/route.ts which held a
 *   module-scope `createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)`
 *   that crashed the Cloudflare / OpenNext build with "supabaseUrl is
 *   required" when the build environment lacked the values.
 *
 *   This module MUST NOT be imported by any client-side / RSC-safe
 *   code path. The SERVICE_ROLE key is server-privileged and must
 *   never enter the browser bundle. Every helper here returns null
 *   when config is missing so a caller sees typed unavailability
 *   instead of a build-time crash.
 *
 * Rejection guarantees (canon §Product Truth + Sentinel):
 *   - Zero side effects on module load.
 *   - SERVICE_ROLE_KEY only read inside `getSupabaseAdmin()` at first
 *     call. Never read at import time.
 *   - Returns null when NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
 *     is missing — callers must handle unavailability, not fabricate.
 *   - No caller may leak the client to a browser bundle. A future lint /
 *     eslint-plugin-nextjs rule should ban import of this module from
 *     any `"use client"` file.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveSupabaseServiceKey } from "./supabaseConfigStatus";

let _cached: SupabaseClient | null = null;

/**
 * Return the privileged (service-role) Supabase client, initializing
 * on first use. SERVER-ONLY.
 *
 * Returns null when configuration is missing — callers must handle
 * this branch and return a typed HTTP 503 / configuration-unavailable
 * response instead of crashing the build or leaking a stack trace.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (_cached) return _cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Accepts SUPABASE_SECRET_KEY as well as SUPABASE_SERVICE_ROLE_KEY, and
  // trims: a whitespace-only value is truthy, so a bare check would build a
  // client that authenticates as nothing. See SERVICE_KEY_VARS.
  const key = resolveSupabaseServiceKey(process.env);
  if (!url || !key) return null;
  _cached = createClient(url, key);
  return _cached;
}
