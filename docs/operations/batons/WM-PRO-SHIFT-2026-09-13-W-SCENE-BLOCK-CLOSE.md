# WM PRO — BATON W — SCENE BLOCK CLOSE (2026-09-13)

Thread: one-thread WM Pro bus. Directive: Founder audit (SCENE_FRAGMENTATION) +
Founding Execution Contract §13 open gates.

No elapsed-time claim is made anywhere in this document. PROVEN is written only
where a live production observation backs it.

---

## 1. The block

Five commits, oldest first:

| commit | what it moved |
|---|---|
| `0abddcd` | SCENE_FRAGMENTATION: the market began 47% down the viewport |
| `b0a43fe` | The market section announced itself as a card, twice |
| `50572da` | Two stacked bars of chrome before the trader reached any market pixel |
| `41e61a4` | A failed paper order reported money that never moved |
| `d72f76b` | The Decision Receipt promised a future this build cannot deliver |

`origin/main` at seal time: `d72f76b`.

## 2. Production measurement (PROVEN — live reads on
`https://wealthymindsetspro.com/command-deck` in the Founder's authenticated
Chrome, viewport 1920×847)

| | BEFORE | after `0abddcd` | after `b0a43fe` | after `50572da` (FINAL) |
|---|---|---|---|---|
| market canvas top (px) | 402 | 356 | 320 | **295** |
| starts at % of viewport | 47% | 42% | 38% | **35%** |
| canvas height (px) | 334 | 448 | 505 | **505** |
| canvas % of viewport AREA | 18% | — | 29% | **29%** |
| duplicate "Market · chart evidence" label | present | present | gone | gone |
| job caption inside header | no | no | no | **yes** |

Final live read, verbatim:

```
{"vw":1920,"vh":847,"top":295,"h":505,"startsAtPct":35,"areaPct":29,
 "captionInHeader":true,"captionText":"Watch the market with no position."}
```

`captionInHeader: true` is what proves `50572da` actually deployed — not the
push, not the build, the rendered header.

## 3. Verified-NOT-a-defect (measured, not assumed)

