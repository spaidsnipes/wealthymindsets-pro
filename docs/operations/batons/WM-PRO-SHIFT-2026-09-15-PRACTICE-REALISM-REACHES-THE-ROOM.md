# BATON — Practice realism reaches the room

**Sealed** 2026-09-15 · **Head** `44d4a00` · **Predecessor baton**
`WM-PRO-SHIFT-2026-09-15-PAPER-TRUTH-THREE-ATOMS.md`

This baton closes a block, not a shift. The block is: **the practice-execution
realism family went from five isolated measurements living inside `/paper`'s tab
chrome, to one compiled REVIEW layer inside the new OS room — and then survived
its own live proof finding a defect in itself.**

---

## 1. What the block contains

| # | Atom | Commit | Status |
|---|---|---|---|
| 1 | Resting-order expiry — the order that could never expire (`paperOrderTimeInForce`) | (see predecessor) | LIVE OBSERVED |
| 2 | Cancel certainty — the cancel that could never lose (`paperCancelCertainty`) | (see predecessor) | LIVE OBSERVED |
| 3 | Stop realism — the stop that was a guarantee (`paperStopRealism`) | (see predecessor) | LIVE OBSERVED |
| 4 | Short realism — the short that needed no shares (`paperShortRealism`) | `f550455` (dispatch) | LIVE OBSERVED |
| 5 | **The room consumes it** — `practiceHonestyLedger` + `PracticeHonestyLayer` | `2b5b0d7` | LIVE OBSERVED |
| 6 | **An entry price is not a mark** — `withoutPersistedMarks` + `PERSISTED_MARK_CAVEAT` | `44d4a00` | shipped; live pending |

Dispatches for all six are in `docs/operations/dispatches/2026-09-15/`.

## 2. Why this block mattered

The Founder's visual canon names **SCENE_FRAGMENTATION** as the dominant failure:
*"the new parent exists, but NOW / MARKET / RISK / WHY / NEXT can still behave
like separate screens, cards, chrome or mini-apps."* The Visual Implementation
Pack's coverage matrix listed **REVIEW / RECEIPT** as an outright GAP, and the
Asset Ledger's stated next move was one line:

> THE NEXT HIGH-VALUE MOVE IS THE NEW SCENE CONSUMING THE REAL TRUTH.

Five modules already owned real, measured truths about how `/paper` is easier
than a real venue. Every one of them rendered **exclusively** inside the legacy
`/paper` page. That is the fragmentation, exactly as named.

`practiceHonestyLedger` is the consumption. **It is a compiler, not a sixth
measurement.** It computes nothing about the book. Every number and every
sentence it returns was produced by the module that already owns that claim; the
ledger decides only ORDER and PRESENCE. If a claim is wrong it is wrong in its
owner, and fixing it there fixes it here — the single-writer rule the deck
already lives under.

**REVIEW / RECEIPT is now closed.** The remaining named GAPs are
**STEWARD / PREGAME** (the warm-up quad: DATA / EXECUTION / TRADER / MARKET —
`WarmUpQuad` is named in the Pack's component map and does not exist in the
repo) and **DIAGNOSE / TRAIN**.

## 3. What the block refuses

Recorded because refusals are the part a successor is most likely to erode:

- **No score.** A "practice realism: 62%" figure would be exactly the invented
  model LABEL-NOT-MODEL forbids, and there is no measurement behind it. The only
  number in the ledger is `easements.length` — an honest fact about the list
  immediately below it.
- **No blocking.** REVIEW has no opinion about whether the trader should have
  done any of it.
- **Nothing on an empty book.** Verified in production: with the Founder's real
  (empty) book restored, `[data-testid="practice-honesty-layer"]` was **absent
  from the DOM entirely** — not rendered empty, not rendered with a zero.
- **No dollar figure it cannot justify.** See §4.

## 4. The defect the proof found in itself

