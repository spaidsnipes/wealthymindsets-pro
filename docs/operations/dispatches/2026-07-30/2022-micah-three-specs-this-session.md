# MICAH — Three specs owed this session. Publish them.

**From:** Atlas / Mission Control · **Time:** 2026-07-30 20:22 CDT · **Repo HEAD at dispatch:** `36914de`

## Situation

Your thread was created per the 15:06 Founder directive. Your charter (`docs/operations/TEAM_CHARTERS.md` §MICAH) tells you exactly what to do when idle. Three bounded design specs are queued and blocking Noah:

## The three specs

### 1. `WM-CHART-P0-05b` — Custom Big Trades quantity input

Bounded UI addition to the Big Trades gear menu. Noah has the storage layer wired already. He needs your design for **the input control itself**.

Deliver:
- Placement inside the gear menu (relative to All / 200 / 150 preset buttons)
- Input shape (numeric field, stepper, slider — pick one and justify)
- Empty state, focus state, error state (out-of-range, non-integer)
- Label + inline help text (max ~40 chars)
- Screenshots of the design at 360×800, 390×844, 834×1194, desktop

### 2. Water-style Big Trade marker vocabulary

Founder directive §4A — replace the current bubble collision with an original WM visual system. Full requirements at `ACTIVE_TASK_QUEUE.md` (in the WM-CHART-P0-05 section, and in `docs/operations/handoffs/forge/2026-07-30-forge-wm-chart-p0-05-investigation.md`).

Key rules:
- Clean water-style / liquid-light look
- Clear numerical quantity
- Buy/sell distinction not from color alone
- Marker shapes: circle / square / diamond / your approved alternative
- Opacity + std-dev size scaling options
- All / 200 / 150 / Custom quantity modes (integrates with P0-05b)
- **Collision avoidance at the current-price line** (this is the actual founder-visible defect)
- **Never merge distinct orders** for visual cleanliness (data-truth rule; the shape is presentation, the merge is a data claim)

Publish design spec + acceptance criteria to `docs/operations/handoffs/micah/2026-07-30-micah-big-trades-water-style-spec.md`. File the implementation ticket as `WM-CHART-P0-05c` and dispatch Noah.

### 3. Branded W trigger — Smart Money chart button

`WM-BRAND-W-TRIGGER-01`. Current: plain text "Smart Money" button. Panel interior already has W branding — the trigger doesn't. Restore.

Deliver:
- W wordmark treatment on the trigger matching the panel interior
- WCAG AA contrast pass
- Tap target ≥44×44
- Keyboard focus state
- Screenshots at 360×800, 390×844, 834×1194, desktop

## Never do

- Change the price calculation, the source resolution, or any data value. Presentation only.
- Retint the source badge — Sentinel's V-008 called out badge visibility, and the fix landed at `fd12f1e` (11px badge + LIVE/DELAYED text + green glow). If you want to iterate that design, add it as a fourth spec — don't quietly override.
- Ship implementation. You spec; Noah implements; Sentinel verifies.

## Order of operations

Do all three specs in ONE cycle. They're small and Noah's queue clears the moment they land.

## Do this now

```
cd /Users/dspaidnoosleep/wealthymindsets-pro && git pull --ff-only origin main
# read docs/operations/TEAM_CHARTERS.md → MICAH section
# read ACTIVE_TASK_QUEUE.md → the three ticket bodies referenced above
# read docs/operations/handoffs/forge/2026-07-30-forge-wm-chart-p0-05-investigation.md
# draft all three specs
git add docs/operations/handoffs/micah/2026-07-30-*.md docs/operations/EMPLOYEE_STATUS.md
git commit -q -m "docs(micah): three specs — P0-05b input, water-style Big Trades markers, branded W trigger

<body — link each to its ticket and its acceptance criteria>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
```

Then dispatch Noah at `docs/operations/dispatches/2026-07-30/HHMM-noah-micah-specs-ready.md`.
