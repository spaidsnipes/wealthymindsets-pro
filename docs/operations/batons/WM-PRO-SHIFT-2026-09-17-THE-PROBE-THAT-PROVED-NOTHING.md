# THE PROBE THAT PROVED NOTHING

**Block:** `60bb3eba` → `0ee8195c` (three commits)
**Founder directive:** *"lets get all the mockups inside the system … the
inventions … stay in flow … lets make this beautiful os wm pro was made to be"*

---

## WHAT SHIPPED

| SHA | Atom |
|---|---|
| `60bb3eba` | Canon Asset 05 — Big Trade Intelligence: rank prints against their own window |
| `1dd095da` | Canon Asset 06 — the Pro Living Profile, with the node refusal it must make |
| `0ee8195c` | **Repair** — the profile must fit; a scrolled profile is not a profile |

Both assets are LIVE-VERIFIED on `https://wealthymindsetspro.com/charts?symbol=BTC`
in the Founder's own authenticated browser, not in a test and not in Storybook.

---

## THE LESSON THIS BLOCK IS NAMED FOR

I nearly reported a stale production build on the strength of this:

```
curl -s 'https://wealthymindsetspro.com/charts?symbol=BTC' | grep -c 'Big Trades'
0
```

Zero. The obvious reading is *the deploy did not land*. Before acting on it I
ran the same probe against four strings that have been live for months —
`Absorption`, `Aggression`, `Shareholders`, `Valuation`:

```
0   0   0   0
```

**`/charts` is client-auth-gated. No tab name has ever appeared in its SSR
HTML.** The probe cannot return anything but zero, so it cannot distinguish a
fresh build from a six-month-old one. It was not weak evidence; it was *no*
evidence wearing the costume of evidence.

This retroactively invalidates a claim carried in from the previous session —
that Asset 05 "was not live." It was live. The probe was broken, not the deploy.

**The rule, written down so no future session repeats it:** before concluding
anything from a negative probe, run the same probe against a string you already
know is present. A negative that cannot go positive is not a measurement.

The only valid check for this surface is reading the live `<select>` options
through the authenticated browser. That is now the standing method.

---

## THE SECOND FINDING — FOUND BY LOOKING, NOT BY TESTING

Asset 06 shipped green: 9191 tests, `tsc` clean, 13 sentinel assertions. On the
live chart the panel reported everything correctly:

- `quality: "ESTIMATED FROM CANDLES"`
- `hasNodes: false`, with the full refusal sentence
- VAH `76280.00` / POC `76000.00` / VAL `75700.00`
- `curveRows: 248`

The designed refusal fired in production, on real data, exactly as written.

And the histogram was a **thin useless column**. 248 rows at a fixed 7px is
1736px of content inside a `maxHeight: 460, overflow: "auto"` box. The trader
saw roughly a quarter of the distribution. The POC was very likely off-screen.
Nothing on the panel said so — while its own header read *"248 price buckets
took volume."*

The shape **is** the claim this view makes. A view whose entire argument is the
silhouette of a distribution, showing a quarter of that silhouette with no
disclosure, is making a false claim quietly. Every assertion about it passed.

### The fix, and the line it must not cross

Scale the **row height**, never merge buckets:

```ts
const rowHeight = vm.curve.length > 0
  ? Math.max(ROW_MIN, Math.min(ROW_MAX, CURVE_HEIGHT / vm.curve.length))
  : ROW_MAX;
```

Merging is the one thing this view may not do. **Merging would move the POC,
and a POC that moves because of a layout decision is not a POC.** The compiler
already refuses the same thing at `MAX_CURVE` for the same reason. Thinner rows
change how much ink a bucket gets; they change nothing about what was measured.

Below 5px a row has no vertical room for a caption, so the in-row price and node
labels are withheld rather than smeared — and **the withholding is disclosed**,
because it is a change to what the trader can read:

> *All 248 buckets are drawn at once so the shape can be read whole — none were
> merged — but the rows are too thin to caption, so the levels are named beside
> the histogram instead of on it.*

