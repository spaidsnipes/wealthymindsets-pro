# MICAH DESIGN TICKET — WM-COLOR-P0-01: Green semantic overload on /charts and workspace family

**Author:** Micah (Experience / Accessibility / WOW Polish) · **Date:** 2026-08-03
**Repo HEAD at audit:** `5b94494` · **Lane:** design ticket only — Noah implements. No src changes here.
**Evidence source (verbatim binding):**
- **WM Pro Company Bible §26 (Design Language)** — "Green should not always mean 'good'; in markets it often means buy-side, positive change, live connection, or profit depending on context. **The exact meaning must be local and labeled.**" (Drive `1Yntm95DYMKnzNZ6AS5HNlMWdw75X15rPhlOOInBdKB0`.)
- **WM Pro Company Bible §25 (UI/UX Bible)** — "Non-color indicators for live, delayed, buy, sell, profit, loss, warning, and error states."
- **ATH Universal Product Doctrine §8** — "Original but understandable. Adaptive but disciplined. … Emotionally meaningful but never manipulative." A color that means four different things on the same screen violates *disciplined*. (Drive `1kgOhR4702FT-bb1rc-5Z4rjcn-sDTJZzBV16jHXALZg`.)

---

## 1. Confirmed collision — one green (`#00E88A`) doing at least 4 jobs on the /charts family

Grep at `5b94494`. Every hit is a **live-shipping component**, not dead code.

| # | Meaning | File · line | Evidence |
|---|---|---|---|
| A | **LIVE data provenance** (badge + dot) | `src/components/chart/MainChart.tsx:6614, 6623` (in-canvas HUD) | `color: b.live ? "#00E88A" : "#F5A623"` |
| B | **LIVE data provenance** (tape dot) | `src/components/layout/TickerTape.tsx:150` | `background: badge.live ? "#00E88A" : "#F5A623"` |
| C | **LIVE data provenance** (watchlist row dot) | `src/components/chart/WatchlistPanel.tsx:705` | same pattern |
| D | **LIVE data provenance** (live-header badge) | `src/components/chart/ChartsDashboard.tsx:671, 680` | same pattern |
| E | **Positive price change / up move** | `TickerTape.tsx:158`, `MainChart.tsx:6601`, `WatchlistPanel.tsx:713` (`#00C076`) | `text-wm-green` on ±% and change value; watchlist row uses a *different* green `#00C076` for the same "up" meaning — sub-collision |
| F | **Active / hovered ticker** (state, not directional) | `TickerTape.tsx:147` | `active ? "text-wm-green" : "text-wm-text group-hover:text-wm-green"` — "green = hovered" |
| G | **Data-source label decoration** (not directional) | `OptionsChain.tsx:171` | `dataSource === "fmp" ? "text-wm-green" : "text-wm-red"` — green means "this is fmp," red means "this isn't fmp." Bible §26 violated: meaning not local/labeled. |
| H | **Greek column-header decoration** (purely aesthetic) | `OptionsChain.tsx:252-262` | 10 `<th class="text-wm-green">` for Δ/Γ/Θ/V/OI/Vol/IV%/Bid/Ask — green as wallpaper |
| I | **Expiry selected state** | `OptionsChain.tsx:216` | `bg-wm-green/15 text-wm-green` |
| J | **Call-side ITM highlight** (bullish semantic) | `OptionsChain.tsx:292, 301-302` | `callITM ? "text-wm-green" : ...` |
| K | **Drawing tool active tint** (different green `#00D4AA`) | `LeftDrawingSidebar.tsx:91` | `activeColor = "#00D4AA"` — a 4th shade of green for a 4th meaning |

**A trader looking at the /charts surface right now sees:** a green dot on the tape (means live), a green number on the tape (means up), a green ticker name (means active), a green in-canvas HUD badge (means live again), a green change % in the header (means up again), and if the options chain opens, green Greek columns (means nothing, just decoration). Meaning is not local. Meaning is not labeled.

## 2. Why this is a §26 P0, not a §25 duplicate

