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
<!-- GATE-STATUS:END -->

## The rule that keeps this honest

Every row carries a MEASURED date. A status with no date cannot go stale — it
can only be quietly wrong, because a reader has no way to tell "true today" from
"true in September and never revisited". The sentinel does not check that a date
is HONEST; nothing here can. It checks that each claim is DATEABLE, which is what
lets a later reader distrust it.

And every row names an OWNER PATH that must exist on disk. A gate pointing at a
file nobody kept is a gate that can never be closed or re-opened — it just sits
there looking like work.
