-- ═══════════════════════════════════════════════════════════════════════════
-- THE SHARED DECISION / POSITION AUTHORITY — the table BUILD ORDER §22A and
-- Known Holes H16 say does not exist yet.
--
-- OBSERVED FAILURE
--   Paper / position state is held in per-device localStorage
--   (src/lib/paperTrade.ts: PAPER_STORE_FACTS.medium = "BROWSER_LOCAL",
--   serverAuthority = null). `selectCapitalReach` therefore computes
--   THIS_BROWSER_ONLY and the shell tells the trader, honestly, that the
--   position he is looking at does not exist on his other devices.
--
--   §5 STEP 9 requires the opposite: "the phone is the same position."
--   Not a copy of it, not a re-derivation from a second store — the same
--   record. There is no server-side record for the phone to project, so
--   there is nothing to be the same AS.
--
-- ROOT CAUSE
--   No canonical, server-side, DECISION_ID-keyed record exists. Every
--   surface holds its own book and no two of them can disagree out loud,
--   because they never meet.
--
-- FIX
--   One table, keyed by decision_id, owned by a user, carrying a monotonic
--   `recon_version` minted by the authority itself.
--
--   WHY A VERSION AND NOT A TIMESTAMP: devices disagree about the time, and
--   the founder's phone and iPad are exactly the two machines whose clocks
--   WM does not control. `recon_version` is a fact about the record rather
--   than a claim by the writer.
--
-- WHERE THE LAW LIVES (H21 — one owner, never a second copy of a rule)
--   The words, the roles and the verdicts live in ONE place:
--     src/lib/traderMemory/sharedPositionAuthority.ts  (decideWrite)
--   This migration deliberately does NOT restate that law. It enforces only
--   the half that cannot be enforced anywhere else: ATOMICITY. The RPC below
--   updates WHERE recon_version = the version the writer named, so two
--   simultaneous writers cannot both believe they won. If the row count is
--   0, the caller was racing and is told to re-read.
--
--   That split is the point. TypeScript decides WHETHER a write may land and
--   what to SAY about it; Postgres decides that exactly one of two racing
--   accepted writes actually lands. Neither duplicates the other.
--
-- §11 IN THE SCHEMA
--   "Only the reconciliation worker writes quantity and working-order truth.
--    Everyone else writes intent."
--   The two RPCs are separated for that reason: wm_record_decision_intent
--   physically cannot set quantity_filled, quantity_protected,
--   execution_state or protection_state — those columns are not in its
--   signature. A client that reaches this RPC still cannot become a broker.
--
-- SAFETY
--   Idempotent (IF NOT EXISTS / CREATE OR REPLACE).
--   Non-destructive: creates a new schema, touches nothing existing.
--   Server-only: schema revoked from anon + authenticated; deny-all RLS on
--   the table; access exclusively through security-definer RPCs granted to
--   service_role, matching the wm_market_memory access model already in
--   this repo (20260811035000 / 20260816103000).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS wm_decision;

REVOKE ALL ON SCHEMA wm_decision FROM public, anon, authenticated;
GRANT USAGE ON SCHEMA wm_decision TO service_role;

