-- Rights-gated WM Market Memory foundation.
-- This migration creates the durable boundary but authorizes no provider.
-- Raw and derived writes remain fail-closed until a reviewed policy row is
-- explicitly inserted and the matching code registry is updated.

create schema if not exists wm_market_memory;
revoke all on schema wm_market_memory from public, anon, authenticated, service_role;

create table if not exists wm_market_memory.source_rights (
  provider_path text not null,
  asset_class text not null,
  event_type text not null,
  rights_policy_id text not null,
  collect_state text not null default 'UNKNOWN' check (collect_state in ('UNKNOWN', 'PROHIBITED', 'ALLOWED')),
  display_state text not null default 'UNKNOWN' check (display_state in ('UNKNOWN', 'PROHIBITED', 'ALLOWED')),
  raw_persistence_state text not null default 'UNKNOWN' check (raw_persistence_state in ('UNKNOWN', 'PROHIBITED', 'ALLOWED')),
  derived_persistence_state text not null default 'UNKNOWN' check (derived_persistence_state in ('UNKNOWN', 'PROHIBITED', 'ALLOWED')),
  redistribution_state text not null default 'UNKNOWN' check (redistribution_state in ('UNKNOWN', 'PROHIBITED', 'ALLOWED')),
  training_state text not null default 'UNKNOWN' check (training_state in ('UNKNOWN', 'PROHIBITED', 'ALLOWED')),
  commercial_use_state text not null default 'UNKNOWN' check (commercial_use_state in ('UNKNOWN', 'PROHIBITED', 'ALLOWED')),
  attribution_required boolean,
  max_retention_seconds bigint check (max_retention_seconds is null or max_retention_seconds > 0),
  agreement_version text,
  evidence_url text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (provider_path, asset_class, event_type, rights_policy_id),
  check (
    (collect_state <> 'ALLOWED' and raw_persistence_state <> 'ALLOWED' and derived_persistence_state <> 'ALLOWED')
    or (reviewed_by is not null and reviewed_at is not null and evidence_url is not null)
  )
);

create table if not exists wm_market_memory.observations (
  observation_id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('RAW', 'DERIVED')),
  schema_version text not null,
  normalization_version text not null,
  event_id text not null check (char_length(event_id) between 1 and 256),
  source_event_id text,
  normalized_symbol text not null check (char_length(normalized_symbol) between 1 and 96),
  asset_class text not null,
  provider_path text not null,
  event_type text not null,
  rights_policy_id text not null,
  timestamp_exchange bigint,
  timestamp_provider bigint,
  timestamp_received bigint not null,
  timestamp_processed bigint not null,
  available_at bigint not null,
  fidelity_class text not null,
  collection_trust text not null default 'BROWSER_OBSERVED' check (collection_trust in ('BROWSER_OBSERVED', 'SERVER_OBSERVED', 'REPLAY_VERIFIED')),
  event_body jsonb not null,
  payload_retained boolean not null default true,
  retained_at timestamptz not null default now(),
  retention_expires_at timestamptz,
  first_seen_at timestamptz not null default now(),
  unique (owner_id, provider_path, event_id, mode),
  check (timestamp_received > 0 and timestamp_processed >= timestamp_received and available_at between timestamp_received and timestamp_processed)
);

create index if not exists wm_market_observations_symbol_time_idx
  on wm_market_memory.observations (normalized_symbol, event_type, timestamp_received desc);
create index if not exists wm_market_observations_retention_idx
  on wm_market_memory.observations (retention_expires_at)
  where retention_expires_at is not null;

create table if not exists wm_market_memory.ingestion_receipts (
  receipt_id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_key_hash text not null,
  provider_path text not null,
  asset_class text not null,
  event_type text not null,
  mode text not null check (mode in ('RAW', 'DERIVED')),
  outcome text not null check (outcome in ('PERSISTED_RAW', 'PERSISTED_DERIVED', 'RIGHTS_BLOCKED', 'INVALID', 'DUPLICATE', 'WRITE_FAILED')),
  rights_policy_id text not null,
  detail text,
  received_at timestamptz not null default now()
);

create index if not exists wm_market_ingestion_receipts_owner_time_idx
  on wm_market_memory.ingestion_receipts (owner_id, received_at desc);

revoke all on all tables in schema wm_market_memory from public, anon, authenticated, service_role;
revoke all on all sequences in schema wm_market_memory from public, anon, authenticated, service_role;

