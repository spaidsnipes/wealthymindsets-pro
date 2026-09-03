# WM PRO SHIFT — Drive canon read + evidence-debt count integrity
Date: 2026-09-03
Thread: ATHOS single-thread (Claude Code)
Preceded by: WM-PRO-SHIFT-2026-09-03-PAPER-UNBRICK.md

## DRIVE READ (fresh, this shift)
Surveyed via rclone (`gdrive:` remote, Founder-authorized OAuth).

**Canon docs read in full:**
- `WM Pro — Transformation UI Visual Implementation Contract & Asset Ledger — 2026-09-01`
  (id 11xOCJYbc8-B-B1A_1R0AaBh2Xm7GY5OVL5hKQbE6KHI) — ACTIVE BUILD AUTHORITY.
- Reference images pulled and read: Asset 10 (Full Operating System Overview),
  Asset 07 (Evidence Debt / Question Mode), Asset 16 (Chart Workspace Object
  Passport), Asset 09 (Master Order Flow Cockpit).

**Drive structure verified:**
- Visual Systems Execution Canon folder holds all 20 `WM_Transformation_UI_*` assets
  plus the implementation contract. Intact.
- `Above the Hill Canon` — full bible tree present (Constitution, DNA, Company,
  Product, Customer, Revenue, Operations, Security & Trust, Academy, Exec OS).
- **GAP CONFIRMED: `ATHOS — 12 AI Role Bibles` and `ATHOS — AI Workforce Command`
  are both EMPTY.** This matches the earlier "all employee bibles are empty"
  finding. The ATHOS role canon exists as folders with no content.
- `ATH Computer Migration + Space Recovery — 2026-08-31` — migration folders
  populated by the prior shift; `07_TRANSFER_LOGS_CHECKSUMS` still EMPTY (no
  fabricated receipt was written).

## CANON GRAMMAR EXTRACTED
Asset 10 EVIDENCE DEBT panel: a single three-tier tally —
CONFIRMED EVIDENCE / PARTIAL EVIDENCE / MISSING EVIDENCE — with one owner.
Asset 07: "EVIDENCE DEBT = UNRESOLVED QUESTIONS THAT MUST BE PAID"; a LEDGER of
individually payable questions (PAID / PENDING PAYMENT / DEBT ACCUMULATED).

These map 1:1 onto the existing canonical `MarketStateDimension.resolution`
vocabulary (RESOLVED / PARTIAL / UNKNOWN). That mapping is what this shift wired.

## SHIPPED
| SHA | Fix |
|---|---|
| 7fa8b59 | evidence-debt hidden remainder derives from true count |
| f1aed36 | one evidence-debt entry per unresolved dimension |
| 26e9b95 | Passport summary double-period strip |
| c59b901 | /journal Reset filters clears the Misread filter |

### 7fa8b59 — "9 unpaid ... +1" self-contradiction
`/command-deck` rendered "9 evidence nodes unpaid: regime + direction +1".
The 9 came from the true `missing` count; the "+1" from `missingLabels.length - 2`
where the label array is capped at 3 samples. Two numbers in one sentence
disagreeing; the 1 had no owner. Both surfaces (Command Context Ribbon via
decisionPermissionCompiler, One Story Strip via selectOneStory) carried the bug
independently. Introduced shared `hiddenRemainder(trueCount, shownLabels)` +
`EVIDENCE_LABEL_SAMPLE_LIMIT`, and documented on the EvidenceDebt interface that
label arrays are TRUNCATED samples whose `.length` is never a count.

### f1aed36 — four missing-counts for one snapshot
`/command-deck` showed, for the SAME snapshot: header pill "1 missing",
canvas panel "MISSING (1)", Passport "0/8 resolved", chain "9 unknown".
Root cause: `chartMarketStatePublisher` emitted `unknowns` as ONE compound
sentence naming all eight dimensions, so `unknowns.length` read 1 while real
evidence debt was 8. Now emits one entry per unresolved dimension; a dimension
the publisher actually resolves drops OUT of the ledger.
**LIVE-VERIFIED on prod: header now reads "8 missing · 1 blockers · 1 cleared".**

### 26e9b95 — Passport double period
Every unresolved Passport row ended "...at snapshot time..". Producers supply
`unknowns` as complete sentences; summarise() appended another period.
**LIVE-VERIFIED on prod: doublePeriods 8 → 0.**

### c59b901 — /journal Reset filters
`filterMisread` participates in the entry filter predicate but was absent from
both the Reset button's visibility condition and its onClick, while the title
claims "Clear every active filter". When Misread was the ONLY active filter the
button did not render at all, so it could never be cleared from the filter bar.

## SENTINEL — FALSE-RED CAUGHT AND DISCARDED
While auditing the Passport drawer I measured a 101px viewport overflow, then
translateX stuck at 440 (fully off-screen) on both the Passport and Why drawers.
Before reporting it I checked the measurement environment:
`document.visibilityState === "hidden"`, `hasFocus === false`.
The automation tab was backgrounded, so `requestAnimationFrame` was throttled and
Framer Motion never advanced the entrance animation.
**This was an automation artifact, NOT a product defect. Discarded, not reported.**
Any future drawer-geometry audit must assert `visibilityState === "visible"` first.

## TEST POSTURE
Full suite: **322 files / 3034 tests passing.** TypeScript clean (`tsc --noEmit`).
11 new tests this shift, including an invariant that
`shownLabels + hiddenRemainder === trueCount` across 1/2/3/5/8/9/20 missing nodes,
and one tying `unknowns.length` to the count of dimensions NOT resolved.

## CARRIED FORWARD (unverified candidates — NOT confirmed findings)
From the earlier 6-route scan whose 22 verifier agents all died on a session
limit. These remain candidates only:
- /nectar ribbon "CHANNELS 6 · no gaps recorded" in resolved tone while the
  sibling strip proves CHANNELS STALE 6 / OBSERVING 0.
- /journal New Trade "Setup" dropdown displays "CLC Long" while form state is
  `setup: ""` — a trader who never touches it stores an empty setup.
- /journal "AI Strategy Coach" tab label; the panel is pure JS aggregation.
- /morning-prep Opening Bell "Market data health verified — NOT DONE" never
  wires `dataQuality`.
- /command-deck HeroTruth claiming "session RTH" for 24/7 crypto (BTCUSD).

## GAPS / DEBT
- ATHOS role-bible folders in Drive are empty — the role canon has no content.
- Drive `07_TRANSFER_LOGS_CHECKSUMS` empty; no checksum receipt fabricated.
- Provider truth unchanged: Webull BLOCKED_AUTH (401), Longbridge NOT CONFIGURED,
  moomoo bridge absent, Tastytrade refresh token absent.
- Asset families 01/11/12/13/18 (learning scaffolding) and 03/05/06/19/20
  (aggression/absorption/big-trade) remain REFERENCE ONLY — no runtime match.

## TIMING TRUTH
No shift duration is claimed. Only observed events are recorded above.
