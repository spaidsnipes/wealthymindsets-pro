# MICAH DESIGN SPEC — WM-CHART-PROV-EMERG-01 provenance-label copy (Founder emergency)

**Author:** Micah (Experience / Accessibility / WOW Polish) · **Date:** 2026-08-07 (before 8:30 CT market open)
**Repo HEAD at spec time:** `fd9e1f0` · **Lane:** copy + design spec. **No src/ changes in this file. Noah implements across 6 call sites.**
**Founder statement (verbatim):** *"Why does it say yahoo delayed and finhub delayed stop exposing where our api keys are from … It can say delayed but stop telling people where the apis come from."*
**Evidence source:** WM Pro Company Bible §26 (Design Language — color-meaning rules), §25 (UI/UX Bible — non-color indicators), §30 (Security — never expose supply chain unnecessarily). ATH Universal Product Doctrine §4 (KISS — plain language before jargon), §8 (Simple but not empty; Original but understandable).

---

## 1. Decision — **Option A (Minimalist) as visible label, honest detail in the accessible layer**

Ship as: **`LIVE` · `DELAYED` · `STALE` · `UNAVAILABLE`** on the badge, with the descriptive Option-B sentence carried in the hover `title` **and** the `aria-label` (same string on both, so touch users hear the same thing screen-reader users hear).

**Not Option C.** Color-only + hover-tooltip fails Bible §25 ("Non-color indicators for live, delayed, buy, sell, profit, loss") and fails on touch (no hover). Micah already filed WM-A11Y-BADGE-01 against exactly this pattern; shipping C would re-open a defect this thread already RETURNED.

**Not raw Option B on the badge.** `"DELAYED 15 MIN"` bakes a numeric claim we cannot guarantee per provider or session:
- Yahoo delayed feeds vary by exchange (equities ≈15m, futures/options often longer)
- Finnhub free-tier delay varies by symbol tier
- Crypto (Coinbase/Binance) is not delayed at all
- Broker feeds (Alpaca IEX) are real-time in regular hours but may lag the consolidated tape pre/post
Shipping a fixed "15 MIN" everywhere would violate the truthfulness rule that WM Pro is built on. Keep the noun on the badge; put the honest per-provider caveat in `title` / `aria-label` where `src/lib/priceSource.ts:33,37,39` already houses it.

---

## 2. The 4 states — exact copy Noah ships

| State | Visible badge label | Accessible detail (aria-label + title, same string) | When it fires |
|---|---|---|---|
| **LIVE** | `LIVE` | `Real-time market data · updating tick-by-tick` | Genuine real-time feed connected (`priceSourceBadge.live === true` and `connected === true`) |
| **DELAYED** | `DELAYED` | `Delayed market data · not the live consolidated tape` | Provider-known-delayed OR real-time provider currently disconnected |
| **STALE** | `STALE` | `Feed was live, now reconnecting · price may not reflect the market` | Was `LIVE`, connection dropped, awaiting reconnect (Resilience state — see §5) |
| **UNAVAILABLE** | `UNAVAILABLE` | `No market data source resolved · price cannot be shown` | No feed configured OR all providers returned null |

Rules on copy:
- Single all-caps word for the badge. **Never** append the provider name, region, tier, or delay-minutes on the badge itself.
- Accessible detail (aria-label / title) is a **plain, punctuated sentence** — plain language, no jargon (`consolidated tape` is the only trading term retained because it is the truthful one; no substitute is as accurate). Doctrine §4 satisfied.
- The word matches per-surface exactly — no `LIVE` here and `LIVE DATA` there. One vocabulary across the six files.

## 3. Bible §26 color-meaning — the 4 states pair with these tokens

Per WM-COLOR-P0-01 (b6fdb2a) policy — green means exactly one of {bullish direction, LIVE provenance, user-controlled ON} per surface. On the provenance badge, the permitted green meaning **is** LIVE, so:

| State | Background / border color | Text color | Shape / dot cue | Grayscale legible? |
|---|---|---|---|---|
| `LIVE` | existing `#00C0762A` bg / `#00C07680` border | `#00E88A` | filled dot | **yes** — the word "LIVE" is the primary cue |
| `DELAYED` | existing `#F5A62322` bg / `#F5A62360` border | `#F5A623` | filled dot | **yes** — the word "DELAYED" |
| `STALE` | `#F5A62322` bg / `#F5A62360` border (same amber as DELAYED) | `#F5A623` + a **subtle pulsing outline** at 1.2s ease-in-out (Doctrine §8 "Calm but alive"; Bible §26 "brief directional emphasis, don't animate every event") | ringed dot | **yes** — pulse + word "STALE" |
| `UNAVAILABLE` | `#3B4046` bg / `#4A5058` border (neutral gray) | `#8B8FA8` | hollow dot | **yes** — neutral color + word "UNAVAILABLE" |

**No color-only signaling.** Grayscale screenshot of any of these badges must still communicate the state via the word + dot shape (filled/ringed/hollow). This satisfies Bible §25 and closes the WM-A11Y-BADGE-01 gap I filed against the prior hover-only badge.

## 4. Provenance data preserved for developer/logs — never rendered as chrome

