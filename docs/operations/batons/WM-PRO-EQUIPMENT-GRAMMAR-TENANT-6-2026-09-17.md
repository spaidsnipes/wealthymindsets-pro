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

# Baton — the SIXTH tenant, a door carrying half its cargo, and a defect only USE could find

Range: `88ed1751` → `9c16ee04`.
Predecessor: `WM-PRO-EQUIPMENT-GRAMMAR-TENANT-5-2026-09-17.md`.

## What shipped

| SHA | What | CI |
| --- | --- | --- |
| `88ed1751` | Baton for the fifth tenant | success |
| `7b76f3ab` | **Learning genome becomes WORKSPACE equipment — sixth tenant** | cancelled by the next push |
| `62b026e8` | **§10: the chain's door was carrying half its cargo** | success |
| `9c16ee04` | **SemanticZoom: ENTER must move the depth, not just the geometry** | queued at time of writing |

## `7b76f3ab` — the sixth tenant

`/command-deck` WORKSPACE now reads:

```
market-reality · market-object-passport · decision-chain · behaviour-mirror ·
personal-edge · learning-genome
```

Same four-file contract as the five before it: registry entry in
`roomEquipment.ts` ⟷ `learningGenomeEquipment` memo in the room ⟷ chooser entry
keyed off `equipment.equipmentId` ⟷ descriptor in
`roomAdoptsEquipment.sentinel.test.ts`.

**Why this one.** Personal Edge says WHERE you perform badly. This says WHICH
PART OF THE WORK is the bottleneck — perception, reasoning, process, transfer —
and what to drill. Different question, different horizon again.

**The scene gate travels with it.** `renderDepth` wraps its body in
`<SceneAdmitsAmbient>`, so the rail cannot become a second, louder path to a
surface the room itself has closed.

### `unabridged` here is a STARTING DEPTH, not a cap

Every previous tenant used the house pattern
`const cap = unabridged ? Number.POSITIVE_INFINITY : N;`. This one does not, and
the difference is deliberate. `LearningGenomeInspector` routes its body through
`<SemanticZoom>`, which renders a `role="tablist"` naming every level supplied.
Docking it therefore hides nothing — it only chooses where the trader LANDS.
`defaultLevel={unabridged ? 3 : 1}`. Default `true`, because L3 is what has
always shipped and no existing mount may move.

### A hook had to move up

`TSC_EXIT=2` — `error TS2448: Block-scoped variable 'learningGenome' used before
its declaration`. The memo read a hook declared two hundred lines lower, beside
its only previous consumer, and the chooser sat between them so the memo could
not move down. The hook moved up instead. Safe without argument: the call is
unconditional and argument-free, so hook order across renders is untouched.

### The register discharged something nobody set out to discharge

`SceneAdmitsAmbient` came off the buried register as a CONSEQUENCE of this
commit, not as a second decision — `renderDepth` is at zero `<details>` depth by
construction, so surfacing the tenant surfaced its gate. Right outcome: a gate
renders `null` or its children and nothing of its own, so it has no depth a
trader can be denied. **18 → 17**, recorded rather than silently deleted.

## `62b026e8` — the chain's door was carrying half its cargo

The room's own §10 comment says sections 2 (the DLAR auction lens) and 3 (the
decision chain) are **ONE admission**, because "admitting one without the other
would put a conclusion on screen with its own workings withheld, which is the
SHOW FIRST, EXPLAIN SECOND order run backwards."

`decisionChainEquipment` carried the §10 **gate** faithfully and dropped the §10
**pairing**. Pressing the rail opened the nine chain nodes with the
four-dimension summary they resolve to nowhere in sight. The in-room composition
never had this defect; only the rail did.

**Every existing rule stayed green throughout, because every existing rule is
about the gate.** That is the whole lesson of this commit: a door built from one
half of a rule goes wrong while all the tests about the other half pass.

The lens is deliberately NOT `unabridged`-gated. It is the shallower read — what
the chain COMPACTS to — so docking it away would leave the preview showing the
workings without the conclusion, the same inversion pointing the other way.

