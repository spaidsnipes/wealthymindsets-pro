# BATON — prices nobody traded (lane K)

GOVERNING CANON: "WM Pro — Operating System BUILD ORDER — Natural Language —
BINDING — September 3, 2026".

Commits sealed by this baton: `09a2df8`, `0d09acb`, `071198a`.

Gates at seal time, run unpiped: **381 test files / 3627 tests, `VITEST_EXIT=0`**;
**`TSC_EXIT=0`**.

Founder gates closed: **Delta Bubbles level ownership**, **Live VP render
geometry proof**. Both PROVEN live — see EVIDENCE below for the observation,
not an inference.

---

## FOUNDER_VISIBLE_DELTA

**The chart stopped drawing volume at prices the market never printed.**

Two separate overlays on the primary trading surface were each attributing
size to a price that did not happen. Different code, same lie.

### 1 — Volume Profile: a shelf above the bar's own high

`drawWMVP` bucketed each bar's range with

    const first = Math.floor(b.low  / tickSz);
    const last  = Math.ceil (b.high / tickSz);

`Math.ceil` on the high names the bucket **above** the one that holds it,
unless the high lands exactly on a grid edge. The grid is not the instrument's
tick — it is `rawRange / 320` — so it almost never does.

Every bar therefore deposited a share of its volume at a price it never
reached, and the error only ever pointed **upward**:

| bar spans | volume placed above its own high |
| --- | --- |
| 1 bucket | **50.0%** |
| 2 buckets | 33.3% |
| 6 buckets | 14.3% |

The tightest bars — consolidation, the exact place a trader reads the profile
to find acceptance — were corrupted the worst. POC, VAH and VAL are all
derived from that distribution, so all three were dragged up with it.

### 2 — Delta Bubbles: a bubble on a price nobody traded

The bubble binner reported `priceLevel` as the **bin's** synthetic edge rather
than a price that actually printed inside it, and used that float as the
bubble's identity. Same class of defect: a number rendered next to real size,
sourced from arithmetic instead of from the tape.

Now `deltaBubbleLevels.ts` owns it: `levelIdx` is the identity, `priceLevel`
is the **highest-volume real traded price** in the bin, ties resolved to the
lower price so the result is order-independent.

---

## ROOT CAUSE — one writer, and it was the untested one

`src/lib/vpEngine.ts` was a canonical, pure, timeframe-independent Volume
Profile engine with a 24-test suite and **zero production callers**. Meanwhile
`drawWMVP` computed its own grid inline with no coverage at all.

Two implementations of the same math. They had drifted. The tested one was not
the shipped one.

A tested module nobody calls is not coverage of anything the trader sees.

MainChart now delegates to the engine. `src/lib/vpRenderGeometry.test.ts` is
the Sentinel that stops the loop being re-implemented in the renderer again.

### The float-key trap, avoided on purpose

The renderer's draw loop reconstructs each row's price as `loKey + i·tick` and
looks it up in a Map. The engine emits `Math.floor(p/tick + 1e-9) * tick`.
Two different float expressions for the "same" bucket produce different
doubles, and a Map lookup by float identity then silently misses — a row that
draws nothing.

One canonical key form now: `gridKey(p) = Math.round(p/tick) * tick`, applied
on both sides. Verified across 10 tick sizes × 6 offsets × 320 buckets
(33,600 round trips, 0 mismatches) **before** relying on it.

---

## THE PART THAT MATTERS MOST — my own test was nearly vacuous

`0d09acb` shipped a render-geometry suite that looked thorough: six
hand-picked bar shapes across four price magnitudes, asserting no row is drawn
above the highest high.

Then the §22 revive-attempt reintroduced `Math.ceil` on the high — and **only
one of the six went red.**

