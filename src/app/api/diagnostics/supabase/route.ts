/**
 * A value-free report of what the Supabase auth variables on this runtime are
 * HOLDING, so an operator can fix the right box without guessing.
 *
 * WHY THIS IS PUBLIC. It is the diagnostic for being locked out, so requiring a
 * session would make it useless in the only situation it exists for — on
 * 2026-09-05 nobody could sign in at all. That constraint is what dictates the
 * contents: shapes and variable names only, never a configured value, so there
 * is nothing here worth authenticating. The auth routes already disclose that
 * the host is misconfigured; this only says which variable to open.
 */

import { NextResponse } from "next/server";
import { supabaseConfigStatus, supabaseEnvDefects, supabaseEnvShape } from "@/lib/supabaseConfigStatus";

export async function GET() {
  const status = supabaseConfigStatus();
  const defects = supabaseEnvDefects();

  return NextResponse.json(
    {
      present: status.configured,
      missing: status.missing,
      shapes: {
        NEXT_PUBLIC_SUPABASE_URL: supabaseEnvShape(process.env.NEXT_PUBLIC_SUPABASE_URL),
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabaseEnvShape(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
        NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseEnvShape(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      },
      defects,
      // Presence-only, and deliberately never shape-checked: a service role key
      // is read server-side only, so reporting anything about its contents would
      // add disclosure without adding a fix an operator could act on here.
      serviceRoleKeyPresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
      healthy: status.configured && defects.length === 0,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
