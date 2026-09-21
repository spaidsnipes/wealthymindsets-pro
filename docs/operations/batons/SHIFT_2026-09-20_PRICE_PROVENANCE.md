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
