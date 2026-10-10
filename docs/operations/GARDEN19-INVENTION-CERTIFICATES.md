# Garden 19 — Invention Census & Manifestation Certificates (§34 Final pre-build order)

Written 2026-10-06, 23:50–00:30 CDT, by the INVENTION CENSUS lane. **This pass was late:** the lane started at 23:51 CDT, after both the 22:15 census deadline and the 23:30 certificate deadline. Pass 1 edited no source. **Pass 2 (00:00–00:30 CDT Oct 7)** added 20 `G19.*` rows to `src/lib/canon/inventionCensus.ts` (the only source file this lane touched), took live serving receipts (§1f) and opened plates (§3a). The integrator committed pass 1 and the census rows in 2fc2346d.

## FINISH LINE — the Founder's Garden 19 FVG order, all 66 sections (cert lane, written 08:10 CDT Oct 9)

One row per section of the order's second part ("0 — PRIMARY ORDER" through "66 — GARDEN 19 CONSTITUTIONAL CLOSE"; §0 is the preamble and has no row). Titles are the Founder's. Section numbers in the last column of evidence (§5, §6a, §10, §13, §22, §23 …) point into THIS document; proof files are in `~/wm-held/proof/`. Only what this document and the proof files cite is counted: a row with no serving receipt is BUILT · NOT READ or lower. Production at writing: `16f363a` (LIVE 07:54:56 CDT).

**Totals (66), as of 18:49 CDT Oct 9 (production `b72f896`):** **PROVED ON SERVING** 47 · **PROVED ON FIXTURE · real-account read owed** 12 · **BUILT · NOT READ** 1 · **PARTIAL** 4 · **NOT BUILT** 0 · **FOUNDER DECISION** 2. (At 18:28: 46 · 12 · 1 · 5 · 0 · 2. At 13:32: 45 · 12 · 1 · 6 · 0 · 2. At 08:10: 39 · 5 · 2 · 18 · 0 · 2.)

| § | Founder's title | State | Proved by (build · time) — or exactly what is missing | Lane |
|---|---|---|---|---|
| 1 | PRODUCT IDENTITY REMAINS SOVEREIGN | **PROVED ON SERVING** | Public pages say TRADING OPERATING SYSTEM, signed out: `d5ac6ff` (§22b); /welcome loop re-read `0dd1130` 07:50 Oct 9 (§23b). An indicator-launch claim is banned by test (`sellingStory.test.ts`). | cert lane |
| 2 | THE EDUCATIONAL MATERIAL IS INPUT, NOT AUTHORITY | **BUILT · NOT READ** | WM's own definition, words and methodology exist (`FVG-METHODOLOGY.md`, `fvgCourse.ts`). No document cites a check that nothing was copied from the supplied lesson — an authorship law, not a serving read. | cert lane |
| 3 | FAIR VALUE GAP / IMBALANCE DEFINITION | **PROVED ON SERVING** | §13 rows 1–3: `fvgDefinition.ts` + methodology; `DEF:FVG_3C@1` on glass, `eea2771` and `c02c2d4`; 268 / 268 FVG tests on `c104669`. | FVG / chart lane |
| 4 | DEFINITION_ID | **PROVED ON SERVING** | §13 row 2; Backtest prints "definition FVG_3C v1" (`eea2771`, §6a); every OBJECT_ID carries `v1`. | FVG / chart lane |
| 5 | FVG IS A CANONICAL MARKETOBJECT | **PROVED ON SERVING** | Identity, boundaries, creation, size in ticks / points / ATR read in Inspect (`eea2771` matrix file; `301d85d`). Missing: regime context reads UNTAGGED on bar-only history (`c4de0f0`, §6a); the order-flow and derivatives senses read NOT_ATTACHED (§5 TRUTH CLASS). **RULING 2026-10-09 11:59 CDT (§24e):** regime stays tape scope, by reference, never stamped on the gap; volatility at formation (bars scope) carries the bar-computable context. Helper in the tree (`fvgFormationContext.ts`); Inspect, journal and study consumers not built yet. **UPDATE 2026-10-09 12:19 CDT → PROVED** (serving `f37005c`, builtAt 17:14:44Z, cert lane own tab, read-only; NQ1! 5m, an OPEN bearish gap selected by id): Inspect prints both scopes — "Volatility at formation: expanded — range 1.33× its normal (from 4954 closed bars)." and "Regime at formation (tape): not read — the chart keeps the tape regime per bar only while Regime Lighting is on." Not yet read: the regime line with Regime Lighting on; the study's volatility facet; the journal context. **UPDATE 12:41 CDT** (serving `79bb6fd`, Regime Lighting on through the URL switch `on=fvg,RegimeLighting` — the Founder's saved layer untouched): the regime line changes to "Regime at formation (tape): not read — the tape does not reach this bar." on a 5m gap 3.7 hours old and on a 1m gap 47 minutes old (the per-bar tape series reached 11 one-minute bars). A regime WORD at formation has not been read: it needs a gap born inside the last few minutes of tape. **UPDATE 13:23 CDT** (serving `b94f28c`, builtAt 18:18:44Z, `on=fvg,RegimeLighting`, NQ1! 1m): a gap **3 minutes old** (b2 `1791570000000`, APPROACHING) with the tape series at 12 bars and `NOW:BALANCE` still reads "Regime at formation (tape): not read — the tape does not reach this bar." The reach sentence (`regimeSeriesReach`, "The tape regime is kept for the last N bars…") shipped as a helper but no row prints it. A regime word at formation has still never been read — and this read suggests it cannot be (see §26i). **13:32 CDT → back to PARTIAL (coordinator).** The regime line is false for a bar the tape reaches but the classifier has not classified: it says "does not reach". Fix in progress (ticket lane). §5 returns to PROVED when a regime word, or a "reached but not classified" sentence, is read on serving. The volatility line stands as proved. **UPDATE 18:49 CDT → PROVED ON SERVING, with two outcomes unread** (management lane's READ 8, `fvg-serving-night-2026-10-07.txt`; serving `c9303a7`, 18:28 CDT, BTC-USD 1m, `on=fvg,RegimeLighting`, a gap 8.5 minutes old): "Regime at formation (tape): TRANSITION." beside "Volatility at formation: normal — range 1.06× its normal (from 346 closed bars)." **A regime word has now been read on serving.** Not read: the "reached but not classified" sentence and the corrected "does not reach" sentence on `c9303a7` or later. NQ1! is closed until Sunday's reopen (state line `1\|X0\|NOW:UNKNOWN`), so no NQ word can be read before then. | FVG / chart lane |
| 6 | OBJECT LINEAGE | **PROVED ON SERVING** | One OBJECT_ID minted once (`fvgEngine.test.ts`). The same id shape read in states REJECTED (`301d85d`), ACCEPTED → MEMORY, TRADED_THROUGH (`c104669` 07:23–07:38 Oct 8, §13 rows 9–12), MEMORY (`0dd1130` 07:50 Oct 9, §23b). | FVG / chart lane |
| 7 | DO NOT TEACH FALSE CERTAINTY | **PROVED ON SERVING** | ⓘ no-guarantee sentence (`c02c2d4`, §13 row 21); SpaidBot answer "price does not have to fill" (`14de5a0`, §13 row 23); myth card (`4769a31`); copy sweeps in `fvgCourse.test.ts`, `sellingStory.test.ts`. | cert lane |
| 8 | PHYSICAL GRAMMAR | **PROVED ON SERVING** | Dense / hatch / tick / inner line / dashed far edge: matrix `eea2771`; acceptance inner line and dashed far edge read as canvas pixels on `c104669` (§13 rows 9, 10); opacity rungs `f96618c`. "Restrained motion" has no receipt. | FVG / chart lane |
| 9 | FVG LIFECYCLE | **PROVED ON SERVING** | States read on serving: REJECTED (`301d85d`, `c02c2d4`), partial / deep / approaching / first touch (scanner, `eea2771`), fully mitigated (`eea2771` journal snapshot), ACCEPTED, TRADED_THROUGH, MEMORY (`c104669`, §13 rows 9–12). | FVG / chart lane |
| 10 | REMAINING TERRITORY | **PROVED ON SERVING** | Geometry: remaining dense vs visited hatch with Inspect closed (`301d85d`, panel-erasure note in the inspect proof file). Words: "no unvisited territory" (`eea2771`, §6a). | FVG / chart lane |
| 11 | TIME-TO-RETURN | **PROVED ON SERVING** | Bars to first touch read: "median first touch 2 bars (median of 139)" (`eea2771`, §6a). Missing: a serving read of the horizon classes (immediate / same session / later session / next session / multi-day / still open) — built in `fvgStats.ts` and `FvgStudyPanel.tsx`, no receipt. **UPDATE 2026-10-09 11:44 CDT → PROVED** (serving `ada59d4`, `~/wm-held/proof/fvg-serving-night-2026-10-07.txt`): all horizon classes read with n of m on the FVG study — NQ1! 5m: within 3 bars same session 116 of 191 (61%), later the same session 55 of 191 (29%), next session 12 of 191 (6%), 2–4 sessions later 2 of 191 (1%), 5+ sessions 0 of 191, not revisited 6 of 191 (3%), session not known 0 of 191; SPY 5m: 34 / 16 / 4 / 1 / 0 / 2 / 0 of 57. Median first touch 5 min (NQ1!) and 10 min (SPY). Wording defect read and fixed: "1 bars" → "1 bar". | scanner / backtest / replay / SpaidBot lane |
| 12 | DISPLACEMENT CONTEXT | **PROVED ON SERVING** | Inspect size against ATR14 (`301d85d`); Backtest displacement-band filter (`c4de0f0`) and its INSUFFICIENT split at 390 (`fabce3a`, spaidbot-academy-backtest proof file). | FVG / chart lane |
| 13 | FVG × EFFORT → RESPONSE | **PROVED ON SERVING** | Rejection / acceptance / trade-through at the gap are observed from closes (§9 above). Missing: effort → response is not a relationship on the gap — `fvgRelationships.ts` has three families only (STRUCTURE, PROFILE, WALL). It is kept only with a journal decision (`fvgDecisionContext.ts`, `0dd1130`, unit). **DESIGN CALL 2026-10-09 (coordinator):** effort → response becomes a relationship family on the gap, read as of the gap over a trailing 100-bar window. Not built yet. **UPDATE → PROVED** (ticket lane's receipts, `fvg-serving-night-2026-10-07.txt`): serving `e05c774`, 12:02–12:04 CDT, NQ1! 5m under `scene=verify`, a gap selected by id — Inspect: "Effort→response displacement bar — at formation · owner says INITIATIVE · large effort · large response · effort 26.20× median volume · response 0.86 ATR (2.31× median) · FULL (traded volume; each bar ranked over the 100 closed bars ending at that bar)". Scanner on `6944df9`: one "FVG + effort→response" hit (MSTR) with the same sentence shape. Journal context and its splits read on the sample. Not read: a touch-bar row on real data; a spot-FX gap; the Backtest effort split; 390. Receipts also written as §10f of this document (touch-bar rows on real data, `6e150db` 12:54). | FVG / chart lane |
| 14 | FVG × ORDER FLOW | **PROVED ON SERVING** | The silence is proved: ORDER_FLOW reads NOT_ATTACHED / SILENCE on serving (`fabce3a`; `c02c2d4` "EVIDENCE COMPLETENESS DEGRADED"). Missing: no owner attaches footprint / delta / CVD / absorption to an interaction; the scanner's "FVG + order-flow interaction" is omitted (§5 SCANNER). **DESIGN CALL 2026-10-09 (coordinator):** order flow becomes a relationship family on the gap (same trailing 100-bar as-of window); where sides are inferred the evidence reads PARTIAL. Not built yet. **UPDATE (ticket lane's receipts, same file):** serving `e05c774`, 12:02–12:04 — Inspect prints "Order flow displacement bar — at formation · owner says BALANCED · neither side took the larger share (buyers 50% · sellers 50%) · PARTIAL (the provider's per-bar bid / ask volume — an aggregate for the bar, not prints)". The PARTIAL path is proved on real data and says what it is. Still missing: a FULL row from captured tape (the tape only holds bars since the page opened — none seen); the scanner's order-flow condition reads UNAVAILABLE for want of signed tape. **UPDATE 12:57 CDT → PROVED ON SERVING — on provider bar volume and on one captured-tape touch bar (backfilled prints, NQ1! 1m, 6e150db 12:54:37 CDT); a fully tape-read gap not yet observed.** Receipts: §10f. | FVG / chart lane |
| 15 | EVIDENCE INHERITANCE | **PROVED ON SERVING** | Evidence per sense, by reference, never upgraded: test + EURUSD price-only (`eea2771`), DEGRADED on SPY (`c02c2d4`), SpaidBot context SILENCE (`fabce3a`) — §13 row 15. | FVG / chart lane |
| 16 | FVG × PROFILE | **PROVED ON SERVING** | Inspect: Living Profile VAH / POC / HVN near the gap, by reference (`301d85d`); scanner "FVG + profile" (`fabce3a`); Backtest profile split (`b290eef`, 06:52 Oct 9). | FVG / chart lane |
| 17 | FVG × WALLS | **PROVED ON SERVING** | Built by reference. The only serving reads are silence: "Options walls: SILENCE — no options positioning attached" (`301d85d`); scanner 0 wall rows (`fabce3a`). Missing: one read of a gap with a wall attached. **UPDATE 2026-10-09 11:46 CDT → PROVED with a wall attached** (serving `ada59d4`, cert lane own tab, read-only; SPY 1h `scene=clean&on=fvg,BrickWalls,DerivativesPressure&select=fvg:FVG\|TASTYTRADE:SPY\|1h\|1791302400000\|BEARISH\|v1`, walls 778 / 780 / 785 drawn): Inspect → Relationships (by reference): "Options walls call wall 780.00 — near (0.19 away) · owner says TESTED · DEGRADED (DELAYED chain (3862 contracts); exposure INFERRED, tests OBSERVED)". The wall keeps its own state and its own evidence class. A gap farther than its approach distance from every wall (SPY 5m 777.66–777.72, wall 778) says nothing about walls — §24b. | FVG / chart lane |
| 18 | FVG × STRUCTURE | **PROVED ON SERVING** | Inspect "Market structure swing inside … FULL" (`301d85d`); scanner 9 structure rows (`fabce3a`); selected record carries 6 SWING_INSIDE rows (night proof file, 18:23). | FVG / chart lane |
| 19 | FVG × MEMORY | **PROVED ON SERVING** | Aging tests (F); hidden counted, never deleted (`eea2771`); a MEMORY gap drawn only when selected (`c104669` §13 row 12; `0dd1130` 07:50, `fvgDrawn 10\|…\|MEMORY:1`). | FVG / chart lane |
| 20 | AS-OF-TIME TRUTH | **PROVED ON SERVING** | §13 rows 13, 14: `LEAK:0` on 16 matrix rows (`eea2771`), every size (`301d85d`), tablet (`c02c2d4`); Backtest clock at bar 501; Journal snapshot at b3 close. | FVG / chart lane |
| 21 | HISTORICAL FVG STATISTICS | **PROVED ON SERVING** | Counts with denominators read (`eea2771`, `c4de0f0`; accepted 29 of 143, closed through 132 of 147 on `c104669`; splits `b290eef`). Missing: the n-of-m wording of `8cded3a` not read (§13 row 24); no receipt for session revisit rates, average penetration or post-touch displacement. **UPDATE 2026-10-09 11:44 CDT → PROVED** (serving `ada59d4`, `~/wm-held/proof/fvg-serving-night-2026-10-07.txt`): the n-of-m wording on every row and every split cell; session revisit rates (NQ1! same session 171 of 191 (90%), later session 14 of 191 (7%); SPY 50 of 57 (88%), 5 of 57 (9%)); average deepest penetration 98% of size (mean of 185) / 95% (mean of 55); post-touch move away 1.29 ATR (mean of 184 of 185) / 1.20 ATR (mean of 54 of 55). The bars read reach back 4.5 / 4.1 days and the heading says so. | scanner / backtest / replay / SpaidBot lane |
| 22 | NO MAGIC FVG SCORE | **PROVED ON SERVING** | No number on the glass (`fvgGlass.sentinel.test.ts`; `301d85d` erasure note); SpaidBot answer has no probability or score words (`14de5a0`); study labelled DESCRIPTIVE (`eea2771`). | FVG / chart lane |
| 23 | PERSONAL EDGE × FVG | **PROVED ON FIXTURE · real-account read owed** | 18 context-split rows, market and trader columns apart, on the journal sample (`c02c2d4`, §10b). Missing: "confirmed entries" (WAITED) is in the tree, not shipped (§10c); nothing read on a real book. **UPDATE 2026-10-09 11:43–11:46 CDT → read on the journal sample** (serving `ada59d4`, ticket lane, relayed by the coordinator; the lane's written receipt is not yet in this document or a proof file — owed). WAITED (confirmed entries), entry timing and untraded touches are also to appear on /profile (design call, not built). | management lane |
| 24 | COUNTERFACTUAL PERSONAL EDGE | **PROVED ON FIXTURE · real-account read owed** | "Did management help?" on the sample (`c02c2d4`). "Entered too early?" and "avoided valid situations?" shipped in `16f363a` (07:54:56 Oct 9) — unit only, not read on serving. **UPDATE 2026-10-09 11:43–11:46 CDT → read on the journal sample** (serving `ada59d4`, ticket lane, relayed by the coordinator; the lane's written receipt is not yet in this document or a proof file — owed). | management lane |
| 25 | PATIENCE IS PART OF THE INVENTION | **PROVED ON SERVING** | No patience indicator; plan card, Morning Prep rules and loop doors walked on `6e65180` at 1440 + 390 (§10; §10c row 25 / 55). | management lane |
| 26 | MANAGEMENT INTELLIGENCE | **PROVED ON FIXTURE · real-account read owed** | Eleven behaviours as factual classes (§10b; §10c cites `c104669`). Read on the journal sample; the Founder's book has no plans yet. | management lane |
| 27 | MANAGEMENT PLAN SNAPSHOT | **PROVED ON FIXTURE · real-account read owed** | `559884e`, `/journal?scene=journal-fixture`, 390 + 1440 (§10b, 07:10 Oct 9). Owed: one WM-sent order on the real account. | management lane |
| 28 | PREMATURE EXIT INTELLIGENCE | **PROVED ON FIXTURE · real-account read owed** | Six patterns, no shame, unknown emotion said as unknown — journal sample (§10c). | management lane |
| 29 | PSYCHOLOGY WITHOUT FAKE MIND READING | **PROVED ON FIXTURE · real-account read owed** | Trader-chosen labels shipped in `16f363a` (`selfReport.test.tsx`, 17 cases). Not read on serving. **UPDATE 2026-10-09 11:43–11:46 CDT → read on the journal sample** (serving `ada59d4`, ticket lane, relayed by the coordinator; the lane's written receipt is not yet in this document or a proof file — owed). | management lane |
| 30 | SPAIDBOT × FVG | **PROVED ON SERVING** | Complete answer, facts tagged, limitations named (`14de5a0`); request body carries the selected gap (`02e593e`); only the selected record carries relationships; Inspect door pre-filled, 0 requests (`b290eef`, 06:53 Oct 9). | scanner / backtest / replay / SpaidBot lane |
| 31 | SPAIDBOT × MANAGEMENT | **PROVED ON FIXTURE · real-account read owed** | Wired (`spaidbotContext`, `spaidbotPlanReview.ts`), unit-certified. No serving read of an answer (a provider call on the Founder's account) — §10c. **UPDATE 2026-10-09 12:03 CDT → PROVED ON FIXTURE** (serving `e05c774`, `~/wm-held/proof/fvg-serving-night-2026-10-07.txt`): the panel now publishes the two management fields of the context it would send (one builder, no request). On `/journal?scene=journal-fixture` the labelled sample door gave `data-ctx-decision="yes"` and `data-ctx-plan="plan frozen at the ticket's send: thesis “sample: price returns to the gap and holds it” · stop 100.94 · target 99.26 · …"`; 0 `/api/spaidbot` requests, 0 writes, Send not pressed. On the Founder's own account there are 0 stored plans (decision scenes for MNQ1! and NQ1! only), so a real-account read waits for one frozen plan (Founder list); no model answer was read (a provider call). | management lane |
| 32 | ⓘ FVG EDUCATION | **PROVED ON SERVING** | Tools → "fvg" → ⓘ preview → Academy (`c02c2d4`, §13 row 21); the §32 sentence verbatim in `CONCEPT_EDUCATION.FVG_IMBALANCE`. | cert lane |
| 33 | ACADEMY: FAIR VALUE GAPS & IMBALANCE | **PROVED ON SERVING** | 21 lessons in the one Academy, 63 / 63 layouts (`4769a31`); lesson 20 text (`0dd1130` 07:45 Oct 9). Quiz proved on the sample scene with 0 storage writes (`16f363a` 07:58–08:02). One wording fix for the scene's pass screen is in the tree, unshipped (§23b). **UPDATE 2026-10-09 11:43 CDT:** the scene's pass screen now reads "10/10 correct · Marked verified on this page only — not saved (proof scene)." (serving `ada59d4`). **UPDATE 12:54 CDT** (serving `6e150db`, builtAt 17:49:21Z, 390): all 21 lesson drawings measure 318 px wide; **every label renders at 11.02 px (21 of 21 lessons, 93 labels), none runs past its drawing**; captions at 11 px; lesson 21 reads "Reference the gap on your FVG trades in the Journal." **UPDATE 18:44 CDT** (serving `b72f896`, builtAt 23:40:43Z, 390): the audit paragraphs are on lessons 1, 5, 10, 13, 18 and 19; the ON THE CHART box is on all 21 lessons at 11–12 px, inside the column. "must fill" appears once on lessons 1 and 10 — the MYTH card. | cert lane |
| 34 | ACADEMY MUST CHALLENGE MYTHS | **PROVED ON SERVING** | Myth card on lessons 1, 10, 14, 15, 16 in the Founder's words (`4769a31`; §22a). | cert lane |
| 35 | ACADEMY ↔ LIVE MARKET | **PROVED ON SERVING** | 21 / 21 "Show me on a chart" links followed (`92895d6` 9, `0dd1130` 12); Practice in Replay starts Replay (`92895d6` 07:22); Inspect opens the lesson for the gap's own state — 14, 9, 15 (`0dd1130` 07:48–07:50) — §23b. **UPDATE 18:45 CDT** (serving `b72f896`, tools OFF in a clean scene, the ⓘ in Tools → Browse all tools, at 1440 and at 390): FVG / Imbalance → "Academy · What is an imbalance? ›" (fvg-1); Living Profile → FVG + profile (fvg-12); Brick Walls, Derivatives Pressure, Absorption Shelf, Liquidity Weather → FVG + order flow (fvg-13); Effort → Response → Displacement (fvg-5) — each beside "Add to chart". **Not read: the footprint modes' ⓘ** (their buttons are not in the Tool Finder or Chart tools while footprint is off — pinned by unit only). "Bid/Ask Split Profile" has no door. | cert lane |
| 36 | ACADEMY ↔ PERSONAL EDGE | **PROVED ON FIXTURE · real-account read owed** | "Show me my examples" on the sample scene (`559884e`). The sample row's landing on its decision shipped in `16f363a`, not read. Owed: a real FVG-referenced entry. **UPDATE 2026-10-09 11:44 CDT → sample landing PROVED** (serving `ada59d4`): the row `#SAMPLE-24` followed in-app lands on `/journal?scene=journal-fixture#SAMPLE-24`, the decision is in view and marked "OPENED FROM A LINK · this sample decision". Still owed: a real FVG-referenced entry. | cert lane |
| 37 | BACKTEST LAB | **PROVED ON SERVING** | One engine, as-of clock, n of m, pooled, filters (`eea2771`, `c4de0f0`); structure / profile splits (`b290eef`). The order-flow relationship is not offered (see §14). | scanner / backtest / replay / SpaidBot lane |
| 38 | REPLAY | **PROVED ON SERVING** | `REPLAY:…\|LEAK:0`, a later-born object drops out (`301d85d`); stepping at 1180 and 834 (`c02c2d4`); lifecycle test birth → memory (`c02c2d4`). | scanner / backtest / replay / SpaidBot lane |
| 39 | SCANNER | **PROVED ON SERVING** | Five conditions, 30 of 30 read, door to the same object HELD (`eea2771`, `301d85d`); structure + profile convergence (`fabce3a`). Wall and order-flow conditions are omitted because no data supports them — the order allows that. Owed: the 390 tap-size read (§6a). **UPDATE 2026-10-09 11:45 CDT → 390 tap sizes READ** (serving `ada59d4`, `~/wm-held/proof/fvg-serving-night-2026-10-07.txt`): 50 controls on the strip with 30 of 30 read and 36 hit rows — none under 44 px in either dimension, hit rows ≥ 64 tall, nothing past the right edge. The too-few-bars and too-old refusal sentences read through `/scanner?scene=scanner-fixture` ("read 1 of 3 symbols · 2 refused"). | scanner / backtest / replay / SpaidBot lane |
| 40 | JOURNAL | **PROVED ON FIXTURE · real-account read owed** | Reference + as-of snapshot (`eea2771`); save → reload proved through the in-memory round trip on the sample (§10a). Structure / profile / wall / effort / regime context shipped in `0dd1130` — unit only, not read. Owed: save → reload on a real entry. **UPDATE 2026-10-09 11:43–11:46 CDT → read on the journal sample** (serving `ada59d4`, ticket lane, relayed by the coordinator; the lane's written receipt is not yet in this document or a proof file — owed). | management lane |
| 41 | REVIEW | **PROVED ON FIXTURE · real-account read owed** | Review questions on the journal sample (§10b, §10c). Missing: "Did they wait?" (confirmation fact, lessons fvg-9 / fvg-14) is in the tree, not shipped. **UPDATE 2026-10-09 11:43–11:46 CDT → read on the journal sample** (serving `ada59d4`, ticket lane, relayed by the coordinator; the lane's written receipt is not yet in this document or a proof file — owed). | management lane |
| 42 | MARKET TRUTH VS TRADER TRUTH | **PROVED ON SERVING** | Inspect shows the four truth layers on a selected gap (`02e593e`, §6a SpaidBot row); kept apart by sentinel (§10c). | management lane |
| 43 | MARKET HOME MANIFESTATION | **PROVED ON SERVING** | Desktop (`eea2771`), tablet landscape and portrait (`c02c2d4`), phone (`301d85d`, `d308c6c`) — §13 rows 16–19. Owed: a physical tablet. | FVG / chart lane |
| 44 | PRICE SOVEREIGNTY | **PROVED ON SERVING** | Clear zone before the newest candle (`c4de0f0`; 390 on `301d85d`); bands cut around the countdown pill (`d308c6c`). No receipt with a live position, stop or target line beside a gap. | FVG / chart lane |
| 45 | FVG AGING | **PROVED ON SERVING** | Aged opacity rungs on serving (`f96618c`, opacity proof file); memory tier (§13 row 11). | FVG / chart lane |
| 46 | SELECTION / INSPECT | **PROVED ON SERVING** | Tap → gold frame → Inspect rows (`301d85d`, `c02c2d4`, `6568fa3`). Findings open: 28 of 52 Inspect text leaves under 11 px at 390; a gap at the left edge sits under the card (§13 rows 20, 30). **UPDATE 2026-10-09 11:47 CDT (serving at 390 × 844, build rolled `ada59d4` → `f9f61fe` at 11:47:37 during this read):** 63 text leaves in the gap's Inspect, **6 under 11 px** (all 10 px, all in the shared evidence-completeness block); the earlier 28 of 52 no longer holds. Desktop 1440: the card covers x 8–276 of a 1195-px plot (23 % of the width, 91 % of the height) and does not move away from the selected gap. Fix plan: §24c. **UPDATE 2026-10-09 12:03 CDT → text size CLOSED** (serving `e05c774`, builtAt 16:59:20Z, 390 × 844, NQ1! 5m, a fully mitigated bullish gap selected by id): **71 text leaves, 0 under 11 px**; the evidence block computes 11 px; no horizontal overflow. The card's dock is wired (`data-inspect-fvg-dock=LEFT`) and waits for the chart to publish the frame's position. **UPDATE 12:20 CDT → dock PROVED** (serving `f37005c`, 1440): a MEMORY gap at the left edge, frame published `FRAME:GOLD@73,101,53,9` → `data-inspect-fvg-dock=RIGHT`, card at x 851–1119, the gap and its gold frame clear of it; a gap at mid-screen (`@603,184,448,11`) keeps LEFT. | FVG / chart lane |
| 47 | LABEL-ERASURE TEST | **PROVED ON SERVING** | The FVG glass paints no word (sentinel); read with the layer on at every size (`301d85d`, inspect proof file item 5). | Sheriff lane |
| 48 | NUMBER-ERASURE TEST | **PROVED ON SERVING** | No size, percent or age on the glass; numbers live in Inspect (`301d85d`, same item). | Sheriff lane |
| 49 | PANEL-ERASURE TEST | **PROVED ON SERVING** | Inspect closed: remaining vs visited vs traded-through still read (`301d85d`); carriers re-read with `fvg` on (`6568fa3`, night proof file 01:57 Oct 8). | Sheriff lane |
| 50 | EVIDENCE-ERASURE TEST | **PROVED ON SERVING** | EURUSD price-only keeps the layer; senses read NOT ATTACHED, never upgraded (`eea2771`, `301d85d`). | Sheriff lane |
| 51 | FUTURE-LEAK TEST | **PROVED ON SERVING** | `LEAK:0` live and in Replay (`301d85d`, `c02c2d4`); frozen after formation in `fvgEngine.test.ts` G. | FVG / chart lane |
| 52 | RESPONSIVE RELEASE TEST | **PARTIAL** | Public pages 48 / 48 on `b290eef` (06:54 Oct 9, `release-52-0653`); FVG at 1920 / 1180 / 834 / 390 (`301d85d`, `c02c2d4`); 16 instrument × timeframe rows (`eea2771`). Missing: a physical tablet and phone (pointer: coarse) — on the Founder list. | Sheriff lane |
| 53 | FVG INVENTION CERTIFICATE | **PROVED ON SERVING** | §5 exists but was written without the order's field list. Missing rows: TYPOGRAPHY, MOTION, PROVENANCE, MEMORY, DESKTOP, TABLET, PHONE; several rows still read BUILT though later sections proved them. **UPDATE 2026-10-09:** the order's 24 fields are now written as §25 of this document. Still PARTIAL inside it: MOTION (no receipt), TABLET and PHONE on a physical device. **UPDATE 12:03 CDT:** TYPOGRAPHY closed (0 of 71 leaves under 11 px on `e05c774`). Only MOTION (the approach glow has no receipt — chart-lane ask) and the physical devices remain. **UPDATE 12:21 CDT → MOTION read, certificate complete** (serving `f37005c`): `fvgDrawn 9\|LIVE:6\|SCAR:3\|MEMORY:0\|GLOW:1` on SPY 1m with an APPROACHING gap on camera; GLOW:0 on six other cameras with none approaching. All 24 fields of §25 now carry a serving receipt; physical tablet and phone remain owed under §52 / §58. | cert lane |
| 54 | DO NOT CREATE FVG SCOPE EXPLOSION | **PROVED ON SERVING** | `FVG_ROOM` is a rejected kind; one detector (`fvgCamera.sentinel.test.ts`); every FVG surface read lives in an existing room (/scanner, /backtesting `eea2771`; Academy module 9 `4769a31`). | FVG / chart lane |
| 55 | PATIENCE / MANAGEMENT DOES NOT BECOME A NEW APP | **PROVED ON SERVING** | No new room; walk on `6e65180` (§10; §10c). | management lane |
| 56 | THE FULL LEARNING LOOP | **PROVED ON SERVING** | Public loop 15 steps, signed out (`0dd1130` 07:50 Oct 9); product hops by integration test + serving walk (`6e65180`); lesson → journal hop on the sample (§19b). | cert lane |
| 57 | ATH WEBSITE | **PROVED ON SERVING** | No indicator-launch claim; living-market language; $20 / month unchanged (`d5ac6ff`; `0dd1130`). The copy has never been redlined by the Founder (§23d). | cert lane |
| 58 | PERFORMANCE LAW | **PARTIAL** | Paint within budget (`301d85d`, `c02c2d4`); compute per closed bar; bench at CPU ×4 (night proof file). Missing: a signed-in read on a real phone (§13 row 27). | FVG / chart lane |
| 59 | KEEP / FIX / PROVE | **PARTIAL** | This table is the proof ledger; it is not all PROVED (see the totals). **12:57 CDT:** cannot close while any row is short of PROVED ON SERVING — it waits on the 12 sample-data rows (Founder actions), §52 / §58 (physical devices), §62 and §66. | coordinator |
| 60 | BUILD ORDER | **PROVED ON SERVING** | Stages A–G shipped in order: SHA chain `4769a31` → … → `c02c2d4` (§13 row 29). | coordinator |
| 61 | DO NOT LET THE NEW INVENTION BLOCK CURRENT RELEASE | **FOUNDER DECISION** | The layer ships default OFF (`683aecf` read: off in a clean scene). Default ON or OFF is the Founder's call (§13 row 30 h). | coordinator |
| 62 | RELEASE EVIDENCE | **PARTIAL** | §13: 29 bullets. Still open there: Backtest wording re-read (row 24), real-entry Journal save → reload (row 26), real-phone performance (row 27), real examples (row 22). **12:57 CDT:** the Backtest wording was read at 11:44 (§21). Still waits on: one real Journal entry saved and reloaded (Founder), one real "Show me my examples" entry (same action), and performance on a real phone (device). Nothing left for a lane to build. | cert lane |
| 63 | FINAL FVG SHERIFF TEST | **FOUNDER DECISION** | The lanes ran it (`fvg-serving-sheriff-2026-10-07.txt`; first-tap screenshots on `c104669`). The test is the Founder's own walk on Market Home — owed, and the layer is off until he switches it on. | Sheriff lane |
| 64 | FINAL PATIENCE / MANAGEMENT SHERIFF TEST | **PROVED ON FIXTURE · real-account read owed** | Market / planned / actual apart, factual deviations, new evidence preserved — sample walkthrough (§10b). Owed: one completed Founder trade. | management lane |
| 65 | GARDEN 19 FINAL FVG LAW | **PROVED ON FIXTURE · real-account read owed** | Every line has a row above except: other evidence present / absent at the gap is limited to structure, profile and walls (§13, §14, §17); "how the trader behaved" is proved on sample data only (§23). **UPDATE 12:57 CDT:** with §13 and §14 proved, other evidence present / absent at the gap is now read for structure, profile, walls, effort → response and order flow. The one line left is "how the trader behaved" — proved on sample data only (§23, §24, §41). Closes with the Founder's real journal entries. | FVG / chart lane |
| 66 | GARDEN 19 CONSTITUTIONAL CLOSE | **PROVED ON SERVING** | Most pairs have rows above. Open: "broker acknowledgement before execution certainty" — the Webull server gate (`559884e`) is pinned by sentinel, not proved on serving (§21c); "permission before automation" — authorized execution is not built and needs the Founder's permission rule (§10c). **12:57 CDT:** still waits on two things — (1) a serving read of the Webull order door's server gate refusing an order (not done: no order is sent on the Founder's account; needs a sample or dry-run path), with decision 6 on the GATED wording; (2) the Founder's permission rule for authorized execution. **UPDATE 18:28 CDT → PROVED ON SERVING** (brokers lane's receipt, "§66 receipt" in this document; serving `e8ca9f2`, 13:31:40–13:32:17 CDT): the server gate was READ with no order sent — owner, both brokers: limits UNSET → WOULD_REFUSE, `sent: false`, "would refuse: No server-held order limits are set…"; guest 401; every execute row in Settings › Connections prints the gate's verdict with its time. Still the Founder's: the Webull GATED wording (handover 6) and his permission rule for authorized execution. | coordinator |

Struck from the open list: the memo-deps ask at `ChartsDashboard.tsx` ~2960 — closed in `7f2ca59` (coordinator, Oct 9).

---

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
| A5 | CVD relationship (Registry §C aggression; refinement "CVD / Delta relationship" plate required) | tape CVD pane `MainChart.tsx` CVD_PANE + `selectDeltaDivergence.ts` | sided tape; `cvdSides` INFERRED vs LABELLED | F C S(inferred) | **PANE** (`dataset.cvdSource`, `cvdBars`, `cvdSides`) plus Delta Divergence = **CANVAS-B** at two pivots | the relationship of CVD to price never reaches the candle. Agree/diverge per bar is unseen unless the user reads a second pane: **panel-erasure fail** · **UPDATE 2026-10-08 01:58 CDT (chart lane, serving 6568fa3, NQ1! 5m 1180, `~/wm-held/proof/fvg-serving-night-2026-10-07.txt`) → PARTIAL, no longer a bare panel-erasure fail.** The PER-BAR half reaches the candle through the Bar Delta Keel (C-02): each finished bar's signed delta on its close edge, HOLLOW when the aggression failed to move the bar its way — receipt `barDeltaKeels 51\|BASIS:TAPE2+SIDES80\|FAIL:0`. The CUMULATIVE half (CVD slope vs price across swings) is still the pane plus Delta Divergence at two pivots (`deltaDivergence UNMEASURED` on this read). **Not built, and why:** a per-bar CVD-vs-price carrier beside the keel would be a second encoding of signed flow on the same bar; it needs the "CVD / Delta relationship" Founder plate this row already names before anything is painted |
| A6 | Effort / response per bar — Response Matrix (AB.MATRIX) | `src/lib/chart/effortEvidence.ts` `readResponseMatrix` | volume + range (bars alone). Sided evidence not required | all with volume. FX = tick-count proxy, labelled | **RAIL on serving** (`effortResponse` absent on all four symbols). In this worktree, **uncommitted** `src/lib/chart/effortResponseField.ts` plus a MainChart block "EFFORT → RESPONSE ACROSS THE CANDLES (Garden 19 §7)" paints an ivory displacement column inside each volume bar. Proof token `effortResponse`, receipt `DRAWN:N\|A\|I\|V\|Q\|L\|H` | the textbook Garden 19 failure on serving. The fix is in flight in the build lane, not yet deployed · **UPDATE 2026-10-08 01:58 CDT → PROVED on the field** (serving 6568fa3, NQ1! 5m 1180, `on=effortResponse`, `~/wm-held/proof/fvg-serving-night-2026-10-07.txt`): `effortResponse DRAWN:N81\|A4\|I9\|V2\|Q8\|L4\|H21` — the displacement column is inside every finished volume bar; the rail card is no longer the only carrier |
| A7 | Volatility / breathing state (F15.BREATHING) | `src/lib/chart/marketBreathing.ts` (`atrSeries` per bar) | OHLC only | all (FX lawful: no volume needed) | **RAIL**: state, phase, atrRatio, barsInState as a card | per-bar ATR series exists and is never painted. Panel-erasure fail · **UPDATE 2026-10-08 01:58 CDT → on the field as PROPOSED, default OFF** (no Founder plate for Breathing yet). Breath Ribbon (`on=breathRibbon`, Tool Finder "Breath Ribbon (proposed)", `marketBreathing.readBreathRibbon`): each finished bar's ATR14 ÷ the 120-bar median as a thin ribbon on the volume well's top edge, a notch where the state changed, one ink for every state. Serving 6568fa3 (`~/wm-held/proof/fvg-serving-night-2026-10-07.txt`): NQ1! 5m 1180 `PROPOSED:DRAWN:81\|NOW:NORMAL:1.27x\|CHANGES:2` (0.20 ms); EURUSD 5m 390, price only, `PROPOSED:DRAWN:34\|NOW:EXPANDED:1.45x\|CHANGES:3`. Panel erasure passes only while the trader switches it on — it stays PROPOSED until a plate rules the form |
| A8 | Regime state (H-901) | `selectRegimeLighting.ts` | bars; one breaker TREND / RANGE / TRANSITION | all | **CANVAS (lens)**: dims or caps fixtures for the CURRENT breaker over all bars in view | shows *the current value applied to all history*. Regime age and past transitions are not on the field. Registry lists Regime Age (§G) and regime transition (§P) |
| A9 | Structure state (intact / testing / deteriorating / failed / reclaimed — Registry §K) | `selectMarketStructure.ts` | bars (swings) | all | **CANVAS-B/C**: confirmed swing highs and lows, last of each loudest | swings paint; the per-leg *state* does not. BOS / reclaim events are not distinguished from pivots |
| A10 | Session state (Registry §C time/session) | `src/lib/chart/sessionBands.ts` | clock + venue session | F FX C (S, O: RTH / ETH) | **CANVAS-A**: `dataset.sessionBands` (ASIA / LONDON / NEW YORK floor bands), `sessionBandsNow` | built. The label-slide work landed in 7b7f914d. Session Age (§G) not carried |
| A11 | Imbalance state per bar (Registry §E imbalance) | `FootprintControls.tsx` imbalance mode; `selectStackedImbalance.ts` | sided per-price rows | F C (S inferred) | **CANVAS** only inside Footprint mode (`imbalanceRows`) or as stacked runs (`imbalanceRuns`, Class B) | outside Footprint the per-bar imbalance side is invisible. Needs a light continuous carrier at ordinary zoom |
| A12 | Clarity Candle (F05A) | `src/lib/chart/clarityCandle.ts` | OHLC | all | **CANVAS-A**: candle species (decisive body solid, indecision hollow) | built as a candle species. Live receipt pending |
| A13 | Clarity anatomy (F05B) | `selectClarityAnatomy.ts`; `MainChart.tsx` F05B block | OHLC + sides | all (split UNREAD without sides) | **SELECTED-ONLY**: `dataset.clarityOnPrice` `BAR:<t>\|D:..\|SPLIT:..` | correct: an inspect depth, not a field. No gap |
| A14 | Value Candle (F06.VALUE_CANDLE) | `selectValueCandle.ts` | per-bar volume-at-price | S F C | CANVAS (per bar in window) | plate needed. Live receipt pending |
| A15 | Temporal Evidence Density (F10.TED) + Clock / Structural / Event / Session / Regime Age | `effortEvidence.ts` `readTemporalEvidenceDensity` | volume across clock time | all with volume | **RAIL**: one TED line | time family §G is a FAMILY. Only TED exists, as one number. No age carrier on the field · **UPDATE 2026-10-08 01:58 CDT (chart lane) → PARTIAL, recorded honestly.** AGE now has carriers on three objects, by form not words: FVG territory fades with bars since interaction and scars sit in the MEMORY tier (`fvgDrawn 8\|LIVE:5\|SCAR:3`); Profile Memory lines fade by session age with open / closed end caps (`profileMemoryForms POC_SOLID:2\|EDGE_DASHED:2\|NAKED_OPEN_CAP:1\|AGE:S-1..S-4`); zone state reads by word and touch dots. **Still panel-only:** TED itself (one rail number), Regime Age and Session Age. **Why not built tonight:** each needs a plate — a time-density carrier on the time axis would be a new invention, and the Breath Ribbon already took the one proposed slot at the volume well's top edge |
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
  - panel-erasure fails A5, A6, A7 and A15. **UPDATE 2026-10-08:** A6 PROVED on the field; A7 on the field as PROPOSED (default OFF); A5 and A15 PARTIAL with reasons — see their rows.
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
| **JOURNAL / REVIEW** | A reference to one OBJECT_ID plus a snapshot **as of decision time** (`fvgStateAsOf(ledger, decisionAt)`), never "FVG = YES". Review answers first-or-later touch, acted before the condition, and held after a trade-through. A missing fill time answers UNKNOWN | `fvgDecisionReference.ts`, `planFvgContext.ts`, `JournalFvgReferenceField.tsx` | **PROVED for the as-of snapshot** (serving eea2771): "Journal it" pre-fills the id. Read at b3 close → "born, before price had touched it (0 interactions), deepest 0%, 31388.00–31392.50 unvisited, 0 bars old". Read now → "fully mitigated, after the first interaction (1), deepest 100%, no unvisited territory, 4 bars old". **PARTIAL:** not saved, so save → reload → same snapshot is unproven, and so are the Review answers | **Review answers PROVED on serving bf5052b via the read-only proof scene** `/journal?scene=journal-fixture` (own tab, signed in; SAMPLE-FVG 5m, 24 synthetic decisions from the one engine; banner "PROOF SCENE — sample data, not your journal"): 6 Review rows through the real `StoryReviewRow` (`readOnly`), each FVG block in its truth layers — e.g. TRADER TRUTH "bearish gap 100.53–100.64 on SAMPLE-FVG 5m (FVG_3C v1): at decision time it was rejected, during the first interaction…"; MARKET TRUTH "Your entry at 10:40 AM CST came on the first touch…", "Price had reached the territory (touch 1 began in the bar from 10:35 AM CST) before your entry", "The territory was traded through at 11:40 AM CST, outside the time you held the position". No ledger-load or Ask door in the scene. Network during the scene: only the shell's `/api/auth/me`, `/api/market-memory/coverage` and Cloudflare RUM — nothing from the scene. **Still PARTIAL:** save → reload on a real entry (never on the Founder's account) **Save → reload (appended 2026-10-08):** PROVED in unit / integration (`journalFvgReferenceSave.test.ts`, §10a); on serving it needs a real Founder entry — the proof scene is read only |
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
| Chart layer `on=fvg` | c4de0f0 → d6e2c18 → 301d85d / 8db9b21 | `fvgGlass`, `fvgGlass.sentinel`, `fvgCamera` (+ sentinel) | 16-row matrix on eea2771 (NQ1! / ES1! / SPY / BTC-USD 1m / 5m / 1h, BTC-USD 500T, EURUSD 1m / 5m / 1h): LEAK:0 everywhere, MAXX ≤ X < NEWEST. Sizes on 301d85d: 1180 / 834 / 390 all MAXX < NEWEST, LEAK:0, paint MET. ES1! 5m tap → Inspect with first touch, tick size and relationships | `~/wm-held/proof/fvg-serving-inspect-replay-sizes-2026-10-07.txt`, `~/wm-held/proof/fvg-serving-matrix-2026-10-07.txt`; lane screenshots ss_2666xi0xg (390) and ss_7554d5qli (replay) | **PROVED:** layer, budget, no future leak, clear zone at 1180 / 834 / 390, selection into Inspect, 500T tick bars, paint cost, label / number / panel / evidence erasure. **PARTIAL:** scar quieting on SPY 5m not re-read. **Data-lane note:** EURUSD 1m point bars give 0 gaps · **TABLET — PROVED on serving c02c2d4 (2026-10-08 02:57–03:04 CDT, FVG lane, own tab, same-origin iframe at the tablet size, read-only; `~/wm-held/proof/fvg-serving-night-2026-10-07.txt` §52 FVG TABLET).** NQ1! 5m and SPY 5m, `scene=clean&on=fvg`, at **1180×820** and **834×1112**: LEAK:0 live and in Replay at every read; clear zone held (NQ X:803/NEWEST:818 and X:685/700; SPY X:817/832 and X:699/714, MAXX = X); scars 3 on each; paint MET (0.00–0.40 ms). Tap at the published hit point → `fvgSelected` names the object (NQ BULLISH REJECTED at 1180, NQ BEARISH OPEN at 834, SPY BEARISH BORN at both) with `fvgSelectedMark=FRAME:GOLD`; the Inspect ticket sits inside the viewport with its own scroll, page overflow-x 0. ⓘ (Tools → Find a tool "fvg") → Academy → `/education?lesson=fvg-1` at both sizes. Replay step: BARS +1 per step, LEAK:0, a birth counted (HIDDEN 776→777 on NQ). Both directions on glass: NQ bearish + bullish live; SPY bearish live, bullish in the Replay window (live view after a sell-off held bearish bands only). **PARTIAL:** touch-target size on a real tablet — this window reports pointer:fine, so Inspect's close (12×12) and its two text links (15–17 px tall) measure under 44; they carry `.wm-tap`, which sets 44×44 only under `(pointer: coarse)`; needs a coarse-pointer device read |
| Replay camera | 301d85d | `fvgCamera.test.ts` | ES1! 5m, cursor 4857 / 4977: `REPLAY:1791370800000\|BARS:4857\|LEAK:0`; an object born after the clock drops out; put-down returns LIVE | `~/wm-held/proof/fvg-serving-inspect-replay-sizes-2026-10-07.txt`; ss_7554d5qli | **PROVED** |
| Scanner FVG conditions + `select=fvg:<id>` | eea2771; 301d85d | `fvgScanConditions`, `fvgChartLink`, `proofSelectFvgHeld` sentinel | eea2771: 30 of 30 read, 14 hits, 5 conditions, decimals, link. 301d85d: `data-proof-select-object …\|HELD`, Inspect on that id (REJECTED) | `~/wm-held/proof/fvg-serving-inspect-replay-sizes-2026-10-07.txt` | **PROVED** |
| Backtest FVG study | c4de0f0; eea2771 | `fvgStudy` | eea2771, read-only: NQ1! 5m, 991 bars, 148–151 gaps, DESCRIPTIVE label, FVG_3C v1, revisited 139 of 148, median first touch 2 bars, still open 9 of 148 (1 too young); clock at bar 501 → 73 gaps, 70 of 73 revisited; pooled 524; localStorage unchanged; decimals 31388.00 – 31392.50 | lane-held | **PROVED** |
| Journal × FVG reference + Review | d5ac6ff; eea2771 | `fvgDecisionReference` | eea2771: "Journal it" pre-fills the id; as-of at b3 close = born, 0 interactions, deepest 0%, 31388.00–31392.50 unvisited; now = fully mitigated, first interaction, deepest 100% | lane-held | **PROVED** (as-of snapshot). **PARTIAL:** save → reload → same snapshot, and the Review three-column answers (not saved in the receipt) **Appended 2026-10-08:** the three-column Review is PROVED on serving via the proof scene (§10a); save → reload is PROVED in unit / integration and needs a real Founder entry on serving |
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
| Plain refusals (too few bars, stale, unavailable) | `fvgScanConditions.test.ts`; `lib/marketData/fvg/fvgWireBars.test.ts` (trader words) | fabce3a: the scanner universe read 30 of 30 again, so its own list could not refuse. The SHARED bar reader's refusal was read through the Backtest study (`ZZZZQ 5m`, same `fetchFvgBars` path): it said **"Nothing was studied: Error: Yahoo HTTP 404"** — a vendor name and an HTTP code. **Defect, fixed (uncommitted, next batch):** `traderWords` drops plumbing; that case now reads "No 5m bars could be read for ZZZZQ — it may not be a symbol we can chart, or it has no history at this timeframe." | **PARTIAL:** re-read the refusal on the next build · **UPDATE 2026-10-09 06:52 CDT → PROVED** (serving b290eef, own tab, `~/wm-held/proof/fvg-serving-night-2026-10-07.txt`): the shared bar reader's refusal through the Backtest study, `ZZZZQ 5m`, reads "Nothing was studied: No 5m bars could be read for ZZZZQ — it may not be a symbol we can chart, or it has no history at this timeframe." — no vendor name, no HTTP code. The Backtest's own run refusal names the unknown symbol too (06:51:35). Still unread on serving: the too-few-bars and stale sentences (no listed symbol produced them; pinned in `fvgScanConditions.test.ts`) · **UPDATE 2026-10-09 07:48 CDT → STILL UNREAD** (serving 0dd1130): 44 read-only daily bar probes (delisted names, far futures, recent listings) — every answering symbol had 59–160 bars with the newest on Oct 8; delisted names return no candles. Neither sentence can be reached with a real symbol today; a scanner sample scene was proposed · **UPDATE 08:02 CDT → BUILT, serving read owed:** `/scanner?scene=scanner-fixture` (signed-in, banner, zero writes) hands three SAMPLE daily bar sets to the real `fvgScanConditions`; `scannerFixture.sentinel.test.ts` pins both sentences word for word · **UPDATE 11:43 CDT → PROVED** (serving `ada59d4`, `~/wm-held/proof/fvg-serving-night-2026-10-07.txt`): "SAMPLE-SHORT — Only 9 closed 1D bars — at least 17 are needed before ATR(14) exists and a gap can be read." and "SAMPLE-OLD — The newest closed 1D bar closed 11.7 days ago — too old to be a current reading, so no condition is claimed."; zero writes, zero requests for a sample symbol. A symbol the upstream does not know now answers HTTP 404 (was 500) with the same trader sentence |
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
| Relationship splits (structure / profile) from pre-formation bars; n of m; INSUFFICIENT below 20 gaps, no share printed | `fvgStudy.test.ts` (relationship + INSUFFICIENT) | not yet — chart lane reads the split table on serving | **PARTIAL** · **UPDATE 2026-10-09 06:52 CDT → PROVED** (serving b290eef, FVG study NQ1! 5m, 180 gaps, `~/wm-held/proof/fvg-serving-night-2026-10-07.txt`): structure 123 with / 57 without, profile 60 with / 120 without, every cell n of m with its share; INSUFFICIENT with withheld shares, medians and means was read on a 19-gap group on d308c6c (02:44, same file) |
| Read-only: nothing saved by a study | `fvgSilence.sentinel.test.ts` (fetch only on Add) | c4de0f0 / eea2771: localStorage byte-identical before and after | **PROVED** |

**SpaidBot (FVG facts)**

| Claim | Test | Serving receipt | Status |
|---|---|---|---|
| The selected gap's fact block reaches the model's turn: definition id / version, as-of time, lifecycle state, OBSERVED FACT / DERIVED MEASUREMENT tags, evidence per sense, limitations, no fill / probability words | `app/api/spaidbot/fvgContext.e2e.test.ts` (real route, model stubbed), `lib/ai/spaidbotFvgFacts.test.ts` | **02e593e, own tab** (rAF/visibility shim), NQ1! 5m `scene=clean&on=fvg`: a tap at the published `fvgHit` point selected the gap (Inspect REJECTED, four truth layers); "Ask SpaidBot" opened the launcherless panel pre-filled; ONE Send. The request body carried `context.fvg` = 1 record, `selected: true`, `FVG_3C@1`, state REJECTED, boundaries 31424.50–31435.50, `priceDp` 2, `readAsOf` 2026-10-08T02:05:00Z. **The model did not answer** ("SpaidBot's model did not answer in time — nothing was decided"): the route's 30 s first-byte bound ended it. **Defect found and fixed (uncommitted):** the Inspect ask patched `symbol` with the feed streamer id and put "TASTYTRADE:/NQZ26:XCME" in the question; it now patches `fvg` only and asks about "the selected bullish FVG on this chart, 5m" **Second Send (authorised), dae44b0:** prefill "What am I looking at? (the selected bullish FVG on this chart, 5m)"; headers at **29.85 s** (just inside the 30 s bound); reply streamed one sentence — "Here is the breakdown of the selected 5m bullish Fair Value Gap on **NQ1!** based on the current chart data (source tastytrade, last observed 2026" — then ended. Cause: gemini-2.5-flash thinking (≈30 s, and it spent the 1024-token budget) → fixed in 05670f2 (thinking off, 2048 tokens, a MAX_TOKENS cut says so). **Third Send (authorised), 05670f2:** first byte **5.93 s** (was 29.85 s); reply again ended after one sentence — "Here is the breakdown of the selected bullish 5m Fair Value Gap based strictly on the provided chart line" — with NO length-limit note, so the model stopped for another reason the relay did not say. **Fix (uncommitted, next batch):** the relay now relays every text part and names any non-STOP finish reason ("The answer stopped early — the model's reason: …"). Words in all three: no must / will fill, no probability, no score; the second reply began citing source and as-of **Fourth Send (authorised), bf5052b (multi-part relay + stop-reason note live):** headers 8.44 s, stream 11.46 s; a real answer this time — "### Selected Bullish FVG Breakdown · [OBSERVED FACT] Structure & Boundaries: … formed at 2026-10-08T01:40Z with boundaries from 31,424.50 to 31,435.50 · [OBSERVED FACT] Interaction History: first touched at 01:50Z … 4 interactions: REJECTED (39%), REJECTED (2%), REJECTED (52%), OPEN (11%) · [OBSERVED FACT] Lifecycle State: DEEPLY_MITIGATED", cites "source tastytrade, last observed 2026-10-08T02:50:27Z, 2s before this question"; **no** must / will / has-to fill, probability, likely, chance or score. But it still **ended mid-list (775 chars, last char "*") with no finish-reason note and no length note** — so the upstream closed without a non-STOP reason. Hypothesis "the relay dropped later parts" is only partly right (this reply was longer than before). **Fix (uncommitted, next batch):** the relay now reads a last event that has no trailing newline and closes with a `meta` receipt (finishReason, blockReason, chunks, chars, candidatesTokens, endedWithoutFinish) the panel ignores, so the next read names the cause **Fifth Send (authorised), 10d1324, 22:06:35 CDT:** 504 at 30.30 s (model headers never arrived; no stream). **Cause of the mid-answer cuts found on OUR side:** the route linked the upstream to `req.signal` for the whole stream; on the Workers runtime that signal fired after the Response was handed back, aborting the upstream body, which read as a clean end with no finish reason. Fixed in 14de5a0 (`linkUntilHeaders` — the client's abort reaches the upstream only until the headers; after that the relay's `cancel()`; a server-cut stream says `CUT_BY_SERVER`). **Sixth Send (authorised), 14de5a0, 22:17:26 CDT (`date`), own tab, NQ1! 5m, selected bearish gap (REJECTED), prefill "What am I looking at? (the selected bearish FVG on this chart, 5m)":** headers 6.92 s, stream complete 8.58 s; relay meta `{finishReason: STOP, chunks: 34, chars: 2633, candidatesTokens: 861, endedWithoutFinish: false, upstreamAborted: false}` — a complete answer. It tags its claims OBSERVED FACT ×3, DERIVED MEASUREMENT ×4, INFERENCE ×1, HYPOTHESIS ×1; cites "source tastytrade, last observed 2026-10-08T03:17:25Z, 1s before this question"; names the gap's boundaries 31,420.75–31,434.25, first touch and REJECTED state; reads ORDER_FLOW / DERIVATIVES as SILENCE ("provides no evidence either way"); and says "This FVG is a descriptive geometric object, not a forecast — price does not have to fill or respect this gap." No must / will fill, probability, likely, chance or score | **PROVED** (serving 14de5a0, one Send; first-byte spread across all Sends: 29.85 s → 5.93 / 8.44 / >30 / 6.92 s) |
| System prompt carries "Never say price has to fill an imbalance; distinguish observed fact, derived measurement, inference and hypothesis." verbatim | `spaidbotFvgFacts.test.ts`, `fvgContext.e2e.test.ts` | server code (no client receipt applies) | **BUILT** |
| Forged / malformed records say nothing (server re-validates every field) | `spaidbotFvgFacts.test.ts` | n/a (server) | **BUILT** |
| No selection: visible gaps without a SELECTED marker; no gaps: no block; layer OFF: no `fvg` | `fvgContext.e2e.test.ts`, `fvgSilence.sentinel.test.ts` | 683aecf, own tab, `scene=clean` (OFF): chart context had no `fvg` field | **PROVED** for OFF; **PARTIAL** for the ON cases · **UPDATE 2026-10-09 06:52 CDT → ON cases PROVED** (serving b290eef, `~/wm-held/proof/fvg-serving-night-2026-10-07.txt`): layer on, no selection → 3 records, none `selected`, none with relationships; after a tap → the first record `selected: true` and it alone carries the §30 relationships |
| "Ask SpaidBot" (Inspect, Review) opens the existing panel PRE-FILLED and never sends for the trader; patch rides one question | `lib/ai/spaidbotAsk.test.ts`, `fvgContext.e2e.test.ts` | none (no request sent on the Founder's account by design) | **PARTIAL:** panel opening pre-filled, read on serving · **UPDATE 2026-10-09 06:53 CDT → PROVED for Inspect** (serving b290eef, `~/wm-held/proof/fvg-serving-night-2026-10-07.txt`): the Inspect button opened the panel (boundary line present) pre-filled "What am I looking at? (the selected bearish FVG on this chart, 5m)"; 0 `/api/spaidbot` requests; Send left waiting. The Review door is proved in unit / e2e only · **UPDATE 2026-10-09 11:43 CDT → Review door PROVED on serving** (`ada59d4`, `~/wm-held/proof/fvg-serving-night-2026-10-07.txt`): the journal proof scene's one labelled sample door opened the panel with the plan question and the journal's FVG reference pre-filled; 0 `/api/spaidbot` requests, 0 writes; Send not pressed |

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
- **Re-run, production `6568fa3` (confirmed by `/api/build-identity`), 2026-10-08 01:42 CDT: 48 / 48 PASS**; no SMALL_TEXT; report `~/wm-held/proof/release-52-0145/`.
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
| Review: market / planned / actual, deviations, the trader's own "why"; FVG answers | `planSheriff.ts`, `planVsActual.ts`, `planFvgContext.ts`, `BrokerTruthToday.StoryReviewRow` | Each deviation → "Study: Lesson N · title →" (`/education?lesson=fvg-N`) | hop 6; local Playwright `review-1440.png` / `review-390.png`; Sheriff sweep `managementSheriff.sentinel.test.ts` | **PROVED** locally. **PROVED on serving for the three columns, the deviation lines and the plan-alone line via the read-only proof scene** (sample data; §10a, 14de5a0 at 22:40 CDT and 6568fa3 at 01:42 CDT, 1440 + 390). **PARTIAL** only for the Founder's own trades: he has no frozen plans yet |
| Personal Edge: adherence by setup, FVG study list (WHEN / DEPTH / AGE, old gap > 50 bars), market vs execution edge; MEASURED only at n ≥ 20 | `planAdherence.ts`, `planFvgStudy.ts`, `planFvgCounterfactual.ts`, `PlanAdherenceBySetup.tsx` | The most common departure → its lesson | hop 7; `pe-1440.png` / `pe-390.png`; **serving bf5052b proof scene** `/journal?scene=journal-fixture` (sample data, read-only): FVG study list "First touch · 17 decisions · INSUFFICIENT EVIDENCE — 17 of 20 with a recorded R", "Later touch · 4", "Between touches · 3"; MARKET EDGE vs EXECUTION EDGE "INSUFFICIENT EVIDENCE on first touches: 17 traded and 9 not traded (20 each side needed)", "… later touches: 4 traded and 17 not traded", "Your 24 FVG trades with a recorded R averaged 0.14R; 50% closed above 0R … Descriptive only", "Not compared: 2 … 1 …", "DESCRIPTIVE — not evidence of edge"; Academy examples "24 sample decisions on gaps" with as-of state lines | **PROVED** on serving for the FVG study list and the first counterfactual slice (proof scene, sample data); **PROVED** locally; **PROVED on serving for adherence by setup via the proof scene** (§10a: "SAMPLE gap reclaim" MEASURED 18 of 20, "SAMPLE gap fade" INSUFFICIENT EVIDENCE 4 of 20). **PARTIAL** only for the Founder's own book (no entries with plans or FVG references yet) |
| Academy: "Show me my examples" from the trader's own FVG references, with adherence | `fvgCourse.fvgReferencedExamples`, `FvgLessonBody.tsx` | Each example → `/journal?entry=<id>`; lessons 17 / 18 / 19 / 21 → Morning Prep and the Journal ("learn yourself") | hop 8; serving 6e65180: lesson 18 links land on `/morning-prep` and `/journal`, no 404 | **PROVED** |
| SpaidBot: the Decision_ID and the frozen plan as TRADER TRUTH; a factual question that names no emotion | `spaidbotContext.withScenePlan`, `formatChartContextNote`, `spaidbotPlanReview.ts`, SpaidBot system prompt | — (the loop restarts at Morning Prep) | hop 9; `patienceCopy.sentinel.test.ts` | **PROVED** (unit; no provider call) |

The single walk is `src/lib/journal/learningLoop.integration.test.ts`. It asserts the same Decision_ID at every hop, the plan as frozen at the send (the paper fill does not refreeze it, and later changes are dated amendments), and the FVG state as of the decision (`readAsOfMs ≤ decisionAtMs`). Each hop's door points at the next hop.

### 10a. Serving receipts — proof scene with frozen plans (management lane, appended 2026-10-08 01:44 CDT)

`/journal?scene=journal-fixture` is SAMPLE data: 24 synthetic decisions on SAMPLE-FVG 5m, each with a synthetic plan frozen at a sample ticket send (`journalProofFixture.ts`). It is read only. It proves that the real Review and Personal Edge components render these facts on serving; it proves nothing about the Founder's own trades.

| When (`date`, CDT) | Build | Width | What was read (own tab, signed in, read only) | Status |
|---|---|---|---|---|
| 2026-10-07 22:40:25 | 14de5a0 or later (the plans fixture) | window 1920 | Banner "PROOF SCENE — sample data, not your journal". 6 Review rows, each with WHAT THE MARKET DID / WHAT YOU PLANNED / WHAT YOU ACTUALLY DID (6 / 6 / 6 blocks) — e.g. market "Source: sample 5m bars (proof scene); 48 bars from the entry bar (10:40 AM CST). During the hold: high 100.8 (10:50 AM CST), low 99.8 …" (local time with zone). 6 deviation blocks: EXITED_BEFORE_PLANNED_CONDITION 1, EXITED_DURING_NORMAL_RETRACEMENT 1, EXITED_AFTER_THESIS_INVALIDATION 3, PLAN_FOLLOWED 2. 6 plan-alone lines — e.g. "The plan alone would have reached neither the target 99.26 nor the stop 100.94 within the plan's 30-minute horizon. Descriptive only". Adherence by setup: "SAMPLE gap reclaim" MEASURED "Plan followed on 18 of 20 decided trades (90%)"; "SAMPLE gap fade" INSUFFICIENT EVIDENCE "4 of 20 decided trades so far". No plan card, price-path loader or delete control (0). No horizontal overflow | **PROVED** (three-column Review, findings, plan-alone, adherence by setup — sample data) |
| 2026-10-08 01:42:25 | 6568fa3 | 1440 (same-origin iframe) | Scene + banner present; 6 / 6 / 6 column blocks side by side (x 299 / 581 / 863, 274 px each, same y); 6 deviation blocks; 6 plan-alone lines; adherence rows MEASURED + INSUFFICIENT EVIDENCE; 0 edit controls; 0 elements past the right edge; page width 1440 | **PROVED** |
| 2026-10-08 01:42:25 | 6568fa3 | 390 (same-origin iframe) | Same counts (6 / 6 / 6, 6 deviations, 6 plan-alone, MEASURED + INSUFFICIENT EVIDENCE, 0 edit controls). Columns STACKED: market, planned, actual at x 47, 292 px wide, y 2097 / 2314 / 2534. 0 elements past the right edge; page scroll width 386 in a 390 viewport | **PROVED** |

**Journal "Reference an FVG" → save → reload.** The proof scene cannot prove a save (it is read only, pinned by `journalProofScene.sentinel.test.tsx`), and WM never writes on the Founder's account. Evidence is therefore unit / integration:

| Claim | Evidence | Status |
|---|---|---|
| A reference read through the one as-of accessor survives the Journal's own save bytes and reader unchanged | `src/lib/journal/journalFvgReferenceSave.test.ts`: the 24 real references of the fixture (from `fvgReferenceAtDecision`) are written under `wm_journal_entries` as the page writes them and reloaded through `readJournalStorage` → `hydrateJournalEntries`: deep-equal, same sentence, same Review answers, `readAsOfMs ≤ decisionAtMs`; a second save → reload is byte-stable | **PROVED** (unit) |
| A damaged or tag-only stored reference is dropped whole; the entry survives | same file (top ≤ bottom, and the string "FVG = YES") | **PROVED** (unit) |
| The page's save path carries the reference | same file, source pins: the field writes `form.fvgRef`; `saveEntry` spreads the form; the persistence effect writes the entries; the loader reads `readJournalFvgReference` | **PROVED** (source) |
| The reference, the broker capture and the frozen plan reload as one unit | `managementPlanPersistence.test.ts`; `learningLoop.integration.test.ts` hop 5 | **PROVED** (unit / integration) |
| Save → reload → same snapshot on serving | none — needs a real Founder entry: he saves one Journal entry with "Reference an FVG", reloads, and the same sentence shows | **PARTIAL — needs a real Founder entry**. **PROVED ON FIXTURE · real-account read still owed** (the in-memory round trip row below, read on serving `7c3405b`). **FOUNDER ACTION STILL NEEDED:** save one Journal entry with "Reference an FVG", reload the page, and read the same sentence back |
| Save → reload → same snapshot on serving, WITHOUT the Founder's book (appended 2026-10-08) | `journalRoundTrip.ts`: the Journal's own writer (`writeJournalStorage`, the member key) → reader → hydrator → reference reader, then a second save → reload, all in a throwaway in-memory Storage; the proof scene shows 9 before / after rows and the verdict. `journalRoundTrip.test.ts` (member key in memory, the real localStorage never called; guest = NOT SAVED); `journalProofScene.sentinel.test.tsx` (9 rows same, "SAME SNAPSHOT AFTER RELOAD") | **PROVED** (unit / render). **PROVED on serving — appended 2026-10-08 13:47 CDT:** `7c3405b`, read 18:46:48Z, own tab, read only. **390 and 1440:** verdict "SAME SNAPSHOT AFTER RELOAD"; 9 rows, 9 same; "Stored 1054 bytes; read back as RESOLVED_CANONICAL"; overflow 0. A real Founder entry stays the only proof on his own book |

**Other management rows, as they stand:**

| Row | Evidence | Status |
|---|---|---|
| Plan card on both tickets; Morning Prep rules; loop doors | serving walk 6e65180 (1440 + 390): section, card and doors land where they say, no 404 | **PROVED** on serving (empty-state: the Founder has no rules or plans saved) |
| Plan freeze at the ticket send / paper fill; amendments; erasure | `managementPlan.test.ts`, `managementPlanSlice2.test.ts`, `managementPlanPersistence.test.ts` | **PROVED** (unit). **PROVED ON FIXTURE · real-account read still owed** (appended 2026-10-09 07:10 CDT): serving `559884e`, `/journal?scene=journal-fixture`, 390 + 1440, own tab — the plan store's own functions on a throwaway in-memory store under the member key, 6 steps all holding: "Freeze at the sample send → FROZEN on the Decision_ID"; "A second freeze … → REFUSED — the first freeze stands"; "An amendment dated BEFORE the freeze → REFUSED"; "A dated amendment with new evidence → APPENDED — stop → 99.5"; "Reload → The frozen base is unchanged (stop 98); 1 amendment"; "Erase the plan → Plan and its amendment removed; the "why did the plan change?" answer cleared; the lesson and marks kept". **FOUNDER ACTION STILL NEEDED for the real account:** send ONE order from the WM ticket (or take one paper fill) with a stop and a target on it, then open Journal → that trade's Review: the plan card must show "Frozen at the ticket's send" with that stop and target |
| Plan vs actual from the broker readback (tastytrade shapes; Webull read-only adapter); the two readback unknowns printed as UNKNOWN | `captureFillShapes.test.ts`, `webullReviewShapes.test.ts` | **PROVED** on fixtures. **PROVED ON FIXTURE · real-account read still owed** (appended 2026-10-09 07:10 CDT): serving `559884e`, journal proof scene, 390 + 1440 — a sample tastytrade story and a sample Webull story in the feed's own shapes through `planReviewInputForBrokerStory` into the real `StoryReviewRow` (read only): 3 Sheriff columns each, 2 UNKNOWN lines each ("UNKNOWN: whether tastytrade's same-day order list keeps cancelled or replaced Stop orders…"; "UNKNOWN: WM reads Webull fills only…"), deviation lines present, 0 edit controls, no broker / journal API request. **FOUNDER ACTION STILL NEEDED:** one WM-sent tastytrade trade that fills and closes (ideally with the protective stop moved once at tastytrade), then Journal → Broker Truth → that story's Review — this also settles the two tastytrade readback UNKNOWNs |
| n ≥ 20 guard on Ledger / Journal / profile rates; Sheriff copy and time / money owners | `statGuard.sentinel.test.ts`, `managementSheriff.sentinel.test.ts`, `patienceCopy.sentinel.test.ts` | **PROVED** (sentinels). On serving the proof scene shows both states (MEASURED at 20, INSUFFICIENT at 4) |
| Journal auto-capture from broker fills | `journalCaptureFromFill.test.ts`, `captureFillShapes.test.ts` | **PARTIAL — needs a real fill** (unchanged). **PROVED ON FIXTURE · real-account read still owed** (appended 2026-10-09 07:10 CDT): serving `559884e`, journal proof scene, 390 + 1440 — a sample FILLED order + its transaction through `journalCaptureFromFill` into the real `CapturedFacts` view; provenance words on the glass: BROKER-REPORTED, TICKET-INTENT, DERIVED, UNREPORTED. **FOUNDER ACTION STILL NEEDED:** after one WM-sent order fills, press "Add to Journal" on the offer the ticket shows (his press — WM never saves a draft for him) and confirm the captured facts match tastytrade |

### 10b. Serving receipts — profile proof scene, context splits, "Did management help?" (management lane, appended 2026-10-08 02:58 CDT)

Serving `c02c2d4` (`/api/build-identity` builtAt 07:54:05Z). Read 2026-10-08 07:58:22Z (02:58 CDT) in
the lane's own Chrome tab, signed in, read only, through same-origin iframes at 1440 and 390. The
tab was closed afterwards. Nothing was saved, sent or clicked.

| Read | Width | What serving showed | Status |
|---|---|---|---|
| `/profile?scene=profile-fixture` | 1440 | Banner "PROOF SCENE — sample data, not your profile"; 3 sample books (0 / 7 / 24 closed trades) through the profile's own tile view (3 tile rows); **2 INSUFFICIENT_EVIDENCE tiles** (book B, 7 trades: Win Rate, Avg R:R); 2 UNDEFINED "No basis" tiles (book A, 0 trades); book C all MEASURED; no horizontal overflow | **PROVED** — the n ≥ 20 refusal on /profile tiles, on serving, with sample data |
| `/profile?scene=profile-fixture` | 390 | Same counts (3 books, 2 INSUFFICIENT, 2 UNDEFINED); page scroll overflow 0 | **PROVED** |
| `/journal?scene=journal-fixture` | 1440 | Banner "PROOF SCENE — sample data, not your journal"; **18 FVG context-split rows** (MARKET and TRADER columns apart); the "Did management help?" block (1); adherence by setup (1); overflow 0 | **PROVED** (§23 splits, §24 management — sample data) |
| `/journal?scene=journal-fixture` | 390 | Same counts (18 split rows, management 1, adherence 1); overflow 0 | **PROVED** |
| Visible reason under refused tiles (phone has no hover) | — | Not on `c02c2d4`: added after it (`ProfilePerfTiles` → `profile-tile-reason`, pinned in `traderPerformanceStats.test.ts` and `profileProofScene.sentinel.test.tsx`: 4 visible reasons, e.g. "7 of 20 closed trades so far") | **PROVED** (unit / render). ~~PARTIAL on serving until the next ship is read~~ **PROVED on serving — appended 2026-10-08 03:02 CDT:** `a4f411c` (builtAt 07:59:32Z), read 08:02:12Z, own tab, read only, same-origin iframe. **390:** 4 visible reasons under the refused tiles — "no closed trades — no denominator", "needs a win and a loss", "7 of 20 closed trades so far" ×2 — each with a non-zero box, the rightmost edge at 347 px in a 390 viewport, horizontal overflow 0, 2 INSUFFICIENT_EVIDENCE tiles. **1440:** the same 4 reasons, overflow 0 |
| Splits + management on the Founder's real Personal Edge block | `personalEdgeSplitsMount.test.tsx` (empty states: the plan-adherence line + "FVG context splits: no Journal entry references a gap yet…"; no table, no 0%) | **PROVED** (render). On serving his book shows the empty lines: he has no references or plans yet |
| §26 the order's eleven management behaviours, each a factual class (5 added: took profit before planned condition, changed orders repeatedly without plan basis, reduced according to plan, moved to breakeven according to rule, walked away after protection according to plan; "Moved target" relabelled "without plan basis") | `managementBehaviours.test.ts` (each sample trade through the real classifier names its class; no emotion words, no "impulsive"); `journalProofScene.sentinel.test.tsx` (11 behaviour rows, 11 found) | **PROVED** (unit / render). **PROVED on serving — appended 2026-10-08 07:03 CDT:** `c104669` (builtAt 11:44:07Z), read 12:02:50Z, own tab, read only, same-origin iframe. **390:** 11 behaviour rows, 11 found, labels in order ("Exited before planned condition" … "Walked away after protection, according to plan"), e.g. "You closed 1.9 (+0.95R) in your favour at 101.9, before the target 104 or the invalidation 98 recorded in your plan had printed."; 0 rows past the right edge; overflow 0; no "impulsive". **1440:** 11 / 11 found, 0 past the edge, overflow 0. **PARTIAL** only on the Founder's own trades: needs a real WM-sent trade with a frozen plan |
| §41 two Review questions, factual (far-edge targets vs other gap targets; an attached sense beyond price vs price only), counts always, comparison at ≥ 20, no belief labels | `planFvgFillTargets.test.ts` (9); `journalProofScene.sentinel.test.tsx` (book: INSUFFICIENT with "0 of 24 …"; 48-decision set: MEASURED); `personalEdgeSplitsMount.test.tsx` (on the real Personal Edge block) | **PROVED** (unit / render). **PROVED on serving — appended 2026-10-08 13:47 CDT:** `7c3405b`, 390 + 1440: sample book `fvg-fill-targets` INSUFFICIENT EVIDENCE; 48-decision set MEASURED |
| §64 the Founder's management Sheriff as one integration test (market / planned / actual apart; early exit and held-through-invalidation as factual deviations; documented new evidence preserved; no shaming, no fabricated psychology) + the proof-scene walkthrough (3 decisions × 6 steps) | `managementSheriff.integration.test.ts` (8); `journalProofScene.sentinel.test.tsx` (3 walks, 18 steps, the new-evidence line, 3 × "Not recorded") | **PROVED** (integration / render). **PROVED on serving — appended 2026-10-08 13:47 CDT:** `7c3405b`, read 18:46:48Z, own tab, read only, same-origin iframe. **390 and 1440:** 3 walkthroughs, 18 steps; primaries EXITED_DURING_NORMAL_RETRACEMENT / HELD_THROUGH_INVALIDATION / PLAN_CHANGED_WITH_DOCUMENTED_NEW_EVIDENCE; the new-evidence line present; "Not recorded. WM does not fill this in." ×3; 0 elements past the right edge; overflow 0 |
| Sheriff P0-1 · Alpaca paper send disabled with the reason at the control when the rail is not connected | `railSendGate.test.ts`; serving `7c3405b` read 18:47:03Z (own tab, read only; TRADE → "Alpaca paper account" → Trade tab; NOTHING sent): "BUY 1 SPY — MARKET" `type="button"`, `disabled=true`, `aria-describedby="wm-alpaca-send-refusal"`; refusal at the control "Paper account not connected — nothing can be sent or closed here."; no ".env" / key names in the drawer; the live ticket stayed open behind the drawer | **PROVED on serving** |
| Sheriff P1-2 / P1-4 / P2-6 · ticket truth: LIVE only with a fresh quote; no prefill from the chart close; no pre-staged side; book line; header on glass | `ticketTruth.test.ts` (12); serving `7c3405b` NQ1! read 18:46:46Z, 390 and 834 (own tab, read only): panel scroll overflow 0; KILL x 131–170 (390) / 37–76 (834) inside the panel; × 32×32 at x 329–361 (390) / 375–407 (834), inside panel and viewport; header "TRADE FUTURE /NQZ6 DEC 2026 LIVE DISARMED KILL ×" wraps; quote state "● connecting" `data-live="no"` (no LIVE word without a quote); "Pick BUY or SELL — nothing is staged until you do."; BUY not pressed; limit empty; book line "Position and working orders: not read from tastytrade yet — nothing is assumed flat." | **PROVED on serving** (geometry + truth words). The LIVE-with-fresh-quote path and the STALE prefill note are PROVED in unit only (the iframe never reached LIVE) |
| §23 book rows on the ticket: POSITION STATE · WORKING ORDERS (cancel) · MODIFY · FLATTEN — broker readback only, fail-closed; no UI-only fill | `ticketBook.test.ts`, `TicketBookRows.render.test.tsx`, `noUiOnlyFill.sentinel.test.ts`; serving `6350c69` NQ1! read 2026-10-09 04:53:30Z (23:53 CDT), own tab, sandboxed same-origin iframe, 390 / 834 / 1440, TRADE opened only — NO cancel, send or flatten pressed: POSITION STATE "FLAT · 0 working · read 11:53 PM CDT from …####, …####" (two account tails); "WORKING ORDERS · none on this contract"; MODIFY "NOTHING TO MODIFY" with the cancel-then-new sentence; FLATTEN "NOTHING TO FLATTEN · No position on /NQZ6 to flatten." (no button); KILL + LIVE DISARMED present; panel overflow 0 and the book inside the panel at all three widths | **PROVED on serving** for the FLAT / no-working state at 390, 834, 1440. **NOT PROVABLE without a working order or a position on the Founder's account:** a working-order row with its Cancel control, the broker's ack words after a cancel, MODIFY's refusal at the control, FLATTEN loadable / refused, HOLDING with protection, RECONCILING — these are PROVED in unit / render tests only |
| **DESIGN CALL (coordinator, 2026-10-08 / 09) · compact phone ticket, PEEK / ACT.** At ≤ 430 px the ONE trade ticket (same component, state and gates) orders its sections action-first and folds the book / MODIFY / FLATTEN / entry type / economics / protection + dry run / plan card / protect behind one "Details" disclosure whose summary states the book. **PEEK** (header with KILL, quote, side + quantity, Details summary; ~290 px, ≤ ~50 % of the chart) shows while no side is picked or when the trader folds the ticket. **ACT** grows once a side is picked so price → stop / target → risk → Preview show with no inner scroll. **ACT may exceed 55 % of the chart while an order is being built; holding ≤ 55 % in ACT is a FOUNDER DECISION, because it needs the live-order block shortened** (order code this lane does not edit). The fold is CSS only — nothing unmounts — and is refused while an order is in flight. A refusal stays beside its control in both states. Tablet / desktop unchanged | `ticketLayout.test.ts`, `TicketSections.render.test.tsx`. Serving `0971594` 390 × 844 read 2026-10-09 05:04Z (the FIRST, single-height build): layout compact, "Details · FLAT · 0 working", KILL + × visible, BUY/SELL + Quantity visible without inner scroll, overflow 0 — but **chart coverage 79.3 %** (panel y 270–740 over chart y 178–710) and no Preview before a side is picked → the miss that led to PEEK / ACT. 834: full layout, 44.2 % coverage; 1440: full layout, 28.7 % — unchanged | **PROVED** (unit / render) for PEEK / ACT order, the single fold, nothing unmounted, fold refused in flight. **PARTIAL on serving:** PEEK coverage and the ACT path without inner scroll must be measured at 390 on the ship that carries PEEK / ACT (ACT needs a side picked — a press that stages nothing and sends nothing) |
| **DESIGN CALL, second (coordinator, 2026-10-09 00:36 CDT) · ACT splits into BUILD and REVIEW; proof scene `ticket-fixture`.** Serving `9f4d784` at 390 × 844 (own tab, sandboxed iframe, TRADE opened only, scene `ticket-fixture&side=buy`): PEEK measured **51.4 %** coverage with no inner scroll; ACT measured **82.8 %** coverage and **420 px of inner scroll** with Preview at y 985 under a panel ending at y 740 — `globals.css` capped the sheet at 58svh and the path to Preview is ~770 px on a mouse pointer (taller on touch, where every control takes the 44 px floor). So: **PEEK** = quote, a waiting proposal, side buttons, the order line. **BUILD** = closing checkbox, quantity, price, stop / target, risk line, then "Review & preview ▸" (a refusal that blocks it is said beside the button). **REVIEW** = the live-order block alone with "◂ Edit"; forced while an order is in flight. Same single ticket, CSS-only hiding, every section mounted in every state, live-order block unedited; per-stage caps in `globals.css` (PEEK 40svh, ACT 72svh). The Founder decision stands: ≤ 55 % coverage while building or reviewing needs the order block shortened | `ticketLayout.test.ts`, `TicketSections.render.test.tsx` (17 sections in the DOM in every state, each once), `ticketFixture.test.ts`, `ticketFixtureNeverSends.sentinel.test.ts`. Scene reads on `9f4d784`: banner visible; BUY pre-picked; live fieldset + Preview disabled; "PROOF SCENE · nothing can be sent" at the control; KILL visible and disabled; `state=working` → HOLDING / PROTECTED from "…SMPL", working row "WORKING at tastytrade · #9000001 · Sell to Close 1 /NQZ6 · trigger …" with Cancel disabled and the scene's reason beside it, MODIFY and FLATTEN refused with the same reason, protect line "tastytrade reads LONG 1 /NQZ6. These orders close 1 of it (sells) — check the quantity against what you hold."; resource log: no `order-submit`, no `order-dry-run`, no tastytrade orders / positions request | **PROVED on serving:** PEEK, the scene's refusals, the working-order row, HOLDING with protection, the protect line, no order route. **Appended 2026-10-09 00:41 CDT — serving `7f2ca59`, own tab, sandboxed iframes, TRADE opened only:** `state=holding` 390 → HOLDING / UNPROTECTED "LONG 1 /NQZ6 @ … · UNPROTECTED · P&L +$0.00 · 0 working · read … from …SMPL", FLATTEN REFUSED + disabled with the scene's reason, protect line from the read position, no order-route request. `state=inflight` 390 → fold control **disabled, "IN FLIGHT · stays open"** (aria "An order is in flight — the ticket stays open until tastytrade answers"), stage ACT, Cancel disabled, Preview disabled. **834 and 1440** (`state=working`) → layout full / stage FULL, banner, BUY pre-picked, HOLDING / PROTECTED, 1 working row with Cancel disabled, Preview disabled, no fold control, overflow 0, no order-route request. **Signed-out** (a `credentialless` iframe — no session cookie): the scene URL lands on **/login**; no chart, no ticket, no banner — the scene does not activate. **PROVED on serving** for all of these. **Appended 2026-10-09 06:53 CDT — serving `b290eef`, own tab, sandboxed iframe 390 × 844, scene `ticket-fixture&side=buy` (only TRADE and the in-ticket Review / Edit / fold toggles pressed), read 11:51:34–11:52:46Z:** **PEEK** (folded) panel y 444–740, **47.9 % of the chart, no inner scroll**, KILL + banner + "Details · FLAT · 0 working" visible, toggle "TICKET ▴". **BUILD** 592 px, **no inner scroll**, "Review & preview ▸" visible and enabled (the limit was prefilled from a fresh tastytrade quote, "● LIVE · tastytrade"). **REVIEW** Preview visible (disabled by the scene), "◂ Edit" visible — but the sheet hit its 72svh cap (608 px) with **26 px of inner scroll → MISS, fixed in src** (REVIEW now hides Details and the footer, CSS only; ACT cap 84svh). **In flight:** Edit disabled "IN FLIGHT · the order stays in view", fold disabled "IN FLIGHT · stays open", pressing Edit did nothing. **834 / 1440:** stage FULL, no step buttons, no fold, 44.2 % / 28.7 % coverage — unchanged. **PROVED on serving:** PEEK ≤ 50 %, BUILD without inner scroll, Preview visible in REVIEW, both in-flight refusals, tablet / desktop unchanged. **PARTIAL on serving:** REVIEW with zero inner scroll (on the ship that carries the fix); the review-gate reason beside the button (needs a contract with no live quote — NQ and BTC both had one at the read; PROVED in unit / render); every height on a real TOUCH phone (the iframe has a mouse pointer; the 44 px touch floor is not exercised) |
| Compact ticket, final serving read · REVIEW without inner scroll; the review gate's reason; the Webull option ticket still renders | serving `559884e` (07:06 CDT), own tab, sandboxed iframes, read 12:07:13–12:08:21Z. **390 × 844, `scene=ticket-fixture&side=buy`:** BUILD 592 px, inner scroll 0; pressed "Review & preview ▸" → **REVIEW 549 px, inner scroll 0, Preview visible** (disabled by the scene), "◂ Edit" visible, Details and footer hidden. **`state=noquote`:** quote "● stream open · no quote for /NQZ6 yet", limit empty, **"Review & preview ▸" disabled with "Set a limit price first." visible beside it**; pressing it did nothing (still BUILD). **Webull option ticket (SPY 1440 → Options → Expression · Contract Lens → "Review call SPY…660"; nothing armed, previewed or sent):** `webull-option-preflight` renders — "Broker eligibility" with "Webull · option preview" (selected) and "tastytrade · dry run", Intent / Contracts / Limit premium / Account, the preflight button **disabled** reading "Record the expression first — preflight needs its decision", the line "A preview is not an order…"; no live-order block (no Arm, no Send on the glass before a preview), no alert; 619 px wide inside the 1440 viewport. The 7 test files that read `WebullLiveOrder` / `WebullOptionPreflight` / `OptionExpressionIntent`: 76 / 76 | **PROVED on serving.** Not exercised (by design of a read-only walk): recording the expression, the Webull preview itself, the armed block. Real-phone TOUCH heights remain unmeasured (mouse-pointer iframe) |
| §23 "confirmed entries" / §41 "did they wait?" · the CONFIRMATION FACT (design call 2026-10-09: no trader input; computed from the same closed bars as of the decision) | `confirmationFact.test.ts` (13): ONE definition — the Academy's lesson `fvg-9` ("REJECTION: after the touch, a bar closes back outside on the origin side…") for a trade with the gap, lesson `fvg-14` ("A close beyond the far boundary…") against it, read from the lesson records; no other journal source restates it. The context stores the ENGINE's answer as of the decision (`responseAsOf`); with / against is derived from the entry's own side at study time. States CONFIRMED_BEFORE / NOT_YET_CONFIRMED / NO_TOUCH_YET / SILENT in both trade directions; FUTURE-LEAK (later bars never settle a stored OPEN); an older context without the field reads SILENT; an unknown word drops the context. Personal Edge gains the WAITED dimension — "Waited for a confirming close", "Entered before a confirming close", "Entered before any touch", "Confirmation not recorded" — every group listed, each decision once, MEASURED at ≥ 20 (19 → INSUFFICIENT, 20 → mean R), with the rule line and "Study: Lesson 9 · Rejection vs acceptance →" | **PROVED** (unit). **PARTIAL on serving** until the journal proof scene's WAITED rows and rule line are read. On a real book: entries saved with "Reference an FVG" from 2026-10-09 carry the answer; older ones read "Confirmation not recorded" (or "Entered before any touch" when the reference itself records that) |
| §24 COUNTERFACTUAL · "Did the trader enter too early?" and "Did they avoid valid situations?" answered as facts | `planFvgCounterfactualQuestions.test.ts` (9): entries BEFORE the touch beside entries DURING a touch, each with its recorded R — a comparison only at ≥ 20 each side, otherwise the counts; the settled touches the trader did NOT trade on his own days (rejected / accepted / traded through) — a share only at ≥ 20; OPEN interactions, the traded touches and other days excluded; "not read" when no decision or no ledger; no sentence calls an entry early or a touch a miss ("a touch you left is not a trade you missed") | **PROVED** (unit). **Serving `16f363a` read 2026-10-09 13:05Z (08:05 CDT), own tab, 390:** timing — "You entered before the gap was touched on 0 of 24 gap decisions, and during a touch on 21. INSUFFICIENT EVIDENCE to compare their results…"; untraded — MEASURED "On the days you traded gaps, 26 touches you did not trade have settled: the territory rejected on 4 (15%), was accepted on 2 and traded through on 8…". **MISS found and fixed in src:** 4 + 2 + 8 = 14 of 26 — the 12 touches that settled with NO answer were not said; the sentence now names them so the counts add up (test added). **PARTIAL on serving** until the corrected sentence is read |
| §29 PSYCHOLOGY WITHOUT FAKE MIND READING · the trader's own labels (fear, impatience, FOMO, revenge, over-management, hesitation, overconfidence, a deliberate change of plan) — only he chooses, never inferred, counted beside the departure, a share only at ≥ 20, cleared by erasure | `selfReport.test.tsx` (17): press adds / removes; unknown values dropped; the classifier, the Review composer, the Sheriff and SpaidBot's plan line have no access to labels; 19 → count + INSUFFICIENT, 20 → share; a departure nobody labelled still shows "you labelled none"; labels on trades without a departure are not counted; erasure clears labels and the why, keeps marks and lesson; the chooser is closed by default with NOT ONE label word in its markup, opens to eight unpressed chips with the rule, read-only disables them; ONE-OWNER sentinel over journal / review / profile / SpaidBot sources. The management Sheriff sweep and the §29 copy audit stay green (the Review row's markup names no emotion until the trader asks) | **PROVED** (unit / render / sentinel). **PROVED ON FIXTURE on serving `16f363a`** (13:05Z, 390): the 7 Review rows each mount a chooser with **0 chips and no label word anywhere in their text**; the sample block shows rows such as "“Exited before planned condition” on 2 decided trades: you labelled 2 yourself — fear 1, overconfidence 1; 0 carry no label. INSUFFICIENT EVIDENCE — 2 of 20 for a share."; the open sample chooser shows 8 chips (1 pressed, all disabled in the scene), the rule line "Only you choose these. WM never picks one…" and "You labelled this: impatience."; overflow 0. Nothing was pressed. **FOUNDER ACTION for the real account:** in a Review, press "Label it yourself" and choose — WM never does it for him |
| §40 JOURNAL · the context a gap decision was taken in is kept with the entry (structure, profile, wall, effort→response, regime), read as of the decision | `fvgDecisionContext.test.ts` (24 sample decisions; FUTURE-LEAK test: later bars — even tripled prices — change nothing; refuses on too few bars or a gap not yet closed; SILENT cell where a market reports no traded volume; malformed stored context dropped whole; only used with the reference it was read with; the journal's loader keeps it beside its reference); `journalRoundTrip.test.ts` (the context survives save → reload) | **PROVED** (unit / render). Before this the reference kept object / state / interaction / penetration / evidence only, so §23's structure / profile / wall / effort / regime splits read "NOT RECORDED" on every real entry. **PROVED ON FIXTURE on serving `0dd1130`** (12:46Z, 390 + 1440): round trip 10 rows, 10 same, "SAME SNAPSHOT AFTER RELOAD"; the row reads "Context at the decision (from 26 closed bars): structure none · profile vah · wall silence · displacement bar SILENT · regime UNTAGGED." before and after. **FOUNDER ACTION for the real account:** attach "Reference an FVG" on one saved entry — the context line appears under the reference |
| The options Expression walk makes GET reads only; every broker POST / DELETE is called only from a button | `optionsWalkNoPostWithoutPress.sentinel.test.ts` (17): `GET /api/broker/tastytrade/orders` (10 s poll), `/chain`, `/positions` (FuturesOptionsPanel) and `/status` (WebullOptionPreflight); POST `order-dry-run` ← `fop-dry-run`; POST `webull/order-preview` or `tastytrade/order-dry-run` ← `webull-preflight`; POST `webull/order-submit` ← `wb-send-live`; DELETE `webull/orders` ← `wb-cancel`; no effect body names a write route or a writer | **PROVED** (source sentinel) |
| The Academy's sample door lands ON its decision (`/journal?scene=journal-fixture#SAMPLE-24`) | `journalProofScene.sentinel.test.tsx`: every example href names an id the Review renders; `#SAMPLE-24` (past the first six) is appended, scrolled into view and marked "OPENED FROM A LINK · this sample decision" | **PROVED** (unit / source). **Serving `0dd1130` read 2026-10-09 12:46Z (07:46 CDT), own tab, 390 + 1440 — TWO MISSES, both fixed in src:** (1) arriving with `#SAMPLE-24` in the URL: the decision IS rendered (7 decisions), marked "OPENED FROM A LINK · this sample decision" and outlined — but `scrollIntoView({block:"center"})` centred a 3,085 px-tall decision, leaving its top 1,073 px above the screen → now `block: "start"`. (2) pressing the in-page sample door: the app router set the fragment and fired no `hashchange`, so the decision was not rendered → the scene now lands from the press itself (`onClickCapture`) and re-reads the fragment 400 ms after mount. **PROVED on serving `16f363a`** (13:05Z, 390 + 1440): BOTH ways land — arriving with `#SAMPLE-24` in the URL, and pressing the in-page sample door from the top (6 → 7 decisions) — the decision's top is in view (y 96 at 390, y 215 at 1440) with its "OPENED FROM A LINK · this sample decision" mark on screen; the scene stayed on /journal |
| **DESIGN CALL (coordinator, 2026-10-09) · profile Personal Edge: a departure's lesson door only at a sufficient sample.** One row per kind of departure among DECIDED trades. At ≥ 20 decided the row carries "Study: Lesson N · title →" through the journal's own mapping (`planLoop.lessonForFinding` — the education lane owns the lesson ids; nothing is forked). While INSUFFICIENT EVIDENCE the row has no door and says why ("… so no lesson is suggested from a sample this small"). No frozen plan → the journal's own empty line | `components/profile/departureLessonRows.test.tsx` (threshold 19 → no door / 20 → door; the door equals `lessonForFinding`; undecidable and by-plan behaviours never counted; no lesson id or /education string outside the one mapping; the profile mounts it; the proof scene shows the 7-trade and 24-trade books; the Ledger analytics share the one plan-result reader) | **PROVED** (unit / render). **PROVED ON FIXTURE on serving — appended 2026-10-09 07:08 CDT:** `559884e`, `/profile?scene=profile-fixture`, 390 + 1440 (own tab, read only): 0-trade book — no block; **7-trade book — 4 rows, all INSUFFICIENT EVIDENCE, 0 doors**, each "… on N of 7 decided trades." + "INSUFFICIENT EVIDENCE — 7 of 20 decided trades so far, so no lesson is suggested from a sample this small."; **24-trade book — 5 rows, all MEASURED, 5 doors** ("Study: Lesson 18 · Patience →", "Study: Lesson 19 · Management →" to /education), e.g. "Exited before planned condition on 2 of 24 decided trades (8%)."; overflow 0. **Real-account read still owed:** the Founder's profile needs ≥ 20 decided trades with frozen plans before a door can appear. On the Founder's own profile it shows the empty line: he has no frozen plans yet |
| Sheriff ticket truth, second slice: FX ticket without the paper door; Alpaca drawer scoped banner + Account empty-state reason; protect line from the READ position; SpaidBot boundary on the ticket | `ticketTruth.test.ts`; serving `ea8ad94` read 2026-10-09 05:13:28–05:13:40Z (00:13 CDT), own tab, sandboxed iframe, nothing sent: **EURUSD 390** — "NO CONNECTED SPOT-FX EXECUTION RAIL…", footer empty (no "Alpaca paper account" door), KILL present. **SPY 1440 → Alpaca paper → Account tab** — "Paper account not connected — nothing can be sent or closed here."; banner "PAPER ONLY · Alpaca — this drawer cannot send a live order. The tastytrade line below is its connection status, read only."; the old "Live brokerage access is disabled" banner absent; the live ticket stayed open behind the drawer | **PROVED on serving** for the FX door, the Account empty state and the banner. **Protect line and SpaidBot boundary: PROVED in unit only** — the protect block renders only after a side is picked (not pressed in a read-only walk) and no proposal was waiting |


## 11. §34 INVENTORY AUDIT — every canonical invention × the certificate fields (2026-10-08, night shift)

Written 01:50–01:55 CDT (`date`) against `1ec6083` (production, `/api/build-identity`). This is the lanes' work list.

**Sources, all read from code:**
- **Registry:** `src/lib/canon/inventionCensus.ts` (98 rows).
- **ⓘ education:** `src/lib/chart/inventionEducation.ts` (49 records: `INVENTION_EDUCATION` + `INSTRUMENT_EDUCATION` + `CONCEPT_EDUCATION`).
- **Opacity:** `LAYER_ATTENTION` in `selectAttentionGovernor.ts` (45 layers), plus the `att.alpha("…")` calls in MainChart.
- **Proofs and specs:** the certificates in this file (C-01 … C-15, §5 FVG), the erasure doc `GARDEN19-ERASURE-TESTS.md`, and the plates named in the census.

**How each column is read:**
- **Class:** CONTINUOUS / EVENT / TERRITORY, from §1a–1c above.
- **Evidence requirement and ⓘ:** present when an ⓘ record exists. The record carries `needs` + `evidence`, `appears`, `grammar`, the FULL / PARTIAL / DEGRADED ladder and `firstTouch`.
- **Physical / state grammar, colour semantics, opacity spec:** fully specified only where a §28 certificate exists. The ⓘ `appears` / `grammar` prose is a description, not a spec.
- **Opacity (governed):** the layer has an attention tier, so it recedes with selection, stale feed and memory.
- **Responsive behaviour:** **no per-invention field exists anywhere in the registry.** Narrow-glass behaviour is enforced generically (`selectSemanticPermission` depth gates, the narrow-glass word budget). It is proven per invention only where the erasure doc has a phone row.

**Systemic gaps (true for every row):**
1. No registry field for **manifestation class**: it lives only in prose (§1).
2. No registry field for **colour semantics**: colours are per paint block in MainChart.
3. No registry field for **responsive behaviour**.

Each wants a column on `CensusEntry` (or a sibling registry) so a test can enforce it. The census itself is **stale** against shipped work:
- Seven shipped Tool Finder instruments have ⓘ records but **no census row** (marked `TF.*` / `FVG_3C` below): SESSION_BANDS, EFFORT_RESPONSE, DELTA_KEEL, RVOL_TONE, WISDOM_LINE, BREATH_RIBBON and FVG_IMBALANCE.
- Three census rows say PARTIAL for things now built: AB.MATRIX, G19.BAR_DELTA, G19.RVOL.

### 11a. Candle-field inventions (54 built or partial + 4 stale census rows superseded by shipped `TF.*` rows; 10 not built)

Legend: ✓ present · — missing. "Missing" names what a lane must add.

| Id | Invention | Status | Class | ⓘ record | Opacity tier | §28 cert | Plate | Erasure / phone proof | Missing |
|---|---|---|---|---|---|---|---|---|---|
| `AB.MATRIX` | Response Matrix | PARTIAL | CONTINUOUS | — | — | C-01 | — | E7 + phone | census row stale — superseded by `TF.EFFORT_RESPONSE` |
| `F05A` | Clarity Candle (default language) | BUILT | CONTINUOUS | CLARITY_CANDLE | — | — | WM_NewMockup_72_F05A_Clarity_Default_Lan… | — | governor row, §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `F06.VALUE_CANDLE` | Value Candle | BUILT | CONTINUOUS | VALUE_CANDLE | valueCandle · LIVE | — | — | — | §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |
| `F06A.AGGPAS` | Aggressive / Passive | BUILT | CONTINUOUS | FP_aggressive-passive | footprint · LIVE | — | — | — | §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |
| `F06A.BIDASK` | Footprint · Bid × Ask | BUILT | CONTINUOUS | FP_bid-ask | footprint · LIVE | — | WM_NewMockup_74_F06A_OrderFlow_On_Price | — | §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `F06A.FLOW` | Flow Current (order flow on price) | BUILT | CONTINUOUS | FLOW_CURRENT | flowCurrent (depth gate only) | — | WM_NewMockup_74_F06A_OrderFlow_On_Price | phone (FAIL unattributable) | governor row, §28 certificate (grammar/colour/opacity spec) |
| `F06A.IMB` | Imbalance cells | BUILT | CONTINUOUS | FP_imbalance | footprint · LIVE | C-11 | WM_NewMockup_74_F06A_OrderFlow_On_Price | — | erasure / phone proof |
| `F06A.VOL` | Volume per candle | BUILT | CONTINUOUS | FP_volume-profile | footprint · LIVE | — | — | — | §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |
| `F09.MIGRATION` | Value Migration (Living's auction movie) | BUILT | CONTINUOUS | VALUE_MIGRATION | valueMigration · MEMORY | — | — | — | §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |
| `F10.TED` | Temporal Evidence Density · Structural/Event/Adaptive time | PARTIAL | CONTINUOUS | — | — | C-13 | — | — | ⓘ, governor row, plate, erasure / phone proof |
| `F15.BREATHING` | Market Breathing | PARTIAL | CONTINUOUS | — | — | C-04 | — | — | census row stale — superseded by `TF.BREATH_RIBBON` |
| `G19.BAR_DELTA` | Bar delta (signed aggressor volume per bar) | PARTIAL | CONTINUOUS | — | — | C-02 | — | E6 + phone (FAIL salience) | census row stale — superseded by `TF.DELTA_KEEL` |
| `G19.CVD_REL` | CVD ⇄ price relationship (agreement / divergence per bar) | PARTIAL | CONTINUOUS | — | — | C-06 | — | — | ⓘ, governor row, plate, erasure / phone proof |
| `G19.RVOL` | Relative volume · Relative Market Energy (RME) | PARTIAL | CONTINUOUS | — | — | C-03 | — | — | census row stale — superseded by `TF.RVOL_TONE` |
| `H-901` | Regime State Lighting | BUILT | CONTINUOUS | REGIME_LIGHTING | regimeField · SUPPORTING | — | WM_NewMockup_92_F15A_Regime_State_Lighti… | — | §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `TF.BREATH_RIBBON` | F15 Breath Ribbon | PROPOSED, default off (census F15.BREATHING says PARTIAL) | CONTINUOUS | BREATH_RIBBON | breathRibbon · SUPPORTING | C-04 | PROPOSED G19-P01 | — | erasure / phone proof |
| `TF.DELTA_KEEL` | Bar Delta Keel | BUILT (census G19.BAR_DELTA says PARTIAL) | CONTINUOUS | DELTA_KEEL | — | C-02 | — | E6 + phone (FAIL salience) | governor row, plate |
| `TF.EFFORT_RESPONSE` | Effort → Response columns (Response Matrix on the field) | BUILT (census AB.MATRIX says PARTIAL) | CONTINUOUS | EFFORT_RESPONSE | — | C-01 | — | E7 + phone | governor row, plate |
| `TF.RVOL_TONE` | Relative volume tone | BUILT (census G19.RVOL says PARTIAL) | CONTINUOUS | RVOL_TONE | — | C-03 | — | — | governor row, plate, erasure / phone proof |
| `TF.SESSION_BANDS` | Session Bands | BUILT (not in census) | CONTINUOUS | SESSION_BANDS | — | — | — | E8 | governor row, §28 certificate (grammar/colour/opacity spec), plate |
| `G19.AGES` | Object ages — Clock · Structural · Event · Session · Regime Age | NOT_BUILT | CONTINUOUS | — | — | — | — | — | NOT BUILT — then all fields |
| `G19.CONTRIBUTION` | Profile per-bar contribution (which candles built this shelf) | NOT_BUILT | CONTINUOUS | — | — | C-14 | — | — | NOT BUILT — then all fields |
| `G19.DELTA_RATIO` | Delta ratio (|bar delta| ÷ bar volume) | NOT_BUILT | CONTINUOUS | — | — | C-02 | — | — | NOT BUILT — then all fields |
| `G19.REGIME_HISTORY` | Regime history · regime transition marks | NOT_BUILT | CONTINUOUS | — | — | C-07 | — | — | NOT BUILT — then all fields |
| `G19.STRUCTURE_STATE` | Structure state (intact · testing · deteriorating · failed · reclaimed) · body-close break | NOT_BUILT | CONTINUOUS | — | — | C-10 | — | — | NOT BUILT — then all fields |
| `G19.TIME_FAMILY` | Temporal Lens · Adaptive Time · Structural Time · Event Time · Temporal Sync · Horizon | NOT_BUILT | CONTINUOUS | — | — | — | — | — | NOT BUILT — then all fields |
| `F04A` | Causal marks on the event (Force → Response, Unpaid Evidence Debt) | BUILT | EVENT | — | — | — | WM_NewMockup_70_F04A_Causal_Marks · WM_N… | — | ⓘ, governor row, §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `F06.ANATOMY` | Anatomy Cards (absorption / exhaustion metrics) | BUILT | EVENT | ANATOMY_CARDS | anatomyCards · SUPPORTING | — | WM_Transformation_UI_19_Absorption_Anato… | — | §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `F06.DIV` | Delta Divergence | BUILT | EVENT | DELTA_DIVERGENCE | divergence · LIVE | — | — | — | §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |
| `F06.EFFORT` | Effort → Response (Effort Mark) | BUILT | EVENT | EFFORT_MARK | effort · LIVE | C-05 | — | — | plate, erasure / phone proof |
| `F06.STACK` | Stacked Imbalance | BUILT | EVENT | IMBALANCE_STACK | stack · LIVE | — | — | — | §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |
| `F06A.DELTA` | Delta Bubbles | BUILT | EVENT | FP_delta | bubbles · LIVE | — | WM_NewMockup_74_F06A_OrderFlow_On_Price | — | §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `F07A` | Big Trades on the market | BUILT | EVENT | FP_big-trades | bigTrades · LIVE | — | WM_NewMockup_76_F07A_BigTrades_On_Market | E5 + phone | §28 certificate (grammar/colour/opacity spec) |
| `F08A` | Liquidity Lifecycle | BUILT | EVENT | LIQUIDITY_LIFECYCLE | liquidityLifecycle · SUPPORTING | — | WM_NewMockup_78_F08A_Liquidity_Lifecycle | — | §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `H-701.ABS` | Absorption Shelf | BUILT | EVENT | ABSORPTION | absorption · LIVE | — | WM_NewMockup_46_OrderFlow_Footprint_Abso… | E3 + phone | §28 certificate (grammar/colour/opacity spec) |
| `H-701.EXH` | Exhaustion | BUILT | EVENT | EXHAUSTION | exhaustion · LIVE | — | WM_Transformation_UI_06_Absorption_Anato… | — | §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `TF.WISDOM_LINE` | Cross-candle wisdom line | BUILT (not in census) | EVENT | WISDOM_LINE | — | — | — | — | governor row, §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |
| `F06.COMPRESSION` | Order Flow Compression | NOT_BUILT | EVENT | — | — | C-12 | — | — | NOT BUILT — then all fields |
| `G19.CLC` | CLC — Clean Level Close family (Wick Test · Weak Close · Clean Close · +Volume · +CVD Agreement · Break and Hold · Failed Hold · Reclaim · Rejection) | NOT_BUILT | EVENT | — | — | C-08 | — | — | NOT BUILT — then all fields |
| `G19.FAILED_AGG` | Failed aggression | NOT_BUILT | EVENT | — | — | C-09 | — | — | NOT BUILT — then all fields |
| `G19.SURPRISE` | Market Surprise · Absence-as-Evidence (marks on price) | NOT_BUILT | EVENT | — | — | C-15 | — | — | NOT BUILT — then all fields |
| `F03A` | Memory Ghost | BUILT | TERRITORY | MEMORY_GHOST | memoryGhost · MEMORY | — | WM_NewMockup_68_F03A_Memory_Ghost | — | §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `F06.BIDASK_PROFILE` | Bid/Ask Split Profile (#11) | BUILT | TERRITORY | DELTA_VP | — | — | WM_A_P110_LIVING_PROFILE_STACK | — | governor row, §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `F06.DLEVELS` | Delta Levels | BUILT | TERRITORY | DELTA_LEVELS | deltaLevels · LIVE | — | — | — | §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |
| `F08.BRICK` | Brick Walls | BUILT | TERRITORY | BRICK_WALLS | brickWalls · SUPPORTING | — | — | E4 + phone | §28 certificate (grammar/colour/opacity spec), plate |
| `F08B` | Liquidity Weather (lens) | BUILT | TERRITORY | LIQUIDITY_WEATHER | weather · LIVE | — | WM_NewMockup_79_F08B_Weather_Lens | E9 + 05670f2 | §28 certificate (grammar/colour/opacity spec) |
| `F10` | MTF Ancestry (higher-timeframe objects on this camera) | BUILT | TERRITORY | MTF_ANCESTRY | mtfAncestry · SUPPORTING | — | — | — | §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |
| `F11.STRUCTURE` | Market Structure | BUILT | TERRITORY | MARKET_STRUCTURE | marketStructure · LIVE | — | — | E2 + phone + 05670f2 | §28 certificate (grammar/colour/opacity spec), plate |
| `F11A` | Market Object on chart | BUILT | TERRITORY | — | marketZones · LIVE | — | WM_NewMockup_84_F11A_Object_On_Chart · W… | — | ⓘ, §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `F11B` | Object Passport | BUILT | TERRITORY | — | marketZones · LIVE | — | WM_NewMockup_85_F11B_Passport_Drawer | — | ⓘ, §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `F15.PRESSURE` | Derivatives Pressure world | BUILT | TERRITORY | DERIVATIVES_PRESSURE | derivativesPressure · SUPPORTING | — | — | — | §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |
| `FVG_3C` | FVG / Imbalance | BUILT (not in census) | TERRITORY | FVG_IMBALANCE | fvg · LIVE | §5 | — | 301d85d (all four) | plate |
| `G19.CROSS` | Cross-market relationship · benchmark alignment (incl. FX RELATED FUTURES EVIDENCE) | PARTIAL | TERRITORY | — | — | — | — | — | ⓘ, governor row, §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |
| `G19.VWAP` | VWAP · session-anchored VWAP | PARTIAL | TERRITORY | — | — | — | — | — | ⓘ, governor row, §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |
| `H-1001` | Risk on Price + Frozen Receipt | BUILT | TERRITORY | RISK_ON_PRICE | riskOnPrice · CHROME | — | WM_NewMockup_96_F17A_Risk_On_Price · WM_… | — | §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `H-401` | Contradiction not averaged | BUILT | TERRITORY | CONTRADICTION | contradiction · SUPPORTING | — | WM_NewMockup_124_F14_Contradiction_Not_A… | — | §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `H-801` | Expected Envelope + Analogue Surprise | BUILT | TERRITORY | EXPECTED_ENVELOPE | expectedEnvelope · SUPPORTING | — | WM_NewMockup_120_F03_Expected_Envelope_S… | — | §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `P110.1` | Living Profile | BUILT | TERRITORY | LIVING_PROFILE | livingProfile · LIVE | — | WM_A_P110_LIVING_PROFILE_STACK · WM_NewM… | E1 + phone | §28 certificate (grammar/colour/opacity spec) |
| `P110.10` | TPO / Auction Distribution | BUILT | TERRITORY | TPO_PROFILE | tpo · LIVE | — | — | — | §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |
| `P110.2` | Structure Profile | BUILT | TERRITORY | STRUCTURE_PROFILE | structureProfile · LIVE | — | WM_A_P110_LIVING_PROFILE_STACK | — | §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `P110.3` | Profile Fusion | BUILT | TERRITORY | PROFILE_FUSION | profileFusion · LIVE | — | WM_A_P110_LIVING_PROFILE_STACK | — | §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `P110.4` | Profile Memory | BUILT | TERRITORY | PROFILE_MEMORY | profileMemory · MEMORY | — | WM_A_P110_LIVING_PROFILE_STACK | E10 + 05670f2 | §28 certificate (grammar/colour/opacity spec) |
| `P110.5` | Profile DNA | BUILT | TERRITORY | PROFILE_DNA | profileDna · LIVE | — | WM_A_P110_LIVING_PROFILE_STACK | — | §28 certificate (grammar/colour/opacity spec), erasure / phone proof |
| `P110.6` | Session Profile | BUILT | TERRITORY | SESSION | volumeProfile (depth gate only) | — | — | — | governor row, §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |
| `P110.7` | Visible Range Profile | BUILT | TERRITORY | VISIBLE_RANGE_PROFILE | visibleRangeProfile · LIVE | — | — | — | §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |
| `P110.8` | Fixed Range Profile | BUILT | TERRITORY | ANCHORED_RANGE | volumeProfile (depth gate only) | — | — | — | governor row, §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |
| `P110.9` | Composite Profile | BUILT | TERRITORY | COMPOSITE_PROFILE | compositeProfile · LIVE | — | — | — | §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |
| `P110.CLASSIC` | Classic VP · all loaded bars | BUILT | TERRITORY | FIXED_RANGE | volumeProfile (depth gate only) | — | — | — | governor row, §28 certificate (grammar/colour/opacity spec), plate, erasure / phone proof |

### 11b. Not candle-field inventions (lenses, protocols, inspectors, rooms, internal) — ⓘ coverage only

The class / grammar / opacity fields do not apply to these. The one canonical field that does is ⓘ education: a trader must be able to ask what each one is.

| Id | Invention | Status | Surface | ⓘ record |
|---|---|---|---|---|
| `F01` | Truth owns the candle · Fidelity five (not a rainbow) | BUILT | CONTEXT | — |
| `F01.CHART_INTEGRITY` | Chart Integrity Inspector / honesty plaque | BUILT | CONTEXT | — |
| `F05B` | Candle Anatomy Inspect (Truth Range · Pressure Split · Battle Balance) | BUILT | CONTEXT | — |
| `F06B` | Raw Tape Inspect | BUILT | CONTEXT | — |
| `F07B` | Cluster → Response Inspect | BUILT | CONTEXT | — |
| `F10.REPLAY` | Replay (no-hindsight walk) | BUILT | CONTEXT | — |
| `H-301` | Evidence Lineage (do not count 7 correlated readings as 7) | BUILT | CONTEXT | — |
| `H-501` | Semantic Zoom (FAR · MID · NEAR) | BUILT | CONTEXT | — |
| `F13.LENS` | Question Lens | BUILT | SWITCH | QUESTION_LENS |
| `F13.SCAFFOLD` | Scaffolding (Foundation → Pro) | BUILT | SWITCH | SCAFFOLDING |
| `S-501` | Attention Governor / Four-Chunk Budget | BUILT | CONTEXT | — |
| `F14.HEAT` | Heat lens — lands on the same camera | BUILT | ROUTE | — |
| `F14.ARCHIVE` | Research Heat Archive (saved / historical heat) | BUILT | ROUTE | — |
| `H-101` | Evidence Debt / WAIT as a finished state | BUILT | CONTEXT | — |
| `F18` | TRADE — one verb (futures · stocks · crypto · options family) | BUILT | CONTEXT | — |
| `F18.EXPR` | Underlying + Expression, same Decision_ID (Dual Truth) | BUILT | CONTEXT | — |
| `F20` | Journal / Review (broker truth + 8-part review) | BUILT | ROUTE | — |
| `F20.EDGE` | Personal Edge | BUILT | ROUTE | — |
| `F21` | Academy (same room) · Learning Genome | BUILT | ROUTE | — |
| `F22` | Spaidbot — WHY over the same object | BUILT | CONTEXT | — |
| `F23` | Opening Bell posture | BUILT | ROUTE | — |
| `ROOM.BACKTEST` | Backtest Lab | BUILT | ROUTE | — |
| `ROOM.SCANNER` | Scanner Deck | BUILT | ROUTE | — |
| `AB.TWIN` | Market Twin · State Graph | NOT_BUILT | NONE | — |
| `AB.PERCEPTION` | Perception Graduation | NOT_BUILT | NONE | — |
| `AB.COMPARATIVE` | Comparative Reality Mode | NOT_BUILT | NONE | — |
| `AB.GRAVITY` | Process Gravity Field | NOT_BUILT | NONE | — |
| `AB.DECAY` | Structural Memory + Decay Physics | NOT_BUILT | NONE | — |
| `G19.STACK` | Profile stack — show/hide · reorder · side · width · opacity · lock · Auto Arrange · Save My Stack · presets | BUILT | CONTEXT | — |
| `G19.PLAYBOOKS` | Strategy playbooks — Trending · Mean-Reversion · Pullback Continuation · Breakout Retest · Failed Auction · NO TRADE | NOT_BUILT | NONE | — |
| `G19.CHALLENGE` | Challenge My Thesis · Show Opposing | NOT_BUILT | NONE | — |
| `G19.SQUEEZE` | Squeeze conditions · balance escape / failed escape | NOT_BUILT | NONE | — |
| `G19.NARRATOR` | Accessible Narrator · non-color state grammar | NOT_BUILT | NONE | — |
| `G19.MARKOV` | Markov regime transition matrix (measured transition probabilities) | NOT_BUILT | NONE | — |
| `F02` | Hive / Nectar | INTERNAL | ROUTE | — |
| `F25` | Vault continuity | INTERNAL | NONE | — |
| `F26` | Chaos Gym | INTERNAL | NONE | — |

**Correction (02:24 CDT).** The erasure / phone column above counted only the first erasure run (E1–E10 + the phone table). `GARDEN19-ERASURE-TESTS.md` now has a second-pass table that reads ~30 more inventions (PASS, PARTIAL or SILENT each). So gap 5 below overstates the missing proofs; §12 cites the second pass per invention.

**Progress (02:24 CDT, uncommitted):**
- **Gap 1 — closed in code.** Census rows: `F10.SESSION_BANDS`, `G19.EFFORT_FIELD`, `G19.WISDOM`, `F15.BREATH_RIBBON`, `G19.FVG`. `AB.MATRIX` / `G19.BAR_DELTA` are now BUILT and `G19.RVOL` is re-pointed. The test walks `INSTRUMENT_EDUCATION` + `CONCEPT_EDUCATION`.
- **Gap 7 — closed in code.** Seven ⓘ concept records.
- **Gap 2 — closed in code.** `manifestation` / `ink` / `narrow` / `layer` on `CensusEntry` for 49 inventions. Narrow is derived from the permission table, with a test.
- **Gap 4 — complete (02:27 CDT).** §12 holds 19 certificates and §12b holds 23 more. With C-01…C-15 and §5, all 49 built candle-field inventions are certified (18 PROVED, 24 PARTIAL in §12 / §12b, each naming its missing proof).
- **Gap 3 — nearly closed by the chart lane's uncommitted worktree edits** (checked 02:28 CDT against the worktree's `LAYER_ATTENTION`). Only 3 built field inventions still have no attention tier:
  - F05A Clarity Candle — the candles are price itself, which sits above the governor by design ("price (outside the governor) > LIVE 1 > …", opacity receipt f96618c).
  - F06.BIDASK_PROFILE and P110.8 Fixed / Anchored Range — trader-drawn tools with no permission row.

  All three are intended exceptions, not gaps — **if** the chart-lane edits to `selectAttentionGovernor.ts` / `selectSemanticPermission.ts` ship.

### 11c. Top gaps — the lanes' work list (ranked: built and on the glass first, then cost)

1. **Census is stale: 7 shipped inventions have no census row, and 3 rows understate built work** (`TF.*`, `FVG_3C`; AB.MATRIX / G19.BAR_DELTA / G19.RVOL say PARTIAL).
   - *Owner:* census lane.
   - *Fix:* add the rows with owner, surface, plate and status. The census test already fails on an orphan switch, but these are Tool Finder instruments and a concept, which it does not walk; extend it to walk `INSTRUMENT_EDUCATION` + `CONCEPT_EDUCATION`.
2. **No registry field for manifestation class, colour semantics or responsive behaviour** (every candle-field row).
   - *Owner:* census lane + chart lane.
   - *Fix:* add `manifestation`, `ink` (a semantic token, not a hex) and `narrow` (what the invention does under the narrow-glass budget: KEEP / SIMPLIFY / WITHHOLD + why) to the registry, with a test that every BUILT candle-field row has all three.
3. **16 built layers have no attention (opacity) tier.** They do not recede with a selection, a stale feed or memory:
   - Clarity Candle (F05A)
   - Flow Current (depth gate only)
   - Bid/Ask split profile (DELTA_VP)
   - Session / Anchored / Classic VP (depth gate only)
   - Session Bands, Effort → Response, Delta Keel, RVOL tone, Wisdom line
   - CVD relationship, cross-market line, VWAP; causal marks (F04A); the TED line
   - …the full list is the "governor row" cells above.

   *Owner:* chart lane. *Fix:* `LAYER_ATTENTION` rows + `att.alpha()` at each paint block. Fold the volume-field layers (keel, effort columns, RVOL tone) as one SUPPORTING row.
4. **45 of 54 built candle-field inventions have no §28 certificate** (grammar, state grammar, colour, opacity, degraded, receipt). Only the 15 G19 queue items (C-01 … C-15) and FVG (§5) are certified.
   - *Highest-traffic uncertified:* the 11 profile species (P110.*), Absorption / Exhaustion (H-701), Big Trades (F07A), Market Structure (F11.STRUCTURE), Liquidity Weather (F08B), Derivatives Pressure (F15.PRESSURE), Brick Walls, Memory Ghost.
   - *Owner:* certificate lane (docs, from code + plates).
5. **42 of 54 built candle-field inventions have no erasure / phone proof.**
   - Proven so far: 10 desktop erasure rows + 9 phone rows (2 FAIL: Delta Keel salience, Flow Current unattributable) + tonight's structure / weather / profile-memory re-proof + FVG.
   - *Owner:* sheriff lane, using the runnable §52 in-tab snippet + erasure patch (`fillText` / `strokeText` disabled in-frame).
6. **28 built candle-field inventions have no plate**: 6 PROPOSED (§3b) still await the Founder, and TED needs a definition. *Owner:* Founder decision.
7. **7 built candle-field inventions have no ⓘ record:**
   - F04A causal marks and F11A / F11B market object + passport (CONTEXT doors);
   - G19.CVD_REL, G19.CROSS and G19.VWAP (PARTIAL);
   - F10.TED (definition owed). *Owner:* education owner (`inventionEducation.ts`), as CONCEPT records like FVG's.
8. **2 standing erasure FAILs** on phone: Delta Keel (salience) and Flow Current (receipt cannot be attributed to a drawn mark). *Owner:* chart lane.


## 12. §28 CERTIFICATES — profile species first, then the highest-traffic inventions (2026-10-08, night shift)

Written 02:22–02:24 CDT (`date`) by the certificate lane, from code at `69fb204` plus the worktree's chart-lane permission rows. One certificate per invention, with C-01's fields. Each field cites its source:

- **ⓘ** — `inventionEducation.ts`: question, evidence, appears, grammar, FULL / PARTIAL / DEGRADED, first touch, canon.
- **Manifestation, ink, narrow** — the census field facts (§34 gap 2, `inventionCensus.ts`).
- **Opacity tier** — `LAYER_ATTENTION`. Ceilings: LIVE 1 · SUPPORTING 0.85 · MEMORY 0.5 · STALE 0.3 · floor 0.12 · selection recede 0.45.
- **Depth** — `SEMANTIC_PERMISSION` [FAR, MID, NEAR].
- **Receipts** — the `canvas.dataset` keys MainChart writes for the layer.
- **Proof** — the serving reads already in this file (§1f), `GARDEN19-ERASURE-TESTS.md` and the receipt doc.

Status is PROVED only with a serving read; PARTIAL names the missing proof.

### P110.1 Living Profile
| Field | Certificate |
|---|---|
| **NAME** | Living Profile · census `P110.1` · owner `src/lib/marketData/viewModels/selectLivingProfile.ts` · plate WM_A_P110_LIVING_PROFILE_STACK · WM_NewMockup_121_F09_Living_Profile_Passport_Doorway |
| **MARKET QUESTION** | Where is the market accepting price right now, and where is value moving? |
| **EVIDENCE** | Traded volume on the bars (prints when present). (needs VOLUME) |
| **TRUTH CLASS** | FULL: Volume is allocated to price from real per-trade prints. · PARTIAL: Volume is spread across each bar's range from the bars' own totals — the shape is honest, single rows are approximate. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | A live histogram attached to the price scale; its POC migrates as value expands, contracts or shifts. |
| **STATE GRAMMAR** | Watch the POC move — value following price is acceptance; value staying behind is rejection. Click a row for its biography. |
| **COLOR** | `PROFILE_ROLES` |
| **OPACITY** | LIVE (ceiling 1), depth MID, light MAGNETS |
| **DEPTH** | FAR / MID / NEAR = QUIET / SPEAK / QUIET |
| **NARROW** | KEEP — in NARROW_GLASS_KEEPS_WORDS — it keeps its words below 600px |
| **ⓘ / FIRST TOUCH** | Living profile row — how much trade this price has taken this session. |
| **DEGRADED** | No traded volume (spot FX, spot metals) or none loaded — it does not draw rather than invent a histogram. |
| **RECEIPTS** | `livingProfile`, `livingProfileForm`, `livingProfileFidelity`, `livingProfileLane`, `livingProfileBodyGoverned`, `livingProfileLabels`, `livingProfilePocMark`, `livingDevelopment`, `profileContributionBars` |
| **CANON** | P-110 #1 Living Profile · H-601 |
| **SERVING PROOF** | §1f pass 2: NQ1! DRAWN · TRADE_BASED, SPY CANDLE_ESTIMATED, EURUSD NO_PROFILE (correct silence). Erasure: E1 (desktop) + phone `livingProfile=DRAWN`, lane 248–310, `livingProfileBodyGoverned=OVER_PRICE:0.5` (fan survives). Opacity: LIVE 1 → 0.45 under a selected gap (f96618c / 683aecf). Profile × candle `profileContributionBars=3\|ROW:31462.25\|TAPE` (c6de9ef). Developing trail `livingDevelopment` 110 points (3b927a9) |
| **STATUS** | **PROVED** — open item: At 390 the empty VA / POC chips still sit over the newest candles (erasure doc, standing ask) |

### P110.2 Structure Profile
| Field | Certificate |
|---|---|
| **NAME** | Structure Profile · census `P110.2` · owner `src/lib/marketData/viewModels/selectStructureProfile.ts` · plate WM_A_P110_LIVING_PROFILE_STACK |
| **MARKET QUESTION** | Where did trade build since the last confirmed swing? |
| **EVIDENCE** | A confirmed swing; volume makes the rows exact. (needs PRICE) |
| **TRUTH CLASS** | FULL: Swing confirmed and traded volume present. · PARTIAL: Swing confirmed but volume is bar-spread — shape honest, rows approximate. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | A histogram anchored to the last swing, with the leg's POC, VAH and VAL. |
| **STATE GRAMMAR** | It answers for this leg only — a POC near the swing means the leg is still auctioning at its start; far from it means the leg moved value. |
| **COLOR** | `PROFILE_ROLES` |
| **OPACITY** | LIVE (ceiling 1), depth MID, light TREND |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SILENT |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Structure profile — volume for the leg since the last swing. |
| **DEGRADED** | No lawful swing to anchor on — it says so and does not float. |
| **RECEIPTS** | `structureProfile`, `structureProfileForm`, `structureProfileRows`, `structureProfileLegBars`, `structureProfileSilence` |
| **CANON** | P-110 #2 Structure Profile (market-anchored) |
| **SERVING PROOF** | §1f: DRAWN · RULE_SHORT_LEG on all four symbols, rows 0. Garden 18 receipt: `DRAWN`, form RULE_SHORT_LEG (named short-leg form). Erasure: SILENT — the silence reason is a word in a chip |
| **STATUS** | **PARTIAL** — missing: No serving read with histogram ROWS (a leg long enough to profile); the silence reason is words-only · now **PARTIAL** — **UPDATE 02:29 CDT (serving `69fb204`, own tab, read-only):** NQ1! 1h, SPY 1D and BTC-USD 15m all read `structureProfileForm=RULE_SHORT_LEG`, rows 0 (legs of 6 / 12 / 9 bars). **Finding for the chart lane:** the histogram needs ≥ 21 bars since the anchor (`STRUCTURE_MIN_READABLE_BARS`), but the anchor is the NEWEST confirmed swing, which is rarely 21 bars old — so the histogram form is almost never reachable on serving. The rule form and its named silence work as designed |

### P110.3 Profile Fusion
| Field | Certificate |
|---|---|
| **NAME** | Profile Fusion · census `P110.3` · owner `src/lib/marketData/viewModels/selectProfileFusion.ts` · plate WM_A_P110_LIVING_PROFILE_STACK |
| **MARKET QUESTION** | Where do two or more of my profiles agree? |
| **EVIDENCE** | Two or more switched-on profiles that genuinely overlap. (needs OTHER_LAYERS) |
| **TRUTH CLASS** | FULL: Two or more profiles from real volume overlap. · PARTIAL: Sources are bar-spread profiles — the zone inherits their approximation. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | A fused zone where profiles overlap; the originals stay visible and each source is named. |
| **STATE GRAMMAR** | A fused zone is recomputed from the combined rows — never an average of two POCs. No real overlap, no zone. |
| **COLOR** | `PROFILE_ROLES`, `FUSED` |
| **OPACITY** | LIVE (ceiling 1), depth MACRO, light MAGNETS |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SILENT |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Profile fusion — profiles agree here; each source stays inspectable. |
| **DEGRADED** | Fewer than two profiles on, or no real overlap — it refuses and says why. |
| **RECEIPTS** | `profileFusion`, `profileFusionObject`, `profileFusionPair`, `profileFusionRefusal`, `profileFusionZones`, `profileFusionEvidence` |
| **CANON** | P-110 #3 Profile Fusion (COMPOSITE ≠ FUSION) |
| **SERVING PROOF** | §1f: DRAWN 3 zones; the fused object is REFUSED:UNIT_MISMATCH / TIME_OVERLAP / NO_AGREEMENT — the overlap gate is active. Garden 18: FEWER_THAN_TWO_SPECIES (correct silence) |
| **STATUS** | **PARTIAL** — missing: The Fusion close test is unproven on serving: a fused object minted, unfused, and both originals inspectable |

### P110.4 Profile Memory
| Field | Certificate |
|---|---|
| **NAME** | Profile Memory · census `P110.4` · owner `src/lib/marketData/viewModels/selectProfileMemory.ts` · plate WM_A_P110_LIVING_PROFILE_STACK |
| **MARKET QUESTION** | Where did earlier sessions find value — and has price been back? |
| **EVIDENCE** | At least one completed prior session in the loaded bars. (needs VOLUME) |
| **TRUTH CLASS** | FULL: Completed prior sessions with traded volume. · PARTIAL: Fewer prior sessions loaded — fewer memories, said plainly. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | Earlier sessions' POC and value carried forward as lines — naked until the market returns. |
| **STATE GRAMMAR** | A naked POC (never revisited) often draws price back. Once touched, its biography records the test and the response. |
| **COLOR** | `PROFILE_ROLES` |
| **OPACITY** | MEMORY (ceiling 0.5), depth MACRO, light MAGNETS |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SILENT |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Profile memory — an earlier session's value, carried forward. |
| **DEGRADED** | A 24/7 feed with no session gap, or no volume — nothing to remember. |
| **RECEIPTS** | `profileMemory`, `profileMemoryForms`, `profileMemoryShown`, `profileMemoryNaked`, `profileMemorySessions` |
| **CANON** | P-110 #4 Profile Memory |
| **SERVING PROOF** | §1f: 4 / 15 shown. Erasure: E10 + second pass `profileMemoryForms=POC_SOLID:1\|EDGE_DASHED:2\|NAKED_OPEN_CAP:1` PASS for kind; 05670f2 re-proof `POC_SOLID:1\|EDGE_DASHED:3\|NAKED_OPEN_CAP:2\|AGE:S-1..S-3` at 1180 and 390. Opacity MEMORY 0.44 (f96618c) |
| **STATUS** | **PROVED** — open item: Which session a level belongs to is words-only (erasure doc) |

### P110.5 Profile DNA
| Field | Certificate |
|---|---|
| **NAME** | Profile DNA · census `P110.5` · owner `src/lib/marketData/viewModels/selectProfileDna.ts` · plate WM_A_P110_LIVING_PROFILE_STACK |
| **MARKET QUESTION** | What shape is the profile — balanced, skewed, thin? |
| **EVIDENCE** | The Living Profile it describes. (needs VOLUME) |
| **TRUTH CLASS** | FULL: Living Profile drawn from real volume. · PARTIAL: Living Profile drawn from bar-spread volume — statistics labelled approximate. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | A spine beside the Living Profile: range, value bracket, POC notch and mass-centre diamond. Numbers in Inspect. |
| **STATE GRAMMAR** | A diamond away from the POC means the volume is skewed to one side. It describes; it never forecasts. |
| **COLOR** | `PROFILE_ROLES` |
| **OPACITY** | LIVE (ceiling 1), depth MID, light MAGNETS |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SILENT |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Profile DNA — the shape of the profile, described not predicted. |
| **DEGRADED** | No Living Profile on the glass — DNA has nothing to describe. |
| **RECEIPTS** | `profileDna`, `profileDnaShape`, `profileDnaSpine`, `profileDnaDiamond` |
| **CANON** | P-110 #5 Profile DNA (never prophecy) |
| **SERVING PROOF** | §1f: MEASURED · shape P (NQ, SPY, BTC); EURUSD LIVING_PROFILE_NOT_DRAWN. Garden 18: MEASURED:ALONE, shape P. Erasure: `Shape=ELONGATED`, a tiny spine / diamond by the axis |
| **STATUS** | **PARTIAL** — missing: Salience: the spine and diamond are too small to read with words erased (erasure PARTIAL) |

### P110.6 Session Profile
| Field | Certificate |
|---|---|
| **NAME** | Session Profile · census `P110.6` · owner `src/lib/marketData/viewModels/selectProfileMenu.ts` · plate — (none) |
| **MARKET QUESTION** | Where did this session trade the most? |
| **EVIDENCE** | Traded volume on the bars inside the chosen session window. (needs VOLUME) |
| **TRUTH CLASS** | FULL: Volume is allocated to price from real per-trade prints. · PARTIAL: Volume is spread across each bar's range from the bars' own totals — the shape is honest, single rows are approximate. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | A histogram clipped to the session, with POC, VAH, VAL and high/low volume nodes. |
| **STATE GRAMMAR** | Fat rows (HVN) are prices the session accepted; thin rows (LVN) are prices it passed through quickly and may move through again. |
| **COLOR** | `VP_PALETTE` |
| **OPACITY** | no attention tier (not governed — §11c gap 3) |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / QUIET |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | This session's volume profile — fat rows accepted, thin rows rejected. |
| **DEGRADED** | No traded volume (spot FX, spot metals) or none loaded — it does not draw rather than invent a histogram. |
| **RECEIPTS** | `vpSessionWindow`, `vpDrawn`, `vpRequested`, `vpSessionContour`, `vpSpan` |
| **CANON** | P-110 #6 Session Profile |
| **SERVING PROOF** | §1f: `vpSessionWindow` GLOBEX_DAY (NQ1!), US_EQUITY_ETH (SPY), declined on EURUSD (no central volume), drawn on BTC. Erasure: histogram survives (PASS shape) |
| **STATUS** | **PROVED** — open item: The species identity is words-only once its chip is erased (erasure doc) |

### P110.7 Visible Range Profile
| Field | Certificate |
|---|---|
| **NAME** | Visible Range Profile · census `P110.7` · owner `src/lib/marketData/viewModels/selectVisibleRangeProfile.ts` · plate — (none) |
| **MARKET QUESTION** | Where did trade happen in exactly what I am looking at? |
| **EVIDENCE** | Traded volume on the bars in view. (needs VOLUME) |
| **TRUTH CLASS** | FULL: Volume is allocated to price from real per-trade prints. · PARTIAL: Volume is spread across each bar's range from the bars' own totals — the shape is honest, single rows are approximate. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | A histogram for the bars on screen — it rebuilds when you scroll or zoom. |
| **STATE GRAMMAR** | Same reading as any profile, but its levels move with your camera — do not treat them as fixed. |
| **COLOR** | `PROFILE_ROLES` |
| **OPACITY** | LIVE (ceiling 1), depth MID, light MAGNETS |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / QUIET |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Visible range profile — volume for the bars in view. |
| **DEGRADED** | No traded volume (spot FX, spot metals) or none loaded — it does not draw rather than invent a histogram. |
| **RECEIPTS** | `visibleRangeProfile`, `visibleRangeProfileRows`, `visibleRangeProfilePoc`, `visibleRangeProfileBars` |
| **CANON** | P-110 #7 Visible Range Profile |
| **SERVING PROOF** | §1f: DRAWN on NQ1!, SPY, BTC; NO_VOLUME on EURUSD. Erasure: rows 66, histogram survives (PASS shape) |
| **STATUS** | **PROVED** — open item: Identity words-only, as above |

### P110.8 Fixed Range Profile
| Field | Certificate |
|---|---|
| **NAME** | Fixed Range Profile · census `P110.8` · owner `src/lib/marketData/viewModels/selectProfileMenu.ts` · plate — (none) |
| **MARKET QUESTION** | Where did trade happen across a stretch I pick? |
| **EVIDENCE** | Traded volume on the bars you drag across. (needs VOLUME) |
| **TRUTH CLASS** | FULL: Volume is allocated to price from real per-trade prints. · PARTIAL: Volume is spread across each bar's range from the bars' own totals — the shape is honest, single rows are approximate. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | Drag across bars; a profile builds only inside that range, with its POC, VAH and VAL. |
| **STATE GRAMMAR** | Pick a move (a rally, a range) and read where it did its business. |
| **COLOR** | `PROFILE_ROLES` |
| **OPACITY** | no attention tier (not governed — §11c gap 3) |
| **DEPTH** | not in the permission table (a trader-drawn tool) |
| **NARROW** | KEEP — a drawing the trader placed — it has no row in the permission table, so the narrow-glass budget does not touch it |
| **ⓘ / FIRST TOUCH** | Fixed range profile — volume for the range you chose. |
| **DEGRADED** | No traded volume (spot FX, spot metals) or none loaded — it does not draw rather than invent a histogram. |
| **RECEIPTS** | none written |
| **CANON** | P-110 #8 Fixed Range Profile (user-anchored) |
| **SERVING PROOF** | A drag tool (`drawingTool === "anchored-vp"`) — not URL-provable (§1f) |
| **STATUS** | **PARTIAL** — missing: A hands-on drag receipt on serving; no dataset receipt is written by this tool |

### P110.9 Composite Profile
| Field | Certificate |
|---|---|
| **NAME** | Composite Profile · census `P110.9` · owner `src/lib/marketData/viewModels/selectCompositeProfile.ts` · plate — (none) |
| **MARKET QUESTION** | Across the last few completed sessions, where was value? |
| **EVIDENCE** | Completed sessions with volume; today is excluded. (needs VOLUME) |
| **TRUTH CLASS** | FULL: Volume is allocated to price from real per-trade prints. · PARTIAL: Volume is spread across each bar's range from the bars' own totals — the shape is honest, single rows are approximate. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | One histogram aggregated over recent sessions, with composite POC, VAH and VAL. |
| **STATE GRAMMAR** | The composite value area is the multi-day fair price — today trading inside it is balance, outside it is a test of new value. |
| **COLOR** | `PROFILE_ROLES` |
| **OPACITY** | LIVE (ceiling 1), depth MACRO, light MAGNETS |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / QUIET |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Composite profile — value across recent completed sessions. |
| **DEGRADED** | No completed session (a 24/7 feed never closes one) or no volume — it refuses. |
| **RECEIPTS** | `compositeProfile`, `compositeProfileRows`, `compositeProfileSessions`, `compositeProfileStrata` |
| **CANON** | P-110 #9 Composite Profile |
| **SERVING PROOF** | §1f: DRAWN (5 sessions) on NQ1!; DRAWN on SPY and BTC; NO_VOLUME on EURUSD. Garden 18: `DRAWN`, 94 rows, 5 sessions, sediment geometry. Erasure: rows 91, PASS shape |
| **STATUS** | **PROVED** — open item: Identity words-only |

### P110.10 TPO / Auction Distribution
| Field | Certificate |
|---|---|
| **NAME** | TPO / Auction Distribution · census `P110.10` · owner `src/lib/marketData/viewModels/selectTpoProfile.ts` · plate — (none) |
| **MARKET QUESTION** | How much TIME did the market spend at each price? |
| **EVIDENCE** | Bars alone — time and price, no volume needed. (needs PRICE) |
| **TRUTH CLASS** | FULL: Built from the loaded bars — nothing more is needed. · PARTIAL: Too few periods on screen — it says so instead of lettering a thin profile. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | Letters on the left edge, one per period that traded at each price, with TPO POC, value and single prints. |
| **STATE GRAMMAR** | Wide rows = time spent (acceptance). Single prints = prices the market rushed through — often revisited. |
| **COLOR** | `PROFILE_ROLES`, `BRASS` |
| **OPACITY** | LIVE (ceiling 1), depth MID, light MAGNETS |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SILENT |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | TPO — letters show how long the market spent at each price. |
| **DEGRADED** | No bars — nothing to read yet. |
| **RECEIPTS** | `tpoProfile`, `tpoProfileRows`, `tpoProfilePeriods`, `tpoProfileSingles`, `tpoYields`, `tpoProfileAsOf` |
| **CANON** | P-110 #10 TPO / auction distribution |
| **SERVING PROOF** | §1f: DRAWN on all four — on EURUSD the only lawful profile. Erasure: `tpoProfileRows=95`, cell grid + VA lines, PASS shape |
| **STATUS** | **PROVED** — open item: POC / VA chips are words-only |

### P110.CLASSIC Classic VP · all loaded bars
| Field | Certificate |
|---|---|
| **NAME** | Classic VP · all loaded bars · census `P110.CLASSIC` · owner `src/lib/marketData/viewModels/selectProfileMenu.ts` · plate — (none) |
| **MARKET QUESTION** | Where did the most business happen across everything loaded? |
| **EVIDENCE** | Traded volume on the loaded bars. (needs VOLUME) |
| **TRUTH CLASS** | FULL: Volume is allocated to price from real per-trade prints. · PARTIAL: Volume is spread across each bar's range from the bars' own totals — the shape is honest, single rows are approximate. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | A volume histogram against the price axis, with POC, VAH and VAL lines across the chart. |
| **STATE GRAMMAR** | The longest row (POC) is the price the market accepted most. VAH–VAL holds about 70% of volume — inside is fair value, outside is the market testing for acceptance. |
| **COLOR** | `VP_PALETTE` |
| **OPACITY** | no attention tier (not governed — §11c gap 3) |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / QUIET |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Classic volume profile — the longest row is where most volume traded. |
| **DEGRADED** | No traded volume (spot FX, spot metals) or none loaded — it does not draw rather than invent a histogram. |
| **RECEIPTS** | `vpDrawn`, `vpRows`, `vpSpan`, `vpLevelChips`, `vpFault` |
| **CANON** | Profile family · shared VP engine |
| **SERVING PROOF** | §1f groups fixedVP with the session VP (`vpDrawn 2` on NQ1!) |
| **STATUS** | **PARTIAL** — missing: No receipt that names the classic (all-loaded-bars) column apart from the session column |

### H-701.ABS Absorption Shelf
| Field | Certificate |
|---|---|
| **NAME** | Absorption Shelf · census `H-701.ABS` · owner `src/lib/marketData/selectAbsorptionAnatomy.ts` · plate WM_NewMockup_46_OrderFlow_Footprint_Absorption · WM_Transformation_UI_06_Absorption_Anatomy |
| **MARKET QUESTION** | Is heavy effort hitting a price and failing to move it? |
| **EVIDENCE** | Bar volume (sided prints sharpen it) measured against how far price actually moved. (needs VOLUME) |
| **TRUTH CLASS** | FULL: Sided prints and volume both measured — a confirmed absorption once its evidence floor passes. · PARTIAL: Bar volume only — shown as an absorption candidate, not confirmed. |
| **MANIFESTATION** | EVENT |
| **PHYSICAL GRAMMAR** | A shelf on the bars where effort was high and displacement near zero, at the real high and low it covered. |
| **STATE GRAMMAR** | Thicker shelf = more effort absorbed. A shelf that holds when tested again is a defended level; a clean break through it means the wall gave way. |
| **COLOR** | `BRASS` |
| **OPACITY** | LIVE (ceiling 1), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SPEAK |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Absorption shelf — heavy effort met here and price barely moved. |
| **DEGRADED** | No traded volume — no shelf is drawn (effort cannot be measured). |
| **RECEIPTS** | `absorption`, `absorptionTerrain`, `absorptionStateInk`, `absorptionChips` |
| **CANON** | F06 · H-701A Absorption (effort high, displacement near zero) |
| **SERVING PROOF** | §1f: DRAWN · ABSORBING on SPY and BTC; MEASURED_NO_ZONES on NQ (correct). Erasure: E3 + phone + second pass `absorptionStateInk=ABSORBING:1` (effort terrain with a gold absorbing edge, shelf box) PASS |
| **STATUS** | **PROVED** |

### H-701.EXH Exhaustion
| Field | Certificate |
|---|---|
| **NAME** | Exhaustion · census `H-701.EXH` · owner `src/lib/marketData/viewModels/selectExhaustion.ts` · plate WM_Transformation_UI_06_Absorption_Anatomy |
| **MARKET QUESTION** | Is the push running out of fuel? |
| **EVIDENCE** | Bar volume along a push, measured against how far each step moved price. (needs VOLUME) |
| **TRUTH CLASS** | FULL: Volume and sided prints measured along the whole push. · PARTIAL: Bar volume only — an exhaustion candidate, labelled as such. |
| **MANIFESTATION** | EVENT |
| **PHYSICAL GRAMMAR** | A mark at the push's extreme bar — where effort faded as price stretched. |
| **STATE GRAMMAR** | The mark sits where the last push failed to follow through. It is not a defended wall — exhaustion needs no defender, just fading fuel. |
| **COLOR** | `EXHAUST_RED` |
| **OPACITY** | LIVE (ceiling 1), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SPEAK |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Exhaustion — the push spent its fuel here and failed to continue. |
| **DEGRADED** | No traded volume — no mark is drawn. |
| **RECEIPTS** | `exhaustion` |
| **CANON** | F06 · H-701A Exhaustion (aggression drying, no defender required) |
| **SERVING PROOF** | In the census since Garden 18 §XXI (its own switch); ⓘ complete |
| **STATUS** | **PARTIAL** — missing: Never read on serving — §4 open items: "Still unmeasured: Exhaustion (no proof token)". Needs `on=Exhaustion` + a drawn mark |

### F07A Big Trades on the market
| Field | Certificate |
|---|---|
| **NAME** | Big Trades on the market · census `F07A` · owner `src/lib/bigTradeLevels.ts` · plate WM_NewMockup_76_F07A_BigTrades_On_Market |
| **MARKET QUESTION** | Where did unusually large trades print? |
| **EVIDENCE** | Per-trade prints. (needs PRINTS) |
| **TRUTH CLASS** | FULL: Every print observed with its side. · PARTIAL: Prints observed, side inferred — labelled. |
| **MANIFESTATION** | EVENT |
| **PHYSICAL GRAMMAR** | Marks at the actual time and price of large prints, sized relative to this session. |
| **STATE GRAMMAR** | Size is relative, not absolute. Click one to see what price did after it. No claim about who traded or why. |
| **COLOR** | `TRADE_SIDE`, `BRASS` |
| **OPACITY** | LIVE (ceiling 1), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SPEAK |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Big trade — an unusually large print; Inspect shows what price did next. |
| **DEGRADED** | No per-trade prints — no marks. |
| **RECEIPTS** | `bigTradeBubbleCount`, `bigTradeClusters`, `bigTradeQuieted`, `bigTradeCallout` |
| **CANON** | F07 Big Trades · H-701B |
| **SERVING PROOF** | §1f receipts; erasure E5 + phone `bigTradeBubbleStatus=DRAWN`, `bigTradeClusters=1/132` PASS; "no tick → no bubble" enforced |
| **STATUS** | **PROVED** |

### F11.STRUCTURE Market Structure
| Field | Certificate |
|---|---|
| **NAME** | Market Structure · census `F11.STRUCTURE` · owner `src/lib/marketData/viewModels/selectMarketStructure.ts` · plate — (none) |
| **MARKET QUESTION** | Where are the confirmed swing highs and lows? |
| **EVIDENCE** | Bars alone. (needs PRICE) |
| **TRUTH CLASS** | FULL: Built from the loaded bars — nothing more is needed. · PARTIAL: Too few bars loaded or in view — it draws what the bars support and says what is short. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | Swing highs and lows, the latest of each drawn loudest. |
| **STATE GRAMMAR** | Higher highs and higher lows = up-structure. A close beyond the last swing is a break of structure. Click a swing for its passport. |
| **COLOR** | `BONE`, `BRASS` |
| **OPACITY** | LIVE (ceiling 1), depth MACRO, light TREND |
| **DEPTH** | FAR / MID / NEAR = QUIET / SPEAK / QUIET |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Swing level — a confirmed high or low; its passport shows tests and age. |
| **DEGRADED** | No bars — nothing to read yet. |
| **RECEIPTS** | `marketStructure`, `marketStructurePivotForms`, `marketStructureBias`, `marketStructureBiasGlyph` |
| **CANON** | F11 Market Object Passport · structure |
| **SERVING PROOF** | Erasure: E2 + phone + second pass `PivotForms=FILLED:2\|HOLLOW:3` PASS; 05670f2 re-proof `FILLED:6\|HOLLOW:3`, bias glyph RANGE at every width (1180, 390) |
| **STATUS** | **PROVED** |

### F08B Liquidity Weather (lens)
| Field | Certificate |
|---|---|
| **NAME** | Liquidity Weather (lens) · census `F08B` · owner `src/lib/marketData/viewModels/selectLiquidityWeather.ts` · plate WM_NewMockup_79_F08B_Weather_Lens |
| **MARKET QUESTION** | How much size does it cost to move price here? |
| **EVIDENCE** | Prints (or traded bars when no tape window) — volume per unit of price travel; side not needed. (needs VOLUME) |
| **TRUTH CLASS** | FULL: Measured from live prints. · PARTIAL: Measured from the chart's traded bars because the tape window is short — coarser bands, labelled. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | A restrained tint on price as heat bands; candles stay readable through it. |
| **STATE GRAMMAR** | Hot = dear: it takes a lot of size to move price (stalls are likely). Cool = cheap: price can travel fast through it. |
| **COLOR** | `BONE` |
| **OPACITY** | LIVE (ceiling 1), depth MID, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SILENT |
| **NARROW** | WITHHOLD — the loupe yields on a small pane (liquidityGlassGeometry YIELDED_SMALL_PANE); below 600px its words go quiet as well |
| **ⓘ / FIRST TOUCH** | Liquidity weather — hot bands are expensive to move through, cool bands are cheap. |
| **DEGRADED** | No traded volume or too few traded bars — the lens says UNMEASURED instead of painting. |
| **RECEIPTS** | `liquidityWeather`, `liquidityWeatherStageInk`, `LensState` |
| **CANON** | F08B Liquidity Weather (a lens, not a page) |
| **SERVING PROOF** | Erasure E9 `LensState=DRAWN` (1180), `YIELDED_SMALL_PANE` (390, by design). 05670f2: `liquidityWeatherStageInk STEADY:GRAIN12` |
| **STATUS** | **PARTIAL** — missing: Grain-by-stage is unproven: only one stage (STEADY) was on serving |

### F15.PRESSURE Derivatives Pressure world
| Field | Certificate |
|---|---|
| **NAME** | Derivatives Pressure world · census `F15.PRESSURE` · owner `src/lib/marketData/viewModels/selectDerivativesPressure.ts` · plate — (none) |
| **MARKET QUESTION** | Will dealer hedging damp moves here or speed them up? |
| **EVIDENCE** | An options chain with open interest (Cboe delayed; BTC/ETH from Deribit public). (needs OPTIONS) |
| **TRUTH CLASS** | FULL: Fresh chain for this underlying. · PARTIAL: Chain is delayed — positioning trails the market, said in the label. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | A pressure field, the zero-gamma front, walls with observed tests, and the implied expected move. |
| **STATE GRAMMAR** | Above zero-gamma dealers tend to damp moves; below it they tend to amplify them. It is INFERRED from positioning, not observed orders. |
| **COLOR** | `OPTIONS_NET` |
| **OPACITY** | SUPPORTING (ceiling 0.85), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = SPEAK / SPEAK / QUIET |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Derivatives pressure — where dealer hedging is expected to damp or amplify moves. |
| **DEGRADED** | No chain for this market — unavailable on this feed. |
| **RECEIPTS** | `derivativesPressurePainted` |
| **CANON** | Garden 15/16 Market Sense · Derivatives Pressure |
| **SERVING PROOF** | Erasure `PRESSURE:MIXED`, `Texture=ON` (climate wash + clear zone). Call ≠ Put ≠ Gamma held live (§1, pass 2) |
| **STATUS** | **PARTIAL** — missing: Tint-by-climate is unproven: only MIXED was on serving |

### F08.BRICK Brick Walls
| Field | Certificate |
|---|---|
| **NAME** | Brick Walls · census `F08.BRICK` · owner `src/lib/marketData/viewModels/selectProfileMenu.ts` · plate — (none) |
| **MARKET QUESTION** | Which strikes are dealers defending, and have they cracked? |
| **EVIDENCE** | Options open interest (Cboe delayed; futures via tastytrade; BTC/ETH Deribit). (needs OPTIONS) |
| **TRUTH CLASS** | FULL: Fresh chain and observed tests on this chart. · PARTIAL: Chain delayed or mapped from an index (NDX/SPX onto NQ/ES) — labelled. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | Masonry walls at strike prices — bricks, a crack at each observed test, breach and scar. |
| **STATE GRAMMAR** | More bricks = more open interest. Each crack is a test that held; a breach leaves a scar. Inferred positioning, not orders. |
| **COLOR** | `OPTIONS_NET` |
| **OPACITY** | SUPPORTING (ceiling 0.85), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = SPEAK / SPEAK / QUIET |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Brick wall — a strike dealers are positioned at; cracks are observed tests. |
| **DEGRADED** | No chain for this market — no walls. |
| **RECEIPTS** | `brickWalls`, `optionsOiWalls`, `brickWallsOffCamera` |
| **CANON** | Garden 16 §20 Brick Walls |
| **SERVING PROOF** | Erasure: E4 + phone `brickWalls=ON:2`, `optionsOiWalls=CALL_OI@…\|PUT_OI@…`; second pass `brickWallsOffCamera=ABOVE:2\|MARK:DRAWN` (was FAIL — ASK-1 done) |
| **STATUS** | **PROVED** |

**Grade change · 2026-10-08 13:56 CDT (P2-G ruling, Sheriff lane).** Inspect graded a DELAYED chain `DEGRADED` while this certificate and the ⓘ record say DEGRADED means "no chain — no walls" (peer Sheriff, 07:30 CDT). `inspectEvidence.ts` DERIVATIVES now grades on this ladder: fresh chain = FULL, delayed chain = PARTIAL, no chain = SILENT with no wall drawn. Applies to F15.PRESSURE too (same owner).

### F03A Memory Ghost
| Field | Certificate |
|---|---|
| **NAME** | Memory Ghost · census `F03A` · owner `src/lib/marketData/viewModels/selectMemoryGhost.ts` · plate WM_NewMockup_68_F03A_Memory_Ghost |
| **MARKET QUESTION** | When did this market last make this same shape? |
| **EVIDENCE** | Enough history to find a close analogue. (needs PRICE) |
| **TRUTH CLASS** | FULL: A close analogue with enough history. · PARTIAL: A weaker match — mismatch shown in Inspect. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | The earlier stretch ghosted faintly under the live bars on the same axes — never projected forward. |
| **STATE GRAMMAR** | It shows what the past shape looked like, not what will happen. Sample size and mismatch are in Inspect. |
| **COLOR** | `BONE` |
| **OPACITY** | MEMORY (ceiling 0.5), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SILENT |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Memory ghost — an earlier stretch with the same shape. Not a forecast. |
| **DEGRADED** | No adequate analogue — silence, not a guess. |
| **RECEIPTS** | `memoryGhost`, `memoryGhostForm`, `memoryGhostCaption` |
| **CANON** | F03 Memory Ghost · H-201 (no second past, no lookahead) |
| **SERVING PROOF** | Erasure: SILENT (`NO_ANALOGUE`) — correct silence, nothing drawn |
| **STATUS** | **PARTIAL** — missing: A drawn ghost has never been read on serving; the ≤ 0.18 opacity target is unverified · now **PARTIAL** — **UPDATE 02:29 CDT (serving `69fb204`, own tab, read-only):** NQ1! 5m `on=MemoryGhost` → `memoryGhost=DRAWN:0.98` (match score), `memoryGhostForm=DASHED:20`, caption SLID, attention tier `memoryGhost:MEMORY:0.44`. The ghost now draws on serving. Still missing: its own stroke alpha against the ≤ 0.18 plate target — the receipt names the tier, not the stroke alpha |


### 12b. §28 CERTIFICATES (continued) — the remaining built candle-field inventions (2026-10-08, night shift)

Written 02:25–02:27 CDT (`date`). Same method and sources as §12.

Together with C-01 … C-15 and §5 (FVG), every built candle-field invention in the census now has a §28 certificate. Of these 23: 8 PROVED, 15 PARTIAL.

### F05A Clarity Candle (default language)
| Field | Certificate |
|---|---|
| **NAME** | Clarity Candle (default language) · census `F05A` · owner `src/lib/chart/clarityCandle.ts` · plate WM_NewMockup_72_F05A_Clarity_Default_Language |
| **MARKET QUESTION** | How much of each candle was decision and how much was indecision? |
| **EVIDENCE** | The bars' open, high, low and close. (needs PRICE) |
| **TRUTH CLASS** | FULL: Built from the loaded bars — nothing more is needed. · PARTIAL: Too few bars loaded or in view — it draws what the bars support and says what is short. |
| **MANIFESTATION** | CONTINUOUS |
| **PHYSICAL GRAMMAR** | Re-inked candles: the real high and low kept, body strength drawn by body efficiency, dominant wick named, open gaps marked. |
| **STATE GRAMMAR** | Solid body = most of the range was decision. Hollow = indecision. A long named wick shows where one side was rejected. Clarity never rewrites the real OHLC. |
| **COLOR** | `CANDLE` |
| **OPACITY** | no attention tier (not governed — §11c gap 3) |
| **DEPTH** | FAR / MID / NEAR = QUIET / SPEAK / SPEAK |
| **NARROW** | KEEP — in NARROW_GLASS_KEEPS_WORDS — it keeps its words below 600px |
| **ⓘ / FIRST TOUCH** | Clarity candle — solid is decision, hollow is indecision; real OHLC unchanged. |
| **DEGRADED** | No bars — nothing to read yet. |
| **RECEIPTS** | `clarityCandle`, `clarityNotable`, `clarityCallout`, `clarityOnPrice` |
| **CANON** | F05 Clarity · WM_NewMockup_72 |
| **SERVING PROOF** | §1f: DRAWN on every bar on all four symbols (NQ 180, SPY 114 + 46 gaps, EURUSD 152, BTC 152). Erasure second pass: `clarityNotable=5`, `clarityCallout=PINNED` |
| **STATUS** | **PARTIAL** — missing: Erasure PARTIAL — what makes a bar notable lives in the callout's words |

### F06.VALUE_CANDLE Value Candle
| Field | Certificate |
|---|---|
| **NAME** | Value Candle · census `F06.VALUE_CANDLE` · owner `src/lib/marketData/viewModels/selectValueCandle.ts` · plate — (none) |
| **MARKET QUESTION** | Where inside each window did volume actually concentrate? |
| **EVIDENCE** | Prints inside the window, binned by price. (needs SIDED_TAPE) |
| **TRUTH CLASS** | FULL: Every print carries a stated aggressor side — the marks are measured, not estimated. · PARTIAL: Sides are inferred (quote test or tick rule) — the read is labelled inferred and only covers bars since the tape arrived. |
| **MANIFESTATION** | CONTINUOUS |
| **PHYSICAL GRAMMAR** | On the candle: a centre of gravity with its value high and low. |
| **STATE GRAMMAR** | A centre of gravity near the close means the move was accepted; near the far wick means most business happened at prices the bar left behind. |
| **COLOR** | `BONE`, `BRASS` |
| **OPACITY** | LIVE (ceiling 1), depth MICRO, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SPEAK |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Value candle — where this window's volume concentrated. |
| **DEGRADED** | No sided tape — it stays silent rather than guess sides from candle colour. |
| **RECEIPTS** | `valueCandle`, `valueCandleForm`, `valueCandleCog`, `valueCandleRungs` |
| **CANON** | Clarity / auction language |
| **SERVING PROOF** | §1f: DRAWN (GLASS_PER_BAR:5) on NQ, DRAWN on BTC, UNMEASURED without sides. Erasure second pass: `valueCandleForm=GLASS_PER_BAR:13` |
| **STATUS** | **PARTIAL** — missing: Erasure PARTIAL (salience): faint glass behind the newest bars |

### F06A.FLOW Flow Current (order flow on price)
| Field | Certificate |
|---|---|
| **NAME** | Flow Current (order flow on price) · census `F06A.FLOW` · owner `src/components/chart/MainChart.tsx` · plate WM_NewMockup_74_F06A_OrderFlow_On_Price |
| **MARKET QUESTION** | Who is pressing on each bar? |
| **EVIDENCE** | Sided prints inside each bar. (needs SIDED_TAPE) |
| **TRUTH CLASS** | FULL: Every print carries a stated aggressor side — the marks are measured, not estimated. · PARTIAL: Sides are inferred (quote test or tick rule) — the read is labelled inferred and only covers bars since the tape arrived. |
| **MANIFESTATION** | CONTINUOUS |
| **PHYSICAL GRAMMAR** | A small current on each bar with tape — up for net buying, down for net selling. |
| **STATE GRAMMAR** | Length is how one-sided the bar was. Long currents against the candle's direction are a warning: price moved one way while aggression pushed the other. |
| **COLOR** | `TRADE_SIDE` |
| **OPACITY** | LIVE (ceiling 1), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = QUIET / SPEAK / SPEAK |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Flow current — net aggression on this bar, up for buying, down for selling. |
| **DEGRADED** | No sided tape — it stays silent rather than guess sides from candle colour. |
| **RECEIPTS** | `flowCurrent`, `flowCurrentCoverage` |
| **CANON** | F06A Order flow lives on price |
| **SERVING PROOF** | §1f: `BARS:180\|SHOWN:7` (NQ), 49/13 (SPY), 33/12 (BTC); NO_SIDED_TAPE on EURUSD. Erasure: phone FAIL (unattributable), second pass PARTIAL (attribution) |
| **STATUS** | **PARTIAL** — missing: A drawn mark cannot be tied to its receipt by eye (erasure attribution); the lean floor silences most bars (§1f) |

### F09.MIGRATION Value Migration (Living's auction movie)
| Field | Certificate |
|---|---|
| **NAME** | Value Migration (Living's auction movie) · census `F09.MIGRATION` · owner `src/lib/marketData/viewModels/selectValueMigration.ts` · plate — (none) |
| **MARKET QUESTION** | Where did value stand after every bar — and which way is it moving? |
| **EVIDENCE** | Traded volume, rebuilt bar by bar. (needs VOLUME) |
| **TRUTH CLASS** | FULL: Volume is allocated to price from real per-trade prints. · PARTIAL: Volume is spread across each bar's range from the bars' own totals — the shape is honest, single rows are approximate. |
| **MANIFESTATION** | CONTINUOUS |
| **PHYSICAL GRAMMAR** | Developing POC, VAH and VAL drawn across the candles. |
| **STATE GRAMMAR** | Rising POC = value moving up with price (accepted). Price rising while POC stays flat = the move is not yet accepted. |
| **COLOR** | `PROFILE_ROLES` |
| **OPACITY** | MEMORY (ceiling 0.5), depth MID, light TREND |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SILENT |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Value migration — where value stood as each bar closed. |
| **DEGRADED** | No traded volume (spot FX, spot metals) or none loaded — it does not draw rather than invent a histogram. |
| **RECEIPTS** | `valueMigration`, `valueMigrationPoints`, `valueMigrationSessions`, `valueMigrationLabel` |
| **CANON** | Living Profile's auction movie |
| **SERVING PROOF** | §1f: DRAWN 4942 points (NQ), 4772 (SPY), DRAWN (BTC); NO_VOLUME on EURUSD — "A — passes, history across the field". Erasure second pass: `Points=346`, `Sessions=2`, dotted VA trails + session boxes PASS |
| **STATUS** | **PROVED** |

### F10.SESSION_BANDS Session Bands (Asia · London · New York, overlap marked)
| Field | Certificate |
|---|---|
| **NAME** | Session Bands (Asia · London · New York, overlap marked) · census `F10.SESSION_BANDS` · owner `src/lib/chart/sessionBands.ts` · plate — (none) |
| **MARKET QUESTION** | Which of the world's sessions is open right now? |
| **EVIDENCE** | The clock alone — no volume needed. (needs PRICE) |
| **TRUTH CLASS** | FULL: Always full — a clock fact. · PARTIAL: Not applicable — a clock fact. |
| **MANIFESTATION** | CONTINUOUS |
| **PHYSICAL GRAMMAR** | Asia, London and New York business hours on the time axis, the London/New York overlap marked. |
| **STATE GRAMMAR** | Moves often start at a session open and the overlap is usually the most active stretch. |
| **COLOR** | `SESSION_INKS` |
| **OPACITY** | SUPPORTING (ceiling 0.85), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = QUIET / SPEAK / SPEAK |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Session band — the trading session these bars belong to. |
| **DEGRADED** | Not applicable — a clock fact. |
| **RECEIPTS** | `sessionBands`, `sessionBandRails`, `sessionBandsNow`, `sessionBandsCost` |
| **CANON** | F10 One clock |
| **SERVING PROOF** | §1f: DRAWN on all four (A1\|N1, A1\|L1\|N1\|O1). Erasure: E8 FAIL (one session in view, no contrast) → second pass `sessionBandRails=3`, PARTIAL (salience) |
| **STATUS** | **PARTIAL** — missing: Rails ~1 px at the axis foot — readable only when zoomed (erasure) |

### H-901 Regime State Lighting
| Field | Certificate |
|---|---|
| **NAME** | Regime State Lighting · census `H-901` · owner `src/lib/marketData/viewModels/selectRegimeLighting.ts` · plate WM_NewMockup_92_F15A_Regime_State_Lighting |
| **MARKET QUESTION** | Is this market trending or balancing — and which tools should I trust? |
| **EVIDENCE** | Closes of the bars in view. (needs PRICE) |
| **TRUTH CLASS** | FULL: Built from the loaded bars — nothing more is needed. · PARTIAL: Too few bars loaded or in view — it draws what the bars support and says what is short. |
| **MANIFESTATION** | CONTINUOUS |
| **PHYSICAL GRAMMAR** | Lights the fitting fixtures: a trend channel in trend, mean/σ magnets in balance. |
| **STATE GRAMMAR** | It is a dimmer, not a room — it changes which geometry speaks. In balance, trust the magnets; in trend, trust the channel. |
| **COLOR** | `REGIME_FIELD`, `BRASS` |
| **OPACITY** | SUPPORTING (ceiling 0.85), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = SPEAK / QUIET / QUIET |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Regime lighting — the regime decides which fixtures are lit. |
| **DEGRADED** | No bars — nothing to read yet. |
| **RECEIPTS** | `regimeLighting`, `regimeLightingField`, `regimeLightingChannel`, `regimeLightingFixtures` |
| **CANON** | F15 Regime · H-901 |
| **SERVING PROOF** | §1f: RANGE · COMPRESSION · fixtures 89 (NQ, BTC); NO_BREAKER (SPY after hours, EURUSD). Erasure second pass: `regimeLighting=TREND`, hatched trend channel with rails PASS |
| **STATUS** | **PROVED** — open item: The verdict word chip is empty with words erased; regime history is a separate invention (G19.REGIME_HISTORY, C-07) |

### F06A.BIDASK Footprint · Bid × Ask
| Field | Certificate |
|---|---|
| **NAME** | Footprint · Bid × Ask · census `F06A.BIDASK` · owner `src/components/chart/FootprintControls.tsx` · plate WM_NewMockup_74_F06A_OrderFlow_On_Price |
| **MARKET QUESTION** | Inside this candle, how much traded on the bid versus the ask at each price? |
| **EVIDENCE** | Sided prints inside each bar. (needs SIDED_TAPE) |
| **TRUTH CLASS** | FULL: Every print carries a stated aggressor side — the marks are measured, not estimated. · PARTIAL: Sides are inferred (quote test or tick rule) — the read is labelled inferred and only covers bars since the tape arrived. |
| **MANIFESTATION** | CONTINUOUS |
| **PHYSICAL GRAMMAR** | Each candle split into price rows with bid and ask volume. |
| **STATE GRAMMAR** | Read bottom to top: heavy ask volume at a bar's low (that held) is absorption; one side owning several rows is initiative. |
| **COLOR** | `FOOTPRINT_SIDE` |
| **OPACITY** | LIVE (ceiling 1), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / QUIET / SPEAK |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Footprint cell — bid vs ask volume at this price inside the bar. |
| **DEGRADED** | No sided tape — it stays silent rather than guess sides from candle colour. |
| **RECEIPTS** | `footprint`, `footprintForm`, `footprintBars`, `imbalanceRows` |
| **CANON** | F06A Order flow on price |
| **SERVING PROOF** | Footprint mode `bid-ask` — no serving read of this mode in this file |
| **STATUS** | **PARTIAL** — missing: A serving read of the bid × ask cells on a sided market · now **PROVED** — **UPDATE 02:29 CDT (serving `69fb204`, own tab, read-only):** NQ1! 5m `scene=clean&on=fp:bid-ask` → `footprint=bid-ask`, `footprintForm=CELLS`, `footprintBars=2`, `footprintRows=4`, badges ABOVE_BARS. Only bars with sided rows draw (2 on camera). Erasure / phone read still to do |

### F06A.AGGPAS Aggressive / Passive
| Field | Certificate |
|---|---|
| **NAME** | Aggressive / Passive · census `F06A.AGGPAS` · owner `src/components/chart/FootprintControls.tsx` · plate — (none) |
| **MARKET QUESTION** | Who was aggressive and who was passive here? |
| **EVIDENCE** | Sided prints; passive roles are inferred from location. (needs SIDED_TAPE) |
| **TRUTH CLASS** | FULL: Every print carries a stated aggressor side — the marks are measured, not estimated. · PARTIAL: Sides are inferred (quote test or tick rule) — the read is labelled inferred and only covers bars since the tape arrived. |
| **MANIFESTATION** | CONTINUOUS |
| **PHYSICAL GRAMMAR** | Cells marked by aggressor side, with passive side as a labelled proxy. |
| **STATE GRAMMAR** | Aggressor side is observed; the passive role is an inference, never a resting-order observation. |
| **COLOR** | `FOOTPRINT_SIDE` |
| **OPACITY** | LIVE (ceiling 1), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / QUIET / SPEAK |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Aggressive/passive — observed aggressor, inferred passive side. |
| **DEGRADED** | No sided tape — it stays silent rather than guess sides from candle colour. |
| **RECEIPTS** | `footprint`, `footprintForm`, `footprintBars` |
| **CANON** | F06 evidence ladder |
| **SERVING PROOF** | Footprint mode `aggressive-passive` — no serving read in this file |
| **STATUS** | **PARTIAL** — missing: A serving read of the mode, including the passive-side proxy label · now **PROVED** — **UPDATE 02:29 CDT (serving `69fb204`, own tab, read-only):** NQ1! 5m `scene=clean&on=fp:aggressive-passive` → `footprint=aggressive-passive`, `footprintForm=TRAIL`, `footprintRings=11`, `footprintBars=2`. Only bars with sided rows draw (2 on camera). Erasure / phone read still to do |

### F06A.VOL Volume per candle
| Field | Certificate |
|---|---|
| **NAME** | Volume per candle · census `F06A.VOL` · owner `src/components/chart/FootprintControls.tsx` · plate — (none) |
| **MARKET QUESTION** | Where inside each candle did volume trade? |
| **EVIDENCE** | Prints inside each bar. (needs SIDED_TAPE) |
| **TRUTH CLASS** | FULL: Every print carries a stated aggressor side — the marks are measured, not estimated. · PARTIAL: Sides are inferred (quote test or tick rule) — the read is labelled inferred and only covers bars since the tape arrived. |
| **MANIFESTATION** | CONTINUOUS |
| **PHYSICAL GRAMMAR** | Small horizontal volume bars inside each candle. |
| **STATE GRAMMAR** | The widest row is the bar's own POC — where its business was done. |
| **COLOR** | `VP_PALETTE` |
| **OPACITY** | LIVE (ceiling 1), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / QUIET / SPEAK |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Per-candle volume — where this bar did its business. |
| **DEGRADED** | No sided tape — it stays silent rather than guess sides from candle colour. |
| **RECEIPTS** | `footprint`, `footprintForm`, `footprintBars` |
| **CANON** | F06A footprint |
| **SERVING PROOF** | Footprint mode `volume-profile` — no serving read in this file |
| **STATUS** | **PARTIAL** — missing: A serving read of the per-candle volume rows · now **PROVED** — **UPDATE 02:29 CDT (serving `69fb204`, own tab, read-only):** NQ1! 5m `scene=clean&on=fp:volume-profile` → `footprint=volume-profile`, `footprintForm=HISTOGRAM`, `footprintRows=4`, `footprintBars=2`. Only bars with sided rows draw (2 on camera). Erasure / phone read still to do |

### F06A.DELTA Delta Bubbles
| Field | Certificate |
|---|---|
| **NAME** | Delta Bubbles · census `F06A.DELTA` · owner `src/components/chart/FootprintControls.tsx` · plate WM_NewMockup_74_F06A_OrderFlow_On_Price |
| **MARKET QUESTION** | Where in this bar did net buying or selling concentrate? |
| **EVIDENCE** | Sided prints. (needs SIDED_TAPE) |
| **TRUTH CLASS** | FULL: Every print carries a stated aggressor side — the marks are measured, not estimated. · PARTIAL: Sides are inferred (quote test or tick rule) — the read is labelled inferred and only covers bars since the tape arrived. |
| **MANIFESTATION** | EVENT |
| **PHYSICAL GRAMMAR** | Bubbles on the candle at the price zone, teal for net buying, purple for net selling. |
| **STATE GRAMMAR** | Bigger bubble = more net aggression. No sided print, no bubble. |
| **COLOR** | `FOOTPRINT_SIDE` |
| **OPACITY** | LIVE (ceiling 1), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SPEAK |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Delta bubble — net aggression in this price zone. |
| **DEGRADED** | No sided tape — it stays silent rather than guess sides from candle colour. |
| **RECEIPTS** | `deltaBubblesDrawn`, `deltaBubblesQuiet`, `deltaBubbleTop` |
| **CANON** | H-701B Delta bubbles |
| **SERVING PROOF** | Erasure second pass: `footprint=delta\|TRAIL`, delta bubbles readable by size + ink PASS |
| **STATUS** | **PROVED** |

### F06.STACK Stacked Imbalance
| Field | Certificate |
|---|---|
| **NAME** | Stacked Imbalance · census `F06.STACK` · owner `src/lib/marketData/viewModels/selectStackedImbalance.ts` · plate — (none) |
| **MARKET QUESTION** | Did one side keep out-trading the other for several prices in a row? |
| **EVIDENCE** | Sided prints at each price level. (needs SIDED_TAPE) |
| **TRUTH CLASS** | FULL: Every print carries a stated aggressor side — the marks are measured, not estimated. · PARTIAL: Sides are inferred (quote test or tick rule) — the read is labelled inferred and only covers bars since the tape arrived. |
| **MANIFESTATION** | EVENT |
| **PHYSICAL GRAMMAR** | A run of rungs on consecutive prices, with the stack's high and low. |
| **STATE GRAMMAR** | Three or more rungs stacked is initiative — a zone that often acts as support (buy stack) or resistance (sell stack) when revisited. |
| **COLOR** | `BRASS` |
| **OPACITY** | LIVE (ceiling 1), depth MICRO, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SPEAK |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Stacked imbalance — one side out-traded the other at consecutive prices. |
| **DEGRADED** | No sided tape — it stays silent rather than guess sides from candle colour. |
| **RECEIPTS** | `imbalanceStack`, `imbalanceRuns`, `imbalanceSlabs`, `imbalanceRunWords` |
| **CANON** | F06 Stacked Imbalance |
| **SERVING PROOF** | §1f: DRAWN (RUNS:1\|BARS:5) on NQ; NO_STACK on BTC (10 runs measured — correct silence). Erasure second pass: `imbalanceSlabs=1\|SELL:1` PASS |
| **STATUS** | **PROVED** — open item: Weak salience (erasure) |

### F06.DIV Delta Divergence
| Field | Certificate |
|---|---|
| **NAME** | Delta Divergence · census `F06.DIV` · owner `src/lib/marketData/viewModels/selectDeltaDivergence.ts` · plate — (none) |
| **MARKET QUESTION** | Did price and buying/selling pressure disagree at the last swings? |
| **EVIDENCE** | Cumulative delta from sided prints, compared at swing pivots. (needs SIDED_TAPE) |
| **TRUTH CLASS** | FULL: Every print carries a stated aggressor side — the marks are measured, not estimated. · PARTIAL: Sides are inferred (quote test or tick rule) — the read is labelled inferred and only covers bars since the tape arrived. |
| **MANIFESTATION** | EVENT |
| **PHYSICAL GRAMMAR** | The two swing pivots marked where price made a new extreme and cumulative delta did not. |
| **STATE GRAMMAR** | Higher high in price with a lower delta high = buyers did not back the new high. The reverse at lows = sellers did not back the new low. |
| **COLOR** | `BONE`, `BRASS` |
| **OPACITY** | LIVE (ceiling 1), depth MICRO, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SPEAK |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Delta divergence — price and aggression disagreed between these two swings. |
| **DEGRADED** | No sided tape — it stays silent rather than guess sides from candle colour. |
| **RECEIPTS** | `deltaDivergence`, `deltaDivergenceLean`, `deltaDivergenceTag` |
| **CANON** | F06 CVD / delta relationship |
| **SERVING PROOF** | §1f: DRAWN (lean DOWN) on NQ, DRAWN on BTC. Erasure second pass: SILENT (NO_SWING, correct silence) |
| **STATUS** | **PROVED** — open item: No erasure read while it was drawn |

### F04A Causal marks on the event (Force → Response, Unpaid Evidence Debt)
| Field | Certificate |
|---|---|
| **NAME** | Causal marks on the event (Force → Response, Unpaid Evidence Debt) · census `F04A` · owner `src/lib/marketData/viewModels/selectPrintResponse.ts` · plate WM_NewMockup_70_F04A_Causal_Marks · WM_NewMockup_119_F06_Force_Response_Same_Print |
| **MARKET QUESTION** | Did this big print actually move the market its way? |
| **EVIDENCE** | One selected per-trade print (Big Trades on) and the closed bars after it; the yardstick is the median bar range of the bars BEFORE the print. (needs PRINTS) |
| **TRUTH CLASS** | FULL: The print's side is stated by the venue and every response bar has closed. · PARTIAL: Response bars still forming — the verdict reads PENDING and shows what has printed so far. |
| **MANIFESTATION** | EVENT |
| **PHYSICAL GRAMMAR** | On the selected print only: a force mark at its time and price, then the response bars marked FOLLOWED / FADED / MUTED, with the evidence debt counting closed response bars (0/3 … 3/3). |
| **STATE GRAMMAR** | FOLLOWED = moved at least one median range with the force, more than against it. FADED = the same against it. MUTED = neither. PENDING until the response bars have closed — a forming bar is never graded. |
| **COLOR** | `BRASS`, `BONE` |
| **OPACITY** | no attention tier (not governed — §11c gap 3) |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SPEAK |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Force → response — what price did after this print, with and against it. |
| **DEGRADED** | No per-trade prints on this market — there is no print to select, so nothing is marked. |
| **RECEIPTS** | `printResponse` |
| **CANON** | F04A Causal marks · H-701 Force → Response (the print-response owner) |
| **SERVING PROOF** | Census glass note 2026-10-01 (MNQ 1m): FORCE (AGGRESSIVE SELL) → UNPAID EVIDENCE DEBT 0/3 … 2/3 → RESPONSE (FADED · REVERSED); Inspect OUTCOME UNKNOWN until the response bars closed |
| **STATUS** | **PROVED** — open item: Not re-read in Garden 19 |

### F08A Liquidity Lifecycle
| Field | Certificate |
|---|---|
| **NAME** | Liquidity Lifecycle · census `F08A` · owner `src/lib/marketData/viewModels/selectLiquidityLifecycle.ts` · plate WM_NewMockup_78_F08A_Liquidity_Lifecycle |
| **MARKET QUESTION** | Where did volume pool — and what happened to each pool since? |
| **EVIDENCE** | Traded volume at price over time. (needs VOLUME) |
| **TRUTH CLASS** | FULL: Built from prints at price. · PARTIAL: Built from bar volume — stages coarser, labelled. No resting-book depth is claimed. |
| **MANIFESTATION** | EVENT |
| **PHYSICAL GRAMMAR** | Pool bands at price with stage markers: appeared, grew, persisted, touched, refilled, consumed. |
| **STATE GRAMMAR** | A pool that refills after a touch is being defended; a consumed pool is gone. It never claims spoofing from volume alone. |
| **COLOR** | `BRASS` |
| **OPACITY** | SUPPORTING (ceiling 0.85), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / QUIET |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Liquidity pool — where volume collected, and its life since. |
| **DEGRADED** | No traded volume — no pools. |
| **RECEIPTS** | `liquidityLifecycle`, `liquidityLifecycleBasis`, `liquidityLifecyclePainted`, `liquidityLifecycleBirths` |
| **CANON** | F08 Liquidity Lifecycle |
| **SERVING PROOF** | §1f: CANDLE_ESTIMATED (NQ, SPY), pull refused without depth; APPEARED ×3 (BTC); NO_VOLUME on EURUSD. Erasure second pass: `APPEARED,APPEARED`, `Painted=2/2` |
| **STATUS** | **PARTIAL** — missing: Erasure PARTIAL (salience / state): two tiny marks at the newest bar; full pull / refill needs depth (Map §8) |

### F06.ANATOMY Anatomy Cards (absorption / exhaustion metrics)
| Field | Certificate |
|---|---|
| **NAME** | Anatomy Cards (absorption / exhaustion metrics) · census `F06.ANATOMY` · owner `src/lib/marketData/viewModels/selectAnatomyCards.ts` · plate WM_Transformation_UI_19_Absorption_Anatomy_Alternate |
| **MARKET QUESTION** | What exactly measured the latest absorption and exhaustion? |
| **EVIDENCE** | The absorption and exhaustion readings. (needs VOLUME) |
| **TRUTH CLASS** | FULL: Both readings measured from real volume and prints. · PARTIAL: Bar volume only — candidate metrics, labelled. |
| **MANIFESTATION** | EVENT |
| **PHYSICAL GRAMMAR** | Key metrics side by side, each tied to the candles it measured. |
| **STATE GRAMMAR** | Compare effort and displacement for each — the card points at the bars it is about. |
| **COLOR** | `BRASS`, `TRADE_SIDE` |
| **OPACITY** | SUPPORTING (ceiling 0.85), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SPEAK |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Anatomy card — the metrics behind this event. |
| **DEGRADED** | No traded volume — no cards. |
| **RECEIPTS** | `anatomyCards`, `anatomySelected`, `anatomyCardsLayout` |
| **CANON** | F06 · H-701A (market anatomy, never bodies) |
| **SERVING PROOF** | Erasure second pass: SILENT (`AT_REST`) — painted only for a selection |
| **STATUS** | **PARTIAL** — missing: A serving read with an absorption / exhaustion selected and its card drawn |

### G19.WISDOM Cross-candle wisdom line
| Field | Certificate |
|---|---|
| **NAME** | Cross-candle wisdom line · census `G19.WISDOM` · owner `src/lib/chart/crossCandleWisdom.ts` · plate — (none) |
| **MARKET QUESTION** | Across the last candles, what is the one thing the evidence says? |
| **EVIDENCE** | Only readings already switched on and drawn: Delta Keel, Effort → Response, Value Migration. (needs OTHER_LAYERS) |
| **TRUTH CLASS** | FULL: Its source readings are on and drawn. · PARTIAL: Some sources are off — the line speaks only from the ones that are on. |
| **MANIFESTATION** | EVENT |
| **PHYSICAL GRAMMAR** | One quiet line near the top of the chart, tied by a hairline to the bar it is about. |
| **STATE GRAMMAR** | SELL AGGRESSION FAILED TO DISPLACE, EFFORT INCREASING — RESPONSE WEAKENING, VALUE MIGRATING HIGHER. No line means no reading proved one. |
| **COLOR** | `BONE` |
| **OPACITY** | SUPPORTING (ceiling 0.85), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SPEAK |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Wisdom line — the one sentence the drawn evidence supports. |
| **DEGRADED** | No source reading on this market (spot FX has no volume or sides) — it stays silent. |
| **RECEIPTS** | `crossCandleWisdom`, `crossCandleWisdomTier`, `crossCandleWisdomTrace` |
| **CANON** | F17 Cross-candle wisdom · Garden 19 §17 |
| **SERVING PROOF** | Erasure second pass: `SILENT:NO_EVIDENCE_OBJECT` (correct silence) |
| **STATUS** | **PARTIAL** — missing: A serving read of a drawn wisdom line traced to its source readings |

### F06.BIDASK_PROFILE Bid/Ask Split Profile (#11)
| Field | Certificate |
|---|---|
| **NAME** | Bid/Ask Split Profile (#11) · census `F06.BIDASK_PROFILE` · owner `src/lib/marketData/viewModels/selectProfileMenu.ts` · plate WM_A_P110_LIVING_PROFILE_STACK |
| **MARKET QUESTION** | At each price in a range I choose, who was the aggressor — buyers or sellers? |
| **EVIDENCE** | Prints that state which side crossed the spread. (needs SIDED_TAPE) |
| **TRUTH CLASS** | FULL: Every print carries a stated aggressor side — the marks are measured, not estimated. · PARTIAL: Sides are inferred (quote test or tick rule) — the read is labelled inferred and only covers bars since the tape arrived. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | A box you drag across bars; inside it, each price row splits into a buy side and a sell side. |
| **STATE GRAMMAR** | A row leaning to one side shows who pressed at that price. Heavy selling into a row that held is absorption; one side owning a run of rows is initiative. |
| **COLOR** | `DVP_SIDE` |
| **OPACITY** | no attention tier (not governed — §11c gap 3) |
| **DEPTH** | not in the permission table (a trader-drawn tool) |
| **NARROW** | KEEP — a drawing the trader placed — it has no row in the permission table, so the narrow-glass budget does not touch it |
| **ⓘ / FIRST TOUCH** | Bid/ask split — each row shows who was the aggressor at that price. |
| **DEGRADED** | No sided tape — it stays silent rather than guess sides from candle colour. |
| **RECEIPTS** | none written |
| **CANON** | P-110 #11 Bid/Ask Split Profile · only where evidence supports side |
| **SERVING PROOF** | A drag tool (`drawingTool === "delta-vp"`) — not URL-provable (§1f) |
| **STATUS** | **PARTIAL** — missing: A hands-on drag receipt on a sided market |

### F06.DLEVELS Delta Levels
| Field | Certificate |
|---|---|
| **NAME** | Delta Levels · census `F06.DLEVELS` · owner `src/lib/marketData/viewModels/selectDeltaLevels.ts` · plate — (none) |
| **MARKET QUESTION** | At which real prices did one side cross the spread hardest? |
| **EVIDENCE** | Sided prints at each traded level. (needs SIDED_TAPE) |
| **TRUTH CLASS** | FULL: Every print carries a stated aggressor side — the marks are measured, not estimated. · PARTIAL: Sides are inferred (quote test or tick rule) — the read is labelled inferred and only covers bars since the tape arrived. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | Rungs at the real traded prices, sized by net aggressor delta. |
| **STATE GRAMMAR** | The biggest rung shows where aggression concentrated. A big buy rung that price then fell through is aggression that failed. |
| **COLOR** | `BONE`, `BRASS` |
| **OPACITY** | LIVE (ceiling 1), depth MICRO, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SPEAK |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Delta level — net aggression at this real price. |
| **DEGRADED** | No sided tape — it stays silent rather than guess sides from candle colour. |
| **RECEIPTS** | `deltaLevels`, `deltaLevelsLane`, `deltaLevelsRungs`, `deltaLevelsCaption` |
| **CANON** | F06 delta evidence ladder |
| **SERVING PROOF** | §1f: DRAWN (RIGHT_EDGE lane) on NQ and BTC; NO_MEASURED_GRID on SPY / EURUSD. Erasure second pass: `Lane=LEFT_EDGE`, `Rungs=7` |
| **STATUS** | **PARTIAL** — missing: Erasure PARTIAL (sign): every rung is one ink — buy vs sell needs the caption |

### H-801 Expected Envelope + Analogue Surprise
| Field | Certificate |
|---|---|
| **NAME** | Expected Envelope + Analogue Surprise · census `H-801` · owner `src/lib/marketData/viewModels/selectExpectedEnvelope.ts` · plate WM_NewMockup_120_F03_Expected_Envelope_Surprise |
| **MARKET QUESTION** | How far does this market usually travel from the open — and is today unusual? |
| **EVIDENCE** | Recent completed sessions. (needs PRICE) |
| **TRUTH CLASS** | FULL: Enough completed sessions to count. · PARTIAL: Few sessions — counts shown, read with care. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | The typical reach above and below the open, with how many sessions went as far as today. |
| **STATE GRAMMAR** | Price at the envelope edge with few sessions reaching further = an unusual day. Inside = ordinary. |
| **COLOR** | `BRASS` |
| **OPACITY** | SUPPORTING (ceiling 0.85), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = SPEAK / SPEAK / SILENT |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Expected envelope — the usual reach from the open. |
| **DEGRADED** | No completed sessions — no envelope. |
| **RECEIPTS** | `expectedEnvelope`, `expectedEnvelopeFan`, `expectedEnvelopeSurprise`, `expectedEnvelopeSurpriseForm` |
| **CANON** | H-801 Expected Envelope + Analogue Surprise |
| **SERVING PROOF** | §1f: UP 10/10 · INSIDE (NQ); UP 1/10 · ABOVE:1/9 (SPY); UP 5/5 · DN 2/5 (EURUSD); TOO_FEW_SESSIONS (BTC) |
| **STATUS** | **PROVED** — open item: The surprise state exists but has no mark on the live event (C-15) |

### F10 MTF Ancestry (higher-timeframe objects on this camera)
| Field | Certificate |
|---|---|
| **NAME** | MTF Ancestry (higher-timeframe objects on this camera) · census `F10` · owner `src/lib/marketData/viewModels/selectMtfAncestry.ts` · plate — (none) |
| **MARKET QUESTION** | What do the higher timeframes say about where price came from? |
| **EVIDENCE** | This chart's bars, resampled to 4H, 1H and daily. (needs PRICE) |
| **TRUTH CLASS** | FULL: Enough bars loaded to resample every timeframe. · PARTIAL: Too few bars for one timeframe — that one is named silent. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | On this chart: the 4H body price grew from, the last hour's volume node, the prior day's nearest high or low. |
| **STATE GRAMMAR** | Price above its 4H band is building on it; a return into it is a test of the parent. PDH/PDL are the day's shelves. |
| **COLOR** | `LINEAGE` |
| **OPACITY** | SUPPORTING (ceiling 0.85), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = QUIET / SPEAK / QUIET |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Higher-timeframe ancestry — the parent structure under this price. |
| **DEGRADED** | No bars — nothing to resample. |
| **RECEIPTS** | `mtfAncestry`, `mtfAncestryPainted` |
| **CANON** | T-210 / F10 MTF ancestry (same camera) |
| **SERVING PROOF** | §1f: PDH + 4H band + 1H node (NQ, SPY); PDL + 4H (EURUSD, BTC). Erasure second pass: `BAND:4H … INSIDE`, node |
| **STATUS** | **PARTIAL** — missing: Erasure PARTIAL — the parent timeframe is words-only |

### F11A Market Object on chart
| Field | Certificate |
|---|---|
| **NAME** | Market Object on chart · census `F11A` · owner `src/lib/marketData/viewModels/selectStructureZoneObjects.ts` · plate WM_NewMockup_84_F11A_Object_On_Chart · WM_NewMockup_137_Object_Kinds_Shared_Passport_Slots |
| **MARKET QUESTION** | Where did price leave fast from a confirmed swing, and is that zone still standing? |
| **EVIDENCE** | Confirmed swing pivots from the one structure owner and the closed bars since; no volume is needed. (needs PRICE) |
| **TRUTH CLASS** | FULL: Built from the loaded closed bars — nothing more is needed. · PARTIAL: Too few bars to confirm a swing — no zone is drawn until the pivot is confirmed. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | A zone band on price: swing low → DEMAND zone over that bar's low–high, swing high → SUPPLY zone; its name and state sit beside it in a clear slot. |
| **STATE GRAMMAR** | A zone is tested when price trades into it, defended when it holds, and invalid on a close through it (below a demand zone, above a supply zone). SWEPT · STILL VALID means a wick ran it without a closing break. |
| **COLOR** | `BRASS` |
| **OPACITY** | LIVE (ceiling 1), depth MID, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / QUIET |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Supply / demand zone — where price left fast; its passport shows tests, defence and whether it is consumed. |
| **DEGRADED** | No bars — nothing to read. |
| **RECEIPTS** | `marketZones`, `marketZoneSelected` |
| **CANON** | F11A Market object on chart (the swing-origin zone owner + the zone lifecycle owner) |
| **SERVING PROOF** | Sheriff A1 / A9 (aeb83c9, fbc999b): "SUPPLY ZONE · SWEPT · STILL VALID · 2 TESTS" seated above its zone clear of every body and wick; "DEMAND ZONE · DEFENDED · 1 TEST" below its zone (GC1! 5m, 1180) |
| **STATUS** | **PROVED** — open item: No erasure read of the zone body itself |

### H-1001 Risk on Price + Frozen Receipt
| Field | Certificate |
|---|---|
| **NAME** | Risk on Price + Frozen Receipt · census `H-1001` · owner `src/lib/marketData/viewModels/selectRiskOnPrice.ts` · plate WM_NewMockup_96_F17A_Risk_On_Price · WM_NewMockup_127_F20_Receipt_Frozen_asOf |
| **MARKET QUESTION** | Where is my stop, entry and target — and how far is price from my stop? |
| **EVIDENCE** | A position you draw on the chart. (needs YOUR_PLAN) |
| **TRUTH CLASS** | FULL: Your drawn plan and a live price. · PARTIAL: Price is delayed — the distance to stop trails the market. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | Your plan bracketed on the price axis: stop, entry, target, R, and live price against the stop. |
| **STATE GRAMMAR** | Distance to stop in R is your live risk. Nothing here places an order. |
| **COLOR** | `RISK_REWARD` |
| **OPACITY** | CHROME (ceiling 1), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = SPEAK / SPEAK / SPEAK |
| **NARROW** | KEEP — in NARROW_GLASS_KEEPS_WORDS — it keeps its words below 600px |
| **ⓘ / FIRST TOUCH** | Risk on price — your stop, entry and target on the axis. |
| **DEGRADED** | No plan drawn — nothing to bracket. |
| **RECEIPTS** | `riskOnPrice`, `riskOnPriceTicks`, `riskOnPriceSilence` |
| **CANON** | F17 Risk on Price · H-1001 |
| **SERVING PROOF** | §1f: NO_POSITION_DRAWN (correct silence) |
| **STATUS** | **PARTIAL** — missing: A serving read with a position drawn — on a paper position, never the Founder's live account |

### H-401 Contradiction not averaged
| Field | Certificate |
|---|---|
| **NAME** | Contradiction not averaged · census `H-401` · owner `src/lib/marketData/viewModels/selectContradiction.ts` · plate WM_NewMockup_124_F14_Contradiction_Not_Averaged |
| **MARKET QUESTION** | Do my tools disagree at this price? |
| **EVIDENCE** | Two or more switched-on reading families. (needs OTHER_LAYERS) |
| **TRUTH CLASS** | FULL: Both families have full evidence. · PARTIAL: One side is a candidate — named in Inspect. |
| **MANIFESTATION** | TERRITORY |
| **PHYSICAL GRAMMAR** | Where families disagree at price, both truths paint and the zone reads unresolved. |
| **STATE GRAMMAR** | Unresolved means wait or reduce — the two cases are never averaged into one score. |
| **COLOR** | `BONE` |
| **OPACITY** | SUPPORTING (ceiling 0.85), depth —, light — |
| **DEPTH** | FAR / MID / NEAR = SILENT / SPEAK / SPEAK |
| **NARROW** | SIMPLIFY — below 600px every SPEAK becomes QUIET: geometry kept, words withheld, alpha capped at 0.6 (the selected item still speaks) |
| **ⓘ / FIRST TOUCH** | Contradiction — two readings disagree here; both shown, never averaged. |
| **DEGRADED** | Fewer than two families on — nothing to contradict. |
| **RECEIPTS** | `contradiction`, `contradictionGeometry`, `contradictionPlaced`, `contradictionWords` |
| **CANON** | H-401 Contradiction Not Averaged |
| **SERVING PROOF** | §1f: NOT_ENOUGH (NQ, SPY, EURUSD), UNRESOLVED 1/2 (BTC). Erasure second pass: SILENT |
| **STATUS** | **PARTIAL** — missing: A serving read with both truths painted at one price |

## 13. §62 RELEASE EVIDENCE — FVG slice, keyed to the Founder’s bullets (2026-10-08 07:09 CDT)

**§62 bullets, verbatim from the Founder's order** (saved here so the next session has them):

> canonical definition; DEFINITION_ID/version; deterministic tests; bullish examples; bearish examples; partial mitigation; full mitigation; rejection; acceptance; invalidation; aging; Memory; replay AS-OF-TIME test; no future leakage; evidence degradation; desktop glass; tablet landscape; tablet portrait; phone glass; Inspect; education; Academy link; SpaidBot explanation; Backtest consistency; Scanner consistency where shipped; Journal/Review consistency where shipped; performance evidence; deployment/version; SHA; remaining limitations

**Proof files** (all in `~/wm-held/proof/`):
- **M** = `fvg-serving-matrix-2026-10-07.txt`
- **I** = `fvg-serving-inspect-replay-sizes-2026-10-07.txt`
- **O** = `fvg-serving-opacity-a6-2026-10-07.txt`
- **S** = `fvg-serving-spaidbot-academy-backtest-2026-10-07.txt`
- **N** = `fvg-serving-night-2026-10-07.txt`

**Tests:** `fvgEngine.test.ts` sections A–G. The 30 FVG test files run **268 / 268 green** at 07:08 CDT on `c104669`.

| # | §62 bullet | Evidence (proof · build) | Status / missing |
|---|---|---|---|
| 1 | canonical definition | `src/lib/marketData/fvg/fvgDefinition.ts` (the law); `docs/operations/FVG-METHODOLOGY.md` (human copy); §5 certificate | PROVED |
| 2 | DEFINITION_ID / version | `FVG_DEFINITION_ID = "FVG_3C"`, `FVG_DEFINITION_VERSION = 1`; OBJECT_ID carries `v1`. Serving receipt `DEF:FVG_3C@1` (M · `eea2771`; N · `c02c2d4`) | PROVED |
| 3 | deterministic tests | `fvgEngine.test.ts` A–G, including the seeded random walk (incremental == full scan, as-of == truncated scan); 30 FVG files, 268 / 268 at 07:08 on `c104669` | PROVED |
| 4 | bullish examples | test A "BULLISH: low(b3) > high(b1)…"; serving: NQ1! 5m bullish gap selected `…\|BULLISH\|v1\|REJECTED` (N · `c02c2d4`, 1180); SPY bullish band in Replay (N · `c02c2d4`) | PROVED |
| 5 | bearish examples | test A "BEARISH…", test C "BEARISH mirror"; serving: ES1! 5m `…\|BEARISH\|v1\|REJECTED` (I · `301d85d`); NQ1! 834 and SPY bearish selected (N · `c02c2d4`) | PROVED |
| 6 | partial mitigation | test C "PARTIALLY_MITIGATED (< 50 %)…"; serving: scanner PARTIAL_MITIGATION / DEEP_MITIGATION conditions among the 14 hits (§6a · `eea2771`); SpaidBot's answer read interactions at 39 % / 2 % / 52 % (§6a · `bf5052b`) | PROVED |
| 7 | full mitigation | test C "FULLY_MITIGATED: a wick to the far edge without a close beyond it"; serving: Journal snapshot read now = "fully mitigated … deepest 100 %, no unvisited territory" (§6a · `eea2771`) | PROVED |
| 8 | rejection | tests C "REJECTED…" (+ window, + not after full); serving: selected gaps in state REJECTED (I · `301d85d` ES1!; N · `c02c2d4` NQ1!) | PROVED |
| 9 | acceptance | test C "ACCEPTED: two consecutive closes inside"; Academy lesson 9 | **PARTIAL:** no serving read of an object in state ACCEPTED (acceptance fill + inner line on glass) · **UPDATE 07:11:** serving `c104669`, Backtest FVG study, NQ1! 5m (07:10–07:11 CDT, own tab, read-only, localStorage byte-identical): "Accepted inside 29 of 143 (20 %)" — the engine produces ACCEPTED on real serving data. Still missing: the acceptance fill + inner line read on glass · **UPDATE 07:40 (reads 07:23–07:38 CDT) → acceptance on glass PROVED** (serving `c104669`, own tab, read-only; NQ1! 5m `scene=clean&on=fvg&select=fvg:FVG\|TASTYTRADE:/NQZ26:XCME\|5m\|1791310800000\|BEARISH\|v1` — the one gap in the 996-bar serving history whose core state is ACCEPTED, found by running the engine on `/api/yahoo` bars): `fvgSelected …\|MEMORY`, `fvgSelectedMark FRAME:GOLD`, `fvgDrawn 3\|LIVE:2\|SCAR:0\|MEMORY:1` after panning the camera to 2026-10-06. Paint calls for the selected band: accepted fill `rgba(239,68,68,0.05)` (0.13 × memory age 0.3, held at the 0.05 floor), inner line `0.094` at 1 px, edges `0.224` at 1.5 px solid. Canvas pixels (band rows 225–233): the inner line row 229 = round((225+233)/2) reads alpha 47 against 26–27 for the fill rows. Inspect: "Memory — aged out of the live view; kept, never deleted", interaction 1 "accepted" |
| 10 | invalidation | test C "TRADED_THROUGH: a close beyond the far edge…; the lifecycle stops"; serving: scars counted on every row (`SCARS:3`; M · `eea2771`) | **PARTIAL:** scars include fully-mitigated gaps — no serving read names a single object in state TRADED_THROUGH with its dashed far edge · **UPDATE 07:11:** serving `c104669`, Backtest FVG study, NQ1! 5m (07:10–07:11 CDT, own tab, read-only, localStorage byte-identical): "Closed through the far edge 132 of 147 (90 %)"; the gap list names rows "traded through". Still missing: the dashed far edge read on glass · **UPDATE 07:40 (reads 07:23–07:38 CDT) → dashed far edge PROVED** (serving `c104669`, own tab, read-only): `select=fvg:FVG\|TASTYTRADE:/NQZ26:XCME\|5m\|1791458400000\|BULLISH\|v1` → `fvgSelected …\|TRADED_THROUGH`, `data-proof-select-object …\|HELD`, `FRAME:GOLD`; Inspect "traded through — a close beyond the far edge (invalidated)". Paint call: `setLineDash([3,3])` stroke in the selected bullish ink at 1.5 px. Canvas pixels on the far-edge rows 474–475: `GGGoooGGG` (3 on, 3 off); the near edge row 470 is solid. Unselected traded-through scars stroke dashed at 0.1 |
| 11 | aging | test F "a live gap with no interaction for 300 bars becomes MEMORY…", "a scar becomes MEMORY 20 bars after…"; serving: aged opacity rungs (O · `f96618c`), `fvgMemory:MEMORY:0.44` tier | PROVED |
| 12 | Memory | test F (comes straight back on a touch); visibility budget `HIDDEN:n` counted, never deleted (M · `eea2771`) | **PARTIAL:** `fvgDrawn …\|MEMORY:0` on every serving read — no MEMORY-state object was drawn on glass · **UPDATE 07:11:** serving `c104669`, Backtest FVG study, NQ1! 5m (07:10–07:11 CDT, own tab, read-only, localStorage byte-identical): the gap list names rows "memory" — MEMORY objects exist on serving data. Still missing: a MEMORY object drawn on glass · **UPDATE 07:40 (reads 07:23–07:38 CDT) → MEMORY drawn on glass PROVED** (serving `c104669`, own tab, read-only): `select=fvg:FVG\|TASTYTRADE:/NQZ26:XCME\|5m\|1791450900000\|BEARISH\|v1` (a Backtest "memory" row, chart-feed id) → `fvgDrawn 10\|LIVE:6\|SCAR:3\|MEMORY:1`, `fvgSelected …\|MEMORY`, `FRAME:GOLD` at canvas (1120,361) 23×12. Inspect "Memory — aged out of the live view; kept, never deleted". **By design a MEMORY gap paints only when selected** (`selectFvgVisibility` puts MEMORY in `hidden.memory`, never in the open/scar budget) — so `MEMORY:0` on an unselected chart is correct, not a defect |
| 13 | replay AS-OF-TIME test | test G-core "as-of at every bar equals a scan…"; `fvgCamera.test.ts`; serving: cursor 4857 / 4977 `REPLAY:…\|LEAK:0`, a later-born object drops out (I · `301d85d`); stepping 4880 → 4882 LEAK:0 at 1180 and 834 (N · `c02c2d4`); §38 replay lifecycle test (birth → memory, no future state) shipped in `c02c2d4` | PROVED |
| 14 | no future leakage | test G-core "FUTURE-LEAK TEST…"; serving `fvgAsOf …\|LEAK:0` on all 16 matrix rows (M · `eea2771`), every size (I · `301d85d`), tablet (N · `c02c2d4`); Backtest clock at bar 501 (§6a · `eea2771`); Journal snapshot at b3 close (§6a) | PROVED |
| 15 | evidence degradation | test "evidence per sense — by reference, never upgraded"; serving: EURUSD price-only `OPEN:6\|SCARS:3` (M); Inspect "EVIDENCE COMPLETENESS DEGRADED" on a newest-bar SPY gap (N · `c02c2d4`); SpaidBot context ORDER_FLOW / DERIVATIVES SILENCE (S · `fabce3a`). Data-lane finding: EURUSD 1m point bars give 0 gaps (M) | PROVED |
| 16 | desktop glass | M · `eea2771` (16 rows); I · `301d85d` (1180); erasure second pass (bands survive) | PROVED |
| 17 | tablet landscape | N · `c02c2d4`: NQ1! + SPY 5m at 1180 × 820 — LEAK:0, clear zone held, tap → gold frame, Inspect inside, ⓘ → fvg-1, Replay | PROVED. **Missing:** touch-target size on a real tablet (the automation window is pointer:fine) |
| 18 | tablet portrait | N · `c02c2d4`: NQ1! + SPY 5m at 834 × 1112 — same set | PROVED. Same touch caveat |
| 19 | phone glass | I · `301d85d` (390: X:255 / NEWEST:267, cost 0.23 ms, zoom plate WITHHELD:NARROW); N · `d308c6c` (bands cut around the countdown pill) | PROVED |
| 20 | Inspect | I · `301d85d` (first touch, size in ticks, relationships by reference); N · `c02c2d4` (Inspect inside the pane at 1180 / 834); N · `6568fa3` (390: controls ≥ 44 px and named) | PROVED. Finding: 28 / 52 Inspect text leaves under 11 px at 390 |
| 21 | education | `CONCEPT_EDUCATION.FVG_IMBALANCE` (§32 sentence verbatim); serving: Tools → "fvg" → ⓘ preview → Academy (N · `c02c2d4`) | PROVED |
| 22 | Academy link | course PROVED on `4769a31` (63 / 63); "Show me on a chart" lands on painted territories for lessons 1, 6–10, 14, 15 (N · `14de5a0`, `6568fa3`); Replay link label (`1ec6083`) | PROVED. **Missing:** "Show me my examples" with real FVG-referenced journal entries |
| 23 | SpaidBot explanation | §6a · `14de5a0` Sixth Send: complete answer, `finishReason: STOP`, "price does not have to fill or respect this gap", no probability / score words; Ask from Inspect pre-filled, 0 requests (night receipt · `05670f2`) | PROVED |
| 24 | Backtest consistency | §6a · `eea2771` / `c4de0f0` (same engine, as-of clock, n of m, pooled, decimals); relationship splits INSUFFICIENT below 20 (S · `fabce3a`); provenance (`1ec6083`) | PROVED. **PARTIAL:** §21 n-of-m wording (`8cded3a`) not read on serving; bar-reader refusal for an unknown symbol not re-read |
| 25 | Scanner consistency where shipped | §6a · `eea2771` (five conditions, n of m, decimals); door HELD / HELD:EQUIVALENT (I · `301d85d`; N · `dae44b0` / `3f75f99`); convergence + request count (§6a · `fabce3a`); rows name their bars (`05670f2`) | PROVED. Finding: the strip and the chart read different feeds, so a lifecycle can differ — now said in words on the strip |
| 26 | Journal / Review consistency where shipped | Journal snapshot as of decision (§6a · `eea2771`); Review FVG answers + Personal Edge FVG splits on proof scenes (`bf5052b`, `c02c2d4`, `a4f411c`) | PROVED (snapshot; sample data). **Missing:** save → reload on a real entry (non-Founder test member) |
| 27 | performance evidence | paint MET: 0.23–1.10 ms (I · `301d85d`), 0.00–0.40 ms (N · `c02c2d4`); compute per closed bar; phone-class bench at CPU ×4: ~30 ms cold, 6–7 ms per closed bar (N); `fvgPerformance.sentinel.test.ts` | PROVED (bench). **Missing:** a signed-in read on a real phone |
| 28 | deployment / version | ship gate polls `/api/build-identity`; LIVE times in `GARDEN18-SUPER-ORDER-RECEIPT.md` (day, night and morning sections) | PROVED |
| 29 | SHA | FVG chain: `4769a31` → `c4de0f0` → `d6e2c18` → `eea2771` → `57e9fda` → `301d85d` / `8db9b21` → `683aecf` → `5475a8e` → `8e7beee` → `fabce3a` → `dae44b0` → `3f75f99` → `14de5a0` → `c02c2d4`; production at writing `c104669` (builtAt 11:44:07Z) | PROVED |
| 30 | remaining limitations | (a) ACCEPTED, TRADED_THROUGH and MEMORY states not individually read on serving (#9, #10, #12)<br>(b) real-tablet touch size (#17, #18)<br>(c) Journal save → reload and "Show me my examples" on real entries (#22, #26)<br>(d) §21 Backtest wording + refusal words (#24)<br>(e) real-phone compute (#27)<br>(f) EURUSD 1m point bars (data lane)<br>(g) Inspect text under 11 px at 390 (#20)<br>(h) the FVG layer ships default OFF (Founder decision) | — · **UPDATE 07:11:** (i) **new defect, 07:11:** the Backtest study's "Open on the chart →" for an NQ1! 5m "traded through" row (`FVG|NQ1!|5m|1791458400000|BULLISH|v1`, bar-route id) landed with `data-proof-select-object …|NONE_AVAILABLE` — the cross-feed door resolver that holds Scanner rows (`HELD:EQUIVALENT`, `dae44b0`) did not hold this Backtest row. Owner: FVG / backtest lane · **UPDATE 07:40:** (a) CLOSED — #9, #10, #12 read on glass. (i) **door defect diagnosed:** the NQ1! chart's ledger comes from two feeds that alternate between loads (tastytrade, 4999 bars, ids `FVG\|TASTYTRADE:/NQZ26:XCME\|…`; or the bar route, 995–996 bars, ids `FVG\|NQ1!\|…`). On `c104669` the door matches the EXACT id only, so a Backtest row holds only when the chart happens to load the bar-route feed. A fix (`resolveFvgDoorTarget` … `EQUIVALENT_FEED_ALIAS`, needs the door's territory) is in the tree, uncommitted, not LIVE — re-read after it ships. (j) **new, minor:** a selected gap at the left edge sits under the Inspect card (desktop 1920, card x 0–225); the card does not move the camera |

## 13. §35 SHERIFF RELEASE GATE — one row per line (serving `c104669`, 2026-10-08 07:04–07:13 CDT, Sheriff lane)

Walked on `https://wealthymindsetspro.com` with `/api/build-identity` = `c1046692`. Times from `date`. Probes ran in the Sheriff's own Chrome tab (signed in, `scene=clean`, nothing saved or pressed beyond view toggles) and in the desktop Browser pane (signed out, touch emulation).

| # | §35 line | Verdict | Receipt (what was read, where) |
|---|---|---|---|
| 1 | **Data true** | PASS | **BTC-USD:** five paired reads, glass vs `api.exchange.coinbase.com/products/BTC-USD/ticker` 07:07 CDT, e.g. glass 82288.77 against the same Coinbase print seen ~7 s earlier. Every glass value is a real Coinbase print; the lag is a background tab's timers. **SPY 07:09:** glass 774.38 −2.84 (−0.37%) vs Webull snapshot `trade_status PRE`, ext 774.33 / −2.89 against close 777.22. **ES1!** 7823.75 on a 0.25 tick. *Note:* the first SPY paint of a cold load showed header 777.14 "STALE PIPELINE" beside a legend reading 774.12. It is labelled stale and resolved within seconds, but two prices shared the glass for that moment. |
| 2 | **Inventions manifest** | PARTIAL | Dense scene `on=LivingProfile,fvg,deltaKeel,rvolTone,fp:big-trades`: receipts show `livingProfile DRAWN`, `fvg OPEN:6\|SCARS:3\|HIDDEN:54`, `bigTradeBubbleStatus DRAWN`. Standing gaps from §11c are unchanged (certificates, erasure coverage). The census now carries `manifestation` / `ink` / `narrow` fields (51 manifestation rows, `inventionCensus.ts:319+`). *Proof-token note:* only one `on=` parameter is honoured; several tools need `on=A,B,C`. |
| 3 | **Grammar distinct** | PARTIAL | `GARDEN19-ERASURE-TESTS.md`, full-registry re-run + uncovered set. PASS: Market Structure, Absorption, Brick Walls off-camera, selected print, selected bar, selected FVG (gold frame per commit `c02c2d4`; not re-proved on glass in this pass). PARTIAL: wall lifecycle (BORN outline), Derivatives Pressure sign, selected zone, NEAR numerals. ASK-11..15 routed. |
| 4 | **History where evidence supports it** | PASS | `on=deltaKeel` BTC 5m: `barDeltaKeels 15\|BASIS:TAPE16+SIDES0\|FAIL:3`. Keels exist only on bars the tape reaches; the forming bar is SILENT, and Inspect says why ("keels are drawn on finished bars"). |
| 5 | **Silence** | PASS | EURUSD + `on=LivingProfile`: `livingProfile NO_PROFILE`, no volume ink (erasure doc). Header reads "NO CENTRAL VOLUME · spot FX". The delta keel stays silent on the forming bar. |
| 6 | **Numbers** | PASS | EURUSD 5 dp (1.11857); BTC 2 dp; SPY 2 dp; ES 2 dp on a 0.25 tick. OHLC legend and header agree once loaded (row 1 note aside). |
| 7 | **Colour** | PASS (code) | Canon fidelity label set and tone map are locked by test (ruling A). `bannedClaims` + `marketingSurfaces.sentinel` are green in the suite. No new colour roles were found on today's walk. |
| 8 | **Opacity** | PASS | Dense scene receipt: `attentionTiers fvg:LIVE:1, fvgMemory:MEMORY:0.44, volumeField:SUPPORTING:0.75, …`; `attention D:MID\|POSTURE:QUIET`. `LAYER_ATTENTION` now holds 52 layers (§11c listed 16 ungoverned; recount owed by the chart lane). |
| 9 | **Typography** | PASS vs the 9 px DOM floor (`domTypeFloor.sentinel`) / OPEN vs 11 px | /charts 1568 wide: no DOM text under 9 px. At 9 px: wordmark tagline, masthead ROOMS / COMMUNITY. At 10 px: feed label line, OHLC legend. At 10.5 px: room tabs. **Ruling wanted:** does the 11 px floor (rulings 2026-10-07 for PRO / Paper P&L) extend to the masthead doors and the feed label line? |
| 10 | **Notes (ⓘ)** | PARTIAL | `inventionEducation.ts` covers the ⓘ set; §11c item 7 lists 7 built inventions with no ⓘ record. Not re-counted today. |
| 11 | **Inspect** | PARTIAL | BTC 5m: opens and names its evidence class, source and as-of. Two findings. **(a)** The copy told every user to "Hover a candle" — a touch screen has no hover. Fixed in-lane (`ChartInspectTicket.tsx`, `ChartEffortVsResult.tsx`): "With a mouse, hover a candle…". Tap-to-pick a past bar is a chart-lane ask (ChartsDashboard notes `cursorBar` is null for a touch user). **(b)** Inspect read "Lowered to DEGRADED: the feed is UNAVAILABLE · This chart has no live feed right now" while the room header read "LIVE — CERTIFIED QUOTE" and the price moved. Inspect's `feed` is `chartCanvasState.qualityState` (`useCanonicalMarketState(canvasIdentity)`); the header is the quote owner. One fact, two answers → ASK. |
| 12 | **Desktop / tablet / phone** | PARTIAL | **Phone, real coarse pointer:** Browser pane mobile emulation, `matchMedia('(pointer: coarse)')` = true, `(hover: none)` = true, 375×812, signed out. `/welcome` 0 of 11 controls under 44 px, `/pricing` 0/5, `/login` 0/14 ("Forgot password?" 93×45), `/legal` 0/7. Every gated route sends a signed-out visitor to `/login`. **Tablet:** the 834 / 1180 sweep (yesterday, emulated coarse) is shipped. **Not certified:** iOS Simulator — this Mac has **no iOS runtime installed** (`xcrun simctl runtime list` → 0 disk images), so no iPhone/iPad can boot. Installing one is a multi-GB Xcode component download (Founder-gated). The pane's tablet preset does not emulate touch. |
| 13 | **Forex** | PASS | EURUSD: "NO CENTRAL VOLUME · spot FX" and "RELATED FUTURES EVIDENCE · CME 6E · 5m signed Δ +9 →" (the §18 ask landed); 5 dp. |
| 14 | **Member data** | PASS | Signed out, GET on every non-dynamic broker/execution/journal/morning-prep route: 401 "Not authenticated" (webull ledger/balance/positions/orders/status, tastytrade ledger/accounts/positions/orders/chain/quote-token/market-data, broker status/readiness/journal-feed/certification/member, execution limits, alpaca-trading, decision-position, morning-prep growth-rings). POST-only routes answer 405 to GET; no POST was sent. |
| 15 | **SpaidBot authority** | PASS (code) | `/api/spaidbot` → `requireAuth` + per-user rate limit (`route.ts:93–100`). The system prompt forbids reading accounts, staging, submitting or cancelling orders, and emitting order tags (`route.ts` SYSTEM_PROMPT). `spaidbotProposal.test.ts` locks PROPOSE-only: size clamped to the server cap, no self-widening, refusal without Decision_ID / evidence. Signed out, the UI is unreachable. |

### 13a. Asks from this pass (to the coordinator / chart lane)
1. **ASK-17 · Inspect feed vs header.** `chartCanvasState.qualityState` = UNAVAILABLE while the quote owner says LIVE — CERTIFIED QUOTE (BTC-USD 5m, 07:11 CDT). Either the canonical store's feed state for `canvasIdentity` is stale, or the header overclaims. The canvas exposes no receipt of `qualityState`; add `data-quality-state` so a probe can prove which.
2. **ASK-18 · Tap-to-pick a past bar on touch.** Inspect and Effort follow the forming bar forever for a finger. A tap on a candle should pin it as `cursorBar` (a second tap releases), the way Options Flow marks and bubbles already pin on tap.
3. **ASK-19 · Cold-load SPY: two prices for a moment.** Header 777.14 STALE PIPELINE beside legend 774.12, with the same "+0.21 vs prior 5m bar" change attached to both.
4. **ASK-20 · Bubbles over the forming bar.** Dense scene, BTC 5m 07:10: a 24.2×44 big-trade bubble sits over the newest candles at the right edge (price sovereignty, §XIV).
5. **Ruling:** 11 px vs 9 px for the masthead doors and the feed label line (row 9).
6. **Founder:** install an iOS Simulator runtime (Xcode › Settings › Components) to certify real Safari touch at iPhone / iPad sizes.

## 14. §11 NUMBER-SOUP AUDIT — permanently visible numbers on the glass at default zoom (serving `c104669`, 2026-10-08 07:21–07:25 CDT, Sheriff lane)

**Method.** Default camera (`/charts?symbol=<S>&tf=5m&scene=clean`, MID, ~112 bars) at 1440×850. Counted every numeral string that stays on the glass with no hover, no selection and no panel open:
- DOM text inside `.wm-chart-market-pane`, visible by `checkVisibility()`;
- custom canvas text, caught by a `fillText` hook;
- the price and time axes, counted from the screenshot. The axis library draws from a text cache the hook does not see.

Panels (Decision card, Webull box, Market Breathing, Response Matrix, TED) are excluded — they sit beside the glass.

| | BTC-USD | SPY | NQ1! |
|---|---|---|---|
| Symbol row: price · change · % · O · H · L · NOW | 7 | 7 | 7 |
| DAY BIAS "% today" (repeats the row's %) | — (24H BIAS) | 1 | 1 |
| Bar status ("BAR OPENED 07:20 AM", countdown in the row) | 1–2 | 1 | 2 |
| Depth tag "112 bars" | 1 | 1 | 1 |
| `DECISION_ID wmd_9d1d…` under the depth tag | 0 | 0 | **1** |
| "Evidence saved · 16 symbols" | 1 | 1 | 1 |
| Zone chips ("1 TEST", "2 TESTS") | 2 | 2 | 2 |
| Countdown chip on the axis edge | 1 | 1 | 1 |
| Footer: "Vol …", "5m", opacity "100%" | 3 | 3 | 3 |
| **Subtotal off the axes** | **~17** | **~18** | **~19** |
| Price axis labels + last-price chip | 19 | 17 | 22 |
| Time axis labels | 8 | 8 | 7 |
| **Total permanently visible** | **~44** | **~43** | **~48** |

**Verdict.** The axes are the honest majority (≈60%). Off the axes, the market itself speaks in ~7 numbers; the remaining ~10 are chrome and receipts.

**Candidates for progressive disclosure** (show on hover / tap / Inspect, not permanently):
1. **NOW in the OHLC legend.** Same value as the symbol-row price at all times (BTC 82411.20 twice in one row). Drop NOW while the legend follows the live bar; keep it when the cursor walks history.
2. **DAY BIAS "−0.38% today"** repeats the symbol row's "(−0.38%)" eight words to its left (SPY, NQ). Say the bias word (SIDE / TREND) only.
3. **`DECISION_ID wmd_9d1d132a-1e65-48…`** on the NQ canvas, under the depth tag. The canon wants one Decision_ID per camera, but a raw UUID fragment is a machine receipt. Put it in Inspect / the Decision card; on the glass a "●" bound-mark or nothing. *(Chart lane — MainChart.tsx ~23210; needs a ruling, since it was added per canon.)*
4. **Depth tag "112 bars"** — a receipt of the camera. MID / NEAR / FAR is the reading; the count belongs to Inspect or hover.
5. **"Evidence saved · 16 symbols"** — a vault count on the glass; the chip can keep its dot and show the count when opened.
6. **Footer "Vol 0.121905 BTC"** — 6 decimals of the forming bar's volume. Show it at volume-display precision (e.g. 0.12 BTC), or only on hover.
7. **Opacity "100%"** in the footer chip row — a setting, not a market fact.

**Truth defect found while counting (not soup — numbers line, §35 row 6):**
- **ASK-21 · BTC header change stuck while the price moved.** Six reads 3 s apart, 07:22 CDT: the price went 82372.98 → 82396.88 and the change read "+28.24 (+0.03%) vs prior 5m bar" every time.
- Cause: `chartHeaderChangeFact` BAR_OVER_BAR is the last CLOSED bar's move (close − prior close; `deriveBarOverBarChange`), printed beside the LIVE ticker price. The row then reads "82396.88 is +28.24 vs the prior bar", which is false.
- When the price slot is the live quote, the delta must be live − last closed close (or the price slot must be the bar close, as on cold load: "LAST 5m BAR CLOSE").
- The same load also flipped the change kind between SESSION ("−1007.68 (−1.21%)", 07:05) and BAR_OVER_BAR ("+28.24", 07:20) on BTC.
- `ChartsDashboard.tsx:5882` is being edited by another lane right now, so this is routed rather than fixed.

## 15. §9 / §10 AUDIT — every tool's ⓘ and every selectable object's first touch (2026-10-08 08:10 CDT, cert lane)

**Method.**
- Registry read on the tree: an esbuild bundle of `inventionEducation.ts` checked every record for the eight fields (question, evidence, appears, how to read, FULL, PARTIAL, DEGRADED, first touch) and ran every selection kind through `educationIdForSelection` → `firstTouchFor`.
- Serving glass read by the Sheriff lane on `c104669`: batch 3, `~/wm-held/proof/g19-sheriff-batch3-asks-2026-10-08.md`.
- "What it is" comes from the catalogue (`entry.what`, the instrument `what`, `FOOTPRINT_TYPES` desc), so it is checked at the menu, not in the registry.

### 15a. ⓘ coverage by surface

| Surface | Tools | ⓘ with all six parts + ADD TO CHART | Status |
|---|---|---|---|
| Tool Finder (Tools → Browse all tools by family) | 50 | 50 / 50 (Sheriff batch 3 #13, serving) | **STRUCTURE PASS.** Content gaps in 15c |
| Profiles / Lenses / Order flow / Structure / Memory doors (ProfilesMenu) | 24 | 24 / 24 | **STRUCTURE PASS.** The verdict header is generic: "ON NQ1! NOW · CAN DRAW HERE" even for tools that need a chain, a drawn range or two profiles, and even under "feed is STALE" (Sheriff P3-K) — **GAP** |
| Registry records (profiles 36 · instruments 13 · concepts 8) | 57 | 57 / 57 with all eight fields (tree, 08:08) | PASS |
| **Indicators menu** (ChartToolbar catalogue) | **142** | **0 / 142** on `c104669`. The "?" opens a five-section panel built from category boilerplate. 118 of the 142 say "support trade decisions" and 35 say "actionable signal", and some give advice (RSI "buy dips / sell rallies", VWAP "favors buyers"). The button has `title` only — no `aria-label`, no `aria-expanded` | **GAP — P1-C in progress.** 142 records are written from the indicator code (`src/lib/chart/indicatorEducation.ts`, uncommitted, inert). The wiring and the sentinel follow at THAW |
| Footprint controls panel (FootprintControls "?") | footprint modes | Still reads the old `indicatorDescriptions` authoring, not the registry | **GAP** — route it to `FP_<mode>` records (they already exist in the registry) |
| Drawing tools | 17 | 0 / 17. Name-only 44×44 icons, including Long / Short Position, the only way to feed Risk on Price (Sheriff #14) | **GAP** |
| Workspace views and loadouts (Scalp / Trend / Sniper / Review) | 4+ | One line each, no ⓘ (Sheriff #15) | **GAP** |
| Replay | 1 | One line, no ⓘ (Sheriff #2) | **GAP** |

### 15b. First touch for every selectable on-chart object (tree, 08:08 — every kind resolves to a first-touch line)

| Selection | Education key | First-touch line | Note |
|---|---|---|---|
| OBJECT `FVG\|…` | FVG_IMBALANCE | "Fair value gap — a defined territory; …" | ok |
| OBJECT `ZONE:…` | F11A | "Supply / demand zone — where price left fast; …" | Sheriff #12: a tap on a band where a zone overlaps an FVG opens the FVG — hit-test ask (chart lane) |
| OBJECT `LEVEL:…` | MARKET_STRUCTURE | "Swing level — a confirmed high or low; …" | ok |
| OBJECT `MEMORY:…` | PROFILE_MEMORY | "Profile memory — an earlier session's value, carried forward." | ok |
| PRINT delta / big trade | FP_delta / FP_big-trades | present | ok |
| SLICE | LIVING_PROFILE | present | ok |
| ANATOMY absorption / exhaustion | ABSORPTION / EXHAUSTION | present | **wording:** Exhaustion "spent its fuel … failed to continue" leans on outcome |
| MEMORY_GHOST | MEMORY_GHOST | "… Not a forecast." | ok |
| PRESSURE_WALL | BRICK_WALLS | "a strike dealers are positioned at" | **wording:** inferred positioning is stated as fact |
| PRESSURE_FRONT | DERIVATIVES_PRESSURE | "where dealer hedging is expected to damp or amplify moves" | **wording:** reads as a forecast |
| WEATHER | LIQUIDITY_WEATHER | present | ok |

**Not covered by any first touch:**
- **Bar selection**, which the Wisdom word, Delta keel and Effort → Response open. The Inspect sheet opens with no first-touch line. Sheriff #11: Value Migration's evidence is missing from that sheet.
- **Trader drawings** — no education at all; see the drawing tools row in 15a.
- **Indicator lines** — not selectable, so no first touch is owed.

### 15c. Content gaps inside the 50 + 24 ⓘ (Sheriff batch 3 #4–#9, #13; cert lane rewrites at THAW)

| # | Tool | ⓘ says | Glass does | Fix |
|---|---|---|---|---|
| 4 | TPO Profile | Letters on the left edge, single prints | Brass blocks over all 5,000 loaded bars. POC / VAL chips sit ~400 points off camera. No single-print mark | ⓘ to describe the blocks and the whole-history build. Chart-lane ask: build on the camera, or label the range, and keep the chips on camera |
| 5 | Contradiction | Needs two families; DEGRADED = nothing to contradict | Solo paints an UNRESOLVED box (`contradiction=UNRESOLVED:1/1`) | Ask the chart lane whether a one-family UNRESOLVED is lawful. The ⓘ follows the answer |
| 6 | Regime Lighting | No line for UNKNOWN | UNKNOWN / NO_BREAKER lights both the channel and the magnets | ⓘ to name the UNKNOWN state. Remove "trust the magnets" |
| 7 | Expected Envelope | Typical reach from the open | Dotted path 5 bars right of the newest candle (`FWD:5`), top clipped | Chart-lane ask: a path forward of now reads as a projection. The ⓘ must say it is drawn ahead, or the glass stops at now |
| 8 | Brick Walls | Walls at strikes | Solo: SILENT:NO_CHAIN → NO_CURRENT_WALL_EVENT, with no glass word saying why | Chart-lane ask: a reason word on the glass. The ⓘ to name both silent states |
| 9 | Profile Fusion | — | `profileFusion=DRAWN zones=1` beside `profileFusionObject=REFUSED:TIME_OVERLAP` | Chart-lane ask: one receipt owner |
| 13 | 36 / 50 Tool Finder rows | Generic "CAN DRAW HERE" | Tools with dependencies too | P3-K: compute the verdict from the tool's needs |
| 13 | Six footprint modes | "…is drawing from sided prints observed live on tastytrade…" | Vendor name; "is drawing" while off | Drop the vendor; say "draws" |
| 13 | Several | "(proposed)", "no Founder plate for Breathing yet" | Internal words | Remove from trader copy |
| 13 | Stacked Imbalance, Liquidity Weather, Exhaustion, Session, Profile Memory, Derivatives Pressure, Contradiction | "often acts as support… when revisited", "stalls are likely", "running out of fuel", "moves often start…", "often draws price back", "Will dealer hedging damp moves…", "wait or reduce" | — | Rewrite as description, not prediction or advice (P3-K list) |

**Gaps to close, in order:**
1. Indicators 142 (P1-C, records ready).
2. Verdict header (P3-K).
3. Wording in 15c.
4. Footprint panel → registry.
5. Drawing tools ⓘ (17).
6. Workspace views / loadouts / Replay ⓘ.
7. Bar-selection first touch.

Chart-lane asks: 15c #4, #5, #7, #8, #9, and the zone / FVG hit-test.

## 16. §28 CERTIFICATE UPDATES — everything flipped on 2026-10-08 (DRAFT, cert lane, written 13:45 CDT)

Append-only: the certificates above keep their text. Each row below names:
- the certificate field that changes,
- the new text's source,
- the condition for the flip.

**"Tree"** means the change is in the worktree and not yet LIVE. Such a row flips only after two things happen: the coordinator's ship gate reports its build LIVE, and a serving read in an own tab confirms it.

### 16a. Glass proofs flipped today (serving `c104669`, own tab, read-only — LIVE at read time)

| Certificate | Field | Was | Now | Proof |
|---|---|---|---|---|
| §5 FVG — ACCEPTANCE (§62 #9) | SERVING PROOF / STATUS | PARTIAL (engine state only) | **PROVED on glass.** Accepted fill 0.05 and inner line 0.094 on the selected ACCEPTED gap `…1791310800000|BEARISH`. Canvas row 229 reads alpha 47 vs 26 | §13 row 9, UPDATE 07:40 |
| §5 FVG — INVALIDATION (§62 #10) | SERVING PROOF / STATUS | PARTIAL | **PROVED on glass.** TRADED_THROUGH far edge drawn dashed `[3,3]` (pixels `GGGoooGGG`); near edge solid | §13 row 10 |
| §5 FVG — MEMORY (§62 #12) | SERVING PROOF / STATUS | PARTIAL (`MEMORY:0` everywhere) | **PROVED on glass.** `fvgDrawn …|MEMORY:1` with a gold frame when selected. MEMORY paints only when selected — by design | §13 row 12 |
| §5 FVG — CHART DOOR | open item | Backtest row NONE_AVAILABLE | Cause: the chart alternates feeds between loads, and ids carry the feed. The alias resolver shipped in `70f1bf4` ("Backtest/Scanner doors carry their gap's band"). **Re-read on serving still owed** | §13 row 30 (i) |

### 16b. ⓘ / first-touch fields rewritten today (LIVE in `7c3405b` 13:45:27; the verdict path is read on serving — see 16c; per-record text re-read owed)

Source of the new text: `src/lib/chart/inventionEducation.ts`, written 13:36–13:39. Pinned by `indicatorEducation.test.ts` (banned-phrase scan + P3-K verdict cases).

| Certificate | Fields | Change |
|---|---|---|
| P110.4 Profile Memory | STATE GRAMMAR | "often draws price back" → "a naked POC is one the market has not traded back to yet" |
| P110.6 Session Profile | STATE GRAMMAR | drops "may move through again" |
| P110.10 TPO | PHYSICAL GRAMMAR, STATE GRAMMAR, ⓘ / FIRST TOUCH | letters / single prints → brass blocks over ALL loaded bars; chips can sit off camera; no single-print mark. **Open chart-lane ask:** chips off camera (batch 3 #4) |
| P110.3 Profile Fusion | ⓘ verdict | READY now reads NEEDS OTHER LAYERS. **Open chart-lane ask:** `profileFusion` and `profileFusionObject` receipts disagree (#9) |
| H-701.EXH Exhaustion | MARKET QUESTION, FIRST TOUCH | "running out of fuel" / "spent its fuel… failed to continue" → effort per step fading; the mark at the last extreme |
| F08B Liquidity Weather | STATE GRAMMAR | drops "stalls are likely"; describes the bars, not what comes next |
| F15.PRESSURE Derivatives Pressure | MARKET QUESTION, STATE GRAMMAR, FIRST TOUCH, ⓘ verdict | no "will damp / tend to"; modelled gamma, inferred from open interest; verdict NEEDS AN OPTIONS CHAIN |
| F08.BRICK Brick Walls | DEGRADED, FIRST TOUCH, ⓘ verdict | names both silent states (no chain yet / no current wall event); "a strike with large open interest (inferred)"; verdict NEEDS AN OPTIONS CHAIN. **Open chart-lane ask:** a reason word on the glass (#8) |
| F06.STACK Stacked Imbalance | STATE GRAMMAR | drops "often acts as support / resistance when revisited" |
| F10.SESSION_BANDS | STATE GRAMMAR | drops "moves often start…"; a clock fact |
| H-901 Regime Lighting | MARKET QUESTION, PHYSICAL GRAMMAR, STATE GRAMMAR | names UNKNOWN (both sets lit); drops "trust the magnets / channel" |
| H-801 Expected Envelope | PHYSICAL GRAMMAR | states that it is drawn past the newest candle and is not a forecast path. **Open chart-lane ask:** forward of now reads as a projection (#7) |
| H-401 Contradiction | EVIDENCE (needs OTHER_LAYERS → PRICE), PHYSICAL GRAMMAR, TRUTH CLASS, STATE GRAMMAR | asks four families itself (per `selectContradiction`), so a solo UNRESOLVED is lawful; drops "wait or reduce" |
| All 24 Profiles / Lenses + 50 Tool Finder rows | ⓘ verdict header | P3-K: verdict computed from needs (NEEDS YOUR INPUT / NEEDS OTHER LAYERS / NEEDS AN OPTIONS CHAIN / DRAWS FROM STALE DATA / NO LIVE FEED) |

### 16c. New certificate row: Indicators menu ⓘ (LIVE `7c3405b` 13:45:27 — PROVED 13:49)

| Field | Certificate (draft) |
|---|---|
| **NAME** | Indicators menu ⓘ · owner `src/lib/chart/indicatorEducation.ts` (142 records) · surface ChartToolbar Indicators picker |
| **EVIDENCE** | Each record is written from the indicator code (`indicators.ts` + the chart's indicator block), with default windows. Needs PRICE / VOLUME / SIDED_TAPE |
| **ⓘ** | Shared `InventionPreview`: what / question / needs / on the chart / how to read / FULL–PARTIAL–DEGRADED / ADD TO CHART. Button: aria-label, aria-expanded, 44 px |
| **CATALOGUE** | Row subtitle = record `what` (pinned). Price-only Supply/Demand Zones and Stop Run Alert moved to Structure |
| **HONESTY NOTES IN THE RECORDS** | Pivots read the last bar; Volume MA sits on the price scale; Swing High/Low draws nothing visible; VW-RSI and Choppiness are drawn twice; Ichimoku is unshifted; Stochastic Pop / Color RSI / RVGI draw another indicator. Each is a chart-lane ask |
| **TESTS** | `indicatorEducation.test.ts` (142 = 142, fields, subtitle = record, Order Flow tape-only, toolbar wiring, banned phrases, verdicts) |
| **SERVING PROOF** | `7c3405b` (LIVE 13:45:27), own tab, 13:46–13:49 CDT. 1440 NQ1!: 142 ⓘ buttons (aria-label "About <name>", aria-expanded, 44×44). RSI, Supply/Demand Zones (STRUCTURE) and Pivot Points Standard previews show all six parts and ADD TO CHART, verdict CAN DRAW HERE. 390 EURUSD: OBV reads UNAVAILABLE HERE (no central volume); bottom sheet x 0–386, no page h-scroll |
| **STATUS** | **PROVED** (`7c3405b`) |

## 17. §28 CERTIFICATE UPDATES — builds `4b470b8`, `6350c69`, `0971594` (cert lane, written 00:06 CDT Oct 9)

Append-only. "Design call" rows record a decision the coordinator made; the cert lane did not read those on serving unless the row says so.

### 17a. `4b470b8` — LIVE 18:27:16 CDT Oct 8

| Certificate | Field | Change | Proof |
|---|---|---|---|
| Surface ⓘ (new owner) | NAME / OWNER | `src/lib/chart/surfaceEducation.ts` — records for Smart Money cards, every drawing tool, Views, loadouts, Replay and bar selection, reachable through `educationFor` | tsc + education suites at ship. Surfaces not wired in this build |
| §52 release | SERVING PROOF | public responsive 48 / 48 on `4b470b8` (23:41:49–23:45:03) | `~/wm-held/proof/release-52-2342/` |

### 17b. `6350c69` — LIVE 23:52:24 CDT Oct 8

| Certificate | Field | Change | Proof / status |
|---|---|---|---|
| §15a gaps: Drawing tools, Views, loadouts, Replay, Smart Money cards, footprint "?" | ⓘ | Every one opens the shared preview from a registry record. Footprint "?" reads `FP_<mode>` | **Wiring PROVED at 1440** (own tab, 23:58–00:01): loadouts 4, rail 18, footprint 6, Smart Money 29, Views 10, Replay 1. Five layout / wording defects found → §17d |
| §15b: bar selection | ⓘ / FIRST TOUCH | A bar selected by a word resolves to `BAR_SELECTION` → "Selected bar — …" | tests; **serving read owed** (needs a Wisdom-line tap) |
| H-801 Expected Envelope | PHYSICAL GRAMMAR, STATE GRAMMAR, FIRST TOUCH | "historical reach by time of day, not a forecast" | pinned in `surfaceEducation.test.ts` |
| F06A footprint · Imbalance | ⓘ, catalogue line | "can mark trapped traders" / "spot trapped traders" removed; states the 2.5× ratio only | `educationClaims.test.ts`; read on serving 23:59 |
| F07A Big Trades | STATE GRAMMAR | names notional size against a rolling baseline, the side, and "does not say who traded or why" | `educationClaims.test.ts` |
| **Design call (coordinator): ONE DEFINITION** | OWNER | `indicatorDescriptions.ts` retired with its two tests; its claims are guarded against the surviving owners in `educationClaims.test.ts` | screenReach green |
| Indicators (chart lane) | MANIFESTATION | Pivot Points from the prior completed session; Volume MA in its own pane; Swing High/Low visible (highs and lows); VW-RSI and Choppiness drawn once; Ichimoku spans and lagging line displaced | chart lane's `indicatorAudit.test.ts`; not read on serving by this lane |
| §52 release | SERVING PROOF | public responsive 48 / 48 on `6350c69` (23:52:57–23:56:05) | `~/wm-held/proof/release-52-2354/` |

### 17c. `0971594` — LIVE 00:03:03 CDT Oct 9

| Certificate | Field | Change | Proof / status |
|---|---|---|---|
| §16c Indicators menu ⓘ | HONESTY NOTES | The six "defect" notes are withdrawn: the records now describe the fixed behaviour (12 rows) and TPO says a chip shows only when its price is in view. `6350c69` served the stale notes for about 10 minutes | tsc + 16 targeted files 304 / 304; serving re-read owed |
| **Design call (coordinator): Weekly / Monthly Pivots** | MANIFESTATION / DEGRADED | From the prior COMPLETED ISO week / calendar month; when that period is not fully loaded nothing is drawn and the glass says so (`pivotsWeekly` / `pivotsMonthly` = `WITHHELD:<reason>`) | chart lane; not read on serving by this lane |
| **Design call (coordinator): RTH / ETH** | CHROME | The RTH / ETH control is hidden on continuous markets, including crypto | not read on serving by this lane |
| **Design call (coordinator): phone ticket** | NARROW | At ≤ 430 px the order ticket is compact with one Details fold (`ticketLayout.ts`) | `ticketLayout.test.ts`; not read on serving by this lane |
| P110.3 Profile Fusion | RECEIPTS | One receipt (closes Sheriff batch 3 #9) | chart lane |
| G19.WISDOM / Delta keel / Effort → Response | SELECTION | Delta keel and Effort → Response taps now select the bar, like the Wisdom line — all three reach the bar-selection first touch | chart lane; serving read owed |
| Smart Money top cards | ⓘ | The five top cards carry an ⓘ (`SMCARD:` records) | another lane; counted in the 00:05 fix slice (no action button) |

### 17d. Open after these builds

| Item | Owner | Status |
|---|---|---|
| Five ⓘ layout / wording defects + Workspace Replay ⓘ | cert lane | Fix slice SHIPPABLE 00:05:33 (tree) — flips after LIVE + a 390 / 1440 read |
| Footprint ⓘ truth line says "is drawing from sided prints…" while Order Flow is off | capability compiler's owner | OPEN |
| 390 read of the surface ⓘ; bar-selection first touch on serving | cert lane | OWED |

## 18. §28 CERTIFICATE UPDATES — builds `ea8ad94`, `9f4d784` and the coordinator's design calls (cert lane, written 00:27 CDT Oct 9)

Append-only. A "design call" row records a decision the coordinator made. The cert lane read it on serving only where the row says so.

### 18a. `ea8ad94` — LIVE 00:10:35 CDT Oct 9

| Certificate | Field | Change | Proof / status |
|---|---|---|---|
| Surface ⓘ (§17b) | NARROW / layout | Preview capped at min(70vh, 560px) with its own scroll; Draw-sheet record in the flow | **PROVED** 1440 + 390, own tab 00:11–00:20 (loadout, Workspace Replay door, Draw sheet, Smart Money, Views) |
| Surface ⓘ | action | Views "Open this view", loadouts "Apply this loadout", Replay "Start replay", drawing tools "Use this tool"; no button on Smart Money cards | **PROVED** (same read) |
| Smart Money cards, tape Views | ⓘ verdict | The panel's own tape sentence; "not measured" cards UNAVAILABLE HERE; volume records on a volume market CAN DRAW HERE | **PROVED** (same read) |
| Workspace drawer · Replay door | ⓘ | Carries the Replay record, read-only | **PROVED** 1440 + 390 |
| §17d open items | — | 5 of 5 planned fixes closed. Left open by this build: Replay ⓘ inside the Chart tools menu; footprint popover below the viewport; Style popover over the Draw record | closed in `9f4d784` — re-read owed |

### 18b. `9f4d784` — LIVE 00:24:13 CDT Oct 9

| Certificate | Field | Change | Proof / status |
|---|---|---|---|
| Replay ⓘ (Chart tools menu) | layout | Opens centred over the room, not inside the 210 px menu | sentinel; serving re-read owed |
| Footprint ⓘ | layout | The popover is pulled up so its bottom stays 8 px inside the viewport | sentinel; serving re-read owed |
| Draw sheet ⓘ | layout | Opening the ⓘ closes the Style popover | sentinel; serving re-read owed |
| Footprint ⓘ truth line | wording | Follows Order Flow on / off (closes the §17d open item "is drawing … while off") | another lane; not read by this lane |
| **Design call (coordinator): §20 futures-options scope** | F08.BRICK / F15.PRESSURE — TRUTH CLASS, DEGRADED | When only the contracts nearest price are heard, the walls are named NEAR-PRICE OPEN INTEREST, the zero-gamma front and the pressure field are WITHHELD with the reason on the glass, edge strikes cannot be walls, and a wall that leaves the window gets an exit mark. Whether to show the subset (A) or nothing (B) is on the Founder list | `selectDerivativesPressure` (`chainScope`, `chainScopeWords`, `chainScopeGrade`); not read on serving by this lane |
| **Design call (coordinator): phone ticket PEEK / ACT** | Ticket — NARROW | At phone width the ticket has a peek state and an act state, with a CSS-only fold | `ticketLayout.ts`; not read on serving by this lane |
| **Design call (coordinator): ticket-fixture proof scene** | Ticket — RECEIPTS | An owner-only scene that draws the ticket for proof; nothing can be sent from it, pinned by a never-sends sentinel | not read on serving by this lane |
| **Design call (coordinator): Command Deck words** | Command Deck — CHROME | Trader words on the deck, with the receipt behind a Receipt disclosure | not read on serving by this lane |

### 18c. Tree after `9f4d784` (SHIPPABLE 00:26:34, not LIVE)

| Certificate | Field | Change | Proof / status |
|---|---|---|---|
| §15b bar selection | FIRST TOUCH | The in-Inspect line shows at every width for a bar selection. On `ea8ad94` the selection resolved (Effort → Response tap) but had no visible carrier at 1440 | sentinel; serving read owed |
| Replay | STATE GRAMMAR | "(the FVG layer receipts LEAK:0)" removed from trader copy | sentinel |
| F08.BRICK Brick Walls · F15.PRESSURE Derivatives Pressure | ⓘ verdict, TRUTH CLASS | The ⓘ truth line reads the pressure owner's chain scope: a near-money subset reads "PARTIAL · NEAR-PRICE CHAIN ONLY" with the owner's scope and withheld words, and the preview states the top grade is PARTIAL. A whole chain reads CAN DRAW HERE. The scope is known while Derivatives Pressure (which carries the zero-gamma front) or Brick Walls is on; with both off nothing is fetched and the ⓘ reads NEEDS AN OPTIONS CHAIN | `surfaceEducation.test.ts`; serving read owed |

### 18d. Founder list (recorded for the coordinator, not decided here)

| Item | Question |
|---|---|
| §20 futures options, A vs B | On a near-money subset: show the walls as NEAR-PRICE OPEN INTEREST with the front and field withheld (A, shipped), or draw nothing (B)? |
| 390 weather-lens carrier | Where the Liquidity Weather lens's words live at 390 px |
| Phone ticket, act state | The act state covers up to 55% of the glass — is that the limit? |

## 19. §28 CERTIFICATE UPDATES — `9f4d784` re-read, Academy read, `7f2ca59` (cert lane, written 00:42 CDT Oct 9)

Append-only. "Design call" rows record a coordinator decision; this lane read them on serving only where the row says so.

### 19a. `9f4d784` — re-read 00:28–00:29 (own tab, 1440)

| Certificate | Field | Was (§18b) | Now |
|---|---|---|---|
| Replay ⓘ (Chart tools menu) | SERVING PROOF | re-read owed | **PROVED** — centred over the room, y 118–668 of 786, "Start replay" |
| Footprint ⓘ | SERVING PROOF | re-read owed | **PROVED** — lifted 204 px, y 224–774 of 786; truth line follows Order Flow off |
| Draw sheet ⓘ | SERVING PROOF | re-read owed | **PROVED** — the Style popover closes when the ⓘ opens |

### 19b. Academy (§5 ACADEMY, §6 row "Show me on a chart")

| Item | Was | Now | Proof |
|---|---|---|---|
| Territories on the landing chart | PARTIAL since `c4de0f0` | **PROVED** — the lesson link lands on `fvgDrawn 9\|LIVE:6\|SCAR:3`, `LEAK:0` | own tab, `9f4d784`, 00:30 |
| Landing chart is the clean scene | assumed | **DEFECT** on `9f4d784` / `7f2ca59`: an in-app door shows the member's own layers. Fixed at the scene owner (`adoptProofSceneSearch`), tree | `proofSceneDoor.sentinel.test.ts`; serving read owed after ship |
| "Open on the chart — then press Replay" | relabelled | link present on lesson 9; no URL entry to Replay exists (unchanged) | own tab |
| "Show me my examples" | not read | still unread — absent on lesson 9 for this account | — |
| Quiz pass on serving | local only | unchanged, by rule (no quizzes on the Founder's account) | — |
| Personal Edge → lesson | not read | **PROVED** from the Journal fixture: "Study: Lesson 18 · Patience →" opens lesson 18 of 21. `/profile` carries no lesson door | own tab, `7f2ca59`, 00:40 |

### 19c. `7f2ca59` — LIVE 00:35:05 CDT Oct 9

| Certificate | Field | Change | Proof / status |
|---|---|---|---|
| §15b bar selection | FIRST TOUCH | The in-Inspect line shows at every width | **PROVED** 1440: effort-bar tap → "Candle · Selected bar — …", `display:block` |
| F08.BRICK Brick Walls | ⓘ verdict, TRUTH CLASS | Reads the pressure owner's chain scope | **PROVED** NQ1!: "PARTIAL · NEAR-PRICE CHAIN ONLY", the owner's scope and withheld words, "top grade is PARTIAL". Glass agrees (`pressureChainScope=NEAR_MONEY_SUBSET:122:±4%`) |
| F15.PRESSURE Derivatives Pressure | ⓘ verdict | same rule | tests; not opened on serving |
| **Design call (coordinator): Command Deck** | CHROME | Trader words on the deck; the receipt sits behind a Receipt disclosure | not read on serving by this lane |
| **Design call (coordinator): ticket BUILD / REVIEW** | Ticket | The ticket has a build step and a review step | not read on serving by this lane |

### 19d. Tree after `7f2ca59` (SHIPPABLE, not LIVE)

| Certificate | Field | Change | Proof |
|---|---|---|---|
| Proof scenes (all in-app doors: Academy, Scanner, Backtest, Journal) | OWNER | The room adopts its router params before any preference is read; a scene is a view and never writes; a plain mount after a scene mount saves again | `proofSceneDoor.sentinel.test.ts` |
| Every first-touch line | ⓘ / FIRST TOUCH | The label is dropped when the sentence already opens with it (was "Supply / demand zone · Supply / demand zone — …") | `surfaceEducation.test.ts` (walks every record) |
| F08.BRICK Brick Walls | MARKET QUESTION, EVIDENCE | "Which strikes near price hold the most open interest, and has price tested them?"; evidence names no vendor | banned-phrase scan |

### 19e. Founder list — additions

| Item | Question |
|---|---|
| GC1! decimals | The chart prints gold at 2 decimals while the ticket prints the true tick — which one rules, or should both show the tick? |

## 20. §28 CERTIFICATE UPDATES — chart rows flipped from cited receipts, `b290eef`, design calls, Founder list (cert lane, written 06:57 CDT Oct 9)

Append-only. A row is flipped only where a serving receipt with its build and time exists in `~/wm-held/proof/fvg-serving-night-2026-10-07.txt` (the chart lane's file; its browser-clock times are CDT). Each of those builds was LIVE before its read (LIVE times are in the receipt doc).

### 20a. Chart rows flipped (receipts are the chart lane's; this lane did not re-read them)

| Certificate | Field | Was | Now | Receipt (build · time · scene) |
|---|---|---|---|---|
| F08A Liquidity Lifecycle | STATUS — salience | PARTIAL: "two tiny marks at the newest bar" | **Salience PROVED with words erased.** Still open: full pull / refill needs depth | `7c3405b` · Oct 8 13:51:25–13:51:54 · BTC-USD 5m @390 · `salience MIN_H6\|LIFTED:0\|BIRTH_W2` |
| P110.5 Profile DNA | STATUS — salience | open (salience) | **Salience PROVED with words erased** | `7c3405b` · Oct 8 13:51:54–13:52:23 · BTC-USD 5m @1180 · `profileDnaSalience=STEP1\|SPINE:0.6@1.5\|BRACKET:0.65` |
| F06A footprint · Imbalance cells | STATUS — salience | open (salience) | **Salience PROVED with words erased** | `7c3405b` · Oct 8 13:52:23–13:52:52 · BTC-USD 1m @1180 · `imbalanceRows=2`, `imbalanceCellsSalience=OUTLINE1\|MIN_H3` |
| F13.LENS Question Lens | STATUS — identity mark | no mark of its own | **Mark PROVED with words erased** (ABSORPTION → square). The quiet-attention case (0.35) was not exercised on serving — the lens refused for lack of an event; it is unit-tested | `7c3405b` · Oct 8 13:50:56–13:51:25 · BTC-USD 5m @1180 · `questionLens=ABSORPTION:3`, `questionLensMark=ABSORPTION:SQUARE`. Quiet case: `6350c69` · Oct 8 23:58:15–23:58:43 · REFUSED |
| F08B Liquidity Weather (lens) | STATUS — second state | one state read on the glass | **7 of 7 stages PROVED at 1180 with words erased** (lens-fixture scene): HEAVY, AIRLESS, THINNING, STEADY, THICKENING, ERRATIC each with its own grain; UNMEASURED draws no lens by rule. **At 390 the lens yields and no stage has a carrier** — Founder list | `6350c69` · Oct 8 23:53:17–23:54:30 (1180) and 23:54:56–23:55:53 (390) · NQ1! 5m · `scene=lens-fixture&state=<S>` |
| F15.PRESSURE Derivatives Pressure | STATUS — second state | one climate read | **3 climates × 2 sizes PROVED with words erased** (lens-fixture scene): DAMPING all blue, AMPLIFYING all orange, MIXED both with the front | `48bdea6` · Oct 8 18:23:46–18:25:53 · 1180×820 and 390×844 · `derivativesPressureTint` |
| F06.VALUE_CANDLE Value Candle | STATUS — salience | open (salience) | **NOT flipped** — the proof file holds only its attention tier (`6350c69` · Oct 8 23:58:15–23:58:43: LIVE 0.6), no salience receipt | — |

### 20b. `b290eef` — LIVE 00:49:14 CDT Oct 9

| Certificate | Field | Change | Proof / status |
|---|---|---|---|
| Proof scenes — every in-app door | OWNER, SERVING PROOF | The room adopts its router params at mount | **PROVED** own tab, 06:50–06:52: Academy lesson 9 → "Show me on a chart" lands clean (Brick Walls OFF, `fvgDrawn 9`); a plain `/charts` afterwards shows the member's layers exactly as before (Brick Walls ON:2); 68 of 68 `wm_` preference keys unchanged |
| §19b Academy · landing chart is the clean scene | STATUS | DEFECT | **CLOSED** (same read) |
| Every first-touch line | ⓘ / FIRST TOUCH | The label is dropped when the sentence opens with it | **PROVED** on a zone tap: "Supply / demand zone — where price left fast; …" (aria-label, in-Inspect line). The desktop card's heading still repeated it — fixed in the tree 06:53 |
| First touch on desktop while Inspect is open | — | At ≥ 640 px a tap that opens Inspect shows no first-touch line (the card yields; the in-Inspect line is phone-only except for a bar) | OPEN — coordinator's call |
| §52 release | SERVING PROOF | public responsive 48 / 48 (06:54:00–06:57:15) | `~/wm-held/proof/release-52-0653/` |
| **Design call (coordinator): /profile lesson door** | Personal Edge | A door from Personal Edge to a lesson appears only when the sample is sufficient; below it the panel states INSUFFICIENT EVIDENCE and offers no door | read 00:39 on `7f2ca59`: the 7-decision fixture shows no door |

### 20c. Founder list (questions for the Founder; nothing is decided here)

| Item | Question |
|---|---|
| Real coarse-pointer tablet read | Touch size and tap behaviour on a tablet can only be certified on a physical device — this Mac has no iOS runtime and the browser pane does not emulate tablet touch |
| Futures option walls | On a near-money subset: show walls scoped as NEAR-PRICE OPEN INTEREST (shipped), or withhold them entirely? |
| 390 weather-lens carrier | At phone width the Liquidity Weather lens yields, so its stage has no mark on the glass — does it need one? |
| Ticket coverage while building an order | Is ≤ 55% of the glass the limit for the phone ticket while an order is being built? |
| GC1! decimals | The chart prints gold at 2 decimals, the ticket at the true tick — which rules? |

## 13. AUDIT FINDING — the server gate did not stand in front of Webull live orders (found and closed 2026-10-09)

| When (CDT) | What | Evidence |
|---|---|---|
| 2026-10-09 06:54 — FOUND (read-only audit, FVG lane) | `/api/broker/webull/order-submit` ran the owner gate, the asset scope, the human's `confirmLive`, the durable ledger, Webull's preview and the submit-once idempotency — but it never loaded the server-held limits and never ran `preflightLiveOrder`. The server kill switch, the server arm (default DISARMED) and the per-order caps stood only in front of tastytrade. The certificate's "Execution is gated by design: WM places no Webull order" and the Settings / readiness word GATED were therefore not true of the server: with the owner signed in and `confirmLive` sent, the route could place. No order was sent, previewed or placed to learn this — source reading only | `src/app/api/broker/webull/order-submit/route.ts` at b290eef (no `preflightLiveOrder`, `liveOrdersEnabled: true`) |
| 2026-10-09 07:00 — CLOSED in tree (tightening only, fail closed; ships in the next batch) | The Webull door now loads the same server-held limits and runs the same `preflightLiveOrder` as tastytrade's, BEFORE any call to Webull: kill switch, server arm, every applicable cap set and held, the environment the ticket showed (the Webull door trades production), a fresh quote for a risk-increasing order, and verified protection. Webull has no stop rail wired, so an opening stock order — or a stock order that does not say open / close — and a sold-to-open option are refused; a long option (bounded by its premium) and closing orders pass. Limits never set, unreadable, or a store that throws → refused. A refusal answers in the tastytrade door's own words, names no env var, and is written to its own ledger key (`wm:order-refusal:v1:webull:…`). Nothing became more permissive: owner gate, asset scope, `confirmLive`, ledger and idempotency are unchanged. The ticket now sends the environment it shows and the live dated touch | `route.test.ts` (kill switch / arm off / limits unset, unreadable, store down / caps / environment / quote / protection — each refused before any Webull call; a passing order still previews then places once); `src/lib/execution/serverGateBeforeBroker.sentinel.test.ts` pins limits → preflight → refusal-return BEFORE the first broker call in BOTH submit doors |
| Founder list (not built) | A dedicated order-submit rate limiter (per owner; cancels never limited) and an optional daily order-count cap. Today neither live door has any rate limit; the Alpaca paper routes have an in-memory 30 / minute limiter | audit 2026-10-09 06:54 |

With the gate in place the word GATED on the Webull rows (readiness board, Settings map) describes the server: the order stages are not switched on, and the kill switch and arm now stand in front of the door that could reach them.


## 21. §28 CERTIFICATE UPDATES — rulings, `559884e`, `92895d6`, Webull server gate (cert lane, written 07:23 CDT Oct 9)

Append-only. Chart-lane receipts are cited from `~/wm-held/proof/fvg-serving-night-2026-10-07.txt`; this lane did not re-read them.

### 21a. Coordinator rulings (Oct 9, morning)

| # | Ruling | Built in | Status |
|---|---|---|---|
| 1 | The in-Inspect first-touch line shows at EVERY width for EVERY selection kind, once per kind — the side card always yields to Inspect | `559884e` | **PROVED** 1440, own tab 07:17–07:19 (FVG tap and zone) |
| 2 | "Show me my examples" gets a labelled sample scene, `/education?scene=education-fixture`; nothing is ever written to the Founder's journal | `559884e` | **PROVED** 07:14 (banner, sample rows, no journal / progress key changed) |
| 3 | The Replay practice link gets an address that starts Replay on landing (`replay=start`), read once at mount through the Replay owner; if the chart cannot start honestly it says so and offers the button | `92895d6` | **PROVED** 07:22–07:23 (start, as-of, no live words, refusal) |
| 4 | Follow the chart link from every FVG lesson that has one | read on `559884e` | 8 lessons followed covering all six distinct addresses; 12 lessons with the plain address not clicked one by one |
| 5 | Value Candle salience: ask the chart lane for the receipt | chart lane, `559884e` | flipped below (21d) |
| — | "Swing-high origin · tastytrade" under BIRTH SOURCE stays: a named source is a truth word | — | recorded; not a defect |

### 21b. `559884e` (LIVE 07:06:21) and `92895d6` (LIVE 07:21:33)

| Certificate | Field | Change | Proof / status |
|---|---|---|---|
| Every first-touch line | SERVING PROOF | In Inspect at every width | **PROVED** 1440: "FVG / Imbalance · Fair value gap — …"; "Supply / demand zone — where price left fast; …" |
| §19b Academy · "Show me my examples" | STATUS | unread | **PROVED** through the sample scene. Open (ticket lane): the door's `#SAMPLE-24` anchor has no target, so the journal scene opens at the top |
| §19b Academy · chart link | SERVING PROOF | lesson 9 only | Lessons 1, 2, 5, 11, 12, 13, 15, 17 (+ 9 on `b290eef`): clean landing, `fvgDrawn 9`, the named extra layer drawn where a receipt exists |
| §19b Academy · Replay practice | STATUS | "then press Replay" (no door) | **PROVED** on `92895d6`: "Practice in Replay" lands with `data-replay-door=STARTED`, "BAR REPLAY … 2112/2232", "HISTORICAL BARS VERIFIED · bar replay", `fvgAsOf=REPLAY:…\|LEAK:0`; no "LIVE — CERTIFIED QUOTE" |
| Replay door · refusal | DEGRADED | — | **PROVED**: a chart with no bars reads "Replay could not start — this chart has no bars to walk yet." with a 44 px Start Replay button |
| /profile Personal Edge lesson door | — | door only with a sufficient sample (design call, §20b) | shipped `559884e`; the 24-decision book's door not read by this lane |

### 21c. Webull order door — server gate (found and closed Oct 9)

| Field | Record |
|---|---|
| **Found** | 06:54 CDT, by a read-only audit: the Webull order-submit route skipped `preflightLiveOrder` — the kill switch, the arm state and the caps were not consulted on the server before the broker call |
| **Closed** | `559884e`, LIVE 07:06:21 CDT: the route runs the same server gate (kill switch, arm, caps, quote, protection) before any broker call and fails closed |
| **Pinned** | sentinel `serverGateBeforeBroker` on both order doors |
| **Serving proof** | **NOT proved on serving** — proving it needs Arm / Send to be pressed, and nobody presses them. Tests and code reading only |
| **Owner** | brokers / execution lane (not this lane) |

### 21d. Chart rows flipped from the chart lane's receipts (`559884e`)

| Certificate | Field | Was | Now | Receipt |
|---|---|---|---|---|
| F06.VALUE_CANDLE Value Candle | STATUS — salience | NOT flipped (§20a: tier only) | **Salience PROVED, both branches**: wide `COG_EXT1\|W3`, narrow `COG_EXT3\|W3` | `559884e` · wide: BTC-USD 5m `on=ValueCandle` @1180, 07:11:21 (`GLASS_PER_BAR:39`, tier LIVE 0.6); also @390 and NQ1! all-on at 07:12:09 · narrow: BTC-USD 5m `on=ValueCandle`, 07:18:00, bars 130 / 170 / 220 @1180 and 70 / 100 @390 |
| G19.WISDOM Cross-candle wisdom line | SELECTION / FIRST TOUCH | serving read owed (the line was silent at my read) | **PROVED**: a click on the words selects the line's own bar and the first-touch line shows | `559884e` · NQ1! 5m · 07:18:52–07:19:08 · `crossCandleWisdom=EFFORT_UP_RESPONSE_DOWN`, `inspectedBar=MARKED:1791547800` |

### 21e. Founder list — additions

| Item | Question |
|---|---|
| Order-submit rate limiter | Should the order doors refuse more than N submissions in a window, and what is N? |
| Daily order cap | Is there a per-day ceiling on orders, and what is it? |
| "Symbols observed" ledger | Verification sweeps inflate the count of symbols observed — should sweeps be excluded? (the count is pending from the brokers lane) |

## 22. AUDIT — the Founder's Garden 19 order, Academy (§33–§36, §56) and selling pass (§57), against this document (cert lane, written 07:28 CDT Oct 9)

Source: the Founder's order as given in the session (section numbers are his). Each row says what the order asks, what exists, and what is missing. Constraints held: pricing unchanged ($20 / month), no new room or app, no "must fill"-type promise, nothing published or posted on the Founder's behalf.

### 22a. Academy

| § | The order asks | State | Missing / where it lives |
|---|---|---|---|
| 33 | 21 lessons added to the existing Academy, no separate FVG Academy | **BUILT, PROVED** — module "FVG / Imbalance & Patience", 21 lessons in the one Academy (`fvgCourse.ts`); layout 63 / 63 on `4769a31` | — |
| 33 #12 | FVG + profile: teach auction / value relationships | BUILT. The lede said a territory "often lines up with thin volume" | **Fixed in the tree 07:28** ("can line up"); a test now bans often / tends to / likely in every lesson |
| 33 #20 | Psychology: "how fear, impatience, FOMO and interference may affect execution while distinguishing evidence from interpretation" | **BUILT BUT INCOMPLETE** — the lesson taught evidence before labels about the MARKET only; the four behaviours were absent | **Built in the tree 07:28**: two paragraphs naming them as actions a record can show (exit before the condition, entry before the touch, entry after the move, orders changed repeatedly), the reason left to the trader. `fvgCourse.ts` lesson 20 |
| 33 #21 | Personal edge: study whether the concept improves the trader's own decisions | BUILT. The lesson told the trader to "tag the trades as FVG", a control that does not exist | **Fixed in the tree 07:28**: names the real control ("Reference an FVG") and the "Show me my examples" door |
| 33 | Quiz | BUILT (14 questions). **UNCERTIFIED on serving** by rule — no quiz is completed on the Founder's account | local proof only; a sample scene could prove it without writing progress (not built) |
| 34 | Myth card: "EVERY FVG MUST FILL" → the better question | **BUILT, PROVED** — the card is on lessons 1, 10, 14, 15, 16, in the Founder's words | — |
| 35 | From the Academy: SHOW ME ON A CHART opens / replays a legitimate example | **BUILT, PROVED** — all 21 lessons carry the link; 9 followed on serving (all six addresses), clean landing, real gaps on the member's chart; "Practice in Replay" starts Replay (`92895d6`) | 12 lessons with the plain address not clicked one by one (next build) |
| 35 | From the live market: ⓘ FVG deep-links to the RELEVANT lesson | **BUILT BUT NOT RELEVANT** — the ⓘ and the gap's Inspect ticket always opened lesson 1 | **Built in the tree 07:28**: the Inspect ticket opens the lesson for the gap's own state (traded through → 14, memory → 15, rejected / accepted → 9, full → 8, partial → 7, touched → 6). `src/lib/academy/fvgLessonForState.ts`. The Tool Finder ⓘ (no gap selected) keeps lesson 1 |
| 36 | SHOW ME MY EXAMPLES where Journal / Review has sufficient data | **BUILT, PROVED through the sample scene** (`559884e`). It lists decisions, never a rate, so no sample threshold applies | Open (ticket lane): the door's `#SAMPLE-n` anchor has no target. Unread on a real entry — by rule nothing is written to the Founder's journal |
| 36 | concept → market examples → personal examples → personal behaviour → improvement | BUILT: lesson → chart → my examples → Journal Plan vs Actual → "Study: Lesson n" back to the course (hop PROVED 00:40) | /profile lesson door: only with a sufficient sample (design call); the 24-decision book's door is unread |
| 56 | The full learning loop, LEARN → … → LEARN YOURSELF → RETURN TO MARKET BETTER | BUILT in the product (the hops above). The public loop stopped at LEARN YOURSELF | **Fixed in the tree 07:28**: the 15th step added in the Founder's words (`sellingStory.ts`) |

### 22b. Selling pass (§57)

| The order asks | State | Missing |
|---|---|---|
| Do not market as "NOW WITH FVG INDICATOR" | **BUILT, PINNED** — `bannedClaims` flags an indicator launch; the public pages carry none | — |
| Language closer to LIVING MARKET INTELLIGENCE that follows price territories through formation, interaction, response, memory, review, education | **BUILT, PROVED** — headline and the six stages on /welcome, /pricing, /login (`sellingStory.ts`); serving `d5ac6ff`, signed out | The copy has never been approved or redlined by the Founder (no brand-voice document exists) — on the Founder list since Oct 8 |
| The product remains WEALTHY MINDSETS PRO · TRADING OPERATING SYSTEM | **BUILT, PINNED** | — |
| The launch offer remains $20 / MONTH; do not change pricing | **HELD** — four tiers $0 / $10 / $20 / $50, pinned by test; nothing in this audit touches pricing | — |
| (honesty) no outcome promise, no invented statistic | **PINNED** — banned-claim sweep over the story and the public pages | "Broker connection … BETA and not enabled for members yet" was true when written (Oct 7) — the brokers lane should confirm it is still the right sentence |

### 22c. Built from this audit (tree, SHIPPABLE 07:28)

| Item | Files | Tests |
|---|---|---|
| ⓘ FVG → the relevant lesson | NEW `src/lib/academy/fvgLessonForState.ts`, NEW `fvgLessonForState.test.ts`; `FvgInspectTicket.tsx` | every state maps to a real lesson (number, id, title, address pinned to the course) |
| Lesson 20 psychology; lesson 21 control name; lesson 12 wording | `fvgCourse.ts`, `fvgCourse.test.ts` | three new cases |
| The loop's closing step | `sellingStory.ts`, `sellingStory.test.ts` | 15 steps, in order |


### 10c. AUDIT — the Founder's Garden 19 order, Patience / Management / Ticket sections, against this file (management lane, 2026-10-09 07:30 CDT)

Read from the Founder's order text (part 1 §23–§24; part 2 §23–§31, §40–§42, §55–§56, §64).

| § | What the order asks | State | What is missing · where it would live |
|---|---|---|---|
| 2·§23 Personal Edge × FVG | first-touch, anticipatory, **confirmed**, partial / deep mitigation, later-touch, old-gap; × structure, profile, order flow, wall, effort→response, session, regime, timeframe, instrument; market outcome apart from trader outcome | BUILT · certified on fixture | **"Confirmed entries" — BUILT 2026-10-09 08:04 CDT** as the WAITED dimension from the confirmation fact (see §10b). Structure / profile / wall / effort / regime on a REAL book: built today (§40 row above) |
| 2·§24 Counterfactual | methodology value; execution value; **entered too early?**; exited too early?; **avoided valid situations?**; chased late?; management destroyed a valid plan?; restraint improved outcomes? | BUILT in parts | **BUILT 2026-10-09 07:48 CDT** (see the §24 row in §10b) — was NOT_BUILT as stated answers |
| 2·§25 / §55 | no Patience Indicator / Psychology Room / Patience Dashboard; lives in Morning Prep → … → SpaidBot | BUILT · proved | — |
| 2·§26 Management intelligence | eleven behaviours | BUILT · PROVED on serving (c104669) | — |
| 2·§27 Plan snapshot | freeze, UNRECORDED, immutable, amendments | BUILT · PROVED ON FIXTURE | real-account read owed (one WM-sent order) |
| 2·§28 Premature exit | the six patterns, no shame, unknown emotion | BUILT · PROVED on serving (fixture) | — |
| 2·§29 Psychology without mind reading | study fear, impatience, FOMO, revenge, over-management, hesitation, overconfidence, plan deviation **only when supported by trader self-report**, observable action, plan comparison, history | **BUILT 2026-10-09 07:45 CDT (see the §29 row in §10b)** — was PARTLY NOT_BUILT | The trader can write free words ("Why did the plan change?") but cannot LABEL the reason himself, so those eight can never be studied. Needs: self-report labels chosen only by the trader on the Review row (`storyReview.ts`, `BrokerTruthToday.StoryReviewRow`), counted in Personal Edge beside the departure they were attached to, MEASURED at ≥ 20 (`planAdherence.ts`), cleared by erasure. WM never assigns one |
| 2·§31 SpaidBot × management | the plan sentence + "What caused you to change the plan?" | BUILT · wired (`spaidbotContext`, `planReview`) | certified in unit; no serving read of SpaidBot's answer (provider call) |
| 2·§40 Journal | object; state; first / later; penetration; **structure context; profile context**; evidence; plan; result; management behavior | BUILT today | see the §40 row above |
| 2·§41 Review | nine questions | BUILT · PROVED on serving (fixture) | "Did they wait?" — **BUILT 2026-10-09 08:04 CDT** as the confirmation fact (see §10b) |
| 2·§42 Four truths | market / context / trader / education kept apart | BUILT · sentinel | — |
| 2·§56 Loop | LEARN → … → RETURN TO MARKET BETTER | BUILT · integration test + serving walk | — |
| 2·§64 Sheriff test | market did / planned / actually did; factual deviations; new evidence preserved | BUILT · PROVED on serving (fixture) | real completed Founder trade owed |
| 1·§23 Trade from chart | ENTRY, STOP, TARGET, MODIFY, CANCEL, FLATTEN, POSITION STATE on the canvas; no pretend ticket, no UI-only fill, no silent reroute | BUILT · PROVED on serving for FLAT + fixture states | **MODIFY is not an atomic replace** (stated on the ticket; an atomic replace is order-route code this lane does not edit). **No bracket / OCO** (stated). Real working-order cancel + broker ack: needs a real working order. Touch-phone heights unmeasured |
| 1·§24 SpaidBot permissioned execution | OBSERVE → PROPOSE → **EXPLICITLY AUTHORIZED EXECUTION** with bounded permission, audit trail, kill switch | OBSERVE / PROPOSE BUILT; boundary on the ticket | **AUTHORIZED EXECUTION is NOT_BUILT** — and is not this lane's to build: live order code needs the Founder's permission rule (it is refused by the session's safety gate) |

**Build order by trader value:** (1) §40 context with the entry — done; (2) §29 self-report labels; (3) §24 "entered too early" / "avoided valid situations" lines; (4) "confirmed entries" (needs a recorded confirmation fact — a design question for the FVG lane).

## 23. `0dd1130` and `16f363a` — corrections to §22, serving reads, rulings, Founder list (cert lane, written 08:04 CDT Oct 9)

LIVE `0dd1130` at 07:40:28 CDT and `16f363a` at 07:54:56 CDT (coordinator ship gate). Every read below was taken after its build was live, in the cert lane's own tabs (closed 07:50 and 08:02), read-only: nothing saved, sent or armed; no quiz completed on the Founder's account outside the sample scene.

### 23a. Two corrections to §22 (append-only; the rows above stand as written)

| §22 said | Correct statement |
|---|---|
| Row 33, Quiz: "a sample scene could prove it without writing progress (not built)" | **Built and shipped in `0dd1130`**: `/education?scene=education-fixture` runs the quiz with a banner, reads no saved progress and writes none. Proved on serving — see 23b |
| Row 56 / 22c: "the 15th step added in the Founder's words" | The 15th step has two public strings: the step name **RETURN TO MARKET BETTER** and its line **"That is a Trading Operating System."** Both are the Founder's own sentences, verbatim. An earlier draft of the line was cert-lane wording; it was replaced before shipping and never reached production |

### 23b. Serving reads on `0dd1130`

| Read | Time (CDT) | Result | State |
|---|---|---|---|
| Quiz sample scene — PASS run (`/education?scene=education-fixture&lesson=fvg-9`) | 07:41–07:42 | Banner present. Starts at "0/60 verified" (saved progress not read). 10 / 10 → "100% · Knowledge Check Mastered". After closing: "Rejection vs acceptance · Marked verified on this page only — not saved (proof scene)."; "1/21 verified". `wm_edu_progress` absent before and after. The only storage keys that changed were two app-shell keys (`wm:session-symbol-store:v1`, `wm:nectar:coverage-continuity:v1`) — no progress, no note | **PROVED** |
| Quiz sample scene — FAIL run | 07:43 | 0 / 10 → "0% · Keep Studying · Score 70%+ to pass the knowledge check." Verified count unchanged (1/21); storage unchanged | **PROVED**. One read straight after "Done" still found the dialog in the page (exit frame); on `16f363a` the dialog was gone 0.9 s after closing |
| **Defect found** — pass screen wording inside the scene | 07:42 | The pass screen still says "Closing records this lesson complete in this browser." Inside the scene that is false (nothing is recorded) | **FIXED in the tree 08:00** (`education/page.tsx`: inside the scene the pass screen prints "Marked verified on this page only — not saved (proof scene)."; sentinel case added). Not shipped; still on screen on `16f363a` |
| **Quiz sample scene re-read on `16f363a`, storage writes counted at the source** (build identity `16f363a` read first; the scene frame's `setItem` / `removeItem` / `clear` and every non-GET `fetch` wrapped 198 ms after navigation, wrapper confirmed live by a probe; observed about 27 s, past the 15 s coverage checkpoint) | 07:58–08:02 | PASS run 10 / 10, closed, pass line and "1/21 verified" on screen. **Storage writes from the scene: 0. Non-GET requests from the scene: 0.** `wm_edu_progress` absent | **PROVED** |
| Note on the `0dd1130` storage comparison above | — | The two app-shell keys seen changing in the whole-origin before/after comparison also changed on `16f363a` while the scene frame itself wrote nothing — they are written by other open tabs on the same origin. A before/after comparison of shared storage cannot attribute a write; the wrapped read is the proof | method note |
| Inspect → Academy on a **traded-through** gap (NQ1! 1h, clean scene, tap) | 07:48 | Selected `…1h|1791475200000|BEARISH|v1|TRADED_THROUGH` → link "Academy · Failed FVG / trade-through ›" → `/education?lesson=fvg-14` | **PROVED** |
| Inspect → Academy on a **rejected** gap (same chart, tap) | 07:48 | `…1h|1791302400000|BEARISH|v1|REJECTED` → "Academy · Rejection vs acceptance ›" → lesson 9 | **PROVED** |
| Inspect → Academy on a **memory** gap (door: FVG Study row "memory" → "Open on the chart →", NQ1! 5m) | 07:50 | Selected `…5m|1791536400000|BEARISH|v1|MEMORY`; glass `fvgDrawn 10|LIVE:6|SCAR:3|MEMORY:1` (the hidden gap is drawn because it is selected); link "Academy · Market memory ›" → lesson 15. The study's id (`FVG|NQ1!|…`) was held as the same object under the feed's id (`HELD:EQUIVALENT_FEED_ALIAS`) | **PROVED** |
| Lesson 20 text | 07:45 | "The same rule applies to you. Fear, impatience, fear of missing out and interference are interpretations; what a record can show is the action: an exit taken before the plan's condition, an entry before the touch, an entry after the move had already left, an order changed again and again." Second paragraph and "stated as an action, not a feeling" present | **PROVED** |
| The remaining 12 lesson chart links (3, 4, 6, 7, 8, 10, 14, 16, 18, 19, 20, 21), each followed in-app from its lesson | 07:45–07:47 | 12 / 12 land on `/charts` in the clean scene with gaps drawn (`fvgDrawn 9|LIVE:6|SCAR:3|MEMORY:0`) and Brick Walls OFF. With the 9 read on `92895d6`, all 21 lesson links have been followed | **PROVED** |
| The 15-step loop on `/welcome`, signed out (credentialless frame, no cookie) | 07:50 | The list has 15 steps; 14 "LEARN YOURSELF · Your edge is what your own record shows."; 15 "RETURN TO MARKET BETTER · That is a Trading Operating System." | **PROVED** |

### 23c. Rulings recorded today (coordinator, Oct 9; built by other lanes — recorded here, not proved by this lane)

| Ruling | Where it lives | Shipped |
|---|---|---|
| **Word registry runs in OBSERVE by default**: every chart word claims its rectangle before painting and collisions are recorded; `gate=enforce` withholds the losing word. Note anchors read the same registry | `wordRegistry.ts`, `everyWordClaimsItsRect.sentinel.test.ts` (chart lane) | `16f363a` |
| **Scanner fixture**: the scanner's gap strip has a sample scene of its own | scanner lane (tree) | not yet |
| **Ask door on one fixture row**: one sample row carries the Ask door so the hop can be read without the Founder's data | tree | not yet |
| **Confirmation fact = lessons fvg-9 and fvg-14**: "waited for the confirming close" is defined by lesson 9 (rejection / acceptance, read from closes after the touch); a close against the gap is lesson 14 (trade-through). The journal reads the sentences from the lesson records (`confirmingClose.ts`) | journal lane (tree) | not yet |
| Lessons **fvg-9, fvg-14, fvg-18 rule sentences are pinned word for word** (`fvgCourse.test.ts`, three new cases) so the journal's WAITED group cannot lose its definition to a course edit. **No lesson sentence was changed.** | cert lane (tree, 08:00) | not yet |
| Fixture rooms (journal, profile, education, ticket) hold writes like the chart scenes | `proofScene.ts`, `proofSceneWritesNothing.sentinel.test.ts` | `16f363a` — proved for the education scene above |
| **Teaching-card desktop yield is kept as canon**: on desktop the teaching card yields (docks clear of the silence band) | chart lane | `92895d6` |

### 23d. Founder list — additions

1. **Thirteen probable sweep symbols in the coverage ledger** (table from the brokers lane; rows observed per symbol). These look like symbols written by automated sweeps rather than by a trader watching them. Nothing has been edited or deleted. **Leave or remove is the Founder's call.**

| Symbol | Rows |
|---|---|
| AVAX | 2 |
| LTC | 6 |
| BZ1! | 10 |
| 6E1! | 21 |
| ZN1! | 97 |
| /ES | 61 |
| ESZ6 | 17 |
| /BTC | 3 |
| RTY1! | 5 |
| /MNQH7 | 149 |
| "BTC-" | 1,821 |
| DOGE | 45 |
| QQQ | 34 |

2. **Selling copy has never been redlined by the Founder.** Two public strings were added today (`0dd1130`, on /welcome, /pricing, /login through `sellingStory.ts`), both his own sentences:

| String | Before | After |
|---|---|---|
| The loop sentence | "LEARN → SEE → WAIT → UNDERSTAND → INSPECT → PLAN → DECIDE → TRADE → PROTECT → MANAGE → JOURNAL → REVIEW → MEASURE → LEARN YOURSELF" | the same, plus " → RETURN TO MARKET BETTER" |
| The loop's 15th line | (no 15th step) | "15 · RETURN TO MARKET BETTER · That is a Trading Operating System." |

Pricing is unchanged ($20 / month). No new claim was written.

3. **Bar route answered 500 where 404 is the truth** (an unknown symbol / no data is "not found", not a server fault). Being fixed now by the data lane (`yahooFailureStatus.ts`, in the tree, not shipped). For the Founder's awareness only — no decision needed.
4. **Teaching-card desktop yield** is kept as canon (ruling above). Listed so he can overrule it.


## 24. Oct 9 midday — Founder decisions, flips, design calls, cert-lane reads (cert lane, written 11:50 CDT Oct 9)

LIVE `ada59d4` (builtAt 13:09:55Z) and `f9f61fe` (LIVE 11:47:37 CDT, coordinator ship gate; carries the finish-line table).

### 24a. Founder decisions (Oct 9)

| Decision | Effect |
|---|---|
| **Pricing: four tiers $0 / $10 / $20 / $50 — CONFIRMED as expected** | Closes the pricing question on the Founder list. Nothing changes in the product |
| **Order books are shown with NO venue or source label** ("no need for labels of where WM Pro gets their data") | Narrows the earlier source-word rulings **for the Depth ladder only**: the ladder prints no venue / source word. Everywhere else a named source stays a truth word (for example "Swing-high origin · tastytrade" under BIRTH SOURCE) |
| **Phone opacity is "not ATH"** | Chart lane's top priority. Measured cause (`fvg-serving-night-2026-10-07.txt`, 11:43–11:45, `ada59d4`): under 600 px the phone WORD budget marks every speaking layer QUIET, and the governor caps a QUIET layer's alpha at 0.6 — so every live layer sits at 0.6 and supporting at 0.53 |

### 24b. Flips and reads this hour

| Section | Read | Build · time | By |
|---|---|---|---|
| §11 Time-to-return | every horizon class with n of m | `ada59d4` · 11:44 | brokers lane (row 11 above; night proof file) |
| §21 Statistics | n-of-m wording, session revisit rates, average penetration, post-touch move | `ada59d4` · 11:44 | brokers lane (row 21) |
| §39 Scanner | 390 tap sizes: 50 controls, none under 44 px; refusal sentences through `scene=scanner-fixture` | `ada59d4` · 11:45 | brokers lane (row 39) |
| §40, §23, §41, §24, §29 | read on the journal sample | `ada59d4` · 11:43–11:46 | ticket lane, relayed by the coordinator — **written receipt owed** |
| §33 quiz-scene pass sentence | "10/10 correct · Marked verified on this page only — not saved (proof scene)." | `ada59d4` · 11:43 | cert lane |
| §36 sample landing | `#SAMPLE-24` lands on its decision, in view, marked "OPENED FROM A LINK · this sample decision" | `ada59d4` · 11:44 | cert lane |
| §17 FVG × walls | a wall attached: "Options walls call wall 780.00 — near (0.19 away) · owner says TESTED · DEGRADED (DELAYED chain (3862 contracts); exposure INFERRED, tests OBSERVED)" on SPY 1h | `ada59d4` · 11:46 | cert lane |
| §17, the quiet case | SPY 5m gap 777.66–777.72 with walls 778 / 780 / 785 drawn: structure row and "Liquidity pools: SILENCE"; no wall row, because no wall is within the gap's approach distance and the wall owner did draw | `ada59d4` · 11:45 | cert lane. Not a defect; noted because a trader may expect "no wall near this gap" to be said |
| NQ1! walls | `WALLS:NONE` at 11:46 (near-money subset, 131 contracts) — so the wall read had to be SPY | `ada59d4` | cert lane |
| §46 Inspect at 390 and the card on desktop | see 24c | build rolled to `f9f61fe` at 11:47:37 during the read | cert lane |

### 24c. §46 — measurement and fix plan (no source written yet)

**Measured (390 × 844, NQ1! 5m, a BORN bearish gap selected by id):** the Inspect sheet is 374 × 260 px (x 6–380, y 476–736) and scrolls inside itself (1365 px of content). 63 text leaves: 57 at 11 px, **6 at 10 px**. All six are the evidence-completeness block ("EVIDENCE COMPLETENESS ·", "FULL", the why line, "Data ·", the source words, the as-of time).

**Measured (1440 desktop, NQ1! 1h, a MEMORY gap selected by id):** the card is fixed at the left wall, x 8–276 and y 64–659 of a 1195 × 657 plot. A selected gap whose frame lies in that rectangle is under the card. The zone / level Passport already docks on the wall away from its object (`passportDockSide`); the gap's card does not.

| # | Fix | File · size | Owner |
|---|---|---|---|
| 1 | Evidence block to 11 px on phones: `text-[10px]` → `text-[10px] max-sm:text-[11px]` | `ChartInspectTicket.tsx` `EvidenceLine` (~line 217), one class | cert lane, with the coordinator's leave (shared file) |
| 2 | Publish where the selected gap's frame is: `fvgSelectedMark = FRAME:GOLD@<x>,<y>,<w>,<h>` (canvas px) instead of `FRAME:GOLD` | `MainChart.tsx` ~8612, one line | **chart lane** (ask) |
| 3 | The gap's card docks on the wall away from that frame, through the existing `passportDockSide({ objectX, paneWidth, drawerWidth })`; re-measured when the canvas attribute changes; left wall when no frame is published | `FvgInspectTicket.tsx`, about 25 lines + a render test | cert lane, after #2 |
| 4 | Any test that pins `fvgSelectedMark` to the exact string `FRAME:GOLD` moves to a prefix match | sentinel tests | chart lane with #2 |

Without #2, #3 cannot know where the gap is; #1 is independent and can ship first.

### 24d. Coordinator design calls (Oct 9)

| Call | State |
|---|---|
| **`scene=verify` token** — a verification load that holds every write and changes nothing visible (what the trader already learned still reads as learned) | in the tree (`proofScene.ts` `proofVerifyOnly`, `VerifySceneBanner.tsx`, `SelectionFirstTouch.tsx`), not shipped |
| **§13 / §14 become relationship families on the gap** (EFFORT → RESPONSE and ORDER FLOW), read as of the gap over a trailing 100-bar window; inferred sides read PARTIAL | not built |
| **WAITED / entry timing / untraded touches also on /profile** | not built |

---

## 25. §53 FVG INVENTION CERTIFICATE — the order's 24 fields (cert lane, written 11:50 CDT Oct 9)

§5 was written on Oct 7 without the order's field list and several of its rows still read BUILT. This section is the certificate in the order's own fields, each with the build that proved it. §5 stands as written (append-only); where the two differ, this section is current.

| # | Field (the order's word) | Certificate | Proved by | State |
|---|---|---|---|---|
| 1 | NAME | FVG / Imbalance (Fair Value Gap); instrument `FVG_IMBALANCE`; no FVG room | Tool Finder row and Inspect header "FVG · BEARISH · 1h" (11:47 Oct 9, build rolling `ada59d4` → `f9f61fe`) | PROVED ON SERVING |
| 2 | MARKET QUESTION | "Where did price move so fast that one side barely traded — and what has happened at that territory since?" | ⓘ preview read (`c02c2d4`, §13 row 21) | PROVED ON SERVING |
| 3 | EVIDENCE | Three closed bars on wicks; b2's body points the gap's way; size ≥ max(1 tick, 0.10 × ATR14) | Inspect size row "6 ticks · 0.06 points · 0.13× ATR14 · minimum 0.04 by 0.10 × ATR14" (`ada59d4`, 11:45 Oct 9); `fvgEngine.test.ts` | PROVED ON SERVING |
| 4 | TRUTH CLASS | Price geometry FULL from OHLC; other senses attached by reference only, never upgraded | "EVIDENCE COMPLETENESS · FULL" (11:47 Oct 9, build rolling `ada59d4` → `f9f61fe`); DEGRADED on a newest-bar gap (`c02c2d4`); EURUSD price-only (`eea2771`) | PROVED ON SERVING |
| 5 | DEFINITION_ID | `FVG_3C` v1 on every object id | `DEF:FVG_3C@1` (`eea2771`, `c02c2d4`, `ada59d4`) | PROVED ON SERVING |
| 6 | MANIFESTATION CLASS | C — territory on price, never a badge | matrix (`eea2771`); no word painted (sentinel) | PROVED ON SERVING |
| 7 | PHYSICAL GRAMMAR | remaining dense · visited hatch · rejection tick · acceptance inner line · traded through dashed far edge | matrix `eea2771`; pixels read on `c104669` (§13 rows 9, 10) | PROVED ON SERVING |
| 8 | STATE GRAMMAR | BORN → OPEN → APPROACHING → TOUCHED → PARTIALLY / DEEPLY / FULLY MITIGATED → REJECTED / ACCEPTED → TRADED THROUGH → MEMORY | states read: BORN, OPEN, REJECTED, TRADED_THROUGH, MEMORY (today 11:45–11:47, `ada59d4` rolling to `f9f61fe`; `0dd1130`), ACCEPTED (`c104669`), partial / deep / full (`eea2771`) | PROVED ON SERVING |
| 9 | PRICE RELATIONSHIP | Behind price; clear zone before the newest candle; keep-out around price and order lines | `c4de0f0`, `301d85d` (390), `d308c6c` (countdown pill). No receipt beside a live position, stop or target line | PROVED ON SERVING (position lines: not read) |
| 10 | COLOR | House buy / sell inks; state is carried by form, not colour alone | `eea2771` matrix; selected frame gold (`c104669`) | PROVED ON SERVING |
| 11 | OPACITY | Alphas per part × an age factor, floor 0.05; quieted after the "striped wall" read | opacity proof file (`f96618c`); memory fill at the 0.05 floor (`c104669`) | PROVED ON SERVING. Phone opacity as a whole is under the Founder's "not ATH" ruling (§24a) — re-read after the chart lane's fix |
| 12 | TYPOGRAPHY | None on the glass: the layer paints no word and no number. Words live in Inspect at 11 px or more on phones | sentinel `fvgGlass.sentinel.test.ts`; `301d85d` erasure note; Inspect at 390: 57 of 63 leaves at 11 px, 6 at 10 px (§24c) | PARTIAL — the six 10-px leaves (fix #1 in §24c) |
| 13 | MOTION | The only state that suggests motion is the approach glow on the near edge (`fvgGlass.ts` `glow`). No animation is cited anywhere | none | BUILT · NOT READ — no receipt names the glow on serving; "restrained motion" beyond it is not built |
| 14 | EDUCATION | ⓘ with the no-guarantee sentence; first-touch line in Inspect; 21-lesson course; lesson for the gap's own state | `c02c2d4`; `559884e` (first touch); `4769a31`; `0dd1130` (state lesson) | PROVED ON SERVING |
| 15 | SELECTION | Tap or door by id → one selection owner → gold frame | `301d85d`; `c02c2d4`; door HELD and HELD:EQUIVALENT_FEED_ALIAS (`0dd1130`, `ada59d4`) | PROVED ON SERVING |
| 16 | INSPECT | Four truth layers; definition, boundaries, creation, size, displacement, lifecycle, relationships by reference | `02e593e`; `ada59d4` (structure, wall, silence rows) | PROVED ON SERVING. Card does not dock away from the gap on desktop (§24c #2–#3) |
| 17 | DEGRADATION | Silence with a reason when identity or bars are missing; price-only on spot FX; senses say NOT ATTACHED | `eea2771` (EURUSD), `c02c2d4`, `fabce3a` | PROVED ON SERVING |
| 18 | MEMORY | A scar becomes memory 20 bars after its end, a live gap after 300 idle bars; hidden and counted, drawn only when selected | `c104669` (§13 row 12); `0dd1130` 07:50; 11:47 Oct 9 during the roll to `f9f61fe` (`fvgDrawn 9\|LIVE:5\|SCAR:3\|MEMORY:1`) | PROVED ON SERVING |
| 19 | DESKTOP | Full territory, Inspect card inside the pane | `eea2771`, `301d85d` (1920), today 1440 | PROVED ON SERVING |
| 20 | TABLET | 1180 × 820 and 834 × 1112: clear zone, tap, Inspect inside, Replay | `c02c2d4` | PROVED ON SERVING at viewport size — **physical tablet owed** (Founder list) |
| 21 | PHONE | 390: bands, clear zone, cost, Inspect as a sheet with 44-px controls | `301d85d`, `d308c6c`, `6568fa3`; today's 390 read | PROVED ON SERVING at viewport size — **physical phone owed**; phone opacity under §24a |
| 22 | PERFORMANCE | Compute per closed bar; paint within the 1.5 ms budget | `301d85d` (mean 0.75–1.03 ms), `c02c2d4`; bench at CPU ×4 | PROVED ON SERVING (bench) — real phone owed |
| 23 | PROVENANCE | Every gap names its bars' source and as-of time; ids carry the feed; a door from another feed is held as an alias, not silently re-pointed | "Data · broker feed · as of 2026-10-09 11:45:00 CDT" (11:47 Oct 9, during the roll to `f9f61fe`); `EQUIVALENT_FEED_ALIAS` (`0dd1130`) | PROVED ON SERVING |
| 24 | AS-OF-TIME BEHAVIOR | Every lifecycle fact is stamped with the close that revealed it; live, Replay, Backtest and Journal read through one as-of accessor | `LEAK:0` on every read (`eea2771` … `ada59d4`); Replay (`301d85d`); Backtest clock; Journal snapshot (`eea2771`) | PROVED ON SERVING |

**Count:** 24 fields — 21 PROVED ON SERVING (three with a named device or line caveat), 1 PARTIAL (TYPOGRAPHY), 1 BUILT · NOT READ (MOTION), and TABLET / PHONE proved at viewport size with a physical device owed. §53 stays PARTIAL in the finish-line table until TYPOGRAPHY and MOTION close.

Note on builds: the cert lane's 11:47 reads were taken while production rolled from `ada59d4` to `f9f61fe` (LIVE 11:47:37); `/api/build-identity` read `ada59d4` at 11:43 and `f9f61fe` at 11:48:16. Rows above that cite 11:47 are on one of those two builds.

### 24e. Ruling — §5 regime context: two named scopes, never one word (coordinator, 2026-10-09 11:59 CDT)

**Finding (read-only, 11:53–11:57).** Every gap reads UNTAGGED because no caller passes the engine's `regimeOf` hook — and none lawfully can. The regime owner (`selectRegime`, through `deriveRegimeDimension`) reads the per-trade tape; the Command Deck's "TREND EXPANSION" is gated on that same tape-derived dimension. A tape reading cannot be recomputed for a past bar once the tape is gone, so stamping it on a gap would make the same OBJECT_ID read differently after a reload.

| Scope | Owner | Where it may appear | Never |
|---|---|---|---|
| **REGIME (tape)** | `selectRegime` / `selectRegimeSeries` | Inspect on the live chart, by reference, read each time ("Regime at formation (tape): …" or "not read — the tape does not reach this bar"); the journal saves the live verdict at the decision | stamped on the gap; shown in a bar-only study (the study's regime split stays UNTAGGED with its note) |
| **VOLATILITY (bars)** | Market Breathing (`readMarketBreathing`), through `fvgFormationContext.ts` | Inspect context row; a new "volatility" facet in the FVG study; the journal context | called "regime" |

As-of law for the bars scope: closed bars up to and including b2 only. SILENCE: fewer than 40 closed bars, bars with no clock, b2 not among the bars. Built by: cert lane — the helper (tree, 12:01); ticket lane — the Inspect row and the journal hunks; brokers lane — the study facet. `regimeOf` stays unused, with the reason beside it. §5 flips in the finish-line table when Inspect says the regime reading or its "not read" sentence on serving.

### 24f. Serving read — Inspect at 390 after fix #1 (cert lane, 12:03 CDT Oct 9)

Serving `e05c774` (build identity read first, builtAt 16:59:20Z; own tab, read-only, closed 12:03). 390 × 844, NQ1! 5m, `scene=clean&on=fvg`, the gap at the published hit point selected by id (`…|5m|1791564300000|BULLISH|v1`, FULLY_MITIGATED). The Inspect sheet (x 6–380, y 476–736): **71 text leaves, every one at 11 px; 0 under 11 px** (was 6 of 63 at 11:47). The evidence-completeness block computes 11 px. No horizontal overflow. `data-inspect-fvg-dock=LEFT` (the dock is wired; the chart does not yet publish the frame's position). §25 row 12 TYPOGRAPHY → **PROVED ON SERVING**. §53 remains PARTIAL for MOTION only (plus the physical devices).

### 10d. Management lane serving receipts — written by the lane that read them (2026-10-09 12:04 CDT)

Same text as appended to `~/wm-held/proof/fvg-serving-night-2026-10-07.txt`. Fixture reads are fixture reads; rows needing a Founder action stay owed.

```

== PATIENCE / MANAGEMENT LANE — SERVING RECEIPTS (written by the lane that read them) · Oct 9 2026 CDT
  METHOD: own tab (opened + closed), read-only, sandboxed same-origin iframes at 390x844 and 1440, signed-in fixture scenes; no press, no save, no order.

  -- READ 1 · serving ada59d4 (build-identity) · 11:43–11:46 CDT · /journal journal-fixture and /profile profile-fixture
  §40 CONTEXT + ROUND TRIP: 10 rows, 10 same, verdict "SAME SNAPSHOT AFTER RELOAD"; row "Context at the decision" before = after:
      "Context at the decision (from 26 closed bars): structure none · profile vah · wall silence · displacement bar SILENT · regime UNTAGGED." (390 and 1440) → PASS (fixture)
  §23 WAITED: dimensions WHEN, DEPTH, AGE, WAITED. Rows: Waited for a confirming close 5 · Entered before a confirming close 19 · Entered before any touch 0 · Confirmation not recorded 0 (= 24 gap decisions), each INSUFFICIENT EVIDENCE n of 20.
      Rule line present ("A confirming close, as the Academy defines it — trading with the gap: after the touch, a bar closes back outside on the origin side, without full mitigation — within the first 5 bars of that visit … Trading against it: A close beyond the far boundary invalidates the territory").
      Door "Study: Lesson 9 · Rejection vs acceptance →" → /education lesson fvg-9. Right edge 339 of 386 (390), 1137 of 1440; page h-scroll 0 both → PASS (fixture)
  §41 "DID THEY WAIT?": answered by the WAITED rows (one fact). Review-question blocks: thin book both INSUFFICIENT EVIDENCE ("0 and 24 … 20 each side needed"); wide book both MEASURED ("Far-edge targets: mean 3R over 24, the exit reached the target on 16 of 24. Other gap targets: mean 0.87R over 24. Descriptive only.") → PASS (fixture)
  §24 TIMING: "You entered before the gap was touched on 0 of 24 gap decisions, and during a touch on 21. INSUFFICIENT EVIDENCE to compare their results: 0 and 21 with a recorded R (20 each side needed)."
  §24 UNTRADED (corrected sentence): "On the days you traded gaps, 26 touches you did not trade have settled: the territory rejected on 4 (15%), was accepted on 2, traded through on 8 and gave no answer on 12. Descriptive only — a touch you left is not a trade you missed." 4+2+8+12 = 26 → PASS (fixture), byte-identical at 1440
  §29 CHOOSER: closed review rows 0 chips and no label word (fear / impatience / FOMO / revenge / over-management / hesitation / overconfidence); sample chooser 8 chips, 5 rows, rule line "Only you choose these. WM never picks one" → PASS (fixture)
  PROFILE LESSON DOORS: 3 books, 9 departure rows, 5 with a Study door, 0 doors on a non-MEASURED row, h-scroll 0 (390 and 1440) → PASS (fixture)
  NOT SHOWN ON /profile at that build: WAITED rows, timing line, untraded line (0 found) — mount ordered, not yet built.
  ALL OF THE ABOVE ARE FIXTURE READS. A real saved gap decision with a context line is still owed (needs a Founder action).

  -- READ 2 · serving e05c774 (build-identity) · 12:02–12:04 CDT · §13 / §14 slice 1
  INSPECT, REAL DATA, /charts NQ1! 5m under scene=verify (banner "VERIFICATION — real data, nothing is saved"), gap selected BY URL (select=fvg:FVG|TASTYTRADE:/NQZ26:XCME|5m|1791552600000|BEARISH|v1 → HELD), 1440:
      "Market structure swing inside 31165.25 — inside · FULL (…)" and "… 31156.25 — inside · FULL (…)"
      "Effort→response displacement bar — at formation · owner says INITIATIVE · large effort · large response · effort 26.20× median volume · response 0.86 ATR (2.31× median) · FULL (traded volume; each bar ranked over the 100 closed bars ending at that bar)"
      "Order flow displacement bar — at formation · owner says BALANCED · neither side took the larger share (buyers 50% · sellers 50%) · PARTIAL (the provider's per-bar bid / ask volume — an aggregate for the bar, not prints)"
      → §13 Inspect row PASS on real data. §14 Inspect row PASS on the provider's bar sides (PARTIAL).
      NOTES: b2 of that gap is the 09:30 ET bar, ranked against the 100 bars before it (overnight) — hence 26× median volume; true by the stated window. The gap had no interaction yet, so no touch-bar row was seen on real data. No captured-tape (FULL) flow row was seen: the tape only holds bars since the page opened. No wall line of any kind appeared for this gap (no silence, no "none near") — not yet explained.
      NOT READ: 390 width for these Inspect rows; a spot-FX gap (effort SILENCE on real data).
  JOURNAL FIXTURE /journal journal-fixture, 390 and 1440 (identical): round trip 10 of 10 same, context row same = yes:
      "Context at the decision (from 85 closed bars): structure none · profile none · wall silence · displacement bar ORDINARY · touch bar ORDINARY · order flow silence (no signed volume in these bars) · regime UNTAGGED."
      Context splits: Displacement bar ORDINARY 16 · INITIATIVE 4 · VACUUM 3 · Effort→response SILENT 1 (= 24). Touch bar ORDINARY 14 · INITIATIVE 6 · QUIET 2 · VACUUM 2 (= 24). Order flow SILENT (no signed volume held for the gap's bars) 24. Every row INSUFFICIENT EVIDENCE n of 20. h-scroll 0.
      → §13 journal context PASS (fixture); §14 journal SILENCE PASS (fixture).
      The one "displacement SILENT" decision is counted in the split; its own sentence ("displacement bar SILENT · touch bar …") is not printed anywhere on the page, so that wording was read in a unit test only.
```

### 10e. Management lane serving receipts — 12:23–12:27 CDT Oct 9 (written by the lane that read them)

```

  -- READ 3 · PATIENCE / MANAGEMENT LANE · 12:23–12:27 CDT Oct 9 · own tab (opened + closed) · scene=verify (banner "VERIFICATION — real data, nothing is saved")
  §5 (B) INSPECT on serving f37005c, /charts NQ1! 5m 1440, gap FVG|TASTYTRADE:/NQZ26:XCME|5m|1791552600000|BEARISH|v1 selected by URL → HELD:
      "Volatility at formation: expanded — range 1.51× its normal (from 4954 closed bars)."
      "Regime at formation (tape): not read — the chart keeps the tape regime per bar only while Regime Lighting is on."
      → PASS for the bars-scope sentence and for the tape-scope "not read" sentence. NOT READ: a tape regime WORD (Regime Lighting was off on this account; the "tape does not reach this bar" sentence was also not seen).
  WALL CASE, same gap: html data-derivatives-pressure=OFF; Inspect says "Options walls: SILENCE — no options positioning attached" and "Liquidity pools: SILENCE — no liquidity reading attached".
      CORRECTION to READ 2: the blank I reported at 12:03 was my scrape taken before the silences had rendered. The owner returned nothing because the options layer is off — the existing silence stands and is printed. The "drawn with no wall and no flip" line shipped in 6944df9 has not been seen on serving (no such case found).
  §5 (C) JOURNAL CONTEXT: not read on serving in this pass (journal fixture not re-opened after f37005c).
  §13 SCANNER on serving 6944df9, /scanner 1440: opened FVG conditions and pressed "Read 30 symbols (daily, closed bars)" (a read; writes held): read 30 of 30, 0 refused.
      Filter chip "FVG + effort→response" present. One hit: MSTR · FVG + effort→response · with deep mitigation · 133.42 – 164.49 —
      "Effort→response displacement bar — at formation · owner says INITIATIVE · large effort · large response · effort 3.05× median volume · response 1.85 ATR (4.85× median) · FULL (traded volume; each bar ranked over the 100 closed bars ending at that bar)"
      "FVG + order flow: UNAVAILABLE for the 12 symbols with a condition — needs signed tape …" (unchanged). No effort UNAVAILABLE line (every hit gap was read).
      → §13 scanner PASS on real data. NOT READ: the effort UNAVAILABLE line on a spot-FX symbol; the backtest effort split; 390 width.
  MEASURED DEFECTS (serving f37005c, /journal): at 834 the header title is 48px wide on two lines, each stat pill 73px wide × 66px tall (text on five lines), filter buttons run to x=1029 on an 834 screen inside the scroller. Fix in tree (not yet on serving).
  /profile at 390 (serving 6944df9): avatar box 24,243 80×80; banner display name 24,186 288×40 (bottom 226) → 17px clear; h1 name at x=120 beside the avatar. The reported "avatar covering the display name" was NOT reproduced at this width with this account's name.
```

## 26. Oct 9, 12:00–12:28 CDT — builds, audits, signed-in passes (cert lane, written 12:28 CDT Oct 9)

### 26a. Builds this hour (LIVE times are the coordinator's ship gate; build identities below were read by the cert lane)

| Build | What | Read |
|---|---|---|
| `e05c774` (builtAt 16:59:20Z) | **Phone opacity, cause and fix.** Cause measured on `ada59d4`: under 600 px the phone WORD budget marked every speaking layer QUIET and the governor capped QUIET at 0.6, so every live layer sat at 0.6. Fix: the word budget no longer dims ink (LIVE 1.0, SUPPORTING 0.55, MEMORY 0.30). Also: the Inspect evidence block at 11 px on phones; the gap's Inspect card dock wired; `scene=verify` | Inspect at 390: 0 of 71 text leaves under 11 px (§24f) |
| `f37005c` (builtAt 17:14:44Z) | **Phone glass, second pass** (names never fainter than 0.8; timeframe chip clear). Selected-frame geometry published (`FRAME:GOLD@x,y,w,h`); glow count in `fvgDrawn`; Inspect prints volatility at formation and the regime line; `fvgFormationContext.ts` | §5, §46 dock, §53 MOTION — rows above |
| `6944df9` (builtAt 17:21:19Z) | **Price sovereignty on phone glass** (big-trade discs and options-flow marks step off the newest candles); API audit closures P1-1, P1-2, P1-4, P1-6; the verification banner moved off the thumb bar | opened-surface pass at 834 (26d) |

**Founder changed his saved layers mid-shift** (absorption anatomy on). That exposed the path-drawn effort mass painting at 0.67 ink over the candles ("EFFORT — the mass around price — ABSORBING", seen at 834 in `open-tools-834.png` / `open-trade-fixture-834.png`). Fix is in the next chart ship. Not yet fixed on serving.

### 26b. API audit (brokers lane; recorded as reported by the coordinator, not re-run by this lane)

No P0. Six P1: **P1-1, P1-2, P1-4, P1-6 closed in `6944df9`**; **P1-5 in progress**; **P1-3 (Webull wording) is a Founder decision**.

### 26c. Signed-in responsive pass under `scene=verify` — `e05c774`, 12:04–12:10

/charts, /journal, /profile, /education, /scanner, /backtesting, /desk, /command-deck, /morning-prep × 1440 / 834 / 390 = **27 / 27**: reached; banner "VERIFICATION — real data, nothing is saved"; 0 storage writes and 0 non-GET requests from any page (about 8 s each, wrapped 107–210 ms after navigation); no horizontal scroll; nothing past the right edge. Screenshots: `~/wm-held/proof/release-signed-in-2026-10-09/`.

| # | P | Finding | Where | Owner | State |
|---|---|---|---|---|---|
| 1 | P1 | The verification banner covered the middle of the phone thumb bar | every room, 390 / 834 | scene owner | **moved to the top in `6944df9`** (read 12:25: y 90–117 at 834). At 390 it now sits on the first lines of an opened sheet (26d #2) |
| 2 | P1 | Big-trade disc and PUT OI / CALL OI labels on the newest candles | /charts 390 / 834 | chart lane | slice shipped in `6944df9`; not re-read by this lane |
| 3 | P2 | The avatar covers the display name | /profile 390 | profile owner | open |
| 4 | P2 | Header pills squeezed to about 40 px (834); tabs wrap to three lines (390) | /journal | journal owner | open |
| 5 | P2 | The stage nav wraps to two rows; about 230 of 784 px of shell before room content at 390 | shell | shell owner | open |
| 6 | P2 | Pane toolbars truncate; tape and silence lines over the candles in 4-up panes | /desk 834 | chart lane | open |
| 7 | P2 | Glass words collide; five stacked silence lines over the lower-left candles | /charts 834 / 390 | chart lane | open |

### 26d. Opened surfaces against the thumb bar — 390 on `f37005c` (12:21–12:24), 834 on `6944df9` (12:25)

Thumb bar at 390: y 732–784. 0 storage writes on every read.

| Surface | 390 | 834 | Verdict |
|---|---|---|---|
| TRADE (ticket sample scene, BUILD step) | panel y 87–680, no inner scroll, clear of the bar | panel x 24–424, y 156–720; Details open, 916 px of inner scroll | clear |
| Tools drawer | full-screen sheet with its own Close | left drawer 395 px wide | clear. The five per-tool buttons are icon-only (S, ring, gear, half-moon, ×) — no visible word says what each does (P2, chart lane) |
| Chart tools sheet | full-screen dialog with Close | — | clear |
| Compare | sheet y 96–237 at the top | — | clear |
| Alerts | right drawer x 86–386, full height, with Close | — | clear |
| Depth ladder | full-height sheet; "NO OBSERVED MARKET DEPTH" with the reason and "Check connections →" | right sheet | clear. **#2 (P2, scene owner):** at 390 the verification banner (y 137–180 once a sheet is open) covers the sheet's own line beside "Check connections" |
| Replay bar (`replay=start`) | controls y 502–644, above the bar; door STARTED | bar y 700–744 | clear |
| Inspect sheet (gap) | y 476–736 measured at 844-px height (§24f) | card inside the pane | clear |
| Connect drawer | not found | not found | **NOT READ** — no door named Connect / Broker in Tools, Chart tools, its More menu or Workspace at 390. The Depth sheet's "Check connections →" was not followed |

### 26e. Lesson diagrams (cert lane, tree, 12:26)

Measured: the lesson column is 358 px on a 390-px phone, the drawing is 300 units wide, so the old 9-unit labels rendered at 10.7 px and the 7.5-unit sub-labels at 9 px. Now one size, `LABEL_UNITS = 9.25` (11 px at 390), no label smaller; the three sub-labels shortened to fit ("reference a gap" — replacing "tag FVG", a control that does not exist — "market · session", "what N supports"). `FvgDiagram.tsx`; two cases in `fvgCourse.test.ts`. Not shipped.

### 26f. Serving reads on `79bb6fd` (builtAt 17:36:24Z; cert lane own tab, read-only, closed 12:43; 0 storage writes on every read)

| Read | Result | State |
|---|---|---|
| Regime line with Regime Lighting on (`on=fvg,RegimeLighting`; the URL switch exists, no saved layer flipped) | Lighting drew (`regimeLighting RANGE`, verdict COMPRESSION, `regimeStateLine 3\|X1\|NOW:BALANCE`). The gap's Inspect: "Regime at formation (tape): not read — the tape does not reach this bar." (NQ1! 5m, gap 3.7 h old; NQ1! 1m, gap 47 min old, series 11 bars). Volatility lines: "expanded — range 1.51× its normal (from 4950 closed bars)", "compressed — range 0.71× its normal (from 2953 closed bars)" | both "not read" sentences PROVED; a regime word at formation NOT READ (no gap inside the tape's reach) |
| Connect brokers, door 1: Chart tools → More chart tools → Connect brokers | **390:** full-screen sheet with its own Close; 358 text leaves, 0 under 11 px; 5 controls under 44 px (mouse pointer). **834:** sheet x 0–830; **312 of 363 text leaves under 11 px** (9–10 px); 4 controls under 44 px | clear of the thumb bar. **P2 (brokers lane): tablet type is 9–10 px** — the 11-px floor applies below 640 px only |
| Connect, door 2: Depth ladder → "Check connections →" | Leaves the chart for the Connections page (phone nav present). **390:** 0 of 223 leaves under 11 px; 5,532 px of page. **834:** 83 of 223 under 11 px. The page reads "7/10 providers configured", "13/40 required names present · Values stay sealed in approved runtime stores" | reached. **P2 (brokers lane):** operator words on a page a member reaches from the Depth sheet; the door leaves the chart without saying so |
| Lesson diagram labels at 390 (lesson 21) | The drawing is **318 px** wide at 390, not the 358 px assumed at 12:26: all 7 labels render at **9.81 px**. "reference a gap" is on the drawing. The lesson's WHAT TO LOOK FOR still said "Tag FVG trades in the Journal." | **NOT at 11 px on serving.** Fixed in the tree 12:44: `LABEL_UNITS = 10.4` against the measured 318 px (11.02 px); four long labels shortened or end-anchored so none runs past the drawing; caption and lesson eyebrow at 11 px on phones; lesson 21's look line names the real control. Serving read owed after the next ship |

### 26g. Remaining — everything not PROVED ON SERVING (22 of 66 at 12:46; 21 at 12:55 after §13)

| Group | Sections | What closes it | Owner |
|---|---|---|---|
| Fixture rows (11) | 23, 24, 26, 27, 28, 29, 31, 36, 40, 41, 64 | the Founder's real-account actions — handover (c) | Founder, then management lane reads |
| Build gap | 14 (13 closed 12:55) | §13 flipped from the ticket lane's receipts. §14: the PARTIAL path is proved; a FULL order-flow row from captured tape has not been seen on serving | ticket lane |
| Devices | 52, 58 | physical phone and tablet — handover (d) | Founder |
| Composite | 59, 62, 65, 66 | close when the rows above close; §66 also needs the Webull server gate read on serving and the Founder's permission rule for authorized execution | coordinator |
| Founder decisions | 61, 63 | FVG default ON / OFF; his own Sheriff walk | Founder |
| Law | 2 | authorship law — no serving proof exists | — |

---

## FOUNDER HANDOVER — Oct 9 (cert lane draft, written 12:46 CDT; production `79bb6fd`)

### (a) What shipped today, by build

**Night and morning (00:00 – 08:10)**

| Build | For the trader |
|---|---|
| `0971594`, `ea8ad94` | Every indicator's ⓘ says what the tool does now; pivots no longer squash the candles; Brick Walls says its silence once |
| `9f4d784`, `7f2ca59` | Futures options name a near-price chain and withhold what they cannot hear; phone ticket in two steps; footer volume names its unit |
| `b290eef` | Every in-app door lands on a clean chart and gives your own layers back afterwards; Webull shows one history |
| `559884e` | **The Webull order door runs the server gate (kill switch, arm, caps, quote, protection) before any broker call** — found missing at 06:54, closed 07:06 |
| `92895d6` | Compare at every width; Alerts say what they are; "Practice in Replay" starts Replay |
| `0dd1130` | Inspect opens the lesson for what the gap is doing; lessons 12, 20, 21 corrected; the loop ends RETURN TO MARKET BETTER; quiz sample scene; a proof scene writes nothing |
| `16f363a`, `ada59d4` | Words on the chart claim their space; your own labels for why a plan changed; Depth ladder says why it has no book; scanner refusals in plain words |

**This shift (11:43 → )**

| Build | For the trader |
|---|---|
| `f9f61fe` | A truth line is never hidden by a lesser word; the 66-section finish-line table |
| `e05c774` | **Phone glass no longer dimmed** (the cause: the phone word budget was dimming ink, not only words); Depth ladder without source labels; `scene=verify` (real data, nothing saved); Inspect type at 11 px |
| `f37005c` | Phone names never fainter than 0.8; 11-px type floor on phones in every room; a gap's Inspect says volatility at formation and the regime line; the Inspect card moves away from the gap |
| `6944df9` | **Price sovereignty on the phone** — discs and option marks step off the newest candles; stage nav on one row; four API tightenings |
| `5b12137` | The absorption effort mass held to the fog cap and stopped at the newest candles |
| `79bb6fd` | No notch behind the newest candles; one failure wording for guests and members; Personal Edge gap study on /profile; journal header on one row |
| `6e150db` | Selected items keep their words on the phone; lesson drawings readable on a phone (every label 11 px) |

Finish line at 12:57: **46 of 66 sections proved on serving, 12 proved on sample data, 5 partial, 1 built and unread, 2 waiting on you.**

### (b) Decisions waiting on you — with the default in force today

| # | Decision | Default in force until you rule |
|---|---|---|
| 1 | Order-submit rate limit, and a daily order cap | **None set.** The order doors run the server gate (kill switch, arm, caps, quote, protection) but there is no "N orders per window" and no per-day ceiling |
| 2 | The 13 probable sweep symbols in the coverage ledger (AVAX 2, LTC 6, BZ1! 10, 6E1! 21, ZN1! 97, /ES 61, ESZ6 17, /BTC 3, RTY1! 5, /MNQH7 149, "BTC-" 1,821, DOGE 45, QQQ 34) | **Left in place.** Nothing edited or deleted |
| 3 | The two selling strings added today: the loop sentence ends "→ RETURN TO MARKET BETTER"; the 15th line reads "That is a Trading Operating System." | **Live** on /welcome, /pricing, /login. Both are your own sentences; the selling copy as a whole has never been redlined by you |
| 4 | Passport intro-offer line (first month $10, then $20) and the referral links | **Shown as display only**; referral links wait for your URLs. Four tiers $0 / $10 / $20 / $50 — confirmed by you today |
| 5 | Futures option walls on a near-price chain: scoped (A) or withheld (B) | **A, shipped:** walls drawn as NEAR-PRICE OPEN INTEREST; zero-gamma and the pressure field withheld, with the reason on the glass |
| 6 | **Webull submit wording** (API audit P1-3). The glass says Webull submit is "GATED (submit order not switched on)", but the route sends once limits are set and an armed, confirmed order is within caps (`order-submit/route.ts` holds `liveOrdersEnabled: true`, per your 2026-10-01 instruction). **A:** add a real server switch, default off, so the sentence is literally true. **B:** keep the route and change the words to what is true | **The route sends when armed; the words say GATED.** The sentence on the glass is not true today |
| 7 | **Masthead feed reading on phones.** "LIVE — CERTIFIED QUOTE · certified realtime · asOf HH:MM:SS ET" is under 11 px on phones: at 11 px its three lines wrap to four and the masthead grows from 133 to 144 px, taking 11 px from the chart. Raise it and accept the height, shorten the words, or leave it | **Left small** — the one exception to the 11-px phone floor |
| 8 | GC1! decimals: the chart prints gold at 2 decimals, the ticket at the true tick | **Both stand** — chart 2 dp, ticket true tick |
| 9 | Phone ticket: at most 55 % of the glass while acting? | **Not enforced as a limit.** Measured: PEEK 51 %; BUILD fits without inner scroll (592 px of 844) |
| 10 | 390 px: where the Liquidity Weather lens's words live | **The lens yields at phone width** — its stage has no mark on the glass there |
| 11 | Teaching card on desktop yields (docks clear of the silence band) | **Kept as canon** (coordinator ruling) — listed so you can overrule |
| 12 | Memory Ghost: dashed outline (code) or the plate's faint filled candles | **Dashed, as coded** — deferred with your scope decision |
| 13 | **Living Profile line grammar.** Its P-110 plate draws the profile's lines in its own grammar; every other profile uses a solid POC and dashed value-area edges. Keep the plate's grammar, or adopt the shared one | **The plate's grammar** |
| 14 | FVG layer default | **OFF.** A trader switches it on in Tools; lessons and doors switch it on for that visit only |
| 15 | TED definition | **None.** Its ⓘ says "definition pending Founder"; nothing is drawn as TED on the candles |
| 16 | **A server-read quote before a live order is checked** (API audit P2-1; the brokers lane's Plan 1, written out under "Founder list — addition" in this document). Today the gate's quote — used for the staleness check and to price a market order — is the one the browser sends. Proposal: for a risk-increasing order the server reads its own quote; none, or a disagreement beyond a small band → refused in plain words; closing and protective orders unchanged. Read on `6e150db`: tastytrade answers for futures-option contracts on all eight products tried, **but a thin strike often has no bid** (1 of 3 on /CL and /ZN) — the collar would refuse those; Webull has no server-side option quote, so a Webull option order would be collared by a tastytrade quote, as it already is in the browser. **Four questions:** refuse when the server cannot read a two-sided quote? on thin strikes, refuse or allow a limit order you price? how wide the band (for example 0.5 % or two ticks)? is a tastytrade quote acceptable for a Webull option order? | **Not in force.** The gate uses the browser's quote; nothing is refused for want of a server quote. NOT BUILT until you decide |
| 17 | BTC-USD depth shows the book WM reads, with no venue label | **DECIDED by you today** — in force since `e05c774`. Listed as a record, not a question |
| 18 | **Radio link hosts.** A radio link may now point only at WM's own store, archive.org or Dropbox. This is a NEW restriction, chosen by the team today — is it the right list? | **The new list is in force:** WM's store, archive.org, Dropbox. Any other host is refused |
| 19 | **Billing turn-on.** The billing owners are built (routes next). Turning it on needs six environment variables set by you, and the Terms and Privacy pages still say "not in effect yet" | **Off.** Nobody is charged by WM Pro; the four tiers are display only |
| 20 | **WOW World live mode — findings only, nothing changed** (billing audit): a second subscription can be bought on top of a first; a refund leaves the membership active; the $20 purchase enforces nothing | **As found.** Yours to rule: fix in WOW World, or accept until WM Pro's own billing is on |
| 21 | **Prop desk on sign-out** — should the desk's numbers be purged from the device when you sign out? | **Kept on this device** ("Kept on this device only"); not purged on sign-out |
| 22 | **A real fills export is needed.** The prop desk's file import has only read synthetic files | **Synthetic-certified only.** One real export from the firm, from you, would certify the reader |
| 23 | **TradeDay day boundary** — which clock ends a trading day for the consistency rule (the firm's rule decides the largest day) | **The days are as you type or import them**; WM applies no boundary of its own |
| 24 | **Dashboard read-back** — the desk's figures are UNVERIFIED until you read them back from the firm's dashboard and stamp them | **UNVERIFIED** on every figure until stamped |

Also decided by you today and now in force: order books carry no venue or source label (Depth ladder only); phone opacity "not ATH" — fixed across `e05c774` → `79bb6fd`, your eye is the last check.

### (c) Real-account actions that would close the sample-data rows (11 at 12:46; 12 at 12:57 with §65)

Each row is proved on labelled sample data. Nothing is ever written to your journal or sent on your account by the lanes, so only you can make the real record.

| Your action | Closes | What we then read (read-only) |
|---|---|---|
| 1. In Morning Prep, write today's management rules; on a ticket, confirm the plan card and send **one order through WM** (paper or the smallest live size) | §27 plan snapshot | the plan frozen at the send, with later changes as dated amendments |
| 2. Let that trade complete (exit by plan or not) | §26 management behaviours, §28 premature exit, §64 management Sheriff | market / planned / actual side by side; the factual departure, no emotion word |
| 3. In the Journal, save one entry with **"Reference an FVG"**, then reload | §40 Journal, §36 Show me my examples | the same snapshot after reload; the entry listed under "Show me my examples" in the Academy |
| 4. On that entry's Review row, pick your own label for why the plan changed (or leave it) | §29 psychology | your label counted beside the departure; nothing inferred |
| 5. Ask SpaidBot one Review question on that decision | §31 SpaidBot × management | the answer quotes your plan and asks what changed it — no "you panicked" |
| 6. Keep journaling gap decisions: the comparisons need **20** on each side | §23 Personal Edge, §24 counterfactual, §41 Review | counts today; a comparison only at 20 |

One trade and one journal entry (actions 1–5) close eight of the eleven; §23, §24 and §41 show counts at once and comparisons at 20.

### (d) What cannot be proved without a physical phone or tablet

- **Touch size and tap behaviour.** Every measurement here is a mouse pointer in a resized window; rules that enlarge targets under a finger (`pointer: coarse`) do not apply in it. The 44-px floor is proved by emulation only.
- **Safe areas** — the notch, the home bar, the on-screen keyboard over the ticket and the Journal.
- **Real-phone performance** — the gap layer is measured at 4× CPU slowdown on this Mac (about 30 ms cold, 6–7 ms per closed bar), not on a phone.
- **How the phone glass looks to you** — opacity, ink and the newest candles on a real OLED screen at arm's length. Today's four phone ships were measured in numbers; "ATH" is your eye.
- **Tablet in both orientations with touch** — pinch, drag, long-press on the chart; the iPad drag has been pending since Oct 2.
- **Sign-in on the phone** (Supabase site URL items from Oct 6 still need your dashboard).

What would close it: ten minutes on your phone and your iPad on /charts (tap a gap, open TRADE, open Tools, rotate), with screenshots sent to the team.

### 10f. §13 / §14 receipts for the finish-line table — management lane, written 12:56 CDT Oct 9

```

== §13 / §14 RECEIPTS FOR THE FINISH-LINE TABLE — PATIENCE / MANAGEMENT LANE · written 12:56 CDT Oct 9 2026 by the lane that read them
  METHOD (all): own tab, opened and closed; signed-in; sandboxed same-origin iframes; scene=verify ("VERIFICATION — real data, nothing is saved") for real-data reads, fixture scenes otherwise. Gaps selected by URL (select=fvg:<id>), once by a synthetic click on the chart canvas (selection only). Scanner / Backtest read buttons pressed under the write hold. No save, no order.

  §13 FVG × EFFORT→RESPONSE
   a) INSPECT, real data — e05c774, 12:02–12:04 CDT, /charts NQ1! 5m 1440, gap FVG|TASTYTRADE:/NQZ26:XCME|5m|1791552600000|BEARISH|v1 → HELD:
      "Effort→response displacement bar — at formation · owner says INITIATIVE · large effort · large response · effort 26.20× median volume · response 0.86 ATR (2.31× median) · FULL (traded volume; each bar ranked over the 100 closed bars ending at that bar)"
   b) INSPECT touch bars, real data — 6e150db, 12:54 CDT, /charts NQ1! 1m 1440, gap …|1m|1791567960000|BULLISH|v1 → HELD:
      "Effort→response touch bar — at touch 1 · owner says QUIET · small effort · small response · effort 0.54× median volume · response 0.24 ATR (0.57× median) · FULL (…)"
      "Effort→response touch bar — at touch 2 · owner says ORDINARY · ordinary effort and response · effort 1.00× median volume · response 0.57 ATR (1.38× median) · FULL (…)"
   c) SCANNER, real data — 6944df9, 12:26 CDT, /scanner 1440: read 30 of 30 symbols, 0 refused; chip "FVG + effort→response"; hit MSTR · with deep mitigation · 133.42 – 164.49:
      "Effort→response displacement bar — at formation · owner says INITIATIVE · large effort · large response · effort 3.05× median volume · response 1.85 ATR (4.85× median) · FULL (…)"
   d) BACKTEST effort split, real data — 79bb6fd, 12:42 CDT, /backtesting FVG Study, NQ1! 5m added: 194 gaps = Not read 4 · Initiative 91 · Ordinary 77 · Vacuum 22 (adds up). "Not read" was listed second; ordered last in 6e150db (not re-read after that ship).
   e) JOURNAL context + splits, fixture — e05c774 12:04 and 79bb6fd 12:41, 390 and 1440 identical: context line carries "displacement bar ORDINARY · touch bar ORDINARY"; splits displacement ORDINARY 16 / INITIATIVE 4 / VACUUM 3 / SILENT 1 (=24), touch ORDINARY 14 / INITIATIVE 6 / QUIET 2 / VACUUM 2 (=24); round trip 10 of 10.
   NOT READ for §13: effort SILENCE on a real spot-FX gap (Inspect or scanner UNAVAILABLE line); Inspect rows at 390; a real saved journal entry (needs a Founder action).

  §14 FVG × ORDER FLOW
   a) INSPECT, provider bar volume — e05c774, 12:03 CDT, NQ1! 5m gap above:
      "Order flow displacement bar — at formation · owner says BALANCED · neither side took the larger share (buyers 50% · sellers 50%) · PARTIAL (the provider's per-bar bid / ask volume — an aggregate for the bar, not prints)"
   b) INSPECT touch row, provider bar volume — 79bb6fd, 12:42 CDT, NQ1! 1m gap …|1m|1791564840000|BEARISH|v1 (selected by a click on the canvas):
      "Order flow touch bar — at touch 1 · owner says BUYERS · buyers took 56% of the bar's signed volume · PARTIAL (the provider's per-bar bid / ask volume — an aggregate for the bar, not prints)"
   c) INSPECT, CAPTURED-TAPE ROW — 6e150db, 12:54:37 CDT, NQ1! 1m gap …|1m|1791567960000|BULLISH|v1 → HELD; html data-tape-coverage FROM:1791568200 (17:50Z) · SIDED_BARS:5; tape backfill "TASTYTRADE_TIMEANDSALE:1000prints … snapshot 17:50-17:54Z":
      "Order flow displacement bar — at formation · owner says BUYERS · buyers took 64% of the bar's signed volume · from the provider's per-bar bid / ask volume · PARTIAL (mixed — captured signed prints on some of these bars, the provider's per-bar bid / ask volume (an aggregate, not prints) on the others; each row names its own)"
      "Order flow touch bar — at touch 1 · owner says SELLERS · sellers took 60% of the bar's signed volume · from the provider's per-bar bid / ask volume · PARTIAL (mixed …)"
      "Order flow touch bar — at touch 2 · owner says SELLERS · sellers took 60% of the bar's signed volume · from captured signed prints · PARTIAL (mixed …)"
      → a TAPE-basis row read on real data (touch 2). HONEST LIMITS: the prints are tastytrade's time-and-sales snapshot the chart backfills at load (the last ~4 minutes), not prints accumulated live in the tab; the family word is PARTIAL because the gap's older bars predate that tape; a gap whose EVERY bar is tape (family FULL) was not observed — in a 13-minute watch on 79bb6fd no gap formed inside the tape window, and a background tab only gathered 12 sided bars in that time. Touch 1 and touch 2 both read "sellers 60%" from different sources — not cross-checked against the raw prints.
   d) JOURNAL — fixture, 390 and 1440: "order flow silence (no signed volume in these bars)"; split "Order flow SILENT (no signed volume held for the gap's bars)" 24. SCANNER: "FVG + order flow: UNAVAILABLE for the 12 symbols with a condition — needs signed tape …". BACKTEST: order-flow split UNAVAILABLE (unit test; not re-read on serving).
   NOT READ for §14: a family-FULL tape reading; a tape-partial ("the tape began inside this bar") row; 390.

  ALSO READ 12:40–12:41 CDT on 79bb6fd: /journal header one 44px scrolling row at 834 and 390, nothing squeezed (title 88×21, tallest item 28px at 834 / 44px at 390, page h-scroll 0). /profile fixture Book C at 390 and 1440: gap study once, WAITED 5 / 19 / 0 / 0, "Study: Lesson 9 · Rejection vs acceptance →", timing and untraded sentences, 25 split rows, nothing past the right edge. §5 (C) journal line: "… regime UNTAGGED · volatility at formation normal (from bars) · tape regime at the decision not read (no tape held here)."; splits Volatility NORMAL 23 / NOT READ 1, Tape regime NOT READ 24.
```

### 26h. 12:57 CDT — §14 flipped, composites assessed (cert lane)

§13 and §14 are PROVED ON SERVING (receipts §10f). §65 moves to sample-data: its last unread line is the trader's own behaviour. **Totals: 46 · 12 · 1 · 5 · 0 · 2.**

| Composite | Can it close now? | Waits on |
|---|---|---|
| §59 KEEP / FIX / PROVE | No | every other row — it is the ledger |
| §62 RELEASE EVIDENCE | No lane work left | one real Journal entry saved and reloaded + listed under "Show me my examples" (Founder); performance on a physical phone |
| §65 FINAL FVG LAW | Moved to sample-data today | the Founder's real journal entries on gap decisions |
| §66 CONSTITUTIONAL CLOSE | No | a serving read of the Webull server gate refusing (needs a sample or dry-run path), decision 6 on the GATED wording, and the Founder's permission rule for authorized execution |

Remaining PARTIAL (5): 52, 58 (devices), 59, 62, 66.

### 10g. Management / ticket lane serving receipts — 12:55–12:59 CDT Oct 9, 6e150db

```

  -- READ 5 · PATIENCE / MANAGEMENT / TICKET LANE · serving 6e150db · 12:55–12:59 CDT Oct 9 · own tab (opened + closed) · read-only
  §13 EFFORT SILENCE ON REAL SPOT FX — /charts EURUSD 5m, scene=verify, gap FVG|EURUSD|5m|1791566400000|BEARISH|v1 selected by URL → HELD, 1440:
      "Effort→response: SILENCE — needs traded volume — spot FX has none"
      "Order flow: SILENCE — no signed volume was captured for the gap's displacement or touch bars — candles are never read as order flow"
      "Volatility at formation: normal — range 0.80× its normal (from 1373 closed bars)."  → PASS.
      NOT READ: the scanner's FVG + effort→response UNAVAILABLE line for a spot-FX symbol — the scanner's fixed list read today holds no FX symbol and I did not change the watchlist.
  §13 / §14 INSPECT AT 390 — /charts NQ1! 5m, scene=verify, gap …|5m|1791552600000|BEARISH|v1 → HELD, viewport 386×844:
      sheet 374 wide × 260 tall at y 476 (scrolls inside, 1653 of content); relationship block x 19–363; 9 lines, every line 11px; 0 lines past the right edge or clipped; page h-scroll 0.
      Rows present: "Effort→response displacement bar — at formation · owner says INITIATIVE …", "Order flow displacement bar — at formation · owner says BALANCED …" → PASS.
  BACKTEST EFFORT SPLIT ORDER — /backtesting, FVG Study, "Add NQ1! 5m to the study" (write hold on), 1440:
      All (194) · Initiative (91) · Ordinary effort and response (77) · Vacuum (22) · Not read (no traded volume, or too few bars before the gap) (4) → "Not read" is last. PASS.
  PHONE TICKET AT 390 (viewport 386×844; thumb bar at y 792, 52 tall):
      BUILD  — ticket-fixture, BUY pre-picked: panel y 147–740 (593px, 70% of the screen), no inner scroll, KILL at 141,183 on top, sample banner present, nothing past the right edge, ends 52px above the thumb bar.
      REVIEW — same scene, in-ticket "Review & preview ▸" pressed: panel y 189–741 (552px, 65%), no inner scroll, KILL at 141,225 on top, banner present, ends 51px above the thumb bar.
      PEEK   — measured on the PLAIN ticket (the fixture address without a side is not a ticket scene, so this was the real ticket, opened with the Trade button and nothing else pressed): panel y 485–741 (256px, 30%), KILL at 141,521 on top, BUY and SELL 171×36 side by side, ends 51px above the thumb bar. The fixture's own PEEK (side picked, then folded) was not read this pass.
      The Honesty Plaque is not on the phone glass at this width (its box sits at x 548, outside 386). No miss found; nothing changed.
```

### Founder list — addition: the live-order price collar reads a quote the BROWSER supplies (API audit P2-1; brokers lane, written 13:20 CDT Oct 9; NOT BUILT — the Founder decides)

**What is true today.** Both live submit doors (`/api/broker/tastytrade/order-submit`, `/api/broker/webull/order-submit`) run the server gate before any broker call — kill switch, limits, caps, protection. One input to that gate, the quote (bid / ask / time) used for the staleness check and for pricing a market order, is the one the browser sends. It is owner-only, so this is self-protection, but a stale or wrong quote in the browser passes.

**The proposal (tightening only).** For a risk-increasing order the server reads its OWN quote first and the gate uses that one: no server-read quote → the order is refused in plain words; the browser's and the server's quotes disagree by more than a small band → refused as stale, both shown. Closing and protective orders are unchanged (they are never held hostage to a quote). No new dependency is needed.

**Two facts read on serving `6e150db`, 12:55–12:56 CDT Oct 9 (owner session, GETs only; `~/wm-held/proof/fvg-serving-night-2026-10-07.txt`):**

| Question | Answer |
|---|---|
| Does tastytrade's by-type quote answer for the futures-option contracts the ticket can send? | **Yes, with a catch.** It answered for the order symbols on all eight products tried (/NQ, /ES, /GC, /CL, /ZN, /MNQ, /MES, /RTY), each with its updated-at time. But a **thin strike often has no bid**: on /CL and /ZN only 1 of 3 sampled contracts carried a bid, and one came back bid none / ask 1205.14. **A server-read collar would refuse those contracts** until a two-sided quote exists. |
| Does Webull's server snapshot cover single-leg options? | **No.** WM's only server-side Webull quote reader is stock-only (`fetchWebullTickSnapshot`, category US_STOCK); no Webull option quote exists on the server and none was probed. The Webull option ticket already prices from **tastytrade's** quote in the browser. Server-side, tastytrade's by-type answered for TSLA options (3 of 3 sampled with bid and ask), so **the server can read the same vendor's quote the ticket already uses** — a Webull order would then be collared by a tastytrade quote, as it is in the browser today. |

**The Founder's decision.**

| Item | Question |
|---|---|
| Server-read quote before the gate | Should a risk-increasing live order be refused when WM's server cannot read its own two-sided quote for that contract? It closes the browser-quote gap; the cost is that an order the Founder means to send on a thin strike (no bid) is refused by WM, where today it would go to the broker. |
| If yes — thin strikes | Refuse outright, or allow a LIMIT order priced by the Founder when only one side is quoted (the collar then checks the limit against the side that exists)? |
| If yes — the band | How far may the browser's quote and the server's differ before the order is refused as stale (for example 0.5% or two ticks)? |
| Webull options | Is a tastytrade quote an acceptable server reference for a Webull option order (the same vendor the ticket uses now), or must it be Webull's own (not available on the server today)? |

### 26i. Reads on `b94f28c` (builtAt 18:18:44Z; cert lane own tab, read-only, closed 13:23; 0 storage writes)

`b94f28c` is the same content as `b2727cd`: that commit passed the ship gate and CI, but Cloudflare never started a build for it (no Workers Builds check appeared on the commit); an empty retrigger commit built normally. LIVE 13:21 CDT (coordinator ship gate).

| Read | Result | State |
|---|---|---|
| Connections page (`/readiness`) as the owner, 390, `scene=verify` | Unchanged for the owner, as designed: "7/10 providers configured", "13/40 required names present · Values stay sealed in approved runtime stores", "ACCOUNT SERVICE · SETUP PRESENT …". 234 text leaves, 1 under 11 px; no horizontal scroll; banner present | owner view PROVED. **The member view cannot be read from the owner's session** — it stands on the render test (`readinessAudience.render.test.tsx`), not on a serving read |
| Regime row with Regime Lighting on, a gap inside the tape's reach (NQ1! 1m, gap 3 minutes old; series `12\|X1\|NOW:BALANCE`) | "Regime at formation (tape): not read — the tape does not reach this bar." | **DEFECT (ticket lane owns the row):** the newest bars carry a tape verdict (NOW:BALANCE) yet a 3-minute-old gap is told the tape does not reach it. Probable cause, not confirmed: `tapeRegimeAtFormationLine` looks the bar up by exact equality (`x.time === b2OpenSec`) — check that the series' bar time and the gap's b2 open are the same clock and unit. File: `src/lib/marketData/fvg/fvgInspectRelationships.ts` ~line 87 |
| The reach sentence | Not on the row. `regimeSeriesReach` ("The tape regime is kept for the last N bars — as far back as the newest 2,000 prints reach.") is in `selectRegimeSeries.ts` with its test, and nothing on a screen calls it | **BUILT · NOT WIRED** |

### 26j. 13:23–13:32 CDT — recorded for the coordinator (cert lane; LIVE `e8ca9f2` 13:31:04 CDT)

| Item | Fact | State |
|---|---|---|
| **Enforce audit on `b94f28c`** (chart lane's read, `fvg-serving-night-2026-10-07.txt`, 13:23–13:27, `gate=enforce`) | Clean for words, the newest column and selections. But named silences the classifier does not recognise are still HELD and listed (not on the glass), and the receipt is blind to them | **NO flip to enforce.** The word registry stays in OBSERVE; fix in progress. **Ruling:** the Expected Envelope's caption is a truth line (never held) |
| **Regime at formation** | The row said "the tape does not reach this bar" for a bar the tape did reach but the classifier had not classified (cert lane read, §26i) — a false reason | fix in progress (ticket lane). §5 back to PARTIAL |
| **Decision band on the phone** (ticket lane's read on `b94f28c`, 13:22) | The decision spine is a sideways band at y 744–986 under the fixed thumb bar (y 792–844): only its top 48 px shows until the page is scrolled. Its HONESTY PLAQUE cell reads "UNMEASURED · No fidelity has been established for this canvas" beside a MARKET cell reading LIVE | in progress (placement under the fixed strips; plaque wording) |
| **The `b2727cd` missed build** | Passed the gate and CI; Cloudflare started no build (no Workers Builds check on the commit). Empty retrigger `b94f28c` LIVE 13:21 | CLOSED. A green gate is not a deploy — check the commit for the build check |
| `e8ca9f2` (LIVE 13:31:04) | Read-only order-gate standing for the owner (what the server gate would do now, no order sent); the selected object's WAIT plaque stays below the price legend; big-print side bars off the live price on phones; scanner names wrap on phones; SpaidBot launcher docks in the nav | not read by the cert lane. The order-gate standing is the read §66 was waiting for — a lane should read it and cite it |

### §66 receipt — the server gate READ on serving, with no order sent (brokers lane, written 13:33 CDT Oct 9, serving `e8ca9f2`)

Read through the owner-only, read-only `GET /api/broker/order-gate` (same limits load and the same `preflightLiveOrder` the submit doors run; no broker call, no ledger write — `orderGateStanding.sentinel.test.ts`, `order-gate/route.test.ts`). Receipt: `~/wm-held/proof/fvg-serving-night-2026-10-07.txt`, block "§66 SERVER GATE, READ".

| Read | Result (13:31:40 – 13:32:17 CDT) |
|---|---|
| Guest, both brokers | 401 "Not authenticated" |
| Owner, Webull | 200 · limits UNSET · kill switch not set · server arm not set · **WOULD_REFUSE** (`LIMITS_UNSET`) · `sent: false` |
| Owner, tastytrade | 200 · limits UNSET · kill switch not set · server arm not set · **WOULD_REFUSE** (`LIMITS_UNSET`) · `sent: false` |
| The sentence, both brokers | "would refuse: No server-held order limits are set. Set them in Settings › Execution; until then nothing live can be sent." |
| Settings › Connections | every execute row prints "server gate now: would refuse: No server-held order limits are set. … · as of 1:32:14 PM CDT" (tastytrade, 5 rows) / "… 1:32:17 PM CDT" (Webull, 2 rows); rows that are NOT BUILT / UNSUPPORTED print no gate line |

**What it means today.** The server holds no order limits for the owner, so both live submit doors refuse any risk-increasing order before a broker is contacted. Not read (and not readable without changing a setting or sending an order): the DISARMED, KILL SWITCH, cap-not-set and "would pass" sentences on serving — those four are proved in the two test files only.


---

## SUPERMAX ORDER MAP — the Founder's "Garden 19 Supermax WOW Official finish-line order", 14 sections (cert lane, written 18:28 CDT Oct 9; shift to 00:00 CDT)

Status words: **PROVED** (a serving receipt in this document covers it) · **PARTIAL** (what is missing is named) · **BUILDING tonight** · **FOUNDER** (waits on him). The section titles are as the coordinator relayed them; the order's full text was not in the cert lane's hands when this was written, so a requirement inside a section that is not named here is not yet mapped.

| § | Section | Status today | Owner | Rows in this document that already cover it | Missing |
|---|---|---|---|---|---|
| 1 | Drive read | **PARTIAL** | coordinator | §0 (registry, manifestation map and plates read Oct 6–7) | no receipt in this document of a Drive read for THIS order |
| 2 | WOW standard | **PARTIAL** | Sheriff lane | §26c / §26d (signed-in passes, 0 writes), erasure tests (finish-line §47–§51), phone glass builds `e05c774` → `e8ca9f2` | word registry still in OBSERVE (§26j); the signed-in pass P2s |
| 3 | Canon station | **PARTIAL** | chart lane | §3a (plate ⇄ glass per certificate) | no serving read of the station tonight |
| 4 | Visual manifestation | **PARTIAL** | chart lane | §11 inventory, §12 certificates, finish-line §8, §43–§46, §53 (§25) | §11c top gaps; glass word collisions at 834 (§26c #7) |
| 5 | Appearance controls | **BUILDING tonight** | chart lane | §26d (Tools drawer read; per-tool controls are icon-only) | no certificate row for the controls themselves |
| 6 | First-class trading | **PARTIAL** | Sheriff lane (TRADE door) + ticket / brokers lanes | §10b ticket rows, §21c, "§66 receipt", handover 1, 6, 16 | brass TRADE door shipped in `b72f896` — not read by the cert lane; first paint at four sizes; atomic MODIFY, bracket / OCO; real working-order cancel; Founder decisions 1, 6, 16 |
| 7 | Founder prop-evaluation desk (Founder-only, inside Journal / Review) | **BUILT · NOT READ** (`b72f896`) | ticket / journal lane | none yet — the desk and its engine (`propEvaluation.ts`) shipped in `b72f896` | a serving read: account truth, the consistency engine (required = max(target, largest day ÷ 0.30); remaining = required − net; a two-day plan said to be impossible when the arithmetic says so), the scenario lab (illustrative, never a target), and that a member cannot see it |
| 8 | Prop data + SpaidBot | **MOUNTED · synthetic-certified only** (file import + owner sample, `00e7002`) · SpaidBot explainer shipped (`00e7002`, unread) · **FOUNDER** (real fills export; dashboard read-back) | brokers lane (file import); cert lane (SpaidBot files tonight); ticket lane (the desk's "Ask SpaidBot about these rules" control) | finish-line §30, §31; §28 | a real fills export from the firm (only synthetic files have been read); the TradeDay day boundary; the dashboard read-back; the desk's Ask control; a serving read |
| 9 | Journal / Review / Academy | **PARTIAL** | management + cert lanes | finish-line §23–§29, §33–§36, §40–§42, §56; §27 (Academy audit, read on serving); §29 (tool primers — tree) | the 12 sample-data rows (Founder actions); the six tool primers and their repointed ⓘ doors are in the tree, unshipped and unread; the footprint ⓘ door (Sheriff lane) |
| 10 | SpaidBot entry | **PARTIAL** | cert lane (SpaidBot files tonight) | finish-line §30 PROVED; §28; §29b (launcher read) | on /desk at 390 the docked launcher sits over a "⇕" control (P2); an answer under the new rules cannot be read without a provider call |
| 11 | Passport / Stripe | **BUILDING** (billing pure owners shipped in `00e7002`; routes next) · **FOUNDER** (turn-on) | brokers / billing lane | §22b, handover 4, 19–21 | the routes; six environment variables; Terms / Privacy still say "not in effect yet"; WOW World live-mode findings (handover 20) |
| 12 | Device parity | **PARTIAL** | Sheriff + chart lanes | finish-line §43, §52, §58; §26c–§26f | physical phone and tablet (handover d) |
| 13 | Hourly checkpoints | **BUILDING tonight** | cert lane | the log below | — |
| 14 | Release certification | **PARTIAL** | cert lane | the FINISH LINE table (66 rows); FOUNDER HANDOVER; end-of-shift receipt | 12 sample-data rows, §5, §52, §58, §59, §62; the 18 handover items |

**Founder decisions already given today:** four tiers $0 / $10 / $20 / $50 confirmed; the Depth ladder shows the book without a venue label.

### Hourly checkpoint log (real `date` stamps only; ship SHAs as the coordinator feeds them)

| Stamp (CDT) | Production | Finish line (66) | Since the last checkpoint |
|---|---|---|---|
| 18:28 | `c9303a7` (committed 18:20; coordinator: LIVE 18:26, 17,734 tests) | 46 proved on serving · 12 sample data · 1 built, not read · 5 partial · 2 Founder | §66 flipped from the brokers lane's server-gate read; `f37005c` gate time recorded (12:17:44); this map written. Open from the last shift: §5 regime line (three-outcome sentence shipped in `c9303a7`, not read yet); registry in OBSERVE |
| 18:35 | `c9303a7` (no ship since) | 46 · 12 · 1 · 5 · 2 Founder | Supermax §9 Academy audit built in the tree (ten list items covered, ON THE CHART box in 21 lessons, ⓘ doors for the named inventions); public-language sweep (one correction, the manifest); map rows 5–8 and 11 carry the order's text. Gate call — cert lane frozen green |
| 18:49 | **`b72f896` LIVE 18:42:54** (coordinator ship gate; 17,814 tests; build identity builtAt 23:40:43Z) | 47 · 12 · 1 · 4 · 2 Founder | Shipped: brass TRADE door (§6 partial), Question Lens always painted, owner-only prop desk + engine (§7 built, unread), prop fills import (§8, unmounted), the Academy slice, the manifest. Read on it: lessons + ON THE CHART at 390; ⓘ doors at 1440 and 390 for six of the seven inventions (footprint ⓘ unread). §5 back to PROVED (regime word TRANSITION read on BTC-USD by the management lane). SpaidBot audited; owner-only evaluation explainer and no-promise rules in the tree. Gate call 2 — cert lane frozen green |
| 19:02 | **`00e7002` LIVE 18:56:11** (coordinator ship gate; 17,877 tests). Another session's `733a34f` (passport bridge accepts thewow.online) is also in main | 47 · 12 · 1 · 4 · 2 Founder | Shipped: phone type floor / absorption cap / profile rows, one-owner fidelity word, prop desk file import + owner sample (§8 mounted, synthetic-certified only), billing pure owners (§11 building), the SpaidBot slice. Read on it: the SpaidBot launcher in non-chart rooms (§29b). In the tree: six tool primers + repointed ⓘ doors (§29a). Handover items 19–24 added |

## 27. Supermax §9 and §11 / §14 — Academy audit, ⓘ doors, public language (cert lane, written 18:35 CDT Oct 9; tree, not shipped)

### 27a. The Founder's Academy list against the existing course ("FVG / Imbalance & Patience", 21 lessons — no new room, no new lesson)

| Item on the list | Before tonight | Now (tree) |
|---|---|---|
| Three-candle structure | lesson 2 | unchanged |
| Partial vs full mitigation | lessons 7, 8 | unchanged |
| Rejection | lesson 9 (pinned for the journal) | unchanged |
| Invalidation | lesson 14 | unchanged |
| Session context | only as return timing (lesson 10) | **added to lesson 5:** "Session is context too…" — the session a gap formed in, the boundary flag, Session Bands |
| Momentum / displacement | lesson 5 named the bar, not effort and response | **added to lesson 5:** momentum as two facts, effort and response, read from the middle bar; it describes the bar, it does not rate the gap |
| Patience — waiting is a position | lesson 18 taught waiting, not in those words | **added to lesson 18:** "Waiting is a position. Flat, with a plan and a condition you are watching for, is a decision you are holding — not time lost." |
| Trade management around a gap | lesson 19 was general | **added to lesson 19:** the plan's conditions are the gap's own events (touch, rejection, acceptance, trade-through), decided before entry |
| Evidence-based limitations | lesson 13: no order-flow reading on spot FX | **added to lesson 13:** "What WM Pro cannot know: who traded, why they traded, or what price does next." and "On spot FX there is no central exchange, so there is no traded volume…"; absorption, options walls and resting liquidity as other owners' readings, each with its own grade |
| A gap does not have to fill | the no-guarantee sentence only | **added to lessons 1 and 10:** "A gap does not have to fill. Some are revisited, some never are — WM Pro records which." The words "must fill" appear only on the MYTH card (pinned) |
| Each lesson states what on the glass it corresponds to | not stated | **new "ON THE CHART" box in all 21 lessons** (`FVG_ON_THE_GLASS`): the band, the hatch, the tick, the dashed far edge, the Inspect rows, the ticket field, the Journal row — in the layer's own grammar |

Paragraphs are appended, so the rule sentences the journal pins (lessons 9, 14, 18) keep their positions.

### 27b. ⓘ → the lesson, before a tool is switched on

The ⓘ preview is the same component at 390 and on desktop (Tool Finder, Profiles menu, footprint modes); it now carries an "Academy · <lesson> ›" link for these tools, through the one ⓘ owner (`educationFor`):

| Invention | Lesson behind its ⓘ | Was |
|---|---|---|
| FVG / Imbalance | 1 · What is an imbalance? | already there |
| Living Profile | 12 · FVG + profile | no door |
| Brick Walls, Derivatives Pressure (walls) | 13 · FVG + order flow | no door |
| Absorption | 13 · FVG + order flow | no door |
| Effort → Response, Effort Mark | 5 · Displacement | no door |
| Liquidity Weather, Liquidity Lifecycle | 13 · FVG + order flow | no door |
| Footprint modes (bid × ask, delta, imbalance, volume profile, aggressive / passive, big trades) | 13 · FVG + order flow | no door |

**Honest limit.** Only the FVG course has published lessons. Each door goes to the published lesson that teaches the tool beside a gap; no tool has a lesson of its own yet, and the rest of the catalogue (Order Flow Foundations, Footprint Mastery, Smart Money Signals …) is unpublished outlines — a door to an outline would promise a lesson that is not there. Not yet read on serving at 390 or desktop (tree only).

### 27c. Public language — "merely a chart" sweep (§11 last line, §14)

| File:line | Wording | Action |
|---|---|---|
| `src/app/manifest.ts:40` | "Elite trading dashboard, smart money tools, social community & creator economy" | **corrected** → "A trading operating system: market intelligence, order flow, decision memory and review — with honest UNKNOWN, STALE and INSUFFICIENT states." (the root layout's own sentence, shortened) |
| `src/app/pricing/page.tsx:37` | "The chart and workspace, on your own account." ($10 tier tagline) | left — names what the tier contains (coordinator ruling) |
| `src/app/manifest.ts:77` | "Open the trading chart" (Charts shortcut) | left — names the shortcut (coordinator ruling) |
| `src/app/layout.tsx` title, description, keywords, Open Graph; /welcome, /pricing, /login, `sellingStory.ts`, the selling component, `/` | already "Trading Operating System"; no "charting platform" / "dashboard" wording | none |

A test now pins the manifest, the root metadata and the public pages against "charting platform / trading dashboard" wording. The two unredlined selling strings are untouched.

## 28. Supermax §10 / §8 — SpaidBot: entry, context and instructions audited; owner-only evaluation explainer (cert lane, written 18:49 CDT Oct 9)

No message was sent on the Founder's account. Serving reads on `b72f896` (own tab, closed); the rest is read from code.

### 28a. Audit

| Question | Finding | Source |
|---|---|---|
| Is the entry compact and native at 390 / 834 / desktop? | **On /charts there is no floating launcher at any width** (read at 390, 834 and 1440 under `scene=verify`: no SpaidBot control on the page at rest). The chart's entries are the "Ask SpaidBot" buttons inside Inspect and Review, which open the existing panel pre-filled and never send. In other rooms the launcher is a 44–48 px round button, bottom-right; below 768 px it sits inside the bottom nav's own space (`globals.css` ~2435) | serving read 18:46; `SpaidBotButton.tsx`, `globals.css` |
| Does it avoid the active candle, the price scale and the TRADE door? | **Yes on /charts — nothing is there to collide.** In the other rooms the docked launcher on a phone was not read on serving tonight (the Sheriff pass saw it at x 322–370, y 666–714 on /profile and /desk at 390 on `e05c774`, before it was docked) | serving read; §26c |
| What context is it given? | The chart's own published context (`#wm-chart-context`: symbol, timeframe, quote with source and as-of, the gap records, the options scope), the Decision_ID read from the one decision store, and the frozen plan line read from the one plan store. **No journal dump and no account** — the instructions say it cannot access broker accounts, balances, positions or orders. Not a separate memory: every field is read from its owner at send time | `spaidbotContext.ts`, `SpaidBotButton.tsx`, `formatChartContextNote` |
| Does the instruction text forbid order execution? | **Yes** — "You cannot stage, submit, replace, or cancel paper or live orders." and "Never output machine-readable order tags…" | `api/spaidbot/route.ts` |
| Does it forbid promises of profit or of passing? | **It did not say so in words** (it forbade invented win rates and certainty). **Added (tree):** "Never promise profit, a win, a fill, or that a prop-firm evaluation, challenge or funded account will be passed, kept or paid." and "Never tell a trader to take a trade, a size or a number of trades in order to reach a target." | `spaidbotOwnerDesk.ts` |
| Identity | The instructions opened "a professional trading platform built by traders for traders" → **"a Trading Operating System"** (tree) | `api/spaidbot/route.ts` |

### 28b. Built (tree, not shipped)

| Item | How | Guard |
|---|---|---|
| **Owner-only prop-evaluation explainer** | NEW `src/lib/ai/spaidbotOwnerDesk.ts`: the desk's stored record, when it rides a request as `context.prop`, is re-validated by the desk's own reader (`readPropStored`) and turned into a fact block by the desk's own engine (`readPropEvaluation`, `planDaysVerdict`) — net profit, largest day, best-day share, required, remaining, drawdown headroom, fewest further days, the two-day verdict. For numbers typed in the conversation the instructions state the one rule (required = the larger of the target and largest day ÷ 0.3; remaining = required − net), read from the engine's constant | **Owner only** (`tastytradeOwnerGate` in the route; a member's `prop` is ignored and a member never receives the desk rules). **Nothing stored** — the record rides one request. **No promise** — UNVERIFIED unless stamped; "ILLUSTRATIVE ARITHMETIC, NOT A PROMISE"; never a target, a trade or a size |
| **Academy recommendations** | SpaidBot may recommend only the lessons in the ⓘ door table (`academyDoorForTool`), by exact title and address — "never name another" | pinned to the course by test |

**Not built:** no desk control sends the record yet (`PropEvaluationDesk.tsx` is the ticket / journal lane's file) — until one does, the explainer works from numbers the owner types in the conversation. No serving read of an answer (it would be a provider call on his account).

## 29. Supermax §9 — tool primers; SpaidBot launcher read (cert lane, written 19:02 CDT Oct 9)

### 29a. Six tool primers in the existing Academy ("Reading the glass" — module 10, tree, not shipped)

**The course structure holds them without a new room:** one more module in the same catalogue (`/education`), the same lesson pane, the same knowledge-check and progress owners.

| Primer | Tools it teaches | ⓘ doors now land on it |
|---|---|---|
| Living Profile | Living Profile | LIVING_PROFILE |
| Brick Walls and Derivatives Pressure | both | BRICK_WALLS, DERIVATIVES_PRESSURE |
| Absorption | Absorption Shelf | ABSORPTION |
| Liquidity Weather | Liquidity Weather | LIQUIDITY_WEATHER |
| Effort → Response | Effort → Response | EFFORT_RESPONSE |
| Footprint | the six footprint modes | FP_bid-ask, FP_delta, FP_volume-profile, FP_imbalance, FP_aggressive-passive, FP_big-trades |

**No new market claim.** Each primer is assembled from the tool's own ⓘ record (`educationFor`): its question, "On the chart" (`appears`), "How to read it" (`grammar`), "What it needs" (`evidence`), and FULL / PARTIAL / DEGRADED in that record's words — a test pins every sentence to the record verbatim. The only words written for the primers are the frame: "SILENCE: the tool draws nothing and says why. Silence is not evidence either way." and "What it cannot know: who traded, why they traded, or what price does next…" (the course's own sentences), plus a ten-question knowledge check on the evidence grades. FVG keeps lesson 1. Liquidity Lifecycle and Effort Mark, which had doors to FVG lessons since `b72f896`, have none now — no primer teaches them.

### 29b. SpaidBot launcher in non-chart rooms — serving `00e7002`, own tab, no message sent (0 SpaidBot requests)

| Room · width | Launcher | Reading |
|---|---|---|
| /journal · 390, 834, 1440 | none | the OS-shell rooms carry no floating launcher |
| /profile · 390 | 44 × 44 at x 340–384, y 793–837, inside the bottom nav's band (y 786–844); "Open SpaidBot, the trading assistant" | docked; over no nav item; topmost at its centre |
| /profile · 834 | 48 × 48 at x 766–814, y 726–774 — 12 px above the nav (y 786–844) | floating bottom-right (the dock applies below 768 px); over no text at rest |
| /profile · 1440 | 48 × 48 at x 1372–1420, y 776–824 | bottom-right corner; no nav |
| /desk · 390 | 44 × 44 at x 340–384, y 793–837 | docked — **over a "⇕" control** (P2, chart / Desk lane) |
