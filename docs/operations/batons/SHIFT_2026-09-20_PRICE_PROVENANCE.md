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
> Demoted 2026-09-20 AT BIRTH — this stamp was written in the same shift the
> document records, not retrofitted later. A baton is point-in-time by
> construction; there is no moment at which it was entitled to the present
> tense. See `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`.
<!-- END:ath-historical-lineage -->

# SHIFT BATON — 2026-09-20 — The Price Provenance Nest

**Scope of this shift:** one nest, chased to the end. Not a feature list.

All work below is **BUILT** or **PROVED WITH EVIDENCE**. Nothing here is
CLOSED, GUEST READY, or SHIP — only Sheriff Enforcement may say those words.

---

## The nest in one sentence

`/charts` on `BTCUSDT` printed a price in one place and `PRICE UNKNOWN` in
another **in the same viewport**, and when that was fixed it printed the price
with a **fabricated citation**. Three commits, each one exposing the next.

---

## Commit 1 — `5651d894` — the crypto quote lane was structurally unreachable

**Measured:** `/api/finnhub?sym=BTCUSDT&type=quote` answered `price: 81608`
from `BINANCE:BTCUSDT` at the same minute the right rail printed
`BTCUSDT · 5m · PRICE UNKNOWN`. One half of the product printed UNKNOWN about
a number the other half was serving.

**Cause:** in `useWebSocket.ts`, the `isCrypto` branch asked Coinbase and then
fell straight past the entire `isEquityLane` block that holds the only Finnhub
leg (itself behind a second `if (!isCrypto)`), landing on a Yahoo fallback
that 404s for USDT pairs.

**Why the door was not simply opened:** Finnhub's free crypto tier is
Binance/USDT. `BTCUSD → BINANCE:BTCUSDT` is a **real currency substitution**.
USDT tracks the dollar; it is not the dollar, and the gap is exactly the thing
that moves when it matters.

**Built:** `src/lib/marketData/cryptoQuoteSubstitution.ts` — a pure compiler
answering "may this answer stand in for the symbol the trader named?" with
four verdicts: `EXACT`, `UNNAMED`, `SUBSTITUTED`, `UNDISCLOSED`. A refusal
names **both currencies and the instrument actually fetched**, and is held in
`heldRefusal` so it reaches the glass as a refusal *with words* rather than
collapsing into silence. Silence (`undefined`, `null`, `""`, a number, an
object) is `UNDISCLOSED` — never treated as a match.

This mirrors the refusal `toFinnhubSym` already makes for *venue*
substitutions. It is the same law, applied to currency.

**Proof:** 12 tests. Chart header on the serving host read
`81738.08 +492.44 (+0.61%)`.

---

## Commit 2 — `17c3f6c1` — the contradiction moved INSIDE one screen

The commit-1 proof screenshot immediately exposed the nest: the header now
read `81738.08` while the right rail **still** read `PRICE UNKNOWN`. That is
worse than before — the contradiction became internal to a single viewport.

**Cause:** `decisionSpineProps.market` had `last` (canonical print) and
`lastBarClose` both null, because this chart has **no bars at all**. The
BAR_CLOSE door added for the *previous* instance of this defect could not
speak, and the live quote the page was already holding had no slot.

