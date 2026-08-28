# Mobile Mode-Band Wrap Fix + Local Gate-4 Verification

- **Date / time:** 2026-08-27 (~22:12 local)
- **Branch / worktree:** `shift/deck-emphasis-explain` @ `/Users/dspaidnoosleep/wm-shift-emphasis`
- **Starting SHA (local, pre-work):** `cbd7d1a` (Vitest alias ledger); `origin/main` had since advanced to `b0f7ea0` (parallel builder's SHIFT-O atoms).
- **Ending SHA:** `5022a46` on `origin/main` (my commit `66524a9` rebased onto `b0f7ea0`).
- **Commit created:**
  - `66524a9` → rebased to `5022a46` — `fix(experience): mode band wraps on mobile instead of overflowing into the job descriptor`

## Subsystem(s) touched
- `src/components/experience/ExperienceModeBar.tsx` — the seven-mode `<nav>` (PREP·OBSERVE·WAIT·EXECUTE·MANAGE·REVIEW·LEARN).
- `src/app/command-deck/page.tsx` — the mode-band row that pairs the bar with the current-job descriptor (only consumer of ExperienceModeBar; grep-confirmed).

## Observed failure (before)
On `/command-deck` at **390px** the bar's seven tabs overflowed their container.
The bar wrapper was `flex:1 / minWidth:0` sharing a **non-wrapping** flex row with
the current-job descriptor, so the `<nav>` was crushed to **~106px** and the tabs
spilled past it (measured right-edge x≈458) and collided with the
"WATCH THE MARKET WITH NO POSITION" subtitle. A mode you can't read is a job you
can't pick — this violated "the seven states must stay fully visible."

## Root cause
Two coupled single-row assumptions:
1. `ExperienceModeBar`'s `<nav>` had **no `flexWrap`** and its buttons used `flex:1`
   with no `minWidth`, so on a narrow parent they compressed below a legible width
   instead of wrapping to a new row.
2. The command-deck mode-band row was a **non-wrapping** flex row with the bar at
   `flex:1 / minWidth:0`, guaranteeing the bar received only whatever sliver the
   descriptor left.

## Exact change made (pure CSS; no state / data / behavior change)
1. `ExperienceModeBar` `<nav>`: added `flexWrap:"wrap"`; buttons `flex:1` →
   `flex:"1 1 auto"` + `minWidth:52`. On desktop flex-grow still spreads all seven
   across one row (layout unchanged); on mobile they wrap, each keeping a readable
   tap target.
2. command-deck row: added `flexWrap:"wrap"`; bar wrapper `flex:1 / minWidth:0` →
   `flex:"1 1 260px" / minWidth:240`, so on mobile the descriptor drops below and
   the bar keeps its full width.
- Gold-as-identity active-mode styling untouched.

## Tests / build proof
- `tsc --noEmit --skipLibCheck`: **0 errors** (pre-rebase and post-rebase).
- `vitest run` pre-rebase: **162/162 files, 1350/1350 green**.
- `vitest run` post-rebase (my fix + parallel SHIFT-O atoms combined):
  **174/174 files, 1475/1475 green** — zero regressions in the merged tree.
- Desktop single-row layout preserved by flex-grow (`flex:1 1 auto` == `flex:1`
  when space is ample).

## Deployment state
- **PUSHED** to `origin/main` @ `5022a46`. **NOT DEPLOYED** — Cloudflare prod is
  still under **Error 1027** (Workers free-plan daily quota; Founder-only fix).
  This IS a runtime/bundle change, so it must be redeployed once prod recovers
  (unlike the test-infra-only vitest fix).

## Supabase / DB state
- Untouched. No migrations authored or applied this atom.

## Founder-visible result
- On a phone-width viewport the seven operating-state tabs now wrap into rows and
  stay fully legible; the current-job descriptor drops beneath them instead of
  being collided into. Desktop is pixel-unchanged.

## Live verification (Gate 4) — honest state
- **VERIFIED LIVE (prior session)** via the local preview panel (port 3020;
  Cloudflare prod unreachable under 1027) at viewport **390**:
  nav width **106 → 354px**, `overflow` **true → false**, seven tabs wrap into
  **2 rows** (y=210, y=239) — no collision with the descriptor. That DOM-metric
  observation is the mobile Gate-4 evidence.
- **Re-capture this restart: BLOCKED.** A fresh preview browser context has no
  session cookie, so `AuthContext`'s client route-guard redirects
  `/command-deck` → `/login` (`/api/auth/me` returns 401 offline; `refreshUser`
  then clears any seeded cache). Obtaining a session would require entering
  credentials or forging a JWT — both prohibited. Recorded as an honest
  limitation, NOT converted into a claimed screenshot.

## Remaining limitations
- No fresh 390px screenshot captured this restart (auth-gated as above); the
  prior-session live DOM metrics stand as evidence.
- Redeploy pending on Founder resolving Error 1027 (task #15).

## Anything now duplicate or unnecessary
- None. Reused existing WM tokens and the single ExperienceModeBar; no parallel
  component or copied layout introduced.

## Next real dependency
- Founder: resolve Cloudflare Error 1027 (upgrade Workers plan or 00:00 UTC reset)
  so `5022a46` — and the four prior experience atoms already at Worker
  `1a17536d` — can be OBSERVED/VERIFIED on real prod at desktop + mobile widths.
