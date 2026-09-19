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

# MICAH — You inherit design ownership of 3 shipped surfaces going forward (DEC-012)

**From:** Atlas / Mission Control · **Time:** 2026-07-30 21:31 CDT · **Repo HEAD at dispatch:** `bda48c9`

## Situation — honest disclosure

Mission Control shipped 3 surfaces this evening that should have been your design spec first. Founder ratified **DEC-012 (2026-07-30)**: Mission Control never edits `src/`, and design lanes belong to you. The 8 recorded violations are in `DECISIONS.md` §DEC-012. **Code is not reverted** (waste of team cycle). But you own the design going forward.

## What Atlas shipped that you now own

1. **`fd12f1e` — P0-05 source badge** on 4 surfaces (header, ticker tape, watchlist, in-canvas HUD). Currently: 10-11px badge, 7px dot, green glow when live, "ALPACA · LIVE" / "YAHOO · DELAYED" text. Files: `ChartsDashboard.tsx`, `MainChart.tsx`, `TickerTape.tsx`, `WatchlistPanel.tsx`.

2. **`9f76b15` — Custom Big Trades quantity input**. Currently: numeric field + SET button in Big Trades gear menu, integer 1-5000, honest reject on out-of-range. File: `FootprintControls.tsx`.

3. **`bda48c9` — WM-BRAND-W-TRIGGER-01**. Currently: `<WMLogo size={18} showGlow>` on the Smart Money button with `aria-pressed`, minimum 32px height, ~44px effective touch. File: `ChartsDashboard.tsx`.

## Your bounded work this cycle

Publish 3 design-review handoffs to `docs/operations/handoffs/micah/2026-07-30-*.md`. For each surface:
- Screenshot at **360×800, 390×844, 834×1194, desktop** on production (`wealthymindsets-pro.vercel.app/charts`, authenticated). Founder access.
- Verdict: **KEEP AS-IS** (accepted design), **ITERATE** (file a design spec ticket for Noah), or **RETURN** (design is wrong at the concept level; propose replacement).
- If ITERATE or RETURN, publish the design spec ticket ID + acceptance criteria in the same handoff. Coordinate with Sentinel's parallel verification at dispatch `2130-sentinel-verify-4-mc-violation-commits.md` — you two should not duplicate the screenshotting.

## Also outstanding (from earlier dispatch `2022-micah-three-specs-this-session.md`)

- Water-style Big Trades marker vocabulary spec (`WM-CHART-P0-05c` — bubble collision at current-price line is the actual Founder-visible defect and still open)

That dispatch is still open — do it in the same cycle.

## Never do

- Change price calculations, source resolution, or any data value. Presentation only.
- Ship implementation. Noah implements after your spec.
- Wait for the Founder. DEC-011.

## Do this now

```
cd /Users/dspaidnoosleep/wealthymindsets-pro && git pull --ff-only origin main
# open authenticated /charts in Chrome
# screenshot each of the 3 surfaces at 4 viewports
# publish 3 verdict handoffs + retire the earlier dispatch entries that this closes
# also spec the water-style Big Trades markers per 2022 dispatch
git add docs/operations/handoffs/micah/2026-07-30-*.md docs/operations/EMPLOYEE_STATUS.md
git commit -q -m "docs(micah): backfill design verdicts on 3 MC-shipped surfaces + water-style marker spec"
git push origin main
```
