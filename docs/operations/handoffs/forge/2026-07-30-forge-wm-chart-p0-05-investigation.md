# FORGE INVESTIGATION — WM-CHART-P0-05 four-price divergence

**Date:** 2026-07-30 · **Employee:** Forge · **Type:** Investigation + ticket authoring (no code changes)
**Trigger:** Live production defect captured by Mission Control at 09:12 CDT on
`wealthymindsets-pro.vercel.app/charts` — TSLA rendering as 305.40 / 305.39 / 305.33 / 305.30
across four surfaces on the same page at the same second, while TradingView showed 306.00.
**Non-colliding with:** Option A HOLD (PR1 / Scanner prereq / V4 / V5), Noah's held bubble ticket,
Markov engine (`e0a5ed7`), Confluence spec updates (`138e08d`).

---

## 1. What the four surfaces actually do

| Surface | File | Data source | Cadence | In my lane? |
|---|---|---|---|---|
| Chrome tab title | *(unknown — see §3)* | *(no code path found)* | *(unknown)* | *(unknown)* |
| Top ticker bar | `src/components/layout/TickerTape.tsx` | `fetchQuote()` → yahoo, then alpaca, then finnhub (per symbol) | Poll every 10s | **YES** |
| Chart header block (below toolbar) | `src/components/chart/SymbolInfoHeader.tsx` | `useWebSocket({symbol})` live tick, OR `currentPrice` prop from parent | WS tick (per-tick) or static from parent | **YES** |
| Chart in-canvas HUD (top-left "SVP" area) | `src/components/chart/MainChart.tsx:6579` — `{change} ({changePct}%)` | `ticker.changePct ?? ((lastPrice - openPrice)/openPrice * 100)` | Per-tick from same WS + per-bar fallback | **NO — Noah's held lane** |
| Watchlist row | `src/components/chart/WatchlistPanel.tsx` | `finnhub` → `yahoo` → `alpaca` fallback chain (per symbol) | Fetched on mount + interval | **YES** |

**Root diagnosis:** four independent subscriptions with three different providers and three
different cadences, all rendering `$X.XX (+Y.YY%)` in visually identical form as if each is the
authoritative last-trade quote. This is the same class as the 56 → 60 Confluence drift:
independent surfaces asserting truths that must be coherent, without any single source of
truth and without disclosing which source each represents.

**Confirmed by grep:** `SymbolContext` (`src/contexts/SymbolContext.tsx`) exposes only
`{activeSymbol, setActiveSymbol}` — no `price`, no `usePrice` hook. The four surfaces have no
shared price source to fall back on even if they wanted one.

---

## 2. Founder-visible truthfulness violations

- Each surface's `$X.XX` and `(+Y.YY%)` render is presented as authoritative last-trade — no
  qualifier, no source badge, no staleness stamp.
- Alpaca free-tier REST is 15 min delayed; Yahoo is delayed 15 min; Finnhub free is delayed 1–2
  min; the WS tick is live. **Currently indistinguishable in the UI.**
- Even the shared display convention is wrong: `TickerTape` shows `(+7.07 +2.37%)` while
  `WatchlistPanel` shows just `(+2.37%)` — different summaries of the same underlying number.
- Positive: same screenshot confirms `DOM "NO FABRICATED DEPTH"` still holds, ALPACA LIVE label
  is surfaced honestly, and regime is coherent at +2.37%. The truthfulness discipline works
  where it is applied.

---

## 3. What I could NOT reproduce in code

**The Chrome tab title showing `305.40` is not from any code path I can find.**

- `document.title` is set from JS **nowhere** in the app that touches a symbol price
  (`grep -rn "document\.title" src/` returns only `login/page.tsx:58` where it reads the
  existing title for a URL replace, not writes it).
- Root layout metadata (`src/app/layout.tsx:15`) is the static string
  `"WealthyMindsets Pro — Elite Trading & Creator Platform"`.
- `src/app/charts/page.tsx` has no `generateMetadata` and no title override.

Possible explanations, in decreasing order of likelihood:
1. Founder observed a different visible element (page header text) and Mission Control's
   summary rendered it as "tab title."
2. A browser extension is rewriting the tab title from page content.
3. A PWA / Chrome tab-badge feature I haven't identified.
4. Code sets it and my grep missed it (grep was exhaustive; I would not bet on this).

**Recommendation:** confirm with the Founder whether the browser tab strip literally showed
"305.40" or whether that value appeared in a page-visible header they read as the tab title.
This changes the fix — a tab-title path we don't have needs adding; a misidentified page
element folds into the three fixes below.

