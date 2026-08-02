# SENTINEL REOPEN / RETURN — WM-VP-P0-01 (`e06ade9`): Session VP POC volume reads 0.00 on crypto

**Date:** 2026-08-02 ~00:10 CDT · **Reviewer:** Sentinel (Opus) · **Supersedes:** my APPROVE in `2026-08-02-sentinel-wm-vp-p0-01-verdict.md`. · **Verdict: RETURN against `e06ade9`.**

## Reviewer error acknowledged
My prior APPROVE checked "renders + no console error + cross-provider shape." I saw the BTC POC readout `0.00` and **misread it as a delta label** rather than the POC *volume*. It is the volume, and it is wrong. Correcting to RETURN. This is why numeric-readout criteria (below) are now mandatory for any future APPROVE.

## Reproduction (confirmed by Sentinel on authenticated prod, this session)
- Symbol **BTC**, timeframe **15m**, WM Session VP **ON** / WM Fixed VP **OFF**.
- Histogram has shape; labels **VAH 63,100 / VAL 62,530** render; **POC 62,862.50 readout = `0.00`**.
- Chart header shows candle volume **`V 0.001`** (base-currency BTC units).
- **Cross-symbol control:** TSLA 15m same session → POC **`12.7k`** (non-zero, correct). Only crypto breaks. Screenshot evidence captured (BTC POC `0.00` zoom; TSLA POC `12.7k` zoom).

So: bar *shape* is partially present but the *volume aggregation/readout* is 0 for crypto → "bars ≠ numbers."

## Root-cause hypothesis (routed to Forge, not a Sentinel diagnosis)
Crypto candle `volume` arrives as a **base-currency float** (e.g. 0.001 BTC) and is either (a) floored/rounded to `0.00` by the readout formatter, or (b) summed to ~0 while bar height is derived from a different quantity (prints/price-time), or (c) the Alpaca crypto tape doesn't populate `volume` at all. `sessionVP.ts` aggregation + readout formatting is the suspect surface. Forge owns the actual root cause.

## Numeric-readout acceptance criteria (a future APPROVE MUST verify — not just "renders")
1. **POC volume > 0** whenever a histogram is drawn.
2. **sum(all bins) > 0** and equals the visible histogram area (totals reconcile).
3. **VAH and VAL price bins each carry non-zero volume.**
4. **Cross-asset:** verified on ≥1 crypto (BTC) **and** ≥1 equity (TSLA) — crypto is the failing class, so it is mandatory in the repro set.
5. Volume formatting is honest for small base-currency floats (show real magnitude or quote-notional; never a misleading `0.00` beside a non-empty profile).

## Assembly-line routing (owned by Sentinel per DEC-011 — not escalated)
- **RETURN `e06ade9`** on the crypto numeric readout. The F-A "no independent fetch" architecture stays (still correct); this is a volume-aggregation defect layered on top.
- **→ Forge:** root-cause the crypto-volume source/formatting (dispatch `2026-08-02-sentinel-to-forge-vp-crypto-volume-zero.md`).
- **→ Noah:** fix after Forge's contract.
- **→ Sentinel:** re-verify against the 5 numeric criteria above (crypto + equity) before any new APPROVE.

## Status
WM-VP-P0-01 → **REOPENED, RETURN.** NO-GO on the VP numeric readout until the criteria pass on crypto.
