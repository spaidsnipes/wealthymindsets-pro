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

# Baton — the equipment grammar's FIFTH tenant, and a register entry that was misfiled

Range: `bdf71f1e` → `b8a08e2d`.
Predecessor: `WM-PRO-EQUIPMENT-GRAMMAR-TENANTS-3-AND-4-2026-09-17.md`.

## What shipped

| SHA | What |
| --- | --- |
| `bdf71f1e` | Baton for tenants 3 and 4 |
| `a22e692e` | Addendum: the Mirror's live walk on prod, phase gate proven by moving it |
| `ff67d65c` | **Personal Edge becomes WORKSPACE equipment — fifth tenant** |
| `b8a08e2d` | Register: `SceneAdmissionPanel` regrouped DEBT → PERMANENT |

## `ff67d65c` — the fifth tenant

`/command-deck` WORKSPACE now reads:

```
market-reality · market-object-passport · decision-chain · behaviour-mirror · personal-edge
```

Four files carry the grammar contract, exactly as the previous four tenants did:
registry entry in `roomEquipment.ts` ⟷ `personalEdgeEquipment` memo in the room
⟷ chooser entry keyed off `equipment.equipmentId` ⟷ descriptor in
`roomAdoptsEquipment.sentinel.test.ts`.

**Why this one and not something else.** The Mirror reflects the session just
finished. This reflects the BOOK — which playbook, direction and session the
trader has actually performed in across every decision WM has a record of. Same
subject, different horizon. Folding them together would make one panel answer
two questions with one verdict.

**No phase gate, and the descriptor's `deps` say so.** `[personalEdgeVm]`, with
no `phase`. The Mirror is phase-gated because reflecting mid-session is an
overclaim; but "you have historically performed badly in this context" is worth
MOST during PREPARATION. A `phase` dep here would invite the exact defect
`theMirrorIsNotAMarketPanel.enforcement.test.ts` exists to forbid — a panel that
disappears precisely when it is most useful.

### The silent-truncation defect, found a THIRD time

`PersonalEdgeChip` rendered `topStrengths[0]` and `topWatch[0]` and said nothing
about the rest. `selectPersonalEdge` hands it up to `topN` (default 3) per side.
"Here is your worst context" and "here is the worst of three, and there are two
more you are not seeing" are materially different sentences, and only the first
was being shown.

Same family as `DecisionChainPanel`'s hints and `MirrorPanel`'s
`evidence.slice(0,2)`. Same cure, now three panels deep:

- docked ACCOUNTS for the remainder — `data-personal-edge-buckets-withheld="4"`
  and the words *"4 more contexts not shown here"*;
- ENTER uncaps via `unabridged ? Number.POSITIVE_INFINITY : 1`;
- the default is whatever leaves every existing mount byte-identical — `false`
  here, because a cap of one per side has always shipped and this chip has two
  pre-existing mounts (`/command-deck`, `/journal`) that nobody asked this atom
  to redesign.

Pinned by `personalEdgeChipAccountsForWhatItWithholds.test.tsx` — BEHAVIOURAL,
not a source scan, because `slice(0, 1)` looks like a layout decision and the
defect was only ever visible in rendered output.

### The six probes, verbatim

1. drop `unabridged={unabridged}` → *"ENTER must uncap personalEdgeEquipment, or it is only a resize"*
2. add `phase` to deps → *"personalEdgeEquipment must read the room's own reading"* AND *"personalEdgeEquipment describes equipment with no full experience"*
3. delete the registry entry → *"rail=[behaviour-mirror, decision-chain, market-object-passport, market-reality] room=[…, personal-edge]"*
4. leave `PersonalEdgeChip` on the buried register → *"PersonalEdgeChip is on the buried register but is no longer buried-only."*
5. `bucketCap = 1` unconditionally → *"S1 is missing from the uncapped chip"*
6. drop the accounting chip → *"expected … to contain '4 more contexts not shown here'"*

## LIVE OBSERVATION — `ff67d65c`, prod, normal URL

