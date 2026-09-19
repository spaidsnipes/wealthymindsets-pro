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

# WM PRO — THE LAYER WAS LIVE, CORRECT, AND INVISIBLE

**Sealed** 2026-09-17. Continues `WM-PRO-SHIFT-2026-09-17-THE-SLOT-IS-WHAT-THE-TRADER-READS.md`.

Five commits. Every atom after the first was found by USING the deployed
product — opening the drawer, looking at the frame — not by reading source.
Three are live-proven with observation recorded below; one is pushed and
deployed-unverified at seal time; one is pushed and not yet built. That
distinction is the point of this document and is never blurred.

---

## THE TWO LAWS THIS BLOCK RAN INTO

> **A layer that renders correctly into a space too small to read has not
> shipped.**

The absorption anatomy field was live, arithmetically right, and drawing every
frame for an unknown number of days. It was also invisible, because its window
was pinned in BARS while the number of bars on screen is pinned at nothing.
Every gate was green the whole time. No test can catch this; only looking can.

> **Removing four voices and adding one is a net change of nothing, dressed up.**

Carried forward from the previous block and tested twice more here.

---

## ATOM 1 — `9a0da979` — five tiles, one fact

**THE EMERGENT DEFECT.** The Smart Money drawer rendered five tiles each
correctly explaining, in its own voice, that NQ1! carries no aggressor-tagged
tape. Every sentence was true. Each was right in isolation. The defect existed
ONLY because they were rendered together: a trader scrolling that drawer read
the same bad news five times and had to work out unaided that it was one piece
of bad news, not five independent failures.

Five absences look like a broken product. One named absence with five
consequences is a diagnosis.

Shipped `selectMissingTapeBanner` — owns the AGGREGATION and nothing else. The
sentence is passed through VERBATIM from `aggressorTapeReason`, which already
derives it from `classifySymbol` + `capabilityRegistry`. 12 tests, including
one that fails if the banner ever paraphrases.

**LIVE-PROVEN.** Observed on prod, NQ1!, Smart Money drawer:

```
⚠ MISSING INPUT · AGGRESSOR-TAGGED TAPE
No source WM reads signs a buy/sell side for futures, so there is no
tug-of-war to measure on NQ1!. This is not absent right now — it is not
carried here at all, and waiting will not change it.
5 READINGS BELOW CANNOT BE TAKEN
[Delta domination] [Tape pressure] [Delta bubbles by level]
[Value candle · center of gravity] [Delta divergence]
```

---

## ATOM 2 — `0e686585` — the window follows the eye

**MEASURED FAILURE, FROM USE.** The absorption field was pinned to the trailing
30 bars. At default zoom the chart draws several hundred, so the field
collapsed into a sliver at the right edge, underneath the volume profile, and
stayed unreadable at every zoom step tried. **The layer was live, correct, and
invisible.**

A fixed bar count cannot be right, because the question the field answers —
*was the effort in front of me paid for?* — is asked about whatever the trader
is looking at. The window is now `getVisibleLogicalRange()`, capped at 240
columns so strata stay thicker than a pixel. Not `slice(-N)`: a trader scrolled
back into history gets the field over the bars actually in front of them.

Consequences that fell out of the same change:

- The dashed window edge is now drawn **only when the cap bites**. With a
  view-following window the field's left edge is normally the chart's left
  edge, where a dashed line would mark nothing.
- `LAST N BARS` → `N BARS IN VIEW`. On a scrolled-back chart they are
  emphatically not the last, and the old label was a small lie.
- No floor is enforced. A span too small to measure flows into the selector,
  returns `UNMEASURED`, and lands in the existing refusal branch — one fewer
  place deciding what "enough" means.

**LIVE-PROVEN, AND IT UNBLOCKED A LONG-STANDING UNKNOWN.** After deploy, on
NQ1! 15m, the gold strata fill the frame with candles fully legible underneath,
and — for the **first time ever observed** — the ABSORPTION ZONE bands and
chips rendered:

```
ABSORPTION 6.59 STRONG
ABSORPTION 3.86 M…
```

Canvas dataset, published by the painter itself:
`absorptionBasis="VOLUME"`, `absorptionZones="2"`.

