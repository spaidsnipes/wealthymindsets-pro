# Garden 19 — Invention Census & Manifestation Certificates (§34 Final pre-build order)

Written 2026-10-06, 23:50–00:30 CDT, by the INVENTION CENSUS lane. **This pass was late:** the lane started at 23:51 CDT, after both the 22:15 census deadline and the 23:30 certificate deadline. Pass 1 edited no source. **Pass 2 (00:00–00:30 CDT Oct 7)** added 20 `G19.*` rows to `src/lib/canon/inventionCensus.ts` (the only source file this lane touched), took live serving receipts (§1f) and opened plates (§3a). The integrator committed pass 1 and the census rows in 2fc2346d.

## 0. What this is built from, and what it does NOT prove

| Source | Read | How much |
|---|---|---|
| Drive: CURRENT — WM Pro Complete Invention Registry & Surface Map (`1pC82nUdffKbfr60RTwbbXjNErRgj0gZKAqbPhEzvCvY`) | yes | all 1,511 non-empty lines, including the H-601/H-701 hard-hat refinement block (exactly 11 profile species, the delta evidence ladder, ABSORPTION ≠ EXHAUSTION) |
| Drive: CURRENT — Invention-to-Canvas Manifestation Map (`1pC6M1oktBGpcD5uVQW0ryW86i8eyBQHUeSAGLzWaX_s`) | yes | entire document |
| Drive: CURRENT VISUAL CANON plates (folder `1DFuPuMvggyKM6tyo5eVSNXCATu6YE4_i`, P110 `1CAmizH9OOCOum53CrhSGtPfjv4tZVtGQ`) | pass 1: no · pass 2: yes (see next rows) | plate names come from the `plate` column of `inventionCensus.ts` |
| Repo: `src/lib/canon/inventionCensus.ts` (81 rows), `src/lib/marketData/viewModels/selectProfileMenu.ts` (36 switches, `P110_ORGANISM`), `src/lib/chart/proofScene.ts`, `src/components/chart/MainChart.tsx` (26,914 lines; dataset receipts grepped), `src/lib/chart/{effortEvidence,marketBreathing,sessionBands,volumeTruth}.ts`, `docs/operations/GARDEN18-SUPER-ORDER-RECEIPT.md` | yes | targeted reads |
| LIVE serving `/charts` glass (claude-in-chrome, own tab, scene URLs) | **yes — pass 2, 2026-10-07 00:00–00:07 CDT** | wealthymindsetspro.com. NQ1!, SPY, EURUSD and BTC-USD on 5m. Hidden-window shim, then a 15–20 s wait, then `canvas.pointer-events-none` dataset read. Matrix in **§1f**. The §1a–1c "current" cells were written from source in pass 1. Where the serving glass disagreed, the cell now says so. Caveats: SPY was after hours, and CME was in the Asia session |
| Plates (pass 2) | yes, 9 opened | Drive thumbnails viewed in own tab: F06A (74), F15A (92), F05A (72), F03 Expected Envelope / Surprise (120), Contractor H-801, P110 Living Profile Stack, CLC Right of Way (63), Thesis Canvas (51). Also the Garden 18 PROPOSED SVGs P-05 (effort / response / exhaustion) and P-06 (full-canvas coverage), which are **proposals, not Founder-approved**. Grammar differences are noted per certificate in §3 |

Notes on the census columns:
- **Current manifestation vocabulary:** CANVAS-A (history across bars) · CANVAS-B (event marks only) · CANVAS-C (territory or relationship on price) · SELECTED-ONLY (one bar or object, by selection or cursor) · NUMBER-ON-CANVAS · PANE (a separate LW pane) · RAIL (WAIT-rail card or prose) · ROUTE · NOT BUILT.
- **Asset abbreviations:** S stocks · O options · F futures · FO futures-options · FX · C crypto.
  - "sided" means signed aggressor evidence.
  - F and C are venue-signed (tastytrade futures, crypto tape).
  - S stock sides are INFERRED (Lee–Ready).
  - FX has no central volume (`volumeTruth.ts` NO_CENTRAL_VOLUME). FX must read as TICK ACTIVITY or RELATED FUTURES EVIDENCE.
- **"(was #N)"** in the queue below refers to a row's census number in §1.

---

## 1. Census — every canonical invention

### 1a. CLASS A — continuous / bar-resolved (must express history across the candle field)

| # | Invention (id) | Owner | Evidence requirement | S/O/F/FO/FX/C | Current manifestation (source receipt) | GAP vs canon + Garden 19 |
|---|---|---|---|---|---|---|
| A1 | Bar delta (Registry §E "volume delta"; H-601/H-701 refinement: bar delta = ask-aggr − bid-aggr) | `MainChart.tsx` MICRO_DELTA block (no VM owner) | sided prints or candle bid/ask volume. FULL / PARTIAL / DEGRADED ladder | S(inferred) F C. O/FO only for options flow. FX: none | **NUMBER-ON-CANVAS, NEAR zoom only**: `dataset.nearBarDelta` = count of printed numerals, `NOT_NEAR:<depth>` otherwise. Stride-thinned (`nearBarDeltaStride`) | **Class A fails the number-erasure test.** Erase the numbers and nothing remains. At FAR and MID zoom the delta history is invisible. There is no grammar on the candle itself |
| A2 | Delta ratio (\|delta\| / volume) | none | same as A1 | same as A1 | **NOT BUILT** (no symbol in src) | canon formula exists; no carrier on any candle |
| A3 | Relative volume / participation intensity / RME (Registry §C participation sense; §AB RME) | volume histogram `MainChart.tsx:4251` + `volumeTruth.ts`; footer `chartVolumeFooterFact.ts` | bar volume vs a lawful baseline (same time-of-day or rolling median) | S F C O FO. FX = **TICK ACTIVITY** only | **PANE**: raw-volume histogram plus a footer number "Vol 68.92M". `volumeTruth` correctly withholds FX and placeholder volume | raw volume is a separate band, not bar-*relative*. Nothing on the candle carries "this bar was 3× normal". No RME symbol in src. **FX (corrected on serving, pass 2):** volume is silenced ("NO CENTRAL VOLUME · spot FX"), and a CME 6E related-flow line is BUILT (`fxRelatedFlow.ts`). Only the literal TICK ACTIVITY carrier is still missing |
| A4 | Buy / sell participation per bar — Flow Current (F06A.FLOW) | `MainChart.tsx` FLOW_CURRENT block | sided tape or candle bid/ask sides | F C S(inferred) | **LIVE: computed A, painted B.** NQ `BARS:180\|SHOWN:7`, SPY 49/13, BTC 33/12 (§1f) | pass 1 called this "closest to the law". Serving shows a lean floor (top 40% net, ≥20% one-sided) that silences 64–96% of bars. Garden 19 needs a subtle base on every sided bar, with the streak kept only for the strong ones. This folds into rank 2 |
| A5 | CVD relationship (Registry §C aggression; refinement "CVD / Delta relationship" plate required) | tape CVD pane `MainChart.tsx` CVD_PANE + `selectDeltaDivergence.ts` | sided tape; `cvdSides` INFERRED vs LABELLED | F C S(inferred) | **PANE** (`dataset.cvdSource`, `cvdBars`, `cvdSides`) plus Delta Divergence = **CANVAS-B** at two pivots | the relationship of CVD to price never reaches the candle. Agree/diverge per bar is unseen unless the user reads a second pane: **panel-erasure fail** |
| A6 | Effort / response per bar — Response Matrix (AB.MATRIX) | `src/lib/chart/effortEvidence.ts` `readResponseMatrix` | volume + range (bars alone). Sided evidence not required | all with volume. FX = tick-count proxy, labelled | **RAIL on serving** (`effortResponse` absent on all four symbols). In this worktree, **uncommitted** `src/lib/chart/effortResponseField.ts` plus a MainChart block "EFFORT → RESPONSE ACROSS THE CANDLES (Garden 19 §7)" paints an ivory displacement column inside each volume bar. Proof token `effortResponse`, receipt `DRAWN:N\|A\|I\|V\|Q\|L\|H` | the textbook Garden 19 failure on serving. The fix is in flight in the build lane, not yet deployed |
| A7 | Volatility / breathing state (F15.BREATHING) | `src/lib/chart/marketBreathing.ts` (`atrSeries` per bar) | OHLC only | all (FX lawful: no volume needed) | **RAIL**: state, phase, atrRatio, barsInState as a card | per-bar ATR series exists and is never painted. Panel-erasure fail |
| A8 | Regime state (H-901) | `selectRegimeLighting.ts` | bars; one breaker TREND / RANGE / TRANSITION | all | **CANVAS (lens)**: dims or caps fixtures for the CURRENT breaker over all bars in view | shows *the current value applied to all history*. Regime age and past transitions are not on the field. Registry lists Regime Age (§G) and regime transition (§P) |
| A9 | Structure state (intact / testing / deteriorating / failed / reclaimed — Registry §K) | `selectMarketStructure.ts` | bars (swings) | all | **CANVAS-B/C**: confirmed swing highs and lows, last of each loudest | swings paint; the per-leg *state* does not. BOS / reclaim events are not distinguished from pivots |
| A10 | Session state (Registry §C time/session) | `src/lib/chart/sessionBands.ts` | clock + venue session | F FX C (S, O: RTH / ETH) | **CANVAS-A**: `dataset.sessionBands` (ASIA / LONDON / NEW YORK floor bands), `sessionBandsNow` | built. The label-slide work landed in 7b7f914d. Session Age (§G) not carried |
| A11 | Imbalance state per bar (Registry §E imbalance) | `FootprintControls.tsx` imbalance mode; `selectStackedImbalance.ts` | sided per-price rows | F C (S inferred) | **CANVAS** only inside Footprint mode (`imbalanceRows`) or as stacked runs (`imbalanceRuns`, Class B) | outside Footprint the per-bar imbalance side is invisible. Needs a light continuous carrier at ordinary zoom |
| A12 | Clarity Candle (F05A) | `src/lib/chart/clarityCandle.ts` | OHLC | all | **CANVAS-A**: candle species (decisive body solid, indecision hollow) | built as a candle species. Live receipt pending |
| A13 | Clarity anatomy (F05B) | `selectClarityAnatomy.ts`; `MainChart.tsx` F05B block | OHLC + sides | all (split UNREAD without sides) | **SELECTED-ONLY**: `dataset.clarityOnPrice` `BAR:<t>\|D:..\|SPLIT:..` | correct: an inspect depth, not a field. No gap |
| A14 | Value Candle (F06.VALUE_CANDLE) | `selectValueCandle.ts` | per-bar volume-at-price | S F C | CANVAS (per bar in window) | plate needed. Live receipt pending |
| A15 | Temporal Evidence Density (F10.TED) + Clock / Structural / Event / Session / Regime Age | `effortEvidence.ts` `readTemporalEvidenceDensity` | volume across clock time | all with volume | **RAIL**: one TED line | time family §G is a FAMILY. Only TED exists, as one number. No age carrier on the field |
| A16 | Value migration (F09.MIGRATION) | `selectValueMigration.ts` | profile per bar | S F C | **CANVAS-A**: POC and value after every bar drawn across the candles | built; the only profile reading with true per-bar history |
| A17 | Profile per-bar contribution (H-601 "per-bar contribution") | profile row engine (`selectProfileMenu.ts` family) | volume-by-price | S F C | **NOT BUILT** (no symbol) | canon shared profile object; selecting a slice should light the bars that built it |

### 1b. CLASS B — event / state-change (only where it occurred; silence is data)

| # | Invention (id) | Owner | Evidence | S/O/F/FO/FX/C | Current (source receipt) | GAP |
|---|---|---|---|---|---|---|
| B1 | Absorption (H-701.ABS) | `selectAbsorptionAnatomy.ts` | high effort + near-zero displacement + passive hold; sided | F C (S inferred) | CANVAS-B: `dataset.absorption`; `dualAnatomy` `EVENTS:n\|BODIES:n` | H-701A market geometry. Verify that the 2026-09-24 "literal body" directive is SUPERSEDED by H-701A. Live receipt pending |
| B2 | Exhaustion (H-701.EXH) | `selectExhaustion.ts` | aggression drying; no defender required | F C (S inferred) | CANVAS-B (own switch since Garden 18 §XXI) | ABSORPTION ≠ EXHAUSTION is respected in the menu. Live receipt pending |
| B3 | Failed aggression (Registry §C/§E) | none | sided aggression + no follow-through | F C | **NOT BUILT** (no symbol in src) | named in the canon order-flow plate pack |
| B4 | Big Trades (F07A) | `src/lib/bigTradeLevels.ts`; bubbles in `MainChart.tsx` | single prints, size relative to the session | F C S O FO | CANVAS-B: `bigTradeBubbleCount`, `bigTradeClusters`, `bigTradeQuieted` | built. "No tick → no bubble" enforced |
| B5 | Delta bubbles (F06A.DELTA) | `src/lib/deltaBubbleLevels.ts` | sided | F C | CANVAS-B: `deltaBubblesDrawn` / `deltaBubblesQuiet` (Footprint mode) | built |
| B6 | Effort → Response mark (F06.EFFORT) | `src/lib/marketData/effortMarkGeometry.ts` + `selectEffortVsResult.ts` | volume + range | all with volume | **SELECTED-ONLY**: "the bar under your cursor" | an event class that paints *only where the cursor is*. Every qualifying bar in view should carry it; non-qualifying bars stay silent |
| B7 | Stacked imbalance (F06.STACK) | `selectStackedImbalance.ts` | sided rows | F C | CANVAS-B: `imbalanceRuns`, `imbalanceRunWords` | `imbalanceRunWords` — check label-erasure |
| B8 | Delta divergence (F06.DIV) | `selectDeltaDivergence.ts` | CVD + swings | F C S(inf) | CANVAS-B: 2 pivots | fine as an event. Its continuous parent is A5 |
| B9 | Regime transition | `selectRegimeLighting.ts` | breaker change | all | **NOT BUILT** as a mark | see A8 |
| B10 | Structure break / reclaim (body-close BOS) | `selectMarketStructure.ts` | bar closes | all | not distinguished from pivots | see A9 |
| B11 | CLC family: Wick Test · Weak Close · Clean Close · +Volume · +CVD Agreement · Break-and-Hold · Failed Hold · Reclaim · Rejection | none | close vs a lawful level, + volume / CVD | all (CVD legs F C) | **NOT BUILT** (no symbol in src) | Manifestation Map §13: "CLC IS A FAMILY". It is wholly absent |
| B12 | Order Flow Compression (F06.COMPRESSION) | none | sided + range | F C | **NOT BUILT** (census `gap`) | |
| B13 | Market Surprise / Absence-as-Evidence (§L) | `selectExpectedEnvelope.ts` (host) | observed vs expected response | all | NOT BUILT as marks. The envelope is C | |
| B14 | Causal marks: Force → Response, Unpaid Debt (F04A) | `selectPrintResponse.ts` | selected print | F C S | SELECTED-ONLY (by design, one selected event) | correct (inspect depth) |
| B15 | Liquidity lifecycle events (F08A) | `selectLiquidityLifecycle.ts` | volume pools from bars / book | all with volume | CANVAS: pools with appeared / touched / consumed states | full book pull/refill is PARTIAL without depth (Map §8) |
| B16 | Memory interaction (Profile Memory tests, F03A ghost) | `selectProfileMemory.ts`, `selectMemoryGhost.ts` | prior sessions | all | CANVAS (shelves; ghost ≤0.18 opacity target) | test marks: verify live |
| B17 | Wall test / break (Brick Walls) | `selectProfileMenu.ts` BRICK_WALLS / `selectOptionsBarrierEvidence.ts` | options OI (Cboe delayed; Deribit for BTC / ETH — INFERRED) | S O F FO C(BTC/ETH) | CANVAS-C+B: bricks, cracks at observed tests, breach / scar; `optionsOiWalls` | Garden 18: canvas receipt never read (hidden tab) |

### 1c. CLASS C — territory / relationship (on price, never a badge)

