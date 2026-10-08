# Garden 19 §29–31 · Erasure tests on serving glass

**When:** 2026-10-07, 00:35–00:55 CDT.
**Where:** production, wealthymindsetspro.com, build f8cb690.
**Who:** the education lane, working in its own claude-in-chrome tab.

## The test

Hide the names of a marking, then its numbers, then the panels around the market. If a trader can still *see* what the marking is about, the invention lives on the market. If the meaning disappears with the words, the invention is text sitting on top of a chart.

- **Label erasure (§29).** Every word on the market is erased:
  - `CanvasRenderingContext2D.fillText` and `strokeText` are turned into no-ops.
  - DOM text inside `.wm-chart-market-pane` is set to `color: transparent`.
  - SVG `<text>` is made transparent.
  - Price-axis and time-axis numerals go too. Shapes, fills, chip backgrounds and line work stay.
- **Number erasure (§30).** Only digits are erased:
  - `fillText` and `strokeText` draw the same string with `[0-9]` removed.
  - DOM text nodes in the pane have their digits removed.
  - Because label erasure removes every glyph, anything that **passes** §29 also passes §30. §30 was judged separately only where a mark's meaning is a number.
- **Panel erasure (§31).** Everything outside the market pane is hidden: rails, Decision/Risk/Why cards, Evidence Lineage, Market Breathing and the masthead. Inspect tickets, first-touch cards and dialogs inside the pane are hidden as well.

Each tool was loaded alone in a clean scene: `/charts?symbol=BTC-USD&tf=5m&scene=clean&on=<token>`. BTC-USD has signed tape, options flow and the derivatives feed. The camera was the default of about 110 bars at MID depth, the iframe was 1440×900, and the hidden tab used a rAF/visibility shim so overlays painted. Each tool was viewed twice: as served, and with label erasure, number erasure and panel erasure all applied together (the strictest case). Where a tool failed, the failure was traced to one kind of erasure. The injection was temporary, ran only in my tab, and nothing was persisted. A scene writes nothing back.

**Which 10.** These are the inventions the proof scenes, the default chart and the Tool Finder put on screen most often. We have no usage telemetry, so this is a judgement call, not a measurement.

## Results

