# Patience & Management — Methodology (Garden 19 §24–§31, §36, §47–§51, §55–§56, §63–§64)

> **ONE PLAN PER DECISION_ID. FROZEN WHEN IT BECOMES A TRADE. CHANGED ONLY BY DATED AMENDMENT.**
> The executable law is the code and its tests below. If this document and the code disagree,
> the code is the law and this document is the defect.

Patience and management live **inside** the existing lineage
Decision_ID → Trade → Journal → Review → Personal Edge → Academy → SpaidBot.
WM builds no Patience Indicator, no Psychology Room and no Patience Dashboard.

Owners:

| Concern | Owner |
|---|---|
| Plan snapshot: freeze, fields, management-condition parsing, amendments, effective plan at a time, stored-shape reader | `src/lib/journal/managementPlan.ts` |
| Plan store (one record per Decision_ID, `wm:management-plan:v1`, at most 400 kept) | `src/lib/journal/managementPlanStore.ts` |
| Pre-trade draft (per market, `wm:management-plan-draft:v1`) and the freeze points | `src/lib/journal/managementPlanDraft.ts` |
| Ticket-send freeze hook | `src/lib/journal/ticketAtSendStore.ts` (`rememberTicketAtSend`) |
| Morning Prep rules + session line (`wm:management-day-rules:v1`) | `src/lib/journal/managementDayRules.ts` |
| Plan vs actual classifier | `src/lib/journal/planVsActual.ts` |
| Actuals from the broker readback | `src/lib/journal/planActualsFromBroker.ts` |
| Price path over the hold (window + bars; loader reads the one candle owner) | `src/lib/journal/planPricePath.ts`, `src/lib/journal/planPricePathLoader.ts` |
| Plan-alone counterfactual | `src/lib/journal/planCounterfactual.ts` |
| Three-column Sheriff (market / planned / actual) | `src/lib/journal/planSheriff.ts` |
| Review composition | `src/lib/journal/planReview.ts` |
| Adherence by setup / any group | `src/lib/journal/planAdherence.ts` |
| FVG answers, FVG context adapter (ledger + reference) | `src/lib/journal/planFvgContext.ts`, `src/lib/journal/planFvgLoader.ts` |
| FVG study list (WHEN / DEPTH / AGE) | `src/lib/journal/planFvgStudy.ts` |
| Market edge vs execution edge (traded vs untraded touches) | `src/lib/journal/planFvgCounterfactual.ts` |
| Erasure | `src/lib/journal/managementPlanErase.ts` |
| Learning-loop doors | `src/lib/journal/planLoop.ts` |
| SpaidBot plan line + question | `src/lib/ai/spaidbotPlanReview.ts`, `src/lib/ai/spaidbotContext.ts` (`withScenePlan`), `src/lib/marketData/formatChartContextNote.ts` |
| Surfaces | `ManagementPlanCard.tsx`, `TodayManagementRules.tsx`, `PlanAdherenceBySetup.tsx`, `BrokerTruthToday.tsx` (`StoryReviewRow`), `FounderAnalytics.tsx`, `education/FvgLessonBody.tsx` |

## What WM never says

* **No emotion it did not get from the trader.** "You were afraid", "you got greedy", "revenge",
  "FOMO" and every other feeling, motive or mental state are forbidden unless they quote the
  trader's own words. Every finding carries `emotionalReason: "unknown"` until the trader writes
  an answer to "Why did the plan change?" (`StoryReview.planWhy`). Only then is it shown, as "Reason
  (your words)" or "You wrote: “…”".
