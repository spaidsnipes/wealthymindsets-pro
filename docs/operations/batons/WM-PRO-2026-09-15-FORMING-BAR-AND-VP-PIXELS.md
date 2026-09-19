<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **shift baton** — a hand-off written at the end of one shift. Its filename names its own day. It was true
> on that day and is preserved as evidence of what was observed and decided
> then. Do not take a current action, diagnosis, release decision or task claim
> from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference below is a `GHOST_HOST` signal: the
> Vercel host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-19 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which
> until that day scanned only the top level of `docs/operations` and could not
> see this directory at all. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

# WM Pro — the forming bar stops claiming a close, and the VP gate finally gets its pixels

2026-09-15. Three commits: `5f14d88`, `9e1f352`, `2f5ddd7`.
All three verified on `https://wealthymindsetspro.com`, not inferred from a
deploy identity.

---

## 1. The defect, as measured

One viewport on `/charts`, NQ1! 1h:

```
chart header :  O 29403.00  H 29403.00  L 29403.00  C 29403.00  V 0
                (countdown 0:05:04 to bar close)
MARKET tile  :  NQ1! · 1h · 29405 LAST 1h BAR CLOSE
```

Two owners, one screen, two different numbers, and both wearing the word
"close". Only one was telling the truth. The tile named the newest bar that had
provably ended. The header named the bar currently FORMING — zero range, zero
volume, five minutes still on its countdown — and called its running value `C`.

`C` is not a neutral abbreviation on a trading surface. It is a provenance
claim: *this bar ended here*. A bar with a live countdown ended nowhere. The
proof that it is a claim and not a formality is that the number MOVES: across
two reads fourteen seconds apart the header's `C` went 29398.75 → 29403.00 while
the tile's bar close stayed pinned at 29405. **A close does not move.**

### Where it came from

This defect was not introduced; it was EXPOSED. It had been invisible for as
long as both owners were equally loose. Once `deriveLastBarClose` started naming
the last *provably closed* bar, the two owners began to disagree out loud — and
the header turned out to be the one lying. Fixing one truth surface made its
neighbour's lie legible. That is the intended consequence of tightening a
provenance claim, and it should be expected again.

---

## 2. The repair — grade the word, keep the value

`src/lib/marketData/selectChartCloseLabel.ts`.

The forming bar's running value is genuinely useful — it is where the market is
right now on this timeframe. Removing it would trade an overclaim for a
blindness, which §35 PROTECTED TRUTH treats as the same family of defect. So the
VALUE stays and only the WORD changes. `NOW` is honest about exactly what it is;
`C` is reserved for a bar that has actually ended.

Unlike `deriveLastBarClose`, this selector has no "a newer bar exists" escape
hatch — it is asked about the NEWEST bar by construction, so the only available
proof is the clock: `barOpen + one interval <= now`.

When either half of that proof is missing — an unparseable timeframe, or no
caller-supplied clock — it returns `NOW`, not `C`. That degradation understates
(a closed bar may be labelled as forming for one render) and can never
overstate. Given the choice, §35 picks understating every time.

Notes on the seams:

- **The clock is injected, never read.** A selector that reaches for `Date.now()`
  itself stops being testable, and a `Date.now()` read during render is the
  exact React #418 hydration class this repo has already paid for five times.
  `nowMs` starts at `0` — "no clock yet" — so the first render on server and
  client is identical and the selector degrades to `NOW` until the countdown's
  own tick supplies a real reading a second later.
- **Units.** `barOpenedAtSeconds` is SECONDS (matching `OHLCVBar.time` and the
  lightweight-charts convention); `nowMs` is MILLISECONDS. The mismatch is the
  obvious place for this to silently break, so it is named in the signature.
- **`parseTimeframeMs` is reused deliberately**, and it refuses `1W` and `1M`.
  MainChart's own `getIntervalSec` maps `"1M"` to 2592000 (30 days), which would
  declare a bar closed on day 30 of a 31-day month. The conservative parser is
  the right owner precisely because it refuses.

### The Sentinel reads source text

The defect did not live in a selector — it lived in a hard-coded string literal
in JSX. No type can guard a letter. So the guard reads the file:

```
expect(MAIN_CHART).toMatch(/selectChartCloseLabel/);
expect(MAIN_CHART).not.toMatch(/<span>C \{?/);
```

Its siblings `O`, `H`, `L` and `V` are left alone — they describe a forming bar
truthfully.

### REVIVE (§22 / Orkin)

Both halves reintroduced via the Edit tool, each confirmed to fail the Sentinel
BY NAME, then restored byte-identical.

---

## 3. Live proof — BOTH branches, not just the convenient one

A selector with two branches that has only been seen taking one of them is half
verified. Both were observed.

**CLOSED branch** — TSLA 15m, US equities shut, so the last bar is genuinely
over. Header renders `C 359.02`, carrying the selector's title *"Close — this
bar's interval has fully elapsed, so this is the price it ended at. It will not
change."* No regression on a bar that really did close.

**FORMING branch** — NQ1! 15m, futures open. This reproduces the ORIGINAL defect
condition exactly, and it is now truthful:

```
before :  O 29403.00  H 29403.00  L 29403.00  C   29403.00  V 0
after  :  O 29417.50  H 29417.50  L 29417.50  NOW 29417.50  V 0
MARKET tile : NQ1! · 15m · 29425 LAST 15m BAR CLOSE
```

Same signature — zero range, zero volume, one bar still forming. The two owners
now make COMPATIBLE claims: one names the forming bar's running value, the other
names the last bar that actually closed. They are allowed to differ, because
they are no longer saying the same word about different numbers. The hover text
also names the timeframe ("This **15m** bar has not closed yet"), which matters
on a surface showing six of them.

---

## 4. Live VP render geometry — the pixels, at last

The gate had carried a caveat since `eaa7417`: the arithmetic producing the
rectangles was proven, but no pixel had ever been observed, so "it renders
correctly" was an inference. Measured on the live host, both layers on:

```
tab visible (document.hidden === false)
WM Fixed VP   rgba(240, 180, 41, 0.15)   ← ON
WM Session VP rgba(139,  92, 246, 0.15)  ← ON

overlay canvas 1600 × 576
  ink     1157  →  13178   when the toggles flipped   (+12,021)
  gold      520   bbox x∈[1278,1523] y∈[193,233]
  purple    290   bbox x∈[1342,1521] y∈[200,268]
```

Both colour families land against the RIGHT edge of a 1600px canvas — which is
what "right-anchored inside chart" claims. Gold spans wider, purple nests inside
it: the two-column packing (`nVPCols = 2`, Session VP at `colIndex 1`) rendering
as designed rather than as one merged slab. The screenshot of the same frame
shows the histogram with its up/down split, the gold POC and `VAH 369.00` /
`VAL 346.80` labelled. **Arithmetic proven AND pixels observed.**

---

## 5. The trap that nearly produced a fabricated P0

Worth more than the gate it closed.

The first three attempts at that measurement read **zero VP ink**, and the
screenshot showed a bare chart with both toggles lit. That is indistinguishable
from "the VP layer is dead" — a P0, and a tempting one to file.

It was wrong. `MainChart`'s overlay runs through
`shouldDrawOverlay({ hidden: document.hidden, … })`, which by design performs no
background paint while the tab is hidden. Driving the page through the Chrome
extension sets `document.hidden = true` for the duration of the call, so the RAF
loop parks, `draw()` never runs, and the overlay canvas is never even sized — it
sat at the HTML default `300 × 150` while its sibling drawing canvas was
correctly `1600 × 662`. Every symptom of a dead layer, manufactured entirely by
a governor doing its job.

Two method rules for anyone measuring canvas on this app:

1. **Foreground the tab first** (`switch_to_tab`), then take the reading in the
   very next call. Visibility survives roughly one call before dropping back.
2. **Read the toggle's computed style in the SAME call as the pixels.** Toggling
   and measuring in separate calls produced a reading where the buttons were
   neutral — a "no ink" result with the feature switched OFF, which proves
   nothing.

A third false alarm, recorded so it is not re-opened: the toolbar `Tools` button
reporting `aria-expanded="true"` while `.wm-chart-tools` is absent is **not** a
disclosure defect. That button is `aria-haspopup="menu"` and the attribute
describes its dropdown, which does open. The study-tools row is one level
deeper, behind the menu's `Flow & studies` item.

Also worth knowing: `getImageData` through the extension returns all-zero for
canvases that are visibly rendering when the tab is hidden. A zero read is not
evidence of a blank canvas until visibility is confirmed in the same call.

---

## 6. Gates

`./node_modules/.bin/vitest run` — 580 files, 6670 tests, exit 0.
`tsc --noEmit` — exit 0. Both run unpiped; a pipe masks the exit code.

---

## 7. §13 status after this block

| Gate | State |
|---|---|
| Delta Bubbles level ownership | CLOSED (assessed, already owned + delegated + sentinelled). |
| Live VP render geometry proof | **FULLY CLOSED** — arithmetic `eaa7417`, pixels observed 2026-09-15. |
| Forming-bar close overclaim | **CLOSED** — `9e1f352`, both branches observed live. |
| Decision Memory sealing | OPEN, deliberately. Surface, do not wire. A caller invented to turn a file green manufactures exactly the unreachable ceremony the guard exists to detect. |
| `executionConnectivity` orphaned | OPEN, not a live defect. **Correction to the standing brief:** `/readiness` does NOT render it. It is honest about its own subject, but this gate is unreached by every route. |
| Paper execution state-machine realism | Partially advanced by `d53abc6` (fill-price age). The ordering/queue model is untouched; canon weakness #9 PAPER-FILL OVERCONFIDENCE stands. **Next highest-value unblocked atom.** |
| Gate 4 responsive device proof | BLOCKED — programmatic resize does not take effect, `outerWidth` pinned. |
| `/journal` detail canvas | BLOCKED — zero journal entries to render. |

---

## For whoever picks this up

1. **Paper execution realism is the live lane.** The fill model still assumes a
   fill that a real queue would not always give. Do not widen it into a
   simulator; name what it cannot know.
2. Do not wire Decision Memory sealing to close a gate. It needs a decision
   surface first.
3. When a canvas reads blank, check `document.hidden` before filing anything.
