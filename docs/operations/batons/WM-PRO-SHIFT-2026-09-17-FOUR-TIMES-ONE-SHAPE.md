# FOUR TIMES ONE SHAPE

**Block:** `50755205` → `be4d35a9` (three commits)
**Founder directive:** *"lets get all the mockups inside the system … there
should also have a profiles drop down for all the different vps and the profiles
i created … stay in flow … lets make this beautiful os wm pro was made to be"*

---

## WHAT SHIPPED

| SHA | Atom | Live status |
|---|---|---|
| `50755205` | Candles stay visible beside the reading | **PROVEN** |
| `44598db7` | Passport PROFILE dimension reads the compiled profile | **PROVEN** |
| `be4d35a9` | Passport LOCATION dimension reads the same compiled profile | pushed; deploy pending |

---

## THE FOUNDER'S SECOND ACCEPTANCE QUESTION IS NOW ANSWERED YES

The previous baton recorded *"Is it now useful while candles remain visible?"*
as **PARTIAL** — the honest answer at the time, because I had not measured it.
It is now measured. On production BTC with Value Profile active:

```json
{"chart":{"display":"flex","order":"-1","flex":"0 0 42%","top":112,"h":262},
 "valueProfile":{"top":374,"h":362},
 "chartAboveReading":true}
```

The chart sits above the reading, both are non-zero height, and the main pane is
genuinely drawing — 9 canvases, 1490×204. Upgrade **PARTIAL → YES**.

The third Founder ask of this directive, the Profiles dropdown, is also proven
live: `PROFILES · 4 OF 4 CAN DRAW NOW`, listing Fixed Range VP, Session VP,
Delta + VP and Absorption, each naming the levels it can actually produce.

---

## THE SHAPE THIS BLOCK IS NAMED FOR

Four times now the same defect has been found the same way: **by reading the
live product, not by running the tests.** ORDER FLOW, VOLATILITY, PROFILE and
now LOCATION were each hard-coded into `chartMarketStatePublisher`'s unresolved
list as an unconditional string, because at the time nothing could measure them.

Each line outlived the incapacity that justified it.

The measured instance for this block, taken in the Founder's own browser:

> The Living Profile panel published **VAH 76280 / POC 76000 / VAL 75700 from
> 248 measured price buckets**, while the Market Object Passport in the rail
> *beside it* read **"Unresolved: location, aggression, structure, profile."**

Two surfaces, one instrument, one instant, two answers. That is Canon Weakness
number one, printed on the Founder's screen.

**The tests could not have caught this.** Every one of them was green. The
defect was not a wrong computation — it was a *wiring omission*, a string that
was still true the day it was written. A green suite says the code does what it
says. Only the running product says whether the trader can see it.

---

## THE HAZARD THE REPAIR CREATED, AND THE GUARD ON IT

Volume-at-price is the one reading in this product with **two honest inputs**:
the per-trade tape and a candle estimate. `buildLivingProfileSnapshot` is the
single chooser between them.

The naive repair — having the publisher call `computeProfileFromTrades` or
`computeProfileFromBars` itself, or grow its own `trades.length >= N` threshold
— would have made the publisher a **second chooser**, and the Passport could
then seal a POC the panel never drew. That is *the same defect the wire was
written to close, pointing the other way*, and it would ship silently: both
numbers would be internally defensible.

So both derivations share **one compiled VM**:

```ts
const livingProfile = selectLivingProfile(
  buildLivingProfileSnapshot(input.recentTicks, profileBarsFrom(input.bars)),
  { livePrice: input.ticker.price },
);
const profile  = deriveProfileDimension(profileEvidenceInput);
const location = deriveLocationDimension(profileEvidenceInput);
```

`passportProfileHasOneOwner.sentinel.test.ts` now asserts that
`selectLivingProfile(` appears in that file **exactly once**, and that neither
engine is named there at all. Compiling twice is identical today and a silent
divergence the day either path grows a tie-break.

---

## THE WORDING IS CARRIED, NOT COMPOSED

`selectLivingProfile` owns the sentence *"price is ABOVE the value area"*. The
LOCATION verdict is a **mapping** of that decision, and the owner's sentence
goes verbatim into the evidence basis alongside the levels it was judged
against, so the claim can be *checked* rather than trusted.

This file does not get to rephrase it. Two surfaces wording one fact
differently is the defect this entire lane exists to prevent.

---

## THE PREDICTION I WROTE DOWN BEFORE LOOKING

Before the deploy landed I recorded what I expected to see, so the check could
fail honestly: **because BTC's profile is candle-estimated, PROFILE and LOCATION
will resolve PARTIAL, not RESOLVED.** They would therefore still appear in the
unresolved *list*, and the resolved count would stay at 3/8. What must change is
the node itself.

Measured afterwards on production:

```
BEFORE  PROFILE / UNRESOLVED
        "Profile unresolved — No verified evidence supplied at snapshot time."
        DNA · 0 REFS

AFTER   PROFILE / FORMING / INFERRED / 40% / DNA · 1 REF
        "Profile is forming — … this profile was ESTIMATED FROM CANDLES,
         which spread each bar's volume evenly across its range …"
```

The prediction held. The dimension went from *no evidence* to *one real
evidence ref* that **names its own weakness in the compiler's own words**.
`INFERRED`, not `DERIVED`; 40% confidence, capped below the tape path.

LOCATION still reads `UNRESOLVED · DNA · 0 REFS` at the time of sealing, because
`be4d35a9` was pushed minutes ago and Cloudflare deploys asynchronously. **That
is pending, not proven.** It is written here as pending on purpose.

---

## WHY THE CANDLE PATH STILL GETS A VALUE

`computeProfileFromBars` spreads each bar's volume **evenly** across its
high–low range, so within-bar shape is **flat by construction**. HVN and LVN are
therefore withheld on that path, and the panel names the refusal.

But POC, VAH and VAL are *aggregates* — they survive the even spread. So the
deriver states the width verdict and the location side even on the candle path,
downgraded to PARTIAL with the reason attached.

**A second refusal the compiler never made is itself a defect.** A Passport
stricter than the panel it describes is the same two-owners bug wearing modesty.

---

## GATES

- `./node_modules/.bin/tsc --noEmit` — exit 0, unpiped
- `./node_modules/.bin/vitest run` — **750 files, 9233 passed | 2 skipped**, unpiped
- 20 new tests across `deriveProfileDimension`, `deriveLocationDimension` and the
  single-owner sentinel

---

## OPEN, HONESTLY

- **LOCATION live-verification** — pushed, not yet observed. Re-open the
  Passport drawer on production BTC and confirm the node leaves `0 REFS`.
- **Decision Receipt** has no `/charts` door, because Decision Memory sealing
  still has **zero production callers**. Architectural — surfaced here, not
  rush-wired.
- **Question-Driven Mode**, **Order Flow bubbles / CVD anchored session path**,
  and **Mirror / Opening Bell** remain unbuilt from the pasted canon.
- **Gate 4 responsive proof** — still blocked; programmatic window resize does
  not take effect, `outerWidth` stays pinned.
- **`/journal` detail canvas** — still blocked on 0 journal entries.
- **Level-2 depth family** (Assets 08 / 19 / 20) — blocked behind a licensed
  depth provider.
- **Raise with Founder:** whether plain crypto symbols should prefer
  `/api/exchange` (Coinbase, bucket ratio ≈5.6) over Alpaca's thin keyless venue
  (≈139.5). That difference is *why* BTC reads candle-estimated at all.