The other five had highs sitting exactly on a grid edge, where `ceil === floor`
and the broken code produces the correct answer. Worked example, case 0
(`low 100.00, high 100.05`):

    range 0.05 → raw = 0.05/320 = 1.5625e-4
    mag  = 1e-4 → candidates [1e-4, 2e-4, 2.5e-4, 5e-4, 1e-3]
    nearest = 2e-4
    ceil(100.05 / 0.0002) * 0.0002 = 500250 * 0.0002 = 100.05   ← exact edge

I did not choose those five. The grid is derived from the range, so whether a
fixture lands on an edge is not something you can eyeball — and five of mine
did, by accident. **The suite was green for a reason that had nothing to do
with the code being right.** This is the third time in this codebase that a
detector has reported a clean bill of health while measuring nothing (lane J's
`/paper` contract-multiplier guard was the first for real).

It is also the exact trap already written down in the delta-bubble module
header: *the old form only looked correct on decimal prices because
floating-point error nudged the comparison just under.* I wrote that warning
and then walked into it in the next file.

`071198a` fixes the class, not just the instance:

- **`offGridHigh(lo, approxRange)`** *computes* a high at `k·tick + tick/2`
  instead of guessing one. Range and grid are mutually dependent — you need
  the tick to place the high, and the high to derive the tick — so it iterates
  to the fixed point.
- **FIXTURE GUARD** asserts every high really is mid-bucket and that
  `ceil(hi/tick) > floor(hi/tick)`. Without it, a future change to
  `chooseTickSize` could slide the fixtures back onto edges and the suite would
  go green forever while testing nothing.
- The leak assertion **collects every offender and asserts once**. A bare
  `expect` inside a loop aborts on the first failure, which hides *how many*
  shapes leak — and that count is precisely the signal that says whether the
  fixture set is carrying the proof or one lucky case is.

After the fix, the same revive fires on **6 of 6** mid-bucket shapes.

---

## §22 REVIVE LEDGER

Each defect was re-introduced deliberately and the guard confirmed red, then
restored and re-verified. Restores were `git checkout -- <file>` against a
clean tree — exact and verifiable — not `/tmp` backups.

| # | revived defect | guard that fired | restored |
| --- | --- | --- | --- |
| K | bubble `priceLevel` = bin edge | `deltaBubbleLevels.test.ts` | clean |
| L | bubble identity = float price | single-writer Sentinel | clean |
| M | binning forked back into MainChart | `deltaBubbleBinning.test.ts` | clean |
| N | `Math.ceil` on the bar's high | geometry suite — **6/6** shapes (was 1/6) | clean |
| O | `perBucket` / `isUpBar` back in MainChart | `vpRenderGeometry.test.ts` | clean |
| P | `offGridHigh` returns the grid edge | **FIXTURE GUARD** | clean |
| Q | Sentinel reads `vpEngine.ts`, not MainChart | **POSITIVE CONTROL** | clean |

Two of these deserve to be read closely, because in both cases the substantive
test **passed** while the thing it was supposed to prove was false:

- **Revive P** — with fixtures on grid edges, the geometry test went green.
  Only the FIXTURE GUARD caught it. That is the vacuity, reproduced on demand.
- **Revive Q** — pointed at the wrong file, *"MainChart does not re-implement
  the bucket grid"* passed against `vpEngine.ts`. Only the POSITIVE CONTROL
  caught it.

A Sentinel that stops reading its target reports "no problems" forever and is
indistinguishable from a clean bill of health. The positive control is the
first test in the file for that reason.

---

## EVIDENCE — live, observed, not inferred

Production bundle for `/charts`, fetched from `https://wealthymindsetspro.com`
and searched directly. Chunk `/_next/static/chunks/0c4qcrl673h_f.js`
(610,863 bytes), `etag: "208325436ec14f8f557bfd190bf61350"`.

