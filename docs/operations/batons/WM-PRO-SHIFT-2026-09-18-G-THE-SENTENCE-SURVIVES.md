# WM PRO — SHIFT BATON 2026-09-18-G — "THE SENTENCE SURVIVES THE JOURNEY"

Covers `28b6cde8`, `dd63cdab`, `bb4733bc`.
Predecessor: `a46f5770` (2026-09-18-F — WHICH ABSENCE), which covered `e3a9f457` + `487a24fd`.

---

## THE ONE-LINE FINDING

A true sentence is not delivered by being authored. It has to survive every hop
between the producer that measured it and the pixel the Founder reads. This
block found it being destroyed at two of those hops and one word being added at
the third.

`487a24fd` (previous baton) taught the direction and volatility producers to
stop saying *"No verified price evidence supplied at snapshot time"* over a
fully-drawn chart, and to say the true thing instead: the candles ARE loaded,
the PER-TRADE TAPE is what is absent, and this reading is measured trade by
trade, so the candles cannot answer it.

That sentence then travelled through a composition and a badge. It did not
arrive. This block is the three repairs that got it to the screen.

---

## THE THREE ATOMS

### 1 — `28b6cde8` — next thing: A COMPOSITION IS NOT A DEBT THE TRADER CAN PAY

**Observed on prod /charts:** the ONE NEXT THING engine's headline read
**"Resolve regime"**.

Regime is a pure composition of direction and volatility. It mints no evidence
of its own. There is no venue, no subscription, and no action a human being can
take that resolves `regime` directly — it clears when its inputs clear, or it
never clears. The single largest instruction on the deck was an instruction
that cannot be followed.

**Root cause:** `selectOneNextThing` picked `debt.missingLabels[0]` — SOURCE
FILE ARRAY ORDER, presented to the trader as PRIORITY.

**Fix:** `DecisionChainNode` gained `payableBy?: "EVIDENCE" | "DECLARATION" | "COMPOSITION"`.
All nine nodes tagged. `EvidenceDebt` gained two REQUIRED fields,
`missingPayableLabels` and `missingPayable`. `payEvidence` now reads
`debt.missingPayableLabels[0]`.

**Live, 12:20:07Z:**

```
NEXT
Resolve direction
direction is the first directly-resolvable of 7 unpaid evidence nodes (+6 behind it).
4 of them cannot be worked on at all — they are composed from other readings and
clear on their own. Resolving it does not authorise entry — it removes one block.
```

Over-correction guards held in production: still `7 unpaid`, still `WAIT`,
still `1/8 dimensions resolved`. **Nothing was promoted.** The count did not
shrink to flatter the trader — the four compositions are still counted, they
are now *explained*.

**Architectural note from the typecheck:** tsc named 16 affected files and every
single one is a TEST. Zero production sites construct an `EvidenceDebt` by hand;
they all route through `computeEvidenceDebt`. The new field cannot drift.

**Deliberately NOT done:** no priority ordering was invented among the payable
nodes. "first" now means "first that can be paid at all", which is a real
property. Ranking direction above location would be a fabrication replacing the
one just removed.

---

### 2 — `dd63cdab` — regime: A COMPOSITION MUST NOT LAUNDER ITS INPUTS' FINDINGS INTO A DEFAULT

Found by **reading `deriveRegimeDimension.ts` after the live read**, not by
grepping.

Its first branch — both legs UNKNOWN, which is the standing case on /charts —
answered with a MODULE CONSTANT: *"No verified direction or volatility evidence
supplied at snapshot time."* The sharpened sentence `487a24fd` had just computed
was carried into the function on both inputs and thrown away one line later.

The damage is not cosmetic. Regime is the dimension the Founder's chip prints
in large type and the dimension the NEXT cell used to point at. The trader was
told the regime is unknown *"at snapshot time"* — a phrase that reads as
TRANSIENT. On this venue no later snapshot ever will carry it.

**Fix:** `carryUnknowns()` — inputs' own notes, direction first, blanks dropped,
duplicates collapsed on exact text. Falls back to the constant ONLY when neither
leg explained itself.

De-duplication is load-bearing, not tidiness: the publisher computes the gap
note ONCE and hands the SAME string to both legs precisely so they cannot drift,
so the naive union prints the identical paragraph twice and the chip stutters.
Collapsing on exact text still keeps two *genuinely different* silences as two
lines.

**Deliberately NOT done:** this producer still does not know WHY its inputs are
silent, and must not learn. Only the publisher sees both lanes. *This branch
forwards; it does not author.*

---

### 3 — `bb4733bc` — regime chip: AN ABSENCE THAT CANNOT END IS NOT A PENDING STATE

The chip's accessible name ended:

> "…and it is not resolved **yet**, which is why no regime word is shown beside it."

One word. "Yet" is a promise about the future. A trader who hears *"not yet"*
WAITS. A trader who hears *"the candles cannot answer this question"* goes and
finds a venue that can. **Opposite actions from the same underlying truth.**

And free-tier equities will never carry per-trade tape — this absence has no
end, so "yet" was not merely imprecise, it was false.

**Fix:** `selectCanonRegimeView` now returns `reason: string | null` carrying the
dimension's FIRST non-blank unknown. `speak()` renders
`…it is not resolved, because <reason> That is why no regime word is shown beside it.`
with `lowerFirst()` splicing the quoted sentence into the clause without
mangling an acronym or a symbol (`TSLA`, `VWAP` stay upper).

