# WM PRO COLOR AUDIT — 2026-08-09 (M13 + M17)

**Method:** live inspection of `/charts?TSLA` at 1910×784 via computed-style enumeration.
**Instrument:** `mcp__claude-in-chrome__javascript_tool` walking 1,099 visible DOM elements.
**Prior anchor:** Micah design spec `b6fdb2a` — WM-COLOR-P0-01 "green semantic overload."

## Findings — element counts by role

| Color | background | foreground | border | Total | Verdict |
|---|---|---|---|---|---|
| Green | 13 | **162** | 2 | 177 | ⚠ Overloaded |
| Red | 44 | 33 | 3 | 80 | OK |
| Gold | 0 | 0 | 0 | 0 | ✖ Absent — semantic gap |
| Blue (WM Neon accent) | 6 | 52 | 1 | 59 | OK |

Non-semantic (dark/light/neutral) not tallied.

## Green semantic overload — the specific collision

Observed on the audited page, **all rendered in the same emerald hue at the same visual weight**:

1. **Positive price change** — watchlist +chg%, ticker +chg%, "REGIME BULL +2.96% today". Semantic: *good direction*.
2. **Live data status** — `● ALPACA • LIVE` chip. Semantic: *trustworthy*.
3. **Active toggle** — `WM Fixed VP`, `WM Session VP` when engaged, `15m` selected. Semantic: *ON*.
4. **Call-to-action** — `Connect Broker / Trade` button. Semantic: *primary user action*.
5. **Broker P&L up** — `LONG 5 +$33.72` label. Semantic: *your trade is winning*.
6. **Positive market breadth** — S&P 500 `+45.00 (+0.58%)`, NASDAQ, DOW indicators. Semantic: *market up*.

**Consequence:** at a glance during a stressful market moment, "is this GREEN telling me my trade is winning, that data is live, or that a button is available?" is not answerable in <200ms. Bible §26 requires colour to carry ONE dominant meaning at each visual weight.

## Recommended discipline (per Bible §26)

- **Green** = truth about direction. Reserve for price change, market breadth, P&L on a position.
- **Blue (WM Neon accent)** = user action + focus. Move CTAs (`Connect Broker`), toggle-on state (`15m` selected, `WM Session VP`), and interactive-highlight to blue.
- **Cyan / soft green** (lighter, no chroma) = data-status LIVE. Not the same green as price up.
- **Gold** = warning / caution (currently unused — reintroduce for `DELAYED` data, `CAUTION` steward state, `ACCEPTABLE LOSS`).
- **Red** = truth about loss / rejection / stop-loss. Reserve strictly — do not use for "delete" chrome.

## Red — currently OK but at risk

44 backgrounds is high compared to green backgrounds (13). Confirmed samples are watchlist down-tick rows. Not overloaded today; watch for creep as new features add red for "cancel" / "delete" / "error" chrome which would collide with "your position is losing."

## Gold — semantic gap

Zero elements render in gold today. Bible §26 spec calls for gold to mean *caution / delayed / pending confirmation*. Currently the `YAHOO DELAYED` chip renders in **yellow** which is close but sits in the same visual weight as green. Recommendation: bring the true Bible §26 gold in for the DELAYED state, keep it saturated so it reads apart from the emerald.

## Immediate remediation candidates (visual, non-blocking)

| Element | Today | Proposal | File |
|---|---|---|---|
| `Connect Broker / Trade` button | emerald bg + emerald fg | WM Neon blue bg + white fg | `src/components/chart/ChartToolbar.tsx` |
| `15m` (active timeframe) | emerald outline | WM Neon blue outline | `src/components/chart/ChartToolbar.tsx` |
| `WM Session VP` active | emerald bg | WM Neon blue bg | `src/components/chart/ChartToolbar.tsx` |
| `YAHOO DELAYED` chip | yellow bg | gold bg with darker text | `src/lib/priceSource.ts` |
| `● ALPACA • LIVE` chip | emerald dot | keep emerald but decrease weight (smaller dot + lighter text) | `src/lib/priceSource.ts` |

## Not this ticket

- Actual code changes (belongs to WM-COLOR-P0-01 implementation ticket, follows this audit).
- Dark/light theme audit — different scope.
- Focus-ring / hover-state accessibility — Micah A11Y scope.

## Confidence

**HIGH.** Evidence: live computed-style enumeration of 1,099 visible DOM elements against a running `/charts?TSLA` session; findings reproducible via the identical `javascript_tool` call in another one-thread session.
