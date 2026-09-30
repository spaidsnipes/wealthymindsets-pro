# GARDEN 17 — SHERIFF COLOR BOARD (WM Pro)

One live board. Status vocabulary: 🟢 PROVED · 🟡 REPAIR · ⚪ EXTERNAL / NOT EXERCISABLE.
Only Sheriff says CLOSED. A green here is a claim with its evidence; perishable greens carry the time they were observed.

- **Board updated:** 2026-09-29T06:45Z (01:45 CDT) by ATHOS — game-build shift appended (§3b).
- **Serving:** `https://wealthymindsetspro.com` = `main` (last code SHA `34d6127`; board commits follow).
- **Starting baseline (Founder receipt):** G0–G13 = 🟢 7 · 🟡 7 · 🔴 0.
- **Shift commits:** `f8e018c4` G3/G4 · `2f97de6c` `c5da473` G6 · `8d940235` `9b17142d` `f5083951` G7 · `63928db4` `9198420` `d1a2f10` G12 · `2613950c` board.

---

## 1. Controllable yellows — P0 (sorted by finish-line importance)

| ID | Gate / area | Claim | Status | First broken joint | Evidence | Repair | Break test | Production proof | Next action |
|---|---|---|---|---|---|---|---|---|---|
| Y-G6-02 | G6 Identity | Journal/review keys on the decision | ⚪ FOUNDER POLICY (not a broken joint; chain proved without it) | Journal entries are MANUAL trade records with no decision birth; `journalEntryToSnapshot` carries the entry's own id under the field name `decisionId`, and the Profile → `/journal?decisions=` drill-down filters by that same id consistently. A journal id cannot pass `isDecisionId` (no `wmd_`), so it can never merge into a real decision | traced 2026-09-29 22:00 CDT | none needed for correctness | — | — | Founder policy: should a manual journal entry bind to a DECISION_ID? If yes, forward-only field on new entries |

## 1b. Greens added 20:10–20:55 CDT

| ID | Gate | Claim | Evidence | Observed |
|---|---|---|---|---|
| G-G3-03 | G3 | reconnect_reconcile | Each keeper run = fresh Worker session re-reading every account's open orders against the durable ledger; PASS only when complete, readable, 0 unresolved (break tests: unresolved → FAIL, unreadable ledger → PENDING). Serving Webull cert **READ_ONLY · 6/12, 0 pending** (6 = order stages BLOCKED by design + auth_refresh SKIP, 2FA off) | `80acbc4` 01:24Z |
| G-G4-03 | G4 | Market-data rights stated, not guessed | Webull: PRICE snapshot · ACCOUNT certified · ORDERS read-only · **FUTURES BLOCKED_ENTITLEMENT** (keeper ladder 403) — rows the after-hours canary could not observe; observed rows never overridden. Alpaca: **BARS ACTIVE_DEGRADED** from a valid daily bar; stale PRICE refused ("20145107 ms old; stale evidence was not exposed as current") | `80acbc4` / `036277f` |
| G-G7-05 | G7 | Every top-level overlay layer isolated and named | 19 bare layers wrapped + 11 silent `catch {}` named (incl. one spanning ~6,000 lines); AST sentinel. Serving injection: gap-word fault → `layerFaults="1:DATA_GAPS: …"`, TPO fault → `"1:WEATHER_PROFILES_MEMORY: …"`, `paintFault` empty, later layers (debt tag, TPO) still DRAWN | `7585d4d` 01:50Z |

| G-G9-01 | G9 | Symbol-switch contamination: none | BTC→TSLA: 0 BTC-range values or BTC words painted on TSLA at +1.5 s and +6 s (BTC frame had them); the only DOM "BTC" are the watch strip's "Switch chart to BTC" buttons | `9dde021` 02:50Z |
| G-G9-02 | G9 | LIVE/STILL parity | STILL paints the identical 25 words and identical receipt keys as LIVE; livingMarket LIVE→STILL→LIVE; preference restored | `9dde021` 02:52Z |
| G-G9-03 | G9 | Semantic zoom density | real wheel zoom ETH 15m: FAR 758 bars → 36 words (withholds VP, TPO, regime fixtures, zones, debt tag by name) · MID 173 → 50 · 76 bars → 60 | `cb3c806` 03:00Z |
| G-G9-04 | G9 | Profile family serving proof | 11/11 via the real Tools toggles: 9 DRAWING on ETH 15m; Profile Memory + Composite "SILENT · DATA REFUSES" on 24/7 crypto (no prior session) and DRAWING on TSLA 15m; Founder layers restored (TPO + Classic only) | `cb3c806` 03:05Z |
| G-G9-05 | G9 | Zero-gamma name clear of TPO ink | `FRONT_WORDS@648:CLEAR` on ETH 15m with TPO on (was printed through the TPO column); one TPO geometry owner | `cb3c806` |
| X-03b | X-03 | OAuth: no false affordance | No `signInWithOAuth` path exists in source; sign-in is email/password only; signed-in `/login` → `/charts` | `cb3c806` |

