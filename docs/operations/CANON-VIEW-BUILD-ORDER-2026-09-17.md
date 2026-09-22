<!-- ath-standing-authority: 2026-09-19 -->
<!--
  THE ONE DECLARED EXEMPTION from `datedDocsAreDemoted.sentinel.test.ts`.

  That Sentinel demotes every operations doc whose FILENAME names a day, because
  a point-in-time record wearing the present tense coaches a worker into whatever
  month it was written. Forty-five docs were demoted under it on 2026-09-19.

  This file has a dated filename and is NOT one of them: it is the current
  first-read authority for this lane, and `viewBuildOrder.sentinel.test.ts`
  independently requires it to still claim that. Demoting it would set two gates
  against each other, so it opts out HERE, in its own body, where its next author
  actually looks — rather than in an allowlist inside a test file they will never
  open.

  The date above is the day this was last RE-MEASURED, not the day the file was
  written. An exemption that cannot go stale is not an exemption, it is a
  permanent escape — so the Sentinel refuses a bare, undated claim.
-->

# CANON VIEW BUILD ORDER — supersedes the §13 gate list for this lane

**Founder directive, 2026-09-17:** *"why arent the rest of the mockups in the
visuals cannon being built"* … *"this is what i should see in there proper
sections on the chart in there drop downs or wherever they belong"*.

Any agent picking up the ATHOS WM Pro shift reads THIS FILE FIRST. The standing
`/loop` prompt names only truth-gates (Delta Bubbles ownership, VP geometry,
Decision Memory callers, paper execution realism, responsive proof). Not one
canon asset is in that list, which is why 15 of 20 mockups were never built.
That was a scoping defect in the order, not a blocker in the code.

---

## THE HONEST STATUS (from WM-PRO-VISUAL-DEBT-REGISTER-2026-09-02.md)

| State | Assets |
|---|---|
| RUNTIME MATCH | 10 (Full OS Overview), 14 + 16 (Market Object Passport) — as of 2026-09-02 |
| SHIPPED SINCE | 06 (Absorption, `f7bd2697`), 03 (Aggression, `42a495e4`), 05 (Big Trades, live-observed 2026-09-18), 15 (Continuation, `cf23c7ba`), 17-in-part (one owned block inside Continuation, `91cd493c`), 01 (Worksheet, `06da4454`) — see the gated VIEW-STATUS table below, which is the authority |
| PARTIAL | (none) — the row emptied 2026-09-21. See the two re-measurements directly below; neither asset was still PARTIAL, and they had drifted in OPPOSITE directions. |
| RETIRED IN PART, DO NOT RE-MOUNT | 09 (Order Flow Cockpit) — re-measured 2026-09-21. `OrderFlowCockpitStrip` has ZERO production mounts: it was deliberately unmounted by `777665d` ("Keep order flow behind Smart Money", 2026-09-14) and is now BANNED from the dashboard by an assertion — `chartsMarketFirst.test.ts:46` requires the source `.not.toContain("<OrderFlowCockpitStrip")`. The orphanage triage files it under "Closed questions — do NOT 'fix' these by mounting them" (`batons/WM-PRO-SHIFT-2026-09-15-B-THE-ORPHANAGE-TRIAGE.md:198`). Its selector `selectAggressorFlow` DOES ship, through `SmartMoneyPanel.tsx:565,829-845`. The Asset 09 *workspace* (a full three-column surface) has no compiler and is NOT PRIORITISED as of 2026-09-21. |
| RUNTIME MATCH | 07 (Evidence Debt) — re-measured 2026-09-21, and it had already reached RUNTIME MATCH at `9377467`. `CanvasSummaryPill` is mounted on FOUR routes (`ChartsDashboard.tsx:2451`, `journal/page.tsx:2632`, `nectar/[symbol]/page.tsx:223`, `ai-bot/page.tsx:322`) and is fed by `composeMarketCanvasVM` — the canonical owner, not a second opinion, enforced by `composeMarketCanvasVM.enforcement.test.ts:147`. The dedicated question-mode surface the old PARTIAL row was waiting on also shipped: `DecisionWhyPanel` behind a `▸ Why` button (`ChartsDashboard.tsx:200,1459,2707,3223`). **THE OLD ROW WAS STALE THE DAY IT WAS TYPED** — it cited the visual debt register, and that register had ALREADY recorded this upgrade at `WM-PRO-VISUAL-DEBT-REGISTER-2026-09-02.md:122`. Copying a status out of a source without reading the line that supersedes it is the same failure as re-typing one from memory. Outstanding as of 2026-09-21: no test bans the mockup's fabricated `87%` / `Confirmed / Partial / Missing` triad from the visible text, and no live-observed frame is recorded. |
| GENUINELY BLOCKED | 08 (Liquidity Weather Heatmap) — needs a licensed Level 2 depth provider. Building it now would be decoration and would violate LIVING-PIXEL LAW. Unchanged 2026-09-18. |
| NOT BLOCKED, NOT PRIORITISED | 19, 20 — as of 2026-09-21. Both mockups were LOCATED in Drive on 2026-09-21 (`WM_Transformation_UI_19_Absorption_Anatomy_Alternate.jpeg` = `15WuCL5jrkmBvT5a5ZoOtxxf1r5edTLrV`, `WM_Transformation_UI_20_Big_Trade_Intelligence_Alternate.jpeg` = `1NA3UwxmjyAlRwr8XMg2-4TXmVm7AmCAv`, parent `14YX9JmdGGQqPyqorqKxh0BkXnOp1KuxU`), so "where is the image" is no longer the blocker. **Neither can be scoped until the JPEG is actually READ** — they are ALTERNATE compositions of the shipped 06 and 05, to be compared and MERGED into those views, and you cannot honour LIVING-PIXEL LAW against a mockup you have not seen. 04, 11, 12, 13 left this row on 2026-09-21: all four are shipped (see below). |
| REFUSED IN SUBSTANCE, RECORDED NOT SILENT | 17 — nine of its ten elements are hue-graded percentages with no owner anywhere in this repo. Refusing them is the decision; the one block that had an owner shipped inside Continuation. 18 — needs a signed tape and is honest only on crypto. |

Only **one** asset is actually blocked. The rest were simply never asked for.

**THIS ROW DRIFTED AGAIN ON 2026-09-18 AND WAS CAUGHT BY ITS OWN SENTINEL.** It
listed 01, 15 and 17 as "not prioritised" while all three were shipped or
deliberately refused, for the same reason as last time: the row is prose, and
prose is not gated. `viewBuildOrder.sentinel.test.ts` reads the VIEW-STATUS
table, not this paragraph. **When the two disagree, the table wins** — and the
right repair is to shrink this row toward nothing, not to keep retyping it.

