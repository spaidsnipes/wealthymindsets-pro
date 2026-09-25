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

# Claude session — 2026-09-25 · Garden Pass 12 finish-line shift (local, 02:35–07:30 CDT; review fixes landed 07:30–07:45 after a usage-limit pause)

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
| Review fixes (read-only reviewer, 5 confirmed) | Session window dropped the equity opening bar on 1h/4h (overlap rule now); CVD "since" could outclaim a restarted accumulator; CVD refill on bar load + dated caption; "effort zero" beside "not reported"; Passports rounded prices to 2 dp | `1510e313` |
| Review fixes (canvas reviewer) | STALE tape now dims every layer by one factor (was: present capped below memory); CVD refill keyed on bar identity; thin-bar pin fan-out; CVD refs cleared on rebuild; RAW hides the CVD pane; draw effect re-runs on symbol; SUPPORTING words keep the 0.5 floor | `dce5c622` |
| Profile Memory biography | Remembered POC/VAH/VAL become selectable LEVEL MarketObjects (while Memory is on) → pins, one selection, governor focus, the same Passport with tests and lineage | `82ecebb9` |

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

## Browser transformation shift (07:45–11:00 CDT) — DESKTOP ONLY

Founder correction: Phase 1 is the full serving DESKTOP browser (Garden 11 device gate). Phone,
tablet and 390 work waits for desktop ZERO OPEN, human Sheriff acceptance and explicit Founder
opening. Authority read first: Garden 11 front door, the Manifestation Map, the Browser trade set
(B-101…B-801). Canon plates were opened in Drive beside serving /charts (P110 Living Profile
Stack, H-701 Force/Response + Big Trade contractor sheet, UI-04 Question-Driven Absorption).

