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

# WM PRO SHIFT BATON — THE ARTERY REACHES FOUR

**Date:** 2026-09-18
**Breaker:** M8 — CANONICALBAR ADOPTION + MARKETOBJECT VOCABULARY
**Commits:** `be0a13ce` (alpaca), `d2b872c3` (finnhub)
**Production consumers of `canonicalBar.ts`:** 2 → **4**

---

## THE HEADLINE

The predecessor baton (THE ARTERY GETS A PULSE) closed with two ingresses live
on the edge and the rule for choosing the next one written down:

> Take the ingress that can fill the canonical fields **truthfully rather than
> by invention**.

Two more are now on it. `/api/alpaca` is **LIVE PROVEN**. `/api/finnhub` is
gated and pushed and is **NOT PROVEN**, for a reason worth more than the proof
would have been — see THE LANE THE VENDOR WILL NOT SERVE.

**LIVE OBSERVATION (2026-09-18, wealthymindsetspro.com):**

| Probe | `requestedTf` | `returnedTf` | `sessionKnown` | `sessionModel` | `refusedBars` |
|---|---|---|---|---|---|
| `/api/alpaca?type=candles&sym=TSLA&tf=6M` | `6M` | `1M` | `false` | `UNKNOWN` | `0` |
| `/api/alpaca?type=candles&sym=BTC&tf=15m` | `15m` | `15m` | `true` | `CONTINUOUS` | `0` |

The two rows **disagree on the session fact**, and that disagreement is the
proof. A deploy landing would make new fields *appear*; only
`alpacaSessionModel()` actually executing per request makes one row say
`CONTINUOUS` while the other says `UNKNOWN` from the same deployed code.

And `6M → 1M` is the timeframe lie, now disclosed on the live edge rather than
inferred from a bar count.

---

## WHY NOT `/api/memecoin`, WHICH HAD THE MOST OBVIOUS DEFECTS

`/api/memecoin` is 113 lines with a silent `.filter()` bar-drop and two of six
fields checked. It was still the wrong choice, and rejecting it is the point.

It is classified **DARK** in `apiEndpointsHaveConsumers.test.ts` — zero
references in `src` outside its own route and test. `REQUIRED_ARTERY_EDGES` is
a ratchet that may only GROW, and growing it with an edge **no live request
ever traverses** buys a number without moving a trader's pixel.

That is "a rename is not a migration" wearing a new costume. Both routes taken
instead are ones `MainChart` actually calls.

---

## THE FABRICATION LADDER, THREE RUNGS

The three routes migrated so far each carried a member of the same family, and
they get worse as you climb.

**Rung 1 — a fabricated VALUE.** `volume: b.v ?? 0`. "Nothing traded in this
bar" is a CLAIM, not an absence, and it is the most load-bearing input to every
volume profile, delta and absorption tool in this repo. `/api/alpaca` had
already killed this exact family TWICE in its own quote branch
(`prevClose ?? price`, `changePct ... : 0`) and written down why — and kept it
in candles. **The same file did not believe its own reasoning one screen
down.**

**Rung 2 — a fabricated GEOMETRY.** `/api/finnhub`:

```ts
high: h ?? Math.max(o, c),
low:  l ?? Math.min(o, c),
```

This does not default a value. It manufactures **a candle with no wick**. A
wick is precisely what a rejection, absorption, failed-auction or stop-run
reader is looking at, and a fabricated one is indistinguishable on screen from
a real wickless print. Every sweep and spring detector in this repo would have
read it as a true observation.

**Rung 3 — a fabricated ABSENCE.** `if (o == null || c == null) continue;` —
two of six fields checked, and the bar leaves with no count and no record. A
silently dropped bar is an **invisible** gap: the chart simply has fewer
candles than the market printed, and nothing anywhere says so.

All three are now counted, disclosed refusals carrying the timestamp as it
arrived.

> A refused bar is a visible gap the trader can be told about.
> A repaired bar is a lie with a timestamp.

---

## MEASURED BEFORE CHANGING BEHAVIOUR

Removing a fallback is only safe if you know what it was catching. Probed on
production BEFORE the edit:

- TSLA 15m via Alpaca: 300 bars, **zero** absent volumes.
- BTC 15m via Alpaca: one **genuine** `0` (crypto volumes are fractional).