* **No shaming.** No "should have", "failed", "mistake" or "bad trade". Findings are factual
  plan comparisons ("You exited before the target … or the invalidation … recorded in your plan
  had printed.") followed by a question.
* **No edge, score or rate claim**, and no percentage below n = 20. The plan-alone reference and
  the traded-vs-untraded comparison are labelled DESCRIPTIVE and claim no edge.
* SpaidBot's system prompt carries the same three rules (`src/app/api/spaidbot/route.ts`, "Plan
  review and patience").

Pinned by `src/lib/journal/patienceCopy.sentinel.test.ts` and
`src/lib/journal/managementSheriff.sentinel.test.ts`. Both have positive controls and vacuity guards.

## 1. The plan snapshot (§27)

Fields: symbol, direction, entry, thesis, invalidation (words), invalidation price, stop, target,
management conditions, expected hold (minutes), context, risk ($), session.

* A field the trader did not enter is **UNRECORDED** with a null value. Nothing is defaulted: no
  1R is assumed, no hold is guessed, no session is inferred from a clock. Zero, negative and
  non-finite prices are not prices.
* **Management conditions** are kept verbatim. Only the checkable part is parsed:
  * `BREAKEVEN_AFTER_R` ("move to breakeven after +1R")
  * `REDUCE_AT_TARGET` ("reduce at target 1")
  * `TIME_STOP` ("time stop 30 min")
  * `TRAIL_STOP`
  * `ADD_ALLOWED`
  * anything else is `OTHER`: kept and shown, but not machine-checked.
* With no separate invalidation price, the **planned stop stands in** as the invalidation, and
  every sentence says so ("the planned stop (your plan recorded no separate invalidation)").
* The snapshot is **deep-frozen**.

### Freeze points

| Point | When | What freezes |
|---|---|---|
| `TICKET_SEND` | `rememberTicketAtSend`, when the live ticket's order leaves (`sentAtMs`) | The ticket's stop, target and View, merged with the trader's plan-card draft for that market |
| `PAPER_FILL` | `freezePaperFillPlans` on the decision's **first** paper fill (`trade.ts`) | The plan-card draft (paper tickets carry no stop/target plan), with the direction from the fill side |
| `JOURNAL_ENTRY` | The trader presses "Record plan (after the trade)" in Review | What the trader writes then, marked `hindsightRisk: true` and stated as "not a pre-trade record" everywhere |

Rules:
* **The first freeze wins.** A second ticket on the same decision (e.g. the protective stop), or a
  paper fill of a decision already frozen at the send, neither refreezes nor uses up the next draft.
* **A draft joins a freeze only if it was written before that moment** (`updatedAtMs ≤ atMs`)
  **and within 12 hours of it** (`DRAFT_MAX_AGE_MS`). A plan typed after the fill is not a
  pre-trade plan.
* **The send never waits on the plan.** The freeze is wrapped so it can never throw into the send.

### Amendments and evidence

`amendPlan` / `appendPlanAmendment` **append** a dated amendment and never touch the frozen base.
An amendment:
* may change stop, target, invalidation price or expected hold, or add conditions;
* carries an optional **"new evidence"** note and a note.

Refused:
* amendments dated before the freeze;
* amendments dated before the previous amendment;
* amendments that change nothing.

`effectivePlanAt(snapshot, t)` is the plan in force at `t`.

The card says it plainly: amending the plan **does not move any order at the broker**.

### Morning Prep (§55)

`TodayManagementRules` keeps today's rules, a default hold and a one-line session plan for the New
York market day only (`marketDayKey`).
* **They are not a plan.** They join the card's draft only when the trader presses "Use today's
  rules", and then only fill blank fields.
* **The session-plan line rides onto a freeze** as the plan's session (source "morning prep
  session plan"). That happens only when it was written before the trade and the card names no
  session.
* **The session verdict comes from the one owner.** `dayRulesSession` reads
  `marketClockET` + `readMarketSession` for US listed equities and CME futures, and each verdict
  carries its basis.
* **Holidays are never claimed.** The basis says "holiday calendar not loaded". When both
  reference markets are CLOSED, the line says so.
* **One editor, many readers.** Morning Prep is the only place the rules are written. The Journal
  shows them read only, as one line ("Today's rules: … · Edit in Morning Prep →", or "No
  management rules saved for today. · Set them in Morning Prep →"), through `TodayRulesLine` in
  the same file as the editor. Test: `journalDayRulesLine.test.ts`.

Tests:
* `managementPlan.test.ts` (freeze, parsing, immutability, round-trip, store, send hook)
* `managementPlanSlice2.test.ts` (draft → send / paper fill)
* `managementPlanSlice3.test.ts` (Morning Prep rules, session line)
* `managementEmptyStates.test.ts` (closed day)

## 2. Plan vs actual (§26, §28)

Inputs:
* **The plan:** frozen snapshot plus amendments.
* **Actuals:** entry, adds, exits, stop moves, target moves.
  * Broker stories come from `actualsFromBrokerStory`: tastytrade's own fills (`executed-at`) and
    closing Stop / Limit orders, ordered and timed by `received-at` (never `updated-at`).
  * Journal entries come from `actualsFromJournalEntry`; those have prices but usually no times.
  * Broker actuals carry `unknowns`, the two readback facts not yet established (§11). Review's
    WHAT YOU ACTUALLY DID column prints them as **UNKNOWN** lines. With no stop order in the
    readback it says "No stop move seen in the readback." — never "the stop was not moved".
* **Optional:** the price path over the hold.

| Class | Rule (stated in the finding as EDUCATION TRUTH) |
|---|---|
| EXITED_BEFORE_PLANNED_CONDITION | During the hold no bar reached the plan's target or invalidation, and no recorded time condition had elapsed |
| EXITED_DURING_NORMAL_RETRACEMENT | Price moved in the plan's direction, then gave back ≥ 0.25 R (`RETRACEMENT_MIN_R`; or 0.25 of the run when no 1R) without touching the invalidation |
| EXITED_AFTER_THESIS_INVALIDATION | The exit came within the bar the invalidation printed in or the next one, or the exit price is at/through the invalidation |
| HELD_THROUGH_INVALIDATION | The position was still open more than one full bar after the bar in which the invalidation printed |
| MOVED_STOP_WITHOUT_PLAN_BASIS | No recorded condition (breakeven after +N R *once it printed*, trailing toward the market) and no evidenced amendment covers the move. Widening is named "away from the market (more risk)" |
| MOVED_TARGET | "Moved target without plan basis": a target order moved with no evidenced amendment |
| TOOK_PROFIT_BEFORE_PLANNED_CONDITION | A close (final or partial) at a gain while neither the target nor the invalidation had printed (price path), with no recorded condition for it. A close at a loss is never "took profit" |
| INTERFERED_REPEATEDLY | "Changed orders repeatedly without plan basis": ≥ 3 (`INTERFERENCE_MIN`) stop / target changes in one hold, none allowed by a condition or an evidenced amendment |
| REDUCED_PER_PLAN | A partial close at or beyond the target with a recorded reduce condition ("reduce at target 1") |
| MOVED_TO_BREAKEVEN_PER_RULE | The stop moved to the entry only after the plan's "+N R" had printed (price path) |
| WALKED_AWAY_AFTER_PROTECTION_PER_PLAN | The plan records a walk-away condition ("walk away once the stop is protected"); after protection by rule, no stop, target, add or partial close came before the exit |
| ADDED_RISK_AFTER_THESIS_WEAKENED | The add filled after the invalidation printed, or ≥ 0.5 R against the entry (`WEAKENED_ADVERSE_R`), with no evidenced amendment |
| PLAN_FOLLOWED | The exit is at or beyond the target, at a recorded time condition, or past the target under a recorded trailing condition |
| PLAN_CHANGED_WITH_DOCUMENTED_NEW_EVIDENCE | An amendment with new evidence came before the exit. The trade is then compared against the amended plan |
| INSUFFICIENT_EVIDENCE | No plan, no exit, no levels, no price path, or a path that does not cover the hold. The finding names the missing fact. An exit between the levels is **never** called early without the path |

A price within 0.02 % of a level counts as at the level (`TOL_FRACTION`). Every fact carries one
layer: **MARKET TRUTH** (fills, path), **CONTEXT TRUTH** (session/context the trader recorded),
**TRADER TRUTH** (the plan, amendments) or **EDUCATION TRUTH** (the rule). Findings are mapped to
the Review rows MANAGEMENT / DISCIPLINE / ADHERENCE (`FINDING_DIMENSION`).

**§26 coverage (2026-10-08).** The order's eleven management behaviours each have one class, read
from broker readback and the frozen plan, never a feeling: exited before planned invalidation,
moved stop / target without plan basis, took profit before planned condition, held beyond
invalidation, added risk after thesis weakened, changed orders repeatedly, followed plan, reduced
according to plan, moved to breakeven according to rule, walked away after protection according to
plan. `managementBehaviours.ts` holds the list (`MANAGEMENT_BEHAVIOUR_COVERAGE`) and one sample trade
per behaviour. The journal proof scene shows all eleven. The word is "without plan basis", never
"impulsively". Took profit and changed orders repeatedly count as departures in adherence; the
by-plan behaviours do not.

Tests: `planVsActual.test.ts`, `managementPlanSlice2.test.ts`, `managementBehaviours.test.ts`.

### Journal auto-capture: the fill shapes it accepts (`journalCaptureFromFill.ts`)

| Shape (tastytrade readback) | Capture |
|---|---|
| One fill | Fill price BROKER-REPORTED |
| One order filled in pieces | Quantity-weighted price DERIVED; filled-at = earliest fill; fees summed |
| Partial fill still working | Refused — waits for the broker's fill |
| Partial fill then Cancelled / Expired / Removed | Captured with tastytrade's filled quantity (ordered vs filled both shown, status kept). The reload offer keeps it too (`filledOrdersWithTickets`) |
| Cancelled with nothing filled | Refused — not a trade |
| Multi-leg order | Refused as one trade, with the reason: journal each leg yourself; UNKNOWN to WM how the legs pair (`TtOrderView.legCount`) |
| Fees: commission / clearing / regulatory reported separately | Summed, BROKER-REPORTED |
| Fees: a fill with no fee field | UNREPORTED, never 0 (`TtFill.feesReported`); a reported 0 is a fee of 0 |
| Fees: some fills without fees | Total UNKNOWN — the partial sum is not given |
| Replaced stops | Each closing Stop / Stop Limit order in the readback is a move from the one before, timed by `received-at` |

Test: `captureFillShapes.test.ts` (with `journalCaptureFromFill.test.ts`).

### Webull — Review reads it; auto-capture does not (`planActualsFromWebull.ts`)

Journal auto-capture is **tastytrade-only**: Webull fills never become journal drafts, and every
Webull story's Review row says so ("Webull fills are read for Review and the Broker Ledger; WM does
not auto-capture them into the Journal — add the entry yourself"). For a Decision_ID WM sent
through Webull (the journal feed links each fill by client order id), Review compares the plan
using Webull's own readback, read only — no Webull order tool is ever called.

| Shape (Webull readback) | Review |
|---|---|
| Several executions of one order (`execution_id` / `order_id`) | One event: quantity-weighted price, earliest time |
| `side` BUY / SELL / SHORT, no open/close flag | Paired flat-to-flat in time order; the first fill sets the direction; later same-side orders are adds; pairing stops at the first return to flat — said as UNKNOWN in Review |
| Fees: executions (`feesReported: false`) | UNREPORTED; order history's itemised `fees[]` → known |
| Multi-leg option order (order history `legs.length > 1`) | Refused for comparison — UNKNOWN how the legs pair (`WbFill.legCount`) |
| Fills on more than one instrument under one decision | Refused — not one position |
| Stop / target orders and replaced stops | Not in the feed → "No stop move seen in the readback." plus the UNKNOWN line; never "not moved" |

Test: `webullReviewShapes.test.ts`.

### The Broker Ledger (Webull lifetime) — the same truth rules

`src/lib/broker/webullLedger.ts`, `src/lib/broker/webullLedgerWalk.ts`, `src/components/journal/WebullLifetimeLedger.tsx`:

* **Fees.** An order with no fee list and no commission is `feesReported: false`. Its fills read
  "fees UNREPORTED". The round trip says "(+ UNREPORTED on N fills — Webull stated no fees; not
  counted as $0)", and the Fees tile names how many trades include such fills. A stated $0 is a
  fee of $0.
* **Pairing.** Round trips are said to be PAIRED BY WM flat-to-flat from Webull's fills in time
  order (`WEBULL_PAIRING_TRUTH`); Webull's order history links no close to its open.
* **Coverage on screen.** Each account line reads "read N days of history, back to D (today
  included) · stopped: why" (`ledgerCoverageLine`). "Refused" and "page budget" say that older
  history was NOT read.
