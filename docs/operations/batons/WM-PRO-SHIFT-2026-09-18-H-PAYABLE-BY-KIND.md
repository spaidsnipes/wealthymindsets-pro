<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **shift baton** — a hand-off written at the end of one shift. Its filename names its own day. It was true
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

# WM PRO SHIFT — 2026-09-18-H

## A PAYABLE **KIND** IS NOT A PAYABLE **SUPPLY** — AND A FIX THAT LIVES ON ONE SURFACE IS NOT A FIX

Predecessor baton: `6fca69f5` (2026-09-18-G — THE SENTENCE SURVIVES THE JOURNEY).

---

## THE FINDING

Two findings, discovered in sequence, each surfaced by the LIVE PROOF of the one before it.

**1. Payability was being read off the wrong axis.**
`payableBy: "EVIDENCE"` classifies a node by **KIND** — does this node mint its own
evidence, or is it composed from other readings? It says nothing whatsoever about
**SUPPLY** — can the feed the trader is actually on deliver that evidence?

The previous atom removed the impossible instruction `Resolve regime` (a composition
no action can reach). Without a supply-side flag, the impossible instruction simply
**reappeared one node down the list**, at `direction` — where it is *harder* to spot,
because direction genuinely IS directly measured. It is measured from the per-trade
tape, and this feed does not carry that lane. The cell was telling the trader to do
something no amount of work on their part could accomplish.

**2. A LABEL IS A NAME, AND LOWERCASING A NAME CAN DESTROY IT.**
Once the right node was named, the sentence read `Resolve available r`. The `R` in
`Available R` is R-multiple. Lowercasing it destroyed the name. The defect was not
lowercasing — it was lowercasing **indiscriminately**. And the rule had **six live
call sites**, only one of which had been fixed.

---

## THE THREE ATOMS

| SHA | Atom | Shape |
|---|---|---|
| `4b4d97bf` | next thing: payable by kind is not payable on this venue | New `venueBlocked` supply-side flag, publisher-authored, threaded evidence → dimension → chain node → debt ledger → NEXT cell |
| `7edc2d35` | next thing: a label is a name, and lowercasing a name can destroy it | `inSentence()` — per-WORD rule, `/^[A-Z][a-z]+$/` → lower; everything else was capitalised on purpose |
| `99dcd9af` | label casing: one rule, six surfaces — the nest behind "available r" | `inSentence` MOVED down to `decisionPermissionCompiler` so `sampledLabelPhrase` and the NEXT cell share **one** rule |

### Why `inSentence` lives in the compiler, not in the NEXT selector

Two copies of a casing rule is exactly how one label starts reading two ways on one
screen — the disagreement defect this whole lane exists to prevent. The rule LIVES in
the lower-level module both consumers already depend on, and is re-exported from
`selectOneNextThing` so that cell's own guards can reach it without importing the
compiler directly.

### Who may raise `venueBlocked`

**Only a deriver that was handed a publisher-authored `evidenceGapNote`.** A deriver
may never raise it on its own initiative. Only the publisher sees BOTH lanes (bars and
ticks), so only the publisher can establish that bars ARE loaded while the required
lane is structurally absent. `undefined` means NOT ESTABLISHED — never FALSE —
because defaulting the other way would let transient silence masquerade as a
permanent venue limitation.

---

## LIVE PROOF

Production `https://wealthymindsetspro.com/charts?symbol=TSLA`, NEXT cell, observed
rendered text:

> **Resolve available R** — available R is the first directly-resolvable of 7 unpaid
> evidence nodes (+6 behind it). **1 of them cannot be resolved on this feed at all —
> they are measured directly, but this venue does not publish the lane they read.**
> 4 of them cannot be worked on at all — they are composed from other readings and
> clear on their own. Resolving it does not authorise entry — it removes one block.

| Observation | Proves |
|---|---|
| `Resolve direction` **GONE** from the cell | `4b4d97bf` — the venue-blocked node left the payable set |
| `"cannot be resolved on this feed at all"` clause present and **distinct** from the composed clause | `4b4d97bf` — two different reasons a node cannot be worked on, not conflated |
| 2 payable + 1 blocked + 4 composed = **7**, exact | `4b4d97bf` — no double-count in `derived` |
| Human-action branch correctly did **NOT** fire | `4b4d97bf` — a payable node still exists, so "Connect a per-trade data source" is not yet the next thing |
| `"available R"` — the R survived | `7edc2d35` |
| `destroyed_available_r: false`, `destroyed_clc: false` — neither lowercased form appears anywhere on the page | `99dcd9af` — all six surfaces |