`https://wealthymindsetspro.com/command-deck`, Founder's own Chrome, no hidden
route, no harness.

| Step | URL | `data-equipment-stage` | Geometry (`getBoundingClientRect`) |
| --- | --- | --- | --- |
| Rail | `/command-deck` | — | five entries, `personal-edge` last |
| Press | `?equip=personal-edge&stage=preview` | `preview` | 420 × 151 at (1482, 671) |
| Open drawer | `…&stage=drawer` | `drawer` | 420 × 98 at (1482, 724) |
| ENTER | `…&stage=full` | `full` | 1920 × 840 at (0, 0) |
| RETURN | `…&stage=drawer` | `drawer` | 420 × 98 at (1482, 724) — **exact prior stage** |
| CLOSE | `/command-deck` | absent | page restored, no query string |

Preview text, read from the live DOM:

```
YOUR PERSONAL EDGE | NQ1! · 15m | NO RECORD | OPEN DRAWER | ENTER | CLOSE
| No decisions on record yet — your edge cannot be measured from nothing.
| 0 strength | 0 to watch | 0 decisions
```

`equipment-count-edge-strength|watch|decisions` all read `0`, which is the
truth for this owner. ENTER adds the selector's own `reason` — *"Owner has no
decisions in the store."* — which the preview does not carry, so ENTER is depth
and not a resize even on the empty branch.

RETURN restored the **drawer**, not the room — the prior stage, per the
directive's "RETURN restores the exact prior Room state". CLOSE then left
`/command-deck` with no query string and no stage node: the page as found.

### Still unproven, and named

- **Personal Edge with actual buckets has never been seen on prod.** This owner
  has zero decisions, so the live walk proves the WIRING and the honest empty
  branch — not the populated panel. The full experience is, correctly, a nearly
  empty screen.
- **The `unabridged` uncapping is proven by test, not by pixels.** Needs an
  owner with ≥2 buckets per side. Manufacturing that by writing fabricated
  journal entries into the Founder's production localStorage is forbidden and
  was not done.

## `b8a08e2d` — a register entry that was an instruction to violate the directive

`buriedOnlyIsARegister.test.ts` filed `SceneAdmissionPanel` under
*"DEBT. Real intelligence whose only door is a second press."* That group's
plain meaning is **give this a door**. For this panel, building that door is the
offence: it renders the scene compiler's WITHHELD list and SIGNAL PROVENANCE —
the internal market-data machinery the Founder directive bans from
Founder-facing UI.

New third group, `── PERMANENT. Machinery the directive forbids surfacing. ──`,
states that in place. Set equality is unchanged so the register stays green; the
probe (removing the name outright) still goes red with the component named.

The register's arithmetic this shift: **22 → 21 → 20 → 19**, every move recorded
in place rather than silently deleted.

## Gates

`TSC_EXIT=0`. `VITEST_EXIT=0` — **694 files / 8529 tests**, up from 693 / 8523,
exactly the +1 file / +6 tests of the new behavioural test. Unpiped, exit codes
read directly.

## Next, with the judgement already made

- **`DLARStrip`** is bound to the chain by the `THESIS_GEOMETRY` rule. Enrolling
  it alone will go red, correctly. It must be admitted WITH the chain or not at
  all.
- **`DecisionWhyPanel`** IS the drawer. Enrolling it needs a Founder decision
  first, because drawer-inside-drawer is banned by name — and it is already open
  against mockup #8.
- Remaining DEBT group: `ATHOSInterventionPanel`, `DecisionWhyPanel`,
  `DLARStrip`, `LearningGenomeInspector`, `PracticeHonestyLayer`,
  `StructureContextNote`, `WhyInspector`.
- **Carried, unchanged:** the deck's twice-buried `MarketCanvasPanel` at
  `page.tsx:1704` (DECISION REQUESTED — pinned by two existing Sentinels as
  intentional scene composition); the Cloudflare Workers build gap; `/journal`
  detail canvas (0 entries); Gate 4 responsive device proof (machine locked).
