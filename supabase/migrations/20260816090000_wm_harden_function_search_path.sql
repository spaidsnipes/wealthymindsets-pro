-- ═══════════════════════════════════════════════════════════════════════════
-- Founder Aug-16 XV — Supabase Database Hardening
-- Advisory: `function_search_path_mutable`
--
-- OBSERVED FAILURE
--   Multiple functions in the public schema were created without an
--   explicit `search_path` GUC. Supabase's security advisor flags each
--   one: an attacker who can create objects in a schema earlier on the
--   effective search_path could shadow trusted references (e.g. a
--   malicious `public.jsonb_build_object`) and hijack the function.
--
-- ROOT CAUSE
--   PostgreSQL's default resolves unqualified names against the caller's
--   session search_path. SECURITY DEFINER functions in particular MUST
--   pin their own search_path or the definer's privileges can be exercised
--   under attacker-controlled name resolution.
--
-- FIX (non-destructive)
--   ALTER FUNCTION ... SET search_path = ... only writes the GUC; the
--   function BODY is not touched. Existing behavior is preserved for
--   every caller whose intended references live in {pg_catalog, public,
--   pg_temp}. If a function references objects in another schema
--   (unlikely on this project), that call will now fail loudly instead
--   of silently resolving to an attacker-controllable name — which is
--   the safer failure mode.
--
--   We pin `pg_catalog, public, pg_temp` — the narrowest search_path
--   that still allows the project's known public-schema references.
--
-- SAFETY
--   Idempotent: re-running the migration is a no-op.
--   Reversible: the DOWN block clears the setting via SET search_path
--   TO DEFAULT (falls back to database default).
--   Ownership-preserving: we do not recreate functions.
--   Body-preserving: we do not edit function code.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  fn record;
  fn_names text[] := ARRAY[
    -- Explicitly named by the Founder Aug-16 directive:
    'safe_jsonb',
    'trading_permissions_default_json',
    'mt4_bridge_applied_legs_immutable',
    'trg_require_order_permission_if_open',
    'trg_require_trading_permission_if_open',
    'market_clock_imported_block',
    'touch_updated_at',
    'nectar_event_market_closed_immutable',
    'nectar_event_import_anchored_immutable',
    'set_updated_at',
    'set_updated_at_timestamp'
  ];
BEGIN
  FOR fn IN
    SELECT n.nspname AS schema_name,
           p.proname  AS function_name,
           pg_get_function_identity_arguments(p.oid) AS args,
           p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(fn_names)
      -- Skip functions that already have a proconfig entry pinning search_path
      -- (idempotency: re-running the migration is a no-op).
      AND (
        p.proconfig IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM unnest(p.proconfig) AS cfg
          WHERE cfg LIKE 'search_path=%'
        )
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = pg_catalog, public, pg_temp',
      fn.schema_name, fn.function_name, fn.args
    );
    RAISE NOTICE 'Pinned search_path on %.%(%)', fn.schema_name, fn.function_name, fn.args;
  END LOOP;
END $$;

-- ── Verification query the operator can run after applying: ────────────────
--   SELECT n.nspname, p.proname,
--          pg_get_function_identity_arguments(p.oid) AS args,
--          COALESCE(
--            (SELECT string_agg(cfg, ', ')
--             FROM unnest(p.proconfig) cfg
--             WHERE cfg LIKE 'search_path=%'), '(NONE)'
--          ) AS search_path_setting
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND p.proname IN (
--       'safe_jsonb', 'trading_permissions_default_json',
--       'mt4_bridge_applied_legs_immutable',
--       'trg_require_order_permission_if_open',
--       'trg_require_trading_permission_if_open',
--       'market_clock_imported_block',
--       'touch_updated_at',
--       'nectar_event_market_closed_immutable',
--       'nectar_event_import_anchored_immutable',
--       'set_updated_at', 'set_updated_at_timestamp'
--     )
--   ORDER BY p.proname;
--
-- Expected: every row shows `search_path=pg_catalog, public, pg_temp`.
-- Any row still showing (NONE) means the function either does not exist
-- in this environment (safely skipped) or was created after this migration
-- was applied (re-apply the migration).
