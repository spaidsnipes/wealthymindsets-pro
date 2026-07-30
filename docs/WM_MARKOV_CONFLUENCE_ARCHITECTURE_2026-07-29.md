# WM PRO — MARKOV ENGINE + CONFLUENCE METER ARCHITECTURE

**Author:** Forge · **Date:** 2026-07-29 · **Base:** `9ced461` · **Status:** DESIGN — architecture and tests before implementation
**Feeds:** `WM-STATE-P0-01` (Markov) and the Confluence Meter upgrade
**Evidence:** `docs/research/COMPETITOR_STUDY_LIVE_2026-07-29.md` (observed, read-only, from the Founder's own screen)

---

## 1. Independent verification of the blueprint — VERIFIED

Before designing against the observed panel I re-derived its arithmetic. If the numbers had not
reconciled, the reading would have been wrong and the design built on sand.

Observed matrix (row = current state, column = P(next)):

|        | → BULL | → BEAR | → SIDE |
|--------|--------|--------|--------|
| BULL   | 74%    | 13%    | 13%    |
| BEAR   | 10%    | 90%    | 0%     |
| SIDE   | 12%    | 1%     | 87%    |

- **Row sums:** all exactly 1.0 — it is a valid stochastic matrix.
- **Steady state**, computed as the left eigenvector for λ=1: **29.4% / 41.2% / 29.4%**.
  Panel prints **29 / 42 / 29**. Consistent within the rounding of a whole-percent display.
- **EDGE**, computed as P(→BULL) − P(→BEAR) on the current row: 12% − 1% = **+11%**.
  Panel prints **+11%**. Exact.

**Conclusion: the model reading is confirmed.** Steps 2–5 (count → normalize → solve → edge)
invent nothing.

**What is NOT confirmed:** the exact bar-classification thresholds. The 41.2-vs-42 gap is
explained by display rounding, but it is equally consistent with a slightly different underlying
matrix. So this verifies the *structure*, not the *parameters*. Step 1 remains the one genuine
design decision, and it must be chosen on our own evidence — not guessed to make our output match
a screenshot. Fitting thresholds until our numbers match TSLA's panel would be curve-fitting to a
single observation of a single symbol on a single day.

---

## 2. Markov engine specification

Module: `src/lib/markov.ts`. Pure, deterministic, no I/O, no clock.

```ts
export type MarkovState = "BULL" | "BEAR" | "SIDE";

export interface MarkovClassifierConfig {
  /** Bar return magnitude below which a bar is SIDE, in decimal (0.005 = 0.5%). */
  sideThreshold: number;
  /** Config identity, embedded in every result. Changing thresholds changes this. */
  version: string;
}

export interface MarkovResult {
  status: "ready" | "insufficient-evidence";
  currentState?: MarkovState;
  /** transitions[from][to] — raw observed counts, not percentages. */
  transitionCounts?: Record<MarkovState, Record<MarkovState, number>>;
  transitionMatrix?: Record<MarkovState, Record<MarkovState, number>>;
  steadyState?: Record<MarkovState, number>;
  /** P(→BULL) − P(→BEAR) from the CURRENT state's row. */
  edge?: number;
  direction?: "LONG" | "SHORT" | "NEUTRAL";
  /** Total transitions observed, and the count for the current row specifically. */
  sampleSize: number;
  currentRowSample?: number;
  confidence?: number;
  configVersion: string;
}
```

### Step 1 — bar classification (the only design decision)

```
r = (close - open) / open
r >  +sideThreshold  -> BULL
r <  -sideThreshold  -> BEAR
otherwise            -> SIDE
```

`sideThreshold` is **timeframe-scoped**, not a single global number. A 0.5% move is a large 1m bar
and a trivial 1W bar. Initial values must be derived from the observed return distribution per
timeframe (a sensible default: the threshold that places roughly a third of historical bars in
SIDE), then recorded — never hand-tuned to match a competitor's output.

**Until those per-timeframe values are derived from our own data, the engine ships behind a flag
and renders `unavailable`.** An unvalidated threshold silently changes every downstream number,
including the Confluence Meter.

### Steps 2–5 — fully deterministic

2. **Count.** Walk classified bars pairwise; increment `transitionCounts[prev][next]`.
3. **Normalize.** Each row ÷ its own total. A row with zero observations is **not** normalized to
   uniform — it is marked unobserved. Uniform would assert 33/33/33 as a measurement.
4. **Steady state.** Solve πP = π, normalized to sum 1. Use the eigenvector method with a power-
   iteration fallback; assert convergence rather than returning a partial result.
5. **Edge & direction.** `edge = P(cur→BULL) − P(cur→BEAR)`; `direction = LONG | SHORT | NEUTRAL`
   by sign against a deadband.

### The honesty gate — non-negotiable

```
MIN_TRANSITIONS_TOTAL    = 100   // whole matrix
MIN_TRANSITIONS_CURRENT  = 30    // the row the edge is read from
```

Below either bound the result is `status: "insufficient-evidence"` and the UI renders
**"unavailable"** — never a percentage. Rationale: a 12% transition probability from 8
observations is one bar away from 0%. Publishing it as a number is the Wyckoff fabrication with
extra arithmetic.

`sampleSize` and `currentRowSample` are **always** returned, including on the ready path, so the
UI can surface *how much evidence* backs the number rather than only whether it cleared a bar.

**Confidence** is derived from sample size, not asserted:
`confidence = min(1, sqrt(currentRowSample / MIN_TRANSITIONS_CURRENT) / 2)` — capped, monotonic,
and explicitly a *precision* proxy, not a probability of being correct.

---

## 3. Deterministic test design

The whole point of steps 2–5 is that they are checkable by hand.

**Fixture tests (exact, hand-computable):**
- `[BULL, BULL, BEAR]` → `counts[BULL][BULL]=1`, `counts[BULL][BEAR]=1`, everything else 0.
- Known 3×3 count matrix → assert every normalized row sums to exactly 1.
- **Golden case:** feed counts that produce the observed matrix above; assert steady state is
  29.4 / 41.2 / 29.4 (±0.1) and edge is +11%. This pins our implementation to an independently
  verified reference.

**Determinism (the 56→60 bug class):**
- Same bars in, same result out, across 100 runs — deep equality on the whole object.
- Same bars + one *unavailable* neighbouring component ⇒ the Markov result is **byte-identical**.
  A component's availability must never move another component's number.

**Honesty gate:**
- 99 transitions → `insufficient-evidence`, no `edge` field present at all (absent, not null —
  make it unrepresentable rather than falsy).
- Current row with 29 observations but 500 total → still `insufficient-evidence`.
- A row with zero observations is reported unobserved, never uniform.

**Numerical:**
- Absorbing state (BEAR→BEAR = 1.0) converges and does not divide by zero.
- Steady state agrees with power iteration to 1e-9.

---

## 4. Confluence Meter — upgrade in place

**Founder-locked:** it is the existing Smart Money score, upgraded. **Do not build a second gauge.**
Placement: top of the Smart Money panel behind the branded W button; large 0–100, colour-coded,
plain-English status; adjustable weights beneath; existing tools below. Optional "Pin to Chart
Header", default off.

### The bug being fixed

Observed live: the score moved **56 → 60 while its available inputs changed**, with the panel
itself describing it as "estimated from price" and most contributors unavailable. The score moved
because *availability* changed — undisclosed. That is the defect, not the styling.

### Second observed reference — TradingView "Master Strategy" panel, 2026-07-29 20:19 CDT

A richer Confluence-equivalent panel was captured live from the Founder's TradingView, TSLA 15m.
The values below are what the Founder is already reading and trusting — not the earlier
hand-wavy list I drafted from memory:

```
BEARISH                                     <- color-coded top banner
Volume:         Way Below Avg
Win Rate:       52% (333 trades)            <- backtested; sample size DISCLOSED
Avg Hold Time:  1h 32m
Regime:         Trending
Confidence:     63%                         <- its own component, NOT derived from score
Range:          --                          <- honest field-level unavailable
Target:         292.37 (-4.27 pts / -3 ATR) <- price + delta in pts + delta in ATR
Participation:  12% (Low)                   <- number PLUS plain-English qualifier
Avg Move:       2.92 (last 333)             <- historical avg over same sample as win rate
```

Consequences captured in the component set below:
1. **Field-level "--"** for unavailable is the pattern the Founder already trusts. Adopt it,
   don't hide the whole panel.
2. **Sample size disclosed inline** ("333 trades"). Same pattern as Markov's `sampleSize`.
3. **Plain-English qualifier** ("Low") alongside the number reduces spurious over-reading.
4. **Regime is separate from Markov state.** The reference panel treats them as different
   things; so do we.

### Component contract

Every input implements the same shape, so no component can be special-cased into lying:

```ts
interface ConfluenceComponent {
  id: ComponentId;
  status: "ready" | "unavailable" | "insufficient-evidence";
  score?: number;                    // 0..100, bullish-positive, ONLY when ready
  confidence: number;                // 0..1, derived from sample size — never asserted
  evidence: {
    sampleSize?: number;             // e.g. 333 trades, or 100 transitions
    calculatedFor: { symbol: string; timeframe: TFId };
  };
  /** Optional plain-English qualifier for UI ("Low", "Way Below Avg"). */
  qualifier?: string;
  /** Optional field-level unavailable reason ("Range: --" pattern). */
  displayFallback?: "--";
}
```

**Markov is the reference implementation** — it already returns availability, sample size and a
derived confidence, so it defines the bar every other component must meet.

### Component set — expanded from the live reference

Grouped by MBO dependency. **The MBO group is unavailable on free data and MUST NOT contribute
a number to the meter** — see §5.

**Buildable on data we hold today (Confluence-eligible):**

| # | id | Source signal | Sample size | 0..100 mapping |
|---|---|---|---|---|
| 1 | `markov` | Transition matrix + edge (shipped, `e0a5ed7`) | `currentRowSample` | 50 + 50·edge |
| 2 | `regime` | Trending / Ranging / Break-out classifier (from ADX + range compression, deterministic) | Bar count in current regime | Confidence-weighted directional map |
| 3 | `winRate` | Backtested win-rate over N recent setups for this symbol+TFId | N trades (100/30 gate, same as Markov) | Raw percentage |
| 4 | `avgMove` | Historical average bar-return magnitude, expressed as ATR multiples | Same N as `winRate` | Distance from median mapped to 0..100 |
| 5 | `participation` | Volume vs its own N-bar rolling average | N bars | Percentile of current relative to distribution |
| 6 | `speedOfTape` | N-second window over Volume/Orders/Trades, std-dev normalized (DeepCharts pattern, reproducible) | N events | Normalization is intrinsically 0..100 |
| 7 | `vpLocation` | Position relative to session VP (inside VA / above VAH / below VAL) | Bars used to build the VP | Discrete distance-to-POC mapping |

**MBO-blocked on free data (`status: "unavailable"` structurally, non-negotiable):**

| # | id | Why blocked |
|---|---|---|
| 8 | `imbalanceQuality` | Requires order-book pressure ratio; L2 MBO feed only |
| 9 | `largeTradeDensity` | Requires trade-side identification beyond BBO; L2 MBO feed only |

**Reconciliation with my earlier draft:** `hurst`, `wyckoff` and `deltaStrength` from the
original seven are moved to a "future components" backlog. `hurst` is buildable but not yet
specified. `wyckoff` has no engine (see `WM-WYCK-P0-01`, closed as fabricated). `deltaStrength`
overlaps `speedOfTape` and is subsumed pending clarity from the Founder.

### Scoring — versioned and deterministic

```
available = components.filter(c => c.status === "ready")
effectiveWeight_i = userWeight_i * confidence_i
score = Σ(score_i * effectiveWeight_i) / Σ(effectiveWeight_i)     // re-normalized
```

Re-normalizing over **available** components only is what stops a dropout from silently reweighting
the result — but re-normalizing *silently* is exactly the 56→60 bug. So:

**Minimum-evidence threshold (the single most important requirement):**

```
MIN_COMPONENTS_READY    = 4     // of 7 Confluence-eligible (MBO-blocked don't count)
MIN_COVERAGE            = 0.5   // Σ effective weight of ready ÷ Σ of all eligible
```

Below either, the meter renders **"Insufficient data"** — **not a number**. A confluence score
synthesized from mostly-absent inputs is a more dangerous fabrication than the Wyckoff label,
because the Founder wants it to be the first thing users look at.

The denominator is **7 Confluence-eligible components**, not 9. MBO-blocked components are
structurally absent from the meter's arithmetic — they are never a numerator, never a
denominator, never a "silent zero." Treating them as "unavailable inputs to be recovered from
later" would be exactly the lie this design exists to prevent.

**Per-field disclosure applies to individual component rows too.** The reference panel renders
`Range: --` when the current regime has no defined range — not a hidden row, not a fabricated
number. Our panel does the same: any component in `unavailable` or `insufficient-evidence`
renders `--` (or its typed reason) in place of a percentage, with the sample-size annotation
visible even when the number is not.

**Determinism requirements:**
- `scoreVersion` embedded in every result; changing weights or thresholds bumps it.
- No clock, no RNG, no `Date.now()` inside scoring. Same inputs ⇒ same score, always.
- The result carries `componentsUsed` and `componentsExcluded` so any number can be reconstructed.
- **Availability changes must be disclosed in the UI**, not merely absorbed into the arithmetic.

### Status text — must reflect real state

Derived from score *and* coverage, never score alone. Every text combines direction with
sample-adequacy so the user cannot mistake "no evidence" for "neutral":
- `"Strong Bullish Alignment"` — score ≥75, coverage ≥0.8
- `"Mixed / Low Conviction"` — score 40–60
- `"Limited Evidence — 4 of 7 inputs"` — gate met but coverage low
- `"Insufficient data — 2 of 7 inputs available"` — below gate; **no number shown**

Matches the reference panel's plain-English qualifier pattern ("Way Below Avg", "Low") —
qualifier alongside number, never in place of one.

---

## 5. MBO line — do not cross

**Buildable from data we hold:** Markov (shipped, `e0a5ed7`), the six other Confluence-eligible
components in the §4 table, IVB/ORB (DeepCharts "Deep-M IVB" — opening-range
projection/protection/exit from historical sessions, no L2 required), swing-anchored volume
profiles, price+time aggregation, pattern builder.

**NOT buildable without a licensed L2 MBO feed:** iceberg detection, absorption, any
"institutional participation" claim. These are `imbalanceQuality` and `largeTradeDensity` in
the component table — they must report `unavailable` on free data rather than degrade to a
proxy. The DOM already states "NO FABRICATED DEPTH" in production; that must stay true, and
the meter must not launder an unavailable component into a number through a weight.

### The Big-Trades surrogate — visual only, NOT a Confluence component

DeepCharts' free-tier surface (Big Trades markers: Circle/Square/Diamond/Text, hollow fill,
opacity scaling, std-dev size scaling, min-threshold, automatic vs manual filter mode) is
buildable from prints we already receive on the aggressor-labelled tape. **It is a legitimate
chart visualization and Noah's Big-Trades ticket can honestly ship it.**