| # | Invention (scene token) | As served | §29 Labels erased | §30 Numbers erased | §31 Panels erased | Verdict |
|---|---|---|---|---|---|---|
| 1 | Living Profile (`LivingProfile`) | Gold histogram fan on the right, POC line with glow, VAH/VAL chips | The fan's shape survives: fat rows are accepted, thin rows are rejected, and the POC line still glows. VAH and VAL become **blank gold slabs**: you can see two bounds but not which is which | Shape survives. POC/VAH/VAL prices are lost, but they are read off the axis, which is also gone | Survives. The profile is on the market | **PASS (shape) · label-dependent bound identity.** The fan was tiny on this camera because the 21:00 drop stretched the price scale |
| 2 | Market Structure (`MarketStructure`) | Pivot triangles, swing legs, HH/HL/LH/LL tags, "STRUCTURE · RANGE" state, swing-high/low lines | Legs and up/down pivot triangles survive, so the swing sequence is perceivable and higher/lower can be judged by eye. **HH/HL/LH/LL tags and the RANGE state are gone.** Nothing in the geometry encodes the state | Survives | Survives | **PARTIAL. Fails label erasure for classification and state.** Proposal: a different triangle fill or stroke for higher vs lower pivots, and leg ink by state |
| 3 | Absorption anatomy (`absorptionAnatomy`) | The Effort mass field (graded bands around price) plus a small hatched absorption shelf; "ABSORBING" verdict; "ABSORPTION SHELF" label | **The effort field survives strongly.** The shelf is a ~10 px hatch inside the field and is **barely perceivable** without its label. "ABSORBING" is text only | Survives | Survives | **PARTIAL. The shelf fails label erasure on salience.** The field reads, the verdict does not. The shelf needs more weight: thickness by effort absorbed, as its own grammar says |
| 4 | Brick Walls (`BrickWalls`) | Walls off camera (90,000 / 95,000); a "▲ 2 WALLS ABOVE" chip; options-flow prints as rings | **Nothing about walls remains.** The only on-camera wall evidence was the text chip. The options-flow rings survive (size and side ink) | (same) | (same) | **FAIL when the walls are off camera.** An off-camera wall needs a glyph, such as an edge brick with a direction notch. On-camera walls were not tested this run |
| 5 | Big Trades (`fp:big-trades`) | One large red cluster disc with ticks, plus a "CLUSTER ×70 · 34.4 @ 84120" callout | **The disc survives:** size gives magnitude, ink gives side, position gives price and time. The callout box survives as an empty frame | Magnitude stays ordinal through disc size. The exact size and count are lost, and that is the correct split | Survives | **PASS** |
| 6 | Bar Delta Keel (`deltaKeel`) | 33 keels (`barDeltaKeels=33\|BASIS:TAPE36`), short ticks on the close edges | Unchanged. Keels have no text | Unchanged | Unchanged | **PASS on erasure, weak on salience.** At MID depth (~110 bars) the keels are 1–2 px ticks and hard to see without zooming. The cost receipt also reads `OVER` (longest 2.00 ms) |
| 7 | Effort → Response (`effortResponse`) | Light columns inside each finished volume bar | Unchanged. Tall volume with a short column (the 21:00 sell-off bars) reads as absorbed effort with no words | Unchanged | Unchanged | **PASS.** The model case for the other inventions |
| 8 | Session Bands (`sessionBands`) | One thin band across the bottom of the time axis, "ASIA" | The band survives as a thin bar. **Which session it is cannot be seen**: only one session is in view, so there is no colour contrast | Survives | Survives | **FAIL label erasure for session identity on a one-session camera.** It reads only where two sessions meet. Proposal: a fixed hue per session that a trader learns |
| 9 | Liquidity Weather (`LiquidityWeather`) | The brass loupe with weather texture; a "LENS STATUS · STEADY" card with persistence/response/vol bars | **The texture survives.** The card's three mini-bars survive as bars. The state word "STEADY" is gone | Survives (the mini-bars carry the values ordinally) | **The status card is a panel.** Without it the texture alone does not say steady or storm | **PARTIAL. Fails panel erasure for state.** The state should live in the texture itself (density or motion) |
| 10 | Profile Memory (`ProfileMemory`) | A dashed level at 85,600 with a band, a test diamond, and "S TPOC EST 85600 · 1 TEST" | The level, band and test diamond survive. **Which memory it is** (session POC vs VAH, which session) and the test count are text only | The price goes with the axis, but the level stays in place | Survives | **PARTIAL. Label-dependent identity.** The test count could be shown as notches |

## Summary

- **PASS: Big Trades, Effort → Response, Delta Keel, and the Living Profile shape.** All four carry their meaning in geometry and ink.
- **PARTIAL: Market Structure, Absorption, Liquidity Weather, Profile Memory.** The phenomenon survives, but its *classification or state* lives in words or a card.
- **FAIL: Brick Walls with walls off camera; Session Bands on a one-session camera.** The words are the only evidence.
- **Salience is a separate failure from erasure.** The absorption shelf and delta keels have no text dependency, yet both are hard to see at MID depth. Erasure can't catch that; a "squint test" at default depth would.
- **Consistent with `GARDEN19-INVENTION-CERTIFICATES.md`.** That document predicted A1 (bar-delta numerals) fails number erasure and A5/A7 fail panel erasure. None of those were among these 10. `vpRowNumbers` was not shown at this depth, so its number-erasure question is still open.

## Not tested this run

- On-camera Brick Walls (needs a camera at 90k or 95k).
- Phone and tablet widths.
- Spot FX, where the volume tools are silent by design.
- Living Profile at NEAR zoom (row numerals).
- Memory Ghost and Contradiction (both need a selection).

## Phone

