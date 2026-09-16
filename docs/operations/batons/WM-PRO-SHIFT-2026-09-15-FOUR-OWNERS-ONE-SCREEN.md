# WM PRO — BATON 2026-09-15-C · FOUR OWNERS, ONE SCREEN

`ecc29e0` → `fa58a7d` (4 commits). Every one of them is ASSEMBLY, not a new
screen. The Founder's standing instruction — *"STOP BUILDING SEPERATE SCREENS
PUT MY OS TOGETHER PROPERLY, AND WE STILL DONT SEE THE NEW CHART SCREENS AND
INVENTIONS"* — is the rubric this block was measured against, so each atom had
to satisfy one of two tests: **either** two owners were contradicting each other
on one screen and now do not, **or** something already built became visible.

---

## THE THREAD THAT RUNS THROUGH ALL FOUR

Each defect is the same mistake wearing a different costume: **a surface
answered a question it was not the owner of.**

| atom | who answered | what they were not the owner of |
|---|---|---|
| vv | the day-change badge | the canonical REGIME dimension |
| ww | a 6px coloured dot | the six-state canon health vocabulary |
| xx | `at.getDay()` | the MARKET's weekday |
| yy | a second summary pill | an accessible name already taken |

None of them was a crash. All four were surfaces that were *confidently wrong*,
which is the only failure mode this product cannot afford.

---

## vv · A DAY-CHANGE PERCENT IS NOT A MARKET REGIME — `ecc29e0`

`/charts` rendered, **on one screen, at one moment**:

- a badge reading `REGIME · BEAR`, computed from a day-change percentage
- an evidence rail reading `Unresolved: direction, location, aggression,
  regime… (0/8 dimensions resolved)` and `NEXT · Resolve regime`

The chip was *impersonating* the canonical dimension. A trader reading top-down
sees the answer; reading bottom-up sees the system say it has not got one.

`selectRegimeBadge` now publishes its own verdict under `DAY_BIAS_LABEL =
"DAY BIAS"` and carries the canonical dimension through separately as a
required `canonRegime`. `selectCanonRegimeView` rejects PARTIAL and rejects
RESOLVED-but-valueless.

**LIVE OBSERVED** on `https://wealthymindsetspro.com/charts`, TSLA, in the
Founder's own Chrome:

```
DAY BIAS  BEAR | -2.62% today | REGIME  UNRESOLVED
```

…with the evidence rail on the same screen still reading `0/8 dimensions
resolved`. The contradiction is gone because the chip now quotes canon's "not
yet" instead of answering for it. **This is the pixel receipt for this block.**

## ww · A COLOUR IS NOT A STATE NAME — `a793d0c`

`PerCapabilityFidelityGrid` (on `/command-deck`) computed the full canon
seven-question report for every evaluated capability row and then **threw the
answer away** to paint one boolean across two colours:

```
background: isNormal ? "#00E88A" : "#F5A623"
```

SIX canon states. Five of them — DEGRADED, BLOCKED, UNAVAILABLE, RECOVERING,
UNKNOWN — rendered the identical orange, with the state name reachable only
through a `title` tooltip a touch device never shows.

That is not cosmetic. Two of those states instruct **opposite** behaviour, and
both reach `/command-deck` from real labels:

```
BLOCKED_BY_ENTITLEMENT -> BLOCKED    -> "upgrade the entitlement"  (ACT)
STALE_PIPELINE         -> RECOVERING -> "wait for the pipeline"    (DO NOT ACT)
```

The mount shipped in `ecc29e0`; `a793d0c` is the lock, and it is legitimate as
a standalone commit **only** because it closes a gap opened by the immediately
preceding commit — a render test had to be deleted because
`@testing-library/react` is not installed here. The Sentinel does not merely
assert the argument, it **executes** it: if those two `nextSafeAction` fields
ever converge, the test says so out loud rather than quietly passing.

## xx · A MARKET'S CALENDAR IS NOT THE VIEWER'S CALENDAR — `fb3133e`

`provenSessionClosure` promises in its own docblock that it *"can retire a false
ACTIVE claim and can never manufacture one."* It kept that promise for ACTIVE.
It broke it for CLOSED, because a **one-sided promise was implemented with a
two-sided clock**:

```
const day = at.getDay();   // the VIEWER's weekday
```

Every rule it feeds is a statement about the MARKET's weekday.

```
Friday 19:00 New York = Saturday 01:00 Berlin = Saturday 08:00 Tokyo
```

TSLA post-market runs to 20:00 ET, so at that instant the session is OPEN. A
viewer in Europe or Asia was told PROVEN CLOSED: the badge read `SESSION CLOSED
— LAST VERIFIED` while the tape was still printing.

The mirror case is worse because it is **silent**. 03:00Z Sunday is Saturday
23:00 ET. For an EQUITY the old code landed on the Sunday rule and got the right
answer *for the wrong reason*. For FUTURES the Sunday rule deliberately does not
apply — futures reopen Sunday evening — so the old code returned `null` and the
badge went quiet about a market that was provably shut.

Fixed with one shared, exported, DST-aware `marketWeekdayET(at)`. **Exported on
purpose**: a second hand-rolled ET conversion beside it would recreate exactly
the two-owners split that hid this. On an unreadable instant it returns `null`,
never a local-time fallback — "graceful degradation" there is just the defect
under a kinder name, and every caller treats a number as PROOF.

Strictly **more conservative AND more correct**: stops claiming closure during
Friday's real post-market, starts claiming it Saturday evening ET.

## yy · TWO CHIPS UNDER ONE NAME — `fa58a7d`

