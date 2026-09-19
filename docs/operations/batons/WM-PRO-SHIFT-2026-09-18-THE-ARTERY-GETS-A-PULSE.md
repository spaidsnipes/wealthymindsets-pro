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

# WM PRO SHIFT BATON — THE ARTERY GETS A PULSE

**Date:** 2026-09-18
**Breaker:** M8 — CANONICALBAR ADOPTION + MARKETOBJECT VOCABULARY
**Commits:** `31c5cf42`, `89bc2a93`
**Production consumers of `canonicalBar.ts`:** 0 → **2**

---

## THE HEADLINE

The predecessor baton (TWENTY-TWO NAMES FOR SIX NUMBERS) closed with the
census at six and the honest verdict: **zero ingresses migrated**. The number
had fallen through renames and deletions while not one live request routed
through the artery.

This block is the other kind of movement. Two ingresses — `/api/yahoo` and
`/api/exchange` — now mint real `CanonicalBar`s on the live edge, and both
were **observed in production**, not merely compiled.

**LIVE OBSERVATION (2026-09-18, wealthymindsetspro.com):**

| Probe | `barProvenance` | `sessionKnown` | `sessionModel` | `refusedBars` |
|---|---|---|---|---|
| `/api/exchange?ex=coinbase&coin=BTC&tf=15m` | `REST_BACKFILL` | `true` | `CONTINUOUS` | `0` |
| `/api/yahoo?sym=TSLA&tf=4h` (`sourceMode: reconstructed`) | `DERIVED` | `false` | — | `0` |

The two rows **disagree**, and that disagreement is the proof. A deploy
landing would make new fields *appear*; only `yahooProvenance()` actually
executing on the live edge makes one route say `DERIVED` while the other says
`REST_BACKFILL`. Both `candles` arrays were unchanged (300 each) — the wire
shape consumers read was deliberately not touched.

---

## TWO RATCHETS, POINTING OPPOSITE DIRECTIONS

The census alone can always be gamed: rename a type and the number falls
without a single behaviour changing. So this block added a second counter that
moves the other way.

- **The census** counts what we migrate AWAY from. It may only SHRINK.
- **`REQUIRED_ARTERY_EDGES`** counts what we migrate TOWARD. It may only GROW.

A rename moves the first and not the second. Only a real migration moves both.

---

## WHAT THE GATES COULD NOT SEE, AND NOW CAN

### 1. A type-only import is erased by the compiler and proves nothing

`/api/exchange` already carried `import type { LegacyOhlcvTuple }` from the
artery. That edge is present in no bundle. The adoption gate was counting it
as adoption. The regex now demands a **runtime (value) edge** via a
`(?!type\s)` negative lookahead.

**Mutation receipt #1:** the route's ingress import changed to `import type`
→ gate FAILED with the correct message. Restored → PASSED.

### 2. A regex gap that crosses statement boundaries assembles a fake edge

`import\s+(?!type\s)[\s\S]{0,400}?from\s+["']…canonicalBar["']` can begin at
one `import` statement, run *past a semicolon*, and finish at a LATER
statement's `from` clause — reporting a runtime edge stitched together out of
two unrelated imports. `/api/exchange` is exactly the shape that triggers it:
a type-only artery import sitting above a value import of something else.

Fixed with `(?:(?!;|\bimport\b)[\s\S]){0,400}?`.

**Mutation receipt #2:** with the route genuinely broken (`import type`), the
LOOSENED regex still PASSED while the tightened one FAILED. The tightening is
load-bearing, not cosmetic.

### 3. A gate must assert on CODE, not PROSE

The first version of the session-linkage gate used
`expect(src).not.toContain("SESSION_UNKNOWN")` and **failed against correct
code** — because the ingress header NAMES `SESSION_UNKNOWN` while explaining
why it is the wrong answer for a crypto venue.

A gate that cannot tell an explanation from a decision becomes pressure to
delete the explanation, and the reasoning is the most valuable thing in the
file. All three pairs moved to assignment form:
`sessionId: SESSION_CONTINUOUS,` / `fidelity: MARKET_FIDELITIES.INDICATIVE,` /
`provenance: BAR_PROVENANCES.REST_BACKFILL,`. Prose-immune.

---

## THE UNIT TRAP

`CanonicalBar.asOf` and `receivedAt` are epoch **MILLISECONDS**.
`LegacyOhlcvTuple.time` is epoch **SECONDS**. Both are bare `number`.

`toLegacyTuple` copies `asOf` straight into `time`. Used on a seconds-side
route it places every bar roughly **fifty thousand years in the future** with
no type error, no throw, and a chart that simply renders nothing.

Both ingresses therefore define their own `toLegacySecondsTuple` that states
the `÷1000` explicitly, and `canonicalBar.ts` now carries the unit declaration
inline on the fields rather than in anyone's head.

---

## SESSION: A DIFFERENT ANSWER, NOT A BETTER GUESS

`SESSION_UNKNOWN` says **we do not know** which session a print belongs to.
`SESSION_CONTINUOUS` says **there is no such thing here** — a public crypto
spot book has no open, no close, no auction, no pre/post. Answering "unknown"
for a continuous venue is its own small lie: reporting an absence of
information where the information exists and is "none."

