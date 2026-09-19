# CANON — SHIFT GATE STATUS

**Any agent working the ATHOS WM Pro shift reads the gate list HERE, not from the shift prompt.**

## Why this file exists

The standing shift prompt carries a list of "remaining gates". That list is
retyped from shift to shift, by hand, from memory. On 2026-09-18 two of its
entries were measured and found already closed:

- **Delta Bubbles level ownership** — closed by `src/lib/deltaBubbleLevels.ts`
  plus an adoption sentinel, 18 tests green.
- **Live VP render geometry proof** — closed by `scripts/prove-vp-pixels.mjs`,
  which paints through the shipped geometry owners on a real browser canvas and
  reads the bytes back, and which can be made to fail five different ways.

Nothing was wrong with the code. **The list had drifted from it.** That is the
identical failure `CANON-VIEW-BUILD-ORDER-2026-09-17.md` records for the view
build order, where an operator spent three atoms re-opening shipped work.

A work-list retyped each shift is a CONVENTION. **AN OWNER BEATS A CONVENTION.**
The wrong answer a stale gate list produces is not a broken pixel — it is a
whole shift spent re-proving something already true, and it leaves no trace,
because re-opened work looks exactly like work.

The table below is gated by `src/lib/ops/shiftGateStatus.sentinel.test.ts`.
Prose in this file is commentary. **The table is the claim.**

## What a STATE means here

| STATE | Meaning |
|---|---|
| `CLOSED` | An instrument exists, was run, and passed. The EVIDENCE column names what to run to see it again. |
| `OPEN` | Real remaining work. Nobody is blocked; it has not been done. |
| `BLOCKED` | Cannot proceed for a reason outside this repo. The blocker is NAMED. |

`CLOSED` is a claim about an INSTRUMENT, not about beauty. A gate can be closed
and the surface still ugly; that is a different gate and should be its own row.

