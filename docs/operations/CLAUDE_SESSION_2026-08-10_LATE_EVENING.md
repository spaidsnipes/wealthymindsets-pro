# WM PRO CONTINUITY CHECKPOINT — LATE EVENING SESSION

**Date:** 2026-08-10 (late evening, follow-on to `CLAUDE_SESSION_2026-08-10_EVENING.md`)
**Base:** `155853d` → **HEAD:** `52abce2` (pushed)
**Production deployment at handoff:** `dpl_7JJZmTjDU3LP5Et2yG6fuRsFEYpw` READY at `a8853c2`; `52abce2` pushed, Vercel will promote autonomously.

## P0 Nectar — the "observedFrom regression" is confirmed and defended

### Investigation

Built `/api/dev/coverage-inspect` (commit `a8853c2`), founder-auth-gated, reads
`wm_market_coverage_checkpoints` WITHOUT filtering by owner_id. Query result
this evening for BTC:

```
totalRows: 1
distinctOwners: 1  (same as auth.user.sub)
observed_from: 2026-08-10T14:35:01.556Z   (09:35 CDT)
```

Codex morning checkpoint (proven from earlier in this session's chart of prior
probes) had `observed_from = 2026-08-10T09:15:00Z (04:15 CDT)`.

**Interpretation:**
- Only one row exists. Not the "auth sub rotated between sessions" theory.
- Event count still growing (3,103 morning → 3,140 evening), so the operational
  accumulator itself never reset.
- RPC `wm_upsert_market_coverage_checkpoints` uses `least(existing, excluded)` for
  `observed_from` — cannot push forward from any application write.
- Application code has zero DELETE paths on this table (grep-verified).
- Therefore the morning row was **DELETED externally** between morning and evening
  (Supabase dashboard, `pg_cron` job, ad-hoc SQL, or a `DROP TABLE`+recreate).

### Defensive architecture shipped (`52abce2`)

Migration `20260811020000_wm_market_coverage_first_seen.sql`:

- New table `wm_market_coverage_first_seen` with same primary key. INSERT-ONLY —
  `grant select, insert on ... to service_role` (no UPDATE / DELETE grant, even
  for the app's own role). Once a first observation lands, it cannot be modified
  by application code.
- Trigger `wm_coverage_first_seen_trg` on `AFTER INSERT OR UPDATE OF observed_from`
  of the checkpoints table populates first_seen with `ON CONFLICT DO NOTHING` —
  idempotent, never overwrites.
- Seed statement populates first_seen from current checkpoints at migration time,
  so whatever the earliest surviving `observed_from` is when the founder applies
  this migration becomes the durable minimum going forward.
- Read-side helper `wm_coverage_earliest_observed_from(...)` returns
  `LEAST(checkpoints.observed_from, first_seen.observed_from)`.

GET route `/api/market-memory/coverage` updated: fetches both tables in parallel
and returns `LEAST` per row. Degrades gracefully — if the migration hasn't been
applied yet, the first_seen fetch errors, the route falls back to checkpoint-only
values (unchanged behavior).

**ACTION REQUIRED FROM FOUNDER:** WM Pro migrations do not auto-apply. Run
`supabase db push` from the wealthymindsets-pro repo, or apply the SQL manually
via the Supabase dashboard. Until then, the guard is inert.

### What this fix does and does not do

- **Does not** recover the morning data that's already gone. That's lost.
- **Does** prevent all future `observed_from` regressions regardless of what
  destroys the operational row — the immutable first_seen ledger cannot be
  overwritten by application code, only by superuser DDL.
- **Does not** identify the mechanism that deleted the morning row. The next
  investigation step is to inspect `pg_cron.job` and Supabase audit log via the
  dashboard, since we cannot query those from the app's service role.

## Also fixed this session (from prior evening thread)

Commits `9b67b6d` (intraday chart fit — answers "TSLA only from 2pm today") and
`38c66d1` / `155853d` (session receipts).

## Not done this session — deliberately, not blocked

**Smart Money / chart-header cleanup per founder mid-session directive.** The
existing `SmartMoneyPanel` (`src/components/smart-money/SmartMoneyPanel.tsx`,
926 lines) already has 6 sections that map to the directive's suggested IA
(VWAP / Order Flow / Delta / Iceberg / Regime / CLC). The infrastructure exists.
The remaining work — collapsing the `WM SESSION · PROXY · Trades 55 · Big 47 ·
Seen 437` chip on the default chart into a small dot, exposing full telemetry
only on click — needs a proper design pass (default state, expanded state,
mobile layout, persistence of user preference). One-turn hack would violate the
founder standard.

Queued as **exact next-session start #1**: convert `wm-live-session-chip` into
a `<SessionChipCompact />` component with `useState('collapsed' | 'expanded')`,
default collapsed (dot + fidelity label only), expand on click.

## Not done this session — actually blocked

- **Videos.** `mcp__computer-use__request_access` for Photos/Finder/QuickTime was
  denied at the OS dialog. Cannot access recordings without approval. Founder must
  approve the dialog OR export from Photos → Desktop.
- **Supabase `pg_cron` inspection.** The service role can query application tables
  but not the `cron` schema. Need dashboard or a role with elevated grants.

## Prod state at handoff

- Deployment: `dpl_7JJZmTjDU3LP5Et2yG6fuRsFEYpw` READY at `a8853c2`. `52abce2`
  pushed to `origin/main` and will promote automatically.
- Server-durable coverage (from `/api/dev/coverage-inspect`):
  - BTC / coinbase / seen 3,140 / observed_from 14:35:01 UTC (regressed)
  - TSLA / alpaca-external-relay / seen 610 / observed_from 19:42:27 UTC
  - AAPL / alpaca-external-relay / seen 610 / observed_from 19:57:03 UTC
- 44 test files / 308 tests pass. Zero regressions.

## Commits shipped this thread (base c178b88 → 52abce2)

| Commit | What |
|---|---|
| `aa268e2` | MainChart header truth guard |
| `098a283` | Bottom index bar `0.00` → `—` truthful placeholder |
| `8d0c59e` | Killed `TSLA -18.62%` at useWebSocket seed source |
| `b4691a4` | Alpaca-relay equity trades ingest into Nectar |
| `fdcec8d` | Rights registry v2 (6 per-action fail-closed gates) |
| `422f556` | CanonicalMarketState pure producer |
| `9b67b6d` | Intraday chart fit — "TSLA only from 2pm" fix |
| `38c66d1` | Afternoon session receipt |
| `155853d` | Evening session receipt |
| `a8853c2` | `/api/dev/coverage-inspect` diagnostic route |
| `52abce2` | Immutable `first_seen` ledger + GET-route LEAST guard |

11 commits, 8 real code / SQL / features, 3 doc receipts. Session-long tests
green throughout (308/308 at handoff).

## Next session — exact starting points

1. **Apply the migration.** `supabase db push` or dashboard-apply
   `20260811020000_wm_market_coverage_first_seen.sql`. Then re-hit
   `/api/dev/coverage-inspect?instrument_id=BTC` to confirm the trigger populated
   first_seen from the current checkpoint row.
2. **Inspect `pg_cron.job`** via Supabase SQL editor:
   `select jobname, schedule, command from cron.job where command ilike '%wm_market_coverage%';`
   If a cleanup job exists that's deleting rows, that's the root cause of the
   morning data loss.
3. **Convert `wm-live-session-chip` to `<SessionChipCompact />`** per founder Smart
   Money directive. Default collapsed to dot + fidelity, expand on click.
4. **Retry Photos approval** for the 8 screen recordings; approve the OS dialog.
5. **Migrate one consumer onto `produceCanonicalMarketState`.** Recommended first
   target: a `/api/dev/canonical-state?symbol=TSLA` debug endpoint that returns
   the sealed snapshot server-side. Proves the type end-to-end without touching
   any user-visible surface.