Two sentinel assertions now pin both halves: `THE PROFILE FITS` (the scroll box
may not come back) and `FITTING IS NOT MERGING` (no `reduce`/`slice`/`filter`
on `vm.curve`). Sentinel: 13 → 19 assertions.

This closes the §13 gate named **"Live VP render geometry proof."** It could
only ever have been closed this way. A test proves the code does what it says.
Only the running product proves the trader can see it.

---

## A SENTINEL THAT ALMOST DELETED AN HONEST SENTENCE

`expect(src).not.toMatch(/REJECTION/i)` failed — correctly, by its own logic,
and wrongly in fact. The view contains:

> *"the thin prices in this sample are its tails, and a tail is not a rejection"*

That sentence **denies** a claim rather than making one. The forbidden thing is
the shouted verdict label from the mockup, not the word. Fixed to case-sensitive
whole-word matching. A sentinel that deleted that sentence would have been
removing honesty in the name of enforcing it.

---

## THE FOUNDER'S THREE QUESTIONS, ANSWERED HONESTLY

**Can we visually recognize the same invention?** — **YES** for both. Asset 05
ranks prints against their own window with SIDE · VENUE-STATED provenance.
Asset 06 renders the VAH/POC/VAL skeleton and the HVN/LVN vocabulary.

**Is it now useful while candles remain visible?** — **PARTIAL, and this is a
real limitation, not a quibble.** Both ship as full-tab siblings of `Chart`, so
selecting either *replaces* the candles. The Founder's mockups show these as
companions to price, not substitutes for it. Recorded as open.

**Is it fed real/honest WM information?** — **YES.** Asset 05 showed live BTC
tape moving 25→35 prints while observed, with the honest disclosure *"0 prints
≥ 0.1500 … yet 4 stand out against this window — a quiet tape where the biggest
prints are still small in absolute terms."* Asset 06 published POC/VAH/VAL from
candles **and refused HVN/LVN on that path**, because `computeProfileFromBars`
spreads each bar's volume evenly across its range — every ripple in that curve
is bars overlapping, not price refusing to trade.

---

## CORRECTIONS TO THE §13 GATE LIST

- **"Delta Bubbles level ownership" is CLOSED**, and was already closed before
  this block began. `src/lib/deltaBubbleLevels.ts` owns the level
  (*the real traded price inside the heaviest bucket, not the bucket's geometric
  centre*), `MainChart.tsx` delegates at both sites (`:4440`, `:4979`), and
  `deltaBubbleLevels.adoption.sentinel.test.ts` enforces the delegation. The
  §13 list is stale here; no work was redone.
- **"Live VP render geometry proof" is CLOSED** by `0ee8195c`.

---

## DEPLOY TOPOLOGY (established, so it is not re-derived)

`.github/workflows/` contains **only** `sentinels.yml`. There is no deploy
workflow and no wrangler reference. Production deploys through Cloudflare's own
Git integration, asynchronously and independently of the Sentinels run.

**A green CI run therefore does not mean production is updated.** Only a live
read proves it.

---

## STILL OPEN

- The remaining canon mockups. `selectLiquidityWeather`,
  `selectMarketObjectPassport`, `selectDecisionReceipt`, `selectOrderFlowStanding`,
  `selectStackedImbalance`, `selectDeltaLevels`, `selectEvidenceLadder` and
  `selectValueCandle` all have compilers **and** consumers — but
  `LiquidityWeatherPanel` and `StackedImbalancePanel` are mounted *inside*
  `OrderFlowDepthPanel` / `SmartMoneyPanel`. They are reachable, and
  drawer-buried rather than given a door. **That door question is the shape of
  the remaining "get all the mockups inside the system" work** — most of it is
  routing, not compiling.
- Candles-beside-the-invention (question 2 above).
- BLOCKED, unchanged: Gate 4 responsive proof (`outerWidth` pinned under
  programmatic resize); `/journal` detail canvas (0 entries); the Level-2 depth
  family (Assets 08 / 19 / 20) behind a licensed depth provider.
