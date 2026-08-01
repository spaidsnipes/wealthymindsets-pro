# FOUNDER — BLOCKER CARD · WM-SEC-P0-02 · Supabase RLS always-true write/delete policies

**From:** Nehemiah (Operations & Critical Path) · **Time:** 2026-07-31 09:56 CDT · **Repo HEAD:** `aa68aa0`
**Blocks:** Discord waitlist launch. **Severity:** HIGH. **Ask:** decision + a maintenance window.

## The ask (one decision, two sub-questions)

**Decision:** approve the staged Supabase RLS fix to run, or accept `WM-SEC-P0-02` as an
open launch blocker on the go-live gate.

If **approve**, we need from you:
1. **A maintenance window** (~30 min) — writes briefly pause during policy swap.
2. **A backup checkpoint confirmation** — Supabase project `zrzaifaxecwgpfrqctkp` is shared
   with Dreamboard (verified — see [[wm-passport-supabase-identity]]). Confirm you want a
   pre-fix export before we run.

Reply with one of:
- **"APPROVE — window: [time], backup: yes"** — Forge runs the staged migration.
- **"APPROVE — window: [time], backup: no (accept risk)"** — same, without export.
- **"DEFER — accept as open blocker"** — gate B §10 stays RED; Discord waitlist does not open until this ships.
- **"NEED MORE INFO"** — Forge writes a one-pager summarising the exact policy changes and expected user-visible impact.

## Why this is a launch blocker

Current RLS is *always-true* on write and delete for shared tables. Once real users sign in
via the Discord waitlist, **any authenticated user can UPDATE or DELETE any row belonging
to any other user** — including Dreamboard rows on the same project. This is not "a small
bug" — it is a cross-tenant data-loss exposure. Onboarding real users into this state means
one griefer can wipe another user's data (or Dreamboard's) with a plain API call.

## Why it's on you, not on us

The fix is written and staged — Forge has the migration ready. Running it against
production DB requires: (a) your window (writes pause briefly), (b) your call on backup
(costs a few minutes + storage), (c) your acceptance that if Dreamboard has WIP in that
project, we should coordinate its downtime too. Employees do not make prod-DB decisions
without a Founder ruling — that's the DEC-011 boundary in the *"never do"* direction.

## What ships on APPROVE

- Migration replaces `USING (true)` policies with `auth.uid() = user_id` (per-row ownership).
- Sentinel runs post-migration checks: (i) each user can still read/write their own rows,
  (ii) each user *cannot* read/write anyone else's, (iii) Dreamboard rows unaffected.
- Nehemiah flips gate B §10 GREEN in the next sweep.

**Cross-refs:** `DAILY_OPERATIONS_REPORT.md` §B row 10 · `RISKS_AND_BLOCKERS.md` RISK-003 ·
`ACTIVE_TASK_QUEUE.md` WM-SEC-P0-02 · shared-project note: [[wm-passport-supabase-identity]].
