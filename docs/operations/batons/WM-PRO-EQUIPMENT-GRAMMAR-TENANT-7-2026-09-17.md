# TENANT 7 — PRACTICE HONESTY, AND THE FIRST DOUBLE BURIAL

Date: 2026-09-17
Commits: `45367700` (§9 material invalidation), `9a49a558` (seventh tenant)
CI: `35205865253` success · `35207209279` success
Live: https://wealthymindsetspro.com/command-deck?equip=practice-honesty

## WHAT THIS BLOCK CLOSED

The Founder's interaction cutover asks for one grammar — ROOM → WORKSPACE →
PREVIEW → DRAWER → ENTER → RETURN — reused across the legitimate inventions.
Tenant 7 is the first enrolment where the invention's OWN CONTAINER was the
obstacle rather than its wiring.

`PracticeHonestyLayer` was buried twice. It sat behind a `<details>`, and that
`<details>` sat inside a room fold that only opens in REVIEW/LEARN. Dropping it
onto the rail unchanged would have produced a `<details>` inside a drawer the
trader had already opened — the drawer-inside-drawer the directive bans by name.

## THE THREE DECISIONS THAT MATTERED

**1. `disclosed` — my container is already the disclosure.**
Two changes, one decision seen from two sides. No `<details>`, because the
trader pressed once and does not press again to reach the thing they pressed
for. And no silent null, because silence behind a door the trader just pressed
is a PAINTED DOOR. The two cases are deliberately NOT symmetric: silence is the
right answer to a question nobody asked and the wrong answer to one somebody
did.

**2. `unabridged` is orthogonal to `disclosed` and must never be merged.**
`disclosed` = "has my container already opened me" (structural — who owns the
fold). `unabridged` = "how much room do I have" (the screen). The equipment
drawer is disclosed and NOT unabridged; ENTER is both; the in-room fold is
neither. Collapsing them into one "open" flag would lose a real distinction.

**3. One reader, not two opinions.**
The rail door has to say something truthful about what is behind it BEFORE it
is pressed. The tempting shortcut was to let the ROOM compile its own view of
the practice book to label the door — two compilations of one subject, free to
disagree, with nothing that would notice when they did. Instead the read moved
UP into `usePracticeHonestyLedger`, and both the panel and the descriptor take
it from there.

`practiceHonestyHasDisclosure` is a TYPE GUARD rather than a boolean. A boolean
would have been honest and unusable: callers would still restate the condition
inline to satisfy the compiler, and that restatement is the second copy the
helper existed to prevent.

## THE CAP I REFUSED TO FAKE

`roomAdoptsEquipment`'s "uncapped by the ROOM" rule has no opt-out — every
descriptor must forward `unabridged` into something real. The easy evasion was
to accept the prop and ignore it. Rejected. A real cap was found instead:
every easement HEADING renders at every width, so the trader is never unaware
that an easement EXISTS; what ENTER buys is the SENTENCES behind each one.
`Number.POSITIVE_INFINITY`, not a bigger number, and the withheld count
accounts for itself via `data-practice-honesty-sentences-withheld`.

## SENTINELS RE-PINNED, NOT RELAXED

- `roomAdoptsEquipment` gains a seventh descriptor whose `reads` regex pins
  `disclosed`. Without it, a bare `<PracticeHonestyLayer />` would compile, pass
  every other rule, and quietly ship the burial this atom existed to remove.
- `practiceHonestyLedger` gains SINGLE READER — strictly stronger than the rule
  it replaces, because it now asserts BOTH halves: the hook owns the read AND
  the layer owns none of it.
- `buriedOnlyIsARegister` 15 → 14, discharged with a written record. Sixth
  discharge, and the only one whose burial was double.

## ANTI-VACUITY — ALL THREE PROBED RED

| Mutation | Rule that caught it |
|---|---|
| drop `disclosed` from the descriptor | `roomAdoptsEquipment` — "the layer is handed the ROOM'S OWN compilation" |
| uncap `sentenceCap` (remove the slice) | `everyCapAccountsForItself` — "every cap is actually used to slice" |
| reintroduce `loadPaperState` in the layer | `practiceHonestyLedger` — SINGLE READER |

Worth recording: the room-side "uncapped by the ROOM" rule did NOT catch the
uncapping. It only pins that the ROOM forwards the prop. The component-side
rule is what proves the prop is USED. Both layers are load-bearing and neither
is redundant.

## LIVE OBSERVATION (not inference)

On `https://wealthymindsetspro.com/command-deck`, prod, after CI green:

- Rail carries SEVEN tenants: `market-reality`, `market-object-passport`,
  `decision-chain`, `behaviour-mirror`, `personal-edge`, `learning-genome`,
  `practice-honesty`.
- PREVIEW: 420 × 151, buttons `Open drawer` / `Enter` / `Close`. Verdict
  `WITHHELD` with the §9 note, because the deck opened in EXECUTE.
- ENTER: `stage=full`, 1920 × 840, single `Return to room` button.
- Switching the room to REVIEW flipped the verdict `WITHHELD` → `NOTHING YET`,
  and `data-practice-honesty-disclosed="1"` appeared with
  `nestedDetails: 0`. **This is the painted-door cure observed live** — the
  door answers a deliberate press with a sentence, not a blank.
- RETURN restored `stage=preview` with REVIEW still pressed and the chart
  intact. The exact prior Room state, not a reload.

HONEST LIMITS OF THIS PROOF:
- The Founder's practice book is genuinely EMPTY (`0 easements`, `no caveat`).
  So the populated path — easement headings, the sentence cap, the withheld
  marker — was proved by test and by source-scanning sentinel, NOT by live
  observation. Recorded as such rather than claimed.
- The seventh rail entry sits below the fold at this viewport height. Not a
  defect; noted so the next reader does not mistake it for one.

## CARRIED FORWARD

- Remaining DEBT register: `ATHOSInterventionPanel`, `DecisionWhyPanel`,
  `WhyInspector`. `DecisionWhyPanel` IS the drawer and needs a Founder ruling
  before it can be a tenant of itself.
- OPEN QUESTION, recorded not fixed: ENTER on equipment with nothing deeper is
  a silent no-op. Curing it would require the Room to know the equipment's
  contents — the second semantic brain. Needs a grammar decision, not a patch.
- Still blocked, unchanged: `/journal` detail canvas (0 entries), Gate 4
  responsive device proof (programmatic resize does not take effect).
