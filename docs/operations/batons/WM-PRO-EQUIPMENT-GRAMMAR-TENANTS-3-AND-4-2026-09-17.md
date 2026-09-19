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

# BATON — the equipment grammar stops being a demo

**Block:** `b2afde52` → `5ef0fe6f` (4 commits)
**Directive in force:** FOUNDER INTERACTION CUTOVER — ROOMS / WORKSPACE / DRAWER LOCK
**Closing clause being worked:** *"Then reuse that proven interaction grammar across the remaining legitimate WM Pro inventions."*

---

## What this block actually changed

Two inventions that a trader could not reach without hunting now have a
door. Both doors are the SAME door — the WORKSPACE rail the previous block
built — and neither invention was moved, un-collapsed, or deleted to make
room for it. That is the whole claim, and the register below is how it is
kept honest.

| | before | after |
|---|---|---|
| Decision chain | two `<details>` deep, no other path | one press from the rail, scene withholding carried with it |
| Behaviour mirror | one `<details>` deep AND phase-gated | one press from the rail, phase gate carried with it |
| deck buried-only register | 22 | **20** |

---

## 1. `b2afde52` — the register

`src/lib/design/buriedOnlyIsARegister.test.ts`.

A component is BURIED-ONLY in a room when EVERY one of its mounts sits
inside at least one `<details>`. Measured the day it was written:
`/command-deck` held 45 distinct components and **22** buried-only;
`/charts` held 61 and **0**.

It pins the SET, not a count. A budget of "no more than 22" passes a swap
— one invention surfaces, another is buried, the total holds, the rule
says nothing. The swap is the event worth seeing.

It is a REGISTER, not an approval list and not an eviction notice.
Several entries are correct by design (`StoryRibbon` belongs one layer
under One Story; `SectionBanner` / `Stat` are layout primitives). The
previous baton recorded why this matters: a first draft of the equipment
burial rule went red on the deck's second `MarketCanvasPanel` mount, which
two existing Sentinels pin as intentional scene composition. **Writing a
rule that forces a visible subtraction is how a Sentinel starts deciding
the product.**

It earned its keep immediately — the very next commit moved the number and
the register went red, forcing the edit to be explicit rather than silent.

---

## 2. `cb32c4e2` — the chain, tenant three

The room's most consequential reading had **zero** doors that were not a
second press. `roomAdoptsEquipment.sentinel.test.ts`'s burial rule could
not reach it, because that rule is stated per equipment DESCRIPTOR and the
chain was not equipment. That is the directive's failure clause verbatim —
*the intelligence exists but requires hunting through implementation
containers* — applied to the nine-node compilation that says whether a
trade may be taken.

The previous baton had recorded two blockers for enrolling it. Both are
resolved, and neither by lowering the bar:

**"`unabridged` needs an honest meaning first."** It uncaps per-node
evidence chips (cap 3 docked) with an ACCOUNTED `+N more evidence` chip
rather than a silent stop. Defaults `true`, so the sole existing in-room
mount loses nothing. An addition, never a subtraction.

**"The chain's `SceneAdmits` withholding must be carried with it, or the
rail offers a door the room has deliberately closed."** The gate is INSIDE
`renderDepth`; the preview's own verdict reads `WITHHELD` and the headline
prints the refusal sentence before the trader presses anything. A stated
refusal is not a painted door.

The numbered "Deep read" drawer section was NOT removed. The chain now has
a door in ADDITION to it — which is exactly why the register entry comes
off: buried-only means EVERY mount is buried, and that stopped being true.

**Re-pin:** `compileScene.enforcement.test.ts` went red, because it used
`gatedElementBody` (the FIRST `THESIS_GEOMETRY` gate only) and the new
mount lives in a SECOND gate keyed to the SAME element. Re-pinned to
`allGatedBodies` — a helper already in that file, written with the note
"a surface moved out of one gate and into no gate at all must fail; a
surface moved between two real gates must not." **Stronger than what it
replaced**: it now also catches a second gate keyed to a *different*
element, which the first-gate-only form could not. Given a vacuity control.

---

## 3. `5ef0fe6f` — the Mirror, tenant four

Three tenants proved the layer generalises across READINGS and across
ROOMS. All three are compiled from the tape. What was unproven is whether
the grammar carries the other half of WM Pro — the trader's own record —
or whether "equipment" had quietly come to mean "market widget". It
carries it, at the cost of one registry entry and one descriptor.

**The phase gate travels with it.**
`theMirrorIsNotAMarketPanel.enforcement.test.ts` pins REVIEW and POST_EXIT
as the only moments, with the reason in the file: *"A Mirror during
PREPARATION would be a different overclaim."* In PREPARATION the preview
reads `NOT YET` and names the moment to come back for.

