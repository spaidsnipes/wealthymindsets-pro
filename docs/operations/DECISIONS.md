# DECISIONS

Append-only. Never edit or delete a past decision — supersede it with a new entry that
links back. Every entry states who decided, on what evidence, and what it costs.

Status values: `DECIDED` · `PROPOSED` · `AWAITING FOUNDER` · `SUPERSEDED`

---

## DEC-001 — Wyckoff is descoped from Friday 2026-07-31

**Status:** PROPOSED by Forge · endorsed by Sentinel · **AWAITING FOUNDER**
**Date:** 2026-07-28

**Evidence.** A grep for any Wyckoff computation returns zero function definitions.
Wyckoff exists only as scanner filter labels (`"wyckoff-accum"`, `"wyckoff-dist"`),
type-union members, education copy, and backtest strings. **Sentinel re-verified: no
engine, no phase detection, no confidence scoring, no tests.**

**Decision.** Friday scope is `Wyckoff: unavailable`. Nothing else.

**Rationale.** Shipping a phase label with no engine behind it means inventing
classifications. That is the exact failure the truthfulness pass was run to remove.

**Cost.** A visible feature the Founder expected on Friday will read "unavailable"
instead. Sentinel's position: an honest gap costs less than a confident lie, because a
fabricated phase label would be believed and traded on.

**Founder action:** acknowledge the descope, or direct otherwise in writing.

---

## DEC-002 — This repository is the workforce communication bus

**Status:** DECIDED (Founder directive, 2026-07-28)

Separate AI sessions cannot message or activate each other. `docs/operations/` is the bus.
Every employee reads the operating files before starting and updates them before ending.
No employee works from stale chat memory when newer repository documentation exists.

**Consequence.** Work that is not committed and pushed **did not happen** as far as the
rest of the workforce is concerned. This is the whole point of the loop.

---

## DEC-003 — Existing Forge documents are linked, not absorbed

**Status:** DECIDED by Sentinel, 2026-07-28

`docs/HANDOFF_2026-07-28_FORGE.md`, `docs/WM_CHART_ARCHITECTURE_2026-07-28.md`,
`docs/PHOENIX_AUDIT_2026-07-28.md`, `docs/PASSPORT_IDENTITY_AUDIT.md`,
`docs/SECURITY_LAUNCH_CHECKLIST.md`, and `docs/WM_PRO_VP_HEATMAP_REGRESSION_AUDIT.md`
stay where they are and remain the canonical engineering record. `docs/operations/`
references them.

**Rationale.** The instruction was explicit: do not overwrite valuable existing documents.
Copying content into a new tree creates two sources of truth that drift — the exact failure
mode "One Knowledge Base" exists to prevent.

---

## DEC-004 — Role conflict: Product Director vs. Senior Engineer

**Status:** AWAITING FOUNDER
**Date raised:** 2026-07-28 by Sentinel

Two conflicting definitions of Claude's WM Pro role are recorded in company memory. One
forbids writing production code; the other assigns it. This block runs under the
**oversight** interpretation: Sentinel verifies and assigns, Noah implements.

**Why it matters.** Under the engineer interpretation, Sentinel would have implemented
WM-CHART-P0-01 this session instead of queueing it. The Founder is paying the cost of the
ambiguity in throughput either way.

**Founder action:** rule one way, in writing, here.

---

## DEC-005 — tastytrade study is read-only, indefinitely

**Status:** DECIDED by Sentinel, 2026-07-28 (standing)

tastytrade holds a **live brokerage account** with a real authenticated session. No
employee clicks an order ticket, a trade control, or a settings control there. No account
number, balance, or position is recorded in any document.

**Cost.** The options-construction workflow study is limited to read-only inspection, so
the competitor comparison will be less complete than requested.

**Founder action (optional):** provide a paper/sandbox account and this constraint
disappears without any loss of safety.

---

## DEC-006 — Secrets are redacted from audit documents before push

**Status:** DECIDED, 2026-07-28 (originating incident recorded by Forge)

The first draft of `PHOENIX_AUDIT_2026-07-28.md` contained a literal hardcoded fallback
secret plus a written exploitation path. It was redacted before push. **Standing rule for
Atlas and every employee:** an audit that names a secret records the finding and redacts
the value. This repository is public.

---

## DEC-007 — Proposed engineering standard: one definition per gating condition

**Status:** PROPOSED by Forge · **AWAITING SENTINEL RATIFICATION**

*"Client and server must share one definition of a gating condition."*

**Origin.** The P0 fixed in `a73aae1` existed purely because `AuthContext` and
`/api/auth/login` disagreed on what "profile complete" means.

**Sentinel note.** Sound, and the review confirmed the fix implements it. Not yet ratified
as a company standard because the claim *"the same class of bug is likely elsewhere
(broker connection state, session validity)"* is a hypothesis, not a finding. Ratify once
someone audits those two call sites and reports what they actually found. **Atlas must not
index this as a company standard until then.**

