# The deck said you were rushing, without looking

**Commit** `ce90890` · **Found by** working the STEWARD / PREGAME gap in the Visual Coverage Matrix
**Owner module** `src/lib/experience/openingBellPrep.ts` (new)

---

## How it was found

The canon's Visual Coverage Matrix lists **STEWARD / PREGAME** as a GAP.
`compileScene` already emits `PREGAME` with the reason *"Nothing has resolved yet
— prepare."* — but admits nothing that answers the obvious question a trader
asks in that scene: **am I actually prepared?**

Going to look for what the deck *does* say about preparation turned up something
worse than a gap.

## The defect

`src/app/command-deck/page.tsx`, in the PREPARATION phase:

```ts
items: DEFAULT_PREPARATION_TEMPLATE.map((t) => ({ ...t, completed: false }))
```

Eight prep items, **every one hardcoded incomplete**. `selectOpeningBell` is a
good owner and did exactly what it was told: six of the eight are `required`, at
most one is satisfiable from data health, so the room returned **NOT_READY** with
the advisory

> `Preparation incomplete. Rushing preparation correlates with process failure.`

That sentence is a statement about the trader's behaviour this morning. It was
produced from **no observation of the trader whatsoever**. It rendered
identically for someone who finished every item and for someone whose browser
could not read their prep at all.

### This is H1 wearing a different coat

The `/profile` export defect (`8c4d66a`, dispatched two hours of work ago)
rendered absence as `0` in a P&L column. This rendered absence as **NOT DONE** in
a discipline column. Same shape — an unearned value in a slot that promises a
measurement — and worse in one specific way:

> **A zero misstates the market. This misstates the person, and then scolds them
> for it.**

### It was also the room contradicting itself

`TodayPrepBridge` lives a few hundred lines away **in the same file** and already
renders the trader's REAL count — `7/11 checked` — from `useTodayPrep`. So the
deck displayed the true number and a verdict that ignored it, at the same moment,
on the same screen.

## Why the fix is not "just pass the real checklist"

That was the first instinct, and it was wrong. The two surfaces do not share a
vocabulary, and one of them is free-text:

| | |
|---|---|
| `DEFAULT_PREPARATION_TEMPLATE` | 8 items, stable ids (`htf-context`, `risk-budget`, `data-health`, …) |
| `/morning-prep` | `{ id, text, done }` seeded from its own 11-line `STARTER_CHECKLIST`, and the trader can **add and remove items freely** |

So we know a **COUNT**. We do not know **WHICH**. Mapping "7 of 11" onto eight
named rows would have to decide which named row the seventh tick was — and
there is no fact in the system that answers that.

Inventing that mapping would have been the same defect one layer deeper and much
harder to see, because this time **the fabricated per-item ticks would look like
they came from the trader**.

> **New law, named: a count is not a checklist.**

## The cure

New pure owner `selectPrepEvidence` (no I/O, no clock, no DOM):

- **Reports the count it has.** `"You checked 7 of 11 items on your own prep list this morning."`
- **Three kinds, never collapsed.** `OBSERVED` / `NO_PREP_TODAY` / `UNREADABLE`.
  `UNAVAILABLE` is checked **first**, because "we could not look" must never fall
  through into a sentence that sounds like "we looked and you failed".
- **H1:** `done` and `total` are `null` — never `0` — unless actually observed.
- **An entry with no checklist is a different shape of prep,** not a zero score:
  *"Morning prep was logged today with no checklist items on it."* Never "0 of 0".
- **`ABSENT` is said plainly and without the word "incomplete"** — the trader may
  have prepared on paper, in another app, or in their head.
- **`PREP_VERDICT_WITHHELD`** ships as a named constant so the surface cannot
  quietly paraphrase the refusal into something softer, and it blames the model,
  not the trader.

On the deck, `OpeningBellSlot` renders the evidence sentence, the one axis that
**is** genuinely observed (market data health — stated as a reading, never a
grade), the withheld-verdict explanation where the verdict used to be, and a
44px link into Morning Prep.

`selectOpeningBell` is **not called on this surface any more**, because here it
cannot be given honest input. It remains correct and in use where it can be.

**LABEL-NOT-MODEL:** no inferred items, no partial credit, no readiness score.

## Sentinels — 13

Three bind the refusal to its reason, so it cannot outlive that reason:

- `THE DEFECT: the deck template and /morning-prep still share NO vocabulary`
- `THE DEFECT: morning-prep checklist items still carry no template id`
- `THE SURFACE: /command-deck no longer fabricates completed: false`

The day someone unifies the two lists, the count CAN be mapped onto named items,
a real verdict becomes earnable — and the first Sentinel fails, forcing the
withholding to be **re-examined instead of inherited forever**.

### A new wrinkle worth the team's attention

The vocabulary Sentinel initially failed on a **substring collision**: the
template id `catalysts` occurs inside the free-text item
`"News / catalysts reviewed"`. That near-miss is precisely the hazard the module
exists to refuse — the two lists share English *words* while sharing no
vocabulary a machine can join on. A substring match would have read that
collision as an *alignment*. The assertion now tests the id as a **quoted token**.

### The recurring lesson, fourth occurrence

> A Sentinel that fails on its own honest prose is testing the wrong surface.

The surface Sentinel greps `/command-deck` for `completed: false` — and the fix's
own explanatory docblock **names the line it deleted**. Cure, as established
three times before: `codeOnly()` — scan the source with comments stripped.

## REVIVE §22 — Edit tool only

| Revive | Sentinel that caught it |
|---|---|
| `completed: false` reintroduced on the deck | `THE SURFACE: /command-deck no longer fabricates completed: false` |

Failed **by name**:

```
AssertionError: expected '"use client";\nimport * as React from…'
  not to match /completed:\s*false/
```

Restored byte-identical; suite green afterwards.

## Gates

```
Test Files  592 passed (592)
      Tests  6932 passed (6932)
VITEST_EXIT=0
TSC_EXIT=0
```

## Live status — PENDING

Pushed `bccd646..ce90890`. Deploy not yet confirmed; no live observation has been
made, so nothing here is claimed as proven on production. This section will be
rewritten only against a screenshot of the running room.
