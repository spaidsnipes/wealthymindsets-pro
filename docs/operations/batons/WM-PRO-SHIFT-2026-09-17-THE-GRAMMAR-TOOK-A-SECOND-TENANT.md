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

## Open, and stated plainly

**Production has not served this yet.** Probed `https://wealthymindsetspro.com/command-deck`
after the push: `wallDocs:"2"`, `passportArticle:true`, and WORKSPACE lists only
*Market reality*. That is a pre-`0c6ddd76` build. `origin/main` is at `0988b3aa`,
so the code is pushed and the Cloudflare Workers build is what is outstanding —
**nothing about this journey may be called PROVEN on production until it is
walked there.**

The specific Founder-facing proof still owed, once the build lands: a screenshot
of the room **without** the permanent passport band, so the Founder is *shown* the
uncluttered chart rather than told about it — then the same five-stage walk on the
production URL.

Also carried, unchanged: the Cloudflare build gap escalation (build
`651be3e7-0a2e-4f19-b3ea-7aa3b6f0fb36` FAILED while GitHub CI passed the same
SHA `ebf26a2`).

## What this does not decide

`DecisionReceiptPanel` is now the only wall document, and the "reuse that grammar"
clause will eventually point at it. It is not taken here, because a receipt may
legitimately be a document to *read* rather than equipment to *pick up*. That is a
Founder-facing scope call, not an automatic next atom.
