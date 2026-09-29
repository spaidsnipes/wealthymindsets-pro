# GARDEN 17 — SHERIFF COLOR BOARD (WM Pro)

One live board. Status vocabulary: 🟢 PROVED · 🟡 REPAIR · ⚪ EXTERNAL / NOT EXERCISABLE.
Only Sheriff says CLOSED. A green here is a claim with its evidence; perishable greens carry the time they were observed.

- **Board updated:** 2026-09-29T03:10Z (22:10 CDT) by ATHOS.
- **Serving:** `https://wealthymindsetspro.com` = `main` = `cb3c806` (Cloudflare Workers; `/api/build-identity`).
- **Starting baseline (Founder receipt):** G0–G13 = 🟢 7 · 🟡 7 · 🔴 0.
- **Shift commits:** `f8e018c4` G3/G4 · `2f97de6c` `c5da473` G6 · `8d940235` `9b17142d` `f5083951` G7 · `63928db4` `9198420` `d1a2f10` G12 · `2613950c` board.

---

## 1. Controllable yellows — P0 (sorted by finish-line importance)

| ID | Gate / area | Claim | Status | First broken joint | Evidence | Repair | Break test | Production proof | Next action |
|---|---|---|---|---|---|---|---|---|---|
| Y-G10-01 | G10 Safety / Execution | Bounded paper lifecycle intent→risk→capability→submit→ack→fill→protect→modify→cancel→flatten→reconcile→receipt, with every block (wrong account, unsupported instrument, bad qty, risk fail, stale, unknown owner, offline) | 🟡 | Not exercised on serving this shift: a serving lifecycle receipt needs paper orders in the Founder's book, and paper writes reach his shared decision record (`/api/decision-position`) | Unit suites (paperTrade, orderSubmitGuard, paperCancelCertainty, webullOrders mapping refusals) green; Webull order stages certified BLOCKED by design | — | Needs lawful paper run | NONE yet | Founder OK to run a paper lifecycle on his production paper book (or a named sandbox owner) → capture receipt |
| Y-G6-01 | G6 Identity | Same DECISION_ID chart → order → fill → exit → receipt → reload | 🟡 (repair shipped, serving receipt pending) | `src/app/paper/page.tsx:774` re-minted at order intent (chart id A, order id B) — **repaired** `2f97de6c` (continueOrMint over readSceneDecision); exit dropped id — **repaired** (`decisionOfOpenPosition`, named refusal `EXIT: decision identity absent`); 4 boundaries accepted any string — **repaired** (isDecisionId) | 4 break tests (`paperExitDecision.test.ts`); gate 14,804 green | shipped | unit fault-injection: lost / malformed id fails by transition name | Serving: needs the same paper order as Y-G10-01 | Same Founder OK; then read order.decisionId === chart scene id on glass |
| Y-G6-02 | G6 Identity | Journal/review keys on the decision | 🟡 POLICY (not a broken joint) | Journal entries are MANUAL trade records with no decision birth; `journalEntryToSnapshot` carries the entry's own id under the field name `decisionId`, and the Profile → `/journal?decisions=` drill-down filters by that same id consistently. A journal id cannot pass `isDecisionId` (no `wmd_`), so it can never merge into a real decision | traced 2026-09-29 22:00 CDT | none needed for correctness | — | — | Founder policy: should a manual journal entry bind to a DECISION_ID? If yes, forward-only field on new entries |
| Y-G6-03 | G6 Identity | Command Deck scene id survives reload | 🟡 (repair shipped `c5da473`) | Deck held its decision in React state only — **repaired**: reads/writes decisionContinuity (same owner as /charts + ticket) | gate green; deck pin re-pointed | shipped | — | Serving deck reads honest absence "No decision born yet on this scene — permission has not crossed here." (market WAIT, no crossing to observe) | Observe on the first real permission crossing |
| Y-G9-01 | G9 Human fruit | Founder Tour five-second test passes on serving glass | 🟡 | The Chrome window holding the WM tab is MINIMIZED (window 77) — Chrome does not render it, so neither screenshots nor paint timing are real; ATH's Chrome grant is read-only and the Founder is trading in the other windows — human-eyes pass not re-run after this shift's commits | Earlier today (≤14:45 CDT): collisions repaired and proved (silence rows, gap words, INSPECT label, zero-gamma name, regime word, market-time dates) | — | — | Partial (pre-19:00) | Founder Tour with Canon ⇄ Glass side-by-side at 360/390 not required (desktop only) — at desktop, human eyes |
| Y-G9-02 | G9 visual matrix (remaining) | COMPOUND HIERARCHY · FIELD IDENTITY · ANATOMY ATTACHMENT · CARD-ERASURE · MARKETOBJECT CAUSALITY · MATERIAL/CANDLE CONTRAST | 🟡 (each) | Not re-proved against the Founder videos this shift (subjective — need the Founder's eyes beside the plates) | Earlier 2026-09-28 proofs: compound ORDER FLOW+REGIME camera, G06 gold/red bodies on canonical anchors | — | — | — | Founder Tour with plates beside glass |
| Y-G9-03 | G9 price sovereignty | TPO level chips never on candles | 🟡 DECISION | `levelChip` finds no candle-free row within +120 px of the TPO column on dense charts and (by its law) places the chip ON candles with a dark backing (serving ETH 15m: TPO VAH/POC/VAL mid-chart) | screenshot 2026-09-29 02:44Z | — | — | — | Founder decision P-110 #10: TPO words at the left column vs the right fused stack |

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

## 4. Known limits of this board

- G7: sub-layers INSIDE one top-level layer share that layer's isolation (e.g. a fault in one profile species inside WEATHER_PROFILES_MEMORY ends that region for the frame, named).
- A throw after an inner `clip()` inside an isolated layer can leave that one frame's later layers clipped; the next frame starts from `ctx.reset()`.
