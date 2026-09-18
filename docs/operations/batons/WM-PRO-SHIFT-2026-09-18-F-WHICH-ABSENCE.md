# WM PRO SHIFT — 2026-09-18-F — WHICH ABSENCE

**Ledger line: AN ABSENCE MUST BE A FINDING, NOT A DEFAULT — AND A SHARPER
SENTENCE MUST NOT BECOME A STRONGER CLAIM.**

Two atoms. Both are instances of Canon Weakness #1 — two owners, one
instrument, one instant, disagreeing about whether evidence exists.

---

## THE FOUNDER'S COMPLAINT, RESTATED AS A MEASUREMENT

The Founder looks at `/charts?symbol=TSLA`. A chart is fully drawn. The header
prints real per-bar volume. And the story sentence underneath says
**"1/8 dimensions resolved"** and lists most of the market as *unresolved*.

The obvious hypothesis was a wiring gap. It was wrong, and the way it was
proven wrong is the point.

---

## ATOM 1 — `e3a9f457` — PARTIAL IS NOT UNRESOLVED

### What was measured, not read

The exact 120 production TSLA 15m bars were fed through the real chain.
`deriveProfileDimension` returned:

```
resolution: "PARTIAL"
value:      "DEFINED VALUE"
confidence: 0.4
populatedRows: 401   totalVolume: 2898822
poc: 360.4   vah: 364.05   val: 355
```

**The wiring was fine.** The profile dimension had *measured the market* and
produced a named verdict off 2.9M shares of real volume.

The defect was in the SENTENCE. `explainNoChapter` in `selectMarketStory.ts`
built its unresolved list with `resolution !== "RESOLVED"` — which collapses
PARTIAL and UNKNOWN into one word. A reading that exists was being reported as
a reading that does not exist.

Those two absences imply opposite actions:
- *unresolved* → there is nothing here, look elsewhere.
- *measured but not decision-grade* → the market answered, the answer is not
  yet strong enough to act on, and more tape will change that.

### The fix

A `;`-separated split inside `explainNoChapter`: `missing` (genuinely UNKNOWN)
keeps the word "unresolved"; `partial` gets "measured but not decision-grade".

### The guard that matters most

`"a PARTIAL dimension still BLOCKS — a sharper sentence is not a stronger
claim"`. VALUE_MIGRATION stays in the blocked list. `2/8 dimensions resolved`
stays `2/8`. Plus an over-correction guard asserting the partial clause
vanishes entirely when nothing is PARTIAL.

- 31 → 35 tests. Mutation receipt: 2 red BY NAME → restored → 35/35.
- Gates UNPIPED: vitest 762 files / 9463 passed EXIT=0; tsc EXIT=0.

### LIVE PROOF — observed on production, 12:06:08Z

```
BALANCE, TREND_EXPANSION, BREAKOUT, LIQUIDITY_PROBE, VALUE_MIGRATION, ROTATION
could not be evaluated: direction, regime, volatility, orderFlow unresolved;
location, aggression, profile measured but not decision-grade.
```

Three dimensions reclaimed from slander. And the over-correction guard held in
production: the blocked-chapter list is still six, `1/8 dimensions resolved` is
still `1/8`. Nothing was promoted.

---

## ATOM 2 — `487a24fd` — CANDLES ARE HERE, THE TAPE IS NOT

### The cascade, diagnosed

`deriveDirectionDimension` and `deriveVolatilityDimension` read **only**
`input.recentTicks`. `deriveRegimeDimension` is a pure composition of those
two. On `/charts` there is no per-trade tape (see the standing tape-feed
constraint: free Alpaca REST is 15-min delayed and serverless cannot host the
WS proxy).

So **ONE absence takes THREE of eight dimensions down.** That is most of the
`1/8` the Founder reads over a fully-drawn chart.

### The live-false sentence

Both derivers returned UNKNOWN carrying:

> "No verified price evidence supplied at snapshot time."

…while the header on the same screen printed `V 57,398` and `64 BARS BEHIND`.
**Price evidence WAS supplied.** What was absent is the per-trade tape.

Again, opposite actions implied. *No price evidence* tells a trader the feed is
down and to wait. *Candles are here, the tape is not* tells them this venue will
not answer this question however long they wait.

### The fix — the `evidenceGapNote` pattern, third and fourth use

Only the publisher can see both lanes, so only the publisher can author the
sentence. `tapeAbsentGapNote(rawBars, tradeTickCount, venue)` is computed
**once** in `createChartMarketStatePublication` and handed to both derivers —
computing it twice would let the two sentences drift the day either call site
grows a condition. The field is optional on both derivers, so a caller that
supplies none gets exactly the previous wording.

Precedent copied verbatim from `deriveAggressionDimension` /
`deriveProfileDimension`, which already carry this distinction for the same
reason.

- 26 → 30 tests. Mutation receipt: stripping both `evidenceGapNote: tapeGapNote`
  lines turned exactly **one** test red BY NAME
  (`stops claiming no price evidence when candles are loaded`) with all three
  over-correction guards staying green; restored.
- Gates UNPIPED: vitest 762 files / 9467 passed / 2 skipped EXIT=0; tsc EXIT=0.

---

## WHAT WAS DELIBERATELY NOT BUILT

**A candle-derived volatility/direction path.** It is the obvious next move and
it would be a fabrication.

`VOLATILITY_LOW_MAX_PCT = 0.05` and `VOLATILITY_HIGH_MIN_PCT = 0.30` are
calibrated for *tick range over a short tape window*. Applied to the total
range of 120 15m bars, **every equity on earth would read HIGH VOLATILITY** —
a fabricated reading wearing an honest label, sealed RESOLVED, feeding the
regime composition, and appearing in the Founder's largest type.

A candle path needs its own calibration (ATR%-per-bar, not total range) and its
own confidence bucketing. **SURFACED AS AN ARCHITECTURAL DECISION. NOT RUSHED.**
`deriveRegimeDimension` would also need to learn that its two inputs can now
come from different evidence tiers.

The honest move available today was to make the absence a *finding*. That is
what shipped.

---

## HONEST NEGATIVES CARRIED

- `487a24fd` is pushed but **not yet live-observed** — the Cloudflare deploy had
  not landed at the time of the read above. By design this atom changes the
  Passport `unknowns` prose, **not** the story sentence's dimension list (the
  three stay UNKNOWN, which is the "not a stronger claim" guarantee), so the
  live proof must be taken from FULL EVIDENCE / the Passport, not the ribbon.
- Four dead story matchers still await a Founder ruling
  (`EFFORT ABSORBED`, `BUYERS/SELLERS PRESSING`, `ABOVE/BELOW VALUE`,
  `profile.migrating` which needs two snapshots). CHoCH is a BUILD, not a wire-up.
- Gate 4 responsive proof remains BLOCKED (`outerWidth` pinned under
  programmatic resize). `/journal` detail canvas remains BLOCKED (0 entries).
  The Level-2 depth family (Assets 08/19/20) remains licence-blocked.

---

## COMMITS

| SHA | Atom |
|---|---|
| `e3a9f457` | market story: PARTIAL is not UNRESOLVED — split the absence |
| `487a24fd` | market state: say WHICH absence — candles loaded, tape absent |
