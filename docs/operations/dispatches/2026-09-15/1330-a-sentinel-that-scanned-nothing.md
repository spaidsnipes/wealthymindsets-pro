# A Sentinel that scanned nothing must not report "clean"

**Commit:** `a41b759` · **File:** `src/lib/ops/sentinelsProveTheyScanned.test.ts`
**Gates:** `vitest run` 585 files / 6761 tests PASS · `tsc --noEmit` EXIT=0

---

## The defect, stated plainly

A large family of Sentinels in this repo works by scanning a set of files and
asserting the violations are empty:

```ts
const files = walk(SRC_ROOT).filter(...);
for (const f of files) { if (bad(f)) violations.push(f); }
expect(violations).toEqual([]);
```

That shape has one silent failure mode. If the scan ever stops finding the files
it means to police — a moved test, a renamed directory, a changed extension set,
a `resolve(__dirname, "..", "..")` that no longer lands on `src/` — then
`violations` is `[]` for the most boring reason imaginable, and the gate passes
GREEN forever.

**A Sentinel policing nothing is indistinguishable from a Sentinel finding
nothing wrong.** That is the whole problem. From the outside, both are a green
checkmark.

## This is not hypothetical

| # | Occurrence | Status |
|---|---|---|
| 1 | Lane J — the `/paper` contract-multiplier guard passed GREEN while CL1! had no point value | real, recorded in `vpRenderGeometry.test.ts`'s header |
| 2 | 2026-09-15 — the first `paperExecutionRealism` page guard passed after the rendered `<ExecutionRealismNote />` was deleted, because the *name* still appeared inside a component nobody rendered | real, found earlier today by REVIVE |
| 3 | Pointed `TruthStatusChip.enforcement.test.ts`'s `SRC_ROOT` at `src/lib/auth` — a real directory, wrong tree | deliberate demonstration |

Occurrence 3 is worth reading twice. The Sentinel reported:

```
Test Files  1 passed (1)
Tests  1 passed (1)
EXIT=0
```

…while guarding a directory that is not the one it claims to guard. Nothing in
that output tells you anything is wrong.

## Correction to this morning's dispatch

`1230-gate-list-reconciliation.md` concluded the vacuous-Sentinel worry was
"a one-off, not a rot." **That framing was too generous and is corrected here.**

It is accurate only about the narrow population I had swept at the time —
Sentinels asserting `toContain` a component name. It is *not* accurate about the
failure mode generally, which has now occurred twice for real. A ledger that
shades in the comfortable direction is how a ledger stops being read.

## What was measured

Using the detector's own definitions, not an approximation:

- **584** test files in `src/`
- **77** scanning Sentinels that assert emptiness
- **26** of those never prove their scan found anything

An earlier hand-rolled count said 88 / 28. The TypeScript detector — which
strips comments before matching — found two of those files (`heatmapAggregateTruth`,
`paperOrderStateMachine`) contain no emptiness assertion at all. **The tool was
right and my count was wrong, and the numbers in the file were corrected to the
tool's answer before shipping.**

## The cure is a ratchet, not a rewrite

Failing all 26 today would produce a red suite nobody can land. The repo already
states why that is self-defeating — from `deltaVPGeometry.adoption.sentinel.test.ts`:

> a gate that cries wolf on unrelated code is a gate someone deletes.

So the 26 are **frozen as recorded debt**. The gate fails only when the class
**grows** — a new scanning Sentinel must prove it scanned. And a second test
fails if a listed file has since been *fixed* but left on the list, so the number
on screen stays true in both directions.

What counts as proof: `toBeGreaterThan(n)`, `toBeGreaterThanOrEqual`,
`not.toHaveLength(0)`, or an explicit positive control. The exact form does not
matter. What matters is that **an empty scan must FAIL rather than pass.**

## REVIVE ledger (§22, Edit-only)

| Revive | Method | Result |
|---|---|---|
| A new unguarded scanner appears | Replaced `expect(found.length).toBeGreaterThan(0)` with `expect(found.length >= 0).toBe(true)` in `authRoutes.test.ts` | **FAILED BY NAME** — `THE GATE: no NEW scanning Sentinel may skip proving it scanned`, naming `lib/authRoutes.test.ts` |
| This file's own scan drifts | `SRC_ROOT` → `resolve(__dirname, "..", "..", "lib", "auth")` — the exact drift that left `TruthStatusChip` green | **FAILED BY NAME** — 3 of 4, incl. `expected 2 to be greater than 150` |

Both restored byte-identical; `git diff --stat` empty before commit.

### The finding inside the second revive

Under the drift, **`THE GATE` itself still passed.** Of course it did — scanning
the wrong tree finds no offenders. Only the vacuity guards fired.

That is the lesson generalised: **the gate alone is vacuous. The guard on the
gate is what catches drift.** A meta-Sentinel that policed unguarded scanners
without guarding its own scan would be the joke writing itself.

## What this atom does *not* claim

This is test infrastructure. **It has no trader-visible pixel, and no screenshot
of wealthymindsetspro.com would prove anything about it.** The honest proof is
the gate run and the two revives above, and that is the proof offered. No live
observation is claimed because none is available.

## Gate status after this atom

| §13 gate | Status |
|---|---|
| Delta Bubbles level ownership | CLOSED (measured 2026-09-15) |
| Paper execution state-machine realism | SUBSTANTIALLY ADVANCED |
| Decision Memory sealing | SURFACED, intentionally unwired — do not rush-wire |
| executionConnectivity orphaned | NOT A LIVE DEFECT — `/readiness` discloses honestly |
| Live VP render geometry proof | OPEN — a canvas has no DOM; the owner documents why |
| Gate 4 responsive device proof | BLOCKED |
| `/journal` detail canvas | BLOCKED — 0 journal entries |
| **Vacuous-scanner class** | **RATCHETED — frozen at 26, can only shrink** |
