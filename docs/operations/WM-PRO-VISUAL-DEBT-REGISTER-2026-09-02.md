# WM Pro — Founder-Visible Visual Debt Register — 2026-09-02

Per **Transformation UI Visual Implementation Contract** (Drive ID `11xOCJYbc8-B-B1A_1R0AaBh2Xm7GY5OVL5hKQbE6KHI`, rev 2026-09-01) §**FOUNDER-VISIBLE VISUAL DEBT**:

> The active team must keep a short current register of the largest visible differences between the approved visual direction and production. The register is ordered by human impact, not easiest CSS task.

Governing visual authority: **Drive folder `WM Pro — Visual Systems Execution Canon`** (folder id `1DFuPuMvggyKM6tyo5eVSNXCATu6YE4_i`) + **20 mockup JPEGs** in the Transformation UI folder (parent `14YX9JmdGGQqPyqorqKxh0BkXnOp1KuxU`). Whole-System review order per canon: **Asset 10 → 09+08 → 14+16 → 04+07+15+17 → 01+11+12+13+18 → 03+05+06+19+20**.

Compared reference: **Asset 10 — WM_Transformation_UI_10_Full_Operating_System_Overview.jpeg** (extracted contents: Order Flow Cockpit tile [Aggressive Buy 2.84B / Aggressive Sell 1.52B / Net Flow +1.32B / Flow Momentum], Price Reality, Liquidity Depth 4.27B REAL-TIME, Structure Evidence 87% Bullish Bias · Absorption Detected · HIGH CONVICTION, Risk Temperature / Liquidity Weather / Market Climate Map, Central Market Reality Canvas · THE LIVING MARKET OBJECT, Market Object Passport [Identity, Birth Time, Trust Score, Class, Clearance Level, Parent Object], Evidence Debt [Confirmed / Partial / Missing], Clarity State [Mental Clarity, Emotional Noise, Physiological Coherence], Right of Way [Capital Access, Information Access, Execution Priority, Protection Shield]).

Compared live surface: `https://wealthymindsetspro.com/charts` (observed via connected Chrome; screenshots captured this window).

## Debt register — ordered by human impact

| # | Gap between canon and prod | Human impact | Owner lane | Current state | Next atom |
|---|---|---|---|---|---|
| 1 | **Order Flow Cockpit** tile (Aggressive Buy / Sell / Net Flow / Flow Momentum) not visible on /charts | HIGH — the whole reason a pro trader opens /charts; canon puts it at top of the OS overview | Micah + Noah (LIVING-SCENE + TRUTH/WIRE) | `selectAggressorFlow` selector exists + tested (Shift-X6). Not consumed on /charts | Compose an Order Flow strip on the wm-chart-tools row that reads from `selectAggressorFlow` — real signal only |
| 2 | **Central Market Reality Canvas / Living Market Object** not visible on /charts | HIGH — the canonical "one object real-time synchronization" concept is the whole system's spine per canon | Micah + Noah | `composeMarketCanvasVM` compiler LIVE on 4 other surfaces; **shipped `edc65c2` this window: /charts is now the 5th consumer** — `<CanvasSummaryPill vm={chartMarketCanvas}/>` in wordmark row | Verify LIVE post-deploy; if silent, wire more data owners into the compiler inputs |
| 3 | **Market Object Passport** panel (Identity / Birth Time / Trust Score / Class / Clearance Level / Parent) not surfaced on /charts | MEDIUM-HIGH — passport primitive already exists (`MarketObjectPassportPanel.tsx`), only rendered on /command-deck | Micah | Component `src/components/experience/MarketObjectPassportPanel.tsx` exists + is tested elsewhere | Add a Passport toggle in the chart chrome that opens the same MarketObjectPassportPanel |
| 4 | **Evidence Debt** counter (Confirmed / Partial / Missing / Critical Gaps) not visible on /charts | MEDIUM — canon calls this out as one of the 5 outer tiles; the concept exists in `selectMarketCanvas` but no strip renders on /charts | Micah + Noah | Compile has `evidenceDebt` field on canvas VM; unused on /charts | Add an Evidence Debt chip that reads `chartMarketCanvas.evidenceDebt` |
| 5 | **Liquidity Weather / Risk Temperature** heatmap tile absent on /charts | MEDIUM — canon Asset 08 (Liquidity Weather Heatmap) is the second review family after Asset 10 | Micah (LIVING-PIXEL LAW) | No real liquidity/depth provider currently wired. Adding a decorative heatmap would violate Living-Pixel Law — must ship truthful NOT CONFIGURED tile when depth provider missing | Add a Liquidity Weather empty-state tile ready to render real data when depth provider lands (per Monday Test 2 pattern) |
| 6 | **Right of Way** panel (Capital Access / Information Access / Execution Priority / Protection Shield) absent on /charts | LOW-MEDIUM — Right of Way selector + gate LIVE on /command-deck; not on /charts | Micah + Noah | `Decision Permission Compiler` LIVE (Shift-E2). Not visible on /charts | Add a Right-of-Way chip in the wordmark row that reads the same permission verdict |
| 7 | **Clarity State** panel (Mental Clarity / Emotional Noise / Physiological Coherence) absent on /charts | LOW — canon addresses this but it's an inner-state layer; ATHOS integration owns this | ATHOS + Micah | Not yet a real WM data owner for physiological signals | Deferred until real biosensor / self-assessment data owner is chosen — no fake gauge per LIVING-PIXEL LAW |

