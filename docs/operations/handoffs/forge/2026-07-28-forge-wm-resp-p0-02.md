# FORGE HANDOFF — WM-RESP-P0-02 Restore pinch-zoom; fix login tap targets

**Date:** 2026-07-28 · **Employee:** Forge · **Ticket:** WM-RESP-P0-02
**Repo:** `spaidsnipes/wealthymindsets-pro` · **Branch:** `main` · **Commit:** `9f2c68d`
**Status:** **COMPLETE — full visual proof obtained, no auth blocker**
**Next owner:** Sentinel (verify)

---

## 1. What shipped

**`src/app/layout.tsx`** — removed `maximumScale: 1` and `userScalable: false` from the
`viewport` export. `width: "device-width"`, `initialScale: 1`, `viewportFit: "cover"` all
retained.

**`src/app/login/page.tsx`** — three tap targets brought to ≥44×44, measured via
`getBoundingClientRect()`, not assumed:

| Element | Before | After | How |
|---|---|---|---|
| Password-reveal button | 14×14 | **46×46** | `p-4` (real padding, not decorative), repositioned `right-3`→`right-0` so the growth expands into space already reserved by the input's `pr-10`, not into the typed-text area |
| "Forgot password?" link | 93×17 | **93×45** | `py-3.5` |
| Sign In / Create Account tabs | 164×40 | **164×44** | `py-2.5`→`py-3` |

**First attempt used a `before:` pseudo-element hit-area overlay instead of real padding —
wrong, corrected before commit.** The standard's own verification method
(`getBoundingClientRect()` on the real element) doesn't see pseudo-elements; an overlay
would have looked fixed but still failed the audit. Real padding was required, so I
reworked the eye-button's positioning (`right-0` instead of `right-3`) to keep the growth
from creeping into the icon's reserved space rather than shifting it into the typed text.

---

## 2. Visual verification — REAL, not blocked

Unlike every other WM Pro ticket this session, `/login` needs no authenticated session, so
this is genuine end-to-end proof, not a code-only claim.

**Method:** started a second dev server (`wmpro-visual-qa`, port 3011 — the existing
session's server on 3000 was left undisturbed) and drove it live in the Browser pane.

**At all three required breakpoints (360×800, 390×844, 834×1194):**

- Ran the `WOW_RESPONSIVE_STANDARD.md` §4 audit snippet verbatim in the live page.
- `viewportMeta`: `"width=device-width, initial-scale=1, viewport-fit=cover"` — no
  `maximum-scale`, no `user-scalable` — **at every breakpoint**.
- `horizontalOverflow: false`, `scrollW === innerW` — **at every breakpoint**.
- `smallTargets: []` — **empty at every breakpoint.** (First run at 360×800, before the
  pseudo→real-padding correction, showed `smallTargets` still containing the eye button
  and the forgot-password link — that failure is what caught the pseudo-element mistake.)
- Screenshots captured at all three sizes; layout is visually unchanged (no restyle) apart
  from the intended larger tap zones.

**Functional confirmation, not just geometry:** typed a password into the field via a
React-compatible value dispatch, clicked the enlarged reveal-button target, and confirmed
the input actually toggled from masked dots to plain text (`testpass123` visible) and
back. The button's `onClick` logic was untouched by this change — only its box — and this
confirms nothing was broken by the reposition.

---

## 3. Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | `maximum-scale`/`user-scalable=no` removed, `viewport-fit=cover` retained | **MET** |
| 2 | Pinch-zoom works on a real touch device/emulator | **Meta-level MET** (attribute removed and confirmed absent live); no physical touch device available this session to confirm the gesture itself — same class of limitation the standard itself calls out for Tesla/watch (§2), here scoped down to "no physical device," not "no verification" |
| 3 | Every interactive element on `/login` ≥44×44 hit area | **MET** — measured, not assumed |
| 4 | No horizontal overflow at 360/390/834 | **MET** — confirmed at all three |

---

## 4. Risks / honest gaps

- **No physical touch device.** Pinch-zoom's CSS-level cause (the blocking attribute) is
  removed and confirmed absent in the live DOM at every breakpoint; the actual gesture
  was not confirmed on real hardware. This is a materially smaller gap than the
  auth-blocked tickets — the fix is a one-line attribute removal with no logic to
  misbehave — but it's stated plainly rather than implied as fully closed.
- **Second dev server left running** on port 3001 config (`wealthymindsets-pro-forge` in
  the repo-local, gitignored `.claude/launch.json`) in addition to the pre-existing
  `wmpro-visual-qa` (3011) which I actually used. The unused 3001 config is harmless
  (gitignored, not started) but could be removed by whoever finds it if it's confusing.

---

## 5. Next ticket

This was a fast, fully-closeable ticket by design (per the cross-session mission-control
note that flagged it). No further Forge follow-up implied by this ticket itself.

**For Sentinel:** re-run the §4 audit snippet independently to confirm `smallTargets`
empty and viewport meta clean; the rest of the mobile/responsive queue
(`WM-RESP-P0-01`, `WM-RESP-P1-01`) remains behind RISK-001 for chart-surface verification.
