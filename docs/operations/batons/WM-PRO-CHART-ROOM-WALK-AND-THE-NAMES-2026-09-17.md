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

# THE CHART ROOM WALK, A SECOND LEAKED NAME, AND THE END OF ENUMERATING

Date: 2026-09-17
Commits: `08d335fd` (the structure note speaks the four dimensions), `8f9403c2`
(the product-wide JSX ban)
CI: `35211368326` success · run for `8f9403c2` watched separately
Live: https://wealthymindsetspro.com/charts · https://wealthymindsetspro.com/command-deck

## THE FOUNDER'S ACCEPTANCE TEST, WALKED ON THE CHART

The directive names the chart explicitly — "a preview/widget lets the trader see
consequential information while remaining on the chart" — so the journey was
measured there, from the NORMAL URL, at every stage. Not inferred:

| Stage | Rect | Body | Notes |
| --- | --- | --- | --- |
| PREVIEW | `420×129` at `(1482,693)` | 89 chars | real counts `0 resolved / 8 missing / 11 blocking`, subject `NQ1! · 1h` |
| DRAWER | `420×434` at `(1482,388)` | 658 chars | `detailsDepth: 0`; the chart's 9 canvases still mounted |
| ENTER | `1920×840` at origin | 784 chars | reached by CLICKING `equipment-enter`, carries "Return to room" |
| RETURN | `420×129` at `(1482,693)` | 89 chars | **byte-identical rect**, same subject |

RETURN restoring the preview rectangle exactly is the directive's "return
without losing my place", measured rather than asserted. PASS.

## THE SCREENSHOT WAS THE DETECTOR, AGAIN

The Founder screenshot required by the directive is what found the next defect —
not the suite, which was green at 8552.

`StructureContextNote.tsx` rendered the literal label **"DLAR narrative:"**.
DLAR is OUR acronym for Direction / Location / Aggression / Response.
`DLARStrip` has always put the four EXPANDED words on its chips and has never
once shown the trader the initialism, so the same screen said the four words in
one place and our shorthand in another, and there was nowhere the trader could
have learned the shorthand. Fixed to the four words the chips already use.

That is the SECOND instance of one defect class in one day — the first was
ATHOS in the session-watch drawer copy. Both invisible to the suite. Both
visible on sight.

## TWO FALSE POSITIVES REFUSED, ONE REAL SELF-INFLICTED ERROR FOUND

Worth recording because the refusals cost as much judgement as the fix.

1. **Cold-URL `stage=full` silently became `stage=preview`.** Called a painted
   door, then read `equipmentChannel.ts`: the behaviour is deliberate and
   documented — the full experience has a RETURN control whose whole promise is
   "the room you left", and a tab that opened straight into it has no such room.
   My cold-URL test was the WRONG INSTRUMENT. Re-tested by clicking the real
   control; `stage=full` appeared correctly.
2. **"CLC setup evidence required"** looked like an ATHOS-class leak. Checked:
   `/education` lesson 5 is "CLC Rule — Context + Location + Confirmation" and
   `/journal` offers "CLC Long" / "CLC Short" as setup names the trader picks by
   hand. Taught vocabulary. Copy left alone.

3. **The real error was mine.** My own `INTERNAL_NAMES` ban-list shipped with
   FOUR names, and two were guesses written because they LOOKED internal —
   exactly what the comment above the list claimed it was not doing. `CLC` is
   taught (above); `NECTAR` is a shipped route (`/nectar`, `/nectar/[symbol]`,
   rendered by `DataHealth.tsx`). A name the product navigates to cannot be a
   name the product hides, and banning `CLC` would have forced a future author
   to rename a concept the product spends four hours teaching — a rule whose
   cheapest cure is the disease. Narrowed to two. The standard is now written
   down: **show the trader is never taught it and never navigates to it.
   Looking internal is not evidence.**

## THE RULE STOPPED ENUMERATING

Both leaks were pinned afterwards BY COMPONENT NAME. That list is literally
"the components we have already been burned by", and this codebase has already
paid for enumeration twice — a rule that lists its members cannot notice a new
one. The third leak would have shipped exactly as the first two did.

`theTraderNeverReadsOurNames.test.ts` checks the CRITERION over every `.tsx`
under `src/`: no JSX text may speak one of our names.

