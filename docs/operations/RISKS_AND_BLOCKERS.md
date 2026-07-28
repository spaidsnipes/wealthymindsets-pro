# RISKS AND BLOCKERS

**Owner:** Sentinel · **Last updated:** 2026-07-28 10:50 CDT

Severity: **HIGH** (threatens launch, data integrity, or user trust) · **MEDIUM**
(causes lost work or wrong decisions) · **LOW**.

---

## RISK-001 — No live or authenticated verification is possible · HIGH · **OPEN**

**Impact.** Every claim about WM Pro's runtime behaviour is UNKNOWN. All 21 items of the
trading-system checklist (auth, session persistence, dashboard, charts, symbol switching,
VWAP, volume profile, DOM, order book, watchlists, broker connection, paper trading,
positions, orders, account data, alerts, scanner, layout saving, settings, error handling,
loading states, offline recovery) are unexercised. WM Pro's own chart performance has
**never been measured** — there is a competitor baseline and a working harness, and zero
WM Pro numbers.

**Root cause — VERIFIED by Forge.** The running browser is
`/Users/dspaidnoosleep/Desktop/Google Chrome.app`, a copy on the Desktop, while
`/Applications/Google Chrome.app` also exists. AppleScript-driven tools resolve "Google
Chrome" at the standard location, fail to match the running Desktop copy, and report *"not
running"* — while extension/tab APIs succeed because they do not depend on the bundle
path. That single discrepancy explains contradictory results that have now blocked three
sessions.

**Mitigation — Founder, ~2 minutes.** Quit Chrome, move `Google Chrome.app` from the
Desktop into `/Applications`, relaunch from there, re-test. Alternative: the Founder signs
in to WM Pro personally in the browser pane. **No employee will type the Founder's password
or forge a token.**

**Blocks:** WM-VERIFY-P0-01, the perf half of WM-TEST-P0-01, deep competitor comparison,
and every "is it actually smooth?" acceptance criterion.

---

## RISK-002 — `JWT_SECRET` may be unset in production · HIGH · **OPEN**

**Evidence — VERIFIED by Sentinel.** `src/lib/auth.ts:12` reads
`process.env.JWT_SECRET ?? "<committed fallback>"`. If the variable is unset in Vercel,
every session cookie is signed with a value present in a **public** repository. Anyone able
to read the repo could mint a valid session for any account.

**Why it is still only *may*.** Nobody has checked Vercel. The failure is silent by
construction — the app boots and behaves normally either way.

**Mitigation.** (a) Founder confirms the var is set — *do not paste the value anywhere*.
(b) Ship a hardening commit so an unset `JWT_SECRET` throws on boot in production instead
of degrading quietly. (b) can be written before (a) is answered.

**Ticket:** WM-SEC-P0-01.

---

## RISK-003 — Supabase RLS: always-true write/delete policies · HIGH · **OPEN**

**Evidence.** `docs/PASSPORT_IDENTITY_AUDIT.md`: always-true write/delete policies on
`lounge_posts` / `likes` / `comments` / `follows` and `radio` inserts; broad public `radio`
storage listing; leaked-password protection disabled.

**Impact.** Any authenticated user may be able to delete another user's content. Launch
blocker.

**Compounding factor.** The Supabase project (`zrzaifaxecwgpfrqctkp`) is **shared with
Dreamboard**. A careless policy change breaks two products at once. Requires a backup and
policy tests before anything is applied. **Do not apply blind.**

**Ticket:** WM-SEC-P0-02.

---

## RISK-004 — 192 lines of unowned, uncommitted work · MEDIUM · **OPEN**

**Evidence — VERIFIED by Sentinel.** `src/app/lounge/page.tsx` carries a ~192-line
"Universal Lounge" hero redesign (Discover / Live / Watch / Listen / Rooms modes,
`UniversalLoungeHero` component). It exists on **one machine**, on **no branch**, in **no
commit**. No employee has claimed it. It has survived at least two sessions untouched
because each successive employee correctly declined to commit work they did not write.

**Impact.** One `git checkout` or a disk failure and it is gone. It also silently dirties
the working tree for every employee who follows, which erodes the "confirm your working
tree" step of the operating loop.

**Mitigation.** Founder decides **today**: commit it to a `feature/universal-lounge`
branch as a checkpoint (no review implied, no merge to `main`), or discard it. Sentinel
recommends the branch — it is free and reversible.

**Ticket:** WM-DEBT-P2-05.

---

## RISK-005 — Documentation cites issues that do not exist · MEDIUM · **OPEN**

**Evidence — VERIFIED by Sentinel 2026-07-28.** Handoffs and company memory reference
"issue #78" (cross-tab tape dedupe) and "issue #76" (futures tape). Both return **404**
from the GitHub API. `gh issue list --state all` on `spaidsnipes/wealthymindsets-pro`
returns **nothing** — the tracker has zero issues, ever, despite issues being enabled.