## What now looks/behaves different (per Visible Transformation Test)

Compared to the pre-shift baseline the Founder saw (`/charts` was a traditional TradingView-style chart with only ticker+chart+toolbars):

- Category strip promoted to top-level row (Chart / Options / ETFs / Financials / Valuation / Corporate Actions / Shareholders / Profile) — asset-class-aware (BTC hides Financials/Corp Actions, options contract shows Chart+Profile only)
- Breadcrumb "CHARTS › SYMBOL › TAB" in wordmark row — orientation truth
- Chart toolbar (timeframes + ORDER FLOW row + Indicators/DOM/Pine/Replay) hidden on non-Chart tabs — no dead clicks
- Financials empty-state now names the exact missing host secret (`FMP_KEY`) with actionable fix ("Set it in Cloudflare Worker env vars")
- Left-rail labels no longer truncate ("Command Deck", "Morning Prep" render in full)
- `/api/fmp` joins the whole-`/api`-tree NOT CONFIGURED canonical contract
- **NEW (edc65c2): `<CanvasSummaryPill/>` in wordmark row — /charts becomes the 5th consumer of the Phase 3 Market Canvas compiler** (deployment landing this window; live-verify pending)

## What real invention is now visible or operable

- Same canonical canvas verdict on /charts as /command-deck (post-edc65c2 deploy)
- Asset-class-aware category strip (real invention — pure `categoryTabsFor(canonicalAssetClass(symbol))` compiler)
- Truth-in-name broker CTA prop (`onConnectBrokers`)
- Whole-`/api`-tree NOT CONFIGURED contract (Monday Test 2 compliance for /api/fmp)

## What old burden disappeared

- The hedge sentence "may not be an equity OR provider not configured" — replaced with exact-cause honest empty state
- Chart-toolbar controls that silently no-op'd on Financials tab — no longer rendered
- Duplicated 8-tab literal that could be re-inlined (locked by categoryTabsFor Sentinel)

## What real data/state makes the new visual alive

- `canonicalAssetClass(symbol)` classifier
- `composeMarketCanvasVM` compiler (same reader→writer identity as chartMarketStatePublisher)
- `useAuth().user.id` for ownerId permission compilation
- `/api/fmp` NOT CONFIGURED body → `providerEdge` state → gold card render

## What can the trader do faster or understand better

- Understand where they are in the OS (breadcrumb)
- See only the tabs relevant to the current symbol's asset class
- Read the actual reason for empty fundamentals and act on the exact host secret
- (Post-edc65c2) See the same canonical canvas verdict on /charts they'd see on /command-deck — no divergent stories

## No design theater — LIVING-PIXEL LAW check

All atoms this window pass the canon prohibitions:
- No new mockup generated
- No color-only restyle
- No Storybook-only proof
- No CSS diff without wiring
- No fake numbers ("87% Bullish Bias" from Asset 10 was NOT copied literally — the canvas VM reads real state or renders silent)
- CanvasSummaryPill on /charts routes through the SAME compiler that the deck uses — not a duplicated pipeline

## Assets STILL requiring merge (queue per canon whole-system order)

- Asset 09 — Master Order Flow Cockpit (raw evidence workspace)
- Asset 08 — Liquidity Weather Heatmap (calls for real depth data owner)
- Asset 14 — Market Object Passport (Order Block lineage)
- Asset 16 — Chart Workspace Object Passport (Passport integrated into workspace)
- Asset 04 — Question-Driven Absorption Canvas
- Asset 07 — Evidence Debt / Question Mode
- Asset 15 — Question-Driven Continuation Health
- Asset 17 — Cinematic Continuation Health Canvas
- Assets 01 / 11 / 12 / 13 / 18 — Learning / progressive scaffolding
- Assets 03 / 05 / 06 / 19 / 20 — Aggression / response / absorption / big-trade

Anti-fabrication ledger: NO shift-duration claim. Observed events only.
