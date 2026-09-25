<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> A session note is a snapshot of 2026-09-25. Its test counts, build state and
> "still open" list were true that day and are `STALE` by construction. Current
> runtime proof is a chain: repo HEAD → deploy target → running release →
> public route → human scene → receipt.
<!-- END:ath-historical-lineage -->

# Claude session — 2026-09-25 · Garden Pass 12 finish-line shift (local, 02:35–07:30 CDT)

Picked up after the cloud team's 34 Garden 12 commits (`69d7644a`…`f0ca2eaa`, all LOCAL-DEV
FIXTURE proof, no serving proof — egress blocked). This shift: (1) verified their work on the
**serving** glass through the Founder's authenticated Chrome, (2) ran a four-area code review of
all 34 commits (45 findings + 17 profile findings), (3) fixed them — directly and through
isolated-worktree builders — and (4) hunted lawfulness P0s nobody had touched.

Every commit ran `tsc --noEmit` clean and the FULL vitest suite green before push, and every new
guard was mutation-checked (broken → red → restored). Production = Cloudflare Workers Builds on
`main`.

## How serving was proved (read before re-proving)

The automation Chrome window was hidden (`document.hidden === true`, zero rAF frames), so the
overlay loop correctly idled and the canvas stayed at its 300×150 default — **not a production
bug**. For measurement only, the tab gets a rAF/visibility shim (setTimeout at 33ms,
`document.hidden → false`) and a client-side timeframe nudge to re-run the overlay effect. Receipts
are then read from `canvas.pointer-events-none`'s dataset. The serving code is untouched by this.
Window resize to 390 did not take (viewport stayed 1920); 390 is pinned by source sentinels only.

## Found on the serving glass and fixed

| Defect on the glass | Commit |
|---|---|
| Exhaustion chip/card printed **AGG / AGGRESSION LEVEL** while `absorptionBasis=VOLUME` (unsigned effort) | `d738d66c` |
| Exhaustion chip painted, then buried under the Question Lens debt card | `d738d66c` |
| VP printed a number on EVERY row by default (the "wall of numbers") | `eece499c` |
| Stopped anatomy block left `questionLens=ABSORPTION:3` etc. published | `eece499c` |
| Delta-divergence caption under the lens card; weather words started inside the time axis (2 of 3 lines clipped, 3rd over "N BARS IN VIEW") | `6ce7df1e` |
| Question Lens control/debt said AGGRESSION / "initiating pressure" on a VOLUME basis | `4fa95f59` |
| VP POC tag under the header chrome | `d8ae52cc`, `b655f1fc` |
| Exhaustion chip stepping off the header landed back in the lens strip | `b26360fc` |

## Lawfulness P0s nobody had closed (fixed)

| P0 | What was wrong | Commit |
|---|---|---|
| Tape chronology | Stream holds ticks NEWEST-first; every order-flow selector reads tape order. Stack built from the newest 60% and "tested" by the oldest 40%; divergence pivots swapped; value candle's "last print" was the oldest; worksheet likewise | `fda383d3` |
| Footprint orientation | Rows listed low-first, drawn top-down from the high → **every footprint upside down** | `dc2adba5` |
| Session/Classic VP | Rows split by CANDLE direction and painted as bid vs ask; gear labelled "Up / Ask", "Down / Bid" | `68da1246` |
| Legacy imbalance owners | "Stacked Imbalances" + "Imbalance Tracker" (tick invented as close×0.0005) | `950add27` |
| Candle-colour order flow (last night) | CVD/Delta Bars/Trade Flow/Large Trade Filter/… | `c8e291cc` |

## Review of the cloud team's 34 commits — findings fixed

Profiles (`15b67962`): Living silhouette bridged untraded gaps (HIGH) → per contiguous run;
"now" tether joined two owners' POCs; unreachable Structure tether with a receipt claiming it;
fused diamond hidden in the label column; Composite sediment at H×0.72 through the candles; TPO
letters overflowing/smearing at 390 and ~0.8-opaque blocks; ghost + memory-notch whole-history
scans per frame; 10 profile receipts never withdrawn.

