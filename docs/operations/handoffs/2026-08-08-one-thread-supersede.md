<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **hand-off record** — a transfer of state between two workers. Its filename names its own day. It was true
> on that day and is preserved as evidence of what was observed and decided
> then. Do not take a current action, diagnosis, release decision or task claim
> from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference below is a `GHOST_HOST` signal: the
> Vercel host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-19 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which
> until that day scanned only the top level of `docs/operations` and could not
> see this directory at all. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

# ONE-THREAD MODE ACTIVE — 2026-08-08

**Effective:** 2026-08-08
**Authority:** Founder directive "ULTIMATE AUTONOMOUS SUPERTEAM MASTER BUILD DIRECTIVE"
**In effect for:** WealthyMindsets Pro **only** (not Dreamboard, not other repos)

## Notice to every role thread

The multi-thread bus (separate Atlas / Sentinel / Forge / Noah / Micah / Nehemiah
chats coordinating via `docs/operations/`) is **superseded** for WM Pro engineering
work. One Claude thread now embodies all roles.

**Do not open a new per-role chat for WM Pro P0 work under this directive.** If
you already are one, stop at your next natural checkpoint, commit your in-flight
work, and note it here.

## Why

The Founder directive lists (verbatim): duplicate work, repeated rebuilding,
stale-context development, agent fragmentation, five-forward-five-back, multiple
competing implementations, unfinished handoffs, role hopping, duplicated tickets,
duplicated stores, duplicated calculations, abandoned branches. He asked for
one thread to fix compounding fragmentation.

## Push authority (WM Pro P0 scope)

Extends the prior standing "deploy autonomously" order to include:

- Supabase auth config changes
- RLS policy writes
- Secret rotation
- Direct main pushes for P0 hardening

Confirmed by Founder in-chat on 2026-08-08 via explicit choice. Self-verify +
checkpoint; no per-action confirmation. Surgical edits only, no force-push,
never bypass hooks.

## What was preserved from the outgoing bus

Committed alongside this notice:

- Mechanical rename **WM-DATA-P0-01 → WM-DATA-P0-02** in `ACTIVE_TASK_QUEUE.md`
  (Atlas 23:10 CDT checkpoint from 2026-08-07 that collided with the
  Live-quote-regression ticket of the same ID; not a priority or ownership
  change).
- Four Atlas 23:10 dispatch handoff notes under
  `docs/operations/dispatches/2026-08-07/` (Forge broker P1-04, Micah mobile
  P0-01, Nehemiah resweep, Noah two emergency tickets). These represent
  assignments the multi-thread bus made just before supersede — the assigned
  roles never picked them up because one-thread mode intervened first.

## What is not paused

- The `docs/operations/` queue, decisions log, and handoff structure remain
  authoritative — one thread still writes to them.
- Founder-gated tickets (WM-SEC-P0-01 apply, WM-SEC-P0-02, WM-VERIFY-P0-01)
  still wait for Founder input where the queue explicitly requires it. The
  queue also authorizes hardening commits before those answers arrive — those
  proceed under the new authority.
- Other products (Dreamboard, WOW World) keep whatever thread structure they
  had. This directive is scoped to WM Pro.

## First action under the new authority

**WM-SEC-P0-01 hardening commit** — `src/lib/auth.ts:12`. Make an unset (or
committed-fallback-equal) `JWT_SECRET` throw on module load in production.
Small, unblocked, on the directive's P0 auth/secret priority list, and the
queue itself explicitly authorizes writing this before the Founder's yes/no on
whether the env var is set in Vercel.
