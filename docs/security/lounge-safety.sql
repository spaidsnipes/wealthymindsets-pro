-- One Lounge safety: report, block / mute, moderator hide (T5, Oct 23 2026).
-- Run once in the Supabase SQL editor of the shared Passport project. Safe to re-run.
-- Until it runs, the Lounge keeps working: nothing is hidden and the safety buttons answer
-- "not installed yet" instead of pretending to work (src/lib/lounge/loungeStore.ts).
-- Sanctions live only in these Lounge tables. Nothing here touches Academy, Marketplace,
-- WM Pro access or billing.

-- Moderator hide: a core-team moderator hides a post for everyone. The row is kept.
ALTER TABLE public.lounge_posts ADD COLUMN IF NOT EXISTS hidden_at timestamptz;
ALTER TABLE public.lounge_posts ADD COLUMN IF NOT EXISTS hidden_by text;
CREATE INDEX IF NOT EXISTS lounge_posts_visible_idx ON public.lounge_posts(created_at DESC) WHERE hidden_at IS NULL;
-- WOW reads the feed as the signed-in member; it needs to see the flag to leave hidden posts out.
GRANT SELECT(hidden_at) ON public.lounge_posts TO anon, authenticated;

-- Block / mute: one row per person per author. Either way that author leaves the person's feed;
-- a block also ends the follow. Only the WM Pro server (service role) reads or writes it.
CREATE TABLE IF NOT EXISTS public.lounge_blocks (
  owner_id       text        NOT NULL,
  blocked_handle text        NOT NULL CHECK (char_length(blocked_handle) BETWEEN 1 AND 60),
  kind           text        NOT NULL DEFAULT 'block' CHECK (kind IN ('block', 'mute')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, blocked_handle)
);

-- Reports: one per person per post, for the moderators to read.
CREATE TABLE IF NOT EXISTS public.lounge_reports (
  id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id           bigint      NOT NULL REFERENCES public.lounge_posts(id) ON DELETE CASCADE,
  reporter_owner_id text        NOT NULL,
  reporter_handle   text        NOT NULL,
  reason            text        NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500),
  status            text        NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'HIDDEN', 'DISMISSED')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, reporter_owner_id)
);
CREATE INDEX IF NOT EXISTS lounge_reports_open_idx ON public.lounge_reports(created_at DESC) WHERE status = 'OPEN';

-- Private to the server: row security on, no policies, no grants to the public keys.
ALTER TABLE public.lounge_blocks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lounge_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lounge_blocks, public.lounge_reports FROM anon, authenticated, PUBLIC;

-- PostgREST picks up the new columns and tables.
NOTIFY pgrst, 'reload schema';
