<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **dispatch** — an instruction issued for one day's work. Its filename names its own day. It was true
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

# An entry price is not a mark

**Commit** `44d4a00` · **Found by** USE, during the live proof of `2b5b0d7`
**Owner module** `src/lib/paperPositionMark.ts`

---

## How it was found

This defect was not found by reading code looking for defects. It was found by
standing in front of the product with the product working.

The previous atom (`2b5b0d7`) wired the practice-honesty family into the new OS
room. To prove it live, a probe short position was placed into an isolated copy
of the saved book and the `/command-deck` REVIEW drawer was opened in
production. It rendered correctly — the short atom's verbatim heading and all
three of its sentences, on a page that never imports that module.

But the same position was also visible on `/paper`, and the two rooms disagreed:

| Room | Figure shown for the same TSLA short |
|---|---|
| `/paper` | **$3,586** |
| `/command-deck` REVIEW drawer | **$3,950** |

Two rooms, one position, two numbers. One of them was lying, and the drawer was
the new surface, so the drawer was the suspect.

## Root cause, traced in source

`paperTrade.applyFill` is the only writer of the persisted book. It has five
write sites, and every one of them says the same thing:

```ts
marketPx: fillPx
```

So the `marketPx` on a **saved** position is the price the position was
**filled** at. For a freshly opened position that value is exactly `avgPx` — the
entry price. It is not a quote. It is not an observation of current value. And
it does not become one by being stored under a field named `marketPx`.

`/paper` never trips on this because before anything reads the book it rebuilds
a view-model:

```ts
// src/app/paper/page.tsx:1682
marketPx: positionMarks[i].markPx ?? pos.avgPx,
```

That view-model is computed from a live quote, in memory, during render, and is
**never written back**. So `/paper` shows a real mark while the saved bytes
still hold a fill price. Any *other* surface that reads the saved book directly
gets the fill price — and the REVIEW drawer was the first such surface this
codebase has ever had.

## Why this is an Orkin nest, not a new bug

`src/lib/paperPositionMark.ts` exists *specifically* to kill this. Its docblock
names the defect by its expression:

> `?? pos.avgPx` — WHEN THERE IS NO PRICE, MARK AT ENTRY.

and states the governing law in one line:

> A mark is `number | null`, and null is NOT the entry price.

The drawer was committing that same overclaim. Same defect, different field
name, different room. That is the Orkin nest pattern — the second confirmed
instance in this codebase (the first was the duplicate NO FEED pill, task #146).

## The cure

The cure is the owner's own law, applied one surface over. It is placed **in the
owner**, not in the consumer, so the next surface that reads the saved book
inherits it:

- **`withoutPersistedMarks(positions)`** — returns the saved rows with the
  fill-price `marketPx` removed. Pure; allocates new objects; mutates nothing.
  Downstream owners already handle a missing mark correctly under H1: they still
  *count* the position, and they value it at nothing rather than at zero.
- **`PERSISTED_MARK_CAVEAT`** — the sentence explaining the absence, with
  exactly one author:

  > No dollar value is shown here. Your saved book records the price each
  > position was filled at, not a current quote, and this room has no price feed
  > of its own — so it will not put a figure on a position it cannot value. Open
  > /paper to see these marked against the live tape.

`practiceHonestyLedger` strips the field before any of the five owner modules
sees it, and exposes `markCaveat`. `PracticeHonestyLayer` renders it at
`data-testid="practice-honesty-mark-caveat"`.

**LABEL-NOT-MODEL.** Nothing is invented. No price is interpolated, no last-good
value is decayed toward entry, no score is minted. The room withholds the figure
and says why — because a number that silently vanishes is its own kind of lie.

**Anti-wallpaper.** `markCaveat` is null on an orders-only book. If no position
line is on screen, no figure is being withheld, and the sentence would be
decoration.

## Sentinels

Six added. Two deserve naming:

- **`THE DEFECT: applyFill still writes the FILL PRICE into marketPx`** — reads
  `paperTrade.ts` and asserts every `marketPx:` writer is still
  `marketPx: fillPx`. This binds claim to justification: the day someone teaches
  `applyFill` to write a real quote, this Sentinel fails and the stripping is
  re-examined rather than silently outliving its reason.
- **`THE ROOM EXPLAINS IT: the layer renders the caveat, not just the compiler`**
  — asserts the *element* string `{ledger.markCaveat}` and the testid appear in
  `PracticeHonestyLayer.tsx`. This is the REVIVE-FOUND lesson for the seventh
  time: **consulting a selector is not rendering its answer.** A Sentinel that
  only checks the compiler returns a sentence proves nothing about whether a
  human ever sees it.

## REVIVE §22

Edit tool only. `const positions = withoutPersistedMarks(storedPositions)` was
reverted to `const positions = storedPositions`.

```
× DELEGATES, never rewrites: every sentence is its owner's verbatim string
× NO ENTRY PRICE DRESSED AS A MARK: the stored marketPx never reaches an owner
  Tests  2 failed | 20 passed (22)
```

The named Sentinel failed **by name**. Restored byte-identical; `git diff --stat`
matched pre-revive exactly (210 insertions, 6 deletions across 4 files).

## Gates

```
Test Files  590 passed (590)
      Tests  6907 passed (6907)
VITEST_EXIT=0
TSC_EXIT=0
```

## Live status

Pushed `f550455..44d4a00`. Production verification pending — this section will be
upgraded only on direct observation of the rendered sentence, never from deploy
identity alone.