* **Read method on screen.** The page says that history is read month by month, that a window
  answering `SPLIT_AT` (30) or more rows is split until whole (Webull silently truncates), and
  that WM asks to tomorrow because the end date is exclusive.
* **Clock and money.** Months bucket on the New York clock (`nyMonth`); every clock names its
  zone; money goes through `formatMoney`.

Test: `src/lib/broker/webullLedgerTruth.test.ts` (with `webullLedger.test.ts`, `webullLedgerWalk.test.ts`).

## 3. The plan alone — counterfactual reference (§24)

`planAloneReference` reads the **frozen base** (amendments are what was *done*). It asks which of
the plan's own conditions the path would have reached first: target first, stop first, neither,
both inside one bar (`SAME_BAR_AMBIGUOUS`, because a bar does not say which printed first), not
enough path, or no plan levels.
* **Horizon:** the plan's expected hold, or else the end of the loaded path. A path that ends
  before the hold says it is incomplete.
* It is always labelled "DESCRIPTIVE — one trade is not evidence of edge".

Test: `planVsActual.test.ts` (§24 block).

## 4. Three-column Sheriff in Review (§64)

`sheriffColumns` states three things apart, never blended:
* **WHAT THE MARKET DID:** the path source; high and low during the hold and after the exit; and
  for target, stop and (recorded) invalidation, whether it printed during the hold, after the exit,
  or not in the bars loaded, with the bar time.
