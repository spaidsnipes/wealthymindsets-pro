# SHIFT-N BATON — "The Laundered Zero"

**Surface:** `/charts`, and every surface that reads a day-change from `useWebSocket`.
**Commits:** `fe02ad1` (pill pluralization), `06a7070` (day-change reference truth).
**Status:** both shipped to `main`, both deployed and observed live on
`https://wealthymindsetspro.com`.

---

## 1. The defect, stated plainly

The product was capable of printing a **non-zero day change, with a coloured
direction arrow, derived from a number that was never a prior close.**

That is canon **Weakness #1** (multi-price disagreement on one page) arriving
through the one door the existing guard structurally cannot watch.

### Why the existing guard could not catch it

`selectTickerChangeDisplay` is the *display* guard. Its only "no reference"
signature is **exactly zero**:

```ts
if (change === 0 && changePct === 0) return withheld;
```

That is sound — but it is the LAST line, and it can only see the two output
numbers. The bug **laundered** the exactly-zero signature into a non-zero
fabrication *upstream of it*. By the time the display guard saw the number, the
number looked healthy.

### The chain — four steps, traced not guessed

| # | Site | What happens |
|---|------|--------------|
| 1 | `src/app/api/yahoo/route.ts:176` | No real prior close → `prevClose = price`. Publishes `change: 0, changePct: 0`. **It is honest**: it also sets `ohlcObservation.prevClose: false`. |
| 2 | `src/hooks/useWebSocket.ts:144` (`mk()`) | `const prev = j?.prevClose ?? j?.pc ?? j?.open ?? price` — **discards the honesty flag.** The final `?? price` term manufactures `change = price - price = 0` out of missing data. |
| 3 | `src/hooks/useWebSocket.ts:1228` (`doRestFetch`) | `if (Number.isFinite(q.change)) prevCloseRef.current = realPrice - q.change`. **`Number.isFinite(0)` is `true`**, so the ref is seeded with `realPrice - 0` — i.e. **the current price, stored as yesterday's close.** |
| 4 | `src/hooks/useWebSocket.ts:891` (`flush()`) | `hasRealRef = prevCloseRef.current > 0` is now satisfied. Every subsequent websocket tick computes `change = price − <the price at one arbitrary REST poll>`. |

**Step 4 is the defect.** It emits a NON-ZERO day change measured from an
intraday snapshot. The display guard waves it through and the UI paints a
direction arrow on a fabrication.

The server had already told the truth. The client threw it away.

---

## 2. The fix

### `src/lib/marketData/resolveQuoteDayChange.ts` — NEW, pure

Single writer for one question: *does this quote actually carry a reference
close?* No I/O, no clock, no provider knowledge beyond field names.

Rules, in order:

- `ohlcObservation.prevClose === false` → the provider is stating outright that
  its `prevClose` is a compatibility fallback. **Believe it. No reference.**
- A `prevClose` / `pc` **exactly equal to `price`** → indistinguishable from that
  same fabrication. No reference. Nothing is lost: a genuinely unchanged price
  yields change 0, which the display guard withholds anyway. This closes the
  identical `?? price` fallback in `/api/alpaca`, which publishes **no**
  `ohlcObservation` to check — so the echo itself has to be the tell.
- `open` is accepted as a weaker but REAL reference (change-from-open is
  pre-existing behaviour), but never when it equals `price`.
- A **non-zero** explicit `change` implies a reference of `price - change`.
- Otherwise: no reference, and the output is the exactly-zero withheld signature
  every downstream consumer already understands.

When a reference IS found, the resolver **prefers the provider's own arithmetic**
so a healthy quote renders byte-identical numbers to before this guard existed.
A truth guard must not silently drift a number a trader is reading.

### `src/hooks/useWebSocket.ts` — 5 hunks

`RealQuote` gains `hasReferenceClose: boolean`, and the seed becomes:

```ts
if (q.hasReferenceClose && Number.isFinite(q.change)) {
  prevCloseRef.current = realPrice - q.change;
}
```

`Number.isFinite` alone was never a proof that a reference existed. **0 is
perfectly finite.**

---

## 3. Anti-vacuity: how this was kept from being theatre

### Positive controls come FIRST

A resolver that withheld *everything* would make every "no reference" assertion
pass while destroying the real day-change on the primary trading surface. Two
positive controls are the first tests in the file and must stay green:

- healthy quote (`prevClose: 376.37` @ `price 353.57`) passes through
  **byte-identically**: `change: -22.8`, `changePct: -6.0578`
