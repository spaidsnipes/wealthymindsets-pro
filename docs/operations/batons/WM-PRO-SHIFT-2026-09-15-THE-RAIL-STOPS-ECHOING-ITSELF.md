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

# WM PRO SHIFT BATON — 2026-09-15 — THE RAIL STOPS ECHOING ITSELF

Four commits. The `/charts` decision rail is the subject of all four. Each one
removes a place where the rail said something it had not earned the right to
say — a label with no owner, a gate with no self-report, a cell that restated
its neighbour, and a void that denied two cells were related.

| SHA | Law | Files |
|---|---|---|
| `1fc7975` | (ii) A LABEL IS NOT AN OWNER | spine NOW |
| `f12087f` | (jj) AN UNMEASURED NO IS STILL AN UNMEASURED CLAIM | /copy-trading |
| `c5d48ac` | (kk) A NEXT THAT REPEATS NOW IS NOT A NEXT | spine NEXT |
| `3a7ed4e` | (ll) A VOID BETWEEN TWO CELLS IS A CLAIM THAT THEY ARE UNRELATED | spine layout |

---

## (kk) A NEXT THAT REPEATS NOW IS NOT A NEXT — `c5d48ac`

The rail's last cell, labelled NEXT, printed the Right-of-Way verdict. So the
rail read `WAIT` in the gold chip and `WAIT` again under NEXT, under two
labels, from one producer.

This was **not** a two-owner defect. Both values trace to `computeRightOfWay`,
so they could never disagree. It was worse in a quieter way: one cell of a
seven-cell rail spent itself restating a conclusion the trader had already
read, while the question NEXT exists to answer went unasked.

The Founder canon is explicit:

> NOW — current market/job state. NEXT — one decision-relevant thing capable
> of changing the job.

`WAIT` is not capable of changing the job. `WAIT` **is** the job. Naming it
under NEXT is a category error that happens to be true, which is the hardest
kind to see.

**Fix:** `src/lib/marketData/viewModels/selectOneNextThing.ts` — a pure
selector compiling the actual next thing from the SAME inputs the verdict came
from. No new owner, no second brain, no fetch, no clock. It derives; it does
not measure. When nothing can honestly be named, it says so rather than
inventing a task.

Singular on purpose: nine unpaid evidence nodes produce ONE next thing — the
first — with the remaining eight disclosed as a count, never as a list. A
"next thing" that is nine things is a backlog, and the trader is back to
scanning.

**No prop threading was needed.** `selectOneStory` already returns
`debt: EvidenceDebt | null` alongside the reading (`selectOneStory.ts:82`).
The rail had both halves in hand and was using neither.

**Total-map guard.** `VERDICT_WORDS` is declared `Record<RightOfWay, true>`, so
a sixth verdict added to the compiler fails the build here rather than silently
becoming a legal "next thing" and quietly restoring this exact defect.

**Sentinels:** 15 tests. `× THE ECHOED VERDICT` loops all five readings ×
`hasExpression` × three debt shapes and asserts no headline is ever a verdict
word. `× THE VERDICT DETECTOR IS REAL` proves that assertion non-vacuous.
`× THE DEAD IMPORT` asserts the occurrence count of `selectOneNextThing` in
`DecisionSpineBand.tsx` is **> 1** — an import alone can satisfy a truth
sentinel, so counting once is not enough. `× THE RESURRECTED ECHO` names the
reverted form literally, which is why the JSX comment beside the cell describes
that form without spelling it: **the spelling must appear nowhere but the
guard.**

---

## (ll) A VOID BETWEEN TWO CELLS IS A CLAIM THAT THEY ARE UNRELATED — `3a7ed4e`

The rail parked NEXT with `margin-top: auto`. In a flex column that eats every
spare pixel, so NEXT sat at the bottom and the gap landed mid-column. Measured
on a live render: roughly two hundred pixels of nothing between WHY and NEXT.

Already poor composition. It became **wrong** in `c5d48ac`, when NEXT stopped
echoing the verdict and started compiling an act DERIVED from the evidence WHY
displays. "Resolve regime — the first of 9 unpaid evidence nodes" is the same
permission story WHY is telling, one layer down. Severing them with a void says
they are separate concerns. They are not.

Spare space now falls at the END of the column, where empty space reads as
margin rather than as a break in the argument.

---

## NEW NAMED HAZARD — A TEST CAN PIN A DEFECT AS EASILY AS A FIX

The void was **protected by a test**. `DecisionSpineBand.test.tsx` asserted
`expect(html).toContain("margin-top:auto")`. Removing the defect broke a
green suite.

It hid because a grep for `marginTop` — the JSX camelCase spelling — returned
nothing. The test pinned the **rendered kebab-case CSS**, a different string
for the same fact.

> **Operating rule:** when checking whether a style is pinned, grep BOTH the
> JSX camelCase and the rendered kebab-case spelling.