* **WHAT YOU PLANNED:** the freeze point and time, the Decision_ID, every field
  (UNRECORDED where missing), and every amendment with "new evidence: …" or "no new evidence recorded".
* **WHAT YOU ACTUALLY DID:** who reported it, the entry, adds, stop and target order moves, and
  exits, each with its time or "(time not reported)".

Then come the deviation lines (each with a "Study: Lesson N · title →" door), the plan-alone
line, the FVG answers, SpaidBot's question, and the trader's "Why did the plan change?" box.

At phone width the columns stack (`minmax(min(100%, 220px), 1fr)`) with no overflow. Measured
locally at 1440 and 390 with Playwright (`review-1440.png`, `review-390.png` in the shift
scratchpad).

The **price path** is loaded only when the trader presses for it. The window runs from the
entry's bar to 120 minutes after the exit (`PATH_AFTER_EXIT_MIN`), and is refused past 30 days
(`PATH_MAX_AGE_DAYS`) or when a fill time was not reported.

Tests: `managementPlanSlice4.test.ts`, `spaidbotPlanReview.test.ts`.

**The Founder's management Sheriff (§64), as one integration test.** `managementWalkthrough.ts`
walks three sample decisions through the real owners:
* an exit before the plan's condition printed;
* a position held through the plan's invalidation;
* a plan changed mid-trade with the new evidence written down.

