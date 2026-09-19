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

# The room consumes the practice truth it already owned

**Atom:** `2b5b0d7` — `/command-deck` renders the five practice-easement disclosures that until now lived only inside the legacy `/paper` page
**Gate:** Founder redirection — *"things should be getting wired into the new u.i … wiring up the atoms and everything else in the app to the wm pro inventions and new os screen"*
**Canon:** Visual repair law — SCENE_FRAGMENTATION named as the dominant failure; Visual Implementation Pack coverage matrix lists **REVIEW / RECEIPT** as an outright GAP
**Status:** committed, pushed, **LIVE OBSERVED** on wealthymindsetspro.com/command-deck

This is the first atom of the redirected lane. The four previous /paper atoms
([TIF](./1740-the-order-that-could-never-expire.md),
[cancel](./1820-the-cancel-that-could-never-lose.md),
[stop](./1905-the-stop-that-was-a-guarantee.md),
[short](./1950-the-short-that-needed-no-shares.md))
each added a true sentence. None of them was visible in the room the Founder
actually lands in.

---

## The measured gap

Five modules already knew how `/paper` is easier than a real venue:

| owner | what it measures |
|---|---|
| `paperShortRealism` | a short entered with no locate and no collateral |
| `paperExecutionRealism` | a fill that crossed no spread |
| `paperOrderTimeInForce` | an order that rested past a session boundary and never expired |
| `paperCancelCertainty` | a cancel that could never lose the race |
| `paperStopRealism` | a stop that filled as a guarantee, with no gap |

Every one of those sentences rendered **only** inside the legacy `/paper`
page's tab chrome. That is truth living in a mini-app — the canon's own name
for the condition is SCENE_FRAGMENTATION, and the coverage matrix already
listed REVIEW / RECEIPT as the GAP where this belonged.

## A COMPILER, not a fifth measurement

`practiceHonestyLedger` computes **nothing** about the book. Every number and
every sentence it returns came from the module that already owns that claim,
**verbatim**. This file decides only two things: **ORDER** and **PRESENCE**.

The order is the order the trade was **lived**, not the order the modules were
written in:

```
ENTRY → FILL → REST → CANCEL → STOP
short-located   fill   rest   cancel   stop
```

A Sentinel asserts exactly that sequence against a book that supplies all five
out of order:

```ts
expect(r.easements.map((e) => e.id)).toEqual([
  "short-located", "fill", "rest", "cancel", "stop",
]);
```

And a second one proves the delegation is literal, by comparing against the
owners' own outputs rather than against a copied string:

```ts
expect(byId("stop").sentences).toEqual(selectStopRealism(orders).sentences);
expect(byId("stop").heading).toBe(selectStopRealism(orders).heading);
```

If the room ever reaches past the compiler to an owner, the claim gains a
second writer and the ordering rule stops being the single answer. That is
caught too:

```ts
for (const owner of ["paperExecutionRealism", "paperCancelCertainty",
  "paperStopRealism", "paperShortRealism", "paperOrderTimeInForce"]) {
  expect(layer).not.toContain(owner);
}
```

## It mints no number

No score, no percentage, no grade. The only figure it prints is the **length of
the list printed directly beneath it** — `"N ways this practice book was easier
than a real venue"`, singular at one. It refuses nothing. And the count is of
**KINDS**, not of orders: ten cancels are still one easement, because the
easement is the thing that was easy, not the number of times it happened.

```ts
expect(CODE).not.toMatch(/\bscore\b/i);
expect(CODE).not.toMatch(/\bpercent|\bpct\b|\/\s*100\b/i);
expect(CODE).not.toMatch(/fillPx\s*[-+*/]/);
expect(CODE).not.toMatch(/\bqty\s*[-+*/]/);
expect(CODE).not.toMatch(/marketPx\s*[-+*/]/);
```

The last three are the COMPILER guard: if a future edit starts deriving its own
figure here, the claim stops having an owner that can be fixed.

## The test that was over-broad, a second time

The LABEL guard went red on **this module's own doc comment**, which uses the
word "score" to explain why it refuses to compute one.

This is the *second* instance of this exact class — the short atom's guard went
red on the word `refused` inside the sentence describing what a real broker
does. Same cure, now recorded as a rule: **the ban is on what the code DOES**,
so the guard scans the source with comments stripped.

```ts
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
```

**A Sentinel that fails on its own honest prose is testing the wrong surface.**

## Where it mounts, and why it is a drawer

`PracticeHonestyLayer` mounts on `/command-deck` in **REVIEW / LEARN only**, as
a **closed** contextual drawer inside the secondary workspace.

Three canon rules converge on that placement: the repair law reserves primary
pixels for MARKET; secondary machinery belongs in contextual drawers unless it
truly earns permanent primary pixels; and **§9 INTERRUPTION LAW** forbids a
retrospective taking the room while capital is exposed. This is backward-looking
by definition — it belongs where the Founder goes to ask *what did I do*.

```tsx
{(experienceContext.mode === "REVIEW" || experienceContext.mode === "LEARN") && (
  <PracticeHonestyLayer />
)}
```

## ANTI-WALLPAPER and the null distinction

