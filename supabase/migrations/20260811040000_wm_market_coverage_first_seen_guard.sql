-- Durable, insert-once receipt for the first database-observed coverage claim.
-- Existing client-supplied observed_from remains CLIENT_ASSERTED; this table
-- proves database receipt time and prevents later application-row deletion
-- from silently moving the displayed start forward.

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
revoke all on public.wm_market_coverage_first_seen from public, anon, authenticated, service_role;
grant select on public.wm_market_coverage_first_seen to service_role;

drop policy if exists "wm server reads coverage first seen" on public.wm_market_coverage_first_seen;
create policy "wm server reads coverage first seen"
  on public.wm_market_coverage_first_seen for select to service_role using (true);
drop policy if exists "wm server inserts coverage first seen" on public.wm_market_coverage_first_seen;

insert into public.wm_market_coverage_first_seen
  (owner_id, instrument_id, channel, provider_path, observed_from, first_recorded_at)
select owner_id, instrument_id, channel, provider_path, observed_from, first_seen_at
from public.wm_market_coverage_checkpoints
on conflict (owner_id, instrument_id, channel, provider_path) do nothing;

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

revoke all on function public.wm_record_coverage_first_seen() from public, anon, authenticated, service_role;
drop trigger if exists wm_coverage_first_seen_trg on public.wm_market_coverage_checkpoints;
create trigger wm_coverage_first_seen_trg
  after insert or update of observed_from on public.wm_market_coverage_checkpoints
  for each row execute function public.wm_record_coverage_first_seen();