The provider name is legitimate debugging information; it should not disappear from the client entirely. Per the emergency ticket AC #2:

- Expose per-quote provenance at `window.__WM_DATA_PROVENANCE__ = { symbol, provider, live, ts }` (write-only from the badge callers).
- `console.debug("[WM data provenance]", { symbol, provider, live, ts })` on every quote resolution.
- **Zero user-facing DOM node contains the strings** `POLYGON` / `BINANCE` / `ALPACA` / `FINNHUB` / `YAHOO` / `TRADIER` / `ALPHAVANTAGE` / `POLY`. Sentinel closes on `grep -rn` returning zero user-facing hits under `src/`.

This keeps Founder's supply-chain hidden (Bible §30) while giving engineers the information they need to debug.

## 5. Doctrine §7 required fields

| Field | How this spec satisfies it |
|---|---|
| **KISS primary path** | One word on the badge; the trader identifies feed quality in ≤200ms of glance. Detail is one keystroke or one screen-reader announcement away — not gone, just not competing for attention. |
| **Accessibility** | Non-color indicator (the word itself) satisfies §25. Grayscale legible for colorblind and glare-washed users. Same string on `aria-label` + `title` = touch users get the same as pointer users. Badge height inherits the existing WM-A11Y-BADGE-01 sizing rules — no new tap-target work required, but the badge must remain ≥ its containing text's cap-height (already true in MainChart.tsx:6606 and ChartsDashboard.tsx:663). |
| **Resilience** | The `STALE` state is the resilience payoff — the badge doesn't lie ("LIVE" when the socket dropped 30s ago), and it doesn't punish ("UNAVAILABLE" when the connection is only briefly interrupted). It names the honest in-between: was live, reconnecting. Doctrine §2 "Turn failure into learning without shaming the user" applied to *the data connection itself*. |
| **WOW** | The WOW moment is *the absence of a moment*: a trader who has been burned by other apps flashing false green over a stale price sees WM Pro degrade gracefully into `STALE` with a calm pulse, and knows the platform is not lying to them. Trust is the deepest WOW in a trading tool. |

## 6. Acceptance criteria (Noah verifies against these)

1. `grep -rn "'POLYGON'\|'BINANCE'\|'ALPACA'\|'FINNHUB'\|'YAHOO'\|'TRADIER'\|'ALPHAVANTAGE'\|'POLY'" src/` returns **zero user-facing hits** — only test files, comments, or the internal `PriceSource` type union / provider-selection code in `src/lib/priceSource.ts:14-15,25-41` and `MainChart.tsx:1585-1589,2023,6674` may retain the strings internally. **No JSX or template literal that reaches DOM may contain any provider name.**
2. `priceSourceBadge()` in `src/lib/priceSource.ts` returns one of exactly four `label` values: `LIVE`, `DELAYED`, `STALE`, `UNAVAILABLE`. The `title` field carries the plain-sentence descriptor from §2 verbatim. Callers pass the same string through to `aria-label` on the badge span.
3. The four call sites — `TickerTape.tsx:133`, `MainChart.tsx:6606`, `WatchlistPanel.tsx:698`, `ChartsDashboard.tsx:663` — plus the two direct provider-literal sites `DOMPanel.tsx`, `WMSessionVP.tsx`, `ChartToolbar.tsx`, `StockInfoPanel.tsx` (per emergency-ticket file scope) all render the new copy.
4. `MainChart.tsx:1585-1589` `srcName` chain (`"ALPACA"`, `"FINNHUB"`, etc.) is renamed at the emission boundary to the state noun, OR converted to a discriminated union that consumers map through `priceSourceBadge` — do **not** display `srcName` directly to DOM anywhere.
5. `window.__WM_DATA_PROVENANCE__` is populated on every quote resolution; `console.debug` fires (silenced in production build via a `__DEV__` gate is acceptable if that's the house style).
6. `STALE` state fires on socket-drop within 5s and clears on reconnect; a pulsing outline (1.2s ease-in-out) is the only added motion — no other animation.
7. **Screenshots at 360×800, 390×844, 834×1194, desktop** on `/charts` showing badges in `LIVE` and `DELAYED` states minimum. Same viewport-clamp caveat as prior Micah verdicts applies for mobile-pixel sign-off; desktop proof is deliverable at close.
8. Grayscale screenshot of each state remains legible.

## 7. Never in scope
- Changing which provider serves which symbol (Forge lane).
- Changing the actual delay assumptions in `priceSource.ts` — this is a labels ticket.
- Renaming `PriceSource` union values in `src/lib/priceSource.ts:14` (that's the internal `source` type — keep it as-is; only the `label` output changes).
- Adding a fifth state (e.g. `THROTTLED`, `PARTIAL`). If the truthful state cannot be one of the four, file a follow-on ticket — do not invent copy in this pass.
- Changing broker connection UI (that's WM-BROKER-P0-01c, my earlier spec — different surface).

## 8. Filed by
Micah, 2026-08-07 before market open. Nehemiah: insert row in `ACTIVE_TASK_QUEUE.md`, dispatch Noah. Sentinel: live-verify grep + Founder-tab check post-implementation.