**Built:** a **third labelled channel** on `formatSpinePrice` — the existing
single owner of that sentence. Explicitly **not** a second compiler for the
same pixels (Canon Weakness #1). `QUOTE` is ranked **last** deliberately: a
print and a bar close both still win, so nothing rendering today changed.

Wired via `quoteLast` / `quoteSource` on `SpineMarketEvidence`, guarded by the
existing `tickerOwner === symbol` check so a quote belonging to the
*previously viewed* symbol is never printed under the new symbol's label.

**Proof:** 9 tests including two adoption guards that read
`ChartsDashboard.tsx` — one requiring the wire exists, one requiring the
`tickerOwner` guard is on it. Revive-attempt: stripping the guard fails the
second test; restore is `diff -q` byte-identical.

---

## Commit 3 — `f34e45c3` — the price arrived with a fabricated citation

**Measured on the serving host, minutes after commit 2 deployed:**

```
BTCUSDT · 5m · 81781.82 LAST QUOTE · unavailable
```

**The number was real. The citation was not.** `unavailable` is
`useWebSocket`'s sentinel (`MarketState["source"]`, line 152) for a quote whose
provenance this product **deliberately declined to certify** — when Finnhub
returns no observation time (`finnhubQuoteObservedAt` → `null`), `source` is
never promoted off its initial value.

Printing that sentinel after `LAST QUOTE ·` converts a deliberate refusal to
vouch into a vendor attribution. It is the drawer-filed receipt **inverted**:
the disclosure does reach the glass, and says the opposite of what the product
knows.

**Built:** a sentinel is now treated as **no source at all**, so the number is
dropped — the same outcome, for the same reason, as the empty-string case this
module already refused.

**Consequence, stated plainly and not hidden:** BTCUSDT's MARKET cell reads
`PRICE UNKNOWN` again. That is the honest reading while provenance is
uncertified, and it is worth more than a number with a false citation.

---

## Gates

| Gate | Result |
|---|---|
| Full suite | **870 files / 11,131 tests pass** (baseline 11,109 → +22) |
| `tsc --noEmit` | clean |
| Revive-attempt | performed on commits 1 and 2; both restores byte-identical |
| Deployed | Cloudflare `63baac52-dae5-4f04-ad01-095251492c76` |
| Visual proof | screenshot on the serving desktop browser, signed in |
| Canon side-by-side | FL-06 plate held open in the adjacent tab for the full shift |

---

## OPEN — NAMED, NOT CLOSED

1. **The chart HEADER is a second owner of the same fact.** It prints
   `81822.00 +632.00 (+0.78%)` with **no provenance qualification at all**,
   while the footer of the very same screen says `SOURCE UNKNOWN` and the top
   bar says `FEED UNKNOWN`. The right rail now refuses to cite an uncertified
   quote; the header still prints one bare. **This is the next defect in this
   nest and it is the largest remaining one.** The fix is to route the header
   price through the same single owner, not to add a fourth compiler.

2. **Why Finnhub returns no observation time for Binance crypto quotes** is
   not yet established. If the vendor does carry a trade time that this code
   is failing to read, then `source` *should* be promoted, and the MARKET cell
   *should* show `LAST QUOTE · finnhub`. That is a one-field investigation in
   `finnhubQuoteTime.ts` and it would turn commit 3's honest blank back into
   an honest number.

3. **The ~60 `not.toMatch(/` guard audit** for the vacuous-stem defect class —
   four confirmed instances, one self-authored. Still overdue.

4. Carried from prior shifts, untouched today: NQ1! at `tf=30m` renders no
   candles while claiming "HISTORICAL BARS VERIFIED"; no in-app Chart → News
   door; `/news` carries a ROOMS mall left rail against §6.

---

## For the Founder — a business decision, not a code task

Futures per-trade tape requires a **paid provider entitlement** (Alpaca
futures WS, CBOE, Databento, or a ThinkorSwim/moomoo bridge). No amount of
engineering produces this data without it. Until that call is made, the
futures tape branch stays honestly absent rather than dishonestly simulated.

---
---

# CONTINUATION — same shift, same nest, two more commits

Appended after the section above was written. OPEN item **#1** ("the chart
HEADER is a second owner of the same fact … the largest remaining one") is
the subject of everything below. It is now **BUILT and PROVED ON THE GLASS**.
Read this continuation as the correction and completion of the record above,
not as a separate shift.

---

## CORRECTION — I REPORTED A GLASS PROOF I DID NOT HAVE

**This is the most important paragraph in this document.** It corrects a
claim made earlier in this same shift, by me, in writing.

For commit **`21aca86f`** ("The header may not print a quote WM declined to
vouch for") I reported the fix **verified on the glass**. That claim was
false, and the method that produced it was the defect.

I queried the live DOM, found the element, read its `data-price-kind` and its
text, saw `UNCERTIFIED_QUOTE`, and called it proved. What I never did was
**measure whether the element occupied any space**. It did not. Its
`getBoundingClientRect()` was **0 × 0** — the ChartsDashboard chrome header
row is `display: none` at `>= 1280px`, by a deliberate V01 ONE CANVAS
decision, locked by two assertions in `src/lib/chartsCategoryFusion.test.ts`
(lines 24 and 30). I read a node no desktop trader could see and reported it
as a thing the trader would see.

**A DOM QUERY IS NOT A GLASS PROOF.** `querySelector` returns nodes that are
`display:none`, `visibility:hidden`, zero-height, clipped, or scrolled out of
the document entirely. Every one of those returns text content happily. The
minimum bar for the words "proved on the glass" is **non-zero
`getBoundingClientRect()` width AND height, plus computed visibility**, and
from now on this nest's evidence includes those numbers.

The irony is exact and is recorded here deliberately: the compiler under
repair exists to stop the product overstating what it knows. The report on
that compiler overstated what it knew.

Commit `21aca86f` is **BUILT, NOT PROVED on desktop**. It remains correct and
valuable for phone, tablet, and the secondary views that do render that row —
none of which were verified, because they are Phase-2-locked.

---

## Commit 4 — `7b5715ba` — the VISIBLE header owner was the undisciplined one

**Measured on the serving host, BTCUSDT, ONE viewport** — two call sites of
one compiler answering one question two ways:

| Call site | Passes `source`? | Verdict | Rendered |
|---|---|---|---|
| `ChartsDashboard.tsx:2899` | yes | `UNCERTIFIED_QUOTE` | **nothing — `display:none` at >=1280px** |
| `MainChart.tsx:8113` | **no** | `LIVE_QUOTE` | `81224.01`, bare, largest type on the page |

Same compiler, same instrument, same instant, opposite verdicts — and the
only one a desktop trader could read was the one making no provenance claim
at all. Teaching the compiler and one caller **looked** like a fix and moved
nothing on the glass.

**Built:** `MainChart` now passes the `source` it *already destructures from
`useWebSocket`* (line 1826) — the hook that owns the certification verdict.
Nothing new was fetched, no second subscription was opened, no prop was
threaded. The evidence was already in the component; it only had to be
handed over. That is the same sentence the neighbouring `chartHeaderChangeFact`
call site already carries, one defect earlier.

`dp` stays **explicit** ahead of it. `decimals` sits between `barsSettled`
and `quoteSource` and defaults to 2; passing the source without it would land
a vendor string in the decimal slot. For this caller the default would be
wrong regardless — MainChart knows instruments whose tick is finer than a
hundredth, and a formatter hardcoded at 2 does not render an approximation,
it renders a flat price it manufactured.

### What was deliberately NOT done

**The `display:none` rule was not deleted.** Resurrecting the retired header
row would have made the disagreement visible instead of fixing it, produced
two price rows where V01 decided there should be one, and broken two tests
that encode that decision. The correct repair is to make the **surviving**
owner carry the provenance.

### The guard, and the honest limit of its scope

`chartHeaderPriceFact.test.ts` gains `× THE INVISIBLE DISAGREEMENT`, which
reads `MainChart.tsx` from disk and asserts the call site passes both an
explicit `dp` and a `source`, and that the source binding comes from
`useWebSocket` rather than being locally invented (a local string would pass
an arity check while manufacturing exactly the citation
`quoteSourceNamesProvider` exists to refuse).

It deliberately does **NOT** assert that every call site in `src/` passes a
source, **because that would be false.** A third caller exists —
`src/lib/experience/selectChartCompanion.ts:232` — reading
`CanonicalMarketState`, whose `price` record carries
`last / bid / ask / eventAt / availableAt` and **no source field**. It has
nothing to hand over, and SILENCE IS NOT CERTIFICATION cuts in its favour: a
caller never given a source must keep its existing behaviour, not invent one.
Widening the scan would have made it lie about the world — the exact hazard
`datedDocsAreDemoted`'s own docblock names, that a scan's SCOPE is itself an
assertion.

**Revive-attempt:** stripping `source,` from the call site fails the new
guard with "the live quote's source is not handed over". Restore verified
**byte-identical** via `diff -q`.

---

## Gates — continuation

| Gate | Result |
|---|---|
| Full suite | **871 files / 11,154 tests pass** |
| `tsc --noEmit` | clean (exit 0) |
| Revive-attempt | performed; restore byte-identical |
| Deployed | Cloudflare Version ID `26f8f132-b8f8-4af1-836c-8f2973c7e91f` |
| Commits | `1e47ca99` (spine), `7b5715ba` (header) |

### GLASS PROOF — with the geometry this time

Live DOM read on `wealthymindsetspro.com/charts?symbol=BTCUSDT&tf=5m`,
signed in, viewport width **1920** (i.e. the desktop width at which the other
header row is `display:none`):

```json
{ "kind": "UNCERTIFIED_QUOTE",
  "text": "81334.01 SOURCE UNCERTIFIED",
  "w": 259, "h": 16, "top": 124,
  "display": "block", "fontSize": "16px",
  "color": "rgb(138, 130, 113)",
  "onGlass": true }
```

**259 x 16 pixels, non-zero, rendered.** Exactly one element on the page
carries `data-price-kind`. The colour is the dim token, not `text-wm-text` —
the weight is chosen from declared provenance, not from "is the number
present". Screenshot confirms the header row reads
`81325.92 SOURCE UNCERTIFIED +150.30 (+0.19%)`.

The bare unattributed number in the largest type on the primary trading
surface is **gone**.

---

## OPEN — carried forward, renumbered

1. ~~The chart HEADER is a second owner of the same fact.~~ **CLOSED by
   `7b5715ba`, proved with geometry.**

2. **Why Finnhub returns no observation time for Binance crypto quotes** —
   unchanged and now the highest-value item in this nest. Everything shipped
   today makes WM *honest* about not being able to cite the quote. None of it
   makes WM *able* to cite it. If the vendor does carry a trade time this
   code fails to read, `source` should be promoted and all three surfaces
   would read `LAST QUOTE - finnhub` instead of `SOURCE UNCERTIFIED`. That is
   a one-field investigation in `finnhubQuoteTime.ts`. **Until it is done,
   every WM surface showing a BTCUSDT quote says it cannot vouch for it.**

3. **NOT VERIFIED: phone, tablet, and every secondary view.** Both header
   commits affect rendering paths that are Phase-2-locked and were not
   opened. Commit `21aca86f` in particular has **no visual proof anywhere**.

4. **A `getBoundingClientRect` discipline for live-verification is not
   encoded anywhere** — it lives only in this document, as prose, having been
   learned from a false report. Any agent that live-verifies by DOM query
   alone will make the same mistake. This is a real gap and it is not closed.

5. The ~60 `not.toMatch(/` guard audit for the vacuous-stem defect class —
   four confirmed instances, one self-authored. Still overdue, untouched
   today.

6. Carried, untouched: NQ1! at `tf=30m` renders no candles while claiming
   "HISTORICAL BARS VERIFIED"; no in-app Chart -> News door; `/news` carries a
   ROOMS mall left rail against §6.