| G-G10-01 | G10 | Bounded paper lifecycle on serving (Founder go-ahead 2026-09-28 "turn those yellows green"), real clicks on /paper | intent (purpose "Get me in now") → submit → fill 1 BTC @ 82,898.02 → RISK refusal "Insufficient cash — this order costs $414,502 and the account holds $17,102" (cash untouched) → blank stop refused "Order not sent · Enter a stop price. WM will not fill this in with the market price" → PROTECT sell stop 80,000 → MODIFY (cancel + replace @79,000) → FLATTEN → unsupported/no-quote symbol blocked "LOADING · NOT ACTIVE… Wait for verified quote" → reload: flat, 0 pending. Bad qty: input clamps to ≥1. Partial fill: N/A (paper fills whole orders — stated). Book restored byte-exact after the proof | `5cdd6af`–`6988bd3` 04:20Z |
| G-G10-02 | G10 | **Found + fixed**: flatten left the protective stop working (would have opened an unintended SHORT) | `cancelProtectionAtFlatten`; re-proved: flatten → stop `cancelled`, 0 pending | `96f225f` |
| G-G6-04 | G6 | ONE DECISION_ID across chart ↔ ticket ↔ order ↔ reject ↔ protect ↔ replace ↔ cancel ↔ exit ↔ reload | all 10 orders + 6 trades carry exactly `wmd_g46niwqabmnv1u` (0 missing) after reload; /charts BTC **and** BTC-USD show the same id | `6988bd3` 04:45Z |
| G-G6-05 | G6 | **Found + fixed**: continued decision falsely reported "could not write to the shared record" (it was at reconVersion 1) | 409 → read-back → RECORDED only if THIS decision is on record; re-proved: no false note | `5cdd6af` |
| G-G6-06 | G6 | **Found + fixed**: one instrument split into two decisions by spelling (BTC vs BTC-USD) | continuity scope = `canonicalInstrumentId`; legacy spellings found + migrated | `93bcf7a`/`6988bd3` |
| G-G9-06 | G9 | Price sovereignty: TPO chips no longer on candles | ETH 15m receipt `profileLevelChips 3:1M:0Y:1S` (was 3 on candles) — TPO POC moved to the right stack | `a2ebb81` |
| G-SEARCH-01 | Human use | Search every market | palette → all-asset `/api/symbol-search`, category chips, no blanking on 429; indices/futures/metals/grains/FX/crypto/ETFs open charts (^N225, ^GDAXI, SPX, KE=F, ZW1!, PL1!, EURUSD, SOL-USD, PHO → bars) | `82734da` |

| G-G9-07 | G9 | Card-erasure independence | ETH 15m with the whole right rail HIDDEN: the glass alone still says WAIT (on price), REGIME · COMPRESSION · channel capped, POC/VAH/VAL, VRP POC/VAH/VAL and the live price | `6988bd3` 04:48Z |
| G-G9-08 | G9 | Field identity | every active field names itself on the glass ("VISIBLE RANGE · 169 BARS · MOVES WITH THE VIEW", "REGIME · …", "DERIVATIVES PRESSURE · DAMPING · Deribit public · OI current · INFERRED", Liquidity Weather lens) — no unnamed tint | serving 2026-09-28/29 |
| G-G9-09 | G9 | Compound hierarchy · anatomy attachment · MarketObject causality · candle contrast | compound ORDER FLOW+REGIME camera (union, `camerasInForce`); G06 bodies hung on canonical absorption/exhaustion anchors with candle blockers; FORCE→RESPONSE on the selected Big Trade + LOCATION IN STRUCTURE in Inspect; every field fill clipped around candles (`profileCandleCut`), level chips never on candles (`0Y`) | serving 2026-09-28/29 (`f3a1073e`, `cdfedf3b`, `1156a2e4`, `a2ebb81`) |
| G-G9-10 | G9 | ATH Founder Tour (desktop) | symbol search every market; BTC→TSLA contamination clean; LIVE/STILL parity; FAR/MID/NEAR density; 11/11 profiles; paper lifecycle; Command Deck / Education / Paper / Charts 0 console errors | 2026-09-28/29 — the Founder's own eyes remain Sheriff's close |