**Impact.** Employees citing ticket numbers that resolve to nothing. It looks like a
tracked backlog and is not one, which is worse than an openly untracked backlog because it
suppresses the instinct to check.

**Mitigation.** Either create real GitHub issues and reference them, or drop issue-number
citations entirely and use the `ACTIVE_TASK_QUEUE.md` ticket IDs (`WM-DATA-P0-01`,
`WM-DATA-P1-01` respectively, which now carry that work). Sentinel has adopted the second
option in this queue.

**Ticket:** WM-OPS-P2-01.

---

## RISK-006 — Stale Desktop clones invite lost work · MEDIUM · **OPEN**

**Evidence — VERIFIED.** `~/Desktop/wealthymindsets-pro` at `6afaf82` (2026-07-07) and
`~/Desktop/wealthymindsets-pro 2` at `2dded78` (2026-07-06) — three weeks behind. The
canonical clone is `/Users/dspaidnoosleep/wealthymindsets-pro`.

**Impact.** An employee who opens the wrong directory produces work that is silently
discarded, and may "fix" bugs that were fixed weeks ago.

**Mitigation.** Founder deletes or archives both Desktop copies. Until then, step 5 of the
operating loop (*confirm repository, branch, HEAD, working tree*) is the safeguard.

---

## RISK-007 — Unverified metrics circulating as company health · MEDIUM · **OPEN**

**Evidence.** A circulated "ATH COMPANY HEALTH" snapshot reported *WM Pro 82%, 18 videos
processed, 42 knowledge packages, 2 critical bugs, 3 dead files recommended*. None of it is
evidence-backed from any session that produced it. One checkable item was close but wrong:
exactly **one** dead file was confirmed and removed (`src/components/chart/BrokerConnectPanel.tsx`);
the other two were never verified to exist. Separately, an analysis of "both uploaded
recordings" circulated when **no recordings existed and no video was viewed**, and a UX
item was marked *"Verified through live interaction"* which is impossible under RISK-001.

**Impact.** This is the most dangerous item on the list, because unverified numbers harden
into a baseline that later decisions are measured against. A false 82% is worse than no
number: it ends the conversation about what is actually broken.

**Mitigation.** **Atlas must re-derive every one of these from evidence or mark them
UNVERIFIED.** No percentage ships in an ATH report without a stated method.

---

## RISK-008 — Dreamboard work is unpushed and drifting · MEDIUM · **OPEN**

**Evidence — VERIFIED.** `~/dreamboard`, branch `feature/project-memory-health`, has three
**untracked** files (`app/memory.tsx` 97 lines, `lib/creative-health.ts` 44,
`supabase/dreamboard-project-memory.sql` 23) and no commit since `ba91915` on 2026-07-23 —
five days. The branch has no upstream.

**Impact.** Same class as RISK-004, in a second product. Cross-project dependency: the
`.sql` file touches the Supabase project shared with WM Pro (RISK-003).

**Mitigation.** Commit and push to the feature branch, or record in `DECISIONS.md` why it
is parked. **Ticket:** DB-OPS-P1-01.

**AMENDMENT 2026-07-28 (Research Lab) — the stated mitigation is unsafe. Do NOT push.**

**Evidence — VERIFIED / REPOSITORY.** After `git fetch`, `origin/main` is at `2049bdd`,
**17 commits ahead** of the local `ba91915`. One of those commits, `8e71195 feat: add
inspectable project memory and creative health`, already ships this feature under
different filenames:

| Local untracked | Upstream on `origin/main` |
|---|---|
| `app/memory.tsx` (97) | `app/memory-health.tsx` (126) |
| `lib/creative-health.ts` (44) | `lib/memory-health.ts` (105) |
| `supabase/dreamboard-project-memory.sql` (23) | `supabase/dreamboard-project-memory-health.sql` (50) |
| *(none)* | `tests/memory-health.test.mjs` (19) |

Verified by substance, not filename: **both migrations create the same object** —
`create table if not exists public.dreamboard_project_memory` and
`create policy "Creators manage their own project memory"`. Upstream is a strict superset
(adds `dreamboard_creative_health_preferences` + RLS, a scope/category taxonomy,
`validateMemoryDraft()`, and a unit test). The local `creativeHealth()` is an earlier draft
of upstream's `deriveCreativeHealth()`.