`checkBarGeometry` refuses only NON-FINITE and NEGATIVE volume, so the real
zero still draws. The `?? 0` was fabricating for a case that does not occur,
while standing ready to corrupt the profile if it ever did.

**NO CAPABILITY AMPUTATION**: a true wickless print (`high === close`) is
explicitly tested and still draws. Refusal is for ABSENCE, never for a shape we
dislike.

---

## THE TIMEFRAME THAT LIES, MEASURED LIVE

`ALPACA_TF_MAP` collapses SEVEN request spellings — `M`, `1M`, `3M`, `6M`,
`1Y`, `3Y`, `5Y` — onto the single bucket `1Month`, then echoes the REQUEST
back as `tf`. Probed on production: `?tf=6M` returned **75 bars spaced 30.4
days apart**. Monthly candles wearing the label "6M".

Canonical `timeframe` is now derived from the **resolved bucket** and never
from the request. That is also what prevents a collision: with the request in
the identity, one physical monthly bar would mint SEVEN different `barId`s and
the chart would hold it seven times.

---

## FOUR INGRESSES, ONE ID SPACE

`mintBarId` keys on `symbolId|timeframe|asOf|epoch`. With four ingresses minting
into the same artery, identity collisions stop being hypothetical:

| Ingress | Same instant, same instrument, minted as |
|---|---|
| `/api/exchange` | `COINBASE:BTC` |
| `/api/alpaca` | `ALPACA:BTC/USD` |
| `/api/finnhub` | `BINANCE:BTCUSDT` |

Unprefixed, two of these would mint the identical `barId` and `admitBar` would
refuse the second at equal `truthEpoch` as a **redelivery** — silently deleting
a real bar from a real venue. Two exchanges are two order books, with two
prices and two last trades. They genuinely ARE different instruments.

### Identity is the instrument ANSWERED, not the one ASKED FOR

`toFinnhubSym` resolves a request naming **USD** (`BTCUSD`) to
`BINANCE:BTCUSDT`. **USDT is not USD.** The route already discloses the
substitution as `providerSymbol`; minting identity from the REQUEST would file
a Binance USDT bar on the books under a USD instrument's name — the label and
the number with different owners, which is Canon Weakness #1.

Where the provider symbol is already venue-qualified it is kept as-is, because
`BINANCE` is a truer statement than the name of the vendor we happened to ask.

---

## THE UNIT TRAP, NOW IN BOTH DIRECTIONS

`CanonicalBar.asOf` is epoch **MILLISECONDS**. `LegacyOhlcvTuple.time` is epoch
**SECONDS**. Both are a bare `number`.

`/api/finnhub` is the first ingress whose **provider** also speaks seconds, so
the conversion now happens twice, explicitly, in opposite directions. Getting
either wrong places every bar ~50,000 years out or back in 1970, with no type
error, no throw, and a chart that simply renders nothing.

---

## THREE HOLES FOUND IN MY OWN GATES, BY MUTATION

A gate that has never failed against a real defect is a decoration.

### 1. The prose trap sprang a SECOND time

`expect(route).not.toMatch(/volume:\s*\w+\.v\s*\?\?/)` matched my own route
**comment** recording the retired defect. The code was right; the gate was
wrong.

Positive assertions can be made prose-immune by assignment form
(`sessionId: SESSION_CONTINUOUS,`). **Negative assertions cannot** — describing
a retired defect accurately requires spelling it. So a shared `codeOnly()`
comment-stripper now serves every negative assertion in the file.

> A gate that cannot tell an explanation from a decision is a standing
> incentive to stop explaining, and the reasoning is the most valuable thing in
> the file.

### 2. The gate pinned a SPELLING, not a DEFECT CLASS

Mutation receipt: I reintroduced the fabrication as
`.map(c => ({ ...c, volume: c.volume ?? 0 }))` and the sentinel **PASSED**.
`/volume:\s*\w+\.v\s*\?\?/` describes `b.v ??` and nothing else.

Broadened to `/volume:[^,\n}]*(\?\?|\|\|)/` and re-proven. The logical-or
variant confirms the broadening was necessary rather than cosmetic.

### 3. A type-only import is erased by the compiler

