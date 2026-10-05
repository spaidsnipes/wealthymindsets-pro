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
| Live prints (tape) | yes | yes (`lib/marketData/adapters/tastytradeFuturesTicks.ts`) | — | — | PARTIAL — futures signed by the venue; stock sides INFERRED (Lee–Ready); history capped near 1,000 prints |
| Book depth | yes | no | — | — | NOT_BUILT — no order book wired from tastytrade |
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
