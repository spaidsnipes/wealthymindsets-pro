# WM Pro — Ledger Entry: First WM Experience Shell Cutover (2026-08-24 PM)

## Date / time
2026-08-24, ~16:45–22:10 UTC.

## Starting SHA
`f43f78e` (feat(experience): WM Experience Shell spine — SurfaceLink packet + DecisionContextBus) — was unpushed at session start.

## Ending SHA
`efe2a4d` — pushed to `origin/main`.

## Commits created
- `d91db9e` — feat(experience): first WM Experience Shell cutover — live seven-mode operating states on /command-deck.
- `efe2a4d` — fix(env): declare moomoo/webull data-adapter vars in .env.example — close drift-lock gap.

(`f43f78e`, the prior spine commit, was also pushed in this session's push — it was committed but unpushed before.)

## Subsystems touched
- `src/lib/experience/*` — experience shell spine (DecisionContextBus already present; added shellLayout; reworked surfaceLink).
- `src/components/experience/*` — ExperienceModeBar (already present, now mounted), WMExperienceShell (new, staged).
- `src/app/command-deck/page.tsx` — mounted the live seven-mode operating-state band + job caption.
- `.env.example` — declared 4 moomoo/webull adapter env-var names.

## Observed failure (before)
1. WM Pro had no representation of the human's current job; the Founder transformation requires the interface to reorganise EMPHASIS around seven operating states (PREP · OBSERVE · WAIT · EXECUTE · MANAGE · REVIEW · LEARN) while market truth stays identical.
2. A newly-added `surfaceLink.buildExperiencePacket` RE-DERIVED the One Story from raw canonical dimensions — a second, potentially-disagreeing truth producer duplicating the canon §7 `selectOneStory` compiler.
3. A parallel one-story view layer (`oneStoryView` + `components/experience/OneStoryStrip`) duplicated the mature `command/OneStoryStrip`.
4. Environment Truth DRIFT-LOCK gate red: shipping moomoo/webull adapter code read `WEBULL_DATA_URL`, `MOOMOO_BRIDGE_URL`, `MOOMOO_BRIDGE_TOKEN`, `MOOMOO_CANARY_SYMBOL` but none were declared in `.env.example`.

## Root cause
The experience spine was being invented ALONGSIDE rather than AROUND the existing market engine — violating "engine owns truth, SurfaceLink owns presentation" and "never duplicate existing infrastructure." The moomoo/webull atom landed code references without declaring the variable names in the manifest source of truth.

## Exact change made
- Removed the duplicative `oneStoryView.ts`/`.test.ts` and `components/experience/OneStoryStrip.tsx` (were untracked — never committed).
- Reworked `surfaceLink.buildExperiencePacket(oneStory: OneStoryVM | null, state: CanonicalMarketState | null, opts)`: truth (primary/contradiction/missing/right-of-way) is now FORWARDED verbatim from the canonical `selectOneStory` output; the sealed state is read ONLY for provenance (quality, snapshot id, resolved-dimension inspection hints). It can no longer disagree with the engine. RightOfWay normalised faithfully (`NO TRADE`→`NO_TRADE`, CAUTION preserved).
- Added `shellLayout.shellEmphasis(mode)` — pure, tested mapping job→emphasis; guarantees the chart canvas stays sacred (>= `MIN_CANVAS_WEIGHT` = 0.7) in every mode.
- Added `WMExperienceShell` — the persistent frame (quiet brand + mode bar + job caption + sacred canvas + collapsible guest rail), staged for the deliberate body migration (Phase 3-4) and mobile (Phase 6).
- Mounted `ExperienceModeBar` + live `shellEmphasis` job caption as a persistent band on `/command-deck`, directly below the existing header. Market logic below the band is UNTOUCHED.
- Declared the 4 moomoo/webull var NAMES (no values) in `.env.example`.

## Tests / build proof
- `tsc --noEmit --skipLibCheck` — clean.
- `vitest run` — 1090/1091 pass. The single red (`scripts/env-manifest.test.ts`) is an UNRELATED untracked env-scanner in another session's WIP; its `.mjs` scanner has false positives on `NAME`, `NEXT_PUBLIC_`, `VERCEL` (dynamic/prefix `process.env` access). The tracked gate `src/lib/envManifest.test.ts` PASSES after the `.env.example` fix.
- New tests: `shellLayout.test.ts` (chart-sacred invariant across all 7 modes; live-vs-reflection rail defaults; EXECUTE most chart-dominant). `surfaceLink.test.ts` rewritten to the new contract (truth forwarded from OneStoryVM; provenance-only reads; faithful right-of-way; honest UNKNOWN on null).
- `next build` — clean; `/command-deck` compiles.

## Deployment state
- Code pushed to `origin/main` @ `efe2a4d`.
- `npm run deploy:cf` ran to exit 0; a fresh Cloudflare Worker version was uploaded and is at 100% — confirmed via `wrangler deployments list` (newest version created 2026-08-24T17:30:01Z).
- **END-TO-END VISUAL VERIFICATION: NOT VERIFIED THIS SESSION.** Production is serving **Cloudflare Error 1027 — "This website has been temporarily rate limited … the owner has reached their plan limits"** on ALL routes (apex, /login, /command-deck), to curl AND to the founder's authenticated browser. This is an ACCOUNT-LEVEL Cloudflare Workers plan-limit outage, NOT caused by this atom's code and NOT resolvable by me (upgrading the Workers plan is a billing/account action reserved to the Founder). The Free-tier Workers daily request limit resets at 00:00 UTC; observed at 22:08 UTC, so auto-recovery ~00:00 UTC is possible if this is the daily cap, otherwise a paid Workers plan is required.

## Supabase / DB state
No DB changes this atom. (Standing: task #2 — set Supabase Site URL + redirect allowlist to wealthymindsetspro.com — remains Founder-only, unchanged.)

## Founder-visible result
Once the Cloudflare plan-limit outage clears, `/command-deck` shows a persistent seven-mode operating-state band (PREP…LEARN) with a live italic job caption that changes as the mode changes — the first visible piece of the Wealth Command Environment. All existing market truth on the deck is unchanged.

## Remaining limitations
- Visual acceptance gate unmet due to the Error 1027 outage (above).
- `WMExperienceShell` and `surfaceLink` are Founder-named spine artifacts staged ahead of their full consumers (Phase 3-4 body migration; Phase 6 mobile). Their core logic (`shellLayout`, OneStoryVM forwarding) is live/tested, but the full frame + cross-device packet are not yet mounted.

## Anything now duplicate or unnecessary
- Removed the duplicative one-story layer. `surfaceLink` is now non-duplicative (consumes the canonical compiler). No known remaining duplication introduced by this atom.

## Next real dependency
1. **P0 / FOUNDER ACTION:** resolve the Cloudflare Workers Error 1027 plan-limit outage — either wait for the 00:00 UTC daily reset or upgrade the Workers plan. Until then the entire prod site is down for all users.
2. After prod is reachable: visual-verify the `/command-deck` mode band (desktop + 390px mobile) and capture the mandatory screenshot to close the visual gate.
3. Phase 3-4: migrate the command-deck body into `WMExperienceShell` deliberately; give `surfaceLink` its first mobile consumer (Phase 6).
