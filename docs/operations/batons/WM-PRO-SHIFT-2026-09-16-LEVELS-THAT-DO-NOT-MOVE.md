# WM Pro — shift baton, 2026-09-16

## LEVELS THAT DO NOT MOVE

Three defects closed in this block. All three are the same shape: a number
printed with more authority than the thing that produced it had earned.

---

## 1. σ was rounded like a price — `7e2b4ae`

`selectValueCandle` computed the window's volume-weighted spread and then
rounded it the way a PRICE is rounded, to a fixed number of decimals.

σ is not a price. It is a WIDTH. At small tick sizes fixed-decimal rounding
collapsed genuinely different spreads onto the same number — on a 2-decimal
instrument every σ below half a cent became `0.00` — and **five downstream
selectors quote their findings in units of σ**. A denominator that rounds to
zero does not fail loudly; it makes every distance expressed in it meaningless
while still looking like a number.

**Third recurrence of this bug class** (fixed-decimal rounding applied to a
quantity that is not a level). Found by a scale-invariance test written in a
*different* module: the same tape scaled by 100 must produce the same σ in
scaled units. It did not.

One subtlety worth carrying forward: the old rounding had also been erasing
float noise **by accident**. Removing it alone would have started printing
`1e-17` spreads. It was replaced with a deliberate noise floor tied to the
observed grid — which does that job on purpose, and says so in the code.

## 2. Stacked imbalance — a claim about a level, drawn above its test — `7e2b4ae`

First module in this column that names specific PRICES rather than
summarising a window, and therefore the first that owes a visible test of its
own claim.

- `selectStackedImbalance` — pure selector, 60/40 formation/response split,
  five honest verdicts including `UNMEASURED` and `NO_STACK`.
- `StackedImbalancePanel` — draws the stack as a band and the response as a
  mark against it, so `DEFENDED` / `BROKEN` / `UNTESTED` is a **picture the
  reader can disagree with** before it is a word. The printed 60/40 split, the
  measured tick grid, and an unconditional aggressor-provenance disclosure
  live in the panel body, not in a tooltip.
- Wired into `SmartMoneyPanel` behind the same `realTape` gate as its
  neighbours — load-bearing here, since the entire verdict is built out of who
  paid.

**Two render defects were caught by LOOKING at the output, not by testing it:**

- The response axis **clamped** instead of containing its own data, so a 2σ
  break and a 20σ break pinned to the same pixel — the picture stopped
  distinguishing the two cases it exists to distinguish. The axis now stretches
  to contain the response, which correctly shrinks the band: a big break makes
  the level it broke look small.
- The `UNTESTED` marker landed at exactly 100% *by construction*, rendering
  flush against the track edge where it read as a border — precisely the "no
  data" misreading that marker exists to prevent.

## 3. Delta bubbles — level ownership — `dd3b688`

The bubbles cut the observed range into six equal parts and labelled each with
the arithmetic midpoint. On a penny grid that is **a price no order could rest
at**, printed where a trader reads a level. The code carried a comment
promising *"we never invent levels"* directly above the arithmetic that
invented them.

Second defect from the same line: bucket width was a function of the window's
extremes, so one new high rescaled every bucket and sent every bubble to a new
price. **A level that drifts on an unrelated print is not a level.**

The fix was ownership, not a better bucket count. This codebase already has
exactly one place that decides what a level is on a given tape —
`observeTickSize`, which MEASURES the grid off the prints instead of assuming
it from the symbol. The bubbles now read it, so the two panels in that column
can no longer disagree about where a level is.

`selectDeltaLevels` (new, 15 tests) groups a whole number of ticks per bubble,
labelled at the group's low edge — always a real price on the measured grid.

**The test caught a residual defect in the first version of the fix.** That
version anchored the partition at the window's low: boundaries were on the
grid, but *which ticks shared a bubble* still depended on the lowest print, so
a new low re-partitioned levels that had not traded. Anchoring at grid index
zero makes a level's identity a property of the PRICE.

That anchoring costs at most one extra bubble, because the window's low can sit
mid-group. The bound is stated in the module and **swept across 400 window
widths** in the suite. One bounded extra bubble is the correct price for levels
that do not move.

---

## Gates

| Gate | Result |
|---|---|
| `vitest run` (unpiped) | **678 files, 8282 tests, PASS** |
| `tsc --noEmit --skipLibCheck` (unpiped) | **PASS** |
| `screenReach` Sentinel | **PASS** — new panel is reachable from a real surface |

## Standing of this work — READ THIS BEFORE CLAIMING ANYTHING

**CORRECTION — an earlier draft of this baton said "NOT LIVE". That was wrong,
and it was wrong because it was assumed rather than checked.**

**LIVE.** `GET https://wealthymindsetspro.com/api/build-identity` returns
`shortSha: "fdf381e"`, `builtAt: "2026-09-17T02:00:26Z"` — the head of this
block. Push to `main` deploys; there is no deploy workflow in
`.github/workflows/` (only `sentinels.yml`), so the trigger is a Cloudflare
Workers Git integration, not `npm run deploy:cf`.

**AND YET NOTHING CHANGED ON SCREEN.** Observed in the Founder's Chrome at
`/charts`, TSLA, drawer open: the Smart Money rail prints **TAPE UNAVAILABLE —
"No aggressor-tagged tape is available for TSLA. Directional order-flow claims
are suppressed."** `StackedImbalancePanel` is live and renders `UNMEASURED /
not enough sided tape to build a ladder`. The delta-bubble strip does not
render at all.

So all three atoms in this block shipped into a lane that is **invisible
whenever the aggressor tape is absent**, which on the Yahoo stock feed is
always. The code is correct, deployed, and shows the Founder nothing. That is
a planning defect in the shift, not a defect in the code, and it is recorded
here so the next shift does not repeat it: **check that a lane can be SEEN
before spending a block in it.**

The `StackedImbalancePanel` geometry above was proven by SSR + per-section
screenshot at `deviceScaleFactor: 3`, rendered locally and inspected. Probe
files were deleted after use (vitest excludes `scratchpad/**`, so probe tests
must live in `src/` and then be removed).

## Method note

Two of the three defects in this block were found by **looking at a rendered
picture**, and one by a **scale-invariance test in a neighbouring module**.
None was found by reading the code that contained it. Both techniques are
cheap and should stay in the rotation.

## Still open (§13)

- Live VP render geometry proof
- Decision Memory sealing has **zero production callers** — architectural;
  surface it, do not rush-wire it
- `executionConnectivity` orphaned — not a live defect, `/readiness` discloses
  it honestly
- Paper execution state-machine realism
- Gate 4 responsive device proof — **BLOCKED**: programmatic window resize does
  not take effect, `outerWidth` pinned
- `/journal` detail canvas — **BLOCKED**: 0 journal entries