Until this moment the zone band — the mockup's headline mark — had never been
observed rendering live, and that was recorded as an open unknown across
multiple batons. It was never broken. It was drawn into a sliver.

**NOT OBSERVED:** the `N BARS IN VIEW` label sits at canvas y≈542 → screen
y≈718, below the 640px viewport of the capture. Not claimed.

---

## ATOM 3 — `2023b0e8` — the last two voices defer

**FOUND BY USING ATOM 1.** With the banner deployed and working, two of the
five readings it names — WM Value Candle and Delta Divergence — went on
printing their own paragraph about the same absence a few hundred pixels below
it. Three voices had been removed and two were still talking. The banner made
the repetition MORE obvious, not less: the drawer named the reading as blocked,
and the reading then explained why in different words.

Both panels are reusable on surfaces with no banner over them, where the full
sentence is the only honest render. So the fix is a prop the SURFACE sets, not
a rewrite: `absenceDeclaredAbove`, default false. The drawer passes
`missingTape !== null` — the banner's own PRESENCE, not a re-derived condition
— so the deferral and the declaration cannot drift apart.

**SENTINEL, MUTATION-VERIFIED — AND THE FIRST VERSION WAS FAKE-GREEN.** The
new assertion matched `/absenceDeclaredAbove\s*\?/` and was satisfied by the
OPTIONAL-PROPERTY question mark in the interface (`readonly
absenceDeclaredAbove?: boolean`). It stayed green when the branch was replaced
with `false`. Caught only by mutating the source and watching the test NOT
fail. The assertion now includes the deferral text; the same mutation now
fails it.

> **A Sentinel you have not tried to break is a Sentinel you do not know the
> strength of.** This one would have shipped as a permanently-passing decoration.

**STATUS: pushed, gates green, NOT yet observed live at seal time.**

---

## ATOM 4 — `52c5eae5` — the chip was clamped off the left only

**FOUND BY LOOKING AT ATOM 2's OWN PROOF.** In the very screenshot that proved
the zones render, the upper chip read `ABSORPTION 3.86 M` with the strength
word sliced off at the plot edge. `chipX` clamped only the LEFT edge —
survivable while the window was pinned to a trailing sliver, broken the moment
the zones moved out to the live edge.

MODERATE and MASSIVE both begin "M", so the truncation did not merely look
unfinished; it made the chip ambiguous about the one word it exists to deliver.

**STATUS: pushed, gates green, not yet built at seal time.**

---

## GATES

Every commit in this block ran `./node_modules/.bin/tsc --noEmit` and
`./node_modules/.bin/vitest run` UNPIPED, both exit 0. Final suite: 733 files,
9004 passed, 2 skipped.

Sentinels: `ec07777f` success · `62c2ad40` success · `9a0da979` success.
`0e686585` was CANCELLED by the next push (normal supersession, not a failure).
`2023b0e8` and `52c5eae5` were still running at seal time — **unchecked, not
claimed.**

---

## HONEST OPEN ITEMS

- `2023b0e8` (the deferral) and `52c5eae5` (the chip clamp) are pushed but
  their live behaviour has NOT been observed. Next session: probe for
  `"Blocked by the missing input named"` in the deployed bundle, then open the
  drawer on NQ1! and confirm the two panels are one line, not a paragraph.
- Sentinel conclusions for `2023b0e8` and `52c5eae5` not yet read.
- The `N BARS IN VIEW` label and the dashed window edge have not been VISUALLY
  confirmed — the first sits below the capture viewport and the second only
  draws when the 240-column cap bites.
- **Two owners of "absorption" still coexist on one screen** —
  `selectAbsorptionAnatomy` on the chart and `selectAbsorption` in the drawer,
  under one identical headline. Latent confusion, not currently a
  contradiction. Named here so it is not discovered twice.
- Remaining FIRST TASK scope: `StackedImbalancePanel.tsx` and the
  DECISION/MARKET/NOW/RISK/WHY/NEXT right rail.
- Untouched §13 gates: Delta Bubbles level ownership; Live VP render geometry
  proof; Decision Memory has zero production callers (architectural — surface,
  do not rush-wire); paper execution state machine realism.
- BLOCKED, unchanged: Gate 4 responsive device proof (programmatic window
  resize does not take effect, `outerWidth` pinned); `/journal` detail canvas
  (0 journal entries exist).
