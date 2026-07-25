# WM World — Pre-Launch Security Checklist (STAGED — do not apply without backup)

**Scope:** Supabase project `zrzaifaxecwgpfrqctkp` (WM World Passport). Advisor findings as of 2026-07-24.
**Hard rule:** take a restorable logical backup (Dashboard → Database → Backups, or `pg_dump`) and verify it opens BEFORE running any statement below. Stage on a preview branch/project first if available.

## 1. Always-true write/delete policies (Lounge + Radio)

Current: `lounge_posts`, `lounge_likes`, `lounge_comments`, `lounge_follows`, `radio_tracks` allow public INSERT/UPDATE/DELETE (`true` policies). The deployed app writes them client-side with the anon key, so a hostile client can forge/delete anyone's content.

**Pre-work (required before applying):**
- [ ] Inventory columns: which column identifies the author? (`user_handle` today — NOT a uuid FK; ownership checks need `auth.uid()`-keyed columns or a handle→user mapping via `wm_id`.)
- [ ] Decide anonymous-posting policy: if anon posting is intentional for launch, keep INSERT public but scope UPDATE/DELETE to owner/moderator only.
- [ ] Write policy tests (happy path + forged-handle attempt + delete-other's-post attempt).

**Staged SQL (adjust column names after inventory; DO NOT run yet):**
```sql
-- Example shape — replace user_handle ownership with auth-keyed check once
-- lounge writes go through authenticated sessions.
alter table lounge_posts enable row level security;
drop policy if exists "public write" on lounge_posts;
create policy "read for all"      on lounge_posts for select using (true);
create policy "insert own"        on lounge_posts for insert to authenticated with check (auth.uid() is not null);
create policy "update own"        on lounge_posts for update to authenticated using (author_id = auth.uid());
create policy "delete own or mod" on lounge_posts for delete to authenticated
  using (author_id = auth.uid() or exists (select 1 from moderators m where m.user_id = auth.uid()));
-- Repeat pattern for lounge_likes / lounge_comments / lounge_follows / radio_tracks.
```
**Blocker:** today's lounge client writes are anonymous (anon key, handle column). Flipping these policies without first moving writes behind Passport sessions will BREAK posting. Sequence: (1) wire lounge writes to authenticated Supabase session, (2) backfill `author_id`, (3) then apply policies.

## 2. Public `radio` Storage bucket listing
- [ ] Keep public **object delivery** (playback URLs) but remove public **list**: restrict `storage.objects` select-list policy for bucket `radio` to authenticated, or serve via signed URLs.

## 3. Leaked-password protection
- [ ] Dashboard → Auth → Providers → Email → enable "Leaked password protection" after confirming email+password is the only flow in use.

## 4. Launch-day env/dashboard items (owner: Dave)
- [ ] Supabase Auth → URL Configuration: Site URL `https://wealthymindsets-pro.vercel.app`; Redirect URLs += `…/login?confirmed=1`, `…/reset-password` (+ any custom domain).
- [ ] Vercel: `RESEND_FROM_EMAIL` = verified-domain sender; verify domain in Resend (SPF/DKIM/DMARC). Until then invited users receive NO email.
- [ ] Confirm Dreamboard's Vercel Production Supabase ref (identity audit gap).
- [ ] Verify `JWT_SECRET` is set in Vercel prod env (auth falls back to a known dev secret otherwise — session forgery risk).

## 5. Rollback plan
- Policies: `drop policy` new ones, recreate the previous permissive policy (recorded in Dashboard → Policies history / this file's git history).
- App: `git revert` the lounge-auth wiring commit; Vercel instant rollback to prior deployment.
- Kill switch: feature-flag lounge/radio writes off (render read-only) if abuse appears before policies land.
