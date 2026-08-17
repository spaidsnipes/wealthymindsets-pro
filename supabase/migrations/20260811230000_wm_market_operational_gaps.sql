-- Durable, payload-free operational gap ledger.
--
-- This records that provider observations did not arrive. It never stores
-- price, size, aggressor, source event IDs, or provider payloads.

create table if not exists wm_market_memory.operational_gaps (
  gap_id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  instrument_id text not null check (char_length(instrument_id) between 1 and 96),
  normalized_symbol text not null check (char_length(normalized_symbol) between 1 and 32),
  provider_path text not null check (char_length(provider_path) between 1 and 128),
  asset_class text not null check (asset_class in ('crypto','equity','etf','futures','forex','options')),
  channel text not null check (char_length(channel) between 1 and 32),
  reason_code text not null check (reason_code in ('RATE_LIMIT','PROVIDER_UNAVAILABLE','CIRCUIT_OPEN','STALE_FALLBACK')),
  started_at bigint not null check (started_at > 0),
  last_occurrence_at bigint not null check (last_occurrence_at >= started_at),
  ended_at bigint check (ended_at is null or ended_at >= started_at),
  retry_after_ms bigint check (retry_after_ms is null or retry_after_ms between 0 and 86400000),
  detail text not null check (char_length(detail) between 1 and 240),
  recovery_outcome text check (recovery_outcome is null or recovery_outcome = 'HEALTHY_OBSERVATION'),
  client_receipt_count bigint not null default 1 check (client_receipt_count > 0),
  first_db_received_at timestamptz not null default now(),
  last_db_received_at timestamptz not null default now(),
  schema_version text not null default 'wm.operational-gap.v1'
    check (schema_version = 'wm.operational-gap.v1')
);

create unique index if not exists wm_market_operational_gaps_one_open_idx
  on wm_market_memory.operational_gaps
  (owner_id, instrument_id, provider_path, asset_class, channel, reason_code)
  where ended_at is null;
create index if not exists wm_market_operational_gaps_owner_time_idx
  on wm_market_memory.operational_gaps (owner_id, started_at desc);

alter table wm_market_memory.operational_gaps enable row level security;
revoke all on wm_market_memory.operational_gaps from public, anon, authenticated, service_role;
revoke all on sequence wm_market_memory.operational_gaps_gap_id_seq
  from public, anon, authenticated, service_role;

create or replace function public.wm_record_market_operational_gap(
  p_owner_id uuid,
  p_gap jsonb
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text := p_gap->>'action';
  v_instrument text := p_gap->>'instrumentId';
  v_symbol text := upper(p_gap->>'normalizedSymbol');
  v_provider text := p_gap->>'providerPath';
  v_asset_class text := p_gap->>'assetClass';
  v_channel text := p_gap->>'channel';
  v_reason text := p_gap->>'reasonCode';
  v_occurred bigint := (p_gap->>'occurredAt')::bigint;
  v_retry bigint := nullif(p_gap->>'retryAfterMs', '')::bigint;
  v_detail text := p_gap->>'detail';
  v_gap_id bigint;
begin
  if p_owner_id is null or p_gap->>'schemaVersion' <> 'wm.operational-gap.v1'
     or v_action not in ('OPEN','CLOSE')
     or char_length(v_instrument) not between 1 and 96
     or char_length(v_symbol) not between 1 and 32
     or char_length(v_provider) not between 1 and 128
     or v_asset_class not in ('crypto','equity','etf','futures','forex','options')
     or char_length(v_channel) not between 1 and 32
     or v_reason not in ('RATE_LIMIT','PROVIDER_UNAVAILABLE','CIRCUIT_OPEN','STALE_FALLBACK')
     or v_occurred <= 0 or (v_retry is not null and v_retry not between 0 and 86400000)
     or char_length(v_detail) not between 1 and 240 then
    raise exception 'invalid operational gap';
  end if;

  if v_action = 'OPEN' then
    insert into wm_market_memory.operational_gaps (
      owner_id, instrument_id, normalized_symbol, provider_path, asset_class, channel,
      reason_code, started_at, last_occurrence_at, retry_after_ms, detail
    ) values (
      p_owner_id, v_instrument, v_symbol, v_provider, v_asset_class, v_channel,
      v_reason, v_occurred, v_occurred, v_retry, v_detail
    )
    on conflict (owner_id, instrument_id, provider_path, asset_class, channel, reason_code)
      where ended_at is null
    do update set
      last_occurrence_at = greatest(wm_market_memory.operational_gaps.last_occurrence_at, excluded.last_occurrence_at),
      retry_after_ms = greatest(wm_market_memory.operational_gaps.retry_after_ms, excluded.retry_after_ms),
      detail = excluded.detail,
      client_receipt_count = wm_market_memory.operational_gaps.client_receipt_count + 1,
      last_db_received_at = now()
    returning gap_id into v_gap_id;
  else
    with latest as (
      select gap_id from wm_market_memory.operational_gaps
      where owner_id = p_owner_id and instrument_id = v_instrument
        and provider_path = v_provider and asset_class = v_asset_class and channel = v_channel
        and reason_code = v_reason and ended_at is null
      order by started_at desc limit 1
    )
    update wm_market_memory.operational_gaps gap
    set ended_at = greatest(gap.started_at, v_occurred),
        recovery_outcome = 'HEALTHY_OBSERVATION',
        detail = v_detail,
        last_db_received_at = now()
    from latest where gap.gap_id = latest.gap_id
    returning gap.gap_id into v_gap_id;
  end if;
  return v_gap_id;
end;
$$;

create or replace function public.wm_list_market_operational_gaps(
  p_owner_id uuid,
  p_limit integer default 100
) returns table (
  gap_id bigint,
  instrument_id text,
  normalized_symbol text,
  provider_path text,
  asset_class text,
  channel text,
  reason_code text,
  started_at bigint,
  last_occurrence_at bigint,
  ended_at bigint,
  retry_after_ms bigint,
  detail text,
  recovery_outcome text,
  client_receipt_count bigint,
  first_db_received_at timestamptz,
  last_db_received_at timestamptz,
  schema_version text
)
language sql
security definer
set search_path = ''
stable
as $$
  select gap.gap_id, gap.instrument_id, gap.normalized_symbol,
    gap.provider_path, gap.asset_class, gap.channel, gap.reason_code, gap.started_at,
    gap.last_occurrence_at, gap.ended_at, gap.retry_after_ms, gap.detail,
    gap.recovery_outcome, gap.client_receipt_count,
    gap.first_db_received_at, gap.last_db_received_at, gap.schema_version
  from wm_market_memory.operational_gaps gap
  where gap.owner_id = p_owner_id
  order by gap.started_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function public.wm_record_market_operational_gap(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.wm_record_market_operational_gap(uuid, jsonb)
  to service_role;
revoke all on function public.wm_list_market_operational_gaps(uuid, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.wm_list_market_operational_gaps(uuid, integer)
  to service_role;
