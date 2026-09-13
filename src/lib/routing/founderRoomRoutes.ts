/**
 * The Asset-10 family of routes — the ones the sanctuary shell owns.
 *
 * ── Why this file exists ─────────────────────────────────────────────────────
 *
 * The parent-cutover atom (d286650) put a single string literal in
 * MainLayout — `pathname === "/command-deck"` — that decided whether the
 * sanctuary shell wrapped the page or the legacy July shell did. Every
 * other WM Pro route (/journal, /paper, /nectar, /morning-prep, /profile)
 * kept July: `wm-universe`, `wm-shell-header`, full primary rail, ticker
 * tape, workspace tabs. The Founder audit 2026-09-13 called this out:
 *
 *   "Video A 00:08 f240 · 01:04 f1920 · Video B 00:22 f660 — Morning
 *    Prep returns. Parent ownership remains fragmented between routes.
 *    Morning Prep should feed same canonical scene rather than taking
 *    over the experience."
 *
 * A blur-test of any Founder-family route that isn't /command-deck still
 * lands on July, so the family reads as inconsistent — one calm room
 * beside a stack of dashboards. This registry names the family. When the
 * trader is IN the family, MainLayout returns WMExperienceShell — one
 * atmosphere for every room they arrive in.
 *
 * The list is DELIBERATELY narrow. Tools that the audit called out as
 * legitimate advanced-inspect surfaces (/charts, /scanner, /heatmaps,
 * /readiness) stay on the July shell for now — they carry their own
 * primary rails, watchlists, and cockpit controls that are structurally
 * incompatible with the sanctuary's calm hierarchy. Retiring THEM is a
 * later PR ("PR-T3 — Retirement + Receipts"). This PR moves the family.
 *
 * The registry is a single owner. MainLayout imports it, guards import
 * it, and no route decides its own shell. That is the ONLY discipline
 * that prevents "one file gets converted, another silently regresses"
 * — the exact failure mode the Founder brief calls the "loophole."
 */

/**
 * Every route that wears the Asset-10 sanctuary shell today. In order of
 * visibility on the Founder-audited landing paths.
 *
 * `/` is NOT in the list because it 307-redirects to /command-deck — the
 * redirect is the single owner, and putting `/` here would leak an extra
 * paint of the sanctuary before the redirect resolves.
 */
export const FOUNDER_ROOM_ROUTES = [
  "/command-deck",
  "/morning-prep",
  "/journal",
  "/paper",
  "/nectar",
] as const;

export type FounderRoomRoute = typeof FOUNDER_ROOM_ROUTES[number];

/**
 * True when the current route belongs to the Asset-10 family and should
 * wear the sanctuary shell. Prefix-match so nested routes (`/nectar/TSLA`,
 * `/journal/2026-09-13`) inherit the family — the trader who navigated
 * INTO a nested view has not walked out of the room.
 *
 * Never accepts a route by suffix or by partial match; a query-string or
 * fragment on a family route still counts, but a route that merely
 * CONTAINS "/journal" (e.g. "/legal/journalism-policy" if one is ever
 * added) does not.
 */
export function isFounderRoomRoute(pathname: string): boolean {
  for (const route of FOUNDER_ROOM_ROUTES) {
    if (pathname === route) return true;
    if (pathname.startsWith(route + "/")) return true;
  }
  return false;
}
