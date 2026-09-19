<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **dispatch** — an instruction issued for one day's work. Its filename names its own day. It was true
> on that day and is preserved as evidence of what was observed and decided
> then. Do not take a current action, diagnosis, release decision or task claim
> from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference below is a `GHOST_HOST` signal: the
> Vercel host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-19 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which
> until that day scanned only the top level of `docs/operations` and could not
> see this directory at all. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

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
