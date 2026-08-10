create table if not exists public.wm_market_coverage_checkpoints (
  owner_id uuid not null references auth.users(id) on delete cascade,
  instrument_id text not null check (char_length(instrument_id) between 1 and 96),
  normalized_symbol text,
  channel text not null check (channel in ('trade', 'quote', 'bar', 'depth', 'news')),
  provider_path text not null check (char_length(provider_path) between 1 and 96),
  observed_from bigint not null check (observed_from > 0),
  observed_through bigint not null check (observed_through >= observed_from),
  last_event_at bigint,
  observed_event_count bigint not null default 0 check (observed_event_count >= 0),
  gap_count bigint not null default 0 check (gap_count >= 0),
  last_gap_at bigint,
  fidelity text not null check (fidelity in ('OBSERVED', 'PROXY', 'DERIVED', 'UNAVAILABLE')),
  collection_scope text not null,
  persistence_right text not null check (persistence_right in ('UNKNOWN', 'PROHIBITED', 'ALLOWED')),
  rights_policy_id text not null,
  schema_version text not null default 'wm.market-coverage.v1',
  policy_id text not null default 'wm.operational-coverage-summary.v1',
  updated_at timestamptz not null default now(),
  primary key (owner_id, instrument_id, channel, provider_path)
);

alter table public.wm_market_coverage_checkpoints enable row level security;

revoke all on public.wm_market_coverage_checkpoints from anon, authenticated;
grant select, insert, update, delete on public.wm_market_coverage_checkpoints to service_role;

drop policy if exists "wm server owns coverage checkpoints" on public.wm_market_coverage_checkpoints;
create policy "wm server owns coverage checkpoints"
  on public.wm_market_coverage_checkpoints
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists wm_market_coverage_owner_updated_idx
  on public.wm_market_coverage_checkpoints (owner_id, updated_at desc);

create or replace function public.wm_upsert_market_coverage_checkpoints(
  p_owner_id uuid,
  p_channels jsonb
) returns integer
language plpgsql
security invoker
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
    p_owner_id,
    row.instrument_id,
    row.normalized_symbol,
    row.channel,
    row.provider_path,
    row.observed_from,
    row.observed_through,
    row.last_event_at,
    row.observed_event_count,
    row.gap_count,
    row.last_gap_at,
    row.fidelity,
    row.collection_scope,
    row.persistence_right,
    row.rights_policy_id,
    'wm.market-coverage.v1',
    'wm.operational-coverage-summary.v1',
    now()
  from jsonb_to_recordset(p_channels) as row(
    instrument_id text,
    normalized_symbol text,
    channel text,
    provider_path text,
    observed_from bigint,
    observed_through bigint,
    last_event_at bigint,
    observed_event_count bigint,
    gap_count bigint,
    last_gap_at bigint,
    fidelity text,
    collection_scope text,
    persistence_right text,
    rights_policy_id text
  )
  on conflict (owner_id, instrument_id, channel, provider_path) do update set
    normalized_symbol = coalesce(excluded.normalized_symbol, public.wm_market_coverage_checkpoints.normalized_symbol),
    observed_from = least(public.wm_market_coverage_checkpoints.observed_from, excluded.observed_from),
    observed_through = greatest(public.wm_market_coverage_checkpoints.observed_through, excluded.observed_through),
    last_event_at = greatest(
      coalesce(public.wm_market_coverage_checkpoints.last_event_at, 0),
      coalesce(excluded.last_event_at, 0)
    ),
    observed_event_count = greatest(
      public.wm_market_coverage_checkpoints.observed_event_count,
      excluded.observed_event_count
    ),
    gap_count = greatest(public.wm_market_coverage_checkpoints.gap_count, excluded.gap_count),
    last_gap_at = greatest(
      coalesce(public.wm_market_coverage_checkpoints.last_gap_at, 0),
      coalesce(excluded.last_gap_at, 0)
    ),
    fidelity = excluded.fidelity,
    collection_scope = excluded.collection_scope,
    persistence_right = excluded.persistence_right,
    rights_policy_id = excluded.rights_policy_id,
    updated_at = now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.wm_upsert_market_coverage_checkpoints(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.wm_upsert_market_coverage_checkpoints(uuid, jsonb) to service_role;
