# WM Pro UI Transformation Ledger — 2026-08-12

Micah/Noah/Forge/Sentinel joint pickup. Extracted from 16 founder-supplied mockups + read-only inspection of base `61b20a2d…`. Track A (Experience/Foundation) artifact — collision-safe with Track B (Nectar V2). No source, test, schema, DB, or deploy mutation.

## 1. Design Language Extract (from mockups)

### Palette
- **Obsidian family** (background gradients, panel surfaces): `#000000`, `#050506`, `#0a0a0a`, `#111114`, `#181819`
- **Gold family** (accents, hairlines, hero numbers, active state): warm gold `#d4af37`, brand gold `#c9a55c`, deep amber halo `#b8862a`, soft candle-glow `#ffd76a` (for cinematic light rays only, not UI)
- **Positive/Negative/Neutral** market states (chart tiles): warm gold-green `#7fc27f`, dark ember-red `#c05a4a`, muted graphite `#3a3a3d` — always desaturated so they never fight the gold identity
- **Status pills**: ALIGNED / OPTIMAL / HARMONY → gold hairline outline + gold text; CONFIRMED → thin green (#5cb85c) check + green label; degraded / stale → amber caution (`#c9a55c` on dark)
- **Environmental** (background frames only): dark oak, black marble reflections, arched-window backlight — mockup atmosphere, NOT UI surface

### Typography
- **Brand wordmark**: high-contrast serif (Playfair Display / Trajan-like), small-caps for secondary "PRO", "PRO COMMAND CENTER", "PRO LOUNGE"
- **Section headings**: geometric sans small-caps with wide tracking ("TRADING COMMAND DECK", "OPENING BELL PROTOCOL")
- **Hero numbers** (Process Score 92, Available R 2.45R, Personal Edge 87): oversized display serif with gold gradient fill and outer glow ring
- **Data / metric labels**: neutral sans, ~10-12px, medium weight
- **Poetic taglines** (universal): italic or wide-tracked sans in muted gold — one per module ("The Mirror Reflects. You Evolve.", "Discipline compounds. So does wealth.", "Mirror reflects. Discipline protects. Wealth compounds.")

### Surfaces & elevation
- Translucent glass panels with **~1px inner gold hairline border** + faint outer amber glow (10-30% opacity)
- Panels layer over deep obsidian; NO harsh drop shadows — cinematic amber wash instead
- Rounded corners ~12-20px on tiles, ~8px on control chips
- Section dividers = thin gold rule with center diamond glyph `◆` or `✦`
- Progress rings and gauges are ALWAYS gold on obsidian; empty portion is faint graphite

### Iconography
- Line icons only, ~1px stroke, gold with soft halo
- Story Ribbon icons are named-narrative (Distribution / Liquidity Sweep / Inducement / Order Block / Demand Zone / Expansion) — one icon per market-phase chapter
- Realm icons: geometric sigils (WM crown, Dreamboard star-mountain, PowerTribes crown-of-figures, Marketplace vault door, Games chess piece)

### Motion (implied)
- Slow gold-halo pulse on active state (Process Score ring, "I'M READY" bell button)
- No spinning loaders — gold linear-sweep on hairlines
- Story Ribbon: sequential icon glow left→right as market phase advances
- Data updates: cross-fade, never abrupt

## 2. Universal Modules (appear across ≥3 mockups)

| # | Module | Purpose | In mockups | Repeats |
|---|---|---|---|---|
| U1 | **Trading Command Deck** | Chart + footprint + volume profile as unified hero | 1, 2, 3, 7, 9, 10, 15, 16 | 8× |
| U2 | **The Mirror / Process Score** | Psychological alignment 0-100 with sub-scores (Discipline, Focus, Consistency, Growth) | 3, 5, 6, 10, 11, 15, 16, 17 | 8× |
| U3 | **Opening Bell Protocol** | Pre-market ritual checklist ending in "I'M READY" | 3, 5, 10, 15, 16, 17 | 6× |
| U4 | **Story Ribbon** | Market narrative chapters as icon strip + progression text | 1, 2, 3, 9, 10, 15, 16 | 7× |
| U5 | **Steward State** | Account integrity + risk posture (drawdown, R-multiple, health) | 1, 2, 5, 7, 17 | 5× |
| U6 | **Available R** | Risk capacity gauge (e.g. 2.45R of 2.50R max, or 3.62R with 1.8R-4.7R range) | 1, 2, 10 | 3× |
| U7 | **CLC Confirmation** | Confluence / alignment / catalyst signal state | 4, 7, 9 | 3× |
| U8 | **Journal Session Review** | Trades / Win Rate / Profit Factor / R / Personal Edge + equity curve | 3, 4, 8, 10, 11, 15, 16 | 7× |
| U9 | **Lounge (Creator & Trader Community)** | Live rooms + creator posts + community feed + market rail | 3, 10, 12, 14, 15, 16 | 6× |
| U10 | **Realm Gateway** | Cross-product nav: WM PRO / DREAMBOARD / POWERTRIBES / MARKETPLACE / GAMES / (+ANCIENT VAULT on mobile) | 3, 6, 10, 11, 13, 15, 16 | 7× |
| U11 | **Mobile experience** | 6-screen phone strip: Process Score / Levels / Trade / Positions / Journal / Lounge | 6, 10, 11, 13, 15, 16 | 6× |
| U12 | **Positions** | Live open positions with per-symbol P&L and total exposure | 6, 11, 15 | 3× |
| U13 | **Levels** (gamification) | Locked/unlocked ranks (Visionary, Sovereign, Legendary, Immortal, Realm Explorer, Wealth Architect, Empire Builder, Legacy Sovereign) with countdown to next unlock | 6, 11, 13 | 3× |

## 3. Module Gap Matrix (mockup ↔ base `61b20a2d…`)

Legend: **HAVE** = exists at base and is on-mockup-direction · **PARTIAL** = exists but named/scoped differently · **MISSING** = no file · **V2** = in Nectar V2 61-entry manifest · **PR25** = in the 21-path PR25 draft

| Module | Status | Existing path(s) | V2/PR25 | Notes |
|---|---|---|---|---|
| U1 Trading Command Deck | PARTIAL | `src/app/charts/page.tsx`, `src/components/chart/MainChart.tsx` (EDIT in V2 + PR25), `src/components/chart/ChartsDashboard.tsx` (EDIT V2) | V2 EDIT / PR25 EDIT | No unified "Command Deck" wrapper. Volume Profile lives inside `WMSessionVP.tsx` (V2 FROZEN). Footprint tables from mockup 9 do not exist. |
| U2 The Mirror / Process Score | MISSING | — | — | No file matches `mirror`, `process-score`, `alignment`. Net-new. Design tokens for the ring gauge don't exist. |
| U3 Opening Bell Protocol | MISSING | — | — | No file matches `opening-bell`. Closest existing: `src/app/morning-prep/page.tsx` (semantic overlap — could adopt). |
| U4 Story Ribbon | MISSING | — | — | Zero occurrences of `StoryRibbon`, `story-ribbon`, `narrative-ribbon`. Net-new component. |
| U5 Steward State | MISSING | — | — | Zero component; concept lives only in JSDoc/prose. |
| U6 Available R | MISSING | — | — | No gauge component. Risk math likely lives in `src/lib/marketData/` but not surfaced. |
| U7 CLC Confirmation | MISSING | — | — | Founder memory references CLC repeatedly (see [ath-video-intelligence-role]) but no WM Pro component. |
| U8 Journal Session Review | HAVE | `src/app/journal/page.tsx` + 6 more files under `src/app/journal/` | — | Content exists. Visual system is likely not gold-on-obsidian yet. |
| U9 Lounge | HAVE (WIP) | `src/app/lounge/page.tsx` + 1 more | — | Per ATH_COMMAND_CENTER.md L60: current `lounge/page.tsx` is a ~192-line "Universal Lounge" hero WIP, uncommitted, owner unidentified (RISK-004). Mockups 12/14 show a much richer lounge — content feed / live rooms / market rail / calendar. |
| U10 Realm Gateway | MISSING | — | — | Cross-product nav bar (WM PRO / DREAMBOARD / POWERTRIBES / MARKETPLACE / GAMES). Two of the five (Dreamboard, WM Pro) exist as separate repos; three do not exist anywhere. |
| U11 Mobile experience | PARTIAL | (responsive shell) `src/lib/responsiveShell.ts` (V2 TEST) | V2 TEST | Existing site is responsive but not this-mockup-shaped. The 6-screen strip in the mockups is aspirational. |
| U12 Positions | MISSING | — | — | Closest: `src/app/paper/page.tsx` (paper positions). Live positions surface = net-new. |
| U13 Levels | MISSING | — | — | Fully gamified rank system is net-new. |

### Pages that exist but have no mockup counterpart yet
Founder priority is UI transformation of the mocked modules; these existing pages are candidates for either (a) fold-in under a mocked module or (b) explicit "supporting page" classification: `ai-bot`, `backtesting`, `copy-trading`, `creator`, `education` (candidate for Academy), `heatmaps`, `news`, `paper` (candidate for Positions/paper-lane), `partnerships`, `profile`, `radio`, `scanner`, `shop` (candidate for Marketplace lite), `tv`, `vailbuild`, `veddbuild`.

## 4. Design-token deficit
- Current `src/app/globals.css` has ~24 CSS-var lines. Mockups require a tokenized palette with at least:
  - Obsidian ramp (5 stops)
  - Gold ramp (3 warm + 1 halo)
  - Muted market colors (positive/negative/neutral)
  - Panel border / halo intensity vars
  - Hero-number gradient stops
  - Section-divider glyph var
- `tailwind.config.ts` extends are minimal (~5 lines).
- `src/components/ui/` contains only `ErrorBoundary.tsx`, `SymbolSearch.tsx`, `WMLogo.tsx` — **no `Panel`, `HeroNumber`, `Gauge`, `Ring`, `Ribbon`, `Pill`, `Divider`, `Tagline` primitives.** Any transformation begins here.

## 5. Collision-safety with Nectar V2 / PR25

The 61-entry V2 manifest and the 21-path PR25 do NOT touch:
- Any of the missing modules (U2/U3/U4/U5/U6/U7/U10/U12/U13) — safe to build fresh
- `journal/`, `lounge/`, `morning-prep/`, `shop/`, `education/` — safe to redesign
- `globals.css`, `tailwind.config.ts`, `src/components/ui/` — safe to expand tokens/primitives

The 61-entry V2 manifest DOES touch (do NOT re-scope in UI work):
- FROZEN: `ai-bot`, `AlertsPanel`, `BottomIndexBar`, `DOMPanel`, `StockInfoPanel`, `SymbolInfoHeader`, `WMSessionVP`, `SmartMoneyPanel`
- EDIT: `ChartsDashboard`, `MainChart`, `WatchlistPanel`, `TickerTape`

**Rule for Micah**: touch FROZEN files only via a superseding V2 manifest with fresh Sentinel APPROVE/RETURN. Wrap them in new layout containers instead — the containers can hold Command Deck / Story Ribbon / Steward State without editing the frozen internals.

## 6. Build-priority ranking (Micah's next-cycle sequence)

Ordered by (a) design leverage (b) collision-safety (c) unlock effect on the rest of the system:

1. **Design tokens + `<Panel>` / `<HeroNumber>` / `<Ring>` / `<Ribbon>` / `<Pill>` primitives** — no page needs to change; every subsequent module reuses them. Purely additive to `src/components/ui/` + `globals.css` + `tailwind.config.ts`.
2. **The Mirror + Process Score** (U2) as `src/app/mirror/page.tsx` + `src/components/mirror/ProcessScoreRing.tsx`. High founder-visibility. Zero collision with V2/PR25. Requires no live data — can start with a static compute over recent journal entries + a session ID.
3. **Opening Bell Protocol** (U3) folded into existing `src/app/morning-prep/page.tsx`. Rename to `opening-bell` or add a new route + keep morning-prep as redirect. All checklist state is client-side.
4. **Story Ribbon** (U4) as `src/components/ribbon/StoryRibbon.tsx` — mounted first into `ChartsDashboard` (V2 EDIT, already permitted). Data source: derive from the same coverage/CLC signals that already flow to MainChart. **This is where UI transformation directly proves canonical Market State adoption** (P00290 was a Sentinel finding that canonicalMarketStateStore has no non-test consumer — StoryRibbon becoming its first real consumer resolves that).
5. **Steward State** (U5) + **Available R** (U6) as sibling panels — both are risk-math surfaces; likely share a small `src/lib/risk/` module (net-new). Mount into Command Deck wrapper.
6. **Realm Gateway** (U10) as a global layout element in `src/app/layout.tsx` — a bottom-nav bar with 5 realm links. Two links (WM PRO, DREAMBOARD) point to real destinations; the other three (POWERTRIBES, MARKETPLACE, GAMES) can be "waitlist" stub pages.
7. **CLC Confirmation** (U7) — inspection of derived Market State; belongs in the Story Ribbon panel or as its own sidebar tile after U4 lands.
8. **Positions** (U12) surface — either lift `src/app/paper/page.tsx` into a new `positions/` route, or promote paper to be one of two "Positions modes" (paper | live).
9. **Levels** (U13) as `src/app/levels/page.tsx` + rank state on user profile — pure gamification, no market-data dependency.
10. **Full mobile 6-screen strip** (U11) — after U2/U3/U8/U12/U9 all have desktop implementations, mirror them into mobile-first layouts within the existing responsive shell (V2 TEST-covered).

## 7. Load-bearing blockers to Micah execution

Nothing in the design-tokens + primitives step (item 6.1) needs anything Track B doesn't already have. **STOP_REQUIRED blocks running `npm run dev` / `next build` / `vitest`, but does NOT block writing token/primitive source files.** However, without running the dev server, visual verification via Chrome MCP is impossible → any built primitive is UNVERIFIED until:
- (a) capacity ≥2 GiB (founder deletion authority), OR
- (b) Chrome MCP paired (founder side-panel sign-in) AND a static HTML preview of primitives served from Vercel (no local build needed).

Recommended interim: build primitives as `.tsx` files with static-inline usage examples in an MDX/Storybook-style doc page (`src/app/design/page.tsx`), so that when either unblock lands, one live-load verifies the whole system.

## 8. THIRD-clone finding (Cycle 3 addendum)

`docs/operations/ATH_COMMAND_CENTER.md` L52 declares `~/wealthymindsets-pro` as the "canonical local clone" (verified 2026-07-28). Cycle 2b of this session found that clone is now **16 commits BEHIND production/main** (per Nectar authority doc P00310) and `61b20a2d…` (production SHA) is unreachable from it. The actually-authoritative clone is `~/Documents/Codex/2026-08-09/…/wm-pro-working/.git` (owns worktrees including `/private/tmp/wm-pr23-adoption-correction`).

**Micah must NOT branch off `~/wealthymindsets-pro/main`** — that branch is stale and any branch cut from it will conflict on merge. All UI transformation work should originate from the newer canonical clone's `main` (reachable from the correction seat's parent git dir), not this repo.

## 9. Exact next owner / action

- **Micah** (next cycle) — begin item 6.1: token spec + 5 primitives. Author them in the newer canonical clone, not `~/wealthymindsets-pro`. Ship as one bounded correction contract with a fresh 6-9 path Sentinel RETURN/APPROVE.
- **Sentinel** — pending S-01 canonical-serialization spec resolution + the P00325 six-condition RETURN on PR25.
- **Founder** — capacity + Chrome pairing + Hive PDF text export (unchanged from Cycle 2b).

Founder BTC tab, Nectar/BTC/TSLA evidence, all 5 worktrees, quarantine `2f03f965`, credentials, brokerage state all preserved untouched.

**MISSION STATUS = ACTIVE / CONTINUATION REQUIRED / WM NO-GO.**
