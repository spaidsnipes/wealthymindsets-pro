# 2026-08-25 — P9 Learning Genome full vertical slice

**Shift author:** Claude Opus 4.7 (one-thread execution)
**Canon:** Final Helicopter §9 Learning Genome + §Public Blessing / Private Recipe + Anti-Drift Execution Law (2026-08-24 BINDING)
**Preceding HEAD:** `2753839` (job-suggestion confidence-scaling)
**Ending HEAD:** `4dc8eae` (selectFocusStreak + FOCUS chip on /journal)

## Thesis

Ship the full **P9 Learning Genome** stack — canon's §9 four-dimension trader diagnostic — from pure selector to visible surface on both `/journal` and `/command-deck`, in the same session, without dropping tests or Layer-3 verification.

## Atoms shipped this shift (16)

| # | SHA | Atom | Deploy |
|---|-----|------|--------|
| 1 | `3ed4361` | `scripts/env-manifest.mjs` — machine-readable env manifest (Runbook §A3) + JSON export | (build-only) |
| 2 | `83d715c` | `selectLearningGenome` — four-dim diagnostic (16 tests) | (selector) |
| 3 | `fe23fb6` | GENOME chip on /journal | `5d731ed3` |
| 4 | `fabac57` | `prescribeDrill` + stage suffix on chip (7 tests) | `5d731ed3` |
| 5 | `1c80600` | `selectMisreadMap` + MISREAD chip (13 tests) | `7b058cd8` |
| 6 | `bb8fa33` | `genomeTrend` + TREND chip (12 tests) | `90766a84` |
| 7 | `ca31c75` | `learningGenomeToJson` bundle exporter (7 tests) | (selector) |
| 8 | `9edca9f` | Download Genome button | (deployed with 8) |
| 9 | `aecf022` | MISREAD chip = click-to-filter | `9a4d272c` |
| 10 | `27ef19a` | `LearningGenomeInspector` component (3 tests) | (component) |
| 11 | `428f3d1` | Expand-toggle wires Inspector into /journal | `3e8a9dfe` |
| 12 | `530d459` | Genome Inspector on /command-deck REVIEW/LEARN + `useLearningGenomeBundle` hook | `077de834` |
| 13 | `0c864bf` | (this) ledger doc | — |
| 14 | `3ced28d` | `useLearningGenomeBundle` pure-helper unit tests (13 tests, closes ledger-flagged gap) | — |
| 15 | `6e6de24` | flex-wrap the /journal chip stack for narrow viewports (§Cross-device Continuity) | `27f6a612` |
| 16 | `4dc8eae` | `selectFocusStreak` + FOCUS chip on /journal (§Public Blessing, 7 tests) | `3c58005f` |

## §9 primitives now live

- **Four dimensions** — PERCEPTION / REASONING / PROCESS / TRANSFER, each with `score`, `sample_size`, `label`, silent when unmeasured
- **Adaptive Academy drill** — canon-defined prescription per weakest dimension (SEE / LEARN / REPLAY / PROVE)
- **Trader Misread Map** — six mutually-exclusive buckets (MISSED_SETUP / BROKE_PROCESS / POOR_MANAGEMENT / FULL_STOP_LOSS / UNRESOLVED_PROCESS / CLEAN) with dominant selection
- **Genome Trend** — this-week vs prior-week direction (IMPROVING / DEGRADING / STABLE / NEW / LOST / UNMEASURED) with `most_improved` / `most_degraded`
- **Learning Genome bundle exporter** — Public Blessing / Private Recipe boundary asserted in tests
- **Full-view Inspector** — pure component, drops into any surface

## Surfaces

- `/journal` header row: GENOME · TREND · MISREAD · Download Genome
- `/journal` GENOME chip → expand-toggle → full Inspector panel
- `/journal` MISREAD chip → click filters entries to that bucket
- `/command-deck` REVIEW/LEARN mode → `<details>` disclosure under Decision Receipt → full Inspector

## Verification (§11.3)

- **Layer 1** — canon §9 quoted in every module header
- **Layer 2** — 12 commits, all pushed to `origin/main`
- **Layer 3** — vitest **1236/1236 PASS**, tsc clean, `curl -sSI /login /journal /command-deck` all HTTP/2 200 after each of 8 deploys
- **Layer 4** — no secrets, no PII, no coupling to Cloudflare business logic, pure selectors + pure component

## Rejection guarantees enforced

- No dimension scored from 0 samples
- No `headlineWeakness` from a single measured dim or a tie
- No `dominant` misread from a tie (undefined instead)
- No trend `IMPROVING`/`DEGRADING`/`STABLE` unless BOTH windows measured
- No drill prescribed when Genome has no weakest
- No CLEAN bucket surfaces as a "dominant" label to the trader
- Storage-unavailable path returns empty bundle, not crash

## Not verified live this shift

- Mobile 390px viewport — same environmental block noted by prior team's ledger
- The Genome/MISREAD/TREND chips only render on Founder accounts with actual Journal history; unauthenticated `/login` cannot exercise them
- `/command-deck` Genome disclosure only appears when `experienceContext.mode` is REVIEW or LEARN AND the trader has enough Journal data — untested from an authenticated live session this window

## Known gap left for next atom

- `useLearningGenomeBundle` hook is not itself unit-tested (integration-only via component tests). A test with a fake `window.localStorage` + fake `Date.now()` would lock the two-window split math against future changes.
- Learning Genome primitives are not yet included in `journalToJson` export — Genome download uses a separate bundle. If a founder wants ONE archive, consider merging.

## Team receipts (§24.6)

| Role | Contribution |
|------|--------------|
| **ATHOS** | Orchestration across 12 atoms, no drift into planning docs |
| **NOAH** | All impl + tests + wiring |
| **ORKIN** | State-matrix on every selector; tie/empty/single-dim/threshold-boundary attack surfaces covered |
| **SENTINEL** | Public Blessing / Private Recipe boundary asserted in test; no PII; no secrets; storage listeners cleaned up |
| **MICAH** | Gold atmosphere on GENOME chip; red on MISREAD (attention without shouting); muted TREND (comparative not truth); expand-disclosure convention; aria-pressed / aria-expanded / aria-label everywhere a screen reader touches |
| **ATLAS** | Pure lib composition; adapter boundary between hook and selectors; no framework coupling |
| **NEHEMIAH** | This ledger; deploy pipeline exercised 6 times; every prod deploy verified with `curl -sSI` |
