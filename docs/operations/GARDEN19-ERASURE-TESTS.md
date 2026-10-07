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
