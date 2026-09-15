# The gate list was stale — four of seven are not what they say

**Date** 2026-09-15 · **Kind** reconciliation, measured not assumed

---

## Why this exists

The §13 open-gate list is handed to each shift iteration verbatim. Three of its
entries describe work that is **already done**, and one describes a blocker that
is **real but permanent**. Every iteration that trusts the list spends its first
minutes re-deriving the same conclusion.

This records what was actually measured, with the evidence, so the next
iteration starts from truth instead of from the list.

---

## Gate by gate

### 1. Delta Bubbles level ownership — **ALREADY CLOSED**

Owner, arithmetic tests and an adoption Sentinel all exist
(`deltaBubbleLevels.adoption.sentinel.test.ts`, `deltaBubbleBinning.test.ts`).
Nothing to do. **Remove from the list.**

### 2. Decision Memory sealing has zero production callers — **ALREADY SURFACED, correctly**

The instruction is *"architectural — surface, do not rush-wire."* That has
already been done, and done well. `decisionMemoryReachability.test.ts` carries:

- `BLOCKER: the decision-memory write path has zero production callers`
- `BLOCKER: the store's only ingress has no production writer, so it is provably empty`
- `the read path IS wired — three production consumers, path-qualified`
- `the receipt DISCLOSES the unwired capability rather than implying a pending one`
- `the detector is not vacuous and can see a point-free reference` ← a
  non-vacuity guard, which is the thing most Sentinels forget

Verified independently: `sealDecision`, `appendManagement`, `attachOutcome`,
`attachReview` and `amendDecision` have **zero** non-test callers. The only
references are docblocks describing the gap.

**This gate is in its correct state.** It is open because it *should* be open —
it needs a decision surface before it needs a wire. **Do not wire it to close
it.** Leave on the list, marked *surfaced, intentionally unwired*.

### 3. `executionConnectivity` orphaned — **NOT A LIVE DEFECT**

`/readiness` discloses the state honestly. Confirmed. Leave, marked
*disclosed, not a defect*.

### 4. Paper execution state-machine realism — **SUBSTANTIALLY ADVANCED TODAY**

See baton `WM-PRO-SHIFT-2026-09-15-PAPER-TRUTH-THREE-ATOMS.md`. Fill price,
fill staleness, queue priority, spread and size are all owned and rendered. The
remaining surface is partial fills and rejects, which are **not simulated and
not claimed to be**.

Additionally verified this iteration, from use: the order ticket is **already
correctly gated**. `disabled={!readiness.actionable}` with the button reading
**"WAIT FOR VERIFIED QUOTE"** — so a trader cannot commit against a degraded
quote, even though the ticket still displays a last price. That lane is honest.
No work invented there.

### 5. Live VP render geometry proof — **OPEN, and the owner says why**

`deltaVPGeometry.adoption.sentinel.test.ts` is worth reading as a model. It
closes the *adoption* half — the arithmetic cannot walk back into the draw loop
without failing by name — and its header states plainly what it **cannot** see:

> a canvas has no DOM, so neither `measure-experience-geometry.mjs` nor a
> `renderToStaticMarkup` test can reach it

It also carries a FALSE_RIPENESS guard (`expect(BLOCK.length).toBeGreaterThan(1500)`)
so the assertions cannot pass vacuously against a stubbed dispatch arm.

**The claim and the gate are the same size.** That is the correct state for a
half-closable gate. Open.

### 6. Gate 4 responsive device proof — **BLOCKED, permanently by this route**

Programmatic window resize does not take effect; `outerWidth` stays pinned.
**Do not retry by another route.**

### 7. `/journal` detail canvas — **BLOCKED**

0 journal entries exist to render.

---

## One thing checked and found clean

After the fill-realism atom exposed a **vacuous Sentinel** — one that asserted a
selector was *named* in a page rather than *rendered* — the obvious worry was
that the pattern was systemic across ~230 source-text Sentinel files.

It was swept. **It is not systemic.** The scan for "asserts a capitalised
identifier via `toContain` but never asserts `<Identifier`" returned almost
entirely legitimate hits — constants, tickers, status labels — with only a
couple of vocabulary tests that assert page *wording* and correctly have no
element to pin.

Recorded as a **one-off, not a rot.** No sweep was manufactured to look busy.
The standing rule from it still holds for all new work:

> **Consulting a selector is not rendering its answer.** An adoption Sentinel
> asserts the rendered element, not the imported symbol.

---

## Suggested replacement list for the next iteration

| gate | state |
|---|---|
| ~~Delta Bubbles level ownership~~ | **closed — remove** |
| Decision Memory sealing | surfaced, intentionally unwired — *do not wire* |
| `executionConnectivity` orphaned | disclosed, not a defect |
| Paper execution realism | advanced; only partial-fills/rejects remain, unclaimed |
| Live VP render geometry | open — adoption half closed, live half unreachable by DOM |
| Gate 4 responsive proof | **BLOCKED** — do not retry |
| `/journal` detail canvas | **BLOCKED** — 0 entries |