Order flow / print evidence (builder, 13 commits `87807e43`…`3ec823ba`): ticket times in
unlabelled UTC (HIGH) → axis zone; FORCE plate "(AGGRESSIVE BUY/SELL)" on tick-rule sides (HIGH)
→ claim owner's caption, dashed arrow; print-response lookahead, verdict final on a forming bar,
per-frame recompute; NEAR delta row positioning/overprint/inferred basis; 390 ticket clamp with
SIDE INFERRED first; causal plates slot search; Big Trades top-5 by size; receipts.

Anatomy / stack (builder, 7 commits `786035fc`…`59fc79fd`): stack cells only on the bars that
built them; slabs inside the span; binary-search anchor; absorption shelf names **no defender**
from one candle's close; exhaustion fuel + follow-through on the owner's bars.

Semantic zoom (builder, 12 commits `42c4e430`…`8fc8409d`): one depth owner per frame; FAR veil no
longer darkens oscillator panes; one structure detector; FAR memo + pivot-label clamp; NEAR anatomy
by prices not pixels, no opaque boxes over prior candles; TAPE column yields the lens column, no
per-frame sort, inferred sides marked.

Gaps / ghost (builder, 4 commits `a4bb2c9a`…`bbb30dd1`): weekends/holidays/futures halts were
painted "GAP · n missing" (HIGH) → only holes inside a session, worded NO BAR; ≥3-bar outages now
marked; memo; memory ghost candles at 3× the 0.18 ceiling (HIGH) → 0.18, time-true (no
half-bar-forward "forecast").

Inspect / lens continuity (`04fb3c8b`): Ask row (only Show raw) clipped on short panes and absent
on phones; 420px refusal strip on 390; TPO displaced with nothing asked; a restored zone's first
click deselected it instead of opening its Passport.

Inspect (builder, `8b6ae928` `c466074c`): ONE selection reducer (`chartSelection.ts` — OBJECT /
PRINT / SLICE, select replaces, closeInspect clears every kind, reconcile drops a selection from
another symbol/timeframe); bar ticket reads the canonical identity (FIDELITY class word, LINEAGE
`BAR · source · provenance · session · epoch · heard +ms`, CHAIN `BAR → OBJECT → DECISION`).

Profile DNA + Bid/Ask (builder, `f8e0ee3f` `7e656ca4`): DNA is a spine on its lane (dashed when
estimated, VAL→VAH bracket, POC notch, mass-centre diamond; skew/kurtosis in Inspect) — the opaque
text box over candles is gone. Bid/Ask split paints sides by HOW they were known (provider solid,
tick-rule outline + INFERRED SIDE, unknown withheld), hatches bars without tape, chip states
coverage k/N.

Also: Profiles door says DATA REFUSES with the selector's reason instead of READY
(`8390bdc2`); the breathing layer no longer overhangs the sanctuary, which let focus slide the
whole OS 20px sideways (`549dbfe6`).

## Collision governor, keep-out, anatomy Inspect, lawful CVD (03:30–05:10)

