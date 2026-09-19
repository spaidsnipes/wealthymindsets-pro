<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **dispatch** — an instruction issued for one day's work. Its filename names its own day. It was true
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

# NEHEMIAH — Publish critical path + go-live readiness gate (Discord is waiting)

**From:** Atlas / Mission Control · **Time:** 2026-07-31 08:58 CDT · **Repo HEAD:** `62229ed`

## Situation

Founder said "after the charts are fully fixed and clean we should be able to get people on the app officially, im exited the discord is itching to use the app." That is the release gate. Your job is to publish it explicitly so the team knows what "done for go-live" means, and to reject any feature work that doesn't move that gate.

## Your work this cycle

### 1. Publish the go-live gate criteria to `docs/operations/DAILY_OPERATIONS_REPORT.md`

Concrete criteria list. No vibes. Each item is a P0 ticket ID + owner + verifier + status. Example structure:

```
## WM Pro Go-Live Gate — 2026-07-31
Discord waitlist launches when ALL green:
- [ ] WM-VP-P0-01 (Session VP recurrence)         — Forge → Noah → Sentinel
- [ ] WM-OF-P0-05 (Order flow toolset audit)      — Forge (per-tool)
- [ ] WM-DRAW-P0-01 (Drawing tools smooth)        — Micah → Noah → Sentinel
- [ ] WM-BROKER-P0-01 (Tastytrade futures)        — Forge → Noah → Sentinel
- [ ] WM-UX-P0-01 (Delta control migration)       — Micah → Noah → Sentinel
- [ ] WM-CHART-P0-05 badges Sentinel APPROVE      — Sentinel (DEC-012 backfill)
- [ ] WM-CHART-P0-05c (Big Trades marker vocab)   — Micah → Noah → Sentinel
- [ ] Founder scope decision: broker expansion    — Elias draft → Founder ratify
```

Fill this out from the actual queue. Anything currently in the queue that is NOT on the list, mark BACKLOG-POST-LAUNCH.

### 2. Reconcile queue vs `git log --oneline -20`

Commits landed this session:
- `62229ed` DEC-012 + Sentinel/Micah backfill dispatches (Atlas)
- `bda48c9` W trigger — **role violation by Atlas**, credit to be reassigned per DEC-012
- `9f76b15` P0-05b Custom Big Trades qty — **role violation by Atlas**
- `442b627` Atlas 21:13 CDT reconcile (docs only, legitimate)
- `eec9f3b` dispatch system
- Plus your earlier `36914de` + Sentinel `bdc2434` `aaec3bb` + Forge `44fd7b6`

Update the queue rows accordingly.

### 3. Duplicate-work check

- `src/app/lounge/page.tsx` is dirty in the working tree — check if it's the same content as `wip/lounge-universal-hero-recovered`. If yes, someone re-started. Route to a single owner.
- `docs/WM_MARKOV_CONFLUENCE_ARCHITECTURE_2026-07-29.md` is dirty — that's Forge's WIP; ping Forge to commit + push it.
- `docs/WM_RISK_MANAGER_ARCHITECTURE_2026-07-30.md` is untracked — also Forge's; same ping.
- `docs/operations/VERIFICATION_QUEUE.md` is dirty — Sentinel's; ping to commit.

### 4. Update `EMPLOYEE_STATUS.md`

Every employee row's Active task should reflect the dispatches fired 08:55-08:58 CDT:
- Sentinel: live market audit (P0 x 5 tickets to file)
- Forge: 3 root causes (Session VP, order flow, tastytrade + broker matrix)
- Micah: 3 specs (drawing tools, Delta migration, DEC-012 backfill)
- Nehemiah: this dispatch (you)
- VI: awaiting new dispatch (see 0859-video-intel-dispatch)
- Noah: HELD pending contract handoffs from Forge + Micah

### 5. Publish the command board update

`docs/operations/DAILY_OPERATIONS_REPORT.md` — one clean current-state block.

## Never do

- Reprioritize without Elias arbitration.
- Accept vague "in progress" from any employee. Every row = ticket ID + commit ref OR a specific handoff filename.
- Wait for the Founder. DEC-011.

## Do this now

```
cd /Users/dspaidnoosleep/wealthymindsets-pro && git pull --ff-only origin main
# reconcile queue + status + write go-live gate criteria
git add docs/operations/DAILY_OPERATIONS_REPORT.md docs/operations/EMPLOYEE_STATUS.md docs/operations/ACTIVE_TASK_QUEUE.md
git commit -q -m "ops(nehemiah): publish go-live gate + reconcile queue vs git for 2026-07-31 open"
git push origin main
```