`ChartsDashboard` rendered its canvas verdict **twice on one branch and once on
the other**:

```
desktop  (!narrowViewport && !optionsOpen) -> spine RAIL, handed `canvasSummary`
                                              = <CanvasSummaryPill/>
phone /  (narrowViewport || optionsOpen)   -> spine BAND, handed the SAME pill
options                                    -> PLUS a second <CanvasSummaryPill/>
                                              in the breadcrumb, IDENTICAL aria
```

Two `role="status"` regions, one accessible name, one fact. A screen reader
announced the canvas twice; a sighted phone user got the **widest chip in the
app in the narrowest row in the app**.

Fixed by mounting `CanvasBadgeMini` — verdict-only, distinct name, written for
exactly this surface in `8030f0a` and a BORN ORPHAN ever since. The full pill
keeps sole ownership of the counts, in the band, where there is room to read
them. Its silence rule is strictly the stricter of the two, so it cannot put a
verdict on a screen the pill would have left quiet.

**This atom is the direct answer to *"WE STILL DONT SEE THE NEW … INVENTIONS"*:
a built, tested, never-mounted primitive was given the surface it was designed
for — and the orphan ledger entry was REMOVED, because that list is a
BIDIRECTIONAL CEILING, not a place to park an excuse.**

---

## WHY THE PHONE DEFECT SURVIVED — the general lesson

The duplicate pill existed **only** on the branch a desktop review never
renders. The phone is the primary device by standing mandate and was the one
configuration nobody was looking at. That is not a coincidence. It is the
mechanism.

Same shape in `xx`: in New York the two calendars agree, and in CI they are both
UTC, where Friday 23:00Z is still Friday. **There is no process timezone in
which a `getDay()` implementation passes every assertion in the new test file** —
each case pins the answer for a UTC INSTANT, a property of the market and the
moment and of nothing else.

**A defect that is only reachable in a configuration you never review is not a
rare defect. It is a permanent one.**

---

## §22 REVIVAL LEDGER — all VALID (revived form COMPILED, tsc exit 0)

Per §22 a revival that does not compile proves nothing; all four below did.
Restoration via Edit only, and each restore verified.

| atom | revived defect | locks that failed BY NAME |
|---|---|---|
| vv | the REGIME literal | 2 |
| ww | the hand-rolled `isNormal` dot | 3 |
| xx | `const day = at.getDay();` | 3 — **only under `TZ=Europe/Berlin`** |
| yy | the duplicate `<CanvasSummaryPill/>` | 3 |

`xx` is the one worth remembering: on this ET machine a plain local run
**passes with the bug restored**. The revival only produces evidence under a
non-ET process timezone. Had the revival been run the lazy way it would have
reported "no failures" and the fix would have looked unnecessary. **A revival
run in the configuration that hid the bug proves nothing.**

`xx` restored → 9/9 under Berlin. `ww` restored byte-identical, `git diff` on the
component empty. `yy` restored, full suite green.

---

## GATES

| | |
|---|---|
| `tsc --noEmit` | exit **0** |
| `vitest run` | exit **0** — **634 files, 7512 tests** |
| pushed | `main` @ `fa58a7d` |

Growth across the block: 631 files / 7491 tests → 634 / 7512.

---

## WHAT THIS BLOCK DELIBERATELY DID NOT DO

- **No new screens.** Four commits, zero new routes. Directly per the Founder
  ruling that rejected the previous approach.
- **Did not wire Decision Memory sealing.** Zero production callers is an
  ARCHITECTURAL fact, not a loose wire. It needs a decision surface first;
  wiring it to close a gate would be fabrication.
- **Did not mount `TruthStatusChip`.** Nothing in the repo computes a
  `TruthStatusKey`. Mounting it would invent the data it displays. It stays an
  orphan, honestly.
- **Did not claim the `ACTIVE DEGRADED` header badge was a lie.** It was
  suspected, traced, and the hypothesis was **REJECTED on the evidence**:
  `priceSourceBadge`'s closed-session guard is correct, MainChart does forward
  `sessionOpen`, and TSLA post-market runs to 20:00 ET, so `ACTIVE` was
  defensible at the observed instant. The real, provable defect in that same
  function turned out to be `xx`. Recorded here so nobody re-opens it without
  new evidence.

---

## NEXT — carried, with honest status

- `MainChart.tsx:338` holds a private `etClock`, now a **second owner of market
  time** beside `marketWeekdayET`. It is correct today (it does use Intl in
  America/New_York), so this is DEBT, not a defect — but it is the exact shape
  that produced `xx`. Its `wdMap[wd] ?? 1` fallback silently answers "Monday"
  for an unreadable weekday; `marketWeekdayET` answers `null` on purpose.
- `chartMarketStatePublisher.ts:78` passes `undefined` for `sessionOpen`.
  Documented in place, but structurally THE ARGUMENT THAT WAS NEVER PASSED.
- Remaining honestly-mountable born orphans, **producer-first**:
  `ExecutionReceiptCard`, `ConnectedStoryRibbon`, `TimeframeSelector`,
  `HeroNumber`.

### Still blocked — unchanged, not re-litigated

Live VP panel mount (RETIRED by Founder spec `89a350e` — do not "fix" by
mounting); Decision Memory sealing (architectural); `executionConnectivity`
(orphaned, `/readiness` discloses it honestly, not a live defect); Gate 4
responsive device proof (programmatic window resize does not take effect,
`outerWidth` pinned; **the script route was classifier-denied and must not be
retried**); `/journal` detail canvas and `/proof-lane` (0 entries); Delta
Bubbles / Live VP raster (no per-trade tape on the free tier); `/paper` blotter
(0 orders).
