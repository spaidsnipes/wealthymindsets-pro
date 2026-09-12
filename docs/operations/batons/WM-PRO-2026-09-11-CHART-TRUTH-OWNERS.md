# Baton — chart truth owners (§13 gate block)

**Sealed** 2026-09-11, after `eaa7417`.
**Branch** `main`, pushed.
**Commits in this block** `d53abc6`, `a9f2982`, `eaa7417`.

---

## Read this first: NOT DEPLOYED

Nothing in this block is live on https://wealthymindsetspro.com.

Deploy is manual (`npm run deploy:cf` → `opennextjs-cloudflare build && deploy`)
and it is BLOCKED. Measured, not assumed:

```
$ wrangler whoami
Not logged in. Your auth token has expired and could not be refreshed,
and the environment is non-interactive.
$ echo "${CLOUDFLARE_API_TOKEN:-UNSET}"
UNSET
```

The standing directive asks for live verification on wealthymindsetspro.com
after each atom. That step could not be performed for any commit here, so
**no claim in this baton is backed by live observation.** Every claim below is
backed by the test suite and by the REVIVE results, which is a weaker and
different kind of evidence. Do not upgrade it in a later summary.

**Unblocks on:** the Founder running `wrangler login`, or exporting
`CLOUDFLARE_API_TOKEN` into the shift environment.

---

## What closed

### 1. `d53abc6` — the age of the price behind a paper fill

`/paper` booked fills with `ts: Date.now()` while the quote behind them could be
up to fifteen minutes old. `selectPaperQuoteReadiness` had already MEASURED that
age — the fill loop read `.price` and dropped `observedAt` on the very next
line. The durable ledger that Journal and Proof Lane read for realized R could
not distinguish a live fill from a quarter-hour-old one.

`Trade.quoteObservedAt` is now recorded, and the blotter renders either the age
or the words *"quote age not recorded"*. It stays OPTIONAL: a trade booked
without an observation time must be a MISSING KEY, not an explicit `undefined`
(persisted books are JSON-serialized and byte-compared; `undefined` changes the
shape going in and vanishes coming out).

**Explicitly rejected:** adding a slippage or spread model. Minting a plausible
number is the defect, not the cure. This atom records a measurement that was
already taken and then thrown away.

### 2. `a9f2982` — a block trade that vanished because two prints rounded alike

Big-trade bubbles rounded every print for display *before anything else
happened* — `priceLevel: +Number(px).toFixed(base > 100 ? 2 : 4)` — and the
rounded value then served as the level's IDENTITY: the pick-map key, and the
`bt:<time>:<price>` spawn key in the renderer.

BTC has `base > 100`, so every print collapsed to two decimals. 60123.4512 and
60123.4587 — two separate large prints, possibly opposite sides — became one
key. The second overwrote the first. It was not merged; its size was not added
to anything. The bubble never spawned and the trade left the chart with no
indication. §5 SYSTEM TRUTH LAW, and the same defect class that was closed one
function earlier in `deltaBubbleLevels.ts`.

`src/lib/bigTradeLevels.ts` now owns the ranking. `priceLevel` is the price AS
PRINTED; rounding is a label concern.

**Measured while testing:** the trailing `.slice(0, 8)` is slack, not the
ceiling. The threshold pass caps at 5 and the buy leader is by definition the
heaviest buy, so it is always inside that 5. Only the sell leader can add a
slot. **A bar yields at most SIX bubbles.** Recorded in the module header and
locked in the test, rather than left as a number that reads bigger than it is.

### 3. `eaa7417` — the half of the Volume Profile nobody had tested

`vpEngine.ts` owns where the volume goes and has a full suite. Turning a bucket
into a rectangle was still inline in `drawWMVP`, in a 300-line draw loop, with
zero coverage — and that is the half that reaches the eye. The comments there
made specific, checkable claims (pixel-flush rows; bar length directly
proportional to volume; the histogram never covering the price labels) and not
one was executable. A comment is not a guard.

`src/lib/vpDrawGeometry.ts` now owns `vpColumnLayout`, `vpRowRect`,
`vpBarWidth`, `vpBarSplit`, `vpLabelFits`. Two real defects surfaced:

- The column layout could produce a right edge left of `x=0`, painting the
  second profile entirely off-canvas with no indication. It now answers
  `fits: false` and the renderer declines out loud. The boundary is MEASURED:
  the second column's left edge is `0.8 * usable - 18`, so it leaves the canvas
  below ~22px of usable span.
- The up/down split rounded BOTH halves, so `round(w·r) + round(w·(1−r)) ≠ w`
  and a level was drawn a pixel wider or narrower than its own volume depending
  which way the ratio fell. The down half is now the remainder; a test sweeps
  every width 1..120 against seven ratios.

