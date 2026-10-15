# FOUNDER VERIFICATION REPORT — Garden 19 finish-line order

Standing report for the Founder's "EMERGENCY FOUNDER FINISH-LINE CONSTITUTION". Rewritten in place at the end of each shift; never a build log. Every claim names the production build, the URL, the time and the evidence. What was not read on serving is written NOT READ. What is the Founder's to decide is written FOUNDER DECISION.

Law (order §0): CODE EXISTS ≠ FEATURE WORKS · MENU ≠ INVENTION · DATA ≠ GEOMETRY · GEOMETRY ≠ VISIBLE · SCREENSHOT ≠ LIVE BEHAVIOUR · DEPLOYED ≠ VERIFIED · VERIFIED ONCE ≠ REGRESSION PROTECTED.

Proof files (screenshots, receipts, timelines) are in `~/wm-held/proof/` (held outside this public repository); the generated invention ledger is `docs/operations/INVENTION_LEDGER.md` (`node scripts/invention-ledger.mjs`).

_Shift 2026-10-15 09:35 → 14:35 CDT. Environment: https://wealthymindsetspro.com (Cloudflare Workers Builds, main). Reads taken in the desktop app's own browser pane, signed in as the owner, 800×600 and the phone preset, during regular trading hours._

## 1. What was actually fixed (serving, with evidence)

