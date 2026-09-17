# DEPTH IS DEPTH, NOT SIZE

Continuation baton. The predecessor —
`WM-PRO-SHIFT-2026-09-17-EQUIPMENT-INSIDE-THE-SAME-ROOM.md` (`1707ddd`) — built
the ROOM → WORKSPACE → PREVIEW → DRAWER → ENTER → RETURN grammar and proved the
journey ran. This baton covers the five atoms that made each depth *worth
entering*, and closes the Founder's acceptance question on the first journey.

This is an operations receipt. It creates no authority and overrides nothing.

## The commits

| SHA | What the trader sees differently |
| --- | --- |
| `7805130` | ENTER buys DEPTH, not size — the full stage renders the canvas unabridged |
| `7faa4c8` | The full experience names WHICH market it is about |
| `273e2bb` | The full experience composes sideways — ledgers become one canvas |
| `6b0d124` | The rail shows what is already in the trader's hand |
| `c99340a` | The chrome and the content agree where the page begins |

Every one of these was found by *looking at the running product*, not by
reading the code. That is the only reason they exist — each was invisible to
the test suite, which was green before and after.

## The five defects, named

1. **ENTER was a resize.** The full stage took the whole screen and showed the
   same six-capped lists the 420px drawer had. The trader paid a screen and
   bought nothing. `unabridged` uncaps to `Infinity` — "as many as I was
   handed" — not to a bigger number.

2. **The subject was lost at the depth where it mattered most.** FULL read
   `MARKET REALITY · WAIT` over eight unresolved dimensions with nothing saying
   it was about NQ1! on a 15m. FULL is the only stage that takes the chart
   away, so it is the only stage where the trader cannot check for themselves.
   The symbol and timeframe are handed down as props — resolving them in the
   equipment would let the full experience name a different market than the
   chart the trader entered from.

3. **The full experience was a stretched drawer.** Four ledgers ran as one 11px
   column down the left of a 1568px screen with two thirds of it black. Fixed
   with an `auto-fit` grid *under `unabridged` only* — the drawer has no
   sideways to use. WOULD INVALIDATE stays outside the grid: it is not a fourth
   ledger, it is the line under all of them.

4. **The rail did not know what the room was holding.** With the drawer open
   beside the chart, the WORKSPACE entry that opened it looked exactly as it
   had when nothing was open.

5. **The chrome and the content disagreed about where the page began.** At FULL
   the header ran edge to edge while the canvas sat centred in a 1280 column a
   third of the way in — a toolbar bolted onto a document, at the depth whose
   job is to feel like one thing.

## The two rulings worth carrying forward

**The room answers BACK on an event, not in a store.** `equipmentChannel.ts`
argues at length against a React context for journey state: the rail lives in
the OS frame, the frame is shared by all twenty rooms, and one room's open
drawer must not become a field the others carry around. Defect 4 needed the
room to tell the rail something — and the answer was a *second one-way event*
(`wm:equipment-stage`), not a relaxation of that rule. The rail keeps a local
reading scoped to itself and drops it the moment the room changes. It is TOLD
the stage and never derives one; a rail that guessed could mark equipment open
that the room had already closed. `null` + `closed` is a real message, not the
absence of one.

**Arrangement is not disclosure.** Both layout atoms (3 and 5) were guarded by
assertions that the rows which render do not change. In particular
`+N more blocking, not named here` is a *compiler-level* cap that no viewport
can cure, and it is pinned to survive `unabridged` — unlike display truncation,
which the extra room legitimately removes. A layout change that silently ate a
data shortfall would be the worst kind of regression: prettier and less honest.

## What is PROVEN, and what that word means here

PROVEN = observed in a browser on `https://wealthymindsetspro.com`, from the
NORMAL URL, not a harness.

- `7805130`, `7faa4c8` — PROVEN. Drawer named `NQ1! · 15m`; FULL named all 8
  UNRESOLVED, `+2 more` absent, `+5 more blocking, not named here` present.
- `273e2bb` — PROVEN. Inside the equipment layer at FULL the ledgers measured
  `display:grid`, `408px 408px 408px`, at x=320 / 756 / 1192 in a 1280 measure.
  (Note for the next reader: the room's OWN canvas band is a *second* element
  with the same `data-testid`, and it correctly stays `block`. Query all, not
  first.)
- `6b0d124` — PROVEN on localhost both directions: open →
  `data-equipment-open="true"`, `aria-pressed="true"`, hint `"Open in this
  room"`, gold edge `rgb(196,165,116)`; CLOSE → all of it gone. Awaiting the
  prod build at the time of writing.
- `c99340a` — PROVEN on localhost: header and body both `x 320 → 1600`,
  width 1280, identical. Awaiting the prod build.

## Gates

`./node_modules/.bin/vitest run` and `tsc --noEmit`, both unpiped, after every
atom. Final: VITEST=0, 690 files, 8486 tests; TSC=0.

Every new Sentinel assertion was proven non-vacuous by running it against the
pre-fix source. The `c99340a` pair failed with exactly the right sentence:
`the full header has no measure of its own: expected null not to be null`.

## The next atom, and why it was NOT started here

The directive's final clause is "reuse that proven interaction grammar across
the remaining legitimate WM Pro inventions." The obvious second equipment is
the **Market Object Passport**, which currently sits as a permanent band on the
market room — and "permanently displaying every invention on MARKET" is
explicitly banned. Moving it is therefore both a ban-fix and the reuse.

It is blocked on one real piece of work: `RoomEquipmentLayer` is hardcoded
(`equipmentId !== "market-reality"`) and its props take a `MarketCanvasVM`
directly. A second equipment needs the layer to take a handed-down content
descriptor instead — and roughly ten assertions in
`roomAdoptsEquipment.sentinel.test.ts` are pinned to the current shape. Those
Sentinels must be **re-pinned to the meaning, with stronger assertions than
they had**, and moved to follow `MarketCanvasPanel` into the room. That is a
coherent atom of its own and should be started with room to finish, not
half-done at the end of a stretch.

Two constraints for whoever picks it up:

- The layer must stay pure chrome. It may never compile, resolve, or fetch —
  the room hands it a finished view. A second equipment that computed its own
  reading would be the "second semantic brain" the grammar bans.
- Moving the Passport off the permanent band is a Founder-facing change to the
  market room's resting state. It is the right call by the directive, but it
  should ship with a screenshot of the room *without* it, so the Founder is
  shown what the chart looks like uncluttered rather than told.
