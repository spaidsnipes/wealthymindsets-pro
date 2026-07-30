# FORGE HANDOFF — WM-STATE-P0-01 Markov Engine (deterministic core)

**Date:** 2026-07-29 · **Employee:** Forge · **Ticket:** WM-STATE-P0-01
**Repo:** `spaidsnipes/wealthymindsets-pro` · **Branch:** `main` · **Commit:** `e0a5ed7` (fresh commit; earlier attempt `a4f8f5d` was dangling after a concurrent-session reset)
**Status:** **PARTIALLY COMPLETE — deterministic core shipped, UI wiring deferred (see §6). Awaiting Sentinel verification.**

---

## 1. Reconciliation

Session-start instructions said to "continue WM-CHART-P0-01," which is a stale reference — that
ticket is CLOSED at `d2ea511` (Sentinel verified 2026-07-28, DB-V/V-006). The uncommitted
architecture doc I wrote at the end of the previous Forge session
(`docs/WM_MARKOV_CONFLUENCE_ARCHITECTURE_2026-07-29.md`) targeted `WM-STATE-P0-01`, which was
unclaimed BACKLOG, so I claimed it and shipped the deterministic core.

No file overlap with Noah's active work (`WM-CHART-P0-03` on `/api/*` routes and `MainChart.tsx`
provider maps). This ticket touches only new files in `src/lib/`.

---

## 2. What shipped

Files added under `e0a5ed7`:

| File | Lines | Purpose |
|---|---|---|
| `src/lib/markov.ts` | 297 | Pure engine — classify · count · normalize · steady state · edge |
| `src/lib/markov.test.ts` | 292 | 22 tests: fixture, golden, determinism, honesty gates, timeframe sensitivity |
| `docs/WM_MARKOV_CONFLUENCE_ARCHITECTURE_2026-07-29.md` | 253 | Design + independent verification of the blueprint |

**Deliberately not shipped:** `ChartsDashboard.tsx` HUD wiring, `heatmaps/page.tsx:280` migration
of the existing scalar `computeMarkovState`. Both surfaces are shared with Noah's active
`WM-CHART-P0-03`. Splitting the ticket here is what keeps the two seats from colliding on the
same file, and matches the ticket's Sentinel-quoted position ("better to ship it late and
validated than on Friday and fabricated").

---

## 3. Design rationale

**The 56 → 60 drift is a property bug, not a UX bug.** Today's regime is a page-local function
of a scalar daily percentage; it cannot encode a timeframe and cannot be reproduced from its
inputs. Making it reproducible is the fix. The engine is therefore:

- **Pure.** No I/O, no clock, no RNG. `computeMarkov(bars, config)` is a function of its
  arguments and nothing else.
- **Deterministic.** Same input → byte-identical output. Test pins this over 20 runs on a
  500-bar fixture with `JSON.stringify` equality.
- **Discriminated union.** `MarkovResult = MarkovResultReady | MarkovResultUnavailable`. A
  percentage field is *structurally absent* on the unavailable path — a caller cannot read
  `.edge` on an insufficient-evidence result even by mistake.
- **Honesty gates first, not last.** Four typed reasons for refusing to publish
  (`no-threshold-configured`, `too-few-bars`, `too-few-transitions-total`,
  `too-few-transitions-current`, `current-row-unobserved`). Unobserved rows stay zero — never
  uniform 33/33/33, which would assert a measurement that was never made.

The two floors: `MIN_TRANSITIONS_TOTAL = 100`, `MIN_TRANSITIONS_CURRENT = 30`. Confidence is
`min(1, sqrt(currentRowSample / MIN) / 2)`, so it reaches ~0.5 exactly at the gate and is
monotonic and capped. Pinned by unit test — never a magic number in downstream code.

**The blueprint from `COMPETITOR_STUDY_LIVE_2026-07-29.md` was verified independently before
being used as a reference.** From the observed matrix I re-derived the steady state via left
eigenvector (numpy) and got 29.4 / 41.2 / 29.4 vs the panel's 29 / 42 / 29 — consistent within
whole-percent display rounding. Edge from the SIDE row = 12% − 1% = +11%, exact match. Only then
did I use it as the golden test fixture.

---

## 4. What is NOT proven

- **Threshold parameters.** The 41.2-vs-42 gap is explained by display rounding but is equally
  consistent with a slightly different underlying matrix. So the *structure* is verified;
  the *parameters* (particularly the bar-classification threshold used to build the matrix) are
  not. Step 1 remains the one genuine design decision and MUST be derived per timeframe from
  our own historical returns — I refused to fit it to a screenshot.
