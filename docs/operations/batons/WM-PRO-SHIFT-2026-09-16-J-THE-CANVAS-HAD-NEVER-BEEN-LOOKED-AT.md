# BATON J — the canvas had never been looked at

**Date** 2026-09-16 · **Branch** `main` · **Commits** `03396c6`, `11f7db0`, `d0a78bd`, `e1cf6d7`
**Suite at close** 667 test files / 8013 tests, `tsc --noEmit --skipLibCheck` exit 0, both run UNPIPED.
**Deploy status** pushed to `main`, **NOT LIVE**. `npm run deploy:cf` is Founder-blocked; nothing in this baton has been observed on wealthymindsetspro.com and nothing here may be reported as live-verified.

---

## The one sentence

Two §13 gates closed, and both closed on the same realisation: **"canvas has no DOM" is true of vitest and false of a real browser.** The instrument was never missing. It was never picked up.

---

## 1. `03396c6` — the third copy, and a Sentinel that named a file

`scripts/audit-bubbles.mjs` held a third copy of the delta-bubble binning loop, carrying BOTH defects the `deltaBubbleLevels.ts` extraction had already fixed:

```js
const priceLevel = +Number(lo + i * levelStep + levelStep / 2).toFixed(dp);   // a bucket CENTRE
if (Math.abs(t.price - priceLevel) < half) { bid += t.bid; ask += t.ask; }    // strict-centre
```

It had **zero callers**, was never executed by vitest, exited 0 printing `9 passed, 0 failed` — and asserted one of the defects as CORRECT:

```js
assert("bucket centers differ from raw ticks", levels.some(l => !data.has(l.priceLevel)));
```

That assertion *requires* the printed bubble price NOT to be a real traded tick. It is the third instance in this repo of a check that is load-bearing in the **wrong direction**: it goes red the moment the bug is fixed. It was also precisely the instrument a human would reach for to "verify bubbles" — a green stamp on the old defect.

**Root cause of its survival.** `deltaBubbleBinning.test.ts` read `MainChart.tsx` and nothing else. It named a FILE, not an invariant, so it was green and blind for as long as the third copy existed somewhere else.

**Fix.** The script was deleted rather than re-pointed at the new formula — a fourth copy aimed at the right answer is still a fourth copy. The guard was rewritten as five INVARIANTS swept repo-wide across `src/` and `scripts/`, each carrying the reason it is an invariant, plus a vacuity assertion (`FILES.length > 100`) so a sweep that silently covered zero files cannot read as a clean bill of health.

**Revive-attempt.** Restoring the script fires exactly two tests, both naming it by path with the defect spelled out.

---

## 2. `11f7db0` — the VP gate, closed with `getImageData()`

"Live VP render geometry proof" sat open across several batons with one reason attached: *canvas has no DOM; this needs a different instrument, not another unit test.*

`vpEngine.ts` owns where the volume goes. `vpDrawGeometry.ts` owns where the pixels go. `vpRenderGeometry.test.ts` holds MainChart to delegating to both. **All three test arithmetic**, and every one of them would stay green with the numbers right and the picture wrong. Nothing in this repo had ever observed a single painted profile pixel.

`scripts/prove-vp-pixels.mjs` bundles the SHIPPED owners with esbuild, paints a twelve-bucket profile on a real Chrome canvas, and reads the bytes back. Three prose claims in that module's header became five measurements: `VACUOUS`, `NO_HAIRLINE`, `PROPORTIONAL`, `SPLIT_EXACT`, `FITS_IS_TRUE`.

### The three laws that were written WRONG, and were caught only because their revive ran GREEN

This is the most portable thing in this baton.

- **`ROW_HEIGHT` ran green.** The fixture spanned 480px over 12 buckets = exactly 40px each, so every edge was integer-aligned and the defect formula agreed with the correct one on every row. **The defect was real and the fixture could not express it.** `BOT_Y` 520 → 517 puts the bands at 39.75px, off the pixel grid, which is the only condition under which the two disagree.

