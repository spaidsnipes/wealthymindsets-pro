# PAPER EXECUTION REALISM STANDARD

Written 2026-09-19 because the gate row for "Paper execution state machine
realism" says, in its own words: *"The first work on this gate is to write down
the standard, not to change the fills — a realism change with no stated
standard cannot be reviewed or reverted."* This is that standard. It is a
review instrument: every future change to the fill path must name which rung of
the ladder below it moves and which observed input pays for it, or it is not a
realism change and must not be sold as one.

## The definition

**Realism in /paper is fidelity to what was observed, not similarity to what a
broker would have done.**

A paper fill is REALISTIC exactly when:

1. every number on the resulting `Trade` was genuinely produced by a feed this
   product received (a price that printed, a time it was observed), and
2. every assumption the fill needed that the data could NOT support is
   **disclosed on the record itself**, not defaulted.

A paper fill is UNREALISTIC when it carries a number no feed produced —
regardless of how plausible that number is. Plausibility is the failure mode,
not the goal: a minted "realistic-looking" slippage figure is harder to
distrust than an honest simplification, and a trader calibrating on it learns
a market that does not exist.

## Why this definition and not "simulate a broker"

The alternative standard — model spread, slippage, queue position, partial
fills — requires microstructure data this product does not have on the /paper
lane (no depth, no attributed tape, delayed quotes on some feeds). Every
parameter of such a model would be invented, and the state machine has already
paid for inventions three times, each one measured and repaired:

- `const fillPx = ord.limitPx ?? px` booked the LIMIT LEVEL — a number no
  quote ever produced — into the ledger, the cash decrement and the rejection
  selector (`selectOrderFill` docblock, `paperTrade.ts`).
- `if (realized !== 0) trade.pnl = realized` erased the measured scratch,
  making "closed at exactly breakeven" byte-identical to "never closed"
  (`paperTradeOutcome.ts`).
- Win rate counted openings in its denominator, biased downward by
  construction (`paperTradeOutcome.ts`).

All three were the same defect class: **a written value diverging from the
observed value.** The standard therefore fixes the direction of repair:
converge on observation, never on invention.

## The positions the code already holds (the floor — regressions are defects)

| Position | Owner | The rule |
| --- | --- | --- |
| The price is the observed price | `selectOrderFill` | The limit answers WHETHER a fill happens, never HOW MUCH. Price improvement is recorded in both directions because the observed print is what the ledger gets. |
| Assumptions are disclosed, not defaulted | `selectFillQueueBasis` | A fill at exactly the limit is graded `at-the-touch` — the record itself says a real order would have needed queue priority we cannot know. `marketable` and `unconditioned` are the only other grades; nothing is silently upgraded. |
| Absence is not zero | `paperTradeOutcome.ts` | A scratch is a recorded `pnl: 0`. A never-closed fill has no `pnl`. A trader with no closes has a `null` win rate, never `0%`. |
| Staleness is on the record | `fillPriceAgeMs` / `describeFillPriceAge` | A fill against a delayed quote carries how old that observation was; the H-shift already killed the "LIVE PRICES" overreach on this page. |
| Resting orders never fill by assumption | `selectCloseOrderPlan` | Only pending MARKET orders count toward projected position; a resting limit "would probably fill" is exactly the guess this file refuses. |
| Corrupt records grade out, not down | `classifyPaperTradeOutcome` | A non-finite `pnl` leaves both numerator and denominator. |

## The fidelity ladder (how realism is allowed to increase)

Each rung is permitted ONLY when the named observed input actually exists on
the lane feeding /paper. Climbing a rung without its input is fabrication
wearing a realism costume.

- **Rung 0 — where we stand.** Fills against the observed last price, with
  queue basis and price age disclosed. This rung is COMPLETE; changes here are
  bug fixes, not realism work.
- **Rung 1 — the spread.** Requires a real bid/ask observation at fill time.
  Then a buy may fill at the observed ASK and a sell at the observed BID —
  still observed numbers, just the correct side. FORBIDDEN until then: any
  fixed-bps or percentage spread assumption; that is a minted number.
- **Rung 2 — the touch.** Requires real trade tape at the limit level. Then
  `at-the-touch` fills may be refused until the tape shows volume trading AT
  the level beyond the order's queue-ahead — and the refusal disclosed.
  FORBIDDEN until then: probabilistic fill-at-touch models.
- **Rung 3 — size.** Requires depth (L2). Then partial fills may reflect
  displayed size. FORBIDDEN until then: random or fixed partial-fill ratios.
  (Depth is a licensed-data blocker today — see the Asset 08 row; this rung is
  expected to stay closed for a while, and that is fine.)

The rungs are ordered by data availability, not by importance. Note what is
NOT on the ladder at any rung: latency simulation, rejection randomness,
"realistic" price jitter. Those inject noise a trader cannot audit, and the
product's whole posture is that every number on screen has an owner.

## Review checklist for any future fills change

1. Which rung does this move, and what NEW observed input justifies it?
2. Does any written value diverge from an observed value? If yes, stop.
3. Is every new assumption disclosed ON the trade record (a field a screen can
   render), not in a comment?
4. Do absence and zero still mean different things everywhere the change
   touches?
5. Can the change be reverted by deleting it, without data migration on
   persisted books? If not, what happens to books written in between?