- **Real production behaviour.** Zero live-app verification of this code path — the engine is
  not yet wired to any rendered surface, so there is nothing to observe. Correct per this
  ticket's scope; incorrect if this were called "shipped." See §6.

---

## 5. Verification (per acceptance criteria)

| Criterion | How verified | Result |
|---|---|---|
| Switching timeframe provably changes computed inputs | `timeframe changes the computed inputs, not just the label` test — same bars, two thresholds → different matrices | **PASS** |
| `calculatedFor` present on every result | `calculatedFor is carried into every result` test | **PASS** |
| Insufficient history renders `unavailable`, never a guess | Four honesty-gate tests, one per typed reason | **PASS** |
| `minBarsForState` enforced | Sample-size floor tests | **PASS** |
| Thresholds validated against real data, not invented | Threshold stays `null` (`no-threshold-configured`) until derived — engine refuses to fabricate | **STRUCTURALLY ENFORCED** |
| Determinism | 20-run byte-equality test | **PASS** |
| Golden reference match | Steady state ≈ 29.4/41.2/29.4 from observed matrix (tolerance 0.005) | **PASS** |

**Repo gates:** `tsc --noEmit` 0 errors · `vitest` **78 passing / 5 files** (was 56 pre-session,
+22 markov) · `next build` clean **69/69 pages**.

No visual verification. The engine is a library module with no rendered surface — the
verification workflow that applies here is unit tests + typecheck + build, which all pass.
Wiring to a rendered surface is a separate ticket (§6) and *that* work will require the
screenshot standard.

---

## 6. Deferred to follow-on tickets (do not confuse with completion)

1. **UI wiring** — replace the HUD calculation in `ChartsDashboard.tsx:1137-1159` (regime from
   daily %) with the discriminated `MarkovResult`. Must integrate with `ChartContext`
   (`c53e429`) so `calculatedFor` gates rendering. Files overlap Noah's active `WM-CHART-P0-03`
   → deliberately not started.
2. **Migrate `heatmaps/page.tsx:280`** — remove the scalar `computeMarkovState` and route to the
   new engine. Same file-overlap consideration.
3. **Derive per-TF `sideThreshold`** — probe our own historical returns per `TFId` and blessed
   thresholds. Founder decision needed (architecture doc §7 Q1). Options: thirds-of-distribution,
   volatility-scaled (~0.5×ATR), or a fixed table.
4. **Feature-flag gate** — wrap the eventual UI wiring behind
   `NEXT_PUBLIC_MARKOV_ENGINE=v1` and keep the current display until then.
5. **Confluence Meter integration** — use `MarkovResult` as the reference component per
   architecture doc §4; explicit follow-on.

---

## 7. Concurrent-session commit race — resolved

Two concurrent sessions in the same working tree caused a race that combined this ticket's code
with another session's ops update into a single commit (`a4f8f5d`), then a subsequent
`reset HEAD~1` from that other session stripped my code files back out and left them untracked
on disk. My earlier handoff draft pointed at the doomed `a4f8f5d` SHA.

**Resolution this turn:** I re-verified the gates (`tsc` 0, `vitest` 78/78, `build` 69/69) on
the surviving working tree and committed the code cleanly as `e0a5ed7`, pushed immediately to
`origin/main` before another race could occur. All references in this handoff and the queue
have been updated to the real SHA. `a4f8f5d` remains as a dangling commit and is not reachable
from `main`.

**Process improvement for the bus:** two concurrent sessions in the same working tree can race
each other's commits and can silently reset each other's work. Worth a Sentinel decision on
whether concurrent sessions should use worktrees or an index-level lock. For now, my mitigation
is: separate code commits from ops commits, and push each immediately.

---

## 8. Preserved untouched

- `src/app/lounge/page.tsx` — long-running WIP from another employee, unrelated to this ticket.
- `src/components/chart/MainChart.tsx` and any file Noah's `WM-CHART-P0-03` touches — no overlap.
- The `Big Trades` bubble engine and `FootprintControls.tsx` — explicit stay-off per prior
  ATH message.

---

## 9. Next action

**Sentinel:** verify per §5. The golden test (`steadyState` matching the independently
reconstructed reference) is the sharpest single check; if that passes, the arithmetic is
correct. Determinism + honesty gate enforcement are structural (discriminated union), not
convention, so they hold as long as `computeMarkov` returns the declared type.

**Then Forge follow-on:** derive per-TF `sideThreshold` from our own historical returns, and
wire the engine to the HUD via `ChartContext` — once Noah's `WM-CHART-P0-03` lands.
