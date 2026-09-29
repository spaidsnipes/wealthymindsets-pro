# GARDEN 17 — SHERIFF COLOR BOARD (WM Pro)

One live board. Status vocabulary: 🟢 PROVED · 🟡 REPAIR · ⚪ EXTERNAL / NOT EXERCISABLE.
Only Sheriff says CLOSED. A green here is a claim with its evidence; perishable greens carry the time they were observed.

- **Board updated:** 2026-09-29T01:05Z (20:05 CDT) by ATHOS (Claude, one-thread WM Pro).
- **Serving:** `https://wealthymindsetspro.com` = `main` = `d1a2f10` (Cloudflare Workers; `/api/build-identity`).
- **Starting baseline (Founder receipt):** G0–G13 = 🟢 7 · 🟡 7 · 🔴 0.
- **Shift commits:** `f8e018c4` G3/G4 · `2f97de6c` `c5da473` G6 · `8d940235` `9b17142d` `f5083951` G7 · `63928db4` `9198420` `d1a2f10` G12 · `2613950c` board.

---

## 1. Controllable yellows — P0 (sorted by finish-line importance)

| ID | Gate / area | Claim | Status | First broken joint | Evidence | Repair | Break test | Production proof | Next action |
|---|---|---|---|---|---|---|---|---|---|
| Y-G10-01 | G10 Safety / Execution | Bounded paper lifecycle intent→risk→capability→submit→ack→fill→protect→modify→cancel→flatten→reconcile→receipt, with every block (wrong account, unsupported instrument, bad qty, risk fail, stale, unknown owner, offline) | 🟡 | Not exercised on serving this shift: a serving lifecycle receipt needs paper orders in the Founder's book, and paper writes reach his shared decision record (`/api/decision-position`) | Unit suites (paperTrade, orderSubmitGuard, paperCancelCertainty, webullOrders mapping refusals) green; Webull order stages certified BLOCKED by design | — | Needs lawful paper run | NONE yet | Founder OK to run a paper lifecycle on his production paper book (or a named sandbox owner) → capture receipt |
| Y-G6-01 | G6 Identity | Same DECISION_ID chart → order → fill → exit → receipt → reload | 🟡 (repair shipped, serving receipt pending) | `src/app/paper/page.tsx:774` re-minted at order intent (chart id A, order id B) — **repaired** `2f97de6c` (continueOrMint over readSceneDecision); exit dropped id — **repaired** (`decisionOfOpenPosition`, named refusal `EXIT: decision identity absent`); 4 boundaries accepted any string — **repaired** (isDecisionId) | 4 break tests (`paperExitDecision.test.ts`); gate 14,804 green | shipped | unit fault-injection: lost / malformed id fails by transition name | Serving: needs the same paper order as Y-G10-01 | Same Founder OK; then read order.decisionId === chart scene id on glass |
| Y-G6-02 | G6 Identity | Journal/review keys on the decision | 🟡 | `journalEntryToSnapshot.ts:93` uses the journal's own `record.id` as decisionId (second id space); `journalDecisionFilter.ts:4` accepts any string | agent trace 2026-09-29 | not started — changing it would drop existing journal links; needs a migration decision | — | — | Decide: link journal rows to real decision ids (forward only) |
| Y-G6-03 | G6 Identity | Command Deck scene id survives reload | 🟡 (repair shipped `c5da473`) | Deck held its decision in React state only — **repaired**: reads/writes decisionContinuity (same owner as /charts + ticket) | gate green; deck pin re-pointed | shipped | — | Serving deck reads honest absence "No decision born yet on this scene — permission has not crossed here." (market WAIT, no crossing to observe) | Observe on the first real permission crossing |
| Y-G9-01 | G9 Human fruit | Founder Tour five-second test passes on serving glass | 🟡 | Screenshots unavailable since ~19:10 CDT: Founder's Chrome not compositing the automation tab (occluded) — human-eyes pass not re-run after this shift's commits | Earlier today (≤14:45 CDT): collisions repaired and proved (silence rows, gap words, INSPECT label, zero-gamma name, regime word, market-time dates) | — | — | Partial (pre-19:00) | Founder Tour with Canon ⇄ Glass side-by-side at 360/390 not required (desktop only) — at desktop, human eyes |
| Y-G9-02 | G9 visual matrix | PRICE SOVEREIGNTY · COMPOUND HIERARCHY · FIELD IDENTITY · ANATOMY ATTACHMENT · SEMANTIC DENSITY · CARD-ERASURE · MARKETOBJECT CAUSALITY · MATERIAL/CANDLE CONTRAST · SYMBOL-SWITCH CONTAMINATION · PROFILE-FAMILY SERVING PROOF · LIVE/STILL PARITY | 🟡 (each) | Not re-proved against the Founder videos this shift | — | — | — | — | Work item-by-item with plates beside glass |
| Y-G3-01 | G3 Availability | reconnect_reconcile stage exercised | 🟡 | No disconnect→reconnect→state-match run recorded for the broker lane | cert shows PENDING (honest) | — | provider fault-injection on serving recovered (see G7) | — | Record a keeper-side reconnect receipt |

## 2. External — with local degradation

| ID | Dependency | Why ATH cannot exercise it | How WM Pro behaves | Local degradation proof |
|---|---|---|---|---|
| X-01 | CME futures market data (Webull OpenAPI futures) | Entitlement not purchased (403 `MARKET_DATA_NOT_SUBSCRIBED`) | NQ/ES bars from Yahoo (~10 min delay, named "N BARS BEHIND"); Webull ticks refuse `NQ1!` as INVALID_SYMBOL (400); futures order flow silent | 🟢 PROVED 2026-09-29 00:02Z (`/api/market-data/webull/ticks?symbol=NQ1!` → 400 INVALID_SYMBOL; ES header "BAR OPENED 02:00 PM · 1 BAR BEHIND") |
| X-02 | Stripe keys / entitlement owner | No `STRIPE_*` secrets; owner decision open | No invented checkout success | 🟡 not re-proved this shift |
| X-03 | OAuth providers | Provider configuration is the Founder's | Email/password path only | 🟡 not re-proved this shift |
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

- G7 layer isolation covers the overlay loop, the profile family and the pressure world. Other inline layers (footprint, weather, memory…) are protected at FRAME level only: a persistent throw in one of them still costs the layers painted after it (named by `paintFault`), until the fault clears.
- A throw after an inner `clip()` inside an isolated layer can leave that one frame's later layers clipped; the next frame starts from `ctx.reset()`.
