# WM PRO SHIFT BATON — THE CHEAP HALF IS FINISHED

**Date:** 2026-09-18
**Breaker:** M8 — CANONICALBAR ADOPTION + MARKETOBJECT VOCABULARY
**Commits:** `ed248308`, `99857620`, `efdf9e83`
**Census:** six private bar shapes → **four**

This baton continues `WM-PRO-SHIFT-2026-09-18-TWENTY-TWO-NAMES-FOR-SIX-NUMBERS.md`.

---

## THE HEADLINE

**Twenty-two to four, and the artery is as unused as it was at twenty-two.**

That sentence is the whole receipt. Two atoms landed here and both are real —
declarations deleted, importers repointed, tests migrated in-band, mutation
receipts earned. And together they deliver **zero canonical identity**.
`canonicalBar.ts` still has **ZERO production consumers**. `symbolId`,
`sessionId`, `fidelity`, `source`, `provenance` and `truthEpoch` remain absent
from every bar the live path handles.

What DID finish is worth naming precisely, because it is a genuine milestone
and it is not the one that matters:

> **The duplicate-elimination half of M8 is DONE.** No shape in the census is
> byte-for-byte `LegacyOhlcvTuple` any more. Every remaining line needs a
> judgement, not a rename.

---

## THE TWO ATOMS

| Atom | Retired | Namers (production) | Census |
|---|---|---|---|
| 7 (`99857620`) | `pine/types::OHLCVBar` | 8 (3) | 6 → 5 |
| 8 (`efdf9e83`) | `indicators::Bar` | 10 (2) | 5 → 4 |

**Remaining four**, and for the first time all four are genuinely different
shapes: `DeckMarketChart::Candle` (differs by `volume?`, and that optionality is
load-bearing — the deck deliberately forwards no volume),
`marketEvent::CanonicalMarketEvent`, `selectAbsorptionAnatomy::AnatomyBar`,
`::AnatomyBarInput`.

---

## THE FINDINGS

### 1. The Pine engine was the only shape consumed by code a TRADER wrote

Every other shape in this census is consumed by code we wrote. `interpretPine`
hands six anonymous numbers to a **user-authored script** whose output the
trader acts on, and the engine cannot tell that script which symbol, which
session, at what fidelity, from what source, or whether a correction superseded
the values. A script reading `close` has no way to know it is reading a
**reconstructed** bar folded from a finer interval — the exact case
`yahooTimeframes` manufactures under `sourceMode: "reconstructed"`.

A wrong number the product computed is a bug. A wrong number a trader computed
from bars that could not describe themselves is a bug **they will attribute to
their own logic**. The rename does not close that.

### 2. The compiler overruled me again, in the same direction

I wrote a comment in `MainChart.tsx` asserting the cast could stay as
`IND.LegacyOhlcvTuple` because `indicators.ts` "re-exports the artery's type."

It does not, and it **must not** — that is precisely the ALIAS LEFT BEHIND this
census forbids. `tsc` answered **TS2694 `Namespace has no exported member`**.

The comment assumed a convenience the no-alias rule exists to deny, which is the
same error shape as the `readonly` misread two atoms earlier: a plausible
reading of the code that says nothing about whether it compiles. `MainChart` now
names the artery's type through the artery. **The rule caught me twice and both
catches are in the record rather than quietly fixed.**

### 3. Narrowing a requirement is real work; renaming a duplicate is not

`indicators.ts` declares `PivotBar` directly beside the `Bar` I retired. That
type exists because `swingHighLow` reads three fields and asking for six was a
lie about its requirements. That is real work. Nothing in this block is that,
and the docblocks say so at each site rather than only here.

The specific cost at this site is worth naming because the file is fifty
indicator functions long: `vwap`, `cvd`, `obv`, `mfi` and every other
volume-weighted function compute a number **only as meaningful as the fidelity
of the volume handed to them**, and no parameter type can say whether that
volume was observed trade-by-trade, folded from a coarser feed, or reconstructed
for a timeframe that never traded. A VWAP computed from reconstructed volume is
not a VWAP, and the signature cannot refuse it.

### 4. `indicators.ts` was left for last on purpose, and the reason was measured

That file says the bare word `Bar` **sixty times**, many in English prose
(*"it nonetheless ASKED for a full `Bar`"*). A blanket `\bBar\b` rename was
never safe until each of the sixty had been classified as type or sentence. It
was deferred with that stated reason in a previous atom's gate row and taken
only once the cheaper atoms were clear.

---

## SOURCE POISON REMOVED IN-BAND (M6)

- **Fourteen files** carried comments teaching `OHLCVBar` as a live noun
  (`OHLCVBar.time is in SECONDS`, `OHLCVBar carries no aggressor split`). No
  type-checker reads a comment; left alone they would have stayed green while
  teaching a retired name.
- **Three files were deliberately NOT rewritten** — this census,
  `canonicalBar.ts` and `useWebSocket.ts` — because each records an **earlier,
  different** `OHLCVBar` retired days before, and blanket-renaming them would
  have falsified the record.
- **`canonicalBar.ts`'s own header** described a landscape that no longer
  exists: it named `LiveBar`, `markov::Bar` and `types/index::OHLCVBar` as live
  duplicates. All three are retired. The header now states the correction **and
  the denial that matters**: the duplicate-naming defect is fixed, the identity
  defect is exactly as open as it was at twenty-two, and anyone reading the
  falling census as adoption progress is reading it wrong.

---

## GATES

Both atoms: `tsc --noEmit` **EXIT 0**; `./node_modules/.bin/vitest run`
**EXIT 0** at **808 files / 10207 passed / 2 skipped**, run unpiped.

The total never moved, and that is correct — no test was added or removed.

Mutation receipts on both: restore the retired entry, prove EXIT 1 with exactly
one failure on the right test with the right message, restore, re-verify EXIT 0.

---

## LIVE VERIFICATION — RECORDED AS NOT PROVEN

Both atoms are **observationally silent by construction**. A type alias has no
runtime representation; a cast has none either. No pixel could distinguish these
builds from their predecessors even with a confirmed deploy — and the deploy
cannot be correlated to a SHA anyway, because the repo contains only
`sentinels.yml`, Cloudflare's git integration is not `gh`-queryable, and the App
Router page exposes no `buildId`.

Claiming PROVEN here would be fabrication in the precise sense the standing
order forbids.

---

## WHAT IS STILL OWED, AND THE DOOR IS NOW BUILT

The adoption half. But the ground has changed since the wall was first hit, and
the next operator should know exactly where it stands:

- `canonicalBar.ts` is **complete as an artery**: `mintBarId`,
  `checkBarGeometry`, `admitBar`, `toLegacyTuple`, `BAR_PROVENANCES`.
- The wall that stopped the first migration attempt was `sessionId`: it is
  REQUIRED and nothing in this product produces one except
  `webullTicksBrowser.ts`.
- **`SESSION_UNKNOWN` is the designed third door** — an assertion of ignorance
  that travels with the bar, not a placeholder. It already exists, with
  `isSessionKnown` beside it. Inventing a session, or refusing every non-Webull
  bar, both remain forbidden.

**The highest-value first ingress is `/api/yahoo` + `yahooTimeframes`**, because
that planner already computes `sourceMode: "reconstructed"` and has nowhere to
put it — and `BAR_PROVENANCES.DERIVED` is the field that was built for exactly
that fact. That is a migration where the ingress can fill the canonical fields
**truthfully** rather than by invention, which is the only kind worth doing.

M9 (frozen CanonicalBar ancestry and truth epochs for replay) depends on this
half and **must never be faked by slicing today's historical bars.**
