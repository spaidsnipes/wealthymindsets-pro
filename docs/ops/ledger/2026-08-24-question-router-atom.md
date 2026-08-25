# WM Pro — Ledger Entry: WM Question Router atom (2026-08-24 PM/late)

## Date / time
2026-08-24, ~22:55–23:10 UTC.

## Starting SHA
`1e37900` (docs(ledger): record Experience Shell cutover atom + P0 Cloudflare 1027 prod outage).

## Ending SHA
`77ec3b7` — pushed to `origin/main`.

## Commits created
- `77ec3b7` — feat(experience): WM Question Router — compile the one dominant question on /command-deck.

## Subsystems touched
- `src/lib/experience/questionRouter.ts` (NEW) — pure Question Router.
- `src/lib/experience/questionRouter.test.ts` (NEW) — 16 deterministic cases.
- `src/app/command-deck/page.tsx` — computes One Story once at component level; mode band now shows the routed dominant question.

## Observed failure (before)
Founder canon P26/P6: "The default interface answers one dominant question at
a time," reorganised around the human's current job. The `/command-deck` mode
band showed only a static emphasis caption (`shellEmphasis.job`) — it never
told the trader the ONE question the surface was actually answering, and
nothing tied that question to what the market engine had actually resolved.

## Root cause
No Question Router existed. The `DecisionContextBus` carried a `question` seed
field but nothing compiled it from (job mode) × (canonical One Story signals).
The band caption was mode-only and engine-blind. Separately, the One Story was
recomputed inline in an IIFE inside the render tree, so any second consumer
would risk a divergent read.

## Exact change made
- New pure `routeQuestion(mode, oneStory)`: compiles the single dominant
  question from the `ExperienceMode` and the canonical One Story signals
  (contradiction / missing / right-of-way `decision.value`). It asserts NO
  market fact of its own — it only reacts to what `selectOneStory` reported and
  honestly reflects UNKNOWN when the engine is silent (null story). Branch map:
  PREP/REVIEW engine-invariant; OBSERVE branches on hasStory; WAIT prioritises
  contradiction > missing > open right-of-way (ACTION) > earned-entry; EXECUTE
  branches on NO TRADE (stand-down) else re-checks right-of-way at exact price;
  MANAGE branches on contradiction; LEARN branches on missing evidence debt.
- `/command-deck`: lifted the One Story compile to a component-level `useMemo`
  (over `state`/`history`/`chainVm`/`permission`) so the routed question AND
  the existing `OneStoryStrip` consume the SAME canonical read — removed the
  inline IIFE. The mode band now renders the live routed question beneath the
  mode bar; the emphasis job is demoted to a small uppercase label.

## Tests / build proof
- `tsc --noEmit --skipLibCheck` — clean.
- `vitest run src/lib/experience/` — 40/40 pass (16 new in questionRouter.test.ts).
- `next build` — clean; `/command-deck` compiles.

## Deployment state
- Code pushed to `origin/main` @ `77ec3b7`.
- `npm run deploy:cf` ran to exit 0; a fresh Cloudflare Worker version
  (`ab64ff85-e190-4de5-a1e5-1095ee9572ac`) is live at 100% — confirmed via
  `wrangler deployments list` (newest deployment, later than the prior
  session's 17:30Z version).
- **END-TO-END VISUAL VERIFICATION: NOT VERIFIED THIS SESSION.** Production
  still serves **Cloudflare Error 1027** (HTTP 429, "temporarily rate
  limited … reached their plan limits") on `/login` at 23:07 UTC — the same
  account-level Workers plan-limit outage recorded in the 2026-08-24 cutover
  entry. This is a billing/account action reserved to the Founder; per Founder
  directive this session, NO billing action was taken — waiting for the 00:00
  UTC daily reset (~53 min from the 23:07 UTC check).

## Supabase / DB state
No DB changes this atom. (Standing: task #2 — Supabase Site URL + redirect
allowlist to wealthymindsetspro.com — remains Founder-only, unchanged.)

## Founder-visible result
Once the Error 1027 outage clears, `/command-deck` shows — beneath the
seven-mode band — the ONE dominant question the surface is currently answering,
and that question tracks the live engine read (e.g. it flips to "Is this
contradiction fatal to the thesis, or noise?" when the One Story reports a
contradiction in WAIT). No market truth was altered.

## Remaining limitations
- Visual acceptance gate unmet due to the Error 1027 outage (above).
- The routed question is mounted only on `/command-deck`; the persistent
  `WMExperienceShell` frame (Phase 3-4 body migration; Phase 6 mobile) is not
  yet the question's host on other surfaces.

## Anything now duplicate or unnecessary
- Removed the inline IIFE that recomputed the One Story in the render tree; the
  single component-level memo is now the sole deck read. No new duplication.

## Next real dependency
1. **P0 / FOUNDER ACTION (unchanged):** resolve the Cloudflare Workers Error
   1027 plan-limit outage — wait for the 00:00 UTC reset or upgrade the plan.
2. After prod is reachable: visual-verify the `/command-deck` mode band +
   routed question (desktop + 390px), capture the mandatory screenshot.
3. Continue P6: WHY / WHY NOT surface + Market Object Passport, built AROUND
   the existing engine.
