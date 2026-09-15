# BATON — /paper told the trader three things that were not so

**Date** 2026-09-15 · **Surface** `/paper` · **Gate** §13 paper execution state-machine realism
**Commits** `632ade5` `e2f338a` `c054b7c` · `4577376` `55aa3b5` · `aea1499` `6fd171a`

---

## The through-line

Three defects, one shape. Each was a place where `/paper` **said something
definite about a thing it had not measured** — and in every case the truth was
already written down somewhere a trader would never look.

| atom | the definite claim | what was actually true |
|---|---|---|
| win-rate | an opening counted as a **loss** | it had not resolved yet |
| position mark | an unquoted position rendered a green **`+0.00`** | the page knew nothing about it |
| fill realism | silence implied the fill was **real** | only the *money* was ever disclosed as fake |

The cure in all three was the same, and it is the rule worth carrying forward:

> **The cure for "we do not know" is to say so — not to pick a number that
> looks like knowing.**

---

## Atom 1 — win rate counted openings as losses

Commits `632ade5`, `e2f338a`, `c054b7c`.

An open position has no outcome. Folding it into the denominator as a loss
produced a win rate that fell every time the trader *entered a trade*. Now
unresolved trades are excluded and the exclusion is disclosed rather than
silently absorbed.

## Atom 2 — an unmarked position rendered a green +0.00

Commit `4577376`, dispatch `55aa3b5`.

`marketPx: prices[pos.symbol] ?? pos.avgPx` marked an unquoted position at its
own entry, the subtraction yielded exactly `0`, and `pos.unrealPnl >= 0`
rendered it **green** — in the colour reserved for "you are not losing", on the
money line, about a position the page had no price for.

Second head: `prices` is not the price Paper may act on. `readiness.price` stays
non-null across the STALE transition on purpose so the tape can keep rendering.
The money line consumed it anyway, while the **option branch fifteen lines below
in the same function** already called `actionablePaperQuotePrice` and refused to
synthesize a mark without one.

> **When one function contains two standards of proof for the same question,
> the weaker one is the bug.** Finding the disagreement was faster than
> reasoning about the math.

Cure: `paperPositionMark.ts` — a three-valued basis (`actionable` / `stale` /
`unmarked`), `number | null` everywhere, muted `—` for unknown (never red — "no
result yet" is not a loss), and a partial sum that is *disclosed*, not widened.

## Atom 3 — the money was disclosed, the fill never was

Commit `aea1499`, dispatch `6fd171a`.

Every disclosure on `/paper` says the **dollars** are fake. Not one said the
**FILL** was. That claim was written down twice — in `selectOrderFill`'s
docblock and `FillQueueBasisNote`'s — where no trader reads.

Cure: `paperExecutionRealism.ts` owns the two assumptions universal to every
fill with no other home — **no spread was crossed** (a trade print is not the
offer; every fill was at least the spread in the trader's favour,
systematically) and **size was free** (`PaperQuoteReadiness` has no bid, no ask,
no depth — size impact is not modelled badly, it is *uncomputable*).

Queue priority and quote age were deliberately **left out**: they have per-fill
owners that fire only on the fills they are true of, and hoisting them would
state them about fills they are not.

---

## The finding of the block — a Sentinel that proved nothing

**Consulting a selector is not rendering its answer.**

The first fill-realism Sentinel asserted that `/paper`'s source contains the
strings `selectExecutionRealism` and `describeExecutionRealism`. A REVIVE that
deleted `<ExecutionRealismNote orders={orders} />` from the orders tab — leaving
the component declared and the imports intact — **passed GREEN**.

The names were still there, inside a component nobody rendered. The trader saw
exactly the silence the atom exists to end, and the suite called it fine.

A guard that asserts an owner is *named* proves nothing a dead import does not
also prove. Every adoption Sentinel from here on asserts the **rendered JSX
element**, not the imported symbol.

---

## Gates

| | |
|---|---|
| `vitest run` | **584 files / 6757 tests, exit 0** |
| `tsc --noEmit` | **exit 0** |
| REVIVE §22 | every atom's defect re-introduced Edit-only, failed **by name**, restored byte-identical, re-run green |

---

## Live verification (not inferred — observed)

- **Position-mark atom**: bundle probe `hits:[{"2nvmyv5n8a_6a.js":["MARK:unmarked","MARK:staleAge","MARK:exclusion"]}]`. A pre-deploy probe returning `hits: []` was recorded first as a **negative control**.
- **Fill-realism atom**: bundle probe `hits:[{"0_1_n43y0j_vr.js":["No spread was crossed","Size was free","no order-book depth","easier than a real one"]}]`.
- **Screenshot**: `/paper` orders tab reads **"No orders yet."** with **no realism banner** — the wallpaper rule working, not a failure. The Order Ticket chip reads `ACTIVE DEGRADED · Observed 9/15/2026, 7:42:13 AM · 10m old` for NQ1!, which is precisely the non-actionable quote the position-mark atom governs.

**Honest limit:** the Founder's production book has **0 positions and 0 fills**.
No position row and no realism banner can be photographed there. A filled-book
pixel requires an isolated localhost dev instance. **No order was placed into
the live book to manufacture one.**

---

## §13 gate status after this block

| unknown | owner | rendered |
|---|---|---|
| fill price truth | `actionablePaperQuotePrice` | yes |
| fill staleness | `describeFillPriceAge` | yes, per fill |
| queue priority at a limit | `paperFillQueueBasis.ts` | yes, per fill |
| spread never crossed | `paperExecutionRealism.ts` | **yes, new** |
| size never moved price | `paperExecutionRealism.ts` | **yes, new** |
| position mark basis | `paperPositionMark.ts` | **yes, new** |
| partial fills / rejects | — | not modelled, **and not claimed** |

**Paper execution state-machine realism: substantially advanced.** The remaining
surface is partial fills and rejects, which are not simulated and are not
claimed to be.

## Other gates, recorded honestly

- **Delta Bubbles level ownership — already CLOSED.** Owner, tests and an adoption Sentinel all exist. No work needed; the gate list was stale.
- **Decision Memory sealing — OPEN by choice.** Zero production callers is architectural. It needs a decision *surface* before it needs a wire. **Do not rush-wire it to close a gate.**
- **`executionConnectivity` orphaned — OPEN, not a live defect.** `/readiness` already discloses the state honestly.
- **Gate 4 responsive device proof — BLOCKED.** Programmatic window resize does not take effect; `outerWidth` stays pinned. Do not retry by another route.
- **`/journal` detail canvas — BLOCKED.** 0 journal entries exist to render.