<!-- GATE-STATUS:BEGIN -->
| GATE | STATE | OWNER | MEASURED | EVIDENCE |
|---|---|---|---|---|
| Delta Bubbles level ownership | CLOSED | `src/lib/deltaBubbleLevels.ts` `src/lib/deltaBubbleLevels.adoption.sentinel.test.ts` | 2026-09-18 | Run `./node_modules/.bin/vitest run src/lib/deltaBubbleLevels.adoption.sentinel.test.ts` — EXIT 0. The extraction fixed two real defects the sentinel now pins: a bubble printing a bucket CENTRE as the price flow happened at, and a rounded price used as a bucket identity, which silently merged buckets and dropped aggressor volume. |
| Live VP render geometry proof | CLOSED | `scripts/prove-vp-pixels.mjs` `src/lib/vpDrawGeometry.ts` | 2026-09-18 | Run `npm run prove:vp-pixels` — EXIT 0, 5 pixel laws hold against real painted bytes read via `getImageData()`. The instrument is falsifiable: `WM_VP_REVIVE=ROW_HEIGHT\|BAR_CURVE\|SPLIT_ROUND\|FITS_LIE\|AXIS_BLEED` each exit 1 with 1/22/1/2/3 offences respectively. **SCOPE:** this proves the GEOMETRY OWNERS paint honestly. It does NOT prove MainChart's composed scene — colours, labels, POC/VAH/VAL lines over live price — which stays HUMAN_PROOF_REQUIRED and is its own row when someone opens it. |
| Decision Memory sealing has zero production callers | OPEN | `src/lib/traderMemory/decisionMemory.ts` `src/lib/decisionMemory.ts` `src/lib/decisionMemoryReachability.test.ts` | 2026-09-18 | Re-measured, still true, and NOT stale. `grep -rn "sealDecision\b" src/` finds no non-test caller outside the module and its store; `sealDecisionMemory` has none at all. **ARCHITECTURAL — SURFACE IT, DO NOT RUSH-WIRE.** The write path exists and is tested; what is missing is a decision ingress, and inventing one to make a caller appear would mint decisions no trader made. |
| executionConnectivity orphaned | OPEN | `src/lib/authority/executionConnectivity.ts` `src/lib/authority/executionReadinessDisclosure.test.ts` | 2026-09-18 | `grep -rn "from .*executionConnectivity" src/` returns no non-test importer. **NOT A LIVE DEFECT** — `/readiness` discloses the absence honestly rather than claiming connectivity it does not have, and the disclosure test passes. This row exists so nobody re-derives that conclusion; deleting the module is a separate decision from wiring it. |
| Paper execution state machine realism | OPEN | `src/lib/paperTrade.ts` `src/lib/paperTradeOutcome.ts` | 2026-09-18 | Not measured against a realism standard this shift; the state machine has branch tests but no row here yet stating what "realistic" would mean. **The first work on this gate is to write down the standard, not to change the fills** — a realism change with no stated standard cannot be reviewed or reverted. |
| Gate 4 responsive device proof | BLOCKED | `scripts/audit-phone-parity.mjs` | 2026-09-18 | BLOCKED BY: programmatic window resize does not take effect in the available browser channel — `outerWidth` stays pinned, so a 390px claim would be measured against a viewport that never narrowed. The instrument exists and runs; what is missing is a channel that can actually resize. A green run here today would be a false pass, which is worse than the open gate. |
| /journal detail canvas | BLOCKED | `src/app/journal/page.tsx` | 2026-09-18 | BLOCKED BY: zero journal entries exist to open a detail view on. Any proof would have to be built against a fabricated entry, and a canvas verified against invented data proves only that the fabricator agrees with itself. Unblocks the moment a real entry is logged. |
| M1 — live-market destination mall | OPEN | `src/components/os/WMOperatingSystem.tsx` `src/components/experience/WMExperienceShell.tsx` `src/lib/routing/wmDestinations.ts` | 2026-09-18 | MEASURED, AND THE INHERITED CLAIM WAS HALF-STALE. The rooms RAIL does not open on the instrument view — `WMExperienceShell.tsx:484` already passes `railDefaultOpen={!onInstrumentView}` and `:496` collapses the seven-mode bar there. What genuinely remains is (a) the rail TOGGLE at `WMOperatingSystem.tsx:678-703`, whose own `title` reads "Show the rooms rail", and (b) the five-door phone bar at `:959-990` fed by `PHONE_SLOT_HREFS` (`wmDestinations.ts:373`) = /charts, /command-deck, /paper, /journal, /profile. **NOT A DELETION.** Removing the phone bar outright would strand a 390px trader on the chart with no way out, which is the capability amputation the order forbids; the repair is to re-home destinations behind one deliberate door. |
| M2 — Workspace/Tools FULL stage | OPEN | `src/components/experience/RoomEquipmentLayer.tsx` | 2026-09-18 | Inherited claim, NOT re-measured this shift. States that FULL can take the chart away via `inset:0` and that equipment depth is reflected through the URL, so opening a tool changes the trading identity. Nobody should act on this row until the two behaviours are read off the current file — the M1 row above is what an inherited claim looks like after measurement. |
| M3 — Command Deck route gravity | OPEN | `src/app/command-deck/page.tsx` | 2026-09-18 | Inherited claim, NOT re-measured this shift. Deck-only organs must be INVENTORIED and migrated to chart / inspect / receipt / review / diagnostics before the route is demoted. Deleting first is capability amputation; parity is the precondition for retirement, not a follow-up. |
| M4 — legacy tests protecting legacy architecture | OPEN | `src/components/layout/ShellAccessParity.test.tsx` | 2026-09-18 | MEASURED. `ShellAccessParity.test.tsx:112-118` ("renders the phone bar with all five doors") asserts `doors).toHaveLength(5)` and that every href is present. That is a real guard for today's law and becomes a regression trap the moment M1 lands. It must be remodelled in the SAME commit as M1, not after — a test remembering the old product will restore it. |
| M5 — route registry overload | OPEN | `src/lib/routing/wmDestinations.ts` | 2026-09-18 | PARTLY REFUTED ON MEASUREMENT. `WmDestination` (`:119-143`) already separates its `frame` field (os / cleared / legacy) from its `tier` field (1 or 2), and phone-bar membership is a THIRD list (`PHONE_SLOT_HREFS`, `:373`) rather than being derived from `frame`. The conflation named in the order is not present as described. What is unproven is whether the three concepts stay independent under M1, which is what this row should be re-measured against. |
| M6 — source poison | OPEN | `docs/operations/CANON-VIEW-BUILD-ORDER-2026-09-17.md` `src/lib/ops/shiftGateStatus.sentinel.test.ts` | 2026-09-18 | Stale comments, tests and route prose that can reteach retired architecture to a fresh worker. This repo already owns the instrument for it: `viewBuildOrder.sentinel.test.ts` requires any ungated build-status word to name the day or commit it was last true for. The generalisation, not yet built, is that rule applied to route and shell prose. |
| M7 — permission-born DECISION_ID persistence | OPEN | `src/lib/traderMemory/decisionMemory.ts` `src/lib/traderMemory/decisionMemoryStore.ts` | 2026-09-18 | A decision minted at permission crossing lives in React state until a later intent write, and the store says in its own words that it cannot survive reload or cross-device. **DO NOT FABRICATE AN INTENT TO PERSIST THE ROW** — that mints a decision no trader made, which is a worse defect than the one being fixed. The seam needed is birth/existence, separate from expression. Shares an owner with the "Decision Memory sealing" row above; close them together or they will disagree. |
| M8 — CanonicalBar adoption + object vocabulary | OPEN | `src/lib/marketData/canonicalBar.ts` `src/lib/marketData/marketObjectKinds.ts` | 2026-09-18 | VOCABULARY HALF CLOSED `540a2cc5`: the kind is spelled `GAP_FVG`, the wrong total is out of the prose and test title, and a guard now fails if a count is retyped beside the array. Re-run `./node_modules/.bin/vitest run src/lib/marketData/marketObjectKinds.test.ts` — EXIT 0. THE ADOPTION HALF IS STILL FULLY OPEN and is the larger one: production still carries private OHLC builders, and `canonicalBar.ts` is a contract that ingress does not yet flow through. |
| M9 — replay must drive the real past | OPEN | `src/components/chart/BarReplayControls.tsx` `src/components/chart/MainChart.tsx` | 2026-09-18 | Inherited claim, NOT re-measured this shift: the controls and index move but MainChart is said not to consume replay bars. The repair constraint is the part worth keeping regardless of what re-measurement finds — replay must read FROZEN CanonicalBar ancestry, never re-derive today's version of old bars, or the past silently becomes a reconstruction that agrees with the present. |
| M10 — provider/broker commissioning | OPEN | `src/lib/broker/certification.ts` | 2026-09-18 | The twelve-stage ladder and its taxonomy exist; what does not exist is a runner that EXECUTES them, so the execution rungs sit UNPROBED rather than measured. Definitions are not commissioning. A market-data-only lane may honestly mark execution stages NOT_APPLICABLE; a broker lane may not call credentials EXECUTABLE, and EXECUTABLE is not RECONCILABLE. |
<!-- GATE-STATUS:END -->

