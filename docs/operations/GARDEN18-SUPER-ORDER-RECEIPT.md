# Garden 18 super finish-line order — shift receipt (2026-10-05)

Outcomes use the order's vocabulary only: CLOSED (evidenced) · OPEN · BLOCKED · UNSUPPORTED · NOT ENTITLED · PARTIAL · DEFERRED WITH FOUNDER SCOPE DECISION. No percentages.

## P0-A — Release identity (receipt, 11:51–12:05 CDT)

| Item | Evidence |
|---|---|
| Release candidate | `origin/main` of `spaidsnipes/wealthymindsets-pro` |
| Serving build at shift start | `1307778` (`/api/build-identity`, STAMPED, built 2026-10-05T08:45:04Z) |
| Serving build after first P0 batch | `47d4edc` (same probe, read from the Founder's signed-in tab) |
| Host | Cloudflare Workers (`wealthymindsets-pro`), domain `wealthymindsetspro.com` |
| **The order's "critical contradiction"** | **Resolved by measurement — a STALE CHECKOUT, not lost fixes.** `~/wealthymindsets-pro` (main checkout) was at `ece2ea68`, **0 ahead / 330 behind** `origin/main`. Every "missing" commit (`1f37e81`, `88bc807`, `b5b6464`, `0c3da1d`, `3d4b0c7`, `8dfd670`, `1307778`, `9bf5760`) is an ancestor of `origin/main` and was serving. Nothing was reset; nothing needed restoring. The main checkout's dirty files were left untouched. |
| LiveKit on the candidate (not the stale checkout) | Identity = `wm:<account id>` from the session; `role=host` requires `isLiveHost` (owner or `LIVEKIT_HOST_USER_IDS`); `/api/livekit/approve` is host-only. The order's description matched the stale checkout. |
| Radio on the candidate | Signed upload URLs (no multipart-in-memory), server-chosen path, uploader = account handle only (email-prefix fallback removed `1f37e81`). |

### P0-A fixes shipped this shift
- **Deploy-version recovery** `47d4edc`: a room crash caused by version skew (chunk-load error, or serving SHA ≠ the page's inlined `WM_BUILD_SHA`) reloads ONCE onto the current build; loop-guarded per tab (60 s). Room `error.tsx` + `global-error.tsx`. Tests: `src/lib/deployVersionRecovery.test.ts`. Status: **PARTIAL** — tested in source; the next deploy is the live proof opportunity (an old open tab must land on the new build instead of the error page).

## P0-B — Identity, isolation, live rooms

- **Registered rooms** `47d4edc`: tokens and approvals only for rooms WM publishes (5 Lounge + 3 WM TV), sentinel keeps the list in sync with both pages; approve requires a WM-minted identity (`wm:<id>`); approve errors sanitized. **Proved live** from the owner account: arbitrary room token → 404, arbitrary room approve → 404.
- Account-ID identity for LiveKit / handle-only community authorship: CLOSED in source + tests (`1f37e81`), owner path measured.
- Viewer data messages (raise hand): unchanged (`canPublishData` retained for viewers); schema validation of the data payload is client-side today — **OPEN**.
- **Guest test account: BLOCKED (Founder).** Builders may not create accounts on the production service. Founder creates a disposable guest account (no broker, no paid identity) and shares the session in a separate browser profile; until then guest paths are proved by tests + code only.

## P0-C — Supabase, uploads, auth, email, text

- **Radio content verification** `47d4edc`: a track is recorded only if the stored object's served `Content-Type` is audio and size ≤ 50 MB (HTML / SVG / oversize refused, never listed). Tests: `src/app/api/radio/route.test.ts`.
- **Bucket-level MIME allowlist + size limit: BLOCKED (Founder / Supabase dashboard).** Direct-to-storage enforcement must be set on the `radio` bucket (allowed MIME `audio/*`, limit 50 MB); the app-level check cannot stop a file being stored, only being listed.
- Auth journey (signup → real inbox → confirm → … → revocation): **OPEN** — needs the controlled mailbox / guest account above.
- Text/SMS: no text integration exists in WM Pro. The only "SMS" in the product is the live-room Share menu's `sms:` link, which opens the viewer's own phone app (no WM delivery, no consent burden on WM), and the Webull 2FA wording. No WM text promise found in copy. Status **UNSUPPORTED** (truthfully absent).

## P0-D — Stripe, Passport, tiers

- **Billing owner located:** `~/wow-world-os/worker/billing.js` (WOW World OS, Cloudflare Worker + D1). One product, `WOW_CONNECT`; signature-verified webhook (`verifyStripeSignature`, 300 s tolerance); `entitlements` keyed by `passport_id_ref`; test/live mode separated (`livemode`); billing portal.
- **WM Pro reads no entitlement.** No `$10 / $20 / $30` WM tiers exist in either codebase.
- Status: **DEFERRED WITH FOUNDER SCOPE DECISION** — the tier table in §8 is a proposal; Price IDs, products and the Passport→WM entitlement seam (WM reading WOW's `entitlements` by Passport ID through the existing `/api/passport/*` door) need Founder approval before any billing change. No billing was changed.

## P0-E — Broker boundaries and capital

- Live-order code remains under the classifier block recorded 2026-10-01/04; no builder capital action. Status **BLOCKED (Founder permission rule + scoped live-test authorization)**.

## P0-F — Legal and data rights

- Drafts exist (`docs/legal/TERMS-OF-SERVICE.DRAFT.md`, `PRIVACY-POLICY.DRAFT.md`); `/terms` and `/privacy` still 404. Publishing requires the actual business identity, contact and counsel. **BLOCKED (Founder / counsel).**
- Cboe / OPRA / broker third-party-use rights: **BLOCKED (licensing)** for any external sale or publicity.

## §4 — Full-height panels

- Workspace / Tools equipment panel (`#wm-os-rail`, `WMOperatingSystem.tsx`) now opens at the **full available workspace height** (inset 8 px top and bottom, floating, rounded), with a visible Close at every width, superseding the §XIII ~72 % cap. `1089423`.
- **Measured on serving `1089423`** (1440×900 frame inside the Founder's signed-in tab): Workspace and Tools each 805 px tall inside an 821 px workspace (87→892), Close visible, contents scroll. Before: ≤ 72 % (~590 px).
- Status **PARTIAL** — geometry proved; the screenshot beside the governing plate still needs a visible Founder glass (hidden tabs cannot be captured). Chart tools (ShellModalDrawer) and Inspect unchanged; Inspect has no Escape handler — OPEN.

## §5 — Brick Wall / Market Sense options evidence

- Owner `src/lib/marketData/viewModels/selectOptionsBarrierEvidence.ts` (extends Derivatives Pressure; no vendor formula, brand or claim imported). `9c17906`, `1deab66`.
- Adds: call-OI and put-OI concentration walls as separate OBSERVED species (volume beside OI, never added); every zero-gamma root (NONE / ONE / MANY); gamma, vanna, charm separately with stated units (shares per $1 / per vol point / per calendar day ELAPSED) and a dimensionally consistent combined scenario that refuses missing inputs **and refuses elapsed time past the nearest expiry**; expiry scope ALL / NEAREST / 0DTE in every receipt; no-IV contracts excluded and counted.
- Fixture proof: partials verified against delta by finite difference (`selectOptionsBarrierEvidence.test.ts`, 14 tests).
- **Live-data proof** (Cboe delayed chains, asOf 2026-10-05 17:16 UTC, run through the shipped module): SPY spot 774.15 — call-OI 785 / 787, put-OI 725 / 745, one root 771.01, 3,888 contracts, 0 without IV; SPX 7769.78 — call-OI 7000 / 8000, put-OI 6300 / 7000 / 8000, one root 7718.25, 10,056 contracts; QQQ 754.09 — call-OI 750 / 760 / 775, put-OI 700, one root 748.08. The run exposed the 0DTE charm-extrapolation flaw, fixed in `1deab66`.
- Surfaces: Pressure Wall Inspect ("OPTIONS EVIDENCE" block); canvas OI concentration ticks under Brick Walls (receipt `data-options-oi-walls`).
- OPEN: expiry-scope control on glass (selector supports it; UI fixed to ALL); SPX→ES / NDX→NQ futures mapping (item 9 — needs time-aligned basis; NOT built, mapping refused by absence); big-option-flow prints, net premium flow, carry/opening inventory (items 6–8 — no lawful source wired: UNSUPPORTED); participant-tagged data (NOT ENTITLED / licensing).

### PROPOSED plate — "OI Concentration Tick" (awaiting Founder canon approval)

| Facet | Contract |
|---|---|
| Silhouette / material | Short dashed tick (56 px) at the price axis, 2 px; teal `rgb(80,190,180)` = call OI, rose `rgb(214,120,150)` = put OI; label right-aligned above: `CALL OI 787 · 245k` |
| Anchors | Strike price (y); no time extent — positioning is a snapshot at the chain's clock, not a history |
| Coverage | Strikes within ±20 % of spot holding ≥ 5 % of that side's OI; top 3 per side |
| Lifecycle | None claimed (OBSERVED snapshot); the pressure slab owns lifecycle (born / tested / broken) |
| FAR / MID / NEAR | Same tick at every depth; off-camera strikes are listed `OFF_CAMERA` in the receipt, never pulled into view |
| Selection / Inspect | Read through the Pressure Wall Inspect "OPTIONS EVIDENCE" block |
| Roles | Supporting (never primary; never covers a candle body — axis-edge only) |
| Absence / stale / proxy | Silent with a receipt reason (`WAITING_FOR_EVIDENCE` / `SILENT:<reason>`); chain clock shown in Inspect |
| Forbidden substitutes | Calling it support / resistance / a pin; adding volume to OI; painting it as a slab |

## §4 — PROPOSED plates for children without a usable visual contract

All three are **PROPOSED** (not canon) until the Founder's canon process approves them. Each names the existing owner it would paint; none introduces a new data source or brand.

### PROPOSED — Market Breathing on canvas (`F15.BREATHING`, owner `src/lib/chart/marketBreathing.ts`)

| Facet | Contract |
|---|---|
| Silhouette / material | A thin translucent band hugging the candle range (±1 ATR around each bar's mid), its **width** = the bar's ATR, its **tone** = state: cool slate (compressing), neutral (steady), warm amber (expanding). No fill over bodies — band edges only, 1 px, 35 % alpha |
| Anchors | Every eligible bar after the ATR warm-up (named on the glass: "breathing warms up over N bars") |
| Lifecycle | Compression run → release bar marked with a single short notch where expansion begins |
| FAR / MID / NEAR | FAR: band only · MID: + release notches · NEAR: + per-bar ATR value on hover |
| Selection / Inspect | Click a notch → Inspect shows ATR, realized vol, run length, the definition (OBSERVED from OHLC, DERIVED measure) |
| Absence | Fewer bars than warm-up → silent row "breathing needs N bars" |
| Forbidden | Painting candles; implying direction; calling compression a "squeeze signal" |

### PROPOSED — Response Matrix on canvas (`AB.MATRIX`, owner `src/lib/chart/effortEvidence.ts`)

| Facet | Contract |
|---|---|
| Silhouette / material | A 2×2 glyph (6 px cells) under each eligible bar's low: effort (high / low) × response (large / small move). The one lit cell names the bar's state; mismatch cells (high effort / small response, low effort / large response) are outlined in gold |
| Anchors | Bars with signed effort (tape) — OHLC-only bars draw no glyph and the receipt says `NO_SIGNED_EFFORT` (estimate cannot impersonate tape) |
| Lifecycle | None — per-bar observation |
| FAR / MID / NEAR | FAR: only mismatch glyphs · MID: all glyphs · NEAR: + numbers on hover |
| Selection / Inspect | Click → the observed effort, observed response, the contextual expected response and how it was derived |
| Absence | `COVERAGE_GAP` for bars outside captured tape, stated with the captured range |
| Forbidden | Ranking bars as buy/sell signals; inventing effort from price |

### PROPOSED — Temporal Evidence Density (`F10.TED`, owner `src/lib/chart/effortEvidence.ts`)

| Facet | Contract |
|---|---|
| Silhouette / material | A 4 px strip along the time axis; each bar's segment shaded by evidence density (volume concentration across clock time). Structural / Event / Adaptive time are NOT drawn until built — the strip says "clock time" |
| Anchors | Every loaded bar; gaps in data are hatched, never interpolated |
| FAR / MID / NEAR | Same strip at every depth; NEAR adds the density value on hover |
| Selection / Inspect | Click → density definition (Founder to confirm WM's reading of the name, per census gap) |
| Forbidden | Re-spacing the time axis (that is Structural/Event time, not built); implying the dense periods are "important" without evidence |

### Glass-proof limit (12:35–12:45 CDT)
The canvas paint receipt for OI ticks (`data-options-oi-walls`) could not be read: the only signed-in WM tab is HIDDEN, and a hidden tab runs no chart paint loop (no receipts were written by ANY layer — 0 dataset keys — with the frame off-screen or on-screen-transparent, with or without a rAF shim). Status of the canvas manifestation: **PARTIAL** (source + selector live-data proof; serving-glass receipt needs a visible Founder tab: `/charts?symbol=SPY&tf=1h&scene=clean&on=BRICK_WALLS`, read `canvas.dataset.optionsOiWalls`).

## §6 — Provider capability matrix (generated from `src/lib/broker/capabilityLedger.ts`, 2026-10-05)

"Entitled" and "Proved" describe the **owner's** connected accounts only; no customer account is connected to any broker in WM today (per-user broker linking is not built). Capital certification (live submit → ack → fill → protection → exit on a funded account) is **BLOCKED** for every row pending a scoped Founder live-test authorization.

#### tastytrade

| Capability | Supported by WM | Wired (owner) | Entitled | Proved | Note |
|---|---|---|---|---|---|
| Quotes | yes | yes (`lib/broker/tastyQuoteStream.ts`) | owner account | measured on serving (owner session) | LIVE — DXLink: stocks, ETFs, options, futures, futures options, listed USD coins |
| Bars / candles | yes | yes (`lib/marketData/adapters/tastytradeCandles.ts`) | owner account | measured on serving (owner session) | LIVE — 5 s … 1 M; stocks, futures, listed USD coins |
| Live prints (tape) | yes | yes (`lib/marketData/adapters/tastytradeFuturesTicks.ts`) | — | — | PARTIAL — futures and option prints signed by the venue (Options Flow); stock sides INFERRED (Lee–Ready); print history capped near 1,000 per contract — the candles' own bid / ask volume carries signed flow for the whole bar history |
| Book depth | no | no | — | probe 2026-10-06 | UNSUPPORTED — not served on this DXLink session (PriceLevel "not available"; Order → internal error, no events) |
| Options chain | yes | yes (`app/api/broker/tastytrade/chain/route.ts`) | owner account | measured on serving (owner session) | LIVE — expirations, strikes, live quotes |
| Greeks | yes | yes (`lib/broker/tastyOptionStreamers.ts`) | owner account | measured on serving (owner session) | LIVE — DXLink Greeks events |
| Futures options | yes | yes (`lib/broker/tastytradeFuturesChain.ts`) | owner account | measured on serving (owner session) | LIVE — e.g. MNQ, ES chains with Greeks |
| Execute · stock / ETF | yes | yes (`app/api/broker/tastytrade/order-submit/route.ts`) | owner account, armed press | dry-run / preview only — capital certification BLOCKED | HUMAN_ARMED — dry run first; live only on your armed press |
| Execute · equity option | yes | yes (`app/api/broker/tastytrade/order-submit/route.ts`) | owner account, armed press | dry-run / preview only — capital certification BLOCKED | HUMAN_ARMED — single leg; open / close intent required |
| Execute · future | yes | yes (`app/api/broker/tastytrade/order-submit/route.ts`) | owner account, armed press | dry-run / preview only — capital certification BLOCKED | HUMAN_ARMED — specific contract; futures-approved account only |
| Execute · futures option | yes | yes (`lib/broker/fopTicket.ts`) | owner account, armed press | dry-run / preview only — capital certification BLOCKED | HUMAN_ARMED — futures-approved account only |
| Execute · crypto | yes | yes (`lib/broker/tastytradeOrder.ts`) | owner account, armed press | dry-run / preview only — capital certification BLOCKED | HUMAN_ARMED — GTC only (tastytrade's crypto rule) |
| Cancel order | yes | yes (`app/api/broker/tastytrade/orders/route.ts`) | owner account | measured on serving (owner session) | LIVE — working orders |
| Modify / replace order | yes | no | — | — | NOT_BUILT — cancel and re-enter until replace is built |
| Protection (stop · bracket) | yes | yes (`lib/broker/tastytradeEntryFields.ts`) | — | — | PARTIAL — broker-native Stop / Stop Limit; bracket / OCO not built |
| Positions / balance | yes | yes (`app/api/broker/tastytrade/positions/route.ts`) | owner account | measured on serving (owner session) | LIVE — accounts masked to last 4 |
| Fills & order history | yes | yes (`lib/broker/tastytradeFills.ts`) | owner account | measured on serving (owner session) | LIVE — fills into Journal; full history read page by page (no 250-row cut) |
| Realised P&L | yes | yes (`lib/broker/tastytradeLedger.ts`) | owner account | measured on serving (owner session) | LIVE — round trips from tastytrade's own transactions (its cash, its fees) — Journal › Broker Ledger |

#### Webull

| Capability | Supported by WM | Wired (owner) | Entitled | Proved | Note |
|---|---|---|---|---|---|
| Quotes | yes | yes (`lib/marketData/adapters/webullMarketData.ts`) | owner account | measured on serving (owner session) | LIVE — stock snapshots + crypto stream |
| Bars / candles | yes | no | — | — | NOT_BUILT — chart bars come from tastytrade's candles; a Webull bar door is not built |
| Live prints (tape) | yes | yes (`lib/marketData/adapters/webullTicksBrowser.ts`) | owner account | measured on serving (owner session) | LIVE — stock prints in session; Webull sends no aggressor side, so sides are inferred — tastytrade's tape outranks it when fresh |
| Book depth | yes | no | — | — | NOT_BUILT — Webull's book is not wired into WM yet |
| Options chain | yes | no | — | — | NOT_BUILT — options are read from tastytrade's chain |
| Greeks | yes | no | — | — | NOT_BUILT — tastytrade supplies Greeks |
| Futures options | no | no | — | — | UNSUPPORTED — not on this rail in WM |
| Execute · stock / ETF | yes | yes (`app/api/broker/webull/order-submit/route.ts`) | owner account, armed press | dry-run / preview only — capital certification BLOCKED | HUMAN_ARMED — Webull preview must accept first; live only on your armed press |
| Execute · equity option | yes | yes (`app/api/broker/webull/order-submit/route.ts`) | owner account, armed press | dry-run / preview only — capital certification BLOCKED | HUMAN_ARMED — single-leg OSI contract; open / close intent required |
| Execute · future | yes | no | — | — | NOT_BUILT — futures orders route through tastytrade |
| Execute · futures option | no | no | — | — | UNSUPPORTED — not on this rail in WM |
| Execute · crypto | yes | no | — | — | NOT_BUILT — crypto orders route through tastytrade |
| Cancel order | yes | yes (`app/api/broker/webull/orders/route.ts`) | owner account | measured on serving (owner session) | LIVE — working orders |
| Modify / replace order | yes | no | — | — | NOT_BUILT — cancel and re-enter until replace is built |
| Protection (stop · bracket) | yes | no | — | — | NOT_BUILT — no broker-native stop wired for Webull yet |
| Positions / balance | yes | yes (`app/api/broker/webull/positions/route.ts`) | owner account | measured on serving (owner session) | LIVE — account numbers masked to last 4 |
| Fills & order history | yes | yes (`lib/broker/webullLedger.ts`) | owner account | reconstructed from broker history | RECONSTRUCTED — Lifetime Ledger from order history (fees itemised); not observed by WM at the time |
| Realised P&L | yes | yes (`lib/broker/webullLedger.ts`) | owner account | reconstructed from broker history | RECONSTRUCTED — realised P&L net of fees, reconciled with Webull's day P&L |
#### Providers outside the ledger

| Provider | State | Evidence / next action |
|---|---|---|
| NinjaTrader | **UNSUPPORTED (external link only)** | The broker card opens NinjaTrader's own site and says "Not wired in WM Pro". No adapter, no API credential, no account discovery. Next: an eligible user's sandbox REST/WebSocket credential + integration licensing (Founder); then the adapter inside the existing broker architecture. Plan: memory `wm-ninjatrader-plan-2026-10-04`. |
| moomoo | **BLOCKED (host/locality)** | Read-only adapter + OpenD bridge exist; needs the Founder's OpenD running and logged in. |
| Spot FX execution | **UNSUPPORTED** | Trade panel refuses before sending ("NO CONNECTED SPOT-FX EXECUTION RAIL"); currency futures are never swapped in. Charting FX is available; execution is not. |

## P0-D — Proposed Passport → WM entitlement seam (PROPOSAL, nothing changed)

1. **Source of truth stays WOW World OS** (`worker/billing.js`, D1 `entitlements`, signature-verified Stripe webhooks). WM Pro never takes payment and never grants access from a URL, local storage or a profile field.
2. **New products, Founder-approved first:** `WM_ESSENTIALS` ($10), `WM_PASSPORT` ($20), `WM_PRO_AI` ($30, includes Passport) as Stripe Prices; webhook writes one `entitlements` row per product per `passport_id_ref`, same idempotent upsert as `WOW_CONNECT`.
3. **WM reads, server-side only:** a WOW endpoint `GET /api/entitlement` authenticated by the existing Passport handoff trust (`/api/passport/*`), returning `{ product, status, current_period_end, livemode }`; WM caches it per account ≤ 5 min and enforces on every gated API route (not just UI).
4. **Never gated:** risk state, working orders, protection, reconciliation and the path to manage/exit an open position; downgrade keeps records + export.
5. **Proof plan:** test-mode purchase → second browser shows exactly the tier → forged/duplicate webhook creates nothing → direct API call refused for a lower tier → cancel-at-period-end flips at period end.
Status: **DEFERRED WITH FOUNDER SCOPE DECISION** (Price IDs, products, existing-subscriber reconciliation).

## Shift status (12:55 CDT)

| Gate | Status |
|---|---|
| P0-A release identity | CLOSED (receipt above; stale-checkout contradiction resolved by measurement) |
| P0-A deploy-version recovery | PARTIAL (tested; live proof on the next open-tab-across-deploy) |
| P0-B live rooms (registry, authenticated sender, host-only approve) | CLOSED for the server gates (live 404s measured); room message rules tested |
| P0-B guest account / A-vs-B isolation proof | BLOCKED (Founder creates the guest account) |
| P0-C Radio content check | CLOSED in source + tests; bucket MIME/size policy BLOCKED (Supabase dashboard) |
| P0-C auth/email journey | OPEN (needs controlled mailbox + guest account) |
| P0-C text/SMS | UNSUPPORTED (truthfully absent) |
| P0-D billing | DEFERRED WITH FOUNDER SCOPE DECISION |
| P0-E capital | BLOCKED (permission rule + scoped authorization) |
| P0-F legal / data rights | BLOCKED (Founder / counsel / licensing) |
| §4 full-height Workspace/Tools + Close, Inspect Escape | PARTIAL (geometry measured on serving; screenshot needs visible glass) |
| §4 activation-to-canvas ledger (every child) | OPEN — census of 78 consumer inventions exists (`inventionCensus.ts`); runtime columns need a visible signed-in tab (hidden tabs run no paint loop) |
| §4 PROPOSED plates (Breathing, Response Matrix, TED, OI tick) | PROPOSED — awaiting Founder canon |
| §5 options evidence (selector, Inspect, scope control, canvas ticks) | PARTIAL (fixture + live-data proof; canvas receipt needs visible glass) |
| §5 futures mapping, big flows, net premium, carry, participant data | UNSUPPORTED / NOT ENTITLED (no lawful wired source) |
| §6 NinjaTrader API | UNSUPPORTED (external link) — OPEN within Garden 18 |
| §7 missing fees never zero (broker truth totals) | CLOSED in source |

## §4 — Activation-to-canvas ledger (generated from `src/lib/canon/inventionCensus.ts`, 2026-10-05)

Source columns are filled from the census (owner, control, plate, status, gap). **The runtime columns the order requires — eligible bars/objects, actual painted objects, first useful paint, camera / panel-close / off behaviour, Inspect identity, performance — are NOT MEASURED this shift**: the only signed-in WM tab was hidden, and a hidden tab runs no chart paint loop. Method for the next visible session: `/charts?symbol=<S>&tf=<TF>&scene=clean&on=<SWITCH_ID>` per switch, read the main canvas `dataset` receipts (e.g. `brickWalls`, `optionsOiWalls`, `derivativesPressurePainted`, `imbalanceStackBars`, `flowCurrent`, `dualAnatomy`, `semanticZoom`) after tape backfill (~30–40 s), then close the panel, pan/zoom, switch symbol/timeframe, save/restore the View, reload, and re-read. "No qualifying event" stays distinct from every defect class.

Counts by class: BUILT 66 · NO_RENDERER 6 · PARTIAL 1 · PANEL_ONLY 2 · INTERNAL 3

| ID | Invention | Governing plate | Control | Owner (renderer / selector) | Class | Gap |
|---|---|---|---|---|---|---|
| F01 | Truth owns the candle · Fidelity five (not a rainbow) | WM_NewMockup_64b_F01A_Truth_Owns_Candle | fidelity chip beside every price (chart, watchlist, tape, desk) | `src/components/marketData/CanonicalFidelityBadge.tsx` | BUILT (contextual surface) |  |
| F01.CHART_INTEGRITY | Chart Integrity Inspector / honesty plaque | ATH_Blueprint_E-301_Fidelity_Logic | honesty plaque under the WAIT rail | `src/lib/marketData/selectPerCapabilityFidelity.ts` | BUILT (contextual surface) |  |
| F03A | Memory Ghost | WM_NewMockup_68_F03A_Memory_Ghost | Tools switch `MEMORY_GHOST` | `src/lib/marketData/viewModels/selectMemoryGhost.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| H-801 | Expected Envelope + Analogue Surprise | WM_NewMockup_120_F03_Expected_Envelope_Surprise | Tools switch `EXPECTED_ENVELOPE` | `src/lib/marketData/viewModels/selectExpectedEnvelope.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F04A | Causal marks on the event (Force → Response, Unpaid Evidence Debt) | WM_NewMockup_70_F04A_Causal_Marks | switch on Big Trades, then select a print | `src/lib/marketData/viewModels/selectPrintResponse.ts` | BUILT (contextual surface) |  |
| F05A | Clarity Candle (default language) | WM_NewMockup_72_F05A_Clarity_Default_Language | Tools switch `CLARITY_CANDLE` | `src/lib/chart/clarityCandle.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F05B | Candle Anatomy Inspect (Truth Range · Pressure Split · Battle Balance) | WM_NewMockup_73_F05B_Candle_Anatomy_Inspect | select a candle → Inspect | `src/lib/marketData/viewModels/selectClarityAnatomy.ts` | BUILT (contextual surface) |  |
| F06A.BIDASK | Footprint · Bid × Ask | WM_NewMockup_74_F06A_OrderFlow_On_Price | Footprint mode `bid-ask` | `src/components/chart/FootprintControls.tsx` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F06A.DELTA | Delta Bubbles | WM_NewMockup_74_F06A_OrderFlow_On_Price | Footprint mode `delta` | `src/components/chart/FootprintControls.tsx` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F06A.IMB | Imbalance cells | WM_NewMockup_74_F06A_OrderFlow_On_Price | Footprint mode `imbalance` | `src/components/chart/FootprintControls.tsx` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F06A.AGGPAS | Aggressive / Passive | **none — needs plate** | Footprint mode `aggressive-passive` | `src/components/chart/FootprintControls.tsx` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F06A.VOL | Volume per candle | **none — needs plate** | Footprint mode `volume-profile` | `src/components/chart/FootprintControls.tsx` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F06B | Raw Tape Inspect | WM_NewMockup_75_F06B_Raw_Tape_Inspect | select a print → Inspect | `src/components/chart/ChartInspectTicket.tsx` | BUILT (contextual surface) |  |
| H-701.ABS | Absorption Shelf | WM_NewMockup_46_OrderFlow_Footprint_Absorption | Tools switch `ABSORPTION` | `src/lib/marketData/selectAbsorptionAnatomy.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| H-701.EXH | Exhaustion | WM_Transformation_UI_06_Absorption_Anatomy | Tools switch `EXHAUSTION` | `src/lib/marketData/viewModels/selectExhaustion.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F06.STACK | Stacked Imbalance | **none — needs plate** | Tools switch `IMBALANCE_STACK` | `src/lib/marketData/viewModels/selectStackedImbalance.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F06.DIV | Delta Divergence | **none — needs plate** | Tools switch `DELTA_DIVERGENCE` | `src/lib/marketData/viewModels/selectDeltaDivergence.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F06.EFFORT | Effort → Response (Effort Mark) | **none — needs plate** | Tools switch `EFFORT_MARK` | `src/lib/marketData/effortMarkGeometry.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F06.DLEVELS | Delta Levels | **none — needs plate** | Tools switch `DELTA_LEVELS` | `src/lib/marketData/viewModels/selectDeltaLevels.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F06A.FLOW | Flow Current (order flow on price) | WM_NewMockup_74_F06A_OrderFlow_On_Price | Tools switch `FLOW_CURRENT` | `src/components/chart/MainChart.tsx` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F06.VALUE_CANDLE | Value Candle | **none — needs plate** | Tools switch `VALUE_CANDLE` | `src/lib/marketData/viewModels/selectValueCandle.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F06.ANATOMY | Anatomy Cards (absorption / exhaustion metrics) | WM_Transformation_UI_19_Absorption_Anatomy_Alternate | Tools switch `ANATOMY_CARDS` | `src/lib/marketData/viewModels/selectAnatomyCards.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F06.BIDASK_PROFILE | Bid/Ask Split Profile (#11) | WM_A_P110_LIVING_PROFILE_STACK | Tools switch `DELTA_VP` | `src/lib/marketData/viewModels/selectProfileMenu.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F06.COMPRESSION | Order Flow Compression | **none — needs plate** | — | `—` | NO_RENDERER (no owner) | named in the registry; no owner |
| F07A | Big Trades on the market | WM_NewMockup_76_F07A_BigTrades_On_Market | Footprint mode `big-trades` | `src/lib/bigTradeLevels.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F07B | Cluster → Response Inspect | WM_NewMockup_77_F07B_Cluster_Response_Inspect | select a Big Trades print → Inspect | `src/lib/marketData/viewModels/selectPrintResponse.ts` | BUILT (contextual surface) |  |
| F08A | Liquidity Lifecycle | WM_NewMockup_78_F08A_Liquidity_Lifecycle | Tools switch `LIQUIDITY_LIFECYCLE` | `src/lib/marketData/viewModels/selectLiquidityLifecycle.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F08B | Liquidity Weather (lens) | WM_NewMockup_79_F08B_Weather_Lens | Tools switch `LIQUIDITY_WEATHER` | `src/lib/marketData/viewModels/selectLiquidityWeather.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F08.BRICK | Brick Walls | **none — needs plate** | Tools switch `BRICK_WALLS` | `src/lib/marketData/viewModels/selectProfileMenu.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| P110.1 | Living Profile | WM_A_P110_LIVING_PROFILE_STACK | Tools switch `LIVING_PROFILE` | `src/lib/marketData/viewModels/selectLivingProfile.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| P110.2 | Structure Profile | WM_A_P110_LIVING_PROFILE_STACK | Tools switch `STRUCTURE_PROFILE` | `src/lib/marketData/viewModels/selectStructureProfile.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| P110.3 | Profile Fusion | WM_A_P110_LIVING_PROFILE_STACK | Tools switch `PROFILE_FUSION` | `src/lib/marketData/viewModels/selectProfileFusion.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| P110.4 | Profile Memory | WM_A_P110_LIVING_PROFILE_STACK | Tools switch `PROFILE_MEMORY` | `src/lib/marketData/viewModels/selectProfileMemory.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| P110.5 | Profile DNA | WM_A_P110_LIVING_PROFILE_STACK | Tools switch `PROFILE_DNA` | `src/lib/marketData/viewModels/selectProfileDna.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| P110.6 | Session Profile | **none — needs plate** | Tools switch `SESSION` | `src/lib/marketData/viewModels/selectProfileMenu.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| P110.7 | Visible Range Profile | **none — needs plate** | Tools switch `VISIBLE_RANGE_PROFILE` | `src/lib/marketData/viewModels/selectVisibleRangeProfile.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| P110.8 | Fixed Range Profile | **none — needs plate** | Tools switch `ANCHORED_RANGE` | `src/lib/marketData/viewModels/selectProfileMenu.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| P110.9 | Composite Profile | **none — needs plate** | Tools switch `COMPOSITE_PROFILE` | `src/lib/marketData/viewModels/selectCompositeProfile.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| P110.10 | TPO / Auction Distribution | **none — needs plate** | Tools switch `TPO_PROFILE` | `src/lib/marketData/viewModels/selectTpoProfile.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| P110.CLASSIC | Classic VP · all loaded bars | **none — needs plate** | Tools switch `FIXED_RANGE` | `src/lib/marketData/viewModels/selectProfileMenu.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F09.MIGRATION | Value Migration (Living's auction movie) | **none — needs plate** | Tools switch `VALUE_MIGRATION` | `src/lib/marketData/viewModels/selectValueMigration.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F10 | MTF Ancestry (higher-timeframe objects on this camera) | **none — needs plate** | Tools switch `MTF_ANCESTRY` | `src/lib/marketData/viewModels/selectMtfAncestry.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F10.REPLAY | Replay (no-hindsight walk) | **none — needs plate** | Workspace › Replay | `src/lib/chart/replayWindow.ts` | BUILT (contextual surface) |  |
| F10.TED | Temporal Evidence Density · Structural/Event/Adaptive time | **none — needs plate** | Evidence density (TED) line in the WAIT rail | `src/lib/chart/effortEvidence.ts` | PARTIAL | TED reads volume concentration across clock time (WM's reading of the name — Founder to confirm); Structural / Event / Adaptive time not built |
| F11A | Market Object on chart | WM_NewMockup_84_F11A_Object_On_Chart | Tools › Market object passport | `src/lib/marketData/viewModels/selectStructureZoneObjects.ts` | BUILT (contextual surface) |  |
| F11B | Object Passport | WM_NewMockup_85_F11B_Passport_Drawer | select an object → Passport | `src/lib/marketData/viewModels/selectMarketObjectPassport.ts` | BUILT (contextual surface) |  |
| F11.STRUCTURE | Market Structure | **none — needs plate** | Tools switch `MARKET_STRUCTURE` | `src/lib/marketData/viewModels/selectMarketStructure.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| H-301 | Evidence Lineage (do not count 7 correlated readings as 7) | WM_NewMockup_118_F12_Evidence_Lineage_Do_Not_Count_7 | the WAIT rail beside the chart, once indicators or senses are on | `src/lib/chart/evidenceLineage.ts` | BUILT (contextual surface) |  |
| H-501 | Semantic Zoom (FAR · MID · NEAR) | WM_NewMockup_128_F13_Semantic_Zoom_Micro | the chart's zoom itself | `src/lib/marketData/viewModels/selectSemanticDensity.ts` | BUILT (contextual surface) |  |
| F13.LENS | Question Lens | WM_Transformation_UI_04_Question_Driven_Absorption_Canvas | Tools switch `QUESTION_LENS` | `src/lib/marketData/viewModels/selectQuestionLens.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F13.SCAFFOLD | Scaffolding (Foundation → Pro) | **none — needs plate** | Tools switch `SCAFFOLDING` | `src/lib/marketData/viewModels/scaffoldingGlass.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| S-501 | Attention Governor / Four-Chunk Budget | ATH_Blueprint_S-501_Four_Chunk_Attention_Budget | always on; visual roles in Tools › Active | `src/lib/marketData/viewModels/selectAttentionGovernor.ts` | BUILT (contextual surface) |  |
| H-401 | Contradiction not averaged | WM_NewMockup_124_F14_Contradiction_Not_Averaged | Tools switch `CONTRADICTION` | `src/lib/marketData/viewModels/selectContradiction.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F14.HEAT | Heat lens — lands on the same camera | WM_NewMockup_126_F14_Heat_Lands_Same_Camera | route `/scanner/map` | `src/lib/marketData/viewModels/selectHeatLens.ts` | BUILT (contextual surface) |  |
| F14.ARCHIVE | Research Heat Archive (saved / historical heat) | **none — needs plate** | route `/research-heat` | `src/lib/research/heatArchive.ts` | BUILT (contextual surface) |  |
| H-901 | Regime State Lighting | WM_NewMockup_92_F15A_Regime_State_Lighting | Tools switch `REGIME_LIGHTING` | `src/lib/marketData/viewModels/selectRegimeLighting.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F15.PRESSURE | Derivatives Pressure world | **none — needs plate** | Tools switch `DERIVATIVES_PRESSURE` | `src/lib/marketData/viewModels/selectDerivativesPressure.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F15.BREATHING | Market Breathing | **none — needs plate** | Market breathing card in the WAIT rail beside the chart | `src/lib/chart/marketBreathing.ts` | PANEL_ONLY (canvas grammar needs a plate) | rail reading built to the registry's Volatility/Breathing definition (ATR, realized vol, compression, expansion); its on-canvas grammar waits for a Founder plate |
| H-101 | Evidence Debt / WAIT as a finished state | WM_NewMockup_94_F16A_WAIT_Finished_State | the WAIT rail beside the chart | `src/lib/marketData/viewModels/selectWaitPlaque.ts` | BUILT (contextual surface) |  |
| H-1001 | Risk on Price + Frozen Receipt | WM_NewMockup_96_F17A_Risk_On_Price | Tools switch `RISK_ON_PRICE` | `src/lib/marketData/viewModels/selectRiskOnPrice.ts` | BUILT — runtime coverage NOT MEASURED this shift |  |
| F18 | TRADE — one verb (futures · stocks · crypto · options family) | **none — needs plate** | TRADE beside Desk / Watchlist | `src/components/chart/TradePanel.tsx` | BUILT (contextual surface) |  |
| F18.EXPR | Underlying + Expression, same Decision_ID (Dual Truth) | WM_NewMockup_134_Underlying_Plus_Expression_Same_ID | Options / Futures Options | `src/components/chart/FuturesOptionsPanel.tsx` | BUILT (contextual surface) |  |
| F20 | Journal / Review (broker truth + 8-part review) | WM_NewMockup_127_F20_Receipt_Frozen_asOf | route `/journal` | `src/components/journal/BrokerTruthToday.tsx` | BUILT (contextual surface) |  |
| F20.EDGE | Personal Edge | **none — needs plate** | route `/journal` | `src/lib/traderMemory/viewModels/selectPersonalEdge.ts` | BUILT (contextual surface) |  |
| F21 | Academy (same room) · Learning Genome | WM_NewMockup_105_F21B_Academy_Same_Room | route `/education` | `src/lib/learningGenome/selectSetupGrade.ts` | BUILT (contextual surface) |  |
| F22 | Spaidbot — WHY over the same object | WM_NewMockup_106_F22A_Spaidbot_Same_Object | DECISION · RISK · WHY · NEXT | `src/components/experience/DecisionWhyPanel.tsx` | BUILT (contextual surface) |  |
| F23 | Opening Bell posture | **none — needs plate** | route `/morning-prep` | `src/lib/traderMemory/viewModels/selectOpeningBell.ts` | BUILT (contextual surface) |  |
| ROOM.BACKTEST | Backtest Lab | **none — needs plate** | route `/backtesting` | `src/app/backtesting/page.tsx` | BUILT (contextual surface) |  |
| ROOM.SCANNER | Scanner Deck | **none — needs plate** | route `/scanner` | `src/app/scanner/page.tsx` | BUILT (contextual surface) |  |
| AB.TWIN | Market Twin · State Graph | **none — needs plate** | — | `—` | NO_RENDERER (no owner) | named; no owner |
| AB.MATRIX | Response Matrix | **none — needs plate** | Response matrix card in the WAIT rail (effort × response cells per bar) | `src/lib/chart/effortEvidence.ts` | PANEL_ONLY (canvas grammar needs a plate) | rail reading built to the registry line 'observed response vs contextual expected response'; on-canvas grammar waits for a Founder plate |
| AB.PERCEPTION | Perception Graduation | **none — needs plate** | — | `—` | NO_RENDERER (no owner) | named; no owner |
| AB.COMPARATIVE | Comparative Reality Mode | **none — needs plate** | — | `—` | NO_RENDERER (no owner) | named; no owner |
| AB.GRAVITY | Process Gravity Field | **none — needs plate** | — | `—` | NO_RENDERER (no owner) | named; no owner |
| AB.DECAY | Structural Memory + Decay Physics | **none — needs plate** | — | `—` | NO_RENDERER (no owner) | named; no owner |
| F02 | Hive / Nectar | **none — needs plate** | route `/nectar` | `src/app/nectar/page.tsx` | INTERNAL (organ, not a consumer surface) |  |
| F25 | Vault continuity | **none — needs plate** | — | `src/components/chart/NectarVaultChip.tsx` | INTERNAL (organ, not a consumer surface) |  |
| F26 | Chaos Gym | **none — needs plate** | — | `—` | INTERNAL (organ, not a consumer surface) |  |
### §5 canvas manifestation — PROVED on serving glass (13:10 CDT)
Founder's chart tab became visible (not focused); a transparent click-through 1440×900 frame loaded `/charts?symbol=SPY&tf=1h&scene=clean&on=BrickWalls` on serving `17c32dc`. Main canvas receipts 5 s after load: `optionsOiWalls = CALL_OI@785|CALL_OI@787|PUT_OI@725|PUT_OI@745`, `optionsEvidence = OPTEVID:ALL|CALLOI:785,787|PUTOI:725,745|ROOTS:ONE:1|N:3888|NOIV:0`, `brickWalls = ON:4`, pressure walls `774 BREAKING · 775 BORN · 785/787 BORN (OFF_CAMERA)`. Identical to the off-glass live-data run. Status: **CLOSED for the canvas receipt**; a captured screenshot beside the PROPOSED plate is still owed (the proof frame is transparent by design so the Founder's screen never changes).

### §4 ledger — runtime columns MEASURED on serving glass (13:12–13:35 CDT, `17c32dc`)
Method: Founder's chart tab visible; one transparent click-through 1440×900 frame per switch, `/charts?symbol=NQ1!&tf=5m&scene=clean&on=<token>`, main-canvas receipts diffed against a clean baseline (82 receipt keys) after 22 s. First-receipt time = first moment the canvas published receipts. Tape backfill on every load: tastytrade time-and-sales, ~1,000 prints (a few minutes of NQ). Nine switches loaded while the Founder had the tab hidden → **NOT MEASURED** (no paint loop), to be re-run.

| Switch | First receipt | What the canvas states | Class |
|---|---|---|---|
| AnatomyCards | 4.6 s | `anatomyCards=AT_REST`, `absorptionZones=0` | NO QUALIFYING EVENT on this window (not a defect) |
| BrickWalls | 6.0 s | `brickWalls=ON:4`; `optionsOiWalls=CALL_OI@31250\|CALL_OI@31300\|PUT_OI@31250\|PUT_OI@31275\|PUT_OI@31300` (NQ futures options, tastytrade); masonry + cracks painted | PROVED |
| ClarityCandle | 4.6 s | `DRAWN:108bars:0gaps:0open`, 6 notable, callout pinned | PROVED (full history, not newest-only) |
| CompositeProfile | 4.5 s | `DRAWN`, 94 rows, 5 sessions on screen, sediment geometry | PROVED |
| Contradiction | 3.0 s | `NOT_ENOUGH:1/0`, chip | NO QUALIFYING EVENT (named) |
| DeltaDivergence | 4.5 s | `DRAWN`, lean UP, tag clear | PROVED |
| DeltaLevels | 4.5 s | `DRAWN`, 5 rungs, left edge | PROVED |
| DerivativesPressure | 4.5 s | `DAMPING 0.85`, zero-gamma `NONE` in ±20 %, walls 31250 / 31275 BREAKING, field 161 bands, envelope ±314.23 | PROVED |
| EffortMark | 4.5 s | `HIGH_EFFORT_WEAK_RESULT` below | PROVED |
| ExpectedEnvelope | 3.1 s | fan 276 steps, 112 in view; clipped top 79 / bottom 83 of 112 | PROVED · **CLIPPED_OR_HIDDEN** (most of the fan is off-camera at this zoom) |
| FlowCurrent | 4.5 s | `BARS:2\|LIVE\|SHOWN:0` | **COVERAGE_GAP** — signed tape covers ~2 bars (1,000-print backfill); historical bars have no tape to carry the invention |
| MemoryGhost | 4.5 s | `DRAWN:0.94` over 4,943 bars; clipped top 11/20 | PROVED · partially CLIPPED |
| MtfAncestry | 4.5 s | shelf PDH 31282.5 · 4H band · 1H node 31276.66 | PROVED |
| ProfileDna | 4.5 s | `MEASURED:ALONE`, shape P | PROVED |
| ProfileFusion | 4.5 s | `FEWER_THAN_TWO_SPECIES` | NO QUALIFYING EVENT (fusion needs two profiles — correct silence) |
| ProfileMemory | 4.5 s | `DRAWN`, 4/15 shown, 11 withheld (budget), 5 sessions | PROVED (withholding counted on the glass) |
| QuestionLens | 4.5 s | `ABSORPTION:4`, band + tags + effort columns, callout `NO_CONVINCING_DISPLACEMENT` | PROVED |
| RegimeLighting | 4.5 s | `RANGE / COMPRESSION`, field + channel + magnets lit, 107 candles kept | PROVED |
| RiskOnPrice | 3.1 s | `NO_POSITION_DRAWN` | NO QUALIFYING EVENT (no position) |
| Scaffolding | 4.5 s | no layer receipt changed | NOT A VALID TEST — scaffolding takes `scaff:<DEPTH>`, not a boolean token; re-run |
| StructureProfile | 3.1 s | `DRAWN`, form `RULE_SHORT_LEG` (8-bar leg too short for rows) | PROVED (named short-leg form) |
| ImbalanceStack · LiquidityLifecycle · LiquidityWeather · LivingProfile · MarketStructure · TpoProfile · ValueCandle · ValueMigration · VisibleRangeProfile | — | tab hidden during these loads | **NOT MEASURED** — re-run on visible glass |

Defects found by the sweep: **FlowCurrent COVERAGE_GAP** (tape depth, not renderer) and **ExpectedEnvelope / MemoryGhost clipping** at the default camera. "Paint skipped by budget" in receipts counts skipped FRAMES at the 33 ms governor cadence, not suppressed layers — not a truth suppression.

## Afternoon additions (13:35–14:27 CDT)
- **Shared TAPE COVERAGE boundary** `4fc0435`: every tape sense (footprints, big-trade bubbles, flow current) — where signed tape begins on camera the glass says `SIGNED TAPE FROM <time> — earlier bars carry none`, receipt `data-tape-coverage`. This answers the Oct 5 10:44 recording: newest-only bubbles are a tape-depth boundary (≈1,000 backfilled prints), now stated; not a renderer defect. Glass proof pending (watcher was cleared when the Founder navigated the tab).
- **Expected Envelope** `982b138`: caption adds "reaches past this view ↕" when most of the fan is off-camera.
- **Backtest** `7288c02`: stops/targets gapped through fill at the bar's open; every result prints its declared model (next-bar-open entry, no commissions/fees/slippage modelled).
- **Personal Edge recency** `d840ea7`: contexts carry first/last decision dates; the edge chip prints "last <date>".
- **Remaining glass rows** (9 switches + tape coverage + `scaff:MID` + envelope caption): NOT MEASURED — the tab was hidden 13:35–14:20, then the Founder took it (focused) at ~14:25; proofs are never run in a tab the Founder is using.

## ATHOS 8-hour shift (18:06 → 02:06 CDT) — 30-switch census COMPLETE on serving glass
Channel: the connected Chrome extension's own tab group (never the Founder's tab), visibility shim (document reported visible, animation frames on a 16 ms timer), `/charts?symbol=NQ1!&tf=5m&scene=clean&on=<token>`, canvas receipts diffed against a clean baseline, screenshots captured. Serving builds `05fe7b9` → `288fd7a`.

| Switch (previously unmeasured or invalid) | Result | Class |
|---|---|---|
| ImbalanceStack | `RUNS:1–2 · BARS:5`, held stack drawn, tag 1-SIDED, tape boundary `STARTS_IN_VIEW` | PROVED · tape-limited, now disclosed (`288fd7a`) |
| LiquidityLifecycle | 6 pools (TOUCHED / PERSISTED / CONSUMED), basis `CANDLE_ESTIMATED`, PULLED refused `DEPTH:no-book` | PROVED (estimate labelled; depth absence named) |
| LiquidityWeather | drawn, storm LIVE, lens `PARTIAL`, stage THINNING | PROVED |
| LivingProfile | drawn, TRADE_BASED, 50 bars, VAH + VAL, POC trail 19 | PROVED |
| MarketStructure | drawn, 11 path segments, 12 pivots, labels 9/12, levels L 31325.50 / H 31385.25 | PROVED |
| TpoProfile | drawn, 94 rows, 12 blocks | PROVED |
| ValueCandle | `GLASS_PER_BAR:4`, tape boundary `STARTS_IN_VIEW` | PROVED · tape-limited, now disclosed |
| ValueMigration | drawn, 20 sessions | PROVED |
| VisibleRangeProfile | drawn, 86 rows over 151 bars, POC 31220 | PROVED |
| FlowCurrent (retest) | boundary drawn "SIGNED TAPE FROM 03:20 PM CDT — earlier bars carry none", `tapeCoverage FROM … SIDED_BARS:5 STARTS_IN_VIEW` | PROVED (coverage disclosure) |
| fp:big-trades (retest) | 23 individual-execution bubbles, 0 overlaps, boundary present | PROVED |
| Scaffolding (`scaff:FOUNDATION` — the earlier `Scaffolding` and `scaff:MID` tokens were invalid) | `FOUNDATION:CLEAR`, card FULL docked, 2 swing marks, 0 candle hits | PROVED |
| ExpectedEnvelope (retest) | fan 26/26 in-view columns above the camera → caption "reaches past this view" | PROVED (offscreen explained) |

With the 21 rows measured earlier (13:12 CDT), every one of the 30 chart switches now has a serving-glass receipt; screenshots for the tape boundary, Living Profile, Visible Range and Scaffolding were captured from the extension tab.

## ATHOS 8-hour shift — build log (18:06 → 19:30 CDT)
| Build | Commit | Proof |
|---|---|---|
| P0.3 live trading starts DISARMED; unset ceilings refuse (shares / contracts / premium + limit) | `e2d7851` | guardrails.test (source); Settings copy says ceilings are required. **Founder note: if your stored settings are armed with blank ceilings, live orders now refuse until the three ceilings are set.** |
| Journal unpriceable message is a refusal, not a promise | `193e5bb` | journal tests |
| Paper freshness shield (plate 12) | — | already enforced: only `actionablePaperQuotePrice` can authorise a fill; stale stays visible as STALE — CLOSED in source |
| Pricing page Free / $10 / $20 / $50 (one charge, never stacked; paid "not on sale yet") | `71f00a2` | serving, signed out, 390 + 1440: renders, 0 errors, no overflow; screenshot sent |
| Risk + market-data disclosures, Policies index (Terms/Privacy "not yet in effect"), links from sign-in | `71f00a2` | serving, signed out |
| 16 PROPOSED plates versioned (`docs/canon/proposed-garden18/`), Drive canon PROPOSED folder + INDEX doc | `05fe7b9` | Drive folder `177kSuU_HAwnUTc6ki5KV0ymvYEXQW1Ni` |
| 30-switch census complete; tape boundary for Imbalance Stack + Value Candle | `288fd7a` | serving glass (extension tab + shim) |
| SpaidBot: 45 s idle timeout, split-frame buffering, empty-answer and not-configured words | `3ae6023` | live: 200, streamed answer in ~14 s |
| Tools search finds SpaidBot (SpadeBot / AI / chat / assistant) | `029c480` | inventionCensus.test |
| ON AIR / OFF AIR from LiveKit publisher counts (WM TV + Lounge) | `52d3453` | live: 8 registered rooms, 0 publishers → OFF AIR |
| Mode read-back names posture (button word + deck word), not the market's verdict | `2c41d7d` | experience tests |
| Paper ticket keeps a working height on short windows | `cd4e42c` | live 1920×784: ticket 1,334 px, page scrolls (was boxed at 343 px) |
| Guest first session `/welcome` (simulated, labelled, no API data) + guest door on sign-in | `e93e666`, `17cbfb1` | serving, signed out, 390 + 1440: SIMULATED label, POC computed, 0 errors; profile in its own lane |
| §6 index→futures mapping (NDX→NQ, SPX→ES, micros) through a same-time basis, both levels named, dotted "MAPPED" ticks | `411cf45` | **live glass** (NQ 5m, extension tab): `IDXMAP:NDX->NQ|BASIS:257.06±12.25@1791231299` (= 16:14:59 ET, the index's own last trade); 6 walls mapped e.g. `31325→31582`, `29200→29457`; fixtures pin EDT/EST, containing-bar rule, refusals |
| P0.7 Supabase anon-key probe (read-only, `limit=1`, no writes) | — | **PARTIAL**: `dreamboard_passport_audit_events`, `wm_market_coverage_checkpoints`, `wm_market_coverage_first_seen` → 401 permission denied (locked); `lounge_*` and `dreamboard_growth_entries` → 200 with 0 rows, but the Founder's own counts are 0 too, so RLS on them is UNPROVEN until a test account holds rows; `radio_tracks` → public listing (intended) |
| P0.1 core-team badge proven by verified email only (a claimable handle like "@petey" wore the verified shield + "Unlimited Access" crown) | `5b1df1d` | coreTeam.test; Founder's email is on the list, his badge unchanged |

## ATHOS 8-hour shift — build log (19:30 → 20:30 CDT)
| Build | Commit | Proof |
|---|---|---|
| **Signed history beyond the 1,000-print cap.** tastytrade candles now carry each bar's `bidVolume` / `askVolume` (probe on the owner socket: `/NQZ26:XCME{=5m}` 880 + 952 = 1,832 = volume). Flow Current uses prints where they exist, the candle's own sides elsewhere; receipt counts each source | `cf62ecd` | **live glass NQ 5m**: `flowCurrentCoverage … BARS:200 … TAPE:4 · CANDLE_SIDES:196` (was 4 bars / COVERAGE_GAP); `tapeCoverage CANDLE_SIDES_COVER`; the boundary line now speaks only for per-price senses ("PRINT TAPE FROM … — earlier bars: bar totals only"). FlowCurrent COVERAGE_GAP → **CLOSED** |
| Inspect Delta / Imbalance on an old bar from the provider's bar sides, basis says BAR-LEVEL; no footprint door (no price levels) | `1dddfc6` | live glass: 12:40 CDT bar — was `Delta UNREAD`, now `Delta +799 · Imbalance 1.4:1 buy` (Volume 4,393) |
| Candle anatomy PRESSURE SPLIT on old bars from the same bar sides, tagged "bar sides (provider)" | `b34a2c6` | live glass: same bar `SPLIT:59:BAR_SIDES` → "SELL 41% · BUY 59%" (agrees with Inspect) |
| OI ticks + NDX/SPX mapped ticks share one label placer: dark backing, row-stepping with a leader, never over a sibling | `759b768`, `91922bf` | live glass: ALL scope 5 labels / NEAREST scope 6 labels, each on its own row (`oiTickWords N:12 · STEPPED:4`) |
| §6 expiry scope on glass (was listed OPEN) — ALL / NEAREST / 0DTE in the selected wall's Inspect | existing | live glass: Nearest → `OPTEVID:NEAREST … N:16`, ticks redraw → **CLOSED** |
| P0.1 uploads: `/api/upload-track` RETIRED (no caller; service-role writes of any file into the PUBLIC radio bucket, extension + content-type from the client, no size/media check) | `0e1b6d3`, `a49641b` | serving: `POST /api/upload-track` → 404; radio uploads only via `/api/radio` signed upload URL |
| P0.1 re-check (source, on the served candidate): Lounge delete author-only (`route.ts:175`), LiveKit identity = `wm:<session sub>` and publish only for hosts, approve host-gated + registered rooms + WM identities, worker secret length-independent compare | — | CLOSED in source (no change needed) |
| P0.2 sweep: `Math.random` on consumer surfaces | — | none feeds a displayed number (sound synthesis, TV game, injectable shuffle only) |
| §11.3 Decision → Journal → Review loop | — | **PARTIAL** — source-tested (`growthTabIntegration.test`, decision lifecycle tests); a live run would write decisions into the Founder's account, so it waits for a test account (BLOCKED on the guest/test account) |

## ATHOS 8-hour shift — build log (20:30 → 21:00 CDT)
| Build | Commit | Proof |
|---|---|---|
| **Tape CVD across the whole history** — closed bars by the provider's bar sides, the newest side-bearing bar and later by the signed tape; hand-over bar PARTIAL unless the tape held prints from before it opened | `d796a3d` | live glass NQ 5m (`ind=Tape CVD`, nothing persisted): `cvdSource BAR_SIDES:4894+TAPE`, 4,895 bars, caption "CVD · bar sides (provider) since Sep 9, 07:50 PM · signed tape from Oct 5, 08:35 PM" (was: since ~minutes ago) |
| §11.4 in-app symbol switch NQ1! → ES1! (quick access) | — | live glass: header 7,833.00 on ES scale, CVD rebuilt for ES (`BAR_SIDES:4974+TAPE`), no NQ value left on the glass; `wm_last_symbol` stayed `NQ1!` (proof scene writes nothing). Note: the pick's route push drops `scene=` from the URL (operator-only effect; nothing written) |
| §5 focus returns to the opener on close (every Escape-closable popover) incl. a toggle that unmounts while its popover is open | `17e120f`, `d8ebbf6`, `55fff49` | live glass: Inspect opened from its toggle, Escape → focus on "Open the inspect ticket for the bar under the cursor" (the proof window has no OS focus, so the focusin a focused window fires was supplied; without it focus stays on body — channel limit, not product) |
| §4 Workspace / Tools panels on this candidate | — | live glass 1,568×784: Workspace 689 px (87→776), own scroll 687/1,165; Tools 689 px, own scroll 687/901; close control first in each; Escape closes both → **CLOSED** |
| Inspect Escape (listed OPEN at line 53) | existing | `ChartInspectTicket.tsx:934` `useEscapeToClose` — **CLOSED** |

## ATHOS 8-hour shift — 21:00 → (batch held while the Founder trades)
| Build | Commit | Proof |
|---|---|---|
| **Candle countdown independent of the chart** — header glyph + price-line pill written 4×/s from the wall clock through `chartBarCountdown`, no MainChart re-render in between (Founder, mid-trade: "the seconds aren't moving") | `a48f2af` | serving: `LIVE_BAR` glyph advanced every read; Founder confirmed "moving now". Deploy cadence itself was a cause (each push reloads open tabs) — deploys now batched / held while trading |
| **§6 Options Flow (PROPOSED P-03)** — large futures-option prints on price under Brick Walls: owner's tastytrade TimeAndSale on the ~160 contracts already streamed for OI (same socket, `tape=true`) + 6 h history (one short-lived connection, multi-symbol). Qualifying ≥ max(5, 3× median once 20 heard); side = exchange aggressor (solid ring) or ASK/BID-NEAR inferred (dashed ring); open/close always unknown; MULTI-LEG? flag; premium only as an estimate with the chain multiplier. Receipt `optionFlow OPTFLOW:HEARD…|MIN…|EVENTS…|STAMPED…|SHOWN…` | pending batch | source probe (owner socket, read-only): 308 prints across 120 near-money NQ options in 6 h, aggressor stamped (`BUY`/`SELL`); selector tests (qualifying, side, dedupe, premium, multi-leg). Glass proof after the batch deploys. Item 6 "big-option-flow prints" moves UNSUPPORTED → BUILT (futures, owner session); equity/index option flow stays UNSUPPORTED (Cboe delayed has no prints) |

## ATHOS — extended to 06:00 CDT (01:23 → 02:10)
| Build | Commit | Proof |
|---|---|---|
| Options Flow live on futures | `ddb5efe` | serving NQ 5m: `OPTFLOW:HEARD:344|MIN:5|EVENTS:33|STAMPED:33|SHOWN:12`; labels "C31400 ×21 BUY ~$28k", "P31350 ×65 SELL ~$125k" |
| Hover ticket (P-03 "selected flow") above-left of the mark; whole-number strikes | `a93b894`, `0ce4bbd` | serving: "./NQZ6 Q1BV6 261006P31360 · exp 2026-10-06 / 7 contracts @ 104.5 · ~$14,630 premium est. · 21:46:57 ET / PUT SELL · open/close unknown" (104.5 × 7 × 20 ✓) |
| ES overnight: provider reports 0 OI on every ES weekly near the money → walls refuse with that reason; Options Flow paints without OI | `8758243` | serving ES 5m: "no option positioning for ES1! (provider reports zero oi:1/160)"; `OPTFLOW:HEARD:622|EVENTS:40|STAMPED:38` |
| Options Flow for stocks / ETFs / indexes (tastytrade equity chain) on a PRINTS-ONLY subscription (no Quote/Greeks streams for flow contracts) | `851b802` | serving SPY 5m: `OPTFLOW:HEARD:19,969|EVENTS:40|STAMPED:40`, paint mean 4.7 ms / longest 19 ms (budget 50) |
| Largest-first budget, 20k-print history, keyed multi-leg (20k compile ≈ 8 ms), coverage caption, labels after marks | `ce2c912`, `e791a6a` | serving SPY: "OPTIONS FLOW · 40 largest of 19,969 prints · heard from 08:30 AM CDT · ≥5 contracts" |
| §4 Research / Copy Trading / Proof Lane surfaces | — | serving text: Research "No saved heat yet" + live-map link + browser-local disclosure; Copy Trading "REQUIREMENTS UNMET · 1 of 4 … measured, not assumed", no invented traders; Proof Lane THEORETICAL / "ENROLLMENT NOT CONNECTED · LIVE EXECUTION EXCLUDED" → **CLOSED** (note: Proof Lane "LAUNCH PROTOCOL — WEEK OF 2026-08-24" is a stale dated phrase — Founder wording call) |
| Cross-tab tape dedupe (old memory item) | existing | `useWebSocket.ts createTapeHub`: Web Lock leader + BroadcastChannel, 6 s silent-leader fallback → **CLOSED** |
| **P0-A deploy-version recovery — live proof** | `d73c167` | serving 02:04 CDT: a tab loaded on `e791a6a` (marked in memory) stayed on the old build through the deploy of `d73c167` (no forced reload); an in-app link from it (→ /desk) did a full document load onto `d73c167`, no error page, no recovery reload needed → **CLOSED** |
| §11.7 replay: an Options Flow print after the last bar's own interval is never pinned to the last (replayed) bar | pending | source guard in the flow paint; prints before the replay clock remain lawful |
| Options Flow at phone width (390 px iframe probe, owner session) | `6e15cea` | `OPTFLOW:…|SHOWN:3`, one label, scrollWidth 390 (no overflow); the coverage caption folds into "1 SENSE SILENT — TOOLS › ACTIVE" per the narrow-glass word budget. Desktop NQ: 1,106 prints from 06:17 AM, 40 largest, all stamped |
| OI tick / mapped labels print whole strikes without ".00" | pending | — |
| Tools search: "options flow" / "unusual options" / "open interest" → Brick Walls (aliases + the switch's description names its options lanes) | `124ff96` | serving: typing "options flow" in Tools lists Brick Walls with "…and Options Flow — the largest option prints on price (your tastytrade session)" |
| §7 ledger truth: tastytrade LIVE_PRINTS names option prints + candle bid/ask history; DEPTH NOT_BUILT → UNSUPPORTED (probe: PriceLevel "not available", Order internal error) | `6e15cea` | read-only DXLink probe on the owner socket |
| P0.1 rate limits on the owner's tastytrade READ routes (240/min per user per route; order routes untouched) | `22de511` | serving full NQ load (Brick Walls + Flow Current + CVD + Options Flow): chain ×2, quote-token ×1 — far below the ceiling; every lane drew |
| Worst-case stress (20 layers + big trades + Tape CVD on NQ 5m) | — | paint mean 22.7 ms vs 33 ms budget; 11 of 95 frames over budget in a later window; occasional single frame ~300 ms — per-layer profile follows |

### Per-layer paint profile (serving NQ 5m, each layer alone, ~25 s, extension tab) — Founder: "don't let everything on the chart mess with the candle smoothness"
Paint mean / longest ms (frames over budget): none 3.4/6.6 · Brick Walls 5.6/7.9 · Flow Current 11.5/14.9 · Imbalance Stack 8.3/15.3 · Value Candle 4.9/14.1 · Living Profile 11.5/19.5 · TPO 7.1/15.2 · Structure 5.6/11.5 · Weather 9.5/11.4 · Lifecycle 6.6/11.6 · Derivatives Pressure 6.1/14.6 · Question Lens 5.5/8.4 · Composite 6.2/9.2 · Profile Memory 5.7/10.3 · Visible Range 6.5/11.2 · Big Trades 4.8/5.7 · Memory Ghost 9.5/17 · Regime 9.1/16.5 · Delta Levels+Divergence+Effort 7/13.4 · **Expected Envelope 25.2/42.3 (6 of 22 over)**.
| Fix | Commit | Proof |
|---|---|---|
| `etParts` memoized — Intl date formatting was 11 of 12.8 ms the Envelope spent on every live tick | `96d68f1` | Envelope alone 25.2 → **12.3 ms mean, 0 of 21 over**; 20-layer stress steady state mean 21.6 ms, longest 58 ms, 7 of 45 over (one 282 ms frame at load only). Candles are drawn by the chart library independently of this overlay (governed to 30 fps) |
| §5 a11y sweep (owner session, serving): visible controls with no accessible name | — | /charts 45 · /settings 53 · /tv 42 · /radio 45 controls, and /command-deck /journal /desk /paper /scanner /news /education /lounge /profile — **0 unnamed** on every route; pointer-cursor elements not keyboard-reachable on /charts: 0 (only native `<summary>`) → **CLOSED** for names + keyboard reach (screen-reader walkthrough not run) |
| Options Flow: dxFeed `type` + `spreadLeg` on every TimeAndSale (live + history) — CORRECTION replaces, CANCEL removes, spread leg = MULTI-LEG | `975b8fb` | owner-socket COMPACT probe: FEED_CONFIG accepts all 12 fields, rows `…, true, "NEW", false` aligned; serving NQ 1m after deploy: tape backfill 1,000 prints, Flow Current TAPE 9 + CANDLE_SIDES 191, Options Flow 1,059 heard, 0 layer faults. Known limit: the futures footprint tape does not un-fold a later CANCEL (rare; none seen in 1,482 overnight prints) |
| Options Flow ranks by money (premium estimate, else price × size), not contract count; caption says "largest by premium" | pending | selector test: 10 lots @ 100 outrank 100 lots @ 0.05 |

## P0.2 "today" on the exchange's day boundary (03:20 → 04:05 CDT)
Found on serving SPY at 04:22 ET (premarket): "+6.76 (+0.88%) today" — measured from Friday's close; the REST vendor's change still spanned the session that had ended. tastytrade's Summary (dxFeed, dayId-rolled) held Monday's close 774.83.
| Build | Commit | Proof |
|---|---|---|
| Chart: tastytrade Summary `prevDayClosePrice` is the reference close; REST cannot overwrite it | `168b1c8` | serving /charts SPY: 776.18 **+1.35 (+0.17%)** (= − 774.83) |
| Tape / watchlist / scanner prefer the exchange's close, even while a row's live price is not fresh | `f006acf`, `571cdd9` | scanner test (vendor +0.85% → exchange +0.17%) |
| A second consumer of an already-streamed symbol reads the stream's held Summary (dxFeed sends it once) | `3030ccb` | serving /desk after a poll: SPY **+1.60 (+0.21%)**, TSLA corrected +10.39 → +2.49 |
| The reference close republishes the displayed change the moment it arrives | `1ced614` (served via `699fda9` after a stuck Cloudflare build) | serving /desk on first read: TSLA **+2.27 (+0.60%)** (vendor had +2.80%), NQ +76.00 (+0.24%) |

## FINAL SHERIFF RECEIPT — ATHOS super finish-line order (shift 18:06 Oct 5 → 06:00 Oct 6 CDT)
Vocabulary: CLOSED (evidenced) · OPEN · BLOCKED · UNSUPPORTED · NOT ENTITLED · PARTIAL · DEFERRED. Supersedes the 12:55 status table above.

| Capability / gate | Verdict | Evidence / blocker |
|---|---|---|
| P0.1 release identity (SHA → build → domain → browser) | CLOSED | build-identity per deploy; old-tab skew proof `d73c167` |
| P0.1 identity / impersonation (core-team badge by verified email only; handle checks) | CLOSED | `5b1df1d`, coreTeam.test |
| P0.1 Lounge edit/delete author-only; LiveKit identity = session, publish host-only; approve host-gated | CLOSED (source, served candidate) | route reads + tests |
| P0.1 uploads | CLOSED | `/api/upload-track` retired (404 serving); Radio = signed upload URL + served-type check |
| P0.1 rate limits on broker read routes | CLOSED | `22de511` (240/min/user/route); order routes untouched (live-order rule) |
| P0.1 constant-time secret compares | CLOSED | worker secret compare length-independent |
| P0.1 Account A/B isolation attack test | BLOCKED | needs a second (test) account |
| P0.2 truthful numbers — candle-side signed history labelled; empty book "—"; no `Math.random` in readings | CLOSED | `cf62ecd`, `1dddfc6`, `b34a2c6`, `d796a3d`; sweep |
| P0.2 "today" change on the exchange's day boundary | CLOSED | chart + desk + instant republish proved (section above) |
| P0.2 eligible-series coverage stated (tape boundary, flow coverage caption) | CLOSED | `288fd7a`, `e791a6a` |
| P0.3 live orders start DISARMED; unset ceilings refuse | CLOSED (source) | `e2d7851` |
| P0.3 live-order capital certification | BLOCKED | Founder permission rule |
| P0.4 guest landing / pricing / legal pages public; guest door | CLOSED | `71f00a2`, `e93e666` |
| P0.4 auth email journey (signup → inbox → confirm → reset) | BLOCKED | controlled mailbox + guest account |
| P0.4 Terms / Privacy in effect | BLOCKED | legal entity facts (Founder / counsel) |
| P0.5 billing (Stripe tiers, entitlement seam) | DEFERRED | Founder scope decision; Stripe test mode only; pricing page says "not on sale yet" |
| P0.6 provider truth (capability ledger) | CLOSED | `6e15cea` (depth UNSUPPORTED on this DXLink session; prints/history named) |
| P0.7 Supabase RLS | PARTIAL | locked tables 401 (anon); lounge/dreamboard unproven until a test account holds rows; radio bucket policy BLOCKED (dashboard) |
| P0.8 LiveKit ON AIR from publishers | CLOSED | `52d3453` (8 rooms, 0 publishers → OFF AIR) |
| §4 30-switch census on serving glass | CLOSED | census tables above |
| §4 Workspace / Tools full height, own scroll, Escape, focus return | CLOSED | 689 px panels; focus-return `55fff49` |
| §4 a11y names + keyboard reach (13 routes) | CLOSED | 0 unnamed controls |
| §4 Research / Copy Trading / Proof Lane / Backtest truth | CLOSED | serving text |
| §4 Decision → Journal → Review loop live | PARTIAL / BLOCKED | source-tested; live run needs a test account (no writes to the Founder's data) |
| §5 PROPOSED plates 13–16 + 12 supplied | PROPOSED | Drive folder + repo; Founder canon acceptance |
| §6 index → futures mapping (same-time basis) | CLOSED | `411cf45` live NQ |
| §6 expiry scope on glass | CLOSED | NEAREST proof |
| §6 Options Flow (big option prints) — futures, ES, stocks/ETFs/indexes, BTC/ETH (Deribit public, `f63e7d6`: 1,000 trades, 40 stamped, "P86000 ×90 BUY ~$407k") | CLOSED | `ddb5efe` → `5511bbc`: exchange-stamped sides, corrections/cancels, spread legs, coverage caption, hover ticket, premium ranking, phone width |
| §6 net premium flow / opening-closing / participant tags | UNSUPPORTED / NOT ENTITLED | no source field (open/close always "unknown") |
| §6 carry | UNSUPPORTED | no lawful source wired |
| §7 NinjaTrader API | BLOCKED | Tradovate API access (Founder) |
| §7 tastytrade depth | UNSUPPORTED | probe: not served on this session |
| §8 SpaidBot works or clearly fails; Tools search finds it | CLOSED | `3ae6023`, `029c480` |
| §9 pricing page (Founder prices, no stacking) | CLOSED | `71f00a2` |
| §11.4 symbol switch, no stale price | CLOSED | NQ → ES proof |
| §11.5 sandbox execution journey | BLOCKED | sandbox / test broker environment |
| §11.6 tier journeys | DEFERRED | billing |
| §11.7 replay has no future data (pressure + Options Flow) | CLOSED | AFTER_REPLAY_CLOCK + flow guard `f6c4100` |
| §11.8 old frontend chunk recovery | CLOSED | `d73c167` old-tab proof |
| Candle smoothness (Founder, mid-shift) | CLOSED | countdown independent of chart `a48f2af`; Envelope 25 → 12 ms `96d68f1`; per-layer profile; deploys held while trading |

### §11.1 guest denial — measured on serving, signed out (04:15 CDT)
GET 401: tastytrade positions / accounts / quote-token / chain / ledger, Webull positions, Deribit option trades, Cboe options, LiveKit token + on-air, decision-position, Lounge, Radio. POST 401: SpaidBot, welcome email, tastytrade order-submit + order-dry-run, Lounge, decision-position. Public: `/api/build-identity` 200, `/welcome` + `/pricing` + `/legal/*` render signed out. → **CLOSED** for guest denial (the auth email journey stays BLOCKED on the controlled mailbox).

### 04:15 → 04:30 CDT
| Build | Commit | Proof |
|---|---|---|
| Crypto's change reads "24h", never "today" (rolling 24-hour venue figure); never "last session" | `02a187c` | serving BTC-USD: "DAY BIAS SIDE · +0.24% 24h" |
| Tape CVD updates only its tail when every earlier step is unchanged (thousands of candle-side steps, refilled up to 4×/s) | `ac8bfb2` | serving NQ 1m: `BAR_SIDES:2065+TAPE`, 2,067 → 2,068 steps across a minute boundary, 0 faults |
| Regression pass (Brick Walls + Flow Current + Envelope + Tape CVD) | — | ES: 0 faults, flow 6,120 heard / 40 stamped, CVD 4,979, Flow Current 150/152 from candle sides, paint 11.6 ms · AAPL: 0 faults, flow 19,929 heard, CVD 3,060, paint 15.3 ms · ETH: Deribit flow 1,000 heard, MIN 9, 40 stamped |
| Per-bar delta row (F13, NEAR) prints older bars from the provider's bid/ask; tag "Δ · older bars: provider bid / ask" | `eeba23a` | serving NQ 5m `bars=18`: 18 printed, `nearBarDeltaBasis PROVIDER|BAR_SIDES:14` |
| Founder's saved chart regression (no proof scene, his stored layers; read-only) | — | /MNQ 1h: 0 layer faults, 0 console errors, paint mean 17.1 ms / longest 34.4 ms, 0 of 29 frames over budget, countdown advancing |
| §11.2 tool state through an in-app timeframe switch (5m → 15m) | — | Brick Walls ON:4 kept, Options Flow re-anchored to 15m bars, Flow Current reloaded candle sides (166/168), scene kept in URL, 0 faults, stored last symbol untouched → **CLOSED** for this path |
| Phone audit of the public surface (375 px, serving, Playwright on installed Chrome) — tap floor 44 × 44 | `9a26ffa` | before: /pricing 4, /legal/risk 6, /legal/market-data 5, /welcome 9, /login 2 under-44 taps; after: **0 offenders, 0 under-44 taps** on /login, /pricing, /legal, /legal/risk, /legal/market-data, /welcome (audit now covers /legal) |
| P0.6 Financials (AAPL) | — | serving: tastytrade market metrics + SEC EDGAR quarterly results "as filed", derived Q4 marked DERIVED, source line names EDGAR → CLOSED |
| /welcome step groups on phone ("2 · View" on its own row) | `3304071` | Playwright 390 px screenshot, scrollWidth 390; iPad 834 audit 0 offenders / 0 under-44 taps on all 8 public routes |
| Options Flow on an INDEX (SPX — the plate's own example) | — | serving SPX 5m: tastytrade chain roots SPXW + SPX, `OPTFLOW:HEARD:15,072|EVENTS:40|STAMPED:40`, 0 faults |
| Options Flow on touch: a tap pins the mark's ticket, a second tap releases | `a84a2d4` | serving NQ 5m, pointer events at the published hit point (`optionFlowHitAt`): `PINNED:./NQZ6 Q1BV6 261006P31350` → second tap releases → third pins again |
| Crypto chip names its window: "24H BIAS … 24h" (stocks / futures keep DAY BIAS) | `3d6195a` | serving BTC-USD: "24H BIAS SIDE · +0.37% 24h" |

| Options Flow on gold (GC) | — | serving GC 5m: 897 prints, 39 of 40 exchange-stamped, "C4170 ×15 BUY ~$183k" (multiplier 100 ✓) |
| Crypto chip's spoken label names the rolling 24-hour window | pending | selectRegimeBadge tests |

**Last build 05:25 CDT; the order ran to 06:00.** Production at the receipt's commit; every build above passed the full gate (tsc + 15,460 tests) and was proved on serving glass in the extension tab (never the Founder's tab). Deploys were held while the Founder traded (21:00 → 01:23).
