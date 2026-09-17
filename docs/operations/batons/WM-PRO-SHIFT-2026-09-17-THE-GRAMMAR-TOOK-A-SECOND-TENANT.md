# Baton — the grammar took a second tenant

**Receipt, not authority.** Nothing here is a new rule. The rule is still the
Founder's INTERACTION CUTOVER directive, whose closing clause reads *"then reuse
that proven interaction grammar across the remaining legitimate WM Pro
inventions."* This records the first time that clause was exercised, and exactly
how far the proof got.

Commits: `0c6ddd76` (the grammar stops naming its first tenant) · `0988b3aa`
(the Object Passport becomes the second)
Room: https://wealthymindsetspro.com/command-deck

---

## Why these two commits are one block

A grammar with one tenant is not a grammar; it is a feature with a comment
claiming to be reusable. `0c6ddd76` removed the first tenant's name from the
equipment layer — the layer stopped taking a market-canvas VM and started taking
a descriptor (`equipmentId`, `title`, `verdict`, `headline`, `counts[]`,
`renderDepth(unabridged)`). `0988b3aa` then handed it a second descriptor built
from a completely different compilation. The second commit is what makes the
first one *true* rather than aspirational, so they are reported together.

## The subtraction the Founder is meant to see

The Market Object Passport used to be an `<article>` pinned open in the room's
document band — eight dimension rows visible whether the trader had asked for
them or not. That is precisely the directive's ban on *"permanently displaying
every invention on MARKET"*. It is now picked up from Workspace like any other
equipment, and the document wall honestly renders `data-wm-documents="1"`.

It did not become less reachable. One rail press opens it; the drawer holds it
beside a still-live chart; ENTER gives it a whole screen. Its identity line
(`PassportStamp`) stays above the fold, so the market object is still *named*
without being *picked up*.

## Depth is not size

`unabridged` had to mean something structural or ENTER would be a resize. On
this panel it means: **nothing is behind a `<details>`**. The docked depth folds
each row's evidence lineage behind a disclosure — defensible at 420px beside a
chart, and indefensible on a whole screen, because *"if the intelligence exists
but requires hunting through implementation containers: FAIL"* is the directive's
own words for a `<details>` inside a drawer inside a room.

A test pins the harder half of that claim: uncapping ADDS nothing and WITHHOLDS
nothing. Same rows, same lineage strings, same counts in both depths —
arrangement is not disclosure.

## No second semantic brain

`passportEquipment` is built from the `passport` memo the stamp band already
reads. No second selector call, so the stamp and the equipment cannot come to
disagree about how much of the passport is filled in. The Sentinel
`roomAdoptsEquipment` was re-pinned to follow the new indirection: it now walks a
`DESCRIPTORS` list and applies the "no `compose*(`/`select*(`" rule to **every**
descriptor the room can hand down, not just the first one.

## The Sentinel forked; it did not soften

`documentWallIsNotADrawer` existed to stop a panel being buried. Moving the
passport off the wall is exactly what burial sounds like from the inside, so the
rule split into two reachability guarantees instead of dropping an assertion:

- **WALL panels** — mounted once, zero `<details>` deep, above the Workspace
  fold, carrying their own probe handle.
- **EQUIPMENT panels** — mounted once, zero `<details>` deep, **and** registered
  in `roomEquipment.ts`, **and** reached through `renderDepth`.

A panel that is on neither list fails both. The wall also now has to count itself
honestly: `data-wm-documents` must equal the number of wall panels, or the test
names the discrepancy.

## Gates

- `./node_modules/.bin/vitest run` — EXIT 0. 690 files, 8495 tests (up 5).
- `./node_modules/.bin/tsc --noEmit` — EXIT 0. Both unpiped.
- Every new/re-pinned gate proven non-vacuous by `git stash push` on the source,
  observing EXIT 1 with the specific message, then `git stash pop`. The five
  observed failures: *"roomEquipment.ts → /command-deck has no passport entry"*,
  *"the wall claims 2 documents but 1 are mounted on it"*, *"the passport's full
  stage does not uncap it"*, *"the equipment must be handed a descriptor"*, *"the
  full stage still buries the lineage in a disclosure"*.

## What was observed, and where

**On `localhost:3000`, by real clicks from the NORMAL URL, screenshot at every
stage:**