- **`SPLIT_ROUND` ran green.** The law compared `up + down` against the PAINTED total. If the down half is rounded a pixel too wide, the painted total is a pixel too wide with it — the two agree perfectly while the bar lies about its volume. **A law stated against the same quantity the defect corrupts cannot see the defect.** Re-founded on `earned = max(1, round(width · vol/max))`.

- **`VOID_PAINT` ran green, and the law was BACKWARDS.** It failed if an unfitting column painted pixels — but painting at negative x produces exactly nothing, so GREEN *was* the defect: the profile was requested, the work was done, and nothing appeared. Re-founded as the `FITS_IS_TRUE` biconditional (fitting ⇒ pixels appear; not fitting ⇒ none do), probed in both directions, with a meta-check that both answers are exercised.

**SCOPE recorded in the file and in CI:** this proves the geometry OWNERS paint honestly. It does NOT prove `drawWMVP`'s composed scene, which also picks colours and draws POC/VAH/VAL over live price. That stays HUMAN_PROOF_REQUIRED.

---

## 3. `d0a78bd` — bubble SIZE had no owner at all

Delta bubble LEVELS had an owner and a Sentinel. Big-trade LEVELS had one too. **Neither owned a single pixel.** The radius — the only thing a human actually reads off a bubble — was inline in `MainChart.tsx` in two separate places with two disagreeing formulas.

Both held the losing side of a law this repo had **already written down**, in `vpDrawGeometry.ts`: *"no aesthetic baseline and no power curve — those made low levels fake-wide and saturated every above-median level into one chunky solid block, which is a picture of the shaping function rather than of the volume."* The law was learned on one surface and never carried to the other.

| defect | shipped form | what it did |
|---|---|---|
| BASELINE BLEND | `round(11 + sqrt(share) * 14)` | a zone carrying **nothing** painted at **19% of the peak bubble's area** |
| SATURATION | `min(28, 9 + sqrt(ratio - 1) * 11)` | every print ≥ ~3.98× the bar mean painted an **identical** disc; `ratio - 1` floored at 0, so every print at or below the mean collapsed to **one dot** |
| MEAN NORMALIZER | `/ Math.max(1, barMean)` | one new outlier **shrank every other bubble on the bar**, with no change in their own volume |

`src/lib/bubbleDrawGeometry.ts` holds the law: a bubble is a **disc**, what a human reads off a disc is its **area**, so `r = maxR · sqrt(value / peak)` makes area linear in value. **The sqrt is the inverse of the geometry, not a shaping curve** — it is the direct-proportional encoding for a circle in exactly the sense `vpBarWidth`'s bare multiply is for a rectangle. The minimum radius survives as a **floor** (a zero-radius bubble reads as "no flow here", which is accidentally-correct silence), never as a baseline, and `bubbleRadiusIsFloored` discloses when the floor did the work.

`playBloop` stopped asking the RENDERER whether a trade was loud. It read `baseR > 24`, which only ever worked by accident of the old clamp and would now sound on every bar; it asks the data instead.

**Revive-attempt.** Restoring both inline formulas fires all four sweep invariants plus the delegation check, each naming the defect rather than a location. 18 owner tests + 4 adoption tests.

---

## 4. `e1cf6d7` — measure the DISC, not the number

The owner's unit tests all measure a NUMBER. The owner returns an **integer** radius, so no claim about proportionality is a claim about what anyone can SEE until it survives quantization.

`scripts/prove-bubble-pixels.mjs` paints twelve bubbles with the shipped owner on a real Chrome canvas. The central law, `AREA_TRACKS_VALUE`, is stated as a **ratio between two measurements** — painted area ratio must equal value ratio — rather than against a formula, applying the `SPLIT_ROUND` lesson pre-emptively.

