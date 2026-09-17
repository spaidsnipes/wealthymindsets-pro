# BATON — THREE CHART CELLS STOPPED LYING

**Sealed** 2026-09-17 · WM Pro · shift lane: chart truth (Founding Execution Contract §13)

Everything below is either a commit SHA in this repo or a value read out of the
production DOM. Nothing here is inferred. Where a thing was NOT observed, it says
so in those words.

---

## WHAT SHIPPED

### 1. `b1414a7d` — the biggest number on the product stops calling a forming bar a close

The headline price cell migrated onto `chartHeaderPriceFact` (a `decimals`
parameter was added so the owner, not the caller, decides precision).

**LIVE-VERIFIED** on https://wealthymindsetspro.com/charts, NQ1! 30m. The cell at
y=153 carried `data-price-kind="BAR_CLOSE"` and read:

```
29696.00 LAST 30m BAR CLOSE
```

with the reason in its `title`.

### 2. `515647b0` — the timeframe buttons say which one is selected instead of only colouring it

Two compounding defects, both measured live before the fix: all nine buttons
returned `aria-pressed`/`aria-current`/`aria-selected`/`role`/`aria-label` = null,
and the selected one differed from the other eight by exactly one background
colour class. Separately, `1m` and `1M` — ~43,200× apart — were spoken
identically.

New owner `timeframeSpokenName()` in `src/lib/timeframes.ts` DERIVES the spoken
name from `candleIntervalSec` (the same number the fetch path hands the provider)
so the announced name cannot drift from the bars actually drawn. Calendar units
are named from the id, because the table stores `1M` as 30 days and "30 days bars"
would be a different claim than the button makes.

**LIVE-VERIFIED.** All nine buttons now report `aria-pressed` (`30m` = `"true"`,
the rest `"false"`), distinct accessible names `"1 minute bars"` … `"1 month bars"`,
and the wrapper reports `role="group"`.

### 3. `59e78812` — three cells stop asserting a range the bar's own volume denies

Found by USE, not by audit. Read straight out of the live DOM:

```
O 29701.00   H 29701.00   L 29701.00   NOW 29701.00   V 0
```

`H` painted in the high colour, `L` in the low colour — two cells answering "how
far did price travel inside this bar" while the volume cell two elements to the
right says the record holds ZERO trades. Reproduced again on a later build at a
different price (`29693.25`), so it was not a one-off.

New owner `src/lib/marketData/chartBarRangeFact.ts`. It refuses the O/H/L cells
ONLY when volume AND range are BOTH empty. Both halves are required: a zero-volume
bar that still moved is a feed that does not report volume, and its extremes are
real measurements that keep their cells. It says nothing about the market — only
about the record — because claiming "no trades happened" would be the same defect
wearing the other coat (§35). The `NOW` value is never suppressed: trading an
overclaim for a blindness is rejected just as firmly.

**NOT LIVE-VERIFIED.** The Cloudflare deploy lags CI and had not landed when this
baton was sealed. At the last live read the bar carried `V 2` and real range, so
the `RANGE` arm was correctly active; observing the `NO_RECORD` arm needs a
genuinely empty bar (after hours, or a thin symbol).

---

## GATE MEASUREMENTS

**Canon Weakness #1 (multi-price disagreement) — CLOSED on this viewport, measured.**
The chrome header at y=81 and the chart headline at y=153 BOTH read
`29696.00 LAST 30m BAR CLOSE`. The only other price on screen, `29693.25`, belongs
to the forming bar and is correctly labelled `NOW`.

**Hour-3 continuity — PASSED, measured.** Biggest canvas `1564x560 @ 18,176`,
timeframe `30m`, price `29696.00`, kind `LIVE_QUOTE` — IDENTICAL before opening
Tools, with Tools open, and after Tools closed. The chart does not disappear
during object inspection and symbol/timeframe/context survive.

---

## GATES FOUND ALREADY CLOSED

- **Decision Memory sealing has zero production callers.** §13 says SURFACE the
  gap, explicitly do NOT rush-wire it. That is already done:
  `selectDecisionReceipt.ts` exports `DECISION_RECEIPT_UNWIRED_HEADLINE`
  ("Decision sealing is not wired in this build — no decision can be receipted.")
  and `decisionMemoryReachability.test.ts` fails first if a writer is ever wired,
  so the disclosure cannot outlive the condition it describes.
- **"DAY BIAS BULL" beside "REGIME UNRESOLVED"** was investigated as a candidate
  contradiction and REJECTED as a defect. `selectRegimeBadge.ts` deliberately
  refuses the reserved word REGIME and requires `canonRegime` as a parameter so no
  caller can silently reopen the contradiction. This is a prior fix working.
- **The bare live-quote render in the chrome header** was investigated and found
  legitimate.

Two candidate defects rejected rather than manufactured into work.

---

## STILL BLOCKED (recorded honestly)

- **Gate 4 responsive device proof** — programmatic window resize does not take
  effect; `outerWidth` stays pinned. No proof channel.
- **`/journal` detail canvas** — 0 journal entries exist; nothing to render.
- **Live VP render geometry proof** — WMSessionVP is deliberately RETIRED by
  Founder spec (89a350e). It cannot serve this gate. The gate needs a different
  subject or needs closing as obsolete.
- **`executionConnectivity` orphaned** — not a live defect; `/readiness` discloses
  it honestly.

---

## DISCLOSURE

The Founder's directive said "EXAMINE ALL THE PICTURES/MOCKUPS IN THIS THREAD."
Those images were attached before a context compaction and are NOT visible to the
thread that sealed this baton. No claim in this document rests on them, and none
of the work above should be read as having been matched against them.

---

## VERIFICATION DISCIPLINE

Each commit above ran `./node_modules/.bin/vitest run` and `tsc --noEmit` UNPIPED
(a pipe masks the exit code — this was hit and corrected during the shift).

- `515647b0`: `TSC_EXIT=0`, 725 files / 8862 passed / 2 skipped, `VITEST_EXIT=0`.
  Mutations M1, M2b, M3, M4 each EXIT=1; restore EXIT=0.
- `59e78812`: `TSC_EXIT=0`, 726 files / 8871 passed / 2 skipped, `VITEST_EXIT=0`.
  Five mutations each EXIT=1; restore EXIT=0.

**Two mutation lessons worth keeping:**

1. A non-global `perl -0pi -e 's///'` can land on a COMMENT occurrence of the
   token instead of the real one. `codeOf()` strips comments, so the test
   correctly survives — the MUTATION was invalid, not the test. Always
   `grep -c` after mutating to confirm the count actually moved.
2. A guard that cannot change any output under any input is decoration, not a
   guard. `chartBarRangeFact` had an explicit null check that the later strict
   comparisons already subsumed; it was DELETED and its reasoning folded into the
   comments on the two real gates, rather than propped up with a contrived test.