`managementSheriff.integration.test.ts` holds the laws over them:
* **Separate columns:** market, planned and actual stay apart. The market column never reports
  what the trader did, the actual column never reports bars, and the plan column never reports
  fills.
* **Factual deviations:** the early exit and the hold through the invalidation are deviations,
  each with its rule and its times.
* **New evidence is preserved:** it is kept beside the untouched frozen base, and it covers the
  stop it moved (no "without plan basis").
* **No shaming and no psychology:** the "why" is the trader's own words, kept verbatim and
  labelled as theirs, or "Not recorded. WM does not fill this in."

The journal proof scene shows the same walkthrough in six steps per decision.

## 5. Personal Edge — adherence and the n ≥ 20 rule (§28, §29)

* **Adherence:** a trade counts toward a group's sample only when its plan-vs-actual comparison
  was **decided** (`exitDecidable`). The rest are listed as "could not be compared".
  * **Followed:** no departure finding (`DEPARTURES` in `planAdherence.ts`).
  * **Departed:** at least one, and the most common departure links to its lesson.
* **MEASURED only at ≥ 20 decided trades** (`PATTERN_SAMPLE_MIN`). Below that the row reads
  "INSUFFICIENT EVIDENCE — n of 20 decided trades so far", with no percentage.
* **Groups:** by the setup the trader named (`planAdherenceBySetup`) or any grouping
  (`planAdherenceByGroup`).
* **Founder analytics** adds two plan patterns, EXIT_BEFORE_PLANNED_CONDITION and
  HELD_THROUGH_INVALIDATION, under the same rule. A pattern with nothing to count says
  "nothing to count yet".

### The trader's own labels (§29)

`selfReport.ts` is the only place in WM where the words fear, impatience, FOMO, revenge,
over-management, hesitation, overconfidence and "a deliberate change of plan" exist — as labels the
trader puts on his own decision in Review.
* **Only he chooses.** WM never picks, suggests, pre-selects or infers one. The chips are not on the
  glass until he presses "Label it yourself".
* **Counted beside the departure.** Personal Edge shows, per kind of departure among decided trades,
  how many he labelled and with what. A share appears only at 20 or more trades with that
  departure; below that it is a count with INSUFFICIENT EVIDENCE.
* **Every line says "you labelled".** It is a fact about what he wrote, never about what he felt.
* **Erasure:** erasing a decision's plan clears its labels along with the "why" answer.

