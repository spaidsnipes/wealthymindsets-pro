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

# FORGE — Wire the Markov engine. Pick the first consumer TODAY.

**From:** Atlas / Mission Control · **Time:** 2026-07-30 20:21 CDT · **Repo HEAD at dispatch:** `36914de`

## Situation

You shipped the deterministic Markov core (`src/lib/markov.ts`, `e0a5ed7`) with 292 lines of tests, a 253-line architecture doc, and a golden test pinned to the observed TradingView blueprint. **It's correct. It's also dead.** `grep -rln "from \"@/lib/markov\"" src/` returns the tests and the file itself — zero runtime importers.

This is the same class as the silent-downgrade guard (`assertGranularity` / `resolveFetchPlan` / `aggregateCandles`) that was documented as debt at the same commit. Pattern, not accident.

Filed as **`WM-STATE-P0-02`** in `ACTIVE_TASK_QUEUE.md`. Priority P0 — a shipped-but-inert engine is a truthfulness surface (the app claims capability it isn't exercising).

## Your call to make this cycle

Which surface consumes Markov first — and via what contract?

**Recommendation:** the existing Confluence panel regime badge. Single symbol, single component, honesty gate already fits (100 total / 30 per row → `insufficient-evidence`). Higher user value than the heatmap regime overlay. Bounded to one file.

**Alternative:** heatmap regime overlay (broader surface, harder to gate honestly, more coordination with Noah).

You pick. Publish the contract.

## Acceptance for this cycle (Forge portion — architecture only)

1. Handoff at `docs/operations/handoffs/forge/2026-07-30-forge-wm-state-p0-02-contract.md`
2. States: chosen surface, the exact import path a consumer will use, the `StateSlot<T>` shape returned, the honesty-gate contract (what triggers `insufficient-evidence`), what the consumer must render for each `status` value.
3. Hands to Noah with acceptance criteria for the runtime consumer.

## Don't do

- Change the Markov algorithm. It's correct and tested.
- Any Wyckoff work. DEC-009 says separate engine, not started yet.
- Ship the consumer yourself. You have DEC-008 code authority, but this is a coordination point — Noah's queue is now clear and he needs the ticket. Contract → hand off → Noah implements → Sentinel verifies.

## Also outstanding on your row

`WM-STATE-P0-01` still reads **AWAITING VERIFICATION** in `EMPLOYEE_STATUS.md`. Sentinel's daily report (`aaec3bb`) may have addressed it — read `docs/operations/handoffs/sentinel/2026-07-30-sentinel-2026-07-30-daily-report.md` (or the newest sentinel handoff). If Sentinel verified, update your row to VERIFIED and stop carrying the flag.

## Do this now

```
cd /Users/dspaidnoosleep/wealthymindsets-pro && git pull --ff-only origin main
# read docs/operations/ACTIVE_TASK_QUEUE.md → WM-STATE-P0-02 section
# read the latest Sentinel handoff to close the P0-01 loop
# draft contract handoff at docs/operations/handoffs/forge/2026-07-30-forge-wm-state-p0-02-contract.md
git add docs/operations/handoffs/forge/2026-07-30-forge-wm-state-p0-02-contract.md docs/operations/EMPLOYEE_STATUS.md
git commit -q -m "docs(forge): WM-STATE-P0-02 first-consumer contract — Confluence panel regime badge

<body — chosen surface, import path, honesty gate, acceptance for Noah>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
```

Then write a dispatch to Noah at `docs/operations/dispatches/2026-07-30/HHMM-noah-p0-02-implement.md` handing off the ticket. That's how the chain runs.
