# WM Pro — Shift Baton — 2026-09-08 05:05Z

## CLAIM CLASS

**PARTIAL_SHIFT — NOT a continuous 3-hour shift.**

- `START_OBSERVED_AT` = `2026-09-08T02:37:50Z`
- `END_OBSERVED_AT`   = `2026-09-08T05:04:54Z`
- `ELAPSED_WALL_CLOCK` = **2h27m**
- `CONTINUOUS` = **NO.** The window contains a usage-limit interruption of
  unmeasured length. Wall-clock elapsed is therefore an UPPER BOUND on
  execution time, not a measurement of it.

Per the ELAPSED-TIME TRUTH lock: SCOPE and DURATION are separate truths.
Scope below is complete and evidenced. Duration is **2h27m wall clock,
discontinuous**, and must not be reported as a 3-hour shift.

## STARTING / ENDING SHA

- Start of this segment: `eeb43a7`
- End: `1d4b29d` (pushed to `origin/main`)

Earlier commits in the same session, before the interruption: `eebed9a`,
`b36218b`, `1d3c9d9`.

## COMMITS THIS SEGMENT

| SHA | What |
|---|---|
| `93b6a0a` | A hidden drawing rail is not a relocated one: give the phone 20 tools |
| `f01f9ac` | Capture & share reaches the phone, and says why when it cannot |
| `1d4b29d` | Lock the relocation subscription a rotating tablet depends on |

## OBSERVED FAILURE → ROOT CAUSE → FIX

**One defect, three instances.** `globals.css` hides six selectors at
`max-width: 1023px`. Hiding a surface is not relocating it: CSS removed the
only door and nothing else offered the capability, so the limitation was
accidental drift rather than an owned decision — the Master Index parity law
names exactly this.

Measured stranded controls at 375px on `/charts` **before** this work:

| Surface | Stranded controls |
|---|---|
| `.wm-draw-rail` | 20 (trend line, ray, fib retracement, magnet, lock, clear all…) |
| `.wm-chart-primary-rail` | 7 (publish idea, screenshot, voice note, video note, screen rec, layout, watchlist toggle) |
| `.wm-chart-watchlist` | (closed earlier this session, `eebed9a`) |

**After: 0 stranded controls.** Verified by a full re-audit under a clean
reload at 375px — `.wm-draw-rail`, `.wm-chart-primary-rail` and
`.wm-chart-watchlist` all report **0 instances** (not mounted at all, not
merely hidden), three 44px doors present, document overflow 0.

`.wm-primary-sidebar` remains hidden with 6 controls, and that is CORRECT —
it is relocated to `.wm-mobile-nav` (8 items), verified earlier.
`.wm-music-player` has 0 controls. `.wm-chart-dom*` are not in the DOM.

### Two asymmetries that are DECISIONS, not drift

1. **The watchlist toggle is rail-only.** The watchlist already has its own
   narrow-viewport door. Repeating it would give one capability two doors,
   and that toggle flips `watchlistOpen`, which governs a rail that is
   `display:none` there — a control that would appear to work and change
   nothing.
2. **Record screen is feature-detected.** `LeftSidebar`'s own header contract
   is "Every action is REAL — no placeholder buttons." `getDisplayMedia` does
   not exist on iOS Safari at any width, so shipping it unconditionally into
   a phone drawer would be exactly that placeholder. When absent the control
   is disabled AND the reason is stated, in the accessible name and as
   visible text.

## PROOF

- `tsc --noEmit --skipLibCheck` — EXIT 0 at every step.
- `vitest run` — **5045/5045 across 457 files** (+8 sentinels this segment).
- `next build` — clean, 81/81 static pages.
- **Mutations M15–M24, all killed, all restored** (rail rendered
  unconditionally; sheet wearing the hidden class; popover clamp removed; tap
  box below 44px; watchlist given a second dead door; unavailable control
  still firing; reason never reaching the button; hook degraded to a one-shot
  mount read).

LIVE at 375px (DOM + computed style): drawers are `role=dialog
aria-modal=true` with focus trapped; 20 drawing controls and 6 capture
controls all ≥44px; **0 overlaps, 0 horizontal overflow**; style popover
clamped on-screen (was off the right edge of a 320px drawer); tool selection
moves `aria-pressed` and survives close/reopen.

LIVE at 1280px under clean reload: all three rails render with their
ORIGINAL mouse geometry (draw 30×21, primary 38×38) — the 44px sheet rules
did not leak — and all three sheets and triggers are absent.

## NAMED FINDING — instrument, not defect

`preview_resize` changes viewport metrics via CDP **without dispatching
resize or matchMedia change events to the page.** Probe installed in the
page: crossing 375→1280 — a real breakpoint crossing where `matchMedia`
went true→false — fired **0 resize and 0 change events**.

Consequence: a bare resize leaves a STALE render tree. An initial reading of
"the rails did not relocate at 375px" was that artifact, not a regression; a
control experiment (reload at each width) showed correct behaviour both ways.

**Every viewport claim in this baton was taken after an explicit reload.**

Also re-confirmed: `preview_click` did not fire the React handler on
`.wm-chart-tools-trigger` (aria-expanded stayed false); invoking through the
fiber's `__reactProps$` worked. Same instrument class as the earlier symbol
-selection false trail. Prefer the fiber path.

## LIMITATIONS — what is NOT proven

- **No viewed image.** `preview_screenshot` is unavailable this session.
  Every visual claim above is a DOM/computed-style measurement.
- **`useNarrowViewport` live rotation is UNVERIFIED BY EXECUTION.** Correct
  by inspection (it subscribes to `change`), and `1d4b29d` locks the
  subscription against silent removal — but no test proves a real rotation
  re-renders. The suite has no DOM environment.
- **iOS-absent branch was simulated**, not run on real iOS hardware: the
  capability was removed from `navigator.mediaDevices` and the component
  remounted.
- **Local dev only.** Nothing here was verified against Cloudflare prod this
  segment.

## NEXT REAL DEPENDENCY

1. **A DOM test environment** (jsdom/happy-dom + testing-library). It is the
   single blocker on converting the rotation guard from a source assertion to
   a behavioural one, and it would unblock real tests for every drawer
   shipped this session. Deliberately NOT installed mid-shift.
2. **Real-device pass** on iPhone/iPad for the three new drawers — the
   mobile-visual standard treats an untaken screenshot as FAILED, and this
   segment could not take one.
3. Open, untouched: `/api/yahoo` refetch-rate attribution (task #27);
   Supabase Site URL allowlist (#2, founder-only); Cloudflare Workers plan
   (#15, founder-only); MainLayout cold-mount render burst (#17).

## UNTOUCHED BY DESIGN

Modified `docs/operations/batons/WM-PRO-EVENING-2026-09-03.md`, the five
untracked baton files, and `scratchpad/` were left uncommitted throughout.
No `git add -A` was used — every commit added explicit paths. No migration
applied, no secret rotated, no destructive git operation.