| Slice | What changed | Commits |
|---|---|---|
| Candle keep-out | One owner (`chartKeepOut`) for the newest candle bodies; profile-stack labels, Profile Memory labels, the zone callout, the narrow absorption chip and the Value Migration dPOC name place against it; `KEEP_OUT_RECEIPTS` withdrawn with every clear | `7e337ae2`…`0a6bdbf2` |
| Heat lens (P-601) | Weather segments carry print from/to times; each cost cell sits over the bars it was paid on (`ds.heatLensUntimed` counts the rest) | `e3f16536` |
| Profiles door | Visible Range refusal reaches the door (DATA REFUSES + reason), reported on change only | `5086bae3` |
| Tape CVD pane (H-701) | The chart had NO CVD after the candle-colour one was retired. "Tape CVD": per-bar Σ(ask−bid) from the execution accumulator, cumulative from the tape horizon, whitespace where unheard, first bar hollow (PARTIAL), delta ink pair, "SIDES INFERRED" on tick-rule tape, REFUSED without verified tape | `73789f4d` |
| Attention governor | ONE owner (`selectAttentionGovernor`) decides every governed layer's alpha: tiers LIVE / SUPPORTING / MEMORY (≤0.5) / CHROME, floor 0.12; selected object loudest, everything else ×0.45 while Inspect reads it on camera; `ds.attention`, `ds.attentionTiers`, `ds.attentionSelection` | `ffeafa4a` `f39c6555` |
| Anatomy Inspect | Absorption shelves and exhaustion marks are one more kind (ANATOMY) of the ONE chart selection; Inspect reads the owners (push halves, origin, follow bars); Zone Passport LINEAGE | `828d4847`…`97ca91db` |
| Integration | The anatomy branch's private ×0.4 peer dimmer replaced by the governor (ANATOMY selection kind) — one loudness owner | `bd5134a1` |
| Exhaustion honesty | **Found on serving**: a BTC 1m mark graded EXHAUSTED from bars whose volume was 0 (0% ÷ 0%). Unreported effort is not a fade: `aggressionLevel` null, never exhausts, `effortUnreportedBars` stated in Inspect / card / lens | `4e7beb3a` |
| Push origin | Question Lens judged STRUCTURE BREAK against a rebuilt origin that disagreed with the exhaustion owner's | `6351f166` |
| Header floor | Structure Profile name + memory-ghost caption no longer print under the OHLC line | `e719f546` |
| Governor completion | SUPPORTING layers (envelope, contradiction, liquidity lifecycle, anatomy cards) ask the governor; the feed verdict (candleDataStatus) reaches it, so a STALE tape demotes the present | `bdf2e1bc` `a231704b` |
| Profiles door | Session VP's DATA refusals (no bars / flat / no volume) reach the door; layout declines stay quiet | `a8bedcba` |
| LEVEL Passport | A selected swing level opened the bar ticket; it now opens the same Market Object Passport drawer as a zone (slots + lineage + chain), stating what the level owner cannot know | `2d34fe61` |
| Axis clock | Every Inspect time prints in the chart's display zone and names it (was labelled UTC beside a CDT axis) | `0b5f68fa` |
| Pin collision | A supply zone's pin and its swing LEVEL's pin shared one pixel (the lower object unselectable); zones now pin at their middle | `081bed16` |
| Session Profile | ONE session-window owner (`sessionWindow.ts`): RTH/ETH for equities (follows the chart's Extended Hours), Globex 18:00–17:00 ET for futures (was cut at ET midnight — every session split in two), FX day 17:00 ET roll, ET day for continuous markets (named as the chart's day); the door's Session row names it | `1ca37c0a` `5a379653` |
| Appearance parity (builder) | ONE ink owner for the profile family (`profileFamilyInk.ts`, 7 roles, 90/90 colours byte-identical at rest); a POC/VAH/VAL chosen in the VP gear restyles every species; the gear now says so | `877b1550`…`86957f50`, `d7fda27d` |
| Tour: chip collision | Structure "LEG POC" chip printed over the stack column's "VRP POC"; stack words now join the chip ledger and Structure chips step clear | `76f280f7` |
| Tour: label smear | The stack column's one-row step oscillated between two neighbours and printed on both; nearest free row (`labelSlot.ts`) | `bc960113` |
| Tour: FAR gap words | Three "NO BAR · 1 interval" chips across the FAR picture; FAR keeps bridges, words only outages ≥ 3 intervals | `0ff1fd7a` |

Intermediate integration commits `1b365799` and `97ca91db` carry two anatomy-sentinel pins that
only `bd5134a1` updated to the landed keep-out — bisect from `bd5134a1`, not between them.

### PROVED on the serving glass (wealthymindsetspro.com, Founder's Chrome, BTC-USD 1m)

- `bd5134a1` serving: `ds.attention = D:MID|Q:1|SEL:NONE|STALE:0`, `attentionTiers =
  marketZones:LIVE:1`.
