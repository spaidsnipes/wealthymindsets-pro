# WM PRO — SHIFT U — THE IDENTITY LAYER COULD NOT SEE THE SYMBOL

**Date:** Saturday 2026-09-05 · market CLOSED · §25 Monday deadline = 2026-09-07
**Commit:** `7cbc9a7` (on `main`, pushed, **live-verified in production**)
**Gates at seal:** `vitest` 416 files / **4235 tests**, exit 0 · `tsc --noEmit` exit 0
**Predecessor:** shift T (`WM-PRO-SHIFT-2026-09-05-T-ONE-SESSION-OWNER.md`)

---

## What this block was

Shift T fixed *who owns the session answer*. This shift found that the owner was
answering correctly and **being handed the wrong question** — because the layer
that decides *what kind of instrument this is* could not recognise the symbol
forms the product's own pickers hand it.

Three defects, all on one wire, all found by pulling a single thread.

| # | Defect | What the screen did |
|---|--------|---------------------|
| 1 | `HeroTruth` rendered the **store key** as a human session claim | printed `session RTH` on a Saturday, a few DOM nodes above its own scene panel reading `SESSION CLOSED` |
| 2 | `CRYPTO_TICKERS` held **20 bases** against **88 offered crypto symbols** | Bitcoin stamped `SESSION CLOSED — LAST VERIFIED. Nothing is streaming.` mid-trade, on a weekend |
| 3 | `canonicalAssetClass` detected forex **only by a slash** | the twelve compact pairs (`EURUSD`) classed equity → stamped PROVEN CLOSED on a Sunday |

---

## The honest framing on defect 2

**My own prior fix is what made this gap live.** Before `be39cb1` the
`provenSessionClosure` CLOSED branch was unreachable, so a mis-classified
`BTCUSD` cost nothing. Repairing the scene compiler is what turned a latent
classification gap into a false CLOSED on the screen. Recording this because a
baton that only lists wins is not a ledger.

---

## Atom 1 — the store key, rendered

`canonicalSession()` is **part of the canonical market-state store key** —
`canonicalMarketStateStore.ts:25` builds its key from it. It answers `"RTH"` for
every non-crypto instrument on every day of the week, **by design**. It is a key.
It is not an observation.

`HeroTruth` rendered `state?.session`. Producers were correct; the **render** was
the defect. Fixed with a `sessionPresented` prop fed from a single hoisted
`selectCanonicalSessionToken` call on the deck — one owner, one answer, two
consumers.

The store key is now **banned outright** in `heroTruthNullState.test.ts`.

---

## Atom 2 — 20 bases against 88 offered symbols

Every crypto symbol the product offers is a **pair form** (`BTCUSD`) or a
**venue form** (`BTC.COINBASE`). `CRYPTO_TICKERS` held 20 bare bases. So:

```
canonicalAssetClass("BTCUSD") → "equity"
provenSessionClosure("BTCUSD", Saturday) → false   // = PROVEN CLOSED
scene → "SESSION CLOSED — LAST VERIFIED. Nothing is streaming."
```

…for Bitcoin. On a Saturday. While it was trading.

Extracted from the three pickers (`SymbolSearch` 16, `MainLayout` 12,
`ChartToolbar` 72 rows): **88 distinct crypto symbols**, reducing to a **62-base**
union once combined with the bases `MainChart`'s Polygon `cryptoMap` resolves.
`cryptoBaseTicker` also gained `.VENUE` suffix stripping.

### The ambiguity audit, done before the claim was widened

A bare base claimed crypto product-wide is a real risk — `W` is Wayfair on the
NYSE. I audited **all 277 distinct picker symbols** for cross-category
collisions. All 39 apparent hits were singular/plural category spelling
(`Stock`/`Stocks`, `ETF`/`ETFs`). **No symbol is offered as both Crypto and
equity.** The residual real-world collision is documented in the code comment
rather than hidden, with the exit condition stated: if an equity by one of these
tickers is ever added, the pair form stays unambiguous and the bare form must
move out of the set.

### Downstream safety, checked before changing an asset class

`canonicalSession` returns `RTH`/`EXTENDED` for forex identically to equity, and
`canonicalInstrumentId` uppercases for both — so `EURUSD` moving equity→forex
**does not change the store key**. The only behavioural change is the Sunday
branch, which is the fix.

---

## Atom 3 — found by my own negative control

The new Sentinel's negative control asserted, by hand:

```ts
expect(canonicalAssetClass("EURUSD")).toBe("forex");
```

It returned `"equity"`. I investigated rather than adjusting the assertion, and
it was a **genuine pre-existing production defect**. The pickers spell pairs both
ways — `EUR/USD` in `ChartToolbar`, `EURUSD` in `SymbolSearch` — and the
classifier only knew the slash. So twelve compact pairs were stamped PROVEN
CLOSED on Sunday, **precisely what `provenSessionClosure`'s own doc comment
forbids in writing**:

> Futures and FX reopen Sunday evening, so claiming Sunday closure for them
> would be the same overreach in the opposite direction.

The rule already existed. The classifier could not see the symbol form. Fixed
with `FX_CODES` + an exported `forexPairCodes()`.

---

## The Sentinel — and a new corollary to the standing lesson

`pickerCryptoClassification.test.ts` (271 lines, 20 tests) **re-derives its
expectations from the picker sources at run time** rather than restating them,
so adding a coin to a picker without teaching the identity layer fails CI *by
name* instead of shipping a false CLOSED.

It opens with four **positive-control** tests, because a source-extracting suite
whose regex silently matches nothing passes vacuously and proves nothing.

It closes with a `DISCLOSED GAP` test naming the six Forex-category rows that
are **not** currency pairs and which I therefore deliberately do **not** claim:
`DXY`, `UKOIL`, `US100`, `US30`, `US500`, `USOIL`.

