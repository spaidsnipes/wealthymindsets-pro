# WM PRO SHIFT — THE MASTHEAD LEARNS TO READ THE FEED

Date: 2026-09-16
Commits: `b506b7e`, `728700a`, `b9eacc1`, `4a1fff5`
Status: **CODE COMPLETE + LIVE "BEFORE" PROVEN. NOT LIVE-VERIFIED AFTER — DEPLOY IS OWNER-BLOCKED.**

---

## THE DEFECT, OBSERVED (not reasoned)

Measured on https://wealthymindsetspro.com/charts during this shift, against the
deployed build (which does NOT contain any commit below):

| What | Value | Geometry |
|---|---|---|
| Masthead feed badge | `FEED UNKNOWN` | x=1804, y=30 |
| TSLA last print | `357.27` → `357.30` | x=461, y=176 |
| Chart canvases rendered | 9 | — |
| Canon fidelity label present elsewhere on page | `ACTIVE` | — |

The price **moved between two reads seconds apart**. So the tape was
demonstrably advancing, nine canvases were drawn, a canon label already read
ACTIVE — and 146 pixels above the price the OS said it did not know whether it
had a feed.

This is the "before" half of the proof. It is a measurement, not an inference.

---

## ROOT CAUSE — THREE LEVELS, TWO OF THEM TOO SHALLOW

`b506b7e` (closure precedence) and `728700a` (vocabulary import) were both
correct findings one level too shallow. The disagreement was never in the
grading — it was in the **argument list**.

1. **`b9eacc1` — the masthead owned a second fidelity LADDER.**
   `compileFeedStanding` re-derived fidelity instead of asking the single
   writer. Fixed by delegating to `priceSourceBadge`. The frame now keeps only
   what it alone holds: the freshness-budget join, the clock guard, the
   transport arm, and FEED UNKNOWN (not a canon reading, therefore not
   producible by a compiler of readings).

2. **`4a1fff5` — `/charts` still could not publish, and this is why.**
   `useWebSocket` has three paths that accept a price. Two leave a readable
   timestamp because they land in the signed tape. The third —
   `processUnsignedObservation`, the webull/longbridge path carrying the live
   equity price on `/charts` — is documented as one that intentionally never
   enters the tape, because it has no aggressor side. It validated an event
   `time`, used it to place the bar, and **discarded it**.

   So the single surface where the trader is most engaged was the one surface
   with nothing anywhere able to state when its price arrived.

   `MarketState.lastObservedAtMs` is now written at all three accept sites from
   the timestamp each already validated — never from `Date.now()`, because a
   poll clock measures our diligence, not the market's. Synthetic seed ticks are
   gated out. The ref resets on symbol change: carrying it forward would report
   AAPL's freshness over TSLA.

---

## THE ARCHITECTURAL DECISION INSIDE ATOM 2

`evaluatedAtMs` moved **off** `FeedObservation` and became the second argument
to `compileFeedStanding`.

Staleness is a fact about NOW, and a room does not know when the masthead will
next be painted. Two concrete failures forced this:

- `useSessionClockDate` re-evaluates only at midnight. Pinned at mount it would
  place every later print in the future and report a false clock disagreement on
  a perfectly healthy feed.
- `usePublishOsStanding` re-fires on `JSON.stringify(standing)`. A ticking clock
  inside the payload would republish the whole standing every tick, per open
  room.

Rooms report what the market DID; the frame supplies when it is being read.
The frame's clock is `useFeedEvaluationClock` — 15s, deliberately shorter than
the 90s staleness budget so a feed cannot sit visibly dead for more than one
tick before the badge says so. It returns `0` before mount, which is safe rather
than flattering: a real observation is stamped after the epoch, so a `0` clock
yields a negative age and the compiler reads that as unestablished.

---

## A WIRE DELIBERATELY **NOT** PROPAGATED

Two other rooms publish a standing with no `feed`:
`src/app/nectar/[symbol]/page.tsx:125` and `src/app/command-deck/page.tsx:424`.

The obvious next move was to wire both. **For `/nectar/[symbol]` that would have
been wrong**, and the live measurement proves it rather than arguing it.

Hard load of https://wealthymindsetspro.com/nectar/TSLA:

- surface: `VAULT · TSLA`
- canvases: **0**
- prices rendered: **0**
- transport: none — the room runs no socket

The Vault holds `slot.lastTradeAtMs` and `tapeSource` from browser-local memory,
so it *could* have been handed to the compiler. With `connected: null` rounding
up and a stored timestamp hours old, `priceSourceBadge` would have returned
**STALE PIPELINE** — an alarm about a pipeline that is not stalled because it is
not running. That is not a fix; it is a new lie in the opposite direction.

**FEED UNKNOWN on a memory room is the honest reading.** Recorded here so the
next hand does not "complete" the propagation and regress it.

Surfaced, not rushed: the OS has no vocabulary distinguishing *"carries a feed,
ungradeable"* from *"carries no feed"*. FEED UNKNOWN currently does double duty.
That is a real gap and a candidate atom — it is **not** a defect in either
commit above.

---

## GATES

- `./node_modules/.bin/vitest run` — **650 files / 7788 tests pass**, unpiped.
- `./node_modules/.bin/tsc --noEmit` — **clean**, unpiped.
- **Positive control:** the `feed:` block in `ChartsDashboard.tsx` was renamed to
  neutralise it; `the primary trading surface actually publishes a feed
  observation` failed **by name**, as did its own control. Reverted with an
  Edit, not a checkout — the tree held uncommitted work across six files.
- 13 new tests lock the wire, **each carrying its own positive control**. A
  structural test that cannot fail is documentation wearing a test's clothes.

### One gate caught a real thing

Two pre-existing source-scan tests
(`longbridgeObservedConsumption`, `webullUnknownSideConsumption`) assert the
unsigned block contains no `recentTicks`. A new **comment** of mine used the
word. The test was right and was not weakened — the comment was reworded. The
guarantee still holds at full strength.

---

## BLOCKER — HONEST, UNCHANGED, OWNER-ONLY

**Production does not track main.** `f7edaef`, `441ac90`, `24adde1`, `eda4c10`,
`b506b7e`, `728700a`, `b9eacc1`, `4a1fff5` are pushed and **not live**.

`npm run deploy:cf` fails:
> In a non-interactive environment, it's necessary to set a `CLOUDFLARE_API_TOKEN`
> environment variable for wrangler to work.

That credential is the Founder's to supply. It was not sought, inspected, or
worked around. **No claim of PROVEN-fixed is made in this baton** — the fix is
proven correct against a measured live defect, and unproven in production.

The moment deploy is unblocked, the after-proof is one measurement:
`/charts` masthead at x≈1804,y≈30 must read a canon fidelity label instead of
FEED UNKNOWN, while a price renders below it.

---

## OTHER LANES — STILL BLOCKED, NOT PROGRESSED

| Gate | State |
|---|---|
| Delta Bubbles level ownership | No per-trade tape on free tier |
| Live VP render geometry proof | Same |
| Decision Memory sealing | Zero production callers — architectural, surfaced not rush-wired |
| `executionConnectivity` orphaned | Not a live defect; `/readiness` discloses honestly |
| Paper execution state machine realism | Open |
| Gate 4 responsive device proof | Programmatic resize does not take effect; `outerWidth` pinned |
| `/journal` detail canvas | 0 journal entries |