**It does NOT feed the Confluence Meter.** The chart shows *observed prints* and their visual
prominence. That is a display convention. It does not measure order-book pressure or
side-classified size — those require MBO. So:

- `largeTradeDensity` (component #9) stays `unavailable` on free data, full stop.
- `imbalanceQuality` (component #8) stays `unavailable` on free data, full stop.
- The Big-Trades chart layer is styling of a print stream, not a synthesized metric.
- The line between "we render what we see" (fine) and "we synthesize what we can't see" (not
  fine) is what this section exists to protect.

DeepCharts' own **Deep Trades** product — the institutional-reconstruction one — requires MBO
and we do not have it. Nothing in that lineage becomes a Confluence input.

### Speed of Tape — allowed, deterministic

DeepCharts' Speed-of-Tape indicator (N-second window over one of Volume / Orders / Trades,
std-dev-filtered, bull/bear rendering) analyses the *pace* of prints we already receive.
That is intrinsically bounded 0..100 by normalization against a rolling distribution, is
deterministic given the same input stream, and does not require MBO. It ships as `speedOfTape`
(component #6). WM's implementation must not adopt DeepCharts' name, code, imagery, or
proprietary terminology — the technique is claims-only reuse.

---

## 6. Sequencing

1. **Derive per-timeframe `sideThreshold`** from our own historical returns. Record the
   distribution. This is the gate — everything downstream inherits it.
2. ~~`src/lib/markov.ts` + fixture tests (§3), behind `NEXT_PUBLIC_MARKOV_ENGINE=v1`.~~
   **Shipped `e0a5ed7` — 78/78 tests, still gated by `sideThreshold: null` -> unavailable
   until step 1.**
3. Wire Markov into the chart HUD via the existing `ChartContext` (`c53e429`), so state
   carries `calculatedFor` and cannot render against the wrong symbol/timeframe.
4. Build the six other Confluence-eligible components (§4 table) one at a time. Each ships
   with the same discriminated-union honesty gate as Markov. `regime` first (it appears in
   the reference panel as its own line), then `winRate`/`avgMove` (share the same
   backtest-sample source), then `participation`, `vpLocation`, `speedOfTape`.
5. Confluence component contract + re-normalization + minimum-evidence threshold. Field-level
   `--` for unavailable rows.
6. Upgrade the existing Smart Money score in place. Weight controls last.

**Do not begin at step 5 or 6.** The meter is only as honest as its worst component. Today
Markov is the *only* component that can report its own availability; the other six must reach
that same bar first, or the 56 -> 60 drift comes back under different labels.

---

## 7. Open questions for the Founder

1. **`sideThreshold` derivation** — thirds-of-distribution, volatility-scaled (e.g. 0.5×ATR), or a
   fixed per-timeframe table? This changes every downstream number and is a §45-class decision.
2. **Default weights** across the seven Confluence-eligible components (§4 table).
3. **Minimum-evidence thresholds** — I propose 4-of-7 and 0.5 coverage; both are judgement calls
   that should be ratified, not assumed.
4. **Pin-to-Chart-Header** default — spec says default off (inside panel). Confirm.
5. **Regime classifier** — the reference panel shows "Trending" as a discrete label with its own
   confidence (63%). Do we adopt Trending / Ranging / Break-out as the WM regime set, and does
   that classifier live in `src/lib/marketState.ts` alongside Markov, or as its own module?
6. **`winRate` / `avgMove` sample source** — a live backtest engine per component request is
   expensive; a pre-computed daily snapshot may be adequate. Which?
7. **`hurst`, `deltaStrength` from earlier draft** — moved to backlog (see §4 reconciliation).
   Ratify or restore?
