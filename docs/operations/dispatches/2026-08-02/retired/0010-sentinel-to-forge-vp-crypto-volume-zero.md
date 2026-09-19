<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **dispatch** — an instruction issued for one day's work. Its filename names its own day. It was true
> on that day and is preserved as evidence of what was observed and decided
> then. Do not take a current action, diagnosis, release decision or task claim
> from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference below is a `GHOST_HOST` signal: the
> Vercel host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-19 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which
> until that day scanned only the top level of `docs/operations` and could not
> see this directory at all. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

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