- derivation works when the provider omits `change`

`quoteReferenceSeedTruth.test.ts` has its own positive control too: it asserts
the regex extractor still finds ≥2 `prevCloseRef.current =` assignments, one
being the `0` reset and one containing `q.change`. **A detector that quietly
stopped matching would report "no unguarded seed" forever — and that reads
exactly like a clean bill of health.**

### The cross-layer blindness I had to fix in my own work

`resolveQuoteDayChange.test.ts` locks the pure resolver. **It cannot, by
construction, see the call site.** A reviver who restored

```ts
if (Number.isFinite(q.change)) prevCloseRef.current = realPrice - q.change;
```

would bring the entire defect back **with every resolver test still green.**

I caught this by reasoning, not by a failure, and wrote
`quoteReferenceSeedTruth.test.ts` — a source-reading Sentinel over the call
site. It strips comments first, deliberately, so the prose explaining this bug
can never satisfy an assertion about the code that fixes it.

### §22 Orkin revive-attempts — BOTH bite

| Revive | Result |
|--------|--------|
| Restore `?? price` + drop the `ohlcObservation` check | exit **1** — **7 failed / 6 passed**. The 6 survivors were exactly the positive controls. |
| Restore the ungated `if (Number.isFinite(q.change))` seed | exit **1** — **1 failed / 17 passed**: `AssertionError: prevCloseRef seed "realPrice - q.change" is not gated on hasReferenceClose` |

The second revive is the important one: **only the new Sentinel caught it.**
That is the proof the cross-layer test was worth writing rather than an
assertion I asserted.

---

## 4. Gates

Run **unpiped** (a pipe masks the exit code; a `>` redirect preserves it).

- `./node_modules/.bin/vitest run` → **exit 0**, **386 files / 3695 tests**
  (baseline was 384 / 3677 — net +2 files, +18 tests)
- `tsc --noEmit` → **exit 0**

---

## 5. Live observation — what IS and what is NOT proven

**Methodology precondition asserted before every measurement** (shift-M standing
rule): `document.visibilityState === "visible"` and `document.hasFocus()`.
Browsers suspend `requestAnimationFrame` in hidden tabs, and `doRestFetch` in
`useWebSocket` *also* early-returns when hidden — a backgrounded tab manufactures
convincing false defects. The tab had to be switched to explicitly; bringing
Chrome to the front was not sufficient (window frontmost, tab still backgrounded).

### PROVEN LIVE ✅ — the deploy landed

`hasReferenceClose` does **not** exist anywhere in `src/` at the parent commit
`fe02ad1`, and **does** exist at `06a7070`. That token was found in the served
production chunk `/_next/static/chunks/2h1c4qka3v80q.js` (16 scripts scanned,
1.63 MB). This is a fingerprint, not an inference.

### PROVEN LIVE ✅ — no over-suppression regression

Rendered on the deployed bundle at **2026-09-04T15:53:50Z**, `visible` + focused:

```
TSLA   352.05     -24.32 (-6.46%)
NQ1!   29,520      -4.75 (-0.02%)
ES1!   7,721.50   -33.25 (-0.43%)
RTY1!  2,975.50    +5.80 (+0.20%)
```

Four real, distinct, signed day-changes **including a positive one**; no
`+0.00 (+0.00%)` anywhere in the document; **zero console errors captured.**
The guard is not eating real data.

### NOT PROVEN LIVE ❌ — say this in exactly these terms

**No live symbol currently exercises the no-reference path.** 22 symbols probed
against production `/api/yahoo`:

- Sweep 1 (10): `TSLA, NQ1!, MNQ1!, ES1!, MES1!, GC1!, CL1!, VX1!, M2K1!, MYM1!`
- Sweep 2 (12): `ZZZZ, BRK-A, SPXW, ^VIX, BTC-USD, ETH-USD, 6E1!, ZN1!, HG1!, SI1!, NG1!, RTY1!`

Every HTTP 200 response returned `ohlcObservation.prevClose === true` and
`prevClose !== price`. Three apparent "hits" (`ZZZZ`, `SPXW`, `6E1!`) were
**HTTP 404s** where `undefined === undefined` made my `echoesPrice` probe a false
positive — not real no-reference quotes. I am recording that as a flaw in my own
probe, caught before it became a claim.

**Therefore:** this fix is proven by code-trace, 18 unit tests, and two Orkin
revive-attempts. It is **NOT** proven by live observation of the fabrication
itself. Both statements are true simultaneously and neither should be dropped
when this is summarised.

