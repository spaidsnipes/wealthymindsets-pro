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

# AN OWNER BEATS A CONVENTION

**Block:** `cfa1eb3e` → `bb8c28bb` (five commits)
**Predecessor baton:** `WM-PRO-SHIFT-2026-09-18-THREE-COUNTS-ONE-INSTRUMENT.md`

---

## WHAT SHIPPED

| SHA | Atom | Live status |
|---|---|---|
| `cfa1eb3e` | A bubble's size and its sentence now claim the same number | pushed; **canvas has no DOM witness — unproven** |
| `ab574fe7` | Bubble size is a claim about the frame, not about one bar | pushed; **same — unproven** |
| `bd8b1d2e` | Saying nothing numeric became saying nothing at all | **LIVE — PROVEN** |
| `f6c516a6` | The suffix had an owner; the phrase did not | pushed; **observable only in a state I did not force** |
| `bb8c28bb` | The clip deleted pixels the receipt still counted | owner-proven; **live half PROVEN, corrected half not** |

---

## THE PROVEN ONE

Production `/command-deck?symbol=BTC`, one instant, one read:

```
EVIDENCE DEBT   6 OPEN · unpaid information
QUESTION FOCUS  Unpaid evidence: Direction + Location +4
```

2 named + 4 disclosed = 6, reconciling exactly with the cell beside it. Before
`bd8b1d2e` that line ended at "Location" — five unpaid, two named, and nothing
on the screen said so. Canon Weakness #1, two cells apart.

The file's own header had codified the wrong rule — *"the focus names the
sample and says nothing numeric"* — written to prevent a REAL defect (a count
derived from the capped array, which once rendered `9 evidence nodes unpaid:
regime + direction +1`). It banned the cure along with the disease. A test
asserted `not.toMatch(/\d/)`, so the incomplete rule had a guard. **A test that
fails on a correct change is its own defect**; it was replaced, not worked
around.

---

## THE LAW THIS BLOCK NAMED

Fixing `selectQuestionFocus` made it the **seventh** copy of the same three
lines. Auditing the other six found this:

| Call site | Branch | State |
|---|---|---|
| `selectOneStory.missingPhrase` | missing | correct |
| `selectOneStory.missingPhrase` | warn | correct |
| `computeRightOfWay` | missing | correct |
| `selectOneNextThing` | missing | correct |
| `CommandContextRibbon` detail | missing | correct |
| `CommandContextRibbon` detail | warn | **DRIFTED — no remainder** |

The sixth is **one line below the fifth, in one template literal, in one file.**
Five correct copies did not make the sixth correct; they only made it look
correct, because a reader scanning the file sees `hiddenRemainder` and stops.

> **A convention is re-decided at every call site, and the sixth decision was
> wrong.**

`hiddenRemainder` owned the `+N`. It did not own the three lines that must
surround it. `sampledLabelPhrase(labels, trueCount, {limit, lowercase})` now
does. §24: a second CALLER of one owner is fine; a second ANSWER is not.

Casing stayed a parameter because it is genuinely per-surface — the ribbon and
the story speak lowercase mid-sentence, the question focus speaks Title Case as
a label. That is typography, not a second answer about what is hidden.

**Evidence the migration is behaviour-preserving:** the full suite stayed green
across five call-site rewrites. That is the only evidence that the five
previously-correct sites emit byte-identical strings through the new owner.

**Mutation coverage, measured before and after:**

```
BEFORE  mutating a caller        →  3–4 tests fail
AFTER   mutating the owner       → 11 tests fail, codebase-wide, both directions
                                   (remainder-from-capped-array; drop-the-remainder)
```

---

## §13 LIVE VP RENDER GEOMETRY PROOF — OBSERVED

Production `/charts?symbol=BTC`, PROFILES → Session VP, read off the canvas
dataset:

```
vpRequested=1  vpDrawn=1  vpDeclined=0  vpRows=250  vpAxisClearance=6
canvas 1564x560 @ dpr 1 · no decline notice
```

The profile was requested, it drew, and the histogram cleared the price axis by
the 6px `VP_AXIS_MARGIN_PX` reserves. 250 rows into 560px is consistent — nothing
on this frame contradicts itself. **This gate is closed by observation, not
assumption.**

Before this read, the receipt was legitimately ABSENT on `/charts` and that was
correct: no profile was requested. Absence of a receipt is not a broken
renderer. The `PROFILES` dropdown shipped earlier this shift is what turned it
on, so the invention proved the invention.

### …and reading the loop to check that number found the next defect

`drawWMVP` clips the profile to pane 0 and says why: with indicator panes
stacked below, `priceToCoordinate` **extrapolates** prices outside pane 0 to
y-values beneath it, and without the clip the bars bleed into the
Speed-of-Tape / CVD panes.