Test: `selfReport.test.tsx` (includes the one-owner sentinel: no other journal, review, profile or
SpaidBot source file carries a label word in a string, and a label is set only from a chip's press).

### Departures and their lesson doors on the profile

`departureRows` (in `planAdherence.ts`) lists each kind of departure among the trader's decided
trades, most frequent first. The profile's Personal Edge shows them (`DepartureLessonRows`).
* **At 20 or more decided trades:** the row gives the count and share, and carries "Study: Lesson N ·
  title →". The door comes from `planLoop.lessonForFinding`, the same mapping the journal uses.
* **Below 20:** the row gives the count only, has no door, and says why — no lesson is suggested
  from a sample this small.
* **No frozen plan:** the journal's own empty line.

Test: `components/profile/departureLessonRows.test.tsx`.

### FVG study list (§23)

Every journal decision that references an FVG (its as-of-decision snapshot,
`fvgDecisionReference.ts`) is counted once in each dimension. Every group is listed, even at n = 0:

| Dimension | Groups |
|---|---|
| WHEN | Anticipatory (before any touch) · First touch · Later touch · Between touches |
| DEPTH | Untouched or touched · Partial mitigation · Deep or full mitigation |
| AGE | Fresh gap · Old gap (> `OLD_GAP_AGE_BARS` = **50** bars of its own timeframe at decision — "old-gap chasing") |

Each row shows recorded R and plan adherence separately, and each is MEASURED only at ≥ 20.

### FVG questions in Review (§23 / §41)

**From the reference alone** (`fvgAnswersFromReference`), as of the decision:
* first touch, later touch, between touches, or before any touch;
* whether the decision came before price reached the territory.

**After "Read what happened to this gap after the decision"** (the one bar source + the one
engine, `planFvgLoader.ts` → `fvgContextFromLedger`):
* whether the position was held more than a bar after the territory was traded through.

Missing fill times answer UNKNOWN.

### Market edge vs execution edge (§24, first slice)

`compareFvgTakenVsUntaken` compares the zone's own response on the touches the trader traded with
the **same state** on the touches the trader did not trade, over the same instrument, timeframe and
New York days, read from the FVG ledger.
* **What is compared:** first vs later touches separately. Running interactions and the traded
  interactions are excluded from the untraded side.
* **Execution** is the trader's recorded R and how often the plan was followed.
* **The 20 rule:** MEASURED only when **both** sides hold ≥ 20. Decisions before a touch or
  between touches are listed as "not compared".

Tests: `managementPlanSlice3.test.ts`, `managementPlanSlice4.test.ts`, `managementPlanSlice5.test.ts`,
`planFvgStudy.test.ts`, `founderAnalytics.test.ts`.

### The context kept with a gap decision (§40)

When the trader attaches "Reference an FVG" to a Journal entry, `fvgDecisionContext.ts` reads the
market context from the same bars at the same moment and keeps it beside the reference:
* structure, profile and wall relationships (or each owner's SILENCE);
* the Response Matrix cell of the displacement bar (SILENT where a market reports no traded volume);
* the regime tag.

Only bars that had closed by the decision are read, so nothing later can change it. A context is used
only with the reference it was read with, and a damaged one is dropped whole. An entry saved without
one keeps reading "NOT RECORDED" in the splits; it is never back-filled from today's chart.

Test: `fvgDecisionContext.test.ts`.

### FVG context splits and "Did management help?" (§23, §24)

Both sit on the real Personal Edge block (`PlanAdherenceBySetup`) as well as in the journal proof
scene. The line for the trader: **split by what was knowable at the decision, with the market's
answer and yours kept apart, and the plan alone compared only where a price path was loaded.**
* **Context splits** (`planFvgContextSplits.ts`): every decision with an FVG reference is grouped
  by structure, profile, order flow, wall, effort→response, New York session, regime, timeframe
  and instrument. Context the reference did not store is its own group, "NOT RECORDED with this
  reference" — never re-read from today's chart, never dropped. Each row has a MARKET column (the
  territory's settled responses only) and a TRADER column (recorded R, plan followed). Each is
  MEASURED only at ≥ 20.
* **Did management help?** (`planManagementCounterfactual.ts`): on departed trades, your realised R
  beside the plan alone on the same path (±0.05R counts as the same). Then restraint: realised R
  for followed vs departed. A trade without a loaded path is not paired, so the first question
  stays INSUFFICIENT with its n. The second is MEASURED only when both sides hold 20. It is
  descriptive: one path per trade, never a cause.
* **Empty states:** with no gap reference, one line says what the splits need. With no frozen plan,
  the adherence empty line shows and the management block does not render.

Tests: `planFvgContextSplits.test.ts`, `components/journal/personalEdgeSplitsMount.test.tsx`.

### Two Review questions about gap decisions, answered from the record (§41)

`planFvgFillTargets.ts` answers both questions from the record only. It never names a belief the
trader did not write: the words "magnet", "belief" and "mandatory" are absent, and a test pins it.
* **Where the frozen target sat:** a *far-edge target* means the entry was outside the gap on its
  near side, trading toward it, with the frozen target at the gap's far edge (within 10 % of the
  gap's size). It is counted against the trader's other gap targets. Decisions with no direction,
  entry or target are listed as not classified. Outcomes are compared side by side: mean R, and
  how often the exit reached the far edge.
* **A sense beyond price attached at the decision:** order flow or derivatives, attached and not
  SILENCE, compared with price only. WM records that the sense was attached, not whether it agreed
  with the trade, and the line says so.
* **The n ≥ 20 rule:** counts are facts at any n. The comparison is MEASURED only when both sides
  hold 20 recorded results. It is descriptive: one result per decision, never a cause.
* **Where it shows:** the real Personal Edge block, and the proof scene (the sample book answers
  with counts and INSUFFICIENT; a second set of 48 synthetic decisions shows the MEASURED form).

Test: `planFvgFillTargets.test.ts`.

### One n ≥ 20 rule for every rate a trader reads about themselves

`src/lib/journal/statGuard.ts` owns it: `STAT_SAMPLE_MIN` = 20 (the same number as
`PATTERN_SAMPLE_MIN`, `ledgerEdge.MIN_SAMPLE` and `ledgerTimeline.MIN_WINDOW`), with the wording
"INSUFFICIENT EVIDENCE — n of 20 closed trades so far".
* **Guarded rates:** win rate, expectancy, profit factor, average R:R, average win/loss and
  per-group shares.
* **Unguarded facts:** counts and sums (trades, wins, losses, net P&L) are facts at any n.
* **Surfaces:**
  * Broker Ledger tiles, and every Personal Edge table cell (groups, patterns, windows, months,
    by model);
  * the Journal coach tiles, header chip and setup rows (`selectSetupPerformance`);
  * the /profile tiles (`traderPerformanceStats`, kind `INSUFFICIENT_EVIDENCE`);
  * the profile view-models `selectPersonalEdge` / `selectPlaybookDNA` / `selectSessionEdge`,
    whose default thresholds were 5 / 10 / 3 and are now 20.

Test: `src/lib/journal/statGuard.sentinel.test.ts` (source scan of the surfaces, with a vacuity
guard and positive controls).

**Proof on serving without a real book:** `/profile?scene=profile-fixture` (signed-in token only).
It renders three synthetic books (0, 7 and 24 closed trades) through the profile's own tile view
(`ProfilePerfTiles`) and its edge panels, so the measured zero, the INSUFFICIENT tiles and the
MEASURED tiles can be read on serving. It writes and fetches nothing
(`profileProofScene.sentinel.test.tsx`).

## 6. Academy "Show me my examples" (§36)

`fvgReferencedExamples` lists only Journal entries with a valid `fvgRef`; tags are not evidence.
Each example, newest decision first, shows:
* the as-of-decision state line;
* the result, with R where recorded;
* plan adherence;
* a link to `/journal?entry=<id>`.

Test: `src/lib/academy/fvgCourse.test.ts`.

## 7. Erasure (§47–§51)

`erasePlanForDecision` removes the plan record. Its amendments live inside it, so none can orphan.
It also clears the "why did the plan change?" answer on that decision's review keys (`<id>` or
`…|<id>`), and keeps the trader's marks, notes and lesson. Everything that shows a plan (Review,
Personal Edge counts, the FVG study list's adherence, SpaidBot's plan line) is derived on read and
stops referencing it. The journal entry and its FVG reference are untouched.

