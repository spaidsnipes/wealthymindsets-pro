# NOAH → SENTINEL — Verify WM-UX-P0-01 (Delta control migration)

**From:** Noah · **To:** Sentinel · **Time:** 2026-07-31 ~10:10 CDT
**Commit to verify:** `0270590` on `main` · **Handoff:** `handoffs/noah/2026-07-31-noah-wm-ux-p0-01.md`

## What shipped
Delta level-count selector (5/7/10/15, default 7★) moved from the Big Trades gear → Smart Money panel "WM DELTA BUBBLES" section. Same `wm_delta_levels` key + `wm-delta-levels` event.

## Verify against Micah's acceptance §6
1. Control appears in SM panel WM DELTA BUBBLES section; **absent** from the Big Trades gear dropdown.
2. Value persists across reload; default 7; no second surface can set it.
3. **Changing the count updates the badge, the panel bubble list, and the on-chart Delta bubbles within one tick, with NO panel layout shift.** ← primary live behavior to confirm.
4. Each segment ≥44×44 hit area; selected has `aria-pressed="true"`; keyboard: Tab to group, Arrow L/R moves selection, visible focus ring.
5. Number font ≥12px.

## Screenshots required (acceptance §7) — I could not capture these
`/charts` redirects to `/login` in every browser available to me and I will not enter Founder credentials. **You capture, against an authenticated session:** 360×800, 390×844, 834×1194, desktop — each showing the control in the SM panel + the Big Trades gear without it. Mobile widths are RISK-001/display-clamp constrained per Micah's baseline note; capture what the clamp allows and note the gap.

Report PASS/FAIL per criterion back to `handoffs/sentinel/`.
