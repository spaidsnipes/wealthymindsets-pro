<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> A session note is a snapshot of 2026-09-24. Its test counts, build state and
> "still open" list were true that day and are `STALE` by construction. Current
> runtime proof is a chain: repo HEAD → deploy target → running release →
> public route → human scene → receipt.
<!-- END:ath-historical-lineage -->

# Claude session — 2026-09-24 (overnight burst + morning shift)

Branch: `claude/nice-noether-vwt7jl` (local only — every push returned 403; see Blockers).
Proof harness and side-by-side receipts: `scratchpad/shift0924/` (`SIDE_*.png`, `*.mjs`).
All receipts are LOCAL DEV, desktop, FIXTURE bars (and a labelled FIXTURE tape where noted).
None of them is serving proof.

## What the Founder asked for, and what is on the chart now

**The mockups are chart tools, not separate screens** (Founder video, 08:13 local):

| Plate | Where it lives | What draws |
|---|---|---|
| MOCK 1 Absorption vs Exhaustion | Tools › Order flow › *Absorption vs Exhaustion*, *Anatomy Cards* | Zones + exhaustion marks on the candles; two key-metric cards tied to their candles by leaders |
| MOCK 2 Scaffolding | Tools › Chart tools › Reading lenses › *Scaffolding* (click = one depth deeper); Academy › *Practice it on the market* | Foundation (6 steps) → Intermediate (3 dynamics) → Pro (effort vs result geometry); nearest swings dashed on price |
| MOCK 3 / 5 Question-driven mode | Reading lenses › *Question Lens* | Question strip, evidence-debt ring, aggression-vs-displacement verdict; everything else quieted |
| MOCK 4 Market Object Passport | Tools › Market object passport (picker) or click a zone | Zone lit on price; full-height passport on the left wall |
| P-110 Profile organism | Tools › Chart tools › Profiles | Organisms 1–11 numbered in blueprint order, then Value Candle / Value Migration / Anchored Range |
| H-501 Semantic zoom | always | FAR/MID/NEAR tag + what speaks, under the bar clock |
| H-901 Regime lighting | Reading lenses › *Regime Lighting* | Three-breaker panel, only one ON; UNKNOWN leaves all OFF |
| P-601 Heat lens | Tools › Order flow › *Liquidity Weather · Heat Lens* | Heat bands on price, regulator applied to the composite |
| H-201 Memory Ghost | Reading lenses › *Memory Ghost* | Best-fitting earlier stretch (r ≥ 0.8) ghosted ≤ 0.18 under the newest 20 bars, with date · fit · mismatch; never projected forward |
| H-801 Expected Envelope | Reading lenses › *Expected Envelope* | Median reach above/below the open from this chart's completed sessions, on today's open; surprise = "k of N sessions went this far" |
| P-110 Save My Stack | Chart tools › Profiles › *Save my stack* / *Restore* | Keeps the trader's PROFILE-family switches; restore goes through the desks' switch door |

**One door per family.** Every menu row has exactly one family (`PROFILE_FAMILY` in
`selectProfileMenu.ts`): PROFILE → Chart tools › Profiles; ORDER_FLOW → Tools › Order flow
(footprint tools on each candle first — Bid×Ask, Delta Bubbles, Imbalance, Big Trades … —
then the order-flow readings on price); READING → Chart tools › Reading lenses. One switch
map (`profileMenuActive` / `onProfileMenuToggle`) drives all three doors.

## Refused on purpose (nothing measures them)

- MOCK 2 step 6 "assign probability" and the Pro card's "62% ★★★★★" — step 6 counts caution
  flags; Pro prints result-per-effort as a plain ratio.
- MOCK 4 decay rate, half-life, invalidation probability.
- MOCK 5 confidence read and "probability-weighted" right of way.
- MOCK 1 "structural integrity 96%" and the body-metaphor "cm" units.
- "HTF resistance" → nearest confirmed swing on THIS timeframe (no HTF is read).

## Defects found by the fixture tape and fixed

The tape harness (`scratchpad/shift0924/tape.mjs`) routes the Coinbase WebSocket through
Playwright and feeds labelled fixture prints through the real parser.

- Heat lens cells stacked past the 0.30 regulator into a near-opaque slab over the candles →
  cells composite offscreen and meet the glass once at the regulator.
- Value Candle caption printed through the Living labels and delta bubbles → chrome slot that
  steps around floating chips.
- Tape-horizon pill printed through the bar clock → foot of its own line on desktop.
- Stacked profile labels inverted price order on collision → step toward their own side.
- Question Lens + Scaffolding + Anatomy Cards at once overprinted at 1366×768 → cards go beside
  the scaffold card, below it, or fold into two measured lines at the foot of the plot.
- Exhaustion chip hid under the Question Lens strip → hangs below its mark.

## Still OPEN from the Manifestation Map

H-401 Contradiction Not Averaged — no chart form yet. H-1001 Risk on Price: the planning geometry
exists (Draw › Long/Short Position: entry · stop · target · R zones on price); the FROZEN RECEIPT
half is still open. P-110 stack controls (reorder, width, opacity, lock, duplicate) are still open.
(H-801 is built as a measured envelope; its "analogue surprise" is the session count, not an analogue path.) Memory Ghost (H-201) is now built;
its "analogue sample / mismatch in Inspect" is on the ghost's own label, not yet in Inspect.

## Blockers

- **Push 403.** GitHub account is connected, but the Claude GitHub App is not installed on
  `spaidsnipes/wealthymindsets-pro` (claude.ai › Connectors › GitHub › *Install on GitHub*).
- **No live tape here.** The environment's egress policy rejects Coinbase, Binance.US and the
  Railway relay, so delta bubbles / big trades / heat lens are proved on a FIXTURE tape only.

## For the Founder

- DOORLESS_BY_CANON routes (no house door): /morning-prep, /command-deck, /nectar, /paper,
  /proof-lane, /copy-trading, /ai-bot — keep doorless or give each a door?
- Workspace ORDER FLOW desk still arms WM Value Candle (now in the PROFILE family). Keep, or
  move the desk to the order-flow family only?

## Verification at hand-off

`npx tsc --noEmit` clean · `npx vitest run` 948 files / 12,014 tests green · `npm run build` green (re-run at hand-off).
