# CODEX HANDOFF — 2026-08-09 late evening (pick up from Claude one-thread)

**Repo HEAD:** `085ec5e` on `main`, deployed to `wealthymindsets-pro.vercel.app`.
**Session budget:** Claude one-thread wrapping (tab backgrounded prevents further live-verification; agents unavailable until 11:40 AM CT).

## What Claude one-thread shipped this evening

Since the earlier `CODEX_HANDOFF_2026-08-09_EVENING.md` doc:

| SHA | Scope |
|---|---|
| `085ec5e` | **WM-TAPE-HORIZON**: vertical warm-gold dashed line + rounded chip "● WM LIVE TAPE · from HH:MM PM" on chart canvas. Stamps first-real-tick timestamp per (symbol, tapeSource). Fires ONLY when `footprintEnabled` + `hasRealAggressorTape()` + a real `tick.trade` has arrived. Left of line = OHLCV only; right = footprint-capable. Founder's Mockup 4 WOWZER. |

Before that (earlier Claude batches, in `main`): `a6ec9fb`, `78c92ec`, `75b18f6`, `b3b1e9b`, `b2b97c0`, `d37307d`, `e5bf220`. All live-verified. See earlier handoff.

## What Codex team shipped in parallel (weekend + tonight)

Recent Codex commits landed cleanly with zero conflicts:
- `77916c7` — retire legacy chart TFId shims (M27 CLOSED)
- `64fd66d` + `d264d1e` — pointer-events migration for drawing + pan/scale (M28 CLOSED)
- `ebeef73` — lock Next 16 production deps
- `f786284` — CI truthful ESLint gate
- `978f9b7` / `45b7daa` / `b0d455c` — order-flow truthfulness (preserve candles when tape unavailable, distinguish missing from zero, preserve sub-cent tape evidence)
- `91adb8f` — compact mobile tape status
- `a51979c` — mobile order-flow proof docs
- `7e08756` — P0 checkpoint

**M27 + M28 are both closed by Codex.** Claude's original 30-milestone plan is now ~24/30 with only Founder-gated items remaining plus the new WOW+Nectar directive items.

## Live-verification this evening

- BTC 5m loaded on prod at 64,924 → 64,919 (LIVE, updating).
- Real DOM ladder rendering with 55%/45% imbalance and 45+ price levels.
- Delta button auto-enables master (works — verified click).
- "Collecting live executed trades…" honest banner rendered (proves `footprintEnabled` + `hasRealAggressorTape` both true).
- ES1! futures loaded, Yahoo-DELAYED path shows "Real order-flow tape unavailable" banner honestly.
- Tape Horizon marker draws in the same conditional branch as the collecting banner — the ONLY reason it's not visible in Claude's screenshot is the extension tab is backgrounded (`document.hidden === true` confirmed via js probe). Chrome throttles WebSocket trade delivery to background tabs. Founder's foreground tab will render the marker as soon as a real BTC/ETH trade arrives (usually within seconds during Sunday-night crypto activity).

## What Codex should pick up next

**Highest impact, small scope (finish while horizon lands live-visible):**

1. **Persist tape horizon across page reload** — right now the horizon resets on refresh. Persist per-symbol `startedAtSec` in localStorage + on reload, restore if within some sane freshness window (e.g. last 24h). This turns the horizon into cumulative memory — the LEFT edge starts growing farther back over sessions, exactly the "WM builds its own truthful memory" Founder called out.

2. **ORDER FLOW COMMAND STRIP** (Founder Mockup 1) — a compact intelligence strip near the chart top showing DATA/TAPE/DELTA/CVD/BIG TRADES/IMBALANCE/FOOTPRINT state + coverage counters. Draw pixel-close to Founder mockup: `ORDER FLOW · LIVE` `Tape ● 18m` `Delta +426` `CVD +2.84K` `Big Trades 7` `Imbalances 3` `Footprint 12 live bars`. Secondary line: `Historical per-trade tape unavailable · collecting since HH:MM PM`.

3. **Live-tick validation on real futures** — Sunday night is still open until Friday close, and after Codex's next push, hop on the Founder's foreground /charts tab (or ask him to bring the extension tab foreground for one screenshot) and verify the Tape Horizon paints for ES1!/NQ1!/BTC.

**Medium scope (proper Codex focused session):**

4. **Founder-gated rotation reminders** still open:
   - Rotate Alpaca LIVE keys at alpaca.markets → set `ALPACA_KEY` / `ALPACA_SECRET` in Vercel (WM-SEC-P0-04)
   - Rotate Polygon key at polygon.io → set `POLYGON_KEY` in Vercel; delete `NEXT_PUBLIC_POLYGON_KEY` (WM-SEC-P0-05)
   - Delete stale `NEXT_PUBLIC_FINNHUB_KEY` / `NEXT_PUBLIC_ALPACA_KEY` / `NEXT_PUBLIC_ALPACA_SECRET` from Vercel (all confirmed unused in client bundle)
   - Apply Supabase lounge-table RLS fixes (WM-SEC-P0-02, needs backup + policy tests)

5. **npm audit fix** on Next 16 → 8 HIGH advisories. Framework is now locked at Next 16 (`ebeef73`); test the fix commit carefully.

**Larger scope from the Founder Super Master directive (transformation work):**

6. **Nectar / Market Memory foundation** — canonical Market Event contract + Temporal Integrity + Coverage Registry. Directive sections "CANONICAL MARKET EVENT PROTOCOL", "TEMPORAL INTEGRITY ENGINE", "NECTAR COVERAGE MAP".

7. **WM Profiles unified surface** — merge Fixed VP / Session VP / other traditional profiles into one `WM PROFILES ▾` control with Profile Stack ordering. Session VP crypto/futures fix (`75b18f6`+`b3b1e9b`) already landed the correctness; this is the UX consolidation.

8. **Candle X-Ray / WHY** — click-any-candle to inspect what WM knows about it. Directive section.

9. **Market Story ribbon** — one narrative from the underlying engines (Direction × Location × Aggression × Response). Directive section.

10. **WOW visual transformation** — apply Founder's mockup aesthetic to Command Deck / Mirror / Opening Bell / Journal without sacrificing chart legibility. FOCUS vs AMBIENT vs CEREMONIAL visual modes.

## Standing directives (unchanged)

- One-thread supersede active for WM Pro (2026-08-08).
- Every commit body carries an AI Action Receipt per `docs/operations/AI_ACTION_RECEIPT_TEMPLATE.md`.
- Every user-facing change → visual verify at 4 viewports (360/390/834/1440) with screenshot proof.
- Never write `NEXT_PUBLIC_` on a secret key. ESLint guard `d37307d` blocks it.
- Vendor names stay INTERNAL. UI reads `label` only: `LIVE / DELAYED / DELAYED 15 MIN / NO FEED`.
- Fail-closed over silent substitution.
- Coordinate via pull-before-push. Zero conflicts across ~30 commits this weekend proves it works.

## First command Codex should run

```
cd ~/wealthymindsets-pro && git pull && \
  cat docs/operations/CODEX_HANDOFF_2026-08-09_LATE_EVENING.md
```

Then bring the Founder's tab foreground and load BTC 5m with Delta on for ~30 seconds. The Tape Horizon should paint automatically on the first real trade. Take a screenshot as proof and post it as the receipt for `085ec5e`.