Probe discipline: `innerText` / regex only. No `location.href`, no `outerHTML`
(both return `[BLOCKED: Cookie/query string data]` in this channel).

---

## MUTATION RECEIPTS

A guard that does not redden when the code it guards is broken is not a guard.

### `4b4d97bf` — three mutations, six named reds

| Mutation | Reds |
|---|---|
| compiler `if (n.venueBlocked === true)` → `if (false)` | `× THE SILENT FIELD` |
| consumer human-action branch disabled | `× THE WAIT WITH NO END`, `× THE MISLABEL`, `× THE SHRUNK LEDGER` |
| `- (debt.venueBlocked ?? 0)` dropped from `derived` | `× THE DOUBLE COUNT` |

**The first receipt was initially WEAK and is recorded as such.** The compiler mutation
alone reddened only 1 of 33 guards, because 9 of the 11 new guards build `EvidenceDebt`
literals by hand and never call `computeEvidenceDebt`. Two consumer-side mutations were
added to close it.

**`× THE RELOCATION` did not redden under either consumer mutation.** Investigated
rather than glossed: it asserts the headline does not match
`/resolve (direction|location|aggression)/i`, which holds regardless because that
fixture has no payable labels. Its true receipt is `× THE SILENT FIELD`, which asserts
the blocked node must have **LEFT** the payable set, not joined it. Recorded honestly.

### `7edc2d35` — 3 guards. ### `99dcd9af` — 3 formatter guards
`× THE DESTROYED UNIT`, `× THE OVER-CORRECTION`, `× THE SECOND RULE` — the last of
which asserts `sampledLabelPhrase(["Available R"], 1, {lowercase:true}) === inSentence("Available R")`,
i.e. it fails if the two surfaces ever diverge again.

---

## A FIXTURE THAT MODELS THE WRONG WORLD TESTS THE WRONG PRODUCT — TWICE MORE

Hit twice this block, on two different surfaces, both asserting `toContain("clc")`:

- `decisionPermissionCompiler.test.ts:139`
- `selectOneStory.test.ts:89`

**The tests were not catching the bug. They were PRESERVING it.**

The second one was surfaced **only by the full UNPIPED suite run**, not by the targeted
run. That is itself the argument for the full-suite gate.

---

## GATES

Run UNPIPED — a pipe masks the exit code.

```
tsc --noEmit                 EXIT 0
./node_modules/.bin/vitest run   EXIT 0
```

762 files · **9503 passed** · 2 skipped (9496 → 9500 → 9503 across the three atoms).

---

## WHAT WAS DELIBERATELY **NOT** BUILT

**Candle-derived direction/volatility needs its OWN calibration.** The current
thresholds (`VOLATILITY_LOW_MAX_PCT = 0.05`, `VOLATILITY_HIGH_MIN_PCT = 0.30`) are
tick-window numbers. A bar-derived reading needs ATR%-per-bar, not these. And
`deriveRegimeDimension` would need to learn that its two legs can arrive from
different evidence TIERS. Surfaced, not rushed — wiring a miscalibrated fallback
would replace an honest UNKNOWN with a confident wrong answer, which is worse than
the gap it fills.

---

## OPEN THREAD HANDED FORWARD

The live probe returned a debt phrase reading:

> `"need and did not match — more evidence will not change them. BALANCE, TREND_EXPANSIO"`

`need` is followed **immediately** by `and`. That points at an **empty label phrase**
being rendered on some surface. Not yet traced. This is the next atom.

---

## CARRIED BLOCKERS (unchanged)

- Gate 4 responsive device proof — programmatic window resize does not take effect, `outerWidth` pinned
- `/journal` detail canvas — 0 journal entries in the account
- Level-2 depth family (Assets 08/19/20) — licensed depth not available
- `executionConnectivity` orphaned — not a live defect; `/readiness` discloses it honestly
- Decision Memory sealing has zero production callers — architectural, surfaced not rush-wired
