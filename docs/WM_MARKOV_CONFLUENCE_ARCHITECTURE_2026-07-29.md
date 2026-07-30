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

### Component contract

Every input implements the same shape, so no component can be special-cased into lying:

```ts
interface ConfluenceComponent {
  id: "markov" | "hurst" | "wyckoff" | "vpLocation" | "deltaStrength"
    | "imbalanceQuality" | "largeTradeDensity";
  status: "ready" | "unavailable" | "insufficient-evidence";
  score?: number;       // 0..100, bullish-positive, ONLY when ready
  confidence: number;   // 0..1, derived from sample size — never asserted
  evidence: { sampleSize?: number; calculatedFor: { symbol: string; timeframe: TFId } };
}
```

**Markov is the reference implementation** — it already returns availability, sample size and a
derived confidence, so it defines the bar the other six must meet.

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
MIN_COMPONENTS_READY    = 4     // of 7
MIN_COVERAGE            = 0.5   // Σ effective weight of ready ÷ Σ of all
```

Below either, the meter renders **"Insufficient data"** — **not a number**. A confluence score
synthesized from mostly-absent inputs is a more dangerous fabrication than the Wyckoff label,
because the Founder wants it to be the first thing users look at.

**Determinism requirements:**
- `scoreVersion` embedded in every result; changing weights or thresholds bumps it.
- No clock, no RNG, no `Date.now()` inside scoring. Same inputs ⇒ same score, always.
- The result carries `componentsUsed` and `componentsExcluded` so any number can be reconstructed.
- **Availability changes must be disclosed in the UI**, not merely absorbed into the arithmetic.

### Status text — must reflect real state

Derived from score *and* coverage, never score alone:
`"Strong Bullish Alignment"` (≥75, coverage ≥0.8) · `"Mixed / Low Conviction"` (40–60) ·
`"Limited Evidence — 4 of 7 inputs"` (threshold met but coverage low) ·
`"Insufficient data — 2 of 7 inputs available"` (below threshold; **no number shown**).

---

## 5. MBO line — do not cross

**Buildable from data we hold:** Markov, IVB/ORB (DeepCharts "Deep-M IVB" — opening-range
projection/protection/exit from historical sessions, no L2 required), swing-anchored volume
profiles, price+time aggregation, pattern builder.

**NOT buildable without a licensed L2 MBO feed:** iceberg detection, absorption, any "institutional
participation" claim. These are Confluence *components* — so `largeTradeDensity` and
`imbalanceQuality` must report `unavailable` on free data rather than degrade to a proxy. The DOM
already states "NO FABRICATED DEPTH" in production; that must stay true, and the meter must not
launder an unavailable component into a number through a weight.

---

## 6. Sequencing

1. **Derive per-timeframe `sideThreshold`** from our own historical returns. Record the
   distribution. This is the gate — everything downstream inherits it.
2. `src/lib/markov.ts` + fixture tests (§3), behind `NEXT_PUBLIC_MARKOV_ENGINE=v1`.
3. Wire into the chart HUD via the existing `ChartContext` (`c53e429`), so state carries
   `calculatedFor` and cannot render against the wrong symbol/timeframe.
4. Confluence component contract + re-normalization + minimum-evidence threshold.
5. Upgrade the existing Smart Money score in place. Weight controls last.

**Do not begin at step 5.** The meter is only as honest as its worst component, and today most
components cannot report their own availability.

---

## 7. Open questions for the Founder

1. **`sideThreshold` derivation** — thirds-of-distribution, volatility-scaled (e.g. 0.5×ATR), or a
   fixed per-timeframe table? This changes every downstream number and is a §45-class decision.
2. **Default weights** across the seven components.
3. **Minimum-evidence thresholds** — I propose 4-of-7 and 0.5 coverage; both are judgement calls
   that should be ratified, not assumed.
4. **Pin-to-Chart-Header** default — spec says default off (inside panel). Confirm.