| # | Invention | Owner | Evidence | S/O/F/FO/FX/C | Current (source receipt) | GAP |
|---|---|---|---|---|---|---|
| C1–C11 | **The eleven profile species**, exactly: 1 Living (`selectLivingProfile.ts`) · 2 Structure (`selectStructureProfile.ts`) · 3 Fusion (`selectProfileFusion.ts`) · 4 Memory (`selectProfileMemory.ts`) · 5 DNA (`selectProfileDna.ts`) · 6 Session (`SESSION`) · 7 Visible Range (`selectVisibleRangeProfile.ts`) · 8 Fixed Range (`ANCHORED_RANGE`) · 9 Composite (`selectCompositeProfile.ts`) · 10 TPO (`selectTpoProfile.ts`) · 11 Bid/Ask Split (`DELTA_VP`) | `P110_ORGANISM` in `selectProfileMenu.ts` numbers them 1–11 | volume-by-price via one row engine. #11 needs sided evidence. TPO needs bars only | S F C O. FX: TPO only (volume profiles must withhold) | CANVAS-C. Receipts: `profileStackLeft`, `vpSpan`, `vpSessionWindow`, `vpSessionContour`, `vpRowNumbers` | count is correct (11). `FIXED_RANGE` ("Classic VP · all loaded bars"), `VALUE_MIGRATION` and `VALUE_CANDLE` sit beside them unnumbered. The menu says they are not species. **Hold that line: do not let "Classic VP" read as a 12th species.** `vpRowNumbers` raises a number-erasure question (row numerals on profile rows). Per-bar contribution (A17) missing. Fusion close test (overlap gate, unfuse, originals inspectable) not live-proved |
| C12 | Call Wall / Put Wall (separate) | `selectOptionsBarrierEvidence.ts` (`callWalls`, `putWalls` are distinct arrays) | options OI per strike | S O F FO C(BTC/ETH) | CANVAS-C ticks (`optionsOiWalls`) | Call ≠ Put is kept in data. Live receipt still missing |
| C13 | Gamma / zero-gamma front / pressure field (F15.PRESSURE) | `selectDerivativesPressure.ts` (`zeroGamma`) | dealer-position inference (INFERRED) | S O F FO C(BTC/ETH) | CANVAS-C: `derivativesPressurePainted` | Gamma is kept distinct from walls. INFERRED label must survive phone |
| C14 | Liquidity Weather (F08B) | `selectLiquidityWeather.ts` | size-to-move from bars / book | all with volume | CANVAS lens (heat bands) | opacity must keep wicks readable |
| C15 | Delta Levels (F06.DLEVELS) | `selectDeltaLevels.ts` | sided rows | F C | CANVAS-C | needs plate |
| C16 | VWAP (+ anchored) | `MainChart.tsx` `computeVWAP` (Indicators panel) | volume | S F C. FX none | line via the Indicators panel only (`ind=`) | not a Tools sense. No Inspect identity. Fine as an indicator. Anchored VWAP (§I "VWAP anchor") NOT BUILT |
| C17 | Expected Envelope (H-801) | `selectExpectedEnvelope.ts` | prior sessions | all | CANVAS-C | Surprise marks missing (B13) |
| C18 | MTF Ancestry (F10) | `selectMtfAncestry.ts` | resampled bars | all | CANVAS-C (4H body, 1H node, PDH / PDL) | Daily = blue, 4H = orange, 1H = yellow, premarket = purple is lineage only. Fine |
| C19 | Market Object + Passport (F11A / B) | `selectStructureZoneObjects.ts`, `selectMarketObjectPassport.ts` | bars | all | CANVAS-C + SELECTED inspect | — |
| C20 | Risk on Price (H-1001) | `selectRiskOnPrice.ts` | user position | all | CANVAS-C | — |
| C21 | Contradiction (H-401) | `selectContradiction.ts` | ≥2 families at price | all | CANVAS-C (both truths paint) | — |
| C22 | Memory Ghost (F03A) | `selectMemoryGhost.ts` | analogue | all | CANVAS (behind price) | opacity ≤0.18 to verify live |
| C23 | Cross-market relationship (Registry §C cross-market; benchmark alignment §AD) | `src/lib/chart/fxRelatedFlow.ts` (FX leg only) | related instrument bars / prints | FX (6E / 6B / 6J), others none | **PARTIAL on serving**: a words line "CME 6E flow · related, not spot · 5m signed Δ" (owner-only per e7ace4e1) | the FX leg exists as words beside the chart. General benchmark alignment (SPY/QQQ/IWM, futures↔equity) NOT BUILT. Census row `G19.CROSS` is now PARTIAL with this owner (00:16) |
| C24 | FVG / opening range / PDH-PDL / premarket H-L / order blocks as MarketObject readings (§I) | `selectStructureZoneObjects.ts` (partial) | bars | all | partial (zones). Not individually audited | audit in the next pass |

### 1d. Not candle-field classes (lens, protocol, inspector, room, internal) — listed so nothing is silently dropped

| id | Name | Status (census) | Surface |
|---|---|---|---|
| F01 / F01.CHART_INTEGRITY | Fidelity five · honesty plaque | BUILT | context chip / WAIT rail |
| H-101 | Evidence Debt / WAIT finished | BUILT | WAIT rail (`debtTag*`) |
| H-301 | Evidence Lineage | BUILT | WAIT rail |
| H-501 / F13.LENS / F13.SCAFFOLD / S-501 | Semantic Zoom · Question Lens · Scaffolding · Attention Governor | BUILT | camera (`semantic*`, `questionLensForm`, `scaffolding`, `attention*`) |
| F06A.BIDASK / IMB / AGGPAS / VOL, F06B, F07B, F06.ANATOMY | Footprint modes · Raw Tape Inspect · Cluster→Response · Anatomy Cards | BUILT | Footprint / Inspect / switch |
| F10.REPLAY, F14.HEAT, F14.ARCHIVE, F18, F18.EXPR, F20, F20.EDGE, F21, F22, F23, ROOM.BACKTEST, ROOM.SCANNER | rooms and protocols | BUILT | routes / context |
| AB.TWIN, AB.PERCEPTION, AB.COMPARATIVE, AB.GRAVITY, AB.DECAY | §AB named | NOT_BUILT | — |
| F02, F25, F26 | Hive · Vault · Chaos Gym | INTERNAL | never consumer |
| Registry names with **no census row** (UNKNOWN disposition, must be reconciled, not deleted) | CLC family (B11) · Failed Aggression (B3) · Delta Ratio (A2) · RME (A3) · Market Surprise / Absence-as-Evidence (B13) · Cross-market (C23) · Anchored VWAP (C16) · Clock / Structural / Event / Session / Regime Age (A15) · Temporal Lens / Adaptive / Structural / Event Time / Temporal Sync / Horizon · Strategy playbooks (Trending, Mean-Reversion, Pullback Continuation, Breakout Retest, Failed Auction, NO TRADE) · setup grade A+…No Trade · Profile stack controls (reorder, width, lock, Auto Arrange, Save My Stack, presets) · Accessible Narrator, haptic/non-color grammar | — | `inventionCensus.ts` should gain these rows |

### 1f. LIVE serving receipts — pass 2 (2026-10-07 00:00–00:07 CDT, `/charts?…&tf=5m&scene=clean&on=<group>&r=g19*`)

Values are the `canvas.dataset` key named in the first column. — means the key was absent on that run.

Load groups:
- **(1) order flow:** FlowCurrent, ClarityCandle, ValueCandle, ImbalanceStack, DeltaDivergence, DeltaLevels, EffortMark, absorptionAnatomy, effortResponse, AnatomyCards, LiquidityWeather, LiquidityLifecycle, fp:big-trades, plus `ind=Tape CVD`.
- **(2) profiles:** LivingProfile, StructureProfile, ProfileFusion, ProfileMemory, ProfileDna, sessionVP, VisibleRangeProfile, CompositeProfile, TpoProfile, ValueMigration, fixedVP.
- **(3) readings:** RegimeLighting, MarketStructure, MtfAncestry, MemoryGhost, ExpectedEnvelope, Contradiction, DerivativesPressure, BrickWalls, QuestionLens, sessionBands, RiskOnPrice.

For EURUSD and BTC-USD, groups (2) and (3) ran as one load.