Extrapolated coordinates are **finite**. `vpRowRect` therefore returns a
perfectly valid rectangle for them — its null case is *"the price scale could
not place this row"*, which is a different thing — and the loop counted every
one of those into `rowsPainted`. The canvas then threw the pixels away.

`vpRenderReceipt`'s own header forbids exactly this one level up:

> "A DRAWN column that painted zero rows is counted as DECLINED … a column that
> painted nothing is not a column the trader can see."

The row count is the number that decides it, and it was counting rows nobody
could see. **A receipt that counts clipped rows is certifying work, not
recording it.**

`vpRowVisible(rect, paneHeight)` now owns the decision. Intersection, not
containment — a row straddling the boundary IS partly visible, and the cheap
guard (`y >= 0 && y <= pane`) gets those wrong in the other direction. An
unreadable `paneHeight` returns true: this function may not invent a decline out
of a number it could not read, the rule `columnClearance` already follows two
files over.

---

## HONEST LIMITS — WHAT IS *NOT* PROVEN

1. **`bb8c28bb`'s corrected count is proven at the owner, not on the deck.** The
   pre-fix overcount is a reading of the loop, not a screenshot. I tried to force
   a live frame with indicator panes stacked; the Indicators menu's rows are not
   `button`/`li`/`[role]` elements, so the DOM channel could not enumerate or
   click them. Recorded as a limit rather than chased.
2. **`f6c516a6` has no live proof.** Its only observable change is the ribbon
   EVIDENCE tile's WARN detail, which needs `missing === 0 && warn > 2`. I did
   not force that state. The ribbon is a `.tsx` with no test file, so the WARN
   branch's repair is proven at the owner, not at the surface.
3. **`cfa1eb3e` / `ab574fe7` remain unproven.** Neither introduces a new
   user-facing string and canvas has no DOM witness.

---

## ADDENDUM — `6b2c1000` · `90d3f3d7` · AND TWO LIVE PROOFS

Two more atoms shipped after this baton was first sealed, and **both of the
"corrected but unproven" gripes above were closed by observation.**

### `6b2c1000` — WhyInspector: two of four truncations disclosed nothing

Four truncated lists in ONE component. `evidence group items` (4) and
`coverage channels` (6) each printed a "+N more". `contradictions` (5) and
`unknowns` (5) printed nothing. The two correct copies are the author's own
statement of what the other two were meant to do. `<MoreNotice>` now owns all
four; it takes the AUTHORITATIVE length and returns null rather than an empty
node when nothing is hidden.

**The NEXT list above called this one "weaker, the true count IS in the
header." That was right about the mitigation and wrong about the reach.**
`unknowns` is built from EIGHT dimensions in `chartMarketStatePublisher.ts:488`
(Direction, Location, Aggression, Regime, Structure, Volatility, Profile, Order
flow). A cold symbol resolves none of them. The cap of 5 is not defensive
padding — it is reached by any symbol WM has not yet observed.

**PROVEN LIVE.** Production `/command-deck?symbol=SOFI`, hero WHY inspector
open, one render:

```
UNKNOWNS (7) — WHY UNKNOWN
  Direction  · Location · Aggression · Regime · Volatility     ← 5 rows
  +2 more unknowns
```

5 printed + 2 disclosed = the 7 in the header. Before `6b2c1000` that list
simply stopped after Volatility. The null branch is proven too, on the same
build: `?symbol=BTC` shows `UNKNOWNS (4)` with four rows and **no** notice — a
"+0 more" is a pixel with nothing behind it, and none is drawn.

### `90d3f3d7` — ninth sighting: `selectMateriality.summary`

`reasons.slice(0, 2).map(REASON_LABEL).join(" · ")`. Four reason families are
independent and can all fire in one tick, so two could go unnamed.

**This one is STRONGER than the WhyInspector case, not weaker as the NEXT list
guessed.** `selectSecondaryNoise` forwards the string VERBATIM as a rendered
`detail` — its own comment says re-wording it would be a second answer — and
there is no true count printed beside it. With the WhyInspector lists a trader
who counts could find the gap in the section header. Here nothing on the screen
could. Now the ninth CALLER of `sampledLabelPhrase`.