## 2. External — with local degradation

| ID | Dependency | Why ATH cannot exercise it | How WM Pro behaves | Local degradation proof |
|---|---|---|---|---|
| X-01 | CME futures market data (Webull OpenAPI futures) | Entitlement not purchased (403 `MARKET_DATA_NOT_SUBSCRIBED`) | NQ/ES bars from Yahoo (~10 min delay, named "N BARS BEHIND"); Webull ticks refuse `NQ1!` as INVALID_SYMBOL (400); futures order flow silent | 🟢 PROVED 2026-09-29 00:02Z (`/api/market-data/webull/ticks?symbol=NQ1!` → 400 INVALID_SYMBOL; ES header "BAR OPENED 02:00 PM · 1 BAR BEHIND") |
| X-02 | Stripe keys / entitlement owner | No `STRIPE_*` secrets; owner decision open | /shop banner "Concept catalog · checkout not connected"; the button reads "Checkout not connected"; pressing it: "Checkout is not connected yet. Your concept cart remains saved in this session." — no fake success, no redirect | 🟢 PROVED 2026-09-29 01:08Z (serving `d1a2f10`, real click) |
| X-03 | OAuth providers | Provider configuration is the Founder's | No OAuth button or code path exists — email/password only, so nothing can fail silently | 🟢 PROVED 2026-09-29 (source: no `signInWithOAuth`; serving login → /charts when signed in) |
| X-04 | tastytrade | `TASTYTRADE_REFRESH_TOKEN` absent | Cert NONE with the named missing secret | 🟢 PROVED 00:02Z (`/api/broker/certification` note) |
| X-05 | moomoo | OpenD bridge not deployed (`MOOMOO_BRIDGE_URL`) | Market-data cert rows NOT_IMPLEMENTED with the named missing env | 🟢 PROVED 00:02Z |
| X-06 | Futures options positioning (NQ/ES/GC) | Cboe delayed feed publishes no futures options | "DERIVATIVES PRESSURE · no option positioning for NQ1! (UNSUPPORTED)" | 🟢 PROVED 2026-09-28 (serving NQ/ES/GC glass) |

## 3. Greens this shift (perishable ones stamped)