**Run:** production at f8cb690, 2026-10-07 ~00:50 CDT. Signed-in owner session in Claude's own Chrome tab. A same-origin iframe at **390x844** loaded
`/charts?symbol=BTC-USD&tf=5m&scene=clean&on=BrickWalls,FlowCurrent,fp:big-trades,LivingProfile,MarketStructure,absorptionAnatomy,effortResponse,deltaKeel`.
The hidden-window rAF/visibility shim was injected, otherwise overlays never paint.

**Erasure:** injection only. Every element outside the market pane, and every non-canvas element inside it, was set to `visibility:hidden`, leaving canvas paint only. The same was run at 1180x820 as a desk reference.

**Evidence:** the MainChart canvas `data-*` receipts on the main canvas, read in the same frame. At 390 the plot is under `NARROW_GLASS_MAX_PX` (600), so `semanticPermission=MID|…|NARROW`. Every SPEAK layer outside `NARROW_GLASS_KEEPS_WORDS` is QUIET (geometry without words). That is the intended design, and it is exactly what this test measures the cost of.

### Results at 390x844 (depth MID, 39 bars on camera)

| Enabled intelligence | Receipt | Perceivable with cards erased? |
|---|---|---|
| Brick Walls | `brickWalls=ON:2`, `optionsOiWalls=CALL_OI@90000\|95000\|100000\|PUT_OI@75000\|78000\|80000`; camera 83,760–84,440 | **FAIL: nothing on the glass.** The desk prints `▲ 2 WALLS ABOVE · 90000.00 · 95000.00` on canvas. On the phone that word is quieted, and it was the only evidence. The lens is ON and silent. |
| Market Structure | `marketStructure=DRAWN`, `Bias=RANGE`, `Pivots=2`, `Path=1` | **PARTIAL.** The pivot tags (HL/LH triangles) survive. The verdict `STRUCTURE · RANGE` and "5 newest bars not yet confirmable" are words, so they are gone. The path line does not read at this width. |
| Absorption Anatomy | `absorption=DRAWN`, `absorptionChips=0/2`, `absorptionTerrain=…ABSORBING:8`, `absorptionDepthForm=SHELF+EFFORT_TICKS` | **PARTIAL.** The effort field (grey terrain) and the shelf box survive. The STATE does not: `ABSORBING` and the two zone grades (`ABSORPTION 3.39 / 4.93 MODERATE` on the desk) are chip words, withheld 0/2. Absorbing and not absorbing look the same. |
| Big Trades | `bigTradeBubbleStatus=DRAWN`, `bigTradeClusters=1/132`, `bigTradeCallout=NONE:NARROW_QUIET` | **PASS** for the event: the cluster disc with `×N` inscribed and the ↓ side. The dominant callout (`CLUSTER ×133 · LARGEST PRINT · 99.9TH PERCENTILE` on the desk) waits by design, so rarity is not perceivable until tapped. |
| Living Profile | `livingProfile=DRAWN`, lane 248–310, `livingProfileBodyGoverned=OVER_PRICE:0.5`, `profileLevelChips=3` | **PASS** (kept words: VAH/POC/VAL). The VAL label sits over the newest candles and the WAIT tag; POC and VAL are 1 px apart in y. |
| Effort → Response | `effortResponse=DRAWN:N43\|A3\|I4\|V3…`, `responseCells=44\|ABS:3\|INIT:4\|VAC:3` | **PARTIAL.** The columns are perceivable as 1 px light slivers inside 6 px volume bars. The three classes (absorption / initiative / vacuum) are not distinguishable at this width: one ink, one width. |
| Delta Keel | `barDeltaKeels=33\|BASIS:TAPE37+SIDES0\|FAIL:14` | **FAIL (salience).** 33 keels drawn, 14 of them hollow (failed aggression). None is distinguishable on 6 px candles at MID. This is the desk's "salience" failure, worse on the phone. |
| Flow Current | `flowCurrent=QUIET:POOLED2:19\|LIVE\|SHOWN:8` | **FAIL (unattributable).** The receipt says 8 segments are shown quiet. With the cards erased, none of the paint can be told apart from the absorption terrain or the response paths. |
| Folded silences | `silenceFolded=1` | **PASS.** The `1 SENSE SILENT — TOOLS › ACTIVE` line paints on canvas. It sits over the volume bars, under the R/A/%/L chips. |

