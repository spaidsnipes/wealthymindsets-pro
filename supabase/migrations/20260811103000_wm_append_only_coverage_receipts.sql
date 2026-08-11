-- Append-only, payload-free Nectar coverage receipts.
--
-- This ledger preserves WM's own operational evidence that collection occurred
-- without retaining provider price, size, aggressor, event IDs, or raw payloads.
-- It is intentionally separate from rights-gated market observations.

create table if not exists wm_market_memory.coverage_receipts (
  receipt_id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  instrument_id text not null check (char_length(instrument_id) between 1 and 96),
  normalized_symbol text check (normalized_symbol is null or char_length(normalized_symbol) between 1 and 32),
  channel text not null check (char_length(channel) between 1 and 32),
  provider_path text not null check (char_length(provider_path) between 1 and 128),
  observed_from bigint not null check (observed_from > 0),
  observed_through bigint not null check (observed_through >= observed_from),
  last_event_at bigint check (last_event_at is null or last_event_at > 0),
  observed_event_count bigint not null check (observed_event_count >= 0),
  gap_count bigint not null check (gap_count >= 0),
  last_gap_at bigint check (last_gap_at is null or last_gap_at > 0),
  fidelity text not null check (fidelity in ('OBSERVED','PROXY','DERIVED','UNAVAILABLE')),
  collection_scope text not null check (collection_scope in ('FOREGROUND_TAB','REQUEST_SCOPED','EXTERNAL_RELAY','BROKER_SESSION','NONE')),
  persistence_right text not null check (persistence_right in ('UNKNOWN','PROHIBITED','ALLOWED')),
  rights_policy_id text not null check (char_length(rights_policy_id) between 1 and 96),
  schema_version text not null default 'wm.market-coverage.v1'
    check (schema_version = 'wm.market-coverage.v1'),
  policy_id text not null default 'wm.operational-coverage-summary.v1'
    check (policy_id = 'wm.operational-coverage-summary.v1'),
  received_at timestamptz not null default now(),
  unique (owner_id, instrument_id, channel, provider_path, observed_through, observed_event_count)
);

create index if not exists wm_market_coverage_receipts_owner_symbol_time_idx
  on wm_market_memory.coverage_receipts (owner_id, normalized_symbol, received_at desc);

alter table wm_market_memory.coverage_receipts enable row level security;
revoke all on wm_market_memory.coverage_receipts from public, anon, authenticated, service_role;
revoke all on sequence wm_market_memory.coverage_receipts_receipt_id_seq
  from public, anon, authenticated, service_role;

create or replace function public.wm_append_market_coverage_receipts(
  p_owner_id uuid,
  p_channels jsonb
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  row record;
  latest_count bigint;
  latest_gap_count bigint;
  latest_through bigint;
  appended integer := 0;
begin
  if p_owner_id is null or jsonb_typeof(p_channels) <> 'array'
     or jsonb_array_length(p_channels) > 100 then
    raise exception 'invalid coverage receipt batch';
  end if;

  for row in
    select * from jsonb_to_recordset(p_channels) as channel_row(
      instrument_id text, normalized_symbol text, channel text, provider_path text,
      observed_from bigint, observed_through bigint, last_event_at bigint,
      observed_event_count bigint, gap_count bigint, last_gap_at bigint,
      fidelity text, collection_scope text, persistence_right text, rights_policy_id text
    )
  loop
    if row.instrument_id is null or char_length(row.instrument_id) not between 1 and 96
       or row.channel is null or char_length(row.channel) not between 1 and 32
       or row.provider_path is null or char_length(row.provider_path) not between 1 and 128
       or row.observed_from is null or row.observed_from <= 0
       or row.observed_through is null or row.observed_through < row.observed_from
       or row.observed_event_count is null or row.observed_event_count < 0
       or row.gap_count is null or row.gap_count < 0
       or row.fidelity not in ('OBSERVED','PROXY','DERIVED','UNAVAILABLE')
       or row.collection_scope not in ('FOREGROUND_TAB','REQUEST_SCOPED','EXTERNAL_RELAY','BROKER_SESSION','NONE')
       or row.persistence_right not in ('UNKNOWN','PROHIBITED','ALLOWED')
       or row.rights_policy_id is null or char_length(row.rights_policy_id) not between 1 and 96 then
      raise exception 'invalid coverage receipt row';
    end if;

    select receipt.observed_event_count, receipt.gap_count, receipt.observed_through
      into latest_count, latest_gap_count, latest_through
    from wm_market_memory.coverage_receipts receipt
    where receipt.owner_id = p_owner_id
      and receipt.instrument_id = row.instrument_id
      and receipt.channel = row.channel
      and receipt.provider_path = row.provider_path
    order by receipt.received_at desc, receipt.receipt_id desc
    limit 1;

    -- Bound storage growth while preserving a useful append-only audit trail:
    -- first receipt, every 500 accepted observations, every five minutes of
    -- observed coverage, and every newly observed gap.
    if latest_count is null
       or row.observed_event_count >= latest_count + 500
       or row.observed_through >= latest_through + 300000
       or row.gap_count > latest_gap_count then
      insert into wm_market_memory.coverage_receipts (
        owner_id, instrument_id, normalized_symbol, channel, provider_path,
        observed_from, observed_through, last_event_at, observed_event_count,
        gap_count, last_gap_at, fidelity, collection_scope, persistence_right,
        rights_policy_id
      ) values (
        p_owner_id, row.instrument_id, row.normalized_symbol, row.channel, row.provider_path,
        row.observed_from, row.observed_through, nullif(row.last_event_at, 0), row.observed_event_count,
        row.gap_count, nullif(row.last_gap_at, 0), row.fidelity, row.collection_scope,
        row.persistence_right, row.rights_policy_id
      ) on conflict do nothing;
      if found then appended := appended + 1; end if;
    end if;
  end loop;

  return appended;
end;
$$;

revoke all on function public.wm_append_market_coverage_receipts(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.wm_append_market_coverage_receipts(uuid, jsonb)
  to service_role;

-- Preserve the currently surviving checkpoints as the first immutable audit
-- receipts before any future checkpoint mutation can occur.
insert into wm_market_memory.coverage_receipts (
  owner_id, instrument_id, normalized_symbol, channel, provider_path,
  observed_from, observed_through, last_event_at, observed_event_count,
  gap_count, last_gap_at, fidelity, collection_scope, persistence_right,
  rights_policy_id, received_at
)
select owner_id, instrument_id, normalized_symbol, channel, provider_path,
  observed_from, observed_through, last_event_at, observed_event_count,
  gap_count, last_gap_at, fidelity, collection_scope, persistence_right,
  rights_policy_id, updated_at
from public.wm_market_coverage_checkpoints
on conflict do nothing;