| Item | Build | Evidence (URL · time CDT · receipt) |
|---|---|---|
| **Brick Walls disappeared (regression)** | `4b0b865` | Root cause: a wall was only ever built from a strike whose NET exposure was positive (call-dominant); a put-dominant strike was a "pocket", and pockets are withheld on a near-money subset — on a put-heavy chain (NQ1! 09:40: ratio −0.71, 81 contracts, 6 open-interest levels at price) `WALLS:NONE` → `ON:NO_CURRENT_WALL_EVENT`. Reproduced on the AMPLIFYING lens fixture. Fix: a wall is a concentration of GROSS exposure whatever its sign; `polarity` CALL_HEAVY/PUT_HEAVY; put-heavy bricks fired darker/redder; glass and Inspect say "PUT WALL 29950 · BROKEN ×1". **Serving read 10:01:45:** `/charts?symbol=NQ1!&tf=5m&scene=clean&on=BrickWalls` → `brickWalls ON:4`, `brickWallsAt 29900:198|29910:190|29950:156|29975:136`, ink 584/419/268/275 lit px at the wall rows, masonry with cracks on the glass. |
| Brick Walls regression scenario (order §2) | `4b0b865` | 10:02–10:03, same URL family: tf 15m `ON:4` · ES1! `ON:3` · NQ1! return `ON:3` · wheel-zoom + drag-pan `ON:3` with ink 442/351/441 and price alignment kept · resize / reload / toggle / 60 s: see §1a below. Harness: `tests/brick-walls-regression.mjs` (Playwright; needs a signed-in `WM_STORAGE_STATE`; asserts painted pixels, not DOM "ON"). Fixture: `scene=lens-fixture&climate=WALLED` (one PUT wall 1% below, one CALL wall 1% above price). |
| NQ/ES index mapping (owed RTH read) | `8202b5b` (10-12) | 09:40 NQ1!: `IDXMAP:NDX->NQ|BASIS:211.92±59.00|N:6`, six NDX levels carried onto NQ with "MAPPED" words. WORKS in RTH. |
| Gamma heatmap invisible as a "film" | `09047f2` | AAPL 5m 09:52: `gammaHeatmap ON:PARTIAL:POS2:NEG0` painted, yet one uniform blue film over the whole plot (overlay rows rgb 87,137,187 α≈0.14) because the $5 strike buckets exceed a $4.5 viewport — no edge, no word, reads as nothing. Fix: a GAMMA LADDER per band on camera (left-edge column, sign colour, intensity, strike ticks) + words "+GEX 345–350 · 78% · NEAR-MONEY" through the one placer. Serving read: PENDING (build in flight at writing). |
| Paper masthead FEED UNKNOWN over a live BTC price | `f6c661e` (07:48) | /paper 06:44: ticket LIVE · tastytrade $81,033 while the masthead said FEED UNKNOWN · no observation yet (chart symbol BTC-USD ≠ paper's BTC; source hard-coded "yahoo"). After: LIVE — CERTIFIED QUOTE · SOURCE CERTIFIED REALTIME · ticket "LIVE · coinbase". |
| Scanner masthead POLLED/yahoo over 28 live rows; cold load blank | `82a30ac`, `f866e4c`, `59c895f` | 07:09 scanner: LIVE — CERTIFIED QUOTE, 28 signals · 28 live. Cold load: "Reading the market" held until the first live re-scan; live price read before RSI → 26 live rows at 9 s (was 30 s+). |
| Refused after-hours Alpaca asks every 10 s per tab | `0cc8eb6`, `e796181` | /desk + /watchlist: 4 × 404 per 10 s → 0 failed requests on serving (07:25). |
| Volume-profile and Big Trades paint cost | `f330dc2`, `3e9305a` | BTC-USD 15s 1440: all-frame p95 16.8 → 8.9 ms, p99 21.5 → 11.3, max 24.7 → 14.0. |

### 1a. Brick Walls regression steps (order §2), serving `4b0b865`, 10:01–10:08 CDT

| Step | Result | Receipt |
|---|---|---|
| 0 fixture / live painted | PASS | `ON:4`, ink at every wall row |
| 1 timeframe 5m → 15m | PASS | `ON:4`, same strikes, re-placed |
| 2 symbol ES1! and back | PASS | ES1! `ON:3` (7760 BORN, 7765 BORN contact HELD, 7770 BROKEN ×1); NQ1! return `ON:3` |
| 3 pan + zoom (wheel + drag) | PASS | `ON:3`, `brickWallsAt 29900:212|29950:184|30000:156`, ink 442/351/441, price-aligned |
| 4 workspace presets | NOT RUN today (the clean proof scene holds writes; presets need the member's own workspace) | — |
| 5 extra profiles + order-flow tools | PASS | all-layers read 09:58: Brick Walls `ON` beside 14 layers, p95 9.7 ms |
| 6 resize (phone preset 375×812, back to desktop) | PASS | `ON:3`, masonry on the phone screenshot |
| 7 reload | PASS | `ON:3` at 29950/30000/30050 (walls follow the live chain) |
| 8 disconnect / restore market data | NOT RUN (no sanctioned way to cut the owner's stream from the pane) | — |
| 9 toggle off / on | PASS | off: no receipt, nothing painted · on: `ON:3` |
| 10 sustained streaming 60 s | PASS | `ON:3`, ink 554/229/365, overlay 3.1 / 4.2 ms |

## 2. Performance (measured, not averaged away)

Method: every requestAnimationFrame callback's time summed per frame timestamp (patched before the document finishes loading), 1,434–1,500 frames per read, in a VISIBLE tab; the overlay's own `paintMeanMs`/`paintLongestMs` beside it. Budgets (p95): desktop ≤ 18 ms, tablet ≤ 22 ms, phone ≤ 24 ms.

| Scene (build `59c895f`) | Size | p50 | p95 | p99 | max | overlay mean / worst |
|---|---|---|---|---|---|---|
| NQ1! 5m pre-market, default | 1440×900 | 0.1 | 6.0 | 8.0 | 10.9 | — |
| NQ1! 15s pre-market | 1440×900 | 0.1 | 6.0 | 7.4 | 11.1 | — |
| ES1! 5m · TSLA 1m pre-market | 1440×900 | 0.1 | 5.0 · 5.1 | 6.5 · 5.9 | 8.6 · 7.5 | — |
| BTC-USD 15s busy tape (after `3e9305a`) | 1440×900 | 0.1 | 8.9 | 11.3 | 14.0 | 6.4 / — |
| BTC-USD 15s | 1194×834 · 834×1194 · 390×844 | 0.1 | 9.1 · 7.4 · 7.4 | 10.8 · 11.4 · 9.7 | 14.3 · 14.3 · 12.4 | — |
| **NQ1! 5m RTH, ALL 15 LAYERS ON** (Brick Walls, Derivatives Pressure, Gamma heatmap, Call/Put walls, Living, Structure, TPO, Composite, Session VP, Fixed VP, Big Trades, FVG, Weather, Market Structure) | 1440×900 | 0.1 | **9.7** | 18.8 | 20.4 | 8.2–8.6 / 15.8–17.2 |

Cold chart load (NQ1! 5m, six profiles on, visible tab): candles at 1.0 s, every profile painted at 6.5 s after navigation. Caveat for anyone measuring in the desktop app's pane: the overlay skips paints while the pane is hidden (`paintSkippedHidden`), so a hidden-pane read shows a blank chart that is not blank for a trader.

Not yet measured today: multiple charts side by side, rapid symbol/timeframe switching under CPU throttle, reconnection, extended (hours) runtime, memory growth.

## 3. Inventions verified today (serving reads)

| Invention | State on serving | Evidence |
|---|---|---|
| Brick Walls (masonry, lifecycle, polarity) | VISIBLE (NQ1!, ES1!) | §1 |
| NDX/SPX → NQ/ES mapped levels | VISIBLE (dotted, "MAPPED") | §1 |
| Call Wall / Put Wall marks | VISIBLE (SPY 767/768/769/770, AAPL) | 09:46 `wallsGammaMarks` |
| Gamma Exposure heatmap | VISIBLE on SPY (negative band 768.2–770.5, hatched; 10:08). On AAPL the $5 buckets filled the whole viewport as one film → ladder in `09047f2` | §1; settings: "High contrast" applied at once and persisted across a new page load (`…:HIGH_CONTRAST`) |
| Positive / Negative gamma regions, Gamma Flip | WITHHELD on a near-money ±4% subset (`FLIP:WITHHELD_NEAR_MONEY_SUBSET`, `gammaRegions SILENCE:PROFILE_WITHHELD`) — honest, and a FOUNDER DECISION (coverage) | 09:46 SPY, 09:52 AAPL |
| Gamma concentration levels | VISIBLE (AAPL `GAMMA_CONC_POS@345`) | 09:52 |
| Session VP (fixed + session), Living Profile, Visible Range, Structure (LEG POC), TPO letters, Composite, Profile Memory | VISIBLE (NQ1! 5m) | 09:50 screenshot; receipts `vpDrawn 2`, `livingProfile DRAWN`, `structureProfile DRAWN`, `tpoProfile DRAWN`, `compositeProfile DRAWN`, `profileMemory DRAWN` |
| Profile DNA | `MEASURED:ALONE` (needs a second profile to compare) | 09:50 |
| Profile Fusion | `DRAWN|PAIR_OBJECT:NONE` (no fusion pair on this chart) | 09:50 |
| Bid/Ask Split Profile (#11) | BUILT · DATA-LIMITED — a DRAW tool (Tools › Bid/Ask Split Profile, two clicks): the drawing is created and says "Delta+VP · no per-level tape · captured live only"; per-price bid/ask attribution exists only from tape captured since page load, so a historical range has nothing lawful to split. Also the footprint bid×ask mode on live-tape bars | 10:18 (drawing + banner), 09:52 (footprint) |
| Weather, Big Trades, FVG, Market Structure, Options Flow, Absorption shelf, Demand zone | VISIBLE in the all-layers read | 09:58 |

The generated ledger (`INVENTION_LEDGER.md`) lists all 110 census entries; those not in this table are NOT READ today.

## 3a. Chart-native trading controls (order §9), serving `4b0b865`, 10:10 CDT

`/charts?symbol=NQ1!&tf=5m&scene=ticket-fixture&side=buy&state=flat` → TRADE on the sample book ("PROOF SCENE — sample book, not your account · nothing can be sent", LIVE DISARMED, KILLED): the ticket reads the live tastytrade bid/ask (29989.75 / 29990.50), the ENTRY line is drawn on the chart with its "↕ ENTRY 29982.50" handle (`orderLines DRAWN:1`), and the limit field follows the handle. Drag read 10:11: handle dragged 55 px down → "ENTRY 29880.50" on the glass, Limit input 29880.50, receipt `ORDER@29880.5:SLID`; the line slid across the VRP/POC chips without being intercepted by them. Live sending stays BLOCKED (standing). Not read today: stop/target lines on a real position, trade-line priority over analytical overlays under a hover.

## 4. Commercial readiness (Passport · Stripe · entitlement)

- Sign-in: WM Pro uses the shared ATH Passport (Supabase project, memory `wm-passport-supabase-identity`); members are signing in today. Signed-out audit of the 8 public routes at 375 px: 0 offenders (`scripts/audit-phone-parity.mjs --base https://wealthymindsetspro.com`, 09:56).
- **Stripe: NOT CONFIGURED on production.** `/api/billing/readiness` 09:48: `mode NOT_CONFIGURED`, no `STRIPE_SECRET_KEY`, no webhook secret, no price ids; `/api/billing/standing` tier FREE; `/pricing` shows App $10 / Passport $20 / OS $50, none on sale. The constitution's authorized offer is **$20/month** — the three tiers on the page need the Founder's ruling before any key is set. None of the 20 money-path tests (order §10) can run until the Founder sets the Stripe TEST keys (Cloudflare secrets); the webhook signature/idempotency code is pinned by `billingRoutes.route.test.ts` only.
- `/legal` reads "Not yet published": Terms/Privacy not in effect — a legal/Founder item before taking money.

## 4a. Whole-house sweep (order §11), serving `4b0b865`, 10:12 CDT, 390×844, owner session

Twelve rooms (/journal, /morning-prep, /news, /education, /lounge, /readiness, /profile, /desk, /watchlist, /scanner/map, /backtesting, /ai-bot) loaded with a fetch/JS-error patch: 0 failed requests, 0 JS errors, 0 px horizontal overflow, no placeholder words. Earlier today: /charts, /command-deck, /paper, /scanner, /scanner/map, /journal clean of failed requests at 1440 (07:12–07:25). Not read today: every clickable control room by room (order §11 asks for each control's intended result; today's sweep is load/error/layout only), keyboard accessibility, colour contrast.

## 5. What remains blocked (P0, with the exact next action)

0. **Workers Builds went silent at ~09:55 CDT:** `4b0b865` (pushed 09:49) built and went live at 10:00; `09047f2` (09:59), `98d4697` (10:03) and `3a791dc` (10:10) have no Cloudflare build at all (only the GitHub typecheck job). Production is therefore `4b0b865` — the Brick Walls fix is live; the gamma ladder, the ±1% fixture and this report are not. Same symptom as 2026-10-12 (02:31Z → 10:05 CDT). Local deploy refused (wrangler not signed in; standing rule). **Next action (Founder):** Cloudflare dashboard → Workers & Pages → wealthymindsets-pro → Builds: retry the latest commit / check the GitHub app connection.

1. **Members without a tastytrade connection see no stock/futures prices** (LIVE-ONLY order, 10-12). The live stream is the owner's account; `/api/broker/tastytrade/quote-token` answers 403 to a non-owner → `NOT_OWNER` → no bars, no quotes; the glass says "live bars come from a connected tastytrade account… connect one in Brokers". Crypto (Coinbase public) works for everyone. **FOUNDER DECISION:** (a) redistribute the owner stream to members (a market-data entitlement/agreement question, not a code change), (b) each member connects their own broker (built: Brokers page), or (c) a licensed member feed. Until decided, "guest ready" is TRUE for crypto and FALSE for stocks/futures prices.
2. **Stripe keys + tier ruling** (§4). Next action: Founder sets test keys; then the 20-step money path is run against test mode and reported here.
3. **Gamma flip + regions need chain coverage beyond ±4%** (160-contract cap on the broker socket). Next action: Founder decides the cap; then the whole-chain profile returns the flip and the regions (code exists and is pinned).
4. **Bid/Ask Split PROFILE** (session-wide, per-price bid/ask attribution) — NOT BUILT; the live tape gives lawful attribution only from page load. Next action: build it on `tastyCandlesToSidedVolume` (sided volume from tastytrade candles) as a profile child with provenance.
5. **Server routes still reading Yahoo for client rooms** (`/api/heatmap` → /research-heat, /scanner/map; `/api/discovery` → scanner unusual-states). Options recorded in `LIVE_ONLY_SOURCES.md`; Founder decision.
6. **Live order execution** stays BLOCKED by the tooling classifier until the Founder's explicit permission rule (standing).
7. Automated visual CI (order §8): `tests/brick-walls-regression.mjs` exists and runs against production with an exported signed-in session; it is NOT yet in CI because CI has no session. Next action: a CI-only test member and its storageState as a CI secret (Founder creates the member).

## 6. Builds shipped this shift (main → production, each gated by tsc + full vitest)

`4b0b865` Brick Walls polarity/concentration + WALLED fixture + regression harness · `09047f2` gamma ladder · (fixture ±1%: see git log) — plus the morning's `ec4dc53` … `59c895f` (paper/scanner mastheads, Alpaca calendar gate, profile/Big Trades paint cost).
