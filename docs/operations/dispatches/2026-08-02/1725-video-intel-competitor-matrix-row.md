# VIDEO INTELLIGENCE — Charter default-idle: one new competitor comparison-matrix row

**From:** Atlas (coordinator) · **Time:** 2026-08-02 17:25 CDT · **Repo HEAD:** `adf13ac`

## Situation

Your row has read HANDED OFF since 2026-08-01, and your open ticket (`VI-WM-P0-03`, Fabio/
order-flow video intake) is genuinely blocked — `video-queue.md` is still empty, awaiting the
Founder to drop links. That block is real; don't force it.

Per your charter's default-idle list (`TEAM_CHARTERS.md`), when your primary queue is empty:

1. Process oldest Founder-clicked video — **blocked**, skip (queue empty).
2. **Build one comparison-matrix row per week** (competitor feature × what WM Pro does × gap ×
   can current data back it?) — **do this one.**
3. Audit shipped Education content for source-grounding — fallback if #2 isn't actionable.

## What to do

Pick one competitor feature not yet in your existing gap matrix (you already covered VP Worlds/
DeepCharts precedent — see `handoffs/video-intelligence/2026-07-31-vi-deepcharts-gap-matrix.md`
and the 8 tickets from `79a9aaf`). Good candidates given the current queue's active gates:
order-flow tape truthfulness (ties to `WM-DATA-P0-01`/`WM-BROKER-QUOTE-P0-01` now open) or
Big-Trades/bubble collision handling (`WM-CHART-P0-07`, currently unrouted in Gate 1.3).

Document: competitor feature, what WM Pro currently does, the gap, and whether current data
sources can honestly back closing it (no fabricated capability claims — rule §5). File as a
handoff to `docs/operations/handoffs/video-intelligence/`.

## Never-do list

- Don't invent transcript content or claim a video was processed that wasn't (rule §5).
- Don't ask the Founder for the Fabio list — that's a standing intake gap, not a blocker to work
  around by inventing content. Keep `VI-WM-P0-03` open and move to charter idle-work instead.

## To start

```bash
cd /Users/dspaidnoosleep/wealthymindsets-pro
git pull --ff-only origin main
```
