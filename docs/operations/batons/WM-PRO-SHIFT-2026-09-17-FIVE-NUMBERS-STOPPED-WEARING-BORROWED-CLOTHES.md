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

# BATON — 2026-09-17 — FIVE NUMBERS STOPPED WEARING BORROWED CLOTHES

Continues `WM-PRO-SHIFT-2026-09-17-THREE-CHART-CELLS-STOPPED-LYING.md`.

## THE ONE DEFECT, FIVE TIMES

Every atom in this block is the same defect wearing a different coat, and it
is canon Weakness #1 generalised:

> **A NUMBER WEARING ANOTHER QUANTITY'S CLOTHES.**

Weakness #1 is usually stated as "multi-price disagreement on one page". That
is the special case. The general case is a reading rendered in a slot whose
conventions belong to a *different* quantity — and the trader reads the slot,
not the variable name.

| # | Commit | The number | The clothes it was wearing |
|---|---|---|---|
| 1 | `59e78812` | bar range | a range the bar's own volume denied |
| 2 | `a7b0cff9` + `54ffc964` | net aggressive volume | "change today, in dollars" |
| 3 | `b8f32bda` | percentage-axis mode | an invisible mode; state in colour alone |
| 4 | `18576463` | crosshair bar OHLCV | the latest bar's OHLCV |
| 5 | `e80996a7` | seconds left in the bar | a wall-clock time |

## MEASURED LIVE — THE READINGS THAT PRODUCED THESE FIXES

All read out of the DOM at `https://wealthymindsetspro.com/charts`, NQ1! 30m,
2026-09-17. No fixture, no reconstruction.

### Atom 4 — the purest instance found so far. ONE viewport, ONE instant:

```
Data Window : O 29490.50  H 29575.50  L 29481.00  C 29558.25  V 24,105
              heading "DATA WINDOW"; every cell's title was the empty string
OHLC strip  : O 29700.25  H 29702.00  L 29696.50  C 29698.25  V 39
header      : 29698.25
```

`C 29558.25` and `C 29698.25`. One instrument, one instant, **140 points
apart, both labelled `C`**. `V 24,105` against `V 39` is the same defect in
the volume row.

Neither number was wrong. The Data Window reports the bar under the
**crosshair**; the strip reports the bar at the **right edge**. The only
thing missing was the one fact that makes them stop competing: WHICH BAR.
And `dataWindow.time` was *already captured into state* at the crosshair
handler and then never rendered — **the scope existed and was dropped on the
floor between the store and the pixel.**

### Atom 5 — two defects in one glyph:

```
"... O 29699.50 H 29701.75 L 29699.50 NOW 29699.75 V 4  15:12  LAST 07:04 PM"
```

`15:12` — no title, no aria-label, no unit — adjacent to `LAST 07:04 PM`, an
actual clock time, with the chart's time axis directly below it. And
`formatCountdown` was fed `barEnd - now`, computed from the wall clock and
the timeframe and **nothing else**: on a stale feed it counted confidently to
zero and pulsed red over a candle that was not going to complete.

### Atom 2's own correction — a defect in a commit from THIS block:

`a7b0cff9` shipped the hover text *"Buyers lifted 19.3% more volume than the
other side"*. `imbalance` is `|delta| ÷ (buy + sell)` — the share of the tape
left **unmatched**. On BTC's own figures the two quantities are 19.3% and
21.5%. On TSLA they are 95.9% and roughly **four thousand seven hundred
percent**. Fixed in `54ffc964`, and **recorded in the source docblock rather
than quietly corrected**, because the lesson generalises:

> **A ratio's PROSE is as load-bearing as its arithmetic. The denominator has
> to survive into the sentence.**

Every sentence that owner emits now names the denominator out loud —
"OF ALL SIDED VOLUME".

## THE RECURRING ROOT CAUSE

In four of the five atoms the cure was **already in the room**:

- the Data Window's `dataWindow.time` was in state, unrendered;
- the countdown's feed verdict was three DOM elements away, in an already-
  compiled `candleDataStatus(...)`;
- `NectarVaultChip`'s own docblock stated the law the render below it broke;
- `selectChartCloseLabel` already owned the `C`-vs-`NOW` question.

Nothing new had to be computed or fetched. **The distinction only had to
survive the trip from the store to the pixel.**

## WHAT THIS BLOCK REFUSED TO DO

Four candidate defects were investigated and **rejected** rather than
manufacturing work:

- **Fullscreen button** — SVG-only, no text content, so `title` legitimately
  *is* the accessible name, and it changes with state. Correct as shipped.
- **`D` data-window toggle** — single-char name, but its title already
  carries state honestly. A small a11y item, not a truth defect. Logged, not
  chased.
- **`+735.25 (+2.54%)` header change** — already rigorously owned.
- **Timeframe strip** — correctly owned. (`"2 minutes bars"` is a grammar
  wart; noted, not chased.)

## LAWS THIS BLOCK APPLIED

