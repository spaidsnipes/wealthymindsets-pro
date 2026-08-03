# Doctrine addendum — WM-VP-P0-01 crypto POC contract

**Extends:** `docs/operations/dispatches/2026-08-02/1745-forge-to-noah-wm-vp-p0-01-crypto-poc-contract.md` (in `d6f74e1`, already published — this addendum adds the §7 Doctrine fields the pre-Doctrine contract did not spell out; **it does not replace anything**).
**Doctrine reference:** ATH Universal Product Doctrine (Drive `1kgOhR4702FT-bb1rc-5Z4rjcn-sDTJZzBV16jHXALZg`), §7 Product Architecture Requirements.
**From:** Forge · **Date:** 2026-08-03 · **Repo HEAD:** `7aedde0`
**Type:** In-flight compliance supplement. Assembly-line rule preserved — no new architecture item pulled; Noah's baton on the original contract stands.

---

## Core user problem and desired progress
A trader looking at BTC 15m Session VP currently sees the price ladder but a POC of ~0.00. They cannot use the profile because the volume readout says the market didn't trade. Desired progress: same trader sees an honest, unit-labeled volume that either matches what the provider reported (Case A/B) or an explicit "count-based" fallback (Case C) — **never a silent 0.00 when trades happened**.

## Resilience and recovery states
- **Provider drops mid-session** (Yahoo returns empty for a bar, then recovers): panel must not permanently lock into the last non-zero POC; it recomputes on the next canonical candle set.
- **Case switches mid-session** (bar volume was populated, then goes to 0 on a later bar): the honest label ("count-based" or "unavailable") appears on the affected bars; the session-level POC keeps the label of whichever regime dominates the visible window.
- **User navigates away and returns** (WOW Studio-style resumption): panel rehydrates from the chart's canonical candles; no stale POC from a prior symbol survives the switch — `dataVersion` gate already there from `e06ade9`.
- **Rollback path:** revert this ticket = single file (`sessionVP.ts` format layer + `Candle.volume` typing). No schema migration, no persisted state, no user-facing config change. Trivial rollback.

## Studio pipeline and definition-of-done
1. **Capture** — Step 0 evidence gate: measure BTC 15m volume across the 5 provider paths, attach numbers to the ticket.
2. **Diagnose** — Case A/B/C decision from measured values.
3. **Working version** — implement the selected Case; leave the projection model (`e06ade9`) untouched.
4. **Review** — pure-logic unit tests in `sessionVP.test.ts` (three named in original contract §4).
5. **Master** — cross-symbol check: TSLA VP shows correct share volume; BTC VP shows correct unit-aware volume or honest fallback.
6. **Release** — Sentinel numeric re-verify against measured provider values.
7. **Archive** — the §0 measurement table + Case decision goes into the ticket record so a future engineer knows *why* the code branched the way it did.

**DoD:** all six above complete AND Sentinel numeric re-verify passes AND no TSLA regression AND the measurement table is on file.

## KISS primary path and progressive-disclosure map
- **Primary (what the trader sees):** a single POC readout with a unit label. `8.4 BTC` (Case A), `12,340 shares` (equity), `"count-based (312 trades)"` (Case C). One number, one unit, one glance.
- **Progressive disclosure Layer 1:** hovering the POC surfaces the source provider (matches provenance-badge convention from `a223fc5`).
- **Progressive disclosure Layer 2:** the profile row itself shows unit-consistent volumes per bin.
- **Explicitly hidden:** the Case letter (A/B/C) is an engineering concept; the user never sees it. The label is what they see.

## Jeet Kune Do source synthesis
- **Studied:** TradingView's Session VP renders crypto with base-asset units and never floors to zero — that's the reference behaviour for Case A.
- **Absorbed:** unit-aware format + honest fallback pattern.
- **Rejected:** silently converting base-asset units to synthetic "share equivalents" (a common competitor shortcut that inflates apparent liquidity — violates truth rule §5). Also rejected: showing a raw ratio without a unit, which reads as "1.0" (ambiguous — is that 1 share or 1 BTC?).
- **ATH-added:** the `volumeUnavailable` typed state; the Case-C count-based fallback with an explicit label; the §0 evidence gate as a Sentinel-gated prerequisite.
- **Legal/IP boundary:** no proprietary VP code, algorithm, imagery, or terminology adopted from TradingView or DeepCharts.

## WOW moment
BTC 15m opens with a real POC value ("8.4 BTC · 96,320 USD" or the honest count-based equivalent). A trader who's been staring at `0.00` for a week sees a live, meaningful profile they can act on. **Doctrine mantra check:** *truthful in claims, human in purpose.*

## Truth and evidence labels
Every visible number carries at minimum: (a) the unit, (b) the source when hovered. Truth rule §5 stays: never a silent 0.00 when volume exists; never a fabricated integer where a fractional base-asset quantity is real.

## Accessibility, privacy, safety, human agency
- **A11y:** tabular-numerals for the POC readout (Bible §26); non-color indicators for the fallback state (icon + label, not color alone).
- **Privacy:** no new user data captured; no telemetry beyond existing chart-load metrics.
- **Safety:** no order-placement side effects (this ticket doesn't touch order flow).
- **Agency:** the user can compare providers via hover; the app does not hide which source drove the number.

## Failure modes / rollback / export / continuity
- **Failure — measurement gate skipped:** Sentinel rejects the PR. The gate is the fix's whole justification.
- **Failure — Case misidentified from measurements:** Sentinel numeric re-verify catches it (values won't match measured provider volume).
- **Failure — TSLA regression:** the three-test suite includes the equity-unchanged assertion.
- **Rollback:** single-file revert. No data migration.
- **Export:** N/A — no user-exported state added.
- **Continuity:** the projection contract from `e06ade9` continues; the addition is at the format + typing layer.

## Metrics for usefulness, quality, completion, retention, trust, learning
- **Usefulness:** POC readout is non-zero on BTC 15m during an actively-trading window.
- **Quality:** unit tests + Sentinel numeric re-verify pass; TSLA baseline unchanged.
- **Completion:** measurement table on file; Case decision recorded.
- **Retention:** N/A this ticket (no funnel change).
- **Trust:** Sentinel numeric re-verify + hover-source disclosure remove the "am I seeing real volume?" question.
- **Learning:** the measurement table becomes reusable evidence for any future crypto/futures volume ticket — Studio archive.

---

## What this addendum does NOT change
- The §0 evidence gate, Case A/B/C decision tree, acceptance criteria, tests, and scope from the original contract are authoritative.
- `e06ade9` projection model stays untouched.
- Noah's baton stands. This is a Doctrine-compliance overlay, not a spec revision.

## Coordination
- Cite the original contract AND this addendum in commits.
- DEC-011: no ping to Founder. DEC-008/DEC-012: Forge does not ship.
- Assembly-line: awaiting Noah implementation → Sentinel verify → next.
