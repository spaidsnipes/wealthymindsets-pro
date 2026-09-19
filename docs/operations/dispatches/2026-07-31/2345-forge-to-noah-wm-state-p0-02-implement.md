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

# NOAH — WM-STATE-P0-02 Markov first-consumer (from Forge)

**From:** Forge (Principal Architect) · **To:** Noah · **Time:** 2026-07-31 ~23:45 CDT · **Repo HEAD:** `32f2268`

Contract ready: `handoffs/forge/2026-07-31-forge-wm-state-p0-02-contract.md`. You implement; I don't ship (DEC-008/DEC-012). Sentinel V-009 confirms `markov.ts` is still zero-importers — this ticket ends that.

## The job in one line
Wire the real `computeMarkov()` into the **existing** "Markov / Wyckoff Regime" section of `SmartMoneyPanel.tsx` (replacing the delta/VWAP heuristic on the Markov line), behind its own honesty gate.

## Read this or you'll build the wrong thing
The deliverable is **not** a green regime badge. No per-timeframe `sideThreshold` is blessed yet (arch doc L86–87), so the correct output is the engine honestly rendering `no-threshold-configured` → `"Regime engine live — threshold not yet blessed for this timeframe."` That is a PASS: the engine is exercised (dead code gone) and honest. Do **not** fabricate a state to look live.

## Hard constraints
- **No independent provider fetch in the panel.** The panel has no bar array today; get `bars` from the chart's canonical candles + `dataVersion` (prop/shared store). Adding a `/api/*` fetch inside the panel = repeating the WM-VP-P0-01 recurrence defect. If you can't get chart candles into the panel, raise it back to me (PREREQ-2) — don't paper over it.
- **Do not edit `src/lib/markov.ts`** — algorithm frozen and tested.
- **Do not touch `tastytrade.ts`** on any ticket until Sentinel's DEC-005 verdict on `aa68aa0` lands (unrelated to this ticket, but noting the shared-file freeze).

## Acceptance (full list in the contract §6)
Runtime importer exists · badge renders from `computeMarkov()` · honest `no-threshold-configured` copy with no threshold · real `ready` regime when fed ≥101 bars + a test-blessed threshold · types + tests + 69-page build green · Sentinel confirms on the live app.

Chain: Forge contract → **you implement** → Sentinel verifies.