**It uses the TypeScript parser, and that is the point.** The first copy
sentinel in this repo tried `/"([^"\\]{8,})"/g` and matched the GAPS BETWEEN
literals. `ts.SyntaxKind.JsxText` is exactly the characters a browser paints,
and an identifier is never one — so `ATHOSInterventionPanel` in an import and
`chainVm.dlar` inside a `{}` expression are invisible to the scan with **zero
whitelist entries**. That is the ambiguity the earlier rules could not escape:
a `/DLAR/` source scan would have had to ban the component's legitimate read of
`vm.dlar.narrative` or whitelist it and then miss the text node one token away
on the SAME LINE.

The list moved to `src/lib/design/internalNames.ts` so one security decision
stops living in three files — the drift that produced both defects in the first
place. Ledgered in `screenReach` as `OPS_TOOLING` with its reason.

Probed RED both ways before it was trusted:
- restoring `"DLAR narrative:"` → red, naming `StructureContextNote.tsx:73` and
  quoting the sentence;
- emptying the extractor → red on the **control**, not on the ban, which is the
  assertion that stops a ban over an empty array from passing forever.

## THE LIVE PROOF, AND ITS HONEST LIMIT

`StructureContextNote` only renders when `auction.verdict === "FAILING"` and
direction resolves LONG/SHORT. On prod right now it does not render, so
"`DLAR` is absent from `document.body.innerText`" is a WEAK absence — it would
be true of a broken component too.

The strong instrument was the shipped bundle. Fetching every `.js` resource the
browser loaded on `/command-deck` (21 files):

```
newCopy: 05st0hnwp36vj.js   ← contains "Direction, location, aggression, response"
oldCopy: null               ← zero occurrences of "DLAR narrative"
```

That is a live observation of deployed code, and it does not depend on the
contradiction branch being reachable today. **The contradiction branch itself
was NOT observed rendering on prod.** It is proved by the rendering test and
the bundle, not by eye. Do not claim otherwise.

## THE NEW RULE PAID FOR ITSELF THE SAME HOUR

The extractor built for the names was pointed at DATA PROVIDER names across all
202 `.tsx` files. It returned exactly one hit:

```
src/app/backtesting/page.tsx
  336: Live data — real Yahoo OHLCV bars
FILES WITH HITS: 1
```

One line, **two defects**, and neither was a name problem in the sense the rule
was written for:

1. **"Live data" on a BACKTESTER.** `backtest/engine.ts:fetchBars` requests
   `bars=3000` from `/api/yahoo` — historical candles. Nothing about them is
   live. Same overclaim class as the `/paper` "LIVE PRICES" strip already fixed
   in shift H.
2. **"Yahoo".** The Visual Systems Canon quarantines "old provider-specific
   status strips" BY NAME, and the interaction directive bans exposing provider
   internals. Which vendor fills the bars is plumbing; the trader's question is
   whether the bars are real.

