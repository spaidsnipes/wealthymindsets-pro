/**
 * A REDIRECT THAT SHIPS THE APP IS NOT A REDIRECT. IT IS A PAGE THAT LEAVES.
 *
 * MEASURED 2026-09-15 against https://wealthymindsetspro.com, after `dcdb403`
 * had converted `/vailbuild` from a client `useEffect` hop into a server
 * `redirect("/partnerships")`:
 *
 *   /vailbuild  -> HTTP 200, no Location header, 18,275 bytes, 17 <script> tags
 *   /veddbuild  -> HTTP 200, no Location header   (never a client hop; always
 *                  a bare server `redirect()` — so this is not a regression
 *                  introduced by that commit, it is how the host behaves)
 *   /partnerships (the real destination) -> 19,346 bytes, 18 <script> tags
 *
 * The alias document is 94% the weight of the page it exists to avoid. On this
 * deployment — OpenNext on Cloudflare Workers — an App Router `redirect()` is
 * not answered as a 307 at the edge. It is answered as a 200 HTML document
 * carrying the destination in its payload, so the browser downloads the app
 * shell, executes it, and only then navigates.
 *
 * THIS CORRECTS `dcdb403`. That commit message claimed the alias now resolves
 * in "one server-side hop straight to the destination — no bundle, no
 * hydration, no paint, no chain." Only the last of those four was true. The
 * CHAIN was genuinely removed and stays removed. The BUNDLE, the HYDRATION and
 * the PAINT were asserted from reading the source, never measured, and the
 * measurement above says they were still being paid. The claim was written
 * with confidence and no receipt, which is the exact failure mode the guards
 * in this repo exist to catch — it simply happened in a commit message, where
 * no guard was looking.
 *
 * WHY MIDDLEWARE AND NOT `next.config.redirects()`. Both are plausible. Only
 * one has evidence on this host: `src/middleware.ts` already issues
 * `NextResponse.redirect(url, 308)` for the canonical-host guard, and that
 * guard is deployed and relied upon in production today. `redirects()` under
 * OpenNext has no receipt in this repo, and choosing the unmeasured mechanism
 * to fix an unmeasured claim would repeat the mistake being corrected here.
 *
 * THE PAGE STUBS STAY. `src/app/vailbuild/page.tsx` and `.../veddbuild` remain
 * as a fallback. Middleware short-circuits before they ever render, so they
 * cost nothing; but if the matcher is ever narrowed, the aliases degrade to a
 * working slow redirect instead of a 404. Deleting them would trade a fast
 * promise for a broken one under exactly the conditions nobody tests.
 */

/** Legacy alias path → the live route that should answer for it. */
export const LEGACY_ROUTE_ALIASES: Readonly<Record<string, string>> = {
  "/vailbuild": "/partnerships",
  "/veddbuild": "/partnerships",
};

/**
 * The destination for a legacy alias, or `null` if the path is not an alias.
 *
 * Matching is exact on the pathname and tolerant of one trailing slash. It is
 * deliberately NOT a prefix match: `/vailbuild-notes` is a different route and
 * must not be swallowed by the alias for `/vailbuild`.
 */
export function legacyAliasTarget(pathname: string): string | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return LEGACY_ROUTE_ALIASES[normalized] ?? null;
}