Two things looked broken and were not. Both are recorded because the cheap move
was to "fix" them and manufacture churn against §0 ("DO NOT begin today by
assuming the entire new parent must be rebuilt") and §4 ("PRESERVE WHAT ALREADY
LANDED").

1. **~900px of apparently unreachable content.**
   `documentElement.scrollHeight === innerHeight === 791` while `.wm-cd-layout`
   measured 1713px. Enumerating overflow containers found the real scroll
   container: `main { overflow-y: auto, clientHeight 722, scrollHeight 2028 }`.
   It scrolls. Nothing is stranded. No edit made.

2. **§30 STEP 7 (rehome secondary machinery into drawers) already satisfied.**
   An early band walk reported "Market object passports" h=324 and "Decision
   receipt" h=90 below the room, which reads as open permanent panels. A closed
   `<details>` can still return non-zero rects in that kind of walk. Reading
   `details.open` directly is the authority: why-drawer (49px summary),
   evidence-drawer (56px), connection-diagnostics (44px) — all `open: false`.
   `MarketCanvasPanel` is nested `inRoom: true` under
   `[aria-label="One decision market room"]`. Room = 700px inside a 722px scroll
   viewport. The required silhouette holds. No edit made.

## 4. §13 gates CLOSED this block, both FAILURE-PROVEN under REVIVE LAW

### 4a. Paper execution state-machine realism — `41e61a4`

`placeChartMarketOrder` computes `const cash = state.cash + cashDelta` before
attempting `savePaperState`. The persist-failure exit returned that post-fill
`cash` even though the fill was rolled back — a caller rendering `result.cash`
after a failed order would print a debited balance beside an order that is not
in the book. The funding-rejection exit twenty lines above already returned
`state.cash`: two failure exits of the same function disagreed about what
"cash" means, and only one was right. Fixed to `cash: state.cash`.

§35 PROTECTED TRUTH class (never fabricate execution) reached not by inventing a
fill but by leaking the arithmetic of one that was rolled back.

Latent, not live: `placeChartMarketOrder` has zero production callers, asserted
by `chartOrderContractCoverage.test.ts`.

REVIVE: fix reverted → these FAIL by name, EXIT=1 —
- `× CONFLICT (another tab wrote first): cash is the balance we observed, not the fill's`
- `× FAILED (the write did not stick): same rule — no debited balance`

Restored byte-identically. `tsc --noEmit` stayed EXIT=0 through the break (an
object field's value is type-correct at any value).

### 4b. Decision Memory sealing — `d72f76b` (surfaced, deliberately NOT wired)

The empty Decision Receipt headline read *"No decision sealed yet — nothing to
receipt."* Every word true except `yet`, which tells the trader that sealing is
something their next action causes. It is not:
`decisionMemoryReachability.test.ts` proves `sealDecision` and every write-path
mutator have zero production referencers, and `DecisionMemoryStore.put()` is
reached by nothing outside its own unit test. In production the store is not
probably empty — it is provably empty, for every owner, forever, by
construction.

So the copy asked a trader to keep trading and wait for a receipt this build can
never produce. §35 of the quietest kind: not a fabricated number, a fabricated
FUTURE. No numeric-truth gate could see it.

§13 says SURFACE, do not rush-wire. Honored exactly: the capability stays
unwired; the product stops implying otherwise. New constant
`DECISION_RECEIPT_UNWIRED_HEADLINE` = *"Decision sealing is not wired in this
build — no decision can be receipted."*

The wording rule lives in `decisionMemoryReachability.test.ts`, **beside the
measurement that justifies it**, not beside the selector. The day somebody wires
a writer, the zero-writer assertions go red first and the disclosure assertion
goes red with them — so the disclosure cannot outlive its condition and quietly
become the new lie.

REVIVE: headline reverted → FAILS by name, EXIT=1 —
`× the receipt DISCLOSES the unwired capability rather than implying a pending one`
`AssertionError: expected 'No decision sealed yet — nothing to r…' to match /not wired/i`

Restored byte-identically. `tsc --noEmit` stayed EXIT=0 through the break (a
string literal's content is type-correct at any value).

A stale spec was also corrected rather than preserved:
`selectDecisionReceipt.test.ts` asserted `/nothing to receipt/i` — it was
watching the TRUE half of the sentence while the word that mattered went
unasserted.

## 5. Gate state at seal

Both run UNPIPED (`> file 2>&1; echo $?` — a pipe masks the exit code):

- `./node_modules/.bin/vitest run` → **568 files / 6487 tests, EXIT=0**
  (test count moved 6483 → 6486 → 6487 across the block)
- `tsc --noEmit` → **EXIT=0**

## 6. Still blocked — honest record, not worked around

| blocker | state | named unblock |
|---|---|---|
| Gate 4 responsive device proof on authenticated routes | `resize_window` reports success and does not resize; `outerWidth` pinned | **a seeded test account** — highest-value human unblock on the board |
| `/journal` detail canvas | 0 journal entries exist | seeded data |
| Live VP / delta-bubble render geometry proof | canvas has no DOM to measure | needs a pixel-level proof channel |
| 390×844 phone capture of the Founder route | **OWED** under the BINDING mobile + visual-confirmation standard (untaken screenshot = FAILED) | — |
| `executionConnectivity` orphaned | not a live defect; `/readiness` discloses it honestly | architectural |

## 7. Open work carried forward

- §30 Build Order STEPS 4–6: attach RISK to market structure; make WHY
  contextual inspection of the SAME decision; make NEXT/WAIT/Expression emerge
  from that decision. (STEP 7 verified already satisfied — see §3.2.)
- F8 capture: 1440×900 + 390×844 beside the F0 baseline.
- F9 capture: proof of what old human burden actually died.
- `public/founder-room-sample.html` drift hazard — currently a hand-copy from
  `tmpdir()`; should become an npm task. Its path prints in every vitest run.

## 8. Acceptance law check

> "IF THE NORMAL FOUNDER URL STILL BLUR/SQUINTS INTO THE OLD CARD DASHBOARD,
> TICKET T FAILS — EVEN IF THE BUILD IS GREEN, THE TESTS PASS, THE PROVIDERS
> IMPROVED, AND 40 COMMITS LANDED."

At 35% start / 29% viewport area with both chrome bars collapsed into one
header, the silhouette reads MARKET earlier than it did at 47% / 18%. That is
measured RUNNING PRODUCT DELTA, not effort. It is not yet the full required
silhouette — RISK / WHY / NEXT are not yet a right-hand rail attached to market
structure. STEPS 4–6 remain the live front.