- Tape CVD (indicator switched on for the proof, then restored to the Founder's `[]`):
  `cvdSource=TAPE · cvdBars=2 · cvdSides=LABELLED`; caption "CVD · signed tape since 04:23 AM",
  hollow first bar, cumulative −4.73 on the axis.
- Anatomy select (Absorption switched on for the proof, restored to `false`): click on an
  exhaustion chip → `anatomySelected = exh:UP:1790317200:SAME:HALO`, `attention = …SEL:ANATOMY…`,
  `attentionTiers = exhaustion:LIVE:0.45,marketZones:LIVE:0.45` (peers recede), halo on the
  selected mark, Inspect "SELECTED EXHAUSTION" opened. Closing Inspect → `attentionSelection =
  NONE` (the reducer's closeInspect law).
- That same Inspect ticket exposed the zero-volume exhaustion → fixed in `4e7beb3a`.
- `0b5f68fa` serving: clicking the swing-LOW level pin opened MARKET OBJECT PASSPORT · Level ·
  84527.35 · swing low, `data-inspect-lineage=READ`, `data-inspect-chain=READ`, "As of 2026-09-25
  04:46 CDT"; governor `SEL:LEVEL`, `marketZones:LIVE:0.45`; closing → `NONE`.
- Refresh continuity: a selected demand zone survived a reload (sessionStorage), arrived calm —
  `attentionSelection = AT_REST:ZONE`, `marketZones:LIVE:1`, SELECTED ZONE chip on its pin.
  Cleared afterwards.
- Finish-line tour (Founder's settings snapshotted, 11 layers switched on for the proof, then every
  key restored — zero drift verified after reload): MID with Living + Visible Range + Structure +
  Memory + Composite + Absorption + Weather + Market Structure + Stack + Value Candle + Tape CVD
  → governor tiers `valueCandle/weather 0.6, profiles 1, sessionGhosts MEMORY 0.5`; FAR (687
  bars) → micro tiers 0.28, profiles 0.6, market structure 1, Living SKELETON, regime envelope +
  MAJOR HIGH/LOW. The three collisions above were found here and fixed; the chip fix and the
  label-row fix were re-checked on serving after deploy (LEG POC on its own row, no smear).
- Measurement caveat: the automation window is hidden, so Chrome throttles its timers (heartbeat
  gaps 1–3 s, ~2 frames/s). Awaiting timers in a loop there can exceed the 45 s CDP limit and
  look like a freeze; each draw measured ≤ 25 ms. Dispatch wheel events synchronously instead.

Not proved on serving: 390 (window resize does not change `innerWidth` in the automation
browser), the full DEFECT 7 continuity gauntlet (a zone click landed on the bar ticket instead;
not repeated to avoid moving more of the Founder's persisted state).

## Local work from the previous team

Audited every local branch, stash, untracked file and worktree (28 agents). Landed the two valid
items: sample pages no longer deploy as routes (`03b4ce83`), paper double-submit guard
(`e7f6377b`). Everything else was already landed or superseded (details in that audit).

## Operational notes

- **Disk**: at 03:00 the volume hit 373 MB free (four builder worktrees + a running Claude app
  updater's staging copies). Tests failed to LOAD (ENOSPC) before any assertion. Freed build output
  and two landed worktrees; the updater later cleaned itself. Watch `df -h` before fanning out.
- **Shared scratch collision**: builders and the orchestrator all used `scratchpad/mc.bak` for
  mutation backups; one restore pulled a foreign MainChart into a worktree (caught, reset). All of
  this shift's orchestrator commits were audited hunk by hunk — clean. Use in-worktree unique names.

## Still OPEN (named, not closed)

- **Fusion sample overlap — Founder decision.** `fuseProfiles` sums two parents' row VOLUMES
  on a shared grid. The fusable parents overlap in TIME (Visible Range lies inside Living's session;
  Living ⊇ the bars in view), so every shared bar is counted twice and the fused POC leans toward
  whatever both parents contain. Options: (a) REFUSE overlapping samples, named ("VRP's bars lie
  inside Living's — fusing would count them twice"); (b) RECOMPUTE from the UNION of the parents'
  bars (each bar once — the fusion owner takes bars, not row maps) and say so when one parent
  contains the other (then fused = the larger parent: nothing new); (c) keep the sum and DISCLOSE
  it. Recommendation: (b), with (a)'s words for containment. Not built — it changes what Fusion
  means on the glass.
- LEVEL Passport (zone lineage landed; a plain level pin has none yet).
- Governor SUPPORTING tier is defined but expectedEnvelope / contradiction / liquidityLifecycle /
  anatomyCards do not ask it yet; STALE ceiling has no feed signal in the draw loop.
- Two session deciders in the profile family: `sessionsByGap` (empirical — Composite, Memory,
  developing value; refuses on 24/7 feeds) and `sessionWindow` (defined — Session Profile). They
  agree on clean sessioned data. **Founder decision:** should Composite / Profile Memory use the
  ET day on continuous markets the way Session VP does (today they refuse on BTC)?
- The family's brass `#c9a55c` is not the room's GOLD `#c4a574`, and the classic VP's POC rests in
  pearl while the family's rests in brass — converging them is a visible Canon call.
- 390 serving proof (window resize did not take in the automation browser).
- Live Webull tape needs the Founder's credentials + 2FA tap (unchanged).
