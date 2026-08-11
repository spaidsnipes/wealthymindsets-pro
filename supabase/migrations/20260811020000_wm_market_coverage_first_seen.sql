-- WM MARKET COVERAGE FIRST-SEEN LEDGER
--
-- Founder observation on 2026-08-10: BTC coverage observed_from moved
-- forward from 09:15 UTC (morning) to 14:35 UTC (evening) despite the
-- checkpoint RPC using least(existing, excluded). The upsert path cannot
-- push observed_from forward; the row must have been DELETED externally
-- (dashboard action, pg_cron, ad-hoc SQL). No code path deletes it.
--
-- This ledger is INSERT-ONLY. Once a (owner_id, instrument, channel,
-- provider_path) has been seen, its earliest observation timestamp is
-- durable regardless of what happens to the operational checkpoint row.
-- Even if a rogue actor DROPs and re-creates the checkpoints table, the
-- earliest observation stays authoritative here.

create table if not exists public.wm_market_coverage_first_seen (
  owner_id uuid not null references auth.users(id) on delete cascade,
  instrument_id text not null check (char_length(instrument_id) between 1 and 96),
  channel text not null check (channel in ('trade', 'quote', 'bar', 'depth', 'news')),
  provider_path text not null check (char_length(provider_path) between 1 and 96),
  observed_from bigint not null check (observed_from > 0),
  first_recorded_at timestamptz not null default now(),
  primary key (owner_id, instrument_id, channel, provider_path)
);

alter table public.wm_market_coverage_first_seen enable row level security;

-- Explicitly deny UPDATE / DELETE to every role, including service_role,
-- via table permissions. Once a row lands here, it cannot be modified. If
-- future work legitimately needs to reset (e.g. schema migration), a DBA
-- must issue a superuser DDL — not application code.
revoke all on public.wm_market_coverage_first_seen from anon, authenticated;
grant select, insert on public.wm_market_coverage_first_seen to service_role;

drop policy if exists "wm server reads coverage first seen" on public.wm_market_coverage_first_seen;
create policy "wm server reads coverage first seen"
  on public.wm_market_coverage_first_seen
  for select
  to service_role
  using (true);

drop policy if exists "wm server inserts coverage first seen" on public.wm_market_coverage_first_seen;
create policy "wm server inserts coverage first seen"
  on public.wm_market_coverage_first_seen
  for insert
  to service_role
  with check (true);

-- Populate first_seen from any existing checkpoint row on migration. This
-- captures whatever "morning history" survives the moment the migration
-- runs; anything already deleted stays gone but future starts are guarded.
insert into public.wm_market_coverage_first_seen
  (owner_id, instrument_id, channel, provider_path, observed_from, first_recorded_at)
select
  owner_id, instrument_id, channel, provider_path, observed_from, now()
from public.wm_market_coverage_checkpoints
on conflict (owner_id, instrument_id, channel, provider_path) do nothing;

-- Trigger: mirror every checkpoint INSERT/UPDATE into first_seen the first
-- time we see the key. Idempotent (ON CONFLICT DO NOTHING).
create or replace function public.wm_record_coverage_first_seen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.wm_market_coverage_first_seen
    (owner_id, instrument_id, channel, provider_path, observed_from)
  values
    (new.owner_id, new.instrument_id, new.channel, new.provider_path, new.observed_from)
  on conflict (owner_id, instrument_id, channel, provider_path) do nothing;
  return new;
end;
$$;

drop trigger if exists wm_coverage_first_seen_trg on public.wm_market_coverage_checkpoints;
create trigger wm_coverage_first_seen_trg
  after insert or update of observed_from on public.wm_market_coverage_checkpoints
  for each row execute function public.wm_record_coverage_first_seen();

-- Read-side helper: given an owner + key, return the LEAST of checkpoint
-- observed_from and first_seen observed_from. GET routes can call this
-- (or the equivalent join) so a re-inserted row can never regress the
-- reported historical start.
create or replace function public.wm_coverage_earliest_observed_from(
  p_owner_id uuid,
  p_instrument_id text,
  p_channel text,
  p_provider_path text
) returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select least(
    (select observed_from from public.wm_market_coverage_checkpoints
      where owner_id = p_owner_id and instrument_id = p_instrument_id
        and channel = p_channel and provider_path = p_provider_path),
    (select observed_from from public.wm_market_coverage_first_seen
      where owner_id = p_owner_id and instrument_id = p_instrument_id
        and channel = p_channel and provider_path = p_provider_path)
  );
$$;