**A silent truncation fixed on the way past.** Each pattern's `evidence`
was rendered `.slice(0, 2)` with nothing said about the rest — on the one
panel whose entire doctrine is that it reflects and never diagnoses. A
reflection that quietly withholds part of what it saw is a diagnosis
wearing a reflection's label. Docked now accounts the remainder; ENTER
uncaps it.

**`unabridged` defaults FALSE here, and that is the same rule as the
chain's TRUE.** The chain had no cap, so `true` changes nothing. The
Mirror has always shipped a cap of 2, so `false` changes nothing. The rule
is not the literal — it is that a new prop leaves every existing mount
exactly as the trader last saw it, and there are three of those
(`/command-deck`, `/journal`, `/morning-prep`) nobody asked this atom to
redesign.

**The compilation is hoisted.** `selectMirror` moved from inline-in-JSX to
a single `mirrorVm` memo. Two consumers reading two compilations would be
a second semantic brain in its worst possible location — the subject is
the trader themselves, rather than a market that is at least externally
checkable.

**Re-pin, and this one is the interesting failure.** The Mirror Sentinel
read `deck.slice(deck.indexOf("<MirrorPanel"))` and checked the FIRST
mount's props. Hoisting moved those props to `vm={mirrorVm}`, so the old
assertion **would have gone RED on a change that made the coupling less
possible — and the cheapest way to quiet it would have been to inline a
second `selectMirror` call, which is the defect.** A rule whose cheapest
cure is the disease is worse than no rule. Re-pinned to what it was
reaching for, stronger in three ways: every `selectMirror(` call is
checked; the count is pinned at exactly one; every mount must be fed from
that one call.

---

## Non-vacuity probes

Every one mutated in place, run, restored, `git diff --stat` verified
clean. Exact failure messages:

**Chain (`cb32c4e2`)**
1. `unabridged={unabridged}` → `unabridged={true}`
   → `× EVERY equipment's full experience is uncapped by the ROOM, not just the first`
   — *"ENTER must uncap decisionChainEquipment, or it is only a resize"*
2. `<SceneAdmits …>` → `<>` in `renderDepth`
   → `× /command-deck gates the auction lens AND the decision chain under THESIS_GEOMETRY`
   — *"expected '<DecisionChainPanel: 1/2' to be '<DecisionChainPanel: 2/2'"*
3. registry entry deleted
   → `× every rail entry has a descriptor, and every descriptor has a rail entry`

**Mirror (`5ef0fe6f`)**
1. drop `unabridged={unabridged}`
   → *"ENTER must uncap mirrorEquipment, or it is only a resize"*
2. inline a second `selectMirror({…})` at the mount
   → *"the deck compiles the Mirror 2 times — one room, one reflection. Two
   selectMirror calls are two answers to what the trader's behaviour
   teaches, and they can drift."*
3. delete the registry entry
   → *"rail=[decision-chain, market-object-passport, market-reality]
   room=[behaviour-mirror, decision-chain, market-object-passport, market-reality]"*
4. drop `phase` from the descriptor deps
   → *"mirrorEquipment must read the room's own reading"*

---

## LIVE OBSERVATION — `cb32c4e2`, prod, normal URL

Driven in the Founder's own Chrome on `https://wealthymindsetspro.com/command-deck`.
No hidden route, no harness. Page left exactly as found (no query string,
no open stage). Geometry from `getBoundingClientRect()`, not from a
downscaled screenshot.

| step | observed |
|---|---|
| rail | `WORKSPACE` lists three entries; third is **Decision chain** — *"What the setup still has to satisfy before it is permitted"* |
| press | URL becomes `?equip=decision-chain&stage=preview` |
| preview | `DECISION CHAIN · NQ1! · 15m · RESTRICTED`, headline *"Preparing — Permission says RESTRICTED."*, counts `0 clear / 1 need attention / 8 unresolved` |
| drawer | `?…&stage=drawer`; panel measures **420 × 487 at x=1482** in a **1920 × 840** viewport — market context preserved beside it, not replaced |
| | `chainRegions = 2` — the equipment mount AND the in-room mount both present. **Nothing was subtracted to make the door.** |
| ENTER | `?…&stage=full`; panel measures **1920 × 840 at (0,0)**; all nine nodes; `Return to room` present |
| RETURN | back to `stage=drawer` |
| CLOSE | `/command-deck` with **no query string**, no stage node, rail intact, `chainRegions` back to 1 |

**Acceptance question — "did another app load?"** No. The URL never left
`/command-deck`; the room's rail and chrome persist at every stage; the
drawer sits beside the market rather than over it.

### Recorded honestly, NOT claimed as proven

- **Scroll restoration is UNPROVEN.** `scrollY` was 0 both before and
  after. The value was preserved, but a 0 → 0 observation evidences
  nothing. Needs a re-run from a scrolled position.