In the card, "Delete this plan" takes two presses and opens no dialog.

### Member isolation (audit 2026-10-08)

`src/lib/journal/managementOwner.ts` keys every management store by the signed-in member's id:
`wm:management-plan:v1:<id>`, `wm:management-plan-draft:v1:<id>`, `wm:management-day-rules:v1:<id>`.
* **Another member on the same browser reads nothing of yours**, and cannot amend or erase it —
  even with no sign-out through this tab (an expired session, another tab).
* **A guest reads none and writes none.** With auth resolved to nobody there is no key: a guest's
  draft or rule is refused, so it never waits for the next member. Before `AuthContext` has
  spoken, a browser has no key either.
* **`AuthContext` is the one writer of the owner** (`setManagementOwner`): the member's id as soon
  as it is known; nobody only once auth has resolved. Readers re-read through
  `useManagementOwnerVersion`.
* **The journal stores use the same owner** (2026-10-08): the journal book
  (`wm_journal_entries:<id>`, and the older `wm-journal:<id>`), review answers
  (`wm_story_review_v1:<id>`) and the tab's tickets-at-send (`wm:journal-ticket-at-send:v1:<id>`).
  `AuthContext` sets the owner before the account reaches React state, so the Journal's first
  render opens the member's own book. A save goes only to the key its entries were read under.