| ID | Gate | Claim | Evidence | Observed |
|---|---|---|---|---|
| G-G3G4-01 | G3/G4 | Webull capability matrix, fresh | AUTH/ACCOUNT CONNECTED 3 · BALANCE OBSERVED 3/3 · POSITIONS NO_POSITIONS 3 · ENTITLEMENT FULLY_OPEN · MQTT accepted · TSLA ticks STALE (after hours, honest) · NQ refused INVALID_SYMBOL | 2026-09-29 00:02Z |
| G-G3G4-02 | G3/G4 | Certification/status tell the observed truth | `/api/broker/certification` Webull READ_ONLY · 5/12 (auth, account_discovery, capabilities, read_market_data, read_account_state PASS; 5 order stages BLOCKED by design; reconnect_reconcile PENDING); `/api/broker/status` webull connected:true — was NONE 0/12 + connected:false | 2026-09-29 00:08Z on `f8e018c` |
| G-G7-01 | G7 | Provider failure is local | Injected Deribit/Cboe/Webull fetch faults: pressure world withdrew by name `PRESSURE:SILENT:TRANSPORT`; candles, flow (Coinbase 149 sided prints), forming candle, profiles, market clock continued; Webull panel "RECONNECTING" with "—" quotes (no stale numbers) | 2026-09-29 00:16Z |
| G-G7-02 | G7 | Recovery without reload | Fault lifted → pressure repainted (walls 2700/2720) and Webull returned to LIVE within ~40 s | 2026-09-29 00:18Z |
| G-G7-03 | G7 | One renderer cannot kill the glass | Before `8d94023`: one throw froze the overlay forever. After: loop continued (9 throws/8 s), `paintFault` named, cleared on recovery | 2026-09-29 00:24Z on `8d94023` |
| G-G7-04 | G7 | Layer isolation inside the frame | Profile-family fault → `vpFault` named, `paintFault` empty, pressure/regime kept painting (`9b17142`); pressure-world fault → `derivativesPressureFault` named, all 101 receipts published in the faulted frame (`f508395`) | 2026-09-29 00:31Z / 00:38Z |
| G-G12-01 | G12 | One landing path | Serving `63928db`: /readiness "← Market" → /charts · /nectar "Back to the market" → /charts · WM PRO realm door → /charts · login/email use FOUNDER_LANDING_ROUTE | 2026-09-29 00:47Z |
| G-G12-02 | G12 | One timeframe registry in Settings | Default Timeframe options = last, none, 1m…1h, 1D, 1W, 1M (no retired D/W/M) | 2026-09-29 00:48Z |
| G-G12-04 | G12 | `/signup` answered by the alias owner | `curl -I /signup` → `HTTP/2 308` `location: /login?mode=signup` (alias owner parses query) | `9198420` |
| G-G12-05 | G12 | Link-only brokers cannot pass for wired | /readiness broker panel: "Not wired in WM Pro — opens Tradovate's own site; WM reads no data from it" (5 in view); wired API broker keeps "Verify … API account" | `9198420` |
| G-G12-06 | G12 | One writer for `wm_settings` | lib/settings/appSettingsStore; serving Settings → Save: 1 announcement, 0 key drift (Founder settings restored byte-exact) | `d1a2f10` 01:04Z |
| G-G12-03 | G12 | No live doc routes builders to Vercel | SECURITY_LAUNCH_CHECKLIST + CLOUDFLARE_DEPLOY_GUIDE corrected; 4 dated docs demoted with the historical-lineage marker; ops sentinels 88/88 | `63928db` |

## 3b. Game-build reconstruction shift (2026-09-29 00:02–01:45 CDT) — START `29ebd3c7` → FINAL `34d6127`

Status vocabulary: PROVED = seen on serving glass beside the Founder plate · BUILT = gate green + serving, not yet seen on glass. Only Sheriff says CLOSED.

| Slice | Plate | Commits | Status | Evidence (serving) |
|---|---|---|---|---|
| Founder Anatomy bodies | G06 | `2bdac07` `2c74480` | PROVED | `FUSION\|EVENTS:1\|BODIES:1`; ABSORB figure standing over its ETH-USD 15m shelf ("ABSORBING · POWER RETAINED") |
| Body stands on its event (smaller camera sizes) | G06 | `34d6127` | BUILT | at ETH 15m NEAR no candle-free room within 2.5 widths even at 72px — the far spot is kept by design there |
| Weather lens: smoke body + glass sheen/seat | F08B | `f4b80e5` | PROVED | `weatherStorm LIVE\|12`, blue/gold smoke visible (was grey haze) |
| Weather lens: column seams dissolved | F08B | `b0a7098` | PROVED | vertical stripes gone on ETH/BTC glass; 4.6 ms per rebuild |
| Weather lens: polished brass rim | F08B/G03 | `e304102` | PROVED | rim lit upper-left, shadow lower-right |
| Loupe handle | G03 | `772d76a` `ea6a3dc` | PROVED | `weatherLensHandle SE:123` / `SW:123` at the live edge; G03 plate pinned beside serving |
| Storm billows | G03 | `c4e2b3c` | PROVED | curling smoke with dark lanes beside G03; hue stays measured |
| Inspect collision: depth plate vs INSPECT chip | — | `92c8b91` | PROVED | `DECISION_ID wmd_g46niwqabmnv1u` fully legible above the chip (was smeared under it) |
| Absorption shelf as laid courses | F06A | `6958158` | PROVED | ETH-USD 15m NEAR `absorptionRows 8R:NO_SIDE` — mortar + joints per bar; grey (no measured side) |
| Wall casts onto the weather | (no wall plate) | `c4db78d` | BUILT | SPY 1h `WALL@785:BORN`; wall-over-lens frame not re-seen after deploy |
| LIVE/STILL frozen frame | — | none | PROVED | STILL: storm phase held 0.580; only bar clock + live price pixels change |
| Performance | — | — | PROVED | lens + handle + storm on camera: mean 4.1 ms, longest 8.9 ms, budget 33 ms MET, 0 over, 0 layer faults |