CREATE TABLE IF NOT EXISTS wm_decision.positions (
  -- The DECISION_ID. §5 STEP 10: one receipt, one id, from intent through
  -- fill to flat. Not a synthetic surrogate — the decision IS the key.
  decision_id      text PRIMARY KEY,

  -- Who may see it. RLS denies anon/authenticated outright; this column is
  -- what the RPCs scope on, so a service-role caller still cannot hand one
  -- trader another trader's book.
  owner_id         uuid NOT NULL,

  -- The authority's own counter. Never written by a client; see the RPCs.
  recon_version    bigint NOT NULL DEFAULT 0,

  -- ── INTENT (§5 STEP 5): what the human wants. Any signed-in surface. ──
  intent           text,
  intent_device_id text,

  -- ── SETTLED TRUTH (§11): what the broker actually said. Reconciliation
  --    worker only. NULL means NOT YET RECONCILED — which is a real state
  --    and is not the same as zero. H1: absence is not zero.
  quantity_filled     numeric,
  quantity_protected  numeric,
  execution_state     text,
  protection_state    text,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wm_decision_positions_owner_idx
  ON wm_decision.positions (owner_id, updated_at DESC);

REVOKE ALL ON wm_decision.positions FROM public, anon, authenticated;

ALTER TABLE wm_decision.positions ENABLE ROW LEVEL SECURITY;

-- Explicit deny-all so the advisor sees intent rather than an unpoliced
-- table, and so a future engineer adding `USING (owner_id = auth.uid())`
-- knows they would be OPENING a server-only surface, not tightening it.
DROP POLICY IF EXISTS "wm decision positions server-only deny anon+authenticated"
  ON wm_decision.positions;
CREATE POLICY "wm decision positions server-only deny anon+authenticated"
  ON wm_decision.positions
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- ── READ ───────────────────────────────────────────────────────────────────
-- Every device projects THIS row. Not a copy of it.
CREATE OR REPLACE FUNCTION public.wm_read_decision_position(
  p_owner_id    uuid,
  p_decision_id text
)
RETURNS TABLE (
  decision_id        text,
  recon_version      bigint,
  intent             text,
  intent_device_id   text,
  quantity_filled    numeric,
  quantity_protected numeric,
  execution_state    text,
  protection_state   text,
  updated_at         timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = wm_decision, pg_temp
AS $$
  SELECT p.decision_id, p.recon_version, p.intent, p.intent_device_id,
         p.quantity_filled, p.quantity_protected, p.execution_state,
         p.protection_state, p.updated_at
  FROM wm_decision.positions p
  WHERE p.owner_id = p_owner_id AND p.decision_id = p_decision_id;
$$;

-- ── INTENT WRITE (§5 STEP 5) ───────────────────────────────────────────────
-- Note what this signature CANNOT express: quantity, protection, execution
-- state, broker order ids. §11 is enforced by the shape of the door.
CREATE OR REPLACE FUNCTION public.wm_record_decision_intent(
  p_owner_id      uuid,
  p_decision_id   text,
  p_base_version  bigint,
  p_intent        text,
  p_device_id     text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wm_decision, pg_temp
AS $$
DECLARE
  v_next bigint;
BEGIN
  -- First write for this decision. ON CONFLICT DO NOTHING rather than an
  -- upsert: if the row already exists we must fall through to the versioned
  -- UPDATE, never overwrite a reconciled record with a fresh one.
  INSERT INTO wm_decision.positions (decision_id, owner_id, recon_version,
                                     intent, intent_device_id)
  VALUES (p_decision_id, p_owner_id, 1, p_intent, p_device_id)
  ON CONFLICT (decision_id) DO NOTHING;

  IF FOUND THEN
    RETURN 1;
  END IF;

  -- THE ATOMIC HALF OF THE LAW. Two devices may both have passed decideWrite
  -- against version 7; exactly one of them satisfies this WHERE clause.
  UPDATE wm_decision.positions
     SET intent           = p_intent,
         intent_device_id = p_device_id,
         recon_version    = recon_version + 1,
         updated_at       = now()
   WHERE decision_id  = p_decision_id
     AND owner_id     = p_owner_id
     AND recon_version = p_base_version
  RETURNING recon_version INTO v_next;

  -- NULL means "you were racing, or you were behind". The caller re-reads.
  -- Not an exception: this is a designed boundary (§8), and raising here
  -- would turn a stale phone into a stack trace.
  RETURN v_next;
END;
$$;

-- ── RECONCILIATION WRITE (§11) ─────────────────────────────────────────────
-- The only door settled broker truth may come through.
CREATE OR REPLACE FUNCTION public.wm_apply_decision_reconciliation(
  p_owner_id           uuid,
  p_decision_id        text,
  p_base_version       bigint,
  p_quantity_filled    numeric,
  p_quantity_protected numeric,
  p_execution_state    text,
  p_protection_state   text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wm_decision, pg_temp
AS $$
DECLARE
  v_next bigint;
BEGIN
  UPDATE wm_decision.positions
     SET quantity_filled    = p_quantity_filled,
         quantity_protected = p_quantity_protected,
         execution_state    = p_execution_state,
         protection_state   = p_protection_state,
         recon_version      = recon_version + 1,
         updated_at         = now()
   WHERE decision_id   = p_decision_id
     AND owner_id      = p_owner_id
     AND recon_version = p_base_version
  RETURNING recon_version INTO v_next;

  RETURN v_next;
END;
$$;

REVOKE ALL ON FUNCTION public.wm_read_decision_position(uuid, text)
  FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.wm_record_decision_intent(uuid, text, bigint, text, text)
  FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.wm_apply_decision_reconciliation(uuid, text, bigint, numeric, numeric, text, text)
  FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.wm_read_decision_position(uuid, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.wm_record_decision_intent(uuid, text, bigint, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.wm_apply_decision_reconciliation(uuid, text, bigint, numeric, numeric, text, text)
  TO service_role;

-- ── Verification the operator runs after apply: ────────────────────────────
--   SELECT c.relname, c.relrowsecurity,
--          (SELECT string_agg(polname, ', ')
--             FROM pg_policy p WHERE p.polrelid = c.oid) AS policies
--   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'wm_decision' AND c.relkind = 'r';
--
-- Expected: positions | t | wm decision positions server-only deny anon+authenticated
--
-- UNTIL THIS IS APPLIED, /api/decision-position answers CROSS-DEVICE BLOCKED
-- and selectCapitalReach continues to say THIS_BROWSER_ONLY. That is the
-- correct behaviour, not a bug: the reach verdict is derived from whether the
-- authority actually answers, never from whether this file exists in the repo.
