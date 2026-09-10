# WM PRO — §29 MTO HANDOFF — 2026-09-10 15:56 local

**Supersedes `WM-PRO-2026-09-10-1537-MTO-NO-GATE-MOVED.md`**, whose
`DEVICE_PATH_PROVEN: NONE` and `NORMAL_ROUTE_USED: NONE` fields were written
while the Chrome MCP roster was empty. Chrome is now connected and both fields
are answered by live observation below.

**BINARY RELEASE LAW verdict: PASS** (one gate), with two blockers restated
honestly and two of my own false findings retracted.

---

## MTO_GATE_MOVED

`/charts` chart-chrome fidelity badge — the "DATA UNAVAILABLE beside rendered
candles" class, **third nesting**. Commit `6957067`.

## BEFORE_STATE

Measured live, production, `https://wealthymindsetspro.com/charts?symbol=NQ1!`,
2026-09-10. Three answers about one instrument inside ~180 vertical pixels:

```
ticker tape    NQ1!  ACTIVE DEGRADED  29,150  -299.00 (-1.02%)
chart header   NQ1! — DATA UNAVAILABLE
price line     29,148.25 — (change unavailable)  O=H=L=C 29148.25  V 0
```

...while three full sessions of real candles rendered underneath. Canon
Weakness #1 (multi-price disagreement on one page) on the primary trading
surface.

**Root cause had two halves.** Both were required; fixing either alone leaves
the defect reachable.

1. `ChartsDashboard.tsx` called the raw `priceSourceBadge`, which grades the
   QUOTE alone and knows nothing about bars. `MainChart.tsx:6954` had always
   routed correctly through the guard — the two chart surfaces had diverged.
2. `resolveChartSurfaceBadge` — the guard built for exactly this class after
   H-Bkt 1 and again after H-Bkt 8 — inspected only `b.unresolved`. When the
   QUOTE is refused while the provider NAME resolves (`yahoo` / `finnhub` are
   both in the resolved list), `priceSourceBadge` returns
   `unresolved: false` with `availability: "unavailable"`. That is a second
   door into the same room, and the guard was watching only the first.

The bar evidence was already in hand at the defective line —
`selectPerCapabilityFidelity` six lines below was already passing
`hasCandles: chartBars.length > 0`. It simply was never handed to the badge.

## AFTER_STATE

`resolveChartSurfaceBadge` gained an optional 5th parameter
(`quoteObservation`, last and optional so every pre-existing call site is
byte-for-byte unaffected) and now converts on either door:

```ts
if ((b.unresolved || b.availability === "unavailable") && hasCandles) {
```

`ChartsDashboard.tsx` now routes through the guard and hands it real bar
evidence.

## FOUNDER_VISIBLE_DELTA

**Both branches observed live, same domain, same symbol, within the same
minute.** This matters: a fix that silences the chip in all cases would be an
over-correction, and the second row proves it did not.

| condition | header renders |
|---|---|
| tab visible, quote observed | `ACTIVE DEGRADED −1.01%` |
| tab hidden, quote absent, bars present | `HISTORICAL BARS VERIFIED` |

The second row is the production defect from this morning. It rendered
`DATA UNAVAILABLE` before `6957067` and renders the honest, narrower label
after it. Screenshot evidence: amber `HISTORICAL BARS VERIFIED` chip beside
three rendered sessions of candles.

On the visible tab, four surfaces now agree on one instrument:

```
chart header   NQ1!  29150.75  ↓ −298.00  −1.01%   ● ACTIVE DEGRADED
price line     29,150.75  −298.00 (−1.01%)  O 29152.50 H 29154.25 L 29143.75 C 29150.75  V 23
ticker tape    NQ1!  ACTIVE DEGRADED  29,152  −297.25 (−1.01%)
bottom bar     Nasdaq Futures  29150.75  −298.00  −1.01%
```

## REAL_PROVIDER_OR_BROKER_EVIDENCE

`/api/yahoo?sym=NQ1!&type=quote`, fetched live in the page context:

```json
{"price":29153,"prevClose":29448.75,"change":-295.75,"changePct":-1.0043,
 "volume":515690,
 "observation":{"specVersion":"wm.sf-d01.v1.0.1","resolution":"RESOLVED",
                "fidelity":"OBSERVED","ageMs":610843}}
```

Real provider, real prior close, `RESOLVED` under the SF-D01 spec. No fixture.

## NORMAL_ROUTE_USED

`/charts?symbol=NQ1!` reached through the app's own left rail, in the Founder's
already-authenticated Chrome. No password entered, no JWT forged. Also walked
this window: `/paper`, `/command-deck`, `/morning-prep`, `/journal`.

## DEVICE_PATH_PROVEN

**Desktop browser only.** 1568×692 viewport, Chrome on macOS, live production
host. Phone and tablet legs remain **UNPROVEN** — see blockers.

