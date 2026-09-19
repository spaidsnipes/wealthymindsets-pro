<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **hand-off record** — a transfer of state between two workers. Its filename names its own day. It was true
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

# SENTINEL FINDING — Session VP "does not appear" regression: NOT REPRODUCED; `0270590` exonerated

**Date:** 2026-08-01 ~01:07 CDT · **Reviewer:** Sentinel · **Repo HEAD:** `627be87` · **Trigger:** emergency dispatch — Founder reports "Session VP doesn't even appear anymore," prime suspect `0270590` (Delta migration).

## Result: cannot reproduce. Do NOT revert `0270590`.

### Live repro (authenticated prod `/charts`, TSLA 15m)
- Toggled **WM Fixed VP OFF, WM Session VP ON** to isolate Session VP.
- Session VP **renders correctly**: green volume-by-price distribution on the right, **VAH 312.15 · POC 311.05 (12.7k) · VAL 306.25**, histogram concentrated on the recent session. Screenshotted.
- Feed at test time: **FINNHUB/YAHOO DELAYED, Market Closed** (real clock is Aug 1 ~01:07 CDT). Live Alpaca tape is off out of hours — so the Founder's market-hours observation could not be reproduced under identical feed conditions.

### Code exoneration of `0270590` (independent, from the diff)
`git show 0270590` touches exactly three files:
- `FootprintControls.tsx` — removes **only** the Delta-levels block from `BigTradesControls()`. **Zero references to Session VP** in this file (`grep` confirmed). The prime-suspect premise ("touched FootprintControls where the VP toggle lives") is **false** — the VP toggle does not live there.
- `MainChart.tsx` — a **one-line comment** change (crediting the SM panel as broadcaster). No logic change.
- `SmartMoneyPanel.tsx` — adds the Delta count control. No VP code.

Session VP toggle/render actually lives in `MainChart.tsx` / `WMSessionVP.tsx` / `ChartsDashboard.tsx` — none altered by `0270590` beyond that one comment.

### Bisect note
A `git bisect` requires a reproducing failure at each step. There is no reproducing failure state (VP renders), so a bisect cannot be run — there is nothing to bisect toward. `bda48c9..HEAD` src commits are `aa68aa0` (tastytrade, reverted by `627be87`, VP-unrelated) and `0270590` (exonerated above).

## What Sentinel needs to file a real ticket (if the Founder still sees it live)
Exact reproduction conditions from the live-market observation: **symbol, timeframe, feed state (ALPACA LIVE vs delayed), whether Fixed VP was also on, and whether it was blank vs coarse vs absent.** Without a reproducing condition there is no defect to route. A blank Session VP during the *live-tape* window specifically (vs delayed feed) would point at the Alpaca-tape data path, **not** `0270590`.

## Verdict
- `0270590` (WM-UX-P0-01 Delta migration): **KEEP.** No revert authorized — reverting good work on a false-premise suspicion would be the actual regression.
- Session VP: **renders on current prod.** Reopen only with live-window repro conditions.