### MainChart asks for the chart lane (phone, narrow glass)

1. **Brick Walls off camera need a wordless edge mark.** When `brickWalls=ON` and every wall is outside the visible price range, draw a glyph at the price-axis edge on the side the walls are: ▲ at the top inner edge, ▼ at the bottom, plus a count numeral. Draw it at every width, including narrow glass. Today the only evidence is the `WALLS ABOVE` sentence, which the narrow budget removes. Receipt: `brickWallsOffCamera=ABOVE:2|BELOW:3|MARK:DRAWN`.
2. **Absorption state through ink, not chips.** On narrow glass, an absorbing shelf must look different from a non-absorbing one without words: for example the absorption-gold edge plus a filled grade bar (MODERATE / STRONG as one or two ticks). `absorptionChips=0/2` currently withholds the only state signal. Receipt: `absorptionStateInk=ABSORBING:2|GRADED:2`.
3. **Market Structure bias as one glyph.** With the verdict quieted, keep a single wordless bias mark at the newest pivot: ↔ for RANGE, ↗ / ↘ for trend. Optionally thicken the swing path for a 6 px bar spacing. Receipt: `marketStructureBiasGlyph=RANGE`.
4. **Effort → Response classes need separable ink at ≤6 px bars.** Either colour by class (ABS / INIT / VAC), or give VAC a hollow column, so the three are distinguishable when a column is 1 px wide. Receipt per class drawn.
5. **Delta Keel salience at MID on narrow glass.** At least 2 px keels and at least 3 px length, with the hollow (FAIL) keels drawn in the failure ink, or only FAIL keels on narrow glass. Today 14 failed-aggression bars are invisible. Receipt: `barDeltaKeelsNarrow=FAIL_ONLY|W2`.
6. **Flow Current must be attributable when QUIET.** Its quiet form needs one ink or stroke no other layer uses, so a trader can tell it is on. Receipt `flowCurrent=QUIET…` should name that form.
7. **Living Profile labels must not sit on the newest candles.** At 390, `OVER_PRICE:0.5` puts the VAL label across the forming candles and the WAIT tag. The narrow lane should push the level labels into the axis gutter, or stack POC/VAL with a minimum 12 px gap.
8. **The folded-silence line should move off the volume bars.** At 390 it is drawn across the volume histogram, where the DOM R/A/%/L chips also sit. Place it at the top-left of the price pane instead.

Screens: `~/wm-held/proof/g19-charts-390x844-erasure*.png` (local, the same scene before §22). The production frame was read live; its receipts are quoted above.

## MainChart asks for the chart lane (the two erasure fails)

The education lane does not edit `MainChart.tsx`. Each ask below names the code as it stands on serving f8cb690 and says what a fix must do. An ask is done when the phenomenon is still readable with every glyph erased (same harness as above).

### ASK-1 · Brick Walls off camera: give the off-camera wall a glyph, not only a chip