### New corollary to the 8th standing lesson

The 8th lesson — *"a pure-function suite whose every input is hand-written"* —
**cuts both ways**. Here the *derived* assertion passed while the *hand-written
literal* caught defect 3. Derived sets and hand-written literals catch different
things. **Keep both.**

---

## §22 Orkin revive pass — 8 revives, 8 fired by name

Harness: `scratchpad/orkin_revive.sh` (untracked). Each revive puts a fixed bug
back and must make a guard fail **by name**; a guard that stays green is
worthless.

| ID | Bug put back | Result |
|----|--------------|--------|
| FF | `HeroTruth` renders `state.session` again | exit 1 — 7 named, incl. `THE CORE REGRESSION: a Saturday future reads CLOSED, never RTH` |
| GG | deck stops passing `sessionPresented` | exit 1 — `passes sessionPresented to HeroTruth from the hoisted owner call` |
| HH | `cryptoBaseTicker` stops stripping USD suffixes | exit 1 — 5 named, incl. `crypto reads 24X7 — a continuous market has no session to miss` |
| II | `CRYPTO_TICKERS` shrinks back to 20 | exit 1 — 4 named, incl. `MainChart's Polygon map agrees with the identity layer` |
| JJ | stops stripping `.VENUE` | exit 1 — 4 named |
| KK | `canonicalAssetClass` forgets compact FX | exit 1 — 3 named, incl. `THE REGRESSION: no currency pair is stamped CLOSED on a Sunday` |
| LL | comment-stripper neutered | exit 1 — 2 named |
| MM | picker extractor matches nothing | exit 1 — 5 named PROOF tests |

All six touched files restored byte-identical (`shasum -c` all OK).

### A weak proof, caught and redone

**Revive LL was initially invalid.** My scripted neuter broke TypeScript syntax,
so the file failed to *parse* — exit 1, but with no named assertion failure. That
proves the file broke, not that the assertion fires. I redid it with a
syntactically valid neuter, after which it fired properly by name.

**Recording this as doctrine: a revive that fires via a syntax error is not a
proof. Re-do it with a valid neuter.**

---

## Live verification — observed in production, not inferred

`https://wealthymindsetspro.com/command-deck`, Saturday 2026-09-05, after
`7cbc9a7` deployed:

```
HERO TRUTH strip   "session CLOSED"          ← was "session RTH"
SCENE panel        "CLOSED"
                   "SESSION CLOSED — LAST VERIFIED. Nothing is streaming."

tape  AAPL   SESSION CLOSED — LAST VERIFIED   320.01
tape  TSLA   SESSION CLOSED — LAST VERIFIED   352.89
tape  BTC                                      79,761   ← no closed stamp
tape  ETH                                       2,505.75 ← no closed stamp
```

`RTH` appears **nowhere on the page**. The strip and the scene panel **agree**.
Equities carry the closed stamp; the continuous markets do not.

Methodology note: `document.visibilityState === "hidden"` throughout. Only
text-content and DOM-attribute reads were taken. **No geometry, transform,
animation or visibility claim is made anywhere in this baton.**

---

## Recorded, not fixed — for the next hand

1. **FOUR places encode "is this crypto" and disagree** — `canonicalIdentity.ts`
   `CRYPTO_TICKERS` (what the SCREEN says), `MainChart.tsx` `cryptoMap` (Polygon
   transport, 23 entries), `api/yahoo/route.ts` (3 aliases), `api/finnhub/route.ts`.
   Canon Weakness #1 at the identity layer; a §24 single-owner violation. The new
   Sentinel pins `MainChart` ↔ identity. **The two API routes are unpinned.**

2. **`api/yahoo/route.ts` alias gap** — aliases only `BTCUSD`/`ETHUSD`/`SOLUSD`.
   `BNBUSD`, `XRPUSD`, `DOGEUSD`, `ADAUSD`, `AVAXUSD`, `LINKUSD`, `MATICUSD` are
   offered by the picker and resolve no Yahoo quote.

3. **`priceSource.ts:109-111` claims `"Real-time crypto stream"`** with
   `live: true`. Observed live: the BTC tape value moved between two probes
   seconds apart, so it is not static — but *"stream"* is a transport claim I did
   not verify. **Not touched: `priceSource.ts` is currently modified by another
   agent.** Flagged for whoever owns that file.

4. **`canonicalSession` KNOWN GAP** — still no intraday exchange calendar.
   Closure is established only from day-of-week. Architectural; surfaced, not
   rushed.

---

## Standing lesson ledger — now at NINE, plus one corollary

> *A check written against the shape the data has when it is present, rather
> than the shape it has when it is missing.*

`Number.isFinite` · `!== undefined` · `slice(indexOf(...))` ·
`src.includes(guardString)` · asserting an incidental SPELLING · `futuresTruth ?`
on a non-nullable result · asserting only the half you just repaired · a
pure-function suite whose every input is hand-written · **9th: a Sentinel that
pins an IMPLEMENTATION STRING rather than the BEHAVIOUR it cares about becomes a
lock on the defect sitting next to it.**

The 9th was found *in this repo's own test file*. `heroTruthNullState.test.ts`
asserted, verbatim, `expect(src).toContain('state?.session ?? "unknown"')`. The
**intent** was "the session field degrades to an explicit unknown." What it
actually froze was the **source of the value on the non-null branch** — and that
source was the defect. **A guard written about one property became a lock on the
bug sitting next to it, and would have failed the correct fix.**

> **ASSERT THE BEHAVIOUR YOU CARE ABOUT, NOT AN IMPLEMENTATION STRING THAT
> HAPPENS TO CONTAIN IT.**