## The FINAL-LAP BREAKER MAP (M1–M10) lives in the table above

The Founder issued a finite repair board on 2026-09-18 — ten breakers, M1
through M10 — and issued it **as a message**. A board that exists only in a
prompt is the same CONVENTION this document was created to replace, and it
drifts by exactly the mechanism recorded at the top of this file. So the ten
rows now sit in the gated table, where each one must name an owner that exists
on disk and a date it was last measured.

**THE STOP-GROWING RULE, WHICH IS PART OF THE ORDER.** There is no M11. A new
breaker requires concrete current repo or runtime evidence of a defect that no
existing row owns. Anything else routes into the breaker it belongs to. An
inspection permitted to grow becomes a second project, and the point of a finite
board is that it can be finished.

**Inherited rows are marked as such, and that is not hedging.** M1 and M5 were
re-measured this shift and both turned out to be PARTLY STALE — the rooms rail
already stays shut on the instrument view, and the route registry already keeps
`frame`, `tier` and phone-bar membership as three separate facts. M2, M3 and M9
carry claims nobody has re-read against current code, and they say so. A row
that admits it was inherited can be checked; a row that quietly asserts a
measurement nobody took is how a shift gets spent re-proving something already
true. The repair order itself says to inspect the actual wiring, and the two
corrections above are what that instruction bought.

## The rule that keeps this honest

Every row carries a MEASURED date. A status with no date cannot go stale — it
can only be quietly wrong, because a reader has no way to tell "true today" from
"true in September and never revisited". The sentinel does not check that a date
is HONEST; nothing here can. It checks that each claim is DATEABLE, which is what
lets a later reader distrust it.

And every row names an OWNER PATH that must exist on disk. A gate pointing at a
file nobody kept is a gate that can never be closed or re-opened — it just sits
there looking like work.
