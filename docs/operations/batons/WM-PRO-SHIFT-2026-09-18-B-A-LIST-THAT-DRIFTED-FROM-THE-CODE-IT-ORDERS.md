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

# A LIST THAT DRIFTED FROM THE CODE IT ORDERS

**Shift** 2026-09-18 · **Commits** `343e22ff`, `c7ae2c46` · **Branch** main, pushed
**Gates** tsc EXIT=0 · vitest EXIT=0 (762 files, 9410 passed, 2 skipped)
**Live** OBSERVED on https://wealthymindsetspro.com — geometry and census below.

---

## THE FINDING

`docs/operations/CANON-VIEW-BUILD-ORDER-2026-09-17.md` opens by telling every
agent picking up this shift to read it FIRST. That makes it load-bearing: it is
not a note, it is **the instruction that decides what gets worked on**.

It had drifted from the code it orders.

It listed Asset 05 as the next thing to build. Asset 05 was already a live tab on
production, rendering `LARGE PRINTS · 6 cleared the cut` on BTC with its own cut
methodology printed on the surface. Delta Bubbles ownership and VP geometry both
already had adoption Sentinels. Decision Memory already had a documented
collision repair.

**NOTHING WAS WRONG WITH THE CODE.** The list had drifted from it, and three
atoms were spent re-opening work that had already shipped.

## WHY THIS IS THE SAME BUG AS `measuredNumber.ts`

A work-list retyped from memory at the start of every shift is a **CONVENTION**,
and a convention is re-decided at every call site. This repo closed that exact
law twice on the same day for number formatting. This is the third application,
and the target is the order of work itself.

The wrong decision a drifted work-list produces is not a broken pixel. It is a
whole shift spent re-proving something that was already true — and it **leaves no
trace, because re-opened work looks exactly like work.**

## THE FIX — TWO DIRECTIONS, BOTH GATED

`src/lib/charts/viewBuildOrder.sentinel.test.ts` (6 tests) holds the document
against `ALL_CATEGORY_TABS`:

- a **FALSE_RIPENESS guard** runs first — the doc must exceed 2000 chars, must
  still match `/reads THIS FILE FIRST/i`, and must carry ≥4 rows. A rename or a
  stub cannot make the later assertions pass over an empty array;
- no row may be called SHIPPED unless the view is really in the dropdown;
- **no row may be called TO-BUILD once the view IS in the dropdown** — the
  assertion that pays for the file;
- no `MICROSTRUCTURE_TABS` entry may exist in code without a row here;
- every row must name evidence, not just a state.

Mutation receipt: flipping `Big Trades` to `TO BUILD` goes red quoting the row
back by name. Restored, green.

## THE SENTINEL'S OWN BLIND SPOT BIT WITHIN ONE ATOM

The file stated what it could not see: *"prose elsewhere in the document
contradicting the table."* Minutes after it was committed, **two ungated claims
in the same document were found stale**:

| stale claim | why the table gate could not see it |
|---|---|
| Asset 06 acceptance row: *"a full-tab sibling of `Chart`, so the candles are not on screen at the same time. This is the honest gap and it is not yet closed."* | a claim about **LAYOUT**, not about dropdown membership |
| inherited status table: Assets 06 / 03 / 05 listed under `NOT BLOCKED, NOT PRIORITISED` while all three were live views | a claim about **PRIORITY**, not about dropdown membership |

Neither was reachable by comparing against `ALL_CATEGORY_TABS`. What they had in
common is that **neither carried a date.**

> **A STATUS WITH NO DATE CANNOT GO STALE. IT CAN ONLY BE WRONG QUIETLY.**

A reader had no way to tell "true today" from "true in September and never
revisited" — the safe reading and the wrong reading look identical. The second
gate therefore requires any build-status word outside the fenced table to sit in
a paragraph that also names a date or a commit. It does **not** check the date is
honest; nothing here can. It checks the claim is **DATEABLE**, which is what lets
a later reader distrust it.