- **Today** (`MainChart.tsx` ≈ L17462–17483, the derivatives block's `offLines`): walls beyond the camera become ONE text chip per direction, e.g. `▲ 2 WALLS ABOVE · 90000 · 95000`. It is drawn by `chip()`: a `rgba(11,10,8,0.86)` slab plus `fillText`. The slab is near-black on near-black, so with labels erased **nothing is visible**. The chip is drawn only when `dpSpeaks`.
- **Ask:**
  1. On the pane edge the walls lie beyond (top for ▲, bottom for ▼), just left of `plotRightD`, draw an **edge brick stack**: one masonry brick per off-camera wall, in the same brick ink and course pattern the on-camera wall uses.
     - Brick length ∝ `share` of gross exposure.
     - Stacked by distance, nearest wall closest to the edge.
     - A 4 px notch or chevron points off camera.
  2. Draw the stack whenever the walls layer is on, not only when `dpSpeaks`. The text chip becomes an optional label riding on the stack.
  3. Make the stack a hit target. A tap selects the nearest off-camera wall (`SelectedPressureWall` by strike), so Inspect opens the wall ticket. That ticket now carries the §28 EVIDENCE line (DEGRADED for a DELAYED Cboe chain, PARTIAL for a Deribit snapshot).
  4. Publish a receipt: `canvas.dataset.pressureWallsOffCamera = "UP:<n>|DOWN:<n>"`, so a probe can prove the glyph without reading words.
- **Done when:** with labels and numbers erased on BTC-USD 5m (walls at 90k/95k, price 84k), a viewer can say "walls exist above, two of them, the nearer one heavier", and a tap on the stack opens the wall ticket.

### ASK-2 · Session Bands on a one-session camera: draw the lanes it is not using

- **Today** (`MainChart.tsx` ≈ L10046–10093):
  - Session identity is encoded twice: by **lane height** (`laneY.ASIA` top, `LONDON` middle, `NEW_YORK` bottom, 3 px lanes with a 1 px gap) and by **ink** (ASIA `120,170,190`, LONDON `201,165,92`, NEW_YORK `170,150,210`).
  - Only lanes with a span in view are filled.
  - On a camera inside one session (BTC-USD 5m overnight showed only ASIA), a single 3 px strip floats with no reference. Its height says nothing because the other two lanes are absent, and its ink is learned only by contrast. With labels erased, which session it is cannot be seen.
- **Ask:**
  1. While the bands are on and the timeframe is intraday, always stroke the **three lane rails**: a 1 px hairline at 0.10 alpha in each lane's own ink, across the plot (`0 → plotRight`). An occupied lane then fills its rail, and an empty lane still shows where the other sessions live. Lane position becomes readable on any camera.
  2. At each band's left end, draw a tiny fixed **lane mark**: 1, 2 or 3 stacked ticks for ASIA, LONDON and NEW_YORK. It is a learnable shape that does not depend on colour vision.
  3. Keep the existing word labels and the overlap wash (`LDN_NY_OVERLAP`) as they are.
  4. Receipt: `canvas.dataset.sessionBandRails = "3"` while the rails are drawn.
  5. Budget: the rails are three `fillRect` calls per frame, inside `SESSION_BANDS_BUDGET_MS`.
- **Done when:** with labels erased on a one-session camera, the filled lane's position against the two empty rails says which session it is, and the tick mark agrees.

## §28 · Inspect depth audit (2026-10-07, education lane)

For each selectable invention, Inspect must show four things:
1. What was measured.
2. Its source and as-of time.
3. Its evidence class (FULL / PARTIAL / DEGRADED / SILENT) and why.
4. The numbers the canvas withholds.

**Before:** every ticket printed what its owner measured. The class word, the source and the feed's degradation were uneven, and the bar-level readings had no Inspect at all.

**After** (unshipped at this writing):
- `src/lib/chart/inspectEvidence.ts` is the one owner of the class word.
- `src/lib/chart/barCandleReadings.ts` gives the bar's own readings.
- `ChartInspectTicket` renders both.

| Selectable | Ticket | Measured | Source + as-of | Class (rule) | Withheld numbers | Gap closed |
|---|---|---|---|---|---|---|
| Zone / level | Market Object Passport | birth bar, tests, response history | birth bar's admitted source, `INSPECTED AS OF` footer | **added:** FULL with an admitted birth identity, PARTIAL without | test depths, prices, ids | class line |
| Big trade / cluster / single print | print tickets | price, size, time, side, rank, raw tape | **added:** tape source; as-of = execution time | **added:** FULL when the venue stamped the side, PARTIAL when inferred, DEGRADED when no side | size, count, members, percentile | class + source |
| Delta zone | delta-zone ticket | net, bought/sold, anchor | **added:** tape source + bar time | as for prints | net, bought/sold | class + source |
| Absorption shelf / exhaustion | anatomy ticket | effort, displacement and Δ per bar; ratios | **added:** bar source; as-of = the window's end | **added:** FULL signed, PARTIAL inferred or volume-only, SILENT when unmeasured | per-bar %, ratios | class + source |
| Brick wall | wall section | OI, exposure, share, life, tests | chain fidelity and clocks (already there) | **added:** PARTIAL for a public snapshot, DEGRADED for a delayed chain, SILENT when not compiled | OI, $ per 1% move, share | class word |
| Zero-gamma front | front section | climate, ratio, contracts | already there | **added** (same rule as walls) | ratio, contracts, envelope | class word |
| Profile lane (slice) | profile-slice ticket | share of POC, location, node, biography | **added:** source (tape when trade-based, bars when estimated) + as-of | **added:** FULL trade-based, PARTIAL candle-estimated, SILENT for an empty bucket | share %, distance, POC path | class + source |
| Liquidity weather | weather section | segments, prints, ratios | provenance (already there) **+ added:** source and as-of | **added:** FULL tape, PARTIAL derived from bars, SILENT when unmeasured | ratios, dispersion | class word |
| Effort → Response bar | bar ticket · ACROSS THE CANDLES | **added:** cell, effort × median, response in ATR | bars, ranked over the trailing window, stated as such | **added:** FULL, or SILENT with the owner's reason (no volume / forming / too few bars) | effort ×, ATR, × median | **new** |
| Delta keel bar | bar ticket · ACROSS THE CANDLES | **added:** winner, failed-to-displace, bought/sold, ratio | tape ladder row, else provider bar sides | **added:** FULL tape, PARTIAL provider sides, SILENT none or spot FX | bought, sold, ratio | **new** |
| Session band | bar ticket · ACROSS THE CANDLES | **added:** which session(s) the bar sits in | the clock | FULL (a clock fact) | — | **new** (also covers ASK-2's identity in Inspect) |
| Wisdom line | not selectable | — | — | — | — | **ASK-3** |
| Any bar | bar ticket | volume, delta, imbalance, fidelity rows | **added:** bar source + tape source | **added:** FULL when signed tape reaches the bar, PARTIAL for OHLCV only | (rows, as before) | class + source |

**Degraded behaviour.** A DELAYED, STALE, REPLAY, PROXY or UNAVAILABLE feed lowers any FULL or PARTIAL class to **DEGRADED**. The line says "Lowered to DEGRADED: the feed is X" and prints the feed's own sentence, the same words as the ⓘ preview. A PARTIAL feed (some senses missing) never lowers a reading whose own sense is present. SILENT is never raised.

### ASK-3 · Wisdom line: make it selectable

- **Today:** the cross-candle wisdom line (`readCrossCandleWisdom`, MainChart ≈ L23848) is drawn with a hairline to its bar, but it is not a selection kind. Inspect cannot show which readings it was traced from.
- **Ask:** a tap on the line selects the bar its hairline is tied to, through the room's one selection owner, opening the bar ticket. Publish the traced sources on the canvas as `dataset.crossCandleWisdomTrace = "<kind>|<barTime>|<sources>"`, so the education lane can print them under ACROSS THE CANDLES without reading MainChart's state.

## Full-registry re-run · serving 69fb204 · 2026-10-08 02:07–02:20 CDT (Sheriff lane)

**Harness.** Same law as above, run in the Sheriff lane's own tab: `/charts?symbol=BTC-USD&tf=5m&scene=clean&on=<token>` in a same-origin iframe, rAF/visibility shim, `fillText`/`strokeText` turned into no-ops **before first paint**, then every non-canvas element hidden (label + number + panel + mobile-card erasure at once). One token per load; the main canvas `data-*` receipt quoted per row. 1180×820 for every token; 390×844 for the inventions with geometry. Equities closed, BTC trading (crypto 24×7). An automated ink count was tried first and dropped: some layers paint on canvases the count did not read (Market Structure's legs), so it reported false FAILs. Every verdict below is from the erased frame itself.

**Verdict key.** PASS — the phenomenon reads with no words. PARTIAL — it reads, but one named part (identity, state, sign, salience) needs words. FAIL — nothing readable without words. SILENT — the owner correctly drew nothing tonight (its receipt names why); erasure cannot be judged until it speaks.

| Invention (token) | Receipt (1180) | 1180 erased | 390 erased | Verdict |
|---|---|---|---|---|
| Market Structure (`MarketStructure`) | `Bias=RANGE`, `PivotForms=FILLED:2\|HOLLOW:3` | filled vs hollow pivots, ↔ bias glyph at the newest pivot | same, ↔ visible | **PASS** (was PARTIAL — ASK done) |
| Absorption Anatomy (`absorptionAnatomy`) | `absorptionStateInk=ABSORBING:1` | effort terrain with a gold absorbing edge; shelf box | same | **PASS** (was PARTIAL) |
| Brick Walls, off camera (`BrickWalls`) | `brickWallsOffCamera=ABOVE:2\|MARK:DRAWN` | edge brick stack top-right | edge mark visible | **PASS** (was FAIL — ASK-1 done) |
| Profile Memory (`ProfileMemory`) | `profileMemoryForms=POC_SOLID:1\|EDGE_DASHED:2\|NAKED_OPEN_CAP:1` | solid vs dashed levels, open cap | — | **PASS** for kind; which SESSION still words-only → PARTIAL |
| Session Bands (`sessionBands`) | `DRAWN:A1\|L1`, `sessionBandRails=3` | rails drawn but ~1 px at the axis foot | not perceivable in the crop | **PARTIAL (salience)** — rails exist (ASK-2 shipped) but read only when zoomed |
| Liquidity Weather (`LiquidityWeather`) | `LensState=DRAWN` (1180), `YIELDED_SMALL_PANE` (390) | loupe + grain survive | lens yields on the phone — nothing drawn | **PARTIAL** — one stage tonight, so grain-by-stage is unproven; on 390 the lens is withheld by design |
| Imbalance Stack (`ImbalanceStack`) | `imbalanceSlabs=1\|SELL:1` | small sell slab beside the candles | — | **PASS, weak salience** |
| Value Candle (`ValueCandle`) | `valueCandleForm=GLASS_PER_BAR:13` | faint glass behind the newest 13 bars | — | **PARTIAL (salience)** |
| Flow Current (`FlowCurrent`) | `BARS:13\|LIVE\|SHOWN:6` | 6 thin marks near the newest bars | — | **PARTIAL (attribution)** — unchanged from the phone finding |
| Clarity Candle (`ClarityCandle`) | `clarityNotable=5`, `clarityCallout=PINNED` | candles re-inked gold; callout becomes an empty frame | — | **PARTIAL** — notable-bar meaning lives in the callout's words |
| Effort Mark (`EffortMark`) | `effortMarks=21/150` | small ∨ ticks above/below bars | — | **PASS, weak salience** |
| Delta Levels (`DeltaLevels`) | `Lane=LEFT_EDGE`, `Rungs=7` | left-edge rungs (length = size) | — | **PARTIAL (sign)** — every rung one ink; buy vs sell needs the caption |
| TPO Profile (`TpoProfile`) | `tpoProfileRows=95` | cell grid + VA lines; POC/VA chips empty | — | **PASS (shape)**, bound identity words-only (as Living Profile) |
| Value Migration (`ValueMigration`) | `Points=346`, `Sessions=2` | dotted VA trails + session boxes | — | **PASS** |
| Composite / Visible Range / Session VP | rows 91 / 66 / drawn | histograms survive; POC/VA chips empty | — | **PASS (shape)**, bound identity words-only |
| Regime Lighting (`RegimeLighting`) | `regimeLighting=TREND` | hatched trend channel with rails | — | **PASS**; the verdict word chip is empty |
| Question Lens (`QuestionLens`) | `questionLens=ABSORPTION:2` | tinted zone + circled bars | — | **PARTIAL** — which question was asked is words-only |
| MTF Ancestry (`MtfAncestry`) | `BAND:4H … INSIDE`, node | 4H band + node | — | **PARTIAL** — the parent timeframe is words-only |
| Derivatives Pressure (`DerivativesPressure`) | `PRESSURE:MIXED`, `Texture=ON` | climate wash + clear zone | — | **PARTIAL** — only MIXED tonight; tint-by-climate unproven |
| Liquidity Lifecycle (`LiquidityLifecycle`) | `APPEARED,APPEARED`, `Painted=2/2` | two tiny marks at the newest bar | — | **PARTIAL (salience/state)** |
| Structure Profile (`StructureProfile`) | `RULE_SHORT_LEG` (silence) | bracket + empty chip | — | **SILENT** — but the silence reason is a word in a chip |
| Profile DNA (`ProfileDna`) | `Shape=ELONGATED` | tiny spine/diamond by the axis | — | **PARTIAL (salience)** |
| Scaffolding (`scaff:FOUNDATION`) | `Form=CARD:FULL` | a large empty card frame + 1 swing mark | — | **FAIL by design** — a teaching card is words; flagged so it is never counted as a market invention |
| FVG (`fvg`) | `OPEN:6\|SCARS:3\|HIDDEN:54` | open bands vs thin scars | bands survive | **PASS**; direction is ink + position (not colour alone) |
| Footprint delta / imbalance (`fp:delta`, `fp:imbalance`) | `footprint=delta\|TRAIL`, `imbalance\|Rows:25` | delta bubbles (size + ink); small imbalance cells | — | delta **PASS**; imbalance **PARTIAL (salience)** |
| Delta Keel (`deltaKeel`) | 390: `Narrow=FAIL_ONLY\|W2`, 1 keel | — | the one FAIL keel not perceivable | **PARTIAL (salience)** — unchanged |
| Living Profile (`LivingProfile`) | `livingProfile=DRAWN`, lane 248–310 (390) | fan + chips | fan survives; empty VA/POC chips still sit over the newest candles | **PASS (shape)**; overlap ask stands |
| Rvol Tone (`rvolTone`) | `rvolWeight=48` | tone differences not perceivable at this scale | — | **PARTIAL (salience)** |
| Anatomy Cards / Memory Ghost / Expected Envelope / Contradiction / Risk on Price / Wisdom Line / Delta Divergence / Profile Fusion | `AT_REST` / `NO_ANALOGUE` / `TOO_FEW_SESSIONS` / `NOT_ENOUGH:0/0` / `NO_POSITION_DRAWN` / `SILENT:NO_EVIDENCE_OBJECT` / `NO_SWING` / `FEWER_THAN_TWO_SPECIES` | nothing drawn | — | **SILENT** — correct; re-test when they speak |
| Big Trades / Effort→Response | — | — | — | **PASS** (unchanged from the first run) |

### MainChart asks for the chart lane (from this run)

1. **ASK-4 · Delta Levels sign by ink.** Buy rungs and sell rungs share one ink; with the caption erased the sign of each level is gone. Two inks (or a side notch) per rung. Receipt: `deltaLevelsSides=BUY:<n>|SELL:<n>`.
2. **ASK-5 · Identity glyphs for the parent / question / session readers.** MTF Ancestry (which timeframe), Question Lens (which question), Profile Memory (which session) carry identity in words only. A learnable mark per kind (tick count, corner notch) as Session Bands did.
3. **ASK-6 · Salience floor at MID.** Value Candle glass, Delta Keel, Liquidity Lifecycle marks, Profile DNA glyph, Imbalance cells, Rvol Tone and the Session Band rails are present but sub-perceptual at default depth (1–2 px). A minimum stroke/extent at MID, with the receipt naming it (`<layer>Salience=W2`).
4. **ASK-7 · Clarity callout.** The pinned callout erases to an empty frame; the notable bar needs a mark on the bar itself (the frame alone says "something here").
5. **ASK-8 · Living Profile chips at 390** still overlap the newest candles (unchanged from ask #7 of the phone run).
6. **ASK-9 · FVG left pill at 390** — the red band pill at the left edge sits on the countdown chip (`fvg` scene, 390×844).
7. **Liquidity Weather / Derivatives Pressure** — state-by-texture can only be proven when a second state occurs; the receipts should name the texture form per state (`liquidityWeatherStageInk`, `derivativesPressureTint`) so a probe can prove it without waiting for the market.

### Not covered this run
Pressure walls ON camera (BTC price far from 90k/95k), spot FX, NEAR zoom row numerals, selection-only objects (Memory Ghost, Contradiction). Fresh camera needed for each.
