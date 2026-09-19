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

# WM PRO — THE SLOT IS WHAT THE TRADER READS

**Sealed** 2026-09-17. Continues `WM-PRO-SHIFT-2026-09-17-FIVE-NUMBERS-STOPPED-WEARING-BORROWED-CLOTHES.md` (`3930c37c`).

Four atoms, all found by reading the LIVE production DOM on
`https://wealthymindsetspro.com/charts` (NQ1!, 30m) rather than by reading
source. Three are live-proven; the fourth was pushed and had not deployed at
seal time, which is recorded as lag, not as proof.

---

## THE LAW THIS BLOCK KEPT RUNNING INTO

> **The trader reads the SLOT, not the variable name.**

Every defect below was a value that was arithmetically correct and lived in a
place that made it mean something else. Nothing here was a calculation bug.

And a second law, new this block:

> **A repair that cannot be reached is not a repair.**
> A `title` on a `pointerEvents: "none"` overlay reads as a fix in the diff and
> is nothing in the product.

---

## ATOM 1 — `1f35f588` — the volume qualifier was scoped to one bar

**LIVE BEFORE:**
`"Volume — contracts, shares or coins traded, never currency of the 30m bar beginning Sep 14, 00:00."`

The unit qualifier ran straight into the bar clause, producing *"never currency
**of the** 30m bar"* — scoping a UNIVERSAL refusal to a single bar, which is not
what `dataWindowBarScope` believes. Any qualifier that is not a noun phrase must
land in its own sentence, after the bar is named.

**LIVE AFTER (proven):**
`"Volume — the quantity traded of the 30m bar beginning Sep 4, 12:00. Measured in contracts, shares or coins; never currency. …"`
`OLD_DEFECT_STILL_PRESENT: false`

The test pins BOTH halves: the refusal must not be scoped to a bar, **and** it
must still exist in a sentence of its own — the fix may not be achieved by
deleting the qualifier.

**STATUS: LIVE-PROVEN.**

---

## ATOM 2 — `90c91f5d` — fixing one panel HALF-CLOSED the defect

The 140-point disagreement (`C 29558.25` in the Data Window vs `C 29698.25` in
the strip and header) was addressed by scoping the Data Window. The live DOM
then said the job was half done. With the scoped panel already shipped, the OHLC
strip six rows above it still read back:

```
["29697.25","",""] ["29700.25","",""] ["29689.50","",""]
["29694.25","",""] ["57","",""]        ← [text, title, aria-label]
```

One of the two disagreeing panels could name its bar; the other still could not.
A trader was one hover away from the same confusion.

**FIX:** the strip COMPOSES `dataWindowBarScope` too, with `isLatestBar: true` —
a fact there, not a guess, because `last` IS the final candle by construction.
Two panels scoped by one function cannot be made to contradict each other
without changing what both of them say.

**LIVE AFTER (proven):** `data-ohlc-strip-scope="Latest bar — still forming"`,
and all five cells carry non-empty scoped titles.

A §35 Sentinel in `chartBarRangeFact.test.ts` fired during this work and was
**right to**. It pinned the graded close word to `closeWord.label` and the strip
now routes it via `stripScope.close.label`. It was WIDENED, not weakened, with
the reasoning recorded: that is a change of ROUTE, not of AUTHORITY —
`dataWindowBarScope.close` IS `selectChartCloseLabel`'s output, so C-vs-NOW
still has exactly one decider.

**STATUS: LIVE-PROVEN.**

---

## ATOM 3 — `4124b489` — `LAST 07:23 PM` was a bar-OPEN time in the freshness slot

**MEASURED LIVE, ONE PASS:**

```
visible glyph   : "LAST 07:23 PM"
wrapper title   : "Candles: delayed · session RTH · last bar 07:23 PM
                   · no real-time candle claim"
countdown       : "25m 04s" of a 30-minute interval
wall clock then : 7:34:56 PM
```

**DEFECT ONE — no verb.** `07:23 PM` is `candles[last].time`, which throughout
this codebase is the instant a bar OPENED. "LAST", in the freshness slot of a
trading screen, reads as "the most recent thing that happened" — the opposite
end of the bar. The hover supplied no verb either.

**DEFECT TWO, LOAD-BEARING.** An absolute timestamp cannot answer the question
this slot exists to answer:

| newest bar opened 12 minutes ago | verdict |
| --- | --- |
| on a **30m** chart | that bar is **CURRENTLY FORMING**. Nothing is wrong. |
| on a **1m** chart | the screen is **ELEVEN BARS BEHIND**. The tape is dead. |

**SAME NUMBER. OPPOSITE VERDICTS.** The conversion needs the interval (which
lives elsewhere on screen) and a wall clock (not rendered here at all). The
product held every ingredient and handed over none of the meaning.

`chartFeedRecency` reports **age in BARS, not minutes** — dimensionless over
absolute, the same rule the rest of this chart follows, because a threshold in
seconds is a different claim on every timeframe and would need re-tuning per
timeframe forever.

- **§35:** the absolute timestamp is ALWAYS still rendered. The verb and the
  verdict are ADDED; nothing is traded away for them.
- **NOT CLAIMED:** this module never says the feed is healthy.
  `candleDataStatus` owns that verdict in the same badge. "The newest bar is the
  forming one" is arithmetic about position, not a certification that ticks
  arrive. A module that said LIVE from a timestamp alone would manufacture a
  second, weaker opinion about what the badge beside it already decides.
