-- WealthyMindsets Pro — Lounge schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Posts
create table if not exists lounge_posts (
  id            bigserial primary key,
  user_handle   text not null,
  user_name     text not null,
  user_avatar   text not null default '',
  user_color    text not null default '#00D4AA',
  user_tier     text not null default 'BASIC',
  user_verified boolean not null default false,
  user_ceo      boolean not null default false,
  content       text not null,
  type          text not null default 'text',
  trade_card    jsonb,
  music         jsonb,
  video         jsonb,
  tags          text[] default '{}',
  created_at    timestamptz not null default now()
);

-- Likes (one row per user+post)
create table if not exists lounge_likes (
  post_id     bigint references lounge_posts(id) on delete cascade,
  user_handle text not null,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_handle)
);

-- Comments
create table if not exists lounge_comments (
  id          bigserial primary key,
  post_id     bigint references lounge_posts(id) on delete cascade,
  user_handle text not null,
  user_name   text not null,
  user_avatar text not null default '',
  user_color  text not null default '#00D4AA',
  body        text not null,
  created_at  timestamptz not null default now()
);

-- Follows
create table if not exists lounge_follows (
  follower_handle  text not null,
  following_handle text not null,
  created_at       timestamptz not null default now(),
  primary key (follower_handle, following_handle)
);

-- Enable Realtime on posts so new posts stream in without polling
alter publication supabase_realtime add table lounge_posts;
alter publication supabase_realtime add table lounge_likes;
alter publication supabase_realtime add table lounge_comments;

-- Public read/write via anon key (MVP — add RLS later when Supabase Auth is integrated)
alter table lounge_posts    enable row level security;
alter table lounge_likes    enable row level security;
alter table lounge_comments enable row level security;
alter table lounge_follows  enable row level security;

create policy "public read posts"    on lounge_posts    for select using (true);
create policy "public insert posts"  on lounge_posts    for insert with check (true);
create policy "public delete posts"  on lounge_posts    for delete using (true);

create policy "public read likes"    on lounge_likes    for select using (true);
create policy "public insert likes"  on lounge_likes    for insert with check (true);
create policy "public delete likes"  on lounge_likes    for delete using (true);

create policy "public read comments" on lounge_comments for select using (true);
create policy "public insert comments" on lounge_comments for insert with check (true);

create policy "public read follows"  on lounge_follows  for select using (true);
create policy "public insert follows" on lounge_follows  for insert with check (true);
create policy "public delete follows" on lounge_follows  for delete using (true);

-- Indexes for speed
create index if not exists idx_posts_created    on lounge_posts(created_at desc);
create index if not exists idx_likes_post       on lounge_likes(post_id);
create index if not exists idx_comments_post    on lounge_comments(post_id, created_at);
create index if not exists idx_follows_follower on lounge_follows(follower_handle);