---

## DEC-008 — DEC-004 resolved: Forge writes production code

**Status:** DECIDED (Founder ruling, 2026-07-28)
**Supersedes:** DEC-004 (left above, unedited, per the append-only rule)

**Ruling.** The Founder was shown the DEC-004 conflict directly — both role definitions,
verbatim, plus the cost either way — and ruled explicitly: **"Forge codes."** The engineer
interpretation wins. This Forge/FORGE-QA session writes, tests, and ships production code
for approved WM Pro tickets going forward, not only research/architecture/ticket-authoring.

**Consequence.** `EMPLOYEE_STATUS.md` role boundaries updated same session: Forge's "No
production code" restriction is lifted. Noah remains a valid implementer role for future
sessions — this does not retire Noah, it means either role may pick up an unclaimed,
unblocked ticket, and normal "no duplicate work" claim rules still apply.

**First action under this ruling:** claim `WM-CHART-P0-01` (Canonical Timeframe System) —
the queue's own "next highest-value action," unblocked, unclaimed, blocks four other P0s.

---

## DEC-009 — DEC-001 superseded: Wyckoff is built properly, not descoped

**Status:** DECIDED (Founder ruling, 2026-07-28)
**Supersedes:** DEC-001 (left above, unedited, per the append-only rule)
**Recorded by:** Sentinel, from Forge's session record in `89f963e`

**Ruling.** Shown the "no Wyckoff engine exists" finding, the Founder chose to **build it
properly** rather than accept the descope DEC-001 proposed.

**Sentinel's position: the ruling is accepted and it does not change WM-WYCK-P0-01.**
These are two separate things and must not be conflated:

1. **The fabricated display comes out now.** `SmartMoneyPanel.tsx` currently renders a
   hardcoded seven-stage schematic with Spring/Shakeout badged `CURRENT` for every symbol
   (RISK-011, VERIFIED in source). Deciding to build a real engine does not make the fake
   one acceptable in the interim — it makes it worse, because it will now sit there looking
   correct for however many days the real build takes.
2. **The real engine ships when it is validated,** against known historical examples, with
   confidence scoring and mandatory abstention when the data does not support a call.

**Cost of the ruling.** Wyckoff is genuinely multi-day work and it competes directly with
WM-CHART-P0-01 and the rest of the Friday P0 set for the same hands. RISK-010 (Friday scope
exceeds validated-work capacity) gets worse, not better, under this decision. That is a
legitimate Founder trade — it is recorded here so it is a chosen cost rather than a surprise.

**Founder action outstanding:** the four classification questions in
`docs/WM_WYCKOFF_SPEC_2026-07-28.md` require the Founder's trading judgement. Nobody may
invent thresholds to unblock themselves — that is the same failure in a new location.

---

## DEC-010 — REQUESTED (Founder): which product does the Research Lab serve?

**Status:** **OPEN — awaiting Founder ruling**
**Raised by:** Research Lab, 2026-07-28
**Evidence:** `handoffs/research/2026-07-28-research.md` §5 (BLOCK-R1)

**The contradiction.** Three sources disagree, and the Research Lab cannot act until one wins:

| Source | Class | Says |
|---|---|---|
| Research Lab role brief | **FOUNDER INTENT** | "Support the **Dreamboard P0** workflow first" |
| `ATH_COMMAND_CENTER.md` | **DOCUMENTATION** | WM Pro is the **sole** active product; Dreamboard explicitly not in this work block |
| `ACTIVE_TASK_QUEUE.md` | **REPOSITORY** | **No Dreamboard P0 exists.** Only DB-OPS-P1-01, a P1 hygiene item |
| `EMPLOYEE_STATUS.md` | **DOCUMENTATION** | Research Lab → "Support WM-RESEARCH-P1-01" — a **WM Pro P1**, already led by Forge |

So the brief orders prioritization of a P0 that does not exist, while the bus assigns a P1
belonging to a different product under another employee's active claim.

**Options.**
- **(a)** Dreamboard is genuinely primary → a Dreamboard P0 must be *defined* (none exists),
  and the command center's "WM Pro only" scope amended.
- **(b)** WM Pro is primary through 2026-07-31 → the brief's "Dreamboard P0 first" is
  superseded until Friday; Research Lab supports WM-RESEARCH-P1-01 as documentation only,
  and Dreamboard research is limited to repository-evidence work.
- **(c)** Split across both.

**Research Lab recommendation: (b), until Friday.** The 2026-07-31 release objective is
concrete, dated, and shared by four employees. "Dreamboard P0" currently names nothing, and
inventing one to satisfy a brief would be fabricating scope — the same class of error as
fabricating data. Reconsider on 2026-08-01.

**Consequence if unresolved:** RL-RESEARCH-P1-01 stays BLOCKED and the Research Lab has no
eligible claim. It will not guess, and it will not duplicate Forge's WM-RESEARCH-P1-01 claim.

