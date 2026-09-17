/**
 * founderLanding — the ONE owner of "where does a Founder land".
 *
 * ── The measured failure this answers ────────────────────────────────────────
 *
 * Three separate files each decided, independently and by retyping a string
 * literal, where a human ends up when they arrive with no route of their own:
 *
 *   src/app/page.tsx:5            redirect("/charts")
 *   src/contexts/AuthContext.tsx  router.replace("/charts")   // signed in on a public route
 *   src/app/auth/confirm/route.ts NextResponse.redirect(new URL("/charts", …))
 *
 * They agreed, which is exactly what made it invisible. Nothing pointed at the
 * fact that the landing decision had three owners, so "change where the Founder
 * lands" was silently a three-file change that LOOKED like a one-file change.
 * Ticket T is precisely that change. A cutover attempted at any one of those
 * three sites would have left two doors still opening onto the old room, and
 * the difference would only have shown up on whichever path a human happened to
 * walk that day — root visit vs. sign-in vs. email confirmation.
 *
 * That is a G2 defect (exactly one owner per truth; consumers derive, never
 * retype) presenting as a routing constant.
 *
 * ── What this module is NOT ──────────────────────────────────────────────────
 *
 * It is not a router, a navigation layer, or a new front door. It exports two
 * strings and the reason they exist. Nothing is registered, nothing dispatches.
 *
 * It also deliberately does NOT own every `"/charts"` in the codebase. Picking a
 * symbol out of the search palette and going to its chart is not a LANDING — the
 * human named a destination. Only the no-destination case belongs here.
 */

/**
 * The route a human reaches when they arrive without having named a
 * destination: bare domain, sign-in completion, email confirmation.
 *
 * This is the surface that has to answer "what is true right now, and what is
 * the next thing anyone can DO?" before the Founder has asked anything.
 *
 * ── WHY THIS IS THE CHART (2026-09-17 Founder cut) ───────────────────────────
 *
 * It was "/command-deck", and the production recording is the receipt for why
 * that was wrong. Measured on the live build at 1920x840, the deck's first
 * viewport was: an ACTIVE QUESTION headline, a MARKET OBJECT PASSPORT strip, a
 * price block, and four columns of prose — and the candles were a 112-bar
 * sliver starting at y=520, half of it below the fold. A human arriving with no
 * destination was handed a page ABOUT the market instead of the market.
 *
 * WM Pro is the advanced chart. The no-destination arrival is therefore the
 * chart, and every reading the deck compiled — right of way, evidence debt,
 * available R, WHY — belongs WITH price rather than instead of it.
 *
 * The deck is not deleted and is not demoted to a dead room: it is one door in
 * the rail like any other, and the reading it compiles is the SAME canonical
 * decision the chart now shows. Nothing was rebuilt to make this true.
 */
export const FOUNDER_LANDING_ROUTE = "/charts";

/**
 * Where a human goes when they HAVE named an instrument and want to see it.
 *
 * Kept here beside the landing route on purpose. The two were the same string
 * for months, which is how the landing decision hid: every consumer could claim
 * it was "just going to charts". Naming them separately means a future change to
 * one can no longer silently drag the other along.
 *
 * As of the 2026-09-17 cut they hold the same VALUE again — and that is not a
 * relapse, because the defect was never the value. The defect was that the
 * decision had no name of its own, so nothing could tell "the Founder lands on
 * the chart" apart from "this link goes to a chart". Both are declared here,
 * independently, neither defined in terms of the other: re-pointing the landing
 * at a future room is still a one-line change to ONE constant, and it cannot
 * drag named instrument links with it. The guard in founderLanding.test.ts is
 * pinned to that independence rather than to inequality.
 */
export const INSTRUMENT_VIEW_ROUTE = "/charts";