## OLD_STEP_REMOVED

`ChartsDashboard.tsx` no longer imports `priceSourceBadge` at all. The raw
grader is unreachable from the `/charts` header; there is no dormant second
path left to regress into.

## FAILURE_OR_RECOVERY_PROOF

Orkin §22 revive pass — `scratchpad/orkin_chart_header_bars.sh`. Four plausible
defects put back; each must make the guard fail **by name**, with `tsc --noEmit`
exit 0 alongside, because a neuter that fires via a type error proves only that
the file broke.

| revive | what it puts back | result |
|---|---|---|
| AA | guard watches only `b.unresolved` again (the live NQ1! path) | FIRED |
| BB | `/charts` header calls raw `priceSourceBadge` again (no banned string, still type-checks) | FIRED |
| CC | bar evidence withheld — `hasCandles` hard-coded `false` | FIRED |
| DD | availability suppressed even at zero bars (over-correction) | FIRED |

All four fired by name; `tsc` exit 0 on every neuter. DD is the important one:
it proves the fix did not blanket-suppress the honest total-absence case.

New enforcement suite: `src/lib/marketData/chartHeaderBarsVsQuote.enforcement.test.ts`
(8 tests). Its first test asserts the **precondition** — that the raw grader
really does still produce `availability: "unavailable"` with `unresolved:
false` — so the guard cannot silently become vacuous.

Gates: **489 files / 5454 tests passed**, `tsc --noEmit` exit 0. Both run
unpiped.

---

## RETRACTIONS — two false findings of my own

Recorded because an uncorrected false defect is worse than a missed one.

1. **`/academy` 404 is NOT a defect.** I reached it by guessing a URL. The nav
   link is correct: enumerating `a[href]` in the live DOM returns
   `{"t":"Academy","h":"/education"}`. There is no `/academy` href anywhere in
   `src/`, and the only route is `src/app/education`. No fix warranted.

2. **The `/charts` "fourth nesting" is NOT a defect.** I measured
   `— (change unavailable)` on the chart while the tape showed `−297.00
   (−1.01%)`, and began tracing it as a fresh multi-price disagreement. It was
   an artifact of my own measurement conditions: I was driving a **background**
   tab, and `document.visibilityState` was `"hidden"`. `useWebSocket.doRestFetch`
   opens with `if (disposed || document.visibilityState === "hidden") return;`,
   so the chart's quote poll was correctly suspended and `ticker.price` stayed
   0. Network capture confirms it: three consecutive 16-symbol rounds over ~30s
   contained exactly **one** `NQ1!` request each, all issued by the tape, none
   by the chart. Bringing Chrome to the foreground resolved the reading
   completely — see the four-surface agreement above. **No product defect.**

---

## BLOCKERS — restated honestly, not closed

- **Gate 5 — FAIL, runtime-observed** (not inference). `/paper` renders
  verbatim: *"This book is held in this browser only. Your phone and tablet
  cannot see it… CROSS-DEVICE: BLOCKED — no shared position authority exists
  yet"*, plus *"NOT CHECKED · A shared record every device can read"* and
  *"NOT YET · This book written to that record"*. That is `selectCapitalReach`
  reading `serverAuthority: null`. Strongly indicates migration
  `20260907080000_wm_decision_position_shared_authority.sql` is **not applied**
  to production Supabase project `zrzaifaxecwgpfrqctkp`.
  **FOUNDER ACTION REQUIRED** — applying it is not mine to do.

- **Gate 4 — EXTERNALLY_BLOCKED WITH EVIDENCE.** `resize_window(390, 844)`
  returns "Successfully resized" but JS reports
  `{outerWidth: 1568, outerHeight: 692, innerWidth: 1902, innerHeight: 840}`.
  `innerWidth (1902) > outerWidth (1568)` is geometrically impossible — the
  reported metrics come from a different coordinate space than the actual
  window, so the resize never reaches the OS window. Environment limitation of
  the tooling, **not** a WM Pro defect. Window restored to 1568×900.

- **`/journal` detail canvas — blocked on data, not code.** Renders
  `WR UNKNOWN · no trades taken`, `0 entries`, `0W / 0L`, `No entries found`.
  Data absence. Not a defect.

## EXACT_NEXT_UNPROVEN_GATE

**Gate 3 — options chain truth.** Probe
`/api/market-data/alpaca/options?symbol=TSLA`: does the chain carry real
`bid` / `ask` / `quoteTimestamp`, and does the `/workspace` surface render
those values or fabricate a mid? Unproven either way; no claim made.

Remaining §13 gates, untouched this window and not claimed: Delta Bubbles level
ownership; Live VP render geometry proof; Decision Memory sealing has zero
production callers (architectural — surface, do not rush-wire); executionConnectivity
orphaned (not a live defect, `/readiness` discloses it honestly); paper execution
state machine realism.