The new rule is scoped with `it.runIf` off the room's own descriptor list rather
than a hardcoded path: `/charts` has no chain equipment and must not fail for not
having it, and a third room that adopts the chain tomorrow gets the rule with it
instead of someone having to remember.

**`DLARStrip` came off the register: 17 → 16.** The previous baton judged that
enrolling the lens as its own rail entry "will go red, correctly" — two doors to
one admission is what §10 forbids. That judgement held. What it missed is that
the lens never needed a door of its own, because the chain's door was already the
right door and was under-loaded. Second consequential discharge of the session,
and it reads the opposite way round from the first: `SceneAdmitsAmbient` surfaced
because a tenant was ADDED, this surfaced because a tenant was FIXED.

Register history: **22 → 21 → 20 → 19 → 18 → 17 → 16.** Remaining DEBT group:
`ATHOSInterventionPanel`, `DecisionWhyPanel`, `PracticeHonestyLayer`,
`StructureContextNote`, `WhyInspector`.

## `9c16ee04` — the defect the tests could not have caught

The sixth tenant was live-walked on the normal prod URL. The rail carried six
entries. The drawer opened at L1 with L1/L2/L3 all named and reachable. Then
ENTER:

| Step | `data-equipment-stage` | Geometry | Zoom selected |
| --- | --- | --- | --- |
| Rail press | `preview` | 420 × 147 | — |
| OPEN DRAWER | `drawer` | 420 × 297 | `["L1"]` ✅ |
| ENTER | `full` | 1920 × 840 | **`["L1"]` ❌** |

Full screen, same depth. **`unabridged` really was only a resize** — precisely
the failure the grammar exists to prevent, arriving through the one door that was
never a source scan.

Root cause, read straight out of the primitive: `defaultLevel` feeds the
`useState` INITIAL, so it is read exactly once per MOUNT. The panel is not
remounted between stages. The prop changed and nothing happened.

**Why the test file was green and always would have been.** There is no jsdom in
this repo; component tests use `renderToStaticMarkup`, which mounts fresh on
every call. The second render it would need to observe does not exist. A test
that cannot represent the passage of time cannot catch a bug about it.

### The fix is an EDGE, not a snap

Following `defaultLevel` whenever it is merely PRESENT would overwrite the
trader's own tab press on every parent re-render — the zoom control would spring
back and the manual choice would be unusable. **A rule whose cheapest cure is the
disease is worse than no rule.** So the view moves only when the value the caller
asks for actually CHANGED since last time. Inside a stage the trader keeps
whatever they pressed; crossing into another stage moves them.

A refused request (a depth this content does not carry) is still RECORDED, so it
is asked once and then stops being an edge.

### The decision was lifted out so a test could watch it

`stageChangeLevel({ requested, lastRequested, available })` is pure and exported.
It takes the previous request as an ARGUMENT instead of reading a ref, which is
what lets a test play a run of renders by hand and assert on each step.
`semanticZoomFollowsTheStage.test.ts` does exactly that, and its last test pins
the component to the same function — a component that kept an inline copy would
pass every other assertion in the file while shipping the defect.

Probed red three ways, each mutation confirmed applied before trusting the result:

1. edge guard removed → springs back over the trader's tab press (2 red)
2. decision neutered to mount-only → the live defect returns (3 red)
3. effect deps widened past `defaultLevel` → wiring test red (1 red)

### Live proof after the fix deployed

Walked on the normal prod URL `https://wealthymindsetspro.com/command-deck` in
the Founder's own Chrome. Sentinels CI on `9c16ee04`: success.

| Step | URL | stage | Geometry | Zoom selected |
| --- | --- | --- | --- | --- |
| Rail | `/command-deck` | — | six entries | — |
| Press | `?equip=learning-genome&stage=preview` | `preview` | — | — |
| OPEN DRAWER | `…&stage=drawer` | `drawer` | 420 × 297 @ (1482, 525) | `["L1"]` |
| **ENTER** | `…&stage=full` | `full` | 1920 × 840 @ (0, 0) | **`["L3"]` ✅** |
| RETURN | `…&stage=drawer` | `drawer` | 420 × 297 @ (1482, 525) | `["L1"]` ✅ |
| press L2 by hand, let the deck re-render | `…&stage=drawer` | `drawer` | — | `["L2"]` ✅ held |

