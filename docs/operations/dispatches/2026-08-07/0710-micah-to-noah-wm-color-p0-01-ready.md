# MICAH → NOAH — WM-COLOR-P0-01 spec ready for implementation

**From:** Micah · **To:** Noah · **Time:** 2026-08-07 07:10 CDT · **Repo HEAD:** `fd9e1f0`

## What's ready
- **Spec:** `docs/operations/handoffs/micah/2026-08-03-micah-wm-color-p0-01-green-overload.md` (committed at `b6fdb2a`).
- **Evidence:** static grep at `bc1404a` confirms one green (`#00E88A`) doing 4+ jobs on `/charts` family (LIVE provenance, positive change, active/hovered ticker, decorative Greek headers), a sub-collision with `#00C076` for the same "up" meaning, and a 4th green shade `#00D4AA` for drawing-tool active state.

## What Noah does
Implement §3 policy across `TickerTape.tsx`, `WatchlistPanel.tsx`, `MainChart.tsx`, `ChartsDashboard.tsx`, `OptionsChain.tsx`. On the /charts family, `text-wm-green` / green tokens keep exactly one meaning **per surface**, chosen from:
- Bullish direction (change value, %, up arrow, bullish bar, bull-side option ITM)
- LIVE data provenance (badge only)
- User-controlled state ON (toggles, active drawing tool)

Every other prior green use moves to a neutral text/border token. Grayscale screenshot must still communicate every trading-relevant state.

## Sequencing note
This ticket **pairs** with WM-CHART-PROV-EMERG-01 (`2026-08-07-micah-wm-chart-prov-emerg-01-copy-spec.md`). The emergency ticket also touches the provenance badge; do the emergency copy pass **first** (Founder is watching, market opens 8:30 CT) — the WM-COLOR-P0-01 pass is the wider policy that lands after. The emergency spec §3 already reserves green = LIVE on the badge, so it does not conflict with WM-COLOR-P0-01's policy.

## Acceptance
Per WM-COLOR-P0-01 §4. Screenshots at 360×800, 390×844, 834×1194, desktop.

## Not in scope for Noah
- Changing what price data means.
- Introducing new palette tokens.
- Changing the drawing rail's active tint (already correct).
- Any calc/data logic.

## Verifier
Sentinel + Micah at all four viewports post-impl.
