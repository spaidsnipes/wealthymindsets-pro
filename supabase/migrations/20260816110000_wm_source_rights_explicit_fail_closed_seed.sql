-- ═══════════════════════════════════════════════════════════════════════════
-- Founder Aug-16 correction — Source Rights registry P0 blocker.
--
-- OBSERVED FAILURE
--   wm_market_memory.source_rights row count = 0.
--   Every attempt to persist a raw or derived market observation returns
--   RIGHTS_BLOCKED because wm_persist_market_observation() cannot find a
--   matching policy row. This is CORRECT fail-closed behavior, but it is
--   implicit: an operator inspecting the DB sees "table is empty" and could
--   read that as "governance not yet started" rather than "governance
--   requires explicit review before ANY provider can be authorized."
--
-- ROOT CAUSE
--   Rights governance was designed to be REVIEWED — every allow requires
--   reviewed_by + reviewed_at + evidence_url per the table's CHECK
--   constraint. But no explicit "known providers, review pending" rows
--   existed, so the registry looked simply unpopulated.
--
-- WHY PREVIOUS SYSTEM ALLOWED IT
--   Absence of a row and a row with everything set to UNKNOWN produce
--   the same runtime behavior (RIGHTS_BLOCKED), so no one felt urgency
--   to make the fail-closed state EXPLICIT. But without visible rows,
--   there is no reviewable audit trail of "we know these providers
--   exist; none has been reviewed yet."
--
-- FIX (fail-closed by construction)
--   Seed one explicit UNKNOWN/UNKNOWN row for every provider+asset+event
--   capability the app's capability registry knows about. Every seeded
--   row:
--     collect_state              = 'UNKNOWN' (silently allowed by the RPC
--                                             only if 'ALLOWED')
--     display_state              = 'UNKNOWN'
--     raw_persistence_state      = 'UNKNOWN'
--     derived_persistence_state  = 'UNKNOWN'
--     redistribution_state       = 'UNKNOWN'
--     training_state             = 'UNKNOWN'
--     commercial_use_state       = 'UNKNOWN'
--     reviewed_by                = NULL
--     reviewed_at                = NULL
--     evidence_url               = NULL
--
--   The table's CHECK constraint enforces that any row with an ALLOWED
--   state MUST also have reviewed_by + reviewed_at + evidence_url — so
--   the seeded UNKNOWN rows cannot be silently upgraded to ALLOWED
--   without also filling review metadata.
--
--   Runtime behavior: unchanged (still RIGHTS_BLOCKED — good).
--   Audit visibility: dramatically improved — an operator now sees an
--   explicit list of known providers and can begin per-row review.
--
-- CAPABILITIES SEEDED (mirrors MARKET_DATA_CAPABILITIES in
-- src/lib/marketData/capabilityRegistry.ts):
--   coinbase-client-ws        crypto   trade
--   binance-us-client-ws      crypto   trade
--   alpaca-external-relay     equity   trade
--   alpaca-rest               equity   quote
--   yahoo-rest                futures  bar
--   finnhub-rest              equity   bar
--   kraken-dom-client-ws      crypto   depth
--   wm-exchange-rest          crypto   bar
--
-- SAFETY
--   Idempotent: ON CONFLICT DO NOTHING keyed on the (provider_path,
--   asset_class, event_type, rights_policy_id) primary key.
--   Reversible: DELETE FROM ... WHERE rights_policy_id = 'wm.rights.unknown.v1'
--   AND reviewed_by IS NULL.
--   Non-destructive to any future reviewed row: only inserts, never
--   updates.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO wm_market_memory.source_rights (
  provider_path,
  asset_class,
  event_type,
  rights_policy_id,
  collect_state,
  display_state,
  raw_persistence_state,
  derived_persistence_state,
  redistribution_state,
  training_state,
  commercial_use_state,
  attribution_required,
  max_retention_seconds,
  agreement_version,
  evidence_url,
  reviewed_by,
  reviewed_at
)
VALUES
  ('coinbase-client-ws',    'crypto',  'trade', 'wm.rights.unknown.v1',
   'UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN',
   NULL, NULL, NULL, NULL, NULL, NULL),
  ('binance-us-client-ws',  'crypto',  'trade', 'wm.rights.unknown.v1',
   'UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN',
   NULL, NULL, NULL, NULL, NULL, NULL),
  ('alpaca-external-relay', 'equity',  'trade', 'wm.rights.unknown.v1',
   'UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN',
   NULL, NULL, NULL, NULL, NULL, NULL),
  ('alpaca-rest',           'equity',  'quote', 'wm.rights.unknown.v1',
   'UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN',
   NULL, NULL, NULL, NULL, NULL, NULL),
  ('yahoo-rest',            'futures', 'bar',   'wm.rights.unknown.v1',
   'UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN',
   NULL, NULL, NULL, NULL, NULL, NULL),
  ('finnhub-rest',          'equity',  'bar',   'wm.rights.unknown.v1',
   'UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN',
   NULL, NULL, NULL, NULL, NULL, NULL),
  ('kraken-dom-client-ws',  'crypto',  'depth', 'wm.rights.unknown.v1',
   'UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN',
   NULL, NULL, NULL, NULL, NULL, NULL),
  ('wm-exchange-rest',      'crypto',  'bar',   'wm.rights.unknown.v1',
   'UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN',
   NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (provider_path, asset_class, event_type, rights_policy_id) DO NOTHING;

-- ── Verification query the operator can run after apply: ────────────────────
--   SELECT provider_path, asset_class, event_type,
--          raw_persistence_state, derived_persistence_state,
--          reviewed_by, reviewed_at
--   FROM wm_market_memory.source_rights
--   ORDER BY provider_path, asset_class, event_type;
--
-- Expected: 8 rows, all with state='UNKNOWN', reviewed_by IS NULL.
-- Every observation persistence attempt continues to return RIGHTS_BLOCKED
-- until a reviewer explicitly UPDATEs a row and supplies review metadata:
--
--   UPDATE wm_market_memory.source_rights
--   SET raw_persistence_state = 'ALLOWED',
--       reviewed_by = 'legal@wealthymindsets.info',
--       reviewed_at = now(),
--       evidence_url = 'https://drive/...'
--   WHERE provider_path = 'coinbase-client-ws'
--     AND asset_class = 'crypto'
--     AND event_type = 'trade'
--     AND rights_policy_id = 'wm.rights.unknown.v1';
--
-- The row's CHECK constraint enforces that raw/derived_persistence_state = 'ALLOWED'
-- REQUIRES reviewed_by AND reviewed_at AND evidence_url — so no accidental
-- silent enablement is possible from this row's state alone.