WM-A11Y-BADGE-01 (from Micah's DEC-012 backfill Surface 1) addresses the **LIVE/DELAYED non-color cue** requirement — grayscale legibility, visible label without hover. That closes §25's "non-color indicators" for the provenance badge in isolation.

**This ticket is different.** WM-A11Y-BADGE-01 makes one usage legible; WM-COLOR-P0-01 addresses the **semantic overload across the surface** — the same token repeatedly meaning different things in the same screen family. Even if every individual usage has a paired text label, the *overloading itself* trains the user to stop trusting green as a signal at all. That is the "Green should not always mean good" clause literally.

## 3. Design decision — the three meanings green is allowed to keep

Rather than eight remediations, one policy. On the /charts family, `text-wm-green` and equivalent green tokens are permitted to mean **exactly one of the following, and the meaning is chosen per surface, not shared**:

| Allowed green meaning | Where it lives | Non-color cue required |
|---|---|---|
| **Positive price change / bullish direction** | change value, %, up arrow, bullish bar, bull-side option ITM | already paired with ± sign + arrow icon — keep |
| **LIVE data provenance** | provenance badge only | must carry the word "LIVE" (already scoped in WM-A11Y-BADGE-01) |
| **User-controlled state ON** (toggle active, drawing tool selected) | rail buttons, toggles | must carry `aria-pressed` (already shipped d81a592) + a shape/border cue, not color alone |

**Everything else loses green:**
- Data-source labels (`fmp`, provider names) → neutral text token, not green. Green ≠ "this source is fmp."
- Greek column headers → neutral text token. Purely decorative green training the user to ignore green.
- "Active ticker" (hover / focus state) → the state cue is `outline`/`background`, not a color hijack. Reserve green for direction.
- Any second shade of green for the same meaning (e.g. `#00C076` vs `#00E88A` both = "up") → collapse to one token from the design system.

## 4. Acceptance criteria (Noah verifies against these)

1. On `/charts`, `TickerTape.tsx`, `WatchlistPanel.tsx`, `MainChart.tsx`, `ChartsDashboard.tsx`, and `OptionsChain.tsx`, `grep -rn "text-wm-green\|#00E88A\|#00C076\|#00D4AA" src/` returns hits **only** in the three permitted categories in §3. Every other prior green use has moved to a neutral text/border token.
2. Provenance badge already carries "LIVE"/"DELAYED" text; if not, ship the WM-A11Y-BADGE-01 fix in the same commit.
3. Drawing tool active state keeps `#00D4AA` (spec §7 Class E — user-controlled ON), because it is already `aria-pressed` cued. No change.
4. `OptionsChain.tsx` Greek column headers use a neutral color; ITM highlight keeps green (allowed meaning: bullish direction) and adds a border/background cue so ITM is legible in grayscale.
5. No new green shade introduced. If a shade change is genuinely needed for contrast, file a separate design ticket for it.
6. **Screenshots at 360×800, 390×844, 834×1194, desktop** of `/charts` before/after showing the reduced green footprint. Grayscale screenshot must still communicate every trading-relevant state.

## 5. Never in scope
Changing what price data means. Introducing new color palette tokens. Changing the drawing rail's active tint (already correct). Any calc/data logic. This ticket removes green wallpaper; it doesn't repaint the app.

## 6. Related
- [[wm-color-p0-01]] (this) supersedes the color-overload observation from `WM-A11Y-BADGE-01` (WM-A11Y-BADGE-01 stays scoped to the single-badge non-color cue).
- Perf audit (Bible §27 — 60fps, drag <32ms, no long tasks >100ms) is **deferred**: requires live-tab `performance.getEntriesByType('longtask')` via connected Chrome; extension is currently transient. Will file WM-PERF-P0-0N as a separate handoff once the extension re-connects and I capture real numbers on the Founder's live session.

## 7. Filed by
Micah, 2026-08-03. Route to Nehemiah for `ACTIVE_TASK_QUEUE.md` insertion; primary implementation owner Noah; verifier Sentinel + Micah at all four viewports.
