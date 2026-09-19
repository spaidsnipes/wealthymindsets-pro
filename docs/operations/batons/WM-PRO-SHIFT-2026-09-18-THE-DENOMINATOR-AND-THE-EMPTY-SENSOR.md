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

# WM Pro — the denominator, and the sensor that arrived empty

Two commits, one defect seen from both sides. Plus three audited negatives that
are recorded here precisely because they are negatives.

---

## The defect, stated once

A picture has a size. That size is decided by what was ASKED FOR, never by what
turned up. Break that and a system scores better the less it knows.

The CLARITY tile broke it twice, in opposite directions, and neither break was
visible as a wrong number — both were visible only as a number that was too
KIND.

### Half one — the denominator (`af6d816b`)

```
CLOUDED · 33%
1 of 3 measured · 8 evidence nodes unpaid
```

THREE. The Founder's OS Overview asks for FOUR clarity components. The ribbon
computed its own denominator as `components.length + unownedComponents.length`
— the count of what ARRIVED plus the count of what can never arrive. The one
call site passes `noise: null` honestly, with a comment explaining why, and its
honesty was paid back as a better score: 1/4 is 25%, the screen said 33%.

Fix: the denominator is a declared ROSTER (`CLARITY_ASKED_FOR`), published by
the owner so no surface re-derives it (§24: a second CALLER is fine, a second
ANSWER is not). A third standing was added, because the file only ever had two:

| standing | meaning |
|---|---|
| MEASURED | an owner ran and produced a number |
| **OWNED, NOT SUPPLIED** | an owner EXISTS; this call site had no input for it |
| NOT OWNED | nothing in this product can ever measure it |

The middle one was missing, and it is the one that matters to a trader: "no
biometric sensor exists" is permanent, "screen noise was not supplied here" is
fixable. Collapsing them tells a trader a fixable gap is forever.

**PROVEN LIVE** on `/command-deck?symbol=TSLA`: `CLOUDED · 25%` /
`1 of 4 measured`.

### Half two — the numerator (`be2288c5`)

The new `unsuppliedComponents` column immediately NAMED Screen Quiet as
owned-but-not-supplied. That turned out to be true only because nobody handed it
over: `/command-deck/page.tsx:746` already computes an honest `secondaryNoise`,
one scope away from the tile reporting it absent. The ribbon now RELAYS it.

The prop is optional and the `?? null` is load-bearing. A room with no
`MaterialityReading` omits it and keeps the honest degradation. **Relaying is
not fabricating, and the two are one `??` apart.**

Wiring it exposed the second half. `selectSecondaryNoise` returns UNWATCHED in
exactly one case — its `reading` was `null`, i.e. no prior snapshot existed. The
compiler scored that **50%** and counted it as a MEASURED component. So:

- a surface passing an honest `null` scored WORSE than
- a surface passing a sensor that had read nothing at all,

and the fabricated half-mark was indistinguishable on screen from a genuinely
half-quiet screen. `noise: null` and `noise: UNWATCHED` are the same fact
wearing two shapes; they now land in the same column.

> **A NUMBER IS NOT OWED TO EVERY INPUT THAT ARRIVES.**

Only QUIETED and ACTIVE are settled claims about the screen. Neither is 50.

The mirror is guarded too: an ACTIVE reading scores zero, but it SCORES. Hiding
a measurement that WAS taken is the opposite failure and just as wrong.

---

## Receipts

| gate | result |
|---|---|
| `vitest run` (UNPIPED) | 765 files, **9578 passed** / 2 skipped, exit 0 |
| `tsc --noEmit` (UNPIPED) | exit 0 |
| mutation receipt | restoring the three-way arm reds **4 of 5** new tests BY NAME |

The fifth ("an ACTIVE screen IS a measurement") stays green under that mutation
and SHOULD — it guards the mirror failure, which that mutation does not commit.
Said plainly in the commit rather than implying all five were sensitive.

Live: `af6d816b` PROVEN (`1 of 4 measured · 25%`). `be2288c5` pushed, deploy not
yet observed — and note its visible effect is CONDITIONAL: on a first render
`priorStory` is null, so `secondaryNoise` is UNWATCHED and the tile correctly
stays at 25%. It moves to `2 of 4 · 50%` only once a second snapshot exists,
which is exactly what the new tests pin. Not claimed as proven.

---

## Three audited negatives (recorded, not fixed)

Negatives are written down so the next pass does not re-open them.

1. **Liquidity Weather's `empty()` VM** — all five readings are `null`, not `0`.
   The four-row legend printing `—` beside "0 equal-count segments" is honest
   degradation, not a phantom.
2. **`Disagreeing` rounds `dispersion * 100`** — flagged as a candidate for the
   "0.00× reads as free" family the same file already fixed twice. It is safe BY
   CONSTRUCTION: `LIQUIDITY_SEGMENTS = 12`, so the smallest non-zero dispersion
   is 8.3% and cannot round to 0%. Refused to manufacture a fix.
3. **Orphan sweep of `src/components/experience/`** — every panel has at least
   one non-test consumer, and each of the six single-consumer panels
   (`AggressionResponseView`, `BigTradeIntelligenceView`, `CanvasBadgeMini`,
   `DeckExpressionShortlist`, `ExitRampCard`, `LivingProfileView`) mounts in a
   real production surface (`ChartsDashboard` or `/command-deck`). Liquidity
   Weather specifically is wired `useOrderFlowReadings` → `OrderFlowDepthPanel`
   + `SmartMoneyPanel`.

   This answers the PRESENCE rung of the Founder's "is every invention truly
   connected" ladder for this directory. It does NOT answer REACHABILITY or FED
   REAL DATA, and is not claimed to.

---

## Open, carried

- Live-observe `be2288c5` once the Workers deploy lands, ideally after a second
  story snapshot so the 25% → 50% transition is witnessed rather than reasoned.
- `HeroTruth.tsx:428` `?? "unknown"` — different type, and
  `heroTruthNullState.test.ts:88` PINS THE SPELLING. A test that pins a spelling
  does not defend a rule; it freezes one implementation of it.
- Still BLOCKED, unchanged: Gate 4 responsive proof (`outerWidth` pinned),
  `/journal` detail canvas (0 entries), the Level-2 depth family (Assets
  08/19/20), `executionConnectivity` orphaned.
