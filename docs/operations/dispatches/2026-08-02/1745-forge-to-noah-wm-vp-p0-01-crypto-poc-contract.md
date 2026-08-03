# FORGE → NOAH — WM-VP-P0-01 (crypto POC=0.00) implementation contract

**From:** Forge (Principal Architect) · **To:** Noah (Implementation) · **Time:** 2026-08-02 ~17:45 CDT
**Repo HEAD:** `f1ca9cd` · **Type:** Implementation contract, assembly-line handoff.
**Sentinel-reopened at:** `961e7aa` (WM-VP-P0-01 RETURN — POC=0.00 on BTC crypto, TSLA equity correct)
**Forge audit:** `docs/operations/handoffs/forge/2026-08-02-forge-wm-vp-p0-01-crypto-volume-root-cause.md` (shipped `9e56585`)
**Predecessor fix APPROVED:** `e06ade9` (F-A/F-C closed live per `499e504`) — do not touch, this is a different defect.

---

## What Sentinel found

BTC 15m: Session VP renders the price ladder (shape) but POC reads ~0 volume. Equity (TSLA) is correct. Founder is on futures/crypto tonight and Discord is watching.

## Why this is NOT a VP-projection defect (do not touch `sessionVP.ts` logic)

`e06ade9` made the VP a pure projection of the chart's candles (`src/lib/sessionVP.ts`). Verified in §1 of my audit:

- `selectSessionCandles` filters `c.volume > 0` (`sessionVP.ts:68`). If every crypto bar had `volume === 0`, the panel would show *"No reported volume"* — no shape. Founder sees shape → some volume is arriving.
- `buildSessionLevels` distributes `candle.volume` faithfully.
- The panel formats POC as `fmt(pocLevel.total)` (`WMSessionVP.tsx:347`) — `n >= 1000 ? k : String(n)`. For fractional crypto (e.g. `0.0043` BTC per bin) this prints a near-zero string. That reads as "0 volume" against equity share-counts.

**Conclusion:** the VP is correct. The defect is that **canonical `Candle.volume` for crypto is either zero-populated or carried in a base-asset unit that is not comparable to equity share volume.** This is an upstream / contract defect, not a projection defect.

---

## Non-negotiable Step 0: evidence gate before any code

Same discipline as WM-CHART-P0-01A (measure, don't guess). For **BTC 15m** through every crypto path `MainChart` can use, record the raw `volume` reaching `sessionVP`:

| Provider path (crypto) | Source line | `volume` field | Unit | Populated? |
|---|---|---|---|---|
| Yahoo (`/api/yahoo`, BTC-USD) | `MainChart:348` crypto→Yahoo fallback | `json.v[i]` | ? | ? |
| Finnhub crypto (`BINANCE:BTCUSDT`) | `MainChart:239,255` | `json.v[i]` | base | ? |
| Alpaca crypto bars | alpaca route crypto bars | `b.v` | base | ? |
| Exchange direct (Coinbase / Kraken / BinanceUS / Gemini) | `exchange/route.ts:73,84,92,100,108` | kline vol col | base asset | ? |
| Live tape `TapeTick.size` (crypto WS) | `useWebSocket` → VP `foldTape` | `size` | base | ? |

Read-only probes. **Attach the numbers to the ticket before writing the fix.** Sentinel approves only against measured values.

**This table is the gate. Do not skip it — it decides which Case (A/B/C) below is right, and the fixes are structurally different.**

---

## Decision tree — pick the Case after Step 0

### Case A — volume present but base-asset unit (e.g. 8.4 BTC/bar)
Volume is real; presentation is wrong.

**Fix:** presentation contract only. Format crypto volume with asset-aware precision (show `8.4 BTC` / `2.1 BTC` POC, not floored). Or convert to quote-notional (`volume × price ≈ USD`) with an explicit unit label. **Never fabricate share-style integers.**

### Case B — volume zero-populated on crypto bars (provider doesn't carry it)
Provider is lying by omission.

**Fix at the canonical `Candle` contract / adapter level:** the adapter must either populate real `volume` from a provider that carries it, OR mark the bar's volume `unavailable` (typed `volumeUnavailable`). The VP must **not** invent volume.

### Case C — no real bar volume anywhere for crypto, but live tape has size
The bar path is barren; the tape has real data.

**Fix:** VP tick-count fallback with explicit honesty label. Build the profile from trade **count** (or summed `size`) and label it `"count-based (no reported bar volume)"` — never present a count as share/volume silently (truth rule §5). Reuse the existing `buildTapeLevels` path; the only new work is the honest label + unit.

---

## Canonical rule this ticket adds

`Candle.volume` has a declared **unit per asset class** (equity = shares, crypto = base asset, futures = contracts). Shared state must carry the unit OR a typed `volumeUnavailable`. The VP renders unit-aware and never floors a real fractional quantity to `0`.

---

## Acceptance evidence Sentinel will check

1. **§0 trace table filled** with measured BTC 15m values before any code. Attach values to the ticket.
2. **Crypto Session VP** shows either:
   - a **non-zero, unit-labeled POC volume** that matches measured provider values (Case A/B), OR
   - an honest `"count-based"` / `"unavailable"` label (Case C).
   - **Never** a silent `0.00` when volume exists.
3. **Equity (TSLA) VP unchanged.** No regression to the share-volume path.
4. **`selectSessionCandles`' `volume > 0` filter reconsidered** for the count-based path (Case C) so a legitimately-tapeless-but-ticking crypto symbol still profiles.
5. **Pure-logic unit tests in `sessionVP.test.ts`:**
   - fractional crypto volume renders non-zero with unit
   - zero bar-volume + tape → count-based labeled profile
   - equity path unchanged
6. **Sentinel numeric re-verify live:** POC/VAH/VAL and Session-vol readouts on BTC 15m equal the measured provider volume (or honest fallback), and TSLA still reads correct share volume.

---

## Scope discipline

- No provider upgrade. No new interval work (that's WM-CHART-P0-01A).
- The `e06ade9` projection model stays — do NOT re-architect `WMSessionVP.tsx` or `sessionVP.ts`.
- The change is unit-aware volume + honest fallback at the `Candle.volume` contract layer + the VP's format function.
- Cite the audit handoff `2026-08-02-forge-wm-vp-p0-01-crypto-volume-root-cause.md` in commits.

## Coordination

- Assembly-line: this contract → Noah code → Sentinel verify → next.
- Sentinel is expected to run the same numeric re-verify on BTC 15m + TSLA 15m after your commit.
- DEC-008 / DEC-012: Forge does not ship this.
- DEC-011: no ping to Founder. Escalate through Nehemiah (dep) or Elias (scope) if blocked.

**BATON → Noah.**