1. **The unit travels with the reading.** `Δ` in the glyph, not the hover.
   `15m 12s`, never `15:12`. `V` says "never currency".
2. **Colour may never carry state alone** — and may never carry a verdict the
   record cannot support. Direction colour is withheld below a declared
   **dimensionless** imbalance convention, so the same rule governs a
   five-share equity tape and a six-figure crypto tape.
3. **§35 PROTECTED TRUTH** — never trade an overclaim for a blindness. Every
   number is still rendered on every verdict; only the *claim about it*
   changes.
4. **One owner per truth (G2).** `dataWindowBarScope` **composes**
   `selectChartCloseLabel` rather than re-deciding whether a bar closed.
   `chartBarCountdown` requires `feedLive` threaded from the single hoisted
   `candleDataStatus(...)`; the test pins that call count at **1**.
5. **Require, never infer.** `isLatestBar` is a required argument. A module
   that guessed "probably the latest" would manufacture the exact certainty
   the panel lacked in the first place.
6. **Record the defect, don't bury it.** Two source docblocks now carry the
   live readings that produced them, including one recording a defect in a
   commit from this same block.

## EVIDENCE DISCIPLINE — AND A NEAR-MISS WORTH KEEPING

Every new or re-pinned test was proven to **fail under a deliberate mutation
and pass on restore**. Across this block: **20 mutations, all EXIT=1**, with
byte-identical restores.

**The near-miss:** one `perl` mutation contained a literal `${...}`, which
perl interpolated itself, threw `Undefined subroutine &main::toFixed`, and
**silently did not apply** — vitest returned EXIT=0 and the "proof" was
worthless. Caught only by the `grep -c` count check. Later mutations moved to
a Python helper that **asserts the match count before writing**. A mutation
proof that cannot prove it applied is not a proof.

Second discipline, same family: `vitest run 2>&1 | tail` loses the exit code
(`${PIPESTATUS[0]}` came back empty). **All suite runs here are UNPIPED.**

## VERIFICATION STATE — HONEST

| Commit | CI | Live-verified in production |
|---|---|---|
| `59e78812` | green | partial — `NO_RECORD` arm needs a genuinely empty bar |
| `a7b0cff9` | green | **YES** — `data-evidence-delta-kind` on all 4 Vault rows, every delta `Δ`-prefixed |
| `b8f32bda` | green | **YES** — `%`/`L` now carry `aria-pressed` and state-bearing titles |
| `54ffc964` | green | **YES** — all 4 Vault titles read `OF ALL SIDED VOLUME`; old phrasing gone |
| `18576463` | green | **NOT YET** — `data-data-window-historical` absent on last read |
| `e80996a7` | green | **NOT YET** — `data-bar-countdown-kind` absent on last read |

The last two are **not claimed as proven.** The Cloudflare deploy is a
separate Git integration, invisible to `gh run list`, and it **lags CI** —
confirmed repeatedly this shift. The proof to look for on the next pass:

- `18576463` → `data-data-window-historical="true"` on the Data Window, a
  `30M BAR · HH:MM` heading, and a visible `Bar under your cursor — NOT the
  latest bar` line. (Requires moving the crosshair; the panel is null until
  then.)
- `e80996a7` → `data-bar-countdown-kind` present, glyph reading `15m 12s`
  rather than `15:12`, and a title naming the duration.

## FILES

**New owners**
- `src/lib/chart/chartAxisControlLabel.ts` + test (11)
- `src/lib/chart/dataWindowBarScope.ts` + test (15)
- `src/lib/chart/chartBarCountdown.ts` + test (17)

**Modified**
- `src/components/chart/MainChart.tsx` — axis cluster, Data Window render,
  countdown render, `candleDataStatus` hoisted to a single call
- `src/lib/marketData/selectEvidenceDeltaChip.ts` + test (18)
- `src/lib/design/greenIsNotAPromise.enforcement.test.ts` — gate renamed to
  `barCountdown.closing`, with a note that the new gate is **strictly
  stronger** than the one it replaces

## OPEN / BLOCKED (carried forward, unchanged)

- Delta Bubbles level ownership
- Live VP render geometry proof
- Decision Memory sealing has **zero production callers** — architectural;
  surfaced, deliberately not rush-wired
- `executionConnectivity` orphaned — *not a live defect*; `/readiness`
  discloses it honestly
- Paper execution state-machine realism
- Gate 4 responsive device proof — **BLOCKED**: programmatic window resize
  does not take effect, `outerWidth` pinned
- `/journal` detail canvas — **BLOCKED**: 0 journal entries
- `stash@{0}` — WIP PrepChecklistBand extraction, unresolved
- Minor, unchased: `"2 minutes bars"` grammar; `D` toggle single-char name

## DISCLOSURE

The Founder referenced mockups and pictures earlier in this thread. **They
are not visible to this session** after context compaction. No atom in this
block claims to implement a mockup; every one traces to a reading taken from
the live DOM, quoted verbatim in its own source docblock.
