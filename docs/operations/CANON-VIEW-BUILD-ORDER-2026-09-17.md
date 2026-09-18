# CANON VIEW BUILD ORDER — supersedes the §13 gate list for this lane

**Founder directive, 2026-09-17:** *"why arent the rest of the mockups in the
visuals cannon being built"* … *"this is what i should see in there proper
sections on the chart in there drop downs or wherever they belong"*.

Any agent picking up the ATHOS WM Pro shift reads THIS FILE FIRST. The standing
`/loop` prompt names only truth-gates (Delta Bubbles ownership, VP geometry,
Decision Memory callers, paper execution realism, responsive proof). Not one
canon asset is in that list, which is why 15 of 20 mockups were never built.
That was a scoping defect in the order, not a blocker in the code.

---

## THE HONEST STATUS (from WM-PRO-VISUAL-DEBT-REGISTER-2026-09-02.md)

| State | Assets |
|---|---|
| RUNTIME MATCH | 10 (Full OS Overview), 14 + 16 (Market Object Passport) |
| PARTIAL | 09 (Order Flow Cockpit, via OrderFlowCockpitStrip), 07 (Evidence Debt, via CanvasSummaryPill) |
| GENUINELY BLOCKED | 08 (Liquidity Weather Heatmap) — needs a licensed Level 2 depth provider. Building it now would be decoration and would violate LIVING-PIXEL LAW. |
| NOT BLOCKED, NOT PRIORITISED | 01, 03, 04, 05, 06, 11, 12, 13, 15, 17, 18, 19, 20 |

Only **one** asset is actually blocked. The rest were simply never asked for.

---

## WHERE THEY BELONG — ANSWERED, NOT GUESSED

`/charts` already has the correct doorway and it is nearly empty.

- **`src/lib/charts/categoryTabsFor.ts`** owns the VIEW dropdown. For `futures`,
  `crypto`, `forex` and `options` it returns exactly `["Chart", "Profile"]`.
- **`ChartsDashboard.tsx:1847`** renders it (`aria-label="Symbol view category"`),
  and the whole shell already switches on `activeTab`.
- The helper has an exhaustiveness guard, so adding a class is compile-checked.

Assets **03 / 05 / 06** are full-surface, three-column VIEWS in the mockups — not
drawer tiles. They are siblings of `Chart`, and they go in that dropdown.

They must be added to **every** asset class, not just equity: they are
microstructure views, and on a symbol whose feed carries no aggressor side they
render honestly empty rather than being hidden (hiding the view would make the
missing input invisible, which is the opposite of the banner's whole purpose).

The small `AbsorptionAnatomyPanel` that lives in the Smart Money drawer today is
a *summary* of Asset 06, not Asset 06. Both should exist; the drawer tile links
into the view.

---

## BUILD ORDER

### 1 · Asset 06 — Absorption Anatomy (START HERE)

Closest to shipping: **`selectAbsorptionAnatomy` already computes everything the
centre column needs** and is already consumed by `MainChart.tsx:6467`.

Mockup → existing owner:

| Mockup element | Real owner (already exists) |
|---|---|
| EFFORT (PRESSURE) vs PRICE DISPLACEMENT, layered over 20–30 bars | `AnatomyBar.effort / effortNorm / displacement / displacementNorm` |
| ABSORPTION ZONE band | `AbsorptionZone.priceLo / priceHi / startTime / endTime` |
| EFFICIENCY RATIO + the `>5.0 STRONG · 2.0–5.0 MODERATE · <2.0 WEAK` ladder | `AbsorptionZone.efficiencyRatio` + `strengthOfRatio()` — **the mockup's thresholds are already the code's thresholds** |
| BUYER / SELLER INITIATED VOLUME, % of total, Δ over window | `selectAbsorption` → `buyEffort / sellEffort / imbalance` |
| AGGRESSION DELTA (BID−ASK) + sparkline | `AnatomyBar.delta` per bar |
| HIGH EFFORT ✓ / WEAK DISPLACEMENT ✓ | the zone admission criteria — already computed |
| TIME EXTENSION ✓ | `AbsorptionZone.barCount >= minZoneBars` |
| IMBALANCE PERSISTENCE ✓ | sign persistence of `AnatomyBar.delta` across the zone — **null unless the tape is signed** |
| VOLUME SHELF ✓ | volume profile — already drawn on the chart |

**DO NOT FABRICATE the mockup's `CONVICTION 82%`.** There is no probability
model behind that number. Render conviction as the real `AbsorptionStrength`
(STRONG / MODERATE / WEAK) with the gauge filled from the efficiency ratio's
actual position on the real ladder. A derived mapping is defensible; an invented
percentage is the exact thing LIVING-PIXEL LAW forbids.

Same rule for every other literal in every mockup: `18,732`, `−2,552`, `7.42`,
`98.7th percentile`, `68.3% win rate` are **art direction, not data**.

### 2 · Asset 03 — Aggression vs Response Framework

The scatter of aggression (pressure) against response (displacement in ticks),
with the absorption-zone ellipse and the `0 → 1.0+` efficiency bar. Same two
selectors; the axes are `effortNorm` × `displacement`. The per-point data is
already there — this is a rendering, not a new computation.

### 3 · Asset 05 — Big Trade Intelligence View

Needs a large-print detector over the tape plus a session-relative size
percentile. Honest on any symbol with a real per-trade tape; renders the named
missing-input state where there is none. The left rail in the mockup
(INTELLIGENCE / MARKET PROFILE / ORDER FLOW / STRUCTURE MAP / HISTORICAL EDGE /
ALERTS) is a *navigation* invention — ship only the sections that have owners.

### Later
- 04 / 15 / 17 — Question-Driven canvases; compose `composeMarketCanvasVM`.
- 01 / 11 / 12 / 13 / 18 — progressive scaffolding; zero data dependencies.
- 19 / 20 — Liquidity Weather lifecycle; **gated behind the same depth provider as 08.**

---

## THE THREE FOUNDER ACCEPTANCE QUESTIONS

Every asset ships only when all three are answerable with a screenshot of the
real `/charts` surface beside the mockup:

1. Can we visually recognise the same invention?
2. Is it useful while candles remain visible?
3. Is it fed real / honest WM information?

---

## IN FLIGHT AT THE TIME OF WRITING

`StackedImbalancePanel.tsx` has an uncommitted, inert, half-finished edit: an
`absenceDeclaredAbove` prop and a `notCarried` guard were added, and the ladder
placeholder was gated, but the verdict gloss / detail / aggressor-disclosure
voices are not yet deferred and no call site passes the prop. Live on prod NQ1!
that panel prints four separate sentences about the absence the banner above it
already declared once — and the last of them calls "these levels" downstream of
a guess when there are no levels at all. Finish or revert deliberately; do not
leave it half-gated.