**THIS TABLE WAS ALSO DRIFTED.** Until 2026-09-18 its last row read
`01, 03, 04, 05, 06, …` — listing Assets 06, 03 and 05 as never asked for while
all three were shipped views in the live dropdown. It was inherited verbatim
from a 2026-09-02 register and never re-dated. Every row now carries the date it
was last true, because **a status with no date is a status that cannot go
stale — it can only be wrong quietly.**

---

## WHERE THEY BELONG — ANSWERED, NOT GUESSED

`/charts` already has the correct doorway and it is nearly empty.

- **`src/lib/charts/categoryTabsFor.ts`** owns the VIEW dropdown. For `futures`,
  `crypto`, `forex` and `options` it returns exactly `["Chart", "Profile"]`.
- **`ChartsDashboard.tsx`** renders it and the whole shell switches on
  `activeTab`. **CORRECTION, live-observed 2026-09-20:** the sentence that used
  to sit here — "`ChartsDashboard.tsx:1847` renders it
  (`aria-label="Symbol view category"`)" — is STALE TWICE OVER. No element with
  that `aria-label` exists on the served page, and the line number has long since
  moved. The views are now reached through **Tools → Chart tools → Views**, which
  opens a `ShellModalDrawer` with `id="chart-views-sheet"`; each view is a button
  whose text is the tab name. An operator following the old sentence looks for a
  dropdown that is not there and concludes the view did not ship. **A line number
  and an `aria-label` are both conventions re-typed from memory; neither is an
  owner.** Navigate by the drawer, or read `ALL_CATEGORY_TABS` — those are owned.
- The helper has an exhaustiveness guard, so adding a class is compile-checked.

Assets **03 / 05 / 06** are full-surface, three-column VIEWS in the mockups — not
drawer tiles. They are siblings of `Chart`, and they go in that dropdown.

