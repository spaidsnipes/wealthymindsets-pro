# WM World Passport — Supabase Identity Audit

**Date:** 2026-07-24 · **Method:** read-only (repo `.env`/config, deployed network inspection). No secrets printed; no mutations performed.

## Confirmed project

| Field | Value |
|---|---|
| Project ref | `zrzaifaxecwgpfrqctkp` |
| Host | `https://zrzaifaxecwgpfrqctkp.supabase.co` |
| Region | US East (Ohio) |
| Org | Wealthymindsets · display name `spaidsnipes's Project` |
| Auth users | 12 users / 12 identities |

## Evidence gathered

- **WM Pro local** `.env.local` → `NEXT_PUBLIC_SUPABASE_URL = https://zrzaifaxecwgpfrqctkp.supabase.co`.
- **WM Pro production** (deployed `/lounge`) issues client REST calls to `zrzaifaxecwgpfrqctkp.supabase.co` — `lounge_posts`, `lounge_follows`, `lounge_likes`, `lounge_comments`, all HTTP 200. Prod === local ref.
- **WM Pro repo manages no Supabase migrations**: `supabase/config.toml` has no `project_id`, and `supabase/migrations` has **0 files**. Schema is applied out-of-band (Dreamboard repo and/or dashboard).
- **Dreamboard local** (`~/dreamboard`) contains only `.env.example` (empty `NEXT_PUBLIC_SUPABASE_URL`). Its *production* ref cannot be proven from the repo.
- DB contains **both** WM tables (`lounge_*`, `radio_tracks`, `wm_id`, `posts`) and Dreamboard tables (`dreamboard_*`), per the founder's dashboard inspection.

## The 8 questions

1. **WM Pro & Dreamboard on the same Prod project?** — WM Pro Prod & local both `zrzaifaxecwgpfrqctkp` (**proven**). Dreamboard Prod ref **not proven from repo**; but Dreamboard tables already exist in this project, so Dreamboard has written to it. → *Likely shared; confirm via Dreamboard's Vercel env.*
2. **Preview/local point elsewhere?** — WM Pro has a single `.env.local` = prod ref; **no separate preview/dev env file**. → No environment separation locally. Vercel Preview/Dev to be confirmed by founder. **Risk: no prod/preview/dev isolation.**
3. **Who created `dreamboard_creator_workspace`?** — **Not WM Pro** (0 migrations, no `project_id`). Originates from Dreamboard repo or a dashboard-applied migration.
4. **DB contains WM, Dreamboard, or both?** — **Both.**
5. **Where are WM Pro users stored?** — `auth.users` in `zrzaifaxecwgpfrqctkp` (12 users).
6. **Which project gets prod traffic per app?** — WM Pro → `zrzaifaxecwgpfrqctkp` (**proven**). Dreamboard → **unproven** (founder Vercel check).
7. **Redirect URLs / Vercel env aligned?** — Needs dashboard. Signup now passes request-origin `redirect_to`; the deployed domain(s) + `/login?confirmed=1` + `/reset-password` must be in Supabase **Auth → URL Configuration → Redirect URLs**. Note repo inconsistency: `NEXT_PUBLIC_APP_URL` (forgot-password) vs `NEXT_PUBLIC_SITE_URL` (signup) — reconcile to one.
8. **Intentional & safe for Passport?** — Founder has decided to formalize it as Passport. Shared identity is acceptable. **Pre-launch security must be fixed first** (below).

## Blockers to declaring "Passport established" (founder / dashboard)

- [ ] Confirm **Vercel Production + Preview** envs for **both** WM Pro and Dreamboard point to `zrzaifaxecwgpfrqctkp` (or the intended split).
- [ ] Add deployed domains + `/login?confirmed=1` + `/reset-password` to Supabase **Redirect URLs**.
- [ ] Set a **verified `RESEND_FROM_EMAIL`** sender (or Supabase custom SMTP) — current default `onboarding@resend.dev` only delivers to the account owner.
- [ ] Create a **restorable logical backup** before any RLS/policy change.

## Security-advisor remediation (STAGED — not executed)

Do **not** apply until: columns/flows inventoried, policy tests written, backup taken, staged on preview.

1. **Always-true write/delete RLS** on `lounge_posts`, `lounge_likes`, `lounge_comments`, `lounge_follows`, and `radio` inserts → replace with authenticated ownership checks; keep intentional **public reads** separate; add explicit moderator/admin paths.
2. **Broad public `radio` Storage bucket listing** → narrow listing while preserving legitimate public object delivery.
3. **Leaked-password protection disabled** → enable after verifying intended Auth config.

## Structural recommendation

WM Pro should adopt version-controlled Supabase migrations (`supabase link --project-ref zrzaifaxecwgpfrqctkp`, `project_id` in `config.toml`, migrations dir) so Passport schema is no longer applied out-of-band. Introduce behind compatibility views; never copy `auth.users` rows; never expose the service-role key to the browser.