Every row of the inherited status table now carries the date it was last true,
**including the rows that did not change.**

### THE UNIT IS A PARAGRAPH, NOT A LINE

The line-based first draft produced an immediate false positive: the date had
simply wrapped to the next line. Hard-wrapped markdown means a line is not a
claim — a paragraph is. Table rows are split out individually, because a row IS a
claim on its own. Recorded in the test so the next reader gets the lesson.

## THE CLAIM THAT WAS REASONED BEFORE IT WAS MEASURED

While gating the table I wrote that the four microstructure views render WITH the
candles "and it is now closed for all four." **I derived that from the comment in
`categoryTabsFor.ts`, not from a rendered frame** — which is the same move that
produced the drift: believing a source of words about the code instead of the
code's output.

It has since been measured. BTC · 15m, viewport 784px, `scrollY 0`:

```
price canvas   y 140 -> y 373     (3,134 inked samples, 7 distinct colours)
view heading   y 388
```

identically for all four — `Absorption Anatomy`, `AGGRESSION vs RESPONSE`,
`BIG TRADE INTELLIGENCE`, `LIVING PROFILE`. The Asset 06 PARTIAL is **CLOSED BY
OBSERVATION**. The sentence is kept in the document and annotated rather than
quietly corrected, because *the claim survived contact with a measurement — but
it was still a claim until it did.*

## THE TWELVE-TAB CENSUS — NO DEFECT FOUND

Driven on `/charts?symbol=TSLA` (equities expose six tabs that BTC hides).
Against the ladder PRESENCE → REACHABLE → FED / HONESTLY ABSENT:

| tab | state |
|---|---|
| Chart | FED — price canvas drawn |
| Absorption · Aggression · Big Trades · Value Profile | FED, and co-rendered with the candles at the geometry above |
| Options | PRESENT, co-renders with candles, prints `TSLA Options · Expression` and `—`. **No fabricated option chain.** |
| Profile · ETFs · Financials · Valuation · Corporate Actions · Shareholders | PRESENT + REACHABLE, all six disclose `Fundamentals provider — NOT CONFIGURED` and name the remedy |

**Every absence is disclosed by name. No tab lies.** `Value Profile` additionally
states its own provenance as `ESTIMATED FROM CANDLES` rather than implying true
traded volume.

**AND THE DISCLOSURE HAS AN OWNER, NOT A CONVENTION.** Six tabs render that
sentence; exactly one site emits it — `ChartsDashboard.tsx:3278`, driven by
`providerEdge.edge`. Six callers of one owner is fine. Six answers would not have
been (§24). This was checked precisely because the same shape — one question,
five or six independent sites — is what shipped three different number formats.

## WHAT THESE GATES CANNOT SEE

Stated in the file, and restated here so it is not lost:

- this is a **SOURCE-TEXT** assertion, strictly weaker than observing a rendered
  view on live tape;
- it cannot witness whether a SHIPPED view renders anything **honest** — the
  view's own tests and a live observation are the authority for that;
- it cannot verify the EVIDENCE column's commit SHAs are real;
- it cannot tell a truthful date from a date typed to silence the gate.

It closes ONE thing: the document cannot claim a view is still TO-BUILD once that
view is in the dropdown, a view cannot enter the dropdown unrecorded, and a
status cannot be stated in prose without being dateable. Each drift fails BY NAME.

## THE LAW THIS BLOCK ADDS

> **A STATUS WITH NO DATE CANNOT GO STALE; IT CAN ONLY BE WRONG QUIETLY.**
> Undated status is not modest — it is unfalsifiable. Dating a claim is what
> gives the next reader permission to doubt it.

And the corollary the measured-geometry section pays for:

> **A CLAIM DERIVED FROM A COMMENT ABOUT THE CODE IS NOT AN OBSERVATION OF THE
> CODE.** Believing words about the system instead of the system's output is the
> mechanism that drifted the build order in the first place. It does not stop
> being that mechanism when the words happen to be right.