They must be added to **every** asset class, not just equity: they are
microstructure views, and on a symbol whose feed carries no aggressor side they
render honestly empty rather than being hidden (hiding the view would make the
missing input invisible, which is the opposite of the banner's whole purpose).

The small `AbsorptionAnatomyPanel` that lives in the Smart Money drawer today is
a *summary* of Asset 06, not Asset 06. Both should exist; the drawer tile links
into the view.

---

## VIEW STATUS — GATED, NOT RETYPED

This table is the ONLY place this file states what is built. It is checked
against `ALL_CATEGORY_TABS` by `src/lib/charts/viewBuildOrder.sentinel.test.ts`,
so a row this sentinel finds claiming TO-BUILD for a view that is already in the
dropdown fails the suite BY NAME.

**WHY IT IS GATED.** On 2026-09-18 an operator took this file as the authority,
believed the build order below, and spent three atoms re-opening work that had
already shipped — Delta Bubbles ownership and VP geometry both already had
adoption Sentinels, and Asset 05 was already a live tab. Nothing was wrong with
the code. The list had drifted from it, and a list that is re-typed from memory
at the start of every shift is a CONVENTION. The same law this repo applied to
number formatting on the same day applies to the order of work:

> **AN OWNER BEATS A CONVENTION.** A convention is re-decided every time, and
> one of the decisions was wrong.

Prose in this file is commentary. The table is the claim.

<!-- VIEW-STATUS:BEGIN -->
| VIEW TAB | STATE | EVIDENCE |
|---|---|---|
| Absorption | SHIPPED | `f7bd2697` — NQ1! 15m, live-observed |
| Aggression | SHIPPED | `42a495e4` — BTC, both gate arms live-observed |
| Big Trades | SHIPPED | BTC 15m live-observed 2026-09-18 — `LARGE PRINTS · 6 cleared the cut`, top-10%-within-window cut stated on the surface, `SIDE · VENUE-STATED` |
| Value Profile | SHIPPED | BTC 15m live-observed 2026-09-18 — `LIVING PROFILE`, `248 price buckets took volume`, `VALUE AREA HIGH 77940.00`, provenance stated as `ESTIMATED FROM CANDLES` |
| Continuation | SHIPPED | Asset 15, wired 2026-09-18. Compiler + banner + view + 24 tests; reads `selectMarketStructure` against `selectRegime` off the same `canvasIdentity` this room already publishes with. The mockup's four percentages are refused in the compiler, so no renderer can print them. TSLA live-observed 2026-09-18 — read `UNREADABLE`, zero percentages in the visible text, candles still on screen beneath it, and an independent owner in the same room agreed the regime was unresolved. Full reading in the Asset 15 section below. Extended 2026-09-18 by `91cd493c` with Asset 17's one owned block — the confirmed swing high/low, labelled as observed pivots rather than the mockup's `Resistance / Support`; the remaining nine elements of Asset 17 are hue-graded scores with no owner and are refused. |
| Worksheet | SHIPPED | Asset 01, wired 2026-09-18. `selectDivisionWorksheet` + `DivisionWorksheetView` + 37 tests. **TSLA 5m live-observed 2026-09-18** on `06da4454` (the SHA `/api/build-identity` reported for the bundle answering the request) — seven `worksheet-rung`, `data-read="3" data-unread="4"`, four blanks and three values summing to the seven, rung 1 reading `390 bars, 0 prints` off the real feed and rung 2 saying `NOT READ HERE` because TSLA's tape states no aggressor side, `data-step="7" data-state="UNREAD"`, the footer naming `computeRightOfWay`, seven `divided:` strings, and the visible text carrying no `421` / `532` / `423` and no percentage. Candles stayed on screen: `wm-chart-category-panel-chart` measured 112→376 with the worksheet panel below it at 376→740. **This row previously said the state meant only "reachable in the dropdown" because nothing had been read off a rendered frame yet; that caveat is now discharged by the measurements above.** Note that four earlier probes of the raw `/charts` HTML reported `hasWorksheet:false` and were WRONG — the category strip is client-rendered, so a fetch of the SSR markup can never see it. A probe that cannot observe the thing it is asked about returns a false negative, not a pending one. **The mockup's seven values are the image generator's own canvas dimensions** — `421 × 532` six times and `421 × 423` once — so the picture carries no market data at all; the compiler mints none of them and the render test bans those digits from the visible text. What survives is the idea: LONG DIVISION SHOWS ITS WORKING, so every rung prints WHAT IT DIVIDED, blank rungs included. Six rungs compose owners already in this room (`ChartsDashboard` series counts, `selectAbsorptionAnatomyView`, `selectAggressionResponse` twice — efficiency and response, never the reciprocal under one label, `selectRegime`, `selectContinuationHealth`). The seventh, MISSING EVIDENCE, is UNREAD on **every** input, and so is the `CAUTION + RIGHT OF WAY: WAIT` footer: both belong to `decisionPermissionCompiler`, which compiles an evidence debt from decision nodes this room has never had. They are drawn as named absences **where the mockup put them** rather than omitted, and the owner is named as a *string* so the module does not enter the chart bundle and invite a rush-wire. Nothing is graded in hue (§9) — a blank rung differs from a worked one by opacity alone. **ASSET 18 ALSO LIVES ON THIS VIEW, shipped `4949a99c`, live-observed 2026-09-20 on serving Worker version `5c40a4ed-8532-4578-b041-d22d0a3738eb`.** It is NOT a second tab and NOT a second renderer: Asset 18's seven steps ARE Asset 01's seven steps — same labels, same order, same arithmetic — pointed at a smaller dividend, so it composes `DivisionWorksheetView` unchanged and the panel stacks the two. One renderer, two divisions; forking it would give the OS two long-division surfaces free to drift apart, which is the exact failure a worksheet exists to expose. Three new optional props (`title`, `dividendNote`, `instanceId`) keep them from being mistaken for one surface disagreeing with itself. Live measurement: BOTH `[data-worksheet="window"]` (titled `Long-Division Worksheet`) and `[data-worksheet="level"]` (titled `Order Flow Long Division`) mounted, each `data-read="5" data-unread="2"`; `[data-testid="footprint-worksheet-view"]` reported `data-levels="4" data-selected-index="1"` with four `footprint-ladder-row` and **exactly one** `data-selected="true"`. What Asset 18 ADDS is THE LADDER and the account of which rung was divided — the mockup draws a selected footprint with no explanation of how it was selected, which a picture may do and a running surface may not, so the selection rule is printed underneath in words (`"the one whose two sides are furthest apart — 0.07 against 0. Nothing clicked it; the rule is arithmetic on observed volume…"`). The axis is named in words (`SELLER CROSSED (BID)` / `PRICE` / `BUYER CROSSED (ASK)`) so no trader infers meaning from which side of a centre line a bar sits on. §9 holds: ONE ink at two LENGTHS, both sides reading the same `INK` constant; the selected rung is marked by a border, never a fill; the render test checks this against the source WITH COMMENTS STRIPPED, because the docblock explaining the ban names the colours it bans, and a check that fails on its own documentation teaches the next author to delete the explanation. A companion test therefore requires the explanation to REMAIN. **The ladder is bounded by a ceiling this view does not own:** `useWebSocket.ts:1164` retains 50 prints (`recentTicks.slice(0, 50)`), so `FOOTPRINT_LEVEL_COUNT = 6` and `MIN_PRINTS_FOR_LADDER = 24` — twelve bins over fifty prints is four prints a level, and four prints is not a footprint, it is four prints with a grid drawn over it. The ceiling is written beside the constants and pinned by a test, so widening the ladder fails loudly. Live it rendered FOUR levels, not six — honest binning of a thin real tape rather than a grid padded to look full. Fed from `recentTicks` (the same signed tape Asset 05 reads) rather than MainChart's `getBarFootprint`, which is a `useCallback` unreachable from this component; plumbing it out would reshape the chart renderer to serve a worksheet. 58 tests (48 compiler + 10 render), and the mockup's `421`/`532`/`18,552.25` are banned from the visible text on every input. **ASSET 11 — TEACHING EMPHASIS — ALSO LIVES ON THIS VIEW, shipped `e2a954f0`, live-observed 2026-09-20 on serving Worker version `9e4993d5-e844-4f06-b75d-a0dfe09a89ef`.** Asset 11's mockup (`..._App_View`) draws the SAME seven-step worksheet wrapped in page chrome — a top nav, a left icon rail, a masthead quote. Chrome is not an invention; this OS already has a shell, and cloning the mockup's navigation would add a second doorway to surfaces that already have one. ONE block in that mockup is neither chrome nor present in Assets 01/18: the TEACHING EMPHASIS paragraph — the worksheet SAID OUT LOUD. A trader who can read seven rungs of arithmetic does not need it; a trader learning to read them does, and moving a person from the second group to the first is the stated purpose of the product. So the paragraph is the asset and the chrome is not. `selectTeachingEmphasis` composes it under five mechanical rules, because prose-from-data is one short step from inventing a verdict: only READ rungs may speak, and the sentence QUOTES each rung's own `value` string verbatim — there is literally ONE string, so the paragraph and the rung above it cannot disagree; the unread rungs are NAMED rather than dropped, since a summary that silently omits what it could not read is how a partial reading becomes a confident one; two READ rungs minimum, because one reading is a number and the number is already printed directly above; no adjective grades anything (§9 again — the module supplies only conjunctions, and the tests ban `therefore`/`because`/`which means`/`implies`/`suggests` alongside `strong`/`weak`/`healthy`/`bullish`); and **the mockup's closing sentence is REFUSED.** "Look for confirmation before committing capital" is not a teaching note, it is RIGHT OF WAY, and right of way belongs to `decisionPermissionCompiler` — an owner this room has never had. The block therefore ENDS by naming the instruction it declines to issue, which is the same move the seventh rung makes, and the refusal sits directly between the paragraph and the right-of-way footer: the only arrangement where a reader meets the summary and its limit in the same glance. The emphasis is computed from the SOURCE vm, never the scaffolded view, so FOUNDATION and ADVANCED cannot summarise different markets. It reaches the DOM through the SHARED renderer, which means it lands on Asset 01 and Asset 18 at once — a render test would fail if someone later duplicated the block into one view only. 15 compiler tests + 2 render tests. Live measurement returned `count: 2` teaching blocks, both `data-has-paragraph="true"`, `data-spoke-for="5" data-silent-on="2"`. **AND THE BLOCK JUSTIFIED ITSELF ON ITS FIRST LIVE FRAME.** The BTC level worksheet read, in two adjacent rungs computed from the SAME two numbers: step 1 `bid 0 x ask 0`, step 2 `bid larger - 1,422.21x`. Step 2 was right. Step 1 was a formatter — `maximumFractionDigits: 2`, written for share counts, applied to fractional crypto sizes, collapsing a level holding 0.0007 to `0`. The rungs had been sitting in separate boxes where the contradiction was easy to scroll past; the teaching paragraph put them in one sentence, and one sentence cannot hold both. **THE RULE, fixed in `2ce5c58f`: a quantity that is not zero must never PRINT as zero.** Rounding is a display convenience; turning evidence into its own absence is a false reading, and every rung below it inherits the falsehood. `fmt` became the exported `formatQuantity`, and below one unit the precision follows the magnitude (four significant digits) instead of a fixed cap. The view's own private copy of the same formatter was deleted and now reads the compiler's owner — **a local copy of a formatter is a second opinion about the same evidence, and two opinions is one too many.** 11 regression tests pin the rule at both the formatter and the compiler, including one that drives a genuinely fractional tape through `selectFootprintWorksheet` and asserts step 1 cannot claim both sides are empty while step 2 measures an imbalance — a unit test on the formatter alone would still pass if the compiler stopped calling it. Live-verified on serving Worker version `3bef0321-cbeb-4b91-b980-5bc2ff60e1a0`, BTC 1h, 2026-09-20: step 1 now reads `bid 0.001408 x ask 0.01646` where it previously read `bid 0 x ask 0`. **ASSET 13 — MASTERY PATH — ALSO LIVES ON THIS VIEW, shipped `9ecab100` ("Asset 13: dependence is counted, not asserted", 2026-09-20).** `selectScaffoldDependence` (`src/lib/marketData/viewModels/selectScaffoldDependence.ts`) reaches the DOM at `DivisionWorksheetView.tsx:75,235,335` as `data-testid="worksheet-dependence"`. **THE DOCUMENTED BLOCKER FOR THIS ASSET WAS FALSE.** The Later list below claimed 13 "depends on the user having decision history" — a dependency this room does not have, which is why it sat unbuilt. It does not need one: the DEPENDENCE reading is **counted from the voices actually printed** on the worksheet (`explanationsOn`, `:139-154`), so it measures scaffolding the surface is currently showing rather than a history of decisions the user may never have made. A progress score minted from absent history would have been §9 twice over — a grade, in hue, about the reader rather than the market. Counting what is on screen needs no new owner at all. The mockup's `Bias: Defensive | Wait | Reduce Size` and its `Sub-Optimal` grading are REFUSED and named on every input via `BIAS_REFUSAL` (`:86,199`), owner `decisionPermissionCompiler` — the same refusal rungs 7 and 11 make. **This row did not mention Asset 13 for 101 commits after it shipped**, which is the omission half of the drift this table exists to stop: the gate can only see rows that exist, so a shipped view nobody records is invisible to it. Outstanding as of 2026-09-21: no live-observed frame. |
| Gravity | SHIPPED | Asset 02, wired 2026-09-22. `GravityValueView.tsx` — a deliberately THIN full view over the room's ONE Value Candle compilation (`chartOrderFlowReadings.valueCandle`, the same VM the on-glass band and the Smart Money drawer read, so three surfaces cannot disagree about the CoG). Mounts `ValueCandlePanel` unchanged (one renderer) and carries the migration verdict VERBATIM (`vm.migration` + `vm.migrationDetail` — the view composes no market sentence of its own). Microstructure sibling: candles stay at 42% above it. REFUSED from the mockup: per-bar historical gravity-adjusted OHLC (no intrabar-distribution owner for past bars), fixed 68/70% value-area targets (the band is measured, CoG ± 1 vol-weighted σ), and "who moved value" attribution (belongs to `selectAggressorFlow`). Pinned by `gravityViewIsOfferedEverywhere.sentinel.test.ts`. Outstanding as of 2026-09-22: no live-observed frame yet. |
| Liquidity | SHIPPED | Asset 08, wired 2026-09-22. `LiquidityWeatherView.tsx` — a deliberately THIN full view over the room's ONE liquidity compilation (`chartOrderFlowReadings.liquidityWeather`, the same VM the order-flow drawer and the on-glass weather band read, so three surfaces cannot disagree about the stage). Mounts `LiquidityWeatherPanel` unchanged (one renderer) and carries the stage verdict VERBATIM (`vm.stage` + `vm.detail` — the view composes no market sentence of its own). Microstructure sibling: candles stay at 42% above it. **The 2026-09-02 debt-register blocker ("no licensed Level 2 depth provider wired yet") was FALSE for this asset**: the owner `selectLiquidityWeather` measures COST OF TRAVEL — volume spent per spread of price movement — from the room's own per-trade tape, needing no order book at all. REFUSED: any resting-order/depth heatmap (a fabricated book), per-price liquidity surfaces (the owner segments by time because cost is a rate), and buyer-vs-seller liquidity attribution (the owner never reads `side`; `requiresDisclosure: false` is structural). Pinned by `liquidityViewIsOfferedEverywhere.sentinel.test.ts`. Outstanding as of 2026-09-22: no live-observed frame yet. |
<!-- VIEW-STATUS:END -->

Every row above is a MICROSTRUCTURE view, so each renders WITH the candles
rather than in place of them (`MICROSTRUCTURE_TABS` in `categoryTabsFor.ts`) —
which is the Founder's second acceptance question.

**THAT CLAIM WAS REASONED BEFORE IT WAS MEASURED, AND SAYING SO IS THE POINT.**
The sentence above originally ended "and it is now closed for all four," derived
from the comment in `categoryTabsFor.ts` rather than from a rendered frame. That
is the same move that produced the stale build order this table exists to fix:
believing a source of words about the code instead of looking at the code's
output. It has since been measured on BTC · 15m, viewport 784px, `scrollY 0` —
the price canvas spans **y 140 → 373** and the view's own heading sits at
**y 388**, identically for all four views, with the price canvas carrying 3,134
inked samples across 7 colours rather than being blank. The claim survived
contact with a measurement. It was still a claim until it did.

The Asset 06 acceptance row further down was corrected from PARTIAL on
2026-09-18 in the same pass.

---

## BUILD ORDER

*Superseded for Assets 06 / 03 / 05 by the table above — all three are SHIPPED.
The sections are kept because they record the REASONING and the standing
constraints for those surfaces, which remain binding. They are not a to-do
list. The still-unbuilt work is `Later`, below.*

### 1 · Asset 06 — Absorption Anatomy (START HERE)

Closest to shipping: **`selectAbsorptionAnatomy` already computes everything the
centre column needs** and is already consumed by `MainChart.tsx:6467`.

Mockup → existing owner:

| Mockup element | Real owner (already exists) |
|---|---|
| EFFORT (PRESSURE) vs PRICE DISPLACEMENT, layered over 20–30 bars | `AnatomyBar.effort / effortNorm / displacement / displacementNorm` |
| ABSORPTION ZONE band | `AbsorptionZone.priceLo / priceHi / startTime / endTime` |
| EFFICIENCY RATIO + the `>5.0 STRONG · 2.0–5.0 MODERATE · <2.0 WEAK` ladder | `AbsorptionZone.efficiencyRatio` + `strengthOfRatio()` — **the mockup's thresholds are already the code's thresholds** |
| BUYER / SELLER INITIATED VOLUME, % of total, Δ over window | `selectAbsorption` → `buyEffort / sellEffort / imbalance` |
| AGGRESSION DELTA (BID−ASK) + sparkline | `AnatomyBar.delta` per bar |
| HIGH EFFORT ✓ / WEAK DISPLACEMENT ✓ | the zone admission criteria — already computed |
| TIME EXTENSION ✓ | `AbsorptionZone.barCount >= minZoneBars` |
| IMBALANCE PERSISTENCE ✓ | sign persistence of `AnatomyBar.delta` across the zone — **null unless the tape is signed** |
| VOLUME SHELF ✓ | volume profile — already drawn on the chart |

**DO NOT FABRICATE the mockup's `CONVICTION 82%`.** There is no probability
model behind that number. Render conviction as the real `AbsorptionStrength`
(STRONG / MODERATE / WEAK) with the gauge filled from the efficiency ratio's
actual position on the real ladder. A derived mapping is defensible; an invented
percentage is the exact thing LIVING-PIXEL LAW forbids.

Same rule for every other literal in every mockup: `18,732`, `−2,552`, `7.42`,
`98.7th percentile`, `68.3% win rate` are **art direction, not data**.

### 2 · Asset 03 — Aggression vs Response Framework

The scatter of aggression (pressure) against response (displacement in ticks),
with the absorption-zone ellipse and the `0 → 1.0+` efficiency bar. Same two
selectors; the axes are `effortNorm` × `displacement`. The per-point data is
already there — this is a rendering, not a new computation.

### 3 · Asset 05 — Big Trade Intelligence View

Needs a large-print detector over the tape plus a session-relative size
percentile. Honest on any symbol with a real per-trade tape; renders the named
missing-input state where there is none. The left rail in the mockup
(INTELLIGENCE / MARKET PROFILE / ORDER FLOW / STRUCTURE MAP / HISTORICAL EDGE /
ALERTS) is a *navigation* invention — ship only the sections that have owners.

### Later

**THIS WHOLE LIST IS SPENT AS OF 2026-09-21 — every line below is either shipped
or wrong, and it is kept only because the amendment underneath it is the lesson.**
04 / 15 / 17 / 01 / 11 / 12 / 13 / 18 are all shipped (see the VIEW-STATUS table,
which is the authority). 19 / 20 are the only survivors, and the third bullet
misfiles them.

- 04 / 15 / 17 — Question-Driven canvases; compose `composeMarketCanvasVM`.
- 01 / 11 / 12 / 13 / 18 — progressive scaffolding; zero data dependencies.
- 19 / 20 — Liquidity Weather lifecycle; **gated behind the same depth provider as 08.**

#### AMENDED 2026-09-18 — THREE OF THOSE FOUR LINES WERE WRONG, AND THIS FILE IS THE FILE THAT SHOULD KNOW BETTER

The three bullets above were written from the mockup titles. The Founder's
**Visual Implementation Contract & Asset Ledger** (Drive
`11xOCJYbc8-B-B1A_1R0AaBh2Xm7GY5OVL5hKQbE6KHI`, section CURRENT TRANSFORMATION
ASSET SET) was read on 2026-09-18 and contradicts them:

1. **19 and 20 are NOT depth-gated.** The ledger names 19 "Absorption Anatomy
   **Alternate**" and 20 "Big Trade Intelligence **Alternate**" — alternate
   compositions of the already-shipped 06 and 05, to be compared against them
   and merged. Only **08** needs the licensed Level 2 depth provider. Two assets
   were parked behind a blocker that was never theirs.

   **CORRECTION 2026-09-22 — THE 08 HALF OF THIS BULLET FELL TOO.** Asset 08
   shipped at `2cbe73ae` with NO depth provider: `selectLiquidityWeather` had
   been measuring liquidity as COST OF TRAVEL (volume per spread of movement)
   from the room's own per-trade tape since it was written, and only the
   *mockup's rendering* — a resting-order heatmap — needed a book. The blocker
   was inherited from the picture, not the measurement, which is the same
   title-read defect as the Asset 13 correction below: assets in this one list
   were parked behind blockers that belonged to their mockups' drawings rather
   than to any owner in the repo. The heatmap rendering stays REFUSED (a
   fabricated book); the measurement ships. See the Liquidity row in the
   VIEW-STATUS table, which is the authority.
2. **"zero data dependencies" is false for two of the five.** Asset **13**
   (Mastery Path) depends on the user having decision history; Asset **18**
   (Order Flow Long Division) depends on **signed tape**, which most symbols do
   not carry — a worksheet whose every term reads `—` teaches nothing, so 18 is
   honest today only on crypto, where the side is venue-stated.

   **CORRECTION 2026-09-21 — THE ASSET 13 HALF OF THIS BULLET WAS ITSELF WRONG,
   AND IT COST THE ASSET A MONTH.** 13 needs no decision history. It shipped at
   `9ecab100` (2026-09-20) by COUNTING THE VOICES THE WORKSHEET ALREADY PRINTS
   (`selectScaffoldDependence`, `explanationsOn`) rather than asserting a mastery
   level about the reader. The bullet above was written from the mockup's subject
   — "Mastery Path" sounds like it needs a history — and a dependency inferred
   from a TITLE is not a dependency. It parked a buildable asset behind a blocker
   that never existed, which is the same defect as bullet 1 directly above, in
   the same list, in the same pass. **The tell was available without reading any
   code: this bullet names an owner that does not exist anywhere in the repo.** A
   blocker that cannot name the module it is waiting on is a guess wearing a
   status.
3. **04 does not need `composeMarketCanvasVM`.** It is Asset 06's evidence
   re-composed around the question. Both halves were already in the repo: the
   compiler `selectAbsorptionAnatomyView`, and the finished-and-tested
   `ActiveQuestionBar`, which was sitting unused on the wrong route
   (`/command-deck` only, zero references from `ChartsDashboard`).

This is the SAME failure this file was created to stop — believing a source of
words about the work instead of reading the work — committed by this file, one
section below the paragraph where it says so. **AN OWNER BEATS A CONVENTION**
applies to the build order too.

---

## ASSET 12 — SHIPPED AS A CONTROL, NOT A TAB (2026-09-19)

`WM_Transformation_UI_12_Progressive_Scaffolding_Foundation_Intermediate_Pro`
draws ONE reading at three densities — FOUNDATION / INTERMEDIATE / ADVANCED —
under the banner `SCAFFOLDING REMOVAL PATH · FROM DEPENDENCE TO DISCRETION`.

**It is not a view, so it did not get a tab.** The three panels in the mockup
are the same worksheet three times. Shipping them as three dropdown entries
would have put one reading behind three doors and invited them to drift apart.
It ships as a level control ON the Worksheet view, backed by `scaffoldWorksheet`
— a pure module that takes the COMPILED worksheet and can only remove voices
from it. It never receives a market input, so the reading at ADVANCED is
structurally incapable of differing from the reading at FOUNDATION.

### THE MOCKUP'S MIDDLE PANEL ASKS FOR A DEFECT

It promises **"SAME READ. LESS STEPS. HIGHER OWNERSHIP."** Taken at its word
that is the most dangerous sentence in Asset 12. The worksheet's entire claim is
that you can audit it — seven rungs, four typically blank, each blank naming the
owner that would have to answer it. A "pro" view that drops the blanks does not
hand the reader discretion; it hands them a shorter page with a hidden evidence
debt, and teaches them the missing steps were never asked for.

So the law this module holds is:

> **COMPRESSION REMOVES WORDS. IT NEVER REMOVES FACTS.**

`readCount`, `unreadCount` and the step total are carried through untouched at
every level and asserted by test. The promise is printed as *"Same read. Same
steps. Fewer words."* — the one mockup line rewritten, recorded in
`INTERMEDIATE_PROMISE_REFUSAL` rather than silently applied.

ADVANCED is the only level that withholds whole rungs. It keeps the rungs whose
OWNER declared them `QUANTITY` (a new `measures` field on `WorksheetRung`, set
beside the code that knows what each step computes rather than in a second
module ranking them by step number). `CATEGORY` rungs — `selectRegime`,
`selectContinuationHealth` — are withheld, because a verdict stripped of its
reasoning is a conclusion handed down, and showing those two bare would mean the
reader who earned the most independence sees the least evidence. Every withheld
step is named BY NUMBER in the on-surface disclosure, and the evidence counts
sit OUTSIDE the level control so a reader at ADVANCED never has to step back
down to learn how much was actually worked.

**Refused from the picture:** `EFFICIENCY RATIO 62%` (no owner), the red/green
pressure diagram (a verdict graded in hue — §9), and `MODERATE DEFENSIVE SETUP`
(a right-of-way claim owned by `decisionPermissionCompiler`, not in this room).
All three are banned from the rendered text by test.

---

## THE THREE FOUNDER ACCEPTANCE QUESTIONS

Every asset ships only when all three are answerable with a screenshot of the
real `/charts` surface beside the mockup:

1. Can we visually recognise the same invention?
2. Is it useful while candles remain visible?
3. Is it fed real / honest WM information?

---

## IN FLIGHT AT THE TIME OF WRITING

`StackedImbalancePanel.tsx` has an uncommitted, inert, half-finished edit: an
`absenceDeclaredAbove` prop and a `notCarried` guard were added, and the ladder
placeholder was gated, but the verdict gloss / detail / aggressor-disclosure
voices are not yet deferred and no call site passes the prop. Live on prod NQ1!
that panel prints four separate sentences about the absence the banner above it
already declared once — and the last of them calls "these levels" downstream of
a guess when there are no levels at all. Finish or revert deliberately; do not
leave it half-gated.

**CLOSED — `c8aee84d`.** The panel now defers on a DERIVED gate (`notCarried` =
the flag AND UNMEASURED AND an empty level list), so a banner can never blank a
ladder that actually has levels in it, and it uses the same house sentence the
other three deferring panels use rather than inventing a fourth phrasing. Both
Sentinels were raised with it: the pinned caller count 3 → 4, a GATE regex so
the prop cannot be accepted-and-ignored, and a seventh entry in the banner's
`blockedReadings` list.

---

## ASSET 06 — SHIPPED AND LIVE-OBSERVED (`f7bd2697`)

`f7bd2697` is live on `https://wealthymindsetspro.com/charts`. The VIEW dropdown
reads `Chart | Absorption | Profile` on every asset class, and on NQ1! · 15m the
view renders `TRADED VOLUME 120,048` (real), `BUYER INITIATED —` and
`SELLER INITIATED —` (**not `0`** — the tape never stated a side), the five
criteria each with a written basis, and `EFFICIENCY RATIO —` with the mockup's
own `> 5.0 strong · 2.0–5.0 moderate · < 2.0 weak` ladder printed beneath it.

Against the three Founder acceptance questions:

| Question | Answer |
|---|---|
| Same invention recognisable? | YES — three columns, effort field + price path, criteria checklist, ratio ladder. |
| Useful while candles remain visible? | **CLOSED — MEASURED 2026-09-18.** This row read PARTIAL ("a full-tab sibling of `Chart`, so the candles are not on screen at the same time") until it was measured instead of remembered. `MICROSTRUCTURE_TABS` renders the four views BENEATH the price pane rather than instead of it. On BTC · 15m, viewport 784px, `scrollY 0`: the price canvas spans **y 140 → 373** and the reading's own heading sits at **y 388** — for all four views, at identical geometry (`Absorption Anatomy`, `AGGRESSION vs RESPONSE`, `BIG TRADE INTELLIGENCE`, `LIVING PROFILE`). The price canvas is drawn, not blank: 3,134 inked samples across 7 distinct colours. |
| Fed real/honest WM information? | YES. No mockup literal survives; every absent field says `—` and names why. |

### ASSET 04 ON TOP OF IT — SHIPPED AND LIVE-OBSERVED (`c961deb5`)

Asset 04, "Question-Driven Absorption Canvas", is not new evidence. It is the
SAME compiler's output re-composed around the question, so the first thing the
eye lands on is the thing the screen exists to settle. `selectAbsorptionQuestion`
compiles the canonical `QuestionFocusVM` from `selectAbsorptionAnatomyView`, and
the canonical `ActiveQuestionBar` heads the surface — no second focus vocabulary
exists beside the audited one.

Live on `https://wealthymindsetspro.com/charts` → VIEW `Absorption`, read from
`[data-testid="active-question-bar"]`:

```
data-focus-basis = ABSORPTION_ABSENT

ACTIVE QUESTION
OBSERVE
Is any level absorbing effort right now?
QUESTION FOCUS
Absorption of effort across the last 30 bars
```

Three things that reading proves, which a constant banner string could not:

1. **The banner inherited the epistemic state.** `ABSORPTION_ABSENT`, not
   `ABSORPTION_UNMEASURED` — the window RAN and answered "no zone". It therefore
   renders in the resolved look, not the italic UNRESOLVED one. A surface that
   reported a measured absence as a failure would tell the trader the screen
   broke when the screen worked.
2. **It named no aggressor.** The same surface's reason line reads
   `effort is traded volume — this tape never stated an aggressor side`. The
   aggression rail is null on a partially-signed window by design, so the banner
   says "effort", not "seller effort". The canon mockup names the seller because
   its mockup was drawn on signed tape; naming one here would have put a
   fabricated actor in the largest sentence on the canvas.
3. **The focus is a SUBJECT, not the finding.** "Absorption of effort across the
   last 30 bars" — the finding stays with `vm.reason` eight lines down. The first
   draft returned the finding in both places, which is the two-owners-of-one-fact
   defect `ActiveQuestionBar`'s own docblock refuses by name.

---

## ASSET 03 — BUILT AND LIVE-OBSERVED (`42a495e4`)

Shipped as the `Aggression` view. The three constraints below were written
before it was built and all three held; they are kept in the present tense
because they are the standing rules for that surface, not a to-do list.

Observed on `https://wealthymindsetspro.com/charts?symbol=BTC`, both arms of the
effort-concentration gate (`951de52d`) seen in one sitting: first
`NO ZONE QUALIFIED`, then the window reporting that it could not answer at all —

> only 1 of 30 bars reached the high-effort line (one print holds 88% of the
> window's effort) — a zone needs 2, so no run could have qualified here
> whatever the market did

Seeing both arms matters more than either alone: it proves the gate is mechanical
and responsive rather than stuck on one branch. Alongside it, `NET AGGRESSION`
read `—` with "not carried on this tape — no side was stated on every bar", and
the y-axis carried its substitution note. Point 2 below is therefore not a plan;
it is a live-observed behaviour.

**1. The x-axis term does not exist yet, and must not be faked.**
`selectAbsorptionAnatomy` computes `displacement = |close − open|` — UNSIGNED,
in price units. Asset 03's x-axis is SIGNED displacement in ticks, `−10 … +10`.
The signed term is a genuinely new quantity. Build it in the Asset 03 view
compiler from the same `AnatomyBarInput[]` (`close − open`), NOT by changing the
series selector — the zones and effort must keep exactly one owner. Tick size is
not carried by the feed either, so the axis is labelled in PRICE units until a
contract spec owns a tick size; do not divide by a guessed tick.

**2. The y-axis is `NET BUYER / SELLER INITIATED`, which NQ1! does not carry.**
The scatter must be basis-aware and say so on the axis itself: with a signed
tape, y = net aggression; with only `VOLUME`, y = normalised effort and the axis
label states the substitution. A scatter that silently swaps its own y term is
worse than an empty one.

**3. Do not ship the mockup's `IMPLICATION: SIDEWAYS / REVERSAL RISK`.** (Asset 03)
It is a forward-looking prediction and no selector in this repo owns it.
`CONVICTION HIGH` is likewise a grade — §9 applies. Ship only the sections that
have owners; the left `MARKET CONTEXT` rail and the bottom `MICROSTRUCTURE
SUMMARY` are already-owned fields and are fine.

---

## ASSET 15 — SHIPPED AND LIVE-OBSERVED (`cf23c7ba`, `7f006b52`)

Shipped as the `Continuation` view, the fifth member of `MICROSTRUCTURE_TABS`.

### WHAT THE MOCKUP ASKED FOR, AND WHAT WENT IN INSTEAD

`WM_Transformation_UI_15_Question_Driven_Continuation_Health` stacks five cards,
four of them a percentage over a filled green bar: `STRUCTURE ALIGNMENT 92%`,
`MOMENTUM SUSTAINMENT 78%`, `VOLUME CONFIRMATION 84%`, `CONTINUATION HEALTH
SCORE 85%`.

Not one of those four numbers has an owner in this repo. A filled green bar
would also be §9 twice over — a verdict graded in hue, at the REWARD end of the
scale, with a number painted on it.

**The refusal is done in the COMPILER, not the renderer.** `ContinuationHealthVM`
carries no numeric field at all, so `ContinuationHealthView` could not print a
score if it wanted to. That is the point of the placement: a renderer can be
edited by someone who never reads this file, and "somebody adds a bar because the
picture wants one" is the natural failure mode of a mockup like this one.

It is then asserted a SECOND time at the markup level
(`ContinuationHealthView.render.test.tsx`), against markup compiled from the real
owner rather than a hand-built VM — a view test that mocks its own reading can go
green while the two files disagree about the shape they share.

That assertion runs against **visible text, not raw markup**. Asserting on markup
catches the `100%` in a gradient stop and reddens on an unrelated style edit,
which trains the next reader to weaken the guard. What is banned is a percentage
a *trader* can read, so the tags come off first.

### THE ABSENT CARD IS DRAWN AS AN ABSENCE

This composition has no volume owner, so the mockup's `VOLUME CONFIRMATION` card
cannot be drawn. Rendering four of five cards silently would teach the reviewer
the fifth was never asked for. `vm.unread` names it on screen instead.

### LIVE OBSERVATION — TSLA, 2026-09-18

Observed on `https://wealthymindsetspro.com/charts` by driving the Founder's
already-authenticated Chrome, category select switched to `Continuation` and
**restored to `Chart`** afterwards.

| Probe | Reading |
| --- | --- |
| `data-health` | `UNREADABLE` |
| verdict | `UNREADABLE` |
| `data-focus-basis` | `CONTINUATION_UNREADABLE` |
| question bar | `Is this continuation healthy?` / focus `Continuation health — no sequence in hand` |
| reason | `Neither regime nor volatility dimension has verified evidence at snapshot time.` |
| `unread` block | `Volume confirmation — no volume owner is read by this composition, so the mockup's VOLUME CONFIRMATION card has no basis here and is not drawn.` |
| any `\d\s*%` in visible text | **false** |
| chart panel still displayed | **true**, 262px beside a 374px reading |

**THE UNREADABLE IS CORROBORATED, NOT ASSUMED.** An independent owner in the same
room — the story ribbon — said in its own words, at the same instant:

> No chapter resolved (1/8 dimensions resolved). … Balance, Trend Expansion,
> Breakout, Liquidity Probe, Value Migration, Rotation could not be evaluated:
> direction, regime, volatility, order flow unresolved; location, aggression,
> profile measured but not decision-grade.

That is exactly the branch the compiler landed in: **structure measured** (it is
the one resolved dimension), **regime UNKNOWN**. `selectContinuationHealth`
carries `regime.reason` verbatim rather than minting a sentence of its own, so
the two surfaces cannot drift. A reviewer seeing `UNREADABLE` here should NOT
read it as a wiring gap — it is the honest reading of a tape that has not yet
produced a volatility observation, and it will resolve on its own the moment the
regime dimension does.

No screenshot was taken: the Chrome window was backgrounded
(`document.hidden === true`), which makes canvas receipts unreadable. The DOM
text above is verbatim and is the stronger evidence for these claims anyway.

### THE LAG IS NOT A FOOTNOTE

`confirmationLagNote` rides every directional reading, COHERENT included. A
fractal pivot needs `lookback` bars on BOTH sides, so the newest bars can never
be pivots and the sequence always describes a market that has already moved past
it. A continuation surface is the single worst place to omit that: the trader is
asking about the NEXT bar while the evidence is structurally about an earlier
one. This is not cured by loading more bars.

### THE FALSE LEDGER NOTE THIS ATOM CORRECTED

`23c15ac4` added two `AWAITING_SURFACE` entries to the screenReach LEDGER whose
stated reason was *"/charts has no CanonicalMarketState + history to hand
selectRegime"*. **That was false.** `/charts` has had both since `b46fa64`;
`ChartsDashboard` already memoised the exact `canvasIdentity` the note claimed
did not exist. The note was written from memory of the repo rather than from a
grep of it.

A ledger entry is a PROMISE that an orphan has a stated reason. A false reason is
worse than no entry, because the enforcement suite goes green over it and the
falsehood acquires a passing test. The remedy was not to rewrite the sentence —
it was to wire the surface the sentence called impossible, which took one
identity that already existed. A headstone comment is left at the removal site so
the failure mode stays legible.

### RECEIPTS

- Gates unpiped: `tsc --noEmit` EXIT=0; `vitest run` EXIT=0, **792 files /
  9953 passed | 2 skipped**.
- Mutation receipt: injecting `85%` into the verdict span failed exactly
  `PRINTS NO PERCENTAGE, on any of the four states` (1 failed | 6 passed).
  Restored; `85%` then occurred only in the two docblock mentions.
- Two "second owner" traps avoided during wiring: the view reuses the room's
  existing `chartCanvasState` rather than opening a second subscription on the
  same identity, and reuses the room's `chartBars` so the sequence describes the
  same candles the chart drew.

---

## ASSET 17 — MOSTLY REFUSED, ONE BLOCK KEPT (`91cd493c`, 2026-09-18)

`WM_Transformation_UI_17_Cinematic_Continuation_Health_Canvas` is a second
composition of the same subject as Asset 15. It adds **no new owner**, so the
ledger note "reuses `selectContinuationHealth`, no new compiler" held on
inspection — and that is exactly why most of it could not be drawn.

### THE NINE SCORES, AND WHY NONE OF THEM WENT IN

The canvas is built around numbers graded in hue: a `71%` HEALTHY arc gauge,
`72% CLEAR`, `28% DEBT`, and four filled metric bars. Nine figures, zero owners.
Each is Build Order §9 twice over — a verdict graded in hue, most of them at the
REWARD end of the scale, with a number painted on top.

There is no version of "build Asset 17 as drawn" that does not mint those. The
refusal is not a deferral; nothing in this repo computes them, and nothing
should be written that does, because a number a trader cannot audit is worse
than a blank.

### THE ONE BLOCK THAT HAD AN OWNER

`KEY LEVELS` does. `selectMarketStructure` already confirms `lastSwingHigh` and
`lastSwingLow` — a bar the market has ALREADY turned at, which is an observation
rather than a score. A price the market printed is not a grade, so §9 has no
quarrel with it, and it is the one number `ContinuationHealthVM` now carries.

**The mockup's two WORDS were refused with the scores.** It labels the block
`Resistance / Support`. Both are forward-looking claims — they say price WILL
struggle at a number, and nothing here owns that. What is printed instead is
`Last confirmed swing high` / `Last confirmed swing low`, with
`selectMarketStructure` named beside each. This is the same refusal Asset 03
made of `IMPLICATION: SIDEWAYS / REVERSAL RISK`.

### TWO CONSEQUENCES THAT WERE NOT OBVIOUS FROM THE PICTURE

**1. Levels survive a verdict the compiler could not reach.** When the regime
owner is short but the structure owner is not, `health` is `UNREADABLE` and the
pivots are nonetheless perfectly well known. Withholding a fact THIS owner
measured because a DIFFERENT owner is silent is a refusal nothing asked for.
That is the exact TSLA state recorded in the Asset 15 section above — the
surface that read `UNREADABLE` and showed nothing else now answers "where did it
turn".

**2. The lag note had to widen.** `confirmationLagNote` used to ride only a
DIRECTIONAL reading. That was true until levels existed. A level IS a pivot, and
a ROTATING range is defined by precisely the two pivots now being drawn — so the
old rule would have put the surface's most lag-sensitive numbers on screen with
their disclosure removed. The note now fires whenever any level is carried. The
prior test's premise changed by design and its title was corrected to say what
it actually covers, rather than being deleted.

### RECEIPTS

- Gates unpiped: `tsc --noEmit` EXIT=0; `vitest run` EXIT=0, **792 files /
  9963 passed | 2 skipped** (+10 over the Asset 15 seal).
- The first green run after the feature landed was **treated as a failure
  signal**: the suite total had not moved, because the existing `structureOf`
  fixture carries `lastSwingHigh: null`, so the whole new branch was uncovered.
  A swing-bearing fixture was added on both sides before anything was committed.
- Mutation receipts taken, not claimed. Relabelling a level `"Resistance"`
  reddened 5 tests across BOTH the compiler and the rendered markup. Dropping
  the `levels` clause from the lag reddened exactly
  `CARRIES THE LAG on a ROTATING reading that prints levels`. Both restored, and
  the restore re-verified green.

### LIVE OBSERVATION — TSLA, 2026-09-18, after `91cd493c`

Driven in the Founder's already-authenticated Chrome. The category select was
switched to `Continuation` and **restored to `Chart`** afterwards.

| Probe | Reading |
| --- | --- |
| `data-health` | `UNREADABLE` (unchanged — the regime is still short) |
| reason | `Neither regime nor volatility dimension has verified evidence at snapshot time.` |
| `continuation-levels` present | **true** |
| level 1 | `LAST CONFIRMED SWING HIGH · 363.94 · selectMarketStructure` |
| level 2 | `LAST CONFIRMED SWING LOW · 362.355 · selectMarketStructure` |
| lag note | `the newest 5 bars cannot yet be a pivot — a swing needs 5 bars on BOTH sides to confirm, so the most recent move is always unconfirmed structure` |
| any `\d\s*%` in the view's text | **false** |
| `resistance` or `support` anywhere in the view's text | **false** |
| chart canvas beside it | **530px**, view 504px |

**This is the point of the atom, measured rather than argued.** The same
`UNREADABLE` verdict that yesterday left the surface with nothing but a refusal
now answers "where did it turn" with two prices the market actually printed,
each naming the owner that confirmed it, under the disclosure that the newest
bars cannot yet be pivots.

**One thing observed and deliberately NOT changed:** the two prices print with
different decimal counts (`363.94`, `362.355`) because that is what the bars
carry. Rounding them for alignment would be the renderer editing a number
another owner measured. If a future atom wants a tick-aligned column it needs a
tick-size owner, which this composition does not have.

**AND THE OBVIOUS "FIX" IS THE WRONG ONE.** The repo already owns a magnitude
formatter, `measuredNumber.formatMagnitude`, and reaching for it here is the
first thing a reader will think of. It would print **`364`** for `363.94`. That
module says so itself — it is the owner for costs, efforts and efficiencies,
quantities whose scale nobody can bound in advance, and it explicitly disclaims
quantities whose surface already knows their scale. A price is the second kind.
Recorded so the next operator does not discover this by shipping it.