---

## 4. Why this is NOT trivially "one source of truth"

The naïve fix — "make them all subscribe to the same feed" — doesn't quite work:

- **`SymbolInfoHeader`** shows *one* symbol (the active chart symbol). The live WS tick is fine.
- **`TickerTape`** shows *thirteen* symbols on a rolling strip. WS can't carry all of them — it's
  one-symbol-at-a-time on the free Alpaca plan.
- **`WatchlistPanel`** shows *N* symbols the user chose. Same problem.
- **The in-canvas HUD** in `MainChart.tsx` also shows the active symbol — same feed as the header
  is natural, but the file is Noah's held lane.

So the honest fix is a **hybrid**: for the active symbol, the header and the in-canvas HUD must
render *byte-identical* values from *the same subscription* (currently they can drift by a tick).
For non-active symbols in the ticker and watchlist, each must **label its source and staleness**
so the user can see why `TSLA 305.30` in the watchlist differs from `TSLA 305.39` in the ticker.

This mirrors the Confluence Meter's honesty gate: same components can render, but each declares
its own availability + confidence + calculated-for. Nothing collapses to a single silent number.

---

## 5. Proposed design — for triage, not shipping

**Module (new):** `src/lib/symbolPrice.ts` — a shared subscription/cache layer that returns:

```ts
interface SymbolPrice {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  source: "alpaca-ws" | "alpaca-rest" | "yahoo-rest" | "finnhub-rest";
  updatedAt: number;                       // epoch ms of the tick we're rendering
  staleness: "live" | "delayed-1m" | "delayed-15m" | "unknown";
  calculatedFor: { symbol: string; requestedAt: number };
}
```

**Hook (new):** `useSymbolPrice(symbol, { preferLive }): SymbolPrice | UnavailableSlot`.

- If `preferLive` and this is the active symbol, subscribe to the same WS tick everyone else
  subscribing to it gets — no per-consumer sockets.
- Otherwise, hit a shared REST cache with a single polling loop per source, not one per
  component.
- Result carries `calculatedFor` and staleness so the UI can render `TSLA 305.30 [15m delay,
  Yahoo]` where honest, and matching `TSLA 305.39 [live, Alpaca]` where accurate.

**Migration order — small, per-file, verifiable:**

1. `SymbolInfoHeader.tsx` (single file, single symbol) — switch to `useSymbolPrice(symbol,
   {preferLive: true})`. Render the source badge. **Ship + verify.**
2. `WatchlistPanel.tsx` — switch to shared cache, drop the per-panel fetch chain. Render
   source + staleness per row.
3. `TickerTape.tsx` — same, shared cache.
4. `MainChart.tsx` in-canvas HUD — **coordinate with Noah first.** The in-canvas HUD and the
   `SymbolInfoHeader` must render byte-identical values for the active symbol, and both must
   subscribe to the same hook.

**Explicitly deferred to a follow-on:** the tab-title question (§3). If it turns out to be
real, it becomes a fifth surface with the same treatment.

---

## 6. Why I am stopping before code

The last thing that shipped without an architecture pass was the Confluence Meter's silent
re-normalization, and it produced the 56 → 60 drift the Founder saw. That is exactly the class
of bug this ticket exists to prevent. I would rather file the design and let Sentinel or
another Forge pick it up cleanly than pattern-match "urgent" into "start editing."

The three specific things this ticket needs before implementation:

1. Founder clarification on the tab-title claim (§3).
2. Noah alignment on the in-canvas HUD (§4, §5) — same subscription for the active symbol, and
   whether that touches Noah's held lane or can be limited to a prop-drilled `SymbolPrice`
   value from the parent.
3. A single source decision: WS-preferred with REST fallback, or per-surface source with badge?
   §5 sketches the hybrid; the Founder should ratify.

The Confluence spec §5 already establishes the principle: *"we render what we see" (fine) vs
"we synthesize what we can't see" (not fine).* Same principle applies here — different sources
are fine, silently pretending they're the same source is not.

---

## 7. Also outstanding from prior turns

Independent Sentinel verification is still requested for `WM-CHART-P0-02` (`c53e429`,
ChartContext + DataVersion + AbortSignal guard). See
`docs/operations/handoffs/forge/2026-07-29-forge-verification-request-wm-chart-p0-02.md`. That
guard is what will make `useSymbolPrice` safe to introduce — stale ticks from a previous symbol
must not overwrite the active one.