| Slice | Canon vs serving → change | Commit |
|---|---|---|
| Living Profile body (P110) | Serving: hairline rows in an ~84px side lane. Canon: one gold auction body fused to price. → one smooth gradient body per traded run, value lit, POC glow, ghosts/levels/DNA on its scale; every candle under it cut out of the fill; the stack plan owns its room (Composite/VRP step left of it) | `ee2f7671` `7d50f0ed` `11ffd01f` |
| Fusion (Defect 1) | Serving: full-width band + caption "FUSION ×2 · … · STRUCTURE VAL · MEMORY S-3 POC". → parents arrive as threads at their own prices in species inks, converging into one bracketed knot "×N" | `1ed6b3a2` `f2ca1b80` |
| Absorption effort (UI-04) | 3px ticks invisible at MID → dotted effort column per shelf bar, sized by that bar's effort, in the absorb ink | `9f6a8531` |
| Composite (Defect 2) | Three identical steel/gold histograms side by side → Composite rows laid down as session strata (owner publishes per-session volume) | `a727f064` |
| Liquidity lifecycle | NQ 5m: "6 pools", 0 painted, all long-consumed → consumed pools stop starving new births and live pools rank first; serving now 6/6 live pools painted | `b329cf11` |
| F24 audit (Garden 11 task) | Session: saved RTH/ETH overwritten with RTH on every load → controlled select. Draw: Long/Short Position + Fixed Range added to the Workspace Draw sheet | `0108ac0c` |
| Continuity (tour) | Rooms panel stayed open over Journal and back on /charts → a new address puts held equipment down | `051402e6` |
| Inspect (H-601) | Living slice ticket gains the session BIOGRAPHY: start, every POC move with times, value EXPANDED/CONTRACTED + TRANSLATED | `130b060d` |
| TPO / DNA (collision) | TPO letters ran under the left DOM chrome → start right of it (84 px: the EFFORT button's box ends at x 76); DNA bracket is a fingerprint (VALUE 0.5, 3 px), not a beacon | `700cea7d` `74fe1002` |
| TPO vs legend (Defect 4) | Top TPO rows printed under the transparent price legend → TPO paint region excludes the legend band and any floating chip in its column (`ds.tpoYields`) | `14347d72` |
| Session profile (Defect 1/2) | Session and Fixed VP were one histogram in two inks → the Session column is framed by its session: "[" wall at the opening bar + dotted high/low hairlines to the column (`ds.vpSpan` = `OPEN:x` / `OPENED_BEFORE_VIEW`) | `bf782f3b` |
| Fixed Range (Defect 1) | Washed box whose edges were not where the handles grab → two anchor rails at the chosen times, a knob at each exact grab point (dotted leader when the drag price is outside the traded span) | `400694c0` |
| dPOC name (Defect 4) | Value Migration caption's 0.82 backing hid the ten bodies before "now" (keep-out protected only the newest 3) → keep-out owner gains `spanCandleKeepOut`; the name places against every body under its row (mirror row, then just above/below them, dotted leader), else its backing yields (`ds.valueMigrationLabel`) | `ce055956` |
| Living labels | Solo lane at fixed W−76: "VAH/POC/VAL" ran under the price axis and read "VA"/"PO" (TSLA 1h) → a name that would not end before the plot edge joins the one label column (`ds.livingProfileLabels`) | `e882248a` |
| Label column (Defect 4) | The one label column sits left of the Living body, over older candles, but was checked only against the newest 3 bodies → every body on its own row (measured once per frame) | `2ec9f491` |
| dPOC / header | Stepping above its row's bodies put the dPOC name against the DOM evidence chip → never above `HEADER_FLOOR_Y` | `579dc26e` |
| Sheriff frame (all 10 species on) | Memory names printed under stack names at equal prices ("S-2 POC 30760 · 36 TESTS" under "CMP POC 30760") — non-strict slot test → strict + join the chip ledger; "LIVING VAH …" printed inside the price legend over "+0.12% today" → stack/Memory names floored below the legend band; classic VP "VAH 31,020" printed on "BAR OPENED …" and its off-screen marker sat at y 9 → tags floored at the header band | `3d8e8daf` `242b3a1f` `3eb2a967` |

Process slip (owned): `3d8e8daf` was pushed by a chained command although the full suite reported
one failing sentinel (a second pin on the stack-label call). Fixed 2 minutes later in `242b3a1f`
(pin updated to the new truth; suite 12,643/12,643). `3d8e8daf`'s own GitHub sentinel job is red;
the next commits are green. Commits are now gated on the suite result, never chained after it.

Integrity rail — CORRECTED at 09:36. On NQ "CHART INTEGRITY · WOUNDED" is honest (delayed Yahoo quote:
ACTIVE DEGRADED → DEGRADED → WOUNDED; the rail says "2 BARS BEHIND"). On BTC it was a FALSE ALARM: the
masthead read LIVE — CERTIFIED QUOTE while the plaque read DEGRADED, because the chart room handed the
grader `{ present }` with no `fresh`, and for a streaming provider `fresh !== true` is ACTIVE DEGRADED —
permanently. Fixed in `5c0f7000`: one freshness join (`quoteFreshness`) read by the masthead and the chart.

| Slice | Canon vs serving → change | Commit |
|---|---|---|
| Envelope name (Defect 4) | "TYPICAL REACH …" had no keep-out (0.82 backing at the live edge) and printed inside the header band → below the band, strict slot test vs its row's bodies + chips, joins the ledger | `95232caa` |
| Word stack vs TPO | CONTRADICTION / LIQUIDITY LIFECYCLE words printed across the TPO letters → weather + contradiction words register as chips; the lifecycle caption's words and row get one owner, reserved before TPO paints | `5a2e0ec8` |
| One truth on the rail | BTC: masthead LIVE CERTIFIED vs plaque DEGRADED → one freshness join for both | `5c0f7000` |

| Envelope refusal line | the last bottom-left word TPO could not see → a chip | `47383da2` |
| Inspect precision (Defect 6) | Ticket read Volume 0.01 beside a data window reading 0.012, and rounded any quantity ≥ 1 to a whole unit → venue precision (6 significant figures for fractions) | `03cad1a3` |
| Market precision (EURUSD) | Series had no `priceFormat` (library default 2 dp), legend precision from a static base → axis 1.15/1.14/1.13, "1.14 +0.00 (+0.20%)", O/H/L all 1.14, "TPO POC 1.15" beside "TPO VAL 1.15" → one owner `pricePrecision.ts` reads the bars; series, legend and every profile-family level name use it | `1e4f1add` `a6b79915` |
| Day change pip (EURUSD) | Transport and `resolveRollingChange` rounded the change to 2 dp → "+0.0000 (+0.16%)"; now 8 dp (float noise only) | `38dcd634` |

Continuity on serving: Inspect open on a 1m bar → timeframe 1m → 5m: the ticket let go of the stale
selection and re-bound to the forming 5m bar, saying so. (Founder's `wm_timeframe` restored to 1h.)

H-701 on serving (order-flow set on, desktop): NQ (candle-only, delayed) — Imbalance / Divergence /
Weather / Value Candle `UNMEASURED`, Delta Levels `NO_MEASURED_GRID`, Effort `UNREAD`: SILENCE, nothing
invented from OHLC. BTC 1m (Coinbase tape) — Delta Levels, Value Candle (24 rungs), Weather DRAWN from
tape; Imbalance `NO_STACK`, Divergence `NO_SWING` (measured, nothing to claim). Paint budget MET both.
Sheriff frame (all ten profile species at once, NQ 5m): every species drew (Living BODY, Structure
SWING_LOW+TETHER+TERRITORY, Fusion KNOT, Memory 4 shelves + 17 notches, DNA MEASURED, Composite 4 strata,
VRP, TPO, Session + Fixed VP), budget MET (mean 20 ms), 0 labels yielded onto candles.

F24 labels: Draw ✓ (now carries risk + Fixed Range) · Layout ✓ Workspace desks (saved layouts: one
"My stack" slot in Tools — OPEN) · Session ✓ (fixed) · Risk ✓ geometry, no execution on /charts ·
**Flatten BLOCKED** — the only chart order path (`placeChartMarketOrder`) is pinned by
`chartOrderContractCoverage` until ten futures carry published CME point values; a guessed
multiplier would book money wrong (Founder/human decision) · **Replay OPEN** — the Workspace tile
opens an honest "not wired" panel; no frozen-bar replay engine exists.

PROVED on serving this block (NQ1! 5m desktop, my own tab; the Founder's live tab untouched): P110
body with crisp candles; Fusion knots; Composite strata; effort columns; 6/6 live liquidity pools;
Visible Range recomputes on zoom (150 bars POC 30875 → 117 bars 30880 → 204 bars 30760); Rooms →
Journal → Back keeps the camera and profiles; Living slice Inspect biography (184 bars, POC
migrated 8×, value EXPANDED 30 → 190, TRANSLATED UP 160).

Settings incident (owned): an old snapshot restore turned the Founder's newly enabled Composite,
Structure, Fusion and DNA off in storage mid-shift; re-derived from his live tab's receipts and
restored within minutes (his live tab never changed). Method corrected: flip-and-restore only the
touched keys, read immediately before.

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

Added by the browser shift (desktop):
- ~~EURUSD live quote reads 1.1400 flat~~ — WITHDRAWN 10:20 after re-measuring on serving: the 1h bar
  had just opened on its first tick, so O = H = L = NOW is true. After `1e4f1add` `a6b79915`
  `38dcd634` the header reads "1.1399 +0.0017 (+0.15%)", the axis quotes pips, TPO POC 1.1540 vs
  VAL 1.1385.
- **Flatten BLOCKED** (human decision): `placeChartMarketOrder` stays pinned until ten futures carry
  published CME point values. **Replay OPEN**: no frozen-bar replay engine (honest "not wired" panel).
  **Layout OPEN**: saved layouts are one "My stack" slot in Tools.
- **Precision, remaining sites**: drawing-tool chips (Fixed Range "POC …", info-line/price-range
  deltas use a static base rule), the risk callout (STOP / INVALIDATION), classic VP value-area tags
  (`p.toFixed(2)` / grouped integers) and indicator math (`computeBB` / VWAP round by a `> 100` rule)
  still format outside `pricePrecision.ts`. Visible on FX; route them through the owner.
- **Keep-out law scope**: the owner protects the newest 3 bodies; this shift added row-span bodies
  for the dPOC name, the stack label column and the envelope name. Zone callouts, the absorption chip
  and anatomy cards still use newest-3 only — widen deliberately (they may then slide far).
- **"WM Fixed VP" naming vs canon**: canon's Fixed Range is user-selected (the Draw tool, now anchor
  rails + knobs). The classic "WM Fixed VP" measures the whole loaded history — a naming decision.
- **Living VAH/VAL hairlines + POC dash run edge to edge** (canon-directed, P110). Whether the value
  wash should stop at the profile's first bar is a Canon call.

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