**Design choices, recorded:**
- FIRST unknown only, not joined. This is spoken aloud as ONE sentence; an
  unbounded list becomes a paragraph a screen-reader user must sit through.
- A `null` dimension gets NO because-clause. "No canonical state exists" and
  "the state explains its silence" are different situations and must not be
  given the same voice.

---

## LIVE PROOF — one observation, all three atoms

Prod `/charts?symbol=TSLA`, regime chip `aria-label`, read out of the DOM:

> "TSLA day bias BULL, from a change of +2.54% today. Day bias is a band over
> that day-change percent only — it has not read the tape. Market regime is a
> different question, derived from classified per-trade tape, and it is not
> resolved, **because 312 candles are loaded from yahoo, but no per-trade tape
> has arrived, and this reading is measured trade by trade. The candles cannot
> answer it.** That is why no regime word is shown beside it."

That one sentence proves the entire chain:

| Atom | What the sentence proves |
|---|---|
| `487a24fd` | The publisher **authored** it — real feed name `yahoo`, real count `312`, both computed, neither hard-coded. |
| `dd63cdab` | The composition **carried** it. Had it not, `canon.reason` would be the module constant *"…at snapshot time."* |
| `bb4733bc` | The chip **speaks** it, and **`yet` is gone**. |

Over-correction guards held live: `data-regime-badge-canon="UNRESOLVED"`. A
sharper sentence did not become a stronger claim.

`28b6cde8` was proved separately at 12:20:07Z (above).

---

## LAWS ADDED THIS BLOCK

- **A COMPOSITION IS NOT A DEBT THE TRADER CAN PAY.** A node that mints no
  evidence of its own can never be a legitimate "next thing".
- **A COMPOSITION MUST NOT LAUNDER ITS INPUTS' FINDINGS INTO A DEFAULT.** A
  composition may summarise its inputs. It may not overwrite them with something
  it made up, however true that thing is in general.
- **AN ABSENCE THAT CANNOT END IS NOT A PENDING STATE.** "Yet" is a promise.
  Do not make it on behalf of a feed that will never deliver.

Reinforced: **A SHARPER SENTENCE MUST NOT BECOME A STRONGER CLAIM** (guarded by
name in all three atoms) and **§14.1 AN ABSENCE MUST BE A FINDING, NOT A DEFAULT.**

---

## A FIXTURE THAT MODELS THE WRONG WORLD TESTS THE WRONG PRODUCT — twice

Both hits this block. The test was not catching the bug, it was PRESERVING it.

1. `selectOneNextThing.test.ts` asserted `headline === "Resolve regime"` — the
   impossible instruction, locked in green.
2. `selectRegimeBadge.test.ts` asserted `/not resolved yet/` — the false promise,
   locked in green, twice (lines ~225, ~248).

The old regime test was named *"UNKNOWN in, UNKNOWN out"* and asserted
resolution, value and evidence. It never once looked at `unknowns`. That is why
it stayed green for the entire life of the defect.

Every new guard is named for the specific way the fix can be undone:
`× THE OVERWRITE`, `× THE STUTTER`, `× THE COLLAPSE`, `× THE BLANK`,
`× THE PROMOTION`, `× THE FALSE PROMISE`, `× THE DISCARDED REASON`,
`× THE PARAPHRASE`, `× THE MANGLED QUOTE`, `× THE INVENTED REASON`,
`× THE PARAGRAPH`, `× THE OVER-CORRECTION`.

---

## GATES

- `tsc --noEmit` — **EXIT 0**, unpiped.
- `./node_modules/.bin/vitest run` — **EXIT 0**, unpiped. 762 files, 9485 passed,
  2 skipped.
- Mutation receipts: 4 red-by-name / 2 red-by-name / 6 red-by-name respectively;
  over-correction guards stayed GREEN through each mutation; all restored.

---

## WHAT WAS DELIBERATELY NOT BUILT

**Candle-derived direction and volatility.** It is tempting: the candles are
right there, 312 of them. But the two producers' thresholds
(`VOLATILITY_LOW_MAX_PCT = 0.05`, `VOLATILITY_HIGH_MIN_PCT = 0.30`) are
TICK-WINDOW values measured on total range. Applied to 312 bars of an equity
they would read HIGH VOLATILITY on literally every symbol, forever — a sealed
dimension that is confidently wrong, which is strictly worse than the honest
silence now on screen.

Doing this properly needs (a) its own calibration — ATR% per bar, not total
range — and (b) `deriveRegimeDimension` learning that its two legs can arrive
from different evidence TIERS, with confidence discounted accordingly. That is
an evidence-model change, not a threshold tweak. Surfaced, not rushed.

---

## CARRIED FORWARD

Unchanged blockers: Gate 4 responsive proof (`outerWidth` pinned under
programmatic resize); `/journal` detail canvas (0 entries); the Level-2 depth
family (Assets 08/19/20 — licensed depth); `executionConnectivity` orphaned
(not a live defect — `/readiness` discloses it honestly).

Unproven-live honest negatives: `compileFeedStanding`'s three-way split;
`No probe target` / `Probe failed` (`Not configured` fires first,
`MOOMOO_BRIDGE_URL` unset); `BrokerConnectPanel` witness; longbridge's
pure-template refusal note (outside static reach by construction).