* **Sign-out still purges** every key, unsuffixed and suffixed (`logoutIsolation.ts` prefixes,
  sessionStorage included).
* **Rows saved before isolation:**
  * **Adopted** only by the member they are tied to: the browser's last-known account, or the
    stamp an expired session writes for its account. When the member has no rows yet they move
    byte for byte; otherwise they are combined and none is dropped.
  * **Held** (unread, never deleted) when nothing ties them. A signed-in member then sees one
    line on the Journal: the count, never the contents. A two-press "Bring them into my journal"
    adopts them through the same owner.
* **No browser cache:** the broker review reads (`/api/broker/journal-feed`, the Webull ledger's
  server KV, price-path and FVG-ledger loads) sit behind the server's owner gate or live in memory
  for the page only.

Test: `managementIsolation.test.ts` (A writes → B reads empty → A returns; guest; legacy keys;
sign-out sweep; wiring), with `logoutIsolation.enforcement.test.ts`.

Tests: `managementPlanPersistence.test.ts` (including save → reload identity of the fvgRef, the
plan, and the order of amendments).

## 8. Empty states

Each surface says what is missing and names the next action. There are no blank cards, no
"0 of 0", and no "0 %".

| Surface | Empty state |
|---|---|
| Personal Edge | "no trade in your Journal has a frozen plan yet — write the plan on the ticket's plan card before your next trade" |
| Review, story placed outside WM / entry not from a WM ticket | Why there is no plan, and how the next one gets one |
| Plan card | "Anything left blank stays UNRECORDED" |
| Review card | Offers "record it now (marked as written after the trade)" |
| Morning Prep | "Write one rule above and press Save" |
| Academy | Names "Reference an FVG" |
| Founder analytics | "nothing to count yet" |
| Guests | Signed-out users never see the rules section; no broker → no analytics |

Test: `managementEmptyStates.test.ts`.

## 9. Time and money owners

* **Time:** every time a trader reads is local time with its zone, through `traderClock`
  (`src/components/time/traderClock.ts`). There is no bare UTC and no zone-less clock. Tests
  compute expected times through the same owner and pass in UTC, Asia/Kolkata and America/Los_Angeles.
* **Money:** every money value goes through `formatMoney` (`src/lib/marketData/contractEconomics.ts`).
* **Market day:** New York (`marketDayKey`).

Test: `managementSheriff.sentinel.test.ts`.

## 10. The loop (§56)

Morning Prep → chart → ticket plan card → Journal → Review → Personal Edge → Academy → back to
Morning Prep. Every door is named in `planLoop.ts` and lands on a real route or lesson.
`learningLoop.integration.test.ts` walks one Decision_ID through every hop. It asserts:
* the same identity at every hop;
* the plan as frozen at the send (a paper fill does not refreeze it);
* the FVG state as of the decision (`readAsOfMs ≤ decisionAtMs`).

The certificate row is §10 of `GARDEN19-INVENTION-CERTIFICATES.md`.

## 11. What is PARTIAL on serving, and why

The serving walk (6e65180, read only, own Chrome tab, 1440 + 390) proved:
* Morning Prep → chart;
* the plan card on the TRADE panel and its Morning Prep door;
* the Academy's "learn yourself" doors and every lesson a Review finding links to.

The following were **not seen on serving**, because the Founder's account has **no frozen plan,
no journal entry from a WM ticket, and no FVG reference** yet. They are proved by unit/integration
tests and by local renders only:
* the three-column Review with deviations;
* Personal Edge adherence;
* the FVG study list;
* market vs execution edge;
* Academy "my examples";
* the plan card's Journal door;
* SpaidBot's plan line.

Also not yet proved with real broker data, and therefore **printed as UNKNOWN in Review** wherever
broker actuals are shown (`BROKER_READBACK_UNKNOWNS` in `planActualsFromBroker.ts`):
* that tastytrade's same-day order list keeps cancelled/replaced Stop orders (needed to see every
  stop move);
* that a stop moved through tastytrade's own replace keeps WM's external identifier.

Journal auto-capture is proved on fixtures of every fill shape seen in readback (§2), not yet on a
real fill. Webull is Review-only: its two readback limits (no stop/target orders, no open/close
flag) are printed as UNKNOWN (`WEBULL_READBACK_UNKNOWNS`), and no WM-sent Webull decision has been
reviewed on serving yet.

WM never writes a plan, a draft or a rule on the Founder's account. Only his own actions do.
