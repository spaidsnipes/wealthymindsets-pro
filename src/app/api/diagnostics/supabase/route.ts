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
import {
  resolveSupabaseServiceKey,
  supabaseServiceKeySource,
  SERVICE_KEY_VARS,
  supabaseCapabilityGaps,
  supabaseConfigStatus,
  supabaseEnvDefects,
  supabaseEnvShape,
} from "@/lib/supabaseConfigStatus";

export async function GET() {
  const status = supabaseConfigStatus();
  const defects = supabaseEnvDefects();
  const capabilityGaps = supabaseCapabilityGaps();

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
      // Absent variables whose absence silently disables something. Distinct from
      // `defects` (a variable holding the wrong KIND of value) and reported here
      // so one reading of this endpoint yields the whole fix list — see
      // supabaseCapabilityGaps for why splitting it costs a second outage.
      capabilityGaps,
      // Presence-only, and deliberately never shape-checked: a service role key
      // is read server-side only, so reporting anything about its contents would
      // add disclosure without adding a fix an operator could act on here.
      serviceRoleKeyPresent: Boolean(resolveSupabaseServiceKey(process.env)),
      // WHICH accepted name carried it. Presence alone sent an operator to the
      // wrong box on 2026-09-05: Supabase's own panel issues SUPABASE_SECRET_KEY,
      // this codebase historically read SUPABASE_SERVICE_ROLE_KEY, and "absent"
      // does not say which of the two to go and set. A NAME, never a value.
      serviceRoleKeySource: supabaseServiceKeySource(process.env),
      serviceRoleKeyAcceptedNames: SERVICE_KEY_VARS,
      healthy: status.configured && defects.length === 0 && capabilityGaps.length === 0,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
