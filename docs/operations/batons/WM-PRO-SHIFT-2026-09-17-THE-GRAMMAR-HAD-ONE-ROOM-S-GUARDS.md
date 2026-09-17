# WM PRO SHIFT — THE GRAMMAR HAD ONE ROOM'S GUARDS

Commits: `b28e5464`, `70e462b5` (pushed to `main`)
Predecessor block: `f309540d` + baton `…THE-REVIVES-NOTHING-EVER-RAN.md`

---

## 1. The revive step is PROVEN in CI, not only locally

CI run `35197189702` on `70e462b5` completed success in 4m9s with the step
**`Pixel laws are still falsifiable` ✓**. Its log shows all ten modes executed
in CI's own browser environment and every one RED:

```
prove-bubble-pixels.mjs  (WM_BUBBLE_REVIVE, 5 modes)
  RED BASELINE / CLAMP / LINEAR_RADIUS / NO_FLOOR / MEAN_NORM
prove-vp-pixels.mjs      (WM_VP_REVIVE, 5 modes)
  RED ROW_HEIGHT / BAR_CURVE / SPLIT_ROUND / FITS_LIE / AXIS_BLEED
CLEAN — 10 revive modes across 2 proof scripts all still fail.
```

This mattered to check rather than assume: the proofs launch `channel: "chrome"`
and CI installs only Playwright's chromium, so an environment-only failure
would have surfaced as `COULD_NOT_MEASURE` (exit 2). It did not.

Note for the record: the runs for `f309540d` and `b8c4ec77` show `cancelled` —
the workflow's `cancel-in-progress` concurrency superseded them. The revive
step's first real execution is the one above.

## 2. `documentWallIsNotADrawer` guarded ONE room, and /charts inherited none of it

That Sentinel is excellent and its scope is a single
`const REL = "src/app/command-deck/page.tsx"`, written when the deck was the
only room with equipment. `/charts` then adopted the equipment grammar and
inherited no part of the burial rule.

That is not hypothetical for this room — it is where the defect shipped.
`chartPassportVM` was compiled on every render with its ONLY path a `<details>`
nested inside the Decision Why modal drawer, behind a trigger gated on
`narrowViewport || optionsOpen`, so on a desktop Chart tab there was no path at
all. Correct intelligence, zero doors. Outside the Decision Why window that
`chartPassportAccessibility.test.ts` inspects, nothing watched for it to return.

### Atom A — `b28e5464` — every tenant's depth, not the first in the file

The "ENTER buys depth" rule read `deck.indexOf("renderDepth:")` — the FIRST
occurrence — and asserted `<MarketCanvasPanel … unabridged={unabridged}` in the
400 characters after it. In BOTH rooms the first descriptor is `market-reality`,
so the PASSPORT's depth was never read by that rule at all.

**MEASURED, not reasoned:** deleting `unabridged={unabridged}` from
`chartPassportEquipment` (ChartsDashboard.tsx:922) left **8506 of 8507 tests
green**. Exactly one test failed, and it was the re-pinned rule:

```
FAIL … > '/charts' ADOPTS the journey
     > EVERY equipment's full experience is uncapped by the ROOM, not just the first
src/components/chart/ChartsDashboard.tsx → ENTER must uncap chartPassportEquipment,
  or it is only a resize
```

Without the re-pin, ENTER on the chart passport would have become a resize and
the evidence lineage would have stayed folded on a whole screen — "if the
intelligence exists but requires hunting through implementation containers:
FAIL", and the same defect /charts was cured of coming back through the one
door nothing was watching.

The re-pin also removed a quieter blindness: the rule hardcoded
`<MarketCanvasPanel`, so it was a rule about ONE invention wearing a generic
name. Each descriptor now declares the component its full experience owes, and
the window is the memo's OWN body rather than a fixed span from a file-wide
first match. Defect restored via `cp`; `git diff --stat` empty.

### Atom B — `70e462b5` — every room owes its equipment an unburied door

Stated per ROOM and per DESCRIPTOR so a third room enrols itself, rather than
hard-coding a second file path (which would be the deck's coverage hole copied,
not closed). Carries its own vacuity control: a renamed panel makes the mount
scan empty, and an empty scan must not report clean.

**Proven non-vacuous:** wrapping every `MarketObjectPassportPanel` mount in
ChartsDashboard in a `<details>` fires with

```
every MarketObjectPassportPanel mount is behind a <details> (depths 1, 1).
The room has no door to its own equipment that is not a second press —
this is the zero-doors defect the chart passport shipped with
```

Restored; `git diff --stat` empty.

## 3. A REAL FINDING that was NOT acted on, and why

