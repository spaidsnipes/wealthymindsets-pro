# WM PRO — §29 MTO HANDOFF — 2026-09-10 21:33 CDT

**MTO gate: MOVED.** The single largest element on the Founder's lead browser
surface — `/command-deck` HERO TRUTH — printed `UNKNOWN` for every symbol, in
every session, with live tape flowing. It now prints `BALANCE`.

Observed live on `https://wealthymindsetspro.com/command-deck?symbol=BTC`,
2026-09-10, in the Founder's already-authenticated Chrome. No password entered,
no JWT forged.

Five commits: `424c96f`, `1290802`, `8754398`, `59bd9e7`, `51d6fa3`, `1fba197`.

---

## MTO_GATE_MOVED

The hero word. Not a chip, not a tile — the 48pt word the deck is built around.

## BEFORE_STATE

Measured live, production, same URL, earlier this window:

```
HERO TRUTH   UNKNOWN
unknowns 5
MARKET       Insufficient dimensions resolved to identify a chapter.
MISSING      7 evidence nodes unpaid: direction + location +5
```

The trace ran through three distinct failures, each of which was individually
sufficient to hold the word at UNKNOWN. Fixing any one alone moves nothing.

**1. No producer sealed Direction or Regime** (`424c96f`, `1290802`).
`chartMarketStatePublisher` hard-codes four dimensions unresolved and derives
four. Regime was hard-coded unresolved, and *every* cheap chapter guard in
`selectMarketStory` (BALANCE, TREND_EXPANSION, ROTATION) gates on
`state.regime`. Sealing Direction alone cannot move the word; Regime can.
These two commits moved the live unknowns ledger **8 → 5**, which was real
progress and still did not move the hero word by one character.

**2. Vocabulary drift between producer and matcher** (`51d6fa3`) — the actual
reason the word stayed UNKNOWN after the dimensions were sealed.

`deriveVolatilityDimension` seals the dimension with the value
`"LOW VOLATILITY"`. `selectMarketStory`'s `DEFAULT_MATCHERS` asked whether the
value was `"low"`. `looseMatch` normalizes (`toLowerCase`, strip `[_\s-]`) and
then compares with `===` — **whole normalized words, not substrings**. So
`"lowvolatility" !== "low"`, `m.volatility.low.matches(...)` returned `false`
for every snapshot the shipping producer could ever emit, and the BALANCE
chapter guard's `supports` was **structurally false**.

> Nothing threw. `tsc --noEmit` stayed at exit 0 — both sides are `string`.
> Every existing test stayed green, because they hand the engine hand-written
> fixtures like `dim("low")` that the real producer never produces.
>
> **A matcher that matches nothing is indistinguishable, from the inside, from
> a market that is never in that state.**

That is the whole defect class, and it is why this could not be left to a
reviewer noticing.

**3. The same break was one careless rewording away at regime.** Regime's
tokens (`"TREND"` / `"BALANCE"`) happened to coincide with the bare adjectives
the matcher already listed. Coincidence reads identically to contract until
someone edits one side.

## AFTER_STATE

Each producer now **exports its entire vocabulary as data**, and the consumer
**imports it** rather than retyping it:

```ts
// deriveVolatilityDimension.ts
export const VOLATILITY_VERDICTS = {
  LOW: "LOW VOLATILITY", NORMAL: "NORMAL VOLATILITY", HIGH: "HIGH VOLATILITY",
} as const;

// deriveRegimeDimension.ts
export const REGIME_VERDICTS = { TREND: "TREND", BALANCE: "BALANCE" } as const;

// selectMarketStory.ts — value import, deliberately
import { VOLATILITY_VERDICTS } from "../deriveVolatilityDimension";
import { REGIME_VERDICTS } from "../deriveRegimeDimension";

volatility: {
  low:  looseMatch(["low", "compressed", "quiet", VOLATILITY_VERDICTS.LOW]),
  high: looseMatch(["high", "elevated", "expansion", VOLATILITY_VERDICTS.HIGH]),
  ...
}
```

This is the same symmetry discipline the DecisionId mint/reader pair and
`BROKER_ID_SHAPES` already use: **what one half produces, the other half is
tested against, from one shared constant.**

The two decision-identity commits in this block (`8754398`, `59bd9e7`) close
the same class at a different boundary — a `DecisionId` brand that was lying
across the order→trade and storage boundaries.

## FOUNDER_VISIBLE_DELTA

Live production, same URL, after deploy:

```
HERO TRUTH   BALANCE          ← was UNKNOWN
BTC 15M      ● LIVE   76780   PRICE OBSERVED 294MS AGO
session 24X7   coverage 1 channel   unknowns 5
MARKET       Market is in balance around a fair-value zone.
DECISION     WAIT
```

Screenshot captured: `BALANCE` rendered in the deck's largest type, green
`LIVE` badge, sub-second price age.

Note `unknowns 5` is **unchanged** and that is correct — the ledger counts
unpaid evidence nodes, which this work did not pay. It counts what is unknown,
not what can be said. The hero word moved because a *chapter guard* can now
fire, which is a different question from whether every dimension is sealed.
Reporting these as the same number would have been the easy lie.

## REAL_PROVIDER_OR_BROKER_EVIDENCE

Real Coinbase per-trade tape through `chartMarketStatePublisher` →
`deriveVolatilityDimension` / `deriveRegimeDimension`. No fixture. The `LIVE`
badge and 294ms price age are the provider's own freshness, not a label.