Clean run, measured:

```
12 bubbles, 8309 px painted, 6 in the proportional band (r>=12), 5 at the floor
bubble  0  value 10000 (100.00% of peak)  r=25  painted 2032px (100.00% of peak area)
bubble  5  value  2500 ( 25.00% of peak)  r=13  painted  571px ( 28.10% of peak area)
bubble 11  value     1 (  0.01% of peak)  r= 6  painted  124px (  6.10% of peak area)  FLOORED
```

`DISC_IS_A_DISC`'s tolerance is **radius-dependent, and that is a measurement not a convenience**: a rasterized disc's boundary is O(r) pixels against an O(r²) area, so quantization error scales as ~1/r. A flat 12% left only 2.3 points of headroom at the 6px floor — close enough that an antialias policy change would have reported a real defect.

All five revives fire, each reinstating a formula that actually shipped:

| mode | offences | law that fired |
|---|---|---|
| `BASELINE` | 45 | AREA_TRACKS_VALUE — the 11px baseline, caught as a ratio error in real bytes |
| `CLAMP` | 22 | AREA_TRACKS_VALUE + NO_SATURATION |
| `LINEAR_RADIUS` | 6 | AREA_TRACKS_VALUE — r ∝ v reads as area ∝ v², exaggerating every lead |
| `NO_FLOOR` | 2 | **VACUOUS** — a zone carrying real flow painted NOTHING |
| `MEAN_NORM` | 22 | AREA_TRACKS_VALUE + NO_SATURATION |

Both pixel proofs are wired into `.github/workflows/sentinels.yml` and `package.json`.

---

## Gate ledger

**CLOSED this baton**
- Live VP render geometry proof — `11f7db0`
- Delta Bubbles level ownership — levels (`03396c6`, repo-wide guard), size (`d0a78bd`), pixels (`e1cf6d7`)

**STILL OPEN**
- **Decision Memory sealing has zero production callers.** Architectural. Surface it, do not rush-wire it — its own reachability file records that *"inventing a caller to turn this file green would manufacture exactly the kind of unreachable ceremony it exists to detect."*
- **`executionConnectivity` orphaned.** Not a live defect; `/readiness` discloses it honestly.
- **Paper execution state machine realism.**

**BLOCKED, recorded honestly**
- **Gate 4 responsive device proof** — programmatic window resize does not take effect in the Chrome channel, `outerWidth` stays pinned. **Worth re-examining with the instrument-shift reasoning that closed the VP gate:** Playwright's `setViewportSize()` may dissolve the resize half of it. The counter-constraint is recorded: `audit-phone-parity.mjs` holds no session and every authenticated route client-side redirects to `/login`, so the real blocker for interior routes is **auth, not resize**. `measure-experience-geometry.mjs` sidesteps it by rendering surfaces in isolation against fixtures.
- **`/journal` detail canvas** — 0 journal entries exist to render.
- **Deploy** — `npm run deploy:cf` denied by the auto-mode classifier. Founder-only. Not to be worked around.

---

## Carried forward, verbatim

> Never make a live trade. Never rotate credentials. Never change brokerage/account/security state without separate Founder authorization.

## The transferable lessons

1. **A Sentinel that names a FILE defends the location and loses the law.** Third occurrence. Sweep invariants repo-wide, and assert the sweep is non-empty.
2. **A check can be load-bearing in the WRONG direction** and go red the moment a bug is fixed. Third occurrence.
3. **A law stated against the same quantity the defect corrupts cannot see the defect.** State laws as ratios between independent measurements.
4. **A revive that runs GREEN is an instrument gap, not a pass.** Four of the ten pixel laws written across these two harnesses were wrong the first time, and every single one was found this way.
5. **"There is no instrument for this" deserves one direct check before it becomes a standing blocker.** Both gates closed this baton had been open on a premise that was true of one tool and false of another sitting in `devDependencies`.
