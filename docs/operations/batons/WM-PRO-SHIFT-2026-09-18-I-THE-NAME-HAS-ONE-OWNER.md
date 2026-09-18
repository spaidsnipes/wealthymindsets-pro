# WM PRO — SHIFT BATON 2026-09-18-I
## THE NAME HAS ONE OWNER

Commits: `686e9667` (chapter names) · `0885a189` (dimension names)

---

## THE DEFECT, IN ONE LINE

A thing in this product had more than one name, and the surfaces printing it
had never been introduced.

Twice, on the same day, on two different axes.

---

## AXIS 1 — CHAPTER NAMES (`686e9667`)

One chapter, four surfaces, three spellings: `Open`, `OPENING_AUCTION`,
`opening auction`. Sealed to one owner.

## AXIS 2 — DIMENSION NAMES (`0885a189`)

### FOUND FROM USE

Production `/charts?symbol=TSLA`, in one trader-facing sentence:

```
…direction, regime, volatility, orderFlow unresolved; location,
 aggression, profile measured but not decision-grade.
```

`orderFlow` is a FIELD IDENTIFIER. It reached a trader because the surface
printing the sentence never had to ask anyone what the dimension is CALLED —
it had the key in hand and the key looked close enough.

### WHY IT SURVIVED EVERY TEST IN THE REPO

**Seven out of eight was luck, not a rule.** Seven of the eight dimension keys
are single lowercase words, so `direction` and `volatility` read as English by
accident. Only the two-word one could ever expose that the sentence was
printing identifiers. The bug was 87.5% invisible.

### THE NEST — FIVE OWNERS, THREE SPELLINGS

| surface | spelling |
|---|---|
| `surfaceLink.ts` | `"Order Flow"` |
| `selectMarketObjectPassport.ts` | `"Order Flow"` |
| `chartMarketStatePublisher.ts` | `"Order flow"` |
| `selectMarketStory.ts` | `orderFlow` (raw key, into trader prose) |
| `selectMarketCanvas.ts` | `orderFlow` (raw key, into `vm.resolved`) |

`selectMarketObjectPassport`'s own comment read *"Mirrors surfaceLink's
DIMENSION_ORDER"*. **A copy that declares itself a copy is still a copy** —
nothing made the two move together, and a third spelling had already appeared
in the publisher while both of these said `"Order Flow"`.

The last two rows sit in **adjacent columns of `MarketCanvasPanel`** — one
panel printed `orderFlow` under Resolved and `Order Flow` under Missing, for
the same dimension, in the same instant. Canon Weakness #1 on the NAME axis.

### THE REPAIR

`DIMENSION_NAMES` + `dimensionName()` in `canonicalMarketState.ts` now own the
name. `Record<MarketStateDimensionKey, string>` is **TOTAL on purpose**: a
ninth dimension fails the BUILD until somebody names it, rather than silently
leaking its identifier onto a surface the way `orderFlow` did.

**Two rules, each owning one thing, composed.** `dimensionName` owns WHAT a
dimension is called; `inSentence` owns how a name reads mid-sentence. Prose
call sites compose the two rather than keeping a private lowercase copy.

**ORDER was deliberately left alone.** Inspection priority IS genuinely owned
by a surface and deliberately differs between them. Only the NAME was claimed.

---

## WHAT THIS SHIFT LEARNED ABOUT GUARDS

### A guard that spells the implementation is not guarding the rule

Four sentinels asserted a **verbatim ternary regex** against publisher source
text. The RULE — *unresolved-ness is read from the derived dimension, never
from a literal* — survived the refactor. The spelling did not, so four tests
went red on a change that did not break anything they existed to protect.

Each was restated against intent and made **stronger**: the display name is no
longer authored in the publisher at all, for any of the eight — not just the
four originally guarded.

### A fixture that spells the name is a second author of the name

`selectMarketStory.test.ts` asserted:

```
/location, aggression, structure, volatility, profile, orderFlow unresolved\./
```

**The fixture AGREED with the bug.** It pinned the defect in place and would
have failed the fix. Fixtures now build the expected list by calling
`inSentence(dimensionName(k))` — the same two rules the selector composes.

---

## MUTATION RECEIPT

| # | mutation | result |
|---|---|---|
| 1 | `selectMarketCanvas` pushes `key` again | red ×3, by name |
| 2 | `DIMENSION_NAMES.orderFlow = "orderFlow"` | red ×4, incl. both `× THE MACHINE IDENTIFIER` guards |
| 3 | the eight ternaries restored verbatim | red ×5, incl. the new `FORMER_AUTHORS` guard naming the publisher file |

New sentinel: `dimensionNameHasOneOwner.sentinel.test.ts` —
`× THE MACHINE IDENTIFIER`, `× THE THIRD NAME`, `× THE UNNAMED KEY`, plus a
comment-stripped source scan over the five former authors.

---

## GATES

- `tsc --noEmit` → **EXIT 0**
- `./node_modules/.bin/vitest run` → **EXIT 0** — 763 files, 9519 passed, 2 skipped

---

## LIVE PROOF — `/charts?symbol=TSLA`

Same sentence, same symbol, same surface, probed before and after deploy:

| | sentence tail | `orderFlow` anywhere on page |
|---|---|---|
| before `686e9667` | `…volatility, orderFlow unresolved…` | **yes** |
| after `0885a189` | `…volatility, order flow unresolved…` | **no** |

**PROVEN.**

---

## HONEST NEGATIVES

- **`/command-deck` canvas Resolved/Missing columns — NOT OBSERVED.** The
  Market Reality equipment opens at `stage=preview` with no compiled snapshot,
  so the two adjacent columns did not render. Page-wide absence of `orderFlow`
  is supporting evidence but **is not** the same-instant column-vs-column proof
  the defect deserves. Carried forward.
- **Deploy detector inconclusive.** The `/login` chunk-set fingerprint did not
  change across 40 polls, because a lib edit reaching only `/charts` need not
  alter the chunks `/login` references. The live page probe — not the
  fingerprint — is what proved the deploy.

## RULED OUT (investigated, no defect — recorded so nobody re-opens them)

- **`GUARDED_DIMENSIONS` in `selectMarketStory.ts`** looks like a sixth copy of
  the canonical key list. Its comment claims it is *"the dimensions the shipping
  guards actually read"* — a genuinely different property. **Measured: all eight
  ARE read.** The comment is true and the list is legitimately surface-owned.
- **`surfaceLink.test.ts:134-137`** contains `"Order Flow"` literals, but the
  property under test is *forwarded verbatim* — strings in, same strings out.
  Literals are correct there.
