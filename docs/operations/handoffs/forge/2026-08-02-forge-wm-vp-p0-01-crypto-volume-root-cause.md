# WM-VP-P0-01 (reopened) — Crypto Session-VP shows shape but 0 volume · ROOT-CAUSE (Forge)

**From:** Forge (Principal Architect) · **Date:** 2026-08-02 · **Repo HEAD:** `499e504`
**Type:** Architecture root-cause + evidence gate + contract for Noah. Forge does not ship (DEC-008/DEC-012).
**Founder proof:** BTC 15m — WM Session VP renders the price ladder (shape) but POC reads ~0 volume. TSLA (equity) is correct. Sentinel reopened `e06ade9`.

---

## 1. What the VP does with volume (verified — the VP is not the bug)

`e06ade9` made the VP a **pure projection** of the chart's candles (`src/lib/sessionVP.ts`). It faithfully renders whatever `Candle.volume` it is handed:

- `selectSessionCandles` **filters `c.volume > 0`** (`sessionVP.ts:68`). If every crypto bar had `volume === 0`, the result is empty → "No reported volume", **not** shape. The Founder sees *shape*, so **some volume is arriving** — but small/mis-unit.
- `buildSessionLevels` distributes `candle.volume` across bins; POC total = Σ of a base-unit quantity.
- The panel formats POC as `fmt(pocLevel.total)` (`WMSessionVP.tsx:347`): `fmt(n) = n>=1000 ? k : String(n)`. For a fractional crypto quantity (e.g. `0.0043` BTC per bin) this prints a near-zero string; for `0` it prints `"0"`. Either way it reads as "0 volume" against equity share-counts.

**Conclusion:** the VP is correct. The defect is that the **canonical `Candle.volume` (and `TapeTick.size`) for crypto is either zero-populated or carried in a base-asset unit that is not comparable to equity share volume.** This is an upstream / contract defect, not a projection defect.

## 2. Evidence gate — trace `Candle.volume` per crypto provider (assigned owner, read-only)

Same discipline as `WM-CHART-P0-01A`: do not guess which provider zeroes volume — **measure it.** For **BTC 15m** through each path MainChart can use for crypto, record the raw `volume` field reaching `sessionVP`:

| Provider path (crypto) | Source line (MainChart / route) | `volume` field | Unit | Populated? | Result |
|---|---|---|---|---|---|
| Yahoo (`/api/yahoo`, BTC-USD) | `MainChart` crypto→Yahoo fallback (`:348`) | `json.v[i]` | base? | unknown—not yet measured | |
| Finnhub crypto (`BINANCE:BTCUSDT`) | `MainChart:239,255` | `json.v[i]` | base | unknown—not yet measured | |
| Alpaca crypto bars | alpaca route crypto bars | `b.v` | base | unknown—not yet measured | |
| Exchange direct (Coinbase/Kraken/BinanceUS/Gemini) | `exchange/route.ts:73,84,92,100,108` | kline vol col | base asset | unknown—not yet measured | |
| Live tape `TapeTick.size` (crypto WS) | `useWebSocket` → VP `foldTape` | `size` | base | unknown—not yet measured | |

For each: is `volume` present and > 0? In what unit (base asset BTC, quote USD, or trade-count)? Attach numbers. **This table is the gate — Sentinel approves the fix only against measured values.**

## 3. Decision tree for the fix (pick after §2 measures)

- **Case A — volume present but base-asset unit (e.g. 8.4 BTC/bar):** *not* a bug in magnitude, but it prints tiny. **Fix = presentation contract:** the VP volume is legitimate; format crypto volume with asset-aware precision (show `8.4 BTC` / `2.1 BTC` POC, not floored) and/or convert to quote-notional (`volume × price ≈ USD`) with an explicit unit label. **Do not fabricate share-style integers.**
- **Case B — volume zero-populated on crypto bars (provider doesn't carry it):** **Fix at the canonical `Candle` contract / adapter level** — the adapter must populate real `volume` from a provider that carries it, or mark the bar's volume `unavailable`. The VP must **not** invent volume.
- **Case C — no real bar volume anywhere for crypto, but live tape has size:** **VP tick-count fallback with explicit honesty label.** Build the profile from trade **count** (or summed `size`) and label it `"count-based (no reported bar volume)"` — never present a count as share/again volume silently (truth rule §5). This reuses the existing `buildTapeLevels` path; the only new work is the honest label + unit.

**Canonical rule to add:** `Candle.volume` has a declared **unit per asset class** (equity = shares, crypto = base asset, futures = contracts). Shared state must carry the unit or a typed `volumeUnavailable`; the VP renders unit-aware and never floors a real fractional quantity to `0`.

## 4. Acceptance contract (Noah → Sentinel)

- §2 trace table filled with measured BTC 15m values before any code.
- Crypto Session VP shows a **non-zero, unit-labeled** POC volume that matches the measured provider values (Case A/B), **or** an honest `count-based`/`unavailable` label (Case C) — never a silent `0.00` when volume exists.
- Equity (TSLA) VP unchanged (no regression to the share-volume path).
- `selectSessionCandles`' `volume > 0` filter reconsidered for the count-based path (Case C) so a legitimately-tapeless-but-ticking crypto symbol still profiles.
- Pure-logic unit tests in `sessionVP.test.ts`: fractional crypto volume renders non-zero + unit; zero-bar-volume + tape → count-based labeled profile; equity path unchanged.
- **Sentinel numeric re-verify:** read the POC/VAH/VAL and Session-vol readouts on BTC 15m live and confirm they equal the measured provider volume (or the honest fallback), and that TSLA still reads correct share volume.

## 5. Scope
No provider upgrade, no new interval work (that's `WM-CHART-P0-01A`). This ticket fixes the **crypto volume contract + honest VP rendering** only. `WMSessionVP.tsx` projection model from `e06ade9` stays; the change is unit-aware volume + honest fallback, not a re-architecture.

**BATON → Noah** after §2 evidence lands: implement per §3 Case that the measurements select; cite this handoff in commits.