Standing in front of the working product is not a formality. The live proof of
`2b5b0d7` showed the same TSLA short as **$3,586** on `/paper` and **$3,950** in
the new drawer.

Root cause: `paperTrade.applyFill` has five persisted writers and all five say
`marketPx: fillPx`. The saved `marketPx` is a **fill price**, not a quote.
`/paper` masks this by rebuilding an in-memory VM (`?? pos.avgPx`) that is never
written back; the drawer was the first surface in this codebase to read the saved
book directly, so it was the first to inherit the lie.

That is the same `?? pos.avgPx` overclaim `paperPositionMark.ts` was written to
kill — **an Orkin nest**, second confirmed instance (the first was the duplicate
NO FEED pill, task #146). Cured in the owner, per the owner's own law: null is
NOT the entry price. Drop the field; disclose the absence.

## 5. Method notes a successor will need

- **`/command-deck` does not scroll the document.** `body` and `DIV.wm-sanctuary`
  are `overflow:hidden`. The real scroller is an outer `MAIN` with
  `overflowY:auto`. Mouse-wheel scroll over the chart is swallowed. Procedure:
  click open `details.wm-cd-secondary-workspace`, set that `MAIN`'s `scrollTop`
  via JS, then convert CSS coords to screenshot coords with
  `cssCoord * (1568 / window.innerWidth)`.
- **Deploy is confirmed behaviourally,** not from CI: Cloudflare deploys via its
  own Git integration, so poll production chunks for a literal string from the
  new code. **Never upgrade a status from deploy identity alone.**
- **Proofs never use the Founder's live book.** Probe records go into an isolated
  copy of localStorage, backed up first and restored byte-identically afterward,
  verified by readback. This block's restore receipt:
  `restored_identical=true bytes=7501 positions=0 orders=0 trades=0`.
- **REVIVE §22 is Edit-tool only.** `cp` and `git checkout` for revive purposes
  are denied. Reintroduce the defect by hand, confirm the Sentinel fails **by
  name**, restore byte-identical, confirm `git diff --stat` is unchanged.
- **The REVIVE-FOUND lesson, now seven times:** *consulting a selector is not
  rendering its answer.* A Sentinel must assert the **element** string, not the
  import or the selector name.
- **A Sentinel that fails on its own honest prose is testing the wrong surface.**
  Hit twice in this block (the short atom's `refused` guard, the ledger's `score`
  guard). Cure: scan the source with comments stripped.

## 6. Gates at seal

```
Test Files  590 passed (590)
      Tests  6907 passed (6907)
VITEST_EXIT=0
TSC_EXIT=0
```

## 7. Open, and honestly labelled

| Gate | State |
|---|---|
| Delta Bubbles level ownership | CLOSED |
| Live VP render geometry | composition CLOSED; RASTER **BLOCKED** — no per-trade tape feed |
| Paper execution realism | family CLOSED and wired into the OS room |
| Decision Memory sealing | **SURFACED, intentionally unwired.** Zero production callers. Architectural — it needs a decision surface first. Do not wire it to close a gate. |
| executionConnectivity orphaned | **NOT A LIVE DEFECT** — `/readiness` discloses it honestly |
| Gate 4 responsive device proof | **BLOCKED** — programmatic window resize does not take effect, `outerWidth` pinned. Do not retry by another route. |
| `/journal` detail canvas | **BLOCKED** — 0 journal entries exist |

**Next canon work:** STEWARD / PREGAME warm-up quad, then DIAGNOSE / TRAIN.
**Next Drive reads:** enumerate canon folder `1DFuPuMvggyKM6tyo5eVSNXCATu6YE4_i`;
router sections at offsets 3795+ (FRONT-DOOR ROOT LOCK, GARDEN HEALTH, RUNTIME
TOPOLOGY + POINTER FRESHNESS LAW, PLAN + PLANT LAW, TIMED-SHIFT ANTI-STOP LAW);
run the canon's FIVE-SECOND SILHOUETTE TEST against the live `/command-deck`.