Deltas remaining: F06A plate colour (red/green slabs) needs a measured side — grey is correct without one · stacked-imbalance slabs are sub-pixel on 1-cent tick markets (honest) · F08B storm hue depends on the measured tones (single tone when the tape is one-sided) · one unexplained NEAR→MID/173 camera reset seen once mid-pan in a throttled hidden tab (unverified; harness suspected) · G04/G10/Mockup_46/Mockup_132 are cards/composites/diagrams, not on-glass game builds — not reconstructed.

## 3c. Garden 17 master order — two sessions, 2026-09-29 (17:20–18:00 and 21:00–00:00 CDT)

Session 1 START `d8cd30d` → `3b24c39`; session 2 START `3b24c39` → this board. PROVED = seen on serving glass; BUILT = gate green + serving, not seen.

| Item | Commits | Status | Evidence (serving) |
|---|---|---|---|
| Top rail = Workspace · Tools · Command Deck · Rooms · Community | `89dfd2a` | PROVED | DOM plates exactly those five, in that order |
| WM Smart Money Tools (+ W glyph) inside Tools | `89dfd2a` | PROVED | first entry of the Tools panel; masthead W plate removed |
| No "N/9 READY" — capability truth | `89dfd2a` | PROVED | Chart tools "ALL 12 AVAILABLE"; rows AVAILABLE / DRAWING / WAITING / UNAVAILABLE ON THIS FEED |
| No silent nothing (drawer) | `e67e0e6` | BUILT | senseEventStates → "ACTIVE · NO CURRENT EVENT" |
| No silent nothing (glass) | `5459049` `9d3a524` `4f51f2d` | PROVED | EURGBP: pressure UNSUPPORTED · LIQUIDITY WEATHER · UNAVAILABLE ON CURRENT FEED · FOUNDER ANATOMY · ACTIVE · NO CURRENT … EVENT; DNA / Memory alone now speak |
| Makeup governor · Living body over price ×0.5 | `f12ae26` | PROVED | `livingProfileBodyGoverned OVER_PRICE:0.5`, candles read through the body |
| Pressure field clear zone + compound role | `3b24c39` `37e4061` | PROVED | `derivativesPressureClearZone`, `derivativesPressureRole SUPPORTING:5` |
| Weather storm clear zone | `543847e` | PROVED | `weatherStormClearZone`; smoke thins on the live corridor |
| Brick walls: one wall per strike | `0f99bae` | PROVED | NVDA 1h: 227.5 BROKEN · 230/232.5 DEFENDED · 235 BORN as four separate walls |
| Brick walls: damage locality + fracture relief | `91cd7b8` `64cfa05` `e85b06f` | BUILT | cracks at each test's own bar (receipt CRACKS@…); occluded by the test candles themselves — price wins |
| Universal search: human names | (curated owner) | PROVED | TESLA→TSLA, S&P 500→SPY/ES1!/US500, NASDAQ FUTURES→NQ1!, GOLD→GC1!, OIL→CL1!, EURGBP, GBPJPY, BITCOIN→BTCUSD, ETHEREUM→ETHUSD; ^SPX opens from the palette |
| Index deep links | `e1095cc` | PROVED | `?symbol=^SPX` opens (was refused) |
| Result contract: venue | `492f66d` | PROVED | NQ1! "Futures · CME" |
| Cross-asset matrix (15 markets × senses) | — | PROVED | every cell a state (DRAWN / NO EVENT / UNSUPPORTED / UNMEASURED), 0 layer faults on all 15 |
| Symbol switch TSLA→NQ→EURGBP→BTC→TSLA | — | PROVED | own pressure / VRP POC / memory per market; TSLA returns identical |
| LIVE→STILL→LIVE backflip | — | PROVED | same wall, VRP POC, lens, anatomy, symbol; only storm motion changes |
| Performance | `0066405` `839ddda` `9ca108a` | PROVED | all senses on (ETH 15m, 21 layers): mean 13.1 ms · longest 16.9 ms · budget 33 ms MET · 0/93 over · 0 faults (was 42–53 ms): per-column storm blend, split storm rebuild, stress governor sheds texture only |
| Active candle wins · profile stack | `562e692` | PROVED | Founder's own TSLA 5m stack: `profileQuietedForLiveCandle FIXED_VP,COMPOSITE,VISIBLE_RANGE,STRUCTURE,FUSION,MEMORY` |
| Activation acknowledgement (§LXIV) | `6f1ecef` | PROVED | Chart tools → Visible Range on: `activationSpotlight visibleRangeProfile` for ~0.5–1.2 s, then cleared |
| Card erasure (§LXIX) | — | PROVED | NVDA 1h `proof=nolabels`: loupe, walls, Living body, TPO, VRP, pressure bands all read with every word hidden; each lane keeps its organism glyph |
| Camera silhouette (§XLVII) | — | PROVED | FAR (353 bars): candles dimmed, regime envelope + MAJOR HIGH/LOW + wall + pressure, lens/profiles/chips withheld · MID: market objects, lens, profiles · NEAR: environment drops, candle physiology + Living body |

