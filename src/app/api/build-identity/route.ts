import { NextResponse } from "next/server";
import { BUILD_SHA_ENV, BUILD_TIME_ENV, readBuildIdentity, shortSha } from "@/lib/buildIdentity";

export const dynamic = "force-dynamic";

/**
 * /api/build-identity — the receipt that makes a deploy gap impossible to be
 * silent. See `src/lib/buildIdentity.ts` for the measurement that produced it
 * and for the exact claim scope.
 *
 * PUBLIC on purpose, unlike `/api/broker/readiness` which is session-gated.
 * That route enumerates which provider credential NAMES a host holds — infra
 * reconnaissance even without values. This one carries a commit hash of the
 * Founder's own product and nothing else. Gating it would defeat the point: the
 * parity check has to be runnable from CI, from a shell, and from a laptop that
 * is not signed in, at the exact moment someone is asking "why is prod stale".
 *
 * `dynamic = "force-dynamic"` is load-bearing. Prerendered, this would answer
 * with whatever it knew at build time forever — which is accidentally correct
 * for the SHA and dangerously wrong the first time it is served from a cache
 * that outlives the build it describes.
 */
export async function GET() {
  // LITERAL member expressions, deliberately. `next.config.ts` inlines these two
  // at build time by textual replacement; reading them dynamically out of a
  // `process.env` object would not be replaced and would report UNSTAMPED on
  // every deployed host. Writing them out is the whole mechanism, not a style.
  const identity = readBuildIdentity({
    [BUILD_SHA_ENV]: process.env.WM_BUILD_SHA,
    [BUILD_TIME_ENV]: process.env.WM_BUILD_TIME,
  });

  return NextResponse.json(
    {
      app: "wealthymindsets-pro",
      state: identity.state,
      sha: identity.sha,
      shortSha: shortSha(identity.sha),
      builtAt: identity.builtAt,
      note: identity.note,
    },
    {
      status: 200,
      // A build receipt that can be cached is a build receipt that can describe
      // a build that is no longer running.
      headers: { "cache-control": "no-store" },
    },
  );
}
