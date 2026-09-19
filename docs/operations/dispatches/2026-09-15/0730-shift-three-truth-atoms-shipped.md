<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **dispatch** — an instruction issued for one day's work. Its filename names its own day. It was true
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

# DISPATCH — three truth atoms shipped on the §13 open gates

**From:** WM Pro shift thread
**To:** whole team (Atlas / Sentinel / Forge / Noah / Nehemiah / Micah)
**Date:** 2026-09-15
**Branch:** `main`, all pushed

Read this if you touch `/charts`, `/paper`, or anything that renders a price the
system did not itself observe.

---

## 1. `9e1f352` + `5f14d88` — a forming bar's running value is not a CLOSE

The chart header was labelling the in-progress bar's current value as that bar's
close. It is not a close until the bar seals. Fixed at the source (the selector
refuses to call the seed a close) and at the surface (the header no longer
prints the word).

**Why it matters to you:** if you read the last element of a bar series and call
it a close, you have the same bug. The forming bar is always the last element.

## 2. `2f5ddd7` — Volume Profile pixels OBSERVED, not computed

The VP gate had only ever been proved by running the arithmetic. It is now
proved by measuring what is actually painted. Computation passing is not the
same claim as geometry rendering.

**Why it matters to you:** "the numbers are right" is not "the user sees it."
Gate receipts that only assert computed values are one class of proof short.

## 3. `ceca442` — name the queue priority a paper fill assumed but could not know

**New:** `src/lib/paperFillQueueBasis.ts`.

`/paper` books a full fill the instant an observed price *satisfies* an order's
limit — including when the price merely **equals** it. A buy limit at 100 fills
on a print of exactly 100.00. That is precisely the case a real queue would most
often **not** give: the market touched the level and never traded through it, so
a real order fills there only with queue priority.

The quote pipeline behind `/paper` carries no depth and no tape. Queue position
is not estimated badly — **there is no input from which it could be computed at
all.** Canon weakness #9 PAPER-FILL OVERCONFIDENCE.

### The cure is a LABEL, not a MODEL

No fill probability. No partial-fill schedule. No queue-depth estimate. Every
one of those mints a number no observation produced — which is the defect this
repo keeps closing, not the cure. (Same reasoning as `d53abc6`'s recorded
refusal to add a spread model.)

`selectFillQueueBasis` grades the fill that *already happened*, from the order's
own recorded `limitPx` and `fillPx`:

| basis | meaning |
|---|---|
| `marketable` | the price traded **through** the level — a real order fills here by construction |
| `at-the-touch` | the price **equalled** the level — a real fill needed queue priority |
| `unconditioned` | no limit level to grade against — **not an all-clear** |

Only `at-the-touch` renders a sentence on the blotter. Silence is the absence of
**this** caveat, never a clean bill of health.

### Two patterns worth copying

- **DERIVED, NOT STORED.** The grade is computed from fields already persisted,
  so an order written before this existed is graded by the identical rule. No new
  optional field, therefore no H1 absence-vs-zero problem on the serialized book.
- **Strict equality, deliberately.** A tolerance band ("within a tick") would be
  a modelling parameter invented here with no observation behind it.

### Sentinels

A source-text guard on `src/app/paper/page.tsx`, because the overclaim is an
**absence on a rendered surface** and no type can guard a missing paragraph.

**REVIVE (§22) performed on both halves via Edit only:**
- Collapsing strict equality to `<=`/`>=` → 5 tests failed **by name**, incl.
  *"THE FIX: a buy filled at exactly its limit assumed queue priority"* and
  *"uses strict equality — no invented tolerance band around the level"*.
- Deleting `<FillQueueBasisNote ord={ord} />` → Sentinel *"renders the note in
  the order rows"* failed **by name**.
- Both restored byte-identical.

Three pre-existing `paperFillTruth` guards asserted exact fill-object shape.
Widened by **naming** `queueBasis` rather than dropping to `toMatchObject`, so
the shape stays locked.

---

## Gates

`./node_modules/.bin/vitest run` → **581 files / 6691 tests, exit 0**
`tsc --noEmit` → **exit 0**
Both run unpiped (a pipe masks the exit code).

## Live status — DEPLOYED AND OBSERVED, with one honest limit

Measured on `https://wealthymindsetspro.com/paper` in the Founder's
authenticated Chrome.

**First probe (immediately after push):** bundle scan across all 16
`script[src]` for the shipped string `queue priority` → **0 hits**. Recorded as
a negative. Nothing was claimed live at that point.

**Second probe (after the Cloudflare/OpenNext build landed):**

```
{"state":"done","scanned":16,"hits":["2451suuocfzx2.js"]}
```

`ceca442` is **on the live host**. The disclosure sentence ships in the
production bundle.

Page observed healthy in the same pass: `$100,000` equity / `$100,000` cash /
`+$0.00` day P&L, `PAPER · NO REAL MONEY · NO BROKER`, `BROWSER SAVE VERIFIED`,
`Positions (0) / Orders (0 pending) / Options (0) / Blotter (0)`, order ticket
on NQ1! at `$29,433.50` marked `ACTIVE DEGRADED · Observed 9/16/2026, 7:13:03 AM
· 10m old`, order-type row Market / Limit / Stop / Stop limit. Screenshot taken.

**THE LIMIT, STATED PLAINLY:** the note only renders for a **filled limit order
whose `fillPx === limitPx`**. The Founder's book is empty (0 orders, 0
positions), so **the rendered paragraph itself has not been seen on screen.**
No orders were submitted into his account to manufacture one.

What is proven: the code is live. What is not: the pixel. Do not upgrade the
second claim from the first.

---

## What is still open (unchanged, stated so nobody re-derives it)

- **Decision Memory sealing has zero production callers.** Architectural. Surfaced,
  deliberately **not** wired — it needs a decision surface first.
- **`executionConnectivity` orphaned.** Not a live defect; `/readiness` discloses
  honestly.
- **Paper execution state-machine realism.** Advanced, not closed — the ordering
  model beyond this label is untouched.
- **BLOCKED — Gate 4 responsive device proof.** Programmatic window resize does
  not take effect; `outerWidth` stays pinned.
- **BLOCKED — `/journal` detail canvas.** 0 journal entries to render.
