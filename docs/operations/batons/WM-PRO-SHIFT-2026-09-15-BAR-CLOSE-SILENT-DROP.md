# Baton — Bar-close silent drop, found at the glass and closed

**Sealed** 2026-09-15 · branch `main` · head `e76e528`
**Block** `435ffa7` → `e76e528` (decision-rail fusion, Available R single owner, bar-close wire)

---

## 1. What closed, and what proves it

Two atoms reached **GREEN by live observation**, not by deploy identity.
Both were measured in the Founder's authenticated Chrome on
`https://wealthymindsetspro.com/charts`, symbol `NQ1!`, timeframe `1h`.

| Atom | Commit | Live evidence |
|---|---|---|
| Available R gets one owner | `e098534` | RISK cell reads `Available R UNKNOWN` plus the delegated detail sentence. The prior string `Available R not computed — no chain.` is absent. |
| Chart publisher stops dropping candles | `e76e528` | MARKET tile reads `NQ1! · 1h · 29355.75 LAST 1h BAR CLOSE` beside `UNAVAILABLE · asOf 10:34:19Z`, while the chart header reads `C 29355.75`. |

The second row is the one that matters. **Two owners, one viewport, same number.**
And the tile is still honest: `UNAVAILABLE` because no live trade printed —
it names the one price it can actually attribute, and refuses the one it can't.
That distinction is the entire point of the feature.

Before this block the same viewport read `PRICE UNKNOWN` next to a rendered
close. That contradiction is extinct on this surface.

---

## 2. The defect — FIRST BROKEN JOINT

`usePublishChartMarketState` in `src/lib/marketData/chartMarketStatePublisher.ts`
destructured its single object parameter and **did not name `bars`**.

```
ChartsDashboard  ──bars: chartBars──▶  usePublishChartMarketState
                                        └─ destructuring drops `bars`
                                      ──────▶  createChartMarketStatePublication
                                                 └─ deriveLastBarClose(undefined) → null
                                                      └─ canonical lastBar = null
                                                           └─ MARKET tile: PRICE UNKNOWN
```

Measured live 2026-09-15, TSLA 1h: the dashboard held **178 loaded bars closing
at 359.02**, the chart header rendered that close under `HISTORICAL BARS
VERIFIED`, and the MARKET tile two inches away read `PRICE UNKNOWN`.

### Why nothing caught it

- **TypeScript could not.** `bars` is optional on `ChartMarketStatePublicationInput`.
  Destructuring fewer keys than a type declares is legal, and the rebuilt object
  literal still satisfied the target type. Zero diagnostics.
- **The tests could not.** `deriveLastBarClose` had a full truth-lock suite —
  11 assertions, mostly refusals — and every one passed. The selector was
  behaving *correctly* on the empty input it was handed. The bug lived one call
  upstream of anything under test.
- **The screen could.** This is the lesson. The defect was only ever visible
  by going to the live glass and reading two owners against each other.

### The general shape

**A dropped input is indistinguishable from absent evidence at the far end of a
wire.** A forwarder that decides by omission can make a truthful downstream
component print a falsehood, and nothing in the type system or the unit suite
will object. Name every field explicitly.

---

## 3. The fix

Forward `bars`, and **depend** on it. Forwarding without depending would freeze
the published close at whatever the first publish happened to see — a quieter
untruth than the loud one it replaced.

## 4. The Sentinel — two parts, because the bug lived between them

`src/lib/marketData/chartMarketStatePublisher.test.ts`

**Behavioural (4 tests)** — carry a real bar close end-to-end through the pure
producer and canonical sealing. Two of these are refusals, so the repair cannot
drift into an overclaim:
- absent bars stay absent (`lastBar` null, no invention)
- a candle close is never promoted into `price.last` (a bar close is not a print)

**Source-text (3 tests)** — assert the hook *names*, *forwards* and *depends on*
`bars`. This part exists because the destructuring list was the only place the
failure was ever visible, and **no type can guard an omitted optional**.

### REVIVE (contract §22 / Orkin)

Removed `bars` from the destructuring via the Edit tool. Result:

```
× names `bars` in the hook's destructuring — a forwarder must not decide by omission
  Tests  1 failed | 25 passed (26)
```

Failed **by name**. Restored byte-identical; re-gated green.

---

## 5. Nest audit — honest empty result

The silent drop is a *class*, so the nest was searched before declaring it
closed. A TypeScript compiler-API pass (full program + checker, not regex) over
`src/` examined **295 destructured parameters**; 112 had optional members; 16
dropped at least one optional; 3 survived filtering. All 3 are false positives:

| Site | Why it is not the defect |
|---|---|
| `selectDecisionChain.ts:149` | Drops 3 optionals from the destructure but reads all three off `input.` at 157/169/173. Genuinely forwards. |
| `selectCLC.ts:59` | Passes the **whole `input` object** to `selectDLAR(input)` rather than rebuilding a literal. Pass-by-reference is immune to this class. |
| `ConnectedStoryRibbon.tsx:35` | `...rest` spread onto `<StoryRibbon>`. Complete forward by construction. |

**No siblings.** The codebase overwhelmingly uses two shapes that are
structurally immune — whole-object pass-through, and rest-spread in components.
`chartMarketStatePublisher` was the one place that named keys individually *and*
rebuilt a literal, which is exactly why it was the one place the bug could hide.

### One latent oddity, recorded not fixed

`src/lib/traderMemory/viewModels/selectSteward.ts:68` declares
`currentState?: CanonicalMarketState | null` and never reads it. It is not a
forwarder and has **zero production call sites** — only tests call it. Dead
optional on a dead selector; no user-visible consequence today. Surfaced here so
it is not rediscovered as a mystery.

---

## 6. Gates

```
./node_modules/.bin/vitest run    → exit 0 · 579 files · 6632 tests passed
./node_modules/.bin/tsc --noEmit  → exit 0
```
Both run **unpiped** — a pipe masks the exit code.

---

## 7. Open, carried forward

**Architectural — surface, do not rush-wire:**
- Decision Memory sealing has **zero production callers**.
- `executionConnectivity` is orphaned. Not a live defect; `/readiness` discloses
  it honestly.

**Blocked, recorded honestly — not silently retried:**
- **Gate 4 responsive device proof.** Programmatic window resize does not take
  effect; `outerWidth` stays pinned. The phone-parity script route was
  classifier-denied and must not be reattempted by another route.
- **`/journal` detail canvas.** 0 journal entries exist, so there is nothing to
  render against.

**Next lanes:** paper execution state-machine realism; Delta Bubbles level
ownership; continued scene fusion per §5/§9 under CONTROL PRESERVATION LAW
(rehome secondary machinery into contextual layers — never amputate the
Workspace side panel).

**Not yet started:** the WM Pro Invention Completeness Register (§2/§3). Must be
built small and incremental, or it becomes REPORTING_ESCAPE.

---

## 8. The transferable lesson

The bar-close feature was **built, tested, shipped, deployed — and unreachable.**
Every gate was green the entire time it was broken. Nothing short of standing at
the live glass and reading two owners against each other would have found it.

*Green gates prove the code you tested. They do not prove the screen.*
