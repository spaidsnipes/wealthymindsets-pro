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

# Claude session — 2026-09-24 (overnight burst + morning shift + afternoon shift)

Branch: `claude/nice-noether-vwt7jl`, fast-forwarded into `main` after every validated commit (Founder-authorised).
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

## Afternoon shift (17:35–21:00 UTC) — built on `main`, each deployed by Workers Builds

| Child | Where | What draws | Commit |
|---|---|---|---|
| H-401 Contradiction Not Averaged | Reading lenses › *Contradiction* | Contested band dashed on price; LEANS UP / LEANS DOWN columns with each family's measured fact; UNRESOLVED under the crack; WAIT; silent families named. Placed where it covers no candle/chip/header | `455cb8a` |
| H-401 "Passport shows both family lines" | Inspect ticket | Both family lines, silent families with why, posture | `ef995d6` |
| H-1001 Risk on Price + Frozen Receipt | Reading lenses › *Risk on Price* (on by default; draws only with a Long/Short Position that has a stop) · *Tear receipt* | Steel rail at the axis: RISK entry→stop, REWARD entry→target; STOP / INVALIDATION, ENTRY (+ what the bars did since the plan), TARGET R, LIVE R + distance to stop. Receipt torn from the camera's DECISION_ID: frozen asOf, write-once, owner-scoped, NO FILL | `71ad3fc` |
| H-601A Profile presets | Chart tools › Profiles (head) | Clean / Day Trader / Auction / Order Flow / Memory / Research — PROFILE toggles only; lit preset compiled from switches | `6cd756a` |
| H-701B Click bubble → Inspect | any bubble | Delta bubbles now clickable; SELECTED DELTA ZONE (net, anchor — never "executed"/"at"); both kinds show "#rank of N retained · median" | `272ada5` |
| H-201 analogue in Inspect | Inspect ticket | Sample window, fit r, mismatch, candidates; or why none | `4cd8e4f` |

Refused on purpose: size, equity risk and fill on H-1001 (the chart holds no account and executes
nothing — named on the entry callout and the receipt); H-1001's RISK CAP bracket and FILL
FIDELITY rows (no source); the gate names on the receipt are the permission rules actually
evaluated, not the plate's five.

Also fixed: exhaustion chip no longer prints into the header chrome; the position tool's own
Entry·RR chip steps under its zone near the top; the zoom plate is an obstacle for later chips.

## Still OPEN from the Manifestation Map

P-110 stack controls: width, lock, left/right/overlay placement, duplicate (reorder, opacity,
Auto Arrange, Save My Stack and presets are built). H-701A/B on a LIVE sided tape (proved on a
fixture tape only). Question lenses named in the correction (continuation healthy? · trap? ·
permission? · hold? · WHAT CHANGED? · SHOW RAW) — the Question Lens today asks the
absorption/exhaustion questions only. Zone target diamonds paint above the Inspect ticket.

## Deploy — why the live site was stale, and what fixed it (2026-09-24 16:00–16:40 UTC)

- `main` failed `tsc` from `42fec08` (09-23 19:26): `MainChart` imported `shouldFoldChartLiveBar`,
  which `liveBarPolicy.ts` did not export. Cloudflare Workers Builds runs the same typecheck, so
  every production build failed and wealthymindsetspro.com kept serving the 09-23 afternoon build.
- This branch restored the export; `main` was fast-forwarded to it (`3b6d5e5`, then `c0b8125`).
  **Workers Builds on `c0b8125`: SUCCESS.**
- The GitHub `typecheck · sentinels · build` job then reached the interior-geometry step for the
  first time in a day and flagged sr-only rail text as "clipped" plus a 9px "Evidence ledger";
  fixed in `464d33b` (measurer honours visually-hidden text; label at the 11px phrase floor).
- `464d33b` on `main`: GitHub `typecheck · sentinels · build` **success** · Workers Builds production
  **success**. Every SHA pushed to both `main` and a feature branch gets TWO Workers Builds runs; the
  feature-branch (non-production) run fails in ~2 min every time and is NOT production. Read the
  run whose build ID matches the production deployment, or turn off non-production branch builds
  in Cloudflare (Workers › wealthymindsets-pro › Settings › Builds).
- **Vercel was never the blocker.** Its GitHub App still posts "Account is blocked" statuses on
  every commit; they are ghosts (see CLAUDE.md › HOSTING LAW). Uninstalling the Vercel GitHub App
  (github.com/settings/installations) removes them for good.

## Blockers

- ~~Push 403~~ — resolved 16:0x UTC: Claude GitHub App installed; branch pushed and merged.
- The Vercel GitHub App was suspended by the Founder (afternoon); its ghost statuses may persist on old commits.
- **No live tape here.** The environment's egress policy rejects Coinbase, Binance.US and the
  Railway relay, so delta bubbles / big trades / heat lens are proved on a FIXTURE tape only.

## For the Founder

- DOORLESS_BY_CANON routes (no house door): /morning-prep, /command-deck, /nectar, /paper,
  /proof-lane, /copy-trading, /ai-bot — keep doorless or give each a door?
- Workspace ORDER FLOW desk still arms WM Value Candle (now in the PROFILE family). Keep, or
  move the desk to the order-flow family only?

## Verification at hand-off

`npx tsc --noEmit` clean · `npx vitest run` 953 files / 12,040 tests green · `npm run build` green (re-run before every push this afternoon).
