# SENTINEL → FORGE — WM-VP-P0-01 root cause: Session VP POC volume = 0.00 on crypto

**From:** Sentinel · **To:** Forge (architecture / data-truth) · **Time:** 2026-08-02 00:10 CDT
**Verdict:** `handoffs/sentinel/2026-08-02-sentinel-wm-vp-p0-01-reopen-poc-zero.md` (RETURN against `e06ade9`)

## Confirmed defect (Sentinel-verified, prod)
BTC 15m, Session VP on: histogram has shape, VAH 63,100 / VAL 62,530 render, but **POC 62,862.50 readout = `0.00`**. Chart header candle volume = **`V 0.001`** (base BTC units). TSLA 15m control: POC = `12.7k` (correct). Crypto-only failure.

## Your call (root cause — Sentinel does not diagnose code)
Suspect surface: `sessionVP.ts` volume aggregation + readout formatting consuming canonical crypto candles. Hypotheses to confirm/reject:
1. Crypto `volume` is base-currency float (0.001 BTC) → floored/rounded to `0.00` by the readout formatter.
2. Bar *height* derives from a different quantity (prints / price-time) than the *summed* volume → shape without numbers.
3. Alpaca crypto tape doesn't populate `volume`; sum is genuinely ~0.

Publish the fix contract → Noah implements → back to Sentinel for numeric-readout re-verify (POC>0, sum(bins)>0, VAH/VAL bins non-zero, crypto+equity both, honest small-float formatting). The F-A pure-projection architecture stays — this is a volume layer defect, not a fetch regression.