**This is a LOOSENING and it is recorded as one.** `isSessionKnown` returns
TRUE for `CONTINUOUS`, so `admitBar` no longer refuses an `EXECUTABLE` claim
on such a bar. The guard existed to stop a bar being called executable when we
could not say whether it printed outside RTH. On a venue with no RTH there is
no outside; enforcing it anyway would be superstition rather than rigour.

It does **not** follow that crypto bars are executable. `exchangeCandleIngress`
mints `INDICATIVE` and can mint nothing else, for a wholly separate reason:
`/api/exchange` is a public REST proxy and no execution adapter routes through
it, so nobody can say this price is the one an order would meet.

Two independent reasons to withhold EXECUTABLE. This constant retires exactly
one. The other still binds, and both halves are proven in the artery's own
suite — `CONTINUOUS` permits, `UNKNOWN` still refuses.

---

## THE FIVE-WAY NORMALISATION HAZARD

`/api/exchange` was not chosen for convenience. It is the place in this repo
where **an unchecked bar is most likely to be wrong and hardest to see**.

Coinbase returns `[time, low, high, open, close, volume]`. Kraken returns
`[time, open, high, low, close, vwap, volume, count]` — low and high in the
opposite positions and volume at index SIX. Five venues, five hand-written
mappings, and three of the five disagree about sort direction too.

A transposed index does not throw, does not fail a type check, and does not
produce an empty chart. It produces a **full chart of inside-out candles** on
one venue only, for whoever happened to select it. `checkBarGeometry` now
refuses that bar and says why, and sorting is by `asOf` alone so a missed
`.sort()` in one of five branches can no longer reach a chart time-reversed.

---

## TWO DEFECTS FOUND BY WRITING THE TEST HONESTLY

### The venue-identity collision (would have deleted real bars)

`mintBarId` keys on `symbolId|timeframe|asOf|epoch`. Had these bars called
themselves `BTC`, Coinbase's 15:00 BTC bar and Kraken's 15:00 BTC bar would
mint **the same id**, and `admitBar` would refuse the second at equal
truthEpoch as a redelivery — silently discarding a real bar from a real venue.

The fix is also the truthful description: two exchanges are two order books,
with two prices, two volumes and two last trades. They genuinely ARE different
instruments. `symbolId` is `COINBASE:BTC`, and the collision stops being
possible rather than being detected after the fact.

### The blank-coin smuggle

The naive `${exchange.toUpperCase()}:${coin.trim().toUpperCase()}` returns
`"COINBASE:"` for a blank coin. That is **not blank**, so `mintBarId` happily
minted an identity for an instrument that does not exist — the venue prefix
was smuggling emptiness past the exact check written to catch it.

`exchangeSymbolId` returns `""` instead, handing the refusal back to
`mintBarId` where it belongs rather than adding a second place that decides
what counts as a symbol.

---

## REFUSAL, NOT REPAIR

Both ingresses return `{ bars, refusals }`. A refusal carries the timestamp as
it arrived, so it can be matched back to the feed. Nothing is clamped, nothing
is silently dropped.

> A refused bar is a visible gap the trader can be told about.
> A repaired bar is a lie with a timestamp.

On a 24/7 venue this matters more, not less: a swallowed refusal reads as a
quiet market, and on a continuous book a quiet market is always a lie.
`refusedBars` and `refusals` are published on the wire for both routes.

---

## GATES

| Gate | Result |
|---|---|
| `tsc --noEmit` (unpiped) | **EXIT 0** |
| `vitest run` (unpiped) | **EXIT 0** — 810 files, 10242 passed, 2 skipped |
| Suite delta | 10222 → 10242 = **+20**, exactly the 20 tests added |
| Live `/api/exchange` | **PROVEN** — REST_BACKFILL / CONTINUOUS / sessionKnown |
| Live `/api/yahoo` | **PROVEN** — DERIVED / sessionKnown false |

The +20 is checked, not asserted: 16 exchange ingress + 2 `canonicalBar` +
2 sentinel linkage.

---

## WHAT IS STILL OPEN ON M8

Three ingresses remain unmigrated, and the rule for choosing the next one is
not size:

> Take the ingress that can fill the canonical fields **truthfully rather
> than by invention**.

- `/api/alpaca` (397 lines, stock + crypto) — the only candidate that could
  plausibly reach beyond INDICATIVE, and therefore the one where an
  overclaim would be most expensive.
- `/api/finnhub` (284 lines)
- `/api/memecoin` (113 lines, GeckoTerminal DEX OHLCV)

Four census shapes still need judgement, not renames:
`DeckMarketChart::Candle` (differs by `volume?`, load-bearing),
`marketEvent::CanonicalMarketEvent`, `selectAbsorptionAnatomy::AnatomyBar`,
`::AnatomyBarInput`.

**Saying `SESSION_UNKNOWN` where the session is genuinely unknown remains
correct. Inventing a session remains forbidden. Amputating bars that carry no
session remains forbidden.**

M9 (replay driving the real past via frozen CanonicalBar ancestry and truth
epochs) depends on this adoption half and **must never be faked by slicing
today's bars.**

---

**Handoff:** two ingresses on the artery, both live-observed. The adoption
ratchet may only grow from here.