The first draft of Atom B asserted the stronger thing — that NO mount may sit
inside a `<details>` — and went red immediately:

```
src/app/command-deck/page.tsx → a MarketCanvasPanel mount is buried 2 <details> deep
```

`/command-deck` mounts `MarketCanvasPanel` a **second time** at page.tsx:1704,
two disclosures deep: the Workspace toggle, then the "Evidence & reasoning"
drawer. That is the same nest the Market Object Passport and the Decision
Receipt were lifted out of — and the deck's own comment three lines below it
says exactly that ("Market Object Passport and Decision Receipt USED TO LIVE
HERE, three collapsed `<details>` deep"). The canvas was left behind.

**It was not deleted, and the rule was not left at a strength that would force
the deletion.** Two existing Sentinels pin that mount as intentional scene
composition:

- `commandDeckClutterConservation.test.ts:51` — *"does not remove the canonical
  evidence and decision surfaces"* — requires `<MarketCanvasPanel vm={marketCanvas} />`
  to survive decluttering.
- `responsiveShell.test.ts:338` — pins its ORDER relative to `<SceneAdmissionPanel>`
  *inside the room*.

Whether an audit copy of the canvas still belongs in that drawer now that
`market-reality` is one press from the WORKSPACE rail — with real depth at the
full stage, which the buried copy does not have — is a **FOUNDER-FACING product
call**, not one a guard gets to make by going red. Writing a rule that forces a
visible subtraction is how a Sentinel starts deciding the product.

So the rule was stated at the meaning it can hold honestly — *at least one door
that is not a second press* — and the finding is carried here and in the test's
own comment, where the next hand will see it. **DECISION REQUESTED.**

## 4. Live verification on the NORMAL prod URL

Probed prod `/charts` in the Founder's own Chrome:

```
rail: 2   ids: ["market-reality", "market-object-passport"]
stage: "drawer"
detailsOnPage: 9
buriedPassport: false      ← no [data-decision-id] element inside any <details>
visibility: "hidden"
```

The rule committed in Atom B is confirmed by the **live DOM**, not only by a
source scan: the page has nine disclosures and the equipment is inside none of
them.

`visibility: "hidden"` again — the Mac is still at the lock screen. VP pixel
observation and Gate 4's responsive device proof remain blocked on that, exactly
as recorded in the previous baton. No attempt was made to unlock it.

## 5. The §13 gate list is staler than the previous baton said

The last baton corrected two entries. A third and a fourth are also further
along than the list claims:

- **"paper execution state machine realism"** — `src/lib/paperExecutionRealism.ts`
  exists, is unit-tested, and is RENDERED on `/paper` as `<ExecutionRealismNote>`
  (page.tsx:3100). It is joined by `paperStopRealism.ts`, `paperShortRealism.ts`
  and `practiceHonestyLedger.ts`, which composes them. The disclosure discipline
  is explicit — it labels the DIRECTION and CERTAINTY of the paper fill's
  advantage (`no-spread`, `unbounded-size`) and deliberately mints no number,
  because there is no bid, ask or depth to compute one from. What remains open
  in that lane should be re-derived from the code, not from the list.
- **Gate 4** — its recorded root cause ("programmatic window resize does not
  take effect, `outerWidth` pinned") should be re-examined on an unlocked
  machine before it is treated as an API defect. CI already measures three
  widths (375 / 834 / 1440) and FAILS if the width it asked for is not the width
  the page saw, so the resize channel demonstrably works under Playwright.

## 6. Gate

- `./node_modules/.bin/tsc --noEmit` → `TSC_EXIT=0` (both atoms)
- `./node_modules/.bin/vitest run` → 691 files / **8509** tests passed
  (8507 → 8509; the two new rules)
- CI `35197189702` → success, all 13 steps green

## 7. Carried forward, unchanged

- **BLOCKED (environment):** VP live pixel observation and Gate 4 — lock screen.
- **BLOCKED (data):** `/journal` detail canvas — 0 entries. Fabricating entries
  into the Founder's production localStorage to manufacture a screenshot is
  refused.
- **ARCHITECTURAL, surface don't rush-wire:** Decision Memory sealing has zero
  production callers.
- **VERIFIED CLOSED, leave alone:** `executionConnectivity`.
- **ESCALATE:** Cloudflare Workers build `651be3e7-0a2e-4f19-b3ea-7aa3b6f0fb36`
  FAILED while GitHub CI passed the same SHA `ebf26a2`.
- **DECISION REQUESTED (new):** the deck's twice-buried `MarketCanvasPanel`
  (§3 above).
- **FOUNDER DECISIONS PENDING:** `DecisionWhyPanel` drawer vs mockup #8;
  whether `DecisionReceiptPanel` becomes equipment.
