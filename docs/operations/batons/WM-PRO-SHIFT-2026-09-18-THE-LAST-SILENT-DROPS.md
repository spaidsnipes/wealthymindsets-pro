<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **shift baton** — a hand-off written at the end of one shift. Its filename names its own day. It was true
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

# WM PRO SHIFT — THE LAST SILENT DROPS

Sealed 2026-09-18. Follows `WM-PRO-SHIFT-2026-09-18-THE-ARTERY-REACHES-FOUR.md`.

Commits: `af5da125`, `0600ff4f`. Both on `main`.

---

## THE HEADLINE

Two atoms, and neither of them added a feature. One repaired a MEASUREMENT
that had quietly stopped measuring anything. The other retired the last silent
bar-drop on the finnhub lane — which turned out to be in the CHART, not in the
route I had spent the previous block fixing.

| Gate | Before | After |
| --- | --- | --- |
| `tsc --noEmit` | EXIT 0 | EXIT 0 |
| `vitest run` | 10292 passed | 10297 passed (+5) |
| Test files | 812 | 812 |
| Mutation receipts this block | — | **five**, every one EXIT 1, every restore EXIT 0 |

---

## ATOM 13 — A SCOREBOARD THAT COULD NEVER MOVE AGAIN

`canonicalBarAdoption.sentinel.test.ts` held the private-bar census at FOUR and
its own header already said the four survivors are *"GENUINELY DIFFERENT SHAPES
rather than one tuple under many labels"*.

Read those two facts together and the gate was broken. A ratchet that may only
SHRINK, guarding four things that can never honestly shrink, reports permanent
debt that does not exist. Every future engineer reads `4` as four outstanding
migrations. **A gate that cries wolf about phantom debt is a gate nobody will
believe about the real debt.**

It was also blind in the only direction that still mattered. Drop `eventType`
from `CanonicalMarketEvent`, or make the deck's deliberately-optional `volume`
required, and a resident becomes a genuine competing bar — while the census
does not move a single digit, because the *name* is still on the list.

### The judgement, taken on all four

| Shape | Verdict | The code fact that makes it so |
| --- | --- | --- |
| `DeckMarketChart::Candle` | INCOMPLETE_OBSERVATION | `volume?` is optional; the deck forwards none |
| `marketEvent::CanonicalMarketEvent` | NOT_A_BAR | has `eventType`; all four OHLC optional |
| `selectAbsorptionAnatomy::AnatomyBar` | DERIVED_VIEW | `absorbing`, `effortNorm` — verdicts no venue sends |
| `selectAbsorptionAnatomy::AnatomyBarInput` | ADAPTER_INPUT | `askVol`/`bidVol` — a split CanonicalBar does not carry |

**ZERO INGRESSES WERE MIGRATED BY THIS CHANGE.** It is a measurement
correction, and it is named as one in the code, the commit and the gate row.
The census total stays **pinned at four** — no entry was deleted. What was
added is a verdict column, and `UNMIGRATED` is now the real scoreboard: it is
**zero**, and it may only shrink.

### The teeth: a classification cannot be won by writing a comment

Each verdict is re-derived from the **declaration body in the real file, every
run**. The prose is not the evidence; the predicate beside it is. Plus:

- a **coverage** gate — the classified keys must equal the census exactly, so
  a resident cannot sit there with no verdict at all;
- a **reachability** gate — a plain `time/open/high/low/close/volume` clone is
  run against all four predicates and must escape through none of them. Without
  it, "zero unmigrated" would be satisfied by a record containing only labels.

### The gate's first catch was ME

First run, EXIT 1. I had written the deck's proof as *"carries no `volume`
field at all"*. It carries `volume?: number`. The census header three hundred
lines above had already recorded the true fact — *"differs by `volume?`"* — and
I had not read my own file carefully enough.

**Optionality is the distinguishing fact**: a shape that admits a bar with no
volume cannot become a `CanonicalBar` without inventing one. Moving the proof
to the true field is not relaxing it, and that claim is itself testable — the
required-volume clone in the reachability gate still fails the predicate.

The failure message I had written told me not to relax the predicate. It was
right, and I was the first person it said it to.

---

## ATOM 14 — THE LAST SILENT DROP WAS IN THE CHART

Previous block, I retired three rungs of the fabrication ladder inside
`/api/finnhub`. The fourth rung was downstream, in `MainChart`:

```ts
const bars = (json.candles ?? []).filter(b => b.open > 0 && b.high > 0);
```

One expression, wrong three separate ways.

**1. SILENT.** A bar removed there left an INVISIBLE GAP. The chart simply got
shorter. Nothing on screen, and no counter anywhere, said a bar had been
dropped.