The minifier inlined `computeProfileFromBars` into `drawWMVP`, so the engine's
own source strings appear in the chart chunk. Present, verbatim:

    "candle-estimated"                     ← vpEngine quality label; this string
                                             exists in NO other src file, and
                                             MainChart's import of @/lib/vpEngine
                                             was introduced by 0d09acb itself
    Math.floor(e/t+1e-9)*t                 ← bucketFloor, applied to BOTH edges
    +(e+t*n).toFixed(10)                   ← the engine's bucket loop
    d=e=>Math.round(e/c)*c                 ← the canonical gridKey
    p.indexOf(d(o.val)), p.indexOf(d(o.vah))  ← value area is the engine's
    `dt:${e.time}:L${t.levelIdx}`          ← delta bubble keyed by level index
    {levelIdx:e,priceLevel:h[e],bid:...}   ← DeltaBubbleLevel from the new owner

Absent:

    Math.ceil( <anything> .high )          ← 0 occurrences in the chunk

**Both fixes are live.** The defect is not in production.

### CORRECTION TO A STANDING ASSUMPTION

This shift had been operating on the belief that **production could not be
updated**, because `wrangler whoami` reports:

    Not logged in. Your auth token has expired and could not be refreshed,
    and the environment is non-interactive.

That is true, and it still blocks manual deploys and every wrangler
observability command. **It does not block shipping.** Production tracks
`main` on its own — commits pushed this shift are serving live, which the
bundle above proves directly.

The earlier framing ("prod serves the pre-fix bundle") was an inference from
the wrangler failure, never an observation. It was wrong. Recorded here so the
next thread does not inherit it: **check the bundle, do not reason from the
deploy tool's exit code.**

The expired token remains a real blocker for `wrangler tail`, deployment
listing, and any rollback. `wrangler login` in an interactive terminal is
still a Founder action. No `CLOUDFLARE_API_TOKEN` is to be written by an agent.

---

## FILES

| file | state |
| --- | --- |
| `src/lib/deltaBubbleLevels.ts` | NEW — pure owner of bubble binning + ranking |
| `src/lib/deltaBubbleLevels.test.ts` | NEW — 15 tests |
| `src/lib/deltaBubbleBinning.test.ts` | rewritten as single-writer Sentinel, 4 tests |
| `src/lib/vpEngine.ts` | unchanged — it was already correct; it just had no callers |
| `src/lib/vpEngine.test.ts` | 24 → 29 tests; geometry fixtures now computed, guarded |
| `src/lib/vpRenderGeometry.test.ts` | NEW — 5 tests, positive control first |
| `src/components/chart/MainChart.tsx` | delegates both overlays to their owners |

---

## HANDOFF — what is still open

Founder gates not closed by this baton:

- **Decision Memory sealing has zero production callers.** Architectural, same
  shape as the vpEngine orphan this baton just closed. Surface it; do not
  rush-wire it.
- **`executionConnectivity` orphaned.** Not a live defect — `/readiness`
  discloses it honestly. Leave disclosed.
- **Paper execution state machine realism.**
- **Gate 4 responsive device proof.** BLOCKED: programmatic window resize does
  not take effect, `outerWidth` stays pinned.
- **`/journal` detail canvas.** BLOCKED: 0 journal entries to render.

Carried blockers, unchanged: every `BrokerAdapter.submitOrder()` returns
`rejected` / `brokerOrderId: null`; the `SESSION HALTED` vocabulary does not
exist; paper state is localStorage (§12 wants a server store);
`/api/market-memory/coverage` returns 503 pending `SUPABASE_SERVICE_ROLE_KEY`.

Collision lock respected throughout: `ChartsDashboard.tsx`, `ChartToolbar.tsx`,
`globals.css`, `WM-PRO-EVENING-2026-09-03.md`, `scratchpad/` and
`chartPhoneControlReachability.test.ts` belong to another thread and were not
touched. Every commit staged files by name.

---

## THE LESSON, STATED PLAINLY

A test that passes tells you nothing until you have watched it fail for the
right reason. Three guards in this baton — the geometry suite, the FIXTURE
GUARD, the POSITIVE CONTROL — were each green while proving nothing, and each
one was only found by deliberately breaking the thing underneath it.

Write the revive before you trust the green.
