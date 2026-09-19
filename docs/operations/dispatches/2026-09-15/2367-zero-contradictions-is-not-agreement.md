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

# 2367 — Zero contradictions is not agreement

**Commit:** `9b2c185` · **Route:** `/command-deck` → Data Fidelity
**Gates:** 600 files / 7006 tests `VITEST_EXIT=0`; `TSC_EXIT=0`
**Class:** H1 shape 1 (fabricated absence) — same law as dispatch 2366, one tile left.

---

## The screen

This was found the same way 2366 was found: by **looking at a screenshot**, not by
grepping source. In fact it was found in the *same* screenshot — the zoom capture
taken to prove the GAPS fix had landed showed the next defect sitting beside it.

The Data Fidelity strip rendered, four pixels apart:

```
UNKNOWNS        8     (watch tone, amber)
CONTRADICTIONS  0     (OK tone, bright cream)
```

Read as a pair, those two cells say: *WM determined very little, and found no
disagreement in what it determined.* The first half is honest. The second half is
not a finding at all.

---

## Root cause — verified cold

1. **All eight named dimensions hard-code an empty contradictions array.**
   Confirmed by reading, not assuming:
   - `deriveDirectionDimension.ts` — lines 42, 187, 204, 216
   - `deriveOrderFlowDimension.ts` — lines 77, 253, 266
   - `deriveVolatilityDimension.ts` — lines 29, 153, 165
   - `deriveRegimeDimension.ts` — lines 39, 88, 109, 122, 136, 148 (regime merely
     unions direction + volatility, and both are always empty)

2. **The system's only reachable producer is one condition**, in
   `chartMarketStatePublisher.ts:212`:

   ```ts
   if (input.ticker.price > 0 && !priceTick) {
     contradictions.push("Displayed ticker price has no matching timestamped runtime tick; …");
   }
   ```

3. **The same panel was showing `0/8 dimensions resolved`.** So on the observed
   packet there were not two determinations to compare.

A contradiction requires **two determinations to disagree**. With zero or one,
`contradictions.length === 0` is arithmetic about an empty set — and the tile was
rendering that arithmetic in the affirmative OK tone.

---

## The cure — one writer

`describeContradictionCoverage` in `canonicalMarketState.ts` is now the single
writer for every contradiction claim WM makes. It counts the things that COULD
have disagreed:

| Counted as a determination | Why |
|---|---|
| Each of the 8 dimensions with `resolution === "RESOLVED"` | WM committed to a value |
| `price.last != null` | a trade printed and WM holds the tick |
| `lastBar.close != null` | a loaded bar close, the second price owner |

and then:

| Determinations | Contradictions found | Renders | Tone |
|---|---|---|---|
| any | ≥ 1 | the count | **warn** — an observed contradiction is always reportable |
| 0 | 0 | `n/a` | dim, with "nothing that could contradict anything" |
| 1 | 0 | `n/a` | dim, with "one determination cannot contradict itself" |
| ≥ 2 | 0 | `0` | ok, with "N determinations were compared and none disagreed" |

The denominator is stated in **every** branch. That is the whole difference between
a number and a claim.

`MARKET_STATE_DIMENSION_KEYS` now declares the eight dimensions in one place, so
the on-screen `0/8` and any claim about "all of WM's determinations" cannot drift
apart. A Sentinel asserts the array has exactly 8 unique members and that each
names a real `MarketStateDimension` field.

---

## LABEL-NOT-MODEL

This ships **no new contradiction detectors**. The cure for an overclaim is a
disclosure sentence, never an invented number and never a changed selector.
Widening what WM actually cross-checks is real work with real evidence
requirements — it is a future commit, not this one.

---

## Over-corrections GUARDED, not merely avoided

Four of the nine Sentinels exist only to stop the cure from becoming its own defect:

1. **An OBSERVED contradiction is still a number, in the warn tone.** Finding one
   *proves* two determinations existed to disagree, so the denominator can never
   suppress it.
2. **Two agreeing determinations may still say `0`, plainly**, and say it as a
   measurement. Making every contradiction claim permanently unreadable would
   discard a real finding the moment WM starts resolving dimensions.