---

## REVIVE ledger

Each defect reintroduced one at a time, gates re-run, source restored
byte-identical (`cp` from `/tmp` + `diff` clean) in every case.

| Defect reintroduced | Guard that failed, by name |
|---|---|
| `toFixed` back into `bigTradeLevels` `levels.push` | "keeps both BTC prints that collapse to the same 2 decimals"; "keeps both sub-penny equity prints that collapse to the same cent"; "reports the tick price verbatim" |
| row height rounded independently | "leaves no gap and no overlap across a long fractional run" |
| up/down split rounded twice | "conserves the bar's length at every ratio" |
| `fits` guard removed from the column layout | "THE FIX: says a column does not fit rather than painting it off-canvas" |
| 0.6 power curve on bar length | "gives the POC the full column and nothing else"; "is LINEAR in volume"; "has no aesthetic baseline" |

**Honest negative result:** the DOGE collision test did NOT fire when the
big-trade `toFixed` was revived — 0.162345 and 0.162389 stay distinct at four
decimals. That test does not discriminate on this defect. It is kept because it
documents the fine-price case, but it must not be counted as coverage of the
rounding-identity bug.

---

## Gates

Both run UNPIPED (a `|` masks the exit code; `> file 2>&1` does not).

| | after `d53abc6` | after `a9f2982` | after `eaa7417` |
|---|---|---|---|
| `tsc --noEmit` | 0 | 0 | 0 |
| `vitest run` | 0 | 0 | 0 |
| files / tests | 514 / 5810 | 515 / 5834 | **516 / 5872** |

Baseline at the start of the block: 514 files / 5792 tests.

One pre-existing guard was widened, not weakened:
`paperContractMultiplier.test.ts` asserted
`applyFillShared(positions, ord, fillPx, contractMultiplier(ord.symbol))` — the
closing paren made it an exact-arity match that the new 5th argument broke. Its
subject is the multiplier derivation, not call arity, so the trailing `)` was
dropped to make it a prefix match, with a comment recording why.

---

## §13 gate status after this block

| Gate | State |
|---|---|
| Delta Bubbles level ownership | **CLOSED.** `deltaBubbleLevels.ts` was already a complete pure owner, MainChart already delegates, the spawn key already uses `levelIdx`. Assessed, not assumed. The adjacent Big Trade lane had the surviving defect — that is `a9f2982`. |
| Live VP render geometry proof | **CLOSED** by `eaa7417` for the arithmetic. See the caveat below. |
| Decision Memory sealing — zero production callers | **OPEN, deliberately.** Already surfaced in three places: `decisionMemoryReachability.test.ts` pins it as a named blocker, and `screenReach.enforcement.test.ts` carries it in the LEDGER. Directive is explicit — surface, do not rush-wire. Sealing a decision needs a real decision surface and a real trigger; inventing a caller to turn a file green manufactures exactly the unreachable ceremony the guard exists to detect. |
| `executionConnectivity` orphaned | **OPEN, not a live defect.** Carried in the LEDGER as `AWAITING_SURFACE`. **Correction to the standing brief:** the brief says "/readiness discloses honestly." /readiness is honest about its own subject (credentials-present vs connected, READY shown as "SETUP PRESENT"), but it does NOT render `executionConnectivity` — the LEDGER note says so explicitly. The gate is unreached by every route. |
| Paper execution state-machine realism | Partially advanced by `d53abc6` (fill-price age). The ordering/queue model itself is untouched. Canon weakness #9 PAPER-FILL OVERCONFIDENCE still stands. |
| Gate 4 responsive device proof | **BLOCKED.** Programmatic window resize does not take effect; `outerWidth` stays pinned. Not attempted. |
| `/journal` detail canvas | **BLOCKED.** Zero journal entries to render. Not attempted. |

---

## Caveat on "render geometry proof"

`eaa7417` proves the ARITHMETIC that produces the rectangles. It does not prove
what a human sees, because no pixel was observed — see the NOT DEPLOYED section.
A reader who wants the full proof still needs a screenshot of `/charts` with
Fixed and Session VP both on. Treat this gate as *arithmetic proven, pixels
unobserved* until someone takes that screenshot.

---

## For whoever picks this up

1. Get the Cloudflare credential and deploy. Four commits are queued behind it.
2. Then verify on the live host, in this order: `/charts` (VP columns, big-trade
   bubbles on a crypto symbol where the collision used to bite), then `/paper`
   (the quote-age note in the blotter's Time cell).
3. Do not wire Decision Memory sealing to close a gate. It needs a decision
   surface first.
