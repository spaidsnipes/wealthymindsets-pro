-- Lounge + Radio: writes only through the server, with the signed WM session as identity.
--
-- Before: anon policies `INSERT WITH CHECK (true)` / `DELETE USING (true)` on the
-- lounge tables and radio_tracks, and anon INSERT on storage bucket `radio`.
-- Anyone holding the public key could post as any handle, delete any post,
-- mark themselves verified, or upload arbitrary files.
-- After: anon/authenticated keep public READ; every write goes through
-- /api/lounge or /api/upload-track (service role, session-checked).

-- Step 1 (safe before deploy): record the owner on every new row.
alter table public.lounge_posts    add column if not exists user_id text;
alter table public.lounge_likes    add column if not exists user_id text;
alter table public.lounge_comments add column if not exists user_id text;
alter table public.lounge_follows  add column if not exists user_id text;
alter table public.radio_tracks    add column if not exists user_id text;

-- Step 2 (after the server routes are live): remove anon write access.
drop policy if exists "public insert posts"    on public.lounge_posts;
drop policy if exists "public delete posts"    on public.lounge_posts;
drop policy if exists "public insert likes"    on public.lounge_likes;
drop policy if exists "public delete likes"    on public.lounge_likes;
drop policy if exists "public insert comments" on public.lounge_comments;
drop policy if exists "public insert follows"  on public.lounge_follows;
drop policy if exists "public delete follows"  on public.lounge_follows;
drop policy if exists "public insert radio"    on public.radio_tracks;
drop policy if exists "radio_public_insert"    on storage.objects;
-- Public bucket URLs keep working without a SELECT policy; this only stops listing.
drop policy if exists "radio_public_select"    on storage.objects;