3. **The `contradictions` field is not deleted from the schema.**
4. **The one narrow real detector is not removed for being narrow.** Deleting
   `chartMarketStatePublisher`'s push because it is currently the only producer
   would destroy the capability rather than disclose its narrowness.

Plus: surfaces that only **escalate** on `> 0` — `HeroTruth.tsx:418`,
`WhyInspector.tsx:267`, `MarketObjectPassportPanel.tsx:98` — assert nothing at
zero. They were never lying and are explicitly out of scope. Rewriting them to
shout "undetectable" everywhere would be design theater.

---

## REVIVE §22 (Orkin)

The raw render was reinstated **via the Edit tool only**:

```tsx
<Stat label="Contradictions" value={String(state.contradictions.length)} tone={…} />
```

| Check | Result |
|---|---|
| `tsc --noEmit` on the REVIVED defect | **`TSC_EXIT=0`** — it compiles clean |
| Sentinel outcome | **`VITEST_EXIT=1`** |
| Failing test, by name | `× THE DEFECT: /command-deck routes CONTRADICTIONS through the claim compiler` |
| Restore | byte-identical; full gates re-green at 600/7006 + `TSC_EXIT=0` |

**The revived defect compiled.** A type system would never have caught this. That
is precisely why the REVIVE must be performed in *compilable* form — a revive that
fails to compile proves nothing about whether the Sentinel is load-bearing.

---

## Method lesson sealed

> **A contradiction requires two determinations to disagree.**
> Below that threshold, a contradiction count is not a measurement of the world —
> it is a measurement of how little was measured. Any cell that can only ever
> print one value is reporting the absence of a DETECTOR as the absence of a
> DEFECT.

This is the third distinct cell to fall to the same law in this block (GAPS,
the gap disclosure grammar, CONTRADICTIONS). The law generalises: **every count
rendered in an affirmative tone must be able to state its denominator.**

---

## Live verification — PROVEN, and the observation DISCRIMINATES

A live proof is only worth anything if the screen genuinely showed the *pre-fix*
value first. It did, in the Founder's own session:

| | `CONTRADICTIONS` tile on `/command-deck` |
|---|---|
| **Before** (cure pushed, deploy still in flight) | value `0`, colour **`rgb(237, 230, 211)`** — the bright OK tone — four pixels from `UNKNOWNS 8` in amber, no `title` |
| **After** (deploy landed) | value **`n/a`**, colour **`rgb(138, 130, 113)`** — the dim token — `title` = *"WM has resolved nothing yet, so there is nothing that could contradict anything. Zero contradictions here is not evidence of agreement."* |

Same route, same session, same screen region, all 17 `<details>` forced open.
Zoom screenshots captured of both states.

**A deploy-identity trap was caught and not walked into.** The first chunkset
change fired on poll 1 — far faster than any previous deploy in this block. Had
it been accepted as arrival, this fix would have been recorded PROVEN off a
digest alone. The tile was re-read instead and still showed `0` in the bright
tone: that change was `36ee7d9` (the grammar fix) landing, **not** this commit.
The poll was re-armed from the new baseline and the real arrival came on poll 4
(`6338ad87…` → `a67b6ff4…`).

> **Never upgrade a status from deploy identity alone.** A chunkset digest proves
> *something* shipped. Only the pixel proves *which*.

### Also re-confirmed on the same load

- `2092da4` — `GAPS n/a` in `rgb(138, 130, 113)`; `/Gaps\s*None/i` absent.
- `36ee7d9` — the disclosure `title` now reads *"1 of 1 channel **stamps** no
  usable sequence…"*, subject and verb agreeing.

The Data Fidelity strip now reads, left to right:
`COVERAGE 1 ch` · `UNKNOWNS 8` (amber) · `CONTRADICTIONS n/a` (dim) ·
`MEMORY AGE 35.9d` · `LAST EVENT 28.9d` (red) · `OBSERVED 38273` (bright) ·
`GAPS n/a` (dim).

Two bright numbers WM actually measured, two dim `n/a`s where it cannot
honestly claim anything, and the amber count of what it does not know. The
tonal split *is* the epistemics, visible at a glance.