create or replace function public.wm_persist_market_observation(
  p_owner_id uuid,
  p_mode text,
  p_event jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  policy wm_market_memory.source_rights%rowtype;
  outcome text;
  inserted_count integer := 0;
  event_key_hash text;
  safe_event jsonb;
begin
  if p_owner_id is null or p_mode not in ('RAW', 'DERIVED') or jsonb_typeof(p_event) <> 'object' then
    return jsonb_build_object('status', 'INVALID');
  end if;

  event_key_hash := md5(coalesce(p_event->>'providerPath', '') || '|' || coalesce(p_event->>'eventId', ''));

  select * into policy
  from wm_market_memory.source_rights
  where provider_path = p_event->>'providerPath'
    and asset_class = lower(p_event->>'assetClass')
    and event_type = lower(p_event->>'eventType')
    and rights_policy_id = p_event->>'rightsPolicyId';

  if not found or policy.collect_state <> 'ALLOWED' or
     (p_mode = 'RAW' and policy.raw_persistence_state <> 'ALLOWED') or
     (p_mode = 'DERIVED' and policy.derived_persistence_state <> 'ALLOWED') then
    insert into wm_market_memory.ingestion_receipts (
      owner_id, event_key_hash, provider_path, asset_class, event_type, mode,
      outcome, rights_policy_id, detail
    ) values (
      p_owner_id, event_key_hash, coalesce(p_event->>'providerPath', 'unknown'),
      coalesce(lower(p_event->>'assetClass'), 'unknown'), coalesce(lower(p_event->>'eventType'), 'unknown'),
      p_mode, 'RIGHTS_BLOCKED', coalesce(p_event->>'rightsPolicyId', 'wm.rights.missing.v1'),
      'No matching explicit durable-persistence authorization.'
    );
    return jsonb_build_object('status', 'RIGHTS_BLOCKED', 'rightsPolicyId', coalesce(policy.rights_policy_id, 'wm.rights.unregistered.v1'));
  end if;

  -- Only the canonical allow-list is retained. Extra client JSON is discarded.
  safe_event := jsonb_build_object(
    'schemaVersion', p_event->'schemaVersion', 'normalizationVersion', p_event->'normalizationVersion',
    'eventId', p_event->'eventId', 'sourceEventId', p_event->'sourceEventId',
    'symbol', p_event->'symbol', 'normalizedSymbol', p_event->'normalizedSymbol',
    'executableIdentity', p_event->'executableIdentity', 'assetClass', p_event->'assetClass',
    'contractId', p_event->'contractId', 'exchange', p_event->'exchange',
    'providerClass', p_event->'providerClass', 'providerPath', p_event->'providerPath',
    'eventType', p_event->'eventType', 'timestampExchange', p_event->'timestampExchange',
    'timestampProvider', p_event->'timestampProvider', 'timestampReceived', p_event->'timestampReceived',
    'timestampProcessed', p_event->'timestampProcessed', 'availableAt', p_event->'availableAt',
    'sequenceId', p_event->'sequenceId', 'sequenceState', p_event->'sequenceState',
    'price', p_event->'price', 'size', p_event->'size', 'bid', p_event->'bid', 'ask', p_event->'ask',
    'bidSize', p_event->'bidSize', 'askSize', p_event->'askSize',
    'open', p_event->'open', 'high', p_event->'high', 'low', p_event->'low', 'close', p_event->'close',
    'volume', p_event->'volume', 'tradeConditions', p_event->'tradeConditions', 'sessionId', p_event->'sessionId',
    'aggressorSide', p_event->'aggressorSide', 'aggressorMethod', p_event->'aggressorMethod',
    'aggressorConfidence', p_event->'aggressorConfidence', 'depthLevel', p_event->'depthLevel',
    'sourceClass', p_event->'sourceClass', 'dataMode', p_event->'dataMode',
    'fidelityClass', p_event->'fidelityClass', 'rightsPolicyId', p_event->'rightsPolicyId',
    'rawLineageRef', p_event->'rawLineageRef'
  );

  insert into wm_market_memory.observations (
    owner_id, mode, schema_version, normalization_version, event_id, source_event_id,
    normalized_symbol, asset_class, provider_path, event_type, rights_policy_id,
    timestamp_exchange, timestamp_provider, timestamp_received, timestamp_processed,
    available_at, fidelity_class, event_body, retention_expires_at
  ) values (
    p_owner_id, p_mode, p_event->>'schemaVersion', p_event->>'normalizationVersion',
    p_event->>'eventId', p_event->>'sourceEventId', p_event->>'normalizedSymbol',
    lower(p_event->>'assetClass'), p_event->>'providerPath', lower(p_event->>'eventType'),
    p_event->>'rightsPolicyId', nullif(p_event->>'timestampExchange', '')::bigint,
    nullif(p_event->>'timestampProvider', '')::bigint, (p_event->>'timestampReceived')::bigint,
    (p_event->>'timestampProcessed')::bigint, (p_event->>'availableAt')::bigint,
    p_event->>'fidelityClass', safe_event,
    case when policy.max_retention_seconds is null then null
      else now() + make_interval(secs => policy.max_retention_seconds::double precision) end
  ) on conflict (owner_id, provider_path, event_id, mode) do nothing;

  get diagnostics inserted_count = row_count;
  outcome := case when inserted_count = 0 then 'DUPLICATE'
    when p_mode = 'RAW' then 'PERSISTED_RAW' else 'PERSISTED_DERIVED' end;

  insert into wm_market_memory.ingestion_receipts (
    owner_id, event_key_hash, provider_path, asset_class, event_type, mode,
    outcome, rights_policy_id
  ) values (
    p_owner_id, event_key_hash, p_event->>'providerPath', lower(p_event->>'assetClass'),
    lower(p_event->>'eventType'), p_mode, outcome, policy.rights_policy_id
  );

  return jsonb_build_object('status', outcome, 'rightsPolicyId', policy.rights_policy_id);
exception when others then
  return jsonb_build_object('status', 'WRITE_FAILED');
end;
$$;

revoke all on function public.wm_persist_market_observation(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.wm_persist_market_observation(uuid, text, jsonb) to service_role;

-- Harden the earlier operational coverage summary. The server can read rows,
-- but all mutations must pass through the monotonic RPC.
alter table public.wm_market_coverage_checkpoints add column if not exists first_seen_at timestamptz;
update public.wm_market_coverage_checkpoints set first_seen_at = updated_at where first_seen_at is null;
alter table public.wm_market_coverage_checkpoints alter column first_seen_at set default now();
alter table public.wm_market_coverage_checkpoints alter column first_seen_at set not null;
alter table public.wm_market_coverage_checkpoints
  add constraint wm_market_coverage_first_seen_order_check check (first_seen_at <= updated_at),
  add constraint wm_market_coverage_schema_version_check check (schema_version = 'wm.market-coverage.v1'),
  add constraint wm_market_coverage_policy_id_check check (policy_id = 'wm.operational-coverage-summary.v1'),
  add constraint wm_market_coverage_normalized_symbol_length_check
    check (normalized_symbol is null or char_length(normalized_symbol) between 1 and 32),
  add constraint wm_market_coverage_collection_scope_check
    check (collection_scope in ('FOREGROUND_TAB','REQUEST_SCOPED','EXTERNAL_RELAY','BROKER_SESSION','NONE')),
  add constraint wm_market_coverage_rights_policy_length_check
    check (char_length(rights_policy_id) between 1 and 96);

update public.wm_market_coverage_checkpoints set last_gap_at = null where last_gap_at = 0;

create or replace function public.wm_upsert_market_coverage_checkpoints(
  p_owner_id uuid,
  p_channels jsonb
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer := 0;
begin
  if p_owner_id is null or jsonb_typeof(p_channels) <> 'array' or jsonb_array_length(p_channels) > 100 then
    raise exception 'invalid coverage checkpoint batch';
  end if;

  insert into public.wm_market_coverage_checkpoints (
    owner_id, instrument_id, normalized_symbol, channel, provider_path,
    observed_from, observed_through, last_event_at, observed_event_count,
    gap_count, last_gap_at, fidelity, collection_scope, persistence_right,
    rights_policy_id, schema_version, policy_id, updated_at
  )
  select
    p_owner_id, row.instrument_id, row.normalized_symbol, row.channel, row.provider_path,
    row.observed_from, row.observed_through, row.last_event_at, row.observed_event_count,
    row.gap_count, row.last_gap_at, row.fidelity, row.collection_scope, row.persistence_right,
    row.rights_policy_id, 'wm.market-coverage.v1', 'wm.operational-coverage-summary.v1', now()
  from jsonb_to_recordset(p_channels) as row(
    instrument_id text, normalized_symbol text, channel text, provider_path text,
    observed_from bigint, observed_through bigint, last_event_at bigint,
    observed_event_count bigint, gap_count bigint, last_gap_at bigint,
    fidelity text, collection_scope text, persistence_right text, rights_policy_id text
  )
  on conflict (owner_id, instrument_id, channel, provider_path) do update set
    normalized_symbol = coalesce(excluded.normalized_symbol, public.wm_market_coverage_checkpoints.normalized_symbol),
    observed_from = least(public.wm_market_coverage_checkpoints.observed_from, excluded.observed_from),
    observed_through = greatest(public.wm_market_coverage_checkpoints.observed_through, excluded.observed_through),
    last_event_at = nullif(greatest(
      coalesce(public.wm_market_coverage_checkpoints.last_event_at, 0), coalesce(excluded.last_event_at, 0)
    ), 0),
    observed_event_count = greatest(public.wm_market_coverage_checkpoints.observed_event_count, excluded.observed_event_count),
    gap_count = greatest(public.wm_market_coverage_checkpoints.gap_count, excluded.gap_count),
    last_gap_at = nullif(greatest(
      coalesce(public.wm_market_coverage_checkpoints.last_gap_at, 0), coalesce(excluded.last_gap_at, 0)
    ), 0),
    fidelity = excluded.fidelity,
    collection_scope = excluded.collection_scope,
    persistence_right = excluded.persistence_right,
    rights_policy_id = excluded.rights_policy_id,
    updated_at = now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on public.wm_market_coverage_checkpoints from public, anon, authenticated, service_role;
grant select on public.wm_market_coverage_checkpoints to service_role;
drop policy if exists "wm server owns coverage checkpoints" on public.wm_market_coverage_checkpoints;
create policy "wm server reads coverage checkpoints"
  on public.wm_market_coverage_checkpoints for select to service_role using (true);
revoke all on function public.wm_upsert_market_coverage_checkpoints(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.wm_upsert_market_coverage_checkpoints(uuid, jsonb) to service_role;
