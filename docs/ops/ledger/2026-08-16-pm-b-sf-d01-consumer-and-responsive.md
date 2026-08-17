# Ledger — 2026-08-16 PM-B — SF-D01 consumer migration + cross-device responsive

Status: **IMPLEMENTED on branch `sf-d01-yahoo-quote-observation`, pushed to origin, NOT merged to main, NOT deployed.** Founder granted GO to continue building; main fast-forward + deploy still pending (main working tree carries the parallel team's 6 dirty files — do not disturb).

## Date / time
2026-08-16 evening CDT (continuation of PM shift).

## Starting SHA
`3bd5494…` (branch base; main unchanged).

## Ending SHA (branch)
`fac76bf` on `sf-d01-yahoo-quote-observation` (origin has it).

## Commits created (this continuation)
- `aafd88c` feat(sf-d01): useWebSocket honors observation.observedAt — no fake-fresh Sunday quotes.
- `ff6f9a7` fix(responsive): fluid HeroTruth typography across desktop/iPad/phone.
- `fac76bf` fix(responsive): metric grids wrap across device classes (auto-fit).
(Earlier this shift: `6f28ff7` endpoint contract, `74c95cf` ledger entry A.)

## Subsystem(s) touched
`src/hooks/useWebSocket.ts` (RealQuote + mk() + tick stamp); `src/components/command-deck/HeroTruth.tsx` (fluid type); `src/app/command-deck/page.tsx` + `src/app/journal/page.tsx` (grid auto-fit).

## Observed failure (before)
- SF-D01 propagation: `useWebSocket:1043` stamped REST quotes as ticks with `time: Date.now()`, so a stale Sunday/closed futures quote reached canonical `price.eventAt` as ~0ms/LIVE on the Command Deck.
- Cross-device: flagship hero used fixed 44/32/60px type (chapter names like TREND_EXPANSION overflowed a 390px phone); metric grids used fixed `repeat(3|4,1fr)` that crammed to ~90px columns on phone.

## Root cause
- Tape engine had no way to carry a real observation time, so it borrowed server now.
- Hero/grids were authored at desktop sizes with no fluid scaling / wrapping.

## Exact change made
- `RealQuote` gains `observedAt: number|null`; `mk()` reads `/api/yahoo` `observation` (RESOLVED → real `observedAt`; UNKNOWN/legacy → null); tick site stamps `time: q.observedAt ?? Date.now()` (strict improvement, zero regression — UNKNOWN/legacy identical to before).
- HeroTruth: market-state `clamp(26px,7.5vw,44px)` + `overflowWrap:anywhere`; symbol `clamp(24px,6vw,32px)`; price `clamp(40px,12vw,60px)`; `minWidth:0` on hero rows.
- Grids: `repeat(auto-fit, minmax(100–140px, 1fr))` — 2×2 on phone, 3–4 across on tablet/desktop, no media query.

## Tests / build proof
- 0 prod tsc errors.
- Full suite **542/542** (includes the 12 SF-D01 builder tests).
- **Clean production `next build`** in the worktree after replacing the node_modules symlink with an APFS copy-on-write clone and copying the gitignored `.env.local` (Turbopack rejects a symlinked node_modules; `/api/upload-track` needs Supabase env at module load — both environmental, not code).

## Deployment state
Branch on origin (`sf-d01-yahoo-quote-observation`). NOT merged to main. NOT deployed. WM production still on whatever main last shipped. GO granted to build; the merge/deploy step is deferred until the parallel team's 6 dirty files on main are landed (avoids clobbering their uncommitted work).

## Supabase / DB state
No DB writes. `.env.local` copied into the worktree for the local build only (gitignored; not committed; no secret rotated or exposed).

## Founder-visible result
Once merged + deployed: (1) a stale Sunday/closed futures quote no longer reads as fake-fresh on the Command Deck; (2) the flagship hero and metric grids render correctly on phone (390/430), iPad (768/1024), and desktop (1440/1920) instead of overflowing/cramming on the smaller two.

## Remaining limitations
- **Visual acceptance NOT done for auth-gated surfaces** (Command Deck hero/grids, journal Process×Outcome) — no test login available this session. Verified by tsc + full suite + clean build + clamp/auto-fit reasoning + `overflowWrap` backstop. A logged-in desktop/iPad/phone screenshot pass is the outstanding gate.
- **UNKNOWN full suppression** in `useWebSocket` (withhold the synthesized trade tick entirely when `observation.resolution === "UNKNOWN"` so HeroTruth shows UNKNOWN rather than a stale number) is deferred — it changes live tape/chart behavior and needs the visual pass above.
- **Drive spec reconciliation** (vs V1.0.1 SHA `85a2d431…`) still owed — Drive unreachable this session.

## Anything now duplicate or unnecessary
None. `RealQuote.observedAt` is the single carrier of observation time through the tape path; converge future work on it + the SF-D01 module, not a parallel field.

## Next real dependency for the following team
1. Drive-authorized Sentinel: reconcile branch vs V1.0.1 SHA `85a2d431…`.
2. On GO + clean main: fast-forward main to the branch, deploy, then run the logged-in desktop/iPad/phone visual acceptance pass; then land the UNKNOWN full-suppression follow-up.
