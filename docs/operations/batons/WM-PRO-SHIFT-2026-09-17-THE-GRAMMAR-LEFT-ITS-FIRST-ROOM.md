# The grammar left its first room

`5933d219` — `/charts` becomes the second ROOM to carry ROOM → WORKSPACE →
PREVIEW → DRAWER → ENTER → RETURN.

## Why this atom and not another invention

The previous baton closed the second *tenant* — a second piece of equipment
inside the deck. That proved the equipment layer was not the market canvas's
private chrome. It did not prove the thing the directive actually asks for:
that the grammar can be *reused*, by a room that did not help build it.

Those are different claims. Two tenants in one room can still be one room's
bespoke UI wearing a generic name.

## What had to be built first, and why it was not a copy

The deck held ~55 lines of journey plumbing inline: a reducer, a subscribe
effect, a cold-open-from-URL effect, and a combined URL-reflect →
stage-announce → scroll-restore effect. Copying that into `ChartsDashboard`
would have shipped the visible feature and quietly created a second semantic
brain — the kind that agrees with the first most of the time.

Two drift modes were already *measured* on the deck before the extraction:
the room failing to announce its stage (the rail marks equipment open in one
room and dead in the other), and RETURN restoring `window.scrollY` instead of
`os-room.scrollTop` (the "return to the exact room" promise silently degrading
to "return to the top").

So `src/lib/workspace/useEquipmentJourney.ts` was extracted, **the deck was
migrated onto it**, and only then did `/charts` adopt. The second room consumes
the wiring; it does not reimplement it.

## The equipment is not a new invention either

`/charts` already computed `chartMarketCanvas` for the summary pill in its
wordmark row. The pill can only ever say the verdict; pressing it is the first
time the room can show *why*. So the descriptor renders the object the room
already had.

The id is deliberately **identical** to the deck's — `market-reality`. Equipment
is named by what it IS, not by where it was picked up. Forking
`charts-market-reality` would tell the trader the chart room's market reality is
a different object from the deck's. It is not.

## What the Sentinels caught on the way

Both re-pins were forced, not chosen. Neither was softened.

1. **`founderLanding.test.ts` went red** on two new files retyping `"/charts"`.
   A real catch. Both now import `INSTRUMENT_VIEW_ROUTE` from the route's owner
   — including `roomEquipment.ts`, whose registry key is now a *computed* key.

2. **My own new registry scan then went blind** on that computed key — it only
   understood string literals, so it would have reported "all rooms covered"
   about a list it could no longer read. Fixed by counting keys with a regex
   tolerant of both spellings and asserting the count matches.

3. **`roomAdoptsEquipment.sentinel.test.ts` went red six ways** after the
   extraction, because its rules read the DECK for wiring that had moved. The
   tempting fixes — delete the assertions, or leave them pointed at the deck —
   are both the green-and-dead failure the file exists to catch. Instead the
   rules were **split by owner**: one block proves the wiring once against the
   hook, and a `describe.each(ROOMS)` block proves adoption per room.

4. A new rule was added: no room may reach for `subscribeEquipment`,
   `reflectJourneyInUrl`, `announceEquipmentStage`, `pendingScrollRestore`, or
   `equipmentJourneyReducer` directly.

## Non-vacuity, proven four ways

Each gate was made to fail on purpose (`git stash push` / inject, then restore):

- stash `ChartsDashboard.tsx` → `no descriptor for /charts equipment "market-reality"`,
  `/charts has equipment but never calls useEquipmentJourney`, `the layer is not mounted`
- stash `roomEquipment.ts` → `the registry scan found no rooms at all: expected 1 to be greater than 1`
- stash `command-deck/page.tsx` → `/command-deck has equipment but never calls useEquipmentJourney`
- inject `void announceEquipmentStage;` into `ChartsDashboard` → `/charts reaches for
  "announceEquipmentStage" directly. That wiring has one owner`

Gates: `tsc --noEmit` EXIT=0. `vitest run` EXIT=0 — 691 files, 8505 tests (+10).
Both unpiped.

## Live proof, on the NORMAL URL

Walked by real clicks at `https://wealthymindsetspro.com/charts` (NQ1! · 1h),
not a harness and not a hidden route. Screenshot at every stage.

| Stage | URL | What was seen |
|---|---|---|
| ROOM | `/charts` | WORKSPACE renders beneath ROOMS; one entry, *Market reality* |
| PREVIEW | `?equip=market-reality&stage=preview` | widget docked bottom-right; headline + `0 resolved · 8 missing · 11 blocking`; **chart fully intact** |
| DRAWER | `&stage=drawer` | taller not wider; market still visible above; content abridged (`+2 more`) |
| ENTER | `&stage=full` | three-column composition; UNRESOLVED names **all 8** — depth, not a resize |
| RETURN | `&stage=drawer` | same symbol, same timeframe, same chart, same place |

Against the Founder's acceptance question — *did another app load?* No. The rail
never moved, the room never navigated, and RETURN landed on the stage it left
from. **PASS.**

One disclosure survives ENTER deliberately: WHY NOT still reads `+6 more
blocking, not named here`. That is not a cap the full experience forgot to
lift — it is the methodology boundary holding.

## What this does not decide

- `documentWallIsNotADrawer.enforcement.test.ts` still passes, but
  `MarketCanvasPanel` now mounts in a second room. Its "mounted once"
  assumptions were not re-examined here and should be before a third room.
- `DecisionReceiptPanel` remains the only wall document. Still a Founder-facing
  scope call, still not taken automatically.

## Carried, unchanged

Cloudflare build gap escalation: build `651be3e7-0a2e-4f19-b3ea-7aa3b6f0fb36`
FAILED while GitHub CI passed the same SHA `ebf26a2`.