| Switch / receipt | NQ1! 5m | SPY 5m (after hours) | EURUSD 5m | BTC-USD 5m | Class verdict |
|---|---|---|---|---|---|
| FLOW_CURRENT `flowCurrent` | BARS:180\|SHOWN:7 | BARS:49\|SHOWN:13 | NO_SIDED_TAPE | BARS:33\|SHOWN:12 | **A computed, B shown.** Every sided bar is measured, but only bars in the top 40% net and ≥20% one-sided draw (owner comment above `let flowShown`). 4–36% of bars carry it. Fails Garden 19 Class A ("most / all visible bars") |
| CLARITY_CANDLE `clarityCandle` | DRAWN:180bars | DRAWN:114bars:46gaps | DRAWN:152bars | DRAWN:152bars | A — passes (every bar) |
| VALUE_CANDLE `valueCandle` | DRAWN (GLASS_PER_BAR:5) | UNMEASURED | UNMEASURED | DRAWN | A, limited to sided bars (5 on NQ) |
| IMBALANCE_STACK `imbalanceStack` | DRAWN (RUNS:1\|BARS:5) | UNMEASURED | UNMEASURED | NO_STACK (RUNS:10 measured) | B — correct silence |
| DELTA_DIVERGENCE | DRAWN (lean DOWN) | UNMEASURED | UNMEASURED | DRAWN | B |
| DELTA_LEVELS | DRAWN (RIGHT_EDGE lane) | NO_MEASURED_GRID | NO_MEASURED_GRID | DRAWN | C |
| EFFORT_MARK `effortMark` | ORDINARY:PROPORTIONATE | ORDINARY:UNREMARKABLE | UNREAD | ORDINARY:UNREMARKABLE | **one bar only** (the subject bar's verdict) — confirms B6 |
| absorption `absorption` / `absorptionTerrain` | MEASURED_NO_ZONES / LATEST_VISIBLE_30, ABSORBING:2 | DRAWN / ABSORBING:1 | UNMEASURED | DRAWN / ABSORBING:7 | B over a 30-bar window |
| EXHAUSTION `exhaustion` | OFF | OFF | — | OFF | **no proof token**: `wm_exhaustion` is not a `PLAIN_TOGGLE` in `proofScene.ts`, so a scene URL cannot turn it on. Not URL-provable |
| Effort→Response field `effortResponse` | — | — | — | — | **absent on serving**. The build lane has it uncommitted (see §2 rank 1) |
| Tape CVD pane `cvdSource` / `cvdSides` | BAR_SIDES:4974+TAPE / LABELLED | BAR_SIDES:3010 / LABELLED | REFUSED | TAPE / LABELLED | PANE — confirms A5 panel-erasure gap |
| per-bar delta `nearBarDelta` | NOT_NEAR:MID | NOT_NEAR:MID | NOT_NEAR:MID | — | numbers withheld at MID — confirms A1 (nothing on the field at normal zoom) |
| Big Trades `bigTradeBubbleCount` | 26 (1 cluster) | 0 · WAITING_FOR_PRINTS | NO_EXECUTIONS | 140 | B — correct silence on SPY / FX |
| LIQUIDITY_WEATHER | DRAWN (lens PARTIAL) | DRAWN | UNMEASURED | DRAWN | C lens |
| LIQUIDITY_LIFECYCLE basis | CANDLE_ESTIMATED; refused PULLED (no-book) | CANDLE_ESTIMATED | NO_VOLUME | APPEARED×3 | B. Pull is honestly refused without depth |
| LIVING_PROFILE (+fidelity) | DRAWN · TRADE_BASED | DRAWN · CANDLE_ESTIMATED | NO_PROFILE | DRAWN · TRADE_BASED | C. FX silent (correct) |
| STRUCTURE_PROFILE | DRAWN · RULE_SHORT_LEG, rows 0 | DRAWN · RULE_SHORT_LEG | DRAWN · rows 0 (anchor rule only) | DRAWN | C. Short-leg rule only on all four; no histogram measured this pass |
| PROFILE_FUSION object | DRAWN 3 zones · object REFUSED:UNIT_MISMATCH | REFUSED:TIME_OVERLAP | NO_AGREEMENT | REFUSED:UNIT_MISMATCH | C. Overlap gate is active; a fused object was never minted on any symbol (Fusion close test still OPEN) |
| PROFILE_MEMORY | 4/15 shown | 4/15 | NO_MIGRATION | DRAWN | C |
| PROFILE_DNA | MEASURED · shape P | MEASURED · P | LIVING_PROFILE_NOT_DRAWN | MEASURED | C (spine) |
| SESSION VP `vpSessionWindow` | GLOBEX_DAY, vpDrawn 2 | US_EQUITY_ETH, 2 | vpDrawn 0, declined 1 | vpDrawn 1 | C |
| VISIBLE_RANGE / COMPOSITE / TPO | DRAWN / DRAWN (5 sessions) / DRAWN | DRAWN / DRAWN / DRAWN | NO_VOLUME / NO_VOLUME / **DRAWN** | DRAWN ×3 | C. FX: TPO is the only lawful profile, and it draws |
| VALUE_MIGRATION | DRAWN 4942 pts | DRAWN 4772 | NO_VOLUME | DRAWN | **A — passes** (history across the field) |
| REGIME_LIGHTING | RANGE · COMPRESSION · fixtures 89 | NO_BREAKER · UNKNOWN | NO_BREAKER | RANGE · COMPRESSION | **current breaker only**, no history — confirms A8 |
| MARKET_STRUCTURE | DRAWN, 12 pivots, bias RANGE | DRAWN 12 | DRAWN | DRAWN | B/C — pivots only; leg state absent (A9) |
| MTF_ANCESTRY | PDH + 4H band + 1H node | same | PDL + 4H | PDL + 4H | C |
| MEMORY_GHOST | DRAWN 0.88 | DRAWN 0.87 | DRAWN 0.94 | NO_ANALOGUE | C. `0.88` is the match score, not opacity. Opacity ≤ 0.18 not verified |
| EXPECTED_ENVELOPE `expectedEnvelopeSurprise` | UP 10/10 · INSIDE | UP 1/10! · **ABOVE:1/9** | UP 5/5 · DN 2/5! | TOO_FEW_SESSIONS | C. **A surprise state already exists** (`ABOVE`); there is no mark on the live event (see C-15) |
| CONTRADICTION | NOT_ENOUGH 0/0 | NOT_ENOUGH 1/0 | NOT_ENOUGH | UNRESOLVED 1/2 | C |
| DERIVATIVES_PRESSURE | DAMPING 0.38 · ZG NONE · walls 31500/31520 TESTED | DAMPING 0.28 · ZG 774.64 | SILENT:UNSUPPORTED | DAMPING 0.23 · ZG 81009.68 | C. Gamma kept separate from walls |
| BRICK_WALLS / `optionsOiWalls` | ON:2 · CALL_OI@31450,31500 · PUT_OI@31450,31500 (NDX→NQ index-mapped) | ON:2 · CALL 785,800 · PUT 725,745 | SILENT:NO_CHAIN | ON:2 · CALL 90000,95000… | **C — Call ≠ Put ≠ Gamma holds on serving**. First serving receipt for `optionsOiWalls` (open since Garden 18) |
| QUESTION_LENS | NO_QUESTION (rail) | ABSORPTION:3 | — | — | lens |
| sessionBands | DRAWN A1\|N1 | DRAWN A1\|L1\|N1\|O1 | DRAWN | DRAWN | A — passes |
| RISK_ON_PRICE | NO_POSITION_DRAWN | NO_POSITION_DRAWN | — | — | correct silence |
| DELTA_VP (#11) · ANCHORED_RANGE (#8) | not URL-provable — both are drag tools (`drawingTool === "delta-vp"` / `"anchored-vp"`) | | | | needs a hands-on drag receipt |
| FX volume words (page text) | — | — | "NO CENTRAL VOLUME · spot FX" + **"CME 6E flow · related, not spot · 5m signed Δ +9"** | — | **RELATED FUTURES EVIDENCE is BUILT** (`src/lib/chart/fxRelatedFlow.ts`, e7ace4e1). The literal "TICK ACTIVITY" word appears nowhere. Pass 1's A3 FX gap is narrowed accordingly |

### 1g. Serving check for 2fc2346d (ranks 1 + 2)

**NOT LIVE as of 00:30:40 CDT.** `/api/build-identity` still served `7b7f914`; polled every 30 s from 00:20 to 00:30.

Check runs on 2fc2346d:
- One `Workers Builds: wealthymindsets-pro` run reads **completed · failure**, and a second run with the same build ID reads in_progress.
- `typecheck · sentinels · build` reads failure. The Sentinels workflow has also failed on the four previous `main` commits, so that one is pre-existing.

The `effortResponse`, `responseCells` and `barDeltaKeels` serving receipts are therefore still owed. Take them on the four symbols once the build serves:
`/charts?symbol=<S>&tf=5m&scene=clean&on=effortResponse,deltaKeel&r=<rand>`

Paint budget on NQ1! group 1: `paintBudgetMet:MET`, mean 4.9 ms, longest 10.8 ms over 89 frames.

### 1e. Garden 19 gap summary

- **Class A, current value or panel number only — no history across the candles:**
  - A1 bar delta: numbers, at NEAR zoom only.
  - A2 delta ratio: not built.
  - A3 relative volume: raw pane plus footer number.
  - A5 CVD relationship: a separate pane.
  - A6 Response Matrix: computes per bar, shows counts.
  - A7 Market Breathing: rail card.
  - A8 Regime: current breaker only.
  - A9 Structure state: not carried.
  - A11 Imbalance state: Footprint-only.
  - A15 TED and the age family: one rail number.
  - A17 Profile contribution: not built.
- **Class B painting where it should not, or not where it should:**
  - No Class B was found painting on every candle.
  - The inverse failure: B6 Effort Mark paints only on the cursor bar instead of every qualifying bar.
  - B3, B9, B10, B11, B12 and B13 are absent.
- **Class C shown as a badge:** none found in source. All profiles, walls and gamma are on price.
  - `vpRowNumbers` and `imbalanceRunWords` need the label-erasure test live.
- **Erasure tests (source judgement only):**
  - number-erasure fails A1.
  - panel-erasure fails A5, A6, A7 and A15.
  - FX label law fails A3 (silence is right, but TICK ACTIVITY / RELATED FUTURES EVIDENCE is never offered).

---

## 2. Ranked BUILD QUEUE (top 15) for the chart build lane

Ranking: Class A history gaps whose evidence already exists come first (cheapest pixels, biggest law violation). Then Class B inversions and absences. Then relationships.

| Rank | Invention | Class | Grammar to implement (one line) | Owner file(s) |
|---|---|---|---|---|
| 1 | **Response Matrix on the field** (AB.MATRIX, was A6) | A | 3-px floor tick under every bar, coloured by its cell. ABSORBED = amber, INITIATIVE = side ink, VACUUM = hollow outline. QUIET and ORDINARY stay silent | `src/lib/chart/effortEvidence.ts` (expose `cells[]` per bar) → new paint block in `MainChart.tsx` |
| 2 | **Bar delta keel + delta ratio** (was A1, A2) | A | signed hairline keel on the candle's close-side body edge. Length ∝ delta ratio (cap = ½ body width). Opacity by evidence class: FULL 0.55, PARTIAL 0.30 dashed, DEGRADED / none silent. Numerals move to Inspect | new `src/lib/marketData/viewModels/selectBarDelta.ts`. `MainChart.tsx` MICRO_DELTA block becomes the keel painter |
| 3 | **Relative volume weight** (RVOL / RME, was A3) | A | **[REVISED §3a: tone on the volume bar, not the body]** ~~candle body fill-opacity 0.55 → 1.0 by RVOL percentile vs same-time-of-day. FX: no weight, and the footer reads `TICK ACTIVITY` (or `RELATED FUTURES EVIDENCE · 6E` when C23 exists) | new `src/lib/chart/relativeVolume.ts` + `volumeTruth.ts` + `chartVolumeFooterFact.ts` |
| 4 | **Market Breathing ribbon** (F15.BREATHING, was A7) | A | ±0.5·ATR translucent ribbon hugging the closes. It narrows and tightens in COMPRESSED and widens in EXPANDED. Ink only on state-change bars; elsewhere 0.08 opacity | `src/lib/chart/marketBreathing.ts` (export the per-bar state series) → `MainChart.tsx` |
| 5 | **Effort Mark on every qualifying bar** (F06.EFFORT, was B6) | B | existing mark geometry drawn on every bar in view whose verdict ≠ ORDINARY. Silence elsewhere. The cursor only raises emphasis | `src/lib/marketData/effortMarkGeometry.ts`, `selectEffortVsResult.ts` (run over the window) |
| 6 | **CVD ⇄ price relationship on the candle** (was A5) | A | agreement draws nothing. On a bar where the CVD slope opposes the body direction, draw a hollow notch on the wick tip. INFERRED sides render the notch dashed. The pane stays optional | `selectDeltaDivergence.ts` (per-bar agreement) + tape CVD block in `MainChart.tsx` |
| 7 | **Regime history floor + transition marks** (H-901, was A8 + B9) | A+B | **[REVISED §3a: F15A state-level trace + present chip]** ~~2-px floor band of regime per bar (TREND / RANGE / TRANSITION tint at 0.12). A vertical hairline plus a ⓘ-able tick only where the breaker changed. Regime age goes in Inspect | `src/lib/marketData/viewModels/selectRegimeLighting.ts` (per-bar breaker series) |
| 8 | **CLC family** (was B11) | B | **[BLOCKED §3a: no usable plate]** at a bar closing against a lawful level: a glyph at the close. Wick Test = open tick, Weak Close = half-fill, Clean Close = solid, +Vol = ring, +CVD = double ring, Break-and-Hold / Failed Hold / Reclaim / Rejection as a connector to the level | new `src/lib/marketData/viewModels/selectClcStates.ts` (levels from `selectStructureZoneObjects.ts`) |
| 9 | **Failed Aggression** (was B3) | B | short arrow from the aggression-peak price toward the close, ending in a stop bar, at the bar where sided aggression got no follow-through within N bars. Silence otherwise | new `selectFailedAggression.ts` (reads the same tape rows as `selectExhaustion.ts`) |
| 10 | **Structure state per leg + BOS / reclaim** (was A9 + B10) | A+B | each swing leg carries a baseline: solid = intact, dashed = testing, dotted = deteriorating, grey = failed. Body-close BOS gets a chevron at the breaking close; reclaim gets a return chevron | `selectMarketStructure.ts` |
| 11 | **Imbalance state outside Footprint** (was A11) | A | **[REVISED §3a: F06A BID/ASK slabs across the bars where it held]** ~~1-px side-coloured tick at the dominant imbalance row of each bar (ordinary zoom). The full cells stay in Footprint mode | `selectStackedImbalance.ts` (per-bar strongest row) |
| 12 | **Order Flow Compression** (F06.COMPRESSION, was B12) | B | bracket spanning compressed bars (narrowing range + shrinking aggression) that closes at the release bar | new `selectOrderFlowCompression.ts` |
| 13 | **TED + age family on the time axis** (F10.TED, was A15) | A | time-axis density strip under the bars (evidence concentration). Session Age and Regime Age go in Inspect, not in the strip | `src/lib/chart/effortEvidence.ts` (`readTemporalEvidenceDensity` per bar) |
| 14 | **Profile per-bar contribution** (H-601, was A17) | A↔C | selecting a profile slice lights the bars whose volume built it (others dim to 0.35). Selecting a bar lights its rows on every switched-on profile | shared row engine in `selectProfileMenu.ts` family + selection in `MainChart.tsx` |
| 15 | **Market Surprise / Absence-as-Evidence** (H-801, was B13) | B | **[REVISED §3a: H-801 flag on the live event]** ~~when price exceeds the envelope band, an open circle where it pierced; when the expected response is absent at a tested envelope edge, a dotted ring at that bar. Silence otherwise | `selectExpectedEnvelope.ts` |

---

### 2a. Queue changes after pass 2 (live + plates)

**Update 00:10 CDT:** the integrator committed and pushed **2fc2346d** "Garden 19 batch: Effort→Response inside each volume bar + Bar Delta Keel". It carries:
- `src/lib/chart/effortResponseField.ts` — rank 1. Receipts `effortResponse` and `responseCells`; proof token `effortResponse`.
- `src/lib/chart/barDeltaKeel.ts` — rank 2. Receipt `barDeltaKeels`; proof token `deltaKeel`; signed evidence only, hollow = aggression failed to displace, FX silent.
- this census's 20 `G19.*` rows.

The §1f serving receipts were taken *before* that deploy, so both ranks read absent there. Their serving receipts are taken in §1g once the build is live.

- **Rank 1 (Response Matrix field) is IN FLIGHT.** The build lane's uncommitted `effortResponseField.ts` uses a different grammar from the one proposed here. It puts an ivory displacement column *inside each volume bar* (the volume bar is the effort). ABSORBED bars get a hairline lid. "Response with no fuel" climbs out of a short volume bar, drawn hollow. Old bars are aged quieter; the forming bar is never drawn.
  - That matches the PROPOSED P-05 plate (effort bars paired with response, "EFFORT ↑ / DISPLACEMENT ↓" box) better than the floor tick in C-01.
  - **C-01 now defers to that implementation.** Its receipt is `effortResponse=DRAWN:N…`.
  - To close it, the build lane must deploy it, and the four-symbol receipt in §1f must flip from absent.
- **Rank 2 now also owns Flow Current's coverage gap.** Serving paints 4–36% of sided bars (§1f). The keel is the every-bar base; the Flow streak stays as the emphasis.
- **Rank 3 FX leg is narrower.** RELATED FUTURES EVIDENCE (6E line) is built. Only the TICK ACTIVITY word and the RVOL body weight remain.
- **Rank 7 grammar follows plate F15A.** See C-07.
- **Rank 8 (CLC) has no usable plate.** See C-08. A Founder plate is required before build.
- **Rank 11 grammar follows plate F06A.** See C-11.
- **Rank 15 grammar follows Contractor H-801 and plate 120.** See C-15.
- **New open item: Exhaustion has no proof-scene token** (`wm_exhaustion` is not in `PLAIN_TOGGLES`), so it cannot be URL-proved. DELTA_VP (#11) and ANCHORED_RANGE (#8) are drag tools and need a hands-on receipt.

## 3. Certificates (top 15)

### 3a. PLATE ⇄ GLASS per certificate (pass 2)

| Cert | Governing plate opened | What the plate draws | Serving glass now (§1f) | Grammar difference → instruction to the build lane |
|---|---|---|---|---|
| C-01 Response Matrix | P-05 *PROPOSED* `05-effort-response-exhaustion.svg` | a row of paired effort bars under the candles; a gold "EFFORT ↑ / DISPLACEMENT ↓" box over the run where effort rose and price stalled; gold dots where follow-through weakened. Footer: "CANDIDATE · PARTIAL", "no order-book defense claim" | rail card only; `effortResponse` absent | the in-flight volume-bar column is closer to P-05 than my floor tick. **Adopt it.** Add P-05's span box over consecutive ABSORBED bars (Class B on top of the A field). Keep "CANDIDATE" wording in Inspect |
| C-02 Bar delta keel | F06A (74) "Order flow lives on price" | delta / imbalance read as price-band slabs under candle runs, plus labelled EFFORT / RESULT arrows at events. **No per-candle delta numerals anywhere** | numerals at NEAR only; Flow Current on 4–36% of bars | the plate rejects numerals on the field, which agrees with the keel. It adds no per-bar keel of its own, so the keel is WM's Garden 19 extension and needs Founder confirmation. Keep it subordinate (≤0.55) so F06A's slabs stay the louder form |
| C-03 RVOL weight | F05A (72) Clarity default language | candles in one ink family. Selected candle callout: BODY EFFICIENCY 78% · WICK INTENT · TRUTH GAP. Hollow squares mark notable candles | Clarity DRAWN on all bars; volume is a raw histogram | the plate's candle-body language belongs to Clarity. **Do not modulate body opacity by RVOL, or it fights Clarity's solid / hollow law.** Revised grammar: RVOL weight on the **volume bar** (already the effort owner per the effortResponse block) as percentile tone, never on the candle body. Revised C-03 accordingly |
| C-04 Breathing ribbon | none in folder (Garden 18 PROPOSED text plate only) | — | rail card | **Founder plate needed.** Building the ribbon is permitted as Class A under Garden 19, but mark it PROPOSED |
| C-05 Effort Mark all bars | P-05 *PROPOSED* | events marked only where effort rose and displacement fell. Exhaustion is separate and "does not invent a defender" | `effortMark` = one subject-bar verdict | agrees: qualifying bars only, with silence elsewhere. P-06 *PROPOSED* adds: "No event on a candle is different from missing tape", so before the tape-coverage boundary, draw the coverage line, never "no event" |
| C-06 CVD notch | none ("CVD / Delta relationship" plate is required by the registry and absent from the folder) | — | separate pane | **Founder plate needed.** The notch is a proposal |
| C-07 Regime history | F15A (92) "Regime decides which geometry may speak" | **a continuous state-level line across time** through three horizontal zones (BALANCE / TRANSITION / WAIT), with one "UNRESOLVED CHIP" at the present point | one breaker for all bars in view (`RANGE · COMPRESSION`), no history | change the C-07 grammar from a coloured floor band to the **plate's state line**: a 1-px level trace in a thin strip (zones as faint bands), plus the present-point chip. Transition = the trace crossing the threshold, not a vertical hairline |
| C-08 CLC | CLC Right of Way (63), outside the visual-canon folder | a **legal "right of way" evidence / missing-items panel** (deeds, easements, court order). Not a market drawing | not built | **plate unusable** (off-topic). Its only transferable idea is "evidence list + missing items", which is the WAIT-rail debt grammar, not a candle mark. **Block the build until a Founder CLC market plate exists.** Keep it NOT_BUILT |
| C-09 Failed Aggression | none | — | not built | Founder plate needed. The registry plate pack names it |
| C-10 Structure state | Thesis Canvas (51) | text cards only (Regime · Direction · Structure "Breakout attempt forming. Higher highs need confirmation"). No geometry | pivots + labels (12/12) | the plate is prose. Under Garden 19 the panel-erasure rule wins, so the leg-baseline grammar stands as a proposal. Founder plate needed |
| C-11 Imbalance state | F06A (74) | **BID IMBALANCE / ASK IMBALANCE as stacked translucent horizontal slabs spanning several candles at price** (green under the up-leg, red at the top), plus an ABSORPTION SHELF slab | Footprint-only cells; stacked runs as B (`imbalanceStackBars RUNS:1`) | **replace the per-bar 1-px tick with the plate's slabs.** Each imbalanced price row extends as a slab across the consecutive bars where it held, at 0.25–0.4 opacity, green for bid and red for ask. This is the plate's own manifestation; the tick was my invention |
| C-12 OF Compression | none | — | not built | Founder plate needed |
| C-13 TED strip | none | — | rail line | Founder plate needed. The TED definition is still Founder-gated |
| C-14 Profile contribution | P110 Living Profile Stack | three profile bodies side by side (grey history, gold living); POC dot; VAH / VAL / POC rules **run across into the candles**; no bar highlighting | profiles DRAWN with row chips | the plate does not draw contribution. Keep C-14 selection-only (no idle paint), so the P110 silhouette is unchanged at rest |
| C-15 Market Surprise | Contractor H-801 + plate 120 | H-801: a **"SURPRISE" flag on a pole at the live event**, "SURPRISE IS MARKED ON THE LIVE EVENT", "CAMERA STAYS ON NOW"; ghost analogue session behind. 120: a graduated percentile fan from now forward, plus a "MARKET SURPRISE →" tag; the card reads "Seller aggression ↑ · displacement unusually weak vs similar OR" | `expectedEnvelopeSurprise` = INSIDE / **ABOVE:1/9** (state exists), no mark | change the C-15 grammar from an open circle to the **plate's flag-on-pole at the event bar**, driven by the existing `expectedEnvelopeSurprise` state. The plate's surprise is also *response-based* (aggression vs displacement), which links it to C-01 cells |



Field order follows §28. Shared defaults (apply unless a certificate overrides them):
- **TYPOGRAPHY:** no text on the field. Words appear only in Inspect / ⓘ, in house MARKET_SANS.
- **MOTION:** none except at the forming bar, which updates in place; no animation on history.
- **SELECTION:** click the mark → selects the bar (`select=bar`) → Inspect.
- **WISDOM/NOTE:** no prose card on canvas. A ⓘ line in Tools says what the mark asks.
- **PROOF:**
  - desktop 1440, tablet 834, phone 390 / 360, with `/charts?symbol=<S>&tf=<TF>&scene=clean&on=<TOKEN>&r=<rand>` and the named dataset receipt;
  - performance under `SESSION_BANDS_BUDGET_MS`-style budget (≤1.5 ms/frame per layer);
  - **all four erasure tests** must pass: erase labels, numbers, panels and the mobile card, and the market must still show the reading.

### C-01 Response Matrix on the field
- **NAME:** Response Matrix (AB.MATRIX).
- **MARKET QUESTION:** did this bar's effort buy movement?
- **EVIDENCE:** bar volume and range, ranked against the window median (`EVIDENCE_MIN` 30).
- **TRUTH CLASS:** DERIVED from CanonicalBar; FX = tick count, labelled.
- **MANIFESTATION:** A.
- **PHYSICAL GRAMMAR:** a 3-px floor tick under each bar.
- **STATE GRAMMAR:** ABSORBED solid amber, INITIATIVE side ink, VACUUM hollow; QUIET and ORDINARY draw nothing.
- **CANDLE RELATIONSHIP:** below the low, never touching the wick.
- **COLOR:** amber `--absorb`; buy / sell inks from `flowColorsRef`.
- **OPACITY:** 0.35–0.7.
- **ⓘ:** "Volume high, range small = absorbed…".
- **INSPECT DEPTH:** effort percentile, response percentile, cell, sample.
- **DEGRADED:** < 30 bars or no volume → strip silent; the receipt reads `NO_SAMPLE` or `NO_VOLUME`.
- **RECEIPT TO ADD:** `dataset.responseCells=<n>|ABS:<a>|INIT:<i>|VAC:<v>`.

### C-02 Bar Delta Keel + Delta Ratio
- **QUESTION:** who won this bar, and by how much of its volume?
- **EVIDENCE:** ask-aggressor minus bid-aggressor volume. Ladder: FULL (signed tape or candle sides) / PARTIAL (lower-TF proxy) / DEGRADED (CLV — never painted) / SILENCE.
- **TRUTH:** OBSERVED (F, C), INFERRED (S).
- **CLASS:** A.
- **GRAMMAR:** hairline keel off the body's close edge.
- **STATE:** length ∝ ratio, side ink by sign.
- **CANDLE RELATIONSHIP:** attached to the body.
- **OPACITY:** FULL 0.55, PARTIAL 0.30 dashed, INFERRED dashed.
- **INSPECT:** delta, ratio, basis (`nearBarDeltaBasis` wording).
- **DEGRADED:** FX / no sides → none, and the Tools row says why.
- **PHONE:** keels survive at 390 because they are geometry, not numerals.
- **RECEIPT:** `dataset.barDeltaKeels=<n>|BASIS:<…>`. Retire the numeral path of `nearBarDelta` from FAR / MID.

### C-03 Relative Volume Weight
- **QUESTION:** was this bar unusually busy for its time of day?
- **EVIDENCE:** volume vs same-slot median over ≥10 sessions (rolling median fallback, labelled).
- **TRUTH:** OBSERVED volume, DERIVED rank.
- **CLASS:** A.
- **GRAMMAR:** **REVISED in pass 2 (plate F05A).** Percentile tone on the **volume bar** under each candle, never the candle body: the body belongs to Clarity's solid / hollow law. The original "body fill opacity" grammar is withdrawn.
- **COLOR:** the candle's own ink; no new hue.
- **INSPECT:** volume, baseline, percentile, RME.
- **DEGRADED:**
  - `volumeTruth` NO_CENTRAL_VOLUME / PLACEHOLDER → no weighting;
  - footer reads **TICK ACTIVITY** (count of quote updates, never "volume");
  - with C23, **RELATED FUTURES EVIDENCE · <contract>**.
- **Never fabricate spot FX volume.**
- **RECEIPT:** `dataset.rvolWeight=<n>|BASE:SLOT|SAME` or `TICK_ACTIVITY`.

### C-04 Market Breathing Ribbon
- **QUESTION:** is the market drawing in or breathing out?
- **EVIDENCE:** ATR14 per bar, ratio to window median (COMPRESSED <0.75, EXPANDED >1.3).
- **TRUTH:** DERIVED, OHLC only (lawful on FX).
- **CLASS:** A.
- **GRAMMAR:** a translucent ribbon ±0.5·ATR around the closes.
- **STATE:** width = ATR; edge ink only where the state changed.
- **OPACITY:** 0.06–0.14.
- **MOTION:** none.
- **INSPECT:** state, phase, barsInState, cycles, realizedVol.
- **DEGRADED:** < 40 bars → none.
- **RETIRE:** the rail card becomes ⓘ / Inspect only (panel-erasure).
- **RECEIPT:** `dataset.breathRibbon=<bars>|TURNS:<k>`.

### C-05 Effort Mark on every qualifying bar
- **QUESTION:** where did effort and result disagree?
- **EVIDENCE:** the `selectEffortVsResult` verdict per bar.
- **CLASS:** B.
- **GRAMMAR:** existing `effortMarkGeometry` mark at the computed time / price on each qualifying bar.
- **SILENCE:** ORDINARY bars draw nothing.
- **SELECTION:** the cursor raises one mark to full ink; the rest sit at 0.45.
- **INSPECT:** the verdict's numbers.
- **DEGRADED:** no volume → silent.
- **RULE:** must not paint on > 25% of bars in view; past that, the threshold is wrong — fail the gate.
- **RECEIPT:** `dataset.effortMarks=<n>/<inView>`.

### C-06 CVD ⇄ Price Relationship Notch
- **QUESTION:** is the aggression agreeing with the price move?
- **EVIDENCE:** CVD slope per bar vs body sign.
- **TRUTH:** OBSERVED (F, C), INFERRED (S → dashed).
- **CLASS:** A, expressed as silence on agreement.
- **GRAMMAR:** a hollow notch on the wick tip in the move's direction where they disagree.
- **COLOR:** neutral ivory 0.6.
- **INSPECT:** CVD Δ, body Δ, tape start.
- **DEGRADED:** before tape coverage → nothing, with the shared coverage boundary.
- **RECEIPT:** `dataset.cvdNotches=<n>|SIDES:<…>`.

### C-07 Regime History Floor + Transitions
- **QUESTION:** what regime was each bar born in, and when did it change?
- **EVIDENCE:** the one breaker, evaluated per bar without lookahead.
- **CLASS:** A floor plus B transition.
- **GRAMMAR:** **REVISED in pass 2 (plate F15A).** A thin regime strip carrying a 1-px **state-level trace** across time over faint BALANCE / TRANSITION / WAIT bands. The present point gets the plate's "unresolved" chip. A transition is where the trace crosses the threshold. The floor band and hairlines are withdrawn.
- **COLOR:** TREND = trend ink 0.12, RANGE = magnet ink 0.12, TRANSITION = neutral hatch.
- **RULE:** the current-breaker lens dimming stays.
- **INSPECT:** regime, age (bars + clock), breaker inputs.
- **DEGRADED:** insufficient sample → floor absent.
- **RECEIPT:** `dataset.regimeFloor=<bars>|TRANS:<k>`.

### C-08 CLC Family
- **QUESTION:** did the close at this level authorize anything?
- **EVIDENCE:** a close relative to a MarketObject LEVEL / ZONE edge. +Volume needs RVOL (C-03). +CVD needs sides.
- **CLASS:** B.
- **GRAMMAR:** a glyph at the close price on the closing bar, plus a hairline connector to the level.
- **STATES:** nine canon states, open → solid → ring → double ring; Failed Hold / Rejection reversed.
- **INSPECT:** state, level id (Passport link), volume and CVD legs with their fidelity.
- **DEGRADED:** missing legs downgrade the state, never fabricate it (Clean Close + CVD becomes Clean Close).
- **RULE:** never a wizard; compiles into the WAIT posture.
- **RECEIPT:** `dataset.clc=<n>|<state counts>`.

### C-09 Failed Aggression
- **QUESTION:** did a push get paid?
- **EVIDENCE:** sided aggression above the 80th percentile with no displacement follow-through within 3 bars.
- **CLASS:** B.
- **GRAMMAR:** a short arrow from the aggression price that terminates in a stop bar.
- **DISTINCTION:** it differs from Exhaustion (drying fuel) and from Absorption (a passive wall). Inspect states which.
- **DEGRADED:** stocks INFERRED → dashed; FX → never.
- **RECEIPT:** `dataset.failedAggression=<n>`.

### C-10 Structure State + BOS / Reclaim
- **QUESTION:** is the current structure intact?
- **EVIDENCE:** confirmed swings; body-close breaks.
- **CLASS:** A (leg state) plus B (break / reclaim).
- **GRAMMAR:** leg baseline styles (solid / dashed / dotted / grey); chevrons at the breaking close.
- **INSPECT:** leg age (Structural Age), tests.
- **DEGRADED:** no confirmed swing → nothing.
- **RECEIPT:** `dataset.structureLegs=<n>|BOS:<k>|RECLAIM:<r>`.

### C-11 Imbalance State Tick
- **QUESTION:** where inside this bar did one side overwhelm the other?
- **EVIDENCE:** diagonal imbalance at the configured ratio (H-601 / H-701 refinement).
- **CLASS:** A.
- **GRAMMAR:** **REVISED in pass 2 (plate F06A).** BID / ASK IMBALANCE slabs: a translucent horizontal slab at each imbalanced price row, extending across the consecutive bars where the imbalance held. Green for bid, red for ask, 0.25–0.4 opacity, under the candles. Silent when no row passes. The 1-px tick is withdrawn.
- **INSPECT:** ratio, row, run length.
- **DEGRADED:** no sides → silent.
- **RECEIPT:** `dataset.imbalanceTicks=<n>`.

### C-12 Order Flow Compression
- **QUESTION:** is pressure coiling?
- **EVIDENCE:** a run of narrowing range plus falling aggression (sided).
- **CLASS:** B (span event).
- **GRAMMAR:** a thin bracket over the span, closed at the release bar with a gap mark.
- **INSPECT:** span length, aggression trend, release direction.
- **DEGRADED:** no sides → range-only compression is lent to C-04, not drawn here.
- **RECEIPT:** `dataset.ofCompression=<spans>`.

### C-13 TED Strip
- **QUESTION:** where did this chart's evidence actually concentrate in time?
- **EVIDENCE:** per-bar volume concentration across clock time.
- **CLASS:** A.
- **GRAMMAR:** a 2-px density strip above the time axis.
- **OPACITY:** 0.1–0.5.
- **INSPECT:** TED value; Clock / Session / Regime age.
- **OPEN QUESTION:** the Founder must confirm WM's reading of "TED" before closure (census gap).
- **RECEIPT:** `dataset.tedStrip=<bars>`.

### C-14 Profile Per-Bar Contribution
- **QUESTION:** which candles built this shelf?
- **EVIDENCE:** row-engine allocation per bar (FULL / PARTIAL labelled).
- **CLASS:** relationship (A↔C).
- **GRAMMAR:** selecting a slice dims non-contributors to 0.35; selecting a bar outlines its rows on every active profile (the eleven species only).
- **INSPECT:** contribution %, allocation basis.
- **DEGRADED:** a proxy allocation reads PARTIAL; FX volume profiles withheld.
- **RECEIPT:** `dataset.profileContribution=<rows>|<bars>`.

### C-15 Market Surprise / Absence-as-Evidence
- **QUESTION:** did the market do something the envelope says is unusual, or fail to do what it usually does?
- **EVIDENCE:** Expected Envelope sample (n shown).
- **CLASS:** B.
- **GRAMMAR:** **REVISED in pass 2 (Contractor H-801 / plate 120).** A small **flag on a pole at the live event bar**, driven by the existing `expectedEnvelopeSurprise` state (serving SPY read `ABOVE:1/9`). The analogue stays behind, and the camera stays on now. Absence-as-evidence uses the same flag, hollow. The circles and rings are withdrawn.
- **RULE:** "pay attention", not authorization. GO stays dark.
- **INSPECT:** sample, percentile, mismatch.
- **DEGRADED:** sample < floor → silence plus Evidence Debt.
- **RECEIPT:** `dataset.marketSurprise=<n>|ABSENCE:<k>`.

---

### 3b. PROPOSED plates for the six inventions with no Founder plate (2026-10-07)

Drawn 06:15–06:45 CDT Oct 7 by the MY VIEWS / ACTIVE TOOLS lane, docs only. Files are in `docs/canon/proposed-garden19/`; open `index.html` for the gallery. Each plate is **PROPOSED — awaiting Founder canon acceptance**. None is a Founder plate, none has a canon ID, and none was uploaded to Drive.

All six follow the same rules:
- the Garden 18 schematic style (graphite, gold, ivory marks);
- Class A history is drawn across the candles; Class B marks appear only where the event occurred;
- each reading survives label and colour erasure, because it is carried by form and position.

| Plate | File | Cert | Parent invention | Owner file | Class | Evidence requirement | Degraded state | Plate status |
|---|---|---|---|---|---|---|---|---|
| G19-P01 Market Breathing ribbon | `01-market-breathing-ribbon.svg` | C-04 | F15.BREATHING (A7) | `src/lib/chart/marketBreathing.ts` (`atrSeries`) | A | OHLC only: ATR14 vs window median. DERIVED. Lawful on FX | < 40 bars → no ribbon; a quiet row says "needs N bars" | PROPOSED. Re-reads Garden 18 P-14 under Class A (filled ribbon width; pinch / flare marks only at turns) |
| G19-P02 CVD ⇄ price divergence notch | `02-cvd-price-divergence-notch.svg` | C-06 | G19.CVD_REL (A5) · host F06.DIV | host `selectDeltaDivergence.ts` + MainChart CVD_PANE; per-bar owner NOT BUILT | A, expressed as silence on agreement | Sided tape: per-bar CVD slope vs body sign. OBSERVED (F, C) · INFERRED (S) | Before tape coverage: nothing, with the boundary drawn. Stocks: dashed notch. FX: never | PROPOSED. The registry requires a "CVD / Delta relationship" plate; none exists |
| G19-P03 Failed Aggression | `03-failed-aggression.svg` | C-09 | G19.FAILED_AGG (B3) | NOT BUILT (proposed `selectFailedAggression.ts`) | B | Sided aggression > P80 with no displacement follow-through within 3 bars | Stocks INFERRED → dashed arrow. FX: never. No sides: nothing, and the Tools row says why | PROPOSED. Glyph is distinct from the Absorption slab and the Exhaustion thinning (legend on the plate) |
| G19-P04 Order Flow Compression | `04-order-flow-compression.svg` | C-12 | F06.COMPRESSION (B12) | NOT BUILT (proposed `selectOrderFlowCompression.ts`) | B (span) | Narrowing range AND falling sided aggression | No sides: range-only compression is lent to P01 and not drawn here. Stocks: dashed bracket. FX: never | PROPOSED. The release is a neutral ring: no direction, no target |
| G19-P05 Structure leg state | `05-structure-leg-state.svg` | C-10 | G19.STRUCTURE_STATE (A9) · Registry §K | `src/lib/marketData/viewModels/selectMarketStructure.ts` (swings); leg state NOT BUILT | A (leg) + B (BOS / reclaim) | Confirmed swings; a break counts on a BODY close only | No confirmed swing → nothing. A forming swing is never drawn | PROPOSED. State is carried by line form: solid INTACT, dashed TESTING, dotted DETERIORATING, grey FAILED |
| G19-P06 TED carrier (question) | `06-ted-carrier-question.svg` | C-13 | F10.TED (A15) | `src/lib/chart/effortEvidence.ts` (`readTemporalEvidenceDensity`) | A, pending a definition | As built: volume concentration across clock time. **Definition not confirmed** | As built: no traded volume → absent; FX → none | **Grammar deliberately not drawn.** The plate reserves only the strip above the time axis and asks the Founder to define TED. The C-13 2-px strip must not ship before the answer |

After acceptance, each certificate's "Governing plate" cell in §3a moves from "none" to the accepted plate. Until then, the build lane may build these only as PROPOSED, and TED not at all.

## 4. Open items (not closed by this pass)

1. **Live glass:** taken in pass 2 for every URL-provable switch on four symbols (§1f).
   - Still unmeasured: Exhaustion (no proof token), DELTA_VP and ANCHORED_RANGE (drag tools), and phone / tablet widths.
   - Every row was read on desktop only; no screenshots were taken.
2. **Plates:** 9 opened (§3a).
   - No Founder plate exists for Breathing, CVD relationship, Failed Aggression, Order Flow Compression, TED or Structure state. PROPOSED plates for all six are now in `docs/canon/proposed-garden19/` (§3b, 2026-10-07). TED's plate only asks the definition question.
   - The only CLC plate is off-topic.
3. **`inventionCensus.ts`:** 20 `G19.*` rows added in pass 2. vitest `src/lib/canon` passes 23/23; tsc shows no errors in that file.
   - 00:16 CDT, after the freeze: `G19.CROSS` → PARTIAL (owner `src/lib/chart/fxRelatedFlow.ts`) and the `G19.RVOL` gap text corrected. Uncommitted. vitest canon + inventionEducation 33/33 pass.
4. **Founder confirmations still owed:**
   - the TED definition;
   - approval of the C-01, C-04 and C-13 grammars;
   - the Garden 18 PROPOSED plates for Breathing, Response Matrix and TED (`GARDEN18-SUPER-ORDER-RECEIPT.md` §4) predate Garden 19's Class A law and should be re-read against it.

---

## 5. §53 FVG / IMBALANCE — INVENTION CERTIFICATE (FVG_3C v1)

Written 2026-10-07 by the Academy / selling lane, **from shipped code and tests only** (main at `d5ac6ff9`). The Founder order's exact §53 field list was not in hand when this was written. The fields below are this file's certificate fields (C-01 … C-15) plus the FVG-specific ones the coordinator named (… AS-OF-TIME BEHAVIOR). A field the order adds is a gap in this section, not a pass.

**Status words:**
- **PROVED** — a test pins it *and* a serving receipt was read.
- **BUILT** — code and tests are on `main`, but there is no serving receipt in this document.
- **PARTIAL** — the exact missing proof is named.

**Serving receipts recorded 2026-10-07** (forwarded by the coordinator from the chart, backtest, scanner and journal lanes; build cited per row). A row is flipped to PROVED only where a receipt names it. Everything fixed after the receipt's build stays PARTIAL until it is re-read.

| Field | Certificate | Source (shipped) | Status |
|---|---|---|---|
| **NAME** | FVG / Imbalance (Fair Value Gap). Instrument id `FVG_IMBALANCE`. Drawer kind `GAP_FVG`; no new kind and no "FVG room" (`FVG_ROOM` is a rejected kind) | `fvgGlass.ts` `FVG_INSTRUMENT_ID`; `marketObjectKinds.ts` | BUILT |
| **DEFINITION_ID / VERSION** | `FVG_3C` v1. OBJECT_ID = `FVG\|<instrument>\|<tf>\|<b2 open ms>\|<BULLISH\|BEARISH>\|v1`, minted once and never respawned | `fvgDefinition.ts` `mintFvgObjectId`; `docs/operations/FVG-METHODOLOGY.md` §7 | BUILT (tests: `fvgEngine.test.ts`) |
| **OWNER** | Definition `fvgDefinition.ts` · detector + lifecycle + as-of `fvgEngine.ts` · descriptive tally `fvgStats.ts` · camera door `fvgCamera.ts` · glass projection `fvgGlass.ts` · chart door `fvgChartLink.ts` · bar source `fvgBarSource.ts` / `fvgWireBars.ts` | files named | BUILT. `fvgCamera.sentinel.test.ts` pins that chart and scanner code read through `fvgSceneForCamera` and never call `detectFvgs` themselves |
| **MARKET QUESTION** | "Where did price move so fast that one side barely traded — and what has happened at that territory since?" | `inventionEducation.ts` `CONCEPT_EDUCATION.FVG_IMBALANCE.question` | BUILT |
| **EVIDENCE** | Three CLOSED bars, read on wicks. b2's body must point the gap's direction. Size ≥ max(1 tick, 0.10 × ATR14 at b2), using Wilder's ATR. Before ATR14 exists nothing is detected; the warm-up triples are counted. No volume is needed | `fvgDefinition.ts` rules 1–4, `testFvgGeometry` | BUILT (tests: `fvgEngine.test.ts`) |
| **TRUTH CLASS** | PRICE_GEOMETRY = **FULL**, from OHLC. ORDER_FLOW and DERIVATIVES are `NOT_ATTACHED` until another owner's reading is attached **by reference** (owner, ownerState verbatim, ref). The FVG never upgrades that evidence | `fvgEngine.ts` `FvgSenseEvidence`; methodology §12 | BUILT |
| **MANIFESTATION CLASS** | C — a territory on price, extending right from b3's close until it is traded through or ages into memory. It is never a badge | `fvgGlass.ts` §1 | BUILT |
| **PHYSICAL GRAMMAR** | The remaining territory is dense. The visited part is a hatched scar. Approach is a soft glow on the near edge, toward price. Each rejection is a short tick at its response bar. Acceptance is a filled interior with a quiet inner line. Traded through means the far edge breaks (dashed). Numbers live in Inspect, never on the glass | `fvgGlass.ts` `fvgBandGeometry`, `FvgBandGeometry` | BUILT (tests: `fvgGlass.test.ts`) |
| **STATE GRAMMAR** | BORN · OPEN · APPROACHING · TOUCHED · PARTIALLY_MITIGATED (> 0, < 50 %) · DEEPLY_MITIGATED (≥ 50 %, < 100 %) · FULLY_MITIGATED · REJECTED (within an interaction's first 5 bars) · ACCEPTED (2 consecutive closes inside) · TRADED_THROUGH (terminal) · MEMORY (overlay). Mitigation is cumulative and separate from `state` | `fvgDefinition.ts` `FVG_STATES`; methodology §8 | BUILT |
| **CANDLE RELATIONSHIP** | Behind price. The clear zone (§15) means no band reaches the newest candle's slot, and keep-out strips (±3 px) leave the last price and paper / broker / order lines readable | `fvgGlass.ts` `fvgClearZoneX`, `fvgKeepOutStrips`; MainChart FVG block | **PROVED (desktop)** — serving c4de0f0, own tab, `scene=clean&on=fvg`: NQ1! 5m clear zone X:1487 vs newest candle 1502 (MAXX 1487). **PARTIAL:** 834 / 390 not read; the volume-field clip was changed in d6e2c18 and has not been re-proved | **PROVED** at every size, NQ1! 5m on 301d85d / 8db9b21 (`~/wm-held/proof/fvg-serving-inspect-replay-sizes-2026-10-07.txt`): 1180×820 X:803 / NEWEST:818 / MAXX:803 · 834×1112 X:685 / 700 / 685 · 390×844 X:255 / 267 / 255. Replay holds it too: X:1575 / NEWEST:1587 / MAXX:1575. eea2771 matrix (`~/wm-held/proof/fvg-serving-matrix-2026-10-07.txt`): MAXX ≤ X < NEWEST on every row with bands. The zoom plate reads WITHHELD:NARROW at 390 | |
| **COLOR** | Side ink from `flowColorsRef` (`dBuy` for bullish, `dSell` for bearish), the same inks as the other order-flow layers. Form, not colour alone, carries state: hatch, dashed edge, tick, inner line | MainChart FVG block (`bands.push({ … ink: g.bullish ? dBuy : dSell })`) | BUILT |
| **OPACITY** | remainingFill 0.16 · visitedHatch 0.20 · visitedFill 0.04 · edge 0.50 · acceptedFill 0.13 · innerLine 0.32 · glow 0.34 · tick 0.85 · floor 0.05, each × an age factor ∈ (0, 1]. Quieted 2026-10-07 after a SPY 5m serving read showed six stacked scars as "a striped wall" | `fvgGlass.ts` `FVG_OPACITY`, `fvgAlpha`, `fvgAgeFactor` | BUILT. **PARTIAL:** the scars were quieted again in d6e2c18 and have not been re-proved on serving | BUILT. Panel erasure holds on serving: with Inspect closed, remaining / visited / traded-through stay distinguishable (`fvgDrawn LIVE:6\|SCAR:3` at every size, 301d85d, `~/wm-held/proof/fvg-serving-inspect-replay-sizes-2026-10-07.txt`). **PARTIAL:** no serving receipt yet confirms the d6e2c18 scar quieting removed the "striped wall" on SPY 5m (6 scars stacked) | · **UPDATE 21:05 CDT → PROVED** (f96618c / 683aecf, `~/wm-held/proof/fvg-serving-opacity-a6-2026-10-07.txt`): SPY 5m scars read as two thin hatched strips, not a wall. The hierarchy is price > LIVE 1 > SUPPORTING 0.75 > MEMORY 0.44 ≥ floor 0.12. A stale feed dims the reading (`fvgGov LIVE:0.60\|MEMORY:0.26`). A selected gap recedes the room (fvg 0.45, memory 0.2; selected band 1) |
| **VISIBILITY BUDGET** | ≤ 6 live territories (ordered by distance to their remaining territory, then newest; an ordering, not a grade) + the 3 most recent scars. The rest are counted as hidden, never deleted | `fvgEngine.ts` `selectFvgVisibility`; receipt `fvgReceipt` | **PROVED** — serving c4de0f0, own tab, `scene=clean&on=fvg`: every symbol read OPEN:6 / SCARS:3 at the budget, with hidden counted, not deleted (NQ1! 5m HIDDEN:796 · ES1! 1m 545 · SPY 5m 1301 · EURUSD 1h 578) | |
| **ⓘ** | `CONCEPT_EDUCATION.FVG_IMBALANCE`: what / question / evidence / appears / grammar / full / partial / degraded / firstTouch / canon. Carries "No guaranteed return should be assumed. WM Pro tracks what actually happens." Selecting an `FVG\|…` object routes to it (`educationIdForSelection`). The Tool Finder row is labelled "FVG / Imbalance" | `inventionEducation.ts`; `ChartsDashboard.tsx` | BUILT (tests: `fvgCourse.test.ts` §32 block, `inventionEducation.test.ts`) |
| **INSPECT DEPTH** | `fvgInspectRows`: state words, territory at instrument decimals, size, created-at, first touch, deepest penetration, responses, remaining territory, and evidence per sense. Rendered by `FvgInspectTicket` inside `ChartInspectTicket` | `fvgGlass.ts` §4; `FvgInspectTicket.tsx` | BUILT. **PARTIAL:** at c4de0f0 a tap set `fvgSelected`, but selection carrying into Inspect was fixed after that (d6e2c18) and has not been re-proved on serving | **PROVED** (301d85d, `~/wm-held/proof/fvg-serving-inspect-replay-sizes-2026-10-07.txt`): an ES1! 5m tap opened the gap in Inspect, first touch `FVG_IMBALANCE`. Size row reads "4 ticks · 1.00 points · 0.27× ATR14 · minimum 0.37 by 0.10 × ATR14" (the tick-size fix is live; NQ1! reads "14 ticks · 3.50 points"). Relationships are carried by reference: 4 rows FULL (a structure swing; Living Profile VAH / POC / HVN), with options walls and liquidity pools at SILENCE | |
| **DEGRADED / SILENCE** | No canonical identity → `dataset.fvg = SILENT:NO_CANONICAL_IDENTITY`. Fewer than 3 closed bars → `SILENT:NO_CLOSED_BARS`. Inside the ATR warm-up nothing is detected (counted). Tick bars with no clock are refused with `NO_CLOCK`. Spot FX: geometry is FULL from OHLC, no tick term (ATR alone, `minimum.basis = ATR`), size in pips | MainChart FVG block; `fvgDefinition.ts` rules 4–5 | BUILT. Spot FX proved price-only: EURUSD 1h `OPEN:6\|SCARS:3\|HIDDEN:578\|DEF:FVG_3C@1` (serving c4de0f0, own tab, `scene=clean&on=fvg`). **PARTIAL:** the SILENT receipts and 500T tick bars (fixed in d6e2c18) were not read on serving | **PROVED for price-only and tick bars:** EURUSD 5m / 1h spot FX `OPEN:6\|SCARS:3`, PRICE_GEOMETRY FULL, other senses NOT ATTACHED (eea2771, `~/wm-held/proof/fvg-serving-matrix-2026-10-07.txt`). BTC-USD 500T draws gaps by ms pairing (d6e2c18 fix). NQ1! / ES1! 500T read 0 after 11 s while warming up (2 bars; ATR14 needs 14). **Data-lane finding, not an FVG defect:** EURUSD 1m reads 0 gaps because the feed serves point bars (2998 / 2998 with O = H = L = C, volume 0), so every b2 is a doji and is refused by rule 3. **PARTIAL:** the `SILENT:NO_CLOSED_BARS` / `SILENT:NO_CANONICAL_IDENTITY` strings have not been read on serving || **LAYER OFF = SILENCE (2026-10-07, FVG lane; pinned by `src/lib/marketData/fvg/fvgSilence.sentinel.test.ts`).** With `wm_fvg` OFF (the default; `scene=clean` turns it off): the governor is never asked (`fvgPaints = fvgOn && att.paints("fvg")`), the ONE `fvgSceneForCamera` call sits in the ON branch only (zero detector calls), every FVG receipt incl. `fvgGov` is deleted, the scene is published as null and `dataset.fvg = OFF`; no chart file imports `fvgBarSource` (zero FVG bar fetches on the chart path); the SpaidBot context carries no `fvg` and no FVG object can be selected. Scanner strip / Backtest study / Journal FVG field / Review / Personal Edge read FVG bars ONLY from a button — no effect or memo fetches (render test: strip + study render with `fetch` never called; the strip's run button is not even rendered until opened). **Serving (683aecf, own tab, NQ1! 5m `scene=clean`, read-only):** chart context had no `fvg` field, no canvas carried `fvgGov`, 0 FVG bar requests (`/api/yahoo … bars=160|3000`) in the resource log. **PARTIAL:** `fvg = OFF` itself was not read — the automation window was hidden, so the overlay paint loop never ran (no overlay receipt at all, e.g. `attentionSelection` absent); the 1180 / 390 reads were not taken because resizing the shared window would move other lanes' tabs · **UPDATE 21:05 CDT → layer-off silence PROVED** (5475a8e, `~/wm-held/proof/fvg-serving-opacity-a6-2026-10-07.txt`): NQ1! 5m `scene=clean` at 1180×820 and 390×844 reads fvg OFF, and fvgGov / fvgDrawn / fvgHit are ABSENT; the SpaidBot context carries no `fvg` (683aecf, §6a). Still PARTIAL: the `SILENT:NO_CLOSED_BARS` / `SILENT:NO_CANONICAL_IDENTITY` strings |
| **RECEIPTS** | `canvas.dataset.fvg` = `OPEN:n\|SCARS:n\|HIDDEN:n\|DEF:FVG_3C@1` · `fvgAsOf` = `<LIVE\|REPLAY>:<clockMs>\|BARS:n\|LEAK:n` · `fvgStep` · `fvgCompute` = `…\|PER_CLOSED_BAR` · `fvgCost` = `<ms>\|mean\|longest\|budget1.5\|MET\|OVER` · `fvgHit` · `fvgSelected` | MainChart FVG block; `fvgGlass.ts` `fvgReceipt`, `fvgCostReceipt` | **PROVED** for `fvg`, `fvgAsOf` and `fvgSelected` — serving c4de0f0, own tab, `scene=clean&on=fvg`: NQ1! 5m `OPEN:6\|SCARS:3\|HIDDEN:796\|DEF:FVG_3C@1` LEAK:0 · ES1! 1m `OPEN:6\|SCARS:3\|HIDDEN:545` LEAK:0 · SPY 5m `OPEN:6\|SCARS:3\|HIDDEN:1301` LEAK:0 · EURUSD 1h `OPEN:6\|SCARS:3\|HIDDEN:578` LEAK:0 · a tap set `fvgSelected`. **PARTIAL:** `fvgCost` / `fvgCompute` — see PERFORMANCE | **PROVED** — `fvg`, `fvgAsOf`, `fvgSelected` (c4de0f0, eea2771, 301d85d); `fvgCost` (paint-only, MET on 301d85d) and `fvgCompute` (per closed bar); `data-proof-select-object …\|HELD`. See `~/wm-held/proof/fvg-serving-inspect-replay-sizes-2026-10-07.txt` and `~/wm-held/proof/fvg-serving-matrix-2026-10-07.txt` | |
| **PERFORMANCE** | Detection is incremental per closed bar (`createFvgCameraMemo`). Paint budget is `FVG_COST_BUDGET_MS` = 1.5 ms per frame, receipted MET / OVER | `fvgCamera.ts`, `fvgGlass.ts` | BUILT. **PARTIAL:** serving c4de0f0 measured 1.8–4.8 ms paint, over the 1.5 ms budget. d6e2c18 split it into a paint-only cost receipt plus `fvgCompute` (per closed bar), and the new receipt has not been read on serving | **PROVED** on 301d85d (frame memo) — paint mean 1.03 ms on ES1! 5m and 0.75 ms on NQ1! 5m, MET; across the sizes 0.23–1.10 ms, all MET (`~/wm-held/proof/fvg-serving-inspect-replay-sizes-2026-10-07.txt`). Before the memo, eea2771 had 11 / 16 rows MET and NQ 1m / 5m and SPY 5m OVER (1.58–2.17 ms, `~/wm-held/proof/fvg-serving-matrix-2026-10-07.txt`). `fvgCompute` runs per closed bar (25–99 ms on long series at eea2771) || **§58 PERFORMANCE LAW audit (2026-10-07, FVG lane; fixes LIVE in 683aecf; pinned by `src/lib/marketData/fvg/fvgPerformance.sentinel.test.ts`).** Measured on a 5,000-bar 1m series (laptop, Node; the test asserts each with phone headroom): one full detection scan 11–13 ms (459 objects); `detectFvgs` re-call on the same bars is a cache hit (same object, 0.0007 ms); one new closed bar = ONE incremental push 0.025 ms (never a rescan); camera scene cold 20 ms, per tick 1.5 ms returning the SAME scene object (so React re-renders only when a bar closes), on bar close 1.8 ms (`PUSH:1`). **Fixed:** (1) the tick-bar path handed MainChart a fresh identities array per print and the scene key compared array identity, so the scene was re-read and re-published (one React re-render) per tick — the key now uses identity content (count / first / newest barId); (2) `fvgSceneForCamera`'s memo returns the previous scene object when ledger, replay clock, budgets and counts are unchanged; (3) bar reads (`fetchFvgBars`) are deduped in flight and reused for 60 s per URL (refusals not cached), so Scanner + Backtest + Journal never double-fetch; (4) Scanner strip, Backtest study and Journal FVG field abort on unmount (no state after unmount, no timers or listeners left). **Pinned:** the ONE `fvgSceneForCamera` call sits inside FVG-GLASS behind a key with no prices and no pointer fields; the pointer path reads painted hit rects only; the scene reaches React only as a new object (`fvgPublishedRef`); no per-gap DOM on the chart (canvas only, one Inspect ticket); opening Inspect is a `ledger.objects.find`, never a recompute; SpaidBot's ask listener is removed on unmount. **PARTIAL:** these timings are Node on a laptop — a serving `fvgCompute` read on a phone-class device is not yet recorded |
| **PROOF-SCENE TOKEN** | `on=fvg` → `wm_fvg` (default OFF; a clean scene keeps it off). `select=fvg:<OBJECT_ID>` opens one object through the room's one selection owner | `proofScene.ts` | BUILT. **CONFLICT:** `proofScene.test.ts` (scanner lane) asserted that `on=fvg` must NOT parse, while the chart lane's `proofScene.ts` parses it. Check that the test on `main` was reconciled |
| **CHART DOOR** | `/charts?symbol=<sym>&tf=<tf>&on=fvg&select=fvg:<OBJECT_ID>` from Scanner, Backtest and Journal | `fvgChartLink.ts` `fvgChartHref` | BUILT (tests: `fvgChartLink.test.ts`) |
| **REPLAY** | The replay camera passes `replayCursorTimeSec`. The ledger is read through `fvgStateAsOf` at `fvgReplayClockMs(cursor)`, so a replayed territory never shows a touch, mitigation or response after the cursor | `fvgCamera.ts`; MainChart `replayCursorTimeSec: cursorF` | **PROVED** (301d85d, `~/wm-held/proof/fvg-serving-inspect-replay-sizes-2026-10-07.txt`), Replay picked up through the bar-replay equipment channel: LIVE `BARS:4977\|LEAK:0` → REPLAY at cursor 4857 / 4977: `fvgAsOf REPLAY:1791370800000\|BARS:4857\|LEAK:0`; The selected object (born after the clock) dropped out of selection and Inspect; The first painted band's b2 is before the clock; Put-down returns `LIVE:…\|BARS:4977\|LEAK:0` | |
| **SCANNER** | Five conditions, decided at the newest closed bar against the previous close through `fvgStateAsOf`: NEW_FVG · PRICE_APPROACHING_FVG · FIRST_TOUCH · PARTIAL_MITIGATION · DEEP_MITIGATION. Refusals are plain: bars unavailable, too few bars for ATR14, bars too old. Convergence conditions are omitted until an owner provides the evidence | `fvgScanConditions.ts`; `FvgScanStrip.tsx` | **PROVED** (serving eea2771): read 30 of 30, 0 refused, 14 hits across 5 conditions. Prices at instrument decimals (TSLA 374.60 – 378.52). Hit link `/charts?symbol=TSLA&tf=1D&on=fvg&select=fvg:FVG\|TSLA\|1D\|1791207000000\|BULLISH\|v1`. **PARTIAL:** the object being selected on the chart at that link was not proven on serving (hidden window). The `proofSelectFvgHeld` sentinel proves the chain in code | **PROVED.** The scanner read on eea2771: 30 of 30, 0 refused, 14 hits, 5 conditions, decimals, hit link. The door on 301d85d (`~/wm-held/proof/fvg-serving-inspect-replay-sizes-2026-10-07.txt`): `select=fvg:FVG\|TASTYTRADE:/ESZ26:XCME\|5m\|1791404100000\|BEARISH\|v1` → `<html data-proof-select-object>` = `…\|HELD`, the Inspect ticket on that id (state REJECTED), canvas `fvgSelected` = same | · **UPDATE 21:05 CDT → convergence + request count PROVED** (fabce3a, §6a): 10 convergence rows (9 FVG + structure, 1 FVG + profile) with source evidence words. Requests: page load 0, strip opened 0, Read 30, Read again within 60 s 30 (reused); localStorage byte-identical. Open: the client-navigation door (fixed 02e593e, not re-read) |
| **BACKTEST** | Study mode, not a strategy. One engine read as of the study clock (no future leak). The tally is `{count, of, share}`, labelled DESCRIPTIVE. Filters: instrument / timeframe / session / regime (an UNTAGGED note on bar-only history) / direction / displacement band / crossesSession | `fvgStudy.ts`; `FvgStudyPanel.tsx` | **PROVED** (serving eea2771, read-only): NQ1! 5m, 991 closed bars, 148–151 gaps; labelled "DESCRIPTIVE EVIDENCE · NOT A PREDICTION" and "definition FVG_3C v1"; revisited 139 of 148 (later 144 of 151); median first touch 2 bars (of 139); still open 9 of 148 (1 of 9 too young). Clock moved to bar 501 → 73 gaps, revisited 70 of 73 (no future leak). Pooled AAPL 61 + BTC 315 + NQ 148 = 524. localStorage unchanged. Prices at instrument decimals (31388.00 – 31392.50) || **Relationship splits (2026-10-07, FVG lane; tests `src/lib/backtest/fvgStudy.test.ts`).** Filters and splits `structure` (WITH / NO_STRUCTURE: a confirmed swing broken, reclaimed or inside) and `profile` (WITH / NO_PROFILE: a POC / VAH / VAL of the range profile of the 100 bars before formation inside or near) read pre-formation bars only — a gap's group is the same at formation and at the end (test). Every group prints n of m with its own denominator; a group under **20 gaps** reads `n · INSUFFICIENT (fewer than 20)` and its shares read `count of of — no share below 20 gaps` (no percentage), in the split table and in the filtered block alike; group sums equal the filtered count (tested on a 3,000-bar series). Options / liquidity walls are not a bar-study filter (no historical chain or book) and the panel says so. **PARTIAL:** the split table with INSUFFICIENT rows has not been read on serving (ships in the next batch) · **UPDATE 21:05 CDT → relationship splits PROVED** (fbc999b gate; read on fabce3a, `~/wm-held/proof/fvg-serving-spaidbot-academy-backtest-2026-10-07.txt`): NQ1! 5m, 152 gaps, split by direction 78 / 74 with shares. "b2 range ≥ 2× ATR 17 · INSUFFICIENT (fewer than 20)" and "crosses a session boundary 2 · INSUFFICIENT" print no %. Structure split: none 57 / with 95. At 390 the table scrolls inside its own wrapper; page overflow 0 |
| **JOURNAL / REVIEW** | A reference to one OBJECT_ID plus a snapshot **as of decision time** (`fvgStateAsOf(ledger, decisionAt)`), never "FVG = YES". Review answers first-or-later touch, acted before the condition, and held after a trade-through. A missing fill time answers UNKNOWN | `fvgDecisionReference.ts`, `planFvgContext.ts`, `JournalFvgReferenceField.tsx` | **PROVED for the as-of snapshot** (serving eea2771): "Journal it" pre-fills the id. Read at b3 close → "born, before price had touched it (0 interactions), deepest 0%, 31388.00–31392.50 unvisited, 0 bars old". Read now → "fully mitigated, after the first interaction (1), deepest 100%, no unvisited territory, 4 bars old". **PARTIAL:** not saved, so save → reload → same snapshot is unproven, and so are the Review answers | **Review answers PROVED on serving bf5052b via the read-only proof scene** `/journal?scene=journal-fixture` (own tab, signed in; SAMPLE-FVG 5m, 24 synthetic decisions from the one engine; banner "PROOF SCENE — sample data, not your journal"): 6 Review rows through the real `StoryReviewRow` (`readOnly`), each FVG block in its truth layers — e.g. TRADER TRUTH "bearish gap 100.53–100.64 on SAMPLE-FVG 5m (FVG_3C v1): at decision time it was rejected, during the first interaction…"; MARKET TRUTH "Your entry at 10:40 AM CST came on the first touch…", "Price had reached the territory (touch 1 began in the bar from 10:35 AM CST) before your entry", "The territory was traded through at 11:40 AM CST, outside the time you held the position". No ledger-load or Ask door in the scene. Network during the scene: only the shell's `/api/auth/me`, `/api/market-memory/coverage` and Cloudflare RUM — nothing from the scene. **Still PARTIAL:** save → reload on a real entry (never on the Founder's account) |
| **SPAIDBOT** | The client projects a structured record (`spaidbotFvgScene`). The server re-validates it and writes the words (`formatFvgFactBlock`). Lines are tagged OBSERVED FACT / DERIVED MEASUREMENT, evidence is given per sense, limitations are named, and the block says price does not have to fill | `spaidbotFvgFacts.ts`; `ChartsDashboard.tsx` data-ctx `fvg` | BUILT (tests: `spaidbotFvgFacts.test.ts`). **PARTIAL:** no serving receipt of a SpaidBot answer quoting the block |
| **ACADEMY** | The course "FVG / Imbalance & Patience" is module 9 in the one Academy: 21 lessons, the myth card on 1/10/14/15/16, a 14-question quiz on FVG_3C, and lesson numbers imported from `fvgDefinition.ts`. "Show me on a chart" goes to `/charts?scene=clean&on=fvg` once the token parses. "Practice in Replay" appears on lessons 6–10, 14 and 15 | `fvgCourse.ts`, `FvgLessonBody.tsx`, `FvgDiagram.tsx` | **PROVED** for the course: serving 4769a31 had 21 lessons × 1440/834/390 in same-origin iframes, 63/63 with no overflow and every diagram distinct; local quiz pass recorded browser-local (`academy-fvg-quiz-*.png`). The chart link, Replay link and territories on the target chart are **PARTIAL**: locally the link landed on `/charts?scene=clean&on=fvg`, but no territories had painted yet (`academy-fvg-showme-chart-1440.png`, pre-c4de0f0) · **UPDATE 21:05 CDT → layout re-PROVED** (fabce3a, `~/wm-held/proof/fvg-serving-spaidbot-academy-backtest-2026-10-07.txt`, ss_6856eun4t): lesson 1 at 390 and 834, page overflow 0, only BODY scrolls (no nested scroll trap). "Show me my examples" from journal references shipped 683aecf; not read on serving |
| **AS-OF-TIME BEHAVIOR** | Every lifecycle fact is an event stamped with the close time of the bar that revealed it. `fvgStateAsOf(ledger, t)` folds only the events known at t with the live reducer: frozen right after formation, nothing later is visible; one ms earlier the object does not exist; as-of at every bar equals a scan of the bars closed by then. Readers that use it: chart (live + replay), scanner, backtest, journal snapshot. The glass receipts a future-leak count (`fvgAsOf …\|LEAK:n`, which must be 0) | `fvgEngine.ts` `fvgStateAsOf`; methodology §11; MainChart `asOfR` | **PROVED in LIVE, Backtest and Journal**: LEAK:0 on all four chart symbols (c4de0f0); the Backtest clock at bar 501 reads 73 gaps and no later facts (eea2771); the Journal snapshot at b3 close shows 0 interactions where the present shows full mitigation (eea2771). **PARTIAL:** REPLAY (`fvgAsOf = REPLAY:…\|LEAK:0` while stepping) not read on serving | **PROVED in LIVE, REPLAY, Backtest and Journal.** LEAK:0 on all 16 live matrix rows (eea2771, `~/wm-held/proof/fvg-serving-matrix-2026-10-07.txt`) and on every size (301d85d). REPLAY at cursor 4857 / 4977 LEAK:0, and an object born after the clock is not selectable (301d85d, `~/wm-held/proof/fvg-serving-inspect-replay-sizes-2026-10-07.txt`). The Backtest clock at bar 501 reads 73 gaps (eea2771). The Journal snapshot at b3 close reads 0 interactions (eea2771) | |
| **HONESTY** | No fill expectation, no "unfilled = target", no strength score. Statistics are counts with denominators. The MYTH card is the only place "must fill" is written, and only as a myth | methodology "What WM does not claim"; `fvgCourse.test.ts` regex sweep; `sellingStory.test.ts` banned-claims sweep | BUILT |

Test inventory at `d5ac6ff9` (run in this worktree, 2026-10-07): 17 FVG-related files, **163 / 163 pass**.
- `fvgEngine`, `fvgCamera` (+ sentinel), `fvgChartLink`, `fvgWireBars`
- `fvgGlass` (+ `components/chart/fvgGlass.sentinel`)
- `fvgStudy`, `fvgScanConditions`, `fvgDecisionReference`, `spaidbotFvgFacts`
- `fvgCourse`, `inventionEducation`, `proofScene`

## 6. §62 RELEASE EVIDENCE — FVG / Imbalance + Academy + Selling pass

| Surface | Commit | Tests (pass) | Serving receipt | Screenshots | Status / missing proof |
|---|---|---|---|---|---|
| FVG core (definition, engine, stats, as-of) | 4769a31 | `fvgEngine.test.ts` (in the 163) | n/a (pure) | n/a | BUILT |
| Chart layer `on=fvg` | c4de0f0 → d6e2c18 → 301d85d / 8db9b21 | `fvgGlass`, `fvgGlass.sentinel`, `fvgCamera` (+ sentinel) | 16-row matrix on eea2771 (NQ1! / ES1! / SPY / BTC-USD 1m / 5m / 1h, BTC-USD 500T, EURUSD 1m / 5m / 1h): LEAK:0 everywhere, MAXX ≤ X < NEWEST. Sizes on 301d85d: 1180 / 834 / 390 all MAXX < NEWEST, LEAK:0, paint MET. ES1! 5m tap → Inspect with first touch, tick size and relationships | `~/wm-held/proof/fvg-serving-inspect-replay-sizes-2026-10-07.txt`, `~/wm-held/proof/fvg-serving-matrix-2026-10-07.txt`; lane screenshots ss_2666xi0xg (390) and ss_7554d5qli (replay) | **PROVED:** layer, budget, no future leak, clear zone at 1180 / 834 / 390, selection into Inspect, 500T tick bars, paint cost, label / number / panel / evidence erasure. **PARTIAL:** scar quieting on SPY 5m not re-read. **Data-lane note:** EURUSD 1m point bars give 0 gaps |
| Replay camera | 301d85d | `fvgCamera.test.ts` | ES1! 5m, cursor 4857 / 4977: `REPLAY:1791370800000\|BARS:4857\|LEAK:0`; an object born after the clock drops out; put-down returns LIVE | `~/wm-held/proof/fvg-serving-inspect-replay-sizes-2026-10-07.txt`; ss_7554d5qli | **PROVED** |
| Scanner FVG conditions + `select=fvg:<id>` | eea2771; 301d85d | `fvgScanConditions`, `fvgChartLink`, `proofSelectFvgHeld` sentinel | eea2771: 30 of 30 read, 14 hits, 5 conditions, decimals, link. 301d85d: `data-proof-select-object …\|HELD`, Inspect on that id (REJECTED) | `~/wm-held/proof/fvg-serving-inspect-replay-sizes-2026-10-07.txt` | **PROVED** |
| Backtest FVG study | c4de0f0; eea2771 | `fvgStudy` | eea2771, read-only: NQ1! 5m, 991 bars, 148–151 gaps, DESCRIPTIVE label, FVG_3C v1, revisited 139 of 148, median first touch 2 bars, still open 9 of 148 (1 too young); clock at bar 501 → 73 gaps, 70 of 73 revisited; pooled 524; localStorage unchanged; decimals 31388.00 – 31392.50 | lane-held | **PROVED** |
| Journal × FVG reference + Review | d5ac6ff; eea2771 | `fvgDecisionReference` | eea2771: "Journal it" pre-fills the id; as-of at b3 close = born, 0 interactions, deepest 0%, 31388.00–31392.50 unvisited; now = fully mitigated, first interaction, deepest 100% | lane-held | **PROVED** (as-of snapshot). **PARTIAL:** save → reload → same snapshot, and the Review three-column answers (not saved in the receipt) |
| SpaidBot FVG fact block | c4de0f0 | `spaidbotFvgFacts` | none | none | **PARTIAL:** one SpaidBot reply quoting OBSERVED FACT lines for a selected FVG |
| Academy course (21 lessons, myth, quiz, ⓘ) | 4769a31 | `fvgCourse` (22 tests at 4769a31; 24 after c4de0f0), `inventionEducation`, education suites | serving 4769a31: 63/63 lesson × width checks, no overflow | `~/wm-held/proof/academy-fvg-lesson*-{1440,390}*.png`, `academy-fvg-quiz-{pass,recorded}-390.png` | **PROVED** |
| Academy "Show me on a chart" / "Practice in Replay" | c4de0f0 | `fvgCourse` §35 / §56 blocks | local: the link resolves to `/charts?scene=clean&on=fvg` | `academy-fvg-showme-chart-1440.png`, `academy-fvg-lesson9-390-scrolled.png` | **PARTIAL:** territories visible on the landing chart on serving |
| Selling pass (/welcome, /pricing, /login) | a10514f → d5ac6ff | `sellingStory.test.ts` (11), `frontDoorPalette`, auth, pricing suites | serving d5ac6ff, signed out: story present on all three, no horizontal scroll, no element past the right edge, no link or button under 44 px, at 1440 and 390 | `~/wm-held/proof/selling-prod-d5ac6ff-*.png` (+ `selling-before-*` from before a10514f) | **PROVED** for content and layout. One fix after the serving read: /welcome sample-chart axis labels drew ~5 px tall at 390, now 19 units under 600 px (shipped eea2771) |
| Academy module-list scrollbar (Sheriff) | 57e9fda | `src/lib/academy/academyScroll.test.ts` (every `scrollbarWidth` in /education and /login carries a `scrollbarColor`) | local: computed `scrollbar-color: rgba(139,106,41,0.55) transparent`, `scrollbar-width: thin` on the module list | `~/wm-held/proof/academy-module-list-scrollbar-1440.png` | BUILT. **PARTIAL:** serving read after it ships. Cause: Chrome 121+ ignores the global `::-webkit-scrollbar` skin on any element that sets standard `scrollbar-width`, and then paints the OS default track · **UPDATE 21:05 CDT:** at 390 / 834 there is no nested scroll area, so no OS track (fabce3a, `~/wm-held/proof/fvg-serving-spaidbot-academy-backtest-2026-10-07.txt`) — **PROVED at 390 / 834**; ≥ 1024 colour still unread · **UPDATE 21:22 CDT:** serving 02e593e at 1440 computed `rgba(139,106,41,0.55) transparent`, thin brass bar; 1024 same colour (`~/wm-held/proof/release-52-intab-night/release52-intab-summary.md`) — **PROVED at ≥ 1024** |

### 6a. §62 per-surface evidence — Scanner, Backtest, SpaidBot, Replay (FVG lane, 2026-10-07)

One row per claim. **PROVED** means a test pins it and a serving receipt was read (SHA named). **PARTIAL** names the missing serving read. Lane receipts not written to a file are cited by build and by what was read. Tests are in `src/`; every file below passes at `8e7beee` or later.

**Scanner (`/scanner` → FVG conditions)**

| Claim | Test | Serving receipt | Status |
|---|---|---|---|
| Five conditions (NEW_FVG, PRICE_APPROACHING_FVG, FIRST_TOUCH, PARTIAL_MITIGATION, DEEP_MITIGATION), each decided at the newest closed bar against the previous close via `fvgStateAsOf` | `lib/scanner/fvgScanConditions.test.ts` | eea2771, own tab, read-only: read 30 of 30, 0 refused, 14 hits across the five | **PROVED** |
| Coverage always carries its denominator ("read X of Y · Z refused · FVG_3C v1") | `fvgScanConditions.test.ts` (coverage) | eea2771: "read 30 of 30 symbols · 0 refused · definition FVG_3C v1" | **PROVED** |
| Boundaries at instrument decimals | `fvgScanConditions.test.ts` (`priceDp`) | eea2771 (after d5ac6ff): TSLA 374.60 – 378.52, NVDA 237.88 – 238.93 | **PROVED** |
| Plain refusals (too few bars, stale, unavailable) | `fvgScanConditions.test.ts`; `lib/marketData/fvg/fvgWireBars.test.ts` (trader words) | fabce3a: the scanner universe read 30 of 30 again, so its own list could not refuse. The SHARED bar reader's refusal was read through the Backtest study (`ZZZZQ 5m`, same `fetchFvgBars` path): it said **"Nothing was studied: Error: Yahoo HTTP 404"** — a vendor name and an HTTP code. **Defect, fixed (uncommitted, next batch):** `traderWords` drops plumbing; that case now reads "No 5m bars could be read for ZZZZQ — it may not be a symbol we can chart, or it has no history at this timeframe." | **PARTIAL:** re-read the refusal on the next build |
| Hit → `/charts?…&on=fvg&select=fvg:<id>` → that object selected | `lib/chart/proofSelectFvgHeld.sentinel.test.ts`, `lib/marketData/fvg/fvgChartLink.test.ts` | 301d85d (chart lane): `data-proof-select-object …\|HELD`, Inspect on that id (`~/wm-held/proof/fvg-serving-inspect-replay-sizes-2026-10-07.txt`) | **PROVED** |
| Convergence FVG + STRUCTURE / FVG + PROFILE (walls omitted: no chain or book on bars) | `fvgScanConditions.test.ts` (convergence), `lib/marketData/fvg/fvgRelationships.test.ts` | fabce3a, own tab, read-only: 10 convergence rows (9 FVG + structure, 1 FVG + profile, 0 wall), e.g. "NVDA · FVG + structure · with new fvg · 237.88 – 238.93 · Market structure broke the swing 234.76 — at formation · FULL (confirmed 5-bar pivots…)" and "QBTS · FVG + profile · with first touch, deep mitigation · 15.78 – 16.40 · Range profile of the 100 bars before formation VAL 16.20 — inside · PARTIAL (CANDLE-EST)"; chips include "FVG + structure", "FVG + profile" | **PROVED** |
| Reads deduped and reused 60 s; aborted on unmount; nothing fetched until the strip is opened and Read | `lib/marketData/fvg/fvgPerformance.sentinel.test.ts`, `lib/marketData/fvg/fvgSilence.sentinel.test.ts` | fabce3a, own tab, resource log (`/api/yahoo … type=candles&tf=1D&bars=160`): page load **0**, strip opened **0**, after Read **30** (one per symbol), "Read again" within 60 s still **30** (reused, no new requests); localStorage byte-identical | **PROVED** |
| Keyboard, visible focus, ≥ 44 px on phone, direction in words | `lib/marketData/fvg/fvgAccessibility.sentinel.test.ts` | none — a 390 px read needs a window resize, which would move other lanes' tabs in the shared window | **PARTIAL:** 390 px tap read — handed to the chart lane (frontmost window) |

**Backtest (`/backtesting?mode=fvg`)**

| Claim | Test | Serving receipt | Status |
|---|---|---|---|
| Study reads the ONE engine as of the study clock; labelled DESCRIPTIVE EVIDENCE · NOT A PREDICTION; definition FVG_3C v1 | `lib/backtest/fvgStudy.test.ts` | eea2771: NQ1! 5m, 991 closed bars, 148 gaps, both labels | **PROVED** |
| Every number n of m (revisits, medians with sample, censoring count) | `fvgStudy.test.ts` | eea2771: revisited 139 of 148; median first touch 2 bars (median of 139); still open 9 of 148, 1 of 9 too young | **PROVED** |
| No future leak when the clock steps back | `fvgStudy.test.ts` (freeze after formation; bar-by-bar = truncated scan) | eea2771: clock at bar 501 of 991 → 73 gaps, revisited 70 of 73, "later bars are not read" | **PROVED** |
| Pooled instruments with instrument / timeframe / session / regime / direction / displacement / opening-gap filters | `fvgStudy.test.ts` | c4de0f0: NQ1! 148 + AAPL 61 + BTC 315 = 524; sessions CRYPTO_UTC_DAY / GLOBEX_DAY / RTH; regime UNTAGGED with its note | **PROVED** |
| Gap list at instrument decimals, with "Open on the chart" and "Journal it" doors | `fvgStudy.test.ts`, `lib/journal/fvgDecisionReference.test.ts` | eea2771: 31388.00 – 31392.50; "Journal it" pre-filled the id on /journal | **PROVED** |
| Relationship splits (structure / profile) from pre-formation bars; n of m; INSUFFICIENT below 20 gaps, no share printed | `fvgStudy.test.ts` (relationship + INSUFFICIENT) | not yet — chart lane reads the split table on serving | **PARTIAL** |
| Read-only: nothing saved by a study | `fvgSilence.sentinel.test.ts` (fetch only on Add) | c4de0f0 / eea2771: localStorage byte-identical before and after | **PROVED** |

**SpaidBot (FVG facts)**

| Claim | Test | Serving receipt | Status |
|---|---|---|---|
| The selected gap's fact block reaches the model's turn: definition id / version, as-of time, lifecycle state, OBSERVED FACT / DERIVED MEASUREMENT tags, evidence per sense, limitations, no fill / probability words | `app/api/spaidbot/fvgContext.e2e.test.ts` (real route, model stubbed), `lib/ai/spaidbotFvgFacts.test.ts` | **02e593e, own tab** (rAF/visibility shim), NQ1! 5m `scene=clean&on=fvg`: a tap at the published `fvgHit` point selected the gap (Inspect REJECTED, four truth layers); "Ask SpaidBot" opened the launcherless panel pre-filled; ONE Send. The request body carried `context.fvg` = 1 record, `selected: true`, `FVG_3C@1`, state REJECTED, boundaries 31424.50–31435.50, `priceDp` 2, `readAsOf` 2026-10-08T02:05:00Z. **The model did not answer** ("SpaidBot's model did not answer in time — nothing was decided"): the route's 30 s first-byte bound ended it. **Defect found and fixed (uncommitted):** the Inspect ask patched `symbol` with the feed streamer id and put "TASTYTRADE:/NQZ26:XCME" in the question; it now patches `fvg` only and asks about "the selected bullish FVG on this chart, 5m" **Second Send (authorised), dae44b0:** prefill "What am I looking at? (the selected bullish FVG on this chart, 5m)"; headers at **29.85 s** (just inside the 30 s bound); reply streamed one sentence — "Here is the breakdown of the selected 5m bullish Fair Value Gap on **NQ1!** based on the current chart data (source tastytrade, last observed 2026" — then ended. Cause: gemini-2.5-flash thinking (≈30 s, and it spent the 1024-token budget) → fixed in 05670f2 (thinking off, 2048 tokens, a MAX_TOKENS cut says so). **Third Send (authorised), 05670f2:** first byte **5.93 s** (was 29.85 s); reply again ended after one sentence — "Here is the breakdown of the selected bullish 5m Fair Value Gap based strictly on the provided chart line" — with NO length-limit note, so the model stopped for another reason the relay did not say. **Fix (uncommitted, next batch):** the relay now relays every text part and names any non-STOP finish reason ("The answer stopped early — the model's reason: …"). Words in all three: no must / will fill, no probability, no score; the second reply began citing source and as-of **Fourth Send (authorised), bf5052b (multi-part relay + stop-reason note live):** headers 8.44 s, stream 11.46 s; a real answer this time — "### Selected Bullish FVG Breakdown · [OBSERVED FACT] Structure & Boundaries: … formed at 2026-10-08T01:40Z with boundaries from 31,424.50 to 31,435.50 · [OBSERVED FACT] Interaction History: first touched at 01:50Z … 4 interactions: REJECTED (39%), REJECTED (2%), REJECTED (52%), OPEN (11%) · [OBSERVED FACT] Lifecycle State: DEEPLY_MITIGATED", cites "source tastytrade, last observed 2026-10-08T02:50:27Z, 2s before this question"; **no** must / will / has-to fill, probability, likely, chance or score. But it still **ended mid-list (775 chars, last char "*") with no finish-reason note and no length note** — so the upstream closed without a non-STOP reason. Hypothesis "the relay dropped later parts" is only partly right (this reply was longer than before). **Fix (uncommitted, next batch):** the relay now reads a last event that has no trailing newline and closes with a `meta` receipt (finishReason, blockReason, chunks, chars, candidatesTokens, endedWithoutFinish) the panel ignores, so the next read names the cause **Fifth Send (authorised), 10d1324, 22:06:35 CDT:** 504 at 30.30 s (model headers never arrived; no stream). **Cause of the mid-answer cuts found on OUR side:** the route linked the upstream to `req.signal` for the whole stream; on the Workers runtime that signal fired after the Response was handed back, aborting the upstream body, which read as a clean end with no finish reason. Fixed in 14de5a0 (`linkUntilHeaders` — the client's abort reaches the upstream only until the headers; after that the relay's `cancel()`; a server-cut stream says `CUT_BY_SERVER`). **Sixth Send (authorised), 14de5a0, 22:17:26 CDT (`date`), own tab, NQ1! 5m, selected bearish gap (REJECTED), prefill "What am I looking at? (the selected bearish FVG on this chart, 5m)":** headers 6.92 s, stream complete 8.58 s; relay meta `{finishReason: STOP, chunks: 34, chars: 2633, candidatesTokens: 861, endedWithoutFinish: false, upstreamAborted: false}` — a complete answer. It tags its claims OBSERVED FACT ×3, DERIVED MEASUREMENT ×4, INFERENCE ×1, HYPOTHESIS ×1; cites "source tastytrade, last observed 2026-10-08T03:17:25Z, 1s before this question"; names the gap's boundaries 31,420.75–31,434.25, first touch and REJECTED state; reads ORDER_FLOW / DERIVATIVES as SILENCE ("provides no evidence either way"); and says "This FVG is a descriptive geometric object, not a forecast — price does not have to fill or respect this gap." No must / will fill, probability, likely, chance or score | **PROVED** (serving 14de5a0, one Send; first-byte spread across all Sends: 29.85 s → 5.93 / 8.44 / >30 / 6.92 s) |
| System prompt carries "Never say price has to fill an imbalance; distinguish observed fact, derived measurement, inference and hypothesis." verbatim | `spaidbotFvgFacts.test.ts`, `fvgContext.e2e.test.ts` | server code (no client receipt applies) | **BUILT** |
| Forged / malformed records say nothing (server re-validates every field) | `spaidbotFvgFacts.test.ts` | n/a (server) | **BUILT** |
| No selection: visible gaps without a SELECTED marker; no gaps: no block; layer OFF: no `fvg` | `fvgContext.e2e.test.ts`, `fvgSilence.sentinel.test.ts` | 683aecf, own tab, `scene=clean` (OFF): chart context had no `fvg` field | **PROVED** for OFF; **PARTIAL** for the ON cases |
| "Ask SpaidBot" (Inspect, Review) opens the existing panel PRE-FILLED and never sends for the trader; patch rides one question | `lib/ai/spaidbotAsk.test.ts`, `fvgContext.e2e.test.ts` | none (no request sent on the Founder's account by design) | **PARTIAL:** panel opening pre-filled, read on serving |

**Replay (FVG under the replay clock)**

| Claim | Test | Serving receipt | Status |
|---|---|---|---|
| Under replay, FVG state = `fvgStateAsOf(replay clock)`; one millisecond before b3's close the gap does not exist | `lib/marketData/fvg/fvgCamera.test.ts` | 301d85d (chart lane): ES1! 5m cursor 4857 / 4977 `REPLAY:1791370800000\|BARS:4857\|LEAK:0`; an object born after the clock drops out; put-down returns LIVE (`~/wm-held/proof/fvg-serving-inspect-replay-sizes-2026-10-07.txt`) | **PROVED** |
| Chart code producing an FVG ledger goes through `fvgSceneForCamera(… replayCursorTimeSec …)`; one detector | `lib/marketData/fvg/fvgCamera.sentinel.test.ts` | 301d85d LEAK:0 at every size (`~/wm-held/proof/fvg-serving-inspect-replay-sizes-2026-10-07.txt`) | **PROVED** |
| Journal reference snapshot is as of the decision time (same as-of accessor) | `lib/journal/fvgDecisionReference.test.ts` | eea2771: at b3 close "born, before price had touched it … 0 bars old"; now "fully mitigated … 4 bars old" | **PROVED** (snapshot); **PARTIAL:** save → reload → same snapshot |
| Performance: one scene object per closed bar; push 0.025 ms on 5,000 bars; tick returns the same scene | `fvgPerformance.sentinel.test.ts` | 301d85d paint MET (chart lane); compute timings are Node / laptop | **PARTIAL:** `fvgCompute` on a phone-class device |

## 7. §63 SHERIFF CHECKLIST — FVG / Imbalance on the glass

The order's exact §63 wording was not in hand; scope is the FVG release. Each line is a test a Sheriff runs on **serving**, signed in, in their own tab, with the hidden-window shim if the tab is not frontmost.

1. **Off by default.** `/charts?symbol=NQ1!&tf=5m&scene=clean`: `canvas.dataset.fvg` is absent or SILENT, and no territory is painted.
2. **On by token.** Add `&on=fvg`.
   - `dataset.fvg` matches `OPEN:\d+\|SCARS:\d+\|HIDDEN:\d+\|DEF:FVG_3C@1`.
   - OPEN ≤ 6 and SCARS ≤ 3.
3. **No future leak (live).** `dataset.fvgAsOf` starts `LIVE:` and ends `LEAK:0`.
4. **No future leak (replay).**
   - Engage Replay and step back 20 bars: `fvgAsOf` starts `REPLAY:` and ends `LEAK:0`.
   - Territories created after the cursor are gone.
   - A territory touched after the cursor shows as untouched.
5. **Clear zone.**
   - No band covers the newest candle's slot.
   - The last price line, and any paper / broker / order line, stays readable (keep-out strips).
   - Screenshot at 1440, 834 and 390.
6. **Grammar, not labels.** Erase the words: remaining = dense, visited = hatch, rejection = tick, acceptance = inner line, traded through = dashed far edge. No price or number is painted on the glass.
7. **Performance.** `dataset.fvgCost` ends `\|MET` after 60 s on NQ1! 1m, and `fvgCompute` ends `PER_CLOSED_BAR`.
8. **Selection.**
   - Tap a territory (the `dataset.fvgHit` centre): `fvgSelected = FVG\|…\|<state>`.
   - Inspect shows the territory at instrument decimals.
   - ⓘ opens `FVG_IMBALANCE` with the no-guarantee sentence and a link to `/education?lesson=fvg-1`.
9. **Door by id.** `/charts?symbol=<s>&tf=<tf>&on=fvg&select=fvg:<OBJECT_ID>` from a Scanner row: `fvgSelected` equals that id.
10. **Evidence honesty.**
    - On EURUSD the territory draws from OHLC, with size in pips.
    - No order-flow claim is attached unless another owner's reading is shown BY REFERENCE.
11. **Scanner.**
    - Each of the five conditions is named with its OBJECT_ID.
    - A refused symbol shows its plain reason, never silent absence.
12. **Backtest study.**
    - Every rate prints as `n of m`.
    - The block is labelled DESCRIPTIVE.
    - Moving the study clock earlier never reveals a later touch.
13. **Journal.**
    - Attach an FVG reference, save and reload: the snapshot is unchanged.
    - Review answers first or later touch, acted before the condition, and held after trade-through; UNKNOWN when a fill time is missing.
14. **SpaidBot.**
    - With an FVG selected, ask "what happened at this gap?": the answer quotes OBSERVED FACT / DERIVED MEASUREMENT lines.
    - No answer says price must or will fill.
15. **Copy sweep.** No FVG surface (glass, ⓘ, Inspect, scanner, study, journal, SpaidBot, Academy) says "must fill", gives a strength score, or treats unfilled as a target.

## 8. §64 SHERIFF CHECKLIST — Academy course + public selling pages

The order's exact §64 wording was not in hand; scope is the two learner- and buyer-facing surfaces this lane shipped.

**Academy (signed in; do not complete quizzes on the Founder's account — use a scene or a local run)**
1. `/education?lesson=fvg-1 … fvg-21` opens each lesson at 1440, 834 and 390. There is no horizontal overflow, and every lesson has its own schematic labelled "not market data".
2. The MYTH card appears on lessons 1, 10, 14, 15 and 16, with the myth struck through and the BETTER QUESTION word for word.
3. Lesson numbers match `FVG-METHODOLOGY.md`: 50 % deep, 2 closes for acceptance, 5-bar rejection window, 0.10 × ATR14 floor, 20 / 300 memory bars, 6 / 3 visibility.
4. "Show me on a chart" goes to `/charts?scene=clean&on=fvg` (+ the lesson's extra layer), and territories are visible there. Before the layer ships, the pending note shows instead.
5. The Replay practice link appears only on lessons 6–10, 14 and 15, and only once the layer ships. Since 2026-10-07 22:2x it reads **"Open on the chart — then press Replay"** and says it does not start Replay itself. The chart has no URL-driven Replay entry; Replay is Workspace → Replay on the chart.
6. The quiz draws from the 14-question FVG bank. A pass records completion **in this browser** ("Progress saved in this browser after verified readback"). Non-FVG lessons are still COMING_SOON.
7. "Show me my examples" lists only Journal trades tagged FVG / Fair Value Gap, and otherwise shows the one plain line.
8. At 390, opening a lesson hides the module list, and the lesson's ✕ brings it back.

**Public selling pages (signed out, production)**

9. `/welcome`, `/pricing` and `/login` at 1440 and 390:
   - no horizontal scroll and no element past the right edge;
   - every link and button ≥ 44 px.
10. Product line "WEALTHY MINDSETS PRO — TRADING OPERATING SYSTEM":
    - /welcome and /pricing headers;
    - /login desktop panel heading;
    - /login phone line plus the "See how it works →" link.
11. The loop reads LEARN → … → LEARN YOURSELF (14 steps, in order). The six territory stages appear on /welcome.
12. "What is live today" on all three pages:
    - broker connection BETA, not enabled for members;
    - orders through your own broker, confirmed by you;
    - data limits by market;
    - not advice, no promised outcome.
13. Pricing is unchanged:
    - Free · Guest $0 / WM Pro App $10 / Passport $20 / WM Pro OS $50;
    - three "Not on sale yet";
    - the Passport intro offer line per `passportPromo`.
14. Copy sweep:
    - no guaranteed outcome, win rate or invented user count;
    - no testimonial, "Now with … indicator" or "all-in-one";
    - no claim beyond what is live.
    - `sellingStory.test.ts` pins this for source; the Sheriff reads the rendered page.
15. The /welcome sample chart says SIMULATED on the chart, in Inspect and in the footer. Its axis labels are legible at 390.

## 9. §52 RESPONSIVE RELEASE TEST — runnable (2026-10-07)

The order's §52 wording was not in hand. This is the responsive release test as two runnable tools that anyone on the team can re-run. They measure the RENDERED page, not source.

| Tool | Where | Session | How to run | Output |
|---|---|---|---|---|
| Public pages | `scripts/release/responsive-public.mjs` | none (signed out) | `node scripts/release/responsive-public.mjs [--base URL] [--widths 1440,1024,834,768,390,360] [--out DIR] [route …]` | PASS / FAIL per route × width, a full-page screenshot each, `release52-public-report.json`. Exit code 1 on any FAIL |
| Signed-in rooms | `scripts/release/responsive-in-tab.js` | your own signed-in tab | paste into DevTools Console on wealthymindsetspro.com, keep the tab in front | `console.table` and `window.__wmRelease52` (rows, failures) |

Both check:
- **REACHED** — no redirect; a redirect is NOT AUDITED and fails.
- **NO_HSCROLL**
- **NO_OVERFLOW** — the innermost element past the right edge, ignoring horizontal scrollers and clipping ancestors.
- **NO_EVICTED** — text laid out 0 px wide or tall, when the element is actually rendered.
- **SMALL_TEXT** (< 10 px) — WARN only.

**TAP_44** (≥ 44 × 44 at ≤ 1024 px):
- In the public script it is a FAIL; that script emulates touch.
- In the in-tab snippet it is only a WARN. A desktop tab is a fine pointer, so rules that enlarge targets under `(pointer: coarse)` don't apply there. Measured: the shell's header buttons read 30 × 30 in the iframe and 44 × 44 under touch emulation at 390.
- The public script also fails on an uncaught page error, and lists console errors as WARN.

First runs, 2026-10-07:
- **Public, production eea2771, 1440 + 390, 8 routes:** 16 / 16 PASS once two false positives in the tool were fixed — elements inside a `display:none` desktop-only panel were being read as "evicted", and elements clipped by an ancestor as "overflow". Warnings:
  - SMALL_TEXT on /login at 390: the WmWordmark "PRO" and the subtitle render at 9 px.
  - CONSOLE: a 401 from the signed-out session probe on every page.
- **In-tab, local dev with stubbed auth, /education /journal /charts at 1440 + 390:** 6 / 6 PASS. TAP_44 warned on the header buttons at 390, which touch emulation shows are 44 × 44 on a phone.
- **Full public run, production, 2026-10-07 20:56 UTC** (`origin/main` was `909177d` at the time; the deployed build was not separately confirmed): **48 / 48 PASS**, 8 routes × 1440 / 1024 / 834 / 768 / 390 / 360.
  - Report and 48 full-page screenshots: `~/wm-held/proof/release-52/` (`release52-public-report.json`, `release52-*.png`).
  - Warnings only:
    - SMALL_TEXT on /login and /login?mode=signup at ≤ 834 px: the WmWordmark "PRO" and "TRADING OPERATING SYSTEM" render at 9 px.
    - CONSOLE: the signed-out session probe's 401 on every page.
- **Re-run, production, 2026-10-07 21:19 UTC** (`origin/main` was `aeb83c9`; the deployed build was not separately confirmed): **48 / 48 PASS** at all six widths.
  - The SMALL_TEXT warning on /login has cleared.
  - The only remaining warning is the signed-out 401 console line.
  - Report and screenshots: `~/wm-held/proof/release-52-b/`.
- **Night re-run, production 02e593e, 2026-10-07 21:07 CDT (02:07 UTC Oct 8): 48 / 48 PASS** at all six widths.
  - No SMALL_TEXT warnings.
  - The only console line is the signed-out 401.
  - Report and screenshots: `~/wm-held/proof/release-52-night/`.
- **Full in-tab run, serving 02e593e, 2026-10-07 21:12–21:22 CDT**, own claude-in-chrome tab, read-only, 14 rooms × 6 widths.
  - First pass 74 / 84. All 10 fails were tool artefacts:
    - /scanner ≥ 768: the collapsed filter drawer's children read as "evicted";
    - /settings × 6: an alias to the chart's Settings drawer, frozen off-screen because the automation tab's `visibilityState` was hidden.
  - Both tool fixes are in `scripts/release/responsive-in-tab.js`: `checkVisibility` up the chain, a `LANDS_ON` alias map, and a refusal to start in a hidden tab. `checkVisibility` is also in `responsive-public.mjs`.
  - Re-measured with frames pumped: **84 / 84 PASS**; the Settings drawer sits inside the viewport at every width.
  - WARN, not filed:
    - TAP_44 in a fine-pointer iframe;
    - SMALL_TEXT at 9 px on the shell masthead and nav ("— A Trading Sanctuary —", Market / Rooms / Community), desk "$" at 7 px, "DAY BIAS / TAPE / REGIME", and the "Beginner" chip.
  - Summary: `~/wm-held/proof/release-52-intab-night/release52-intab-summary.md`.
- **Academy module-list scrollbar on serving 02e593e:**
  - 1440: computed `scrollbar-color: rgba(139,106,41,0.55) transparent`, a thin brass bar, no white track.
  - 1024: same colour; the list does not overflow at that height.
  - **PROVED at ≥ 1024** (closes the §6 PARTIAL).

## 10. §56 LEARNING LOOP — hand-off certificate (management / patience lane, appended 2026-10-07)

Append-only. This row does not edit anything above it. **Correction to §8 item 7:** since 683aecf, "Show me my examples" lists Journal entries that carry a real FVG **reference** (`JournalEntry.fvgRef`); tag text no longer counts.

| Hop | Owner | Door to the next hop | Proof | Status |
|---|---|---|---|---|
| Morning Prep: today's management rules + session plan, and the session verdict with its basis (CLOSED on weekends; "holiday calendar not loaded") | `managementDayRules.ts`, `TodayManagementRules.tsx` | "Open the chart — your ticket's plan card offers these →" (`/charts`, via `INSTRUMENT_VIEW_ROUTE`) | `learningLoop.integration.test.ts` hop 1–3; `managementEmptyStates.test.ts` closed-day cases; serving walk 6e65180 (1440/390, lands on `/charts`, no 404) | **PROVED** |
| Ticket plan card: the draft is frozen on the Decision_ID at the ticket's send; later changes are dated amendments | `managementPlan.ts`, `managementPlanDraft.ts`, `ticketAtSendStore.rememberTicketAtSend`, `ManagementPlanCard.tsx` | "After the trade: review this decision in the Journal →" (`/journal`); no rules today → "set them in Morning Prep →" | hop 1–4 (TICKET_SEND, Morning Prep session line, an amendment, and the paper fill does not refreeze); serving TRADE panel 1440/390 | **PROVED** (the Journal link renders only once a plan is frozen; not yet seen on the Founder's account) |
| Journal: broker capture + FVG reference as of the decision, saved → reloaded identical | `journalCaptureFromFill.ts`, `fvgDecisionReference.ts`, `hydrateJournalEntries.ts` | The entry's Review row; `/journal?entry=<id>` opens it | hop 5; `managementPlanPersistence.test.ts` | **PROVED** (unit) |
| Review: market / planned / actual, deviations, the trader's own "why"; FVG answers | `planSheriff.ts`, `planVsActual.ts`, `planFvgContext.ts`, `BrokerTruthToday.StoryReviewRow` | Each deviation → "Study: Lesson N · title →" (`/education?lesson=fvg-N`) | hop 6; local Playwright `review-1440.png` / `review-390.png`; Sheriff sweep `managementSheriff.sentinel.test.ts` | **PROVED** locally. **PARTIAL** on serving: the Founder has no frozen plans yet |
| Personal Edge: adherence by setup, FVG study list (WHEN / DEPTH / AGE, old gap > 50 bars), market vs execution edge; MEASURED only at n ≥ 20 | `planAdherence.ts`, `planFvgStudy.ts`, `planFvgCounterfactual.ts`, `PlanAdherenceBySetup.tsx` | The most common departure → its lesson | hop 7; `pe-1440.png` / `pe-390.png`; **serving bf5052b proof scene** `/journal?scene=journal-fixture` (sample data, read-only): FVG study list "First touch · 17 decisions · INSUFFICIENT EVIDENCE — 17 of 20 with a recorded R", "Later touch · 4", "Between touches · 3"; MARKET EDGE vs EXECUTION EDGE "INSUFFICIENT EVIDENCE on first touches: 17 traded and 9 not traded (20 each side needed)", "… later touches: 4 traded and 17 not traded", "Your 24 FVG trades with a recorded R averaged 0.14R; 50% closed above 0R … Descriptive only", "Not compared: 2 … 1 …", "DESCRIPTIVE — not evidence of edge"; Academy examples "24 sample decisions on gaps" with as-of state lines | **PROVED** on serving for the FVG study list and the first counterfactual slice (proof scene, sample data); **PROVED** locally; **PARTIAL** on serving for adherence by setup (no entries with plans or FVG references yet) |
| Academy: "Show me my examples" from the trader's own FVG references, with adherence | `fvgCourse.fvgReferencedExamples`, `FvgLessonBody.tsx` | Each example → `/journal?entry=<id>`; lessons 17 / 18 / 19 / 21 → Morning Prep and the Journal ("learn yourself") | hop 8; serving 6e65180: lesson 18 links land on `/morning-prep` and `/journal`, no 404 | **PROVED** |
| SpaidBot: the Decision_ID and the frozen plan as TRADER TRUTH; a factual question that names no emotion | `spaidbotContext.withScenePlan`, `formatChartContextNote`, `spaidbotPlanReview.ts`, SpaidBot system prompt | — (the loop restarts at Morning Prep) | hop 9; `patienceCopy.sentinel.test.ts` | **PROVED** (unit; no provider call) |

The single walk is `src/lib/journal/learningLoop.integration.test.ts`. It asserts the same Decision_ID at every hop, the plan as frozen at the send (the paper fill does not refreeze it, and later changes are dated amendments), and the FVG state as of the decision (`readAsOfMs ≤ decisionAtMs`). Each hop's door points at the next hop.