A `null` ledger means *not read yet* or *unreadable*. An empty ledger means
*read, and there is nothing to disclose*. They are deliberately different, so an
unreadable book never silently reads as "nothing was easy here." Both render
nothing, and four Sentinels cover the silence: absent book, empty book,
same-session pending-only book, and the H1 case where an unreadable position
does not invent a short.

## Sentinels that assert the ELEMENT

The REVIVE-FOUND lesson, now **six** times in this codebase: *consulting a
selector is not rendering its answer.* A guard that only checks the import
passes GREEN on a page that imports the component and never puts it in the tree.

```ts
expect(deck).toContain("<PracticeHonestyLayer />");
expect(deck).toMatch(
  /experienceContext\.mode === "REVIEW" \|\| experienceContext\.mode === "LEARN"\) && \(\s*<PracticeHonestyLayer \/>/,
);
```

The second one binds the claim to its justification: the placement rule and the
render are asserted together, so the drawer cannot quietly escape its mode gate.

## REVIVE (§22, Edit-only)

Deleted `<PracticeHonestyLayer />` from `/command-deck` via the Edit tool,
leaving the import intact — the **ninth** run of the shape that once passed
GREEN for `ExecutionRealismNote`.

```
× THE ROOM RENDERS IT: /command-deck mounts PracticeHonestyLayer
```

**FAILED BY NAME.** Restored byte-identical (`git diff --stat` = 19 insertions,
0 deletions); full suite green afterwards.

## Gates

- `vitest run` — **590 files / 6901 tests PASS**, `VITEST_EXIT=0`
- `tsc --noEmit` — `TSC_EXIT=0`

## LIVE OBSERVED — production, not localhost

Deploy confirmed behaviourally: the literal string `practice book was easier`
appeared in the production chunk `/_next/static/chunks/21d522i4faw0_.js`.
(Cloudflare deploys via its own Git integration, so there is no CI job to read —
polling the served chunk is the honest signal.)

The probe book still held the two positions injected for the short atom. The
Founder's own book was backed up first and is restored — see below.

`/command-deck` → **REVIEW** → workspace drawer → *Practice honesty*, verbatim:

```
PRACTICE HONESTY · 1 WAY THIS PRACTICE BOOK WAS EASIER THAN A REAL VENUE

1 SHORT POSITION WAS OPENED WITH NO SHARES LOCATED

No locate was required. A real short cannot be entered until your broker finds
shares to borrow — some names cost a daily fee to hold short, and some cannot
be borrowed at all, in which case the order is simply refused. Every name is
infinitely shortable here, and always free.

No collateral was posted. You are short $3,950 and /paper asked for nothing
against it — the sale CREDITED your cash, which can then fund a buy. A real
short does the opposite: it consumes margin rather than creating buying power,
and Regulation T requires collateral of 150% of the short's value.

No buy-in is possible. A real short can be RECALLED: the lender wants the
shares back and the position is closed at the market, without your consent and
usually at the worst moment. A short here closes when you decide, and never
before.
```

What the rendered shape proves:

1. **The room consumes the owner verbatim.** The heading and all three
   sentences are `paperShortRealism`'s own strings, rendered by a page that has
   never imported that module.
2. **The caption is singular and correct.** `1 WAY` — the probe book had a short
   but no fills, no rests, no cancels and no stops. Four owners were correctly
   silent, and the compiler printed only what was true.
3. **ANTI-WALLPAPER holds in production.** After the Founder's empty book was
   restored, the page was reloaded and `[data-testid="practice-honesty-layer"]`
   was **absent from the DOM entirely** — not rendered empty, not rendered with
   a zero. `practiceLayerPresent: false`.

### An honest discrepancy, recorded not resolved

`/paper` rendered this same position as **$3,586**; the deck drawer rendered it
as **$3,950**. Both are correct about different things. `/paper` re-marks the
position against the quote it has just resolved (`10 × 358.63`); the deck reads
the **persisted book**, whose stored `marketPx` is 395 (`10 × 395`).

Neither surface invented a number — but the same position carries two notionals
in two rooms, which is the canon's named Weakness #1 (multi-price disagreement)
appearing across surfaces rather than within one. **This atom does not fix it.**
It is recorded here as the next candidate, because naming it is cheaper than
letting it be discovered by a trader.

### Founder state restored

The probe positions were injected into a backed-up copy of `wm_paper_state` and
the original bytes restored immediately after the screenshot, verified by
readback:

```
restored_identical=true bytes=7501 positions=0 orders=0 trades=0 backup_key_removed=true
```

No order was ever submitted into the Founder's book to produce this proof.

## What this atom does and does not claim

It **does** claim: the five practice-easement disclosures now render in the new
OS room, in the order the trade was lived, each one its owner's verbatim string.

It does **not** claim to have measured anything new. It has no opinion about how
much easier practice is, no score for the trader, and no view on which easement
matters most — ordering them by the life of a trade is a presentation rule, not
a ranking. And it does not claim the legacy `/paper` page is now redundant; that
page still owns the per-order and per-position detail. `Math.random` appears
nowhere; a Sentinel asserts all of it.