- **`unabridged`'s visible effect is UNPROVEN on this session.**
  `[data-decision-chain-hints-withheld]` counted **0** in the drawer —
  correct and honest, because with market state unresolved every node
  currently carries ≤ 3 hints, so the docked cap is not binding. The
  uncapping is proven by Sentinel (probe 1), not by pixels. Needs a
  session with a resolved market.
- **`5ef0fe6f` (the Mirror) was live-verified AFTER this section was first
  written** — see the addendum below. What is still unproven there is the
  Mirror with actual patterns to show, which needs a session that has
  decisions in it.

---

## LIVE OBSERVATION — `5ef0fe6f`, prod, normal URL

Same channel as above: the Founder's own Chrome on
`https://wealthymindsetspro.com/command-deck`, no query string on arrival,
geometry from `getBoundingClientRect()` in a **1920 × 840** viewport.

| step | observed |
|---|---|
| rail | **four** entries — `market-reality`, `market-object-passport`, `decision-chain`, `behaviour-mirror`; the fourth reads *"Your behaviour mirror"* / *"What you actually did this session, not what you meant to do"* |
| press | `?equip=behaviour-mirror&stage=preview`; verdict **`NOT YET`**, headline *"The Mirror reflects a session you have finished. Move to REVIEW or POST-EXIT and it will have something to show you."*; counts render `0 strength / 0 to watch / 0 observed`; preview measures **420 × 151 at x=1482** |
| drawer | `stage=drawer`, **420 × 117 at x=1482** — beside the market, not over it; rail intact |
| ENTER | `stage=full`, **1920 × 840 at (0,0)**, sole button `Return to room` |
| RETURN | back to `stage=drawer` |

### The phase gate, proven by moving it rather than by argument

With the drawer still open, the room's own phase control was pressed
`Prep` → `Review`. **Without any navigation and without the drawer moving**
(still 420 wide at x=1482), the verdict changed `NOT YET` → **`NOTHING YET`**
and the headline became *"No decisions in scope — Mirror has nothing to
reflect yet"* — which is `selectMirror`'s own sentence, not a sentence this
room wrote. That is the descriptor reading the room's live `phase` dep and
the drawer re-rendering in place, observed rather than inferred.

The phase was then pressed back to `Prep` and the stage closed. Final state:
`/command-deck` with **no query string**, no `[data-equipment-stage]` node,
rail still four entries, `Prep` `aria-pressed="true"`. The page was left
exactly as found.

### Still unproven, and named

The Mirror with **patterns actually in it** has not been seen on prod. Both
branches observed above are the empty ones. `MirrorPanel`'s rendering — and
therefore `unabridged`'s visible effect on evidence chips — is proven by
Sentinel and by the `data-mirror-evidence-withheld` accounting, not by
pixels. It needs a session with decisions in scope.

---

## Gates

`./node_modules/.bin/vitest run` → **693 files / 8523 tests pass**
`./node_modules/.bin/tsc --noEmit` → **exit 0**
Both run unpiped. CI green on `b2afde52` (`35199252601`) and `cb32c4e2`
(`35199850508`).

---

## Next, for whoever picks this up

The register's DEBT group is the candidate list, and it is now eight
names: `ATHOSInterventionPanel`, `DLARStrip`, `DecisionWhyPanel`,
`LearningGenomeInspector`, `PersonalEdgeChip`, `PracticeHonestyLayer`,
`SceneAdmissionPanel`, `StructureContextNote`, `WhyInspector`.

Read the list with judgement, not as a queue:

- **`DLARStrip`** is bound to the chain by the `THESIS_GEOMETRY` rule —
  the two must be admitted together. Enrolling it alone will go red, and
  correctly so.
- **`SceneAdmissionPanel`** is engine machinery. The directive bans
  exposing internal market-data architecture in Founder-facing UI. It
  probably belongs on the register permanently, and the entry should be
  moved from DEBT to a third group saying so.
- **`PersonalEdgeChip`** is the trader's own record, like the Mirror, and
  is the most natural fifth tenant.
- **`DecisionWhyPanel`** IS the drawer. Enrolling it needs a Founder
  decision first (it is already open against mockup #8), because equipment
  that opens the drawer from inside the drawer is banned by name.

**Carried blockers, unchanged:** `/journal` detail canvas (0 entries);
Gate 4 responsive device proof (its recorded root cause deserves
re-examination on an unlocked machine — CI already measures 375/834/1440
and fails when requested width ≠ observed width).

**Escalations, unchanged:** the deck's twice-buried `MarketCanvasPanel`
(`page.tsx:1704`, pinned by two Sentinels — DECISION REQUESTED); the
Cloudflare Workers build gap (build `651be3e7…` FAILED while GitHub CI
passed the same SHA `ebf26a2`).
