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

# A NUMBER WHOSE SCALE IS NOT OURS

**Shift** 2026-09-18 · **Commits** `8d84ab0a`, `7495ffbc` · **Branch** main, pushed
**Gates** tsc EXIT=0 · vitest EXIT=0 (761 files, 9404 passed, 2 skipped)
**Live** PROVEN on https://wealthymindsetspro.com — see EVIDENCE below.

---

## THE FINDING

Production printed, on BTCUSD, in the Liquidity Weather panel:

```
MEDIAN COST   0        size per spread
LATEST VS PEERS  5.38×
```

Those two readings cannot both be honest. **A ratio taken against a true zero is
Infinity**, so a finite non-zero `5.38×` is *proof* that the median was not zero.
The number was right. The rendering lied.

The cause was `num(vm.medianCost, 0)` — zero decimals on a quantity denominated
in whatever the instrument's volume happens to be. Size is `0.065` on BTC and
`4,100,000` on SOFI. **A fixed number of decimals is only ever safe when you
ALREADY KNOW THE SCALE**, and on this number nobody does.

Four lines below the defect sat the file's own comment explaining why the
*ratios* had already been migrated off `num` for exactly this reason. The team
diagnosed the species, wrote the reasoning down, shared a formatter — and did
not migrate the number the ratios are computed FROM.

## THE CENSUS — THREE ANSWERS TO ONE QUESTION

That is not a careless call site. It is a convention, and a convention is
re-decided at every call site. A census of the sibling panels found the same
question answered independently three times, and **three different answers had
shipped**:

| answer | site | measured on production |
|---|---|---|
| `toFixed(0)` | LiquidityWeatherPanel — median cost | `MEDIAN COST 0` — told a trader it costs NOTHING to move this market |
| `toFixed(2)` | AbsorptionAnatomyPanel — efforts, displacement | (not observed wrong; still a fourth private decision) |
| `toExponential(2)` | AbsorptionAnatomyPanel — efficiency ratio | `EFFICIENCY RATIO 4.37e+2` — the number is 437. Scientific notation is not a reading; it is a dare. |

And `roundSig` itself existed **BYTE-FOR-BYTE TWICE**, in `selectAbsorption.ts`
and `selectLiquidityWeather.ts`, each sitting above a comment explaining the same
reasoning to a reader who would never see the other copy. Neither copy was
wrong — which is precisely why nothing caught them.

The author of `toExponential(2)` was not careless either. The note under that
tile correctly says the ratio's scale is instrument-specific. It is a **right
diagnosis with a wrong remedy, made in isolation because there was nowhere to
put the right one.**

## THE FIX — AN OWNER, NOT A BETTER CONVENTION

`src/lib/marketData/viewModels/measuredNumber.ts` is now the single home for
rendering a quantity whose SCALE belongs to the instrument rather than to us.

- `roundSig` — scale-preserving rounding. One copy. Both selectors import it.
- `formatMagnitude` — costs, efforts, efficiencies. Grouped-and-whole above a
  thousand; three significant figures below. **Never scientific notation.**
- `formatRatio` — deliberately NOT the same function. Near 1 a reader expects
  `1.00×`; three sig figs would print `1`. The divergence is pinned by a test.

`selectLiquidityWeather.ts` re-exports `formatMagnitude as formatCost` so its
public API is unchanged. **A second CALLER of one owner is fine; a second ANSWER
is not (§24).**

### WHAT IS DELIBERATELY *NOT* OWNED HERE

Percentages, shares of a whole, counts, R multiples, a ratio shown against
`1.00×` — these have a scale their own surface already knows, and a
fixed-decimal render of them is correct. Pulling them in would make this module
the place all formatting goes to be argued about, **which is how an owner turns
back into a convention with extra steps.**

### THE PANEL'S OWN TOOL WAS REMOVED, NOT MERELY UNUSED

`LiquidityWeatherPanel`'s private `num` helper is gone from the file. Leaving a
second formatter lying on the bench is how the median came to print `0` in the
first place. *A tool left on the bench gets picked up.*

## THE OWNER'S FIRST DRAFT WAS WRONG IN THE WAY IT EXISTS TO FIX

`formatMagnitude` originally ended `return String(roundSig(v, 3))`. JavaScript's
default number-to-string switches to exponential below `1e-6`, so
`String(9.1e-7)` is `"9.1e-7"` — **the module would have re-shipped
`toExponential` under a new name, on the very values it exists to protect.**

Every hand-picked example passed. Only this failed:

```ts
it("NEVER renders scientific notation", () => {
  for (const v of [437, 0.00000091, 4137201, 1e21, 1e-21]) {
    expect(formatMagnitude(v)).not.toMatch(/e[+-]/i);
  }
});
```

**That is the argument for stating a gate as a PROPERTY over a range of inputs
rather than as a couple of examples.** Recorded in the function's own docstring
so the next reader gets the lesson, not just the code.

## THE MUTATION RECEIPT

The regression test for the median does not merely assert the new behaviour; it
pins the SHIPPED WRONG behaviour on its own fixture:

```ts
expect(vm.medianCost!.toFixed(0)).toBe("0");   // what the old code did to THIS number
expect(formatCost(vm.medianCost)).not.toBe("0");
```

If fixture drift ever stops reproducing the bug, the test goes **red** rather
than silently reading as coverage. (Building that fixture took three
measurements — `21.12`, then `2.451`, then sub-1. The 10× size scaling that
confirmed linearity was a measurement, not a guess. **MEASURE, DON'T REASON.**)

## THE SENTINEL

`measuredNumber.test.ts` carries a source-text sentinel so the duplicate cannot
come back quietly:

- a **FALSE_RIPENESS guard** first — each policed file must exceed 2000 chars, so
  a rename or a stub cannot make every later assertion pass vacuously;
- no consumer may re-declare `function roundSig(`;
- every consumer must name `from "./measuredNumber"`;
- `AbsorptionAnatomyPanel` must not contain `toExponential(`;
- `LiquidityWeatherPanel` must not contain `function num(`.

**WHAT IT CANNOT SEE**, stated in the file: it cannot witness a caller that
imports the owner and then ignores the result, and it cannot see a rendered
pixel. It closes ONE thing — the arithmetic cannot re-appear beside a canvas
without failing here BY NAME.

## EVIDENCE — LIVE, OBSERVED, NOT REASONED

Driven in the Founder's authenticated Chrome,
`/command-deck?equip=order-flow&stage=full`, BTCUSD · 15m, after ENTER:

```
MEDIAN COST | 0.00113 | size per spread | LATEST VS PEERS | 393×
EFFICIENCY RATIO | 142 | price per unit of net effort
```

- `MEDIAN COST` reads **0.00113**, not `0`. And `(0.00113).toFixed(0) === "0"` —
  this live value is exactly the class the old renderer flattened.
- `EFFICIENCY RATIO` reads **142**, a number a trader can act on, not `4.37e+2`.
- A regex sweep for scientific notation across the whole rendered page returned
  **zero matches**.

## THE LAW THIS BLOCK ADDS

> **AN OWNER BEATS A CONVENTION.** A convention is re-decided at every call site,
> and the sixth decision was wrong. An owner is decided once.

The lesson is *not* "those two call sites were careless." Both authors reasoned
correctly about the problem. **There was nowhere to put the right answer, so each
of them put their own answer where they stood.**