The line is replaced by `× THE SEVERING VOID`, which asserts the opposite and
proves non-vacuity by checking the rail and band projections actually differ.

A related sweep found three older tests in the same file asserting the (kk)
defect directly — `toContain(">WAIT<")`, `">ACTION<"`, `">UNKNOWN<"` inside the
NEXT cell. The describe block was re-aimed with a SUPERSEDED doc-comment, and
its one durable guarantee (never `[object Object]`) preserved verbatim.

---

## §22 ORKIN REVIVALS — three, all VALID

Each defect reintroduced via the Edit tool only, confirmed to COMPILE, confirmed
to fail its Sentinel BY NAME, restored byte-identical. *A revival that does not
compile is invalid.*

| # | Revived form | tsc | Caught by |
|---|---|---|---|
| A | `oneStory.decision.value` back in the NEXT cell | 0 | `× THE RESURRECTED ECHO` + 2 rail tests |
| B | `hiddenRemainder(debt.missingLabels.length, 1)` | 0 | `× THE CAPPED REMAINDER` |
| C | `marginTop: rail ? "auto" : undefined` restored | 0 | `× THE SEVERING VOID` |

Revival B is the "9 nodes … +1" defect: deriving the remainder from the
**capped sample array** instead of the authoritative count.

---

## GATES

- `tsc --noEmit` → **EXIT=0** (unpiped)
- `./node_modules/.bin/vitest run` → **EXIT=0**, **626 files / 7451 tests**
- Prod parity: `wealthymindsetspro.com` serves `3a7ed4e`, built `2026-09-15T23:39:09Z`

## PIXEL PROOF — LIVE OBSERVED, not deploy-identity

Both laws proven by render on the Founder's own display, a BEFORE and an AFTER
minutes apart at the same width.

| | BEFORE | AFTER |
|---|---|---|
| NEXT headline | `WAIT` — the verdict, echoed | `Resolve regime` — a compiled act |
| NEXT detail | "evidence debt: need regime + direction +7" | "regime is the first of 9 unpaid evidence nodes (+8 behind it). Resolving it does not authorise entry — it removes one block." |
| WHY → NEXT | ~200px void, NEXT at column bottom | zero gap, NEXT directly under WHY |

**Honest note on how the AFTER was obtained.** Chrome is granted to computer-use
at tier **"read"** — screenshots yes, clicks and keystrokes no, and a focused
tab cannot be reloaded from that channel. The Founder's open `/charts` tab was
running a pre-`c5d48ac` bundle and *still showed the defect after the deploy
had landed*. That stale frame is what serves as the BEFORE. The AFTER required
navigating a fresh tab through the browser-control MCP. This is recorded because
**a stale tab is indistinguishable from a failed fix if you do not check the
bundle**, and reading a stale tab as "the fix didn't work" is exactly the kind
of false negative that wastes a shift.

---

## HONEST NON-FINDINGS — investigated, deliberately not "fixed"

- **`/creator`** — `CREATORS = []`, but the page already renders an empty state
  and its copy already reads "Proposed", "Payments are not active yet", "This
  page previews a proposed program". Already discloses. Not a defect.
- **`/command-deck` NEXT cell** — `OneStoryStrip` has no NEXT cell. Declined to
  add one: ANTI-BLOAT LAW, NO SECOND-APP LAW, and ASSET-10 HOME LAW (`/charts`
  is the only home room). `commandDeckClutterConservation.test.ts` enforces a
  budget that this would have spent.
- **`OpeningBellPanel.tsx` (196 lines), `ConnectedStoryRibbon.tsx` (65 lines)** —
  confirmed zero external references. Not Founder-visible; retiring them fails
  the SAME-APP REJECTION TEST as a use of shift time. Recorded, not acted on.

## STILL BLOCKED — do not re-open without new evidence

- Decision Memory sealing — zero production callers. **Architectural: needs a
  decision surface first. Do not rush-wire to close a gate.**
- `executionConnectivity` orphaned — not a live defect; `/readiness` discloses.
- Gate 4 responsive proof — programmatic resize does not take effect; the
  phone-parity script route is **classifier-denied, do not retry**.
- `/journal` detail canvas, `/proof-lane` MEASURED JOURNAL — 0 entries.
- Delta Bubbles / Live VP raster half — no per-trade tape on the free tier.
- `/paper` blotter — 0 orders. **No real trades to manufacture one.**

## NEXT ATOMS — measured, canon-named RETIREMENT PROOF

`/shop` "checkout not connected"; the `/vailbuild`→`/veddbuild`→`/partnerships`
redirect chain into `PARTNERS = []`; dead `NAV_ITEMS` at `MainLayout.tsx:776-782`;
empty modules `EPISODES` (`/radio`:140), `LOUNGE_TOP8` (`/lounge`:550),
`CIRCLE_OF_EXCELLENCE` (`/profile`:78); the 9-line `/signup` redirect stub.
