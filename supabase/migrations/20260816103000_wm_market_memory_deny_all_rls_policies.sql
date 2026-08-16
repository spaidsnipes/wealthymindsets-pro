-- ═══════════════════════════════════════════════════════════════════════════
-- Founder Aug-16 correction — WM Market Memory access-model documentation.
--
-- OBSERVED FAILURE
--   Supabase advisor flags:
--     wm_market_memory.coverage_receipts  RLS ENABLED / NO POLICY
--     wm_market_memory.operational_gaps   RLS ENABLED / NO POLICY
--
-- ROOT CAUSE
--   The 20260811035000 + 20260811103000 migrations established a
--   SERVER-ONLY memory schema:
--     • revoked ALL from public, anon, authenticated, service_role at
--       both schema and table level
--     • access exclusively via `security definer` functions on public
--       (wm_persist_market_observation, wm_append_market_coverage_receipts,
--       wm_upsert_market_coverage_checkpoints) granted to service_role
--   That access model is already correct. But because the tables have
--   `enable row level security` without an explicit policy, the advisor
--   flags them — the same finding could later be interpreted (wrongly)
--   as "the tables allow all access and just have no policy applied."
--
-- WHY PREVIOUS SYSTEM ALLOWED IT
--   The intent was documented in code comments but never made explicit
--   at the DB layer. A future engineer running `create policy ... for
--   select to authenticated using (owner_id = auth.uid())` would think
--   they were adding least-privilege — while actually OPENING a set of
--   receipts that were designed to be reached only via the RPC path.
--
-- FIX (defensive, non-destructive, documents intent)
--   Add explicit deny-all policies on every wm_market_memory table.
--   Because service_role bypasses RLS entirely (that's a Postgres-
--   role attribute, not an RLS grant), the existing RPC access path
--   continues to work unchanged. The advisor now sees an explicit
--   policy and stops flagging the table.
--
--   For each table:
--     drop existing policy if present (idempotency)
--     create policy "wm mm <table> server-only deny anon+authenticated"
--       on wm_market_memory.<table>
--       for all
--       to anon, authenticated
--       using (false)
--       with check (false);
--
--   Reads by anon/authenticated: 0 rows.
--   Writes by anon/authenticated: rejected (check fails).
--   service_role: bypasses RLS → RPC path unchanged.
--
-- SAFETY
--   Idempotent (drop-if-exists then create).
--   Reversible (drop policy).
--   Preserves the existing security-definer RPC access path used by
--   /api/market-memory/coverage and /api/market-memory/observations.
--   Non-destructive to data — no ALTER TABLE, no DROP anything.
--   operational_gaps handled defensively: only applies if the table
--   exists in this environment (some environments don't have it).
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  tbl text;
  wm_tables text[] := ARRAY[
    'source_rights',
    'observations',
    'ingestion_receipts',
    'coverage_receipts',
    'operational_gaps'
  ];
  policy_name text;
BEGIN
  FOREACH tbl IN ARRAY wm_tables LOOP
    -- Only proceed if the table exists in this environment. operational_gaps
    -- is present in production per the current advisor but not in the
    -- source-controlled migrations — this guard makes the migration safe
    -- to apply anywhere.
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'wm_market_memory' AND c.relname = tbl AND c.relkind = 'r'
    ) THEN
      -- Ensure RLS is on (defensive; the earlier migrations already enable
      -- it, but this makes the intent explicit regardless of environment
      -- drift).
      EXECUTE format('ALTER TABLE wm_market_memory.%I ENABLE ROW LEVEL SECURITY', tbl);

      policy_name := format('wm mm %s server-only deny anon+authenticated', tbl);

      -- Drop any prior version of this policy for idempotency.
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON wm_market_memory.%I',
        policy_name, tbl
      );

      -- Create the deny-all policy. Roles anon + authenticated are
      -- REACHED by the policy (as opposed to service_role which bypasses
      -- RLS at the role level). Both USING (row visibility) and WITH
      -- CHECK (row insert/update) return false, so all direct client
      -- traffic is silently denied. The existing security-definer RPCs
      -- continue to work because they run under service_role.
      EXECUTE format(
        'CREATE POLICY %I ON wm_market_memory.%I '
        'FOR ALL TO anon, authenticated '
        'USING (false) WITH CHECK (false)',
        policy_name, tbl
      );

      RAISE NOTICE 'wm_market_memory.%: server-only deny-all RLS policy applied', tbl;
    ELSE
      RAISE NOTICE 'wm_market_memory.% not present in this environment — skipped', tbl;
    END IF;
  END LOOP;
END $$;

-- ── Verification query the operator can run after apply: ────────────────────
--   SELECT n.nspname, c.relname, c.relrowsecurity,
--          (SELECT string_agg(polname, ', ')
--             FROM pg_policy p WHERE p.polrelid = c.oid) AS policies
--   FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'wm_market_memory' AND c.relkind = 'r'
--   ORDER BY c.relname;
--
-- Expected: every wm_market_memory table shows relrowsecurity = t and a
-- policy named 'wm mm <table> server-only deny anon+authenticated'.
-- Re-run the Supabase advisor: 'rls_enabled_no_policy' on these tables
-- should be cleared.
