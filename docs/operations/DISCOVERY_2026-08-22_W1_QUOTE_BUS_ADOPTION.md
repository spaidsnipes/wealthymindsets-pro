# DISCOVERY — W1 CANONICAL QUOTE BUS ADOPTION GAP · 2026-08-22

**Founder canon: "WM Pro — Breakthrough Night Full Helicopter Audit"
(fileId 1Us8O2iYlYl7fDuRe42DjZGh7dfsLXLh6ZjGA-pTZ4-0), §2 Weakness
Exploitation W1: "MULTIPLE PRICES → INVENT ONE CANONICAL QUOTE BUS."**

## Findings

Foundation exists. Adoption is incomplete.

**Bus foundation (verified):**
- `src/lib/marketData/canonicalMarketState.ts`
- `src/lib/marketData/canonicalMarketStateStore.ts`
- `src/lib/marketData/useCanonicalMarketState.ts`
- `src/lib/marketData/publishCanonicalMarketState.ts`
- `src/lib/marketData/produceCanonicalMarketState.ts`

**Consumers ALREADY on the canonical bus (15):**
- src/app/command-deck/page.tsx
- src/components/ui/DataHealth.tsx
- src/components/layout/MobileSessionPill.tsx
- src/components/chart/StoryRibbon.tsx
- src/components/chart/ConnectedStoryRibbon.tsx
- src/components/command-deck/HeroTruth.tsx
- src/components/command-deck/WhyInspector.tsx
- src/components/command/CommandContextRibbon.tsx
- src/components/command-deck/DLARStrip.tsx
- src/lib/traderMemory/viewModels/select{ProcessLandscape,TradeExpectation,Steward,AvailableR,Permission,OpeningBell,ATHOSIntervention}.ts

**Consumers STILL on raw provider paths (19 — the W1 debt):**

Chart surface (highest founder-visibility):
- src/components/chart/MainChart.tsx
- src/components/chart/ChartsDashboard.tsx
- src/components/chart/ChartToolbar.tsx
- src/components/chart/StockInfoPanel.tsx
- src/components/chart/OptionsChain.tsx
- src/components/chart/WatchlistPanel.tsx
- src/components/chart/WatchlistGrid.tsx

Layout surface:
- src/components/layout/MainLayout.tsx
- src/components/layout/TickerTape.tsx (partial — verify)

Trading/scanning pages:
- src/app/paper/page.tsx
- src/app/scanner/page.tsx
- src/app/heatmaps/page.tsx
- src/app/news/page.tsx

API routes (bus doesn't run server-side — these are legitimate provider
adapters, NOT W1 debt; call out here so future audits don't confuse):
- src/app/api/{yahoo,finnhub,fmp,alpaca,market,heatmap,exchange}/route.ts

## W1 verdict

The bus + the store + the hook + the publisher + the producer are all
built. The gap is CONSUMER MIGRATION on the chart surface — where the
Founder sees prices most often, and where two component trees can most
easily disagree.

## Recommended next atoms (each ships independently)

1. **MainChart.tsx → canonical bus.** Read last price from
   `useCanonicalMarketState` instead of the raw provider fetch. Highest
   founder-visibility.
2. **StockInfoPanel.tsx + SymbolInfoHeader.tsx → canonical bus.** These
   render alongside MainChart — the classic "two TSLA prices on one
   page" failure mode.
3. **WatchlistPanel.tsx + WatchlistGrid.tsx → canonical bus per
   symbol.** Multi-symbol case; per-symbol subscription on the store.
4. **TickerTape.tsx audit — confirm delayed vs canonical semantics.**
   Delayed status IS canonical output; verify it subscribes.
5. **/paper page.tsx → canonical bus.** Paper P&L computation MUST use
   the same last price the chart shows or fills will disagree.
6. **/scanner + /heatmaps pages → canonical bus.** Cross-view coherence
   for the smoked-glass one-page-many-symbols use case.

Each migration is one file + one hook swap, keeping BID/ASK/MID/LAST
distinctions explicit per canon W1 requirement.

## Change-risk gate (rubric §12)

This document is READ-ONLY discovery. Blast radius: zero. No mutation.
Follow-up atoms each carry their own §11 evidence packet.

## Reference

Founder canon §2 W1 verbatim:
> W1 MULTIPLE PRICES → INVENT ONE CANONICAL QUOTE BUS.
> Exploit: every chart/header/watchlist/scanner/AI consumer subscribes
> to one canonical semantic quote object. Distinct BID/ASK/MID/LAST/
> PREV CLOSE remain explicit rather than accidentally disagreeing.