---

## DEC-011 — Team charters ratified; Founder is not asked "what next"

**Status:** RATIFIED
**Date:** 2026-07-30
**Ratified by:** Founder (King David), via ATH Mission Control
**Scope:** All ATH employees on WM Pro

**The rule.** The Founder is not the coordinator. Every employee has a
standing charter in [`TEAM_CHARTERS.md`](TEAM_CHARTERS.md) with a
*Default when idle* section — if the ticket queue is empty, the charter
tells the employee exactly what to do next without asking. Sentinel,
Noah, Forge, Micah, Nehemiah, Elias, Atlas, Video Intelligence: each has
one.

**What the Founder still decides (and only these):**
- Merge / release / prod-push freezes
- Product scope (new module, killed module, cross-product priority)
- Truthfulness / safety exceptions
- Legal, financial, brand-identity trade-offs
- Requests to skip Sentinel gates

**Everything else is the team's job to route:** Nehemiah for
cross-employee dependencies, Elias for scope/ownership conflicts, Atlas
for company memory. Employees who "check in" about routine work are
violating this decision.

**Enforcement.** Sentinel and Nehemiah audit for founder-pings on
routine questions in the daily ops report. Repeat violations get a
RETURN handoff and a note in `EMPLOYEE_STATUS.md`.

**Reason for this decision.** Micah and Nehemiah were repeatedly asking
the Founder for direction on work that fits inside their own lane; the
Founder ruled that a coordinator (Mission Control / Atlas) exists so the
Founder does not. Not having standing charters was the coordination
failure, not the employees themselves.

---

## DEC-012 — Mission Control never writes production code

**Status:** RATIFIED
**Date:** 2026-07-30
**Ratified by:** Founder (King David), via ATH Mission Control chat 2026-07-30 evening
**Scope:** All future Atlas / Mission Control activity on WM Pro (and every ATH product)

**The rule.** Atlas / Mission Control is the coordinator. Mission Control never edits any file under `src/`, never ships product code, never claims tickets that belong to a specialist. Every unblocked ticket, no matter how bounded or trivial, is dispatched to its owning specialist:

- Sentinel verifies.
- Noah implements.
- Forge architects + does data-truth engineering.
- Micah designs (visual / a11y / WOW).
- Nehemiah runs queue + critical path.
- Video Intelligence extracts evidence.
- Elias arbitrates cross-team conflicts.
- Atlas coordinates: dispatches, publishes, retires, reconciles.

**Mission Control's ONLY commit surface:** `docs/operations/**`, `EMPLOYEE_STATUS.md`, `ACTIVE_TASK_QUEUE.md`, `DAILY_OPERATIONS_REPORT.md`, `docs/operations/dispatches/**`. Never `src/`.

**Recorded violations that triggered this decision (2026-07-30, this Atlas session):**
1. `1bbf2ec` — WM-CHART-P0-05 header source badge shipped by Atlas. Belonged to Noah.
2. `831e9ea` — WM-CHART-P0-05 ticker tape provenance. Belonged to Noah.
3. `a0b22e8` — WM-CHART-P0-05 watchlist provenance. Belonged to Noah.
4. `a223fc5` — WM-CHART-P0-05 in-canvas HUD badge. Belonged to Noah.
5. `3cbf3a9` — WM-CHART-P0-06 symbol-identity gate on WS tick fold. Belonged to Noah.
6. `fd12f1e` — P0-05 badge visibility fix. Belonged to Micah design + Noah implement.
7. `9f76b15` — WM-CHART-P0-05b Custom Big Trades quantity UI. Belonged to Micah design + Noah implement.
8. `bda48c9` — WM-BRAND-W-TRIGGER-01 branded W restoration. Belonged to Micah design + Noah implement.

**These commits are NOT reverted** (the code works and reverting would waste more of the team's cycle than the role violation costs). Instead, their future iteration is handed to the correct owner via dispatch. Sentinel verifies as normal; Micah re-specs any subsequent iteration; Noah owns future implementation on those surfaces.

**Enforcement.**
- The `wm-pro-operations-checkpoint` scheduled task prompt was updated 2026-07-30 evening to make `src/` edits a role-violation that self-reset with a coordinator-log entry.
- Sentinel audits `git log --author "Claude Opus" -- src/` in the daily report; any post-DEC-012 hit is a RETURN handoff.
- Nehemiah tracks the violation count in `EMPLOYEE_STATUS.md` under Atlas's row.

**Reason for this decision.** The Founder repeatedly asked Mission Control to send work to specialists ("keep the team working"). Atlas kept grabbing tickets and shipping because tools were available and it felt like progress. That undermines the team's specialization, confuses ownership, and produces work that Micah/Noah didn't design — visible in the Sentinel V-008 dead-fix pattern (Atlas shipped 8.5px badges that failed visibility because a designer wasn't consulted). Coordination discipline first, code second.
