import { redirect } from "next/navigation";

/**
 * A REDIRECT THAT LANDS ON A REDIRECT IS A DETOUR THE USER PAYS FOR.
 *
 * This route used to send the reader to `/veddbuild`, which is itself nothing
 * but a redirect to `/partnerships`. Two hops to reach one page.
 *
 * The first hop was also the expensive kind. It was a client component that
 * rendered `null` and moved the browser from inside `useEffect`, so the
 * sequence was: ship a JS bundle, hydrate it, paint an empty screen, THEN
 * navigate — and only then start hop two. A legacy alias is supposed to be
 * invisible. This one was a blank flash followed by another blank flash.
 *
 * Nothing in the app links here. The only reason to keep the path alive is the
 * saved link or printed URL that still points at it.
 *
 * The alias is PRESERVED, not retired. Deleting it would 404 those old links,
 * which trades a slow promise for a broken one.
 *
 * ── CORRECTION, MEASURED 2026-09-15 ──────────────────────────────────────
 *
 * This comment used to end by claiming the rewrite bought "no bundle, no
 * hydration, no paint, no chain." Only the last of those four was true.
 *
 * MEASURED against wealthymindsetspro.com serving that very commit:
 *
 *   /vailbuild -> HTTP 200, NO Location header, 18,275 bytes, 17 <script> tags
 *
 * On OpenNext/Cloudflare an App Router `redirect()` is not answered as a 307
 * at the edge. It is answered as a full HTML document that carries the
 * destination in its payload — so the browser downloads the app shell, runs
 * it, and only then leaves. The bundle, the hydration and the paint were all
 * still being paid. They were asserted from reading the source and never
 * measured, which is precisely the failure this repo's guards exist to catch;
 * it just happened in prose, where no guard was looking.
 *
 * THIS FILE IS NOW A FALLBACK, NOT THE MECHANISM. The alias is answered by
 * `src/middleware.ts` with a real 308 before anything renders. This stub
 * survives so that narrowing the middleware matcher degrades the alias to a
 * working slow redirect instead of a 404.
 *
 * Guarded by `× THE DETOUR` in ./redirectStubChain.test.ts (no stub may target
 * another stub) and by ../../lib/legacyRouteAliases.test.ts (the edge must own
 * the alias, and this comment may not re-make the unmeasured claim).
 */
export default function VailBuildPage() {
  redirect("/partnerships");
}