Carried forward from the previous block and re-proven on both new routes: the
runtime-edge lookahead catches an ingress silently leaving the artery, and the
wire shape looks identical either way.

**Mutation receipts this block: nine.** Four on `/api/alpaca`, five on
`/api/finnhub` (wick repair, silent drop, logical-or volume default, identity
from the request, type-only import). Every one EXIT 1; every restore EXIT 0.

---

## THE LANE THE VENDOR WILL NOT SERVE

`/api/finnhub?type=candles` **cannot be live-proven**, and the reason is a
finding rather than an excuse. Measured on production, same host, same minute,
**same token**:

| Probe | Result |
|---|---|
| `?type=quote&sym=TSLA` | **200** — real price, real `observedAt` |
| `?type=search&q=tesla` | **200** — real results |
| `?type=candles&sym=TSLA&tf=15m` | **403** `{"edge":"FORBIDDEN"}` |
| `?type=candles&sym=BTC&tf=15m` | **403** `{"edge":"FORBIDDEN"}` |

The credential is good. The **capability** is not on the plan. Upstream refuses
before any of the new code executes, so the ingress is proven by its suite and
its mutation receipts and by nothing on the live edge — recorded as **NOT
PROVEN**, which is what that means.

### What is NOT being changed, and why

It is tempting to reclassify `403 → NOT ENTITLED`. `finnhubUpstreamStatus.ts`
forbids exactly that, in its own words:

> never returns anything resembling "delayed by entitlement" — that is a claim
> about a data licence, and no HTTP status is evidence for it.

**That law is correct and stands.** One status is not evidence of a licence.
What IS evidence is the CONTRAST above: one credential, two capabilities, two
different answers in the same minute. A single request cannot see that, so the
honest place for it is a bounded capability probe on the M10 ladder
(`AUTHENTICATED → ENTITLED`), not a reinterpretation of a status code.

**Surfaced, not rush-wired.** Left for M10 with the measurement attached.

---

## GATES

| Gate | Result |
|---|---|
| `tsc --noEmit` (unpiped) | **EXIT 0** |
| `vitest run` (unpiped) | **EXIT 0** — 812 files, 10292 passed, 2 skipped |
| Suite delta | 10242 → 10292 = **+50** |
| Delta checked, not asserted | 19 alpaca + 4 sentinel + 22 finnhub + 5 sentinel = 50 |
| Live `/api/alpaca` | **PROVEN** — `6M→1M`, and TSLA/BTC disagree on session |
| Live `/api/finnhub` candles | **NOT PROVEN** — upstream 403 before our code runs |

---

## WHAT IS STILL OPEN ON M8

One ingress remains, and it should **not** be migrated for ratchet credit:

- `/api/memecoin` (113 lines, GeckoTerminal DEX OHLCV) — **DARK**. Its silent
  `.filter(c => isFinite(c.time) && isFinite(c.close))` drop and its two-of-six
  field check are real defects and are recorded here, but a dark edge does not
  belong in a ratchet that counts live adoption.

Four census shapes still need judgement, not renames:
`DeckMarketChart::Candle` (differs by `volume?`, load-bearing),
`marketEvent::CanonicalMarketEvent`, `selectAbsorptionAnatomy::AnatomyBar`,
`::AnatomyBarInput`.

### A defect found while reading, not yet fixed

`MainChart.fetchFinnhubCandles` applies its own **client-side** silent drop —
`.filter(b => b.open > 0 && b.high > 0)` — one layer BELOW the server-side drop
just removed, uncounted, and on the Finnhub path only while the Yahoo path has
no equivalent. `checkBarGeometry` does **not** check price positivity, so this
filter is not redundant and must not simply be deleted; the asymmetry and the
silence are the defects. Recorded for the next block.

**Saying `SESSION_UNKNOWN` where the session is genuinely unknown remains
correct. Inventing a session remains forbidden. Amputating bars that carry no
session remains forbidden.**

M9 (replay driving the real past via frozen CanonicalBar ancestry and truth
epochs) depends on this adoption half and **must never be faked by slicing
today's bars.**

---

**Handoff:** four ingresses on the artery. One newly live-proven, one blocked
by a vendor plan and honestly marked so. The adoption ratchet may only grow
from here.