The Sentinel drives the **real producer with real ticks** rather than asserting
on literals, so a verdict no tick series can reach is caught as vacuous rather
than counted as covered.

## NORMAL_ROUTE_USED

`/command-deck?symbol=BTC` in the Founder's authenticated Chrome, full page
reload, live production host.

## DEVICE_PATH_PROVEN

**Desktop browser only.** 1568×649 viewport, Chrome on macOS. Phone and tablet
legs remain **UNPROVEN** — Gate 4 blocker below is unchanged.

## OLD_STEP_REMOVED

The bare string literals are gone from both producers — `verdictFor` and
`deriveRegimeDimension` now return `VOLATILITY_VERDICTS.*` / `REGIME_VERDICTS.*`
only. There is no second hand-written copy of either vocabulary left in the
repo for the two sides to drift apart across.

## FAILURE_OR_RECOVERY_PROOF

**Orkin §22 revive pass — three neuters, all restored byte-identical** (`cp`
from `/tmp` originals, confirmed by `diff`). Each had to fail **by name** with
`tsc --noEmit` exit 0 alongside, because a neuter that fires via a type error
proves only that the file broke.

| revive | what it puts back | result | tsc |
|---|---|---|---|
| E | drop `VOLATILITY_VERDICTS.LOW` from the low matcher | 2 FAIL by name | **exit 0** |
| F | producer emits `"QUIET TAPE" as VolatilityVerdict` | 3 FAIL by name | **exit 0** |
| G | reword `REGIME_VERDICTS.TREND` → `"TRENDING UP"` | 2 FAIL by name | **exit 0** |

`tsc` exit 0 on all three is the finding, not a footnote: **the type system
cannot see this defect class at all.** Both sides are `string`.

Revive G is the most instructive. The *"TREND is heard by the trend matcher"*
test correctly did **not** fail — the matcher imports the constant and followed
the rename. That is the symmetry working as designed. What caught the
unreviewed rename was the **exhaustiveness lock on the list itself**. Both
halves of the Sentinel are load-bearing.

New Sentinel: `src/lib/marketData/viewModels/dimensionVocabulary.test.ts`
(14 tests). It iterates the producers' **own exported vocabularies**, so adding
a fourth verdict fails the suite until this file records a decision about it.

**Gates, both run UNPIPED:** `tsc --noEmit` exit 0; `vitest run`
**494 files / 5545 tests passed**.

## DEPLOY_PROOF

In-browser probe over `performance.getEntriesByType("resource")`, fetching each
same-origin `.js` body. **A control literal is mandatory — a probe returning
`control: 0` is INVALID and proves nothing**, which is exactly what the first
attempt returned and why it is not reported as a result here.

Validated run, after a full reload:

```
{ scanned: 50, control: 2, matcherChunk: 2, errors: 0 }
```

`control` = `"compressed"` (a matcher token that shipped long before this fix).
`matcherChunk` = chunks containing **both** `"compressed"` and
`"LOW VOLATILITY"` — a conjunction only true after `51d6fa3`. Every chunk
carrying the matcher list also carries the producer's word. The fix is live.

Method note for the next reader: **doc-comment literals are useless as probe
discriminators** — minification strips them. `"Carry the decision identity"`
returned 0 for this reason, which says nothing about whether `8754398` /
`59bd9e7` deployed. Only runtime string literals survive the build.

---

## RECORDED, NOT FIXED

Both are written into the Sentinel so the next reader does not reason from a
false premise:

1. **`NORMAL VOLATILITY` is claimed by no matcher bucket.** This is a positive
   decision, not an omission — "neither low nor high" is not a story and must
   not be smuggled into a chapter guard. The Sentinel asserts the empty result
   so a future blanket-yes matcher list fails.

2. **`DEFAULT_MATCHERS.regime.rotation` has no producer in this repo.** Nothing
   can emit a value that trips it, so the **ROTATION chapter cannot occur
   today**. The matcher is dead weight. Naming it stops a future reader
   assuming ROTATION is wired.

## BLOCKERS — restated, not closed

- **Gate 5 — FAIL, runtime-observed.** `/paper` still discloses
  `CROSS-DEVICE: BLOCKED — no shared position authority exists yet`.
  Strongly indicates migration
  `20260907080000_wm_decision_position_shared_authority.sql` is **not applied**
  to production Supabase project `zrzaifaxecwgpfrqctkp`.
  **FOUNDER ACTION REQUIRED — asked, still unanswered.** Not mine to do.

- **Gate 4 — EXTERNALLY_BLOCKED WITH EVIDENCE.** `resize_window` reports
  success while `outerWidth` stays pinned at 1568 and `innerWidth (1902) >
  outerWidth (1568)` — geometrically impossible, so the reported metrics come
  from a different coordinate space than the actual window. Tooling limitation,
  **not** a WM Pro defect.

- **`/journal` detail canvas — blocked on data, not code.** `0 entries`. Data
  absence, not a defect.

## EXACT_NEXT_UNPROVEN_GATE

**Delta Bubbles level ownership** — the next §13 gate with no external blocker.

Remaining §13 gates, untouched this window and **not claimed**: Live VP render
geometry proof; Decision Memory sealing has zero production callers
(architectural — surface it, do not rush-wire it); `executionConnectivity`
orphaned (not a live defect — `/readiness` discloses it honestly); paper
execution state machine realism.

Preserved and untouched throughout: the modified `WM-PRO-EVENING-2026-09-03.md`,
the six untracked September 5–8 checkpoints, and `scratchpad/`.
