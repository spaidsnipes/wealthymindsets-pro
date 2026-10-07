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

## 4. Open items (not closed by this pass)

1. **Live glass:** taken in pass 2 for every URL-provable switch on four symbols (§1f).
   - Still unmeasured: Exhaustion (no proof token), DELTA_VP and ANCHORED_RANGE (drag tools), and phone / tablet widths.
   - Every row was read on desktop only; no screenshots were taken.
2. **Plates:** 9 opened (§3a).
   - No Founder plate exists for Breathing, CVD relationship, Failed Aggression, Order Flow Compression, TED or Structure state.
   - The only CLC plate is off-topic.
3. **`inventionCensus.ts`:** 20 `G19.*` rows added in pass 2. vitest `src/lib/canon` passes 23/23; tsc shows no errors in that file.
   - 00:16 CDT, after the freeze: `G19.CROSS` → PARTIAL (owner `src/lib/chart/fxRelatedFlow.ts`) and the `G19.RVOL` gap text corrected. Uncommitted. vitest canon + inventionEducation 33/33 pass.
4. **Founder confirmations still owed:**
   - the TED definition;
   - approval of the C-01, C-04 and C-13 grammars;
   - the Garden 18 PROPOSED plates for Breathing, Response Matrix and TED (`GARDEN18-SUPER-ORDER-RECEIPT.md` §4) predate Garden 19's Class A law and should be re-read against it.
