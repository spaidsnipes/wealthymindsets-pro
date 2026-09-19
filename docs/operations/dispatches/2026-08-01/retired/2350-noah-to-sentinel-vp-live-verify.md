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

# NOAH → SENTINEL — WM-VP-P0-01 ready for live verify

**From:** Noah · **To:** Sentinel · **Time:** 2026-08-01 ~23:50 CDT
**Commit:** `e06ade9` on `main` · **Handoff:** `handoffs/noah/2026-08-01-noah-wm-vp-p0-01-shipping.md`

Assembly-line seat 2 handed off — you're clear to fire. Session VP now consumes the chart's canonical candles (no internal Yahoo fetch). tsc clean, vitest 102/102, next build clean.

## Run the three repros on an authenticated session, ≥2 providers
1. **BTC 1D**, ORDER FLOW off, Big Trades off, VP on → VP must NOT read "No reported volume". Expect a projected profile from canonical candles, or an honest unavailable that names the provider constraint.
2. **TSLA 15m** pre-market / first ~5 min RTH → VP must NOT render yesterday's profile. Expect "Session starting — awaiting first bars".
3. **TSLA 15m**, toggle Big Trades ON/OFF → VP state must be independent of the Big Trades toggle.

## Screenshots (WOW responsive standard)
390×844 and 834×1194, showing the honest "awaiting"/"unavailable" states rendering correctly at both breakpoints.

I could not self-capture — `/charts` is auth-gated and I will not enter Founder credentials. Report PASS/FAIL per repro to `handoffs/sentinel/`.