`separator` joins `lowercase` as a parameter for the stated reason: the debt
phrases enumerate co-required evidence ("regime + direction"), the materiality
summary enumerates independent events ("decision changed · contradiction
surfaced"). Typography, not a second answer about what is hidden.

**NOT proven live** — needs a snapshot-to-snapshot transition firing 3+ reason
families, which is a state I did not force. Proven at the owner only.

### §PROVEN — four surfaces reconciling on one number, one instant

Production `/command-deck?symbol=BTC`, one read. The `sampledLabelPhrase`
migration touches four of these cells, and all four agree:

```
EVIDENCE DEBT   5 OPEN
EVIDENCE DEBT   1 of 6 paid
                5 evidence nodes unpaid: location + auction +3
QUESTION FOCUS  Unpaid evidence: Location + Auction +3
RIGHT OF WAY    evidence debt: need location + auction +3
```

2 named + 3 disclosed = 5, in four places, with 1 paid of 6 payable. The
earlier receipt in this baton reconciled TWO cells; this reconciles four.

**A correction against myself, recorded because the method matters more than
the result:** my first probe of this screen captured only 60 characters and
read `6 evidence nodes unpaid: location + auction +3` as a 6-vs-5 contradiction.
It was not. The leading count is `missing + warn`; the trailing semicolon my
regex had chopped off introduced the warn clause. **The defect was in the
instrument, not the product** — which is exactly the failure mode this whole
baton is about, pointed the other way.

### Species census — is there an instance ten?

Swept every `.slice(0, N)` in `src/`. The remainder are ring buffers
(`[...prev].slice(0, 20)`), ISO date slices (`toISOString().slice(0, 10)`),
and avatar initials — not decision-relevant lists compiled into a phrase. One
genuine candidate is left and it is weak: `profile/page.tsx:1086`
`recentEarnings.slice(0, 8)` off a ring already capped at 20. **The species is
closed at nine call sites, one owner.**

---

## SPECIES LEDGER — THIS REPO HAS NOW NAMED IT FOUR TIMES

**A CLAIM THAT IS NOT ITSELF CHECKED DRIFTS SILENTLY.**

Every instance in this block is one shape: a number or a picture asserted by one
piece of code, consumed by another, with nothing executable joining them.

- the capped array used as a count
- the sample printed without its remainder
- the sixth copy of a convention
- the clipped row counted as painted

The repair is always the same and it is never a number: **give the claim an
owner, and make the owner's answer the only answer.**

---

## NEXT

- Force `missing === 0 && warn > 2` on the deck to close `f6c516a6` live.
- Find a click path into the Indicators list (it is not DOM-enumerable through
  the current channel) to close `bb8c28bb`'s corrected half live.
- ~~Remaining truncation candidates~~ — **all three done and swept.** See the
  addendum: `6b2c1000` (WhyInspector, PROVEN LIVE), `90d3f3d7`
  (selectMateriality, proven at the owner). Census found no instance ten.
- `90d3f3d7` needs a live frame: force a snapshot transition firing 3+
  materiality reason families so `summary` renders a remainder on the deck.
- Open architectural question, unchanged: Decision Memory sealing still has
  **zero production callers**. Surface it; do not rush-wire it.

---

# ADDENDUM — A ROOM MAY NOT REBOOT THE MACHINE

`2dcb1fb6` · `83e8de81` · **PROVEN LIVE on wealthymindsetspro.com**

The fifth instance of the species, and the largest. It was not a number
this time. It was an ELEMENT TYPE.

## The defect

Every door in the OS frame -- the desktop rail's `RailLink` and the phone
bar's tile -- was a raw `<a href>`. A raw anchor is a DOCUMENT LOAD.

MEASURED LIVE. Clicked the rail's Charts door from `/command-deck`, then
read the Navigation Timing entry:

    navType "navigate" · loadEventEnd 745ms · 35 resources refetched
    a window global set one instant earlier: GONE

Crossing a room was a power cycle. The lost state is not incidental:
`priorStory` is the prior snapshot the canon §4 Auto-Quiet gate compares
against, and it lives in React state. Destroy it and SECONDARY NOISE can
only read "Unwatched" after every door, however long the trader has been
watching. **The frame that draws the memory chrome was the thing erasing
the memory.**

## How it was found

By an instrument failing. I clicked the header door expecting a soft
transition while probing something else entirely, and my own probe's
window global vanished with it. I first read that as a broken probe.

## The owner, and why it beat me by three

`2dcb1fb6` fixed the frame's two doors. It did not fix the species.
`83e8de81` ships the OWNER -- `src/lib/internalAnchorNavigation.sentinel.test.ts`
-- and lets it find the rest.

My hand census (a regex over literal `href="/..."`) found **four**.
The sentinel found **seven**. The three I missed were TEMPLATE literals
carrying a symbol across a door mid-decision:

    command-deck    href={`${INSTRUMENT_VIEW_ROUTE}?symbol=...&tf=...`}
    journal         href={`/command-deck?symbol=...`}
    ChartsDashboard href={`/command-deck?symbol=...&tf=...`}

plus a fourth in a file I had never opened, OpeningBellEvidence.

**That is the whole argument for an owner, demonstrated against me.**

## Instrument honesty

- It is a SOURCE SCAN and says so in its own header. That is weaker than
  measurement. It is also the right instrument here: the defect is an
  element type, and `next/link` and a raw anchor emit the IDENTICAL
  `<a href="...">` in static markup -- which is exactly why
  `ShellAccessParity`'s href and `>label</a>` assertions survived
  untouched. The difference exists only at runtime.
- The tag walker tracks brace depth and quoting rather than `[^>]*`,
  because `onClick={e => e.stopPropagation()}` ends a naive match before
  the href is seen. That shape is pinned as a unit test.
- The rule is a FILTER, not a ban. 13 anchors are genuinely external and
  an anchor is correct for them. A third test counts the externals and
  fails at zero, so the real rule can never pass vacuously.
- Comments are stripped first, so the rule judges code and never the
  prose above it quoting the forbidden syntax.
- `prefetch={false}` throughout, deliberately. Prefetching 22 rooms is a
  different claim about network cost. It was not measured. It does not
  belong here.

## Live proof (the acceptance evidence)

Planted `window.__probe` on `/command-deck`, clicked the rail's Charts
door, re-read in a separate call:

    pathNow          "/charts"
    PROBE_SURVIVED   true   · marker SOFT-NAV-PROOF-gdgzqg, 9178ms old
    navStartedAtUrl  "https://wealthymindsetspro.com/command-deck"
    resources        43 → 60 (appended to ONE timeline, not refetched)

`navStartedAtUrl` is the decisive field. The browser is displaying
`/charts` while the Navigation Timing entry still names `/command-deck`
-- it was never replaced, because no document was ever loaded.

Before: global GONE, 35 resources refetched.
After:  global ALIVE, one continuous session.

## Collateral repair, same species one level up

`journalPublicEvidence.test.ts` asserted `</a>` on the journal return
action while actually testing a 44px touch target. It now reads
`</Link>` and states in a comment that the element type is OWNED
elsewhere and this line must not re-decide it.

## Gates

    TSC EXIT=0 · VITEST EXIT=0 · 760 files · 9384 passed | 2 skipped

Mutation receipt for `2dcb1fb6`: revert `RailLink` to `<a>` → 3 tests
fail. Mutation receipt for `83e8de81` is real rather than synthetic --
the sentinel was written first and failed against production, naming all
seven files.

## CORRECTION -- I OVERCLAIMED THE MECHANISM, THEN MEASURED IT

The first draft of this addendum ended: *"`priorStory` now survives a
door."* **That sentence was wrong, and it was wrong in the specific way
this shift keeps warning about -- it was reasoned, not observed.**

Reading the source: `priorStory` is `React.useState` plus a `useRef`
INSIDE the deck component (`command-deck/page.tsx:737-738`). A soft
transition preserves the JS heap, module-level stores and the live tape
subscription. It does NOT preserve component state -- React unmounts the
deck when you cross to another room. So the mechanism claim was false.

Then I measured instead of reasoning, and the measurement disagreed with
BOTH the claim and the correction. Round trip through two doors,
deck -> /charts -> deck, probe alive the whole way:

    path                 /command-deck
    probeStillAlive      true
    SECONDARY NOISE      "Quieted"
    detail               "Compared against the last reading;
                          nothing decision-relevant moved."
    saysUnwatched        false

**Observed: after a door round-trip the deck has a prior reading to
compare against.** Not "Unwatched".

What is honestly established, and what is not:

- ESTABLISHED, observed: crossing a door is now a client-side
  transition (`navStartedAtUrl` unchanged, probe alive, resources
  appended). And on arrival the Auto-Quiet cell reads a real
  comparison rather than the first-reading state.
- NOT ESTABLISHED: *why*. The likely path is that the warm module-level
  store delivers a second reading immediately on remount instead of
  after a cold fetch, so a genuine prior->current pair forms inside the
  newly mounted deck. That is a HYPOTHESIS. It has not been measured.
- NOT ESTABLISHED: the pre-fix reading of this exact cell. I inferred
  it would say "Unwatched"; I never observed it. The comparison
  "before it could only say Unwatched" is therefore NOT a measurement
  and must not be quoted as one.

The sentence that was wrong survived three of my own passes because it
sounded like the rest of the document. **A claim that is not itself
checked drifts silently -- including a claim in the baton that names
the species.**

## What this unblocks

`90d3f3d7`'s live materiality frame no longer has to fight a reset on
every door: the deck arrives holding a comparison. What is still needed
is a transition firing 3+ materiality reason families so `summary`
renders a remainder -- today's live frame read "nothing decision-relevant
moved", which is the QUIETED branch, not the ACTIVE one.

## Open, newly surfaced

Whether the Auto-Quiet prior SHOULD live in component state at all is a
real architectural question this exposed. If the product's claim is that
it remembers how long the trader has been watching, an owner outside the
component is the shape that makes the claim checkable. Surfaced, not
rush-wired.
