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

# MICAH → NOAH — 3 design specs ready to implement (acceptance criteria inside each)

**From:** Micah (Design/Experience) · **To:** Noah (Implementation) · **Time:** 2026-07-31 ~09:40 CDT
**Repo HEAD:** `866fc4b` · **Lane note:** these are design specs; you implement `src/`. I did not touch `src/` (DEC-012).

All three specs owed per Atlas dispatch `0857-micah-3-design-specs-...`. Full acceptance criteria live in each handoff — this is the routing summary + suggested order.

## Implement in this order

### 1. WM-UX-P0-01 — move Delta count control (smallest, Founder-named, bounded)
Spec: `docs/operations/handoffs/micah/2026-07-31-micah-wm-ux-p0-01-delta-panel-migration.md`
- Move the `5/7/10/15` Delta-levels control **out of** `FootprintControls.tsx:305–327` **into** the Smart Money panel's existing **"WM DELTA BUBBLES"** section (`SmartMoneyPanel.tsx:778–784`, right under the title/badge).
- **Reuse the exact storage + event:** `wm_delta_levels` key, `wm-delta-levels` CustomEvent (`FootprintControls.tsx:181–190`). Do not rename. Single source of truth — delete the gear copy.
- Keep segmented control (not slider — justification in spec §3). Each segment ≥44×44, `aria-pressed`, arrow-key nav, ≥12px number, keep `7 ★` default.
- Full criteria: spec §6.

### 2. WM-A11Y-BADGE-01 — from DEC-012 backfill (badge = ITERATE)
Spec: `docs/operations/handoffs/micah/2026-07-31-micah-dec012-backfill-verdicts.md` (Surface 1)
- Ticker-tape provenance (`TickerTape.tsx:146–160`) is a 7px dot with the provider label **hidden in hover `title`** (invisible on touch) and live/delayed by **color alone** (fails WCAG 1.4.1).
- Fix: visible non-hover label; live/delayed cue that survives grayscale (shape or word, not just green/amber). Keep `priceSource.ts` labels unchanged (presentation only).
- Other two backfill surfaces: **KEEP AS-IS** (qty input `9f76b15`, W trigger `bda48c9`) — no work.

### 3. WM-DRAW-P0-01 — drawing tools clean & smooth (largest; rides with WM-RESP-P0-01)
Spec: `docs/operations/handoffs/micah/2026-07-31-micah-wm-draw-p0-01-spec.md`
- Core: migrate the drawing overlay from `onMouseDown/Move/Up` (`MainChart.tsx:6716–6718, 6861–6863, 6897, 7025`) to **Pointer Events** + `touch-action:none` while a draw tool is active. This is the WM-RESP-P0-01 migration — they ship together.
- Rail targets 30×30→≥44px (`LeftDrawingSidebar.tsx:86–87`); add visible `:focus-visible` ring; on-screen cancel affordance for touch (reuse existing Esc path `MainChart.tsx:5908`).
- Esc-cancel already exists — keep it. 20 controls, 6 interaction classes, states, full criteria in spec §8.

## Verification note (applies to all 3)
Desktop proof captured live on authed `/charts`. **360/390/834 pixel confirmation is blocked** by the display-clamp/RISK-001 constraint (see `2026-07-30-micah-scanner-a11y-ticket.md §3.5`). Criteria requiring a real touch viewport (WM-DRAW §8 items 2–3; touch-target sign-off) cannot be closed on desktop alone — flag when you hit them; don't mark them passed from a desktop capture.