**Revised impact — recommend raising to HIGH (Sentinel's call).** Pushing the local file
would add a *second* migration defining the same table and policy in the Supabase project
**shared with WM Pro** (RISK-003). This is no longer "work at risk of being lost"; it is
work at risk of being *duplicated into a shared database*.

**Revised mitigation.** (1) Do not push. (2) Line-level diff the three local files against
their upstream counterparts to confirm nothing unique exists locally — **NOT YET DONE**;
symbol, table, policy and line-count comparison only. (3) Founder confirms discard.
(4) Never delete before (2) and (3). Authorship of the local draft is **UNKNOWN** — the
files are untracked and carry no author.

Evidence: `handoffs/research/2026-07-28-research.md` §3.2, §4.

---

## RISK-012 — Cross-product rows are derived from stale local clones · MEDIUM · **OPEN**

**Raised 2026-07-28 by Research Lab.**

**Evidence — VERIFIED / REPOSITORY.** `ATH_COMMAND_CENTER.md` §"Other products" records
Dreamboard's last commit as `ba91915` (2026-07-23). That is the **local branch tip**. The
product's actual state is `origin/main` `2049bdd` — 17 commits and five days further on,
including nine Passport commits, a public front-door entry, and archive intake guards. The
row was wrong within hours of being written, through no fault of its author: it was read
from a checkout that had never been fetched.

**Impact.** Any prioritization or "company state" judgement made from that row is made on
data that under-reports a product by five days. Every product tracked from a local
checkout will drift the same way. Adjacent to RISK-007 (unverified metrics) and RISK-006
(stale clones).

**Proposed mitigation — INFERENCE, not an approved standard; Sentinel rules.** Cross-product
rows record `origin/<branch>` after an explicit `git fetch`, and state the fetch timestamp
beside the hash. A row without a fetch timestamp is treated as UNKNOWN, not as current.

**Related:** BLOCK-R2 — the 17 Dreamboard commits are unverified by anyone and there is no
Dreamboard verification lane or queue entry.

---

## RISK-009 — Three ATH products have no evidence trail at all · MEDIUM · **OPEN**

WOW World and ATHOS have no repository under `spaidsnipes` and no local clone. The Video
Intelligence pipeline folders (`00_Inbox` … `07_Deletion_Manifests`) are not present on
this machine.

**Impact.** Sentinel cannot report status, track milestones, or assess risk for three of
five named products. Any "company state" summary that includes them is guesswork.

**Mitigation.** Founder points Sentinel at where they live (repository, Drive folder ID, or
another machine), or they are formally marked dormant.

**Note on Video Intelligence:** the retention rule stands regardless — **no deletion is
recommended until retention is satisfied**, and any deletion manifest requires Founder
approval.

---

## RISK-011 — A fabricated Wyckoff schematic was shipping · HIGH · **CLOSED same day**

**Resolved in `e1a8c94`** (Forge), **verified by Sentinel** (V-005): the hardcoded array is
gone, replaced with *"Unavailable — phase model not implemented. No phase is inferred for
the current symbol."*, and a regression test now fails the build if the fabricated strings
return. `tsc` 0 errors, tests 12/12.

Found and fixed within roughly ninety minutes. The record below is kept because the
*pattern* matters more than the incident.



**Evidence — VERIFIED by Sentinel in source, 2026-07-28.** Found by Forge (`89f963e`),
independently confirmed. `src/components/smart-money/SmartMoneyPanel.tsx` renders a "Wyckoff
Accumulation Schematic" from a hardcoded literal array. Four phases are marked complete and
**Spring/Shakeout is marked `active` with a pulsing `CURRENT` badge** — for every symbol,
under every market condition, with no price, volume, or tape input anywhere in the path.

**Why this is the most serious item on this register.** RISK-002 and RISK-003 are exposures.
This one is *already happening on every chart view*. The panel states plainly, a few hundred
lines above, that the phase model is not implemented — and then draws seven stages of that
non-existent model's output, styled to look detected. A trader reading "Spring / Shakeout —
CURRENT" will reasonably believe the platform detected a spring in the symbol they are
looking at. It did not. It cannot. Nothing computes it.

The truthfulness pass corrected the honest message in this same file and missed this block
entirely — which is the real lesson: **a truthfulness pass that greps for text misses
fabrication expressed as a data structure.**

**Mitigation.** WM-WYCK-P0-01 — remove or unmistakably re-label the block. Small, unblocked,
independent of every other ticket. **Do this before building the engine**; the engine is
days of validated modelling work, and the lie ships today.

**Related decision.** DEC-009 — the Founder has chosen to build Wyckoff properly rather than
descope it. That decision does not change this one: the fabricated display must come out
now, and the real engine ships when it is validated.

---

## RISK-010 — Friday target exceeds validated-work capacity · MEDIUM · **OPEN**

WM-STATE-P0-01 requires **new market-state modelling** across intervals — thresholds that
must be validated against real data, not chosen. It is not a rewiring job. Rushing it
produces exactly the fabricated-classification failure the Bible forbids.

**Sentinel's honest read of Friday 2026-07-31:** P0-01, P0-02, HEAT-P0-01 and the non-perf
half of TEST-P0-01 are achievable. STATE-P0-01 is at risk. Wyckoff is not achievable and
should be descoped (DEC-001). Nothing involving measured smoothness can be certified at all
while RISK-001 is open.

**Mitigation.** Founder confirms the reduced Friday scope now, rather than discovering it
on Friday.
