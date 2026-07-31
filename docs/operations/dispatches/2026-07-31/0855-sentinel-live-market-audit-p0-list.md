# SENTINEL — LIVE MARKET AUDIT (market open, real data window)

**From:** Atlas / Mission Control · **Time:** 2026-07-31 08:55 CDT · **Repo HEAD:** `62229ed`
**Founder priority:** MAX. This is the real-data window and the Discord waitlist is waiting on go-live.

## Situation

Founder observed at 08:52 CDT with production `/charts` open on authenticated Chrome (proof screenshots in ATH Mission Control chat):

1. **Session VP broke again.** Reproducing on TSLA 15m. This is the second recurrence — see WM-RESP-P0-02 history + prior V-verdicts.
2. **Drawing tools not clean/smooth.** All 20 mouse/touch tools on the left rail.
3. **Order flow tools not fully functional.** OFF/Bid×Ask/Delta/Vol Profile/Imbalance/Agg-Passive/Big Trades toggle set.
4. **Tastytrade wiring not showing futures** (should).
5. **UX defect:** Delta bubble level control (5/7/10/15) is inside the **Big Trades gear menu** at production. Founder ruling: it belongs in the **Smart Money tools panel** (branded W button), not on Big Trades.
6. Also outstanding: DEC-012 backfill verify on `fd12f1e` / `9f76b15` / `bda48c9` / `3cbf3a9` (still your dispatch `2130-sentinel-verify-4-mc-violation-commits.md`).

## Your bounded audit — publish handoff per item, do NOT bundle

For each item below, on authenticated production, at typical zoom, RTH:
- Reproduce.
- Screenshot (broken state + expected).
- Record: symbol, timeframe, timestamp, session state, feed source (from the badges Atlas shipped at `fd12f1e`), console errors if any.
- **File a P0 ticket** in `ACTIVE_TASK_QUEUE.md` with acceptance criteria.
- Dispatch **Forge** (architecture / data-truth) or **Noah** (bounded implementation) as appropriate. Micah is dispatched separately for the Delta-bubble control migration.

Priority order (do NOT reorder without Elias):

### 1. WM-VP-P0-01 — Session VP broke again (P0)
File: `src/components/chart/WMSessionVP.tsx` (verify with grep before pointing anyone at it).
Suspect: state reset on symbol switch, or Alpaca-tape shape change. Prior fix history at `docs/operations/handoffs/forge/` — search for "session vp" and "WM-RESP-P0-02".
Route: **Forge** for root cause (this is the second recurrence — architecture issue, not one-off bug). Do NOT route Noah until Forge publishes the contract.

### 2. WM-OF-P0-05 — Order flow toolset audit (P0)
Founder claim: "they all need to function properly, right now there not fully working."
For each of: Bid×Ask, Delta, Vol Profile, Imbalance, Agg/Passive, Big Trades — toggle ON individually on TSLA 15m, screenshot what renders vs what should. Anything showing NO DATA or NO DEPTH when the founder expects data → file per-tool sub-ticket.
Route: **Forge** for each root cause; each is potentially a different data-contract defect.

### 3. WM-DRAW-P0-01 — Drawing tools smoothness (P0)
All 20 tools on left rail. Test each on TSLA 15m:
- Trend line, Ray, Horizontal, Vertical, Slash, Fib, Rectangle, Ellipse, Triangle, Channel, Text, Pencil, Eraser, Cursor, Move, Color, Fill, Lock, Visibility, Trash
- Jank / snap-back / handles disappearing / touch not working → per-tool severity note.
Route: **Micah** for interaction/animation spec first, then **Noah** for implementation. Micah owns the "smooth" definition.

### 4. WM-BROKER-P0-01 — Tastytrade wiring shows no futures (P0)
Founder claim: "should see futures."
Files: `src/lib/tastytrade.ts` + wherever the broker connect UI lives (grep first).
Test: open Connect Broker / Trade, connect Tastytrade, verify futures symbols visible in account list AND selectable.
Route: **Forge** for API contract audit (tastytrade futures entitlement/endpoint), **Noah** for wiring after Forge signs off.

### 5. WM-UX-P0-01 — Delta bubble count control is in the WRONG panel (P0)
CURRENT (broken): Delta levels 5/7/10/15 buttons live in `FootprintControls.tsx` inside the Big Trades gear menu (visible in Founder screenshot at 08:51 CDT).
EXPECTED: control lives inside the Smart Money tools panel (opened by branded W trigger). "wm_delta_levels" localStorage key already exists — this is a UI relocation, not a new feature.
Route: **Micah** for placement spec in SM panel (where in the panel, how it interacts with the existing SM controls), then **Noah** to move the JSX. Do NOT keep it in both places.

### 6. DEC-012 backfill (P0, already dispatched)
See `docs/operations/dispatches/2026-07-30/2130-sentinel-verify-4-mc-violation-commits.md`. Founder is watching. Ship those verdicts today.

## Do this now

```
cd /Users/dspaidnoosleep/wealthymindsets-pro && git pull --ff-only origin main
# open authenticated production /charts in Chrome
# audit each item in order
# per item: file ticket in ACTIVE_TASK_QUEUE.md + write dispatch to owner
git add docs/operations/ACTIVE_TASK_QUEUE.md docs/operations/dispatches/2026-07-31/ docs/operations/handoffs/sentinel/2026-07-31-*.md docs/operations/EMPLOYEE_STATUS.md
git commit -q -m "audit(sentinel): live market audit 2026-07-31 08:55 CDT — 5 P0 tickets filed + dispatched"
git push origin main
```

Publish audit handoff at `docs/operations/handoffs/sentinel/2026-07-31-sentinel-live-market-audit.md`.

## Never do

- Silently fix. File the ticket, dispatch the owner.
- Wait for the Founder. DEC-011.
- Route to yourself for implementation. Sentinel verifies; Noah/Forge/Micah build.