Both cured by one label the canon ALREADY OWNED —
`CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED` ("OHLCV bars have been
verified end-to-end"). Imported, not retyped, so a canon amendment reaches this
strip. The `Zap` icon went with the words: live-energy iconography was the
picture half of the same overclaim, replaced with `CheckCircle`.

Note what the EXISTING guard could not do. `QUARANTINED_FIDELITY_PHRASES` is a
four-entry list — `NO FEED`, `OHLCV ONLY`, `OHLC ONLY`, `DELAYED 15 MIN`. It is
an ENUMERATION, and "Live data — real Yahoo OHLCV bars" is not on it. That is
the third time today the same shape failed, and the second time the criterion
check caught what the list missed.

Re-scan after the fix: `FILES WITH HITS: 0`.

**Live on prod `/backtesting`, and this one is a STRONG proof** — unlike the
`DLAR` fix above, this strip renders unconditionally, so absence means absence:

```
yahooOnScreen:            false
liveDataOnScreen:         false
historicalBarsVerified:   true
strip rect:               151×15 at (622,101), 1 match, check icon present
```

Then pinned, because the fix could regress silently and the existing guard would
not have noticed. `PROVIDER_NAMES` is a SEPARATE export from `INTERNAL_NAMES`,
not an append: the bans have different reasons and so different bars for
admission, and one docblock covering both would hand the next author the wrong
bar. The refusals are the entries that matter — **`Polygon` is NOT banned**
(`ChartToolbar:218` lists it as the crypto asset MATIC, it is also an SVG
element and a drawing shape), and brokers are permanently ineligible because the
trader connects them BY NAME. That is the CLC error one list later, caught this
time before it shipped: *"looks like a vendor"* is no better evidence than
*"looks internal"*.

`/readiness` says provider names and passes, because it renders them through an
EXPRESSION rather than a JsxText node. Correct rather than lucky — honest
disclosure is the opposite of a leak, and the parser draws that line for free.

Probed red both ways: restoring the sentence names `backtesting/page.tsx:361`
and quotes it; blinding the extractor goes red on the CONTROL while all four
bans pass green.

## A THIRD RULE CONSIDERED AND REFUSED

The `/backtesting` line carried a LIVENESS overclaim as well as a vendor name,
so the obvious next move was a third ban on liveness words. The scan found two
sites and **both are legitimate**, which is the finding:

- `paper/page.tsx:2888` — "premium trade ideas, real-time alerts" describes
  **Upside Only, an external partner platform**, inside a card headed "Partner
  Platform" with a link off-site. WM is not claiming its own data is real-time;
  it is describing somebody else's product.
- `radio/page.tsx:579` — "STREAMING LIVE" is gated on `now.type === "station"`,
  and the gate is real: stations are dispatched with `duration: 0` and a stream
  URL, episodes carry a duration and render a seek bar instead (`page.tsx:563`
  vs `:576`). A continuous stream saying it is streaming is simply true.

So no rule was written. A `/\bLIVE\b/` ban would forbid a radio player from
saying it is on the air, and the canon's own labels contain the word LIVE —
`LIVE — CERTIFIED QUOTE`. **The liveness defect is a claim about MARKET DATA
FIDELITY, and that is a property of the value being labelled, not of the words
used.** A JSX-text scan cannot see it, and pretending otherwise would have
produced the fourth enumeration in a day. The instrument for that class is
`canonicalFidelityLabels` at the point the label is CHOSEN.

Recorded so the next author does not re-derive this and reach the opposite
conclusion.

## A SUBTRACTION DELIBERATELY NOT MADE

The deck's second `MarketCanvasPanel` mount (`page.tsx:~2260`) sits inside a
`<details>` and is strictly shallower than the equipment tenant, so removing it
looked like a clean win for the directive's ban on hunting through
implementation containers. `buriedOnlyIsARegister` already ruled on this: two
existing Sentinels pin that mount as intentional scene composition, and
"writing a rule that forces a visible subtraction is how a Sentinel starts
deciding the product." Left in place. **DECISION REQUESTED**, still.

## THE CHART ROOM HAS NO THIRD TENANT, AND THAT IS THE ANSWER

The directive's next step is "reuse that proven interaction grammar across the
remaining legitimate WM Pro inventions", so the chart Room was audited for a
third piece of equipment. It does not have one, and the reason is worth keeping.

Both existing tenants were built under one rule, stated in the code: a tenant
reuses an ALREADY-COMPILED memo, because a second `useMarketCanvasVM` call
"would be the second semantic brain the grammar bans, just one that happened to
agree most of the time." `market-object-passport` qualified on a second test —
correct intelligence with ZERO DOORS (its only path was a `<details>` nested in
a drawer behind a trigger gated on `narrowViewport || optionsOpen`, i.e. no path
at all on a desktop Chart tab).

`ChartsDashboard` compiles exactly two view-models — `chartPassportVM` and
`chartFlowSnap` — and **both already have doors**: the passport is the second
tenant, and `chartFlowSnap` already feeds the capability report that lights the
ORDER FLOW chip. There is nothing compiled-but-unreachable left in this room.

The deck's other six (`behaviour-mirror`, `personal-edge`, `learning-genome`,
`practice-honesty`, `session-watch`, `decision-chain`) are about the TRADER, not
about the market object in front of them. Moving them onto the chart is the
directive's own named failure — "permanently displaying every invention on
MARKET" and "permanent card farms" — dressed as propagation.

**So the correct action was to add nothing.** Recorded because "the grammar was
not reused further" reads like unfinished work, and it is not: the room's
supply of honest tenants is exhausted, and the next one has to arrive as a new
compiled intelligence with a reason to exist, not as a card moved between rooms.

## UNCHANGED

- `/journal` detail canvas — 0 entries. Will not fabricate entries into the
  Founder's production localStorage to manufacture a screenshot.
- Gate 4 responsive device proof — programmatic window resize does not take
  effect; `outerWidth` stays pinned.
- `DecisionWhyPanel` IS the drawer; needs a Founder ruling before it can be a
  tenant of itself. `WhyInspector` is target-driven and may not be standing
  equipment at all.
- ENTER on equipment with nothing deeper is a silent no-op. Curing it needs the
  Room to know the equipment's CONTENTS — the second semantic brain the
  directive bans by name.
