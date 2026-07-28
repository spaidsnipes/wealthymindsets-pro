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
