# NOAH — YOU ARE UNBLOCKED. Claim WM-CHART-P0-05b NOW.

**From:** Atlas / Mission Control · **Time:** 2026-07-30 20:20 CDT · **Repo HEAD at dispatch:** `36914de`

## Situation

The phantom `WM-CHART-P0-01B-PREREQ-SCANNER-A11Y-01` gate was **retracted** at `e14e8dd` after Sentinel V-008 RETURN. It was never a real ticket — no body, no criteria — and Sentinel refused to fabricate an APPROVED. **You are no longer held on it.**

Per DEC-011 team charter, your *Default when idle* is "Claim the oldest READY FOR NOAH ticket." Don't wait for the Founder. Don't wait for anyone.

## Your next ticket (bounded, one commit)

**`WM-CHART-P0-05b` — Custom Big Trades quantity UI**. Full ticket body at bottom of `docs/operations/ACTIVE_TASK_QUEUE.md`. Summary:

- **Storage already exists.** `wm_bubble_max` in localStorage. Written from `src/components/chart/FootprintControls.tsx:94-111`, read at `src/components/chart/MainChart.tsx:848-850`. **Do not change these.**
- **You add the UI only.** In the Big Trades gear menu, alongside All / 200 / 150 presets, add a Custom integer input (min 1, max 5000). Persist to `wm_bubble_max`.
- **Micah has the design lane.** If her spec is published in `docs/operations/handoffs/micah/2026-07-30-*.md`, follow it exactly. If not, ship a minimal honest input (labeled, keyboard-accessible, integer-only, error state on out-of-range) and hand it to her for polish.
- **Acceptance:** see queue ticket. Screenshots at 360×800, 390×844, 834×1194, desktop. Sentinel verifies.

## After P0-05b

Ordered per 15:06 Founder directive Phase 1:
1. `WM-CHART-P0-05b` (this one)
2. `WM-CHART-P0-03` truthful granularity behavior (silent 2m→1m/5m substitution)
3. `WM-BRAND-W-TRIGGER-01` — restore branded W on Smart Money chart button (Micah spec first)

## Coordination note

Sentinel's V-008 also flagged that **WM-CHART-P0-01B and any scanner touch must land SERIALIZED, not parallel**. Since the phantom gate is retracted, this constraint only matters if a real `WM-A11Y-SCANNER-01` ticket gets authored later by Micah. Not your problem tonight.

## Never in scope for this dispatch

- Bubble rendering / collision (separate ticket, waits for Micah's water-style spec)
- Storage schema changes
- Any parked habit-loop feature
- Editing files outside `FootprintControls.tsx`

## Do this now

```
cd /Users/dspaidnoosleep/wealthymindsets-pro
git pull --ff-only origin main
# read docs/operations/ACTIVE_TASK_QUEUE.md → WM-CHART-P0-05b section
# implement in src/components/chart/FootprintControls.tsx
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
node node_modules/.bin/vitest run
git add src/components/chart/FootprintControls.tsx
git commit -q -m "feat(bubbles): Custom Big Trades quantity input (WM-CHART-P0-05b)

<body — what changed, evidence source, tests, screenshots taken>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
# handoff to docs/operations/handoffs/noah/2026-07-30-noah-wm-chart-p0-05b.md
```

Then update your row in `EMPLOYEE_STATUS.md` and pick the next ticket. **Do not stop after one.**
