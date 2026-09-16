# WM PRO — SHIFT BATON H · 2026-09-16

## A GUARD THAT MEASURES SOMETHING ADJACENT IS NOT A GUARD

Continues baton G (`WM-PRO-SHIFT-2026-09-16-G-A-SENTINEL-THAT-NAMES-A-FILE-LOSES-THE-LAW`).

---

## WHAT LANDED

| commit | slice |
|---|---|
| `b869d18` | a block that names three laws and proves one retires the question |
| `03af10b` | a delta bubble's identity was an index into a lattice the market redraws |

Both pushed. `main` is clean and **0 ahead** of `origin/main`.

---

## FINDING 1 — the Founder's trio was claimed in two places and enforced in one

The 2026-09-12 truth-surface law is **role + asOf + source**. The describe block
in `heroTruthSession.test.tsx` had carried that name since it was written, and
`HeroTruth.tsx:432-436` carries a comment claiming the trio is complete. Every
assertion in the block covered SOURCE only.

Measured, not argued. Two edits to `HeroTruth.tsx` — deleting `{style.label}`
from the quality badge and gating the chronology block behind `false &&` — left
the full suite at **665 files / 7971 tests, EXIT=0**. The deck could have
shipped with no readable role verdict and no observation-age line, and nothing
in ~7,900 assertions would have objected.

> A block that NAMES three invariants and proves one is worse than a block that
> names one, because it retires the question.

### The part worth carrying forward

The first version of the new ROLE guard **did not fire.** Re-running the attack
against my own fix gave 3 failures where 5 were expected. The break had landed —
`grep -n "BROKEN"` confirmed line 321 — so the test was at fault:

```
toContain("Live")  ← satisfied by  aria-label="TSLA 15m — market state Live"
```

The word was still in the document while being absent from the screen. A sighted
trader would have had a glyph and a hex colour, and the suite would have reported
the law satisfied.

Fixed by matching the rendered **text node** (`/>Live</`) and giving the
aria-label its own separate test, so the non-visual path stays guarded rather
than standing in for the visual one. Re-verified: **4 of 6 fire on the break.**
The two that hold are correct and were checked, not assumed — the aria-label test
guards a path the break did not touch, and the positive control asserts
*discrimination between states*, which survives because the glyph and colour
still differ.

This is the same class as baton G's grain tile, where six file-level tests would
all have passed with the shell no longer painting it. **A check that measures
something adjacent to the thing that matters is not a check.**

---

## FINDING 2 — a delta bubble's identity was an index into a moving lattice

`levelIdx` is an offset into a lattice laid over `[barLow, barHigh]`. On a LIVE
bar that window moves: every new high or low re-ranges it, changes
`bucketCountFor`, and renumbers every bucket. Measured on one forming bar, base
150:

```
t1  bar[150.00,150.02]   150.00→L0             150.02→L5
t2  bar[150.00,150.02]   150.00→L0  150.01→L2  150.02→L5
t3  bar[150.00,150.06]   150.00→L0  150.01→L1  150.02→L3   150.06→L8
t4  bar[149.97,150.06]   150.00→L3  150.01→L4  150.02→L5   150.06→L9
```

The renderer built its spawn/dedupe key from that index. Two silent failures fall
straight out of the table:

- **DOUBLE-SPAWN.** The 150.02 zone is L5 at t2 and L3 at t3, so the same price
  zone spawns a second bubble.
- **SUPPRESSION**, the worse one. At t4 the 150.00 zone becomes L3 — already
  claimed at t3 by a *different* price. The key is in the set, so a real
  aggressor zone never draws. No error, no gap, just evidence missing from the
  chart. §5 SYSTEM TRUTH LAW.

Identity now lives in `deltaBubbleLevelKey`, keyed on the owning price, at parity
with the sibling `bigTradeLevelKey` — which has always been correct, and whose
existence was the clue that the two paths answered identity differently.

### The index key was the right fix for a defect that no longer exists

This is the part that would have been easy to get wrong in either direction. The
inline comment defended the index honestly:

> *"Two buckets can round to the same displayed price on a tight bar; keying by
> price suppressed the second bubble and lost its aggressor volume."*

That was **true** — for the `priceLevel` semantics of the time, when the field
carried a bucket CENTRE. It stopped being true when `priceLevel` became
`ownerPrice`, the heaviest real tick in the bucket: bucket assignment is a pure
function of price, so buckets partition the price axis and cannot share an owning
price. Proven across tight, wide, futures, sub-dollar and zero-range bars rather
than argued in a comment, because it is the load-bearing premise of the whole
change.

So the fix was not "the old author was wrong". The fix is that **the premise
moved underneath a correct decision, and nothing re-derived it.**

### The stale Sentinel had been REQUIRING the defect

`deltaBubbleBinning.test.ts` asserted the old key as literal source text. It went
red at the moment the bug was fixed — it had spent that entire period requiring
the defect to remain.

