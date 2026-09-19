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

# A REFUSAL IS NOT A GLYPH — and a fix can over-correct

**Baton · 2026-09-15 · WM Pro · `8b771e0` → `43d5141`**

---

## THE ONE SENTENCE

A bare `—` was doing four incompatible jobs across the product — *an erased
zero*, *an undefined ratio*, *a price WM holds but may not trade on*, and *a
value WM genuinely lacks* — and because the FIGURE and the CLAIM were decided
by a single expression in each case, removing a false claim kept taking a true
fact down with it.

---

## THE COMMITS

| SHA | Route | What it was |
|---|---|---|
| `8b771e0` | — | baton: AN ABSENCE MUST BE SAID, AND SAID ONCE |
| `2d098df` | /charts | a reason carried only in `title` is not said on a phone |
| `58c3d69` | /creator | a dash can overclaim AND underclaim, and this strip did both |
| `2ca351f` | /paper | the blotter's two price columns were one glyph over five facts |
| `ff348dd` | /profile | a sentinel substituted for a missing denominator is a fabrication |
| `fd2ea66` | /paper | the untraded-book fix **over-corrected** — restore the zero, keep the tint withheld |
| `43d5141` | /paper | the options chain used a **PERMISSION** as its display boundary |

---

## THE TWO FINDINGS WORTH CARRYING FORWARD

### 1. A FIX CAN OVER-CORRECT FROM OVERCLAIM INTO UNDERCLAIM (`fd2ea66`)

/paper rendered `DAY P&L +$0.00` in the WIN tint on a book with zero trades.
`0 >= 0` is true, so the green was **arithmetically earned and factually a
lie**. Removing it was right.

The remedy was a dash — **and the dash is the opposite lie.** Day P&L is a SUM,
and the sum of no trades is exactly `$0.00`: defined, held, sayable. An
overclaim was traded for an underclaim, and production read `DAY P&L —`.

Root cause: **the figure and the tint hung off one ternary.** Only the tint was
ever wrong. `src/lib/paper/paperAccountStats.ts` now splits three claims —
`value` (what the book contains) / `tone` (what it means) / `reason` (why it
reads that way, carried on BOTH `title` and `aria-label`).

Corollary, stated because it was the trap: **a SUM and a RATIO do not fail the
same way on an empty set.** Day P&L is `$0.00` MEASURED. Win Rate has no
denominator and is genuinely UNDEFINED — it says `No basis`. One glyph was
serving both, side by side.

### 2. A PERMISSION IS NOT AN OBSERVATION (`43d5141`)

`OptionsChain` computed `const spot = actionablePaperQuotePrice(readiness)` and
rendered `Spot —` when it was null. But that function's own docblock says it
returns *"the only price Paper execution/derivation code may act on"* — **it
answers "may this authorize a fill", not "does WM hold a number".**