**2. AN AMPUTATION.** A non-positive price is not a malformed price. Crude oil
printed **negative in April 2020** and that was a real auction. `canonicalBar`'s
`checkBarGeometry` refuses non-finite, inside-out and un-traded bars — and
*pointedly does not* refuse a price for being negative. This filter did. It is
exactly why the filter could not simply be tightened: the correct behaviour is
not a stricter positivity rule, it is no positivity rule.

**3. ASYMMETRIC BY ACCIDENT, not by design.** This is the finding that settled
it. `fetchFinnhubCandlesDirect` requests the **identical** `/api/finnhub` URL
with the same params, applies **no filter at all**, and runs **FIRST** — the
filtered function is only reached when the unfiltered one returned `null`. Two
readers of one endpoint disagreed about which bars exist, and neither could see
the disagreement. Nobody designed that. It accreted.

### Why deleting it is a retirement and not an amputation

The filter was cleaning up after the route's own fabrications: `volume ?? 0`
and `high ?? Math.max(open, close)` could emit a bar of zeroes, and `open > 0`
swept those away. **Those fabrications no longer exist.** `/api/finnhub` now
refuses a malformed bar at ingress across all six fields rather than two, and
DISCLOSES the count as `refusedBars`.

The protection did not disappear. It moved upstream, got stricter, and started
telling the truth about itself. Re-deciding it in the chart would be a second
owner of what a bar is — which is the whole of M8.

---

## LIVE, OBSERVED IN THE FOUNDER'S OWN SESSION

Probed from the authenticated tab on `https://wealthymindsetspro.com/charts`:

```
/api/finnhub?sym=TSLA&type=candles  ->  403
  { error: "Finnhub FORBIDDEN (HTTP 403)", edge, source }
/charts                              ->  9 canvases rendering
```

Two things worth recording.

**The atom 14 repair is genuinely live-unobservable, and now that is MEASURED
rather than assumed.** The lane answers 403, so `fetchFinnhubCandles` returns
`null` before execution ever reaches the line I changed. It is code-proven and
live-unproven, and it is written down that way on the M8 row. No claim of
PROVEN was made for it.

**`finnhubUpstreamStatus.ts`'s law held live.** The edge said *"Finnhub
FORBIDDEN (HTTP 403)"* and did NOT say "delayed by entitlement". No single HTTP
status is evidence about a data licence, and the deployed code declined to
pretend otherwise under real conditions.

`/charts` showed no console errors — noting honestly that console tracking
began after page load, so that is supporting evidence, not proof.

---

## A GATE MEASURED AND FOUND SUBSTANTIALLY CLOSED

**"Paper execution state machine realism"** is on the Founder's open list. I
measured it before repairing it, and the measurement refutes most of it.

`paperTrade.ts` is already explicit: *"THE PRICE IS THE OBSERVED PRICE, for
every order type. The limit answers WHETHER, never HOW MUCH. This is
deliberately not a fill model: no slippage, no spread, no queue position.
Minting a plausible number is the defect, not the cure."*

And the boundary is not buried in a docblock — `/paper` ships
`FillQueueBasisNote` on the blotter, naming **canon weakness #9 PAPER-FILL
OVERCONFIDENCE** to the trader, derived from the order's own recorded
`limitPx`/`fillPx` so orders persisted before the note existed are graded by the
same rule.

The honest verdict is the same one M2 and M5 earned: **partly refuted on
measurement.** Had I opened this atom by writing code, I would have built a
second disclosure beside a working one. Recorded, not invented.

---

## STILL OPEN

- **M8 census** — `UNMIGRATED` is zero and pinned. The remaining M8 work is
  ADOPTION (consumers), not census.
- **M10 bounded capability probe** — `AUTHENTICATED → ENTITLED`, carrying the
  now twice-measured finnhub 403 contrast. Surfaced, not rush-wired.
- **`/api/memecoin`** — real defects recorded, but it is DARK. Migrating a route
  no live request traverses is adoption theater.
- **M9 repair 2** — frozen CanonicalBar ancestry + truth epochs. Must never be
  faked by slicing today's bars.
- **M3** must be RE-MEASURED before repair. **M6** generalise the dated-status
  rule to route and shell prose. **M7** truthful decision-birth persistence.
- **Decision Memory sealing** — zero production callers. Architectural. Surface,
  do not rush-wire.
- **Delta Bubbles level ownership**; **Live VP render geometry proof**.

### Blocked, honestly

- `/api/finnhub` candles — upstream **403**, re-confirmed live this block.
- Gate 4 responsive proof — programmatic resize does not take effect,
  `outerWidth` pinned.
- `/journal` detail canvas — 0 journal entries.
- Live-bar fold observation — needs real ticks.
- Asset 08 (licensed L2 depth), Asset 18 (signed tape).

---

*Five mutation receipts this block. The first one that fired was pointed at my
own wrong predicate, and the gate was right.*
