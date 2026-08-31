import { NextResponse } from "next/server";
import {
  computeAllProviderReadiness,
  allProviderEnvNames,
  readinessSummary,
  isEnvPresent,
  type EnvPresence,
} from "../../../../lib/broker/providerReadiness";

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
 * `runtime` marks which lane this receipt describes ("local" via `next dev`
 * or the deployed host), so the same route surfaces the truth on both sides
 * and drift becomes visible by comparing the two receipts.
 *
 * Presence of a key here means "credentials to attempt a connection are
 * present" — strictly weaker than a live health check or the broker
 * Certification Harness. Never render READY as "connected" or "certified."
 */
export async function GET() {
  const env = process.env as unknown as EnvPresence;
  const providers = computeAllProviderReadiness(env);

  // Presence-only env inventory across every var any provider references.
  const names = allProviderEnvNames();
  const envPresence = names.map((name) => ({ name, present: isEnvPresent(env, name) }));

  return NextResponse.json(
    {
      surface: "broker-readiness",
      runtime: process.env.VERCEL || process.env.CF_PAGES ? "host" : "local",
      summary: readinessSummary(providers),
      providers,
      envPresence,
      note: "Presence-only. READY means credentials are present, not that the provider is connected or certified. No secret value is ever returned.",
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