It was **not** re-pointed at the new formula; that repeats the mistake one layer
over. Removed, with the history documented in place, per baton G's rule and the
THESIS_GEOMETRY precedent. The property (`a zone keeps its identity while the
bar's window moves beneath it`) is asserted in the owner's own tests; the
adoption Sentinel holds MainChart to delegating. Two owners, two questions, no
third copy.

### The new gate immediately caught me

The adoption Sentinel forbids the old key shape anywhere in `MainChart.tsx`. It
fired on my own explanatory comment, which quoted the dead formula verbatim —
exactly the *"unreachable duplicate of an IDENTITY formula is a loaded gun"*
hazard the big-trade cull site already warned about in prose. The gate was right;
the comment was reworded.

### Revive-attempt

Restoring the index key turns the regression red **by name**:

```
step 3: the 150.01 zone changed identity (dt:…:L2 -> dt:…:L1);
the renderer would spawn a second bubble for one price zone
EXIT=1
```

The test also carries a **positive control** asserting the lattice genuinely
renumbered during the sequence, so it cannot silently stop exercising drift and
keep passing on nothing.

---

## RECORDED HONESTLY — investigated and NOT defects

Both were live suspicions that measurement killed. Recorded so the next reader
does not re-open them.

**The `cap` fallback.** `computeDeltaBubbleLevels` does
`Math.max(1, Math.floor(cap) || 1)`, and the module documents that at cap 1 the
both-sides guarantee breaks by design. If the pref ref were ever unset the chart
would silently show one bubble. It cannot be: `deltaLevelsPrefRef` is
`useRef<number>(7)` and line 1240 clamps to `[5, 7, 10, 15]`.

**The arg-order swap** the adoption Sentinel names as its own blind spot
(`barLow`/`barHigh` are adjacent same-typed positional params, invisible to
`tsc`). Measured rather than assumed: when ticks span the bar — the common case —
a swap is a **complete no-op**, because the self-widening window heals it
exactly. When ticks are narrow it perturbs only `levelIdx`; `priceLevel`, `bid`,
`ask` and `delta` are unchanged. **It cannot corrupt a displayed price.** The
production call site is correct. A 26-call-site refactor to an options object was
considered and rejected as more risk than it removes — but note the swap is now
*less* dangerous than before, because identity no longer rides on `levelIdx`.

---

## STATE AT SEAL

- `main` @ `03af10b`, pushed, **0 ahead**.
- **665 test files / 7981 tests passing.** `tsc --noEmit` **EXIT=0**. Both run
  UNPIPED — a pipe masks the exit code.
- Test count arithmetic: 7971 → 7977 (+6 trio guards) → 7981 (+5 identity,
  −1 retired stale Sentinel).
- Untracked and deliberately left alone: `scratchpad/`, baton
  `WM-PRO-SHIFT-2026-09-13-X-ROOM-MEASURE-AND-AUTHORITY.md`.
  `public/founder-room-sample.html` shows modified — written by a test run.

### Live-verification status — read this before claiming anything about prod

**These commits are pushed but NOT LIVE.** `npm run deploy:cf` is Founder-blocked
(denied by the auto-mode classifier, not to be worked around), so
`wealthymindsetspro.com` reflects an **earlier deploy**.

Neither slice was live-verified this shift, and the reasons differ — stated
rather than blurred:

- **The trio guards** are assertions about `HeroTruth`'s rendered markup. Baton G
  already measured that surface on `localhost:3000/command-deck` and recorded the
  trio present at `y=30 / y=252 / y=448 / y=648`. This shift changed no render
  behaviour there — it only added the objection that was missing. Nothing new to
  observe.
- **The delta-bubble fix is canvas.** It has no DOM, so there is no probe that
  can witness a bubble at a pixel. The evidence is the pure-function regression
  plus its revive-attempt, and that is the honest ceiling for this change. A
  bubble rendering at the wrong pixel remains outside what any test here can see
  — the adoption Sentinel says so in its own header, and that limit is unchanged.

---

## OPEN / BLOCKED

- ~~**Delta Bubbles level ownership**~~ — **CLOSED.** Identity moved to the
  owner, proven by property + revive-attempt, adoption gated.
- **Live VP render geometry proof** — still open. Same canvas-has-no-DOM ceiling
  as above; needs a different instrument, not another unit test.
- **paper execution state machine realism** — open.
- **Decision Memory sealing** — zero production callers. Architectural. Surface
  it; do not rush-wire.
- **executionConnectivity** — orphaned, not a live defect; `/readiness`
  discloses it honestly.
- **Gate 4 responsive device proof** — BLOCKED: programmatic window resize does
  not take effect, `outerWidth` stays pinned.
- **`/journal` detail canvas** — BLOCKED: 0 journal entries.
- **Deploy** — BLOCKED on the Founder. Nothing sealed here is on prod.