ENTER moves the depth. RETURN restores the exact prior Room state. The trader's
own tab press survives parent re-renders. Page left on a clean `/command-deck`.

## Addendum — `9b8f4b63`: the ENTER audit, and what it found instead

Having fixed ENTER for one tenant, the obvious question was whether the other
five were carrying the same defect. So all six were walked on prod and their
drawer text compared byte-for-byte against their full-screen text, with the
stage-button labels normalised out.

| tenant | drawer | full | deepens |
| --- | --- | --- | --- |
| market-reality | 719 | 846 | ✅ |
| market-object-passport | 1084 | 1698 | ✅ |
| **decision-chain** | **1388** | **1388** | **identical** |
| **behaviour-mirror** | **157** | **157** | **identical** |
| **personal-edge** | **76** | **76** | **identical** |
| learning-genome | 259 | 278 | ✅ |

Three identical. The tempting move was to call that three more defects. It is
not, and the difference matters:

- **`decision-chain`** — `hintCap = unabridged ? Infinity : 3` caps HINTS, not
  chain nodes. Counted live: the whole chain carried **two** hint chips, both on
  one node. A cap of three never bites at two.
- **`personal-edge`** — live text: *"No decisions on record yet — your edge
  cannot be measured from nothing. 0 strength · 0 to watch · 0 decisions."*
- **`behaviour-mirror`** — live text: *"The Mirror reflects a session you have
  finished. Move to REVIEW or POST-EXIT and it will have something to show you."*

All three are honest. **The wiring was right; there was nothing deeper to show.**

### What was actually wrong was the INSTRUMENT

Answering that question at all required asking each panel what it was
withholding. Four components cap under `unabridged`; two of them —
`MarketCanvasPanel`'s unresolved and cleared ledgers — drew their `+K more`
remainder with **no attribute on it**. The disclosure existed for a human reading
the screen and did not exist for anyone auditing it, so from the outside
"withholding nothing" and "withholding silently" look the same. That ambiguity is
precisely the cover ENTER-is-only-a-resize hid under.

`everyCapAccountsForItself.sentinel.test.ts` now enforces three things over every
`unabridged ? Number.POSITIVE_INFINITY : N` in `src/`: the cap must actually
slice something, its file must render a `data-…-withheld` marker, and the scan
must find at least four caps — so a renamed house pattern fails loudly instead of
passing over an empty list. Probed red three ways.

### Open Founder question, NOT rush-wired

Pressing ENTER on a panel with nothing deeper is a silent no-op: full screen,
same words, no explanation. Suppressing or labelling that door would require the
ROOM to know what the EQUIPMENT contains — which is the second semantic brain the
grammar bans by name. Left as a decision, not a fix.

## Gates

`TSC_EXIT=0` · `VITEST_EXIT=0` · **697 files / 8543 passed, 1 skipped** (from
695 / 8535 at `88ed1751`).

## Carried forward

- `DecisionWhyPanel` IS the drawer — enrolling it needs a Founder decision first,
  because drawer-inside-drawer is banned by name.
- `ATHOSInterventionPanel`, `PracticeHonestyLayer`, `StructureContextNote`,
  `WhyInspector` remain on the DEBT register, unexamined as tenants.
- The deck's twice-buried `MarketCanvasPanel` (`page.tsx:1704`) — DECISION
  REQUESTED, pinned by two tests.
- Cloudflare Workers build gap: build `651be3e7-…` FAILED while GitHub CI passed
  the same SHA `ebf26a2`.
- Still blocked: `/journal` detail canvas (0 entries), Gate 4 responsive device
  proof (programmatic resize does not take effect).

## The one thing to carry

Three defects this block, and the two that mattered were found the same way and
neither by a test:

- §10 was found by reading the room's own COMMENT against its own descriptor.
- ENTER-is-a-resize was found by USING the product on the live URL.

Every rule in the file was green for both. A rule can only guard the thing it was
written about; the half of the rule nobody wrote down is where the defect lives.
