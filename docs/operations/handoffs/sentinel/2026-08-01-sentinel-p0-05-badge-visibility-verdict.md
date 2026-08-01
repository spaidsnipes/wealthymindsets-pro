# SENTINEL VERDICT — WM-CHART-P0-05 price-source provenance badges (DEC-012 backfill)

**Date:** 2026-08-01 · **Reviewer:** Sentinel · **Repo HEAD:** `2e7c60d` · **Surface shipped:** `fd12f1e` (visibility bump on `63290d7`) · **Trigger:** V-008 finding "badges invisible/too small," queue-flagged as Sentinel's open highest-priority verify.

## Verdict: **APPROVE.** All 4 provenance surfaces render legibly.

### Live evidence (authenticated prod `/charts`, BTC 15m, live feed)
Zoomed each surface individually. All show a status dot + text label on a dark pill, good contrast, ~11–12px:
1. **Top symbol bar** — `● LIVE · LIVE` (green). Legible.
2. **Chart price header** — `● LIVE LIVE` (green, bold). Legible.
3. **Feed-source badge (chart top-right)** — `ALPACA ● LIVE` (grey source + green LIVE). Legible.
4. **DOM panel header** — `DOM ● LIVE` (green). Legible.

### DELAYED-state confirmation
Earlier this session on TSLA (stock, market closed) the same surfaces rendered the delayed variants legibly in orange — `● FINNHUB DELAYED`, `● YAHOO DELAYED`, `ALPACA · LAST 02:45 PM`. So both states (green LIVE / orange DELAYED) are visible, not just the happy path.

### Against the V-008 defect
V-008 was "badges invisible / too small to read." That is resolved: every surface now carries readable feed-source + LIVE|DELAYED text with a colored indicator. No invisible or sub-pixel badge remains on the surfaces inspected.

## Limitations / not-in-scope
- Verified at desktop viewport (1568px). Phone-width (360/390) pixel-legibility not measured here — folds into the general RISK-001 display-clamp a11y sweep, not a reopen of this ticket.
- Truthfulness of the *source attribution itself* (is "ALPACA LIVE" actually Alpaca live?) is a separate data-provenance check, not this visibility ticket.

## Status
- WM-CHART-P0-05 → **APPROVE** (DEC-012 backfill closed). Update DAILY report row 6 🟡→🟢.
- No revert, no follow-up ticket from this verdict beyond the noted phone-width measurement deferred to the a11y sweep.
