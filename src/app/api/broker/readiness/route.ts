import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import {
  computeAllProviderReadiness,
  allProviderEnvNames,
  readinessSummary,
  isEnvPresent,
  type EnvPresence,
} from "../../../../lib/broker/providerReadiness";
import { supabaseConfigStatus } from "@/lib/supabaseConfigStatus";

export const dynamic = "force-dynamic";

/**
 * /api/broker/readiness
 *
 * The inspectable, read-only receipt behind the portability directive
 * (2026-08-31): "make sure my app is connected locally also ... connected
 * through the host at all times." It answers, per provider, READY vs
 * BLOCKED(missing VAR) using PRESENCE-ONLY checks against this process's
 * env. It NEVER reads, returns, or logs a secret value — only whether each
 * required NAME is present & non-empty.
 *
 * The same route runs on BOTH lanes (local `next dev` and the deployed host);
 * the caller's URL identifies which lane, and drift becomes visible by diffing
 * the two receipts. The route stays host-neutral — it never reads a
 * host-specific runtime signal (a Vercel/Cloudflare-only env flag) to guess
 * where it is running.
 *
 * Presence of a key here means "credentials to attempt a connection are
 * present" — strictly weaker than a live health check or the broker
 * Certification Harness. Never render READY as "connected" or "certified."
 */
export async function GET(request: Request) {
  // The receipt reveals which provider env NAMES are configured on this
  // runtime — infra reconnaissance, even though no secret VALUE is exposed.
  // The plan's intent is an AUTHORIZED developer inspecting; gate it behind a
  // WM session like every sibling market-data route, rather than serving the
  // config surface publicly. A logged-in local session still sees it.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const env = process.env as unknown as EnvPresence;
  const providers = computeAllProviderReadiness(env);
  const accountService = supabaseConfigStatus(env);

  // Presence-only env inventory across every var any provider references.
  const names = allProviderEnvNames();
  const envPresence = names.map((name) => ({ name, present: isEnvPresent(env, name) }));

  return NextResponse.json(
    {
      surface: "broker-readiness",
      summary: readinessSummary(providers),
      providers,
      envPresence,
      accountService,
      note: "Presence-only. READY means credentials are present, not that the provider is connected or certified. No secret value is ever returned.",
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