`selectPaperQuoteReadiness` says so explicitly ("*may remain visible as STALE,
but can never authorize a fill*") and `priorAsStale` deliberately preserves
`price` and `observedAt`. **The owner goes out of its way to keep the
observation; the consumer erased it.**

A stale price is *dangerous to act on* and *informative to see*. It is now
shown as **"Last spot $412.50"** — different noun, ALERT tint, age in words,
and a reason repeating that it authorizes nothing. **The refusal was not
relaxed** and a Sentinel now asserts that: OPTIONS NOT ACTIONABLE still
renders, and no strike, premium, Greek, mark or action is produced.

---

## THE SENTINEL LESSON — FOUR TIMES, ESCALATING

Four Sentinels in this chain pinned an **incidental form** rather than a
meaning. In order of severity:

1. + 2. asserting a literal string lives in a consumer file
3. `src.indexOf("{orders.map(ord=>(")` — pinning one arrow-body syntax
4. **`anUntradedBookHasNoPnl.enforcement.test.ts` regexed the exact ternary
   `bookNeverTraded?"—"`.** It **guarded a REMEDY**, and thereby **forbade the
   correction of its own subject.** The first three guarded punctuation; this
   one guarded a mistake.

Every one was **RE-ANCHORED ON THE MEANING, NEVER RELAXED.** #4 now drives
`paperAccountStats` directly and asserts BEHAVIOUR — strictly stronger than a
regex, because it cannot be satisfied by punctuation.

**Rule for the next Sentinel author:** if your assertion would fail on a
refactor you have no opinion about, it is pinned to form. If it would fail when
the *meaning* is violated and pass otherwise, it is pinned to meaning.

---

## §22 ORKIN LEDGER

**Fifteen of fifteen revivals in this chain COMPILED.** `tsc` has never once
seen any of these defects. Type-checking is not a truth-checker; only a
Sentinel that asserts meaning is.

This block's revivals, all via **Edit only**, all caught **by name**, all
restored byte-identical:

| # | Defect reintroduced | Caught by |
|---|---|---|
| K | `winners.length === 0 \|\| losers.length === 0` → sentinel denominator | `× THE DEFECT: no losing trades must NOT produce a ratio` |
| L | never-traded branch returns `"—"` | `× THE OVER-CORRECTION: an untraded book still states its zero` (+4) |
| M | never-traded branch takes the WIN tone | `× THE ORIGINAL DEFECT: that zero must NOT wear the win tint` |
| N | stale branch gated on `readiness.actionable` | `× THE DEFECT: a stale price is still a price WM holds` (+1) |
| O | stale branch labelled `"Spot"`, NEUTRAL tint | `× THE OTHER HALF: showing it must never let it read as current` |

---

## EVIDENCE

**GATES at `43d5141`:** `tsc --noEmit` exit 0 · `vitest run` exit 0 ·
**610 files · 7147 tests.**

**LIVE OBSERVED — `fd2ea66` on https://wealthymindsetspro.com/paper**, by DOM
read in the Founder's Chrome (chunkset digest moved `-1025145566` →
`-803484173`):

```
Day P&L:  +$0.00   class text-wm-text-muted   (NOT text-wm-green)
Realized: +$0.00   class text-wm-text-muted
Win Rate: No basis
Equity/Cash: $100,000 — untouched, never part of the defect
bareDashCount: 0        across the entire route
text-wm-green on page:  ["Positions (0)"] — a tab label, not a result claim
```

Every tile carries both `title` and a full-sentence `aria-label`.

---

## HONEST BLOCKERS — NOT CLOSED, NOT PAPERED OVER

- **Screenshots are unavailable this session** — `mcp__Claude_in_Chrome__computer`
  fails with *"Cannot take screenshot with 0 width"*. All verification above is
  **DOM read only**. The Mobile + Visual-Confirmation standard is therefore
  **NOT satisfied** for any atom in this block. Do not record these as
  visually confirmed.
- **`2ca351f` (blotter price columns) could not be live-verified** — the
  Founder's paper book holds **0 orders**, so no rows render and there are zero
  `[aria-label^="Limit price:"]` cells to read. Status **not upgraded**. Proofs
  needing a filled/short/cancelled book must be done by injecting probe records
  into an **isolated copy** of localStorage — never by submitting orders into
  the Founder's live book.
- **`43d5141` not yet live-verified** at the time of sealing.
- Still blocked, unchanged: Gate 4 responsive proof (script route
  classifier-denied — **do not retry by another route**); `/journal` detail
  canvas (0 entries); Delta Bubbles / Live VP raster half (no per-trade tape on
  the free tier); Decision Memory sealing (**architectural — surface it, do not
  rush-wire it**).

---

## THE REMAINING BARE-GLYPH POPULATION

Measured, not yet acted on. Each needs the same question asked: *is this an
erased fact, an undefined operation, or a genuine absence?*

`app/profile/page.tsx:207-227` (trade-row fallbacks, ~10 sites) ·
`app/journal/page.tsx:1632` · `app/proof-lane/page.tsx:356` ·
`app/scanner/page.tsx:152-154` · `app/ai-bot/page.tsx:131,150` ·
`app/nectar/[symbol]/page.tsx:519` ·
`components/chart/OptionsChain.tsx:334,507,530` ·
`components/chart/PnLStatsPanel.tsx:46,55` ·
`components/chart/BottomIndexBar.tsx:33` ·
`components/chart/WMSessionVP.tsx:164` ·
`components/chart/StockInfoPanel.tsx:155-156`

`components/ui/DataHealth.tsx:38,101,202` and
`components/opening-bell/OpeningBellPanel.tsx:27` are **named glyph tokens with
labels** and are probably legitimate — check before changing.