Deltas remaining: Session / Fixed / Composite VP share one grey histogram body (told apart by organism glyph, session rule, brackets, CMP chips) · wall cracks sit under their own test candles (price wins) · TPO letter paint uncached · Founder's last-symbol key now TSLA (palette picks leave the proof scene; prior value unknown) · wm_ofVisibleRangeProfile read "true" after a proof-scene toggle (Founder's own stack showed VRP on, so likely unchanged).

## 3d. Master order continuation shift (2026-09-29 23:04 → 2026-09-30 CDT), START `93b48a3`

| Item | Commits | Status | Evidence (serving) |
|---|---|---|---|
| Where-is-it sweep (23 Chart-tools switches + order-flow senses, alone, pixel diff vs clean) | — | DONE | changed glass: Regime 11.1% · VRP 4.8% · TPO 3.9% · MTF 3.7% · Fixed 3.4% · Living 3.1% · … ; silent-nothing found: Imbalance Stack, Delta Divergence, Effort Mark, Liquidity Lifecycle, Big Trades |
| Order flow quiet row | `2b05ddf` `9a928f5` | PROVED | ETH: "ORDER FLOW · WAITING FOR SIDED PRINTS: IMBALANCE STACK, DELTA DIVERGENCE · ACTIVE · NO CURRENT EVENT: EFFORT MARK, LIQUIDITY LIFECYCLE"; BTC: "… WAITING FOR SIDED PRINTS: BIG TRADES" |
| Profile 11 Bid/Ask Split | — | PROVED | ETH 15m box: "BID/ASK SPLIT · TAPE 20/42 BARS · MAKER-SIDE · net −1.9k", DELTA + VOLUME columns |
| Proof scene holds drawing writes | `cc5d564` | BUILT (fix) | a proof-scene box had been autosaved into the trader's ETH-USD drawings — removed by hand; autosave now skips in a proof scene |
| Label density governor | `3207058` | PROVED | Founder's TSLA 5m stack `profileLevelChips 13:4M:0Y:1S:10Q` — Living chips lead |
| TPO blocks batched by ink | `f237852` | PROVED | identical blocks, fewer canvas calls |
| Wall crack visible at its test | `d14383f` | PROVED | NVDA 1h, magnified 5×: fracture with lit lip + chipped corner beside the test candle (was hidden behind it) |
| Order Flow camera wording | `0e8a4d4` | PROVED | Workspace: "Order Flow camera · Degraded · 4 available · 3 need sided tape" (was "4 of 7 draw here") |
| Inspect never covers its object | — | PROVED | select=zone: Passport docked left, supply zone clear on the right |
| Anatomy attachment | — | PROVED | NQ1! 15m: EXHAUSTING body in candle-free space, leader thread to the exhaustion mark |

## 4. Known limits of this board

- G7: sub-layers INSIDE one top-level layer share that layer's isolation (e.g. a fault in one profile species inside WEATHER_PROFILES_MEMORY ends that region for the frame, named).
- A throw after an inner `clip()` inside an isolated layer can leave that one frame's later layers clipped; the next frame starts from `ctx.reset()`.