| Stage | Observed |
|---|---|
| ROOM | Rail: Workspace → *Market reality* → *Object passport*. `wallDocs:"1"`, `passportArticle:false`, `passportSections:0` — the passport does not render at rest at all. The stamp band still reads `MARKET OBJECT PASSPORT · OBJECT ID chart:NQ1!…28167153 · STATE QUALITY UNAVAILABLE · RESOLVED 0 of 8 dimensions`. |
| PREVIEW | `?equip=market-object-passport&stage=preview`. Widget: `OBJECT PASSPORT · NQ1! · 15m · UNAVAILABLE`, headline *"Every reading carries its own lineage — 0 of 8 objects are sealed with evidence."*, counts `0 resolved / 8 unresolved / 8 objects`. |
| DRAWER | Docked beside a still-visible chart, rows folded with `DNA · 0 REFS` chips. |
| FULL | Whole screen, `RETURN TO ROOM` top-right, all 8 rows with `MISSING / INVALIDATION` inline — no `<details>` — and `snapshot chart:NQ1!:RTH:15m:no-price:… · sealed 2026-09-17 06:56:07Z` at the foot. |
| RETURN | Back on `stage=drawer` — the stage entered from. |

Equipment #1 re-probed and unregressed: `?equip=market-reality&stage=drawer` →
`{"stage":"drawer","aria":"Market reality — room equipment","hasCanvas":true,"hasPassport":false}`.

## PROVEN ON PRODUCTION

This section was first written as a blocker. Immediately after the push, prod
still served a pre-`0c6ddd76` build (`wallDocs:"2"`, `passportArticle:true`,
WORKSPACE listing only *Market reality*), and the honest thing was to say so and
move to another lane. The Cloudflare Workers build then landed, and the journey
was walked at `https://wealthymindsetspro.com/command-deck` — the NORMAL URL, by
real clicks, screenshot at every stage:

| Stage | Observed on production |
|---|---|
| ROOM | `wallDocs:"1"`, `passportArticle:false`. The eight always-open dimension rows are gone from the band; the chart, the four canvas columns and the stamp line (`MARKET OBJECT PASSPORT · OBJECT ID chart:NQ1!…28696763 · RESOLVED 0 of 8 dimensions`) are what remains. **This is the screenshot the Founder was owed** — the uncluttered room, shown rather than described. |
| PREVIEW | `?equip=market-object-passport&stage=preview`, same pathname. Widget bottom-right; the chart and canvas stayed readable behind it. |
| DRAWER | Docked beside a still-live chart. `detailsInsideEquipment: 8` — every row folded, each carrying a `DNA · 0 REFS` chip that says what is behind the fold. |
| FULL | `detailsInsideEquipment: 0`, `dnaBlocks: 8`. Every dimension's MISSING / INVALIDATION rendered inline, `RETURN TO ROOM` the only control, `snapshot chart:NQ1!:RTH:15m:no-price:… · sealed 2026-09-17 07:04:56Z` at the foot. **Depth, measured — not a bigger box.** |
| RETURN | `stage=drawer` — the stage entered from, not a reset to preview. `pathname: "/command-deck"`, `chartStillThere: true`. |

Against the Founder's own acceptance criteria: previewed it, entered it,
experienced its full depth, returned without losing my place. **PASS.**

## What the production screenshot then caught

The room-at-rest capture shows the rail reading `Passport` (ROOMS) four lines
above `Object passport` (WORKSPACE) — the trader's own memory vault and a market
object's evidence lineage, sharing a noun with nothing to tell them apart. Fixed
in `1d225210`: the equipment now carries the canon name in full, *Market object
passport*, matching the stamp band above the chart.

That fix is now live too, and was re-probed the same way it was found — at
`https://wealthymindsetspro.com/command-deck`, reading the rail's own button
text rather than trusting the deploy: `["Passport", "Market object passport…"]`.
The trader's room and the market object's equipment no longer differ by a
qualifier the eye has to supply.

That defect was invisible in every test and obvious in the first screenshot,
which is the entire argument for looking.

Also carried, unchanged: the Cloudflare build gap escalation (build
`651be3e7-0a2e-4f19-b3ea-7aa3b6f0fb36` FAILED while GitHub CI passed the same
SHA `ebf26a2`).

## What this does not decide

`DecisionReceiptPanel` is now the only wall document, and the "reuse that grammar"
clause will eventually point at it. It is not taken here, because a receipt may
legitimately be a document to *read* rather than equipment to *pick up*. That is a
Founder-facing scope call, not an automatic next atom.
