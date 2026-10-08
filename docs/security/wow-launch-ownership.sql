-- Applies before the ownership route deployment. Legacy ownership is deliberately unresolved.
ALTER TABLE public.lounge_posts ADD COLUMN IF NOT EXISTS owner_id text;
ALTER TABLE public.lounge_comments ADD COLUMN IF NOT EXISTS owner_id text;
ALTER TABLE public.lounge_likes ADD COLUMN IF NOT EXISTS owner_id text;
ALTER TABLE public.lounge_follows ADD COLUMN IF NOT EXISTS owner_id text;
ALTER TABLE public.radio_tracks ADD COLUMN IF NOT EXISTS owner_id text;
CREATE INDEX IF NOT EXISTS lounge_posts_owner_idx ON public.lounge_posts(owner_id);
CREATE INDEX IF NOT EXISTS lounge_likes_owner_idx ON public.lounge_likes(owner_id, post_id);
CREATE INDEX IF NOT EXISTS lounge_follows_owner_idx ON public.lounge_follows(owner_id, following_handle);
REVOKE ALL ON TABLE public.lounge_posts, public.lounge_comments, public.lounge_likes, public.lounge_follows, public.radio_tracks FROM anon, authenticated, PUBLIC;
GRANT SELECT(id,user_handle,user_name,user_avatar,user_color,user_tier,user_verified,user_ceo,content,type,trade_card,music,video,tags,created_at) ON public.lounge_posts TO anon, authenticated;
GRANT SELECT(id,post_id,user_handle,user_name,user_avatar,user_color,body,created_at) ON public.lounge_comments TO anon, authenticated;
GRANT SELECT(post_id,user_handle,created_at) ON public.lounge_likes TO anon, authenticated;
GRANT SELECT(follower_handle,following_handle,created_at) ON public.lounge_follows TO anon, authenticated;
GRANT SELECT(id,title,artist,genre,duration,storage_path,public_url,uploader,plays,created_at) ON public.radio_tracks TO anon, authenticated;