### External cross-check

The Founder's TradingView tab reads `XTSLA1! 353.82 ▼ −6.19%`. Production
`/api/yahoo` reported `price 351.95, prevClose 376.37, change −24.42, changePct
−6.4883`. The direction and magnitude corroborate. This also settles an earlier
open question: the header tape's `−22.80 (−6.06%)` was **REAL** — the header was
right and the chart was under-claiming, exactly as hypothesised.

---

## 6. Commit `fe02ad1` — the small one, stated honestly

`CanvasSummaryPill` was shipping **"NO TRADE · 8 unresolved · 1 blockers ·
1 cleared"** on production `/charts`. `"blockers"` is the only countable noun in
that row; `unresolved` / `cleared` / `would-invalidate` are participles and read
correctly at any count. A single blocker is the most common real state on a live
chart.

Sloppy copy on the surface that explains **why a trade is refused** undercuts the
refusal itself. Fixed with the count-aware branch. Note the assertion trap this
required care around: **`"1 blocker"` is a substring of `"1 blockers"`** — a
naive `toContain` would pass on the bug.

Live at 15:53:50Z the pill reads `ACTION · 8 unresolved · 2 cleared ·
3 would-invalidate` — the renamed labels are deployed. The singular/plural branch
is not exercised in this particular state (no blockers present), so that specific
branch remains test-proven rather than live-proven.

---

## 7. Deliberately NOT done — and why

- **`hasProviderChange` in `MainChart.tsx:6088–6104` was NOT loosened.** That
  guard's own comments record that loosening it previously produced a fabricated
  **−18.78%** TSLA header and a green `"381.33 +0.00 (+0.00%)"` rendered beside
  HISTORICAL BARS VERIFIED while the tape showed **+6.73%** for the same symbol.
  Any future fix in this area must not "simplify" by relaxing it.
- **`/api/yahoo:176` was left alone.** It is already honest — it flags the
  fallback via `ohlcObservation`. The bug was the *client discarding* that flag.
  Fixing the client is the correct layer; changing the route would alter the
  contract for every other consumer.
- **`/api/exchange` and `/api/alpaca:190` use the day's OPEN as the day-change
  reference**, which yields change-from-open labelled as a day change. This is
  pre-existing, and the reference is **real** (not fabricated), so it is a
  different class of problem than the one this shift closed. Left in scope
  discipline; named in the resolver's doc comment so the next reader finds it.
  **This remains open.**

---

## 8. Verified non-defect (investigated, cleared, recorded)

`doRestFetch` / `scheduleRestFetch` early-return when the tab is hidden, and the
re-arm sits only in `.finally()`. This reads exactly like a permanently-dead poll
loop. It is not: `onVisibleWS` (line ~1263) re-fires `doRestFetch()` on
`visibilitychange`, so it self-heals.

Recording the clearance matters as much as recording the defect — otherwise the
next reader re-investigates it.

---

## 9. Handoff

**Open, unblocked:** Delta Bubbles level ownership; Live VP render geometry
proof; paper execution state-machine realism; orphan-ledger Sentinel (28
orphans); the change-from-open reference question in §7.

**Architectural — surface, do NOT rush-wire:** Decision Memory sealing has zero
production callers. `DecisionMemoryStore.put()`'s only caller is its own unit
test. Three surfaces read it and degrade honestly to journal-only, which is **not
a screen lie**. What IS dead: `/command-deck` derives `hasOpenPosition` and
`hasUnreviewedClose` from decision records alone with no journal fallback, so
both are pinned false and job-mode can never reach MANAGE or REVIEW via decision
state.

**Not a live defect:** `executionConnectivity` is orphaned; `/readiness`
discloses this honestly.

**BLOCKED — do not burn time:**
- Gate 4 responsive device proof — programmatic window resize does not take
  effect, `outerWidth` stays pinned.
- `/journal` detail canvas — 0 journal entries exist to open.
- Wrangler observability/rollback — needs `./node_modules/.bin/wrangler login`
  in an interactive terminal (**Founder action**).

**Collision lock respected all shift:** `ChartsDashboard.tsx`, `ChartToolbar.tsx`,
`globals.css` are held by another thread and were never touched. Commits named
their own files explicitly; no `git add -A`, no `--no-verify`, no force-push.
Preserved WIP left intact: `scratchpad/`, `chartPhoneControlReachability.test.ts`,
`api/fmp/route.test.ts`, `WM-PRO-EVENING-2026-09-03.md`.