- `barsBehind` is `null` when unknown, **never `0`** — `0` is a real verdict
  here, and reusing it for "could not tell" is the same overclaim in a number's
  clothes.
- The interval comes from the same `intervalSec` the countdown uses: one
  interval, two readers.

**LIVE AFTER (proven):** glyph `BAR OPENED 07:35 PM · FORMING`,
`data-feed-recency-kind="CURRENT_BAR"`, accessible name *"Newest bar opened
07:35 PM and is the bar currently forming."*, and `LAST hh:mm` returns **zero**
matches anywhere on the page.

**STATUS: LIVE-PROVEN.**

---

## ATOM 4 — `5b94c28c` — a confident word beside a refusal, with nothing saying why

**MEASURED LIVE:**

```
DAY BIAS · BULL · +2.52% today · REGIME · UNRESOLVED
```

and every one of those six spans read back `[text, "", ""]` — no `title`, no
`aria-label`, wrapper included.

The 2026-09-15 word fix is holding: this chip no longer calls its own band a
REGIME. But the REASON the two verdict words may differ — BULL is a band over a
day-change percent and has never looked at the tape; REGIME is a different
question off classified per-trade tape that nobody has answered yet — was stated
only in `selectRegimeBadge`'s source comments. On screen it is a confident word
next to a refusal. A trader who reads that as one instrument contradicting
itself is reading exactly what is rendered.

**AND THE USUAL REPAIR IS UNAVAILABLE.** The chip is an overlay carrying
`pointerEvents: "none"` so the crosshair keeps working underneath it. A `title`
there is unreachable by any pointer. So the owner publishes `spoken` and the
chip carries it as an **accessible name** — the one channel that does not depend
on hovering something the page has deliberately made unhoverable.

A Sentinel now **fails if a `title` is added to this chip**, so that non-fix
cannot be shipped by a later hand. It was mutation-proven by actually attempting
the non-fix.

**STATUS: PUSHED, NOT YET DEPLOYED at seal time.** `data-regime-badge-canon` was
absent from the live DOM while `data-feed-recency-kind` (one commit older) was
present — that is Cloudflare deploy lag, and it is recorded as lag, not as
failure and not as proof.

---

## VERIFICATION LEDGER

| SHA | atom | tests | tsc | live |
| --- | --- | --- | --- | --- |
| `1f35f588` | volume qualifier re-homed | PASS | clean | **PROVEN** |
| `90c91f5d` | OHLC strip scoped by same owner | PASS | clean | **PROVEN** |
| `4124b489` | feed recency replaces bare LAST | 731 files / 8951 | clean | **PROVEN** |
| `5b94c28c` | regime chip speaks its reason | 731 files / 8959 | clean | NOT YET — deploy lag |

Also re-proven live during this block, from the previous baton:
`e80996a7` (countdown glyph `29m 34s` / `25m 04s`, `data-bar-countdown-kind="CLOCK_ONLY"`)
and `18576463` (`data-data-window-historical="true"`, six scoped cell titles).

All test runs UNPIPED (`>/tmp/x.log 2>&1; echo $?`) — a pipe masks the exit code.

## MUTATION PROOFS

Every new or re-pinned Sentinel was made to fail:

| mutation | result |
| --- | --- |
| `aria-label={feedRecency.spoken}` removed | EXIT=1 |
| `LAST ${lastStr}` revived in the badge | EXIT=1 |
| `barsBehind: null` → `barsBehind: 0` | EXIT=1 |
| regime chip accessible name removed | EXIT=1 |
| regime chip `aria-label` → the unreachable `title` | EXIT=1 |
| reserved word leaked into the day-bias half | EXIT=1 |

All restores verified byte-identical with `cmp -s`. Mutations applied by a
Python helper that `assert`s the match count **before** writing — a mutation
proof that cannot prove it applied is not a proof.

## METHOD NOTE FOR THE NEXT HAND

- **Synthetic events cannot drive lightweight-charts.** Dispatching
  `MouseEvent`/`PointerEvent` on the canvases or containers does not populate
  the Data Window. Only a REAL hover works
  (`computer` → `{action:"hover", coordinate:[620,440]}`).
- **Chrome `javascript_tool` blocks large payloads.** Returning `outerHTML` or a
  big object dump trips `[BLOCKED: Cookie/query string data]`. Return short text
  slices plus explicitly named attributes.
- **Three of these four atoms were invisible from source.** They were found by
  reading what the product actually rendered. One false-positive was caught and
  dropped before acting on it (a leaf span looked unlabelled; the *wrapper*
  carried the title) — and the code read that disproved it surfaced the far
  deeper defect underneath.

## STILL OPEN (§13)

- Delta Bubbles level ownership
- Live VP render geometry proof
- Decision Memory sealing has zero production callers — **architectural**;
  surface it, do not rush-wire it
- `executionConnectivity` orphaned — not a live defect; `/readiness` discloses
  honestly
- Paper execution state machine realism
- Gate 4 responsive device proof — **BLOCKED**: programmatic window resize does
  not take effect, `outerWidth` stays pinned
- `/journal` detail canvas — **BLOCKED**: 0 journal entries exist

Unchased minor items: the timeframe strip title grammar (`"2 minutes bars"`);
the `D` data-window toggle's single-character accessible name; `59e78812`
(`chartBarRangeFact`) still only partially live-verified — its `NO_RECORD` arm
needs a genuinely empty bar. `stash@{0}` still holds "WIP PrepChecklistBand
extraction (not this shift)".
